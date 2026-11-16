/**
 * Small shared overlays: mission celebration, campaign finale, science notes,
 * toasts, confirm dialog, mission steps and the controls card.
 */

import React, { useEffect, useRef } from 'react';
import { Check, X, Award, BookOpen, Star, Trophy, PawPrint } from 'lucide-react';
import type { MissionGuide, PhaseReward } from '../game/progression';
import { BUILDING_RECIPES } from '../game/economy';
import { ControlsTable } from './SettingsModal';

function useAutoFocus<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const t = setTimeout(() => ref.current?.focus(), 30);
    return () => clearTimeout(t);
  }, []);
  return ref;
}

const Shell: React.FC<{ label: string; children: React.ReactNode; wide?: boolean; z?: string }> = ({ label, children, wide, z = 'z-[55]' }) => (
  <div className={`mb-backdrop fixed inset-0 ${z} flex items-center justify-center p-4 bg-black/65`} role="dialog" aria-modal="true" aria-label={label}>
    <div className={`mb-card w-full ${wide ? 'max-w-xl' : 'max-w-md'} max-h-[92vh] overflow-y-auto rounded-2xl bg-moon-panel border border-moon-line p-5 shadow-2xl mb-rise`}>{children}</div>
  </div>
);

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m} min ${r} s` : `${r} s`;
}

// ---------------------------------------------------------------------------

export const MissionCelebration: React.FC<{ reward: PhaseReward; nextName?: string; onContinue: () => void }> = ({ reward, nextName, onContinue }) => {
  const btn = useAutoFocus<HTMLButtonElement>();
  return (
    <Shell label="Mission complete">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 rounded-full border-4 border-white bg-gradient-to-br from-[#f04ac9] to-[#714ec5] text-white shadow-[0_5px_0_#5b3d99,0_0_24px_rgba(239,76,200,0.45)] flex items-center justify-center text-3xl font-bold font-display mb-pop">{reward.letter}</div>
        <p className="mt-3 text-sm text-moon-muted">Mission complete</p>
        <h2 className="text-3xl font-semibold">{reward.phaseName}</h2>
      </div>
      <ul className="mt-4 space-y-2">
        <li className="flex items-center gap-3 rounded-xl bg-moon-panel-2 border border-moon-line px-3 py-2.5 mb-rise" style={{ animationDelay: '150ms' }}>
          <Award className="w-5 h-5 text-moon-target shrink-0" aria-hidden />
          <span>
            <span className="font-bold">Badge: {reward.badge.name}</span>
            {reward.badge.worldChange && <span className="block text-sm text-moon-muted">{reward.badge.worldChange}</span>}
          </span>
        </li>
        {reward.dollars > 0 && (
          <li className="flex items-center gap-3 rounded-xl bg-moon-panel-2 border border-moon-line px-3 py-2.5 mb-rise" style={{ animationDelay: '300ms' }}>
            <Star className="w-5 h-5 text-moon-target shrink-0" aria-hidden />
            <span className="font-bold">+S✦{reward.dollars} SpaceDollars</span>
          </li>
        )}
        {reward.blueprints.length > 0 && (
          <li className="flex items-center gap-3 rounded-xl bg-moon-panel-2 border border-moon-line px-3 py-2.5 mb-rise" style={{ animationDelay: '450ms' }}>
            <Check className="w-5 h-5 text-moon-ok shrink-0" aria-hidden />
            <span>
              <span className="font-bold">New blueprints: </span>
              {reward.blueprints.map((b) => BUILDING_RECIPES[b]?.name || b).join(', ')}
            </span>
          </li>
        )}
      </ul>
      <p className="mt-3 text-sm text-moon-muted text-center">Time spent playing this mission: {fmtTime(reward.seconds)}</p>
      <button ref={btn} onClick={onContinue} className="mb-btn-primary mt-4 w-full rounded-xl bg-moon-accent text-[#18161f] font-bold py-3 text-lg">
        {nextName ? `Next: ${nextName}` : reward.campaignComplete ? 'Finish the mission' : 'Continue'}
      </button>
    </Shell>
  );
};

/** Controls over the liftoff cutscene (the scene itself is drawn on the game canvas). */
export const LiftoffBar: React.FC<{ caption: string; onSkip: () => void }> = ({ caption, onSkip }) => {
  const btn = useAutoFocus<HTMLButtonElement>();
  return (
    <div className="fixed inset-0 z-[56] pointer-events-none" role="dialog" aria-label="Liftoff">
      <p className="sr-only" aria-live="polite">
        {caption}
      </p>
      <button
        ref={btn}
        onClick={onSkip}
        className="pointer-events-auto absolute top-3 right-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/30 text-white text-sm font-bold px-3 py-1.5"
      >
        Skip <span className="text-white/60 font-normal">(Esc)</span>
      </button>
    </div>
  );
};

export const Finale: React.FC<{
  crewName: string;
  badges: number;
  seconds: number;
  buildings: number;
  scans: number;
  onExplore: () => void;
  onTitle: () => void;
}> = (p) => {
  const btn = useAutoFocus<HTMLButtonElement>();
  return (
    <div
      className="mb-backdrop fixed inset-0 z-[58] flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(7, 8, 47, 0.55)', backdropFilter: 'blur(3px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="finale-title"
    >
      <div className="mb-card w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl bg-moon-panel/95 border border-moon-target p-6 shadow-2xl text-center mb-rise my-auto">
        <div className="mx-auto w-20 h-20 rounded-full border-4 border-white bg-gradient-to-br from-[#f04ac9] to-[#714ec5] text-white shadow-[0_5px_0_#5b3d99,0_0_28px_rgba(239,76,200,0.5)] flex items-center justify-center mb-pop">
          <Trophy className="w-10 h-10" aria-hidden />
        </div>
        <p className="mt-4 text-xs font-extrabold tracking-[0.2em] text-moon-target">MISSION ACCOMPLISHED</p>
        <h2 id="finale-title" className="text-4xl font-semibold mt-1 leading-tight">
          Congratulations, Commander!
        </h2>
        <p className="mt-2 text-lg font-bold text-cyan-300">You made it to the end of MOONBOUND. All nine missions are complete.</p>
        <div className="mt-3 flex justify-center gap-1" aria-label="All nine missions complete">
          {'MOONBOUND'.split('').map((l, i) => (
            <span
              key={i}
              className="w-7 h-7 rounded-full bg-moon-ok text-[#14201a] text-xs font-bold flex items-center justify-center mb-pop"
              style={{ animationDelay: `${200 + i * 70}ms` }}
              aria-hidden
            >
              {l}
            </span>
          ))}
        </div>
        <p className="mt-3 text-slate-200">
          {p.crewName}'s base at the lunar south pole makes its own air, cleans its own water, grows food and talks to Earth. That is exactly what NASA's Artemis program is working toward.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-xl bg-moon-panel-2 border border-moon-line p-2">
            <div className="text-2xl font-bold">{p.badges}</div>Badges
          </div>
          <div className="rounded-xl bg-moon-panel-2 border border-moon-line p-2">
            <div className="text-2xl font-bold">{p.buildings}</div>Buildings
          </div>
          <div className="rounded-xl bg-moon-panel-2 border border-moon-line p-2">
            <div className="text-2xl font-bold">{p.scans}</div>Rocks scanned
          </div>
        </div>
        <p className="mt-2 text-sm text-moon-muted">Total play time: {fmtTime(p.seconds)}</p>
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <button ref={btn} onClick={p.onExplore} className="mb-btn-primary flex-1 rounded-xl bg-moon-accent text-[#18161f] font-bold py-3">
            Keep building
          </button>
          <button onClick={p.onTitle} className="mb-btn-ledge flex-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-moon-line font-bold py-3">
            Back to title
          </button>
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-xl border-2 border-moon-target/60 bg-moon-panel-2 px-3 py-2.5 text-left">
          <PawPrint className="w-6 h-6 text-moon-target shrink-0" aria-hidden />
          <p className="text-sm">
            <span className="font-bold text-moon-target">The adventure isn't over!</span> Keep playing to earn more SpaceDollars ✦ and unlock new pets, astronauts and emotes in the 3D Armory &amp; Pets (Esc → Settings).
          </p>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------

export interface ScienceNoteData {
  id: string;
  title: string;
  text: string;
  source?: string;
}

/** Non-blocking card in the corner. Never pauses the game. */
export const ScienceNote: React.FC<{ note: ScienceNoteData; onClose: () => void; onMore: () => void }> = ({ note, onClose, onMore }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 14000);
    return () => clearTimeout(t);
  }, [note.id, onClose]);
  return (
    <aside
      className="mb-panel pointer-events-auto absolute right-4 bottom-24 z-30 w-[min(340px,calc(100vw-2rem))] rounded-2xl bg-moon-panel/90 border border-moon-line p-3.5 shadow-xl mb-rise"
      aria-live="polite"
      aria-label="Discovery"
    >
      <div className="flex items-start gap-2">
        <BookOpen className="w-4 h-4 mt-1 text-moon-accent shrink-0" aria-hidden />
        <div className="flex-1">
          <div className="text-xs text-moon-muted">Discovery</div>
          <div className="font-bold leading-snug">{note.title}</div>
          <p className="text-sm text-slate-200 mt-1">{note.text}</p>
          <div className="mt-2 flex gap-3 text-sm">
            <button onClick={onMore} className="font-bold text-moon-accent hover:underline">
              Learn more (K)
            </button>
            {note.source && <span className="text-xs text-moon-muted self-center">Source: {note.source}</span>}
          </div>
        </div>
        <button onClick={onClose} aria-label="Dismiss" className="p-1 rounded hover:bg-slate-800">
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};

export interface ToastItem {
  id: number;
  text: string;
  tone: 'info' | 'good' | 'warn';
}

export const ToastStack: React.FC<{ toasts: ToastItem[] }> = ({ toasts }) => (
  <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-16 max-sm:top-[36%] z-40 flex flex-col items-center gap-2 max-sm:gap-1.5 w-[min(520px,calc(100vw-2rem))]" aria-live="polite">
    {toasts.map((t) => (
      <div
        key={t.id}
        className={`mb-toast rounded-xl px-4 py-2 text-[15px] max-sm:px-3 max-sm:py-1.5 max-sm:text-sm font-bold shadow-lg border bg-moon-panel/95 mb-rise text-center ${
          t.tone === 'warn' ? 'border-moon-warn text-red-100' : t.tone === 'good' ? 'border-moon-ok' : 'border-moon-line'
        }`}
      >
        {t.tone === 'good' && <Check className="inline w-4 h-4 mr-1 text-moon-ok -mt-0.5" aria-hidden />}
        {t.text}
      </div>
    ))}
  </div>
);

export const ConfirmDialog: React.FC<{ title: string; text: string; confirm: string; onConfirm: () => void; onCancel: () => void }> = (p) => {
  const btn = useAutoFocus<HTMLButtonElement>();
  return (
    <Shell label={p.title} z="z-[80]">
      <h2 className="text-2xl font-semibold">{p.title}</h2>
      <p className="mt-2 text-slate-200">{p.text}</p>
      <div className="mt-4 flex gap-2">
        <button ref={btn} onClick={p.onCancel} className="mb-btn-ledge flex-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-moon-line font-bold py-2.5">
          Cancel
        </button>
        <button onClick={p.onConfirm} className="mb-btn-ledge flex-1 rounded-xl bg-moon-warn border-[#ffc2d1] text-[#2a1310] font-bold py-2.5">
          {p.confirm}
        </button>
      </div>
    </Shell>
  );
};

export const MissionSteps: React.FC<{ guide: MissionGuide; onClose: () => void; onRestartIntro?: () => void }> = ({ guide, onClose }) => {
  const btn = useAutoFocus<HTMLButtonElement>();
  return (
    <Shell label="Mission steps" wide>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-moon-muted">Mission {guide.phaseIndex + 1} of 9</div>
          <h2 className="text-2xl font-semibold">{guide.title}</h2>
          <p className="text-moon-muted">{guide.goal}</p>
        </div>
        <button ref={btn} onClick={onClose} aria-label="Close (Esc)" className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center shrink-0">
          <X className="w-5 h-5" />
        </button>
      </div>
      <ol className="mt-3 space-y-1.5">
        {guide.steps.map((s, i) => (
          <li key={i} className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${s.done ? 'border-moon-line text-moon-muted' : 'border-moon-line bg-moon-panel-2'}`}>
            <span className={`w-6 h-6 rounded-md flex items-center justify-center text-sm font-bold ${s.done ? 'bg-moon-ok text-[#14201a]' : 'bg-slate-700'}`}>
              {s.done ? <Check className="w-4 h-4" aria-label="Done" /> : i + 1}
            </span>
            <span className={s.done ? 'line-through' : ''}>{s.text}</span>
          </li>
        ))}
      </ol>
      <div className="mt-3 rounded-xl bg-moon-panel-2 border border-moon-line p-3">
        <div className="text-sm font-bold">Now</div>
        <div>{guide.current.text}</div>
        {guide.current.control && <div className="mt-1 text-sm text-moon-target font-bold">{guide.current.control}</div>}
      </div>
      {guide.science && (
        <details className="mt-3 rounded-xl bg-moon-panel-2 border border-moon-line p-3">
          <summary className="font-bold cursor-pointer">Why this matters</summary>
          <p className="mt-1 text-sm text-slate-200">{guide.science}</p>
        </details>
      )}
      {guide.rewardDollars > 0 && <p className="mt-3 text-sm text-moon-muted">Reward: S✦{guide.rewardDollars} and a mission badge.</p>}
    </Shell>
  );
};

export const ControlsCard: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const btn = useAutoFocus<HTMLButtonElement>();
  return (
    <Shell label="Controls">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-2xl font-semibold">Controls</h2>
        <button ref={btn} onClick={onClose} aria-label="Close (Esc)" className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center">
          <X className="w-5 h-5" />
        </button>
      </div>
      <ControlsTable />
      <p className="mt-3 text-sm text-moon-muted">The card at the top left always shows your next step. Press Hint if you get stuck.</p>
    </Shell>
  );
};
