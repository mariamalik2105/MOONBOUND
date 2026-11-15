/**
 * Lane runner for the flight missions.
 *  - mode "launch": blast off through clouds and birds into space, grab fuel
 *    and coins, and drop the boosters when the call comes.
 *  - mode "cruise": cross to the Moon through an asteroid field; when the Sun
 *    flares, hide in the lane behind the water tanks (water blocks radiation).
 * Controls: ← → / A D, click or tap the left/right half, or the big buttons.
 * Gentle on failure: crashing out restarts the run in a second, no penalties.
 */

import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { sound } from '../../game/audio';

type Mode = 'launch' | 'cruise';
type Kind = 'coin' | 'fuel' | 'cloud' | 'bird' | 'junk' | 'rock' | 'bigrock';

interface Obj {
  lane: number;
  y: number; // 0 top .. 1 bottom
  kind: Kind;
  spin: number;
  hit?: boolean;
}

interface Float {
  x: number;
  y: number;
  text: string;
  color: string;
  t: number;
}

interface RunProps {
  mode: Mode;
  enabled: boolean;
  reducedMotion: boolean;
  /** cruise only: called once when the crew hides from the flare correctly */
  onShelter?: () => void;
  /** run finished: coins collected */
  onFinish: (coins: number) => void;
}

const LANES = 3;
const RUN_SECONDS = 32;

export const RocketRun: React.FC<RunProps> = ({ mode, enabled, reducedMotion, onShelter, onFinish }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hud, setHud] = useState({ coins: 0, fuel: 100, hearts: 3, progress: 0, banner: '' as string, state: 'ready' as 'ready' | 'run' | 'crash' | 'done' });
  const game = useRef(newGame());
  // test hook (only when the debug hook is on)
  if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__moonbound) (window as unknown as Record<string, unknown>).__mbRun = game;
  const cb = useRef({ onShelter, onFinish });
  cb.current = { onShelter, onFinish };
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  function newGame() {
    return {
      state: 'ready' as 'ready' | 'run' | 'crash' | 'done',
      t: 0,
      lane: 1,
      x: 1, // smooth lane position
      tilt: 0,
      fuel: 100,
      hearts: 3,
      coins: 0,
      objs: [] as Obj[],
      spawn: 0.6,
      inv: 0,
      shake: 0,
      floats: [] as Float[],
      parts: [] as { x: number; y: number; vx: number; vy: number; life: number; c: string }[],
      boosters: true,
      boosterWindow: 0, // >0 while "DROP BOOSTERS" is showing
      boosterDone: false,
      boostT: 0,
      flare: 0, // >0 countdown to flare hit
      flareDone: false,
      flareCool: 0,
      shieldLane: 2,
      flash: 0,
      crashTimer: 0,
      banner: '',
      bannerT: 0,
    };
  }

  const start = () => {
    const g = game.current;
    if (g.state === 'ready') {
      g.state = 'run';
      sound.playMineImpact();
      say(mode === 'launch' ? 'Liftoff!' : 'Engines on. Watch for rocks!');
    }
  };
  const say = (text: string, secs = 1.6) => {
    game.current.banner = text;
    game.current.bannerT = secs;
  };
  const move = (dir: number) => {
    const g = game.current;
    if (g.state === 'ready') start();
    if (g.state !== 'run') return;
    g.lane = Math.max(0, Math.min(LANES - 1, g.lane + dir));
  };
  const action = () => {
    const g = game.current;
    if (g.state === 'ready') return start();
    if (g.state !== 'run') return;
    if (mode === 'launch' && g.boosterWindow > 0 && !g.boosterDone) {
      g.boosterDone = true;
      g.boosters = false;
      g.boosterWindow = 0;
      g.boostT = 2.5;
      g.coins += 10;
      sound.playBuild();
      say('Boosters away! +10 ✦ Speed boost!');
      for (let i = 0; i < 20; i++) g.parts.push({ x: g.x, y: 0.82, vx: (Math.random() - 0.5) * 1.5, vy: Math.random() * 0.6, life: 1, c: '#f2b84b' });
    }
  };

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (!enabledRef.current) return;
      const k = e.key.toLowerCase();
      if (['arrowleft', 'arrowright', ' ', 'arrowup'].includes(k)) e.preventDefault();
      if (e.repeat) return;
      if (k === 'arrowleft' || k === 'a') move(-1);
      if (k === 'arrowright' || k === 'd') move(1);
      if (k === ' ' || k === 'enter' || k === 'arrowup' || k === 'w') action();
    };
    window.addEventListener('keydown', kd);
    return () => window.removeEventListener('keydown', kd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    let raf = 0;
    let last = performance.now();
    let hudTick = 0;

    const loop = (now: number) => {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      const rect = c.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (c.width !== Math.round(rect.width * dpr)) {
        c.width = Math.round(rect.width * dpr);
        c.height = Math.round(rect.height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (enabledRef.current) update(dt);
      draw(ctx, rect.width, rect.height, now / 1000);
      hudTick += dt;
      if (hudTick > 0.1) {
        hudTick = 0;
        const g = game.current;
        setHud({ coins: g.coins, fuel: g.fuel, hearts: g.hearts, progress: Math.min(1, g.t / RUN_SECONDS), banner: g.bannerT > 0 ? g.banner : '', state: g.state });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  function update(dt: number) {
    const g = game.current;
    g.bannerT -= dt;
    g.flash = Math.max(0, g.flash - dt * 2);
    g.shake = Math.max(0, g.shake - dt * 3);
    g.x += (g.lane - g.x) * Math.min(1, dt * 12);
    g.tilt += ((g.lane - g.x) * 0.5 - g.tilt) * Math.min(1, dt * 10);
    for (const p of g.parts) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt * 1.4;
    }
    g.parts = g.parts.filter((p) => p.life > 0);
    for (const f of g.floats) {
      f.y -= dt * 0.12;
      f.t -= dt;
    }
    g.floats = g.floats.filter((f) => f.t > 0);

    if (g.state === 'crash') {
      g.crashTimer -= dt;
      if (g.crashTimer <= 0) {
        const keep = { coins: 0 };
        Object.assign(g, newGame(), keep);
        g.state = 'run';
        say('Try again! You got this.');
      }
      return;
    }
    if (g.state !== 'run') return;

    const speedMul = g.boostT > 0 ? 1.6 : 1;
    g.boostT = Math.max(0, g.boostT - dt);
    g.t += dt * speedMul;
    g.inv = Math.max(0, g.inv - dt);
    g.fuel = Math.max(0, g.fuel - dt * 3.2);

    // exhaust
    if (!reducedMotion || Math.random() < 0.3) {
      g.parts.push({ x: g.x + (Math.random() - 0.5) * 0.15, y: 0.88, vx: (Math.random() - 0.5) * 0.2, vy: 0.5 + Math.random() * 0.4, life: 0.6, c: Math.random() < 0.5 ? '#f2b84b' : '#ff7a6b' });
    }

    // story beats
    const prog = g.t / RUN_SECONDS;
    if (mode === 'launch' && !g.boosterDone && prog > 0.42 && g.boosterWindow === 0) {
      g.boosterWindow = 3.2;
      sound.playScan();
    }
    if (g.boosterWindow > 0) {
      g.boosterWindow -= dt;
      if (g.boosterWindow <= 0 && !g.boosterDone) {
        g.boosterDone = true;
        g.boosters = false;
        say('Boosters dropped by autopilot. Next time press Space!');
      }
    }
    if (mode === 'cruise' && !g.flareDone) {
      g.flareCool -= dt;
      if (g.flare === 0 && prog > 0.4 && g.flareCool <= 0) {
        g.flare = 4;
        g.shieldLane = g.lane === 2 ? 0 : 2;
        // clear the way to the shelter
        g.objs = g.objs.filter((o) => !(o.lane === g.shieldLane && (o.kind === 'rock' || o.kind === 'bigrock')));
        sound.playScan();
      }
      if (g.flare > 0) {
        g.flare -= dt;
        if (g.flare <= 0) {
          g.flash = 1;
          if (g.lane === g.shieldLane) {
            g.flareDone = true;
            g.flare = 0;
            g.coins += 10;
            sound.playVictory();
            say('Safe! Water soaks up radiation. +10 ✦', 2.2);
            cb.current.onShelter?.();
          } else {
            g.flare = 0;
            g.flareCool = 4;
            sound.playMineImpact();
            say('Ouch, too much radiation! Hide behind the water tanks next time.', 2.4);
          }
        }
      }
    }

    // spawn
    g.spawn -= dt * speedMul;
    if (g.spawn <= 0 && prog < 0.96) {
      g.spawn = Math.max(0.42, 0.85 - prog * 0.4);
      const lane = Math.floor(Math.random() * LANES);
      const roll = Math.random();
      let kind: Kind;
      if (roll < 0.38) kind = 'coin';
      else if (roll < 0.5 || g.fuel < 35) kind = 'fuel';
      else if (mode === 'launch') kind = prog < 0.35 ? (Math.random() < 0.5 ? 'cloud' : 'bird') : 'junk';
      else kind = Math.random() < 0.25 ? 'bigrock' : 'rock';
      // never block the shelter lane during a flare warning
      const blocked = mode === 'cruise' && g.flare > 0 && lane === g.shieldLane && (kind === 'rock' || kind === 'bigrock');
      if (!blocked) g.objs.push({ lane, y: -0.08, kind, spin: Math.random() * 6 });
      if (kind === 'coin' && Math.random() < 0.5) g.objs.push({ lane, y: -0.2, kind: 'coin', spin: 0 });
    }

    const fall = (0.42 + prog * 0.18) * speedMul;
    for (const o of g.objs) {
      o.y += fall * dt;
      o.spin += dt * 2;
      if (o.hit) continue;
      if (o.y > 0.74 && o.y < 0.9 && Math.abs(o.lane - g.x) < 0.45) {
        o.hit = true;
        if (o.kind === 'coin') {
          g.coins += 1;
          sound.playCollect();
          g.floats.push({ x: o.lane, y: o.y, text: '+1', color: '#f2b84b', t: 0.7 });
        } else if (o.kind === 'fuel') {
          g.fuel = Math.min(100, g.fuel + 28);
          sound.playBuild();
          g.floats.push({ x: o.lane, y: o.y, text: '+fuel', color: '#9d8cff', t: 0.8 });
        } else if (g.inv <= 0) {
          g.hearts -= 1;
          g.inv = 1.3;
          g.shake = reducedMotion ? 0.2 : 1;
          sound.playMineImpact();
          g.floats.push({ x: o.lane, y: o.y, text: 'bonk!', color: '#ff7a6b', t: 0.8 });
          if (g.hearts <= 0) crash('Too many bumps!');
        }
      }
    }
    g.objs = g.objs.filter((o) => o.y < 1.15 && !(o.hit && (o.kind === 'coin' || o.kind === 'fuel')));
    if (g.fuel <= 0) crash('Out of fuel! Grab the purple cans.');

    if (g.t >= RUN_SECONDS && g.state === 'run') {
      if (mode === 'cruise' && !g.flareDone) {
        // keep flying until the flare lesson is done
        g.t = RUN_SECONDS * 0.6;
        return;
      }
      g.state = 'done';
      sound.playVictory();
      say(mode === 'launch' ? 'You made it to space!' : 'The Moon is close now!', 3);
      const coins = g.coins;
      setTimeout(() => cb.current.onFinish(coins), 900);
    }
  }

  function crash(why: string) {
    const g = game.current;
    g.state = 'crash';
    g.crashTimer = 1.6;
    say(why, 1.6);
  }

  function draw(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
    const g = game.current;
    const prog = Math.min(1, g.t / RUN_SECONDS);
    ctx.save();
    if (g.shake > 0) ctx.translate((Math.random() - 0.5) * 10 * g.shake, (Math.random() - 0.5) * 10 * g.shake);

    // sky
    if (mode === 'launch') {
      const top = mix('#6aa0dd', '#0d0c12', Math.min(1, prog * 1.6));
      const bot = mix('#b9d3ee', '#1b1830', Math.min(1, prog * 1.4));
      const grd = ctx.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, top);
      grd.addColorStop(1, bot);
      ctx.fillStyle = grd;
    } else ctx.fillStyle = '#0d0c12';
    ctx.fillRect(-20, -20, w + 40, h + 40);
    // stars scroll
    const starA = mode === 'launch' ? Math.max(0, prog * 1.6 - 0.5) : 1;
    if (starA > 0) {
      for (let i = 0; i < 60; i++) {
        const sx = ((i * 97.3) % w + w) % w;
        const sy = (((i * 53.1 + g.t * (20 + (i % 3) * 25)) % h) + h) % h;
        ctx.fillStyle = `rgba(243,239,230,${starA * (0.3 + (i % 4) * 0.15)})`;
        ctx.fillRect(sx, sy, i % 9 === 0 ? 2 : 1, i % 9 === 0 ? 2 : 1);
      }
    }
    // launch pad / Earth / Moon scenery
    if (mode === 'launch') {
      const groundY = h * 0.92 + g.t * 260;
      if (groundY < h + 80) {
        ctx.fillStyle = '#6c8a5e';
        ctx.fillRect(0, groundY, w, h);
        ctx.fillStyle = '#8b877f';
        ctx.fillRect(w / 2 - 50, groundY - 6, 100, 8);
        ctx.fillStyle = '#c9c4b8';
        ctx.fillRect(w / 2 + 40, groundY - 90, 8, 90);
      }
      if (prog > 0.7) {
        const r = w * 1.4;
        ctx.fillStyle = '#4a6fb8';
        ctx.beginPath();
        ctx.arc(w / 2, h + r - (prog - 0.7) * 260, r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Earth shrinking behind, Moon growing ahead
      ctx.fillStyle = '#4a6fb8';
      ctx.beginPath();
      ctx.arc(w * 0.85, h * 0.95, 60 * (1 - prog * 0.7), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c9c4b8';
      ctx.beginPath();
      ctx.arc(w * 0.2, 30 + 10 * (1 - prog), 12 + prog * 50, 0, Math.PI * 2);
      ctx.fill();
    }

    const laneW = Math.min(150, w / 3.2);
    const laneX = (l: number) => w / 2 + (l - 1) * laneW;

    // flare warning + water tank shield lane
    if (mode === 'cruise' && g.flare > 0) {
      const lx = laneX(g.shieldLane);
      ctx.fillStyle = 'rgba(74,111,184,0.18)';
      ctx.fillRect(lx - laneW / 2, 0, laneW, h);
      for (let i = 0; i < 3; i++) {
        const ty = h * 0.55 + i * 18;
        ctx.fillStyle = '#4a6fb8';
        roundRect(ctx, lx - 34, ty - 50, 68, 14, 7);
        ctx.fill();
        ctx.strokeStyle = '#26252c';
        ctx.stroke();
      }
      ctx.fillStyle = '#cfe0ff';
      ctx.font = 'bold 13px "Atkinson Hyperlegible", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('WATER TANKS', lx, h * 0.55 - 58);
      ctx.fillStyle = 'rgba(255,122,107,0.25)';
      ctx.fillRect(0, 0, w, 8);
    }

    // objects
    for (const o of g.objs) {
      if (o.hit && o.kind !== 'coin' && o.kind !== 'fuel') ctx.globalAlpha = 0.35;
      const x = laneX(o.lane);
      const y = o.y * h;
      drawObj(ctx, o, x, y, time);
      ctx.globalAlpha = 1;
    }

    // particles
    for (const p of g.parts) {
      ctx.fillStyle = p.c;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.beginPath();
      ctx.arc(laneX(p.x), p.y * h, 3 + (1 - p.life) * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // rocket
    const rx = laneX(g.x);
    const ry = h * 0.8;
    if (!(g.inv > 0 && Math.floor(time * 12) % 2 === 0)) drawRocket(ctx, rx, ry, g.tilt, g.boosters, g.state === 'run' || g.state === 'ready', mode, time);

    // floats
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px "Atkinson Hyperlegible", sans-serif';
    for (const f of g.floats) {
      ctx.globalAlpha = Math.min(1, f.t * 2);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, laneX(f.x), f.y * h);
    }
    ctx.globalAlpha = 1;

    if (g.flash > 0) {
      ctx.fillStyle = `rgba(255,248,225,${g.flash * 0.6})`;
      ctx.fillRect(-20, -20, w + 40, h + 40);
    }
    ctx.restore();

    // big calls
    ctx.textAlign = 'center';
    if (g.state === 'ready') {
      ctx.fillStyle = 'rgba(13,12,18,0.55)';
      ctx.fillRect(0, h / 2 - 44, w, 88);
      ctx.fillStyle = '#f3efe6';
      ctx.font = 'bold 26px "Fredoka", "Atkinson Hyperlegible", sans-serif';
      ctx.fillText(mode === 'launch' ? 'Press Space to launch!' : 'Press Space to fire the engines!', w / 2, h / 2 - 4);
      ctx.font = '15px "Atkinson Hyperlegible", sans-serif';
      ctx.fillText('← → or tap the sides to dodge · grab ✦ coins and purple fuel', w / 2, h / 2 + 24);
    }
    if (g.boosterWindow > 0) {
      const pulse = 1 + Math.sin(time * 14) * 0.05;
      ctx.save();
      ctx.translate(w / 2, h * 0.32);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = '#f2b84b';
      roundRect(ctx, -170, -30, 340, 60, 14);
      ctx.fill();
      ctx.fillStyle = '#1a1a20';
      ctx.font = 'bold 24px "Fredoka", "Atkinson Hyperlegible", sans-serif';
      ctx.fillText(`DROP BOOSTERS! Space (${Math.ceil(g.boosterWindow)})`, 0, 9, 320);
      ctx.restore();
    }
    if (mode === 'cruise' && g.flare > 0) {
      const txt = `☀ FLARE in ${Math.ceil(g.flare)}! Hide behind the water!`;
      ctx.font = 'bold 19px "Fredoka", "Atkinson Hyperlegible", sans-serif';
      const tw = Math.min(w - 16, ctx.measureText(txt).width + 32);
      ctx.fillStyle = '#ff7a6b';
      roundRect(ctx, w / 2 - tw / 2, h * 0.18 - 26, tw, 52, 14);
      ctx.fill();
      ctx.fillStyle = '#1a1a20';
      ctx.fillText(txt, w / 2, h * 0.18 + 7, w - 32);
    }
    if (g.bannerT > 0 && g.banner && g.state !== 'ready') {
      ctx.font = 'bold 20px "Fredoka", "Atkinson Hyperlegible", sans-serif';
      const tw = ctx.measureText(g.banner).width + 36;
      ctx.fillStyle = 'rgba(29,28,33,0.9)';
      roundRect(ctx, w / 2 - tw / 2, h * 0.5 - 22, tw, 44, 12);
      ctx.fill();
      ctx.fillStyle = '#f3efe6';
      ctx.fillText(g.banner, w / 2, h * 0.5 + 7);
    }
  }

  const tapSide = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const g = game.current;
    if (g.state === 'ready' || (mode === 'launch' && g.boosterWindow > 0 && Math.abs(e.clientX - r.left - r.width / 2) < r.width * 0.2)) return action();
    move(e.clientX - r.left < r.width / 2 ? -1 : 1);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-sm font-bold">
        <span className="rounded-lg bg-moon-panel-2 border border-moon-line px-2.5 py-1 text-moon-target">✦ {hud.coins}</span>
        <span className="rounded-lg bg-moon-panel-2 border border-moon-line px-2.5 py-1" aria-label={`${hud.hearts} hearts left`}>
          {'♥'.repeat(Math.max(0, hud.hearts))}
          <span className="text-slate-600">{'♥'.repeat(Math.max(0, 3 - hud.hearts))}</span>
        </span>
        <span className="flex-1 flex items-center gap-2">
          Fuel
          <span className="flex-1 h-2.5 rounded-full bg-slate-800 overflow-hidden">
            <span className={`block h-full ${hud.fuel < 25 ? 'bg-moon-warn' : 'bg-moon-accent'}`} style={{ width: `${hud.fuel}%` }} />
          </span>
        </span>
        <span className="w-28 flex items-center gap-1.5">
          {mode === 'launch' ? 'Space' : 'Moon'}
          <span className="flex-1 h-2.5 rounded-full bg-slate-800 overflow-hidden">
            <span className="block h-full bg-moon-ok" style={{ width: `${hud.progress * 100}%` }} />
          </span>
        </span>
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={tapSide}
        className="w-full h-[360px] rounded-xl block touch-none cursor-pointer"
        aria-label={mode === 'launch' ? 'Rocket launch game. Dodge clouds and birds, collect coins and fuel.' : 'Space run. Dodge asteroids, collect coins and fuel, hide behind water tanks during a solar flare.'}
      />
      <div className="flex gap-2">
        <button onPointerDown={() => move(-1)} aria-label="Steer left" className="flex-1 h-12 rounded-xl bg-moon-panel-2 border border-moon-line hover:border-moon-target flex items-center justify-center">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <button onPointerDown={action} className="flex-[2] h-12 rounded-xl bg-moon-accent text-[#18161f] font-bold text-lg">
          {hud.state === 'ready' ? (mode === 'launch' ? 'Launch!' : 'Go!') : mode === 'launch' ? 'Drop boosters' : 'Boost'} <kbd className="ml-1 rounded bg-[#18161f]/20 px-1.5 text-xs">Space</kbd>
        </button>
        <button onPointerDown={() => move(1)} aria-label="Steer right" className="flex-1 h-12 rounded-xl bg-moon-panel-2 border border-moon-line hover:border-moon-target flex items-center justify-center">
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------

function mix(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`;
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawObj(ctx: CanvasRenderingContext2D, o: Obj, x: number, y: number, time: number) {
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#26252c';
  switch (o.kind) {
    case 'coin': {
      const sx = Math.abs(Math.cos(time * 4 + o.spin));
      ctx.fillStyle = '#f2b84b';
      ctx.beginPath();
      ctx.ellipse(x, y, 11 * Math.max(0.25, sx), 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff3c4';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      if (sx > 0.5) ctx.fillText('✦', x, y + 4);
      break;
    }
    case 'fuel':
      ctx.fillStyle = '#9d8cff';
      roundRect(ctx, x - 10, y - 14, 20, 28, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#f3efe6';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('F', x, y + 4);
      break;
    case 'cloud':
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.strokeStyle = 'rgba(38,37,44,0.4)';
      ctx.beginPath();
      ctx.arc(x - 18, y, 16, 0, Math.PI * 2);
      ctx.arc(x + 2, y - 8, 20, 0, Math.PI * 2);
      ctx.arc(x + 22, y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case 'bird': {
      const flap = Math.sin(time * 12 + o.spin) * 8;
      ctx.strokeStyle = '#26252c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 16, y - flap);
      ctx.quadraticCurveTo(x - 6, y - 6, x, y);
      ctx.quadraticCurveTo(x + 6, y - 6, x + 16, y - flap);
      ctx.stroke();
      break;
    }
    case 'junk':
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(o.spin);
      ctx.fillStyle = '#bdb6a8';
      ctx.fillRect(-8, -8, 16, 16);
      ctx.strokeRect(-8, -8, 16, 16);
      ctx.fillStyle = '#544c9c';
      ctx.fillRect(-22, -4, 12, 8);
      ctx.fillRect(10, -4, 12, 8);
      ctx.restore();
      break;
    case 'rock':
    case 'bigrock': {
      const r = o.kind === 'bigrock' ? 24 : 15;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(o.spin * 0.5);
      ctx.fillStyle = '#7a756c';
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const rr = r * (0.8 + ((i * 37) % 5) * 0.06);
        if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#5d5952';
      ctx.beginPath();
      ctx.arc(r * 0.25, -r * 0.2, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
  }
}

function drawRocket(ctx: CanvasRenderingContext2D, x: number, y: number, tilt: number, boosters: boolean, flame: boolean, mode: Mode, time: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt * 0.5);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#26252c';
  if (flame) {
    const f = 18 + Math.sin(time * 40) * 5;
    ctx.fillStyle = '#ff7a6b';
    ctx.beginPath();
    ctx.moveTo(-8, 26);
    ctx.lineTo(0, 26 + f + 8);
    ctx.lineTo(8, 26);
    ctx.fill();
    ctx.fillStyle = '#f2b84b';
    ctx.beginPath();
    ctx.moveTo(-5, 26);
    ctx.lineTo(0, 26 + f);
    ctx.lineTo(5, 26);
    ctx.fill();
  }
  if (boosters && mode === 'launch') {
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#e8e3d7';
      roundRect(ctx, s * 16 - 5, -2, 10, 30, 4);
      ctx.fill();
      ctx.stroke();
    }
  }
  // fins
  ctx.fillStyle = '#9d8cff';
  ctx.beginPath();
  ctx.moveTo(-11, 14);
  ctx.lineTo(-20, 28);
  ctx.lineTo(-10, 26);
  ctx.closePath();
  ctx.moveTo(11, 14);
  ctx.lineTo(20, 28);
  ctx.lineTo(10, 26);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // body
  ctx.fillStyle = '#f3efe6';
  ctx.beginPath();
  ctx.moveTo(0, -34);
  ctx.quadraticCurveTo(13, -16, 11, 26);
  ctx.lineTo(-11, 26);
  ctx.quadraticCurveTo(-13, -16, 0, -34);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#4a6fb8';
  ctx.beginPath();
  ctx.arc(0, -8, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
