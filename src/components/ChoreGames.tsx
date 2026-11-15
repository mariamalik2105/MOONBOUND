/**
 * Quick base chores that pay coins: scrub a dusty solar panel, tend the
 * greenhouse (pick, sow, water), and fix the power line (rotate wire tiles).
 * Each takes 10 to 40 seconds, works with mouse/trackpad or keyboard, and can't
 * be failed, only finished.
 */

import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { sound } from '../game/audio';
import { roundRect } from './arcade/RocketRun';

export type ChoreKind = 'scrub' | 'garden' | 'wires';

export const CHORE_COINS: Record<ChoreKind, number> = { scrub: 8, garden: 12, wires: 15 };

interface ChoreProps {
  kind: ChoreKind;
  /** greenhouse growth 0..100 when kind is garden */
  growth?: number;
  /** garden: watering is resting (seconds left) */
  waterCooldown?: number;
  reducedMotion: boolean;
  onClose: () => void;
  /** scrub/wires: finished. garden: see onPicked/onWatered */
  onDone: () => void;
  onPicked?: () => void;
  onWatered?: () => void;
}

const TITLES: Record<ChoreKind, string> = {
  scrub: 'Scrub the solar panel',
  garden: 'Moon garden',
  wires: 'Fix the power line',
};

export const ChoreOverlay: React.FC<ChoreProps> = (p) => (
  <div className="mb-backdrop absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label={TITLES[p.kind]}>
    <div className="mb-card w-full max-w-xl rounded-2xl bg-moon-panel border border-moon-line p-5 shadow-2xl mb-rise">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h2 className="text-2xl font-semibold">{TITLES[p.kind]}</h2>
          <p className="text-sm text-moon-target font-bold">Reward: {CHORE_COINS[p.kind]} ✦</p>
        </div>
        <button onClick={p.onClose} aria-label="Close (Esc)" className="rounded-lg p-2 bg-slate-800 hover:bg-slate-700">
          <X className="w-5 h-5" />
        </button>
      </div>
      {p.kind === 'scrub' && <Scrub {...p} />}
      {p.kind === 'garden' && <Garden {...p} />}
      {p.kind === 'wires' && <Wires {...p} />}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Scrub: rub the dust off (move the pointer over it, or hold Space/E)
// ---------------------------------------------------------------------------

const GX = 16;
const GY = 8;

const Scrub: React.FC<ChoreProps> = ({ onDone }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const dust = useRef<number[]>(Array.from({ length: GX * GY }, () => 0.7 + Math.random() * 0.3));
  const brush = useRef({ x: 0.1, y: 0.2, auto: false, t: 0, dir: 1, row: 0 });
  const [clean, setClean] = useState(0);
  const finished = useRef(false);

  const rub = (x: number, y: number) => {
    let changed = false;
    for (let j = 0; j < GY; j++)
      for (let i = 0; i < GX; i++) {
        const cx = (i + 0.5) / GX;
        const cy = (j + 0.5) / GY;
        const d = Math.hypot((cx - x) * 2, cy - y);
        if (d < 0.16) {
          const k = j * GX + i;
          if (dust.current[k] > 0) {
            dust.current[k] = Math.max(0, dust.current[k] - 0.22);
            changed = true;
          }
        }
      }
    if (changed && Math.random() < 0.12) sound.playClick();
  };

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === ' ' || k === 'e') {
        e.preventDefault();
        brush.current.auto = true;
      }
    };
    const ku = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === ' ' || k === 'e') brush.current.auto = false;
    };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    };
  }, []);

  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext('2d')!;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      const r = c.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (c.width !== Math.round(r.width * dpr)) {
        c.width = Math.round(r.width * dpr);
        c.height = Math.round(r.height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = r.width;
      const h = r.height;
      const b = brush.current;
      if (b.auto && !finished.current) {
        // the brush sweeps back and forth, row by row
        b.x += b.dir * dt * 1.6;
        if (b.x > 0.95 || b.x < 0.05) {
          b.dir *= -1;
          b.x = Math.max(0.05, Math.min(0.95, b.x));
          b.row = (b.row + 1) % 4;
        }
        b.y = 0.12 + b.row * 0.25;
        rub(b.x, b.y);
      }
      // panel
      ctx.fillStyle = '#1d1c21';
      ctx.fillRect(0, 0, w, h);
      const pw = w - 20;
      const ph = h - 20;
      ctx.fillStyle = '#2f3a7a';
      roundRect(ctx, 10, 10, pw, ph, 8);
      ctx.fill();
      ctx.strokeStyle = '#8b877f';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(160,180,255,0.35)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(10 + (pw * i) / 8, 10);
        ctx.lineTo(10 + (pw * i) / 8, 10 + ph);
        ctx.stroke();
      }
      for (let j = 1; j < 4; j++) {
        ctx.beginPath();
        ctx.moveTo(10, 10 + (ph * j) / 4);
        ctx.lineTo(10 + pw, 10 + (ph * j) / 4);
        ctx.stroke();
      }
      // shine where clean
      const total = dust.current.reduce((a, v) => a + v, 0) / (GX * GY);
      ctx.fillStyle = `rgba(255,255,255,${0.12 * (1 - total)})`;
      ctx.fillRect(10, 10, pw, ph * 0.3);
      // dust
      for (let j = 0; j < GY; j++)
        for (let i = 0; i < GX; i++) {
          const d = dust.current[j * GX + i];
          if (d <= 0) continue;
          ctx.fillStyle = `rgba(176,166,146,${d})`;
          ctx.fillRect(10 + (pw * i) / GX - 0.5, 10 + (ph * j) / GY - 0.5, pw / GX + 1, ph / GY + 1);
        }
      // brush
      ctx.fillStyle = '#f2b84b';
      ctx.strokeStyle = '#26252c';
      ctx.lineWidth = 2;
      roundRect(ctx, 10 + b.x * pw - 22, 10 + b.y * ph - 10, 44, 20, 6);
      ctx.fill();
      ctx.stroke();
      const pct = Math.round((1 - total) * 100);
      setClean((v) => (v !== pct ? pct : v));
      if (pct >= 92 && !finished.current) {
        finished.current = true;
        sound.playVictory();
        setTimeout(onDone, 700);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left - 10) / (r.width - 20);
    const y = (e.clientY - r.top - 10) / (r.height - 20);
    brush.current.x = x;
    brush.current.y = y;
    if (!finished.current) rub(x, y);
  };

  return (
    <div className="space-y-2">
      <p className="text-moon-muted">Moon dust sticks to panels and blocks sunlight. Move your mouse over the panel to scrub it, or hold Space.</p>
      <canvas ref={ref} onPointerMove={move} onPointerDown={move} className="w-full h-[220px] rounded-xl block cursor-grab touch-none" aria-label={`Dusty solar panel, ${clean}% clean`} />
      <div className="h-3 rounded-full bg-slate-800 overflow-hidden" aria-label="Clean">
        <div className={`h-full ${clean >= 92 ? 'bg-moon-ok' : 'bg-moon-target'}`} style={{ width: `${Math.min(100, (clean / 92) * 100)}%` }} />
      </div>
      <p className="text-sm font-bold">{clean >= 92 ? 'Sparkling clean! Full sunlight again.' : `${clean}% clean`}</p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Garden: pick ripe plants, sow seeds, water them
// ---------------------------------------------------------------------------

const PLOTS = 6;
const CROPS = ['🥬', '🍅', '🥔', '🥕', '🍅', '🥬'];

const Garden: React.FC<ChoreProps> = ({ growth = 0, waterCooldown = 0, onDone, onPicked, onWatered }) => {
  const ripe = growth >= 100;
  const [stage, setStage] = useState<'pick' | 'sow' | 'water' | 'grow' | 'done'>(ripe ? 'pick' : 'grow');
  const [plots, setPlots] = useState<('ripe' | 'empty' | 'seed' | 'wet' | 'sprout')[]>(Array(PLOTS).fill(ripe ? 'ripe' : 'sprout'));
  const [watered, setWatered] = useState<boolean[]>(Array(PLOTS).fill(false));
  const [msg, setMsg] = useState<string | null>(null);

  const act = (i: number) => {
    if (stage === 'pick' && plots[i] === 'ripe') {
      sound.playCollect();
      const n = plots.map((v, k) => (k === i ? 'empty' : v)) as typeof plots;
      setPlots(n);
      if (n.every((v) => v === 'empty')) {
        onPicked?.();
        setStage('sow');
        setMsg('Basket full! Now sow new seeds in each pot.');
      }
    } else if (stage === 'sow' && plots[i] === 'empty') {
      sound.playClick();
      const n = plots.map((v, k) => (k === i ? 'seed' : v)) as typeof plots;
      setPlots(n);
      if (n.every((v) => v === 'seed')) {
        setStage('water');
        setMsg('Seeds in! Give each pot a drink of recycled water.');
      }
    } else if (stage === 'water' && plots[i] === 'seed') {
      sound.playCollect();
      const n = plots.map((v, k) => (k === i ? 'wet' : v)) as typeof plots;
      setPlots(n);
      if (n.every((v) => v === 'wet')) {
        setStage('done');
        setMsg('All planted and watered. Come back when they are ripe!');
        sound.playVictory();
        onWatered?.();
        setTimeout(onDone, 1100);
      }
    } else if (stage === 'grow' && !watered[i]) {
      if (waterCooldown > 0) {
        setMsg(`The soil is still wet. Try again in ${Math.ceil(waterCooldown)} s.`);
        return;
      }
      sound.playCollect();
      const n = watered.map((v, k) => (k === i ? true : v));
      setWatered(n);
      if (n.every(Boolean)) {
        setStage('done');
        setMsg('Watered! The plants will grow faster now.');
        sound.playVictory();
        onWatered?.();
        setTimeout(onDone, 1100);
      }
    }
  };

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const n = Number(e.key);
      if (n >= 1 && n <= PLOTS) act(n - 1);
    };
    window.addEventListener('keydown', kd);
    return () => window.removeEventListener('keydown', kd);
  });

  const instruction =
    stage === 'pick'
      ? 'The crops are ripe! Click each plant to pick it (or press 1 to 6).'
      : stage === 'sow'
      ? 'Click each pot to sow a seed.'
      : stage === 'water'
      ? 'Click each pot to water it.'
      : stage === 'grow'
      ? waterCooldown > 0
        ? `Plants are growing (${Math.round(growth)}%). The soil is still wet, come back in ${Math.ceil(waterCooldown)} s.`
        : `Plants are growing (${Math.round(growth)}%). Water each one to help them grow faster.`
      : '';

  return (
    <div className="space-y-3">
      <p className="text-moon-muted">{instruction}</p>
      <div className="grid grid-cols-3 gap-2">
        {plots.map((v, i) => {
          const wet = v === 'wet' || (stage === 'grow' && watered[i]) || (stage === 'done' && !ripe);
          const icon = v === 'ripe' ? CROPS[i] : v === 'sprout' ? (growth > 60 ? '🌿' : '🌱') : v === 'seed' || v === 'wet' ? '•' : '';
          return (
            <button
              key={i}
              onClick={() => act(i)}
              className={`relative h-24 rounded-xl border-2 flex items-end justify-center pb-2 text-4xl ${
                (stage === 'pick' && v === 'ripe') || (stage === 'sow' && v === 'empty') || (stage === 'water' && v === 'seed') || (stage === 'grow' && !watered[i] && waterCooldown <= 0)
                  ? 'border-moon-target hover:bg-slate-800'
                  : 'border-moon-line'
              } ${wet ? 'bg-[#2c2620]' : 'bg-[#3a3128]'}`}
              aria-label={`Pot ${i + 1}: ${v}`}
            >
              <kbd className="absolute left-1.5 top-1 rounded bg-slate-950 px-1 text-xs">{i + 1}</kbd>
              {wet && <span className="absolute right-2 top-1 text-base">💧</span>}
              <span className={v === 'ripe' ? 'mb-pop' : ''}>{icon}</span>
            </button>
          );
        })}
      </div>
      {stage === 'grow' && (
        <div className="h-3 rounded-full bg-slate-800 overflow-hidden" aria-label="Growth">
          <div className="h-full bg-moon-ok" style={{ width: `${growth}%` }} />
        </div>
      )}
      {msg && (
        <p className="text-sm font-bold text-moon-target mb-rise" role="status">
          {msg}
        </p>
      )}
      <p className="text-xs text-moon-muted">Real fact: astronauts on the International Space Station have grown and eaten lettuce grown in the Veggie garden.</p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Wires: rotate the tiles to connect the panel to the battery
// ---------------------------------------------------------------------------

const N = 1;
const E = 2;
const S = 4;
const W = 8;
const COLS = 3;
const ROWS = 3;

function rot(mask: number, times: number) {
  let m = mask;
  for (let i = 0; i < times; i++) m = ((m << 1) | (m >> 3)) & 15;
  return m;
}

function makePuzzle() {
  // random path from the left edge to the right edge
  const startRow = Math.floor(Math.random() * ROWS);
  let r = startRow;
  let c = 0;
  const masks: number[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  let from = W;
  const visited = new Set<string>();
  while (c < COLS) {
    visited.add(`${c},${r}`);
    const options: number[] = [E];
    if (r > 0 && !visited.has(`${c},${r - 1}`) && from !== N) options.push(N);
    if (r < ROWS - 1 && !visited.has(`${c},${r + 1}`) && from !== S) options.push(S);
    const go = options[Math.floor(Math.random() * options.length)];
    masks[r][c] |= from | go;
    if (go === E) {
      c += 1;
      from = W;
    } else if (go === N) {
      r -= 1;
      from = S;
    } else {
      r += 1;
      from = N;
    }
  }
  const endRow = r;
  // decoys on unused tiles
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) if (!masks[y][x]) masks[y][x] = Math.random() < 0.5 ? N | S : N | E;
  const solution = masks.map((row) => [...row]);
  const tiles = masks.map((row) => row.map((m) => rot(m, Math.floor(Math.random() * 4))));
  // make sure it doesn't start solved
  if (connected(tiles, startRow, endRow).solved) tiles[startRow][0] = rot(tiles[startRow][0], 1);
  return { tiles, startRow, endRow, solution };
}

function connected(tiles: number[][], startRow: number, endRow: number) {
  const lit = new Set<string>();
  const start = tiles[startRow][0];
  if (!(start & W)) return { lit, solved: false };
  const stack = [[0, startRow]];
  while (stack.length) {
    const [x, y] = stack.pop()!;
    const k = `${x},${y}`;
    if (lit.has(k)) continue;
    lit.add(k);
    const m = tiles[y][x];
    const nb: [number, number, number, number][] = [
      [N, x, y - 1, S],
      [E, x + 1, y, W],
      [S, x, y + 1, N],
      [W, x - 1, y, E],
    ];
    for (const [d, nx, ny, back] of nb) {
      if (!(m & d)) continue;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      if (tiles[ny][nx] & back) stack.push([nx, ny]);
    }
  }
  const solved = lit.has(`${COLS - 1},${endRow}`) && Boolean(tiles[endRow][COLS - 1] & E);
  return { lit, solved };
}

const Wires: React.FC<ChoreProps> = ({ onDone }) => {
  const [puz] = useState(makePuzzle);
  const [tiles, setTiles] = useState(puz.tiles);
  if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__moonbound) (window as unknown as Record<string, unknown>).__mbWires = { solution: puz.solution, tiles };
  const [cursor, setCursor] = useState({ x: 0, y: puz.startRow });
  const [won, setWon] = useState(false);
  const { lit, solved } = connected(tiles, puz.startRow, puz.endRow);

  const spin = (x: number, y: number) => {
    if (won) return;
    sound.playClick();
    const next = tiles.map((row, j) => row.map((m, i) => (i === x && j === y ? rot(m, 1) : m)));
    setTiles(next);
    setCursor({ x, y });
    if (connected(next, puz.startRow, puz.endRow).solved) {
      setWon(true);
      sound.playVictory();
      setTimeout(onDone, 1200);
    }
  };

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(k)) e.preventDefault();
      if (k === 'arrowleft' || k === 'a') setCursor((c) => ({ ...c, x: Math.max(0, c.x - 1) }));
      if (k === 'arrowright' || k === 'd') setCursor((c) => ({ ...c, x: Math.min(COLS - 1, c.x + 1) }));
      if (k === 'arrowup' || k === 'w') setCursor((c) => ({ ...c, y: Math.max(0, c.y - 1) }));
      if (k === 'arrowdown' || k === 's') setCursor((c) => ({ ...c, y: Math.min(ROWS - 1, c.y + 1) }));
      if ((k === ' ' || k === 'e' || k === 'enter') && !e.repeat) spin(cursor.x, cursor.y);
    };
    window.addEventListener('keydown', kd);
    return () => window.removeEventListener('keydown', kd);
  });

  const seg = (m: number, on: boolean) => {
    const col = on ? '#f2b84b' : '#5d5a66';
    const p: React.ReactNode[] = [];
    if (m & N) p.push(<rect key="n" x="44" y="0" width="12" height="56" fill={col} />);
    if (m & S) p.push(<rect key="s" x="44" y="44" width="12" height="56" fill={col} />);
    if (m & E) p.push(<rect key="e" x="44" y="44" width="56" height="12" fill={col} />);
    if (m & W) p.push(<rect key="w" x="0" y="44" width="56" height="12" fill={col} />);
    p.push(<circle key="c" cx="50" cy="50" r="10" fill={col} />);
    return p;
  };

  return (
    <div className="space-y-3">
      <p className="text-moon-muted">Click a tile to turn it (or use the arrow keys and Space). Connect the solar panel to the battery so the power flows.</p>
      <div className="flex items-center gap-2">
        <div className="shrink-0 w-16 self-stretch grid gap-1" style={{ gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))` }}>
          {Array.from({ length: ROWS }, (_, y) => (
            <div key={y} className="flex items-center justify-end gap-1 text-sm">
              {y === puz.startRow && (
                <>
                  <span className="text-center leading-tight">
                    <span className="block text-3xl">☀️</span>Panel
                  </span>
                  <span className="w-3 h-3 bg-moon-target" aria-hidden />
                </>
              )}
            </div>
          ))}
        </div>
        <div className="grid gap-1 flex-1 max-w-[300px] mx-auto" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
          {tiles.map((row, y) =>
            row.map((m, x) => {
              const on = lit.has(`${x},${y}`);
              const isCursor = cursor.x === x && cursor.y === y;
              const edgeIn = x === 0 && y === puz.startRow;
              const edgeOut = x === COLS - 1 && y === puz.endRow;
              return (
                <button
                  key={`${x}-${y}`}
                  onClick={() => spin(x, y)}
                  aria-label={`Wire tile ${x + 1}, ${y + 1}${on ? ', powered' : ''}`}
                  className={`relative aspect-square rounded-lg bg-[#1d1c21] border-2 ${isCursor ? 'border-moon-accent' : 'border-moon-line'} ${edgeIn ? 'border-l-moon-target' : ''} ${edgeOut ? 'border-r-moon-ok' : ''}`}
                >
                  <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full transition-transform">
                    {seg(m, on)}
                  </svg>
                </button>
              );
            })
          )}
        </div>
        <div className="shrink-0 w-16 self-stretch grid gap-1" style={{ gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))` }}>
          {Array.from({ length: ROWS }, (_, y) => (
            <div key={y} className="flex items-center gap-1 text-sm">
              {y === puz.endRow && (
                <>
                  <span className={`w-3 h-3 ${solved ? 'bg-moon-target' : 'bg-slate-600'}`} aria-hidden />
                  <span className="text-center leading-tight">
                    <span className="block text-3xl">{solved ? '🔋' : '🪫'}</span>Battery
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
      {won && (
        <p className="text-sm font-bold text-moon-ok mb-rise" role="status">
          Power flowing! The battery is charging.
        </p>
      )}
    </div>
  );
};
