from __future__ import annotations

from io import BytesIO

from fastapi.testclient import TestClient


def test_delete_document_requires_confirm(client: TestClient, monkeypatch):
    monkeypatch.setattr("backend.app.api.documents.list_indexed_sources", lambda: ["demo.md"])
    monkeypatch.setattr("backend.app.api.documents.delete_source", lambda _n: True)

    res = client.delete("/api/documents/demo.md")
    assert res.status_code == 400
    assert "X-Confirm" in res.json()["detail"]


def test_delete_document_with_confirm(client: TestClient, monkeypatch):
    monkeypatch.setattr("backend.app.api.documents.list_indexed_sources", lambda: ["demo.md"])
    monkeypatch.setattr("backend.app.api.documents.delete_source", lambda _n: True)

    res = client.delete("/api/documents/demo.md", headers={"X-Confirm": "PURGE"})
    assert res.status_code == 200
    assert res.json()["status"] == "deleted"


def test_clear_all_requires_confirm(client: TestClient, monkeypatch):
    monkeypatch.setattr("backend.app.api.documents.reset_index", lambda: None)

    res = client.delete("/api/documents")
    assert res.status_code == 400


def test_clear_all_with_confirm(client: TestClient, monkeypatch):
    monkeypatch.setattr("backend.app.api.documents.reset_index", lambda: None)

    res = client.delete("/api/documents", headers={"X-Confirm": "PURGE"})
    assert res.status_code == 200
    assert res.json()["status"] == "cleared"


def test_upload_rejects_path_traversal_filename(client: TestClient, monkeypatch):
    monkeypatch.setattr("backend.app.api.documents.list_indexed_sources", lambda: [])
    monkeypatch.setattr("backend.app.api.documents.ingest_paths", lambda _p: 0)

    res = client.post(
        "/api/documents/upload",
        files={"files": ("../../evil.md", BytesIO(b"# test"), "text/markdown")},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["files"] == 0
    assert any(r["reason"] == "invalid_filename" for r in data["rejected"])


def test_upload_rejects_unsupported_extension(client: TestClient, monkeypatch):
    monkeypatch.setattr("backend.app.api.documents.list_indexed_sources", lambda: [])
    monkeypatch.setattr("backend.app.api.documents.ingest_paths", lambda _p: 0)

    res = client.post(
        "/api/documents/upload",
        files={"files": ("notes.docx", BytesIO(b"data"), "application/octet-stream")},
    )
    assert res.status_code == 200
    data = res.json()
    assert any(r["reason"] == "unsupported_extension" for r in data["rejected"])


def test_upload_rejects_oversized_file(client: TestClient, monkeypatch):
    monkeypatch.setattr("backend.app.api.documents.list_indexed_sources", lambda: [])
    monkeypatch.setattr("backend.app.api.documents.ingest_paths", lambda _p: 0)
    monkeypatch.setattr("backend.app.core.config.settings.max_upload_bytes", 16)

    res = client.post(
        "/api/documents/upload",
        files={"files": ("big.txt", BytesIO(b"x" * 32), "text/plain")},
    )
    assert res.status_code == 200
    data = res.json()
    assert any(r["reason"] == "file_too_large" for r in data["rejected"])
