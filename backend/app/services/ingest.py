from __future__ import annotations

import json
import shutil
import threading
from collections.abc import Callable
from pathlib import Path
from typing import TypeVar

import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain_chroma import Chroma
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from backend.app.core.config import (
    SAMPLE_FILENAMES,
    SUPPORTED_EXTENSIONS,
    settings,
)

COLLECTION_NAME = "knowledge_base"
DB_TIMEOUT_SECONDS = 10.0

_client: chromadb.ClientAPI | None = None
_vectorstore: Chroma | None = None
_embeddings: OpenAIEmbeddings | None = None
_lock = threading.RLock()
T = TypeVar("T")


def _run_with_timeout(func: Callable[[], T], timeout: float = DB_TIMEOUT_SECONDS) -> T:
    result: dict[str, T | BaseException | None] = {"value": None, "error": None}

    def worker() -> None:
        try:
            result["value"] = func()
        except BaseException as exc:
            result["error"] = exc

    thread = threading.Thread(target=worker, daemon=True)
    thread.start()
    thread.join(timeout)
    if thread.is_alive():
        raise TimeoutError(f"ChromaDB timeout ({timeout}s)")
    if result["error"] is not None:
        raise result["error"]
    return result["value"]  # type: ignore[return-value]


def _reset_storage() -> None:
    global _client, _vectorstore
    _client = None
    _vectorstore = None
    chroma_path = Path(settings.chroma_dir)
    shutil.rmtree(chroma_path, ignore_errors=True)
    chroma_path.mkdir(parents=True, exist_ok=True)


def get_embeddings() -> OpenAIEmbeddings:
    global _embeddings
    if _embeddings is None:
        _embeddings = OpenAIEmbeddings(
            model=settings.embedding_model,
            api_key=settings.openai_api_key or None,
        )
    return _embeddings


def get_chroma_client() -> chromadb.ClientAPI:
    global _client
    with _lock:
        if _client is not None:
            return _client
        chroma_path = Path(settings.chroma_dir)
        chroma_path.mkdir(parents=True, exist_ok=True)
        try:
            _client = chromadb.PersistentClient(
                path=str(chroma_path),
                settings=ChromaSettings(anonymized_telemetry=False, allow_reset=True),
            )
        except Exception:
            _reset_storage()
            _client = chromadb.PersistentClient(
                path=str(settings.chroma_dir),
                settings=ChromaSettings(anonymized_telemetry=False, allow_reset=True),
            )
        return _client


def get_vectorstore() -> Chroma:
    global _vectorstore
    with _lock:
        if _vectorstore is not None:
            return _vectorstore
        _vectorstore = Chroma(
            client=get_chroma_client(),
            collection_name=COLLECTION_NAME,
            embedding_function=get_embeddings(),
        )
        return _vectorstore


def _load_file(path: Path) -> list[Document]:
    suffix = path.suffix.lower()
    if suffix not in SUPPORTED_EXTENSIONS:
        raise ValueError(f"Unsupported file type: {suffix}")
    loader = PyPDFLoader(str(path)) if suffix == ".pdf" else TextLoader(str(path), encoding="utf-8")
    docs = loader.load()
    for doc in docs:
        doc.metadata["source"] = path.name
        doc.metadata["source_path"] = str(path)
    return docs


def split_documents(documents: list[Document]) -> list[Document]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    return splitter.split_documents(documents)


def ingest_paths(paths: list[Path]) -> int:
    documents: list[Document] = []
    for path in paths:
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS:
            documents.extend(_load_file(path))
    if not documents:
        return 0
    chunks = split_documents(documents)

    def _ingest() -> int:
        get_vectorstore().add_documents(chunks)
        return len(chunks)

    return _run_with_timeout(_ingest, timeout=120.0)


def ingest_directory(directory: Path) -> int:
    paths = [p for p in directory.iterdir() if p.is_file()]
    return ingest_paths(paths)


def list_indexed_sources() -> list[str]:
    def _list() -> list[str]:
        data = get_vectorstore().get(include=["metadatas"])
        return sorted(
            {
                m.get("source", "unknown")
                for m in data.get("metadatas", [])
                if m
            }
        )

    try:
        return _run_with_timeout(_list)
    except Exception:
        return []


def delete_source(source_name: str) -> bool:
    vectorstore = get_vectorstore()
    data = vectorstore.get(include=["metadatas"])
    ids_to_delete = [
        doc_id
        for doc_id, meta in zip(data["ids"], data["metadatas"])
        if meta and meta.get("source") == source_name
    ]
    if not ids_to_delete:
        return False
    vectorstore.delete(ids=ids_to_delete)
    return True


def reset_index() -> None:
    global _client, _vectorstore
    with _lock:
        try:
            if _vectorstore is not None:
                _vectorstore.reset_collection()
                return
            client = get_chroma_client()
            try:
                client.delete_collection(COLLECTION_NAME)
            except Exception:
                pass
        except Exception:
            _reset_storage()
        finally:
            _client = None
            _vectorstore = None


def samples_already_registered() -> bool:
    sources = set(list_indexed_sources())
    return bool(SAMPLE_FILENAMES & sources)
