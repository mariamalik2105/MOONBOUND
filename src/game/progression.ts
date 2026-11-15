/**
 * MOONBOUND progression: one place that decides what counts as done.
 *
 * - Objectives are checked against the real game state (buildings, counters,
 *   flags), never against "the player clicked Continue".
 * - Rewards are paid exactly once per phase (`rewardsClaimed`).
 * - The final phase ends the campaign (`campaignComplete`) instead of
 *   repeating, so its reward cannot be collected twice.
 * - `getMissionGuide` turns the state into one short next step, a target
 *   for the on-screen marker, and hints.
 *
 * Everything here is pure (no React, no canvas), so it is unit tested.
 */

import type { GameSaveData, MissionRecordsData } from './saveSystem';
import type { PhaseDefinition } from './phases';
import type { PlacedBuilding } from './simulation';
import { BUILDING_RECIPES, canAffordBuilding, deductBuildingCost } from './economy';
import {
  CRATE_CONTENTS,
  LADDER,
  NODE_DEFS,
  RESOURCE_LABEL,
  RESOURCE_NAMES,
  SUNNY_RIDGE,
  COLD_TRAP,
} from './world';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface WorldSnapshot {
  px: number;
  py: number;
  inRover: boolean;
  rx: number;
  ry: number;
  rh: number;
}

export interface ProgressState {
  /** Surface intro: 0 walk off the lander, 1 open the crate, 2 finished. */
  tutorialStep: number;
  flags: Record<string, boolean>;
  counters: Record<string, number>;
  /** Every scan, tagged with the phase it happened in (each rock counts once per phase). */
  scanLog: { id: string; phase: number }[];
  /** Building types the player has set up by hand (oxygen line, recycler, lab, antenna). */
  activated: Record<string, boolean>;
  rewardsClaimed: string[];
  badges: string[];
  campaignComplete: boolean;
  /** Seconds of real play in the current phase (paused time and menus do not count). */
  phaseActiveSeconds: number;
  totalActiveSeconds: number;
  /** Remaining uses per resource deposit. */
  nodeUses: Record<string, number>;
  scannedNodeIds: string[];
  /** Science notes already shown, so each one appears once. */
  seenNotes: string[];
  world?: WorldSnapshot;
}

export function createProgressState(): ProgressState {
  return {
    tutorialStep: 0,
    flags: {},
    counters: {},
    scanLog: [],
    activated: {},
    rewardsClaimed: [],
    badges: [],
    campaignComplete: false,
    phaseActiveSeconds: 0,
    totalActiveSeconds: 0,
    nodeUses: {},
    scannedNodeIds: [],
    seenNotes: [],
  };
}

export const SURFACE_START = 5;
export const ICE_GOAL = 3;
export const SCAN_GOAL = 3;
export const SUSTAIN_GOAL = 20;
export const SUNNY_ENOUGH = 0.6;
export const GREENHOUSE_READY = 100;

/** Buildings that need a hands-on setup step before they work. */
export const SETUP_RECIPES: Record<string, { action: string; done: string }> = {
  oxygen_generator: { action: 'Connect the oxygen line', done: 'Oxygen is flowing into the habitat.' },
  water_recycler: { action: 'Set up the recycler', done: 'The recycler is cleaning water.' },
  research_lab: { action: 'Run an analysis', done: 'The lab is running experiments.' },
  communication_tower: { action: 'Aim the dish at Earth', done: 'The dish is locked on Earth.' },
};

/** One-time bonus the first time each building type is set up. */
export const SETUP_BONUS: Record<string, Record<string, number>> = {
  research_lab: { researchData: 6, metalOre: 2 },
  communication_tower: { researchData: 4 },
};

export interface MissionBadge {
  name: string;
  worldChange: string;
}

export const MISSION_BADGES: Record<string, MissionBadge> = {
  mission_prep: { name: 'Crew Ready', worldChange: 'Your specialist stripe is on your suit.' },
  orbit: { name: 'Orbit Reached', worldChange: 'The ship is on its way to the Moon.' },
  outbound_journey: { name: 'Star Navigator', worldChange: 'The Moon fills the window.' },
  navigation: { name: 'Site Scout', worldChange: 'Landing site locked in.' },
  braking_and_landing: { name: 'Soft Landing', worldChange: 'Your lander stands on the Moon.' },
  outpost: {
    name: 'Base Builder',
    worldChange: 'The habitat light is on, a lit path leads home, and the rover is unpacked.',
  },
  uncover: { name: 'Ice Finder', worldChange: 'An ice sample case now stands by the habitat.' },
  network: { name: 'Base Connected', worldChange: 'Pipes link your buildings and the dish tracks Earth.' },
  development: { name: 'Moon Home', worldChange: 'Lights ring the habitat and a crew plaque marks your base.' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function has(save: GameSaveData, recipeId: string, pred?: (b: PlacedBuilding) => boolean) {
  return save.simulation.buildings.some((b) => b.recipeId === recipeId && (!pred || pred(b)));
}

function count(save: GameSaveData, key: string) {
  return save.progress.counters[key] || 0;
}

export function scansInPhase(save: GameSaveData, phase: number): number {
  return new Set(save.progress.scanLog.filter((s) => s.phase === phase).map((s) => s.id)).size;
}

export function isSetUp(save: GameSaveData, recipeId: string) {
  return Boolean(save.progress.activated[recipeId]) && has(save, recipeId);
}

function sunnyPanel(b: PlacedBuilding) {
  return (b.sunFactor ?? 1) >= SUNNY_ENOUGH;
}

/** The exact success condition for each objective. */
export function objectiveDone(save: GameSaveData, objectiveId: string): boolean {
  const p = save.progress;
  switch (objectiveId) {
    // Flight phases: set by the hands-on flight tasks
    case 'select_crew':
    case 'inspect_manifest':
    case 'ready_launch':
    case 'solar_array_deploy':
    case 'orbital_burn':
    case 'star_nav':
    case 'radiation_check':
    case 'site_survey':
    case 'select_target':
    case 'terminal_guidance':
    case 'engine_shutdown':
      return Boolean(p.flags[`flight:${objectiveId}`]);
    // Outpost
    case 'build_habitat':
      return has(save, 'habitat');
    case 'build_power':
      return has(save, 'solar_panel', sunnyPanel) && has(save, 'battery');
    case 'activate_o2':
      return isSetUp(save, 'oxygen_generator');
    // Uncover
    case 'board_rover':
      return Boolean(p.flags.boardedRover);
    case 'scan_crater':
      return scansInPhase(save, 6) >= SCAN_GOAL;
    case 'discover_ice':
      return count(save, 'iceSamples') >= ICE_GOAL;
    // Network
    case 'build_recycler':
      return isSetUp(save, 'water_recycler');
    case 'build_lab':
      return isSetUp(save, 'research_lab');
    case 'build_comm':
      return isSetUp(save, 'communication_tower');
    // Development
    case 'greenhouse_crop':
      return count(save, 'harvests') >= 1;
    case 'dust_maintenance':
      return count(save, 'dust@8') >= 1;
    case 'sustainability_check':
      return count(save, 'sustainBest') >= SUSTAIN_GOAL;
    default:
      return false;
  }
}

export function currentPhase(save: GameSaveData): PhaseDefinition {
  return save.phases[save.currentPhaseIndex] || save.phases[0];
}

export function isPhaseReady(save: GameSaveData): boolean {
  if (save.progress.campaignComplete) return false;
  if (save.currentPhaseIndex === SURFACE_START && save.progress.tutorialStep < 2) return false;
  return currentPhase(save).objectives.every((o) => o.completed);
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type GameEvent =
  | { type: 'flight'; objective: string }
  | { type: 'selectAvatar'; avatarId: string }
  | { type: 'walkedOffLander' }
  | { type: 'skipTutorial' }
  | { type: 'replayTutorial' }
  | { type: 'collect'; nodeId: string; nodeType: string; amount: number; usesLeft: number }
  | { type: 'supplyDrop'; contents: Record<string, number> }
  | { type: 'scan'; nodeIds: string[] }
  | { type: 'build'; recipeId: string; x: number; y: number; sunFactor: number; instanceId: string }
  | { type: 'activate'; recipeId: string }
  | { type: 'boardRover' }
  | { type: 'cleanDust'; instanceId: string }
  | { type: 'harvest'; instanceId: string }
  | { type: 'sustain'; seconds: number }
  /** Coins from a mini-game or chore. With a `key`, it pays only once ever. */
  | { type: 'bonus'; dollars: number; key?: string; reason?: string }
  /** Watering speeds the greenhouse up */
  | { type: 'water'; instanceId: string }
  /** Fixing the power line tops up the battery */
  | { type: 'boostPower'; fraction: number }
  | { type: 'activeTime'; seconds: number };

export type GameEffect =
  | { kind: 'toast'; text: string }
  | { kind: 'error'; text: string }
  | { kind: 'objective'; text: string }
  | { kind: 'missionReady' }
  | { kind: 'tutorial'; step: number }
  | { kind: 'coins'; amount: number; reason?: string };

export interface EventResult {
  save: GameSaveData;
  effects: GameEffect[];
}

function cloneForUpdate(save: GameSaveData): GameSaveData {
  return {
    ...save,
    inventory: { ...save.inventory },
    phases: save.phases,
    simulation: { ...save.simulation, buildings: save.simulation.buildings.map((b) => ({ ...b })) },
    progress: {
      ...save.progress,
      flags: { ...save.progress.flags },
      counters: { ...save.progress.counters },
      scanLog: [...save.progress.scanLog],
      activated: { ...save.progress.activated },
      rewardsClaimed: [...save.progress.rewardsClaimed],
      badges: [...save.progress.badges],
      nodeUses: { ...save.progress.nodeUses },
      scannedNodeIds: [...save.progress.scannedNodeIds],
      seenNotes: [...save.progress.seenNotes],
    },
    records: save.records ? { ...save.records } : save.records,
  };
}

function addRecords(save: GameSaveData, patch: Partial<Record<keyof MissionRecordsData, number>>) {
  if (!save.records) return;
  const r = save.records as unknown as Record<string, number>;
  for (const [k, v] of Object.entries(patch)) r[k] = (r[k] || 0) + (v || 0);
}

function describeBundle(bundle: Record<string, number>) {
  return Object.entries(bundle)
    .map(([k, v]) => `+${v} ${RESOURCE_LABEL[k]?.toLowerCase() || k}`)
    .join(', ');
}

/** "Not enough metal. Find 2 more pieces." */
export function missingMaterialsMessage(save: GameSaveData, recipeId: string): string | null {
  const check = canAffordBuilding(save.inventory, save.spaceDollars, recipeId, save.avatarId);
  if (check.canAfford) return null;
  const miss = missingFor(save, recipeId);
  if (miss.length > 0) {
    const m = miss[0];
    const names = RESOURCE_NAMES[m.resource] || { one: m.resource, many: m.resource };
    const short = m.need - m.have;
    const label = RESOURCE_LABEL[m.resource]?.toLowerCase() || m.resource;
    return `Not enough ${label}. Find ${short} more ${short === 1 ? names.one : names.many}.`;
  }
  if (check.missingCurrency > 0) return `Not enough SpaceDollars. You need S✦${check.missingCurrency} more.`;
  return 'You cannot build that yet.';
}

/** Missing materials for a recipe, using the same specialist discount as the build cost. */
export function missingFor(save: GameSaveData, recipeId: string) {
  const recipe = BUILDING_RECIPES[recipeId];
  if (!recipe) return [];
  const out: { resource: string; have: number; need: number }[] = [];
  for (const [res, raw] of Object.entries(recipe.materials)) {
    const need = save.avatarId === 'engineer' && (raw || 0) > 1 ? Math.max(1, Math.floor((raw || 0) * 0.9)) : raw || 0;
    const have = save.inventory[res] || 0;
    if (have < need) out.push({ resource: res, have, need });
  }
  return out;
}

/**
 * Applies one gameplay event and re-checks objectives. Returns the new save
 * plus effects for the UI (toasts, check marks). No side effects here.
 */
export function applyGameEvent(prev: GameSaveData, ev: GameEvent): EventResult {
  const save = cloneForUpdate(prev);
  const p = save.progress;
  const phase = save.currentPhaseIndex;
  const effects: GameEffect[] = [];

  switch (ev.type) {
    case 'flight': {
      p.flags[`flight:${ev.objective}`] = true;
      break;
    }
    case 'selectAvatar': {
      if (phase === 0) {
        // The first specialist is free: pick any of them before launch.
        save.avatarId = ev.avatarId;
        if (!save.unlockedAvatars.includes(ev.avatarId)) save.unlockedAvatars = [...save.unlockedAvatars, ev.avatarId];
        p.flags['flight:select_crew'] = true;
      } else if (save.unlockedAvatars.includes(ev.avatarId)) {
        save.avatarId = ev.avatarId;
      }
      break;
    }
    case 'walkedOffLander': {
      if (phase >= SURFACE_START && p.tutorialStep === 0) {
        p.tutorialStep = 1;
        effects.push({ kind: 'tutorial', step: 1 });
      }
      break;
    }
    case 'skipTutorial': {
      if (p.tutorialStep < 2) {
        if ((p.nodeUses['crate-1'] ?? 1) > 0) {
          for (const [k, v] of Object.entries(CRATE_CONTENTS)) save.inventory[k] = (save.inventory[k] || 0) + v;
          p.nodeUses['crate-1'] = 0;
        }
        p.tutorialStep = 2;
        effects.push({ kind: 'toast', text: 'Tutorial skipped. Supplies added to your backpack.' });
      }
      break;
    }
    case 'replayTutorial': {
      if (phase >= SURFACE_START) {
        p.tutorialStep = 0;
        p.flags.tutorialReplay = true;
        effects.push({ kind: 'tutorial', step: 0 });
      }
      break;
    }
    case 'collect': {
      if (ev.nodeId !== 'crate-practice') p.nodeUses[ev.nodeId] = ev.usesLeft;
      let bundle: Record<string, number> = {};
      if (ev.nodeId === 'crate-practice') bundle = {};
      else if (ev.nodeType === 'crate') bundle = { ...CRATE_CONTENTS };
      else if (ev.nodeType === 'tech_wreck') bundle = { researchData: 3 };
      else bundle = { [ev.nodeType]: ev.amount };
      for (const [k, v] of Object.entries(bundle)) save.inventory[k] = (save.inventory[k] || 0) + v;
      addRecords(save, { totalResourcesHarvested: Object.values(bundle).reduce((a, b) => a + b, 0) });

      if (ev.nodeType === 'waterIce' && phase >= 6) {
        p.counters.iceSamples = Math.min(99, (p.counters.iceSamples || 0) + 1);
      }
      if ((ev.nodeId === 'crate-1' || ev.nodeId === 'crate-practice') && p.tutorialStep < 2) {
        p.tutorialStep = 2;
        delete p.flags.tutorialReplay;
        effects.push({ kind: 'tutorial', step: 2 });
        effects.push({
          kind: 'toast',
          text: ev.nodeId === 'crate-practice' ? 'Intro finished. You know the basics!' : `Supplies unpacked: ${describeBundle(bundle)}`,
        });
      } else if (ev.nodeType !== 'crate' && Object.keys(bundle).length > 0) {
        effects.push({ kind: 'toast', text: describeBundle(bundle) });
      }
      break;
    }
    case 'supplyDrop': {
      for (const [k, v] of Object.entries(ev.contents)) save.inventory[k] = (save.inventory[k] || 0) + v;
      effects.push({ kind: 'toast', text: `Cargo from Earth: ${describeBundle(ev.contents)}` });
      break;
    }
    case 'scan': {
      for (const id of ev.nodeIds) {
        if (!p.scannedNodeIds.includes(id)) p.scannedNodeIds.push(id);
        if (!p.scanLog.some((s) => s.id === id && s.phase === phase)) p.scanLog.push({ id, phase });
      }
      if (ev.nodeIds.length > 0) addRecords(save, { totalDiscoveriesScanned: ev.nodeIds.length });
      break;
    }
    case 'build': {
      const recipe = BUILDING_RECIPES[ev.recipeId];
      if (!recipe || !save.unlockedBlueprints.includes(ev.recipeId)) {
        effects.push({ kind: 'error', text: 'That blueprint is still locked.' });
        return { save: prev, effects };
      }
      const missing = missingMaterialsMessage(save, ev.recipeId);
      if (missing) {
        effects.push({ kind: 'error', text: missing });
        return { save: prev, effects };
      }
      const paid = deductBuildingCost(save.inventory, save.spaceDollars, ev.recipeId, save.avatarId);
      save.inventory = paid.updatedInventory;
      save.spaceDollars = paid.updatedSpaceDollars;
      const needsSetup = Boolean(SETUP_RECIPES[ev.recipeId]) && !p.activated[ev.recipeId];
      save.simulation.buildings.push({
        instanceId: ev.instanceId,
        recipeId: ev.recipeId,
        x: ev.x,
        y: ev.y,
        status: 'active',
        health: 100,
        dustAccumulation: 0,
        sunFactor: ev.recipeId === 'solar_panel' ? ev.sunFactor : undefined,
        online: needsSetup ? false : undefined,
        growth: ev.recipeId === 'greenhouse' ? 0 : undefined,
      });
      addRecords(save, { totalStructuresFabricated: 1 });
      if (ev.recipeId === 'solar_panel' && ev.sunFactor < SUNNY_ENOUGH) {
        effects.push({
          kind: 'toast',
          text: `This spot is shady, so the panel makes only ${Math.round(ev.sunFactor * 100)}% power. The ridge to the north gets more sun.`,
        });
      } else if (needsSetup) {
        effects.push({ kind: 'toast', text: `${recipe.name} built. Walk to it and press E: ${SETUP_RECIPES[ev.recipeId].action.toLowerCase()}.` });
      } else {
        effects.push({ kind: 'toast', text: `${recipe.name} built.` });
      }
      break;
    }
    case 'activate': {
      if (!p.activated[ev.recipeId]) {
        p.activated[ev.recipeId] = true;
        const bonus = SETUP_BONUS[ev.recipeId];
        if (bonus) for (const [k, v] of Object.entries(bonus)) save.inventory[k] = (save.inventory[k] || 0) + v;
        effects.push({
          kind: 'toast',
          text: `${SETUP_RECIPES[ev.recipeId]?.done || 'Switched on.'}${bonus ? ` ${describeBundle(bonus)}` : ''}`,
        });
      }
      save.simulation.buildings = save.simulation.buildings.map((b) =>
        b.recipeId === ev.recipeId ? { ...b, online: undefined } : b
      );
      break;
    }
    case 'boardRover': {
      if (phase >= 6) p.flags.boardedRover = true;
      break;
    }
    case 'cleanDust': {
      save.simulation.buildings = save.simulation.buildings.map((b) =>
        b.instanceId === ev.instanceId ? { ...b, dustAccumulation: 0, status: 'active' } : b
      );
      p.counters[`dust@${phase}`] = (p.counters[`dust@${phase}`] || 0) + 1;
      break;
    }
    case 'harvest': {
      const gh = save.simulation.buildings.find((b) => b.instanceId === ev.instanceId);
      if (!gh || (gh.growth || 0) < GREENHOUSE_READY) {
        effects.push({ kind: 'error', text: 'The plants are still growing.' });
        return { save: prev, effects };
      }
      gh.growth = 0;
      p.counters.harvests = (p.counters.harvests || 0) + 1;
      const res = save.simulation.resources;
      save.simulation = {
        ...save.simulation,
        resources: { ...res, food: Math.min(res.maxFood, res.food + 2) },
      };
      effects.push({ kind: 'toast', text: 'Harvested fresh greens: +2 kg food.' });
      break;
    }
    case 'bonus': {
      const dollars = Math.max(0, Math.round(ev.dollars));
      if (ev.key) {
        if (p.flags[`bonus:${ev.key}`]) return { save: prev, effects };
        p.flags[`bonus:${ev.key}`] = true;
      }
      if (dollars === 0) break;
      save.spaceDollars += dollars;
      addRecords(save, { totalSpaceDollarsEarned: dollars });
      p.counters.chores = (p.counters.chores || 0) + 1;
      effects.push({ kind: 'coins', amount: dollars, reason: ev.reason });
      break;
    }
    case 'water': {
      const gh = save.simulation.buildings.find((b) => b.instanceId === ev.instanceId);
      if (!gh) return { save: prev, effects };
      gh.growth = Math.min(GREENHOUSE_READY, (gh.growth || 0) + 25);
      break;
    }
    case 'boostPower': {
      const res = save.simulation.resources;
      save.simulation = {
        ...save.simulation,
        resources: { ...res, powerStored: Math.max(0, Math.min(res.powerCapacity, res.powerStored + res.powerCapacity * ev.fraction)) },
      };
      break;
    }
    case 'sustain': {
      if (phase === 8) p.counters.sustainBest = Math.max(p.counters.sustainBest || 0, Math.floor(ev.seconds));
      break;
    }
    case 'activeTime': {
      p.phaseActiveSeconds += ev.seconds;
      p.totalActiveSeconds += ev.seconds;
      break;
    }
  }

  const synced = syncObjectives(save);
  return { save: synced.save, effects: [...effects, ...synced.effects] };
}

/** Marks objectives done when their condition is met. Objectives never un-complete. */
export function syncObjectives(save: GameSaveData): EventResult {
  const effects: GameEffect[] = [];
  const idx = save.currentPhaseIndex;
  const phase = save.phases[idx];
  if (!phase) return { save, effects };
  let changed = false;
  const objectives = phase.objectives.map((o) => {
    if (!o.completed && objectiveDone(save, o.id)) {
      changed = true;
      effects.push({ kind: 'objective', text: o.text });
      return { ...o, completed: true };
    }
    return o;
  });
  if (!changed) return { save, effects };
  const phases = save.phases.map((ph, i) => (i === idx ? { ...ph, objectives } : ph));
  const next = { ...save, phases };
  if (isPhaseReady(next)) effects.push({ kind: 'missionReady' });
  return { save: next, effects };
}

// ---------------------------------------------------------------------------
// Completing, restarting
// ---------------------------------------------------------------------------

export interface PhaseReward {
  phaseId: string;
  phaseName: string;
  letter: string;
  dollars: number;
  badge: MissionBadge;
  blueprints: string[];
  campaignComplete: boolean;
  seconds: number;
  alreadyClaimed: boolean;
}

export function completeCurrentPhase(prev: GameSaveData): { ok: boolean; reason?: string; save: GameSaveData; reward?: PhaseReward } {
  if (prev.progress.campaignComplete) return { ok: false, reason: 'The campaign is already complete.', save: prev };
  const synced = syncObjectives(prev).save;
  if (!isPhaseReady(synced)) return { ok: false, reason: 'Finish every step of this mission first.', save: prev };

  const save = cloneForUpdate(synced);
  const p = save.progress;
  const idx = save.currentPhaseIndex;
  const phase = save.phases[idx];
  const alreadyClaimed = p.rewardsClaimed.includes(phase.id);
  const dollars = alreadyClaimed ? 0 : phase.rewardSpaceDollars;
  const seconds = Math.max(1, Math.round(p.phaseActiveSeconds));

  if (!alreadyClaimed) {
    p.rewardsClaimed.push(phase.id);
    if (!p.badges.includes(phase.id)) p.badges.push(phase.id);
    save.spaceDollars += dollars;
    save.unlockedBlueprints = Array.from(new Set([...save.unlockedBlueprints, ...phase.unlockedBlueprints]));
  }

  if (save.records) {
    const rec = save.records;
    const best = rec.phaseCompletionTimes?.[idx];
    rec.phaseCompletionTimes = { ...rec.phaseCompletionTimes, [idx]: best ? Math.min(best, seconds) : seconds };
    rec.phaseLeaderboard = (rec.phaseLeaderboard || []).map((e, i) =>
      i === idx
        ? { ...e, bestTimeSeconds: e.bestTimeSeconds ? Math.min(e.bestTimeSeconds, seconds) : seconds, completedAt: Date.now() }
        : e
    );
    rec.totalSpaceDollarsEarned = (rec.totalSpaceDollarsEarned || 0) + dollars;
  }

  const isLast = idx >= save.phases.length - 1;
  if (isLast) {
    p.campaignComplete = true;
  } else {
    save.currentPhaseIndex = idx + 1;
    p.phaseActiveSeconds = 0;
    onPhaseStart(save, idx + 1);
  }

  return {
    ok: true,
    save,
    reward: {
      phaseId: phase.id,
      phaseName: phase.name,
      letter: phase.letter,
      dollars,
      badge: MISSION_BADGES[phase.id] || { name: phase.name, worldChange: '' },
      blueprints: alreadyClaimed ? [] : phase.unlockedBlueprints.filter((b) => !prev.unlockedBlueprints.includes(b)),
      campaignComplete: isLast,
      seconds,
      alreadyClaimed,
    },
  };
}

/** World changes that happen when a phase begins. */
function onPhaseStart(save: GameSaveData, idx: number) {
  const p = save.progress;
  if (idx === SURFACE_START && p.tutorialStep > 1) p.tutorialStep = 2;
  if (idx >= 6) p.flags.roverUnlocked = true;
  if (idx === 8) {
    // The rover kicked up dust on the way back: one panel needs cleaning.
    const panel = save.simulation.buildings.find((b) => b.recipeId === 'solar_panel');
    if (panel) {
      save.simulation = {
        ...save.simulation,
        buildings: save.simulation.buildings.map((b) =>
          b.instanceId === panel.instanceId ? { ...b, dustAccumulation: Math.max(b.dustAccumulation, 70) } : b
        ),
      };
    }
  }
}

/**
 * Restarts the current mission. Flight tasks and counters reset; buildings
 * you already placed stay built (they still count).
 */
export function restartCurrentPhase(prev: GameSaveData): GameSaveData {
  const save = cloneForUpdate(prev);
  const idx = save.currentPhaseIndex;
  const phase = save.phases[idx];
  const p = save.progress;
  for (const o of phase.objectives) delete p.flags[`flight:${o.id}`];
  p.scanLog = p.scanLog.filter((s) => s.phase !== idx);
  if (idx === 6) {
    p.counters.iceSamples = 0;
    delete p.flags.boardedRover;
  }
  if (idx === 8) {
    p.counters.sustainBest = 0;
    p.counters['dust@8'] = 0;
    p.counters.harvests = 0;
    onPhaseStart(save, 8);
  }
  if (idx === SURFACE_START && p.tutorialStep < 2) p.tutorialStep = 0;
  p.phaseActiveSeconds = 0;
  save.phases = save.phases.map((ph, i) =>
    i === idx ? { ...ph, objectives: ph.objectives.map((o) => ({ ...o, completed: false })) } : ph
  );
  return syncObjectives(save).save;
}

// ---------------------------------------------------------------------------
// Mission guide: the one next step shown on screen
// ---------------------------------------------------------------------------

export type TargetSpec =
  | { kind: 'point'; x: number; y: number; label: string; radius?: number }
  | { kind: 'node'; types: string[]; label: string; revealedOnly?: boolean; unscannedOnly?: boolean; ids?: string[] }
  | { kind: 'building'; recipeId: string; label: string; filter?: 'dusty' | 'setup' | 'ready' }
  | { kind: 'rover'; label: string };

export interface MissionStep {
  text: string;
  control?: string;
  progress?: string;
  target?: TargetSpec | null;
  hints: string[];
}

export interface MissionGuide {
  title: string;
  goal: string;
  letter: string;
  phaseIndex: number;
  steps: { text: string; done: boolean }[];
  current: MissionStep;
  ready: boolean;
  complete: boolean;
  science: string;
  rewardDollars: number;
}

export interface GuideContext {
  /** Astronaut position, used to pick sensible targets. */
  px?: number;
  py?: number;
  inRover?: boolean;
  /** Ids of ice deposits that have been revealed and still have uses. */
  revealedIceIds?: string[];
}

const SUGGESTED_SPOTS: Record<string, { x: number; y: number }> = {
  habitat: { x: 300, y: 372 },
  battery: { x: 300, y: 470 },
  oxygen_generator: { x: 560, y: 340 },
  water_recycler: { x: 190, y: 300 },
  research_lab: { x: 600, y: 470 },
  communication_tower: { x: 330, y: 120 },
  greenhouse: { x: 610, y: 260 },
};

function collectOrBuild(save: GameSaveData, recipeId: string, buildText: string): MissionStep {
  const recipe = BUILDING_RECIPES[recipeId];
  const missing = missingFor(save, recipeId);
  if (missing.length > 0) {
    const progress = missing.map((m) => `${RESOURCE_LABEL[m.resource] || m.resource} ${m.have}/${m.need}`).join(' · ');
    return {
      text: `Collect materials for the ${recipe.name.toLowerCase()}`,
      control: 'E · Collect',
      progress,
      target: { kind: 'node', types: missing.map((m) => m.resource), label: 'Collect' },
      hints: [
        'Glowing rocks on the ground give materials. Walk up and press E.',
        `You still need: ${missing.map((m) => `${m.need - m.have} ${RESOURCE_LABEL[m.resource]?.toLowerCase()}`).join(', ')}. Follow the marker.`,
      ],
    };
  }
  const spot = SUGGESTED_SPOTS[recipeId];
  return {
    text: buildText,
    control: 'B · Build',
    target: spot ? { kind: 'point', x: spot.x, y: spot.y, label: 'Good spot', radius: 34 } : null,
    hints: [
      `Press B, pick ${recipe.name}, then click the ground to place it.`,
      'A green outline means the spot is free. Press Esc to cancel placing.',
    ],
  };
}

function setupStep(recipeId: string, text: string, hints: string[]): MissionStep {
  return {
    text,
    control: 'E · Set up',
    target: { kind: 'building', recipeId, label: SETUP_RECIPES[recipeId]?.action || 'Set up', filter: 'setup' },
    hints,
  };
}

function stepFor(save: GameSaveData, objectiveId: string, ctx: GuideContext): MissionStep {
  switch (objectiveId) {
    case 'build_habitat':
      return collectOrBuild(save, 'habitat', 'Build a habitat next to the lander');
    case 'build_power': {
      if (!has(save, 'solar_panel', sunnyPanel)) {
        const step = collectOrBuild(save, 'solar_panel', 'Place a solar panel on the sunny ridge');
        if (step.control === 'B · Build') {
          step.target = { kind: 'point', x: SUNNY_RIDGE.x, y: SUNNY_RIDGE.y + 20, label: 'Sunny ridge', radius: 60 };
          step.hints = [
            'The Sun is low near the south pole. High ground to the north catches the most light.',
            'When placing, the outline shows how much sunlight that spot gets. Aim for 100%.',
          ];
        }
        return step;
      }
      return collectOrBuild(save, 'battery', 'Build a battery to store power for the night');
    }
    case 'activate_o2':
      if (!has(save, 'oxygen_generator')) return collectOrBuild(save, 'oxygen_generator', 'Build an oxygen generator');
      return setupStep('oxygen_generator', 'Press E at the oxygen generator to connect it', [
        'Walk next to the oxygen generator and press E. Wait for the ring to fill.',
        'The generator turns Moon minerals into air, but only once it is connected to the habitat.',
      ]);
    case 'board_rover':
      return {
        text: 'Walk to the rover and climb in',
        control: 'R · Drive',
        target: { kind: 'rover', label: 'Rover' },
        hints: ['The rover is parked next to the lander.', 'Stand next to it and press R. W/S drive, A/D steer.'],
      };
    case 'scan_crater': {
      const n = scansInPhase(save, 6);
      return {
        text: 'Scan rocks on the way south',
        control: 'F · Scan',
        progress: `Rocks scanned: ${n}/${SCAN_GOAL}`,
        target: { kind: 'node', types: ['regolith', 'metalOre', 'silicon', 'samples', 'titanium', 'tech_wreck'], label: 'Scan', unscannedOnly: true },
        hints: ['Stop near a rock and press F. The scanner checks everything close by.', 'Each rock only counts once. Follow the marker to one you have not scanned.'],
      };
    }
    case 'discover_ice': {
      const n = Math.min(ICE_GOAL, count(save, 'iceSamples'));
      const inCrater = ctx.py !== undefined && ctx.py > COLD_TRAP.y - COLD_TRAP.ry - 40;
      const revealed = ctx.revealedIceIds || [];
      if (!inCrater && revealed.length === 0) {
        return {
          text: 'Drive south into the shadowed crater',
          control: 'W A S D · Drive',
          progress: `Ice samples: ${n}/${ICE_GOAL}`,
          target: { kind: 'point', x: COLD_TRAP.x, y: COLD_TRAP.y - 60, label: 'Shadowed crater', radius: 80 },
          hints: ['The crater is straight south of the base.', 'Use the rover: it is much faster than walking.'],
        };
      }
      if (revealed.length === 0) {
        return {
          text: 'Scan for hidden ice',
          control: 'F · Scan',
          progress: `Ice samples: ${n}/${ICE_GOAL}`,
          target: { kind: 'point', x: COLD_TRAP.x, y: COLD_TRAP.y, label: 'Scan here', radius: 90 },
          hints: ['Ice in the dark is hard to see. Press F to scan.', 'Move around the crater floor and scan again.'],
        };
      }
      return {
        text: 'Collect ice samples',
        control: 'E · Collect ice',
        progress: `Ice samples: ${n}/${ICE_GOAL}`,
        target: { kind: 'node', types: ['waterIce'], label: 'Ice', revealedOnly: true },
        hints: ['Step out of the rover (R) if you need to, walk to the glint and press E.', 'Scan again (F) to reveal more ice nearby.'],
      };
    }
    case 'build_recycler':
      if (!has(save, 'water_recycler')) return collectOrBuild(save, 'water_recycler', 'Build a water recycler');
      return setupStep('water_recycler', 'Press E at the recycler and connect its parts', [
        'Walk to the recycler and press E.',
        'Dirty water goes through a filter first, then gets boiled clean, then is stored.',
      ]);
    case 'build_lab':
      if (!has(save, 'research_lab')) return collectOrBuild(save, 'research_lab', 'Build a research lab');
      return setupStep('research_lab', 'Press E at the lab to analyze two rocks', [
        'Walk to the lab and press E.',
        'Dark Moon rock formed from old lava. Compare the readings to see which holds more metal.',
      ]);
    case 'build_comm':
      if (!has(save, 'communication_tower')) return collectOrBuild(save, 'communication_tower', 'Build a radio tower');
      return setupStep('communication_tower', 'Press E at the tower and aim the dish at Earth', [
        'Walk to the tower and press E.',
        'From the south pole, Earth sits low on the horizon. Turn the dish slowly until the signal holds steady.',
      ]);
    case 'greenhouse_crop': {
      if (!has(save, 'greenhouse')) return collectOrBuild(save, 'greenhouse', 'Build a greenhouse');
      const gh = save.simulation.buildings.find((b) => b.recipeId === 'greenhouse' && (b.growth || 0) >= GREENHOUSE_READY);
      if (!gh) {
        const best = Math.max(0, ...save.simulation.buildings.filter((b) => b.recipeId === 'greenhouse').map((b) => b.growth || 0));
        const sim = save.simulation;
        const pausedWhy = sim.storm?.phase === 'active' && sim.storm.choice === 'shelter'
          ? 'the crew is sheltering from the storm'
          : (sim.modifiers?.greenhouseOff || 0) > 0
          ? 'the greenhouse was switched off to save power after the storm'
          : sim.powerSaverMode
          ? 'Power Saver is on (turn it off in the Lab menu, U)'
          : null;
        return {
          text: pausedWhy ? `Plants paused: ${pausedWhy}` : 'Wait for the plants to grow',
          progress: `Growing: ${Math.round(best)}%`,
          target: { kind: 'building', recipeId: 'greenhouse', label: 'Growing' },
          hints: ['Plants need power and light. Keep the base powered while they grow.', 'Meanwhile, clean the dusty panel or keep the base steady.'],
        };
      }
      return {
        text: 'Harvest the crop',
        control: 'E · Harvest',
        target: { kind: 'building', recipeId: 'greenhouse', label: 'Harvest', filter: 'ready' },
        hints: ['Walk to the greenhouse and press E.', 'The marker shows the ready greenhouse.'],
      };
    }
    case 'dust_maintenance':
      return {
        text: 'Brush the dust off the solar panel',
        control: 'E · Brush dust',
        target: { kind: 'building', recipeId: 'solar_panel', label: 'Dusty panel', filter: 'dusty' },
        hints: ['Dust blocks sunlight, so the panel makes less power.', 'Walk to the marked panel and press E.'],
      };
    case 'sustainability_check': {
      const best = Math.min(SUSTAIN_GOAL, count(save, 'sustainBest'));
      const r = save.simulation.resources;
      const issues: string[] = [];
      if (r.oxygen < 50) issues.push('oxygen is under 50%');
      if (r.water < 20) issues.push('water is under 20 L');
      if (r.powerStored <= 0 && r.powerGenCurrent < r.powerLoadCurrent) issues.push('power ran out');
      return {
        text: issues.length ? `Fix it: ${issues[0]}` : 'Keep the base steady',
        progress: `Steady: ${best}/${SUSTAIN_GOAL} s`,
        target: null,
        hints: [
          'Watch the oxygen, water and power gauges. They must all stay healthy at once.',
          'Low power? Open the Lab menu (U) and turn on Power Saver. Low water? A recycler helps.',
        ],
      };
    }
    default: {
      const ph = currentPhase(save);
      const o = ph.objectives.find((x) => x.id === objectiveId);
      return { text: o?.text || 'Keep going', hints: [o?.hint || ''] };
    }
  }
}

export function getMissionGuide(save: GameSaveData, ctx: GuideContext = {}): MissionGuide {
  const phase = currentPhase(save);
  const p = save.progress;
  const base = {
    title: phase.name,
    goal: phase.subTitle,
    letter: phase.letter,
    phaseIndex: save.currentPhaseIndex,
    science: phase.scienceLesson,
    rewardDollars: p.rewardsClaimed.includes(phase.id) ? 0 : phase.rewardSpaceDollars,
  };

  if (p.campaignComplete) {
    return {
      ...base,
      title: 'Free exploration',
      goal: 'Your base is finished. Keep building and exploring.',
      steps: [],
      current: { text: 'Explore, build and scan anything you like', hints: ['Press B to keep building. Your missions are all complete.'] },
      ready: false,
      complete: true,
      rewardDollars: 0,
    };
  }

  const inTutorial = save.currentPhaseIndex >= SURFACE_START && p.tutorialStep < 2;
  const tutorialSteps =
    save.currentPhaseIndex === SURFACE_START || inTutorial
      ? [
          { text: 'Step off the lander', done: p.tutorialStep > 0 },
          { text: 'Open the supply crate', done: p.tutorialStep > 1 },
        ]
      : [];
  const steps = [...tutorialSteps, ...phase.objectives.map((o) => ({ text: o.text, done: o.completed }))];
  const ready = isPhaseReady(save);

  let current: MissionStep;
  if (inTutorial && p.tutorialStep === 0) {
    current = {
      text: 'Step off the lander and walk to the supply crate',
      control: 'W A S D or click the ground',
      target: { kind: 'point', x: 500, y: 460, label: 'Walk here', radius: 30 },
      hints: ['Use W A S D or the arrow keys to walk. You can also click the ground.', 'Walk toward the glowing marker.'],
    };
  } else if (inTutorial && p.tutorialStep === 1) {
    current = {
      text: 'Open the supply crate',
      control: 'E · Open',
      target: { kind: 'node', types: ['crate'], ids: ['crate-1', 'crate-practice'], label: 'Supply crate' },
      hints: ['Stand next to the crate and press E. You can also click it.', 'The crate has the parts you need for your first buildings.'],
    };
  } else if (ready) {
    current = { text: 'Mission complete! Claim your reward', control: 'Click Continue', hints: [] };
  } else {
    const next = phase.objectives.find((o) => !o.completed);
    current = next ? stepFor(save, next.id, ctx) : { text: 'Keep going', hints: [] };
  }

  return { ...base, steps, current, ready, complete: false };
}

export function isNearLadder(x: number, y: number) {
  return Math.hypot(x - LADDER.x, y - LADDER.y) < 110;
}

/** Nodes that still have uses left (for the engine and for supply drops). */
export function remainingUses(progress: ProgressState, nodeId: string) {
  const def = NODE_DEFS.find((n) => n.id === nodeId);
  if (!def) return 0;
  return progress.nodeUses[nodeId] ?? def.uses;
}
