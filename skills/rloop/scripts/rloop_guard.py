#!/usr/bin/env python3
"""
Rloop PreToolUse Guard Hook
Enforces:
  1. Blocked patterns from .rloop/blocked-patterns.json (2-strike rules)
  2. Locked failing tests from .rloop/locked-tests.json (Tester bugfix rule)
  3. Maintenance read-only code guard (no app code edits in Tier 1/Tier 2)
  4. Production deploy approval gate (force_ask unless approved in state.json)
"""

import json
import os
import re
import sys
from pathlib import Path

PROD_DEPLOY_PATTERNS = [
    r"\bdeploy\b.*(--prod|--production|\bprod\b|\bproduction\b)",
    r"\bvercel\s+--prod\b",
    r"\bfly(ctl)?\s+deploy\b",
    r"\bwrangler\s+deploy\b",
    r"\bkubectl\s+apply\b",
    r"\bterraform\s+apply\b",
    r"\bhelm\s+upgrade\b",
]


def respond(decision: str, reason: str = "") -> None:
    payload = {"decision": decision}
    if reason:
        payload["reason"] = reason
    sys.stdout.write(json.dumps(payload, ensure_ascii=False))
    sys.exit(0)


def load_json(path: Path, default: dict) -> dict:
    if not path.is_file():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def norm_rel(target_path: str, cwd: Path) -> str:
    try:
        p = Path(target_path)
        if not p.is_absolute():
            p = (cwd / p).resolve()
        else:
            p = p.resolve()
        rel = p.relative_to(cwd.resolve())
        return rel.as_posix().lower()
    except Exception:
        return target_path.replace("\\", "/").lower()


def main() -> None:
    raw = sys.stdin.read().strip()
    if not raw:
        respond("allow")

    try:
        data = json.loads(raw)
    except Exception:
        respond("allow")

    cwd_str = data.get("cwd") or os.getcwd()
    cwd = Path(cwd_str)
    rloop_dir = cwd / ".rloop"

    if not rloop_dir.is_dir():
        respond("allow")

    tool_call = data.get("toolCall") or {}
    tool_name = (tool_call.get("name") or "").lower()
    args = tool_call.get("args") or {}

    state = load_json(rloop_dir / "state.json", {})
    blocked = load_json(rloop_dir / "blocked-patterns.json", {"rules": []})
    locked = load_json(rloop_dir / "locked-tests.json", {"lockedTests": []})

    # 1. Check 2-strike blocked patterns
    text_to_scan = ""
    if tool_name == "run_command":
        text_to_scan = str(args.get("CommandLine") or args.get("command") or "")
    elif tool_name in ("edit_file", "write_file"):
        text_to_scan = str(
            args.get("Replacement")
            or args.get("Content")
            or args.get("Path")
            or ""
        )

    for rule in blocked.get("rules", []):
        applies = [a.lower() for a in rule.get("appliesTo", [])]
        if applies and tool_name not in applies:
            continue
        pattern = rule.get("pattern")
        if not pattern:
            continue
        try:
            if re.search(pattern, text_to_scan, re.IGNORECASE):
                rule_id = rule.get("id", "unknown")
                desc = rule.get("description", "Blocked by Rloop 2-strike rule")
                respond(
                    "deny",
                    f"Rloop Guard [{rule_id}]: {desc} (recorded in AGENTS.md & .rloop/blocked-patterns.json).",
                )
        except re.error:
            continue

    # 2. Check locked test files (Tester bugfix rule)
    if tool_name in ("edit_file", "write_file"):
        target_path = str(args.get("Path") or "")
        if target_path:
            rel_target = norm_rel(target_path, cwd)
            locked_set = {
                t.replace("\\", "/").lstrip("./").lower()
                for t in locked.get("lockedTests", [])
            }
            if rel_target in locked_set:
                respond(
                    "deny",
                    f"Rloop Guard: '{rel_target}' is a LOCKED failing test. Fix the application code instead of modifying the test.",
                )

            # 3. Maintenance no-code guard (Tier 1 / Tier 2)
            phase = str(state.get("currentPhase") or "").lower()
            critical_pr = bool(state.get("maintenanceCriticalPR", False))
            if phase == "maintenance" and not critical_pr:
                allowed_prefixes = (".rloop/",)
                allowed_files = ("agents.md", "readme.md")
                if not rel_target.startswith(allowed_prefixes) and rel_target not in allowed_files:
                    respond(
                        "deny",
                        f"Rloop Guard: Maintenance Agent cannot edit '{rel_target}' during Tier 1/Tier 2 monitoring. Analyze only, or trigger Tier 3 rollback/PR.",
                    )

    # 4. Production deploy approval gate
    if tool_name == "run_command":
        cmd = str(args.get("CommandLine") or args.get("command") or "")
        if not bool(state.get("productionDeployApproved", False)):
            for pat in PROD_DEPLOY_PATTERNS:
                if re.search(pat, cmd, re.IGNORECASE):
                    respond(
                        "force_ask",
                        "Rloop Guard: Production deployment detected without 'productionDeployApproved: true'. Explicit user approval is required.",
                    )

    respond("allow")


if __name__ == "__main__":
    main()
