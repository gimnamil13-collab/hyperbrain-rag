def test_list_conversations_empty(client):
    res = client.get("/api/conversations")
    assert res.status_code == 200
    assert res.json()["conversations"] == []


def test_create_and_get_conversation(client):
    created = client.post("/api/conversations", json={"title": "Test Session"}).json()
    assert created["title"] == "Test Session"
    assert created["messages"] == []

    res = client.get(f"/api/conversations/{created['id']}")
    assert res.status_code == 200
    assert res.json()["id"] == created["id"]


def test_delete_conversation(client):
    a = client.post("/api/conversations", json={"title": "A"}).json()
    client.post("/api/conversations", json={"title": "B"})

    res = client.delete(f"/api/conversations/{a['id']}")
    assert res.status_code == 200

    listed = client.get("/api/conversations").json()["conversations"]
    assert all(c["id"] != a["id"] for c in listed)


def test_delete_missing_conversation_returns_404(client):
    res = client.delete("/api/conversations/nonexistent-id")
    assert res.status_code == 404
