from __future__ import annotations

from unittest.mock import MagicMock

from backend.app.services import rag


def test_retrieve_documents_empty_when_no_active_sources(monkeypatch):
    monkeypatch.setattr(rag, "get_vectorstore", lambda: MagicMock())
    docs = rag.retrieve_documents("query", active_sources=[])
    assert docs == []


def test_trim_history_keeps_recent_messages():
    history = [{"role": "user", "content": f"msg-{i}"} for i in range(20)]
    trimmed = rag.trim_history(history)
    assert len(trimmed) == rag.settings.max_history_messages
    assert trimmed[0]["content"] == "msg-8"
    assert trimmed[-1]["content"] == "msg-19"


def test_retrieve_documents_uses_metadata_filter(monkeypatch):
    mock_store = MagicMock()
    mock_store.similarity_search.return_value = ["doc-a"]
    monkeypatch.setattr(rag, "get_vectorstore", lambda: mock_store)

    result = rag.retrieve_documents("query", active_sources=["a.md", "b.md"])

    mock_store.similarity_search.assert_called_once_with(
        "query",
        k=rag.settings.retrieval_k,
        filter={"source": {"$in": ["a.md", "b.md"]}},
    )
    assert result == ["doc-a"]


def test_resolve_sources_builds_from_retrieval(monkeypatch):
    mock_doc = MagicMock()
    mock_doc.metadata = {"source": "a.md", "page": None}
    mock_doc.page_content = "sample content for resolve"

    mock_store = MagicMock()
    mock_store.similarity_search.return_value = [mock_doc]
    monkeypatch.setattr(rag, "get_vectorstore", lambda: mock_store)
    monkeypatch.setattr(rag, "mounted_sources", lambda sources: sources)

    resolved = rag.resolve_sources("query", ["a.md"])

    assert len(resolved) == 1
    assert resolved[0]["source"] == "a.md"
    assert "sample content" in resolved[0]["content"]
