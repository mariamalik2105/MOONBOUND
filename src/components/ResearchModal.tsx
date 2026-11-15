import React, { useEffect, useState } from 'react';
import { X, FlaskConical, AlertTriangle, CheckCircle2, Zap, Lock } from 'lucide-react';
import { RESEARCH_NODES, ResearchNode } from '../game/science';
import { ColonyEvent } from '../game/simulation';
import { sound } from '../game/audio';

interface ResearchModalProps {
  isOpen: boolean;
  initialTab?: 'research' | 'alerts';
  onClose: () => void;
  researchData: number;
  researchedNodeIds: string[];
  unlockedBlueprints: string[];
  activeEvents: ColonyEvent[];
  powerSaverMode: boolean;
  onUnlockResearch: (node: ResearchNode) => void;
  onSolveProblem: (eventId: string, solutionId: string) => { solved: boolean; feedback: string };
  onTogglePowerSaver: () => void;
}

export const ResearchModal: React.FC<ResearchModalProps> = ({
  isOpen,
  initialTab = 'research',
  onClose,
  researchData,
  researchedNodeIds,
  activeEvents,
  powerSaverMode,
  onUnlockResearch,
  onSolveProblem,
  onTogglePowerSaver,
}) => {
  const [tab, setTab] = useState<'research' | 'alerts'>(initialTab);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, { ok: boolean; msg: string }>>({});

  useEffect(() => {
    if (isOpen) {
      setTab(activeEvents.length > 0 && initialTab === 'alerts' ? 'alerts' : initialTab);
    }
  }, [isOpen, initialTab, activeEvents.length]);

  if (!isOpen) return null;

  return (
    <div className="mb-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 select-none">
      <div className="mb-card bg-moon-panel border border-cyan-500/40 rounded-2xl max-w-4xl w-full max-h-[88vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-moon-panel">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">
                LUNAR SCIENCE LAB & COLONY ALERTS
              </h2>
              <p className="text-xs text-slate-400">
                RESEARCH DATA: <span className="text-cyan-400 font-bold">{researchData} DATA</span> · SCAN ROCKS [F] TO EARN MORE
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            aria-label="Close Research Lab"
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/50 text-xs">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                sound.playClick();
                setTab('research');
              }}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                tab === 'research'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Research Tree ({researchedNodeIds.length}/{RESEARCH_NODES.length})
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setTab('alerts');
              }}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer ${
                tab === 'alerts'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Colony Alerts ({activeEvents.length})</span>
            </button>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onTogglePowerSaver();
            }}
            className={`px-3 py-1.5 rounded-lg border flex items-center space-x-1.5 cursor-pointer ${
              powerSaverMode
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Power Saver: {powerSaverMode ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {tab === 'research' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {RESEARCH_NODES.map((node) => {
                const isDone = researchedNodeIds.includes(node.id);
                const canAfford = researchData >= node.costResearchData;
                return (
                  <div
                    key={node.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 ${
                      isDone
                        ? 'bg-emerald-950/30 border-emerald-500/50'
                        : 'bg-slate-900/80 border-slate-700'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs uppercase text-cyan-400 font-bold">
                            {node.category.replace('_', ' ')}
                          </div>
                          <h3 className="font-bold text-sm text-white">{node.name}</h3>
                        </div>
                        <span className="text-xs font-bold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30 shrink-0">
                          {node.costResearchData} DATA
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{node.summary}</p>
                      <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 text-xs text-cyan-200">
                        <b>Science Clue:</b> {node.scienceTakeaway}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <span className="text-xs text-emerald-300">{node.bonusEffect}</span>
                      {isDone ? (
                        <span className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Researched</span>
                        </span>
                      ) : (
                        <button
                          disabled={!canAfford}
                          onClick={() => {
                            sound.playVictory();
                            onUnlockResearch(node);
                          }}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold ${
                            canAfford
                              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {canAfford ? (
                            'Unlock Tech'
                          ) : (
                            <span className="inline-flex items-center space-x-1">
                              <Lock className="w-3 h-3" />
                              <span>Need {node.costResearchData} Data</span>
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : activeEvents.length === 0 ? (
            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-6 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <div className=" font-bold text-white text-sm">All Colony Systems Healthy!</div>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                No active emergencies right now. If battery power runs low or Moon dust coats your solar panels, science alerts will appear here so you can solve them!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeEvents.map((ev) => {
                const fb = feedbackMap[ev.id];
                return (
                  <div
                    key={ev.id}
                    className="bg-slate-900/90 border border-amber-500/50 rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs uppercase text-amber-400 font-bold">
                          COLONY SCIENCE PROBLEM · REWARD +S✦{ev.rewardDollars}
                        </span>
                        <h3 className="font-bold text-base text-white">{ev.title}</h3>
                        <p className="text-xs text-slate-300 mt-1">{ev.description}</p>
                      </div>
                    </div>

                    <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-lg p-3 text-xs text-cyan-100 leading-relaxed">
                      <b>Understand Why:</b> {ev.scienceExplanation}
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs uppercase text-slate-400 font-bold">
                        Apply Your Engineering Solution:
                      </div>
                      {ev.solutions.map((sol) => (
                        <button
                          key={sol.id}
                          onClick={() => {
                            const res = onSolveProblem(ev.id, sol.id);
                            if (res.solved) sound.playVictory();
                            else sound.playFootstep();
                            setFeedbackMap((prev) => ({
                              ...prev,
                              [ev.id]: { ok: res.solved, msg: res.feedback },
                            }));
                          }}
                          className="w-full text-left p-3 rounded-lg bg-slate-950 border border-slate-700 hover:border-cyan-400 text-xs text-slate-200 transition-all cursor-pointer"
                        >
                          {sol.label}
                        </button>
                      ))}
                    </div>

                    {fb && (
                      <div
                        className={`p-2.5 rounded-lg text-xs border ${
                          fb.ok
                            ? 'bg-emerald-950/50 border-emerald-500 text-emerald-200'
                            : 'bg-red-950/50 border-red-500 text-red-200'
                        }`}
                      >
                        {fb.msg}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
