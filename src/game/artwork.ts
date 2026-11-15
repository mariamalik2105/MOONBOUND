/**
 * MOONBOUND artwork: every picture in the world is drawn here with canvas
 * paths. One palette, one outline weight, one light direction (the Sun sits
 * low to the north at the lunar south pole, so shadows fall to the south).
 */

import { BOULDERS, COLD_TRAP, SUNNY_RIDGE, LANDER, ellipseInside, Boulder, WORLD } from './world';

export const PAL = {
  space: '#0b0c12',
  outline: '#26252c',
  ground: '#8b877f',
  groundLit: '#a39f95',
  groundDark: '#66635e',
  coldFloor: '#1d2029',
  coldRim: '#4a4a52',
  shadow: 'rgba(14, 13, 22, 0.38)',
  suit: '#eeeae1',
  suitShade: '#c8c1b3',
  boot: '#5d5a58',
  visor: '#2a2440',
  visorSheen: '#b8a8ff',
  foil: '#c9a24a',
  foilDark: '#957431',
  equip: '#e8e3d7',
  equipShade: '#bdb6a8',
  equipDark: '#8c8679',
  metal: '#6c6a70',
  panel: '#3b3670',
  panelCell: '#544c9c',
  panelLine: '#9389df',
  accent: '#9d8cff',
  target: '#f2b84b',
  warn: '#ff7a6b',
  ok: '#7fd1a0',
  ice: '#d7ecff',
  light: '#ffd38a',
  grow: '#c58cff',
  text: '#f3efe6',
  label: 'rgba(20, 20, 26, 0.88)',
};

export const UI_FONT = '"Atkinson Hyperlegible", "Segoe UI", system-ui, sans-serif';

type Ctx = CanvasRenderingContext2D;

export function hash2(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function smooth(t: number) {
  return t * t * (3 - 2 * t);
}

/** Value noise 0..1 */
export function noise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  const u = smooth(xf);
  const v = smooth(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function rgb(r: number, g: number, b: number) {
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

/** Brightness 0..1 of bare ground at a world point (before small details). */
function groundLight(x: number, y: number): number {
  if (ellipseInside(x, y, COLD_TRAP, 0.92)) return 0.12;
  if (ellipseInside(x, y, COLD_TRAP, 1.0)) return 0.22;
  if (ellipseInside(x, y, COLD_TRAP, 1.12)) return 0.62; // sunlit far rim
  let l = 0.55;
  const ridge = (x - SUNNY_RIDGE.x) ** 2 / (SUNNY_RIDGE.rx * 1.6) ** 2 + (y - SUNNY_RIDGE.y) ** 2 / (SUNNY_RIDGE.ry * 2.2) ** 2;
  if (ridge < 1) l += (1 - ridge) * 0.12;
  if (y < -40) l += 0.05;
  if (y > 560 && !ellipseInside(x, y, COLD_TRAP, 1.3)) l -= Math.min(0.12, (y - 560) / 600);
  return l;
}

// ---------------------------------------------------------------------------
// Terrain chunks (baked once, reused every frame)
// ---------------------------------------------------------------------------

export const CHUNK = 256;
const CRATER_CELL = 150;

function cratersNear(cx: number, cy: number) {
  const out: { x: number; y: number; r: number }[] = [];
  const x0 = Math.floor((cx - 80) / CRATER_CELL);
  const y0 = Math.floor((cy - 80) / CRATER_CELL);
  const x1 = Math.floor((cx + CHUNK + 80) / CRATER_CELL);
  const y1 = Math.floor((cy + CHUNK + 80) / CRATER_CELL);
  for (let gx = x0; gx <= x1; gx++) {
    for (let gy = y0; gy <= y1; gy++) {
      const h = hash2(gx * 7 + 3, gy * 11 + 5);
      if (h < 0.55) continue;
      const x = (gx + hash2(gx, gy + 99)) * CRATER_CELL;
      const y = (gy + hash2(gx + 99, gy)) * CRATER_CELL;
      if (Math.hypot(x - LANDER.x, y - LANDER.y) < 120) continue;
      if (ellipseInside(x, y, COLD_TRAP, 1.15)) continue;
      out.push({ x, y, r: 8 + hash2(gx + 5, gy + 7) * 26 });
    }
  }
  return out;
}

export function bakeTerrainChunk(cx: number, cy: number, scale: number): HTMLCanvasElement {
  const size = Math.round(CHUNK * scale);
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const data = img.data;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const wx = cx + px / scale;
      const wy = cy + py / scale;
      const outside = wx < WORLD.minX || wx > WORLD.maxX || wy < WORLD.minY || wy > WORLD.maxY;
      const base = groundLight(wx, wy);
      const n = noise(wx / 90, wy / 90) * 0.6 + noise(wx / 23, wy / 23) * 0.3 + noise(wx / 5, wy / 5) * 0.1;
      let l = base + (n - 0.5) * 0.16;
      if (outside) l *= 0.45;
      const cold = ellipseInside(wx, wy, COLD_TRAP, 1.0);
      const i = (py * size + px) * 4;
      // Warm dusty grey; the shadowed crater shifts slightly cool.
      data[i] = Math.max(0, Math.min(255, l * (cold ? 205 : 236)));
      data[i + 1] = Math.max(0, Math.min(255, l * (cold ? 210 : 230)));
      data[i + 2] = Math.max(0, Math.min(255, l * (cold ? 232 : 218)));
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);

  // Small craters: sun to the north, so the inner north wall is in shadow
  for (const cr of cratersNear(cx, cy)) {
    const lit = groundLight(cr.x, cr.y);
    ctx.fillStyle = rgb(lit * 190, lit * 186, lit * 178);
    ctx.beginPath();
    ctx.ellipse(cr.x, cr.y, cr.r, cr.r * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(20,18,26,0.45)';
    ctx.beginPath();
    ctx.ellipse(cr.x, cr.y - cr.r * 0.12, cr.r * 0.9, cr.r * 0.62, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,250,238,${0.18 + lit * 0.2})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cr.x, cr.y, cr.r, cr.r * 0.82, 0, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  // Pebbles
  for (let i = 0; i < 70; i++) {
    const wx = cx + hash2(cx + i * 13, cy + i * 7) * CHUNK;
    const wy = cy + hash2(cx - i * 5, cy + i * 17) * CHUNK;
    const r = 0.8 + hash2(i, cx + cy) * 2.2;
    const lit = groundLight(wx, wy);
    ctx.fillStyle = rgb(lit * 150, lit * 146, lit * 140);
    ctx.beginPath();
    ctx.arc(wx, wy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(12,12,18,0.25)';
    ctx.fillRect(wx - r, wy + r * 0.6, r * 2, r * 0.9);
  }

  // Big crater rim and floor details
  ctx.save();
  ctx.strokeStyle = 'rgba(245,240,228,0.25)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(COLD_TRAP.x, COLD_TRAP.y, COLD_TRAP.rx * 1.05, COLD_TRAP.ry * 1.05, 0, 0.08 * Math.PI, 0.92 * Math.PI);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(8,8,14,0.5)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.ellipse(COLD_TRAP.x, COLD_TRAP.y, COLD_TRAP.rx * 0.98, COLD_TRAP.ry * 0.96, 0, 1.05 * Math.PI, 1.95 * Math.PI);
  ctx.stroke();
  ctx.restore();

  // Long boulder shadows fall south, away from the low northern Sun
  for (const b of BOULDERS) {
    if (b.x < cx - 80 || b.x > cx + CHUNK + 80 || b.y < cy - 80 || b.y > cy + CHUNK + 120) continue;
    ctx.fillStyle = PAL.shadow;
    ctx.beginPath();
    ctx.ellipse(b.x + 4, b.y + b.r * 1.3, b.r * 0.9, b.r * 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Landing scour: the engine plume blew fine dust away around the lander
  const g = ctx.createRadialGradient(LANDER.x, LANDER.y, 20, LANDER.x, LANDER.y, 120);
  g.addColorStop(0, 'rgba(255,250,236,0.16)');
  g.addColorStop(1, 'rgba(255,250,236,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(LANDER.x, LANDER.y, 120, 0, Math.PI * 2);
  ctx.fill();

  return c;
}

// ---------------------------------------------------------------------------
// Characters
// ---------------------------------------------------------------------------

export interface AstronautPose {
  facing: 'down' | 'up' | 'left' | 'right';
  phase: number; // walk cycle (radians)
  speed01: number; // 0 idle .. 1 full walk
  hop: number; // px lifted
  working: number; // 0..1 arms forward
  /** Specialist suit colour: torso, arms and legs (helmet and life-support pack stay white). */
  stripe: string;
  scale: number;
}

export function drawShadow(ctx: Ctx, x: number, y: number, rx: number, ry: number, alpha = 0.34) {
  ctx.fillStyle = `rgba(14,13,22,${alpha})`;
  ctx.beginPath();
  // big hops shrink the shadow; a negative radius would throw and stop the frame
  ctx.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Darken a #rrggbb colour by a fraction (0..1). */
function darken(hex: string, f: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = (v: number) => Math.round(v * (1 - f)).toString(16).padStart(2, '0');
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

export function drawAstronaut(ctx: Ctx, x: number, y: number, pose: AstronautPose) {
  const s = pose.scale;
  const suit = pose.stripe || PAL.suit;
  const suitShade = darken(suit, 0.22);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // contact shadow shrinks while airborne in low gravity
  const lift = pose.hop;
  drawShadow(ctx, 0, 0, 11 - lift * 0.5, 4.2 - lift * 0.2, 0.36 - lift * 0.02);
  ctx.translate(0, -lift);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = PAL.outline;
  ctx.lineWidth = 1.4;

  const swing = Math.sin(pose.phase) * pose.speed01;
  const side = pose.facing === 'left' || pose.facing === 'right';
  const flip = pose.facing === 'left' ? -1 : 1;
  if (side) ctx.scale(flip, 1);

  // legs
  const legA = side ? swing * 5 : 0;
  const legLiftA = Math.max(0, swing) * 2.5;
  const legLiftB = Math.max(0, -swing) * 2.5;
  ctx.fillStyle = suitShade;
  if (side) {
    roundRect(ctx, -4 + legA, -12 - legLiftA * 0.4, 6, 11, 2.5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = suit;
    roundRect(ctx, -2 - legA, -12 - legLiftB * 0.4, 6, 11, 2.5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = PAL.boot;
    roundRect(ctx, -3 - legA, -3 - legLiftB * 0.4, 8, 4, 1.5);
    ctx.fill();
  } else {
    ctx.fillStyle = suit;
    roundRect(ctx, -7, -13 - legLiftA, 6, 12, 2.5);
    ctx.fill();
    ctx.stroke();
    roundRect(ctx, 1, -13 - legLiftB, 6, 12, 2.5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = PAL.boot;
    roundRect(ctx, -7.5, -3 - legLiftA, 7, 4, 1.5);
    ctx.fill();
    roundRect(ctx, 0.5, -3 - legLiftB, 7, 4, 1.5);
    ctx.fill();
  }

  // backpack behind (visible from back and side)
  if (pose.facing === 'up' || side) {
    ctx.fillStyle = PAL.equipShade;
    roundRect(ctx, side ? -12 : -9, -32, side ? 7 : 18, 18, 3);
    ctx.fill();
    ctx.stroke();
  }

  // torso in the specialist's suit colour
  ctx.fillStyle = suit;
  roundRect(ctx, -9, -31, 18, 19, 5);
  ctx.fill();
  ctx.stroke();
  if (pose.facing === 'down') {
    // white chest control pack
    ctx.fillStyle = PAL.suit;
    roundRect(ctx, -6, -25, 12, 8, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = PAL.accent;
    ctx.fillRect(-3.5, -22.5, 2, 2);
    ctx.fillStyle = PAL.target;
    ctx.fillRect(1, -22.5, 2, 2);
  } else if (side) {
    // pack strap
    ctx.fillStyle = PAL.suit;
    ctx.fillRect(-1.5, -30.5, 3, 18);
  }
  if (pose.facing === 'up') {
    // backpack in front of torso when seen from behind
    ctx.fillStyle = PAL.equipShade;
    roundRect(ctx, -8, -31, 16, 17, 3);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(38,37,44,0.35)';
    ctx.beginPath();
    ctx.moveTo(-5, -26);
    ctx.lineTo(5, -26);
    ctx.moveTo(-5, -22);
    ctx.lineTo(5, -22);
    ctx.stroke();
    ctx.strokeStyle = PAL.outline;
  }

  // arms
  const reach = pose.working;
  const armSwing = side ? swing * 4 : swing * 2.2;
  ctx.fillStyle = suit;
  if (side) {
    ctx.save();
    ctx.translate(1, -28);
    ctx.rotate(-armSwing * 0.08 - reach * 1.1);
    roundRect(ctx, -2.5, 0, 5, 12, 2.5);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.save();
    ctx.translate(-10, -28);
    ctx.rotate(armSwing * 0.08 + reach * 0.5);
    roundRect(ctx, -2.5, 0, 5, 12, 2.5);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.translate(10, -28);
    ctx.rotate(-armSwing * 0.08 - reach * 0.5);
    roundRect(ctx, -2.5, 0, 5, 12, 2.5);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // helmet
  ctx.fillStyle = PAL.suit;
  ctx.beginPath();
  ctx.arc(0, -39, 10.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (pose.facing === 'down') {
    ctx.fillStyle = PAL.visor;
    ctx.beginPath();
    ctx.ellipse(0, -38.5, 7.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.visorSheen;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.ellipse(-2.6, -40.5, 2.4, 1.5, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else if (side) {
    ctx.fillStyle = PAL.visor;
    ctx.beginPath();
    ctx.ellipse(5, -38.5, 4.8, 5.8, 0, -Math.PI / 2, Math.PI / 2);
    ctx.fill();
    ctx.fillStyle = PAL.visorSheen;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(5.5, -42, 1.6, 3);
    ctx.globalAlpha = 1;
  } else {
    ctx.strokeStyle = 'rgba(38,37,44,0.35)';
    ctx.beginPath();
    ctx.arc(0, -39, 6, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.strokeStyle = PAL.outline;
  }
  // backpack antenna
  ctx.strokeStyle = PAL.equipDark;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(side ? -9 : 6, -31);
  ctx.lineTo(side ? -10 : 7, -45);
  ctx.stroke();
  ctx.fillStyle = PAL.accent;
  ctx.beginPath();
  ctx.arc(side ? -10 : 7, -45.5, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Shape helper: fill + outline an ellipse. */
function blob(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string, rot = 0) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

/** Two cartoon eyes that look toward lookX and blink now and then. */
function companionEyes(ctx: Ctx, t: number, lookX: number, lx1: number, lx2: number, ey: number, r = 2.6) {
  const lx = Math.max(-1.5, Math.min(1.5, lookX));
  const blink = Math.sin(t * 1.7) > 0.985;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(lx1 + lx * 0.3, ey, r, blink ? 0.4 : r + 0.2, 0, 0, Math.PI * 2);
  ctx.ellipse(lx2 + lx * 0.3, ey, r, blink ? 0.4 : r + 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  if (!blink) {
    ctx.fillStyle = PAL.outline;
    ctx.beginPath();
    ctx.arc(lx1 + lx, ey, r * 0.5, 0, Math.PI * 2);
    ctx.arc(lx2 + lx, ey, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRockyBody(ctx: Ctx, t: number, lookX: number) {
  // a small, rounded moon-rock friend with stubby feet
  ctx.fillStyle = PAL.boot;
  ctx.fillRect(-6, -3, 4, 3);
  ctx.fillRect(2, -3, 4, 3);
  ctx.fillStyle = '#8f8a82';
  ctx.beginPath();
  ctx.moveTo(-10, -6);
  ctx.quadraticCurveTo(-12, -18, -3, -21);
  ctx.quadraticCurveTo(8, -23, 11, -12);
  ctx.quadraticCurveTo(12, -3, 3, -2);
  ctx.quadraticCurveTo(-8, -1, -10, -6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#a7a297';
  ctx.beginPath();
  ctx.arc(-3, -16, 3, 0, Math.PI * 2);
  ctx.fill();
  companionEyes(ctx, t, lookX, -3, 4, -11);
}

function drawDogBody(ctx: Ctx, t: number, lookX: number) {
  const wag = Math.sin(t * 9) * 0.5;
  // tail
  ctx.save();
  ctx.translate(8, -8);
  ctx.rotate(-0.6 + wag);
  blob(ctx, 0, -4, 1.8, 5, '#b45309');
  ctx.restore();
  // legs, body
  ctx.fillStyle = '#92400e';
  ctx.fillRect(-7, -4, 3.5, 4);
  ctx.fillRect(3.5, -4, 3.5, 4);
  blob(ctx, 0, -7, 9, 5.5, '#d97706');
  // floppy ears behind head
  blob(ctx, -7.5, -15, 2.6, 5, '#92400e', 0.35);
  blob(ctx, 7.5, -15, 2.6, 5, '#92400e', -0.35);
  blob(ctx, 0, -15, 7, 6.5, '#f59e0b');
  // snout + nose
  blob(ctx, 0 + lookX * 0.4, -11.5, 3.6, 2.6, '#fde68a');
  ctx.fillStyle = PAL.outline;
  ctx.beginPath();
  ctx.arc(lookX * 0.4, -12.8, 1.1, 0, Math.PI * 2);
  ctx.fill();
  companionEyes(ctx, t, lookX, -2.8, 2.8, -16.5, 2);
}

function drawCatBody(ctx: Ctx, t: number, lookX: number) {
  const sway = Math.sin(t * 3) * 0.25;
  // curled tail
  ctx.save();
  ctx.translate(7, -6);
  ctx.rotate(sway);
  ctx.strokeStyle = PAL.outline;
  ctx.lineWidth = 4.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(7, -2, 6, -9);
  ctx.stroke();
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 2.4;
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = PAL.outline;
  ctx.lineWidth = 1.4;
  ctx.fillStyle = '#075985';
  ctx.fillRect(-6, -4, 3.5, 4);
  ctx.fillRect(2.5, -4, 3.5, 4);
  blob(ctx, 0, -7, 7.5, 5.5, '#0284c7');
  // pointy ears
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.moveTo(s * 2.5, -20);
    ctx.lineTo(s * 6.5, -25);
    ctx.lineTo(s * 7, -17);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  blob(ctx, 0, -16, 7, 6, '#38bdf8');
  // whiskers
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(s * 3, -13);
    ctx.lineTo(s * 9, -14);
    ctx.moveTo(s * 3, -12.5);
    ctx.lineTo(s * 9, -11.5);
  }
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.lineWidth = 1.4;
  companionEyes(ctx, t, lookX, -2.8, 2.8, -16.5, 2);
}

function drawMonkeyBody(ctx: Ctx, t: number, lookX: number) {
  // curly tail
  ctx.save();
  ctx.translate(-7, -6);
  ctx.rotate(Math.sin(t * 2.5) * 0.2);
  ctx.lineCap = 'round';
  ctx.lineWidth = 4.2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-8, 0, -9, -10, -4, -10);
  ctx.stroke();
  ctx.strokeStyle = '#854d0e';
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = PAL.outline;
  ctx.lineWidth = 1.4;
  ctx.fillStyle = '#713f12';
  ctx.fillRect(-6, -4, 3.5, 4);
  ctx.fillRect(2.5, -4, 3.5, 4);
  blob(ctx, 0, -7, 7, 5.5, '#854d0e');
  // round ears, head, light face
  blob(ctx, -7.5, -16, 3, 3, '#a16207');
  blob(ctx, 7.5, -16, 3, 3, '#a16207');
  blob(ctx, 0, -16, 7, 6.5, '#854d0e');
  blob(ctx, 0, -14.5, 5, 4.5, '#fcd9a8');
  companionEyes(ctx, t, lookX, -2.4, 2.4, -16, 1.9);
}

function drawTardigradeBody(ctx: Ctx, t: number, lookX: number) {
  const wiggle = Math.sin(t * 6) * 0.8;
  // six stubby legs
  ctx.fillStyle = '#047857';
  for (const lx of [-7, 0, 7]) {
    ctx.beginPath();
    ctx.ellipse(lx - 1.5, -2, 1.8, 2.4, 0, 0, Math.PI * 2);
    ctx.ellipse(lx + 1.5, -2 + wiggle * 0.3, 1.8, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // plump segmented body
  blob(ctx, 0, -8, 11, 6.5, '#059669');
  ctx.beginPath();
  for (const sx of [-4, 1, 6]) {
    ctx.moveTo(sx, -13.5);
    ctx.quadraticCurveTo(sx + 1.5, -8, sx, -2.5);
  }
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.lineWidth = 1.4;
  // head with tiny helmet bubble
  blob(ctx, -8, -11, 5, 4.5, '#10b981');
  ctx.fillStyle = 'rgba(186, 230, 253, 0.35)';
  ctx.beginPath();
  ctx.arc(-8, -12, 6.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(224, 242, 254, 0.9)';
  ctx.stroke();
  ctx.strokeStyle = PAL.outline;
  companionEyes(ctx, t, lookX, -10, -6, -12, 1.5);
}

function drawTortoiseBody(ctx: Ctx, t: number, lookX: number) {
  const bob = Math.sin(t * 2) * 0.6;
  // feet
  ctx.fillStyle = '#65a30d';
  for (const fx of [-8, -3, 3, 8]) {
    ctx.beginPath();
    ctx.ellipse(fx, -1.5, 2, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // head peeks out on the side it is looking toward
  const side = lookX < 0 ? -1 : 1;
  blob(ctx, side * 11, -7 + bob, 4, 3.6, '#84cc16');
  ctx.fillStyle = PAL.outline;
  ctx.beginPath();
  ctx.arc(side * 12.3, -8 + bob, 1, 0, Math.PI * 2);
  ctx.fill();
  // domed shell with plates
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.moveTo(-11, -3);
  ctx.quadraticCurveTo(-11, -17, 0, -17);
  ctx.quadraticCurveTo(11, -17, 11, -3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#64748b';
  ctx.beginPath();
  ctx.ellipse(0, -10, 3.4, 3, 0, 0, Math.PI * 2);
  ctx.ellipse(-6, -7, 2.6, 2.4, 0, 0, Math.PI * 2);
  ctx.ellipse(6, -7, 2.6, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
}

const COMPANION_BODIES: Record<string, (ctx: Ctx, t: number, lookX: number) => void> = {
  rocky: drawRockyBody,
  space_dog: drawDogBody,
  space_cat: drawCatBody,
  space_monkey: drawMonkeyBody,
  tardigrade: drawTardigradeBody,
  space_tortoise: drawTortoiseBody,
};

export function drawCompanion(ctx: Ctx, x: number, y: number, t: number, hop: number, lookX: number, mood: string | null, petId = 'rocky') {
  ctx.save();
  ctx.translate(x, y);
  drawShadow(ctx, 0, 0, 9 - hop * 0.3, 3.5, 0.3);
  ctx.translate(0, -hop);
  ctx.strokeStyle = PAL.outline;
  ctx.lineWidth = 1.4;
  (COMPANION_BODIES[petId] || drawRockyBody)(ctx, t, lookX);
  if (mood) {
    ctx.fillStyle = PAL.label;
    roundRect(ctx, -9, -40, 18, 15, 5);
    ctx.fill();
    ctx.fillStyle = mood === '!' ? PAL.target : PAL.accent;
    ctx.font = `bold 12px ${UI_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(mood, 0, -28.5);
  }
  ctx.restore();
}

export function drawRover(ctx: Ctx, x: number, y: number, heading: number, wheelSpin: number, night: number, occupiedStripe?: string) {
  ctx.save();
  ctx.translate(x, y);
  drawShadow(ctx, 3, 8, 34, 16, 0.3);
  ctx.rotate(heading);
  ctx.strokeStyle = PAL.outline;
  ctx.lineWidth = 1.5;
  // headlight cone only matters at night
  if (night > 0.2) {
    const g = ctx.createLinearGradient(26, 0, 140, 0);
    g.addColorStop(0, `rgba(255,232,180,${0.32 * night})`);
    g.addColorStop(1, 'rgba(255,232,180,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(24, -8);
    ctx.lineTo(140, -50);
    ctx.lineTo(140, 50);
    ctx.lineTo(24, 8);
    ctx.fill();
  }
  // wheels: wire-mesh tyres, tread marks move with distance driven
  for (const wx of [-20, 0, 20]) {
    for (const wy of [-18, 18]) {
      ctx.fillStyle = '#4b4a4f';
      roundRect(ctx, wx - 7, wy - 4.5, 14, 9, 3);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(200,196,188,0.55)';
      ctx.lineWidth = 1;
      for (let k = 0; k < 3; k++) {
        const off = ((wheelSpin * 6 + k * 4.7) % 14) - 7;
        ctx.beginPath();
        ctx.moveTo(wx + off, wy - 4);
        ctx.lineTo(wx + off, wy + 4);
        ctx.stroke();
      }
      ctx.strokeStyle = PAL.outline;
      ctx.lineWidth = 1.5;
    }
  }
  // chassis
  ctx.fillStyle = PAL.equip;
  roundRect(ctx, -28, -15, 56, 30, 7);
  ctx.fill();
  ctx.stroke();
  // solar deck
  ctx.fillStyle = PAL.panel;
  roundRect(ctx, -24, -10, 22, 20, 3);
  ctx.fill();
  ctx.strokeStyle = PAL.panelLine;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-13, -10);
  ctx.lineTo(-13, 10);
  ctx.moveTo(-24, 0);
  ctx.lineTo(-2, 0);
  ctx.stroke();
  ctx.strokeStyle = PAL.outline;
  ctx.lineWidth = 1.5;
  // cabin / seat with driver stripe
  ctx.fillStyle = occupiedStripe ? PAL.suit : PAL.equipShade;
  roundRect(ctx, 2, -9, 16, 18, 4);
  ctx.fill();
  ctx.stroke();
  if (occupiedStripe) {
    ctx.fillStyle = occupiedStripe;
    ctx.fillRect(4, -2, 12, 3);
    ctx.fillStyle = PAL.visor;
    ctx.beginPath();
    ctx.arc(14, 0, 3.4, 0, Math.PI * 2);
    ctx.fill();
  }
  // camera mast
  ctx.fillStyle = PAL.equipDark;
  ctx.fillRect(20, -2, 6, 4);
  ctx.fillStyle = PAL.target;
  ctx.fillRect(26, -6, 2.5, 3);
  ctx.fillRect(26, 3, 2.5, 3);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Lander, boulders, resource nodes
// ---------------------------------------------------------------------------

/**
 * The lander in two stages, like Apollo: the gold descent stage (legs, ladder)
 * stays on the ground and works as a launch pad; the crew cabin on top is the
 * ascent stage that flies home. Draw both for the parked lander.
 */
export function drawLander(ctx: Ctx, t: number, lightsOn: boolean, opts?: { ascent?: boolean }) {
  drawLanderDescent(ctx);
  if (opts?.ascent !== false) drawLanderAscent(ctx, t, lightsOn, 0, 0);
}

export function drawLanderDescent(ctx: Ctx) {
  const { x, y } = LANDER;
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = PAL.outline;
  ctx.lineWidth = 1.6;
  drawShadow(ctx, 6, 26, 52, 22, 0.32);
  // legs and footpads
  const legs = [
    [-38, 18],
    [38, 18],
    [-30, -22],
    [30, -22],
  ];
  ctx.strokeStyle = PAL.equipDark;
  ctx.lineWidth = 3;
  for (const [lx, ly] of legs) {
    ctx.beginPath();
    ctx.moveTo(lx * 0.45, ly * 0.4 - 6);
    ctx.lineTo(lx, ly);
    ctx.stroke();
  }
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = PAL.outline;
  for (const [lx, ly] of legs) {
    ctx.fillStyle = PAL.equipShade;
    ctx.beginPath();
    ctx.ellipse(lx, ly + 2, 7, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // gold foil descent stage with crinkles
  ctx.fillStyle = PAL.foil;
  ctx.beginPath();
  const oct = 8;
  for (let i = 0; i < oct; i++) {
    const a = (i / oct) * Math.PI * 2 + Math.PI / 8;
    const px = Math.cos(a) * 30;
    const py = Math.sin(a) * 22 - 6;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(110,80,25,0.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(-24 + i * 9, -14 + (i % 2) * 3);
    ctx.lineTo(-20 + i * 9, 6 - (i % 2) * 4);
    ctx.stroke();
  }
  // ladder down the south leg
  ctx.strokeStyle = PAL.equipDark;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-5, 14);
  ctx.lineTo(-5, 44);
  ctx.moveTo(5, 14);
  ctx.lineTo(5, 44);
  for (let r = 18; r <= 42; r += 6) {
    ctx.moveTo(-5, r);
    ctx.lineTo(5, r);
  }
  ctx.stroke();
  // stencil label: wear and use
  ctx.fillStyle = 'rgba(60,45,15,0.55)';
  ctx.font = `bold 7px ${UI_FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('LM-1', 18, 2);
  ctx.restore();
}

/**
 * Crew cabin (ascent stage). `lift` raises it off the descent stage in world
 * pixels (it also grows a little, as if coming toward the camera); `flame`
 * 0..1 lights the ascent engine.
 */
export function drawLanderAscent(ctx: Ctx, t: number, lightsOn: boolean, lift: number, flame: number) {
  const { x, y } = LANDER;
  ctx.save();
  ctx.translate(x, y);
  if (lift > 0) {
    // shadow left on the ground shrinks and fades as the cabin climbs
    const k = Math.max(0, 1 - lift / 420);
    if (k > 0) drawShadow(ctx, 2, -4, 22 * (0.4 + 0.6 * k), 9 * (0.4 + 0.6 * k), 0.3 * k);
  }
  const grow = 1 + Math.min(0.6, lift / 1400);
  ctx.translate(0, -lift);
  ctx.scale(grow, grow);
  ctx.lineJoin = 'round';
  if (flame > 0) {
    // engine bell and exhaust plume
    const flick = 0.85 + 0.15 * Math.sin(t * 47) + 0.08 * Math.sin(t * 83);
    const len = (22 + 34 * flame) * flick;
    const g = ctx.createLinearGradient(0, -6, 0, -6 + len);
    g.addColorStop(0, 'rgba(255,255,240,0.95)');
    g.addColorStop(0.25, 'rgba(255,214,120,0.9)');
    g.addColorStop(0.7, 'rgba(255,128,64,0.55)');
    g.addColorStop(1, 'rgba(255,90,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-6, -4);
    ctx.quadraticCurveTo(-9 * flame - 3, -4 + len * 0.45, 0, -4 + len);
    ctx.quadraticCurveTo(9 * flame + 3, -4 + len * 0.45, 6, -4);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.35 * flame;
    ctx.fillStyle = '#ffd38a';
    ctx.beginPath();
    ctx.ellipse(0, 2, 16 * flame + 4, 10 * flame + 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (lift > 0 || flame > 0) {
    ctx.fillStyle = PAL.metal;
    ctx.strokeStyle = PAL.outline;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-5, -9);
    ctx.lineTo(5, -9);
    ctx.lineTo(7, -3);
    ctx.lineTo(-7, -3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // crew cabin
  ctx.strokeStyle = PAL.outline;
  ctx.lineWidth = 1.6;
  ctx.fillStyle = PAL.equip;
  roundRect(ctx, -18, -38, 36, 30, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = PAL.equipShade;
  ctx.fillRect(-17, -16, 34, 7);
  // window
  ctx.fillStyle = lightsOn ? PAL.light : PAL.visor;
  roundRect(ctx, -8, -32, 16, 9, 3);
  ctx.fill();
  ctx.stroke();
  // little antenna
  ctx.strokeStyle = PAL.equipDark;
  ctx.beginPath();
  ctx.moveTo(14, -38);
  ctx.lineTo(18, -50);
  ctx.stroke();
  ctx.fillStyle = Math.sin(t * 2) > 0.6 ? PAL.warn : '#8a3d36';
  ctx.beginPath();
  ctx.arc(18, -51, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawBoulder(ctx: Ctx, b: Boulder) {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.strokeStyle = PAL.outline;
  ctx.lineWidth = 1.5;
  ctx.fillStyle = '#77736c';
  ctx.beginPath();
  const pts = 9;
  for (let i = 0; i < pts; i++) {
    const a = (i / pts) * Math.PI * 2;
    const r = b.r * (0.82 + hash2(b.x + i, b.y - i) * 0.25);
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r * 0.78 - b.r * 0.25;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // lit top (Sun from the north is low, so the top-north face is brightest)
  ctx.fillStyle = 'rgba(255,248,232,0.22)';
  ctx.beginPath();
  ctx.ellipse(-b.r * 0.15, -b.r * 0.55, b.r * 0.55, b.r * 0.28, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawNode(
  ctx: Ctx,
  type: string,
  x: number,
  y: number,
  usesLeft: number,
  maxUses: number,
  t: number,
  highlight: boolean
) {
  const size = 0.65 + 0.35 * (usesLeft / Math.max(1, maxUses));
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = PAL.outline;
  ctx.lineWidth = 1.4;
  if (highlight) {
    ctx.strokeStyle = PAL.target;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.ellipse(0, 2, 20, 9, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = PAL.outline;
    ctx.lineWidth = 1.4;
  }
  ctx.scale(size, size);
  switch (type) {
    case 'regolith': {
      drawShadow(ctx, 2, 4, 16, 6, 0.25);
      ctx.fillStyle = '#a9a398';
      ctx.beginPath();
      ctx.ellipse(0, -2, 15, 8, 0, Math.PI, Math.PI * 2);
      ctx.quadraticCurveTo(15, 4, 0, 4);
      ctx.quadraticCurveTo(-15, 4, -15, -2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,250,238,0.35)';
      ctx.beginPath();
      ctx.ellipse(-3, -6, 6, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      // scoop marks show it has been dug
      if (usesLeft < maxUses) {
        ctx.strokeStyle = 'rgba(40,38,44,0.4)';
        ctx.beginPath();
        ctx.arc(6, -2, 3, 0, Math.PI);
        ctx.stroke();
      }
      break;
    }
    case 'metalOre':
    case 'titanium': {
      drawShadow(ctx, 3, 5, 14, 6, 0.3);
      ctx.fillStyle = type === 'titanium' ? '#4d4b55' : '#55524f';
      ctx.beginPath();
      ctx.moveTo(-12, 2);
      ctx.lineTo(-9, -10);
      ctx.lineTo(1, -15);
      ctx.lineTo(11, -8);
      ctx.lineTo(12, 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = type === 'titanium' ? '#b9b2e0' : '#d8d3c4';
      for (const [fx, fy] of [
        [-4, -7],
        [4, -3],
        [6, -10],
        [-6, -1],
      ]) {
        ctx.fillRect(fx, fy, 2, 2);
      }
      break;
    }
    case 'silicon': {
      drawShadow(ctx, 2, 4, 12, 5, 0.25);
      ctx.fillStyle = '#d9d6e6';
      for (const [cx, h, w] of [
        [-6, 14, 5],
        [1, 19, 6],
        [7, 11, 4],
      ]) {
        ctx.beginPath();
        ctx.moveTo(cx - w, 2);
        ctx.lineTo(cx, -h);
        ctx.lineTo(cx + w, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(157,140,255,0.45)';
      ctx.fillRect(0, -12, 2, 9);
      break;
    }
    case 'waterIce': {
      ctx.fillStyle = 'rgba(215,236,255,0.22)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PAL.ice;
      ctx.beginPath();
      ctx.moveTo(-8, 2);
      ctx.lineTo(-4, -7);
      ctx.lineTo(3, -9);
      ctx.lineTo(9, -1);
      ctx.lineTo(4, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      const tw = (Math.sin(t * 3 + x * 0.1) + 1) / 2;
      ctx.fillStyle = `rgba(255,255,255,${0.4 + tw * 0.6})`;
      ctx.beginPath();
      ctx.moveTo(1, -12);
      ctx.lineTo(2, -9);
      ctx.lineTo(5, -8);
      ctx.lineTo(2, -7);
      ctx.lineTo(1, -4);
      ctx.lineTo(0, -7);
      ctx.lineTo(-3, -8);
      ctx.lineTo(0, -9);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'samples': {
      drawShadow(ctx, 2, 4, 10, 4, 0.25);
      ctx.fillStyle = '#d6d1c4';
      ctx.beginPath();
      ctx.ellipse(0, -4, 9, 7, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // sample marker stake (no flag: there is no wind)
      ctx.strokeStyle = PAL.equipDark;
      ctx.beginPath();
      ctx.moveTo(10, 2);
      ctx.lineTo(10, -16);
      ctx.stroke();
      ctx.fillStyle = PAL.target;
      ctx.fillRect(8.5, -18, 3, 3);
      break;
    }
    case 'crate': {
      drawShadow(ctx, 3, 6, 18, 7, 0.32);
      ctx.fillStyle = PAL.equipShade;
      ctx.fillRect(-15, -6, 30, 10);
      ctx.strokeRect(-15, -6, 30, 10);
      ctx.fillStyle = PAL.equip;
      ctx.fillRect(-15, -18, 30, 12);
      ctx.strokeRect(-15, -18, 30, 12);
      ctx.fillStyle = PAL.target;
      ctx.fillRect(-3, -18, 6, 22);
      ctx.fillStyle = 'rgba(38,37,44,0.6)';
      ctx.font = `bold 6px ${UI_FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('CARGO', -9, -10);
      break;
    }
    case 'tech_wreck': {
      drawShadow(ctx, 3, 5, 16, 6, 0.28);
      ctx.rotate(-0.25);
      ctx.fillStyle = PAL.equipShade;
      roundRect(ctx, -8, -12, 16, 12, 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = PAL.panel;
      ctx.fillRect(-20, -9, 11, 7);
      ctx.strokeRect(-20, -9, 11, 7);
      ctx.strokeStyle = PAL.equipDark;
      ctx.beginPath();
      ctx.moveTo(4, -12);
      ctx.lineTo(9, -22);
      ctx.stroke();
      break;
    }
    case 'helium3': {
      drawShadow(ctx, 2, 4, 14, 5, 0.25);
      ctx.fillStyle = '#9c968a';
      ctx.beginPath();
      ctx.ellipse(0, -2, 14, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(157,140,255,0.35)';
      ctx.beginPath();
      ctx.ellipse(0, -3, 7, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    default: {
      ctx.fillStyle = '#8d887f';
      ctx.beginPath();
      ctx.arc(0, -5, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Buildings (footprint is w×h in world px; art rises a little above it)
// ---------------------------------------------------------------------------

export interface BuildingLook {
  powered: boolean;
  online: boolean;
  dust: number; // 0-100
  growth: number; // 0-100
  charge: number; // 0-1 battery
  night: number; // 0..1
  dishAngle: number;
  t: number;
  ghost?: boolean;
  appear: number; // 0..1 build-in animation
}

export function drawBuilding(ctx: Ctx, recipeId: string, x: number, y: number, w: number, h: number, look: BuildingLook) {
  ctx.save();
  ctx.translate(x, y);
  if (look.appear < 1) {
    const s = 0.6 + 0.4 * smooth(look.appear);
    ctx.translate(w / 2, h);
    ctx.scale(s, s);
    ctx.translate(-w / 2, -h);
    ctx.globalAlpha *= 0.3 + 0.7 * look.appear;
  }
  ctx.lineJoin = 'round';
  ctx.strokeStyle = PAL.outline;
  ctx.lineWidth = 1.6;
  if (!look.ghost) drawShadow(ctx, w / 2 + 4, h - 2, w * 0.55, h * 0.22, 0.3);

  const box = (bx: number, by: number, bw: number, bh: number, depth: number, top: string, front: string, r = 4) => {
    ctx.fillStyle = front;
    roundRect(ctx, bx, by + bh - depth, bw, depth, r);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = top;
    roundRect(ctx, bx, by, bw, bh - depth + 2, r);
    ctx.fill();
    ctx.stroke();
  };

  switch (recipeId) {
    case 'habitat': {
      // inflatable dome on a ring base, seams, airlock to the south
      ctx.fillStyle = PAL.equipShade;
      ctx.beginPath();
      ctx.ellipse(w / 2, h - 12, w / 2 - 2, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = PAL.equip;
      ctx.beginPath();
      ctx.ellipse(w / 2, h - 16, w / 2 - 4, h - 22, 0, Math.PI, Math.PI * 2);
      ctx.lineTo(w - 4, h - 16);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(38,37,44,0.25)';
      ctx.lineWidth = 1;
      for (const k of [-0.5, 0, 0.5]) {
        ctx.beginPath();
        ctx.ellipse(w / 2, h - 16, (w / 2 - 4) * Math.abs(Math.cos(k * 1.2)) + 0.5, h - 22, 0, Math.PI, Math.PI * 2);
        ctx.stroke();
      }
      ctx.strokeStyle = PAL.outline;
      ctx.lineWidth = 1.6;
      // window: warm light when powered
      const lit = look.powered && !look.ghost;
      ctx.fillStyle = lit ? PAL.light : PAL.visor;
      roundRect(ctx, w / 2 - 16, h / 2 - 14, 12, 8, 3);
      ctx.fill();
      ctx.stroke();
      roundRect(ctx, w / 2 + 4, h / 2 - 14, 12, 8, 3);
      ctx.fill();
      ctx.stroke();
      // airlock
      ctx.fillStyle = PAL.equipShade;
      roundRect(ctx, w / 2 - 10, h - 26, 20, 20, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = PAL.metal;
      roundRect(ctx, w / 2 - 6, h - 22, 12, 14, 3);
      ctx.fill();
      ctx.fillStyle = 'rgba(38,37,44,0.6)';
      ctx.font = `bold 6px ${UI_FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('HAB-1', w / 2, h / 2 + 6);
      break;
    }
    case 'solar_panel': {
      // the Sun is low, so panels stand tall on a mast and face north
      ctx.fillStyle = PAL.equipDark;
      ctx.fillRect(w / 2 - 2, h - 18, 4, 14);
      ctx.strokeRect(w / 2 - 2, h - 18, 4, 14);
      ctx.fillStyle = PAL.equipShade;
      roundRect(ctx, w / 2 - 9, h - 8, 18, 6, 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = PAL.panel;
      roundRect(ctx, 2, 2, w - 4, h - 20, 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = PAL.panelLine;
      ctx.lineWidth = 0.8;
      const cols = 4;
      const rows = 3;
      for (let i = 1; i < cols; i++) {
        ctx.beginPath();
        ctx.moveTo(2 + ((w - 4) * i) / cols, 3);
        ctx.lineTo(2 + ((w - 4) * i) / cols, h - 19);
        ctx.stroke();
      }
      for (let j = 1; j < rows; j++) {
        ctx.beginPath();
        ctx.moveTo(3, 2 + ((h - 20) * j) / rows);
        ctx.lineTo(w - 3, 2 + ((h - 20) * j) / rows);
        ctx.stroke();
      }
      // dust film
      if (look.dust > 15) {
        ctx.fillStyle = `rgba(170,160,140,${Math.min(0.75, look.dust / 110)})`;
        roundRect(ctx, 2, 2, w - 4, h - 20, 2);
        ctx.fill();
      }
      ctx.strokeStyle = PAL.outline;
      break;
    }
    case 'battery': {
      box(4, 6, w - 8, h - 10, 10, PAL.equip, PAL.equipShade);
      // charge bars
      for (let i = 0; i < 4; i++) {
        const on = look.charge > (i + 0.5) / 4;
        ctx.fillStyle = on ? PAL.ok : 'rgba(38,37,44,0.35)';
        ctx.fillRect(10 + i * ((w - 20) / 4), h - 12, (w - 20) / 4 - 3, 4);
      }
      ctx.fillStyle = 'rgba(38,37,44,0.5)';
      ctx.font = `bold 6px ${UI_FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('PWR STORE', w / 2, 18);
      break;
    }
    case 'oxygen_generator': {
      box(4, 14, w - 8, h - 16, 9, PAL.equip, PAL.equipShade);
      for (const tx of [w * 0.3, w * 0.66]) {
        ctx.fillStyle = PAL.equip;
        roundRect(ctx, tx - 7, 0, 14, 26, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = look.online ? PAL.ok : PAL.equipShade;
        ctx.fillRect(tx - 6, 8, 12, 3);
      }
      if (look.online && look.powered && !look.ghost) {
        const p = (look.t * 0.8) % 1;
        ctx.fillStyle = `rgba(255,255,255,${0.35 * (1 - p)})`;
        ctx.beginPath();
        ctx.arc(w - 8, 10 - p * 10, 2 + p * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'water_storage': {
      ctx.fillStyle = PAL.equip;
      ctx.beginPath();
      ctx.ellipse(w / 2, h - 10, w / 2 - 4, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(4, 8, w - 8, h - 18);
      ctx.strokeRect(4, 8, w - 8, h - 18);
      ctx.beginPath();
      ctx.ellipse(w / 2, 8, w / 2 - 4, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(120,150,210,0.6)';
      ctx.fillRect(w / 2 - 2, 14, 4, h - 28);
      break;
    }
    case 'water_recycler': {
      box(2, 12, w - 4, h - 14, 9, PAL.equip, PAL.equipShade);
      ctx.fillStyle = PAL.equipShade;
      roundRect(ctx, 6, 0, 12, 26, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = PAL.equip;
      roundRect(ctx, w - 20, 4, 14, 22, 6);
      ctx.fill();
      ctx.stroke();
      const lvl = look.online ? 0.4 + 0.25 * Math.sin(look.t * 1.2) : 0.15;
      ctx.fillStyle = 'rgba(120,150,210,0.75)';
      ctx.fillRect(w - 17, 24 - 18 * lvl, 8, 18 * lvl);
      ctx.strokeStyle = PAL.equipDark;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(18, 12);
      ctx.lineTo(w - 20, 12);
      ctx.stroke();
      break;
    }
    case 'greenhouse': {
      ctx.fillStyle = PAL.equipShade;
      roundRect(ctx, 2, h - 14, w - 4, 12, 4);
      ctx.fill();
      ctx.stroke();
      // grow-light glow (restrained purple)
      const g = Math.max(0, Math.min(1, look.growth / 100));
      if (look.powered && !look.ghost) {
        const glow = ctx.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
        glow.addColorStop(0, `rgba(197,140,255,${0.32 + 0.25 * look.night})`);
        glow.addColorStop(1, 'rgba(197,140,255,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(-10, -10, w + 20, h + 20);
      }
      // plants grow with progress
      for (let i = 0; i < 6; i++) {
        const px = 12 + (i % 3) * ((w - 24) / 2);
        const py = h / 2 - 4 + Math.floor(i / 3) * 16;
        const s = 2 + 6 * g;
        ctx.fillStyle = g >= 1 ? '#7fd1a0' : '#5fa77c';
        ctx.beginPath();
        ctx.arc(px, py, s, 0, Math.PI * 2);
        ctx.fill();
        if (g >= 1) {
          ctx.fillStyle = PAL.target;
          ctx.beginPath();
          ctx.arc(px + 2, py - 2, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // glass dome with frame
      ctx.fillStyle = 'rgba(230,236,255,0.18)';
      ctx.beginPath();
      ctx.ellipse(w / 2, h - 14, w / 2 - 3, h - 18, 0, Math.PI, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(232,227,215,0.7)';
      ctx.lineWidth = 1;
      for (const k of [0.33, 0.66]) {
        ctx.beginPath();
        ctx.moveTo(w * k, h - 14);
        ctx.quadraticCurveTo(w / 2, -6, w * k, h - 14);
        ctx.stroke();
      }
      ctx.strokeStyle = PAL.outline;
      break;
    }
    case 'research_lab': {
      box(2, 10, w - 4, h - 12, 12, PAL.equip, PAL.equipShade, 6);
      ctx.fillStyle = look.powered && look.online ? PAL.light : PAL.visor;
      for (let i = 0; i < 3; i++) {
        roundRect(ctx, 10 + i * ((w - 20) / 3), h - 22, (w - 20) / 3 - 6, 7, 2);
        ctx.fill();
      }
      ctx.fillStyle = PAL.equipShade;
      ctx.beginPath();
      ctx.arc(w - 16, 14, 8, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(38,37,44,0.55)';
      ctx.font = `bold 6px ${UI_FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText('SCI LAB', 10, 24);
      break;
    }
    case 'communication_tower': {
      ctx.fillStyle = PAL.equipShade;
      roundRect(ctx, w / 2 - 12, h - 10, 24, 8, 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = PAL.equipDark;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(w / 2 - 8, h - 10);
      ctx.lineTo(w / 2 - 2, 14);
      ctx.moveTo(w / 2 + 8, h - 10);
      ctx.lineTo(w / 2 + 2, 14);
      for (let r = h - 16; r > 18; r -= 9) {
        ctx.moveTo(w / 2 - 6, r);
        ctx.lineTo(w / 2 + 6, r - 6);
      }
      ctx.stroke();
      ctx.save();
      ctx.translate(w / 2, 12);
      ctx.rotate(look.dishAngle);
      ctx.strokeStyle = PAL.outline;
      ctx.lineWidth = 1.5;
      ctx.fillStyle = PAL.equip;
      ctx.beginPath();
      ctx.ellipse(0, -4, 13, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = PAL.equipDark;
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.lineTo(0, -14);
      ctx.stroke();
      ctx.restore();
      const blink = Math.sin(look.t * 3) > 0.7;
      ctx.fillStyle = look.online ? (blink ? PAL.ok : '#3f7a5c') : blink ? PAL.warn : '#7a3a34';
      ctx.beginPath();
      ctx.arc(w / 2, 2, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'radiation_shelter': {
      // a habitat buried under a thick mound of regolith
      ctx.fillStyle = '#8a857c';
      ctx.beginPath();
      ctx.ellipse(w / 2, h - 12, w / 2, h / 2 - 2, 0, Math.PI, Math.PI * 2);
      ctx.lineTo(w, h - 6);
      ctx.lineTo(0, h - 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,250,238,0.2)';
      ctx.beginPath();
      ctx.ellipse(w / 2 - 6, h / 2 - 2, w / 3, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PAL.metal;
      roundRect(ctx, w / 2 - 8, h - 22, 16, 16, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = PAL.target;
      ctx.fillRect(w / 2 - 8, h - 24, 16, 3);
      break;
    }
    case 'landing_pad': {
      ctx.fillStyle = '#9a958b';
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2, w / 2 - 2, h / 2 - 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(242,184,75,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2, w / 3, h / 3, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w / 2 - 10, h / 2);
      ctx.lineTo(w / 2 + 10, h / 2);
      ctx.moveTo(w / 2, h / 2 - 10);
      ctx.lineTo(w / 2, h / 2 + 10);
      ctx.stroke();
      break;
    }
    case 'rover': {
      ctx.fillStyle = PAL.equipShade;
      ctx.beginPath();
      ctx.moveTo(2, h - 6);
      ctx.lineTo(2, 18);
      ctx.quadraticCurveTo(w / 2, -8, w - 2, 18);
      ctx.lineTo(w - 2, h - 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = PAL.visor;
      roundRect(ctx, 12, h - 30, w - 24, 24, 3);
      ctx.fill();
      break;
    }
    case 'medical_station': {
      box(3, 8, w - 6, h - 10, 10, PAL.equip, PAL.equipShade);
      ctx.fillStyle = PAL.ok;
      ctx.fillRect(w / 2 - 2, 14, 4, 12);
      ctx.fillRect(w / 2 - 6, 18, 12, 4);
      break;
    }
    default: {
      box(2, 8, w - 4, h - 10, 12, PAL.equip, PAL.equipShade);
      ctx.fillStyle = PAL.equipDark;
      ctx.fillRect(w - 18, 0, 10, 14);
      ctx.strokeRect(w - 18, 0, 10, 14);
    }
  }

  // status tags drawn on the building itself (label + symbol, not color alone)
  if (!look.ghost) {
    if (!look.online && recipeId !== 'solar_panel') tag(ctx, w / 2, -6, '⚙ Needs setup', PAL.target);
    else if (look.dust > 45 && recipeId === 'solar_panel') tag(ctx, w / 2, -6, '▲ Dusty', PAL.target);
    else if (!look.powered && recipeId !== 'solar_panel' && recipeId !== 'landing_pad' && recipeId !== 'radiation_shelter' && recipeId !== 'water_storage') tag(ctx, w / 2, -6, '⚡ No power', PAL.warn);
  }
  ctx.restore();
}

export function tag(ctx: Ctx, x: number, y: number, text: string, color: string) {
  ctx.save();
  ctx.font = `bold 11px ${UI_FONT}`;
  const tw = ctx.measureText(text).width + 12;
  ctx.fillStyle = PAL.label;
  roundRect(ctx, x - tw / 2, y - 15, tw, 18, 6);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y - 2);
  ctx.restore();
}

/** In-world action prompt: a key cap plus a short verb, e.g. [E] Collect ice */
export function drawPrompt(ctx: Ctx, x: number, y: number, key: string | null, text: string, emphasis = true) {
  ctx.save();
  ctx.font = `bold 13px ${UI_FONT}`;
  const textW = ctx.measureText(text).width;
  const keyW = key ? ctx.measureText(key).width + 12 : 0;
  const w = textW + keyW + (key ? 22 : 16);
  const h = 26;
  const left = x - w / 2;
  ctx.fillStyle = PAL.label;
  roundRect(ctx, left, y - h, w, h, 8);
  ctx.fill();
  if (emphasis) {
    ctx.strokeStyle = 'rgba(242,184,75,0.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  let cx = left + 8;
  if (key) {
    ctx.fillStyle = PAL.text;
    roundRect(ctx, cx, y - h + 5, keyW, 16, 4);
    ctx.fill();
    ctx.fillStyle = '#1a1a20';
    ctx.textAlign = 'center';
    ctx.fillText(key, cx + keyW / 2, y - 8.5);
    cx += keyW + 6;
  }
  ctx.fillStyle = PAL.text;
  ctx.textAlign = 'left';
  ctx.fillText(text, cx, y - 8.5);
  // small pointer
  ctx.fillStyle = PAL.label;
  ctx.beginPath();
  ctx.moveTo(x - 5, y);
  ctx.lineTo(x + 5, y);
  ctx.lineTo(x, y + 5);
  ctx.fill();
  ctx.restore();
  return { left, top: y - h, w, h };
}

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export { lerp };
