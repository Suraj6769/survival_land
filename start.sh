#!/bin/bash
# start.sh
# Boots FastAPI (background) then Nginx (foreground) inside the container.
set -e

echo "🏝️  Survival Island starting…"
echo "    HF_MODEL : ${HF_MODEL:-not set}"
echo "    HF_TOKEN : ${HF_TOKEN:+set (hidden)}"
echo "    PORT     : ${PORT:-7860}"

# ── 1. Start FastAPI on port 8000 (background) ────────────────────────────────
uvicorn server.app:app \
    --host 127.0.0.1 \
    --port 8000 \
    --workers 1 \
    --log-level info &
UVICORN_PID=$!

# ── 2. Wait until FastAPI is healthy (up to 30 s) ─────────────────────────────
echo "⏳  Waiting for FastAPI health check…"
for i in $(seq 1 30); do
    if curl -sf http://127.0.0.1:8000/api/health > /dev/null 2>&1; then
        echo "✅  FastAPI ready after ${i}s."
        break
    fi
    sleep 1
done

# ── 3. Start Nginx in foreground (keeps the container alive) ──────────────────
echo "🚀  Nginx serving on :${PORT:-7860}"
nginx -g "daemon off;"

# ── 4. Cleanup on exit ────────────────────────────────────────────────────────
echo "Nginx exited. Stopping uvicorn…"
kill "$UVICORN_PID" 2>/dev/null || true
