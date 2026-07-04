"""Sample ingest via backend services: python scripts/ingest_samples.py"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.app.core.config import SAMPLES_DIR
from backend.app.services.ingest import ingest_directory, list_indexed_sources, reset_index


def main() -> None:
    print("Resetting index and ingesting sample documents...")
    reset_index()
    count = ingest_directory(SAMPLES_DIR)
    sources = list_indexed_sources()
    print(f"Indexed {count} chunks from {len(sources)} files:")
    for source in sources:
        print(f"  - {source}")


if __name__ == "__main__":
    main()
