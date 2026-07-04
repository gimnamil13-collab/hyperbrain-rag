from __future__ import annotations

from fastapi.testclient import TestClient


def test_health_without_api_key(client: TestClient, monkeypatch):
    monkeypatch.setattr("backend.app.core.config.settings.api_secret_key", "secret-key")
    res = client.get("/api/health")
    assert res.status_code == 200


def test_missing_api_key_returns_401(client: TestClient, monkeypatch):
    monkeypatch.setattr("backend.app.core.config.settings.api_secret_key", "secret-key")
    res = client.get("/api/documents")
    assert res.status_code == 401


def test_valid_api_key_passes(client: TestClient, monkeypatch):
    monkeypatch.setattr("backend.app.core.config.settings.api_secret_key", "secret-key")
    res = client.get("/api/documents", headers={"X-API-Key": "secret-key"})
    assert res.status_code == 200


def test_wrong_api_key_returns_401(client: TestClient, monkeypatch):
    monkeypatch.setattr("backend.app.core.config.settings.api_secret_key", "secret-key")
    res = client.get("/api/documents", headers={"X-API-Key": "wrong"})
    assert res.status_code == 401
