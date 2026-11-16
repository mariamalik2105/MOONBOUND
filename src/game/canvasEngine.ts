/**
 * MOONBOUND canvas engine: the lunar world, the astronaut, the rover and the
 * companion. React owns the game state; the engine owns moment-to-moment play
 * (movement, collisions, click-to-walk, interaction prompts, effects) and
 * reports gameplay events through callbacks.
 *
 * Nothing here re-renders React per frame: prompts, markers and labels are
 * drawn on the canvas, and callbacks fire only on real events.
 */

import { sound } from './audio';
import { AVATARS, BUILDING_RECIPES } from './economy';
import { PlacedBuilding } from './simulation';
import type { TargetSpec } from './progression';
import {
  BASE_CENTER,
  BASE_RADIUS,
  BOULDERS,
  COLD_TRAP,
  GRID,
  LADDER,
  LANDER,
  NODE_DEFS,
  NodeDef,
  ROVER_PARK,
  WORLD,
  ZONE_NAMES,
  ellipseInside,
  sunFactorAt,
  zoneAt,
} from './world';
import {
  CHUNK,
  PAL,
  UI_FONT,
  bakeTerrainChunk,
  drawAstronaut,
  drawBoulder,
  drawBuilding,
  drawCompanion,
  drawLander,
  drawLanderAscent,
  drawNode,
  drawPrompt,
  drawRover,
  drawShadow,
  roundRect,
  tag,
} from './artwork';

export interface ResourceNode extends NodeDef {
  usesLeft: number;
  revealed: boolean;
  /** Supply drops carry a bundle instead of one material. */
  contents?: Record<string, number>;
}

export interface RemotePlayerState {
  id: string;
  name: string;
  avatarId: string;
  x: number;
  y: number;
  direction: 'up' | 'down' | 'left' | 'right';
  isMoving: boolean;
  isInRover: boolean;
  emote?: string;
  emoteTimer?: number;
}

export interface GameEngineCallbacks {
  onCollect: (node: ResourceNode, usesLeft: number) => void;
  onScan: (newlyScanned: ResourceNode[], allInRange: ResourceNode[]) => void;
  onBuildPlaced: (recipeId: string, x: number, y: number, sunFactor: number) => void;
  onSetupRequest: (building: PlacedBuilding) => void;
  onCleanDust: (building: PlacedBuilding) => void;
  onHarvest: (building: PlacedBuilding) => void;
  /** Battery: open the fix-the-power-line puzzle */
  onFixPower?: (building: PlacedBuilding) => void;
  onBoardRover: () => void;
  onWalkedOffLander: () => void;
  onZoneChanged?: (zoneId: string, zoneName: string) => void;
  onPlayerMoved?: (x: number, y: number, dir: string, moving: boolean, inRover: boolean) => void;
  onDistanceTraveled?: (distanceMeters: number, inRover: boolean) => void;
  onPlacementEnded?: () => void;
}

export interface EngineStage {
  phaseIndex: number;
  tutorialStep: number;
  scanEnabled: boolean;
  roverUnlocked: boolean;
  badges: string[];
}

type Facing = 'up' | 'down' | 'left' | 'right';

interface Interactable {
  id: string;
  kind: 'node' | 'building' | 'rover';
  x: number;
  y: number;
  /** Anchor for the prompt bubble */
  promptY: number;
  range: number;
  key: string | null;
  label: string;
  work: number;
  enabled: boolean;
  pickRadius: number;
  run: () => void;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  color: string;
  size: number;
}

interface FloatText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

interface Mark {
  x: number;
  y: number;
  a: number;
  age: number;
  kind: 'boot' | 'track';
  keep?: boolean;
}

const NAV = 16;
const PLAYER_R = 11;
const ROVER_R = 26;
const WALK_SPEED = 150;
const ROVER_MAX = 290;
const MAX_PARTICLES = 160;
const MAX_MARKS = 360;
const SCAN_RADIUS = 190;

/** End-of-campaign liftoff cutscene timeline (seconds). */
const CINE = { walk: 2.6, climb: 4.8, board: 5.4, count: 5.8, lift: 8.8, fadeOut: 13.2, end: 14 };
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeInOut = (k: number) => k * k * (3 - 2 * k);
/** Height of the ascent stage above the pad, `tau` seconds after ignition. */
const liftHeight = (tau: number) => (tau <= 0 ? 0 : 10 * tau + 42 * tau * tau);

function approach(cur: number, target: number, step: number) {
  if (cur < target) return Math.min(target, cur + step);
  return Math.max(target, cur - step);
}

function angleDiff(a: number, b: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function isTypingTarget(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export class MoonboundEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: GameEngineCallbacks;
  private raf = 0;
  private running = false;
  private lastTime = 0;
  private time = 0;
  private dpr = 1;
  private screenW = 800;
  private screenH = 600;

  private paused = false;
  private inputEnabled = false;
  private reducedMotion = false;
  private keys = new Set<string>();
  /** On-screen thumbstick (touch screens), -1..1 per axis. */
  private touchMove = { x: 0, y: 0 };
  /** Small screens zoom out so more of the map fits. */
  private baseZoom = 1;
  private lastTapTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true;

  public camera = { x: LADDER.x, y: LADDER.y, zoom: 1 };
  private cameraOverride: { x: number; y: number; zoom: number } | null = null;
  private shake = 0;

  public player = {
    x: LADDER.x,
    y: LADDER.y,
    vx: 0,
    vy: 0,
    facing: 'down' as Facing,
    phase: 0,
    stepIndex: 0,
    isInRover: false,
    suitColor: '#ea580c',
    avatarId: 'engineer',
    petId: 'rocky',
    working: 0,
    workTotal: 0,
    activeEmote: '',
    emoteTimer: 0,
  };

  public rover = { x: ROVER_PARK.x, y: ROVER_PARK.y, heading: ROVER_PARK.heading, speed: 0, wheel: 0, trackDist: 0 };
  private pet = { x: LADDER.x - 30, y: LADDER.y + 10, hop: 0, phase: 0, mood: null as string | null, moodTimer: 0, look: 0 };

  public placedBuildings: PlacedBuilding[] = [];
  public resourceNodes: ResourceNode[] = [];
  public remotePlayers: Map<string, RemotePlayerState> = new Map();
  private remoteDisplay = new Map<string, { x: number; y: number; phase: number }>();
  public scannedNodeIds = new Set<string>();
  public sunlightIntensity = 1;
  public powerCharge = 0.8;
  public stormLevel: 0 | 1 | 2 = 0;
  public shelterLocked = false;

  private stage: EngineStage = { phaseIndex: 0, tutorialStep: 0, scanEnabled: false, roverUnlocked: false, badges: [] };
  private target: TargetSpec | null = null;
  private targetEmphasis = 0;

  private particles: Particle[] = [];
  private texts: FloatText[] = [];
  private marks: Mark[] = [];
  private lastMarkX = LADDER.x;
  private lastMarkY = LADDER.y;
  private scanWave = -1;

  // Click-to-move
  private path: { x: number; y: number }[] = [];
  private dest: { x: number; y: number; age: number } | null = null;
  private noReach: { x: number; y: number; age: number } | null = null;
  private pendingInteract: string | null = null;
  private stuckTime = 0;
  private repathed = false;

  // Building placement
  public buildGhostRecipeId: string | null = null;
  private ghostByKeys = false;
  private mouseWorld = { x: 0, y: 0 };
  private mouseOverCanvas = false;
  private lastMouseMove = 0;
  private ghostValid = false;
  private ghostReason = '';

  // Navigation grid
  private navW = Math.ceil((WORLD.maxX - WORLD.minX) / NAV);
  private navH = Math.ceil((WORLD.maxY - WORLD.minY) / NAV);
  private blocked = new Uint8Array(this.navW * this.navH);
  private navSig = '';

  // Misc
  private chunkCache = new Map<string, HTMLCanvasElement>();
  private chunkScale = 1;
  private appearAt = new Map<string, number>();
  private focus: Interactable | null = null;
  private zoneId = 'zone_landing';
  private distAcc = 0;
  private distFlush = 0;
  private moveSend = 0;
  private walkedOffSent = false;
  private dishAngle = -1.2;
  private settleUntil = 0;

  // End-of-campaign liftoff cutscene
  private cine: {
    t: number;
    from: { x: number; y: number };
    onDone: () => void;
    onCaption?: (text: string) => void;
    caption: string;
    beeps: number;
    roared: boolean;
  } | null = null;
  /** After the cutscene the cabin has flown home: only the descent stage stays, and the crew is aboard. */
  private ascentGone = false;
  private playerAlpha = 1;
  private petAlpha = 1;
  private fadeInFrom = 0;

  constructor(canvas: HTMLCanvasElement, callbacks: GameEngineCallbacks) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D canvas context');
    this.ctx = ctx;
    this.callbacks = callbacks;
    this.resetWorld();
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onBlur);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('pointerdown', this.onMouseDown);
    canvas.addEventListener('mouseenter', this.onMouseEnter);
    canvas.addEventListener('mouseleave', this.onMouseLeave);
    canvas.addEventListener('contextmenu', this.onContextMenu);
    this.onResize();
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  public start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      // rAF timestamps can be slightly older than performance.now(); never step backwards
      const dt = Math.max(0, Math.min(0.05, (now - this.lastTime) / 1000));
      this.lastTime = Math.max(this.lastTime, now);
      if (!this.paused && dt > 0) {
        this.time += dt;
        this.update(dt);
      }
      this.render();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  public stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  public destroy() {
    this.stop();
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onBlur);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('pointerdown', this.onMouseDown);
    this.canvas.removeEventListener('mouseenter', this.onMouseEnter);
    this.canvas.removeEventListener('mouseleave', this.onMouseLeave);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
  }

  /** Stops movement, animation and timers (single-player pause). The last frame stays on screen. */
  public setPaused(p: boolean) {
    if (p === this.paused) return;
    this.paused = p;
    if (p) this.releaseInput();
    this.lastTime = performance.now();
  }

  /** Overlays and menus turn input off; held keys are released immediately. */
  public setInputEnabled(on: boolean) {
    if (on === this.inputEnabled) return;
    this.inputEnabled = on;
    if (!on) this.releaseInput();
  }

  public setReducedMotion(on: boolean) {
    this.reducedMotion = on;
  }

  public setStage(stage: EngineStage) {
    this.stage = stage;
    this.walkedOffSent = stage.tutorialStep > 0;
  }

  public setMissionTarget(target: TargetSpec | null, emphasis = 0) {
    this.target = target;
    this.targetEmphasis = emphasis;
  }

  public setCameraOverride(o: { x: number; y: number; zoom: number } | null) {
    this.cameraOverride = o;
  }

  // -------------------------------------------------------------------------
  // Liftoff cutscene (campaign finale)
  // -------------------------------------------------------------------------

  /**
   * Plays the ending: the astronaut walks to the lander, climbs the ladder,
   * the companion hops in, a countdown runs and the cabin lifts off.
   * `onDone` fires once at the end (or on skip). Input should stay off.
   */
  public playLiftoff(onDone: () => void, onCaption?: (text: string) => void) {
    this.releaseInput();
    this.buildGhostRecipeId = null;
    this.focus = null;
    const p = this.player;
    p.isInRover = false;
    p.working = 0;
    this.workDone = null;
    // start a short walk from a clear spot near the ladder
    const candidates = [
      [0, 110],
      [-85, 85],
      [85, 85],
      [-120, 15],
      [120, 15],
      [0, 55],
    ];
    let from = { x: LADDER.x, y: LADDER.y + 110 };
    for (const [dx, dy] of candidates) {
      const x = LADDER.x + dx;
      const y = LADDER.y + dy;
      let clear = true;
      for (let i = 0; i <= 10 && clear; i++) {
        const k = (i / 10) * 0.9;
        if (this.collides(x + (LADDER.x - x) * k, y + (LADDER.y - y) * k, PLAYER_R, true)) clear = false;
      }
      if (clear) {
        from = { x, y };
        break;
      }
    }
    p.x = from.x;
    p.y = from.y;
    p.vx = p.vy = 0;
    this.pet.x = from.x - 30;
    this.pet.y = from.y + 14;
    this.playerAlpha = 1;
    this.petAlpha = 1;
    this.ascentGone = false;
    this.fadeInFrom = 0;
    this.cameraOverride = { x: LADDER.x, y: LADDER.y - 30, zoom: 1.3 };
    // we fade in from black, so snap the camera instead of sliding across the map
    this.camera.x = (from.x + LADDER.x) / 2;
    this.camera.y = (from.y + LADDER.y) / 2 - 30;
    this.camera.zoom = 1.3;
    this.cine = { t: 0, from, onDone, onCaption, caption: '', beeps: 0, roared: false };
    this.setCaption('Your base runs on its own now. Time to fly home!');
  }

  public isPlayingLiftoff() {
    return this.cine !== null;
  }

  /** Jumps to the end of the cutscene (fires its `onDone`). */
  public skipLiftoff() {
    if (this.cine) this.finishLiftoff();
  }

  /** Puts the cabin back on the lander and the crew at the ladder (after the finale). */
  public resetLiftoff() {
    if (!this.cine && !this.ascentGone) return;
    this.cine = null;
    this.ascentGone = false;
    this.playerAlpha = 1;
    this.petAlpha = 1;
    this.fadeInFrom = performance.now();
    this.particles = [];
    this.shake = 0;
    const p = this.player;
    p.x = LADDER.x;
    p.y = LADDER.y + 8;
    p.vx = p.vy = 0;
    p.facing = 'down';
    this.pet.x = p.x - 34;
    this.pet.y = p.y + 8;
    this.cameraOverride = null;
    this.camera.x = p.x;
    this.camera.y = p.y - 20;
  }

  private setCaption(text: string) {
    const c = this.cine;
    if (!c || c.caption === text) return;
    c.caption = text;
    c.onCaption?.(text);
  }

  private finishLiftoff() {
    const c = this.cine;
    if (!c) return;
    this.cine = null;
    this.ascentGone = true;
    this.playerAlpha = 0;
    this.petAlpha = 0;
    this.particles = [];
    this.shake = 0;
    this.fadeInFrom = performance.now();
    c.onDone();
  }

  private updateCinematic(dt: number) {
    const c = this.cine;
    if (!c) return;
    c.t += dt;
    const t = c.t;
    const p = this.player;
    const pet = this.pet;
    this.focus = null;
    this.path = [];
    this.dest = null;

    if (t < CINE.walk) {
      // walk to the foot of the ladder
      const k = easeInOut(clamp01(t / CINE.walk));
      const nx = c.from.x + (LADDER.x - c.from.x) * k;
      const ny = c.from.y + (LADDER.y - c.from.y) * k;
      const moved = Math.hypot(nx - p.x, ny - p.y);
      p.vx = (nx - p.x) / Math.max(dt, 0.001);
      p.vy = (ny - p.y) / Math.max(dt, 0.001);
      if (moved > 0.01) {
        if (Math.abs(p.vx) > Math.abs(p.vy) * 1.1) p.facing = p.vx > 0 ? 'right' : 'left';
        else p.facing = p.vy > 0 ? 'down' : 'up';
      }
      p.phase += moved / 17;
      p.x = nx;
      p.y = ny;
      this.updatePet(dt);
    } else {
      p.vx = p.vy = 0;
      p.facing = 'up';
      p.x = LADDER.x;
      // climb the rungs, one hand over the other
      const climbK = clamp01((t - CINE.walk) / (CINE.climb - CINE.walk));
      p.y = LADDER.y - 44 * climbK;
      if (climbK < 1) p.phase += dt * 7;
      this.playerAlpha = 1 - clamp01((t - CINE.climb) / (CINE.board - CINE.climb));
      // companion waits at the ladder, then takes one big low-gravity hop inside
      const jumpAt = CINE.climb + 0.1;
      if (t < jumpAt) {
        const k = 1 - Math.exp(-dt * 4);
        pet.x += (LADDER.x - 24 - pet.x) * k;
        pet.y += (LADDER.y + 6 - pet.y) * k;
        pet.hop = 0;
        pet.look = 1;
      } else {
        const k = clamp01((t - jumpAt) / 0.7);
        pet.x = LADDER.x - 24 + 24 * k;
        pet.y = LADDER.y + 6 - 52 * k;
        pet.hop = Math.sin(k * Math.PI) * 24;
        this.petAlpha = 1 - clamp01((k - 0.6) / 0.4);
      }
      if (t < CINE.climb) this.setCaption('Climbing the ladder to the cabin');
      else if (t < CINE.count) this.setCaption('Hatch closed. Everyone is aboard!');
    }

    if (t >= CINE.count && t < CINE.lift) {
      const n = Math.floor(t - CINE.count); // 0,1,2 -> "3","2","1"
      if (c.beeps <= n) {
        c.beeps = n + 1;
        sound.playCountdownBeep(false);
      }
      this.setCaption(`Ascent engine armed. Liftoff in ${3 - n}...`);
      this.cameraOverride = { x: LANDER.x, y: LANDER.y - 20, zoom: 1.15 };
      if (t > CINE.lift - 0.6) {
        this.shake = Math.max(this.shake, 1.5);
        if (Math.random() < 0.5) this.spawnLiftDust(1);
      }
    }

    if (t >= CINE.lift) {
      const tau = t - CINE.lift;
      if (!c.roared) {
        c.roared = true;
        sound.playCountdownBeep(true);
        sound.playLiftoff(CINE.end - CINE.lift);
      }
      this.setCaption(tau < 2.2 ? 'Liftoff! Heading home to Earth.' : 'The cabin flies home. The gold bottom half stays behind as a launch pad.');
      const h = liftHeight(tau);
      if (tau < 2.5) this.spawnLiftDust(Math.round(5 * (1 - tau / 2.5)) + 1);
      if (tau < 3.2) {
        const grow = 1 + Math.min(0.6, h / 1400);
        for (let i = 0; i < 2; i++) {
          if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
          this.particles.push({
            x: LANDER.x + (Math.random() - 0.5) * 8,
            y: LANDER.y,
            z: h + 4 * grow - 30 * Math.random(),
            vx: (Math.random() - 0.5) * 50,
            vy: (Math.random() - 0.5) * 20,
            vz: -60 - Math.random() * 80,
            life: 0.35 + Math.random() * 0.3,
            max: 0.65,
            color: Math.random() < 0.5 ? '#ffd38a' : '#ff9a5c',
            size: 2 + Math.random() * 2,
          });
        }
      }
      this.shake = Math.max(this.shake, 4 * clamp01(1 - tau / 2.5));
      const follow = this.reducedMotion ? 0 : Math.min(h, 520) * 0.7;
      this.cameraOverride = { x: LANDER.x, y: LANDER.y - 30 - follow, zoom: this.reducedMotion ? 1.1 : 1.15 - 0.2 * clamp01(tau / 3) };
    }

    if (t >= CINE.end) this.finishLiftoff();
  }

  private spawnLiftDust(n: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 120 + Math.random() * 150;
      if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
      this.particles.push({
        x: LANDER.x + Math.cos(a) * 26,
        y: LANDER.y + 10 + Math.sin(a) * 18,
        z: 2,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp * 0.7,
        vz: 10 + Math.random() * 30,
        life: 0.9 + Math.random() * 0.9,
        max: 1.8,
        color: Math.random() < 0.5 ? '#bdb6a8' : '#a39f95',
        size: 3 + Math.random() * 3,
      });
    }
  }

  private renderCinematicUI(ctx: CanvasRenderingContext2D, W: number, H: number) {
    const c = this.cine;
    if (c) {
      const t = c.t;
      const barFull = Math.min(H * 0.11, 84);
      const bar = Math.round(barFull * easeInOut(clamp01(t / 0.6)) * (1 - clamp01((t - CINE.fadeOut) / 0.6)));
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, bar);
      ctx.fillRect(0, H - bar, W, bar);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (c.caption && bar > barFull * 0.6) {
        ctx.fillStyle = PAL.text;
        const size = W < 520 ? 14 : 18;
        ctx.font = `bold ${size}px ${UI_FONT}`;
        ctx.fillText(c.caption, W / 2, H - bar / 2, W - 32);
      }
      if (t >= CINE.count && t < CINE.lift) {
        const n = Math.floor(t - CINE.count);
        const f = t - CINE.count - n;
        const size = Math.min(W, H) * 0.22 * (1.25 - 0.25 * Math.min(1, f * 3));
        ctx.globalAlpha = 1 - f * 0.7;
        ctx.font = `bold ${Math.round(size)}px ${UI_FONT}`;
        ctx.lineWidth = 8;
        ctx.strokeStyle = 'rgba(11,12,18,0.8)';
        ctx.strokeText(String(3 - n), W / 2, H * 0.36);
        ctx.fillStyle = PAL.target;
        ctx.fillText(String(3 - n), W / 2, H * 0.36);
        ctx.globalAlpha = 1;
      }
      if (t >= CINE.lift && t < CINE.lift + 1.8) {
        const f = (t - CINE.lift) / 1.8;
        ctx.globalAlpha = 1 - clamp01((f - 0.6) / 0.4);
        const size = Math.min(W * 0.14, H * 0.16) * (0.9 + 0.1 * Math.min(1, f * 4));
        ctx.font = `bold ${Math.round(size)}px ${UI_FONT}`;
        ctx.lineWidth = 8;
        ctx.strokeStyle = 'rgba(11,12,18,0.8)';
        ctx.strokeText('LIFTOFF!', W / 2, H * 0.3);
        ctx.fillStyle = PAL.ok;
        ctx.fillText('LIFTOFF!', W / 2, H * 0.3);
        ctx.globalAlpha = 1;
      }
      let black = 0;
      if (t < 0.6) black = 1 - t / 0.6;
      if (t > CINE.fadeOut) black = clamp01((t - CINE.fadeOut) / (CINE.end - CINE.fadeOut - 0.15));
      if (black > 0) {
        ctx.fillStyle = `rgba(0,0,0,${black})`;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.textBaseline = 'alphabetic';
    } else if (this.fadeInFrom) {
      const a = 1 - (performance.now() - this.fadeInFrom) / 700;
      if (a <= 0) this.fadeInFrom = 0;
      else {
        ctx.fillStyle = `rgba(0,0,0,${a})`;
        ctx.fillRect(0, 0, W, H);
      }
    }
  }

  private releaseInput() {
    this.keys.clear();
    this.touchMove = { x: 0, y: 0 };
    this.path = [];
    this.dest = null;
    this.pendingInteract = null;
    this.player.vx = 0;
    this.player.vy = 0;
  }

  /** Restores the world for a new game or a loaded save. */
  public resetWorld(state?: {
    nodeUses?: Record<string, number>;
    scannedNodeIds?: string[];
    world?: { px: number; py: number; inRover: boolean; rx: number; ry: number; rh: number };
  }) {
    const uses = state?.nodeUses || {};
    const scanned = new Set(state?.scannedNodeIds || []);
    this.scannedNodeIds = scanned;
    this.resourceNodes = NODE_DEFS.map((d) => ({
      ...d,
      usesLeft: uses[d.id] ?? d.uses,
      revealed: !d.hiddenUntilScanned || scanned.has(d.id),
    })).filter((n) => n.usesLeft > 0);
    const w = state?.world;
    this.player.x = w?.px ?? LADDER.x;
    this.player.y = w?.py ?? LADDER.y;
    this.player.isInRover = Boolean(w?.inRover);
    this.player.vx = this.player.vy = 0;
    this.rover.x = w?.rx ?? ROVER_PARK.x;
    this.rover.y = w?.ry ?? ROVER_PARK.y;
    this.rover.heading = w?.rh ?? ROVER_PARK.heading;
    this.rover.speed = 0;
    if (this.player.isInRover) {
      this.player.x = this.rover.x;
      this.player.y = this.rover.y;
    }
    this.pet.x = this.player.x - 34;
    this.pet.y = this.player.y + 8;
    this.camera.x = this.player.x;
    this.camera.y = this.player.y;
    this.marks = [];
    this.particles = [];
    this.texts = [];
    this.releaseInput();
    this.buildGhostRecipeId = null;
    this.walkedOffSent = false;
    this.zoneId = zoneAt(this.player.x, this.player.y);
    this.settleUntil = this.time + 0.4;
    this.appearAt.clear();
  }

  /** A crate for replaying the intro. It holds nothing, so rewards stay one-time. */
  public spawnPracticeCrate() {
    if (this.resourceNodes.some((n) => n.id === 'crate-practice' || n.id === 'crate-1')) return;
    const def = NODE_DEFS.find((n) => n.id === 'crate-1')!;
    this.resourceNodes.push({ ...def, id: 'crate-practice', name: 'Practice crate', usesLeft: 1, revealed: true });
  }

  public getWorldSnapshot() {
    return {
      px: Math.round(this.player.x),
      py: Math.round(this.player.y),
      inRover: this.player.isInRover,
      rx: Math.round(this.rover.x),
      ry: Math.round(this.rover.y),
      rh: this.rover.heading,
    };
  }

  public getPlayerPos() {
    return { x: this.player.x, y: this.player.y, inRover: this.player.isInRover };
  }

  public getRevealedIceIds() {
    return this.resourceNodes.filter((n) => n.type === 'waterIce' && n.revealed && n.usesLeft > 0).map((n) => n.id);
  }

  /** Material types that can still be collected somewhere on the map. */
  public availableNodeTypes(): Set<string> {
    return new Set(this.resourceNodes.filter((n) => n.usesLeft > 0 && n.revealed).map((n) => n.type));
  }

  public setAvatar(avatarId: string, suitColor: string) {
    this.player.avatarId = avatarId;
    this.player.suitColor = suitColor;
  }

  public setPet(petId: string) {
    this.player.petId = petId;
  }

  public triggerEmote(icon: string) {
    this.player.activeEmote = icon;
    this.player.emoteTimer = 3;
  }

  public petReact(mood: '!' | '♪' | '?') {
    this.pet.mood = mood;
    this.pet.moodTimer = 1.6;
  }

  public burst(x: number, y: number, color = PAL.target, count = 18) {
    if (this.reducedMotion) count = Math.min(count, 6);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const sp = 50 + Math.random() * 80;
      this.addParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp * 0.6, 60 + Math.random() * 60, 0.9, color, 2.5);
    }
  }

  public toast(x: number, y: number, text: string, color: string = PAL.text) {
    this.texts.push({ x, y, text, color, life: 1.8 });
    if (this.texts.length > 4) this.texts.shift();
  }

  /** A cargo crate from Earth, used when the map has run out of a material the mission needs. */
  public spawnSupplyCrate(contents: Record<string, number>) {
    const id = `drop-${Date.now()}`;
    const x = LADDER.x + 120 + Math.random() * 60;
    const y = LADDER.y + 40 + Math.random() * 40;
    this.resourceNodes.push({
      id,
      x,
      y,
      type: 'crate',
      name: 'Cargo from Earth',
      amount: 0,
      uses: 1,
      usesLeft: 1,
      revealed: true,
      oneTime: true,
      zoneId: 'zone_landing',
      contents,
    });
    this.burst(x, y, PAL.equip, 14);
    return { id, x, y };
  }

  // -------------------------------------------------------------------------
  // Input
  // -------------------------------------------------------------------------

  private onResize = () => {
    const rect = this.canvas.getBoundingClientRect();
    this.screenW = rect.width || window.innerWidth;
    this.screenH = rect.height || window.innerHeight;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const short = Math.min(this.screenW, this.screenH);
    this.baseZoom = short < 480 ? 0.72 : short < 700 ? 0.85 : 1;
    this.canvas.width = Math.round(this.screenW * this.dpr);
    this.canvas.height = Math.round(this.screenH * this.dpr);
    const scale = Math.min(2, this.dpr);
    if (scale !== this.chunkScale) {
      this.chunkScale = scale;
      this.chunkCache.clear();
    }
  };

  private onBlur = () => {
    this.keys.clear();
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (isTypingTarget(e.target)) return;
    if (!this.inputEnabled || this.paused) return;
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (e.repeat && !['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) return;
    this.keys.add(k);
    if (this.buildGhostRecipeId && (k === 'enter' || k === 'e')) {
      this.tryPlace();
      return;
    }
    if (k === 'e' || k === ' ') this.interact();
    else if (k === 'f') this.triggerScan();
    else if (k === 'r') this.toggleRover();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };

  private toWorld(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const z = this.camera.zoom;
    return { x: (sx - this.screenW / 2) / z + this.camera.x, y: (sy - this.screenH / 2) / z + this.camera.y };
  }

  private onMouseMove = (e: MouseEvent) => {
    const w = this.toWorld(e.clientX, e.clientY);
    this.mouseWorld = w;
    this.lastMouseMove = performance.now();
    this.ghostByKeys = false;
  };

  private onMouseEnter = () => {
    this.mouseOverCanvas = true;
  };

  private onMouseLeave = () => {
    this.mouseOverCanvas = false;
  };

  private onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  /** Walk to an object (building id, node id or 'rover') and use it, like clicking it. */
  goUse(id: string) {
    if (!this.inputEnabled || this.paused) return false;
    const it = this.interactables().find((i) => i.id === id && i.enabled);
    if (!it) return false;
    if (this.inRangeOf(it)) {
      this.runInteractable(it);
      return true;
    }
    this.pendingInteract = it.id;
    if (!this.navigateTo(it.x, it.y, it.range - 10)) {
      this.pendingInteract = null;
      this.cantReach(it.x, it.y);
      return false;
    }
    return true;
  }

  private onMouseDown = (e: PointerEvent) => {
    if (e.button !== 0 || !this.inputEnabled || this.paused) return;
    const w = this.toWorld(e.clientX, e.clientY);
    this.lastTapTouch = e.pointerType === 'touch';
    if (this.buildGhostRecipeId && this.lastTapTouch) {
      // touch has no hover: the first tap moves the preview, tapping the preview places it
      const r = this.ghostRect();
      const onGhost = r && w.x >= r.x - 6 && w.x <= r.x + r.w + 6 && w.y >= r.y - 6 && w.y <= r.y + r.h + 6;
      if (!onGhost) {
        this.mouseWorld = w;
        this.ghostByKeys = false;
        this.lastMouseMove = performance.now();
        return;
      }
      this.tryPlace();
      return;
    }
    this.mouseWorld = w;
    this.ghostByKeys = false;
    if (this.buildGhostRecipeId) {
      this.tryPlace();
      return;
    }
    if (this.shelterLocked) {
      this.lockedNotice();
      return;
    }
    // Clicked something you can use?
    const hit = this.interactables()
      .filter((it) => it.enabled && Math.hypot(it.x - w.x, it.y - w.y) < it.pickRadius)
      .sort((a, b) => Math.hypot(a.x - w.x, a.y - w.y) / a.pickRadius - Math.hypot(b.x - w.x, b.y - w.y) / b.pickRadius)[0];
    if (hit) {
      if (this.inRangeOf(hit)) {
        this.runInteractable(hit);
      } else {
        this.pendingInteract = hit.id;
        if (!this.navigateTo(hit.x, hit.y, hit.range - 10)) {
          this.pendingInteract = null;
          this.cantReach(w.x, w.y);
        }
      }
      return;
    }
    this.pendingInteract = null;
    if (!this.navigateTo(w.x, w.y, 0)) this.cantReach(w.x, w.y);
  };

  // -------------------------------------------------------------------------
  // Placement
  // -------------------------------------------------------------------------

  public setGhostBuilding(recipeId: string | null) {
    this.buildGhostRecipeId = recipeId;
    this.ghostByKeys = !this.mouseOverCanvas || performance.now() - this.lastMouseMove > 1500;
    if (recipeId) {
      this.path = [];
      this.dest = null;
    }
  }

  public isPlacing() {
    return Boolean(this.buildGhostRecipeId);
  }

  /** Returns true if a placement was cancelled (so Escape does not also open Pause). */
  public cancelPlacement(): boolean {
    if (!this.buildGhostRecipeId) return false;
    this.buildGhostRecipeId = null;
    this.callbacks.onPlacementEnded?.();
    return true;
  }

  private ghostRect() {
    const recipe = BUILDING_RECIPES[this.buildGhostRecipeId || ''];
    if (!recipe) return null;
    const w = recipe.width * GRID;
    const h = recipe.height * GRID;
    let cx: number;
    let cy: number;
    if (this.ghostByKeys) {
      const f = this.facingVector();
      cx = this.player.x + f.x * (w / 2 + 34);
      cy = this.player.y + f.y * (h / 2 + 34) - (f.y < 0 ? 10 : 0);
    } else {
      cx = this.mouseWorld.x;
      cy = this.mouseWorld.y;
    }
    const x = Math.round((cx - w / 2) / GRID) * GRID;
    const y = Math.round((cy - h / 2) / GRID) * GRID;
    return { x, y, w, h, recipe };
  }

  private validateGhost(r: { x: number; y: number; w: number; h: number }) {
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    if (r.x < WORLD.minX || r.y < WORLD.minY || r.x + r.w > WORLD.maxX || r.y + r.h > WORLD.maxY) return 'Outside the map';
    if (Math.hypot(cx - BASE_CENTER.x, cy - BASE_CENTER.y) > BASE_RADIUS) return 'Too far from the base';
    if (ellipseInside(cx, cy, COLD_TRAP, 1.1)) return 'Too dark and cold here';
    for (const b of this.placedBuildings) {
      const br = BUILDING_RECIPES[b.recipeId];
      const bw = (br?.width || 2) * GRID;
      const bh = (br?.height || 2) * GRID;
      if (r.x < b.x + bw + 4 && r.x + r.w + 4 > b.x && r.y < b.y + bh + 4 && r.y + r.h + 4 > b.y) return 'Something is already here';
    }
    if (this.rectHitsCircle(r, LANDER.x, LANDER.y, LANDER.r + 8)) return 'Too close to the lander';
    if (this.rectHitsCircle(r, this.player.x, this.player.y, PLAYER_R + 4)) return 'You are standing there. Step aside first';
    if (this.stage.roverUnlocked && !this.player.isInRover && this.rectHitsCircle(r, this.rover.x, this.rover.y, ROVER_R)) return 'The rover is parked there';
    for (const b of BOULDERS) if (this.rectHitsCircle(r, b.x, b.y, b.r)) return 'A boulder is in the way';
    for (const n of this.resourceNodes) if (n.revealed && this.rectHitsCircle(r, n.x, n.y, 12)) return 'Collect that rock first';
    return '';
  }

  private tryPlace() {
    const g = this.ghostRect();
    if (!g || !this.buildGhostRecipeId) return;
    const reason = this.validateGhost(g);
    if (reason) {
      sound.playClick();
      this.toast(g.x + g.w / 2, g.y - 10, reason, PAL.warn);
      return;
    }
    const sun = sunFactorAt(g.x + g.w / 2, g.y + g.h / 2);
    const id = this.buildGhostRecipeId;
    this.buildGhostRecipeId = null;
    this.callbacks.onBuildPlaced(id, g.x, g.y, Math.round(sun * 100) / 100);
    this.callbacks.onPlacementEnded?.();
  }

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  private lockedNotice() {
    this.toast(this.player.x, this.player.y - 60, 'Sheltering from the storm. Wait it out.', '#fda4af');
  }

  public triggerScan() {
    if (!this.stage.scanEnabled) return;
    if (this.shelterLocked) return this.lockedNotice();
    if (this.player.working > 0) return;
    sound.playScan();
    this.scanWave = 0;
    if (!this.reducedMotion) this.shake = 2;
    const r = SCAN_RADIUS * (this.player.avatarId === 'explorer' ? 1.3 : 1);
    const inRange = this.resourceNodes.filter((n) => Math.hypot(n.x - this.player.x, n.y - this.player.y) <= r);
    const fresh: ResourceNode[] = [];
    for (const n of inRange) {
      if (!n.revealed) {
        n.revealed = true;
        this.burst(n.x, n.y, PAL.ice, 10);
      }
      if (!this.scannedNodeIds.has(n.id)) {
        this.scannedNodeIds.add(n.id);
        fresh.push(n);
      }
    }
    if (inRange.length === 0) {
      this.toast(this.player.x, this.player.y - 60, 'Nothing close enough to scan', '#cfcac0');
    } else if (fresh.length === 0) {
      this.toast(this.player.x, this.player.y - 60, 'Already scanned these', '#cfcac0');
    } else {
      for (const n of fresh) this.toast(n.x, n.y - 24, n.type === 'waterIce' ? 'Ice found!' : 'Scanned', n.type === 'waterIce' ? PAL.ice : PAL.accent);
      this.petReact(fresh.some((n) => n.type === 'waterIce') ? '!' : '?');
    }
    this.callbacks.onScan(fresh, inRange);
  }

  public toggleRover() {
    if (!this.stage.roverUnlocked) return;
    if (this.shelterLocked) return this.lockedNotice();
    if (this.player.working > 0) return;
    if (this.player.isInRover) {
      if (Math.abs(this.rover.speed) > 40) {
        this.toast(this.player.x, this.player.y - 50, 'Stop the rover first (S)', '#cfcac0');
        return;
      }
      // step out on whichever side is free
      const side = { x: -Math.sin(this.rover.heading), y: Math.cos(this.rover.heading) };
      const spots = [
        { x: this.rover.x + side.x * 40, y: this.rover.y + side.y * 40 },
        { x: this.rover.x - side.x * 40, y: this.rover.y - side.y * 40 },
        { x: this.rover.x - Math.cos(this.rover.heading) * 46, y: this.rover.y - Math.sin(this.rover.heading) * 46 },
      ];
      const spot = spots.find((s) => !this.collides(s.x, s.y, PLAYER_R, true)) || spots[0];
      this.player.isInRover = false;
      this.rover.speed = 0;
      this.player.x = spot.x;
      this.player.y = spot.y;
      this.pet.x = spot.x - 20;
      this.pet.y = spot.y + 10;
      this.path = [];
      this.dest = null;
      sound.playClick();
      return;
    }
    const d = Math.hypot(this.rover.x - this.player.x, this.rover.y - this.player.y);
    if (d > 70) {
      this.toast(this.player.x, this.player.y - 50, 'Walk closer to the rover', '#cfcac0');
      return;
    }
    this.player.isInRover = true;
    this.player.vx = this.player.vy = 0;
    this.path = [];
    this.dest = null;
    sound.playBuild();
    this.callbacks.onBoardRover();
  }

  public interact() {
    if (this.shelterLocked) return this.lockedNotice();
    if (this.player.working > 0) return;
    const it = this.focus;
    if (it && it.enabled) this.runInteractable(it);
  }

  private runInteractable(it: Interactable) {
    if (this.player.working > 0) return;
    this.path = [];
    this.dest = null;
    this.pendingInteract = null;
    // face the thing you are working on
    const dx = it.x - this.player.x;
    const dy = it.y - this.player.y;
    if (Math.abs(dx) > Math.abs(dy)) this.player.facing = dx > 0 ? 'right' : 'left';
    else this.player.facing = dy > 0 ? 'down' : 'up';
    if (it.work > 0 && !this.player.isInRover) {
      this.player.working = it.work;
      this.player.workTotal = it.work;
      this.workDone = it.run;
      sound.playMineImpact();
    } else {
      it.run();
    }
  }

  private workDone: (() => void) | null = null;

  private collectNode(n: ResourceNode) {
    n.usesLeft -= 1;
    sound.playCollect();
    this.burst(n.x, n.y - 6, n.type === 'waterIce' ? PAL.ice : PAL.target, 12);
    this.petReact(n.type === 'waterIce' || n.type === 'crate' ? '!' : '♪');
    if (n.usesLeft <= 0) this.resourceNodes = this.resourceNodes.filter((x) => x.id !== n.id);
    this.callbacks.onCollect(n, n.usesLeft);
  }

  private interactables(): Interactable[] {
    const out: Interactable[] = [];
    const surface = this.stage.phaseIndex >= 5;
    if (!this.player.isInRover && surface) {
      for (const n of this.resourceNodes) {
        if (!n.revealed || n.usesLeft <= 0) continue;
        const labels: Record<string, string> = {
          crate: n.contents ? 'Open cargo' : 'Open crate',
          regolith: 'Scoop regolith',
          metalOre: 'Chip off metal',
          titanium: 'Chip off titanium',
          silicon: 'Collect silicon',
          waterIce: 'Collect ice',
          samples: 'Pick up sample',
          tech_wreck: 'Download its data',
          helium3: 'Bag soil sample',
        };
        out.push({
          id: n.id,
          kind: 'node',
          x: n.x,
          y: n.y,
          promptY: n.y - 26,
          range: 56,
          key: 'E',
          label: labels[n.type] || 'Collect',
          work: n.type === 'crate' ? 0.7 : 0.45,
          enabled: true,
          pickRadius: 24,
          run: () => this.collectNode(n),
        });
      }
      for (const b of this.placedBuildings) {
        const r = BUILDING_RECIPES[b.recipeId];
        if (!r) continue;
        const w = r.width * GRID;
        const h = r.height * GRID;
        const cx = b.x + w / 2;
        const cy = b.y + h / 2;
        let label = '';
        let work = 0;
        let run: (() => void) | null = null;
        let enabled = true;
        if (b.online === false) {
          label =
            b.recipeId === 'oxygen_generator'
              ? 'Connect oxygen line'
              : b.recipeId === 'water_recycler'
              ? 'Set up recycler'
              : b.recipeId === 'research_lab'
              ? 'Run an analysis'
              : 'Aim the dish';
          work = b.recipeId === 'oxygen_generator' ? 1.2 : 0;
          run = () => this.callbacks.onSetupRequest(b);
        } else if (b.recipeId === 'solar_panel' && b.dustAccumulation > 25) {
          label = 'Clean panel ✦';
          run = () => this.callbacks.onCleanDust(b);
        } else if (b.recipeId === 'greenhouse') {
          const g = b.growth ?? 100;
          label = g >= 100 ? 'Pick crops ✦' : 'Tend garden';
          run = () => {
            this.petReact('♪');
            this.callbacks.onHarvest(b);
          };
        } else if (b.recipeId === 'battery' && this.callbacks.onFixPower && this.powerCharge < 0.7) {
          label = 'Fix power line ✦';
          run = () => this.callbacks.onFixPower?.(b);
        }
        if (!label) continue;
        out.push({
          id: b.instanceId,
          kind: 'building',
          x: cx,
          y: cy,
          promptY: b.y - 14,
          range: Math.max(w, h) / 2 + 34,
          key: enabled ? 'E' : null,
          label,
          work,
          enabled,
          pickRadius: Math.max(w, h) / 2 + 6,
          run: run || (() => {}),
        });
      }
    }
    if (this.stage.roverUnlocked && !this.player.isInRover) {
      out.push({
        id: 'rover',
        kind: 'rover',
        x: this.rover.x,
        y: this.rover.y,
        promptY: this.rover.y - 30,
        range: 70,
        key: 'R',
        label: 'Drive rover',
        work: 0,
        enabled: true,
        pickRadius: 34,
        run: () => this.toggleRover(),
      });
    }
    return out;
  }

  /** True when this object is what the current mission step points at. */
  private isMissionTarget(it: Interactable) {
    const t = this.target;
    if (!t || !it.key) return false;
    if (t.kind === 'rover') return it.kind === 'rover';
    if (t.kind === 'building' && it.kind === 'building') return this.placedBuildings.some((b) => b.instanceId === it.id && b.recipeId === t.recipeId);
    if (t.kind === 'node' && it.kind === 'node') {
      const n = this.resourceNodes.find((r) => r.id === it.id);
      return Boolean(n && (t.ids ? t.ids.includes(n.id) : t.types.includes(n.type)));
    }
    return false;
  }

  private inRangeOf(it: Interactable) {
    return Math.hypot(it.x - this.player.x, it.y - this.player.y) <= it.range;
  }

  // -------------------------------------------------------------------------
  // Collision & navigation
  // -------------------------------------------------------------------------

  private rectHitsCircle(r: { x: number; y: number; w: number; h: number }, cx: number, cy: number, rad: number) {
    const nx = Math.max(r.x, Math.min(cx, r.x + r.w));
    const ny = Math.max(r.y, Math.min(cy, r.y + r.h));
    return (nx - cx) ** 2 + (ny - cy) ** 2 < rad * rad;
  }

  private buildingRects() {
    return this.placedBuildings
      .filter((b) => b.recipeId !== 'landing_pad')
      .map((b) => {
        const r = BUILDING_RECIPES[b.recipeId];
        const w = (r?.width || 2) * GRID;
        const h = (r?.height || 2) * GRID;
        return { x: b.x + 3, y: b.y + h * 0.3, w: w - 6, h: h * 0.7 - 2 };
      });
  }

  private collides(x: number, y: number, r: number, includeRover: boolean) {
    if (x < WORLD.minX + r || x > WORLD.maxX - r || y < WORLD.minY + r || y > WORLD.maxY - r) return true;
    if (Math.hypot(x - LANDER.x, y - LANDER.y) < LANDER.r - 6 + r) return true;
    for (const b of BOULDERS) if (Math.hypot(x - b.x, y - b.y) < b.r * 0.85 + r) return true;
    for (const rect of this.buildingRects()) if (this.rectHitsCircle(rect, x, y, r)) return true;
    if (includeRover && !this.player.isInRover && this.stage.roverUnlocked && Math.hypot(x - this.rover.x, y - this.rover.y) < ROVER_R + r - 4)
      return true;
    return false;
  }

  /** Pushes a circle out of anything solid. Returns the corrected position and whether it hit. */
  private resolve(x: number, y: number, r: number, includeRover: boolean) {
    let hit = false;
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      const push = (nx: number, ny: number, depth: number) => {
        const len = Math.hypot(nx, ny) || 1;
        x += (nx / len) * depth;
        y += (ny / len) * depth;
        moved = hit = true;
      };
      const circle = (cx: number, cy: number, cr: number) => {
        const dx = x - cx;
        const dy = y - cy;
        const d = Math.hypot(dx, dy);
        if (d < cr + r) push(d === 0 ? 0 : dx, d === 0 ? 1 : dy, cr + r - d + 0.01);
      };
      circle(LANDER.x, LANDER.y, LANDER.r - 6);
      for (const b of BOULDERS) circle(b.x, b.y, b.r * 0.85);
      if (includeRover && !this.player.isInRover && this.stage.roverUnlocked) circle(this.rover.x, this.rover.y, ROVER_R - 4);
      for (const rect of this.buildingRects()) {
        const nx = Math.max(rect.x, Math.min(x, rect.x + rect.w));
        const ny = Math.max(rect.y, Math.min(y, rect.y + rect.h));
        const dx = x - nx;
        const dy = y - ny;
        const d = Math.hypot(dx, dy);
        if (d < r) {
          if (d === 0) {
            // inside the rect: push out the shortest way
            const left = x - rect.x;
            const right = rect.x + rect.w - x;
            const top = y - rect.y;
            const bottom = rect.y + rect.h - y;
            const m = Math.min(left, right, top, bottom);
            if (m === left) push(-1, 0, left + r);
            else if (m === right) push(1, 0, right + r);
            else if (m === top) push(0, -1, top + r);
            else push(0, 1, bottom + r);
          } else push(dx, dy, r - d + 0.01);
        }
      }
      const cx = Math.max(WORLD.minX + r, Math.min(WORLD.maxX - r, x));
      const cy = Math.max(WORLD.minY + r, Math.min(WORLD.maxY - r, y));
      if (cx !== x || cy !== y) {
        x = cx;
        y = cy;
        hit = true;
      }
      if (!moved) break;
    }
    return { x, y, hit };
  }

  private refreshNav() {
    const sig = this.placedBuildings.map((b) => `${b.recipeId}@${b.x},${b.y}`).join('|');
    if (sig === this.navSig) return;
    this.navSig = sig;
    for (let gy = 0; gy < this.navH; gy++) {
      for (let gx = 0; gx < this.navW; gx++) {
        const x = WORLD.minX + gx * NAV + NAV / 2;
        const y = WORLD.minY + gy * NAV + NAV / 2;
        this.blocked[gy * this.navW + gx] = this.collides(x, y, PLAYER_R + 2, false) ? 1 : 0;
      }
    }
  }

  private cellOf(x: number, y: number) {
    return {
      gx: Math.max(0, Math.min(this.navW - 1, Math.floor((x - WORLD.minX) / NAV))),
      gy: Math.max(0, Math.min(this.navH - 1, Math.floor((y - WORLD.minY) / NAV))),
    };
  }

  private cellCenter(gx: number, gy: number) {
    return { x: WORLD.minX + gx * NAV + NAV / 2, y: WORLD.minY + gy * NAV + NAV / 2 };
  }

  private free(gx: number, gy: number) {
    return gx >= 0 && gy >= 0 && gx < this.navW && gy < this.navH && !this.blocked[gy * this.navW + gx];
  }

  /** Nearest free cell to a point within `maxR` cells (or null). */
  private nearestFree(gx: number, gy: number, maxR: number) {
    if (this.free(gx, gy)) return { gx, gy };
    for (let r = 1; r <= maxR; r++) {
      let best: { gx: number; gy: number; d: number } | null = null;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if (this.free(gx + dx, gy + dy)) {
            const d = dx * dx + dy * dy;
            if (!best || d < best.d) best = { gx: gx + dx, gy: gy + dy, d };
          }
        }
      }
      if (best) return best;
    }
    return null;
  }

  /** A* on the coarse grid. Returns world waypoints (smoothed) or null if unreachable. */
  private findPath(sx: number, sy: number, tx: number, ty: number, stopWithin: number) {
    this.refreshNav();
    const s = this.cellOf(sx, sy);
    const start = this.nearestFree(s.gx, s.gy, 2);
    const t = this.cellOf(tx, ty);
    const goal = this.nearestFree(t.gx, t.gy, stopWithin > 0 ? Math.ceil(stopWithin / NAV) + 2 : 3);
    if (!start || !goal) return null;
    const W = this.navW;
    const N = W * this.navH;
    const g = new Float32Array(N).fill(Infinity);
    const came = new Int32Array(N).fill(-1);
    const closed = new Uint8Array(N);
    const heap: number[] = [];
    const f = new Float32Array(N);
    const push = (i: number) => {
      heap.push(i);
      let c = heap.length - 1;
      while (c > 0) {
        const p = (c - 1) >> 1;
        if (f[heap[p]] <= f[heap[c]]) break;
        [heap[p], heap[c]] = [heap[c], heap[p]];
        c = p;
      }
    };
    const pop = () => {
      const top = heap[0];
      const last = heap.pop()!;
      if (heap.length > 0) {
        heap[0] = last;
        let c = 0;
        for (;;) {
          const l = c * 2 + 1;
          const r = l + 1;
          let m = c;
          if (l < heap.length && f[heap[l]] < f[heap[m]]) m = l;
          if (r < heap.length && f[heap[r]] < f[heap[m]]) m = r;
          if (m === c) break;
          [heap[m], heap[c]] = [heap[c], heap[m]];
          c = m;
        }
      }
      return top;
    };
    const si = start.gy * W + start.gx;
    const gi = goal.gy * W + goal.gx;
    const goalPos = this.cellCenter(goal.gx, goal.gy);
    const h = (i: number) => {
      const x = i % W;
      const y = (i / W) | 0;
      const dx = Math.abs(x - goal.gx);
      const dy = Math.abs(y - goal.gy);
      return Math.max(dx, dy) + 0.414 * Math.min(dx, dy);
    };
    g[si] = 0;
    f[si] = h(si);
    push(si);
    let found = -1;
    let iter = 0;
    while (heap.length > 0 && iter++ < 30000) {
      const cur = pop();
      if (closed[cur]) continue;
      closed[cur] = 1;
      const cx = cur % W;
      const cy = (cur / W) | 0;
      const cp = this.cellCenter(cx, cy);
      if (cur === gi || (stopWithin > 0 && Math.hypot(cp.x - tx, cp.y - ty) <= stopWithin)) {
        found = cur;
        break;
      }
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = cx + dx;
          const ny = cy + dy;
          if (!this.free(nx, ny)) continue;
          if (dx && dy && (!this.free(cx + dx, cy) || !this.free(cx, cy + dy))) continue;
          const ni = ny * W + nx;
          if (closed[ni]) continue;
          const cost = g[cur] + (dx && dy ? 1.414 : 1);
          if (cost < g[ni]) {
            g[ni] = cost;
            came[ni] = cur;
            f[ni] = cost + h(ni);
            push(ni);
          }
        }
      }
    }
    if (found < 0) return null;
    const cells: { x: number; y: number }[] = [];
    for (let i = found; i !== -1; i = came[i]) cells.push(this.cellCenter(i % W, (i / W) | 0));
    cells.reverse();
    if (stopWithin === 0 && found === gi) cells[cells.length - 1] = goalPos;
    // string-pull: keep only the waypoints needed for straight segments
    const out: { x: number; y: number }[] = [];
    let anchor = { x: sx, y: sy };
    let i = 0;
    while (i < cells.length) {
      let j = cells.length - 1;
      while (j > i && !this.lineFree(anchor.x, anchor.y, cells[j].x, cells[j].y)) j--;
      out.push(cells[j]);
      anchor = cells[j];
      i = j + 1;
    }
    return out;
  }

  private lineFree(x0: number, y0: number, x1: number, y1: number) {
    const d = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.ceil(d / (NAV / 2));
    for (let s = 1; s <= steps; s++) {
      const x = x0 + ((x1 - x0) * s) / steps;
      const y = y0 + ((y1 - y0) * s) / steps;
      const c = this.cellOf(x, y);
      if (!this.free(c.gx, c.gy)) return false;
    }
    return true;
  }

  private navigateTo(x: number, y: number, stopWithin: number) {
    const from = this.player.isInRover ? this.rover : this.player;
    const p = this.findPath(from.x, from.y, x, y, stopWithin);
    if (!p || p.length === 0) return false;
    this.path = p;
    const last = p[p.length - 1];
    this.dest = { x: last.x, y: last.y, age: 0 };
    this.stuckTime = 0;
    this.repathed = false;
    sound.playClick();
    return true;
  }

  private cantReach(x: number, y: number) {
    this.noReach = { x, y, age: 0 };
    this.path = [];
    this.dest = null;
    this.toast(x, y - 16, "Can't reach that spot", PAL.warn);
  }

  // -------------------------------------------------------------------------
  // Update
  // -------------------------------------------------------------------------

  /** Thumbstick direction from the touch controls (-1..1 per axis). */
  public setTouchMove(x: number, y: number) {
    this.touchMove = { x, y };
  }

  private moveInput() {
    let x = this.touchMove.x;
    let y = this.touchMove.y;
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    return { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
  }

  private facingVector() {
    switch (this.player.facing) {
      case 'up':
        return { x: 0, y: -1 };
      case 'left':
        return { x: -1, y: 0 };
      case 'right':
        return { x: 1, y: 0 };
      default:
        return { x: 0, y: 1 };
    }
  }

  private update(dt: number) {
    if (this.cine) {
      this.updateCinematic(dt);
      if (this.cine) {
        this.updateCamera(dt);
        this.updateEffects(dt);
      }
      return;
    }
    const input = this.inputEnabled && !this.shelterLocked ? this.moveInput() : { x: 0, y: 0 };
    if ((input.x || input.y) && (this.path.length || this.pendingInteract)) {
      // keyboard always wins over a click-to-move destination
      this.path = [];
      this.dest = null;
      this.pendingInteract = null;
    }
    if (this.shelterLocked && (this.moveInput().x || this.moveInput().y) && Math.random() < dt * 1.2) this.lockedNotice();

    const before = { x: this.player.x, y: this.player.y };
    if (this.player.isInRover) this.updateRover(dt, input);
    else this.updateWalker(dt, input);

    // work animation (collecting, cleaning...)
    if (this.player.working > 0) {
      this.player.working -= dt;
      if (this.player.working <= 0) {
        this.player.working = 0;
        const done = this.workDone;
        this.workDone = null;
        done?.();
      }
    }

    // pending click interaction: act once in range
    if (this.pendingInteract) {
      const it = this.interactables().find((i) => i.id === this.pendingInteract);
      if (!it) this.pendingInteract = null;
      else if (this.inRangeOf(it) && !this.player.isInRover) this.runInteractable(it);
      else if (it.kind === 'rover' && this.inRangeOf(it)) this.runInteractable(it);
    }

    // focus: nearest usable thing in range
    const its = this.interactables();
    let best: Interactable | null = null;
    let bestD = Infinity;
    for (const it of its) {
      const d = Math.hypot(it.x - this.player.x, it.y - this.player.y);
      // buildings waiting for setup win over a rock that happens to be a bit closer
      const score = d - (it.kind === 'building' && it.key ? 30 : 0) - (this.isMissionTarget(it) ? 40 : 0);
      if (d <= it.range && score < bestD) {
        best = it;
        bestD = score;
      }
    }
    this.focus = this.shelterLocked ? null : best;

    this.updatePet(dt);
    this.updateCamera(dt);
    this.updateEffects(dt);

    // tutorial: first steps off the lander
    if (!this.walkedOffSent && this.stage.phaseIndex >= 5 && this.stage.tutorialStep === 0) {
      if (Math.hypot(this.player.x - LADDER.x, this.player.y - LADDER.y) > 100) {
        this.walkedOffSent = true;
        this.callbacks.onWalkedOffLander();
      }
    }

    const moved = Math.hypot(this.player.x - before.x, this.player.y - before.y);
    if (moved > 0) {
      this.distAcc += moved * 0.05;
      this.moveSend += dt;
      if (this.moveSend > 0.1) {
        this.moveSend = 0;
        this.callbacks.onPlayerMoved?.(this.player.x, this.player.y, this.player.facing, true, this.player.isInRover);
      }
    }
    this.distFlush += dt;
    if (this.distFlush > 1 && this.distAcc > 0) {
      this.callbacks.onDistanceTraveled?.(this.distAcc, this.player.isInRover);
      this.distAcc = 0;
      this.distFlush = 0;
    }

    const zone = zoneAt(this.player.x, this.player.y);
    if (zone !== this.zoneId) {
      this.zoneId = zone;
      this.callbacks.onZoneChanged?.(zone, ZONE_NAMES[zone] || zone);
    }

    const dishTarget = -0.35;
    this.dishAngle += (dishTarget - this.dishAngle) * (1 - Math.exp(-dt * 1.5));
  }

  private updateWalker(dt: number, input: { x: number; y: number }) {
    const p = this.player;
    const max = WALK_SPEED * (p.avatarId === 'explorer' ? 1.1 : 1);
    let dx = 0;
    let dy = 0;
    let arriving = 1;
    if (input.x || input.y) {
      const len = Math.hypot(input.x, input.y);
      dx = input.x / len;
      dy = input.y / len;
    } else if (this.path.length > 0) {
      const wp = this.path[0];
      const ddx = wp.x - p.x;
      const ddy = wp.y - p.y;
      const d = Math.hypot(ddx, ddy);
      if (d < 7) {
        this.path.shift();
        if (this.path.length === 0) this.dest = null;
      } else {
        dx = ddx / d;
        dy = ddy / d;
        if (this.path.length === 1) arriving = Math.min(1, d / 40);
      }
    }
    if (p.working > 0) dx = dy = 0;
    const tvx = dx * max * Math.max(0.35, arriving);
    const tvy = dy * max * Math.max(0.35, arriving);
    const accel = dx || dy ? 1300 : 1800;
    // vector approach keeps diagonals and straights the same speed
    const ddvx = tvx - p.vx;
    const ddvy = tvy - p.vy;
    const dl = Math.hypot(ddvx, ddvy);
    const stepv = accel * dt;
    if (dl <= stepv) {
      p.vx = tvx;
      p.vy = tvy;
    } else {
      p.vx += (ddvx / dl) * stepv;
      p.vy += (ddvy / dl) * stepv;
    }
    const ox = p.x;
    const oy = p.y;
    const r = this.resolve(p.x + p.vx * dt, p.y + p.vy * dt, PLAYER_R, true);
    p.x = r.x;
    p.y = r.y;
    const moved = Math.hypot(p.x - ox, p.y - oy);
    if (r.hit && moved < 0.2) {
      p.vx *= 0.5;
      p.vy *= 0.5;
    }
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > 25) {
      if (Math.abs(p.vx) > Math.abs(p.vy) * 1.1) p.facing = p.vx > 0 ? 'right' : 'left';
      else p.facing = p.vy > 0 ? 'down' : 'up';
    }
    // stride and footprints
    const prevStep = Math.floor(p.phase / Math.PI);
    p.phase += moved / 17;
    const step = Math.floor(p.phase / Math.PI);
    if (step !== prevStep && moved > 0) {
      const side = step % 2 === 0 ? 1 : -1;
      const a = Math.atan2(p.vy, p.vx);
      const fx = p.x + Math.cos(a + Math.PI / 2) * 4 * side;
      const fy = p.y + Math.sin(a + Math.PI / 2) * 4 * side;
      this.addMark({ x: fx, y: fy, a, age: 0, kind: 'boot', keep: this.marks.filter((m) => m.keep).length < 24 });
      sound.playFootstep();
      // a small dust kick that falls straight back down (no air to hold it)
      if (!this.reducedMotion) {
        for (let i = 0; i < 3; i++) {
          this.addParticle(fx, fy, (Math.random() - 0.5) * 30 - p.vx * 0.08, (Math.random() - 0.5) * 12 - p.vy * 0.08, 25 + Math.random() * 20, 0.6, '#b9b3a6', 1.6);
        }
      }
    }
    // stuck while following a click path: try once more, then give up clearly
    if (this.path.length > 0 && !(input.x || input.y)) {
      if (moved < 0.4 * dt * 60) this.stuckTime += dt;
      else this.stuckTime = 0;
      if (this.stuckTime > 0.6) {
        this.stuckTime = 0;
        const last = this.path[this.path.length - 1];
        if (!this.repathed && this.navigateTo(last.x, last.y, this.pendingInteract ? 40 : 0)) {
          this.repathed = true;
        } else {
          this.cantReach(last.x, last.y);
          this.pendingInteract = null;
        }
      }
    }
  }

  private updateRover(dt: number, input: { x: number; y: number }) {
    const r = this.rover;
    let throttle = -input.y;
    let steer = input.x;
    if (!(input.x || input.y) && this.path.length > 0) {
      const wp = this.path[0];
      const dx = wp.x - r.x;
      const dy = wp.y - r.y;
      const d = Math.hypot(dx, dy);
      if (d < 22) {
        this.path.shift();
        if (this.path.length === 0) this.dest = null;
      } else {
        const diff = angleDiff(r.heading, Math.atan2(dy, dx));
        steer = Math.max(-1, Math.min(1, diff * 2));
        throttle = Math.abs(diff) > 1.4 ? 0.25 : this.path.length === 1 ? Math.min(1, d / 120) : 1;
      }
    }
    const max = ROVER_MAX * (this.player.avatarId === 'explorer' ? 1.1 : 1);
    if (throttle > 0) r.speed = r.speed < 0 ? approach(r.speed, 0, 560 * dt) : approach(r.speed, max * throttle, 240 * dt);
    else if (throttle < 0) r.speed = r.speed > 0 ? approach(r.speed, 0, 560 * dt) : approach(r.speed, -110, 200 * dt);
    else r.speed = approach(r.speed, 0, 190 * dt);
    const grip = Math.min(1, Math.abs(r.speed) / 110);
    r.heading += steer * 2.5 * grip * Math.sign(r.speed || 1) * dt;
    const ox = r.x;
    const oy = r.y;
    const res = this.resolve(r.x + Math.cos(r.heading) * r.speed * dt, r.y + Math.sin(r.heading) * r.speed * dt, ROVER_R, false);
    r.x = res.x;
    r.y = res.y;
    if (res.hit && Math.abs(r.speed) > 60) {
      r.speed *= -0.25;
      if (!this.reducedMotion) this.shake = 3;
      sound.playMineImpact();
    }
    this.player.x = r.x;
    this.player.y = r.y;
    const moved = Math.hypot(r.x - ox, r.y - oy);
    r.wheel += (r.speed * dt) / 8;
    r.trackDist += moved;
    if (r.trackDist > 10) {
      r.trackDist = 0;
      this.addMark({ x: r.x, y: r.y, a: r.heading, age: 0, kind: 'track' });
      if (!this.reducedMotion && Math.abs(r.speed) > 140 && Math.random() < 0.5) {
        const bx = r.x - Math.cos(r.heading) * 28;
        const by = r.y - Math.sin(r.heading) * 28;
        this.addParticle(bx, by, -Math.cos(r.heading) * 40 + (Math.random() - 0.5) * 30, -Math.sin(r.heading) * 40, 40 + Math.random() * 30, 0.7, '#b9b3a6', 2);
      }
    }
    if (Math.abs(r.speed) > 20) this.player.facing = Math.abs(Math.cos(r.heading)) > Math.abs(Math.sin(r.heading)) ? (Math.cos(r.heading) > 0 ? 'right' : 'left') : Math.sin(r.heading) > 0 ? 'down' : 'up';
    if (this.path.length > 0 && !(input.x || input.y)) {
      if (moved < 0.3) this.stuckTime += dt;
      else this.stuckTime = 0;
      if (this.stuckTime > 1.2) {
        this.stuckTime = 0;
        const last = this.path[this.path.length - 1];
        this.cantReach(last.x, last.y);
      }
    }
  }

  private updatePet(dt: number) {
    const p = this.player;
    const f = this.facingVector();
    const tx = p.x - f.x * 40 + f.y * 16;
    const ty = p.y - f.y * 30 - f.x * 10 + 6;
    const k = 1 - Math.exp(-dt * (p.isInRover ? 9 : 5));
    const ox = this.pet.x;
    const oy = this.pet.y;
    this.pet.x += (tx - this.pet.x) * k;
    this.pet.y += (ty - this.pet.y) * k;
    // never stand on top of the astronaut
    const dx = this.pet.x - p.x;
    const dy = this.pet.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d < 24 && d > 0) {
      this.pet.x = p.x + (dx / d) * 24;
      this.pet.y = p.y + (dy / d) * 24;
    }
    const sp = Math.hypot(this.pet.x - ox, this.pet.y - oy) / Math.max(dt, 0.001);
    this.pet.phase += sp * dt * 0.09;
    const hopScale = this.reducedMotion ? 0.3 : 1;
    this.pet.hop = sp > 15 ? Math.abs(Math.sin(this.pet.phase)) * 5 * hopScale : this.pet.moodTimer > 0 ? Math.abs(Math.sin(this.time * 8)) * 4 * hopScale : 0;
    if (this.pet.moodTimer > 0) {
      this.pet.moodTimer -= dt;
      if (this.pet.moodTimer <= 0) this.pet.mood = null;
    }
    const lookAt = this.focus || null;
    this.pet.look = lookAt ? Math.sign(lookAt.x - this.pet.x) * 1.5 : Math.sign(p.x - this.pet.x);
  }

  private updateCamera(dt: number) {
    const o = this.cameraOverride;
    const lead = this.player.isInRover ? 0.35 : 0.2;
    const v = this.player.isInRover
      ? { x: Math.cos(this.rover.heading) * this.rover.speed, y: Math.sin(this.rover.heading) * this.rover.speed }
      : { x: this.player.vx, y: this.player.vy };
    const tx = o ? o.x : this.player.x + Math.max(-70, Math.min(70, v.x * lead));
    const ty = o ? o.y : this.player.y - 20 + Math.max(-70, Math.min(70, v.y * lead));
    const tz = o ? o.zoom : this.baseZoom;
    const k = 1 - Math.exp(-dt * (o ? 2 : 7));
    this.camera.x += (tx - this.camera.x) * k;
    this.camera.y += (ty - this.camera.y) * k;
    this.camera.zoom += (tz - this.camera.zoom) * k;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 10);
  }

  private updateEffects(dt: number) {
    const g = 60; // stylized low gravity for dust
    this.particles = this.particles.filter((pt) => {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.z += pt.vz * dt;
      pt.vz -= g * dt;
      if (pt.z < 0) {
        pt.z = 0;
        pt.vx *= 0.5;
        pt.vy *= 0.5;
        pt.vz = 0;
      }
      pt.life -= dt;
      return pt.life > 0;
    });
    this.texts = this.texts.filter((t) => {
      t.y -= 18 * dt;
      t.life -= dt;
      return t.life > 0;
    });
    for (const m of this.marks) m.age += dt;
    this.marks = this.marks.filter((m) => m.keep || m.age < (m.kind === 'track' ? 240 : 120));
    if (this.scanWave >= 0) {
      this.scanWave += dt;
      if (this.scanWave > 0.9) this.scanWave = -1;
    }
    if (this.dest) this.dest.age += dt;
    if (this.noReach) {
      this.noReach.age += dt;
      if (this.noReach.age > 0.9) this.noReach = null;
    }
    if (this.player.emoteTimer > 0) this.player.emoteTimer -= dt;
    // remote players glide to their reported positions
    for (const [id, rp] of this.remotePlayers) {
      const d = this.remoteDisplay.get(id) || { x: rp.x, y: rp.y, phase: 0 };
      const k = 1 - Math.exp(-dt * 10);
      const ox = d.x;
      const oy = d.y;
      d.x += (rp.x - d.x) * k;
      d.y += (rp.y - d.y) * k;
      d.phase += Math.hypot(d.x - ox, d.y - oy) / 17;
      this.remoteDisplay.set(id, d);
      if (rp.emoteTimer && rp.emoteTimer > 0) rp.emoteTimer -= dt;
    }
  }

  private addParticle(x: number, y: number, vx: number, vy: number, vz: number, life: number, color: string, size: number) {
    if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
    this.particles.push({ x, y, z: 2, vx, vy, vz, life, max: life, color, size });
  }

  private addMark(m: Mark) {
    this.marks.push(m);
    if (this.marks.length > MAX_MARKS) {
      const i = this.marks.findIndex((x) => !x.keep);
      if (i >= 0) this.marks.splice(i, 1);
    }
  }

  // -------------------------------------------------------------------------
  // Target resolution (mission marker)
  // -------------------------------------------------------------------------

  private resolveTarget(): { x: number; y: number; label: string; r: number } | null {
    const t = this.target;
    if (!t) return null;
    const p = this.player;
    if (t.kind === 'point') return { x: t.x, y: t.y, label: t.label, r: t.radius || 26 };
    if (t.kind === 'rover') {
      if (!this.stage.roverUnlocked || p.isInRover) return null;
      return { x: this.rover.x, y: this.rover.y, label: t.label, r: 34 };
    }
    if (t.kind === 'node') {
      let best: ResourceNode | null = null;
      let bd = Infinity;
      for (const n of this.resourceNodes) {
        if (!t.types.includes(n.type) || n.usesLeft <= 0) continue;
        if (t.ids && !t.ids.includes(n.id)) continue;
        if (!n.revealed) continue;
        if (t.unscannedOnly && this.scannedNodeIds.has(n.id)) continue;
        const d = Math.hypot(n.x - p.x, n.y - p.y);
        if (d < bd) {
          bd = d;
          best = n;
        }
      }
      return best ? { x: best.x, y: best.y, label: t.label, r: 22 } : null;
    }
    if (t.kind === 'building') {
      let best: PlacedBuilding | null = null;
      let bd = Infinity;
      for (const b of this.placedBuildings) {
        if (b.recipeId !== t.recipeId) continue;
        if (t.filter === 'setup' && b.online !== false) continue;
        if (t.filter === 'dusty' && b.dustAccumulation <= 40) continue;
        if (t.filter === 'ready' && (b.growth ?? 100) < 100) continue;
        const d = Math.hypot(b.x - p.x, b.y - p.y);
        if (d < bd) {
          bd = d;
          best = b;
        }
      }
      if (!best) return null;
      const r = BUILDING_RECIPES[best.recipeId];
      const w = (r?.width || 2) * GRID;
      const h = (r?.height || 2) * GRID;
      return { x: best.x + w / 2, y: best.y + h / 2, label: t.label, r: Math.max(w, h) / 2 + 8 };
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  private render() {
    const ctx = this.ctx;
    const W = this.screenW;
    const H = this.screenH;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = PAL.space;
    ctx.fillRect(0, 0, W, H);
    const t = this.time;
    const z = this.camera.zoom;
    const sx = this.shake > 0 && !this.reducedMotion ? (Math.random() - 0.5) * this.shake : 0;
    const sy = this.shake > 0 && !this.reducedMotion ? (Math.random() - 0.5) * this.shake : 0;

    ctx.save();
    ctx.translate(W / 2 + sx, H / 2 + sy);
    ctx.scale(z, z);
    ctx.translate(-this.camera.x, -this.camera.y);

    const view = {
      x0: this.camera.x - W / 2 / z - 40,
      y0: this.camera.y - H / 2 / z - 40,
      x1: this.camera.x + W / 2 / z + 40,
      y1: this.camera.y + H / 2 / z + 80,
    };
    this.renderTerrain(ctx, view);
    this.renderMarks(ctx, view);
    this.renderDecorGround(ctx);
    const target = this.cine || this.ascentGone ? null : this.resolveTarget();
    if (target) this.renderTargetRing(ctx, target, t);
    if (this.dest) this.renderDest(ctx);
    if (this.scanWave >= 0) {
      const r = SCAN_RADIUS * (this.player.avatarId === 'explorer' ? 1.3 : 1) * Math.min(1, this.scanWave / 0.7);
      ctx.strokeStyle = `rgba(157,140,255,${0.7 * (1 - this.scanWave / 0.9)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(this.player.x, this.player.y, r, r * 0.8, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // y-sorted world objects
    const night = Math.max(0, Math.min(1, 1 - this.sunlightIntensity * 1.6));
    type Drawable = { y: number; draw: () => void };
    const list: Drawable[] = [];
    const inView = (x: number, y: number, pad = 80) => x > view.x0 - pad && x < view.x1 + pad && y > view.y0 - pad && y < view.y1 + pad;
    const liftTau = this.cine ? this.cine.t - CINE.lift : -1;
    const cabinFlying = liftTau >= 0;
    list.push({ y: LANDER.y + 20, draw: () => drawLander(ctx, t, true, { ascent: !this.ascentGone && !cabinFlying }) });
    if (cabinFlying) {
      // the flying cabin is drawn above everything else on the ground
      list.push({
        y: Infinity,
        draw: () => {
          const h = liftHeight(liftTau);
          const glow = clamp01(1 - h / 320);
          if (glow > 0) {
            const g = ctx.createRadialGradient(LANDER.x, LANDER.y, 4, LANDER.x, LANDER.y, 90);
            g.addColorStop(0, `rgba(255,211,138,${0.55 * glow})`);
            g.addColorStop(1, 'rgba(255,211,138,0)');
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = g;
            ctx.fillRect(LANDER.x - 90, LANDER.y - 90, 180, 180);
            ctx.restore();
          }
          drawLanderAscent(ctx, t, true, h, Math.min(1, 0.6 + liftTau * 0.8));
        },
      });
    }
    for (const b of BOULDERS) if (inView(b.x, b.y)) list.push({ y: b.y, draw: () => drawBoulder(ctx, b) });
    for (const n of this.resourceNodes) {
      if (!n.revealed || !inView(n.x, n.y)) continue;
      const hl = this.focus?.id === n.id;
      list.push({ y: n.y, draw: () => drawNode(ctx, n.type, n.x, n.y, n.usesLeft, n.uses, t, hl) });
    }
    const powered = this.powerCharge > 0.001 || this.sunlightIntensity > 0.05;
    for (const b of this.placedBuildings) {
      const r = BUILDING_RECIPES[b.recipeId];
      if (!r) continue;
      const w = r.width * GRID;
      const h = r.height * GRID;
      if (!inView(b.x + w / 2, b.y + h / 2, 120)) continue;
      if (!this.appearAt.has(b.instanceId)) this.appearAt.set(b.instanceId, t < this.settleUntil ? -10 : t);
      const appear = this.reducedMotion ? 1 : Math.min(1, (t - (this.appearAt.get(b.instanceId) || 0)) / 0.6);
      list.push({
        y: b.y + h,
        draw: () =>
          drawBuilding(ctx, b.recipeId, b.x, b.y, w, h, {
            powered: powered && b.status !== 'unpowered',
            online: b.online !== false,
            dust: b.dustAccumulation,
            growth: b.growth ?? 100,
            charge: this.powerCharge,
            night,
            dishAngle: b.online === false ? -1.2 + Math.sin(t * 0.6) * 0.5 : this.dishAngle,
            t,
            appear,
          }),
      });
    }
    this.renderDecorObjects(list, ctx, t, night);
    if (this.stage.roverUnlocked && !this.player.isInRover) {
      list.push({ y: this.rover.y, draw: () => drawRover(ctx, this.rover.x, this.rover.y, this.rover.heading, this.rover.wheel, night) });
    }
    for (const [id, rp] of this.remotePlayers) {
      const d = this.remoteDisplay.get(id) || { x: rp.x, y: rp.y, phase: 0 };
      list.push({
        y: d.y,
        draw: () => {
          if (rp.isInRover) drawRover(ctx, d.x, d.y, 0, d.phase, night, '#7fb2ff');
          else
            drawAstronaut(ctx, d.x, d.y, {
              facing: rp.direction,
              phase: d.phase,
              speed01: rp.isMoving ? 1 : 0,
              hop: rp.isMoving ? Math.abs(Math.sin(d.phase)) * 4 : 0,
              working: 0,
              stripe: AVATARS[rp.avatarId]?.suitColor || '#7fb2ff',
              scale: 1.15,
            });
          tag(ctx, d.x, d.y - (rp.isInRover ? 30 : 56), rp.name || 'Crew', '#cfe0ff');
          if (rp.emote && rp.emoteTimer && rp.emoteTimer > 0) this.drawBubble(ctx, d.x, d.y - 78, rp.emote);
        },
      });
    }
    if (!this.player.isInRover && this.petAlpha > 0) {
      list.push({
        y: this.cine && this.cine.t > CINE.walk ? LADDER.y + 2 : this.pet.y,
        draw: () => {
          ctx.globalAlpha = this.petAlpha;
          drawCompanion(ctx, this.pet.x, this.pet.y, t, this.pet.hop, this.pet.look, this.pet.mood, this.player.petId);
          ctx.globalAlpha = 1;
        },
      });
    }
    if (this.cine && this.playerAlpha > 0) {
      // scripted walk and ladder climb; stays in front of the ladder while climbing
      const climbing = this.cine.t >= CINE.walk;
      list.push({
        y: climbing ? LADDER.y + 1 : this.player.y,
        draw: () => {
          const p = this.player;
          const speed01 = Math.min(1, Math.hypot(p.vx, p.vy) / WALK_SPEED);
          ctx.globalAlpha = this.playerAlpha;
          drawAstronaut(ctx, p.x, p.y, {
            facing: p.facing,
            phase: p.phase,
            speed01: climbing ? 0.7 : speed01,
            hop: climbing ? 0 : Math.abs(Math.sin(p.phase)) * (this.reducedMotion ? 1.5 : 5) * speed01,
            working: climbing ? 0.5 + 0.5 * Math.abs(Math.sin(p.phase)) : 0,
            stripe: p.suitColor,
            scale: 1.2,
          });
          ctx.globalAlpha = 1;
        },
      });
    }
    if (!this.cine && this.playerAlpha > 0) list.push({
      y: this.player.y,
      draw: () => {
        const p = this.player;
        if (p.isInRover) {
          drawRover(ctx, this.rover.x, this.rover.y, this.rover.heading, this.rover.wheel, night, p.suitColor);
          return;
        }
        const speed01 = Math.min(1, Math.hypot(p.vx, p.vy) / WALK_SPEED);
        const hopAmp = this.reducedMotion ? 1.5 : 5;
        drawAstronaut(ctx, p.x, p.y, {
          facing: p.facing,
          phase: p.phase,
          speed01,
          hop: Math.abs(Math.sin(p.phase)) * hopAmp * speed01 + (p.working > 0 ? Math.abs(Math.sin(t * 10)) * 1.2 : 0),
          working: p.working > 0 ? 1 : 0,
          stripe: p.suitColor,
          scale: 1.2,
        });
        if (p.working > 0 && p.workTotal > 0.3) this.drawWorkRing(ctx, p.x, p.y - 70, 1 - p.working / p.workTotal);
        if (p.emoteTimer > 0 && p.activeEmote) this.drawBubble(ctx, p.x, p.y - 74, p.activeEmote);
      },
    });
    list.sort((a, b) => a.y - b.y);
    for (const d of list) d.draw();

    if (this.buildGhostRecipeId) this.renderGhost(ctx, t);

    // particles
    for (const pt of this.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.max);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.z - pt.size / 2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // night: darken, then add lights on top
    if (night > 0.02) {
      ctx.fillStyle = `rgba(8,10,26,${0.5 * night})`;
      ctx.fillRect(0, 0, W, H);
      this.renderLights(ctx, night, W, H);
    }
    if (this.stormLevel > 0) this.renderStormOverlay(ctx, W, H);

    // world-space UI (drawn after lighting so it stays readable)
    ctx.save();
    ctx.translate(W / 2 + sx, H / 2 + sy);
    ctx.scale(z, z);
    ctx.translate(-this.camera.x, -this.camera.y);
    if (this.noReach) {
      const a = 1 - this.noReach.age / 0.9;
      ctx.strokeStyle = `rgba(255,122,107,${a})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(this.noReach.x - 7, this.noReach.y - 7);
      ctx.lineTo(this.noReach.x + 7, this.noReach.y + 7);
      ctx.moveTo(this.noReach.x + 7, this.noReach.y - 7);
      ctx.lineTo(this.noReach.x - 7, this.noReach.y + 7);
      ctx.stroke();
    }
    if (target && !(this.focus && Math.hypot(this.focus.x - target.x, this.focus.y - target.y) < 6)) {
      const bob = this.reducedMotion ? 0 : Math.sin(t * 3) * 3;
      this.drawChevron(ctx, target.x, target.y - target.r - 14 + bob);
      if (Math.hypot(target.x - this.player.x, target.y - this.player.y) > 90) tag(ctx, target.x, target.y - target.r - 26 + bob, target.label, PAL.target);
    }
    if (this.focus && !this.buildGhostRecipeId) {
      const f = this.focus;
      drawPrompt(ctx, f.x, f.promptY, f.key, f.label, f.enabled);
    }
    for (const tx of this.texts) {
      ctx.globalAlpha = Math.min(1, tx.life / 0.6);
      tag(ctx, tx.x, tx.y, tx.text, tx.color);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    if (target) this.renderOffscreenArrow(ctx, target, W, H);
    this.renderCinematicUI(ctx, W, H);
  }

  private renderTerrain(ctx: CanvasRenderingContext2D, v: { x0: number; y0: number; x1: number; y1: number }) {
    const cx0 = Math.floor(v.x0 / CHUNK);
    const cy0 = Math.floor(v.y0 / CHUNK);
    const cx1 = Math.floor(v.x1 / CHUNK);
    const cy1 = Math.floor(v.y1 / CHUNK);
    let baked = 0;
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const key = `${cx},${cy}`;
        let c = this.chunkCache.get(key);
        if (!c) {
          // bake a few per frame so walking into new ground never stutters
          if (baked > 3 && this.chunkCache.size > 6) {
            ctx.fillStyle = PAL.groundDark;
            ctx.fillRect(cx * CHUNK, cy * CHUNK, CHUNK, CHUNK);
            continue;
          }
          c = bakeTerrainChunk(cx * CHUNK, cy * CHUNK, this.chunkScale);
          this.chunkCache.set(key, c);
          baked++;
        }
        ctx.drawImage(c, cx * CHUNK, cy * CHUNK, CHUNK, CHUNK);
      }
    }
    if (this.chunkCache.size > 160) {
      const first = this.chunkCache.keys().next().value;
      if (first) this.chunkCache.delete(first);
    }
  }

  private renderMarks(ctx: CanvasRenderingContext2D, v: { x0: number; y0: number; x1: number; y1: number }) {
    for (const m of this.marks) {
      if (m.x < v.x0 || m.x > v.x1 || m.y < v.y0 || m.y > v.y1) continue;
      const life = m.kind === 'track' ? 240 : 120;
      const a = m.keep ? 0.5 : Math.max(0, 0.5 * (1 - m.age / life));
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(m.a);
      if (m.kind === 'boot') {
        ctx.fillStyle = `rgba(40,38,46,${a})`;
        roundRect(ctx, -4, -2.5, 8, 5, 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,250,236,${a * 0.35})`;
        ctx.fillRect(-3, -2.5, 1, 5);
        ctx.fillRect(0, -2.5, 1, 5);
      } else {
        ctx.fillStyle = `rgba(40,38,46,${a * 0.8})`;
        ctx.fillRect(-5, -20, 10, 4);
        ctx.fillRect(-5, 16, 10, 4);
      }
      ctx.restore();
    }
  }

  private habitat() {
    return this.placedBuildings.find((b) => b.recipeId === 'habitat');
  }

  private renderDecorGround(ctx: CanvasRenderingContext2D) {
    const hab = this.habitat();
    const badges = this.stage.badges;
    if (!hab) return;
    const hc = { x: hab.x + 36, y: hab.y + 72 };
    if (badges.includes('network')) {
      ctx.strokeStyle = 'rgba(140,134,121,0.9)';
      ctx.lineWidth = 3;
      for (const b of this.placedBuildings) {
        if (!['water_recycler', 'oxygen_generator', 'water_storage', 'greenhouse'].includes(b.recipeId) || b.online === false) continue;
        const r = BUILDING_RECIPES[b.recipeId];
        const bx = b.x + ((r?.width || 2) * GRID) / 2;
        const by = b.y + (r?.height || 2) * GRID - 4;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx, hc.y - 6);
        ctx.lineTo(hc.x, hc.y - 6);
        ctx.stroke();
      }
    }
  }

  private renderDecorObjects(list: { y: number; draw: () => void }[], ctx: CanvasRenderingContext2D, t: number, night: number) {
    const hab = this.habitat();
    const badges = this.stage.badges;
    if (!hab) return;
    const hc = { x: hab.x + 36, y: hab.y + 72 };
    if (badges.includes('outpost')) {
      // a lit path from the lander ladder to the habitat airlock
      for (let i = 1; i <= 4; i++) {
        const x = LADDER.x + ((hc.x - LADDER.x) * i) / 5 + 14;
        const y = LADDER.y + 18 + ((hc.y + 10 - LADDER.y - 18) * i) / 5;
        list.push({
          y,
          draw: () => {
            ctx.fillStyle = PAL.equipDark;
            ctx.fillRect(x - 1, y - 12, 2, 12);
            ctx.fillStyle = night > 0.2 ? PAL.light : '#cfc8b6';
            ctx.beginPath();
            ctx.arc(x, y - 13, 2.4, 0, Math.PI * 2);
            ctx.fill();
          },
        });
      }
    }
    if (badges.includes('uncover')) {
      const x = hab.x + 86;
      const y = hab.y + 70;
      list.push({
        y,
        draw: () => {
          drawShadow(ctx, x + 2, y, 12, 4, 0.3);
          ctx.fillStyle = PAL.equip;
          ctx.strokeStyle = PAL.outline;
          ctx.lineWidth = 1.4;
          roundRect(ctx, x - 10, y - 14, 20, 14, 3);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = PAL.ice;
          ctx.fillRect(x - 6, y - 10, 12, 4);
          ctx.fillStyle = 'rgba(38,37,44,0.6)';
          ctx.font = `bold 5px ${UI_FONT}`;
          ctx.textAlign = 'center';
          ctx.fillText('H2O', x, y - 3);
        },
      });
    }
    if (badges.includes('development')) {
      list.push({
        y: hab.y + 74,
        draw: () => {
          for (let i = 0; i <= 8; i++) {
            const a = Math.PI + (i / 8) * Math.PI;
            const x = hc.x + Math.cos(a) * 40;
            const y = hab.y + 56 + Math.sin(a) * 40;
            const on = this.reducedMotion || Math.sin(t * 2 + i) > -0.3;
            ctx.fillStyle = on ? PAL.light : '#a58c5a';
            ctx.beginPath();
            ctx.arc(x, y, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        },
      });
      const px = hab.x - 18;
      const py = hab.y + 74;
      list.push({
        y: py,
        draw: () => {
          ctx.fillStyle = '#6f6b65';
          ctx.strokeStyle = PAL.outline;
          ctx.lineWidth = 1.3;
          roundRect(ctx, px - 11, py - 16, 22, 16, 3);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = PAL.accent;
          ctx.beginPath();
          ctx.arc(px, py - 8, 4, 0, Math.PI * 2);
          ctx.fill();
        },
      });
    }
  }

  private renderTargetRing(ctx: CanvasRenderingContext2D, target: { x: number; y: number; r: number }, t: number) {
    const pulse = this.reducedMotion ? 0 : (Math.sin(t * 3) + 1) / 2;
    ctx.save();
    ctx.strokeStyle = `rgba(242,184,75,${0.55 + 0.3 * pulse + this.targetEmphasis * 0.15})`;
    ctx.lineWidth = 2.5 + this.targetEmphasis;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = this.reducedMotion ? 0 : -t * 12;
    ctx.beginPath();
    ctx.ellipse(target.x, target.y + 4, target.r, target.r * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawChevron(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.save();
    ctx.fillStyle = PAL.target;
    ctx.strokeStyle = PAL.outline;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 8);
    ctx.lineTo(x + 8, y - 8);
    ctx.lineTo(x, y + 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private renderDest(ctx: CanvasRenderingContext2D) {
    const d = this.dest!;
    const a = Math.min(1, d.age * 4);
    const r = 8 + (this.reducedMotion ? 0 : Math.sin(d.age * 6) * 1.5);
    ctx.strokeStyle = `rgba(243,239,230,${0.8 * a})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, r, r * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(243,239,230,${0.9 * a})`;
    ctx.beginPath();
    ctx.arc(d.x, d.y, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderGhost(ctx: CanvasRenderingContext2D, t: number) {
    const g = this.ghostRect();
    if (!g) return;
    const reason = this.validateGhost(g);
    this.ghostValid = !reason;
    this.ghostReason = reason;
    ctx.save();
    ctx.globalAlpha = 0.6;
    drawBuilding(ctx, this.buildGhostRecipeId!, g.x, g.y, g.w, g.h, {
      powered: true,
      online: true,
      dust: 0,
      growth: 60,
      charge: 0.6,
      night: 0,
      dishAngle: -0.35,
      t,
      ghost: true,
      appear: 1,
    });
    ctx.globalAlpha = 1;
    ctx.strokeStyle = reason ? PAL.warn : PAL.ok;
    ctx.lineWidth = 2;
    ctx.setLineDash(reason ? [6, 4] : []);
    ctx.strokeRect(g.x, g.y, g.w, g.h);
    ctx.setLineDash([]);
    const sun = sunFactorAt(g.x + g.w / 2, g.y + g.h / 2);
    let msg = reason ? `✕ ${reason}` : `✓ ${this.lastTapTouch ? 'Tap it again to place' : this.ghostByKeys ? 'Press E to place' : 'Click to place'}`;
    if (this.buildGhostRecipeId === 'solar_panel') msg += ` · Sunlight ${Math.round(sun * 100)}%`;
    tag(ctx, g.x + g.w / 2, g.y - 8, msg, reason ? PAL.warn : PAL.ok);
    tag(ctx, g.x + g.w / 2, g.y + g.h + 24, 'Esc to cancel', '#cfcac0');
    ctx.restore();
  }

  private renderLights(ctx: CanvasRenderingContext2D, night: number, W: number, H: number) {
    const z = this.camera.zoom;
    const toS = (x: number, y: number) => ({ x: (x - this.camera.x) * z + W / 2, y: (y - this.camera.y) * z + H / 2 });
    const glow = (x: number, y: number, r: number, color: string, a: number) => {
      const s = toS(x, y);
      if (s.x < -r || s.y < -r || s.x > W + r || s.y > H + r) return;
      const g = ctx.createRadialGradient(s.x, s.y, 1, s.x, s.y, r * z);
      g.addColorStop(0, color.replace('A', String(a)));
      g.addColorStop(1, color.replace('A', '0'));
      ctx.fillStyle = g;
      ctx.fillRect(s.x - r * z, s.y - r * z, r * 2 * z, r * 2 * z);
    };
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(LANDER.x, LANDER.y - 28, 50, 'rgba(255,211,138,A)', 0.35 * night);
    for (const b of this.placedBuildings) {
      if (b.status === 'unpowered') continue;
      const r = BUILDING_RECIPES[b.recipeId];
      const w = (r?.width || 2) * GRID;
      const h = (r?.height || 2) * GRID;
      if (b.recipeId === 'habitat') glow(b.x + w / 2, b.y + h / 2 - 10, 70, 'rgba(255,211,138,A)', 0.45 * night);
      else if (b.recipeId === 'greenhouse') glow(b.x + w / 2, b.y + h / 2, 70, 'rgba(197,140,255,A)', 0.4 * night);
      else if (b.recipeId === 'research_lab' && b.online !== false) glow(b.x + w / 2, b.y + h - 18, 50, 'rgba(255,211,138,A)', 0.3 * night);
    }
    if (this.stage.roverUnlocked) {
      const r = this.rover;
      glow(r.x + Math.cos(r.heading) * 70, r.y + Math.sin(r.heading) * 70, 70, 'rgba(255,232,180,A)', 0.25 * night);
    }
    ctx.restore();
  }

  private renderStormOverlay(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const t = this.time;
    const pulse = this.reducedMotion ? 0 : Math.sin(t * 2) * 0.03;
    const strength = this.stormLevel === 2 ? 0.2 + pulse : 0.08 + pulse;
    const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
    grad.addColorStop(0, 'rgba(255,122,107,0)');
    grad.addColorStop(1, `rgba(255,122,107,${strength})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    if (this.stormLevel === 2 && !this.reducedMotion) {
      ctx.strokeStyle = 'rgba(255,214,206,0.45)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 30; i++) {
        const seed = i * 97.13;
        const x = ((seed * 13.7 + t * 700) % (w + 200)) - 100;
        const y = ((seed * 7.3 + t * 420) % (h + 200)) - 100;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 14, y - 8);
        ctx.stroke();
      }
    }
  }

  private renderOffscreenArrow(ctx: CanvasRenderingContext2D, target: { x: number; y: number; label: string }, W: number, H: number) {
    const z = this.camera.zoom;
    const sx = (target.x - this.camera.x) * z + W / 2;
    const sy = (target.y - this.camera.y) * z + H / 2;
    const margin = 70;
    if (sx > margin && sx < W - margin && sy > margin + 60 && sy < H - margin - 60) return;
    const cx = W / 2;
    const cy = H / 2;
    const a = Math.atan2(sy - cy, sx - cx);
    const ex = Math.max(margin, Math.min(W - margin, cx + Math.cos(a) * W));
    const ey = Math.max(margin + 70, Math.min(H - margin - 90, cy + Math.sin(a) * H));
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(a);
    ctx.fillStyle = PAL.target;
    ctx.strokeStyle = PAL.outline;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-8, -11);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-8, 11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    const dist = Math.round(Math.hypot(target.x - this.player.x, target.y - this.player.y) * 0.05);
    tag(ctx, ex, ey - 18, `${target.label} · ${dist} m`, PAL.target);
  }

  private drawWorkRing(ctx: CanvasRenderingContext2D, x: number, y: number, p: number) {
    ctx.save();
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(20,20,26,0.7)';
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = PAL.target;
    ctx.beginPath();
    ctx.arc(x, y, 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, p)));
    ctx.stroke();
    ctx.restore();
  }

  private drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, text: string) {
    ctx.save();
    ctx.fillStyle = '#f3efe6';
    roundRect(ctx, x - 16, y - 22, 32, 24, 8);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 4, y + 2);
    ctx.lineTo(x + 4, y + 2);
    ctx.lineTo(x, y + 7);
    ctx.fill();
    ctx.font = `15px ${UI_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1a1a20';
    ctx.fillText(text, x, y - 5);
    ctx.restore();
  }
}
