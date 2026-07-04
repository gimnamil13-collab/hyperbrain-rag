"""실행.bat 사전 검사: .env, 의존성, 사용 가능 포트."""

from __future__ import annotations

import socket
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RUN_DIR = ROOT / ".run"
PORT_FILE = RUN_DIR / "port.txt"

REQUIRED_PACKAGES: list[tuple[str, str]] = [
    ("streamlit", "streamlit"),
    ("langchain", "langchain"),
    ("langchain_openai", "langchain-openai"),
    ("langchain_chroma", "langchain-chroma"),
    ("langchain_community", "langchain-community"),
    ("langchain_text_splitters", "langchain-text-splitters"),
    ("chromadb", "chromadb"),
    ("pypdf", "pypdf"),
    ("dotenv", "python-dotenv"),
]


def find_free_port(start: int = 8501, attempts: int = 20) -> int | None:
    for port in range(start, start + attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                sock.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    return None


def check_env_file() -> bool:
    env_path = ROOT / ".env"
    example_path = ROOT / ".env.example"

    if not env_path.exists():
        print("[오류] .env 파일이 없습니다.")
        if example_path.exists():
            print("       해결: .env.example 을 복사해 .env 파일을 만드세요.")
            print("       예) copy .env.example .env")
        else:
            print("       .env 파일을 만들고 OPENAI_API_KEY=sk-... 를 입력하세요.")
        return False

    key = ""
    for line in env_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if stripped.startswith("#") or "=" not in stripped:
            continue
        name, value = stripped.split("=", 1)
        if name.strip() == "OPENAI_API_KEY":
            key = value.strip().strip('"').strip("'")
            break

    placeholders = {"", "sk-your-key-here", "your-key-here", "sk-..."}
    if key in placeholders:
        print("[오류] OPENAI_API_KEY가 .env에 설정되지 않았습니다.")
        print("       .env 파일을 열고 OpenAI API 키를 입력하세요.")
        print("       예) OPENAI_API_KEY=sk-proj-...")
        return False

    if not key.startswith("sk-"):
        print("[경고] OPENAI_API_KEY 형식이 일반적이지 않습니다. 키를 다시 확인하세요.")

    return True


def check_dependencies() -> list[str]:
    missing: list[str] = []
    for module_name, package_name in REQUIRED_PACKAGES:
        try:
            __import__(module_name)
        except ImportError:
            missing.append(package_name)
    return missing


def main() -> int:
    if not check_env_file():
        return 1

    missing = check_dependencies()
    if missing:
        print("[설치필요] 다음 라이브러리가 없습니다:")
        for package in missing:
            print(f"       - {package}")
        print("       실행.bat 이 자동으로 설치를 시도합니다.")
        return 2

    port = find_free_port()
    if port is None:
        print("[오류] 사용 가능한 포트(8501~8520)를 찾지 못했습니다.")
        print("       종료.bat 으로 기존 Streamlit을 종료한 뒤 다시 실행하세요.")
        return 1

    RUN_DIR.mkdir(parents=True, exist_ok=True)
    PORT_FILE.write_text(str(port), encoding="utf-8")

    if port != 8501:
        print(f"[안내] 포트 8501이 사용 중입니다. 포트 {port}로 실행합니다.")

    print(f"PORT={port}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
