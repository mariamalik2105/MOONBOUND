/**
 * The trip from Earth to the Moon: five short hands-on tasks, one per phase.
 * Each one is a small action game that teaches one idea by doing it, can be
 * retried instantly, and works with keyboard or mouse/trackpad (no dragging,
 * no rapid clicking).
 */

import React, { useEffect, useRef, useState } from 'react';
import { Check, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import type { PhaseDefinition } from '../game/phases';
import { AVATARS } from '../game/economy';
import { sound } from '../game/audio';
import { RocketRun } from './arcade/RocketRun';
import { CraneDrop, ScannerFlyover } from './arcade/FlightMinis';

interface FlightProps {
  phase: PhaseDefinition;
  flags: Record<string, boolean>;
  avatarId: string;
  reducedMotion: boolean;
  onFlight: (objectiveId: string) => void;
  onSelectAvatar: (id: string) => void;
  /** Coins earned in a mini-game. `key` makes each reward count once. */
  onCoins: (key: string, coins: number) => void;
  /** Overlays on top (celebration, menus) pause the console's keyboard input */
  inputEnabled: boolean;
  onMenu: () => void;
}

const done = (flags: Record<string, boolean>, id: string) => Boolean(flags[`flight:${id}`]);

function useKeys(enabled: boolean, onDown: (k: string, e: KeyboardEvent) => void, onUp?: (k: string) => void) {
  const down = useRef(onDown);
  const up = useRef(onUp);
  down.current = onDown;
  up.current = onUp;
  useEffect(() => {
    if (!enabled) return;
    const isTyping = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    };
    const kd = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
      down.current(e.key.toLowerCase(), e);
    };
    const ku = (e: KeyboardEvent) => up.current?.(e.key.toLowerCase());
    const blur = () => up.current?.('*');
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      window.removeEventListener('blur', blur);
      up.current?.('*');
    };
  }, [enabled]);
}

function useCanvasLoop(draw: (ctx: CanvasRenderingContext2D, w: number, h: number, dt: number) => void, deps: unknown[] = []) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    let raf = 0;
    let last = performance.now();
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
      drawRef.current(ctx, rect.width, rect.height, dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

function stars(ctx: CanvasRenderingContext2D, w: number, h: number, seed = 1) {
  ctx.fillStyle = '#0d0c12';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) {
    const x = ((Math.sin(i * 12.9898 + seed) * 43758.5453) % 1 + 1) % 1;
    const y = ((Math.sin(i * 78.233 + seed) * 12345.678) % 1 + 1) % 1;
    ctx.fillStyle = `rgba(243,239,230,${0.25 + (i % 5) * 0.12})`;
    ctx.fillRect(x * w, y * h, i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1);
  }
}

// ---------------------------------------------------------------------------

export const FlightConsole: React.FC<FlightProps> = (props) => {
  const { phase, flags } = props;
  const [showWhy, setShowWhy] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const idle = useRef(0);

  useEffect(() => {
    setHintLevel(0);
    setShowWhy(false);
    idle.current = 0;
  }, [phase.phaseIndex]);

  // gentle hint after a while without progress (only while this screen is active)
  const doneCount = phase.objectives.filter((o) => done(flags, o.id)).length;
  useEffect(() => {
    idle.current = 0;
  }, [doneCount]);
  useEffect(() => {
    if (!props.inputEnabled) return;
    const t = setInterval(() => {
      idle.current += 1;
      if (idle.current === 20) setHintLevel((h) => Math.max(h, 1));
    }, 1000);
    return () => clearInterval(t);
  }, [props.inputEnabled]);

  const next = phase.objectives.find((o) => !done(flags, o.id));
  const hint = hintLevel > 0 && next ? next.hint : null;

  return (
    <div className="mb-title absolute inset-0 z-30 bg-moon-bg flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-4xl my-auto">
        <header className="flex flex-wrap items-end justify-between gap-3 mb-3">
          <div>
            <div className="text-sm text-moon-muted">
              Mission {phase.phaseIndex + 1} of 9 · On the way to the Moon
            </div>
            <h1 className="text-3xl font-semibold [text-shadow:0_3px_0_#52378c]">{phase.name}</h1>
            <p className="text-moon-muted mt-0.5">{phase.subTitle}</p>
          </div>
          <button onClick={props.onMenu} className="mb-hud-btn rounded-xl bg-slate-800 hover:bg-slate-700 border border-moon-line px-3 py-2 text-sm font-bold">
            Menu <kbd className="mb-kbd ml-1 rounded bg-slate-950 px-1.5 text-xs">Esc</kbd>
          </button>
        </header>

        <div className="grid gap-3 md:grid-cols-[1fr_260px]">
          <div className="mb-panel rounded-2xl bg-moon-panel/90 border border-moon-line p-4 min-w-0">
            {phase.phaseIndex === 0 && <PrepTask {...props} />}
            {phase.phaseIndex === 1 && <OrbitTask {...props} />}
            {phase.phaseIndex === 2 && <CruiseTask {...props} />}
            {phase.phaseIndex === 3 && <SiteTask {...props} />}
            {phase.phaseIndex === 4 && <LandingTask {...props} />}
          </div>
          <aside className="mb-panel rounded-2xl bg-moon-panel/90 border border-moon-line p-4 h-fit">
            <h2 className="text-base font-semibold mb-2">Steps</h2>
            <ol className="space-y-2">
              {phase.objectives.map((o) => {
                const ok = done(flags, o.id);
                const current = next?.id === o.id;
                return (
                  <li key={o.id} className={`flex gap-2 text-sm ${ok ? 'text-moon-muted' : current ? 'text-moon-text font-bold' : 'text-slate-400'}`}>
                    <span
                      className={`mt-0.5 w-5 h-5 shrink-0 rounded-full flex items-center justify-center border ${
                        ok ? 'bg-moon-ok border-moon-ok text-[#16201a]' : current ? 'border-moon-target' : 'border-slate-600'
                      }`}
                    >
                      {ok ? <Check className="w-3.5 h-3.5" aria-label="Done" /> : null}
                    </span>
                    <span>{o.text}</span>
                  </li>
                );
              })}
            </ol>
            {hint && (
              <p className="mt-3 text-sm flex gap-2 text-slate-200 mb-rise">
                <Lightbulb className="w-4 h-4 mt-0.5 text-moon-target shrink-0" aria-hidden />
                {hint}
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <button onClick={() => setHintLevel(1)} className="mb-hud-btn rounded-lg bg-slate-800 hover:bg-slate-700 border border-moon-line px-2.5 py-1.5 text-sm">
                Hint
              </button>
              <button
                onClick={() => setShowWhy((v) => !v)}
                aria-expanded={showWhy}
                className="mb-hud-btn rounded-lg bg-slate-800 hover:bg-slate-700 border border-moon-line px-2.5 py-1.5 text-sm flex items-center gap-1"
              >
                Why? {showWhy ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
            {showWhy && <p className="mt-2 text-sm text-slate-300 mb-rise">{phase.scienceLesson}</p>}
          </aside>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// M · Get ready to fly
// ---------------------------------------------------------------------------

const PrepTask: React.FC<FlightProps> = ({ flags, avatarId, onFlight, onSelectAvatar, onCoins, inputEnabled, reducedMotion }) => {
  const crew = done(flags, 'select_crew');
  const packedDone = done(flags, 'inspect_manifest');
  const launched = done(flags, 'ready_launch');

  return (
    <div className="space-y-4">
      {!crew || !packedDone ? (
        <section>
          <h3 className="font-semibold mb-2">1. Pick your astronaut</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {Object.values(AVATARS).map((av) => {
              const sel = crew && avatarId === av.id;
              return (
                <button
                  key={av.id}
                  onClick={() => {
                    sound.playClick();
                    onSelectAvatar(av.id);
                  }}
                  aria-pressed={sel}
                  className={`text-left rounded-xl border p-3 min-h-[76px] ${sel ? 'border-moon-accent bg-cyan-950' : 'border-moon-line bg-moon-panel-2 hover:border-slate-500'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{av.name}</span>
                    <span className="w-5 h-5 rounded-full border-2 border-slate-900" style={{ background: av.suitColor }} aria-hidden />
                  </div>
                  <div className="text-sm text-moon-ok mt-1">+ {av.ability.split(' But:')[0]}</div>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {crew && !packedDone && (
        <section className="mb-rise">
          <h3 className="font-semibold mb-2">2. Load the cargo! Drop each kit into the glowing slot</h3>
          <CraneDrop enabled={inputEnabled} done={packedDone} onPacked={() => {}} onAllPacked={() => onFlight('inspect_manifest')} />
        </section>
      )}

      {packedDone && !launched && (
        <section className="mb-rise">
          <h3 className="font-semibold mb-2">3. Blast off! Fly up to space</h3>
          <RocketRun
            mode="launch"
            enabled={inputEnabled}
            reducedMotion={reducedMotion}
            onFinish={(coins) => {
              onCoins('launch', coins);
              onFlight('ready_launch');
            }}
          />
        </section>
      )}
      {launched && <p className="text-lg font-bold text-moon-ok">You reached space! 🚀</p>}
    </div>
  );
};

// ---------------------------------------------------------------------------
// O · Reach for the Moon (orbit + timed burn)
// ---------------------------------------------------------------------------

const OrbitTask: React.FC<FlightProps> = ({ flags, onFlight, inputEnabled, reducedMotion }) => {
  const wings = done(flags, 'solar_array_deploy');
  const burned = done(flags, 'orbital_burn');
  const angle = useRef(Math.PI * 0.9);
  const depart = useRef(0);
  const [msg, setMsg] = useState<string | null>(null);
  const WINDOW = { from: -Math.PI / 2 - 0.45, to: -Math.PI / 2 + 0.45 };
  const period = reducedMotion ? 9 : 6;

  const inWindow = () => {
    const a = ((angle.current % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const from = ((WINDOW.from % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const to = ((WINDOW.to % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    return from < to ? a >= from && a <= to : a >= from || a <= to;
  };

  const crank = useRef(0);
  const cranking = useRef(false);
  const [crankPct, setCrankPct] = useState(wings ? 1 : 0);
  const openWings = () => {
    if (wings) return;
    sound.playBuild();
    onFlight('solar_array_deploy');
  };
  const fire = () => {
    if (!wings || burned) return;
    if (inWindow()) {
      sound.playVictory();
      setMsg('Good burn! You are on your way to the Moon.');
      onFlight('orbital_burn');
    } else {
      sound.playClick();
      setMsg('Not yet. Wait until the ship is inside the green arc, then fire.');
    }
  };

  useKeys(
    inputEnabled,
    (k, e) => {
      if (k === 'w' || k === 'arrowup') cranking.current = true;
      if (e.repeat) return;
      if (k === ' ' || k === 'enter') {
        e.preventDefault();
        fire();
      }
    },
    (k) => {
      if (k === 'w' || k === 'arrowup' || k === '*') cranking.current = false;
    }
  );

  const ref = useCanvasLoop((ctx, w, h, dt) => {
    if (!wings && cranking.current) {
      const before = crank.current;
      crank.current = Math.min(1, crank.current + dt / 1.4);
      if (Math.floor(crank.current * 6) > Math.floor(before * 6)) sound.playClick();
      setCrankPct(crank.current);
      if (crank.current >= 1) openWings();
    }
    stars(ctx, w, h, 3);
    const cx = w / 2;
    const cy = h / 2 + 10;
    const R = Math.min(w, h) * 0.32;
    // Earth
    ctx.fillStyle = '#4a6fb8';
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6c9a6a';
    ctx.beginPath();
    ctx.ellipse(cx - R * 0.12, cy - R * 0.08, R * 0.16, R * 0.1, 0.5, 0, Math.PI * 2);
    ctx.ellipse(cx + R * 0.14, cy + R * 0.12, R * 0.12, R * 0.08, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(13,12,18,0.45)';
    ctx.beginPath();
    ctx.arc(cx + R * 0.1, cy + R * 0.05, R * 0.45, -0.6, 2.2);
    ctx.fill();
    // orbit + burn window
    ctx.strokeStyle = 'rgba(243,239,230,0.25)';
    ctx.setLineDash([4, 6]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    if (wings && !burned) {
      ctx.strokeStyle = '#7fd1a0';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(cx, cy, R, WINDOW.from, WINDOW.to);
      ctx.stroke();
      ctx.fillStyle = '#7fd1a0';
      ctx.font = 'bold 13px "Atkinson Hyperlegible", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Fire here', cx, cy - R - 14);
    }
    // Moon direction
    ctx.fillStyle = '#c9c4b8';
    ctx.beginPath();
    ctx.arc(w - 40, 40, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b3ada2';
    ctx.font = '12px "Atkinson Hyperlegible", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Moon', w - 40, 72);
    // ship
    let sx: number;
    let sy: number;
    let heading: number;
    if (burned) {
      depart.current = Math.min(1, depart.current + dt * 0.35);
      const p = depart.current;
      const ax = cx + Math.cos(angle.current) * R;
      const ay = cy + Math.sin(angle.current) * R;
      sx = ax + (w - 40 - ax) * p * p;
      sy = ay + (40 - ay) * p;
      heading = Math.atan2(40 - ay, w - 40 - ax);
      ctx.strokeStyle = 'rgba(242,184,75,0.5)';
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(ax + (w - 40 - ax) * 0.2, ay + (40 - ay) * 0.6, w - 40, 40);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      angle.current += ((Math.PI * 2) / period) * dt;
      sx = cx + Math.cos(angle.current) * R;
      sy = cy + Math.sin(angle.current) * R;
      heading = angle.current + Math.PI / 2;
    }
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(heading);
    {
      const open = wings ? 1 : crank.current;
      if (open > 0) {
        ctx.fillStyle = '#544c9c';
        ctx.strokeStyle = '#26252c';
        ctx.fillRect(-4, -8 - 12 * open, 8, 12 * open);
        ctx.fillRect(-4, 8, 8, 12 * open);
        ctx.strokeRect(-4, -8 - 12 * open, 8, 12 * open);
        ctx.strokeRect(-4, 8, 8, 12 * open);
      }
    }
    ctx.fillStyle = '#e8e3d7';
    ctx.strokeStyle = '#26252c';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-8, -7);
    ctx.lineTo(-8, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (burned && depart.current < 0.6) {
      ctx.fillStyle = '#f2b84b';
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-20 - Math.random() * 6, 0);
      ctx.lineTo(-8, 4);
      ctx.fill();
    }
    ctx.restore();
  }, [wings, burned, reducedMotion]);

  return (
    <div className="space-y-3">
      <canvas ref={ref} className="w-full h-[300px] rounded-xl block" aria-label="Your ship circling Earth. A green arc shows the moment to fire the engine." />
      <div className="flex flex-wrap gap-2">
        <button
          onPointerDown={() => (cranking.current = true)}
          onPointerUp={() => (cranking.current = false)}
          onPointerLeave={() => (cranking.current = false)}
          disabled={wings}
          className={`relative overflow-hidden rounded-xl px-4 py-3 font-bold border ${wings ? 'border-moon-ok text-moon-muted' : 'border-moon-target bg-moon-panel-2 hover:bg-slate-800'}`}
        >
          <span className="absolute inset-y-0 left-0 bg-moon-accent/30" style={{ width: `${(wings ? 1 : crankPct) * 100}%` }} aria-hidden />
          <span className="relative">
            {wings ? 'Wings open ✓' : 'Hold to crank open the wings'} <kbd className="ml-1 rounded bg-slate-950 px-1.5 text-xs">hold W</kbd>
          </span>
        </button>
        <button
          onClick={fire}
          disabled={!wings || burned}
          className={`rounded-xl px-4 py-3 font-bold border ${!wings ? 'opacity-40 border-moon-line' : burned ? 'border-moon-ok text-moon-muted' : 'border-moon-target bg-moon-panel-2 hover:bg-slate-800'}`}
        >
          {burned ? 'Engine burn done ✓' : 'Fire engine'} <kbd className="ml-1 rounded bg-slate-950 px-1.5 text-xs">Space</kbd>
        </button>
      </div>
      {msg && <p className="text-sm mb-rise" role="status">{msg}</p>}
    </div>
  );
};

// ---------------------------------------------------------------------------
// O · Cross to the Moon (star tracker + radiation shelter)
// ---------------------------------------------------------------------------

const CruiseTask: React.FC<FlightProps> = ({ flags, onFlight, onCoins, inputEnabled, reducedMotion }) => {
  const navDone = done(flags, 'star_nav');
  const radDone = done(flags, 'radiation_check');
  if (navDone && radDone) return <p className="text-lg font-bold text-moon-ok">The Moon is right ahead! 🌕</p>;
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Fly through the asteroid field to the Moon</h3>
      <p className="text-sm text-moon-muted">When the Sun flares, steer behind the blue water tanks. Water is great at stopping radiation.</p>
      <RocketRun
        mode="cruise"
        enabled={inputEnabled}
        reducedMotion={reducedMotion}
        onShelter={() => onFlight('radiation_check')}
        onFinish={(coins) => {
          onCoins('cruise', coins);
          onFlight('star_nav');
        }}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// N · Choose where to land
// ---------------------------------------------------------------------------

const SITES = [
  { id: 'shackleton', name: 'Shackleton rim', where: 'South pole', sun: 3, ice: 3, earth: 2, sunText: 'Sunny most of the time', iceText: 'Shadowed crater right next door', earthText: 'Good view of Earth', good: true, pos: { x: 0.36, y: 0.42 } },
  { id: 'malapert', name: 'Malapert ridge', where: 'South pole', sun: 3, ice: 2, earth: 3, sunText: 'Sunny most of the time', iceText: 'Icy craters a drive away', earthText: 'Excellent view of Earth', good: true, pos: { x: 0.62, y: 0.3 } },
  { id: 'equator', name: 'Equator plain', where: 'Near the equator', sun: 1, ice: 0, earth: 3, sunText: 'Half the time: 14-day nights', iceText: 'No ice: too warm', earthText: 'Earth straight overhead', good: false, pos: { x: 0.8, y: 0.72 } },
];

const SiteTask: React.FC<FlightProps> = ({ flags, onFlight, inputEnabled }) => {
  const surveyed = done(flags, 'site_survey');
  const chosen = done(flags, 'select_target');
  const [seen, setSeen] = useState<string[]>(surveyed ? SITES.map((s) => s.id) : []);
  const [sel, setSel] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const inspect = (id: string) => {
    setSel(id);
    setMsg(null);
    if (!seen.includes(id)) {
      const n = [...seen, id];
      setSeen(n);
      if (n.length === SITES.length) onFlight('site_survey');
    }
  };
  const land = () => {
    const s = SITES.find((x) => x.id === sel);
    if (!s || !surveyed || chosen) return;
    if (s.good) {
      sound.playVictory();
      onFlight('select_target');
      setMsg(`Landing site locked: ${s.name}.`);
    } else {
      sound.playClick();
      setMsg('No ice and 14-day freezing nights would make a long stay very hard. Pick a south pole site.');
    }
  };
  useKeys(inputEnabled, (k, e) => {
    if (e.repeat) return;
    if (['1', '2', '3'].includes(k)) {
      const id = SITES[Number(k) - 1].id;
      if (seen.includes(id)) setSel(id);
    }
    if (k === 'enter') {
      e.preventDefault(); // don't also "click" the site button that has focus
      land();
    }
  });

  const bar = (n: number, label: string) => (
    <div className="flex items-center gap-2 text-sm">
      <span className="flex gap-0.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className={`w-4 h-2 rounded-sm ${i < n ? 'bg-moon-ok' : 'bg-slate-700'}`} />
        ))}
      </span>
      <span>{label}</span>
    </div>
  );
  const cur = SITES.find((s) => s.id === sel);

  return (
    <div className="grid md:grid-cols-[1fr_1fr] gap-3">
      <div className="relative">
        <ScannerFlyover sites={SITES} scanned={seen} selected={sel} enabled={inputEnabled} onScanned={(id) => inspect(id)} onSelect={(id) => setSel(id)} />
        <div className="mt-1.5 text-sm font-bold">Scanned {seen.length}/3</div>
      </div>
      <div className="rounded-xl bg-moon-panel-2 border border-moon-line p-3 min-h-[200px]">
        {cur ? (
          <div className="space-y-2">
            <div>
              <div className="font-bold text-lg">{cur.name}</div>
              <div className="text-sm text-moon-muted">{cur.where}</div>
            </div>
            {bar(cur.sun, `Sunlight: ${cur.sunText}`)}
            {bar(cur.ice, `Ice: ${cur.iceText}`)}
            {bar(cur.earth, `Radio to Earth: ${cur.earthText}`)}
            <button
              onClick={land}
              disabled={!surveyed || chosen}
              className={`mt-2 w-full rounded-xl px-4 py-3 font-bold border ${surveyed && !chosen ? 'border-moon-target hover:bg-slate-800' : 'border-moon-line opacity-50'}`}
            >
              {chosen ? 'Site locked ✓' : surveyed ? 'Land here' : 'Check all 3 sites first'}
              {surveyed && !chosen && <kbd className="ml-2 rounded bg-slate-950 px-1.5 text-xs">Enter</kbd>}
            </button>
          </div>
        ) : (
          <p className="text-moon-muted">Fly the scanner (arrow keys, WASD or your mouse) over each numbered site. Hover until the purple ring fills to see its sunlight, ice and radio view.</p>
        )}
        {msg && <p className="mt-2 text-sm mb-rise" role="status">{msg}</p>}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// B · Land gently (real lunar gravity: 1.62 m/s²)
// ---------------------------------------------------------------------------

const MOON_G = 1.62;
const THRUST = 3.4;
const SAFE = 3;

const LandingTask: React.FC<FlightProps> = ({ flags, onFlight, onCoins, inputEnabled }) => {
  const landed = done(flags, 'terminal_guidance');
  const out = done(flags, 'engine_shutdown');
  const fresh = () => ({ alt: 110, v: -9, x: 0.18, vx: 0.03, fuel: 100, pad: 0.55 + Math.random() * 0.25, burning: false, side: 0, over: landed ? 'landed' : '', timer: 0, tries: 0 });
  const sim = useRef(fresh());
  if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__moonbound) (window as unknown as Record<string, unknown>).__mbLand = sim;
  const keys = useRef(new Set<string>());
  const [readout, setReadout] = useState({ alt: 110, v: -9, fuel: 100, onPad: false });
  const [msg, setMsg] = useState<string | null>(landed ? 'Contact! Engine off. You are on the Moon.' : null);

  const reset = () => {
    const tries = sim.current.tries + 1;
    sim.current = { ...fresh(), tries };
    setMsg(null);
  };

  useKeys(
    inputEnabled,
    (k, e) => {
      if (k === ' ' || k === 'arrowup' || k === 'w') keys.current.add('up');
      if (k === 'arrowleft' || k === 'a') keys.current.add('l');
      if (k === 'arrowright' || k === 'd') keys.current.add('r');
      if (!e.repeat && landed && !out && (k === 'e' || k === 'enter')) stepOut();
    },
    (k) => {
      if (k === '*') keys.current.clear();
      if (k === ' ' || k === 'arrowup' || k === 'w') keys.current.delete('up');
      if (k === 'arrowleft' || k === 'a') keys.current.delete('l');
      if (k === 'arrowright' || k === 'd') keys.current.delete('r');
    }
  );
  const hold = (key: string) => ({
    onPointerDown: () => keys.current.add(key),
    onPointerUp: () => keys.current.delete(key),
    onPointerLeave: () => keys.current.delete(key),
  });

  const stepOut = () => {
    if (!landed || out) return;
    sound.playFootstep();
    onFlight('engine_shutdown');
  };

  const ref = useCanvasLoop((ctx, w, h, dt) => {
    const s = sim.current;
    const padW = 0.16;
    const onPad = Math.abs(s.x - s.pad) < padW / 2 - 0.02;
    if (!s.over) {
      // Game clock runs 2.5x so the descent takes about 20 seconds. Gravity is the Moon's real 1.62 m/s².
      const step = dt * 2.5;
      const hasFuel = s.fuel > 0;
      s.burning = keys.current.has('up') && hasFuel;
      s.side = hasFuel ? (keys.current.has('r') ? 1 : 0) - (keys.current.has('l') ? 1 : 0) : 0;
      s.v += (-MOON_G + (s.burning ? THRUST : 0)) * step;
      s.vx += s.side * 0.05 * step;
      s.vx *= Math.pow(0.85, step);
      s.x = Math.max(0.05, Math.min(0.95, s.x + s.vx * step));
      s.alt += s.v * step;
      s.fuel = Math.max(0, s.fuel - ((s.burning ? 1.7 : 0) + (s.side ? 0.8 : 0)) * step);
      if (s.alt <= 0) {
        s.alt = 0;
        const slow = Math.abs(s.v) <= SAFE;
        if (slow && onPad) {
          s.over = 'landed';
          sound.playVictory();
          onCoins('landing', Math.round(10 + s.fuel / 5));
          onFlight('terminal_guidance');
          setMsg(`The Eagle has landed! ${Math.abs(s.v).toFixed(1)} m/s right on the pad. Fuel bonus: +${Math.round(10 + s.fuel / 5)} ✦`);
        } else {
          s.over = 'crash';
          sound.playMineImpact();
          setMsg(!slow ? `Too fast: ${Math.abs(s.v).toFixed(1)} m/s. Brake harder! Landers must touch down under ${SAFE} m/s.` : 'Bumpy rocks there! Slide onto the flat pad with the lights.');
          s.timer = 1.6;
        }
      }
      if (s.alt > 160) {
        s.alt = 160;
        s.v = Math.min(s.v, 0);
      }
      setReadout((r) =>
        Math.abs(r.alt - s.alt) > 0.5 || Math.abs(r.v - s.v) > 0.05 || Math.abs(r.fuel - s.fuel) > 1 || r.onPad !== onPad ? { alt: s.alt, v: s.v, fuel: s.fuel, onPad } : r
      );
    } else if (s.over === 'crash') {
      s.timer -= dt;
      if (s.timer <= 0) reset();
    }

    stars(ctx, w, h, 11);
    // Earth hanging in the sky
    ctx.fillStyle = '#4a6fb8';
    ctx.beginPath();
    ctx.arc(w - 50, 40, 16, 0, Math.PI * 2);
    ctx.fill();
    const ground = h - 34;
    ctx.fillStyle = '#8b877f';
    ctx.fillRect(0, ground, w, h - ground);
    // boulders everywhere except the pad
    ctx.fillStyle = '#6d6a64';
    for (let i = 0; i < 16; i++) {
      const bx = ((i * 0.071 + 0.03) % 1) * w;
      if (Math.abs(bx / w - s.pad) < padW / 2 + 0.02) continue;
      ctx.beginPath();
      ctx.ellipse(bx, ground + 2, 9 + (i % 3) * 4, 7 + (i % 2) * 3, 0, Math.PI, 0);
      ctx.fill();
    }
    // landing pad
    const px = s.pad * w;
    ctx.fillStyle = '#b3ada2';
    ctx.fillRect(px - (padW * w) / 2, ground - 3, padW * w, 5);
    const blink = Math.floor(performance.now() / 300) % 2 === 0;
    for (const e of [-1, 1]) {
      ctx.fillStyle = blink ? '#f2b84b' : '#7a5f2a';
      ctx.beginPath();
      ctx.arc(px + (e * padW * w) / 2, ground - 5, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#f2b84b';
    ctx.font = 'bold 12px "Atkinson Hyperlegible", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LAND HERE', px, ground + 20);

    const y = ground - (s.alt / 160) * (ground - 40) - 18;
    const x = s.x * w;
    ctx.fillStyle = `rgba(14,13,22,${0.15 + 0.35 * (1 - s.alt / 160)})`;
    ctx.beginPath();
    ctx.ellipse(x, ground + 2, 26, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(s.vx * 2);
    ctx.strokeStyle = '#8c8679';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-10, 8);
    ctx.lineTo(-22, 18);
    ctx.moveTo(10, 8);
    ctx.lineTo(22, 18);
    ctx.stroke();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#26252c';
    ctx.fillStyle = '#c9a24a';
    ctx.fillRect(-16, -2, 32, 12);
    ctx.strokeRect(-16, -2, 32, 12);
    ctx.fillStyle = '#e8e3d7';
    ctx.fillRect(-11, -18, 22, 16);
    ctx.strokeRect(-11, -18, 22, 16);
    ctx.fillStyle = '#2a2440';
    ctx.fillRect(-5, -14, 10, 5);
    if (s.burning && !s.over) {
      ctx.fillStyle = '#f2b84b';
      ctx.beginPath();
      ctx.moveTo(-5, 10);
      ctx.lineTo(0, 22 + Math.random() * 10);
      ctx.lineTo(5, 10);
      ctx.fill();
    }
    if (s.side && !s.over) {
      ctx.fillStyle = '#f3efe6';
      ctx.beginPath();
      ctx.arc(-s.side * 18, -8, 3 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }, [landed]);

  const speed = Math.abs(readout.v);
  const safe = speed <= SAFE;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="rounded-xl bg-moon-panel-2 border border-moon-line p-2">
          <div className="text-sm text-moon-muted">Height</div>
          <div className="text-xl font-bold">{Math.max(0, readout.alt).toFixed(0)} m</div>
        </div>
        <div className={`rounded-xl bg-moon-panel-2 border p-2 ${safe ? 'border-moon-ok' : 'border-moon-warn'}`}>
          <div className="text-sm text-moon-muted">Falling speed</div>
          <div className="text-xl font-bold">
            {speed.toFixed(1)} m/s <span className="text-sm">{safe ? '✓' : '▲'}</span>
          </div>
        </div>
        <div className={`rounded-xl bg-moon-panel-2 border p-2 ${readout.onPad ? 'border-moon-ok' : 'border-moon-target'}`}>
          <div className="text-sm text-moon-muted">Over the pad?</div>
          <div className="text-xl font-bold">{readout.onPad ? '✓ Yes' : '← → No'}</div>
        </div>
        <div className={`rounded-xl bg-moon-panel-2 border p-2 ${readout.fuel < 20 ? 'border-moon-warn' : 'border-moon-line'}`}>
          <div className="text-sm text-moon-muted">Fuel</div>
          <div className="text-xl font-bold">{Math.round(readout.fuel)}%</div>
        </div>
      </div>
      <canvas ref={ref} className="w-full h-[260px] rounded-xl block" aria-label="Your lander descending. Brake with Space and slide left or right onto the lit landing pad." />
      {!landed ? (
        <div className="flex gap-2">
          <button {...hold('l')} aria-label="Slide left" className="flex-1 rounded-xl border border-moon-line bg-moon-panel-2 py-4 font-bold active:bg-slate-800">
            ← <kbd className="ml-1 rounded bg-slate-950 px-1.5 text-xs">A</kbd>
          </button>
          <button {...hold('up')} className="flex-[2] rounded-xl border border-moon-target bg-moon-panel-2 py-4 text-lg font-bold active:bg-slate-800">
            Hold to brake <kbd className="ml-1 rounded bg-slate-950 px-1.5 text-xs">hold Space</kbd>
          </button>
          <button {...hold('r')} aria-label="Slide right" className="flex-1 rounded-xl border border-moon-line bg-moon-panel-2 py-4 font-bold active:bg-slate-800">
            → <kbd className="ml-1 rounded bg-slate-950 px-1.5 text-xs">D</kbd>
          </button>
        </div>
      ) : (
        <button
          onClick={stepOut}
          disabled={out}
          className="w-full rounded-xl border border-moon-ok bg-moon-panel-2 px-4 py-4 text-lg font-bold hover:bg-slate-800"
        >
          {out ? 'Climbing down...' : 'Step outside'} {!out && <kbd className="ml-1 rounded bg-slate-950 px-1.5 text-xs">E</kbd>}
        </button>
      )}
      {msg && <p className="text-sm mb-rise" role="status">{msg}</p>}
    </div>
  );
};
