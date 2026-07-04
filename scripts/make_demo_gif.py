"""Combine PNG frames into docs/demo.gif. Usage: python scripts/make_demo_gif.py"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
FRAMES_DIR = ROOT / "docs" / "frames"
OUTPUT = ROOT / "docs" / "demo.gif"

FRAME_ORDER = [
    "01-ready.png",
    "02-nodes.png",
    "03-chat.png",
    "04-sources.png",
]


def main() -> None:
    paths = [FRAMES_DIR / name for name in FRAME_ORDER]
    missing = [p for p in paths if not p.exists()]
    if missing:
        raise SystemExit(f"Missing frames: {', '.join(p.name for p in missing)}")

    images = [Image.open(p).convert("RGB") for p in paths]
    width = min(img.width for img in images)
    height = min(img.height for img in images)
    resized = [img.resize((width, height), Image.Resampling.LANCZOS) for img in images]

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    resized[0].save(
        OUTPUT,
        save_all=True,
        append_images=resized[1:],
        duration=1800,
        loop=0,
        optimize=True,
    )
    print(f"Created {OUTPUT} ({len(resized)} frames, {width}x{height})")


if __name__ == "__main__":
    main()
