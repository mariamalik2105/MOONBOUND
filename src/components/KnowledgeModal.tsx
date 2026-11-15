import React, { useEffect, useState } from 'react';
import { X, ExternalLink, Lightbulb, CheckCircle2, ChevronDown, ChevronUp, Sparkles, RotateCcw } from 'lucide-react';
import { MissionKnowledgeEntry } from '../game/science';
import { sound } from '../game/audio';

interface KnowledgeModalProps {
  isOpen: boolean;
  entry: MissionKnowledgeEntry | null;
  alreadySolved?: boolean;
  onClose: () => void;
  onSolved: (
    entryId: string,
    rewardDollars: number,
    rewardResearchData: number,
    rewardResource?: { resource: string; amount: number }
  ) => void;
}

export const KnowledgeModal: React.FC<KnowledgeModalProps> = ({
  isOpen,
  entry,
  alreadySolved = false,
  onClose,
  onSolved,
}) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [showDeepDive, setShowDeepDive] = useState<boolean>(false);

  useEffect(() => {
    setSelectedOption(null);
    setSubmitted(false);
    setShowDeepDive(false);
  }, [entry?.id, isOpen]);

  if (!isOpen || !entry) return null;

  const challenge = entry.applyChallenge;
  const selectedIsCorrect = selectedOption !== null && Boolean(challenge.options[selectedOption]?.correct);

  const handleChoose = (idx: number) => {
    if (submitted) return;
    setSelectedOption(idx);
  };

  const handleSubmit = () => {
    if (selectedOption === null || submitted) return;
    setSubmitted(true);

    const chosen = challenge.options[selectedOption];
    if (chosen.correct) {
      sound.playVictory();
      onSolved(
        entry.id,
        challenge.rewardDollars,
        challenge.rewardResearchData,
        challenge.rewardResource
      );
    } else {
      sound.playFootstep();
    }
  };

  const handleRetry = () => {
    sound.playClick();
    setSubmitted(false);
    setSelectedOption(null);
  };

  return (
    <div className="mb-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 select-none overflow-y-auto">
      <div className="mb-card bg-moon-panel border border-cyan-500/50 rounded-2xl max-w-2xl w-full p-6 text-slate-100 shadow-2xl space-y-4 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-cyan-400 uppercase font-bold flex items-center space-x-2">
                <span>MISSION KNOWLEDGE · DISCOVER → UNDERSTAND → APPLY</span>
                {alreadySolved && (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded">
                    MASTERED
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-white">{entry.title}</h2>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            aria-label="Close knowledge modal"
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. DISCOVER */}
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl text-xs space-y-1">
          <div className="text-xs uppercase text-cyan-400 font-bold tracking-wide">
            1. DISCOVER · WHAT YOUR SCANNER FOUND
          </div>
          <div className="text-slate-100 text-sm leading-relaxed">{entry.discoveryPrompt}</div>
        </div>

        {/* 2. UNDERSTAND */}
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl text-xs space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase text-blue-400 font-bold tracking-wide">
            <span>2. UNDERSTAND · HOW THE MOON WORKS</span>
            <a
              href={entry.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1 text-cyan-300 hover:underline"
            >
              <span>{entry.sourceLabel}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-slate-200 text-sm leading-relaxed">{entry.understandExplanation}</p>

          <div>
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setShowDeepDive((prev) => !prev);
              }}
              className="inline-flex items-center space-x-1.5 text-xs text-cyan-300 hover:text-cyan-200 bg-cyan-950/50 border border-cyan-500/30 px-2.5 py-1 rounded-lg cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Curious Explorer: NASA Deep Dive</span>
              {showDeepDive ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showDeepDive && (
              <div className="mt-2 p-3 rounded-lg bg-slate-950/90 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                {entry.deepDiveExplanation}
              </div>
            )}
          </div>
        </div>

        {/* 3. APPLY */}
        <div className="bg-slate-950/80 border border-cyan-500/30 p-4 rounded-xl text-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs uppercase text-amber-400 font-bold tracking-wide">
              3. APPLY · SOLVE THE COLONY CHALLENGE
            </span>
            <div className="flex items-center space-x-2 text-xs">
              {!alreadySolved ? (
                <>
                  <span className="text-amber-300 font-bold">+S✦{challenge.rewardDollars}</span>
                  <span className="text-cyan-300 font-bold">+{challenge.rewardResearchData} Research</span>
                </>
              ) : (
                <span className="text-emerald-400 font-bold">Practice Review</span>
              )}
            </div>
          </div>

          <p className="font-medium text-white text-sm">{challenge.question}</p>

          <div className="space-y-2">
            {challenge.options.map((opt, idx) => {
              const isSelected = selectedOption === idx;
              return (
                <button
                  key={idx}
                  disabled={submitted}
                  onClick={() => {
                    sound.playClick();
                    handleChoose(idx);
                  }}
                  className={`w-full text-left p-3 rounded-lg border text-xs transition-all cursor-pointer ${
                    submitted && isSelected && opt.correct
                      ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200 font-medium'
                      : submitted && isSelected && !opt.correct
                      ? 'bg-red-950/70 border-red-500 text-red-200'
                      : isSelected
                      ? 'bg-cyan-950/70 border-cyan-400 text-white font-medium'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    <span className=" font-bold">{String.fromCharCode(65 + idx)}.</span>
                    <span className="leading-relaxed">{opt.text}</span>
                  </div>

                  {submitted && isSelected && (
                    <div
                      className={`mt-2 pt-2 border-t text-xs leading-relaxed ${
                        opt.correct
                          ? 'border-emerald-800 text-emerald-300'
                          : 'border-red-800 text-red-300'
                      }`}
                    >
                      {opt.feedback}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {submitted && selectedIsCorrect && (entry.unlocksBlueprint || entry.unlocksCodexId) && (
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-lg p-2.5 flex items-center space-x-2 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                Unlocked:
                {entry.unlocksBlueprint ? ` Blueprint (${entry.unlocksBlueprint.replace('_', ' ')})` : ''}
                {entry.unlocksBlueprint && entry.unlocksCodexId ? ' ·' : ''}
                {entry.unlocksCodexId ? ' Space Codex Entry' : ''}
              </span>
            </div>
          )}

          {!submitted ? (
            <div className="flex justify-end pt-1">
              <button
                disabled={selectedOption === null}
                onClick={handleSubmit}
                className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                  selectedOption !== null
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                Check My Answer
              </button>
            </div>
          ) : !selectedIsCorrect ? (
            <div className="flex justify-end space-x-2 pt-1">
              <button
                onClick={handleRetry}
                className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Try Another Answer</span>
              </button>
            </div>
          ) : (
            <div className="flex justify-end pt-1">
              <button
                onClick={() => {
                  sound.playClick();
                  onClose();
                }}
                className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold px-5 py-2 rounded-lg text-xs cursor-pointer"
              >
                Continue Mission
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
