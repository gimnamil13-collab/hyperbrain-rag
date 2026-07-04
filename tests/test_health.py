def test_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "online"
    assert data["system"] == "HYPERBRAIN RAG"
    assert data["openai_configured"] is True
