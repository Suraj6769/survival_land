"""
server/environment.py
─────────────────────────────────────────────────────────────────────────────
Pydantic v2 models that mirror the React game state sent from the frontend,
plus the prompt builder that converts a GameState into the [INST] string
consumed by the LLM.
"""

from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field


# ── Request / Response models ─────────────────────────────────────────────────

class Inventory(BaseModel):
    spear: bool = False
    bow: bool = False
    fishingRod: bool = False
    boat: bool = False


class BaseCamp(BaseModel):
    x: Optional[float] = None
    y: Optional[float] = None
    level: int = 0


class AIMemory(BaseModel):
    evolutionLevel: int = 1
    pastDeaths: List[str] = Field(default_factory=list)
    totalGenerations: int = 0
    challengesWon: int = 0


class ActiveChallenge(BaseModel):
    name: str
    type: str
    timeLimit: int
    maxTime: int = 0
    progress: str = ""


class GameState(BaseModel):
    """Full agent snapshot sent by the frontend to /api/infer."""

    # Vitals
    health:  float = Field(..., ge=0, le=100)
    hunger:  float = Field(..., ge=0, le=100)
    thirst:  float = Field(..., ge=0, le=100)
    stamina: float = Field(..., ge=0, le=100)
    fear:    float = Field(default=0, ge=0, le=100)

    # Resources
    wood:  int = 0
    stone: int = 0
    food:  int = 0
    water: int = 0

    # World context
    playerX:      float = 1000
    isNight:      bool  = False
    activeEvents: List[str] = Field(default_factory=list)
    predatorNear: bool  = False

    # Agent state
    inventory: Inventory  = Field(default_factory=Inventory)
    baseCamp:  BaseCamp   = Field(default_factory=BaseCamp)
    memory:    AIMemory   = Field(default_factory=AIMemory)
    generation: int = 1

    # Optional active challenge
    activeChallenge: Optional[ActiveChallenge] = None


class InferResponse(BaseModel):
    action: str
    thought: str
    source: str   # "local" | "api" | "fallback"


# ── Prompt construction ───────────────────────────────────────────────────────

_DEATH_LESSON_MAP: dict[str, str] = {
    "starvation":  "CRITICAL: Prioritize food — starvation has killed me before.",
    "dehydration": "CRITICAL: Prioritize water — dehydration has killed me before.",
    "hypothermia": "CRITICAL: Seek shelter at night — hypothermia has killed me before.",
    "heatstroke":  "CRITICAL: Find shade/water during heatwaves — heatstroke has killed me before.",
    "lion":        "CRITICAL: Craft a spear/bow before exploring. FLEE when predators are near until armed.",
    "mauled":      "CRITICAL: Craft a spear/bow before exploring. FLEE when predators are near until armed.",
    "panther":     "CRITICAL: Craft a spear/bow before exploring. FLEE when predators are near until armed.",
    "crocodile":   "CRITICAL: Avoid water edges without a boat — crocodiles are deadly.",
    "flood":       "CRITICAL: During floods, evacuate eastward IMMEDIATELY.",
}

VALID_ACTIONS = (
    "FORAGE, HUNT, FISH, GET_WATER, SEEK_SHELTER, BUILD_CAMP, UPGRADE_CAMP, "
    "CRAFT_SPEAR, CRAFT_BOW, CRAFT_ROD, CRAFT_BOAT, EVACUATE, FIGHT, FLEE, WANDER"
)


def _derive_lessons(past_deaths: list[str]) -> list[str]:
    seen: set[str] = set()
    lessons: list[str] = []
    for death in past_deaths:
        low = death.lower()
        for keyword, lesson in _DEATH_LESSON_MAP.items():
            if keyword in low and lesson not in seen:
                seen.add(lesson)
                lessons.append(lesson)
    return lessons


def _strategy_label(memory: AIMemory) -> str:
    n = len(memory.pastDeaths)
    if n >= 5:
        return "veteran"
    if n >= 3:
        return "cautious"
    if memory.evolutionLevel > 1:
        return "experienced"
    return "basic"


def build_prompt(state: GameState) -> str:
    """
    Convert a GameState into the [INST] prompt consumed by the LLM.
    Mirrors the prompt built in App.jsx so server-side inference
    produces identical quality to client-side inference.
    """
    lessons = _derive_lessons(state.memory.pastDeaths)
    strategy = _strategy_label(state.memory)

    lessons_block = (
        "\n".join(f"{i + 1}. {l}" for i, l in enumerate(lessons))
        if lessons
        else "No prior deaths — explore and gather resources."
    )

    challenge_block = ""
    if state.activeChallenge:
        c = state.activeChallenge
        challenge_block = (
            f'\nACTIVE CHALLENGE: "{c.name}" (type: {c.type}) — {c.timeLimit}s remaining.\n'
            f"Challenge progress: {c.progress or 'just started'}.\n"
            "Prioritize completing this challenge above all else!"
        )

    inv = state.inventory
    return (
        f"<s>[INST] You are the survival instinct AI (Generation {state.generation}) "
        f"of Subject-01. You have died {len(state.memory.pastDeaths)} times.\n\n"
        f"STRATEGY LEVEL: {strategy.upper()}\n"
        f"\nLESSONS FROM PAST DEATHS:\n{lessons_block}"
        f"{challenge_block}\n\n"
        f"Current status:\n"
        f"HP:{state.health:.0f}, Hunger:{state.hunger:.0f}, "
        f"Thirst:{state.thirst:.0f}, Fear:{state.fear:.0f}/100.\n"
        f"Resources: Wood:{state.wood}, Stone:{state.stone}, "
        f"Food:{state.food}, Water:{state.water}.\n"
        f"Equipped: Spear:{inv.spear}, Bow:{inv.bow}, "
        f"Rod:{inv.fishingRod}, Boat:{inv.boat}.\n"
        f"Camp Level: {state.baseCamp.level}. Position X: {state.playerX:.0f}.\n"
        f"Environment: {'Night' if state.isNight else 'Day'}, "
        f"Events: {', '.join(state.activeEvents) or 'None'}.\n"
        f"Predator Nearby: {'YES - HIGH DANGER' if state.predatorNear else 'No'}.\n"
        f"{f'ACTIVE CHALLENGE: {state.activeChallenge.name} ({state.activeChallenge.type}) — {state.activeChallenge.timeLimit}s left' if state.activeChallenge else 'No active challenge.'}\n\n"
        f"Valid Actions: {VALID_ACTIONS}.\n\n"
        'Respond ONLY with a raw JSON object — no markdown, no extra text. '
        'Example: {"action":"FORAGE","thought":"Need wood and resources"} [/INST]'
    )
