from __future__ import annotations

from dataclasses import dataclass

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_openai import ChatOpenAI

from backend.app.core.config import settings
from backend.app.services.ingest import get_vectorstore
from backend.app.services.mount_state import mounted_sources

SYSTEM_PROMPT = """You are HYPERBRAIN — a sci-fi personal knowledge AI.
Answer using ONLY the provided context and conversation history.
If the answer is not in the context, say so clearly and suggest what knowledge to add.
Do not invent facts. Prefer citing sources as [1], [2] when the context supports it.
Match the user's language (Korean or English).
Be concise and accurate."""


@dataclass
class RagResponse:
    answer: str
    sources: list[dict]


def _build_prompt() -> ChatPromptTemplate:
    return ChatPromptTemplate.from_messages(
        [
            ("system", SYSTEM_PROMPT),
            MessagesPlaceholder("history"),
            (
                "human",
                "Knowledge context:\n\n{context}\n\nQuery: {question}",
            ),
        ]
    )


def _get_llm(streaming: bool = False) -> ChatOpenAI:
    return ChatOpenAI(
        model=settings.llm_model,
        temperature=0.2,
        streaming=streaming,
        api_key=settings.openai_api_key or None,
    )


def retrieve_documents(question: str, active_sources: list[str] | None = None):
    vectorstore = get_vectorstore()

    if active_sources is not None and not active_sources:
        return []

    kwargs: dict = {"k": settings.retrieval_k}
    if active_sources is not None:
        kwargs["filter"] = {"source": {"$in": active_sources}}

    return vectorstore.similarity_search(question, **kwargs)


def format_context(docs) -> str:
    blocks = []
    for index, doc in enumerate(docs, start=1):
        source = doc.metadata.get("source", "unknown")
        page = doc.metadata.get("page")
        page_label = f", p.{page + 1}" if page is not None else ""
        blocks.append(f"[{index}] {source}{page_label}\n{doc.page_content.strip()}")
    return "\n\n---\n\n".join(blocks)


def build_sources(docs) -> list[dict]:
    seen: set[tuple] = set()
    sources = []
    for index, doc in enumerate(docs, start=1):
        source = doc.metadata.get("source", "unknown")
        page = doc.metadata.get("page")
        key = (source, page)
        if key in seen:
            continue
        seen.add(key)
        sources.append(
            {
                "id": index,
                "source": source,
                "page": page + 1 if page is not None else None,
                "preview": doc.page_content[:280].strip(),
                "content": doc.page_content.strip(),
            }
        )
    return sources


def trim_history(chat_history: list[dict]) -> list[dict]:
    limit = settings.max_history_messages
    if limit <= 0 or len(chat_history) <= limit:
        return chat_history
    return chat_history[-limit:]


def to_langchain_messages(chat_history: list[dict]) -> list[BaseMessage]:
    messages: list[BaseMessage] = []
    for turn in trim_history(chat_history):
        role, content = turn.get("role"), turn.get("content", "")
        if role == "user":
            messages.append(HumanMessage(content=content))
        elif role == "assistant":
            messages.append(AIMessage(content=content))
    return messages


def stream_answer(question: str, history: list[dict], all_sources: list[str]):
    active = mounted_sources(all_sources)
    docs = retrieve_documents(question, active)
    context = format_context(docs)
    prompt = _build_prompt()
    chain = prompt | _get_llm(streaming=True) | StrOutputParser()
    for chunk in chain.stream(
        {"context": context, "question": question, "history": to_langchain_messages(history)}
    ):
        yield {"type": "token", "content": chunk}
    yield {"type": "sources", "sources": build_sources(docs)}
