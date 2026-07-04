from __future__ import annotations

import json
import shutil
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from backend.app.core.config import SAMPLES_DIR, UPLOADS_DIR, SAMPLE_FILENAMES, settings
from backend.app.services.ingest import (
    delete_source,
    ingest_directory,
    ingest_paths,
    list_indexed_sources,
    reset_index,
    samples_already_registered,
)
from backend.app.services.mount_state import get_mount_state, set_mounted

router = APIRouter(prefix="/documents", tags=["documents"])


class MountRequest(BaseModel):
    mounted: bool


@router.get("")
def get_documents():
    sources = list_indexed_sources()
    mount = get_mount_state(sources)
    return {
        "documents": [
            {
                "name": name,
                "mounted": mount.get(name, True),
                "is_sample": name in SAMPLE_FILENAMES,
            }
            for name in sources
        ],
        "total": len(sources),
    }


@router.post("/samples")
def ingest_samples():
    if not settings.openai_api_key or settings.openai_api_key.startswith("sk-your"):
        raise HTTPException(400, "OPENAI_API_KEY가 .env에 설정되지 않았습니다.")
    if samples_already_registered():
        return {"status": "already_registered", "chunks": 0}
    try:
        count = ingest_directory(SAMPLES_DIR)
    except Exception as exc:
        raise HTTPException(500, f"샘플 ingest 실패: {exc}") from exc
    return {"status": "ok", "chunks": count}


@router.post("/upload")
async def upload_documents(files: list[UploadFile] = File(...)):
    existing = set(list_indexed_sources())
    saved: list[Path] = []
    skipped: list[str] = []
    for upload in files:
        name = upload.filename or "unnamed"
        suffix = Path(name).suffix.lower()
        if suffix not in {".txt", ".md", ".pdf"}:
            continue
        if name in existing:
            skipped.append(name)
            continue
        target = UPLOADS_DIR / name
        target.write_bytes(await upload.read())
        saved.append(target)
    if not saved and not skipped:
        raise HTTPException(400, "No valid files (PDF, MD, TXT)")
    chunks = ingest_paths(saved) if saved else 0
    return {
        "status": "ok",
        "files": len(saved),
        "chunks": chunks,
        "skipped": skipped,
    }


@router.patch("/{source_name}/mount")
def toggle_mount(source_name: str, body: MountRequest):
    sources = list_indexed_sources()
    if source_name not in sources:
        raise HTTPException(404, "Document not found")
    set_mounted(source_name, body.mounted)
    return {"name": source_name, "mounted": body.mounted}


@router.delete("/{source_name}")
def remove_document(source_name: str):
    if not delete_source(source_name):
        raise HTTPException(404, "Document not found")
    upload_path = UPLOADS_DIR / source_name
    if upload_path.exists():
        upload_path.unlink()
    return {"status": "deleted", "name": source_name}


@router.delete("")
def clear_all():
    reset_index()
    return {"status": "cleared"}
