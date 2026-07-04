"""Quick RAG quality spot-check against running API."""
from __future__ import annotations

import json
import urllib.request

API = "http://localhost:8000"

QUESTIONS = [
    "PARA 방법론이란?",
    "Zettelkasten은 무엇인가?",
    "세컨드 브레인이란?",
]


def chat(question: str) -> dict:
    conv_req = urllib.request.Request(
        f"{API}/api/conversations",
        data=json.dumps({"title": "rag-check"}).encode(),
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(conv_req, timeout=30) as resp:
        conv = json.loads(resp.read().decode())
    cid = conv["id"]

    body = json.dumps({"conversation_id": cid, "message": question}).encode()
    req = urllib.request.Request(
        f"{API}/api/chat/stream",
        data=body,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=90) as resp:
        text = resp.read().decode()

    tokens = []
    sources = []
    for line in text.split("\n"):
        if not line.startswith("data: "):
            continue
        payload = line[6:].strip()
        if payload == "[DONE]":
            break
        try:
            event = json.loads(payload)
        except json.JSONDecodeError:
            continue
        if event.get("type") == "token":
            tokens.append(event.get("content", ""))
        elif event.get("type") == "sources":
            sources = event.get("sources", [])

    urllib.request.urlopen(
        urllib.request.Request(f"{API}/api/conversations/{cid}", method="DELETE"),
        timeout=30,
    )

    answer = "".join(tokens).strip()
    source_names = [s.get("source", "?") for s in sources]
    has_citation = "[" in answer and "]" in answer
    return {"question": question, "answer": answer, "sources": source_names, "has_citation": has_citation}


def main() -> int:
    print("\n=== RAG Spot Check ===\n")
    ok = 0
    for q in QUESTIONS:
        try:
            result = chat(q)
            has_answer = len(result["answer"]) > 20
            has_sources = len(result["sources"]) > 0
            has_citation = result.get("has_citation", False)
            status = "OK" if has_answer and has_sources and has_citation else "WEAK"
            if status == "OK":
                ok += 1
            print(f"[{status}] {q}")
            print(f"  sources: {', '.join(result['sources']) or '(none)'}")
            print(f"  citation: {'yes' if result.get('has_citation') else 'no'}")
            print(f"  preview: {result['answer'][:120]}...")
            print()
        except Exception as exc:
            print(f"[FAIL] {q} | {exc}\n")
    print(f"=== {ok}/{len(QUESTIONS)} with answer+sources+citation ===\n")
    return 0 if ok >= 2 else 1


if __name__ == "__main__":
    raise SystemExit(main())
