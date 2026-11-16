/**
 * MOONBOUND: One Moon. Nine Missions. One goal: make it home.
 *
 * App owns the save and the menus. Game rules live in game/progression.ts
 * (pure functions); the canvas engine only reports what the player did.
 *
 * State pattern: `saveRef` always holds the latest save. `commit()` updates
 * both the ref and React state. Event handlers compute the next save with
 * pure functions and then run side effects (sound, toasts, network) outside
 * of any React state updater.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { MoonboundEngine, type ResourceNode } from './game/canvasEngine';
import { TitleScreen } from './components/TitleScreen';
import { GameHud, type HudAction, type HudGauge } from './components/GameHud';
import { FlightConsole } from './components/FlightConsole';
import { TaskOverlay, type TaskKind } from './components/TaskOverlay';
import { ChoreOverlay, CHORE_COINS, type ChoreKind } from './components/ChoreGames';
import {
  MissionCelebration,
  Finale,
  LiftoffBar,
  ScienceNote,
  ToastStack,
  ConfirmDialog,
  MissionSteps,
  ControlsCard,
  type ScienceNoteData,
  type ToastItem,
} from './components/Overlays';
import { BuildModal } from './components/BuildModal';
import { ShopModal } from './components/ShopModal';
import { InventoryModal } from './components/InventoryModal';
import { KnowledgeModal } from './components/KnowledgeModal';
import { CodexModal } from './components/CodexModal';
import { SaveModal } from './components/SaveModal';
import { SettingsModal } from './components/SettingsModal';
import { PauseModal } from './components/PauseModal';
import { EmoteWheel } from './components/EmoteWheel';
import { MultiplayerModal } from './components/MultiplayerModal';
import { MissionRecordsModal } from './components/MissionRecordsModal';
import { ResearchModal } from './components/ResearchModal';
import { StormAlertModal, StormStatusBanner, StormDebriefModal, MissionOverModal } from './components/SolarStormPanels';
import { NasaDataModal } from './components/NasaDataModal';
import { TouchControls, useCoarsePointer } from './components/TouchControls';

import { type GameSaveData, createNewGameSave, saveGameToDb, loadGameFromDb } from './game/saveSystem';
import { tickSimulation, solveColonyProblem, chooseStormResponse, acknowledgeStormDebrief, type PlacedBuilding } from './game/simulation';
import { researchMultiplier, AVATARS } from './game/economy';
import { ARCHIVED_SOLAR_EVENTS, type SpaceWeatherFeed, type StormChoice, getStormOptions, loadSpaceWeatherFeed } from './game/spaceWeather';
import { type MissionKnowledgeEntry, type ResearchNode, findKnowledgeForScanTarget, MISSION_KNOWLEDGE_ENTRIES } from './game/science';
import {
  applyGameEvent,
  completeCurrentPhase,
  restartCurrentPhase,
  getMissionGuide,
  isPhaseReady,
  syncObjectives,
  SURFACE_START,
  type GameEvent,
  type GameEffect,
  type PhaseReward,
} from './game/progression';
import { BASE_CENTER, NODE_DEFS, RESOURCE_LABEL } from './game/world';
import { sound } from './game/audio';
import { MultiplayerClient } from './game/multiplayerClient';

type Overlay =
  | 'pause'
  | 'build'
  | 'backpack'
  | 'research'
  | 'codex'
  | 'records'
  | 'shop'
  | 'save'
  | 'settings'
  | 'emote'
  | 'multiplayer'
  | 'knowledge'
  | 'nasa'
  | 'steps'
  | 'controls'
  | 'task'
  | 'chore'
  | 'celebration'
  | 'liftoff'
  | 'finale'
  | 'confirm';

interface ConfirmState {
  title: string;
  text: string;
  confirm: string;
  run: () => void;
}

const HINT_AFTER = [25, 50];

function readPref(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function writePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage may be blocked */
  }
}

function isTyping(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
}

function firstSentence(s: string) {
  const m = s.match(/^.*?[.!?](\s|$)/);
  return (m ? m[0] : s).trim();
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<MoonboundEngine | null>(null);
  const mpRef = useRef<MultiplayerClient | null>(null);

  // ---------------------------------------------------------------- save
  const [save, setSave] = useState<GameSaveData>(() => createNewGameSave());
  const saveRef = useRef(save);
  const commit = useCallback((next: GameSaveData) => {
    saveRef.current = next;
    setSave(next);
  }, []);

  const [screen, setScreen] = useState<'title' | 'playing'>('title');
  const screenRef = useRef(screen);
  screenRef.current = screen;
  const [hasExistingSave, setHasExistingSave] = useState(false);

  // ---------------------------------------------------------------- overlays (a stack: Esc closes the top one)
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const overlaysRef = useRef(overlays);
  overlaysRef.current = overlays;
  const top = overlays[overlays.length - 1] || null;
  const open = useCallback((o: Overlay) => setOverlays((s) => (s[s.length - 1] === o ? s : [...s.filter((x) => x !== o), o])), []);
  const close = useCallback((o?: Overlay) => setOverlays((s) => (o ? s.filter((x) => x !== o) : s.slice(0, -1))), []);

  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [liftoffCaption, setLiftoffCaption] = useState('');
  const [taskKind, setTaskKind] = useState<TaskKind | null>(null);
  const [chore, setChore] = useState<{ kind: ChoreKind; instanceId: string } | null>(null);
  const lastWaterRef = useRef(0);
  const choreCoinsRef = useRef(0);
  const [reward, setReward] = useState<PhaseReward | null>(null);
  const [knowledgeEntry, setKnowledgeEntry] = useState<MissionKnowledgeEntry | null>(null);
  const [researchTab, setResearchTab] = useState<'research' | 'alerts'>('research');
  const [note, setNote] = useState<ScienceNoteData | null>(null);
  const [flightKey, setFlightKey] = useState(0);

  // ---------------------------------------------------------------- comfort settings
  const [isMuted, setIsMuted] = useState(() => readPref('mb.muted', '0') === '1');
  const [volume, setVolumeState] = useState(() => Number(readPref('mb.volume', '0.8')));
  const [reducedMotion, setReducedMotion] = useState(() => {
    const v = readPref('mb.reducedMotion', '');
    if (v) return v === '1';
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  });
  const [highContrast, setHighContrast] = useState(() => readPref('mb.contrast', '0') === '1');

  useEffect(() => {
    sound.setMuted(isMuted);
    sound.setVolume(volume);
  }, [isMuted, volume]);
  useEffect(() => {
    document.body.dataset.reducedMotion = String(reducedMotion);
    engineRef.current?.setReducedMotion(reducedMotion);
    writePref('mb.reducedMotion', reducedMotion ? '1' : '0');
  }, [reducedMotion]);
  useEffect(() => {
    document.body.dataset.contrast = highContrast ? 'high' : 'normal';
    writePref('mb.contrast', highContrast ? '1' : '0');
  }, [highContrast]);

  const toggleMute = useCallback(() => {
    const next = !sound.getMuted();
    sound.setMuted(next);
    setIsMuted(next);
    writePref('mb.muted', next ? '1' : '0');
  }, []);
  const setVolume = (v: number) => {
    setVolumeState(v);
    sound.setVolume(v);
    writePref('mb.volume', String(v));
  };

  // ---------------------------------------------------------------- toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastId = useRef(0);
  const pushToast = useCallback((text: string, tone: ToastItem['tone'] = 'info') => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'warn' ? 4200 : 3400);
  }, []);

  // ---------------------------------------------------------------- multiplayer status
  const [mpConnected, setMpConnected] = useState(false);
  const mpConnectedRef = useRef(false);
  mpConnectedRef.current = mpConnected;
  const [activeRoomId, setActiveRoomId] = useState('');

  // ---------------------------------------------------------------- NASA space weather (live DONKI or archived real events)
  const [spaceFeed, setSpaceFeed] = useState<SpaceWeatherFeed | null>(null);
  const spaceFeedRef = useRef<SpaceWeatherFeed | null>(null);
  useEffect(() => {
    loadSpaceWeatherFeed().then((feed) => {
      spaceFeedRef.current = feed;
      setSpaceFeed(feed);
    });
  }, []);

  // ---------------------------------------------------------------- derived
  const phaseIndex = save.currentPhaseIndex;
  const onSurface = phaseIndex >= SURFACE_START;
  const storm = save.simulation.storm || null;
  const radiation = save.simulation.radiation;
  const stormModal =
    screen === 'playing' &&
    overlays.length === 0 &&
    ((storm?.phase === 'warning' && !storm.choice) || (storm?.phase === 'debrief' && radiation && !radiation.missionOver) || Boolean(radiation?.missionOver));
  const blocked = overlays.length > 0 || stormModal;
  const blockedRef = useRef(blocked);
  blockedRef.current = blocked;

  const pos = engineRef.current?.getPlayerPos();
  const guide = getMissionGuide(save, {
    px: pos?.x,
    py: pos?.y,
    inRover: pos?.inRover,
    revealedIceIds: engineRef.current?.getRevealedIceIds(),
  });
  const guideRef = useRef(guide);
  guideRef.current = guide;

  // ---------------------------------------------------------------- hints (inactivity counted only during active play)
  const [hintLevel, setHintLevel] = useState(0);
  const idleRef = useRef(0);
  const stepKey = `${phaseIndex}|${save.progress.tutorialStep}|${guide.current.text}`;
  useEffect(() => {
    idleRef.current = 0;
    setHintLevel(0);
  }, [stepKey]);
  const hint = hintLevel > 0 ? guide.current.hints[Math.min(hintLevel, guide.current.hints.length) - 1] || null : null;

  // ---------------------------------------------------------------- effects from game events
  const celebratingRef = useRef(false);

  const runEffects = useCallback(
    (effects: GameEffect[]) => {
      const eng = engineRef.current;
      for (const ef of effects) {
        if (ef.kind === 'toast') pushToast(ef.text);
        else if (ef.kind === 'error') {
          sound.playClick();
          pushToast(ef.text, 'warn');
        } else if (ef.kind === 'objective') {
          sound.playQuindarTone();
          pushToast(`Done: ${ef.text}`, 'good');
          if (eng) {
            const p = eng.getPlayerPos();
            eng.burst(p.x, p.y - 20, '#f2b84b', 16);
            eng.petReact('♪');
          }
        } else if (ef.kind === 'coins') {
          sound.playCollect();
          pushToast(`+${ef.amount} ✦${ef.reason ? ' · ' + ef.reason : ''}`, 'good');
          if (eng) {
            const p = eng.getPlayerPos();
            eng.burst(p.x, p.y - 24, '#f2b84b', 14);
          }
        } else if (ef.kind === 'tutorial') {
          if (ef.step === 1) sound.playClick();
        }
      }
    },
    [pushToast]
  );

  const dispatch = useCallback(
    (ev: GameEvent) => {
      const res = applyGameEvent(saveRef.current, ev);
      if (res.save !== saveRef.current) commit(res.save);
      runEffects(res.effects);
      return res;
    },
    [commit, runEffects]
  );

  // ---------------------------------------------------------------- persistence
  const persist = useCallback(async (quiet = true) => {
    const eng = engineRef.current;
    const s = saveRef.current;
    const snapshot: GameSaveData = {
      ...s,
      timestamp: Date.now(),
      progress: { ...s.progress, world: eng && s.currentPhaseIndex >= SURFACE_START ? eng.getWorldSnapshot() : s.progress.world },
    };
    const ok = await saveGameToDb(snapshot).catch(() => false);
    if (ok) setHasExistingSave(true);
    if (!quiet) pushToast(ok ? 'Game saved' : 'Could not save. Your browser may be blocking storage.', ok ? 'good' : 'warn');
    return ok;
  }, [pushToast]);

  // ---------------------------------------------------------------- mission completion
  const claimMission = useCallback(() => {
    const res = completeCurrentPhase(saveRef.current);
    if (!res.ok || !res.reward) {
      celebratingRef.current = false;
      if (res.reason) pushToast(res.reason, 'warn');
      return;
    }
    commit(res.save);
    setReward(res.reward);
    sound.playVictory();
    if (!reducedMotion) {
      confetti({ particleCount: res.reward.campaignComplete ? 140 : 70, spread: 75, origin: { y: 0.65 }, colors: ['#f2b84b', '#9d8cff', '#f3efe6', '#7fd1a0'] });
    }
    engineRef.current?.setGhostBuilding(null);
    setOverlays((s) => [...s.filter((o) => o !== 'celebration'), 'celebration']);
    void persist();
  }, [commit, persist, pushToast, reducedMotion]);

  // Auto-celebrate as soon as the mission's steps are really done
  const missionReady = isPhaseReady(save);
  const holdCelebration = overlays.includes('celebration') || overlays.includes('liftoff') || overlays.includes('finale') || overlays.includes('task') || overlays.includes('chore');
  useEffect(() => {
    if (screen !== 'playing' || celebratingRef.current || !missionReady || holdCelebration) return;
    celebratingRef.current = true;
    const t = setTimeout(claimMission, 1100);
    return () => {
      clearTimeout(t);
      celebratingRef.current = false;
    };
  }, [missionReady, holdCelebration, screen, claimMission]);

  const continueAfterCelebration = () => {
    celebratingRef.current = false;
    const r = reward;
    setReward(null);
    close('celebration');
    if (r?.campaignComplete) {
      const eng = engineRef.current;
      const showFinale = () => {
        close('liftoff');
        setLiftoffCaption('');
        engineRef.current?.setCameraOverride({ x: BASE_CENTER.x, y: BASE_CENTER.y, zoom: 0.75 });
        open('finale');
      };
      if (eng) {
        // the crew climbs aboard and the cabin lifts off, then the finale card
        open('liftoff');
        eng.playLiftoff(showFinale, setLiftoffCaption);
      } else showFinale();
    }
    if (r && r.phaseId === 'braking_and_landing') pushToast('You are on the Moon! Walk down the ladder.', 'good');
  };

  const leaveFinale = (toTitle: boolean) => {
    engineRef.current?.resetLiftoff();
    engineRef.current?.setCameraOverride(null);
    close('finale');
    if (toTitle) exitToTitle();
  };

  // ---------------------------------------------------------------- engine
  const handlers = useRef({
    onCollect: (_n: ResourceNode, _u: number) => {},
    onScan: (_f: ResourceNode[], _a: ResourceNode[]) => {},
    onBuildPlaced: (_r: string, _x: number, _y: number, _s: number) => {},
    onSetupRequest: (_b: PlacedBuilding) => {},
    onCleanDust: (_b: PlacedBuilding) => {},
    onHarvest: (_b: PlacedBuilding) => {},
    onFixPower: (_b: PlacedBuilding) => {},
    onBoardRover: () => {},
    onWalkedOffLander: () => {},
    onPlayerMoved: (_x: number, _y: number, _d: string, _m: boolean, _r: boolean) => {},
    onDistanceTraveled: (_d: number, _r: boolean) => {},
  });

  handlers.current.onCollect = (node, usesLeft) => {
    if (node.contents) {
      dispatch({ type: 'supplyDrop', contents: node.contents });
      return;
    }
    dispatch({ type: 'collect', nodeId: node.id, nodeType: node.type, amount: node.amount, usesLeft });
  };

  handlers.current.onScan = (fresh, inRange) => {
    if (inRange.length === 0) return;
    dispatch({ type: 'scan', nodeIds: inRange.map((n) => n.id) });
    // One short discovery note per kind of thing, the first time it is scanned
    const s = saveRef.current;
    for (const n of fresh) {
      const entry = findKnowledgeForScanTarget(n.type, s.completedChallengeIds);
      if (s.progress.seenNotes.includes(entry.id)) continue;
      const next: GameSaveData = {
        ...s,
        progress: { ...s.progress, seenNotes: [...s.progress.seenNotes, entry.id] },
        discoveredKnowledgeIds: Array.from(new Set([...(s.discoveredKnowledgeIds || []), entry.id])),
        unlockedCodexIds: entry.unlocksCodexId ? Array.from(new Set([...(s.unlockedCodexIds || []), entry.unlocksCodexId])) : s.unlockedCodexIds,
      };
      commit(next);
      setNote({ id: entry.id, title: entry.title, text: firstSentence(entry.understandExplanation), source: entry.sourceLabel });
      break;
    }
  };

  handlers.current.onBuildPlaced = (recipeId, x, y, sunFactor) => {
    const instanceId = `b-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const before = saveRef.current;
    const res = dispatch({ type: 'build', recipeId, x, y, sunFactor, instanceId });
    if (res.save !== before) {
      sound.playBuild();
      if (mpRef.current?.isConnected) mpRef.current.sendBuildingPlaced(recipeId, x, y);
    }
  };

  handlers.current.onSetupRequest = (b) => {
    if (b.recipeId === 'oxygen_generator') {
      dispatch({ type: 'activate', recipeId: b.recipeId });
      sound.playCollect();
      return;
    }
    if (b.recipeId === 'water_recycler' || b.recipeId === 'research_lab' || b.recipeId === 'communication_tower') {
      setTaskKind(b.recipeId);
      open('task');
    }
  };
  const openChore = (kind: ChoreKind, b: PlacedBuilding) => {
    sound.playClick();
    setChore({ kind, instanceId: b.instanceId });
    open('chore');
  };
  handlers.current.onCleanDust = (b) => openChore('scrub', b);
  handlers.current.onHarvest = (b) => openChore('garden', b);
  handlers.current.onFixPower = (b) => openChore('wires', b);
  handlers.current.onBoardRover = () => {
    dispatch({ type: 'boardRover' });
  };
  handlers.current.onWalkedOffLander = () => {
    dispatch({ type: 'walkedOffLander' });
  };
  handlers.current.onPlayerMoved = (x, y, dir, moving, inRover) => {
    if (mpRef.current?.isConnected) mpRef.current.sendMovement(x, y, dir, moving, inRover);
  };
  handlers.current.onDistanceTraveled = (meters, inRover) => {
    const s = saveRef.current;
    if (!s.records) return;
    const key = inRover ? 'totalDistanceInRover' : 'totalDistanceOnFoot';
    commit({ ...s, records: { ...s.records, [key]: (s.records[key] || 0) + meters } });
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    const h = handlers.current;
    const engine = new MoonboundEngine(canvasRef.current, {
      onCollect: (n, u) => h.onCollect(n, u),
      onScan: (f, a) => h.onScan(f, a),
      onBuildPlaced: (r, x, y, s) => h.onBuildPlaced(r, x, y, s),
      onSetupRequest: (b) => h.onSetupRequest(b),
      onCleanDust: (b) => h.onCleanDust(b),
      onHarvest: (b) => h.onHarvest(b),
      onFixPower: (b) => h.onFixPower(b),
      onBoardRover: () => h.onBoardRover(),
      onWalkedOffLander: () => h.onWalkedOffLander(),
      onPlayerMoved: (x, y, d, m, r) => h.onPlayerMoved(x, y, d, m, r),
      onDistanceTraveled: (d, r) => h.onDistanceTraveled(d, r),
    });
    engineRef.current = engine;
    engine.setReducedMotion(reducedMotion);
    engine.start();

    const mp = new MultiplayerClient({
      onConnected: () => {
        setMpConnected(true);
        pushToast('Connected to your crew');
      },
      onDisconnected: () => {
        setMpConnected(false);
        pushToast('Crew connection lost. Playing solo.');
      },
      onRoomState: (state) => mergeShared(state.buildings),
      onPlayerJoined: (p) => pushToast(`${p.name} joined the base`),
      onPlayerMoved: (p) => engineRef.current?.remotePlayers.set(p.id, p),
      onPlayerLeft: (id) => engineRef.current?.remotePlayers.delete(id),
      onPlayerEmote: (id, emote) => {
        const rp = engineRef.current?.remotePlayers.get(id);
        if (rp) {
          rp.emote = emote;
          rp.emoteTimer = 3;
        }
      },
      onBuildingPlaced: (b) => {
        if (b.placedBy && b.placedBy === mpRef.current?.id) return;
        mergeShared([b]);
        pushToast('A crewmate built something');
      },
      onRejected: (reason) => pushToast(reason, 'warn'),
    });
    mpRef.current = mp;

    loadGameFromDb('slot_1').then((s) => s && setHasExistingSave(true));
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') === '1') {
      (window as unknown as Record<string, unknown>).__moonbound = { engine, getSave: () => saveRef.current, dispatch: (ev: GameEvent) => handlersDispatch.current(ev) };
    }
    if (params.get('autostart') === '1') setTimeout(() => startNewGame(true), 0);

    return () => {
      engine.destroy();
      mp.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const handlersDispatch = useRef(dispatch);
  handlersDispatch.current = dispatch;

  function mergeShared(incoming: GameSaveData['simulation']['buildings'] | undefined) {
    if (!incoming || incoming.length === 0) return;
    const s = saveRef.current;
    const existing = s.simulation.buildings;
    const added = incoming
      .filter((b) => !existing.some((e) => e.x === b.x && e.y === b.y && e.recipeId === b.recipeId))
      .map((b) => ({ ...b, status: 'active' as const }));
    if (added.length === 0) return;
    commit(syncObjectives({ ...s, simulation: { ...s.simulation, buildings: [...existing, ...added] } }).save);
  }

  // Keep the engine in step with the save
  useEffect(() => {
    const eng = engineRef.current;
    if (!eng) return;
    eng.placedBuildings = save.simulation.buildings;
    eng.sunlightIntensity = save.simulation.sunlightIntensity;
    const r = save.simulation.resources;
    eng.powerCharge = r.powerCapacity > 0 ? r.powerStored / r.powerCapacity : 0;
    eng.stormLevel = !storm || storm.phase === 'debrief' ? 0 : storm.phase === 'active' ? 2 : 1;
    eng.shelterLocked = storm?.phase === 'active' && storm.choice === 'shelter';
  }, [save.simulation, storm]);

  const stageSig = `${phaseIndex}|${save.progress.tutorialStep}|${save.progress.flags.roverUnlocked ? 1 : 0}|${save.progress.badges.join(',')}`;
  useEffect(() => {
    engineRef.current?.setStage({
      phaseIndex,
      tutorialStep: save.progress.tutorialStep,
      scanEnabled: phaseIndex >= 6,
      roverUnlocked: phaseIndex >= 6 || Boolean(save.progress.flags.roverUnlocked),
      badges: save.progress.badges,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageSig]);

  useEffect(() => {
    const av = AVATARS[save.avatarId] || AVATARS.engineer;
    engineRef.current?.setAvatar(av.id, av.suitColor);
    engineRef.current?.setPet(save.petId || 'rocky');
  }, [save.avatarId, save.petId]);

  // Pause and input gating
  useEffect(() => {
    const eng = engineRef.current;
    if (!eng) return;
    const playing = screen === 'playing';
    eng.setInputEnabled(playing && !blocked && onSurface);
    // the liftoff cutscene is an overlay, but the world has to keep animating under it
    eng.setPaused(!playing || (blocked && !mpConnected && top !== 'liftoff'));
  }, [screen, blocked, onSurface, mpConnected, top]);

  const targetSig = JSON.stringify(guide.current.target || null);
  useEffect(() => {
    engineRef.current?.setMissionTarget(screen === 'playing' && onSurface ? guide.current.target || null : null, hintLevel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetSig, hintLevel, screen, onSurface]);

  // ---------------------------------------------------------------- one-second game clock (only while really playing)
  useEffect(() => {
    if (screen !== 'playing') return;
    const iv = setInterval(() => {
      if (document.hidden) return;
      const frozen = blockedRef.current && !mpConnectedRef.current;
      if (frozen) return;
      let s = saveRef.current;
      const idx = s.currentPhaseIndex;
      if (idx >= SURFACE_START && !s.progress.campaignComplete) {
        const sim = tickSimulation(s.simulation, 1, s.avatarId, s.petId, {
          onSurface: true,
          eventPool: spaceFeedRef.current?.events || ARCHIVED_SOLAR_EVENTS,
          stormsEnabled: idx >= 6,
        });
        s = { ...s, simulation: sim };
        if (idx === 8) s = applyGameEvent(s, { type: 'sustain', seconds: sim.sustainabilitySeconds || 0 }).save;
      } else if (s.progress.campaignComplete) {
        s = { ...s, simulation: tickSimulation(s.simulation, 1, s.avatarId, s.petId, { onSurface: true, eventPool: spaceFeedRef.current?.events || ARCHIVED_SOLAR_EVENTS, stormsEnabled: true }) };
      }
      const res = applyGameEvent(s, { type: 'activeTime', seconds: 1 });
      commit(res.save);
      runEffects(res.effects.filter((e) => e.kind === 'objective'));

      if (!blockedRef.current) {
        idleRef.current += 1;
        if (HINT_AFTER.includes(idleRef.current)) setHintLevel((h) => Math.min(2, h + 1));
      }
      maybeSupplyDrop();
    }, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  // Autosave every 20 s of play
  useEffect(() => {
    if (screen !== 'playing') return;
    const iv = setInterval(() => void persist(), 20000);
    return () => clearInterval(iv);
  }, [screen, persist]);

  /** No dead ends: if a needed material has run out on the map, Earth sends a cargo crate. */
  function maybeSupplyDrop() {
    const eng = engineRef.current;
    const g = guideRef.current;
    const t = g.current.target;
    if (!eng || !t || t.kind !== 'node' || !g.current.control?.startsWith('E · Collect') || t.types.includes('waterIce')) return;
    if (eng.resourceNodes.some((n) => n.id.startsWith('drop-'))) return;
    const available = eng.availableNodeTypes();
    const missing = t.types.filter((ty) => !available.has(ty));
    if (missing.length === 0) return;
    const contents: Record<string, number> = {};
    for (const m of missing) contents[m] = 4;
    eng.spawnSupplyCrate(contents);
    pushToast(`Earth sent a cargo crate with ${missing.map((m) => RESOURCE_LABEL[m]?.toLowerCase() || m).join(' and ')}. It landed by the lander.`);
  }

  // Storm announcements (no side effects inside state updaters)
  const lastStormRef = useRef<string | null>(null);
  useEffect(() => {
    const key = storm ? `${storm.event.id}:${storm.phase}` : null;
    if (key === lastStormRef.current) return;
    lastStormRef.current = key;
    if (storm?.phase === 'warning') {
      sound.playScan();
      engineRef.current?.petReact('!');
    } else if (storm?.phase === 'active') sound.playMineImpact();
  }, [storm]);

  // ---------------------------------------------------------------- start, load, quit
  const applyLoaded = (loaded: GameSaveData) => {
    commit(loaded);
    engineRef.current?.resetWorld({
      nodeUses: loaded.progress.nodeUses,
      scannedNodeIds: loaded.progress.scannedNodeIds,
      world: loaded.progress.world,
    });
    if (loaded.progress.tutorialStep < 2 && loaded.currentPhaseIndex >= SURFACE_START && loaded.progress.flags.tutorialReplay) {
      engineRef.current?.spawnPracticeCrate();
    }
    celebratingRef.current = false;
    setOverlays([]);
    setFlightKey((k) => k + 1);
    setScreen('playing');
  };

  function startNewGame(skipConfirm = false) {
    const go = () => {
      const fresh = createNewGameSave('slot_1', 'Artemis Alpha');
      applyLoaded(fresh);
      sound.playClick();
      void saveGameToDb(fresh).then((ok) => ok && setHasExistingSave(true));
    };
    if (hasExistingSave && !skipConfirm) {
      setConfirmState({
        title: 'Start a new game?',
        text: 'This replaces the saved game in this browser. Your current base will be lost.',
        confirm: 'Start new game',
        run: go,
      });
      open('confirm');
    } else go();
  }

  const resumeGame = async () => {
    const loaded = await loadGameFromDb('slot_1');
    if (loaded) {
      applyLoaded(loaded);
      pushToast(`Welcome back to ${loaded.campaignName}`);
    } else startNewGame(true);
  };

  function exitToTitle() {
    void persist();
    engineRef.current?.setGhostBuilding(null);
    engineRef.current?.setCameraOverride(null);
    setOverlays([]);
    setScreen('title');
  }

  const restartMission = () => {
    setConfirmState({
      title: 'Restart this mission?',
      text: 'The steps of this mission start over. Buildings you already placed stay, and rewards are never paid twice.',
      confirm: 'Restart mission',
      run: () => {
        let s = restartCurrentPhase(saveRef.current);
        if (s.currentPhaseIndex === 6) {
          // Put the crater ice back so the mission can be done again
          const nodeUses = { ...s.progress.nodeUses };
          const iceIds = NODE_DEFS.filter((n) => n.type === 'waterIce').map((n) => n.id);
          for (const id of iceIds) delete nodeUses[id];
          s = { ...s, progress: { ...s.progress, nodeUses, scannedNodeIds: s.progress.scannedNodeIds.filter((id) => !iceIds.includes(id)) } };
        }
        commit(s);
        engineRef.current?.resetWorld({
          nodeUses: s.progress.nodeUses,
          scannedNodeIds: s.progress.scannedNodeIds,
          world: s.currentPhaseIndex >= SURFACE_START ? engineRef.current.getWorldSnapshot() : undefined,
        });
        setFlightKey((k) => k + 1);
        setOverlays([]);
        pushToast('Mission restarted');
      },
    });
    open('confirm');
  };

  const replayIntro = () => {
    dispatch({ type: 'replayTutorial' });
    engineRef.current?.spawnPracticeCrate();
    setOverlays([]);
  };

  const skipIntro = () => {
    dispatch({ type: 'skipTutorial' });
    const eng = engineRef.current;
    if (eng) eng.resourceNodes = eng.resourceNodes.filter((n) => n.id !== 'crate-1' && n.id !== 'crate-practice');
  };

  // ---------------------------------------------------------------- keyboard (menus; movement keys belong to the engine)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const k = e.key.toLowerCase();
      const stack = overlaysRef.current;
      const topNow = stack[stack.length - 1];

      if (k === 'escape') {
        if (e.repeat) return;
        e.preventDefault();
        if (engineRef.current?.cancelPlacement()) return;
        if (topNow) {
          if (topNow === 'celebration') return continueRef.current();
          if (topNow === 'finale') return leaveFinaleRef.current(false);
          if (topNow === 'liftoff') return engineRef.current?.skipLiftoff();
          if (topNow === 'confirm') setConfirmState(null);
          if (topNow === 'task') setTaskKind(null);
          if (topNow === 'chore') setChore(null);
          close();
          return;
        }
        if (screenRef.current === 'playing' && !blockedRef.current) open('pause');
        return;
      }
      if (e.repeat) return;

      if (screenRef.current === 'title') {
        if (!topNow && (k === ' ' || k === 'enter')) {
          e.preventDefault();
          if (hasSaveRef.current) void resumeRef.current();
          else startRef.current(true);
        }
        return;
      }

      if (k === 'm') return toggleMute();
      if (topNow === 'celebration' && k === 'enter') return continueRef.current();
      const surface = saveRef.current.currentPhaseIndex >= SURFACE_START;
      const toggle = (o: Overlay) => (topNow === o ? close() : !topNow && !blockedRef.current && open(o));
      if (k === 'b' && surface) {
        if (engineRef.current?.isPlacing()) engineRef.current.cancelPlacement();
        toggle('build');
      } else if (k === 'i') toggle('backpack');
      else if (k === 'q' && surface) toggle('emote');
      else if (k === 'k') toggle('codex');
      else if (k === 't') toggle('records');
      else if (k === 'u' && surface) {
        setResearchTab('research');
        toggle('research');
      } else if (k === 'h' && !topNow) {
        setHintLevel((h) => Math.min(2, h + 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close, open, toggleMute]);

  const hasSaveRef = useRef(hasExistingSave);
  hasSaveRef.current = hasExistingSave;
  const resumeRef = useRef(resumeGame);
  resumeRef.current = resumeGame;
  const startRef = useRef(startNewGame);
  startRef.current = startNewGame;
  const continueRef = useRef(continueAfterCelebration);
  continueRef.current = continueAfterCelebration;
  const leaveFinaleRef = useRef(leaveFinale);
  leaveFinaleRef.current = leaveFinale;

  // ---------------------------------------------------------------- menu handlers (pure updates first, effects after)
  const handleStormChoice = (choice: Exclude<StormChoice, 'none'>) => {
    const s = saveRef.current;
    const r = chooseStormResponse(s.simulation, s.inventory, choice, s.avatarId);
    if (r.ok) commit({ ...s, simulation: r.simulation, inventory: r.inventory });
    if (r.message) pushToast(r.message, r.ok ? 'info' : 'warn');
  };

  const handleUnlockResearch = (node: ResearchNode) => {
    const s = saveRef.current;
    const data = s.inventory.researchData || 0;
    const doneIds = s.researchedNodeIds || [];
    if (doneIds.includes(node.id) || data < node.costResearchData) {
      pushToast(`Not enough research data. You need ${node.costResearchData - data} more.`, 'warn');
      return;
    }
    const bp = node.unlocksBlueprints ? node.unlocksBlueprints : node.unlocksBlueprint ? [node.unlocksBlueprint] : [];
    commit({
      ...s,
      inventory: { ...s.inventory, researchData: data - node.costResearchData },
      researchedNodeIds: [...doneIds, node.id],
      unlockedBlueprints: Array.from(new Set([...s.unlockedBlueprints, ...bp])),
    });
    sound.playBuild();
    pushToast(`Researched ${node.name}`, 'good');
  };

  const handleSolveProblem = (eventId: string, solutionId: string) => {
    const s = saveRef.current;
    const outcome = solveColonyProblem(s.simulation, eventId, solutionId);
    if (outcome.solved) {
      let next: GameSaveData = {
        ...s,
        spaceDollars: s.spaceDollars + outcome.rewardDollars,
        simulation: outcome.nextState,
        records: s.records ? { ...s.records, totalSpaceDollarsEarned: (s.records.totalSpaceDollarsEarned || 0) + outcome.rewardDollars } : s.records,
      };
      if (solutionId === 'brush_panels') {
        const dusty = [...next.simulation.buildings].filter((b) => b.recipeId === 'solar_panel').sort((a, b) => b.dustAccumulation - a.dustAccumulation)[0];
        if (dusty) next = applyGameEvent(next, { type: 'cleanDust', instanceId: dusty.instanceId }).save;
      }
      commit(syncObjectives(next).save);
      pushToast(`Problem solved: +S✦${outcome.rewardDollars}`, 'good');
    }
    return { solved: outcome.solved, feedback: outcome.feedback };
  };

  const buy = (list: 'unlockedAvatars' | 'unlockedPets' | 'unlockedEmotes', id: string, price: number, equip: Partial<GameSaveData>, msg: string) => {
    const s = saveRef.current;
    if (s[list].includes(id)) return;
    if (s.spaceDollars < price) {
      pushToast(`Not enough SpaceDollars. You need S✦${price - s.spaceDollars} more.`, 'warn');
      return;
    }
    commit({ ...s, spaceDollars: s.spaceDollars - price, [list]: [...s[list], id], ...equip });
    pushToast(msg, 'good');
  };

  // ---------------------------------------------------------------- HUD data
  const r = save.simulation.resources;
  const gauges: HudGauge[] = [];
  if (onSurface && save.simulation.buildings.length > 0) {
    gauges.push({ id: 'o2', label: 'Oxygen', value: `${Math.round(r.oxygen)}%`, fill: r.oxygen / 100, state: r.oxygen < 25 ? 'critical' : r.oxygen < 50 ? 'low' : 'ok' });
    const pf = r.powerCapacity > 0 ? r.powerStored / r.powerCapacity : 0;
    gauges.push({ id: 'power', label: 'Power', value: `${Math.round(pf * 100)}%`, fill: pf, state: pf < 0.1 ? 'critical' : pf < 0.3 ? 'low' : 'ok' });
    if (phaseIndex >= 7) gauges.push({ id: 'water', label: 'Water', value: `${Math.round(r.water)} L`, fill: r.water / Math.max(1, r.maxWater), state: r.water < 10 ? 'critical' : r.water < 20 ? 'low' : 'ok' });
    if (phaseIndex >= 8) gauges.push({ id: 'food', label: 'Food', value: `${r.food.toFixed(1)} kg`, fill: r.food / Math.max(1, r.maxFood), state: r.food < 2 ? 'low' : 'ok' });
  }
  const matIds = ['regolith', 'metalOre', 'silicon', ...(phaseIndex >= 6 ? ['waterIce'] : []), ...(phaseIndex >= 7 ? ['researchData'] : [])];
  const materials = onSurface ? matIds.map((id) => ({ id, label: RESOURCE_LABEL[id] || id, value: save.inventory[id] || 0 })) : [];
  const tutorialDone = save.progress.tutorialStep >= 2;
  const actions: HudAction[] = [];
  if (onSurface && tutorialDone) actions.push({ id: 'build', label: 'Build', keyHint: 'B', icon: 'build', onClick: () => open('build'), active: top === 'build' });
  if (phaseIndex >= 6) actions.push({ id: 'scan', label: 'Scan', keyHint: 'F', icon: 'scan', onClick: () => engineRef.current?.triggerScan() });
  actions.push({ id: 'backpack', label: 'Backpack', keyHint: 'I', icon: 'backpack', onClick: () => open('backpack') });
  if (phaseIndex >= 6) actions.push({ id: 'rover', label: pos?.inRover ? 'Get out' : 'Rover', keyHint: 'R', icon: 'rover', onClick: () => engineRef.current?.toggleRover() });
  if (phaseIndex >= 7) actions.push({ id: 'lab', label: 'Lab', keyHint: 'U', icon: 'lab', onClick: () => { setResearchTab('research'); open('research'); } });
  actions.push({ id: 'menu', label: 'Menu', keyHint: 'Esc', icon: 'menu', onClick: () => open('pause') });

  const jobs: { id: string; icon: string; label: string; coins: number; onClick: () => void }[] = [];
  if (onSurface && tutorialDone) {
    const blds = save.simulation.buildings;
    const dusty = blds.filter((b) => b.recipeId === 'solar_panel' && b.dustAccumulation > 25).sort((a, b) => b.dustAccumulation - a.dustAccumulation)[0];
    if (dusty) jobs.push({ id: 'scrub', icon: '🧽', label: 'Clean a panel', coins: CHORE_COINS.scrub, onClick: () => engineRef.current?.goUse(dusty.instanceId) });
    const gh = blds.find((b) => b.recipeId === 'greenhouse');
    if (gh && ((gh.growth ?? 0) >= 100 || Date.now() - lastWaterRef.current > 30000))
      jobs.push({ id: 'garden', icon: (gh.growth ?? 0) >= 100 ? '🍅' : '💧', label: (gh.growth ?? 0) >= 100 ? 'Pick crops' : 'Water garden', coins: (gh.growth ?? 0) >= 100 ? CHORE_COINS.garden : 4, onClick: () => engineRef.current?.goUse(gh.instanceId) });
    const bat = blds.find((b) => b.recipeId === 'battery');
    const pf = r.powerCapacity > 0 ? r.powerStored / r.powerCapacity : 1;
    if (bat && pf < 0.7) jobs.push({ id: 'wires', icon: '⚡', label: 'Fix power line', coins: CHORE_COINS.wires, onClick: () => engineRef.current?.goUse(bat.instanceId) });
  }
  const alertCount = save.simulation.activeEvents.filter((e) => e.active).length;
  const phaseLetters = save.phases.map((p, i) => ({ letter: p.letter, done: i < phaseIndex || (i === phaseIndex && save.progress.campaignComplete), current: i === phaseIndex && !save.progress.campaignComplete }));
  const scansTotal = useMemo(() => new Set(save.progress.scanLog.map((s) => s.id)).size, [save.progress.scanLog]);

  // ---------------------------------------------------------------- render
  const playing = screen === 'playing';
  const inFlight = playing && !onSurface;
  const touchScreen = useCoarsePointer();
  const touchMove = useCallback((x: number, y: number) => engineRef.current?.setTouchMove(x, y), []);

  return (
    <div className="relative w-full h-screen h-dvh overflow-hidden bg-moon-bg text-moon-text">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block z-0 touch-none" data-testid="lunar-game-canvas" aria-label="Moon surface. Use W A S D to walk, or click the ground." />

      {screen === 'title' && (
        <div className="absolute inset-0 z-30">
          <TitleScreen
            hasExistingSave={hasExistingSave}
            onNewGame={() => startNewGame()}
            onContinue={resumeGame}
            onOpenShop={() => open('shop')}
            onOpenCodex={() => open('codex')}
            onOpenRecords={() => open('records')}
            onOpenMultiplayer={() => open('multiplayer')}
            onOpenSettings={() => open('settings')}
            onOpenNasaData={() => open('nasa')}
          />
        </div>
      )}

      {inFlight && (
        <FlightConsole
          key={`${phaseIndex}-${flightKey}`}
          phase={save.phases[phaseIndex]}
          flags={save.progress.flags}
          avatarId={save.avatarId}
          reducedMotion={reducedMotion}
          inputEnabled={!blocked}
          onFlight={(id) => dispatch({ type: 'flight', objective: id })}
          onSelectAvatar={(id) => dispatch({ type: 'selectAvatar', avatarId: id })}
          onCoins={(key, coins) => dispatch({ type: 'bonus', dollars: coins, key: `flight:${key}`, reason: 'Flight bonus' })}
          onMenu={() => open('pause')}
        />
      )}

      {playing && onSurface && touchScreen && !blocked && (
        <TouchControls onMove={touchMove} onUse={() => engineRef.current?.interact()} />
      )}

      {playing && onSurface && top !== 'liftoff' && (
        <GameHud
          guide={guide}
          hint={hint}
          onHint={() => setHintLevel((h) => Math.min(2, h + 1))}
          onOpenMission={() => open('steps')}
          onSkipTutorial={!tutorialDone ? skipIntro : undefined}
          gauges={gauges}
          materials={materials}
          spaceDollars={save.spaceDollars}
          actions={actions}
          alertCount={alertCount}
          onOpenAlerts={() => {
            setResearchTab('alerts');
            open('research');
          }}
          dayNight={save.simulation.sunlightIntensity > 0.3 ? 'day' : 'night'}
          doseLabel={radiation && phaseIndex >= 6 ? `${radiation.crewDoseMSv.toFixed(1)} mSv` : undefined}
          stormLabel={storm && storm.phase !== 'debrief' ? `${storm.event.flareClass} solar storm ${storm.phase === 'active' ? 'now' : 'coming'}` : undefined}
          isMuted={isMuted}
          onToggleMute={toggleMute}
          phaseLetters={phaseLetters}
          jobs={jobs}
        />
      )}

      {playing && onSurface && note && (
        <ScienceNote
          note={note}
          onClose={() => setNote(null)}
          onMore={() => {
            const entry = MISSION_KNOWLEDGE_ENTRIES.find((e) => e.id === note.id) || null;
            setKnowledgeEntry(entry);
            setNote(null);
            open('knowledge');
          }}
        />
      )}

      {playing && storm && storm.phase !== 'debrief' && !(storm.phase === 'warning' && !storm.choice) && <StormStatusBanner storm={storm} />}
      {stormModal && storm?.phase === 'warning' && !storm.choice && (
        <StormAlertModal
          storm={storm}
          options={getStormOptions(storm.event, save.simulation.buildings.filter((b) => b.status !== 'constructing').map((b) => b.recipeId), save.inventory, save.avatarId)}
          onChoose={handleStormChoice}
          onOpenSources={() => open('nasa')}
        />
      )}
      {stormModal && storm?.phase === 'debrief' && radiation && !radiation.missionOver && (
        <StormDebriefModal
          storm={storm}
          crewDose={radiation.crewDoseMSv}
          onClose={() => {
            const s = saveRef.current;
            commit({ ...s, simulation: acknowledgeStormDebrief(s.simulation) });
          }}
          onOpenSources={() => open('nasa')}
        />
      )}
      {stormModal && radiation?.missionOver && (
        <MissionOverModal
          dose={radiation.crewDoseMSv}
          stormsSurvived={radiation.stormCount}
          daysSurvived={save.simulation.stats.daysSurvived}
          onNewMission={() => startNewGame(true)}
          onExit={exitToTitle}
        />
      )}

      <ToastStack toasts={toasts} />

      {/* ---------------- overlays ---------------- */}
      <BuildModal
        isOpen={top === 'build'}
        onClose={() => close('build')}
        inventory={save.inventory}
        spaceDollars={save.spaceDollars}
        avatarId={save.avatarId}
        unlockedBlueprints={save.unlockedBlueprints}
        onSelectBuildingToPlace={(recipeId) => {
          close('build');
          engineRef.current?.setGhostBuilding(recipeId);
          pushToast('Click the ground (or press E) to place it. Esc cancels.');
        }}
      />
      <ResearchModal
        isOpen={top === 'research'}
        initialTab={researchTab}
        onClose={() => close('research')}
        researchData={save.inventory.researchData || 0}
        researchedNodeIds={save.researchedNodeIds || []}
        unlockedBlueprints={save.unlockedBlueprints}
        activeEvents={save.simulation.activeEvents}
        powerSaverMode={Boolean(save.simulation.powerSaverMode)}
        onUnlockResearch={handleUnlockResearch}
        onSolveProblem={handleSolveProblem}
        onTogglePowerSaver={() => {
          const s = saveRef.current;
          commit({ ...s, simulation: { ...s.simulation, powerSaverMode: !s.simulation.powerSaverMode } });
        }}
      />
      <ShopModal
        isOpen={top === 'shop'}
        onClose={() => close('shop')}
        spaceDollars={save.spaceDollars}
        unlockedAvatars={save.unlockedAvatars}
        unlockedPets={save.unlockedPets}
        unlockedEmotes={save.unlockedEmotes}
        currentAvatarId={save.avatarId}
        currentPetId={save.petId}
        onPurchaseAvatar={(id, price) => buy('unlockedAvatars', id, price, { avatarId: id }, 'New specialist unlocked')}
        onSelectAvatar={(id) => commit({ ...saveRef.current, avatarId: id })}
        onPurchasePet={(id, price) => buy('unlockedPets', id, price, { petId: id }, 'New companion adopted')}
        onSelectPet={(id) => commit({ ...saveRef.current, petId: id })}
        onPurchaseEmote={(id, price) => buy('unlockedEmotes', id, price, { equippedEmotes: [...saveRef.current.equippedEmotes, id] }, 'New emote unlocked')}
      />
      <InventoryModal isOpen={top === 'backpack'} onClose={() => close('backpack')} inventory={save.inventory} />
      <KnowledgeModal
        isOpen={top === 'knowledge'}
        entry={knowledgeEntry}
        alreadySolved={knowledgeEntry ? save.completedChallengeIds.includes(knowledgeEntry.id) : false}
        onClose={() => close('knowledge')}
        onSolved={(entryId, rewardDollars, rewardResearchData, rewardResource) => {
          const s = saveRef.current;
          if (s.completedChallengeIds.includes(entryId)) return; // each reward once
          const inv = { ...s.inventory };
          const data = Math.round(rewardResearchData * researchMultiplier(s.avatarId));
          inv.researchData = (inv.researchData || 0) + data;
          if (rewardResource) inv[rewardResource.resource] = (inv[rewardResource.resource] || 0) + rewardResource.amount;
          const entry = MISSION_KNOWLEDGE_ENTRIES.find((e) => e.id === entryId);
          commit({
            ...s,
            spaceDollars: s.spaceDollars + rewardDollars,
            inventory: inv,
            unlockedBlueprints: entry?.unlocksBlueprint ? Array.from(new Set([...s.unlockedBlueprints, entry.unlocksBlueprint])) : s.unlockedBlueprints,
            unlockedCodexIds: entry?.unlocksCodexId ? Array.from(new Set([...(s.unlockedCodexIds || []), entry.unlocksCodexId])) : s.unlockedCodexIds,
            completedChallengeIds: [...s.completedChallengeIds, entryId],
            records: s.records
              ? { ...s.records, totalChallengesSolved: (s.records.totalChallengesSolved || 0) + 1, totalSpaceDollarsEarned: (s.records.totalSpaceDollarsEarned || 0) + rewardDollars }
              : s.records,
          });
          sound.playVictory();
          pushToast(`Correct! +S✦${rewardDollars} and +${data} research data`, 'good');
        }}
      />
      <CodexModal isOpen={top === 'codex'} onClose={() => close('codex')} unlockedCodexIds={screen === 'title' ? undefined : save.unlockedCodexIds} />
      <SaveModal
        isOpen={top === 'save'}
        onClose={() => close('save')}
        currentSave={save}
        onLoadSave={(loaded) => {
          applyLoaded(loaded);
          pushToast(`Loaded ${loaded.campaignName}`);
        }}
        onSaveToSlot={(slotId, name) => {
          const updated = { ...saveRef.current, slotId, campaignName: name };
          commit(updated);
          void saveGameToDb(updated).then((ok) => pushToast(ok ? 'Game saved' : 'Could not save', ok ? 'good' : 'warn'));
        }}
      />
      <SettingsModal
        isOpen={top === 'settings'}
        onClose={() => close('settings')}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        volume={volume}
        onVolume={setVolume}
        reducedMotion={reducedMotion}
        onReducedMotion={setReducedMotion}
        highContrast={highContrast}
        onHighContrast={setHighContrast}
        onReplayIntro={playing && onSurface ? replayIntro : undefined}
        onOpenShop={playing ? () => open('shop') : undefined}
        spaceDollars={playing ? save.spaceDollars : undefined}
      />
      <EmoteWheel
        isOpen={top === 'emote'}
        onClose={() => close('emote')}
        unlockedEmotes={save.equippedEmotes}
        onSelectEmote={(icon) => {
          engineRef.current?.triggerEmote(icon);
          if (mpRef.current?.isConnected) mpRef.current.sendEmote(icon);
        }}
      />
      <MultiplayerModal
        isOpen={top === 'multiplayer'}
        onClose={() => close('multiplayer')}
        isConnected={mpConnected}
        activeRoomId={activeRoomId}
        onJoinRoom={(roomId, name) => {
          setActiveRoomId(roomId);
          mpRef.current?.connect(roomId, name, save.avatarId);
          close('multiplayer');
          if (screen === 'title') void resumeGame();
        }}
      />
      <PauseModal
        isOpen={top === 'pause'}
        multiplayer={mpConnected}
        missionName={guide.title}
        onResume={() => close('pause')}
        onRestart={restartMission}
        onSave={() => void persist(false)}
        onOpenRecords={() => open('records')}
        onOpenSettings={() => open('settings')}
        onOpenControls={() => open('controls')}
        onExitToTitle={exitToTitle}
      />
      <MissionRecordsModal isOpen={top === 'records'} onClose={() => close('records')} records={save.records || createNewGameSave().records!} daysSurvived={save.simulation.stats.daysSurvived} />
      <NasaDataModal isOpen={top === 'nasa'} onClose={() => close('nasa')} feed={spaceFeed} />

      {top === 'steps' && <MissionSteps guide={guide} onClose={() => close('steps')} />}
      {top === 'controls' && <ControlsCard onClose={() => close('controls')} />}
      {top === 'task' && taskKind && (
        <TaskOverlay
          kind={taskKind}
          onClose={() => {
            setTaskKind(null);
            close('task');
          }}
          onSuccess={() => {
            dispatch({ type: 'activate', recipeId: taskKind });
            setTaskKind(null);
            close('task');
          }}
        />
      )}
      {top === 'chore' && chore && (
        <ChoreOverlay
          kind={chore.kind}
          growth={save.simulation.buildings.find((b) => b.instanceId === chore.instanceId)?.growth ?? 0}
          waterCooldown={Math.max(0, 30 - (Date.now() - lastWaterRef.current) / 1000)}
          reducedMotion={reducedMotion}
          onClose={() => {
            setChore(null);
            close('chore');
          }}
          onPicked={() => {
            dispatch({ type: 'harvest', instanceId: chore.instanceId });
            choreCoinsRef.current = CHORE_COINS.garden;
          }}
          onWatered={() => {
            lastWaterRef.current = Date.now();
            dispatch({ type: 'water', instanceId: chore.instanceId });
            if (!choreCoinsRef.current) choreCoinsRef.current = 4;
          }}
          onDone={() => {
            const c = chore;
            if (c.kind === 'scrub') {
              dispatch({ type: 'cleanDust', instanceId: c.instanceId });
              dispatch({ type: 'bonus', dollars: CHORE_COINS.scrub, reason: 'Panel sparkling' });
            } else if (c.kind === 'wires') {
              dispatch({ type: 'boostPower', fraction: 0.4 });
              dispatch({ type: 'bonus', dollars: CHORE_COINS.wires, reason: 'Power flowing' });
            } else {
              dispatch({ type: 'bonus', dollars: choreCoinsRef.current || 4, reason: 'Garden tended' });
            }
            choreCoinsRef.current = 0;
            setChore(null);
            close('chore');
          }}
        />
      )}
      {top === 'celebration' && reward && (
        <MissionCelebration reward={reward} nextName={reward.campaignComplete ? undefined : save.phases[save.currentPhaseIndex]?.name} onContinue={continueAfterCelebration} />
      )}
      {top === 'liftoff' && <LiftoffBar caption={liftoffCaption} onSkip={() => engineRef.current?.skipLiftoff()} />}
      {top === 'finale' && (
        <Finale
          crewName={save.campaignName}
          badges={save.progress.badges.length}
          seconds={Math.round(save.progress.totalActiveSeconds)}
          buildings={save.simulation.buildings.length}
          scans={scansTotal}
          onExplore={() => leaveFinale(false)}
          onTitle={() => leaveFinale(true)}
        />
      )}
      {top === 'confirm' && confirmState && (
        <ConfirmDialog
          title={confirmState.title}
          text={confirmState.text}
          confirm={confirmState.confirm}
          onCancel={() => {
            setConfirmState(null);
            close('confirm');
          }}
          onConfirm={() => {
            const run = confirmState.run;
            setConfirmState(null);
            close('confirm');
            run();
          }}
        />
      )}
    </div>
  );
}
