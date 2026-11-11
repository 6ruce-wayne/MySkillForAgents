---
name: scope
description: >-
  Context window lifecycle manager, large file read guard, heavy skill loader advisor,
  and pre-completion README updater. Use when managing context budget, checking token
  usage, creating STATUS.md handoffs at 200k tokens, compacting at 100k tokens, guarding
  600+ line reads, handling >20k token skills, or updating README.md before completing tasks.
---

# Scope — Context & Workflow Guard

`scope` manages the conversation context window, enforces efficient file reading, monitors heavy skill loads, and ensures project documentation (`README.md`) stays up to date before finishing work.

---

## 1. Context Window Thresholds (100k / 200k Tokens)

Monitor context token usage (`input_tokens + cache_read_tokens` from the latest step in `transcript.jsonl`, or via the active Scope hook messages):

### At >= 100,000 Tokens (100k Compact Threshold)
1. Finish the current atomic action cleanly.
2. Recommend and instruct the user to run `/compact` to compress conversation history and free up context window space before continuing.

### At >= 200,000 Tokens (200k Handoff & Reset Threshold)
1. **Immediately pause** starting any new sub-tasks.
2. **Write `STATUS.md`** in the root of the active project folder (workspace root) containing:
   - **Timestamp & Token Usage**: Current date/time and token count.
   - **Current Objective**: What task is actively being worked on.
   - **Completed Items**: Summary of changes made and files modified so far.
   - **In-Progress / Next Steps**: Exact next steps so the next session can resume seamlessly.
   - **Blockers / Notes**: Any key decisions, gotchas, or pending questions.
3. **Instruct the user** to run `/clear` or `/new` to start a fresh session and load `STATUS.md` to continue.

---

## 2. Heavy Skill Load (> 20,000 Tokens)

Whenever a `SKILL.md` or skill reference bundle exceeding **20,000 tokens** (~80,000 characters) is loaded into the conversation:
1. Complete the specific task that required that heavy skill.
2. Immediately advise the user to run `/clear` once that task is done so the heavy skill payload does not bloat subsequent turns.

---

## 3. Large File Read Guard (> 600 Lines)

When reading files with `read_file` (or `Read`):
1. **First Full Read Blocked**: If a target file has more than **600 lines** and is requested without line bounds (`StartLine` / `EndLine` or `offset` / `limit` covering <= 600 lines), the Scope `PreToolUse` hook blocks the first attempt.
2. **Preferred Action**: Use targeted line ranges (`StartLine` & `EndLine`, or grep/outline first) to read only the section you need.
3. **Bypass on Retry**: If reading the entire >600-line file is genuinely required, sending the **exact same full-file Read request a second time** will pass through automatically.

---

## 4. Pre-Completion `README.md` Update

Before concluding the final response of a coding or configuration task:
1. Check if the project folder has a `README.md` (or if new features, scripts, endpoints, env vars, or architectural changes were introduced).
2. Update `README.md` in the project folder to reflect the latest state of the project before reporting task completion.

---

## Manual Diagnostic Command

You can run the Scope status check script at any time to inspect current conversation token usage and file guard state:

```bash
node ~/.gemini/config/skills/scope/scripts/scope-hook.cjs status
```
