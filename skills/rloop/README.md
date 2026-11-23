# Rloop — Multi-Agent SDLC Loop Skill

Global Antigravity skill for running a 6-agent SDLC loop with Git-committed handoffs, 2-strike `AGENTS.md` + hook enforcement, locked failing tests, PR security/spec review, and production monitoring loopback.

## Structure

- `SKILL.md` — Main orchestrator workflow, Round 1 manual approval gate, and unlock criteria (`test`, `hook`, `rollback`).
- `references/agents.md` — Detailed role definitions and system prompts for all 6 subagents (`rloop-planner`, `rloop-designer`, `rloop-developer`, `rloop-tester`, `rloop-deploy`, `rloop-maintenance`).
- `resources/templates.md` — Templates for `.rloop/state.json`, `blocked-patterns.json`, `locked-tests.json`, `intent.md`, `spec.md`, `plan.md`, and `AGENTS.md`.
- `resources/hooks.json` — Project-level `.agents/hooks.json` template (`PreToolUse`).
- `scripts/rloop_guard.py` — Hook script enforcing 2-strike blocked patterns, locked tests, maintenance no-code guard, and production deploy confirmation.

## Usage

In any project workspace, tell Antigravity:
- *"เริ่มใช้สกิล Rloop สำหรับโปรเจกต์นี้"* or *"Run Rloop for <feature idea>"*
