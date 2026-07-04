"""Sample ingest script: python scripts/ingest_samples.py"""

from src.config import SAMPLES_DIR
from src.ingest import ingest_directory, list_indexed_sources, reset_index


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
