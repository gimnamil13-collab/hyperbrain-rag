from __future__ import annotations

import json
import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="session")
def chroma_dir(tmp_path_factory: pytest.TempPathFactory) -> Path:
    path = tmp_path_factory.mktemp("chroma_db")
    os.environ["CHROMA_DIR"] = str(path)
    return path


@pytest.fixture(scope="session")
def client(chroma_dir: Path) -> TestClient:
    os.environ.setdefault("OPENAI_API_KEY", "sk-test-pytest-key")
    os.environ["RATE_LIMIT_PER_MINUTE"] = "0"

    from backend.app.main import app

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def isolate_runtime_state(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    state_dir = tmp_path / "state"
    state_dir.mkdir()
    conv_file = state_dir / "conversations.json"
    mount_file = state_dir / "mount_state.json"
    conv_file.write_text(json.dumps({"conversations": []}), encoding="utf-8")
    mount_file.write_text("{}", encoding="utf-8")

    monkeypatch.setattr("backend.app.services.conversations.CONVERSATIONS_FILE", conv_file)
    monkeypatch.setattr("backend.app.services.mount_state.MOUNT_STATE_FILE", mount_file)

    from backend.app.services import ingest

    ingest._client = None
    ingest._vectorstore = None
    ingest._embeddings = None

    monkeypatch.setattr("backend.app.core.config.settings.openai_api_key", "sk-test-pytest-key")


@pytest.fixture
def sample_conversation(client: TestClient) -> dict:
    res = client.post("/api/conversations", json={"title": "pytest session"})
    assert res.status_code == 200
    return res.json()
