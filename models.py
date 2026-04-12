"""
models.py
─────────────────────────────────────────────────────────────────────────────
Handles LLM inference for the Survival Island AI agent.

Priority chain
--------------
1. Local transformers pipeline   (available on GPU Spaces – uncomment deps)
2. HuggingFace Inference API     (works on CPU Spaces, needs HF_TOKEN)
3. Rule-based fallback           (no network / no token)

Environment variables
---------------------
HF_TOKEN   – HuggingFace API token (required for path 2)
HF_MODEL   – Model repo ID, e.g. "mistralai/Mistral-7B-Instruct-v0.2"
"""

from __future__ import annotations

import json
import logging
import os
import re
import threading
from typing import Optional

import requests

logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
HF_TOKEN: str = os.getenv("HF_TOKEN", "")
HF_MODEL: str = os.getenv("HF_MODEL", "mistralai/Mistral-7B-Instruct-v0.2")

VALID_ACTIONS: set[str] = {
    "FORAGE", "HUNT", "FISH", "GET_WATER", "SEEK_SHELTER",
    "BUILD_CAMP", "UPGRADE_CAMP", "CRAFT_SPEAR", "CRAFT_BOW",
    "CRAFT_ROD", "CRAFT_BOAT", "EVACUATE", "FIGHT", "FLEE", "WANDER",
}

# ── Singleton ─────────────────────────────────────────────────────────────────
_lock = threading.Lock()
_pipeline = None          # transformers Pipeline object (optional)
_use_local: bool = False  # True once local pipeline loaded successfully


# ── Local pipeline (optional – GPU Spaces) ────────────────────────────────────
def _try_load_local() -> bool:
    """
    Attempts to load the model locally with transformers + torch.
    Returns True on success. Skipped silently on CPU-only environments.
    Uncomment torch/transformers in requirements.txt to enable this path.
    """
    global _pipeline, _use_local
    try:
        import torch
        from transformers import pipeline as hf_pipeline  # type: ignore

        logger.info(f"[models] Loading {HF_MODEL} locally …")
        device = 0 if torch.cuda.is_available() else -1
        _pipeline = hf_pipeline(
            "text-generation",
            model=HF_MODEL,
            token=HF_TOKEN or None,
            device=device,
            torch_dtype=torch.float16 if device >= 0 else torch.float32,
            max_new_tokens=80,
        )
        _use_local = True
        logger.info(f"[models] Local pipeline ready (device={device})")
        return True
    except Exception as exc:
        logger.warning(f"[models] Local pipeline skipped: {exc}")
        return False


def get_pipeline():
    """Return the pipeline, initialising on first call."""
    with _lock:
        if _pipeline is None:
            _try_load_local()
    return _pipeline


# ── Output parser ─────────────────────────────────────────────────────────────
def _parse_action(raw: str) -> dict:
    """
    Extract {"action": ..., "thought": ...} from model output.
    Handles markdown fences, leading prose, trailing noise.
    """
    # Strip markdown fences
    cleaned = re.sub(r"```(?:json)?|```", "", raw, flags=re.IGNORECASE)
    # Keep only the first JSON object
    match = re.search(r"\{[^}]+\}", cleaned, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON object in model output: {raw!r}")
    obj = json.loads(match.group())
    action = str(obj.get("action", "WANDER")).upper()
    if action not in VALID_ACTIONS:
        logger.warning(f"[models] Unknown action '{action}', defaulting to WANDER")
        action = "WANDER"
    return {
        "action": action,
        "thought": str(obj.get("thought", "Processing…")),
    }


# ── Inference paths ───────────────────────────────────────────────────────────
def infer_local(prompt: str) -> dict:
    """Run generation using the locally loaded transformers pipeline."""
    pipe = get_pipeline()
    if pipe is None:
        raise RuntimeError("Local pipeline not available")
    outputs = pipe(
        prompt,
        max_new_tokens=80,
        temperature=0.7,
        do_sample=True,
        return_full_text=False,
    )
    return _parse_action(outputs[0]["generated_text"])


def infer_api(prompt: str) -> dict:
    """Call the HuggingFace Inference API (remote, no GPU needed)."""
    if not HF_TOKEN:
        raise RuntimeError("HF_TOKEN not set – cannot call Inference API")
    url = f"https://api-inference.huggingface.co/models/{HF_MODEL}"
    resp = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {HF_TOKEN}",
            "Content-Type": "application/json",
        },
        json={
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": 80,
                "temperature": 0.7,
                "return_full_text": False,
                "stop": ["\n\n", "</s>", "[INST]"],
            },
        },
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    raw = (
        data[0]["generated_text"]
        if isinstance(data, list)
        else data.get("generated_text", "")
    )
    return _parse_action(raw)


def run_inference(prompt: str) -> dict:
    """
    Main entry point used by server/app.py.

    Tries local → API → rule-based fallback in that order.
    Never raises – always returns a valid {"action", "thought"} dict.
    """
    # 1. Local transformers pipeline (GPU Space)
    if _use_local:
        try:
            return infer_local(prompt)
        except Exception as exc:
            logger.warning(f"[models] Local inference failed: {exc}")

    # 2. HuggingFace Inference API (CPU Space)
    if HF_TOKEN:
        try:
            return infer_api(prompt)
        except Exception as exc:
            logger.warning(f"[models] Inference API failed: {exc}")

    # 3. Hard fallback
    logger.error("[models] All inference paths failed – returning WANDER")
    return {"action": "WANDER", "thought": "Inference offline. Wandering."}
