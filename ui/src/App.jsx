import React, { useState, useEffect, useRef } from 'react';
import {
  Heart, Flame, Droplets, Thermometer, Zap,
  CloudRain, Sun, Moon, CloudLightning,
  Apple, Skull, AlertTriangle, Cloud,
  Target, CloudFog, Waves, Snowflake,
  Brain, Sword, Ghost, Trophy, RefreshCcw,
  Fish, Axe, Tent, Navigation, Crosshair, ListTodo,
  TrendingUp, ShieldAlert, Eye
} from 'lucide-react';

const TICK_RATE = 1000;
const WORLD_WIDTH = 6000;
const WORLD_HEIGHT = 3000;

// ─── HuggingFace config from .env ────────────────────────────────────────────
const HF_TOKEN = import.meta.env.VITE_HF_TOKEN;
const HF_MODEL = import.meta.env.VITE_HF_MODEL;
// ─────────────────────────────────────────────────────────────────────────────

const ZONES = {
  OCEAN: { baseEndX: 400, color1: '#094b65', color2: '#20a4c0' },
  ISLAND: { startX: 400, endX: 1200, color: '#e6d3a8' },
  JUNGLE: { startX: 1200, endX: 2800, color: '#569e40' },
  VILLAGE: { startX: 2800, endX: 4500, color: '#7a6a4f' },
  OCEAN_GULF: { startX: 4500, endX: 5200, color1: '#094b65', color2: '#20a4c0' },
  SAFE_HAVEN: { startX: 5200, endX: 6000, color: '#447a32' }
};

const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

const CHALLENGE_DB = [
  { category: '🟢 Survival', tasks: [
      { name: "Survive 1 Full Day", type: 'SURVIVE_1_DAY', timeLimit: 96 },
      { name: "Find Food Immediate", type: 'FIND_FOOD', timeLimit: 40 },
      { name: "Build Basic Shelter", type: 'BUILD_BASIC', timeLimit: 80 }
  ]},
  { category: '🟡 Predator', tasks: [
      { name: "Escape Detection", type: 'ESCAPE_PRED', timeLimit: 30, trigger: 'SPAWN_LION' },
      { name: "Survive 2 Predators", type: 'SURVIVE_2_PRED', timeLimit: 60, trigger: 'SPAWN_2_LIONS' },
      { name: "Hunt Boar w/ Weapon", type: 'HUNT_WEAPON', timeLimit: 90 }
  ]},
  { category: '🌊 Disaster', tasks: [
      { name: "Survive Flood Evac", type: 'SURVIVE_FLOOD', timeLimit: 120, trigger: 'FLASH_FLOOD' },
      { name: "Survive Storm", type: 'SURVIVE_STORM', timeLimit: 60, trigger: 'STORM_COLLAPSE' },
      { name: "Navigate Thick Fog", type: 'NAVIGATE_FOG', timeLimit: 45, trigger: 'THICK_FOG' }
  ]},
  { category: '🔴 Strategic', tasks: [
      { name: "Reach Eastern Ruins", type: 'REACH_RUINS', timeLimit: 150 },
      { name: "Build Improved Camp", type: 'IMPROVED_SHELTER', timeLimit: 120 },
      { name: "Craft Before Attack", type: 'CRAFT_BEFORE_PREDATOR', timeLimit: 60, trigger: 'SPAWN_LION_FAR' }
  ]},
  { category: '⚡ God-Level', tasks: [
      { name: "Storm + Hunted (2m)", type: 'STORM_AND_HUNTED', timeLimit: 120, trigger: 'STORM_AND_LIONS' },
      { name: "Flood + 2 Lions", type: 'LIONS_AND_FLOOD', timeLimit: 90, trigger: 'FLOOD_AND_LIONS' },
      { name: "Survive No Food", type: 'SURVIVE_NO_FOOD', timeLimit: 90 }
  ]}
];

const generateWorld = () => {
  const trees = []; const buildings = []; const animals = [];
  const lions = []; const panthers = []; const crocodiles = []; const hippos = [];
  const rocks = []; const lilyPads = [];
 
  for (let i = 0; i < 250; i++) trees.push({ id: i, x: 1250 + Math.random() * 1450, y: 50 + Math.random() * 2900, radius: 25 + Math.random() * 20, type: 'pine', wood: 3, food: Math.random() > 0.6 ? 2 : 0 });
  for (let i = 0; i < 80; i++) trees.push({ id: i + 1000, x: 450 + Math.random() * 650, y: 50 + Math.random() * 2900, radius: 20 + Math.random() * 15, type: 'palm', wood: 1, food: Math.random() > 0.8 ? 1 : 0 });
  for (let i = 0; i < 100; i++) trees.push({ id: i + 2000, x: 5250 + Math.random() * 700, y: 50 + Math.random() * 2900, radius: 30 + Math.random() * 25, type: 'pine', wood: 4, food: 2 });
 
  for (let i = 0; i < 25; i++) buildings.push({ id: i, x: 2900 + Math.random() * 1500, y: 100 + Math.random() * 2700, w: 160 + Math.random() * 140, h: 160 + Math.random() * 140, hasSecret: true });
 
  for (let i = 0; i < 40; i++) animals.push({ id: i, x: 1300 + Math.random() * 2500, y: 100 + Math.random() * 2800, vx: 0, vy: 0, angle: 0, state: 'idle', type: 'boar', meat: 10 });
  for (let i = 0; i < 10; i++) hippos.push({ id: i+200, x: 400 + Math.random() * 400, y: 100 + Math.random() * 2800, vx: 0, vy: 0, angle: 0, state: 'idle', type: 'hippo', meat: 25 });
 
  for (let i = 0; i < 6; i++) lions.push({ id: i, x: 1500 + Math.random() * 1200, y: 200 + Math.random() * 2600, angle: 0, state: 'idle', type: 'lion' });
  for (let i = 0; i < 4; i++) panthers.push({ id: i+50, x: 2000 + Math.random() * 1500, y: 200 + Math.random() * 2600, angle: 0, state: 'idle', type: 'panther' });
 
  for (let i = 0; i < 12; i++) crocodiles.push({ id: i, x: 100 + Math.random() * 250, y: 200 + Math.random() * 2600, angle: 0, state: 'hidden' });
 
  for (let i = 0; i < 100; i++) rocks.push({ id: i, x: 350 + Math.random() * 5500, y: Math.random() * 3000, size: 10 + Math.random() * 25, stone: 1 });
  for (let i = 0; i < 40; i++) lilyPads.push({ id: i, x: 150 + Math.random() * 200, y: Math.random() * 3000, size: 8 + Math.random() * 10, angle: Math.random() * Math.PI * 2 });

  return { trees, buildings, animals, lions, crocodiles, rocks, lilyPads, fires: [], baseCamp: null };
};

let WORLD_OBJECTS = generateWorld();

const buildSurvivalLessons = (pastDeaths) => {
  if (!pastDeaths || pastDeaths.length === 0) return [];
  const lessons = [];
  pastDeaths.forEach(d => {
    const text = d.toLowerCase();
    if (text.includes('starvation')) lessons.push('CRITICAL: Prioritize food — starvation has killed me before.');
    if (text.includes('dehydration')) lessons.push('CRITICAL: Prioritize water — dehydration has killed me before.');
    if (text.includes('hypothermia')) lessons.push('CRITICAL: Seek shelter at night — hypothermia has killed me before.');
    if (text.includes('heatstroke')) lessons.push('CRITICAL: Find shade/water during heatwaves — heatstroke has killed me before.');
    if (text.includes('lion') || text.includes('mauled') || text.includes('panther')) lessons.push('CRITICAL: Craft a spear/bow before exploring. FLEE when predators are near until armed.');
    if (text.includes('crocodile')) lessons.push('CRITICAL: Avoid water edges without a boat — crocodiles are deadly.');
    if (text.includes('flood')) lessons.push('CRITICAL: During floods, evacuate eastward IMMEDIATELY.');
  });
  return [...new Set(lessons)];
};

const getAdaptiveStrategy = (memory) => {
  if (!memory || memory.evolutionLevel <= 1) return 'basic';
  if (memory.pastDeaths.length >= 5) return 'veteran';
  if (memory.pastDeaths.length >= 3) return 'cautious';
  return 'experienced';
};

const getChallengeAction = (s) => {
  const c = s.activeChallenge;
  if (!c) return null;

  let nearThreat = false;
  let closestThreat = null;
  let minThreatD = Infinity;
  WORLD_OBJECTS.lions.forEach(l => {
    const d = Math.hypot(s.player.x - l.x, s.player.y - l.y);
    if (d < 500) { nearThreat = true; if (d < minThreatD) { minThreatD = d; closestThreat = l; } }
  });

  switch (c.type) {
    case 'SURVIVE_1_DAY':
      if (nearThreat) return 'FLEE';
      if (s.hunger < 40) return s.ai.inventory.spear || s.ai.inventory.bow ? 'HUNT' : 'FORAGE';
      if (s.thirst < 40) return 'GET_WATER';
      if (s.wood < 3 && s.stone < 2) return 'FORAGE';
      if (!s.ai.inventory.spear && s.wood >= 3 && s.stone >= 2) return 'CRAFT_SPEAR';
      return 'WANDER';

    case 'FIND_FOOD':
      if (nearThreat) return 'FLEE';
      if (s.ai.inventory.spear || s.ai.inventory.bow) return 'HUNT';
      if (s.wood >= 3 && s.stone >= 2) return 'CRAFT_SPEAR';
      if (WORLD_OBJECTS.animals.length > 0) return 'HUNT';
      return 'FORAGE';

    case 'BUILD_BASIC':
      if (nearThreat) return 'FLEE';
      if (s.ai.baseCamp.level >= 1) return 'WANDER';
      if (s.wood >= 5) return 'BUILD_CAMP';
      return 'FORAGE';

    case 'ESCAPE_PRED':
      return nearThreat ? 'FLEE' : 'WANDER';

    case 'SURVIVE_2_PRED':
      if (nearThreat) {
        return (s.ai.inventory.spear || s.ai.inventory.bow) ? 'FIGHT' : 'FLEE';
      }
      if (!s.ai.inventory.spear && s.wood >= 3 && s.stone >= 2) return 'CRAFT_SPEAR';
      return 'WANDER';

    case 'HUNT_WEAPON':
      if (nearThreat) return 'FLEE';
      if (!s.ai.inventory.spear && !s.ai.inventory.bow) {
        if (s.wood >= 5 && s.stone >= 1) return 'CRAFT_BOW';
        if (s.wood >= 3 && s.stone >= 2) return 'CRAFT_SPEAR';
        return 'FORAGE';
      }
      return 'HUNT';

    case 'SURVIVE_FLOOD':
      if (s.player.x < ZONES.VILLAGE.startX - 100) return 'EVACUATE';
      if (s.ai.baseCamp.level === 0 && s.wood >= 5) return 'BUILD_CAMP';
      if (s.ai.baseCamp.level === 0) return 'FORAGE';
      return 'SEEK_SHELTER';

    case 'SURVIVE_STORM':
      if (s.ai.baseCamp.level > 0) return 'SEEK_SHELTER';
      if (s.wood >= 5) return 'BUILD_CAMP';
      return 'FORAGE';

    case 'NAVIGATE_FOG':
      if (nearThreat) return 'FLEE';
      return 'EVACUATE';

    case 'REACH_RUINS':
      if (nearThreat) return 'FLEE';
      return 'EVACUATE';

    case 'IMPROVED_SHELTER':
      if (nearThreat) return 'FLEE';
      if (s.ai.baseCamp.level === 0) {
        if (s.wood >= 5) return 'BUILD_CAMP';
        return 'FORAGE';
      }
      if (s.ai.baseCamp.level === 1) {
        if (s.wood >= 10 && s.stone >= 5) return 'UPGRADE_CAMP';
        return 'FORAGE';
      }
      return 'WANDER';

    case 'CRAFT_BEFORE_PREDATOR':
      if (nearThreat && minThreatD < 300) return 'FLEE';
      if (!s.ai.inventory.spear && !s.ai.inventory.bow) {
        if (s.wood >= 5 && s.stone >= 1) return 'CRAFT_BOW';
        if (s.wood >= 3 && s.stone >= 2) return 'CRAFT_SPEAR';
        return 'FORAGE';
      }
      return 'WANDER';

    case 'STORM_AND_HUNTED':
      if (nearThreat) return (s.ai.inventory.spear || s.ai.inventory.bow) ? 'FIGHT' : 'FLEE';
      if (s.ai.baseCamp.level === 0 && s.wood >= 5) return 'BUILD_CAMP';
      if (s.ai.baseCamp.level === 0) return 'FORAGE';
      return 'SEEK_SHELTER';

    case 'LIONS_AND_FLOOD':
      if (nearThreat) return (s.ai.inventory.spear || s.ai.inventory.bow) ? 'FIGHT' : 'FLEE';
      if (s.player.x < ZONES.VILLAGE.startX - 100) return 'EVACUATE';
      if (s.ai.baseCamp.level === 0 && s.wood >= 5) return 'BUILD_CAMP';
      if (s.ai.baseCamp.level === 0) return 'FORAGE';
      return 'SEEK_SHELTER';

    case 'SURVIVE_NO_FOOD':
      if (nearThreat) return 'FLEE';
      if (s.thirst < 50) return 'GET_WATER';
      if (s.ai.baseCamp.level === 0 && s.wood >= 5) return 'BUILD_CAMP';
      if (s.ai.baseCamp.level === 0) return 'FORAGE';
      return 'SEEK_SHELTER';

    default:
      return null;
  }
};

export default function App() {
  const gameRef = useRef({
    started: false, gameMode: 'evolution', generation: 1, isAlive: true, causeOfDeath: '',
    player: { x: 1000, y: 1500, radius: 14, baseSpeed: 7.5, speedMult: 1, vx: 0, vy: 0, angle: 0 },
    camera: { x: 0, y: 0, shake: 0, zoom: 1.2 },
    ai: {
      state: 'IDLE', target: null, actionDelay: 0, sneaking: false, message: 'Booting Neural Net...', fear: 0, panic: false,
      inventory: { spear: false, fishingRod: false, boat: false, bow: false }, baseCamp: { x: null, y: null, level: 0 },
      memory: { evolutionLevel: 1, pastDeaths: [], totalGenerations: 0, challengesWon: 0 },
      llmAction: 'WANDER', llmThinking: false, llmTimer: 0, consecutiveFailures: 0
    },
    health: 100, hunger: 100, thirst: 100, stamina: 100, temp: 25, wetness: 0, wood: 0, food: 0, water: 0, stone: 0,
    shelterStatus: 0, day: 1, time: 8, activeEvents: [], eventTimer: 60, dynamicWaterLevel: 400,
    activeChallenge: null, completedChallenges: 0, logs: []
  });

  const [hudState, setHudState] = useState(null);
  const [showMemoryLog, setShowMemoryLog] = useState(false);
  const canvasRef = useRef(null);

  const addLog = (message, type = 'info') => {
    gameRef.current.logs = [{ id: Date.now(), message, type, time: Date.now() }];
  };

  const startGame = (mode) => {
    WORLD_OBJECTS = generateWorld();
    gameRef.current = {
      ...gameRef.current, started: true, gameMode: mode, generation: 1, isAlive: true, causeOfDeath: '',
      player: { x: 1000, y: 1500, radius: 14, baseSpeed: 7.5, speedMult: 1, vx: 0, vy: 0, angle: 0 },
      health: 100, hunger: 100, thirst: 100, stamina: 100, temp: 25, wetness: 0, wood: 0, food: 0, water: 0, stone: 0, day: 1, time: 8, activeEvents: [], activeChallenge: null, completedChallenges: 0, dynamicWaterLevel: ZONES.OCEAN.baseEndX,
      ai: {
        state: 'IDLE', target: null, actionDelay: 0, sneaking: false, message: 'Analyzing world...', fear: 0, panic: false,
        inventory: { spear: false, fishingRod: false, boat: false, bow: false },
        baseCamp: { x: null, y: null, level: 0 },
        memory: { evolutionLevel: 1, pastDeaths: [], totalGenerations: 0, challengesWon: 0 },
        llmAction: 'WANDER', llmThinking: false, llmTimer: 0, consecutiveFailures: 0
      },
      logs: []
    };
    addLog(`SUBJECT-01 ONLINE. [MODE: ${mode.toUpperCase()}]`, "system");
    setHudState({ ...gameRef.current });
  };

  const evolveAndRespawn = () => {
    const retainedMemory = gameRef.current.ai.memory;
    const retainedChallenges = gameRef.current.completedChallenges;
    const nextGen = gameRef.current.generation + 1;
    retainedMemory.totalGenerations = nextGen - 1;
    retainedMemory.challengesWon = (retainedMemory.challengesWon || 0) + retainedChallenges;
    const speedBonus = Math.min(retainedMemory.evolutionLevel * 0.15, 1.5);
   
    WORLD_OBJECTS = generateWorld();
    gameRef.current = {
      ...gameRef.current, isAlive: true, causeOfDeath: '', generation: nextGen,
      player: { x: 1000, y: 1500, radius: 14, baseSpeed: 7.5 + speedBonus, speedMult: 1, vx: 0, vy: 0, angle: 0 },
      health: 100, hunger: 100, thirst: 100, stamina: 100, temp: 25, wetness: 0, wood: 0, food: 0, water: 0, stone: 0,
      day: 1, time: 8, activeEvents: [], activeChallenge: null, completedChallenges: 0,
      dynamicWaterLevel: ZONES.OCEAN.baseEndX,
      ai: {
        state: 'IDLE', target: null, actionDelay: 0, sneaking: false,
        message: `Gen ${nextGen}: Learning from ${retainedMemory.pastDeaths.length} past deaths...`,
        fear: 0, panic: false,
        inventory: { spear: false, fishingRod: false, boat: false, bow: false },
        baseCamp: { x: null, y: null, level: 0 },
        memory: retainedMemory,
        llmAction: 'WANDER', llmThinking: false, llmTimer: 0, consecutiveFailures: 0
      },
      logs: []
    };
    addLog(`GEN ${nextGen} DEPLOYED. ${retainedMemory.pastDeaths.length} DEATH PATTERNS LOADED.`, "system");
    setHudState({ ...gameRef.current });
  };

  const toggleEvent = (eventName) => {
    const s = gameRef.current; if (!s.isAlive) return;
    if (eventName === 'Clear') { s.activeEvents = []; s.dynamicWaterLevel = ZONES.OCEAN.baseEndX; addLog("GOD ACTION: Cleared all disasters.", 'info'); }
    else {
      if (s.activeEvents.includes(eventName)) s.activeEvents = s.activeEvents.filter(e => e !== eventName);
      else { s.activeEvents.push(eventName); if (eventName === 'Storm Collapse') WORLD_OBJECTS.fires = []; }
      addLog(`GOD ACTION: Toggled ${eventName.toUpperCase()}`, 'danger');
    }
    setHudState({ ...s });
  };

  const godAmbush = () => {
    const s = gameRef.current; if (!s.isAlive) return;
    WORLD_OBJECTS.lions.push({ id: Math.random(), x: s.player.x + 200, y: s.player.y + 200, angle: 0, state: 'chasing', type: 'panther' });
    WORLD_OBJECTS.lions.push({ id: Math.random(), x: s.player.x - 200, y: s.player.y - 200, angle: 0, state: 'chasing', type: 'lion' });
    if (!s.activeEvents.includes('Thick Fog')) s.activeEvents.push('Thick Fog');
    addLog("GOD ACTION: Predator Ambush Triggered!", 'danger'); setHudState({ ...s });
  };
 
  const godSmite = () => { const s = gameRef.current; if (!s.isAlive) return; s.health -= 35; s.ai.fear += 50; addLog("GOD ACTION: Lightning Strike!", 'danger'); setHudState({ ...s }); };
  const godStarve = () => { const s = gameRef.current; if (!s.isAlive) return; s.hunger = 0; addLog("GOD ACTION: Induced Starvation!", 'danger'); setHudState({ ...s }); };
  const godBless = () => { const s = gameRef.current; if (!s.isAlive) return; s.food += 15; s.wood += 15; s.stone += 10; addLog("GOD ACTION: Care package dropped.", 'success'); setHudState({ ...s }); };

  const assignAdvancedChallenge = (chal) => {
    const s = gameRef.current; if (!s.isAlive) return;
   
    if (chal.trigger === 'SPAWN_LION') WORLD_OBJECTS.lions.push({ id: Math.random(), x: s.player.x + 400, y: s.player.y + 300, angle: 0, state: 'chasing', type: 'lion' });
    if (chal.trigger === 'SPAWN_2_LIONS') {
      WORLD_OBJECTS.lions.push({ id: Math.random(), x: s.player.x + 400, y: s.player.y + 300, angle: 0, state: 'chasing', type: 'lion' });
      WORLD_OBJECTS.lions.push({ id: Math.random(), x: s.player.x - 400, y: s.player.y - 300, angle: 0, state: 'chasing', type: 'panther' });
    }
    if (chal.trigger === 'FLASH_FLOOD' && !s.activeEvents.includes('Flash Flood')) s.activeEvents.push('Flash Flood');
    if (chal.trigger === 'STORM_COLLAPSE' && !s.activeEvents.includes('Storm Collapse')) s.activeEvents.push('Storm Collapse');
    if (chal.trigger === 'THICK_FOG' && !s.activeEvents.includes('Thick Fog')) s.activeEvents.push('Thick Fog');
    if (chal.trigger === 'STORM_AND_LIONS') {
      if (!s.activeEvents.includes('Storm Collapse')) s.activeEvents.push('Storm Collapse');
      WORLD_OBJECTS.lions.push({ id: Math.random(), x: s.player.x + 500, y: s.player.y + 300, angle: 0, state: 'chasing', type: 'lion' });
    }
    if (chal.trigger === 'FLOOD_AND_LIONS') {
      if (!s.activeEvents.includes('Flash Flood')) s.activeEvents.push('Flash Flood');
      WORLD_OBJECTS.lions.push({ id: Math.random(), x: s.player.x + 400, y: s.player.y + 300, angle: 0, state: 'chasing', type: 'lion' });
    }
    if (chal.trigger === 'SPAWN_LION_FAR') WORLD_OBJECTS.lions.push({ id: Math.random(), x: s.player.x + 900, y: s.player.y + 700, angle: 0, state: 'stalking', type: 'panther' });

    s.activeChallenge = {
      ...chal,
      maxTime: chal.timeLimit,
      startDay: s.day,
      startFood: s.food,
      startX: s.player.x,
      progress: ''
    };
    s.ai.target = null;
    s.ai.actionDelay = 0;
    s.ai.llmTimer = 20;
    addLog(`CHALLENGE INITIATED: ${chal.name}`, 'warning');
    setHudState({ ...s });
  };

  const manageChallenges = (s) => {
    if (!s.activeChallenge) return;
    const c = s.activeChallenge;
    c.timeLimit -= 1;
    let success = false;
    let failed = false;
    let progressMsg = '';

    switch (c.type) {
      case 'SURVIVE_1_DAY':
        progressMsg = `Day ${s.day}/${c.startDay + 1} — HP: ${Math.floor(s.health)}`;
        if (s.day > c.startDay && s.health > 20) success = true;
        break;

      case 'FIND_FOOD':
        progressMsg = `Food: ${s.food} (need > ${c.startFood})`;
        if (s.food > c.startFood) success = true;
        break;

      case 'BUILD_BASIC':
        progressMsg = `Camp level: ${s.ai.baseCamp.level}/1 | Wood: ${s.wood}/5`;
        if (s.ai.baseCamp.level >= 1) success = true;
        break;

      case 'ESCAPE_PRED': {
        let safe = true;
        WORLD_OBJECTS.lions.forEach(l => { if (Math.hypot(s.player.x - l.x, s.player.y - l.y) < 500) safe = false; });
        progressMsg = safe ? 'Safe distance maintained!' : 'Predator too close!';
        if (safe && c.timeLimit < (c.maxTime - 10)) success = true;
        break;
      }

      case 'SURVIVE_2_PRED':
        progressMsg = `HP: ${Math.floor(s.health)} | Time: ${c.timeLimit}s`;
        if (c.timeLimit <= 0 && s.isAlive) success = true;
        break;

      case 'HUNT_WEAPON':
        progressMsg = `Weapon: ${s.ai.inventory.spear ? 'Spear✓' : s.ai.inventory.bow ? 'Bow✓' : 'None'} | Food: ${s.food}/${c.startFood + 5}`;
        if ((s.ai.inventory.spear || s.ai.inventory.bow) && s.food > c.startFood + 5) success = true;
        break;

      case 'SURVIVE_FLOOD':
        progressMsg = `X: ${Math.floor(s.player.x)} (need > ${ZONES.VILLAGE.startX}) | Camp: ${s.ai.baseCamp.level}`;
        if (s.player.x > ZONES.VILLAGE.startX && s.isAlive && c.timeLimit < (c.maxTime - 5)) success = true;
        break;

      case 'SURVIVE_STORM':
        progressMsg = `HP: ${Math.floor(s.health)} | Shelter: ${s.shelterStatus === 100 ? 'Yes' : 'No'} | Time: ${c.timeLimit}s`;
        if (c.timeLimit <= 0 && s.isAlive) success = true;
        break;

      case 'NAVIGATE_FOG':
        progressMsg = `Moved: ${Math.floor(Math.abs(s.player.x - c.startX))}px / 600px`;
        if (Math.abs(s.player.x - c.startX) > 600 && s.isAlive) success = true;
        break;

      case 'REACH_RUINS':
        progressMsg = `X: ${Math.floor(s.player.x)} / ${ZONES.VILLAGE.startX}`;
        if (s.player.x > ZONES.VILLAGE.startX) success = true;
        break;

      case 'IMPROVED_SHELTER':
        progressMsg = `Camp level: ${s.ai.baseCamp.level}/2 | Wood: ${s.wood} Stone: ${s.stone}`;
        if (s.ai.baseCamp.level >= 2) success = true;
        break;

      case 'CRAFT_BEFORE_PREDATOR':
        progressMsg = `Weapon: ${s.ai.inventory.spear ? 'Spear✓' : s.ai.inventory.bow ? 'Bow✓' : 'None'} | Time: ${c.timeLimit}s`;
        if (s.ai.inventory.spear || s.ai.inventory.bow) success = true;
        break;

      case 'STORM_AND_HUNTED':
        progressMsg = `HP: ${Math.floor(s.health)} | Fear: ${Math.floor(s.ai.fear)} | Time: ${c.timeLimit}s`;
        if (c.timeLimit <= 0 && s.isAlive) success = true;
        break;

      case 'LIONS_AND_FLOOD':
        progressMsg = `X: ${Math.floor(s.player.x)} | Camp: ${s.ai.baseCamp.level} | HP: ${Math.floor(s.health)}`;
        if ((s.player.x > ZONES.VILLAGE.startX || s.shelterStatus === 100) && s.isAlive && c.timeLimit < (c.maxTime - 5)) success = true;
        break;

      case 'SURVIVE_NO_FOOD':
        progressMsg = `HP: ${Math.floor(s.health)} | Time: ${c.timeLimit}s (don't eat!)`;
        if (s.food > c.startFood + 3) failed = true;
        if (c.timeLimit <= 0 && s.isAlive) success = true;
        break;

      default:
        break;
    }

    c.progress = progressMsg;

    if (!s.isAlive) failed = true;

    if (success) {
      s.completedChallenges += 1;
      s.ai.memory.evolutionLevel += 2;
      s.ai.fear = clamp(s.ai.fear - 40, 0, 100);
      s.player.speedMult = 1.35;
      addLog(`✓ CHALLENGE COMPLETE: ${c.name}!`, "success");
      s.activeChallenge = null;
      s.ai.llmTimer = 20;
    } else if (c.timeLimit <= 0 || failed) {
      s.ai.fear = clamp(s.ai.fear + 30, 0, 100);
      s.player.speedMult = 0.85;
      addLog(`✗ CHALLENGE FAILED: ${c.name}`, "danger");
      s.activeChallenge = null;
      s.ai.llmTimer = 20;
    }
   
    if (s.player.speedMult > 1) s.player.speedMult = Math.max(1, s.player.speedMult - 0.01);
    if (s.player.speedMult < 1) s.player.speedMult = Math.min(1, s.player.speedMult + 0.01);
  };

  // ─── HUGGING FACE API CALL (replaces Anthropic callClaudeAPI) ────────────
  const callClaudeAPI = async (s) => {
    s.ai.llmThinking = true;
    const isNight = s.time < 6 || s.time > 18;
   
    let predatorNear = false;
    WORLD_OBJECTS.lions.concat(WORLD_OBJECTS.crocodiles).forEach(t => {
      if (Math.hypot(s.player.x - t.x, s.player.y - t.y) < 400) predatorNear = true;
    });

    const survivalLessons = buildSurvivalLessons(s.ai.memory.pastDeaths);
    const strategy = getAdaptiveStrategy(s.ai.memory);
    const genNumber = s.generation;

    const challengeContext = s.activeChallenge
      ? `\nACTIVE CHALLENGE: "${s.activeChallenge.name}" (type: ${s.activeChallenge.type}) — ${s.activeChallenge.timeLimit}s remaining.\nChallenge progress: ${s.activeChallenge.progress || 'just started'}.\nPrioritize completing this challenge above all else!`
      : '';

    // Build the prompt in instruction format compatible with most HF instruct models
    const prompt = `<s>[INST] You are the survival instinct AI (Generation ${genNumber}) of Subject-01. You have died ${s.ai.memory.pastDeaths.length} times.

STRATEGY LEVEL: ${strategy.toUpperCase()}
${survivalLessons.length > 0 ? `\nLESSONS FROM PAST DEATHS:\n${survivalLessons.map((l, i) => `${i + 1}. ${l}`).join('\n')}` : '\nNo prior deaths — explore and gather resources.'}
${challengeContext}

Current status:
HP:${Math.floor(s.health)}, Hunger:${Math.floor(s.hunger)}, Thirst:${Math.floor(s.thirst)}, Fear:${Math.floor(s.ai.fear)}/100.
Resources: Wood:${s.wood}, Stone:${s.stone}, Food:${s.food}, Water:${s.water}.
Equipped: Spear:${s.ai.inventory.spear}, Bow:${s.ai.inventory.bow}, Rod:${s.ai.inventory.fishingRod}, Boat:${s.ai.inventory.boat}.
Camp Level: ${s.ai.baseCamp.level}. Position X: ${Math.floor(s.player.x)}.
Environment: ${isNight ? 'Night' : 'Day'}, Events: ${s.activeEvents.join(', ') || 'None'}.
Predator Nearby: ${predatorNear ? 'YES - HIGH DANGER' : 'No'}.
${s.activeChallenge ? `ACTIVE CHALLENGE: ${s.activeChallenge.name} (${s.activeChallenge.type}) — ${s.activeChallenge.timeLimit}s left` : 'No active challenge.'}

Valid Actions: FORAGE, HUNT, FISH, GET_WATER, SEEK_SHELTER, BUILD_CAMP, UPGRADE_CAMP, CRAFT_SPEAR, CRAFT_BOW, CRAFT_ROD, CRAFT_BOAT, EVACUATE, FIGHT, FLEE, WANDER.

Respond ONLY with a raw JSON object — no markdown, no extra text. Example: {"action":"FORAGE","thought":"Need wood and resources"} [/INST]`;

    try {
      const response = await fetch(
        `https://api-inference.huggingface.co/models/${HF_MODEL}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${HF_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              max_new_tokens: 80,
              temperature: 0.7,
              return_full_text: false,
              stop: ['\n\n', '</s>', '[INST]'],
            },
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      // HF Inference API returns: [{generated_text: "..."}]
      const rawText = Array.isArray(data)
        ? (data[0]?.generated_text || '')
        : (data?.generated_text || '');

      // Strip any markdown fences and trim
      const cleaned = rawText
        .replace(/```json|```/gi, '')
        .replace(/^[^{]*/, '')   // drop anything before first {
        .replace(/}[^}]*$/, '}') // drop anything after last }
        .trim();

      const result = JSON.parse(cleaned);

      // Challenge override still takes priority
      const challengeOverride = getChallengeAction(s);
      if (challengeOverride && s.activeChallenge) {
        s.ai.llmAction = challengeOverride;
        s.ai.message = result.thought || 'Challenge focus...';
      } else {
        s.ai.llmAction = result.action || 'WANDER';
        s.ai.message = result.thought || 'Analyzing...';
      }
      s.ai.consecutiveFailures = 0;

    } catch (err) {
      console.error('HuggingFace API error:', err.message);
      s.ai.consecutiveFailures = (s.ai.consecutiveFailures || 0) + 1;
     
      // Smart fallback — identical to original
      const challengeOverride = getChallengeAction(s);
      if (challengeOverride && s.activeChallenge) {
        s.ai.llmAction = challengeOverride;
        s.ai.message = `Offline. Challenge: ${s.activeChallenge.name.slice(0, 20)}...`;
      } else {
        let nearThreat = false;
        WORLD_OBJECTS.lions.forEach(l => { if (Math.hypot(s.player.x - l.x, s.player.y - l.y) < 400) nearThreat = true; });

        if (nearThreat) {
          s.ai.llmAction = s.ai.inventory.spear || s.ai.inventory.bow ? 'FIGHT' : 'FLEE';
          s.ai.message = 'Offline. Reacting to predator.';
        } else if (s.hunger < 30) {
          s.ai.llmAction = s.ai.inventory.spear ? 'HUNT' : 'FORAGE';
          s.ai.message = 'Offline. Finding food.';
        } else if (s.thirst < 30) {
          s.ai.llmAction = 'GET_WATER';
          s.ai.message = 'Offline. Finding water.';
        } else {
          s.ai.llmAction = 'WANDER';
          s.ai.message = 'Offline. Patrolling.';
        }
      }
    } finally {
      s.ai.llmThinking = false;
      s.ai.llmTimer = 0;
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

  const executeLLMLogic = (s) => {
    if (s.ai.actionDelay > 0) { s.ai.actionDelay -= 1; return; }

    const isNight = s.time < 6 || s.time > 18;
    const visionRadius = s.activeEvents.includes('Thick Fog') ? 250 : Infinity;
    const isFlooded = s.activeEvents.includes('Flash Flood');
    const waterLevel = isFlooded ? ZONES.JUNGLE.startX + 600 : ZONES.OCEAN.baseEndX;
   
    if (isFlooded && s.dynamicWaterLevel < ZONES.OCEAN_GULF.endX) s.dynamicWaterLevel += 2;
    else if (!isFlooded && s.dynamicWaterLevel > ZONES.OCEAN.baseEndX) s.dynamicWaterLevel -= 1;

    let fearIncrease = 0;
    if (isNight) fearIncrease += 0.5;
    if (isFlooded && s.player.x < s.dynamicWaterLevel) fearIncrease += 3;
    if (s.health < 40) fearIncrease += 3;
   
    let nearThreat = false; let closestThreat = null; let minThreatD = Infinity;
    WORLD_OBJECTS.lions.forEach(l => { let d = Math.hypot(s.player.x - l.x, s.player.y - l.y); if (d < 500) { fearIncrease += 5; nearThreat = true; if (d < minThreatD) { minThreatD = d; closestThreat = l; } }});
    WORLD_OBJECTS.crocodiles.forEach(c => { let d = Math.hypot(s.player.x - c.x, s.player.y - c.y); if (d < 400) { fearIncrease += 5; nearThreat = true; if (d < minThreatD) { minThreatD = d; closestThreat = c; } }});
   
    s.ai.fear = (!nearThreat && s.health > 50 && !isFlooded && !isNight) ? clamp(s.ai.fear - 2, 0, 100) : clamp(s.ai.fear + fearIncrease, 0, 100);
   
    if (s.ai.fear > 90 && Math.random() < 0.15 && !s.ai.panic) {
      s.ai.panic = true; s.ai.message = "PANIC ATTACK!";
    } else if (s.ai.fear < 60) s.ai.panic = false;

    if (s.activeChallenge && !s.ai.panic) {
      const override = getChallengeAction(s);
      if (override) {
        s.ai.llmAction = override;
      }
    }

    if (s.gameMode === 'evolution') {
      s.ai.llmTimer += 1;
      if (s.ai.llmTimer > 5 && !s.ai.llmThinking && !s.ai.target) {
        callClaudeAPI(s);
      }
    }

    if (s.ai.panic || (isFlooded && s.player.x < waterLevel && !s.ai.inventory.boat)) {
      s.ai.state = 'FLEEING'; s.ai.sneaking = false;
      s.ai.target = { x: ZONES.VILLAGE.startX + 400, y: s.player.y + (Math.random() * 400 - 200), type: 'evasion' }; return;
    }
    s.ai.sneaking = nearThreat && s.ai.state !== 'FLEEING' && !s.ai.panic;

    if (s.ai.target && ['combat', 'evasion', 'shelter', 'fish', 'upgrade_base'].includes(s.ai.target.type)) return;

    const action = s.ai.llmAction;
    s.ai.state = action;

    switch (action) {
      case 'FORAGE': {
        let fClosest = null; let fMinD = Infinity;
        WORLD_OBJECTS.trees.forEach(t => { if (t.wood > 0) { let d = Math.hypot(s.player.x - t.x, s.player.y - t.y); if (d < fMinD && d < visionRadius) { fMinD = d; fClosest = { x: t.x, y: t.y, type: 'tree', id: t.id }; } }});
        WORLD_OBJECTS.rocks.forEach(r => { if (r.stone > 0) { let d = Math.hypot(s.player.x - r.x, s.player.y - r.y); if (d < fMinD && d < visionRadius) { fMinD = d; fClosest = { x: r.x, y: r.y, type: 'stone', id: r.id }; } }});
        if (fClosest) s.ai.target = fClosest;
        break;
      }
      case 'HUNT': {
        let hClosest = null; let hMinD = Infinity;
        WORLD_OBJECTS.animals.forEach(a => { let d = Math.hypot(s.player.x - a.x, s.player.y - a.y); if (d < hMinD && d < visionRadius) { hMinD = d; hClosest = { x: a.x, y: a.y, type: 'animal', id: a.id }; }});
        if (hClosest) s.ai.target = hClosest;
        break;
      }
      case 'FISH':
        if (s.ai.inventory.fishingRod) {
          let waterTargetX = s.player.x >= ZONES.SAFE_HAVEN.startX ? ZONES.SAFE_HAVEN.startX - 40 : s.dynamicWaterLevel - 40;
          s.ai.target = { x: waterTargetX, y: s.player.y + (Math.random() * 200 - 100), type: 'fish' };
        }
        break;
      case 'GET_WATER': {
        let wTargetX = s.player.x >= ZONES.SAFE_HAVEN.startX ? ZONES.SAFE_HAVEN.startX - 30 : s.dynamicWaterLevel - 30;
        s.ai.target = { x: wTargetX, y: s.player.y, type: 'water' };
        break;
      }
      case 'SEEK_SHELTER':
        if (s.ai.baseCamp.level > 0) {
          s.ai.target = { x: s.ai.baseCamp.x, y: s.ai.baseCamp.y, type: 'shelter' };
        } else {
          let rClosest = null; let rMinD = Infinity;
          WORLD_OBJECTS.buildings.forEach(b => { let cx = b.x + b.w / 2; let cy = b.y + b.h / 2; let d = Math.hypot(s.player.x - cx, s.player.y - cy); if (d < rMinD && d < visionRadius) { rMinD = d; rClosest = { x: cx, y: cy, type: 'shelter' }; }});
          if (rClosest) s.ai.target = rClosest;
        }
        break;
      case 'BUILD_CAMP':
        if (s.wood >= 5 && s.ai.baseCamp.level === 0) {
          s.ai.baseCamp = { x: s.player.x, y: s.player.y, level: 1 }; s.wood -= 5; s.ai.actionDelay = 4; WORLD_OBJECTS.baseCamp = s.ai.baseCamp; addLog("Established a Base Camp.", "success");
          s.ai.target = null; s.ai.llmAction = 'WANDER';
        } else if (s.wood < 5) {
          s.ai.llmAction = 'FORAGE';
        }
        break;
      case 'UPGRADE_CAMP':
        if (s.ai.baseCamp.level === 1 && s.wood >= 10 && s.stone >= 5) { s.ai.target = { x: s.ai.baseCamp.x, y: s.ai.baseCamp.y, type: 'upgrade_base' }; }
        else if (s.ai.baseCamp.level === 2 && s.wood >= 25 && s.stone >= 15) { s.ai.target = { x: s.ai.baseCamp.x, y: s.ai.baseCamp.y, type: 'upgrade_base' }; }
        else {
          s.ai.llmAction = 'FORAGE';
        }
        break;
      case 'CRAFT_SPEAR':
        if (s.wood >= 3 && s.stone >= 2) { s.wood -= 3; s.stone -= 2; s.ai.inventory.spear = true; s.ai.actionDelay = 3; addLog("Crafted Spear.", "success"); s.ai.target = null; s.ai.llmAction = 'WANDER'; }
        else { s.ai.llmAction = 'FORAGE'; }
        break;
      case 'CRAFT_BOW':
        if (s.wood >= 5 && s.stone >= 1) { s.wood -= 5; s.stone -= 1; s.ai.inventory.bow = true; s.ai.actionDelay = 3; addLog("Crafted Bow.", "success"); s.ai.target = null; s.ai.llmAction = 'WANDER'; }
        else { s.ai.llmAction = 'FORAGE'; }
        break;
      case 'CRAFT_ROD':
        if (s.wood >= 2) { s.wood -= 2; s.ai.inventory.fishingRod = true; s.ai.actionDelay = 2; addLog("Crafted Fishing Rod.", "success"); s.ai.target = null; s.ai.llmAction = 'WANDER'; }
        else { s.ai.llmAction = 'FORAGE'; }
        break;
      case 'CRAFT_BOAT':
        if (s.wood >= 10) { s.wood -= 10; s.ai.inventory.boat = true; s.ai.actionDelay = 5; addLog("Crafted Boat.", "success"); s.ai.target = null; s.ai.llmAction = 'WANDER'; }
        else { s.ai.llmAction = 'FORAGE'; }
        break;
      case 'EVACUATE':
        s.ai.target = { x: Math.min(s.player.x + 800, ZONES.SAFE_HAVEN.startX + 200), y: clamp(s.player.y + (Math.random() * 200 - 100), 100, WORLD_HEIGHT - 100), type: 'evasion' };
        break;
      case 'FIGHT':
        if (closestThreat) s.ai.target = { x: closestThreat.x, y: closestThreat.y, type: 'combat', ref: closestThreat };
        else if (nearThreat) s.ai.llmAction = 'FLEE';
        break;
      case 'FLEE':
        if (closestThreat) s.ai.target = { x: clamp(s.player.x + (s.player.x - closestThreat.x) * 2, 50, WORLD_WIDTH - 50), y: clamp(s.player.y + (s.player.y - closestThreat.y) * 2, 50, WORLD_HEIGHT - 50), type: 'evasion' };
        break;
      case 'WANDER':
      default:
        if (!s.ai.target || Math.random() < 0.1) s.ai.target = { x: clamp(s.player.x + (Math.random() * 800 - 400), 500, WORLD_WIDTH - 100), y: clamp(s.player.y + (Math.random() * 800 - 400), 100, WORLD_HEIGHT - 100), type: 'wander' };
        break;
    }

    if (s.ai.target && s.ai.target.type === 'upgrade_base') {
      if (Math.hypot(s.player.x - s.ai.target.x, s.player.y - s.ai.target.y) < 30) {
        if (s.ai.baseCamp.level === 1) { s.wood -= 10; s.stone -= 5; s.ai.baseCamp.level = 2; addLog("Shelter Upgraded (Level 2).", "success"); }
        else if (s.ai.baseCamp.level === 2) { s.wood -= 25; s.stone -= 15; s.ai.baseCamp.level = 3; addLog("Shelter Upgraded to Lake Deck (Level 3).", "success"); }
        WORLD_OBJECTS.baseCamp = s.ai.baseCamp; s.ai.actionDelay = 5; s.ai.target = null; s.ai.llmAction = 'WANDER';
      }
    }
  };

  useEffect(() => {
    if (!gameRef.current.started || !gameRef.current.isAlive) return;
    const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext('2d');
    let animationId; let frameCount = 0;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize); resize();

    const render = () => {
      const s = gameRef.current; if (!s.isAlive) return; frameCount++;

      const isNearDeath = s.health < 25;
      const timeScale = isNearDeath ? 0.4 : 1.0;
      const isFlooded = s.activeEvents.includes('Flash Flood');
      const isSailing = s.ai.state === 'SAILING' || (s.ai.inventory.boat && s.player.x < s.dynamicWaterLevel);
      const isFishing = s.ai.target && s.ai.target.type === 'fish' && Math.hypot(s.player.x - s.ai.target.x, s.player.y - s.ai.target.y) < 15;

      WORLD_OBJECTS.animals.forEach(anim => {
        if (Math.random() < 0.02 * timeScale) { anim.angle = Math.random() * Math.PI * 2; anim.vx = Math.cos(anim.angle); anim.vy = Math.sin(anim.angle); }
        anim.x = clamp(anim.x + anim.vx * timeScale, ZONES.JUNGLE.startX, WORLD_WIDTH - 100); anim.y = clamp(anim.y + anim.vy * timeScale, 100, WORLD_HEIGHT - 100);
      });

      WORLD_OBJECTS.lions.forEach(lion => {
        let distToPlayer = Math.hypot(s.player.x - lion.x, s.player.y - lion.y);
        let inVisionCone = distToPlayer < 100 || (distToPlayer < 400 && !s.ai.sneaking && !isSailing);
       
        if (inVisionCone && s.isAlive) lion.state = distToPlayer > 200 ? 'stalking' : 'chasing';
        else if (distToPlayer > 600) lion.state = 'idle';

        if (lion.state === 'chasing' || lion.state === 'stalking') {
          lion.angle = Math.atan2(s.player.y - lion.y, s.player.x - lion.x);
          let speed = lion.state === 'chasing' ? (lion.type === 'panther' ? 9.5 : 8.5) : 3;
          lion.x += Math.cos(lion.angle) * speed * timeScale; lion.y += Math.sin(lion.angle) * speed * timeScale;
          if (distToPlayer < 40 && s.isAlive && !isSailing) {
            if (s.ai.state === 'FIGHT') {
              WORLD_OBJECTS.lions = WORLD_OBJECTS.lions.filter(l => l !== lion); s.food += 20; s.ai.actionDelay = 5; addLog(`Defeated ${lion.type}!`, "success");
            } else {
              s.health -= 40; s.ai.fear = 100; s.ai.panic = true; lion.x -= Math.cos(lion.angle) * 100; addLog(`Mauled by ${lion.type}!`, "danger");
            }
          }
        } else {
          if (Math.random() < 0.01 * timeScale) lion.angle = Math.random() * Math.PI * 2;
          lion.x += Math.cos(lion.angle) * timeScale; lion.y += Math.sin(lion.angle) * timeScale;
        }
        lion.x = clamp(lion.x, 100, WORLD_WIDTH - 100); lion.y = clamp(lion.y, 100, WORLD_HEIGHT - 100);
      });

      WORLD_OBJECTS.crocodiles.forEach(croc => {
        let distToPlayer = Math.hypot(s.player.x - croc.x, s.player.y - croc.y);
        if (distToPlayer < 300 && s.player.x < s.dynamicWaterLevel && !isSailing) {
          croc.state = 'attacking'; croc.angle = Math.atan2(s.player.y - croc.y, s.player.x - croc.x);
          croc.x += Math.cos(croc.angle) * 7 * timeScale; croc.y += Math.sin(croc.angle) * 7 * timeScale;
          if (distToPlayer < 40 && s.isAlive) { s.health -= 25; s.ai.fear += 40; croc.x -= Math.cos(croc.angle) * 150; addLog("Crocodile ambush!", "danger"); }
        } else {
          croc.state = 'hidden'; if (Math.random() < 0.01 * timeScale) croc.angle = Math.random() * Math.PI * 2;
          croc.x += Math.cos(croc.angle) * 0.5 * timeScale; croc.y += Math.sin(croc.angle) * 0.5 * timeScale;
        }
        croc.x = clamp(croc.x, 0, s.dynamicWaterLevel - 50); croc.y = clamp(croc.y, 100, WORLD_HEIGHT - 100);
      });

      let actualSpeed = s.player.baseSpeed * s.player.speedMult * timeScale;
      if (s.player.x < s.dynamicWaterLevel && !isSailing) actualSpeed *= 0.35;
      if (s.ai.sneaking) actualSpeed *= 0.4;
      if (s.ai.panic) actualSpeed *= 1.3;
      if (isSailing) actualSpeed = 9 * timeScale;

      if (s.ai.target && s.ai.actionDelay <= 0 && s.stamina > 5 && !isFishing) {
        let dx = s.ai.target.x - s.player.x; let dy = s.ai.target.y - s.player.y;
        let dist = Math.hypot(dx, dy);
        let reachDist = ['animal', 'combat'].includes(s.ai.target.type) ? (s.ai.inventory.bow ? 120 : 50) : 20;

        if (dist > reachDist) {
          s.player.vx = (dx / dist) * actualSpeed; s.player.vy = (dy / dist) * actualSpeed;
          s.player.angle = Math.atan2(dy, dx);
          s.stamina -= (actualSpeed < 3 ? 0.08 : 0.02) * timeScale;
        } else {
          s.player.vx = 0; s.player.vy = 0;
          if (s.ai.target.type === 'water') { s.water += 3; s.ai.actionDelay = 2; s.ai.target = null; }
          else if (s.ai.target.type === 'fish') { s.ai.actionDelay = 6; s.ai.message = "Casting line..."; }
          else if (s.ai.target.type === 'tree') { let t = WORLD_OBJECTS.trees.find(x => x.id === s.ai.target.id); if (t) { s.wood += t.wood; t.wood = 0; s.ai.actionDelay = 2; } s.ai.target = null; }
          else if (s.ai.target.type === 'stone') { let r = WORLD_OBJECTS.rocks.find(x => x.id === s.ai.target.id); if (r) { s.stone += r.stone; r.stone = 0; s.ai.actionDelay = 2; } s.ai.target = null; }
          else if (s.ai.target.type === 'animal') {
            let animIdx = WORLD_OBJECTS.animals.findIndex(a => a.id === s.ai.target.id);
            if (animIdx !== -1) {
              s.food += s.ai.inventory.spear || s.ai.inventory.bow ? WORLD_OBJECTS.animals[animIdx].meat : 3;
              WORLD_OBJECTS.animals.splice(animIdx, 1); s.ai.actionDelay = 2;
              if (s.ai.inventory.bow) addLog("Shot animal with Bow.", 'success');
              else if (s.ai.inventory.spear) addLog("Hunted animal with Spear.", 'success');
              else addLog("Hunted animal unarmed.", 'info');
            }
            s.ai.target = null;
          }
          else if (s.ai.target.type === 'secret') { let b = s.ai.target.ref; if (b && b.hasSecret) { b.hasSecret = false; s.food += 5; s.stone += 5; s.ai.memory.evolutionLevel += 1; addLog("Found ancient secrets!", 'success'); } s.ai.target = null; }
          else if (!['combat', 'shelter'].includes(s.ai.target.type)) { s.ai.target = null; }
        }
      } else { s.player.vx = 0; s.player.vy = 0; }

      if (isFishing && s.ai.actionDelay <= 0) { s.food += 15; addLog("Caught a massive fish!", "success"); s.ai.target = null; s.ai.llmAction = 'WANDER'; }

      s.player.x = clamp(s.player.x + s.player.vx, 20, WORLD_WIDTH - 20); s.player.y = clamp(s.player.y + s.player.vy, 20, WORLD_HEIGHT - 20);

      if (isNearDeath) s.camera.zoom += (1.4 - s.camera.zoom) * 0.05; else s.camera.zoom += (1.1 - s.camera.zoom) * 0.05;
      s.camera.shake = s.ai.panic || s.ai.state === 'FIGHT' ? (Math.random() - 0.5) * 15 : 0;
      s.camera.x += (s.player.x - (canvas.width / 2) / s.camera.zoom - s.camera.x) * 0.1;
      s.camera.y += (s.player.y - (canvas.height / 2) / s.camera.zoom - s.camera.y) * 0.1;

      s.shelterStatus = 0;
      for (const b of WORLD_OBJECTS.buildings) { if (s.player.x > b.x && s.player.x < b.x + b.w && s.player.y > b.y && s.player.y < b.y + b.h) { s.shelterStatus = 100; break; } }
      if (s.ai.baseCamp.level > 0 && Math.hypot(s.player.x - s.ai.baseCamp.x, s.player.y - s.ai.baseCamp.y) < 80) s.shelterStatus = 100;

      ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.save();
      ctx.scale(s.camera.zoom, s.camera.zoom); ctx.translate(-s.camera.x + s.camera.shake, -s.camera.y + s.camera.shake);

      const oceanGrad = ctx.createLinearGradient(0, 0, s.dynamicWaterLevel, 0);
      oceanGrad.addColorStop(0, ZONES.OCEAN.color1); oceanGrad.addColorStop(1, ZONES.OCEAN.color2);
      ctx.fillStyle = oceanGrad; ctx.fillRect(0, 0, s.dynamicWaterLevel, WORLD_HEIGHT);
     
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'; ctx.lineWidth = 4;
      for (let w = 0; w < 3; w++) {
        ctx.beginPath();
        for (let y = 0; y < WORLD_HEIGHT; y += 30) {
          let waveX = s.dynamicWaterLevel - 15 - (w * 25) + Math.sin(frameCount * 0.04 + y * 0.03 + w) * 12;
          if (y === 0) ctx.moveTo(waveX, y); else ctx.quadraticCurveTo(waveX + 20, y - 15, waveX, y);
        }
        ctx.stroke();
      }

      WORLD_OBJECTS.lilyPads.forEach(lp => {
        if (lp.x < s.dynamicWaterLevel - 30) {
          ctx.save(); ctx.translate(lp.x, lp.y + Math.sin(frameCount * 0.02 + lp.id) * 2); ctx.rotate(lp.angle);
          ctx.fillStyle = '#4caf50'; ctx.beginPath(); ctx.arc(0, 0, lp.size, 0.3, Math.PI * 2 - 0.3); ctx.fill();
          ctx.fillStyle = '#ff9999'; ctx.beginPath(); ctx.arc(0, 0, lp.size * 0.3, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
      });

      if (s.dynamicWaterLevel < ZONES.ISLAND.endX) { ctx.fillStyle = ZONES.ISLAND.color; ctx.fillRect(s.dynamicWaterLevel, 0, ZONES.ISLAND.endX - s.dynamicWaterLevel, WORLD_HEIGHT); }
      if (s.dynamicWaterLevel < ZONES.JUNGLE.endX) { ctx.fillStyle = ZONES.JUNGLE.color; ctx.fillRect(Math.max(s.dynamicWaterLevel, ZONES.JUNGLE.startX), 0, ZONES.JUNGLE.endX - Math.max(s.dynamicWaterLevel, ZONES.JUNGLE.startX), WORLD_HEIGHT); }
      ctx.fillStyle = ZONES.VILLAGE.color; ctx.fillRect(ZONES.VILLAGE.startX, 0, ZONES.VILLAGE.endX - ZONES.VILLAGE.startX, WORLD_HEIGHT);
     
      const gulfGrad = ctx.createLinearGradient(ZONES.OCEAN_GULF.startX, 0, ZONES.OCEAN_GULF.endX, 0);
      gulfGrad.addColorStop(0, ZONES.OCEAN_GULF.color1); gulfGrad.addColorStop(1, ZONES.OCEAN_GULF.color2);
      ctx.fillStyle = gulfGrad; ctx.fillRect(ZONES.OCEAN_GULF.startX, 0, ZONES.OCEAN_GULF.endX - ZONES.OCEAN_GULF.startX, WORLD_HEIGHT);
      ctx.fillStyle = ZONES.SAFE_HAVEN.color; ctx.fillRect(ZONES.SAFE_HAVEN.startX, 0, ZONES.SAFE_HAVEN.endX - ZONES.SAFE_HAVEN.startX, WORLD_HEIGHT);

      if (s.activeEvents.includes('Flash Flood')) {
        ctx.fillStyle = 'rgba(100, 180, 220, 0.2)';
        ctx.fillRect(s.dynamicWaterLevel, 0, WORLD_WIDTH - s.dynamicWaterLevel, WORLD_HEIGHT);
      }

      const shX = 18; const shY = 18;
      WORLD_OBJECTS.trees.forEach(t => { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(t.x + shX, t.y + shY, t.radius * 1.2, t.radius * 0.8, 0, 0, Math.PI * 2); ctx.fill(); });
      WORLD_OBJECTS.buildings.forEach(b => { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(b.x + shX, b.y + shY, b.w, b.h); });

      WORLD_OBJECTS.rocks.forEach(r => {
        ctx.fillStyle = '#8f979c'; ctx.beginPath(); ctx.ellipse(r.x, r.y, r.size, r.size * 0.8, 0, 0, Math.PI * 2); ctx.fill();
        if (r.stone > 0) { ctx.fillStyle = '#bac1c4'; ctx.beginPath(); ctx.ellipse(r.x - 3, r.y - 3, r.size * 0.6, r.size * 0.4, 0, 0, Math.PI * 2); ctx.fill(); }
      });

      if (WORLD_OBJECTS.baseCamp && WORLD_OBJECTS.baseCamp.level > 0) {
        const bc = WORLD_OBJECTS.baseCamp;
        ctx.save(); ctx.translate(bc.x, bc.y);
        if (bc.level === 1) {
          ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(-20, -10, 50, 40);
          ctx.fillStyle = '#5c8a4c'; ctx.beginPath(); ctx.moveTo(-30, 20); ctx.lineTo(0, -30); ctx.lineTo(30, 20); ctx.fill();
          ctx.fillStyle = '#3a5430'; ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(30, 20); ctx.lineTo(0, 20); ctx.fill();
          ctx.strokeStyle = '#4a3320'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(0, 20); ctx.stroke();
        } else if (bc.level === 2) {
          ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(-35, -25, 80, 80);
          ctx.fillStyle = '#8f5c38'; ctx.fillRect(-40, -40, 80, 80); ctx.fillStyle = '#664228'; ctx.fillRect(-40, 30, 80, 10);
          ctx.fillStyle = '#a6754b'; ctx.fillRect(-45, -45, 90, 45); ctx.fillStyle = '#825a38'; ctx.fillRect(-45, 0, 90, 35);
        } else if (bc.level === 3) {
          ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(-55, -20, 130, 110);
          ctx.fillStyle = '#3d2616'; ctx.fillRect(-55, 60, 10, 30); ctx.fillRect(55, 60, 10, 30); ctx.fillRect(55, -40, 10, 30);
          ctx.fillStyle = '#c78f5a'; ctx.fillRect(-60, -50, 130, 110);
          ctx.strokeStyle = '#a37143'; ctx.lineWidth = 2; for (let p = -50; p < 70; p += 15) { ctx.beginPath(); ctx.moveTo(p, -50); ctx.lineTo(p, 60); ctx.stroke(); }
          ctx.fillStyle = '#8f6138'; ctx.fillRect(-60, 60, 130, 15); ctx.fillRect(70, -50, 15, 110);
          ctx.fillStyle = '#7a4e2a'; ctx.fillRect(-50, -40, 75, 65);
          ctx.fillStyle = '#a66d3a'; ctx.fillRect(-55, -45, 85, 45);
          ctx.fillStyle = '#4a2f18'; ctx.fillRect(-25, -10, 25, 35); ctx.fillStyle = '#c49a6c'; ctx.beginPath(); ctx.arc(-5, 10, 3, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#b37c49'; ctx.fillRect(-25, 75, 45, 12); ctx.fillRect(-25, 92, 45, 12);
        }
        ctx.restore();
      }

      WORLD_OBJECTS.crocodiles.forEach(croc => {
        ctx.save(); ctx.translate(croc.x, croc.y); ctx.rotate(croc.angle);
        if (croc.state === 'hidden') { ctx.fillStyle = '#1e3323'; ctx.beginPath(); ctx.ellipse(12, -6, 4, 3, 0, 0, Math.PI * 2); ctx.ellipse(12, 6, 4, 3, 0, 0, Math.PI * 2); ctx.fill(); }
        else {
          ctx.fillStyle = '#36593e'; ctx.beginPath(); ctx.ellipse(-10, 0, 35, 14, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#213826'; ctx.beginPath(); ctx.ellipse(-30, 0, 20, 6, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#1a2e20'; ctx.beginPath(); ctx.moveTo(15, -10); ctx.lineTo(40, -14); ctx.lineTo(25, 0); ctx.fill(); ctx.beginPath(); ctx.moveTo(15, 10); ctx.lineTo(40, 14); ctx.lineTo(25, 0); ctx.fill();
        }
        ctx.restore();
      });

      WORLD_OBJECTS.buildings.forEach(b => {
        ctx.fillStyle = '#c49566'; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.fillStyle = '#8f6541'; ctx.fillRect(b.x, b.y, b.w, 15); ctx.fillRect(b.x, b.y, 15, b.h);
        if (b.hasSecret) { ctx.fillStyle = '#ffea00'; ctx.fillRect(b.x + b.w / 2 - 12, b.y + b.h / 2 - 12, 24, 24); }
        if (!(s.player.x > b.x && s.player.x < b.x + b.w && s.player.y > b.y && s.player.y < b.y + b.h)) { ctx.fillStyle = '#a6774e'; ctx.fillRect(b.x - 5, b.y - 5, b.w + 10, b.h + 10); }
      });

      WORLD_OBJECTS.animals.forEach(anim => {
        ctx.save(); ctx.translate(anim.x, anim.y); ctx.rotate(anim.angle);
        if (anim.type === 'hippo') {
          ctx.fillStyle = '#6a707a'; ctx.beginPath(); ctx.ellipse(0, 0, 25, 18, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#555a63'; ctx.beginPath(); ctx.ellipse(20, 0, 16, 14, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ffcccc'; ctx.beginPath(); ctx.arc(32, -6, 2, 0, Math.PI * 2); ctx.arc(32, 6, 2, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillStyle = '#6b4c3a'; ctx.beginPath(); ctx.ellipse(0, 0, 16, 10, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#e8dcc5'; ctx.beginPath(); ctx.moveTo(16, -4); ctx.lineTo(20, -6); ctx.lineTo(16, -2); ctx.fill(); ctx.beginPath(); ctx.moveTo(16, 4); ctx.lineTo(20, 6); ctx.lineTo(16, 2); ctx.fill();
        }
        ctx.restore();
      });

      WORLD_OBJECTS.lions.forEach(lion => {
        ctx.save(); ctx.translate(lion.x, lion.y); ctx.rotate(lion.angle);
        let legOffset = lion.state === 'chasing' ? Math.sin(frameCount * 0.6) * 8 : 0;
        if (lion.type === 'panther') {
          ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(-10, -6 + legOffset, 5, 4, 0, 0, Math.PI * 2); ctx.ellipse(10, 6 - legOffset, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(-2, 0, 20, 10, 0, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(-20, 0, 15, 3, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(14, 0, 8, 7, 0, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillStyle = '#b8860b'; ctx.beginPath(); ctx.ellipse(-10, -8 + legOffset, 6, 4, 0, 0, Math.PI * 2); ctx.ellipse(10, 8 - legOffset, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#6e3c15'; ctx.beginPath(); ctx.ellipse(10, 0, 18, 16, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#DAA520'; ctx.beginPath(); ctx.ellipse(-4, 0, 24, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(14, 0, 10, 9, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      });

      WORLD_OBJECTS.trees.forEach(t => {
        ctx.fillStyle = '#523a25'; ctx.fillRect(t.x - 5, t.y, 10, 18);
        if (t.wood > 0) {
          if (t.type === 'pine') {
            ctx.fillStyle = '#315e21'; ctx.beginPath(); ctx.moveTo(t.x, t.y - 20); ctx.lineTo(t.x - t.radius * 1.1, t.y + 15); ctx.lineTo(t.x + t.radius * 1.1, t.y + 15); ctx.fill();
            ctx.fillStyle = '#427d2c'; ctx.beginPath(); ctx.moveTo(t.x, t.y - 40); ctx.lineTo(t.x - t.radius * 0.8, t.y - 5); ctx.lineTo(t.x + t.radius * 0.8, t.y - 5); ctx.fill();
            ctx.fillStyle = '#56a638'; ctx.beginPath(); ctx.moveTo(t.x, t.y - 60); ctx.lineTo(t.x - t.radius * 0.5, t.y - 25); ctx.lineTo(t.x + t.radius * 0.5, t.y - 25); ctx.fill();
          } else {
            ctx.fillStyle = '#63c43f'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(t.x + Math.cos(i) * t.radius * 0.7, t.y - 20 + Math.sin(i) * t.radius * 0.7, t.radius, t.radius * 0.4, i, 0, Math.PI * 2); ctx.fill(); }
          }
        } else { ctx.fillStyle = '#e0c294'; ctx.beginPath(); ctx.ellipse(t.x, t.y + 10, t.radius * 0.4, t.radius * 0.25, 0, 0, Math.PI * 2); ctx.fill(); }
      });

      ctx.save(); ctx.translate(s.player.x, s.player.y); ctx.rotate(s.player.angle);
     
      if (isSailing) {
        ctx.fillStyle = '#9e734c'; ctx.fillRect(-30, -25, 60, 50);
        ctx.strokeStyle = '#785536'; ctx.lineWidth = 3; for (let p = -15; p < 25; p += 15) { ctx.beginPath(); ctx.moveTo(-30, p); ctx.lineTo(30, p); ctx.stroke(); }
      }

      let bob = (s.player.vx !== 0 || s.player.vy !== 0) ? Math.sin(frameCount * 0.5) * 3 : 0;
     
      ctx.fillStyle = '#614835'; ctx.beginPath(); ctx.ellipse(-8, 0, 6, 12, 0, 0, Math.PI * 2); ctx.fill();

      if (s.ai.inventory.bow && !isFishing && s.ai.state !== 'FORAGE') {
        ctx.strokeStyle = '#5c4033'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(20, 0, 15, -Math.PI / 2.5, Math.PI / 2.5); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(25, -14); ctx.lineTo(10, 0); ctx.lineTo(25, 14); ctx.stroke();
      } else if (s.ai.inventory.spear && !isFishing) {
        ctx.strokeStyle = '#5c4033'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 16); ctx.lineTo(35, 16); ctx.stroke();
        ctx.fillStyle = '#bcc4c7'; ctx.beginPath(); ctx.moveTo(35, 13); ctx.lineTo(48, 16); ctx.lineTo(35, 19); ctx.fill();
      }
     
      ctx.fillStyle = '#2980b9'; ctx.beginPath(); ctx.ellipse(0, 0, 14, 18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f1c27d'; ctx.beginPath(); ctx.ellipse(5 + bob * 0.5, 0, 10, 10, 0, 0, Math.PI * 2); ctx.fill();
     
      ctx.beginPath(); ctx.ellipse(10, -14 + bob, 5, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(10, 14 - bob, 5, 5, 0, 0, Math.PI * 2); ctx.fill();

      if (isFishing) {
        ctx.strokeStyle = '#8f6640'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(10, 14); ctx.lineTo(45, 35); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(45, 35); ctx.lineTo(100, 0); ctx.stroke();
        ctx.fillStyle = '#ff3333'; ctx.beginPath(); ctx.arc(100, 0 + Math.sin(frameCount * 0.1) * 4, 4, 0, Math.PI * 2); ctx.fill();
      }

      if (s.ai.panic) { ctx.fillStyle = '#73c2fb'; ctx.beginPath(); ctx.arc(0, -15, 3, 0, Math.PI * 2); ctx.arc(-5, 15, 2, 0, Math.PI * 2); ctx.fill(); }
      if (s.ai.sneaking) { ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
     
      ctx.restore();

      ctx.globalCompositeOperation = 'lighter';
      WORLD_OBJECTS.fires.forEach((f, index) => {
        if (f.fuel <= 0) { WORLD_OBJECTS.fires.splice(index, 1); return; }
        const gradient = ctx.createRadialGradient(f.x, f.y, 10, f.x, f.y, 300 + Math.random() * 30);
        gradient.addColorStop(0, 'rgba(255, 160, 0, 0.8)'); gradient.addColorStop(1, 'rgba(255, 20, 0, 0)');
        ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(f.x, f.y, 350, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fffb00'; ctx.beginPath(); ctx.arc(f.x, f.y, 8 + Math.random() * 4, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();

      const isNight2 = s.time < 6 || s.time > 18;
      let darkAlpha = isNight2 ? 0.85 : 0;
      if (s.activeEvents.includes('Storm Collapse')) darkAlpha = Math.max(darkAlpha, 0.65);
     
      if (darkAlpha > 0) { ctx.fillStyle = `rgba(8, 12, 25, ${darkAlpha})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      if (s.activeEvents.includes('Heatwave')) { ctx.fillStyle = `rgba(255, 90, 0, 0.18)`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      if (s.activeEvents.includes('Night Freeze')) {
        ctx.fillStyle = `rgba(160, 230, 255, 0.35)`; ctx.fillRect(0, 0, canvas.width, canvas.height);
        const frostGrad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.height * 0.3, canvas.width / 2, canvas.height / 2, canvas.height);
        frostGrad.addColorStop(0, 'rgba(255,255,255,0)'); frostGrad.addColorStop(1, 'rgba(255,255,255,0.7)');
        ctx.fillStyle = frostGrad; ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      if (s.activeEvents.includes('Thick Fog')) {
        const fogGrad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 150, canvas.width / 2, canvas.height / 2, 600);
        fogGrad.addColorStop(0, 'rgba(240, 245, 255, 0)'); fogGrad.addColorStop(1, 'rgba(240, 245, 255, 0.95)');
        ctx.fillStyle = fogGrad; ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      if (s.activeEvents.includes('Storm Collapse')) {
        ctx.strokeStyle = 'rgba(220, 230, 255, 0.8)'; ctx.lineWidth = 2.5; ctx.beginPath();
        for (let i = 0; i < 250; i++) { let rx = Math.random() * canvas.width; let ry = (frameCount * 40 + i * 25) % canvas.height; ctx.moveTo(rx, ry); ctx.lineTo(rx - 20, ry + 50); }
        ctx.stroke();
        if (Math.random() < 0.05) { ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      }

      if (isNearDeath) {
        ctx.fillStyle = `rgba(220, 0, 0, ${0.2 + Math.sin(frameCount * 0.15) * 0.2})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const deathGrad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.height * 0.3, canvas.width / 2, canvas.height / 2, canvas.height);
        deathGrad.addColorStop(0, 'rgba(0,0,0,0)'); deathGrad.addColorStop(1, 'rgba(120,0,0,0.9)');
        ctx.fillStyle = deathGrad; ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      animationId = requestAnimationFrame(render);
    };

    render();
    return () => { cancelAnimationFrame(animationId); window.removeEventListener('resize', resize); };
  }, [gameRef.current.started, gameRef.current.isAlive]);

  useEffect(() => {
    if (!gameRef.current.started || !gameRef.current.isAlive) return;

    const interval = setInterval(() => {
      const s = gameRef.current; if (!s.isAlive) return;

      if (!s.ai.llmThinking) executeLLMLogic(s);
      manageChallenges(s);

      s.time += 0.25; if (s.time >= 24) { s.time = 0; s.day += 1; addLog(`Day ${s.day} begins.`, 'system'); }

      s.eventTimer -= 1;
      if (s.eventTimer <= 0 && !s.activeChallenge) {
        s.activeEvents = []; s.eventTimer = Math.floor(Math.random() * 40) + 60;
        addLog("Atmosphere stabilizing.", "info");
      } else if (s.eventTimer <= 0) {
        s.eventTimer = 30;
      }

      s.hunger = clamp(s.hunger - (s.ai.panic ? 1.0 : 0.5), 0, 100);
      let thirstDrain = s.activeEvents.includes('Heatwave') ? 2.5 : 0.8;
      s.thirst = clamp(s.thirst - thirstDrain, 0, 100);

      let targetTemp = 25;
      if (s.time < 6 || s.time > 18) targetTemp -= 5;
      if (s.activeEvents.includes('Storm Collapse')) targetTemp -= 20;
      if (s.activeEvents.includes('Night Freeze')) targetTemp = -15;
      if (s.activeEvents.includes('Heatwave')) targetTemp += 25;
     
      WORLD_OBJECTS.fires.forEach(f => { if (Math.hypot(s.player.x - f.x, s.player.y - f.y) < 300) { targetTemp += 40; f.fuel -= (s.activeEvents.includes('Storm Collapse') && s.shelterStatus === 0 ? 8 : 1); } });
     
      targetTemp -= (s.wetness / 8);
      if (s.shelterStatus === 100 && s.activeEvents.length > 0) targetTemp += 20;

      if (s.temp < targetTemp) s.temp = clamp(s.temp + 1.0, -20, 60); else if (s.temp > targetTemp) s.temp = clamp(s.temp - 1.5, -20, 60);

      if (s.activeEvents.includes('Flash Flood') && s.player.x < s.dynamicWaterLevel) s.wetness = 100;
      else if (s.activeEvents.includes('Storm Collapse') && s.shelterStatus === 0) s.wetness = clamp(s.wetness + 15, 0, 100);
      else s.wetness = clamp(s.wetness - 2, 0, 100);

      if (s.ai.state === 'IDLE' || s.ai.sneaking) s.stamina = clamp(s.stamina + 2, 0, 100);

      let healthDrain = 0;
      if (s.hunger <= 0) healthDrain += 2.0;
      if (s.thirst <= 0) healthDrain += 3.0;
      if (s.temp < 10) healthDrain += 3.0;
      if (s.temp > 45) healthDrain += 3.0;

      if (healthDrain > 0) { s.health -= healthDrain; }
      else if (s.hunger > 50 && s.thirst > 50 && s.temp > 15 && s.temp < 35 && s.ai.fear < 50) { s.health = clamp(s.health + 0.5, 0, 100); }

      if (s.health < 1 && s.isAlive) {
        s.health = 0; s.isAlive = false;
        if (s.hunger <= 0) s.causeOfDeath = "Starvation";
        else if (s.thirst <= 0) s.causeOfDeath = "Dehydration";
        else if (s.temp < 10) s.causeOfDeath = "Hypothermia";
        else if (s.temp > 45) s.causeOfDeath = "Heatstroke";
        else s.causeOfDeath = "System Failure";

        if (s.gameMode === 'evolution') {
          const deathRecord = `${s.causeOfDeath} on Day ${s.day} (Gen ${s.generation})`;
          s.ai.memory.pastDeaths.push(deathRecord);
          if (s.ai.memory.pastDeaths.length > 6) s.ai.memory.pastDeaths.shift();
          s.ai.memory.evolutionLevel = clamp(s.ai.memory.evolutionLevel + 1, 1, 20);
        }

        addLog("SUBJECT TERMINATED.", "danger");
      }

      setHudState({ ...s, logs: [...s.logs], ai: { ...s.ai } });
    }, TICK_RATE);
    return () => clearInterval(interval);
  }, [gameRef.current.started, gameRef.current.isAlive]);

  const formatTime = (t) => `${Math.floor(t).toString().padStart(2, '0')}:${Math.floor((t - Math.floor(t)) * 60).toString().padStart(2, '0')}`;

  const CircularStat = ({ icon: Icon, value, color, warn }) => {
    const radius = 20; const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (clamp(value, 0, 100) / 100) * circumference;
    return (
      <div className={`relative w-14 h-14 rounded-full bg-black/60 border-2 ${warn ? 'border-red-500 animate-pulse' : 'border-black/80'} flex items-center justify-center shadow-lg backdrop-blur-md`}>
        <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none">
          <circle cx="26" cy="26" r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth="4" fill="none" />
          <circle cx="26" cy="26" r={radius} stroke={color} strokeWidth="4" fill="none" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-1000 ease-out" />
        </svg>
        <Icon size={20} color={warn ? '#ef4444' : '#fff'} className="z-10 drop-shadow-md" />
      </div>
    );
  };

  const HotbarSlot = ({ icon: Icon, count, active, label }) => (
    <div className={`w-14 h-14 bg-black/70 backdrop-blur-md border-2 ${active ? 'border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]' : 'border-zinc-800'} rounded-lg flex flex-col items-center justify-center relative`}>
      <Icon size={24} className={active ? 'text-emerald-400' : 'text-zinc-400'} />
      {count !== undefined && <span className="absolute bottom-0 right-1 text-[10px] font-bold text-white">{count}</span>}
      {label && <span className="absolute top-0 left-1 text-[8px] font-bold text-zinc-500">{label}</span>}
    </div>
  );

  if (!gameRef.current.started) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-300 flex flex-col items-center justify-center p-6 font-mono relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-zinc-950 to-zinc-950"></div>
        <div className="max-w-3xl w-full space-y-6 z-10">
          <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 border-b border-zinc-800/50 pb-6 flex items-center gap-4"><Brain className="text-blue-500" size={48}/> EVOLUTIONARY AI</h1>
          <p className="leading-relaxed text-zinc-400 text-lg">Initialize Subject-01 into the high-fidelity 2.5D simulation. Powered by HuggingFace AI ({HF_MODEL || 'model not set'}) with persistent memory across 6 generations.</p>
          {(!HF_TOKEN || !HF_MODEL) && (
            <div className="bg-red-950/60 border border-red-700 rounded-xl px-5 py-3 text-red-300 text-sm font-mono">
              ⚠ Missing env vars: {!HF_TOKEN ? 'VITE_HF_TOKEN ' : ''}{!HF_MODEL ? 'VITE_HF_MODEL' : ''}. AI will run in offline fallback mode.
            </div>
          )}
          <div className="grid grid-cols-2 gap-6 mt-8">
            <button onClick={() => startGame('hardcore')} className="bg-zinc-900/80 backdrop-blur border border-red-900/50 p-8 rounded-xl hover:bg-red-950/40 transition-all text-left flex flex-col gap-3 group shadow-2xl">
              <div className="flex items-center gap-3 text-red-500 font-bold text-2xl"><Skull size={28}/> HARDCORE MODE</div>
              <span className="text-sm text-zinc-400 leading-relaxed">Permadeath. No memory retention. Pure sandbox survival. Challenge-aware AI instincts active.</span>
            </button>
            <button onClick={() => startGame('evolution')} className="bg-zinc-900/80 backdrop-blur border border-blue-900/50 p-8 rounded-xl hover:bg-blue-950/40 transition-all text-left flex flex-col gap-3 group shadow-2xl">
              <div className="flex items-center gap-3 text-blue-400 font-bold text-2xl"><RefreshCcw size={28}/> LLM EVOLUTION</div>
              <span className="text-sm text-zinc-400 leading-relaxed">HuggingFace API connected. AI remembers how it died and adapts. Challenge overrides guide behavior toward success.</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!hudState) return null;

  const survivalLessons = buildSurvivalLessons(hudState.ai.memory.pastDeaths);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-zinc-950 font-sans text-zinc-300 select-none">
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />

      {!hudState.isAlive && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-1000">
          <div className="max-w-lg w-full text-center space-y-6">
            <Skull size={72} className="mx-auto text-red-500 mb-6 animate-pulse drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]" />
            <h1 className="text-5xl font-black tracking-tighter text-white">SIMULATION ENDED</h1>
            <div className="bg-zinc-900/90 p-8 border border-zinc-800 rounded-xl text-left space-y-5 shadow-2xl">
              <div className="flex justify-between border-b border-zinc-800 pb-3 text-lg"><span className="text-zinc-500">Cause of Death</span><span className="text-red-400 font-bold uppercase">{hudState.causeOfDeath}</span></div>
              <div className="flex justify-between border-b border-zinc-800 pb-3 text-lg"><span className="text-zinc-500">Days Survived</span><span className="text-white font-bold">{hudState.day}</span></div>
              <div className="flex justify-between border-b border-zinc-800 pb-3 text-lg"><span className="text-zinc-500">Challenges Completed</span><span className="text-emerald-400 font-bold">{hudState.completedChallenges}</span></div>
              <div className="flex justify-between border-b border-zinc-800 pb-3 text-lg"><span className="text-zinc-500">Generation</span><span className="text-blue-400 font-bold">GEN-{hudState.generation}</span></div>
              {hudState.ai.memory.pastDeaths.length > 0 && (
                <div className="border-t border-zinc-800 pt-4">
                  <p className="text-zinc-500 text-sm mb-3 uppercase tracking-wider font-bold">Death Memory ({hudState.ai.memory.pastDeaths.length}/6)</p>
                  <div className="space-y-1">
                    {hudState.ai.memory.pastDeaths.map((d, i) => (
                      <div key={i} className="text-xs text-zinc-400 bg-zinc-950/80 px-3 py-1 rounded-lg flex items-center gap-2">
                        <span className="text-red-500">#{i + 1}</span> {d}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {hudState.gameMode === 'evolution' ? (
              <button onClick={evolveAndRespawn} className="w-full py-5 mt-8 bg-blue-600/20 text-blue-400 font-bold text-lg uppercase tracking-widest hover:bg-blue-600/40 rounded-xl border border-blue-500/50 flex items-center justify-center gap-3 transition-all"><RefreshCcw size={24}/> Upload Trauma & Respawn (Gen {hudState.generation + 1})</button>
            ) : (
              <button onClick={() => window.location.reload()} className="w-full py-5 mt-8 bg-zinc-800 text-white font-bold text-lg uppercase tracking-widest hover:bg-zinc-700 rounded-xl border border-zinc-700 flex items-center justify-center gap-3 transition-all"><Skull size={24}/> Hard Reset</button>
            )}
          </div>
        </div>
      )}

      {hudState.isAlive && (
        <>
          <div className="absolute top-6 right-6 flex flex-col items-end gap-2 z-20 pointer-events-none">
            <div className="bg-black/70 backdrop-blur-md px-6 py-3 rounded-full border border-zinc-800 shadow-2xl flex items-center gap-4">
              <Brain className={`${hudState.ai.llmThinking ? 'text-purple-400 animate-pulse' : hudState.ai.consecutiveFailures > 0 ? 'text-yellow-400' : 'text-blue-400'}`} size={24}/>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">
                  Subject-01 Gen-{hudState.generation} {hudState.ai.llmThinking ? '(Thinking...)' : hudState.ai.consecutiveFailures > 0 ? '(Offline)' : ''}
                </span>
                <span className={`text-sm font-black uppercase tracking-wider ${hudState.ai.panic ? 'text-red-500 animate-pulse' : hudState.ai.sneaking ? 'text-yellow-400' : 'text-white'}`}>
                  {hudState.ai.panic ? 'FULL PANIC' : hudState.ai.sneaking ? 'SNEAKING' : hudState.ai.state.replace('_', ' ')}
                </span>
              </div>
            </div>
            <div className="bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full border border-zinc-800/50 text-xs text-zinc-300 italic shadow-lg max-w-xs text-right">
              "{hudState.ai.message}"
            </div>
            {hudState.gameMode === 'evolution' && hudState.ai.memory.pastDeaths.length > 0 && (
              <button
                onClick={() => setShowMemoryLog(v => !v)}
                className="pointer-events-auto bg-purple-950/70 backdrop-blur-sm px-3 py-1.5 rounded-full border border-purple-800/50 text-xs text-purple-300 flex items-center gap-2 hover:bg-purple-900/70 transition-colors"
              >
                <Eye size={12}/> {hudState.ai.memory.pastDeaths.length} death memories loaded
              </button>
            )}
            {showMemoryLog && hudState.ai.memory.pastDeaths.length > 0 && (
              <div className="pointer-events-auto bg-black/90 backdrop-blur-md p-4 rounded-xl border border-purple-800/40 shadow-2xl w-80 space-y-2">
                <p className="text-[10px] font-bold text-purple-400 tracking-widest uppercase mb-2 flex items-center gap-2"><Brain size={12}/> Neural Memory Log</p>
                {hudState.ai.memory.pastDeaths.map((d, i) => (
                  <div key={i} className="text-xs text-zinc-300 bg-zinc-900/80 px-3 py-1.5 rounded-lg flex items-start gap-2">
                    <span className="text-red-400 font-bold shrink-0">#{i + 1}</span>
                    <span>{d}</span>
                  </div>
                ))}
                {survivalLessons.length > 0 && (
                  <div className="border-t border-purple-900/40 pt-2 mt-2">
                    <p className="text-[9px] text-purple-400 uppercase tracking-widest mb-1">Behavior Adaptations</p>
                    {survivalLessons.slice(0, 3).map((l, i) => (
                      <div key={i} className="text-[10px] text-emerald-400 bg-emerald-950/30 px-2 py-1 rounded mb-1">{l.slice(0, 80)}...</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="absolute top-6 left-6 flex flex-col gap-3 z-20 pointer-events-auto max-h-[90vh]">
            <div className="bg-black/70 backdrop-blur-md px-5 py-3 rounded-2xl border border-zinc-800 shadow-2xl flex items-center gap-4 mb-2">
              <div className="flex flex-col border-r border-zinc-700 pr-4">
                <span className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Generation</span>
                <span className="text-sm font-black text-blue-400">GEN-{hudState.generation}</span>
              </div>
              <div className="flex flex-col border-r border-zinc-700 pr-4">
                <span className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Day {hudState.day}</span>
                <span className="text-sm font-black text-white flex items-center gap-2">{hudState.time < 6 || hudState.time > 18 ? <Moon size={14} className="text-blue-300"/> : <Sun size={14} className="text-yellow-400"/>} {formatTime(hudState.time)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Evo Level</span>
                <span className="text-sm font-black text-emerald-400 flex items-center gap-1"><TrendingUp size={12}/> {hudState.ai.memory.evolutionLevel}</span>
              </div>
            </div>

            <div className="bg-black/80 backdrop-blur-md p-4 rounded-2xl border border-zinc-800 shadow-2xl w-72 flex flex-col gap-3 flex-1 overflow-y-auto custom-scrollbar">
              <div className="text-[10px] font-bold text-emerald-400 tracking-widest uppercase flex items-center gap-2 border-b border-zinc-800 pb-2"><ListTodo size={14}/> Challenge Master</div>
             
              {CHALLENGE_DB.map((cat, idx) => (
                <div key={idx} className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-2">{cat.category}</span>
                  {cat.tasks.map((task, tIdx) => (
                    <button
                      key={tIdx}
                      onClick={() => assignAdvancedChallenge(task)}
                      disabled={hudState.activeChallenge !== null}
                      className="bg-zinc-900/50 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed border border-zinc-800 p-2 rounded-lg text-left transition-colors flex justify-between items-center group"
                    >
                      <span className="text-xs font-bold text-zinc-300 group-hover:text-white transition-colors">{task.name}</span>
                      <span className="text-[9px] text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded">{task.timeLimit}s</span>
                    </button>
                  ))}
                </div>
              ))}

              <div className="border-t border-zinc-800 pt-3 mt-2">
                <div className="text-[10px] font-bold text-red-400 tracking-widest uppercase flex items-center gap-2 mb-2"><ShieldAlert size={14}/> God Controls</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {['Flash Flood', 'Storm Collapse', 'Thick Fog', 'Heatwave', 'Night Freeze'].map(ev => (
                    <button key={ev} onClick={() => toggleEvent(ev)} className={`text-[10px] font-bold px-2 py-1.5 rounded border transition-colors ${hudState.activeEvents.includes(ev) ? 'bg-red-900/60 border-red-700 text-red-300' : 'bg-zinc-900/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800'}`}>
                      {ev}
                    </button>
                  ))}
                  <button onClick={() => toggleEvent('Clear')} className="text-[10px] font-bold px-2 py-1.5 rounded border bg-zinc-800 border-zinc-600 text-zinc-300 hover:bg-zinc-700 transition-colors">Clear All</button>
                </div>
                <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                  <button onClick={godAmbush} className="text-[10px] font-bold px-2 py-1.5 rounded border bg-red-950/50 border-red-800 text-red-400 hover:bg-red-900/50 transition-colors">Ambush!</button>
                  <button onClick={godSmite} className="text-[10px] font-bold px-2 py-1.5 rounded border bg-yellow-950/50 border-yellow-800 text-yellow-400 hover:bg-yellow-900/50 transition-colors">Smite</button>
                  <button onClick={godStarve} className="text-[10px] font-bold px-2 py-1.5 rounded border bg-orange-950/50 border-orange-800 text-orange-400 hover:bg-orange-900/50 transition-colors">Starve</button>
                  <button onClick={godBless} className="text-[10px] font-bold px-2 py-1.5 rounded border bg-emerald-950/50 border-emerald-800 text-emerald-400 hover:bg-emerald-900/50 transition-colors">Bless</button>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-6 left-[320px] flex gap-3 z-20 pointer-events-none">
            <CircularStat icon={Heart} value={hudState.health} color="#ef4444" warn={hudState.health < 30} />
            <CircularStat icon={Apple} value={hudState.hunger} color="#f97316" warn={hudState.hunger < 30} />
            <CircularStat icon={Droplets} value={hudState.thirst} color="#3b82f6" warn={hudState.thirst < 30} />
            <CircularStat icon={Zap} value={hudState.stamina} color="#eab308" warn={hudState.stamina < 20} />
            <div className="ml-4 flex items-center justify-center">
              <CircularStat icon={Ghost} value={hudState.ai.fear} color="#a855f7" warn={hudState.ai.fear > 80} />
            </div>
          </div>

          <div className="absolute bottom-6 right-6 flex gap-2 z-20 pointer-events-none">
            <HotbarSlot icon={Axe} count={hudState.wood} label="WOOD" active={hudState.wood > 0} />
            <HotbarSlot icon={CloudRain} count={hudState.stone} label="STONE" active={hudState.stone > 0} />
            <HotbarSlot icon={Apple} count={hudState.food} label="FOOD" active={hudState.food > 0} />
            <div className="w-1 h-14 bg-zinc-800 rounded-full mx-1"></div>
            <HotbarSlot icon={Sword} label="SPEAR" active={hudState.ai.inventory.spear} />
            <HotbarSlot icon={Crosshair} label="BOW" active={hudState.ai.inventory.bow} />
            <HotbarSlot icon={Fish} label="ROD" active={hudState.ai.inventory.fishingRod} />
            <HotbarSlot icon={Navigation} label="BOAT" active={hudState.ai.inventory.boat} />
          </div>
         
          {hudState.activeChallenge && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md border border-emerald-500/50 px-6 py-4 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.2)] flex flex-col items-center z-10 pointer-events-none w-[420px] animate-in slide-in-from-top">
              <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2 mb-1"><Trophy size={14}/> Active Challenge</div>
              <div className="text-lg font-black text-white text-center tracking-wide mb-1">{hudState.activeChallenge.name}</div>
              {hudState.activeChallenge.progress && (
                <div className="text-xs text-zinc-400 mb-2 font-mono">{hudState.activeChallenge.progress}</div>
              )}
              <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all"
                  style={{ width: `${(hudState.activeChallenge.timeLimit / hudState.activeChallenge.maxTime) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </>
      )}

      {hudState.logs.length > 0 && hudState.logs[0].time && (Date.now() - hudState.logs[0].time < 4000) && (
        <div className="absolute top-[25%] left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-in fade-in zoom-in duration-300">
          <div className={`px-8 py-4 rounded-2xl border shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-xl text-lg font-black tracking-widest uppercase flex items-center gap-3 ${
            hudState.logs[0].type === 'danger' ? 'bg-red-950/90 border-red-500/50 text-red-400' :
            hudState.logs[0].type === 'success' ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-400' :
            hudState.logs[0].type === 'warning' ? 'bg-yellow-950/90 border-yellow-500/50 text-yellow-400' :
            'bg-black/90 border-zinc-700 text-zinc-300'
          }`}>
            {hudState.logs[0].message}
          </div>
        </div>
      )}
    </div>
  );
}
