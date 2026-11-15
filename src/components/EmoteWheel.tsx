import React from 'react';
import { X } from 'lucide-react';
import { EMOTES } from '../game/economy';
import { sound } from '../game/audio';

interface EmoteWheelProps {
  isOpen: boolean;
  onClose: () => void;
  unlockedEmotes: string[];
  onSelectEmote: (icon: string) => void;
}

export const EmoteWheel: React.FC<EmoteWheelProps> = ({
  isOpen,
  onClose,
  unlockedEmotes,
  onSelectEmote,
}) => {
  if (!isOpen) return null;

  return (
    <div className="mb-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 select-none">
      <div className="mb-card bg-moon-panel border border-cyan-500/40 rounded-2xl max-w-sm w-full p-5 text-slate-100 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <span className="text-xs uppercase text-cyan-400 font-bold">
            Emotes (Q)
          </span>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2.5">
          {unlockedEmotes.map((id) => {
            const def = EMOTES[id];
            if (!def) return null;
            return (
              <button
                key={id}
                onClick={() => {
                  onSelectEmote(def.icon);
                  onClose();
                }}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-400 hover:bg-slate-800 transition-all cursor-pointer"
                title={def.name}
              >
                <span className="text-2xl">{def.icon}</span>
                <span className="text-xs text-slate-400 mt-1 line-clamp-1">
                  {def.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
