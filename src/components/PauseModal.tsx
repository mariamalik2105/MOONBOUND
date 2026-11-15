import React, { useEffect, useRef } from 'react';
import { Play, RotateCcw, Home, Save, Trophy, Settings, Keyboard } from 'lucide-react';
import { sound } from '../game/audio';

interface PauseModalProps {
  isOpen: boolean;
  /** Multiplayer keeps running underneath; say so honestly. */
  multiplayer?: boolean;
  missionName: string;
  onResume: () => void;
  onRestart: () => void;
  onSave: () => void;
  onOpenRecords?: () => void;
  onOpenSettings: () => void;
  onOpenControls: () => void;
  onExitToTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  isOpen,
  multiplayer,
  missionName,
  onResume,
  onRestart,
  onSave,
  onOpenRecords,
  onOpenSettings,
  onOpenControls,
  onExitToTitle,
}) => {
  const first = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (isOpen) first.current?.focus();
  }, [isOpen]);
  if (!isOpen) return null;

  const item = (label: string, icon: React.ReactNode, onClick: () => void, primary = false, ref?: React.Ref<HTMLButtonElement>) => (
    <button
      ref={ref}
      onClick={() => {
        sound.playClick();
        onClick();
      }}
      className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left font-bold border ${
        primary ? 'mb-btn-primary bg-moon-accent text-[#18161f] border-moon-accent' : 'mb-hud-btn bg-moon-panel-2 hover:bg-slate-700 border-moon-line'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="mb-backdrop fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70" role="dialog" aria-modal="true" aria-label="Paused">
      <div className="mb-card bg-moon-panel border border-moon-line rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-3 mb-rise">
        <div>
          <h2 className="text-2xl font-semibold">Paused</h2>
          <p className="text-sm text-moon-muted">
            {multiplayer ? 'Your crewmates keep playing while this menu is open.' : `Current mission: ${missionName}`}
          </p>
        </div>
        {item('Resume', <Play className="w-4 h-4" />, onResume, true, first)}
        {item('Save game', <Save className="w-4 h-4" />, onSave)}
        {item('Controls and help', <Keyboard className="w-4 h-4" />, onOpenControls)}
        {item('Settings', <Settings className="w-4 h-4" />, onOpenSettings)}
        {onOpenRecords && item('Mission records', <Trophy className="w-4 h-4" />, onOpenRecords)}
        {item('Restart this mission', <RotateCcw className="w-4 h-4" />, onRestart)}
        {item('Save and quit to title', <Home className="w-4 h-4" />, onExitToTitle)}
        <p className="text-xs text-moon-muted text-center">Esc to resume</p>
      </div>
    </div>
  );
};
