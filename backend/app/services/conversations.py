from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from backend.app.core.config import CONVERSATIONS_FILE


def _load_all() -> dict:
    if not CONVERSATIONS_FILE.exists():
        return {"conversations": []}
    return json.loads(CONVERSATIONS_FILE.read_text(encoding="utf-8"))


def _save_all(data: dict) -> None:
    CONVERSATIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
    CONVERSATIONS_FILE.write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def list_conversations() -> list[dict]:
    return _load_all().get("conversations", [])


def get_conversation(conversation_id: str) -> dict | None:
    for conv in list_conversations():
        if conv["id"] == conversation_id:
            return conv
    return None


def create_conversation(title: str | None = None) -> dict:
    conv = {
        "id": str(uuid.uuid4()),
        "title": title or "NEW SESSION",
        "messages": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    data = _load_all()
    data.setdefault("conversations", []).insert(0, conv)
    _save_all(data)
    return conv


def append_message(conversation_id: str, role: str, content: str) -> dict | None:
    data = _load_all()
    for conv in data.get("conversations", []):
        if conv["id"] == conversation_id:
            conv["messages"].append({"role": role, "content": content})
            conv["updated_at"] = datetime.now(timezone.utc).isoformat()
            if role == "user" and conv["title"] == "NEW SESSION":
                conv["title"] = content[:40] + ("..." if len(content) > 40 else "")
            _save_all(data)
            return conv
    return None


def delete_conversation(conversation_id: str) -> bool:
    data = _load_all()
    before = len(data.get("conversations", []))
    data["conversations"] = [c for c in data.get("conversations", []) if c["id"] != conversation_id]
    _save_all(data)
    return len(data["conversations"]) < before
