import React, { useState, useEffect } from 'react';
import { X, Save, Download, Upload, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
import { GameSaveData, listAllSaves, exportSaveToJson, importSaveFromJson } from '../game/saveSystem';
import { sound } from '../game/audio';

interface SaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSave: GameSaveData;
  onLoadSave: (save: GameSaveData) => void;
  onSaveToSlot: (slotId: string, name: string) => void;
}

export const SaveModal: React.FC<SaveModalProps> = ({
  isOpen,
  onClose,
  currentSave,
  onLoadSave,
  onSaveToSlot,
}) => {
  const [saves, setSaves] = useState<GameSaveData[]>([]);
  const [importStatus, setImportStatus] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      listAllSaves().then(setSaves);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const defaultSlots = ['slot_1', 'slot_2', 'slot_3'];

  const handleExport = (save: GameSaveData) => {
    const jsonStr = exportSaveToJson(save);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moonbound_${save.slotId}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    sound.playVictory();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const res = importSaveFromJson(content);
      if (res.success && res.data) {
        sound.playVictory();
        onLoadSave(res.data);
        setImportStatus('Save loaded successfully!');
        setTimeout(() => onClose(), 1200);
      } else {
        setImportStatus(`Import Error: ${res.error}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="mb-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 select-none">
      <div className="mb-card bg-moon-panel border border-slate-700 rounded-2xl max-w-3xl w-full p-6 text-slate-100 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Save className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">MISSION SAVE & FLIGHT LOGS</h2>
              <p className="text-xs text-slate-400">INDEXEDDB PERSISTENT STORAGE · JSON BACKUPS</p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Campaign Slots */}
        <div className="space-y-3">
          {defaultSlots.map((slotId, idx) => {
            const existing = saves.find((s) => s.slotId === slotId);
            return (
              <div
                key={slotId}
                className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className=" font-bold text-sm text-cyan-400">SLOT {idx + 1}</span>
                    <span className="text-xs text-slate-400">
                      {existing ? existing.campaignName : 'Empty Memory Slot'}
                    </span>
                  </div>

                  {existing ? (
                    <div className="text-xs text-slate-400 mt-1 flex items-center space-x-3">
                      <span>Phase: {existing.phases[existing.currentPhaseIndex]?.letter || 'M'}</span>
                      <span>·</span>
                      <span className="text-amber-400 font-bold">S✦{existing.spaceDollars}</span>
                      <span>·</span>
                      <span className="flex items-center space-x-1 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(existing.timestamp).toLocaleTimeString()}</span>
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 mt-1">Available for new mission data</div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      sound.playBuild();
                      onSaveToSlot(slotId, `Artemis-${idx + 1}`);
                      listAllSaves().then(setSaves);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                  >
                    Save Slot
                  </button>

                  {existing && (
                    <>
                      <button
                        onClick={() => {
                          sound.playClick();
                          onLoadSave(existing);
                          onClose();
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold"
                      >
                        Load
                      </button>

                      <button
                        onClick={() => handleExport(existing)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                        title="Export JSON Backup"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* JSON Backup Export & Import */}
        <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 cursor-pointer">
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>Import Save (.JSON)</span>
              <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
            </label>
            {importStatus && <span className="text-amber-400 text-xs">{importStatus}</span>}
          </div>

          <button
            onClick={() => handleExport(currentSave)}
            className="flex items-center space-x-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Current State</span>
          </button>
        </div>
      </div>
    </div>
  );
};
