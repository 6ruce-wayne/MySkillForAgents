#!/usr/bin/env node
/**
 * Scope — Context Window, Large File Read Guard, Heavy Skill Advisor & README Guard
 * Supports Antigravity Lifecycle Hooks (PreToolUse, PreInvocation, Stop) & CLI diagnostics.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const THRESHOLD_COMPACT = 100000;   // 100k tokens -> /compact
const THRESHOLD_STATUS_NEW = 200000; // 200k tokens -> save STATUS.md + /clear or /new
const SKILL_TOKEN_LIMIT = 20000;     // 20k tokens (~80,000 chars) -> recommend /clear after task
const MAX_LINES_FIRST_READ = 600;    // 600 lines -> block 1st full read, allow 2nd identical read

function getStateFilePath(conversationId) {
  const safeId = (conversationId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(os.tmpdir(), `agy-scope-state-${safeId}.json`);
}

function loadState(conversationId) {
  const filePath = getStateFilePath(conversationId);
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (_) {}
  return {
    blockedReads: {},
    warned100k: false,
    warned200k: false,
    heavySkillsDetected: [],
    readmeUpdatedInSession: false,
    filesModifiedInSession: false
  };
}

function saveState(conversationId, state) {
  const filePath = getStateFilePath(conversationId);
  try {
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf8');
  } catch (_) {}
}

function getLatestTokenUsage(transcriptPath) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) {
    return { totalTokens: 0, inputTokens: 0, cacheReadTokens: 0, outputTokens: 0 };
  }
  try {
    const content = fs.readFileSync(transcriptPath, 'utf8');
    const lines = content.trim().split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i]);
        if (typeof entry.input_tokens === 'number' || typeof entry.cache_read_tokens === 'number') {
          const inputTokens = entry.input_tokens || 0;
          const cacheReadTokens = entry.cache_read_tokens || 0;
          const outputTokens = entry.output_tokens || 0;
          return {
            totalTokens: inputTokens + cacheReadTokens + outputTokens,
            inputTokens,
            cacheReadTokens,
            outputTokens
          };
        }
      } catch (_) {}
    }
  } catch (_) {}
  return { totalTokens: 0, inputTokens: 0, cacheReadTokens: 0, outputTokens: 0 };
}

function countFileLines(filePath) {
  try {
    const stat = fs.statSync(filePath);
    // Skip binary or non-regular files
    if (!stat.isFile()) return 0;
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split(/\r?\n/).length;
  } catch (_) {
    return 0;
  }
}

function estimateFileTokens(filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return 0;
    // Standard heuristic: ~4 bytes/chars per token
    return Math.ceil(stat.size / 4);
  } catch (_) {
    return 0;
  }
}

function handlePreToolUse(payload) {
  const conversationId = payload.conversationId || payload.session_id || 'default';
  const state = loadState(conversationId);
  const toolCall = payload.toolCall || {};
  const toolName = (toolCall.name || payload.tool_name || '').toLowerCase();
  const args = toolCall.args || payload.tool_input || {};

  // Track if project files were modified (excluding README.md and STATUS.md)
  if (toolName.includes('write') || toolName.includes('edit')) {
    const targetPath = args.Path || args.file_path || args.TargetFile || '';
    const base = path.basename(targetPath).toUpperCase();
    if (base === 'README.MD') {
      state.readmeUpdatedInSession = true;
    } else if (base && base !== 'STATUS.MD') {
      state.filesModifiedInSession = true;
    }
    saveState(conversationId, state);
    return { decision: 'allow' };
  }

  // Handle Read / read_file / view_file
  if (toolName === 'read_file' || toolName === 'read' || toolName === 'view_file') {
    const rawPath = args.Path || args.file_path || args.AbsolutePath || '';
    if (!rawPath || !fs.existsSync(rawPath)) {
      return { decision: 'allow' };
    }

    const resolvedPath = path.resolve(rawPath);

    // 1. Check if loading a SKILL.md or skill file > 20k tokens
    const normalizedPath = resolvedPath.replace(/\\/g, '/').toLowerCase();
    if (normalizedPath.includes('/skills/') || path.basename(normalizedPath) === 'skill.md') {
      const estTokens = estimateFileTokens(resolvedPath);
      if (estTokens > SKILL_TOKEN_LIMIT && !state.heavySkillsDetected.includes(resolvedPath)) {
        state.heavySkillsDetected.push(resolvedPath);
        saveState(conversationId, state);
      }
    }

    // 2. Check if reading > 600 lines without range limit
    const startLine = args.StartLine ?? args.offset ?? null;
    const endLine = args.EndLine ?? (args.limit ? (startLine || 1) + args.limit - 1 : null);

    const hasBoundedRange =
      (startLine !== null && endLine !== null && (endLine - startLine + 1) <= MAX_LINES_FIRST_READ) ||
      (startLine !== null && endLine === null && false); // StartLine alone till EOF could still be > 600

    const totalLines = countFileLines(resolvedPath);
    const effectiveLinesToRead =
      startLine !== null && endLine !== null
        ? Math.max(0, endLine - startLine + 1)
        : startLine !== null
        ? Math.max(0, totalLines - startLine + 1)
        : endLine !== null
        ? Math.min(totalLines, endLine)
        : totalLines;

    if (totalLines > MAX_LINES_FIRST_READ && effectiveLinesToRead > MAX_LINES_FIRST_READ) {
      const readKey = `${resolvedPath}:${startLine || 'start'}-${endLine || 'eof'}`;
      const previousCount = state.blockedReads[readKey] || 0;

      if (previousCount === 0) {
        // Block first full read
        state.blockedReads[readKey] = 1;
        saveState(conversationId, state);
        return {
          decision: 'deny',
          reason:
            `[Scope Guard] ไฟล์ "${path.basename(resolvedPath)}" มีความยาว ${totalLines} บรรทัด (เกินลิมิต ${MAX_LINES_FIRST_READ} บรรทัดสำหรับการอ่านทั้งไฟล์ครั้งแรก).\n` +
            `👉 กรุณาอ่านเฉพาะส่วนที่ต้องใช้โดยระบุ StartLine / EndLine (หรือ offset / limit ไม่เกิน ${MAX_LINES_FIRST_READ} บรรทัด).\n` +
            `💡 หากจำเป็นต้องอ่านทั้งไฟล์จริงๆ ให้ส่งคำสั่ง Read เดิมซ้ำอีกครั้ง ระบบจะอนุญาตให้ผ่านในครั้งที่ 2`
        };
      } else {
        // Second identical read -> allow through!
        state.blockedReads[readKey] = previousCount + 1;
        saveState(conversationId, state);
        return { decision: 'allow' };
      }
    }
  }

  return { decision: 'allow' };
}

function handlePreInvocation(payload) {
  const conversationId = payload.conversationId || payload.session_id || 'default';
  const state = loadState(conversationId);
  const transcriptPath = payload.transcriptPath || '';
  const usage = getLatestTokenUsage(transcriptPath);
  const messages = [];

  // 1. Check 200k context threshold
  if (usage.totalTokens >= THRESHOLD_STATUS_NEW) {
    state.warned200k = true;
    messages.push(
      `🚨 [SCOPE CRITICAL: CONTEXT >= 200k TOKENS (${usage.totalTokens.toLocaleString()} tokens)] ` +
      `คุณต้องบันทึกสถานะงานที่กำลังทำอยู่ทั้งหมดลงไฟล์ STATUS.md ในโฟลเดอร์โปรเจกต์ทันที (ระบุงานที่ทำเสร็จแล้ว, งานที่กำลังทำค้างอยู่, และขั้นตอนถัดไป) ` +
      `จากนั้นแจ้งให้ผู้ใช้รันคำสั่ง /clear หรือ /new เพื่อเริ่มเซสชันใหม่ทันที!`
    );
  } else if (usage.totalTokens >= THRESHOLD_COMPACT && !state.warned100k) {
    // 2. Check 100k context threshold
    state.warned100k = true;
    messages.push(
      `⚠️ [SCOPE WARNING: CONTEXT >= 100k TOKENS (${usage.totalTokens.toLocaleString()} tokens)] ` +
      `ขณะนี้ Context Window เกิน 100k tokens แล้ว กรุณาแนะนำให้ผู้ใช้รันคำสั่ง /compact เพื่อบีบอัดบริบทการสนทนา`
    );
  }

  // 3. Check heavy skills (> 20k tokens) loaded
  if (state.heavySkillsDetected && state.heavySkillsDetected.length > 0) {
    const skillNames = state.heavySkillsDetected.map(p => path.basename(path.dirname(p)) + '/' + path.basename(p)).join(', ');
    messages.push(
      `📦 [SCOPE SKILL GUARD: HEAVY SKILL > 20k TOKENS LOADED (${skillNames})] ` +
      `ตรวจพบการโหลด Skill ขนาดใหญ่เกิน 20k tokens กรุณาแนะนำให้ผู้ใช้สั่ง /clear ทันทีหลังจากทำงานส่วนนี้เสร็จสิ้น`
    );
    // Clear list after notifying so it doesn't spam indefinitely, or keep reminder for final response
    state.heavySkillsNotified = state.heavySkillsDetected.slice();
    state.heavySkillsDetected = [];
  }

  // 4. Always remind about README.md update before completing tasks if files were modified
  if (state.filesModifiedInSession && !state.readmeUpdatedInSession) {
    messages.push(
      `📝 [SCOPE README REMINDER] ก่อนจบการทำงานในรอบนี้ อย่าลืมตรวจสอบและอัปเดตข้อมูลใน README.md ของโปรเจกต์ให้เป็นปัจจุบันด้วย`
    );
  }

  saveState(conversationId, state);

  if (messages.length > 0) {
    return {
      injectSteps: [
        {
          ephemeralMessage: messages.join('\n\n')
        }
      ]
    };
  }

  return {};
}

function handleStop(payload) {
  const conversationId = payload.conversationId || payload.session_id || 'default';
  const state = loadState(conversationId);
  const transcriptPath = payload.transcriptPath || '';
  const usage = getLatestTokenUsage(transcriptPath);
  const workspacePaths = payload.workspacePaths || [];
  const projectRoot = workspacePaths[0] || process.cwd();

  // If >= 200k tokens and STATUS.md was not written recently, force continue once to write STATUS.md
  if (usage.totalTokens >= THRESHOLD_STATUS_NEW && !state.statusWrittenAt200k) {
    const statusPath = path.join(projectRoot, 'STATUS.md');
    const recentlyUpdated =
      fs.existsSync(statusPath) &&
      (Date.now() - fs.statSync(statusPath).mtimeMs) < 120000;

    if (!recentlyUpdated) {
      state.statusWrittenAt200k = true;
      saveState(conversationId, state);
      return {
        decision: 'continue',
        reason:
          `[Scope Guard] Context Window ถึง ${usage.totalTokens.toLocaleString()} tokens (>= 200k) แล้ว กรุณาบันทึกสถานะงานปัจจุบันลงไฟล์ STATUS.md ในโฟลเดอร์โปรเจกต์ แล้วแจ้งให้ผู้ใช้สั่ง /clear หรือ /new ก่อนจบการทำงาน`
      };
    }
  }

  // If files were modified in the project and README.md exists (or project workspace is active) and hasn't been updated yet
  if (state.filesModifiedInSession && !state.readmeUpdatedInSession && !state.readmeStopReminded) {
    state.readmeStopReminded = true;
    saveState(conversationId, state);
    return {
      decision: 'continue',
      reason:
        `[Scope Guard] คุณมีการแก้ไขไฟล์ในโปรเจกต์แต่ยังไม่ได้อัปเดต README.md กรุณาอัปเดตข้อมูล README.md ของโปรเจกต์ก่อนจบการทำงาน`
    };
  }

  return { decision: 'allow' };
}

function main() {
  const mode = process.argv[2] || 'hook';

  if (mode === 'status') {
    console.log(JSON.stringify({
      skill: 'scope',
      thresholds: {
        compactTokens: THRESHOLD_COMPACT,
        statusAndResetTokens: THRESHOLD_STATUS_NEW,
        heavySkillTokens: SKILL_TOKEN_LIMIT,
        maxLinesFirstFullRead: MAX_LINES_FIRST_READ
      },
      status: 'active'
    }, null, 2));
    process.exit(0);
  }

  let input = '';
  const timeout = setTimeout(() => {
    process.stdout.write('{}');
    process.exit(0);
  }, 4000);

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => (input += chunk));
  process.stdin.on('end', () => {
    clearTimeout(timeout);
    try {
      const payload = input.trim() ? JSON.parse(input) : {};
      let result = {};

      if (mode === 'pre-tool') {
        result = handlePreToolUse(payload);
      } else if (mode === 'pre-invocation') {
        result = handlePreInvocation(payload);
      } else if (mode === 'stop') {
        result = handleStop(payload);
      }

      process.stdout.write(JSON.stringify(result));
    } catch (err) {
      // Fail-open so we never break the agent loop on unexpected errors
      if (mode === 'pre-tool') {
        process.stdout.write(JSON.stringify({ decision: 'allow' }));
      } else {
        process.stdout.write('{}');
      }
    }
    process.exit(0);
  });
}

main();
