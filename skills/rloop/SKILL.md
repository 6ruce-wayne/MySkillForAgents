---
name: rloop
description: >-
  Rloop SDLC multi-agent development loop (Planner -> Designer -> Developer -> Tester -> Deploy -> Maintenance -> Planner).
  Use when the user asks to run Rloop, start an SDLC loop, build/iterate on an application with structured multi-agent stages,
  git-committed handoffs, rule-conflict checks, 2-strike AGENTS.md learning + hook guards, locked failing tests, and production monitoring.
---

# Rloop — Multi-Agent SDLC Loop

`Rloop` orchestrates a 6-stage software development lifecycle using dedicated subagents, Git-committed handoffs, and automated hook enforcement.

```text
Planner (intent.md)
   ↓  [user approves intent + git commit]
Designer (spec.md + rule conflict check)
   ↓  [git commit]
Developer (plan.md -> code -> AGENTS.md 2-strike + hook)
   ↓  [git commit]
Tester (test & build pass; lock failing tests; fix code only)
   ↓  [git commit]
Deploy (PR review vs spec + risk/intent check + prod approval)
   ↓  [user approves production deploy + git commit]
Maintenance (monitor prod: minor=log, major=analyze no-code, critical=PR/rollback -> new intent.md)
   ↓  [git commit -> loops back to Planner]
```

---

## 1. Mandatory Bootstrap & Safety Mode (Round 1 Rule)

Every project running `Rloop` tracks its state in `.rloop/state.json`.

- **Round 1 MUST run in `mode: "manual_gate"`**:
  - Pause after **EVERY** subagent completes its step and ask the user for explicit approval before invoking the next subagent.
- **Unlocking `mode: "auto_loop"`**:
  - Do **NOT** enable automatic looping until the user explicitly confirms all three safety gates in `.rloop/state.json`:
    1. `verified.test === true` — Automated test & build pipeline + locked failing-test bugfix rule verified.
    2. `verified.hook === true` — `.agents/hooks.json` with `rloop_guard.py` installed and confirmed blocking rule violations.
    3. `verified.rollback === true` — Rollback procedure tested and confirmed working.
- **Permanent Human Gates (Even in `auto_loop` mode)**:
  - **Planner**: User confirms `.rloop/intent.md`.
  - **Designer**: User resolves any `[RULE CONFLICT]` flags if raised.
  - **Deploy**: User confirms PR risk/intent AND explicitly approves **Production deployment**.

---

## 2. Project Initialization (First Run in a Workspace)

Before running Round 1 in a target project workspace:

1. Verify the workspace is a Git repository (`git status`). If not, ask the user before running `git init`.
2. Create `.rloop/` directory and initialize `.rloop/state.json`, `.rloop/blocked-patterns.json`, and `.rloop/locked-tests.json` using [resources/templates.md](./resources/templates.md).
3. Install the project guard hook so `Rloop` rules are enforced automatically:
   - Copy [scripts/rloop_guard.py](./scripts/rloop_guard.py) to `.agents/scripts/rloop_guard.py`.
   - Copy or merge [resources/hooks.json](./resources/hooks.json) into `.agents/hooks.json`.
4. Ensure `AGENTS.md` exists at the project root with the `## Rloop Learned Rules (2-Strike Log)` section.
5. Commit the initial `.rloop/` and `.agents/` setup to Git.

---

## 3. Orchestration Protocol

1. **Read Role Prompts**: Before defining or invoking subagents, read [references/agents.md](./references/agents.md) for the exact system prompt, inputs, outputs, and constraints of each agent.
2. **Define Subagents**: Register the 6 subagent types with `define_subagent` (or invoke if already defined in the session):
   - `rloop-planner` (read + write)
   - `rloop-designer` (read + write)
   - `rloop-developer` (read + write)
   - `rloop-tester` (read + write)
   - `rloop-deploy` (read + write)
   - `rloop-maintenance` (read + write)
3. **Update Phase State**: Before invoking a subagent, update `.rloop/state.json` with `"currentPhase"` set to that stage (`planner`, `designer`, `developer`, `tester`, `deploy`, `maintenance`) so `rloop_guard.py` enforces stage-specific guards.
4. **Git Commit Handoff (Mandatory for Every Subagent)**:
   - Every subagent MUST finish its stage by staging and committing its artifacts/code to Git with a structured message:
     `rloop(<phase>): <short summary> [round-<N>]`
   - Never hand off uncommitted files to the next agent.
5. **Gate Check Between Stages**:
   - If `mode === "manual_gate"` (Round 1): summarize what the subagent produced + commit hash, and ask the user to approve moving to the next stage.
   - If `mode === "auto_loop"`: automatically proceed unless a Permanent Human Gate applies (Planner intent confirmation, Designer rule conflict, Deploy PR risk/intent + Production approval).

---

## 4. Stage Summary & Strict Rules

| Stage | Subagent | Reads | Produces | Key Non-Negotiable Rules |
| :--- | :--- | :--- | :--- | :--- |
| **1. Plan** | `rloop-planner` | User idea (or Maintenance's new `intent.md`) | `.rloop/intent.md` | Must clarify **What / Why / Blockers** with user; wait for user confirmation before handoff. |
| **2. Design** | `rloop-designer` | `.rloop/intent.md` + user rule skills (security, brand, UX, etc.) | `.rloop/spec.md` | Must flag any conflict between intent and user rules (`[RULE CONFLICT]`) immediately. |
| **3. Develop** | `rloop-developer` | `.rloop/spec.md` | `.rloop/plan.md`, source code, `AGENTS.md` | Must write `plan.md` (files + tests) **before** coding. **2-Strike Rule**: same mistake twice -> record in `AGENTS.md` + add block pattern to `.rloop/blocked-patterns.json`. |
| **4. Test** | `rloop-tester` | `plan.md`, `spec.md`, code | Test/build verification, locked tests | Run tests & build until green before showing user. **Bugfix Rule**: write failing test first & add to `.rloop/locked-tests.json`; fix code only — NEVER edit locked tests. |
| **5. Deploy** | `rloop-deploy` | PR diff, `spec.md`, `intent.md` | PR review report, Production deploy | Review every PR for bugs, security vulns, and spec drift; ask user if risky & matches intent; require explicit user approval for Production deploy. |
| **6. Maintain** | `rloop-maintenance` | Production metrics script | `.rloop/metrics-log.md`, incident report, or rollback/PR + new `.rloop/intent.md` | **Minor drift**: log only. **Major drift**: analyze root cause immediately, **NO code edits**. **Critical**: open PR or rollback, write new `intent.md`, loop back to Planner. |

---

## 5. Supporting Files

- [references/agents.md](./references/agents.md) — Complete system prompts and checklists for all 6 subagents.
- [resources/templates.md](./resources/templates.md) — Templates for `intent.md`, `spec.md`, `plan.md`, `state.json`, `blocked-patterns.json`, `locked-tests.json`, and `AGENTS.md`.
- [resources/hooks.json](./resources/hooks.json) — Project `.agents/hooks.json` configuration for `PreToolUse`.
- [scripts/rloop_guard.py](./scripts/rloop_guard.py) — Automated Python hook script enforcing blocked patterns, locked tests, maintenance no-code guard, and production deploy confirmation.
