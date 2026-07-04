"""Backup personal HYPERBRAIN data (conversations, uploads, Chroma index).

Usage:
  python scripts/backup_data.py
  python scripts/backup_data.py --out C:\\Backups\\hyperbrain
"""
from __future__ import annotations

import argparse
import shutil
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _chroma_dir() -> Path:
    import os

    if os.environ.get("CHROMA_DIR"):
        return Path(os.environ["CHROMA_DIR"])
    local_app = os.environ.get("LOCALAPPDATA")
    if local_app:
        return Path(local_app) / "HyperbrainRAG" / "chroma_db"
    return Path("/tmp/hyperbrain_rag/chroma_db")


def _copy_tree(src: Path, dest: Path) -> int:
    if not src.exists():
        return 0
    if src.is_file():
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)
        return 1
    count = 0
    for item in src.rglob("*"):
        if item.is_file():
            rel = item.relative_to(src)
            target = dest / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(item, target)
            count += 1
    return count


def main() -> int:
    parser = argparse.ArgumentParser(description="Backup HYPERBRAIN RAG local data")
    parser.add_argument(
        "--out",
        type=Path,
        default=ROOT / "backups" / datetime.now().strftime("%Y%m%d-%H%M%S"),
        help="Backup destination directory",
    )
    args = parser.parse_args()
    out: Path = args.out
    out.mkdir(parents=True, exist_ok=True)

    targets = {
        "backend_data": ROOT / "backend" / "data",
        "uploads": ROOT / "data" / "uploads",
        "chroma_db": _chroma_dir(),
    }

    print(f"\n=== HYPERBRAIN Backup → {out} ===\n")
    total = 0
    for name, src in targets.items():
        dest = out / name
        copied = _copy_tree(src, dest)
        total += copied
        status = "OK" if src.exists() else "SKIP (missing)"
        print(f"  {name:14} {status:16} files={copied}")

    print(f"\n=== Done: {total} files copied ===\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
