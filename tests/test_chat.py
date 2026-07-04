def test_chat_stream(client, sample_conversation, monkeypatch):
    monkeypatch.setattr("backend.app.api.chat.list_indexed_sources", lambda: ["para_method.md"])

    def fake_stream(_question, _history, _sources):
        yield {"type": "token", "content": "PARA is "}
        yield {"type": "token", "content": "a method."}
        yield {
            "type": "sources",
            "sources": [
                {
                    "id": 1,
                    "source": "para_method.md",
                    "page": None,
                    "preview": "PARA preview",
                    "content": "PARA full content",
                }
            ],
        }

    monkeypatch.setattr("backend.app.api.chat.stream_answer", fake_stream)

    res = client.post(
        "/api/chat/stream",
        json={"conversation_id": sample_conversation["id"], "message": "What is PARA?"},
    )
    assert res.status_code == 200
    body = res.text
    assert '"type": "token"' in body or '"type":"token"' in body
    assert '"type": "sources"' in body or '"type":"sources"' in body
    assert "[DONE]" in body

    conv = client.get(f"/api/conversations/{sample_conversation['id']}").json()
    assert len(conv["messages"]) == 2
    assert conv["messages"][0]["role"] == "user"
    assert conv["messages"][1]["role"] == "assistant"
    assert "PARA" in conv["messages"][1]["content"]


def test_chat_no_documents(client, sample_conversation, monkeypatch):
    monkeypatch.setattr("backend.app.api.chat.list_indexed_sources", lambda: [])

    res = client.post(
        "/api/chat/stream",
        json={"conversation_id": sample_conversation["id"], "message": "hi"},
    )
    assert res.status_code == 400


def test_chat_unknown_conversation(client, monkeypatch):
    monkeypatch.setattr("backend.app.api.chat.list_indexed_sources", lambda: ["a.md"])

    res = client.post(
        "/api/chat/stream",
        json={"conversation_id": "missing", "message": "hi"},
    )
    assert res.status_code == 404
