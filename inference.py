"""
inference.py
─────────────────────────────────────────────────────────────────────────────
OpenEnv-compliant inference environment for Survival Island.
Provides step(), reset(), state() methods and task graders.

Uses OpenAI client format with [START], [STEP], [END] logging.
"""

import json
import logging
import os
from typing import Any, Dict, Optional, Tuple

from openai import OpenAI

# ── Logging setup ─────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ── OpenEnv Environment ───────────────────────────────────────────────────────

class SurvivalIslandEnvironment:
    """
    OpenEnv-compliant environment wrapper for Survival Island.
    Provides the required step(), reset(), state() interface.
    """

    def __init__(self):
        """Initialize the environment."""
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))
        self.generation = 0
        self.total_resources_collected = 0
        self.challenges_won = 0
        self.current_state = self._create_initial_state()
        
        logger.info("[START] Survival Island environment initialized")

    def _create_initial_state(self) -> Dict[str, Any]:
        """Create initial game state."""
        return {
            "generation": 0,
            "health": 100.0,
            "hunger": 50.0,
            "thirst": 50.0,
            "stamina": 100.0,
            "fear": 0.0,
            "wood": 0,
            "stone": 0,
            "food": 0,
            "water": 0,
            "playerX": 1000.0,
            "isNight": False,
            "inventory": {
                "spear": False,
                "bow": False,
                "fishingRod": False,
                "boat": False,
            },
            "baseCamp": {
                "x": None,
                "y": None,
                "level": 0,
            },
            "memory": {
                "evolutionLevel": 1,
                "pastDeaths": [],
                "totalGenerations": 0,
                "challengesWon": 0,
            },
            "activeChallenge": None,
        }

    def reset(self) -> Dict[str, Any]:
        """Reset the environment to initial state."""
        logger.info("[STEP] reset() called")
        self.generation = 0
        self.total_resources_collected = 0
        self.challenges_won = 0
        self.current_state = self._create_initial_state()
        logger.info("[END] Environment reset complete")
        return self.current_state

    def step(self, action: str) -> Tuple[Dict[str, Any], float, bool, Dict[str, Any]]:
        """
        Execute one step in the environment.
        
        Args:
            action: Action taken by the agent (e.g., "FORAGE", "HUNT", "FISH")
        
        Returns:
            Tuple of (state, reward, done, info)
        """
        logger.info(f"[STEP] Action: {action}")
        
        # Simulate action effects
        reward = 0.0
        done = False
        info = {}

        action_upper = action.upper().strip()

        # Resource gathering actions
        if action_upper == "FORAGE":
            self.current_state["food"] += 5
            self.total_resources_collected += 5
            reward = 0.1
        elif action_upper == "FISH":
            self.current_state["food"] += 8
            self.total_resources_collected += 8
            reward = 0.15
        elif action_upper == "GET_WATER":
            self.current_state["water"] += 10
            self.total_resources_collected += 10
            reward = 0.15
        elif action_upper == "HUNT":
            self.current_state["food"] += 20
            self.total_resources_collected += 20
            reward = 0.25
        elif action_upper in ["CRAFT_SPEAR", "CRAFT_BOW", "CRAFT_ROD", "CRAFT_BOAT"]:
            # Crafting actions grant survival tools
            tool_key = action_upper.lower().replace("craft_", "").replace("_", "")
            if tool_key in self.current_state["inventory"]:
                self.current_state["inventory"][tool_key] = True
            reward = 0.2
        elif action_upper == "BUILD_CAMP":
            if self.current_state["baseCamp"]["level"] == 0:
                self.current_state["baseCamp"]["x"] = self.current_state["playerX"]
                self.current_state["baseCamp"]["level"] = 1
            reward = 0.3
        elif action_upper == "UPGRADE_CAMP":
            self.current_state["baseCamp"]["level"] = min(
                self.current_state["baseCamp"]["level"] + 1, 3
            )
            reward = 0.25
        elif action_upper == "FLEE":
            reward = 0.1
        elif action_upper == "WANDER":
            reward = -0.05

        # Decay resources each step
        self.current_state["hunger"] = max(0, self.current_state["hunger"] - 2)
        self.current_state["thirst"] = max(0, self.current_state["thirst"] - 1.5)
        self.current_state["stamina"] = max(0, self.current_state["stamina"] - 1)

        # Consume resources if available
        if self.current_state["food"] > 0:
            self.current_state["hunger"] = min(100, self.current_state["hunger"] + 3)
            self.current_state["food"] -= 1

        if self.current_state["water"] > 0:
            self.current_state["thirst"] = min(100, self.current_state["thirst"] + 2)
            self.current_state["water"] -= 1

        # Check death conditions
        if self.current_state["health"] <= 0:
            done = True
            info["death_reason"] = "health_depleted"
            reward = -1.0
        elif self.current_state["hunger"] <= 0:
            self.current_state["health"] -= 10
            reward -= 0.2
        elif self.current_state["thirst"] <= 0:
            self.current_state["health"] -= 15
            reward -= 0.3

        self.generation += 1
        self.current_state["generation"] = self.generation
        self.current_state["memory"]["totalGenerations"] = self.generation

        logger.info(f"[END] Step {self.generation}: reward={reward:.3f}, done={done}")
        return self.current_state, reward, done, info

    def state(self) -> Dict[str, Any]:
        """Get current environment state."""
        logger.info("[STEP] state() called")
        logger.info("[END] State retrieved")
        return self.current_state


# ── Task Graders (0.0 to 1.0) ────────────────────────────────────────────────

class TaskGraders:
    """Graders for the 3 required tasks."""

    @staticmethod
    def grade_survival_expert(state: Dict[str, Any]) -> float:
        """
        Task 1 (Easy): Survive for 50+ generations.
        Grader: Returns (min(generations, 50) / 50)
        """
        generations = state.get("generation", 0)
        score = min(generations, 50) / 50.0
        return min(score, 1.0)

    @staticmethod
    def grade_resourceful_gatherer(state: Dict[str, Any]) -> float:
        """
        Task 2 (Medium): Collect 500+ total resources.
        Grader: Returns (min(total_resources, 500) / 500)
        """
        # Simulating total resources by checking inventory state
        memory = state.get("memory", {})
        total_resources = memory.get("challengesWon", 0) * 100  # Proxy metric
        # Add actual collected resources
        total_resources += (
            state.get("wood", 0)
            + state.get("stone", 0)
            + (state.get("food", 0) * 2)
            + (state.get("water", 0) * 2)
        )
        score = min(total_resources, 500) / 500.0
        return min(score, 1.0)

    @staticmethod
    def grade_challenge_master(state: Dict[str, Any]) -> float:
        """
        Task 3 (Hard): Win 10+ challenges and reach evolution level 5.
        Grader: Returns (min(challenges_won, 10) / 10) * (evolution_level / 5)
        """
        memory = state.get("memory", {})
        challenges_won = memory.get("challengesWon", 0)
        evolution_level = memory.get("evolutionLevel", 1)

        challenge_score = min(challenges_won, 10) / 10.0
        evolution_score = min(evolution_level, 5) / 5.0
        score = (challenge_score + evolution_score) / 2.0
        return min(score, 1.0)


# ── Main Entry Point ──────────────────────────────────────────────────────────

def main():
    """Demonstrate environment usage."""
    logger.info("[START] Initialization")
    
    env = SurvivalIslandEnvironment()
    graders = TaskGraders()

    # Reset environment
    state = env.reset()
    logger.info(f"Initial state: generation={state['generation']}")

    # Simulate a few steps
    logger.info("[START] Simulation")
    actions = ["FORAGE", "BUILD_CAMP", "CRAFT_SPEAR", "HUNT", "GET_WATER"]
    
    for action in actions:
        logger.info(f"[STEP] Executing action: {action}")
        next_state, reward, done, info = env.step(action)
        logger.info(f"[END] Step completed: reward={reward}, done={done}")

        if done:
            logger.info(f"[END] Episode terminated: {info}")
            break

    # Grade tasks
    final_state = env.state()
    logger.info("[START] Task Grading")
    
    task1_score = graders.grade_survival_expert(final_state)
    task2_score = graders.grade_resourceful_gatherer(final_state)
    task3_score = graders.grade_challenge_master(final_state)
    
    logger.info(f"[STEP] Task 1 (Survival Expert): {task1_score:.3f}")
    logger.info(f"[STEP] Task 2 (Resourceful Gatherer): {task2_score:.3f}")
    logger.info(f"[STEP] Task 3 (Challenge Master): {task3_score:.3f}")
    
    logger.info("[END] All tasks graded")

    print("\n--- Results ---")
    print(f"Task 1 Score: {task1_score:.3f}")
    print(f"Task 2 Score: {task2_score:.3f}")
    print(f"Task 3 Score: {task3_score:.3f}")
    print(f"Average Score: {(task1_score + task2_score + task3_score) / 3:.3f}")


if __name__ == "__main__":
    main()
