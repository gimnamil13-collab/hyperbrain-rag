from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.app.services.conversations import (
    append_message,
    create_conversation,
    delete_conversation,
    get_conversation,
    list_conversations,
)
from backend.app.services.ingest import list_indexed_sources
from backend.app.services.rag import resolve_sources, stream_answer

router = APIRouter(tags=["chat"])

CANCEL_SUFFIX = " — (중단됨)"


class CreateConversationRequest(BaseModel):
    title: str | None = None


class ChatRequest(BaseModel):
    conversation_id: str
    message: str


@router.get("/conversations")
def get_conversations():
    return {"conversations": list_conversations()}


@router.post("/conversations")
def post_conversation(body: CreateConversationRequest):
    return create_conversation(body.title)


@router.get("/conversations/{conversation_id}")
def get_conversation_by_id(conversation_id: str):
    conv = get_conversation(conversation_id)
    if not conv:
        raise HTTPException(404, "Conversation not found")
    return conv


@router.delete("/conversations/{conversation_id}")
def remove_conversation(conversation_id: str):
    if not delete_conversation(conversation_id):
        raise HTTPException(404, "Conversation not found")
    return {"status": "deleted"}


@router.post("/chat/stream")
async def chat_stream(body: ChatRequest, request: Request):
    conv = get_conversation(body.conversation_id)
    if not conv:
        raise HTTPException(404, "Conversation not found")

    indexed_sources = list_indexed_sources()
    if not indexed_sources:
        raise HTTPException(400, "No documents registered. Ingest samples or upload files first.")

    history = conv.get("messages", [])
    append_message(body.conversation_id, "user", body.message)

    async def event_generator():
        full = ""
        final_sources: list[dict] = []
        completed = False
        errored = False

        try:
            for event in stream_answer(body.message, history, indexed_sources):
                if await request.is_disconnected():
                    break

                if event["type"] == "token":
                    full += event["content"]
                    yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
                elif event["type"] == "sources":
                    final_sources = event["sources"]
                    yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
            else:
                append_message(
                    body.conversation_id,
                    "assistant",
                    full,
                    sources=final_sources or None,
                )
                completed = True
                yield "data: [DONE]\n\n"
        except Exception as exc:
            errored = True
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)}, ensure_ascii=False)}\n\n"
        finally:
            if not completed and not errored and full.strip():
                sources_to_save = final_sources or resolve_sources(body.message, indexed_sources)
                append_message(
                    body.conversation_id,
                    "assistant",
                    full.rstrip() + CANCEL_SUFFIX,
                    sources=sources_to_save or None,
                )

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
