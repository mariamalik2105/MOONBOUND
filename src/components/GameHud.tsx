/**
 * The in-play screen: one mission card, a few gauges, a small action bar.
 * Everything else lives in menus. Interaction prompts ("E · Collect ice")
 * are drawn in the world by the engine, next to the object itself.
 */

import React from 'react';
import { Hammer, Backpack, Radar, Menu, Lightbulb, Check, ListChecks, Volume2, VolumeX, AlertTriangle, Car, Sun, Moon, FlaskConical } from 'lucide-react';
import type { MissionGuide } from '../game/progression';

export interface HudGauge {
  id: string;
  label: string;
  value: string;
  /** 0..1 fill, or undefined for plain counts */
  fill?: number;
  state?: 'ok' | 'low' | 'critical';
}

export interface HudAction {
  id: string;
  label: string;
  keyHint: string;
  icon: 'build' | 'scan' | 'backpack' | 'rover' | 'lab' | 'menu';
  onClick: () => void;
  active?: boolean;
}

interface GameHudProps {
  guide: MissionGuide;
  hint: string | null;
  onHint: () => void;
  onOpenMission: () => void;
  onSkipTutorial?: () => void;
  gauges: HudGauge[];
  materials: { id: string; label: string; value: number; needed?: number }[];
  spaceDollars: number;
  actions: HudAction[];
  alertCount: number;
  onOpenAlerts: () => void;
  dayNight: 'day' | 'night';
  doseLabel?: string;
  stormLabel?: string;
  isMuted: boolean;
  onToggleMute: () => void;
  phaseLetters: { letter: string; done: boolean; current: boolean }[];
  /** Repeatable base chores that pay coins */
  jobs?: { id: string; icon: string; label: string; coins: number; onClick: () => void }[];
}

const ICONS = {
  build: Hammer,
  scan: Radar,
  backpack: Backpack,
  rover: Car,
  lab: FlaskConical,
  menu: Menu,
};

export const GameHud: React.FC<GameHudProps> = ({
  guide,
  hint,
  onHint,
  onOpenMission,
  onSkipTutorial,
  gauges,
  materials,
  spaceDollars,
  actions,
  alertCount,
  onOpenAlerts,
  dayNight,
  doseLabel,
  stormLabel,
  isMuted,
  onToggleMute,
  phaseLetters,
  jobs = [],
}) => {
  const done = guide.steps.filter((s) => s.done).length;
  // little "+N ✦" pop whenever coins go up
  const [pop, setPop] = React.useState<{ n: number; id: number } | null>(null);
  const prevDollars = React.useRef(spaceDollars);
  React.useEffect(() => {
    const diff = spaceDollars - prevDollars.current;
    prevDollars.current = spaceDollars;
    if (diff > 0) {
      const id = Date.now();
      setPop({ n: diff, id });
      const t = setTimeout(() => setPop((p) => (p && p.id === id ? null : p)), 1600);
      return () => clearTimeout(t);
    }
  }, [spaceDollars]);
  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 text-moon-text">
      {/* Mission card */}
      <section
        aria-label="Current mission"
        className="mb-panel pointer-events-auto absolute left-4 top-4 w-[min(360px,calc(100vw-2rem))] rounded-2xl bg-moon-panel/90 border border-moon-line shadow-xl"
      >
        <div className="flex items-center gap-1 px-4 pt-3" aria-label="Campaign progress">
          {phaseLetters.map((p, i) => (
            <span
              key={i}
              title={p.done ? 'Done' : p.current ? 'Current mission' : 'Coming up'}
              className={`mb-phase w-5 h-5 rounded-md text-[11px] font-bold flex items-center justify-center ${
                p.current ? 'bg-moon-accent text-[#18161f]' : p.done ? 'bg-slate-700 text-slate-200' : 'bg-transparent text-slate-500 border border-slate-700'
              }`}
            >
              {p.letter}
            </span>
          ))}
        </div>
        <div className="px-4 pt-2 pb-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold leading-tight">{guide.title}</h2>
            {guide.steps.length > 0 && (
              <span className="text-xs text-moon-muted shrink-0">
                {done}/{guide.steps.length} done
              </span>
            )}
          </div>
          <div className="mt-2 rounded-2xl bg-moon-panel-2 border-2 border-[#8ceaff]/45 px-3 py-2.5" role="status" aria-live="polite">
            <div className="text-[15px] font-bold leading-snug">{guide.current.text}</div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
              {guide.current.control && (
                <span className="mb-kbd rounded-md bg-moon-text text-[#1a1a20] px-2 py-0.5 text-xs font-bold">{guide.current.control}</span>
              )}
              {guide.current.progress && <span className="text-moon-target font-bold">{guide.current.progress}</span>}
            </div>
          </div>
          {hint && (
            <p className="mt-2 text-sm text-slate-200 flex gap-2 mb-rise">
              <Lightbulb className="w-4 h-4 mt-0.5 text-moon-target shrink-0" aria-hidden />
              <span>{hint}</span>
            </p>
          )}
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              onClick={onHint}
              className="mb-hud-btn flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 border border-moon-line"
            >
              <Lightbulb className="w-4 h-4" aria-hidden /> Hint
            </button>
            <button
              onClick={onOpenMission}
              className="mb-hud-btn flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 border border-moon-line"
            >
              <ListChecks className="w-4 h-4" aria-hidden /> Steps
            </button>
            {onSkipTutorial && (
              <button onClick={onSkipTutorial} className="rounded-lg px-2.5 py-1.5 text-sm text-moon-muted hover:text-moon-text underline underline-offset-2">
                Skip intro
              </button>
            )}
          </div>
        </div>
        {jobs.length > 0 && (
          <div className="border-t border-moon-line px-4 py-2.5" aria-label="Base jobs">
            <div className="text-xs text-moon-muted mb-1.5">Base jobs · earn coins</div>
            <div className="flex flex-wrap gap-1.5">
              {jobs.map((j) => (
                <button
                  key={j.id}
                  onClick={j.onClick}
                  className="mb-hud-btn flex items-center gap-1.5 rounded-lg bg-moon-panel-2 hover:bg-slate-700 border border-moon-target/60 px-2.5 py-1.5 text-sm font-bold"
                >
                  <span aria-hidden>{j.icon}</span> {j.label} <span className="text-moon-target">+{j.coins}✦</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Gauges */}
      <section aria-label="Base status" className="pointer-events-auto absolute right-4 top-4 flex flex-col items-end gap-2 max-w-[min(420px,calc(100vw-2rem))]">
        <div className="flex flex-wrap justify-end gap-2">
          <span className="mb-chip flex items-center gap-1.5 rounded-xl bg-moon-panel/90 border border-moon-line px-3 py-1.5 text-sm" title={dayNight === 'day' ? 'Lunar day' : 'Lunar night'}>
            {dayNight === 'day' ? <Sun className="w-4 h-4 text-moon-target" aria-hidden /> : <Moon className="w-4 h-4 text-moon-accent" aria-hidden />}
            <span className="sr-only">{dayNight === 'day' ? 'Day' : 'Night'}</span>
          </span>
          {gauges.map((g) => (
            <div
              key={g.id}
              className={`mb-chip rounded-xl bg-moon-panel/90 border px-3 py-1.5 min-w-[92px] ${
                g.state === 'critical' ? 'border-moon-warn' : g.state === 'low' ? 'border-moon-target' : 'border-moon-line'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-xs text-moon-muted">
                <span>{g.label}</span>
                {g.state && g.state !== 'ok' && <AlertTriangle className="w-3.5 h-3.5 text-moon-warn" aria-label="Low" />}
              </div>
              <div className="text-[15px] font-bold leading-tight">{g.value}</div>
              {g.fill !== undefined && (
                <div className="mb-track mt-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${g.state === 'critical' ? 'bg-moon-warn' : g.state === 'low' ? 'bg-moon-target' : 'bg-moon-ok'}`}
                    style={{ width: `${Math.max(0, Math.min(1, g.fill)) * 100}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        {materials.length > 0 && (
          <div className="mb-chip flex flex-wrap justify-end gap-1.5 rounded-xl bg-moon-panel/90 border border-moon-line px-3 py-1.5 text-sm">
            {materials.map((m) => (
              <span key={m.id} className={m.needed && m.value < m.needed ? 'text-moon-target font-bold' : 'text-slate-200'}>
                {m.label} {m.value}
                {m.needed ? `/${m.needed}` : ''}
              </span>
            ))}
            <span className="relative text-moon-target font-bold">
              · ✦ {spaceDollars}
              {pop && (
                <span key={pop.id} className="absolute -top-6 right-0 text-moon-target font-bold text-base coin-pop">
                  +{pop.n} ✦
                </span>
              )}
            </span>
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          {stormLabel && (
            <span className="mb-chip rounded-xl bg-red-950 border border-moon-warn px-3 py-1.5 text-sm font-bold text-red-200">☀ {stormLabel}</span>
          )}
          {doseLabel && !stormLabel && (
            <span className="mb-chip rounded-xl bg-moon-panel/90 border border-moon-line px-3 py-1.5 text-sm text-slate-200" title="Crew radiation dose. NASA's career limit is 600 mSv.">
              Dose {doseLabel}
            </span>
          )}
          {alertCount > 0 && (
            <button
              onClick={onOpenAlerts}
              className="mb-chip flex items-center gap-1.5 rounded-xl bg-moon-panel border border-moon-target px-3 py-1.5 text-sm font-bold text-moon-target hover:bg-slate-800"
            >
              <AlertTriangle className="w-4 h-4" aria-hidden /> {alertCount} base {alertCount === 1 ? 'problem' : 'problems'}
            </button>
          )}
        </div>
      </section>

      {/* Action bar */}
      <nav aria-label="Actions" className="mb-panel pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-2xl bg-moon-panel/90 border border-moon-line p-2 shadow-xl">
        {actions.map((a) => {
          const Icon = ICONS[a.icon];
          return (
            <button
              key={a.id}
              onClick={a.onClick}
              className={`mb-hud-btn flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-bold min-h-11 border ${
                a.active ? 'bg-moon-accent text-[#18161f] border-moon-accent' : 'bg-slate-800 hover:bg-slate-700 border-moon-line'
              }`}
            >
              <Icon className="w-4 h-4" aria-hidden />
              <span>{a.label}</span>
              <kbd className={`mb-kbd rounded px-1.5 text-xs font-bold ${a.active ? 'bg-[#18161f]/20' : 'bg-slate-950 text-slate-300'}`}>{a.keyHint}</kbd>
            </button>
          );
        })}
        <button
          onClick={onToggleMute}
          aria-label={isMuted ? 'Turn sound on' : 'Mute sound'}
          className="mb-hud-btn rounded-xl p-2.5 bg-slate-800 hover:bg-slate-700 border border-moon-line min-h-11"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </nav>

      {guide.ready && (
        <div className="mb-toast absolute left-1/2 top-4 -translate-x-1/2 rounded-xl bg-moon-panel border border-moon-ok px-4 py-2 text-sm font-bold flex items-center gap-2 mb-rise">
          <Check className="w-4 h-4 text-moon-ok" aria-hidden /> Mission complete
        </div>
      )}
    </div>
  );
};
