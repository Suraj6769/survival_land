"""
server/app.py
─────────────────────────────────────────────────────────────────────────────
FastAPI backend for Survival Island.

Endpoints
---------
GET  /api/health    liveness probe (used by start.sh and HF healthcheck)
GET  /api/config    safe public config (model name, pipeline status)
POST /api/infer     LLM survival-action inference
"""

from __future__ import annotations

import logging
import os
import time
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from server.environment import GameState, InferResponse, build_prompt
import models

# ── ADDED: Import the environment ─────────────────────────────────────────────
from inference import SurvivalIslandEnvironment

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)-8s] %(name)s: %(message)s",
)
logger = logging.getLogger("survival.api")


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Pre-warm the model pipeline in a daemon thread on startup."""
    import threading

    def _warm():
        logger.info("Pre-warming model pipeline…")
        models.get_pipeline()
        logger.info("Pipeline warm-up complete.")

    threading.Thread(target=_warm, daemon=True).start()
    yield
    logger.info("Survival Island API shutting down.")


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Survival Island API",
    description=(
        "LLM-powered survival agent backend.\n"
        "Built for the Meta PyTorch Hackathon."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten in production if needed
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# ── Simple in-process rate limiter ────────────────────────────────────────────
_last_call: dict[str, float] = {}
_MIN_INTERVAL = 4.0  # seconds between /api/infer calls per IP


def _rate_ok(ip: str) -> bool:
    now = time.monotonic()
    if now - _last_call.get(ip, 0.0) < _MIN_INTERVAL:
        return False
    _last_call[ip] = now
    return True


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    """Liveness probe — always returns 200 while the process is running."""
    return {
        "status": "ok",
        "model": os.getenv("HF_MODEL", "unset"),
        "localPipeline": models._use_local,
    }


@app.get("/", include_in_schema=False)
async def root():
    """Root info route for browser access."""
    return {
        "message": "Survival Island API is running.",
        "endpoints": ["/api/health", "/api/config", "/api/infer"],
    }


@app.get("/api/config")
async def config():
    """Public runtime configuration for the frontend."""
    return {
        "model": os.getenv("HF_MODEL", "mistralai/Mistral-7B-Instruct-v0.2"),
        "hasToken": bool(os.getenv("HF_TOKEN")),
        "localPipeline": models._use_local,
    }


@app.post("/api/infer", response_model=InferResponse)
async def infer(state: GameState, request: Request):
    """
    Accept a GameState JSON body, build the LLM prompt,
    run inference, and return the chosen action + thought.

    Inference priority: local pipeline → HF Inference API → rule fallback.
    """
    ip = request.client.host if request.client else "unknown"
    if not _rate_ok(ip):
        raise HTTPException(
            status_code=429,
            detail="Too many requests — wait a few seconds.",
        )

    prompt = build_prompt(state)
    logger.info(
        f"[infer] gen={state.generation} ip={ip} "
        f"challenge={state.activeChallenge.type if state.activeChallenge else 'none'}"
    )

    # Try inference paths
    source = "fallback"
    try:
        if models._use_local:
            result = models.infer_local(prompt)
            source = "local"
        elif os.getenv("HF_TOKEN"):
            result = models.infer_api(prompt)
            source = "api"
        else:
            result = models.run_inference(prompt)
    except Exception as exc:
        logger.warning(f"[infer] Primary inference failed ({exc}), using fallback.")
        result = models.run_inference(prompt)

    return InferResponse(
        action=result["action"],
        thought=result["thought"],
        source=source,
    )


# ── Global error handler ──────────────────────────────────────────────────────

@app.exception_handler(Exception)
async def _global_error(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.url}: {exc}", exc_info=True)
    # TEMPORARY: Expose the actual Python error so the validator prints it!
    return JSONResponse(
        status_code=500,
        content={"detail": f"{type(exc).__name__}: {str(exc)}"},
    )

# ─────────────────────────────────────────────
# OpenEnv REQUIRED ENDPOINTS
# ─────────────────────────────────────────────

# ── ADDED: Instantiate the environment here so the routes can use it ──────────
env = SurvivalIslandEnvironment()

@app.post("/reset")
async def root_reset(request: Request):               
    state = env.reset()
    return {
        "observation": state,
        "reward": 0.0,
        "done": False,
        "info": {}
    }

@app.post("/step")
async def root_step(request: Request):   
    try:
        data = await request.json()
    except:
        data = {}
        
    action = data.get("action", "FORAGE")
    state, reward, done, info = env.step(action)
    return {
        "observation": state,
        "reward": float(reward),
        "done": bool(done),
        "info": info
    }

@app.get("/state")
async def root_state():               
    return env.current_state

def main():
    import uvicorn
    uvicorn.run("server.app:app", host="0.0.0.0", port=8000)

if __name__ == "__main__":
    main()