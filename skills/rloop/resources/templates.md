# Rloop Artifact & State Templates

Use these templates when initializing `.rloop/` and generating artifacts in each stage.

---

## 1. `.rloop/state.json`

```json
{
  "round": 1,
  "mode": "manual_gate",
  "currentPhase": "planner",
  "verified": {
    "test": false,
    "hook": false,
    "rollback": false
  },
  "productionDeployApproved": false,
  "maintenanceCriticalPR": false
}
```

> Switch `"mode"` from `"manual_gate"` to `"auto_loop"` ONLY after the user confirms `verified.test`, `verified.hook`, and `verified.rollback` are all `true`.

---

## 2. `.rloop/blocked-patterns.json`

```json
{
  "rules": [
    {
      "id": "example-no-force-push",
      "description": "Block force push to main/master",
      "appliesTo": ["run_command"],
      "pattern": "git\\s+push\\s+.*--force.*(main|master)"
    }
  ]
}
```

When the same mistake happens **2 times**, add a new object to `"rules"` with `appliesTo` (`"run_command"`, `"write_file"`, `"edit_file"`) and a regex `pattern`, AND log the lesson in `AGENTS.md`.

---

## 3. `.rloop/locked-tests.json`

```json
{
  "lockedTests": []
}
```

Add relative file paths (e.g., `"tests/auth.spec.ts"`) whenever Tester Agent writes a failing test for a bug. `rloop_guard.py` will deny any edits to these files until the bug is fixed in application code.

---

## 4. `.rloop/intent.md` (Planner Agent)

```markdown
# Intent — Round <N>

- **Date**: <YYYY-MM-DD>
- **Source**: User Request | Maintenance Escalation
- **Status**: Draft | Approved by User

## 1. What (อยากได้อะไร)
- ...

## 2. Why (ทำไม / เป้าหมายและคุณค่า)
- ...

## 3. Constraints & Blockers (ติดอะไร / ข้อจำกัด / สิ่งที่ไม่ทำ)
- ...

## 4. Success Criteria (วัดผลสำเร็จอย่างไร)
- ...
```

---

## 5. `.rloop/spec.md` (Designer Agent)

```markdown
# Specification — Round <N>

- **Based on**: `.rloop/intent.md`
- **Rule Skills Checked**: Security, Brand, UX, Architecture

## 1. Rule Conflict Audit
- [ ] No conflicts found
- (If any conflict exists, list `[RULE CONFLICT]` with exact rule source and proposed resolution)

## 2. Functional Specification
- ...

## 3. UI/UX & Brand Requirements
- ...

## 4. Security & Privacy Requirements
- ...

## 5. Data Model / API Contracts
- ...

## 6. Acceptance Criteria
- [ ] AC-1: ...
```

---

## 6. `.rloop/plan.md` (Developer Agent)

```markdown
# Implementation Plan — Round <N>

- **Based on**: `.rloop/spec.md`

## 1. Files to Create / Modify
| File Path | Action | Purpose |
| :--- | :--- | :--- |
| `src/...` | Create/Edit | ... |

## 2. Tests to Write / Update
| Test File | Cases Covered |
| :--- | :--- |
| `tests/...` | ... |

## 3. Rollback Plan
- How to revert safely (code + DB/config): ...
```

---

## 7. `AGENTS.md` Section (2-Strike Team Knowledge)

Append this section to the project's root `AGENTS.md`:

```markdown
## Rloop Learned Rules (2-Strike Log)

> Rule: Any mistake repeated 2 times MUST be recorded here and added to `.rloop/blocked-patterns.json`.

| Date | Mistake / Pattern | Prevention Rule | Hook Rule ID |
| :--- | :--- | :--- | :--- |
```
