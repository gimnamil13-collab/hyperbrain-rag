def test_list_documents_empty(client):
    res = client.get("/api/documents")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 0
    assert data["documents"] == []


def test_samples_missing_api_key(client, monkeypatch):
    monkeypatch.setattr("backend.app.core.config.settings.openai_api_key", "")
    res = client.post("/api/documents/samples")
    assert res.status_code == 400
    assert "OPENAI_API_KEY" in res.json()["detail"]


def test_samples_ingest_ok(client, monkeypatch):
    monkeypatch.setattr("backend.app.api.documents.samples_already_registered", lambda: False)
    monkeypatch.setattr("backend.app.api.documents.ingest_directory", lambda _d: 5)

    res = client.post("/api/documents/samples")
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "chunks": 5}


def test_samples_already_registered(client, monkeypatch):
    monkeypatch.setattr("backend.app.api.documents.samples_already_registered", lambda: True)

    res = client.post("/api/documents/samples")
    assert res.status_code == 200
    assert res.json()["status"] == "already_registered"


def test_mount_unknown_document(client):
    res = client.patch("/api/documents/missing.md/mount", json={"mounted": True})
    assert res.status_code == 404


def test_mount_toggle(client, monkeypatch):
    monkeypatch.setattr("backend.app.api.documents.list_indexed_sources", lambda: ["demo.md"])

    res = client.patch("/api/documents/demo.md/mount", json={"mounted": False})
    assert res.status_code == 200
    assert res.json()["mounted"] is False

    listed = client.get("/api/documents").json()
    doc = next(d for d in listed["documents"] if d["name"] == "demo.md")
    assert doc["mounted"] is False


def test_clear_all_documents(client, monkeypatch):
    monkeypatch.setattr("backend.app.api.documents.reset_index", lambda: None)

    res = client.delete("/api/documents")
    assert res.status_code == 200
    assert res.json()["status"] == "cleared"
