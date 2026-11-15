/**
 * Hands-on setup tasks for new base equipment. Each is short, works with keys
 * or clicks, explains mistakes in one line, and can be retried right away.
 */

import React, { useEffect, useRef, useState } from 'react';
import { X, ArrowLeft, ArrowRight } from 'lucide-react';
import { sound } from '../game/audio';

export type TaskKind = 'water_recycler' | 'research_lab' | 'communication_tower';

interface TaskOverlayProps {
  kind: TaskKind;
  onSuccess: () => void;
  onClose: () => void;
}

export const TaskOverlay: React.FC<TaskOverlayProps> = ({ kind, onSuccess, onClose }) => {
  const title = kind === 'water_recycler' ? 'Set up the water recycler' : kind === 'research_lab' ? 'Run your first analysis' : 'Aim the dish at Earth';
  return (
    <div className="mb-backdrop absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="mb-card w-full max-w-xl rounded-2xl bg-moon-panel border border-moon-line p-5 shadow-2xl mb-rise">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="text-2xl font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close (Esc)" className="rounded-lg p-2 bg-slate-800 hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        {kind === 'water_recycler' && <RecyclerTask onSuccess={onSuccess} />}
        {kind === 'research_lab' && <LabTask onSuccess={onSuccess} />}
        {kind === 'communication_tower' && <AntennaTask onSuccess={onSuccess} />}
      </div>
    </div>
  );
};

function useTaskKeys(onDown: (k: string, e: KeyboardEvent) => void, onUp?: (k: string) => void) {
  const d = useRef(onDown);
  const u = useRef(onUp);
  d.current = onDown;
  u.current = onUp;
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      d.current(e.key.toLowerCase(), e);
    };
    const ku = (e: KeyboardEvent) => u.current?.(e.key.toLowerCase());
    const bl = () => u.current?.('*');
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    window.addEventListener('blur', bl);
    return () => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      window.removeEventListener('blur', bl);
    };
  }, []);
}

// ---------------------------------------------------------------------------
// Water recycler: put three stages in order
// ---------------------------------------------------------------------------

const PARTS = [
  { id: 'distill', name: 'Boiler', what: 'Boils water so clean steam leaves the dirt behind', order: 1 },
  { id: 'tank', name: 'Clean tank', what: 'Stores water that is ready to drink', order: 2 },
  { id: 'filter', name: 'Filter', what: 'Catches bits and hair first', order: 0 },
];

const RecyclerTask: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [slots, setSlots] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [won, setWon] = useState(false);

  const place = (id: string) => {
    if (won || slots.includes(id)) return;
    const part = PARTS.find((p) => p.id === id)!;
    if (part.order !== slots.length) {
      sound.playClick();
      setMsg(
        slots.length === 0
          ? 'Start with the part that catches bits first, or they would clog everything after it.'
          : slots.length === 1
          ? 'Next the water needs to be cleaned properly before it is stored.'
          : 'The last stop is where clean water waits until the crew needs it.'
      );
      return;
    }
    sound.playCollect();
    const next = [...slots, id];
    setSlots(next);
    setMsg(null);
    if (next.length === 3) {
      setWon(true);
      sound.playVictory();
      setMsg('Water is flowing: filter, boil, store. The ISS recycles about 98% of its water in a similar loop.');
      setTimeout(onSuccess, 1600);
    }
  };

  useTaskKeys((k, e) => {
    if (e.repeat) return;
    if (['1', '2', '3'].includes(k)) place(PARTS[Number(k) - 1].id);
  });

  return (
    <div className="space-y-3">
      <p className="text-moon-muted">Click the parts (or press 1, 2, 3) in the order water should flow through them.</p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="shrink-0 rounded-lg bg-[#3a3122] px-2 py-2 text-sm">Used water</span>
        {[0, 1, 2].map((i) => {
          const p = PARTS.find((x) => x.id === slots[i]);
          return (
            <React.Fragment key={i}>
              <span className="text-moon-muted" aria-hidden>
                →
              </span>
              <span className={`shrink-0 min-w-[96px] rounded-lg border px-2 py-2 text-sm text-center ${p ? 'border-moon-ok bg-[#1d2a22] font-bold' : 'border-dashed border-slate-600 text-slate-500'}`}>
                {p ? p.name : `Step ${i + 1}`}
              </span>
            </React.Fragment>
          );
        })}
        <span className="text-moon-muted" aria-hidden>
          →
        </span>
        <span className="shrink-0 rounded-lg bg-[#22283a] px-2 py-2 text-sm">Habitat</span>
      </div>
      <div className="grid sm:grid-cols-3 gap-2">
        {PARTS.map((p, i) => (
          <button
            key={p.id}
            onClick={() => place(p.id)}
            disabled={slots.includes(p.id) || won}
            className={`text-left rounded-xl border p-3 ${slots.includes(p.id) ? 'border-moon-line opacity-40' : 'border-moon-line bg-moon-panel-2 hover:border-moon-target'}`}
          >
            <div className="font-bold">
              <kbd className="rounded bg-slate-950 px-1.5 text-xs mr-1">{i + 1}</kbd>
              {p.name}
            </div>
            <div className="text-sm text-moon-muted mt-1">{p.what}</div>
          </button>
        ))}
      </div>
      {msg && (
        <p className={`text-sm ${won ? 'text-moon-ok' : 'text-moon-target'} mb-rise`} role="status">
          {msg}
        </p>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Lab: compare two real rock types
// ---------------------------------------------------------------------------

const ROCKS = [
  { id: 'bright', name: 'Bright highland rock', bars: { Iron: 1, Titanium: 0, Aluminum: 3, Calcium: 3 }, ok: false, why: 'This bright highland rock is rich in aluminum and calcium, not iron. Check the iron bars.' },
  { id: 'dark', name: 'Dark lava rock (basalt)', bars: { Iron: 3, Titanium: 2, Aluminum: 1, Calcium: 2 }, ok: true, why: 'Right! The dark plains on the Moon are old lava (basalt), rich in iron and titanium.' },
];

const LabTask: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [pick, setPick] = useState<string | null>(null);
  const [won, setWon] = useState(false);
  const choose = (id: string) => {
    if (won) return;
    setPick(id);
    const r = ROCKS.find((x) => x.id === id)!;
    if (r.ok) {
      setWon(true);
      sound.playVictory();
      setTimeout(onSuccess, 1700);
    } else sound.playClick();
  };
  useTaskKeys((k, e) => {
    if (e.repeat) return;
    if (k === '1') choose(ROCKS[0].id);
    if (k === '2') choose(ROCKS[1].id);
  });
  const chosen = ROCKS.find((r) => r.id === pick);
  return (
    <div className="space-y-3">
      <p className="text-moon-muted">The workshop needs iron for tools and frames. Which sample should the lab process? (1 or 2)</p>
      <div className="grid sm:grid-cols-2 gap-2">
        {ROCKS.map((r, i) => (
          <button
            key={r.id}
            onClick={() => choose(r.id)}
            className={`text-left rounded-xl border p-3 ${pick === r.id ? (r.ok ? 'border-moon-ok bg-[#1d2a22]' : 'border-moon-warn bg-[#2a1b19]') : 'border-moon-line bg-moon-panel-2 hover:border-moon-target'}`}
          >
            <div className="font-bold mb-2">
              <kbd className="rounded bg-slate-950 px-1.5 text-xs mr-1">{i + 1}</kbd>
              {r.name}
            </div>
            {Object.entries(r.bars).map(([el, n]) => (
              <div key={el} className="flex items-center gap-2 text-sm">
                <span className="w-20 text-moon-muted">{el}</span>
                <span className="flex gap-0.5" aria-label={`${el}: ${['none', 'low', 'medium', 'high'][n]}`}>
                  {[0, 1, 2].map((k) => (
                    <span key={k} className={`w-5 h-2.5 rounded-sm ${k < n ? 'bg-moon-accent' : 'bg-slate-700'}`} />
                  ))}
                </span>
              </div>
            ))}
          </button>
        ))}
      </div>
      {chosen && (
        <p className={`text-sm ${chosen.ok ? 'text-moon-ok' : 'text-moon-target'} mb-rise`} role="status">
          {chosen.why}
        </p>
      )}
      <p className="text-xs text-moon-muted">Readings are simplified to low, medium and high.</p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Antenna: turn the dish until the signal holds steady
// ---------------------------------------------------------------------------

const EARTH_ANGLE = 64; // degrees from the left horizon (Earth sits low as seen from the south pole)

const AntennaTask: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [angle, setAngle] = useState(150);
  const [hold, setHold] = useState(0);
  const [won, setWon] = useState(false);
  const dir = useRef(0);
  const angleRef = useRef(angle);
  angleRef.current = angle;

  useEffect(() => {
    if (won) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      if (dir.current !== 0) setAngle((a) => Math.max(0, Math.min(180, a + dir.current * 45 * dt)));
      const sig = signal(angleRef.current);
      setHold((h) => {
        const n = sig >= 0.85 ? Math.min(1, h + dt / 1.5) : Math.max(0, h - dt);
        if (n >= 1 && h < 1) {
          setWon(true);
          sound.playVictory();
          setTimeout(onSuccess, 1400);
        }
        return n;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [won, onSuccess]);

  useTaskKeys(
    (k) => {
      if (k === 'arrowleft' || k === 'a') dir.current = -1;
      if (k === 'arrowright' || k === 'd') dir.current = 1;
    },
    (k) => {
      if (k === '*' || ['arrowleft', 'a', 'arrowright', 'd'].includes(k)) dir.current = 0;
    }
  );

  const sig = signal(angle);
  const rad = (angle * Math.PI) / 180;
  const ex = 100 - Math.cos((EARTH_ANGLE * Math.PI) / 180) * 80;
  const ey = 92 - Math.sin((EARTH_ANGLE * Math.PI) / 180) * 30;
  const label = sig >= 0.85 ? 'Strong' : sig >= 0.5 ? 'Getting closer' : 'Weak';
  return (
    <div className="space-y-3">
      <p className="text-moon-muted">From the south pole, Earth sits low over the horizon. Turn the dish (← → or hold the buttons) until the signal stays strong.</p>
      <svg viewBox="0 0 200 110" className="w-full rounded-xl bg-[#0d0c12]" aria-label={`Dish direction. Signal ${label}.`}>
        <rect x="0" y="92" width="200" height="18" fill="#8b877f" />
        <circle cx={ex} cy={ey} r="7" fill="#4a6fb8" />
        <path d={`M${ex - 4} ${ey - 2} q3 -3 6 0`} stroke="#6c9a6a" strokeWidth="2" fill="none" />
        <line x1="100" y1="92" x2={100 - Math.cos(rad) * 70} y2={92 - Math.sin(rad) * 70} stroke={sig >= 0.85 ? '#7fd1a0' : '#f2b84b'} strokeWidth="2" strokeDasharray="4 3" />
        <rect x="94" y="84" width="12" height="8" fill="#bdb6a8" stroke="#26252c" />
        <ellipse cx={100 - Math.cos(rad) * 10} cy={86 - Math.sin(rad) * 10} rx="9" ry="4" fill="#e8e3d7" stroke="#26252c" transform={`rotate(${90 - angle} ${100 - Math.cos(rad) * 10} ${86 - Math.sin(rad) * 10})`} />
      </svg>
      <div className="flex items-center gap-3">
        <button
          aria-label="Turn dish left"
          onPointerDown={() => (dir.current = -1)}
          onPointerUp={() => (dir.current = 0)}
          onPointerLeave={() => (dir.current = 0)}
          className="w-12 h-12 rounded-xl bg-moon-panel-2 border border-moon-line hover:border-moon-target flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex justify-between text-sm">
            <span>Signal: {label}</span>
            <span className="text-moon-muted">{Math.round(sig * 100)}%</span>
          </div>
          <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
            <div className={`h-full ${sig >= 0.85 ? 'bg-moon-ok' : 'bg-moon-target'}`} style={{ width: `${sig * 100}%` }} />
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-slate-800 overflow-hidden" aria-label="Lock progress">
            <div className="h-full bg-moon-accent" style={{ width: `${hold * 100}%` }} />
          </div>
        </div>
        <button
          aria-label="Turn dish right"
          onPointerDown={() => (dir.current = 1)}
          onPointerUp={() => (dir.current = 0)}
          onPointerLeave={() => (dir.current = 0)}
          className="w-12 h-12 rounded-xl bg-moon-panel-2 border border-moon-line hover:border-moon-target flex items-center justify-center"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
      {won && (
        <p className="text-sm text-moon-ok mb-rise" role="status">
          Locked on Earth. Your base can now send its discoveries home.
        </p>
      )}
    </div>
  );
};

function signal(angle: number) {
  const d = Math.abs(angle - EARTH_ANGLE);
  return Math.max(0, Math.cos(Math.min(Math.PI / 2, (d / 40) * (Math.PI / 2))));
}
