"""HYPERBRAIN RAG runtime smoke tests. Run: python scripts/smoke_test.py"""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request

API = "http://localhost:8000"
UI = "http://localhost:3000"

passed = 0
failed = 0
skipped = 0


def ok(name: str, detail: str = "") -> None:
    global passed
    passed += 1
    print(f"  PASS  {name}" + (f" | {detail}" if detail else ""))


def fail(name: str, detail: str = "") -> None:
    global failed
    failed += 1
    print(f"  FAIL  {name}" + (f" | {detail}" if detail else ""))


def skip(name: str, reason: str) -> None:
    global skipped
    skipped += 1
    print(f"  SKIP  {name} | {reason}")


def request(method: str, path: str, body: dict | None = None, timeout: int = 30) -> tuple[int, dict | str]:
    url = f"{API}{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={"Content-Type": "application/json"} if data else {},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode()
            try:
                return resp.status, json.loads(raw)
            except json.JSONDecodeError:
                return resp.status, raw
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, raw


def test_health() -> None:
    code, data = request("GET", "/api/health")
    if code == 200 and isinstance(data, dict) and data.get("status") == "online":
        ok("GET /api/health", f"openai={data.get('openai_configured')}")
    else:
        fail("GET /api/health", str(data))


def test_documents_list() -> None:
    code, data = request("GET", "/api/documents")
    if code == 200 and isinstance(data, dict) and "documents" in data:
        ok("GET /api/documents", f"total={data.get('total')}")
    else:
        fail("GET /api/documents", str(data))


def test_samples_ingest() -> None:
    code, data = request("POST", "/api/documents/samples", timeout=120)
    if code == 200 and isinstance(data, dict) and data.get("status") in ("ok", "already_registered"):
        ok("POST /api/documents/samples", data.get("status", ""))
    else:
        fail("POST /api/documents/samples", f"{code} {data}")


def test_conversations_crud() -> None:
    code, created = request("POST", "/api/conversations", {"title": "smoke-test"})
    if code != 200 or not isinstance(created, dict) or "id" not in created:
        fail("POST /api/conversations", str(created))
        return
    cid = created["id"]
    ok("POST /api/conversations", cid[:8])

    code, got = request("GET", f"/api/conversations/{cid}")
    if code == 200 and isinstance(got, dict) and got.get("id") == cid:
        ok("GET /api/conversations/{id}")
    else:
        fail("GET /api/conversations/{id}", str(got))

    code, listed = request("GET", "/api/conversations")
    if code == 200 and any(c.get("id") == cid for c in listed.get("conversations", [])):
        ok("GET /api/conversations list")
    else:
        fail("GET /api/conversations list")

    code, _ = request("DELETE", f"/api/conversations/{cid}")
    if code == 200:
        ok("DELETE /api/conversations/{id}")
    else:
        fail("DELETE /api/conversations/{id}")


def test_mount_toggle() -> None:
    code, data = request("GET", "/api/documents")
    if code != 200 or not data.get("documents"):
        skip("PATCH mount toggle", "no documents")
        return
    name = data["documents"][0]["name"]
    mounted = data["documents"][0]["mounted"]
    code, res = request("PATCH", f"/api/documents/{name}/mount", {"mounted": not mounted})
    if code == 200:
        ok("PATCH /api/documents/{name}/mount", f"{name} -> {not mounted}")
        request("PATCH", f"/api/documents/{name}/mount", {"mounted": mounted})
    else:
        fail("PATCH mount", str(res))


def test_chat_stream() -> None:
    code, docs = request("GET", "/api/documents")
    mounted = [d["name"] for d in docs.get("documents", []) if d.get("mounted")]
    if not mounted:
        skip("POST /api/chat/stream", "no mounted documents")
        return

    code, conv = request("POST", "/api/conversations", {"title": "smoke-chat"})
    if code != 200:
        fail("chat setup", str(conv))
        return
    cid = conv["id"]

    url = f"{API}/api/chat/stream"
    body = json.dumps({"conversation_id": cid, "message": "PARA란?"}).encode()
    req = urllib.request.Request(url, data=body, method="POST", headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            text = resp.read().decode()
    except Exception as e:
        fail("POST /api/chat/stream", str(e))
        request("DELETE", f"/api/conversations/{cid}")
        return

    has_token = '"type": "token"' in text or '"type":"token"' in text
    has_sources = '"type": "sources"' in text or '"type":"sources"' in text
    has_done = "[DONE]" in text
    if has_token and has_sources and has_done:
        ok("POST /api/chat/stream", "token+sources+DONE")
    else:
        fail("POST /api/chat/stream", f"token={has_token} sources={has_sources} done={has_done}")

    request("DELETE", f"/api/conversations/{cid}")


def test_ui_reachable() -> None:
    try:
        with urllib.request.urlopen(UI, timeout=10) as resp:
            html = resp.read().decode(errors="ignore")
            if resp.status == 200 and ("HYPERBRAIN" in html or "hyperbrain" in html.lower() or len(html) > 500):
                ok("GET localhost:3000", f"status={resp.status}")
            else:
                fail("GET localhost:3000", "unexpected response")
    except Exception as e:
        fail("GET localhost:3000", str(e))


def main() -> int:
    print("\n=== HYPERBRAIN RAG Smoke Test ===\n")
    print("[Backend API]")
    test_health()
    test_documents_list()
    test_samples_ingest()
    test_conversations_crud()
    test_mount_toggle()
    test_chat_stream()
    print("\n[Frontend]")
    test_ui_reachable()
    print(f"\n=== Result: {passed} passed, {failed} failed, {skipped} skipped ===\n")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
