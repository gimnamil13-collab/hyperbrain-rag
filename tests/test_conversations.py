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


def test_append_message_with_sources(client):
    from backend.app.services.conversations import append_message, get_conversation

    created = client.post("/api/conversations", json={"title": "Sources test"}).json()
    sources = [{"id": 1, "source": "para_method.md", "page": None, "preview": "p", "content": "c"}]
    append_message(created["id"], "assistant", "partial answer", sources=sources)

    conv = get_conversation(created["id"])
    assert conv is not None
    assert len(conv["messages"]) == 1
    assert conv["messages"][0]["sources"] == sources
