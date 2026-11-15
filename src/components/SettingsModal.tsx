import React from 'react';
import { X, Volume2, VolumeX, ShoppingBag } from 'lucide-react';
import { sound } from '../game/audio';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  volume: number;
  onVolume: (v: number) => void;
  reducedMotion: boolean;
  onReducedMotion: (on: boolean) => void;
  highContrast: boolean;
  onHighContrast: (on: boolean) => void;
  /** Only offered once the crew is on the Moon */
  onReplayIntro?: () => void;
  /** Opens the 3D Armory & Pets shop (offered during play) */
  onOpenShop?: () => void;
  /** Current balance, shown next to the shop entry */
  spaceDollars?: number;
}

export const CONTROL_LIST: [string, string][] = [
  ['W A S D or arrows', 'Walk (or drive the rover)'],
  ['Click the ground', 'Walk there'],
  ['Click an object', 'Walk to it and use it'],
  ['E', 'Use / collect / open'],
  ['F', 'Scan nearby rocks'],
  ['B', 'Build'],
  ['I', 'Backpack'],
  ['R', 'Get in or out of the rover'],
  ['Q', 'Emotes'],
  ['U', 'Lab and base problems'],
  ['K', 'Science Log'],
  ['M', 'Mute'],
  ['Esc', 'Close, cancel or pause'],
];

export const ControlsTable: React.FC = () => (
  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
    {CONTROL_LIST.map(([k, v]) => (
      <React.Fragment key={k}>
        <dt>
          <kbd className="rounded bg-slate-950 border border-moon-line px-1.5 py-0.5 text-xs font-bold whitespace-nowrap">{k}</kbd>
        </dt>
        <dd className="text-slate-200">{v}</dd>
      </React.Fragment>
    ))}
  </dl>
);

const Toggle: React.FC<{ label: string; desc: string; on: boolean; onChange: (v: boolean) => void }> = ({ label, desc, on, onChange }) => (
  <button
    role="switch"
    aria-checked={on}
    onClick={() => onChange(!on)}
    className="w-full flex items-center justify-between gap-3 rounded-xl bg-moon-panel-2 border border-moon-line px-3 py-2.5 text-left"
  >
    <span>
      <span className="font-bold block">{label}</span>
      <span className="text-sm text-moon-muted">{desc}</span>
    </span>
    <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${on ? 'bg-moon-ok text-[#14201a]' : 'bg-slate-700 text-slate-300'}`}>{on ? 'On' : 'Off'}</span>
  </button>
);

export const SettingsModal: React.FC<SettingsModalProps> = (p) => {
  if (!p.isOpen) return null;
  return (
    <div className="mb-backdrop fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70" role="dialog" aria-modal="true" aria-label="Settings">
      <div className="mb-card bg-moon-panel border border-moon-line rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-3 max-h-[92vh] overflow-y-auto mb-rise">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Settings</h2>
          <button
            onClick={() => {
              sound.playClick();
              p.onClose();
            }}
            aria-label="Close (Esc)"
            className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="rounded-xl bg-moon-panel-2 border border-moon-line px-3 py-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold">Sound</span>
            <button onClick={p.onToggleMute} className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-sm font-bold">
              {p.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              {p.isMuted ? 'Muted' : 'On'}
            </button>
          </div>
          <label className="flex items-center gap-3 text-sm">
            <span className="w-16 text-moon-muted">Volume</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(p.volume * 100)}
              onChange={(e) => p.onVolume(Number(e.target.value) / 100)}
              className="flex-1 accent-[#9d8cff]"
              aria-label="Volume"
            />
            <span className="w-10 text-right">{Math.round(p.volume * 100)}%</span>
          </label>
        </div>

        {p.onOpenShop && (
          <button
            onClick={() => {
              sound.playClick();
              p.onOpenShop?.();
            }}
            className="w-full flex items-center gap-3 rounded-xl bg-moon-panel-2 hover:bg-slate-700 border border-moon-target/70 px-3 py-2.5 text-left"
          >
            <ShoppingBag className="w-5 h-5 text-moon-target shrink-0" aria-hidden />
            <span className="flex-1">
              <span className="font-bold block">3D Armory &amp; Pets</span>
              <span className="text-sm text-moon-muted">Spend SpaceDollars on astronauts, pets and emotes</span>
            </span>
            {p.spaceDollars !== undefined && <span className="shrink-0 font-bold text-moon-target">✦ {p.spaceDollars}</span>}
          </button>
        )}

        <Toggle label="Reduce motion" desc="Less camera shake, fewer particles, no confetti" on={p.reducedMotion} onChange={p.onReducedMotion} />
        <Toggle label="High contrast" desc="Brighter text and stronger outlines on menus" on={p.highContrast} onChange={p.onHighContrast} />

        {p.onReplayIntro && (
          <button onClick={p.onReplayIntro} className="w-full rounded-xl bg-moon-panel-2 hover:bg-slate-700 border border-moon-line px-3 py-2.5 text-left">
            <span className="font-bold block">Replay the intro</span>
            <span className="text-sm text-moon-muted">Practice walking and using things again. No rewards are given twice.</span>
          </button>
        )}

        <details className="rounded-xl bg-moon-panel-2 border border-moon-line px-3 py-2.5">
          <summary className="font-bold cursor-pointer">Controls</summary>
          <div className="mt-2">
            <ControlsTable />
          </div>
        </details>

        <p className="text-xs text-moon-muted">Saves stay in this browser. Use Export in the Save menu to keep a backup file.</p>
      </div>
    </div>
  );
};
