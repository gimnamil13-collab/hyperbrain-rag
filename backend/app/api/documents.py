from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, File, Header, HTTPException, UploadFile
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

_ALLOWED_SUFFIXES = {".txt", ".md", ".pdf"}
_ALLOWED_MIME = {
    ".txt": {"text/plain", "application/octet-stream"},
    ".md": {"text/markdown", "text/plain", "application/octet-stream"},
    ".pdf": {"application/pdf", "application/octet-stream"},
}
_PURGE_CONFIRM = "PURGE"


class MountRequest(BaseModel):
    mounted: bool


def _require_purge_confirm(x_confirm: str | None) -> None:
    if x_confirm != _PURGE_CONFIRM:
        raise HTTPException(
            400,
            "Destructive action requires X-Confirm: PURGE header.",
        )


def _safe_filename(raw: str | None) -> str | None:
    if not raw or not raw.strip():
        return None
    name = Path(raw).name
    if not name or name in {".", ".."}:
        return None
    if "/" in raw or "\\" in raw or raw != name:
        return None
    return name


def _mime_allowed(suffix: str, content_type: str | None) -> bool:
    if not content_type:
        return True
    base = content_type.split(";", 1)[0].strip().lower()
    return base in _ALLOWED_MIME.get(suffix, set())


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
    rejected: list[dict[str, str]] = []

    for upload in files:
        raw_name = upload.filename or "unnamed"
        name = _safe_filename(raw_name)
        if not name:
            rejected.append({"name": raw_name, "reason": "invalid_filename"})
            continue

        suffix = Path(name).suffix.lower()
        if suffix not in _ALLOWED_SUFFIXES:
            rejected.append({"name": name, "reason": "unsupported_extension"})
            continue

        if not _mime_allowed(suffix, upload.content_type):
            rejected.append({"name": name, "reason": "unsupported_mime"})
            continue

        if name in existing:
            skipped.append(name)
            continue

        data = await upload.read()
        if len(data) > settings.max_upload_bytes:
            rejected.append({"name": name, "reason": "file_too_large"})
            continue

        target = (UPLOADS_DIR / name).resolve()
        if not str(target).startswith(str(UPLOADS_DIR.resolve())):
            rejected.append({"name": name, "reason": "invalid_path"})
            continue

        target.write_bytes(data)
        saved.append(target)

    if not saved and not skipped and not rejected:
        raise HTTPException(400, "No valid files (PDF, MD, TXT)")

    chunks = ingest_paths(saved) if saved else 0
    return {
        "status": "ok",
        "files": len(saved),
        "chunks": chunks,
        "skipped": skipped,
        "rejected": rejected,
    }


@router.patch("/{source_name}/mount")
def toggle_mount(source_name: str, body: MountRequest):
    safe_name = _safe_filename(source_name)
    if not safe_name:
        raise HTTPException(400, "Invalid document name")

    sources = list_indexed_sources()
    if safe_name not in sources:
        raise HTTPException(404, "Document not found")
    set_mounted(safe_name, body.mounted)
    return {"name": safe_name, "mounted": body.mounted}


@router.delete("/{source_name}")
def remove_document(
    source_name: str,
    x_confirm: str | None = Header(default=None),
):
    _require_purge_confirm(x_confirm)

    safe_name = _safe_filename(source_name)
    if not safe_name:
        raise HTTPException(400, "Invalid document name")

    if not delete_source(safe_name):
        raise HTTPException(404, "Document not found")

    upload_path = UPLOADS_DIR / safe_name
    if upload_path.exists():
        upload_path.unlink()
    return {"status": "deleted", "name": safe_name}


@router.delete("")
def clear_all(x_confirm: str | None = Header(default=None)):
    _require_purge_confirm(x_confirm)
    reset_index()
    return {"status": "cleared"}
