from pathlib import Path
import os

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = ROOT / "data"
SAMPLES_DIR = DATA_DIR / "samples"
UPLOADS_DIR = DATA_DIR / "uploads"
STATE_DIR = ROOT / "backend" / "data"
CONVERSATIONS_FILE = STATE_DIR / "conversations.json"
MOUNT_STATE_FILE = STATE_DIR / "mount_state.json"


def _default_chroma_dir() -> Path:
    if os.environ.get("CHROMA_DIR"):
        return Path(os.environ["CHROMA_DIR"])
    local_app = os.environ.get("LOCALAPPDATA")
    if local_app:
        return Path(local_app) / "HyperbrainRAG" / "chroma_db"
    return Path("/tmp/hyperbrain_rag/chroma_db")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    openai_api_key: str = ""
    llm_model: str = "gpt-4o-mini"
    embedding_model: str = "text-embedding-3-small"
    chunk_size: int = 800
    chunk_overlap: int = 120
    retrieval_k: int = 5
    max_history_messages: int = 12
    chroma_dir: str = str(_default_chroma_dir())
    cors_origins: str = "http://localhost:3000"
    allow_vercel_previews: bool = False
    rate_limit_per_minute: int = 60
    api_secret_key: str = ""
    max_upload_bytes: int = 10 * 1024 * 1024

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return any(
            origin.startswith("https://") and "localhost" not in origin
            for origin in self.cors_origin_list
        )


settings = Settings()

if settings.openai_api_key:
    os.environ.setdefault("OPENAI_API_KEY", settings.openai_api_key)

for directory in (SAMPLES_DIR, UPLOADS_DIR, STATE_DIR, Path(settings.chroma_dir)):
    directory.mkdir(parents=True, exist_ok=True)

SUPPORTED_EXTENSIONS = {".txt", ".md", ".pdf"}
SAMPLE_FILENAMES = {
    "second_brain_intro.md",
    "para_method.md",
    "zettelkasten_notes.md",
    "weekly_review.md",
}
