from __future__ import annotations

import time
from collections import defaultdict

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.rpm = requests_per_minute
        self._hits: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        if request.url.path == "/api/health" or self.rpm <= 0:
            return await call_next(request)

        ip = request.client.host if request.client else "unknown"
        now = time.time()
        self._hits[ip] = [t for t in self._hits[ip] if now - t < 60]

        if len(self._hits[ip]) >= self.rpm:
            return JSONResponse(
                {"detail": "Rate limit exceeded. Try again in a minute."},
                status_code=429,
            )

        self._hits[ip].append(now)
        return await call_next(request)
