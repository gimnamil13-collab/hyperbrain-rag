from __future__ import annotations

import json
from pathlib import Path

from backend.app.core.config import MOUNT_STATE_FILE


def _load() -> dict[str, bool]:
    if not MOUNT_STATE_FILE.exists():
        return {}
    return json.loads(MOUNT_STATE_FILE.read_text(encoding="utf-8"))


def _save(state: dict[str, bool]) -> None:
    MOUNT_STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    MOUNT_STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def is_mounted(source: str) -> bool:
    state = _load()
    return state.get(source, True)


def set_mounted(source: str, mounted: bool) -> None:
    state = _load()
    state[source] = mounted
    _save(state)


def get_mount_state(sources: list[str]) -> dict[str, bool]:
    state = _load()
    return {s: state.get(s, True) for s in sources}


def mounted_sources(all_sources: list[str]) -> list[str]:
    return [s for s in all_sources if is_mounted(s)]
