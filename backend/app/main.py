import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api import chat, documents
from backend.app.core.config import settings
from backend.app.middleware.auth import ApiKeyMiddleware
from backend.app.middleware.rate_limit import RateLimitMiddleware

logger = logging.getLogger(__name__)

app = FastAPI(
    title="HYPERBRAIN RAG API",
    version="1.0.0",
    description="Sci-Fi Second Brain RAG backend",
)

cors_kwargs: dict = {
    "allow_origins": settings.cors_origin_list,
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}
if settings.allow_vercel_previews:
    cors_kwargs["allow_origin_regex"] = r"https://.*\.vercel\.app"

app.add_middleware(CORSMiddleware, **cors_kwargs)
app.add_middleware(RateLimitMiddleware, requests_per_minute=settings.rate_limit_per_minute)
app.add_middleware(ApiKeyMiddleware)

app.include_router(documents.router, prefix="/api")
app.include_router(chat.router, prefix="/api")


@app.on_event("startup")
def validate_config():
    if not settings.openai_api_key:
        logger.warning("OPENAI_API_KEY is not set — chat and ingest will fail")
    logger.info("CORS origins: %s", settings.cors_origin_list)
    if settings.allow_vercel_previews:
        logger.info("Vercel preview origins (*.vercel.app) allowed")


@app.get("/api/health")
def health():
    return {
        "status": "online",
        "system": "HYPERBRAIN RAG",
        "openai_configured": bool(settings.openai_api_key),
    }
