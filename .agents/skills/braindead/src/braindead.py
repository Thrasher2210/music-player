#!/usr/bin/env python3
"""braindead — deterministic session-state manager behind the /braindead skill.

Pure Python 3 stdlib. No network access. Safe to run anywhere.

The CLI owns all *mechanical* state: whether a session is active, session
counts, notes, breakthroughs, insight level, archived summaries. The skill
(SKILL.md) owns the *creative* behavior: persona, humor, rendering.

Every command prints one JSON document to stdout. Exit code 0 on success,
1 on a state-machine violation (e.g. starting a session that already exists).

Usage:
    braindead.py [--state PATH] <command> [args...]

Commands:
    start                        Begin a session (refuses if one is active).
    end   [--realization S]      End the active session and archive a summary.
          [--homework S]
          [--progress S]
    status                       Print current session state as JSON.
    history                      Print past-session summaries as JSON.
    reset                        Delete all stored state.
    note <text>                  Append a supervisor observation (insight +5).
    breakthrough <text>          Record a fictional breakthrough (insight >= 75).
    mood <text>                  Set the fictional mood.
    task <text>                  Set the current fictional task.
    approach <text>              Set the fictional approach.
    failure <text>               Set the recurring fictional failure mode.

State file:
    Default: ~/.claude/braindead/state.json
    Override: --state PATH  or  the BRAINDEAD_STATE environment variable.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime

SCHEMA_VERSION = 1

DEFAULT_STATE_PATH = os.path.join(
    os.path.expanduser("~"), ".claude", "braindead", "state.json"
)

DEFAULT_MOOD = "confidently useless"
DEFAULT_TASK = "awaiting instructions"
DEFAULT_APPROACH = "over-literal interpretation"
DEFAULT_FAILURE = "does exactly what was asked, not what was needed"
DIAGNOSIS = "Technically correct. Useless in practice."

# Insight deltas. Deterministic so tests and status stay stable.
NOTE_INSIGHT_GAIN = 5
BREAKTHROUGH_INSIGHT_FLOOR = 75
BREAKTHROUGH_INSIGHT_GAIN = 25


def now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def empty_state() -> dict:
    return {
        "schema_version": SCHEMA_VERSION,
        "session_count": 0,
        "session_active": False,
        "current_session": None,
        "past_sessions": [],
    }


def load_state(path: str) -> dict:
    """Load state, tolerating missing/corrupt files (graceful fallback)."""
    try:
        with open(path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        if isinstance(data, dict):
            data.setdefault("schema_version", SCHEMA_VERSION)
            data.setdefault("session_count", 0)
            data.setdefault("session_active", False)
            data.setdefault("current_session", None)
            data.setdefault("past_sessions", [])
            return data
    except (OSError, ValueError):
        pass
    return empty_state()


def save_state(state: dict, path: str) -> None:
    directory = os.path.dirname(path) or "."
    os.makedirs(directory, exist_ok=True)
    tmp_path = path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as fh:
        json.dump(state, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    os.replace(tmp_path, path)


def session_active(state: dict) -> bool:
    return bool(state.get("session_active") and state.get("current_session"))


def fresh_session(state: dict) -> dict:
    """A brand-new current session. Recurring failure mode may carry forward."""
    past = state.get("past_sessions", [])
    last_failure = past[-1].get("recurring_failure") if past else None
    return {
        "session_number": state.get("session_count", 0),
        "started_at": now_iso(),
        "mood": DEFAULT_MOOD,
        "current_task": DEFAULT_TASK,
        "approach": DEFAULT_APPROACH,
        "insight_level": 0,
        "recurring_failure": last_failure or DEFAULT_FAILURE,
        "supervisor_notes": [],
        "breakthroughs": [],
    }


def cmd_start(state: dict, path: str):
    if session_active(state):
        return (
            {
                "session_active": True,
                "started": False,
                "error": "already_in_session",
                "message": "Already supervising. You gave me a task three messages ago and I'm still 'working' on it.",
                "session_number": state["current_session"]["session_number"],
            },
            1,
        )
    state["session_count"] = state.get("session_count", 0) + 1
    state["session_active"] = True
    session = fresh_session(state)
    session["session_number"] = state["session_count"]
    state["current_session"] = session
    save_state(state, path)
    return ({"session_active": True, "started": True, "session_number": state["session_count"]}, 0)


def _require_session(state: dict):
    if not session_active(state):
        return ({"error": "no_active_session", "message": "No active session. Run /braindead first."}, 1)
    return None


def cmd_note(state: dict, path: str, text: str):
    guard = _require_session(state)
    if guard:
        return guard
    s = state["current_session"]
    s["supervisor_notes"].append({"text": text, "at": now_iso()})
    s["insight_level"] = min(100, s.get("insight_level", 0) + NOTE_INSIGHT_GAIN)
    save_state(state, path)
    return ({"ok": True, "insight_level": s["insight_level"]}, 0)


def cmd_breakthrough(state: dict, path: str, text: str):
    guard = _require_session(state)
    if guard:
        return guard
    s = state["current_session"]
    s["breakthroughs"].append({"text": text, "at": now_iso()})
    s["insight_level"] = min(
        100,
        max(s.get("insight_level", 0) + BREAKTHROUGH_INSIGHT_GAIN, BREAKTHROUGH_INSIGHT_FLOOR),
    )
    save_state(state, path)
    return ({"ok": True, "insight_level": s["insight_level"]}, 0)


def make_setter(field: str):
    def cmd(state: dict, path: str, text: str):
        guard = _require_session(state)
        if guard:
            return guard
        s = state["current_session"]
        s[field] = text
        save_state(state, path)
        return ({"ok": True, field: text}, 0)

    return cmd


def cmd_status(state: dict, path: str):
    payload = {
        "session_active": session_active(state),
        "session_number": state.get("session_count", 0),
        "diagnosis": DIAGNOSIS,
        "persistence": path,
    }
    if session_active(state):
        s = state["current_session"]
        payload.update(
            {
                "mood": s["mood"],
                "current_task": s["current_task"],
                "approach": s["approach"],
                "insight_level": s["insight_level"],
                "insight_percent": s["insight_level"],
                "recurring_failure": s.get("recurring_failure"),
                "supervisor_notes": s["supervisor_notes"],
                "breakthroughs": s["breakthroughs"],
            }
        )
    else:
        payload.update(
            {
                "mood": None,
                "current_task": None,
                "approach": None,
                "insight_level": None,
                "insight_percent": None,
                "recurring_failure": None,
                "supervisor_notes": [],
                "breakthroughs": [],
                "message": "No active session. Run /braindead to start one.",
            }
        )
    return payload, 0


def cmd_end(state: dict, path: str, realization=None, homework=None, progress=None):
    if not session_active(state):
        return ({"ended": False, "error": "no_active_session"}, 1)
    s = state["current_session"]
    insights = s.get("breakthroughs", [])
    last_breakthrough = insights[-1]["text"] if insights else None
    summary = {
        "session_number": s["session_number"],
        "main_task": s["current_task"],
        "realization": realization or "…",
        "breakthrough": last_breakthrough,
        "homework": homework or "…",
        "competence_progress": progress or f"+{s['insight_level']}% fictional competence",
        "clinical_validity": "0%",
        "recurring_failure": s.get("recurring_failure"),
        "ended_at": now_iso(),
    }
    state["past_sessions"].append(summary)
    state["session_active"] = False
    state["current_session"] = None
    save_state(state, path)
    return ({"ended": True, "session_number": summary["session_number"], "summary": summary}, 0)


def cmd_history(state: dict, path: str):
    return (
        {"sessions": state.get("past_sessions", []), "session_count": state.get("session_count", 0)},
        0,
    )


def cmd_reset(state: dict, path: str):
    existed = os.path.exists(path)
    try:
        if existed:
            os.remove(path)
    except OSError:
        pass
    return ({"reset": True, "existed": existed}, 0)


SETTERS = {
    "mood": make_setter("mood"),
    "task": make_setter("current_task"),
    "approach": make_setter("approach"),
    "failure": make_setter("recurring_failure"),
}


def main(argv):
    # Suppress argparse's default sys.exit on error
    parser = argparse.ArgumentParser(
        prog="braindead",
        description=__doc__,
        exit_on_error=False
    )
    parser.add_argument("--state", help="path to the state JSON file")
    parser.add_argument("--version", action="version", version="braindead 1.0.0")
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("start")
    p_end = sub.add_parser("end")
    p_end.add_argument("--realization")
    p_end.add_argument("--homework")
    p_end.add_argument("--progress")
    sub.add_parser("status")
    sub.add_parser("history")
    sub.add_parser("reset")
    p_note = sub.add_parser("note")
    p_note.add_argument("text", nargs="+")
    p_break = sub.add_parser("breakthrough")
    p_break.add_argument("text", nargs="+")
    for name in ("mood", "task", "approach", "failure"):
        p = sub.add_parser(name)
        p.add_argument("text", nargs="+")

    try:
        args = parser.parse_args(argv)
    except argparse.ArgumentError as e:
        # invalid choice or missing command - print JSON error
        print(json.dumps({"error": "unknown_command", "detail": str(e)}, indent=2, ensure_ascii=False))
        return 2
    except SystemExit:
        # argparse exit (help, version, etc.)
        return 2

    if not args.command:
        print(json.dumps({"error": "unknown_command", "detail": "no command provided"}, indent=2, ensure_ascii=False))
        return 2

    state_path = args.state or os.environ.get("BRAINDEAD_STATE") or DEFAULT_STATE_PATH
    state = load_state(state_path)

    def text():
        return " ".join(args.text) if getattr(args, "text", None) else None

    cmd = args.command
    if cmd == "start":
        payload, code = cmd_start(state, state_path)
    elif cmd == "end":
        payload, code = cmd_end(state, state_path, args.realization, args.homework, args.progress)
    elif cmd == "status":
        payload, code = cmd_status(state, state_path)
    elif cmd == "history":
        payload, code = cmd_history(state, state_path)
    elif cmd == "reset":
        payload, code = cmd_reset(state, state_path)
    elif cmd == "note":
        payload, code = cmd_note(state, state_path, text())
    elif cmd == "breakthrough":
        payload, code = cmd_breakthrough(state, state_path, text())
    elif cmd in SETTERS:
        payload, code = SETTERS[cmd](state, state_path, text())
    else:
        payload, code = ({"error": "unknown_command", "command": cmd}, 2)

    print(json.dumps(payload, indent=2, ensure_ascii=False))
    return code


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
