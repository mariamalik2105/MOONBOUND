/**
 * MOONBOUND Save System (IndexedDB + JSON Backup Import/Export)
 * Supports multiple campaign slots, periodic autosave, and strict schema validation.
 */

import { SimulationState, createInitialSimulationState } from './simulation';
import { PhaseDefinition, MOONBOUND_PHASES } from './phases';
import { ProgressState, createProgressState, syncObjectives } from './progression';

/** Bump when the save shape changes; `migrateSave` upgrades older saves. */
export const SAVE_VERSION = 2;

export interface PhaseTimeRecord {
  phaseIndex: number;
  phaseLetter: string;
  phaseName: string;
  bestTimeSeconds: number | null;
  benchmarkRecordSeconds: number;
  leaderboardRank: number;
  completedAt?: number;
}

export interface MissionRecordsData {
  totalDistanceOnFoot: number;
  totalDistanceInRover: number;
  totalResourcesHarvested: number;
  totalStructuresFabricated: number;
  totalDiscoveriesScanned: number;
  totalChallengesSolved: number;
  totalSpaceDollarsEarned: number;
  phaseCompletionTimes: Record<number, number>;
  phaseLeaderboard: PhaseTimeRecord[];
}

export interface GameSaveData {
  version: number;
  slotId: string;
  campaignName: string;
  timestamp: number;
  avatarId: string;
  petId?: string;
  unlockedAvatars: string[];
  unlockedPets: string[];
  unlockedEmotes: string[];
  equippedEmotes: string[];
  spaceDollars: number;
  inventory: Record<string, number>;
  unlockedBlueprints: string[];
  currentPhaseIndex: number;
  phases: PhaseDefinition[];
  simulation: SimulationState;
  discoveredKnowledgeIds: string[];
  completedChallengeIds: string[];
  researchedNodeIds?: string[];
  unlockedCodexIds?: string[];
  playerPosition: { x: number; y: number; zoneId: string };
  hasRover: boolean;
  isInRover: boolean;
  records?: MissionRecordsData;
  /** Mission progress, tutorial state, one-time rewards (added in save version 2). */
  progress: ProgressState;
}

const DB_NAME = 'MoonboundDB';
const DB_VERSION = 1;
const STORE_NAME = 'saves';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported in this environment'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'slotId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Creates default new campaign state.
 */
export function createNewGameSave(slotId = 'slot_1', campaignName = 'Artemis Alpha'): GameSaveData {
  return {
    version: SAVE_VERSION,
    progress: createProgressState(),
    slotId,
    campaignName,
    timestamp: Date.now(),
    avatarId: 'engineer', // Default starter avatar
    petId: 'rocky', // Default companion Rocky
    unlockedAvatars: ['engineer'],
    unlockedPets: ['rocky'],
    unlockedEmotes: ['wave', 'astronaut_salute'],
    equippedEmotes: ['wave', 'astronaut_salute'],
    spaceDollars: 150,
    inventory: {
      regolith: 8,
      metalOre: 6,
      silicon: 4,
      waterIce: 0,
      titanium: 0,
      seeds: 2,
      samples: 1,
      researchData: 6,
      helium3: 0,
      battery: 0,
    },
    unlockedBlueprints: ['solar_panel', 'battery', 'habitat', 'oxygen_generator', 'water_storage'],
    currentPhaseIndex: 0, // Starts at M: Mission Preparation
    phases: JSON.parse(JSON.stringify(MOONBOUND_PHASES)),
    simulation: createInitialSimulationState(),
    discoveredKnowledgeIds: ['lunar_regolith'],
    completedChallengeIds: [],
    researchedNodeIds: [],
    unlockedCodexIds: [
      'codex_lunar_geography',
      'codex_moon_phases',
      'codex_lunar_gravity',
      'codex_lunar_regolith',
      'codex_lunar_history',
      'codex_space_animals',
    ],
    playerPosition: { x: 400, y: 396, zoneId: 'zone_landing' },
    hasRover: false,
    isInRover: false,
    records: {
      totalDistanceOnFoot: 0,
      totalDistanceInRover: 0,
      totalResourcesHarvested: 0,
      totalStructuresFabricated: 0,
      totalDiscoveriesScanned: 0,
      totalChallengesSolved: 0,
      totalSpaceDollarsEarned: 150,
      phaseCompletionTimes: {},
      phaseLeaderboard: [
        { phaseIndex: 0, phaseLetter: 'M', phaseName: 'Mission Preparation', bestTimeSeconds: null, benchmarkRecordSeconds: 35.0, leaderboardRank: 1 },
        { phaseIndex: 1, phaseLetter: 'O', phaseName: 'Orbit', bestTimeSeconds: null, benchmarkRecordSeconds: 28.5, leaderboardRank: 1 },
        { phaseIndex: 2, phaseLetter: 'O', phaseName: 'Outbound Journey', bestTimeSeconds: null, benchmarkRecordSeconds: 32.0, leaderboardRank: 1 },
        { phaseIndex: 3, phaseLetter: 'N', phaseName: 'Navigation', bestTimeSeconds: null, benchmarkRecordSeconds: 40.0, leaderboardRank: 1 },
        { phaseIndex: 4, phaseLetter: 'B', phaseName: 'Braking & Landing', bestTimeSeconds: null, benchmarkRecordSeconds: 45.0, leaderboardRank: 1 },
        { phaseIndex: 5, phaseLetter: 'O', phaseName: 'Outpost', bestTimeSeconds: null, benchmarkRecordSeconds: 75.0, leaderboardRank: 1 },
        { phaseIndex: 6, phaseLetter: 'U', phaseName: 'Uncover', bestTimeSeconds: null, benchmarkRecordSeconds: 90.0, leaderboardRank: 1 },
        { phaseIndex: 7, phaseLetter: 'N', phaseName: 'Network', bestTimeSeconds: null, benchmarkRecordSeconds: 110.0, leaderboardRank: 1 },
        { phaseIndex: 8, phaseLetter: 'D', phaseName: 'Development', bestTimeSeconds: null, benchmarkRecordSeconds: 140.0, leaderboardRank: 1 },
      ],
    },
  };
}

/**
 * Validates whether an unknown object adheres to the GameSaveData schema.
 */
export function validateSaveData(data: unknown): data is GameSaveData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.version === 'number' &&
    typeof d.slotId === 'string' &&
    typeof d.campaignName === 'string' &&
    typeof d.avatarId === 'string' &&
    typeof d.spaceDollars === 'number' &&
    d.spaceDollars >= 0 &&
    typeof d.inventory === 'object' &&
    Array.isArray(d.unlockedBlueprints) &&
    Array.isArray(d.phases) &&
    typeof d.simulation === 'object'
  );
}

/**
 * Saves game state into IndexedDB.
 */
export async function saveGameToDb(save: GameSaveData): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const updated = { ...save, timestamp: Date.now() };
      store.put(updated);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Falling back to localStorage for save:', err);
    try {
      localStorage.setItem(`moonbound_${save.slotId}`, JSON.stringify(save));
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Loads game state from IndexedDB.
 */
export async function loadGameFromDb(slotId: string): Promise<GameSaveData | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(slotId);
      req.onsuccess = () => {
        if (req.result && validateSaveData(req.result)) {
          resolve(migrateSave(req.result));
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    const raw = localStorage.getItem(`moonbound_${slotId}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (validateSaveData(parsed)) return migrateSave(parsed);
      } catch {
        // ignore
      }
    }
    return null;
  }
}

/**
 * Lists all available saved slots.
 */
export async function listAllSaves(): Promise<GameSaveData[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const results = (req.result || []).filter(validateSaveData).map(migrateSave);
        resolve(results);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    const list: GameSaveData[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('moonbound_')) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key) || '');
          if (validateSaveData(parsed)) list.push(migrateSave(parsed));
        } catch {
          // ignore
        }
      }
    }
    return list;
  }
}

/**
 * Exports save state to JSON string.
 */
export function exportSaveToJson(save: GameSaveData): string {
  return JSON.stringify(save, null, 2);
}

/**
 * Validates and imports save state from JSON string.
 */
export function importSaveFromJson(jsonString: string): { success: boolean; data?: GameSaveData; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    if (!validateSaveData(parsed)) {
      return { success: false, error: 'File format is invalid or corrupted.' };
    }
    return { success: true, data: migrateSave(parsed) };
  } catch (e: unknown) {
    const err = e as Error;
    return { success: false, error: err?.message || 'JSON parse error.' };
  }
}

const SETUP_TYPES = ['oxygen_generator', 'water_recycler', 'research_lab', 'communication_tower'];

/**
 * Upgrades an older save to the current shape without losing progress.
 * Version 1 saves have no `progress`: phases already passed count as rewarded,
 * buildings that existed keep working, and the new mission texts are used
 * while keeping every objective that was already ticked.
 */
export function migrateSave(raw: GameSaveData): GameSaveData {
  const save = { ...raw } as GameSaveData;
  const fresh = createNewGameSave(save.slotId, save.campaignName);
  const idx = Math.max(0, Math.min(MOONBOUND_PHASES.length - 1, save.currentPhaseIndex || 0));
  save.currentPhaseIndex = idx;

  // New phase texts, old completion flags
  const oldPhases = Array.isArray(save.phases) ? save.phases : [];
  save.phases = MOONBOUND_PHASES.map((def, i) => {
    const old = oldPhases.find((p) => p?.id === def.id) || oldPhases[i];
    return {
      ...JSON.parse(JSON.stringify(def)),
      objectives: def.objectives.map((o) => ({
        ...o,
        completed: Boolean(old?.objectives?.find((oo) => oo.id === o.id)?.completed) || i < idx,
      })),
    };
  });

  save.records = save.records || fresh.records;
  save.simulation = { ...fresh.simulation, ...(save.simulation || {}) };
  save.playerPosition = save.playerPosition || fresh.playerPosition;

  if (!save.progress) {
    const progress = createProgressState();
    progress.rewardsClaimed = MOONBOUND_PHASES.slice(0, idx).map((p) => p.id);
    progress.badges = [...progress.rewardsClaimed];
    progress.tutorialStep = idx >= 5 ? 2 : 0;
    if (idx >= 6) progress.flags.roverUnlocked = true;
    for (const t of SETUP_TYPES) {
      if (save.simulation.buildings?.some((b) => b.recipeId === t)) progress.activated[t] = true;
    }
    // Objectives already ticked in an older save stay ticked; keep their flags so
    // flight tasks do not ask to be redone.
    for (const ph of save.phases) {
      for (const o of ph.objectives) if (o.completed) progress.flags[`flight:${o.id}`] = true;
    }
    if (save.phases[idx]?.objectives.find((o) => o.id === 'board_rover')?.completed) progress.flags.boardedRover = true;
    save.progress = progress;
  } else {
    save.progress = { ...createProgressState(), ...save.progress };
  }
  save.version = SAVE_VERSION;
  return syncObjectives(save).save;
}
