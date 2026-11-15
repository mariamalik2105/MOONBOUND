import React, { useState } from 'react';
import { X, BookOpen, Search, ExternalLink, Sparkles, ChevronDown, ChevronUp, Lock, CheckCircle2 } from 'lucide-react';
import { SPACE_CODEX } from '../game/science';
import { sound } from '../game/audio';

interface CodexModalProps {
  isOpen: boolean;
  onClose: () => void;
  unlockedCodexIds?: string[];
}

export const CodexModal: React.FC<CodexModalProps> = ({ isOpen, onClose, unlockedCodexIds }) => {
  const [search, setSearch] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState(SPACE_CODEX[0]?.id);
  const [showDeepDive, setShowDeepDive] = useState(false);

  if (!isOpen) return null;

  const isUnlocked = (id: string, starterUnlocked?: boolean) => {
    if (!unlockedCodexIds) return true; // Title Screen preview lets kids explore freely
    return Boolean(starterUnlocked) || unlockedCodexIds.includes(id);
  };

  const unlockedCount = SPACE_CODEX.filter((c) => isUnlocked(c.id, c.starterUnlocked)).length;

  const filtered = SPACE_CODEX.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase()) ||
      c.shortSummary.toLowerCase().includes(search.toLowerCase())
  );

  const selectedEntry = SPACE_CODEX.find((c) => c.id === selectedEntryId) || SPACE_CODEX[0];
  const selectedUnlocked = selectedEntry ? isUnlocked(selectedEntry.id, selectedEntry.starterUnlocked) : true;

  return (
    <div className="mb-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 select-none">
      <div className="mb-card bg-moon-panel border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[88vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-moon-panel">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold tracking-tight text-white">SPACE CODEX ARCHIVE</h2>
                <span className="text-xs bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded">
                  {unlockedCount}/{SPACE_CODEX.length} TOPICS
                </span>
              </div>
              <p className="text-xs text-slate-400">
                KID-FRIENDLY LUNAR SCIENCE & NASA FIELD NOTES (AGES 7–12)
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            aria-label="Close Space Codex"
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center space-x-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search 12 lunar science topics: gravity, phases, water ice, tardigrades..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-xs text-white placeholder-slate-500 w-full outline-none"
          />
        </div>

        {/* 2-column layout */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Index List */}
          <div className="md:col-span-5 border-r border-slate-800 overflow-y-auto p-3 space-y-2 bg-slate-950/40">
            {filtered.map((item) => {
              const isSelected = item.id === selectedEntryId;
              const unlocked = isUnlocked(item.id, item.starterUnlocked);
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    sound.playClick();
                    setSelectedEntryId(item.id);
                    setShowDeepDive(false);
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-950/50 border-blue-400 text-white shadow'
                      : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-cyan-400 uppercase">
                      {item.category}
                    </span>
                    {unlocked ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                  </div>
                  <div className="font-bold text-sm mt-0.5">{item.title}</div>
                  <div className="text-xs text-slate-400 mt-1 line-clamp-1">{item.shortSummary}</div>
                </div>
              );
            })}
          </div>

          {/* Detailed Reader */}
          <div className="md:col-span-7 p-6 overflow-y-auto space-y-4">
            {selectedEntry ? (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs uppercase text-blue-400 font-bold bg-blue-500/10 px-2.5 py-1 rounded border border-blue-500/20">
                      {selectedEntry.category}
                    </span>
                    <h3 className="text-xl font-bold text-white mt-3">{selectedEntry.title}</h3>
                    <p className="text-xs text-cyan-300 mt-1">{selectedEntry.shortSummary}</p>
                  </div>
                </div>

                {!selectedUnlocked && (
                  <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3 text-xs text-amber-200 flex items-center space-x-2">
                    <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      Field Badge Locked: Scan glowing rocks, ice, or equipment on the Moon with [F] to log this discovery!
                    </span>
                  </div>
                )}

                <div className="text-sm text-slate-200 leading-relaxed space-y-3 pt-1">
                  <p>{selectedEntry.kidFriendlyText}</p>
                </div>

                {/* Expandable Curious Explorer NASA Deep Dive */}
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setShowDeepDive((prev) => !prev);
                    }}
                    className="inline-flex items-center space-x-1.5 text-xs text-cyan-300 hover:text-cyan-200 bg-cyan-950/50 border border-cyan-500/30 px-3 py-1.5 rounded-lg cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Curious Explorer: NASA Deep Dive</span>
                    {showDeepDive ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {showDeepDive && (
                    <div className="mt-2.5 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                      {selectedEntry.detailedText}
                    </div>
                  )}
                </div>

                {/* NASA Historical Fact Callout */}
                <div className="bg-slate-900/90 border-l-4 border-cyan-400 p-4 rounded-r-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase text-cyan-400 font-bold">
                      NASA Mission Field Note
                    </span>
                    <a
                      href={selectedEntry.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-cyan-300 hover:underline inline-flex items-center space-x-1"
                    >
                      <span>{selectedEntry.sourceLabel}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-xs text-slate-200 italic leading-relaxed">
                    “{selectedEntry.nasaFact}”
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center text-slate-500 text-xs my-auto">Select a topic from the archive.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
