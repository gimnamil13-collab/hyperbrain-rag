from __future__ import annotations

from unittest.mock import MagicMock

from backend.app.services import rag


def test_retrieve_documents_empty_when_no_active_sources(monkeypatch):
    monkeypatch.setattr(rag, "get_vectorstore", lambda: MagicMock())
    docs = rag.retrieve_documents("query", active_sources=[])
    assert docs == []


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
