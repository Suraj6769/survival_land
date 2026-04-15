
https://github.com/user-attachments/assets/97e006f6-0b35-4adc-8e71-b9e92c42f6ee


# 🏝️ Survival Island Game: Evolutionary AI Simulation

Survival Island Game is a zero-player survival sandbox and AI simulation built entirely in a single HTML file using Three.js.

Watch as "Subject-01" (an autonomous AI agent) navigates a procedurally generated 3D world, manages multiple survival vitals, reacts to predators, and evolves across generations using a persistent "Trauma Memory" system.

As the "Architect," you can observe the simulation or intervene using a powerful God Mode interface.

---

## ✨ Key Features

### 🧠 Zero-Player AI Sandbox
Sit back and observe Subject-01 survive in a hostile environment using utility-based decision-making.

### 📊 Dynamic Vitals Engine
The AI manages 6 core survival stats:
- Health  
- Hunger  
- Thirst  
- Stamina  
- Temperature  
- Fear  

### 🔁 Evolutionary Trauma System
- Death resets the simulation  
- The AI "remembers" past failures  
- Starvation alters future behavior thresholds  
- Surviving generations unlock permanent upgrades (e.g., speed boost)

### 🌍 Procedural 3D World
A 28x28 tile-based environment with diverse biomes:
- Deep Ocean  
- Shallows  
- Beach  
- Jungle  
- Ruins  
- Safe Haven  

### 🎮 Architect Controls (God Mode)
Interact with the simulation in real-time:
- Trigger disasters (Flash Floods, Heatwaves, Night Freezes)
- Smite or Bless the AI
- Instantly modify vitals (e.g., Insta-Starve)
- Spawn predators to test survival behavior

### 🎥 Cinematic Rendering
Powered by Three.js:
- Dynamic lighting & shadows  
- Exponential fog  
- Oscillating water physics  
- "Adrenaline Mode" with slow-motion & visual effects  

---

## 🚀 How to Run

No setup required. Just follow these steps:

1. Clone or download this repository  
2. Open `index.html` in any modern browser (Chrome, Edge, Firefox, Safari)  
3. The simulation starts automatically  

> ⚠️ Note: Internet is required on first load to fetch the Three.js library (via CDN).

---

## 🧠 How the AI Works

The system uses a **decoupled loop architecture**:

### 🎯 Render Loop (60+ FPS)
- Handles rendering (Three.js)
- Camera updates
- Physics & animations
- UI updates  

### ⚙️ Logic Loop (1 Hz)
Runs once per second:
- Updates vitals  
- Evaluates environment  
- Executes decision logic  

---

## 🧩 Decision System (Priority Queue)

Subject-01 follows a strict hierarchy:

- **P1 (Evacuation)**  
  Escape disasters (e.g., flash floods → seek high ground)

- **P2 (Urgent Needs)**  
  If hunger/thirst is low → find food/water zones  

- **P3 (Threat Response)**  
  If predator detected → calculate fear  
  - Fear > 80 → PANIC (run away)  

- **P4/P5 (Idle Behavior)**  
  Explore, recover stamina, and roam  

---

## 🛠️ Tech Stack

- **HTML5 / CSS3** → UI, HUD, overlays  
- **Vanilla JavaScript (ES6+)** → Core logic & AI system  
- **Three.js (r128)** → 3D rendering, lighting, terrain  

---

## 🤝 Contributing

This project is an experimental sandbox for AI + browser-based 3D simulation.

### 💡 Future Ideas
- A* Pathfinding  
- Crafting / Base Building  
- Day-Night Cycle  
- Advanced Predator AI  



### 💡 App:- 
[Survival Island Game
](https://huggingface.co/spaces/suraj291/Survival_Island_Game)
