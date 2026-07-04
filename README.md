# HYPERBRAIN RAG

Sci-Fi cyber-tech Second Brain RAG — **Next.js 14 + FastAPI**

![HYPERBRAIN RAG demo](docs/demo.gif)

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14, Tailwind, Framer Motion |
| Backend | FastAPI, SSE streaming |
| RAG | LangChain, ChromaDB, OpenAI gpt-4o-mini |

## Layout

```
[ 지식 노드 사이드바 ] | [ 채팅 인터페이스 ] | [ 출처 패널 ]
```

## Quick Start (Windows)

1. `.env`에 `OPENAI_API_KEY=sk-...` 설정
2. **`실행.bat`** 더블클릭
3. 브라우저 `http://localhost:3000`

## Manual Dev

```powershell
# Install
npm run install:all
pip install -r backend/requirements.txt

# Run both
npm run dev
```

- API: http://localhost:8000/api/health
- UI: http://localhost:3000

## Usage

1. Left panel → **샘플 노드 로드**
2. Center → type question
3. Right panel → click citation [1][2] for source highlight

## Smoke Test

`실행.bat`으로 API(:8000) + UI(:3000) 실행 후:

```powershell
npm run smoke:test
```

자동 검증 항목:
- Health, documents, samples ingest
- Conversations CRUD
- Mount toggle
- Chat SSE (token + sources + DONE)
- Frontend 응답 (localhost:3000)

### 수동 UI 체크리스트

1. 왼쪽 **PANEL** 토글로 사이드바 열기/닫기
2. **새 세션** 생성 · 세션 전환 · 삭제
3. **샘플 노드 로드** → 채팅 입력 활성화
4. 질문 전송 → **[1][2]** 인용 · **SOURCE** 패널 자동 열림
5. 출처 카드 클릭 ↔ 채팅 인용 하이라이트

## Tests (pytest)

백엔드 API 계약 검증 (Chroma 임시 디렉터리, OpenAI mock):

```powershell
npm run test:install   # 최초 1회
npm run test
```

커버리지: health, documents CRUD/mount, conversations CRUD, chat SSE (token + sources + DONE).

## Deploy (Option B)

### Architecture

```
Vercel (frontend)  →  NEXT_PUBLIC_API_URL  →  Railway / Render (FastAPI)
```

### 1. Backend — Railway (recommended)

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Root directory: repo root (not `frontend/`)
3. Railway reads `railway.toml` automatically
4. **Variables** (Settings → Variables):

| Variable | Value |
|----------|-------|
| `OPENAI_API_KEY` | `sk-...` |
| `CORS_ORIGINS` | `https://your-app.vercel.app` |
| `ALLOW_VERCEL_PREVIEWS` | `true` |
| `CHROMA_DIR` | `/tmp/hyperbrain_rag/chroma_db` |
| `RATE_LIMIT_PER_MINUTE` | `60` |

5. Deploy → copy public URL (e.g. `https://hyperbrain-rag-production.up.railway.app`)
6. Health check: `GET /api/health`

### 2. Backend — Render (alternative)

1. [render.com](https://render.com) → **New Blueprint** → connect repo
2. Uses `render.yaml` — review env vars, then apply
3. Or manual: **Web Service** → Build: `pip install -r backend/requirements.txt` → Start: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
4. Set `PYTHONPATH=.` and the same env vars as Railway

### 3. Frontend — Vercel

1. [vercel.com](https://vercel.com) → **Import** GitHub repo
2. **Root Directory**: `frontend`
3. **Environment Variable**:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | Railway/Render backend URL (no trailing slash) |

4. Deploy → open `https://your-app.vercel.app`

### Production notes

- **Ephemeral storage**: Railway/Render free tiers reset Chroma DB and uploads on redeploy. Users must click **샘플 노드 로드** after each cold start.
- **CORS**: Set `CORS_ORIGINS` to your Vercel production URL. Enable `ALLOW_VERCEL_PREVIEWS=true` for preview deployments.
- **Rate limiting**: 60 req/min per IP by default (`RATE_LIMIT_PER_MINUTE`). Health endpoint is exempt.
- **Secrets**: Never commit `.env`. API key lives only on the backend host.

### Local ↔ Production env reference

See `backend/.env.example` and `frontend/.env.local.example`.

## Legacy

Streamlit UI and `src/` removed. Use `backend/` + `frontend/` only.
