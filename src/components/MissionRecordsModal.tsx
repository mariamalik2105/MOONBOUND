import React, { useState } from 'react';
import {
  X,
  Trophy,
  Activity,
  Timer,
  Compass,
  Car,
  Package,
  Hammer,
  Radio,
  Lightbulb,
  Award,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { MissionRecordsData } from '../game/saveSystem';
import { MOONBOUND_PHASES } from '../game/phases';
import { sound } from '../game/audio';

interface MissionRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: MissionRecordsData;
  daysSurvived: number;
}

export const MissionRecordsModal: React.FC<MissionRecordsModalProps> = ({
  isOpen,
  onClose,
  records,
  daysSurvived,
}) => {
  const [activeTab, setActiveTab] = useState<'telemetry' | 'leaderboard' | 'milestones'>('telemetry');

  if (!isOpen) return null;

  const totalDistance = (records.totalDistanceOnFoot || 0) + (records.totalDistanceInRover || 0);
  const footPct = totalDistance > 0 ? ((records.totalDistanceOnFoot || 0) / totalDistance) * 100 : 100;
  const roverPct = totalDistance > 0 ? ((records.totalDistanceInRover || 0) / totalDistance) * 100 : 0;

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  const formatSeconds = (sec: number | null | undefined) => {
    if (sec === null || sec === undefined) return '—';
    if (sec < 60) return `${sec.toFixed(1)}s`;
    const mins = Math.floor(sec / 60);
    const rem = (sec % 60).toFixed(1);
    return `${mins}m ${rem}s`;
  };

  const milestones = [
    {
      id: 'footprint',
      title: 'First Footprint',
      desc: 'Traverse your first 50 meters on the lunar surface.',
      achieved: (records.totalDistanceOnFoot || 0) >= 50,
      icon: '👣',
    },
    {
      id: 'rover_ranger',
      title: 'Rover Ranger',
      desc: 'Drive the Lunar Exploration Rover over 250 meters.',
      achieved: (records.totalDistanceInRover || 0) >= 250,
      icon: '🏎️',
    },
    {
      id: 'harvester',
      title: 'Regolith Harvester',
      desc: 'Harvest at least 25 lunar resource units.',
      achieved: (records.totalResourcesHarvested || 0) >= 25,
      icon: '⛏️',
    },
    {
      id: 'architect',
      title: 'Colony Architect',
      desc: 'Fabricate 3 or more life-support structures on the Moon.',
      achieved: (records.totalStructuresFabricated || 0) >= 3,
      icon: '🏗️',
    },
    {
      id: 'science_scout',
      title: 'NASA Science Scout',
      desc: 'Complete 2 or more Mission Knowledge engineering challenges.',
      achieved: (records.totalChallengesSolved || 0) >= 2,
      icon: '🔭',
    },
    {
      id: 'speed_record',
      title: 'Orbital Speed Demon',
      desc: 'Complete any phase faster than the game’s target time.',
      achieved: Object.entries(records.phaseCompletionTimes || {}).some(
        ([idx, time]) => {
          const benchmark = records.phaseLeaderboard[Number(idx)]?.benchmarkRecordSeconds || 999;
          return time <= benchmark;
        }
      ),
      icon: '⚡',
    },
  ];

  return (
    <div className="mb-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 select-none">
      <div className="mb-card bg-moon-panel border border-cyan-500/40 rounded-2xl max-w-4xl w-full max-h-[88vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-moon-panel">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">
                MISSION RECORDS & FLIGHT TELEMETRY
              </h2>
              <p className="text-xs text-slate-400">
                YOUR EXPEDITION STATS · PERSONAL BESTS · GAME TARGET TIMES
              </p>
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

        {/* Tab Strip */}
        <div className="flex items-center space-x-2 px-5 py-3 border-b border-slate-800 bg-slate-900/60 text-xs">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('telemetry');
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === 'telemetry'
                ? 'bg-cyan-600 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Expedition Telemetry</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('leaderboard');
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === 'leaderboard'
                ? 'bg-cyan-600 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Timer className="w-4 h-4" />
            <span>Phase Speedrun Leaderboard</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('milestones');
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === 'milestones'
                ? 'bg-cyan-600 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Achievements & Badges</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* TAB 1: EXPEDITION TELEMETRY */}
          {activeTab === 'telemetry' && (
            <div className="space-y-6">
              {/* Distance Traveled Hero Card */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold uppercase">
                    <Compass className="w-4 h-4" />
                    <span>Total Surface Distance Traveled</span>
                  </div>
                  <span className="text-xl font-bold text-white tabular-nums">
                    {formatDistance(totalDistance)}
                  </span>
                </div>

                {/* Progress bar split */}
                <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden flex border border-slate-800">
                  <div
                    style={{ width: `${footPct}%` }}
                    className="bg-cyan-500 h-full transition-all duration-300"
                    title={`On Foot: ${formatDistance(records.totalDistanceOnFoot || 0)}`}
                  />
                  <div
                    style={{ width: `${roverPct}%` }}
                    className="bg-amber-500 h-full transition-all duration-300"
                    title={`In Rover: ${formatDistance(records.totalDistanceInRover || 0)}`}
                  />
                </div>

                <div className="flex items-center justify-between text-xs mt-3 text-slate-400">
                  <span className="flex items-center space-x-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                    <span>Astronaut EVA (Foot): <b className="text-white tabular-nums">{formatDistance(records.totalDistanceOnFoot || 0)}</b></span>
                  </span>
                  <span className="flex items-center space-x-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span>Rover Exploration: <b className="text-white tabular-nums">{formatDistance(records.totalDistanceInRover || 0)}</b></span>
                  </span>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
                  <div className="text-xs text-slate-400 uppercase flex items-center space-x-1.5">
                    <Package className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Resources Harvested</span>
                  </div>
                  <div className="text-2xl font-bold text-emerald-400 mt-2 tabular-nums">
                    {records.totalResourcesHarvested || 0}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Cumulative units mined</div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
                  <div className="text-xs text-slate-400 uppercase flex items-center space-x-1.5">
                    <Hammer className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Structures Built</span>
                  </div>
                  <div className="text-2xl font-bold text-cyan-400 mt-2 tabular-nums">
                    {records.totalStructuresFabricated || 0}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Base modules deployed</div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
                  <div className="text-xs text-slate-400 uppercase flex items-center space-x-1.5">
                    <Radio className="w-3.5 h-3.5 text-blue-400" />
                    <span>Features Scanned</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-400 mt-2 tabular-nums">
                    {records.totalDiscoveriesScanned || 0}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Crater & rock surveys</div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
                  <div className="text-xs text-slate-400 uppercase flex items-center space-x-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                    <span>Science Challenges</span>
                  </div>
                  <div className="text-2xl font-bold text-amber-400 mt-2 tabular-nums">
                    {records.totalChallengesSolved || 0}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Mission Knowledge solved</div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
                  <div className="text-xs text-slate-400 uppercase flex items-center space-x-1.5">
                    <span className="text-amber-400 font-bold">S✦</span>
                    <span>Total S✦ Earned</span>
                  </div>
                  <div className="text-2xl font-bold text-amber-400 mt-2 tabular-nums">
                    S✦{records.totalSpaceDollarsEarned || 150}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Gross SpaceDollars</div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
                  <div className="text-xs text-slate-400 uppercase flex items-center space-x-1.5">
                    <Zap className="w-3.5 h-3.5 text-purple-400" />
                    <span>Mission Time</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-400 mt-2 tabular-nums">
                    Sol {daysSurvived || 1}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Days on lunar surface</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PHASE SPEEDRUN LEADERBOARD */}
          {activeTab === 'leaderboard' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between text-slate-400 text-xs pb-2 border-b border-slate-800">
                <span>Phase / Objective</span>
                <div className="flex items-center space-x-6 text-right">
                  <span className="w-24">Personal Best</span>
                  <span className="w-24">Target Time</span>
                  <span className="w-20">Rank / Medal</span>
                </div>
              </div>

              <div className="space-y-2">
                {MOONBOUND_PHASES.map((phaseDef, idx) => {
                  const personalTime = records.phaseCompletionTimes?.[idx] ?? null;
                  const benchTime = records.phaseLeaderboard[idx]?.benchmarkRecordSeconds || 60;
                  const isBeaten = personalTime !== null && personalTime <= benchTime;
                  const isCompleted = personalTime !== null;

                  let medal = '—';
                  let rankClass = 'text-slate-500';

                  if (isCompleted) {
                    if (personalTime <= benchTime * 0.8) {
                      medal = '🥇 1st Gold';
                      rankClass = 'text-amber-300 font-bold';
                    } else if (personalTime <= benchTime) {
                      medal = '🥈 2nd Silver';
                      rankClass = 'text-slate-200 font-bold';
                    } else if (personalTime <= benchTime * 1.3) {
                      medal = '🥉 3rd Bronze';
                      rankClass = 'text-amber-600 font-bold';
                    } else {
                      medal = '🎖️ Qualified';
                      rankClass = 'text-cyan-400';
                    }
                  }

                  return (
                    <div
                      key={phaseDef.id}
                      className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                        isCompleted
                          ? 'bg-slate-900/90 border-slate-800'
                          : 'bg-slate-950/40 border-slate-900 opacity-60'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center text-xs">
                          {phaseDef.letter}
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs">{phaseDef.name}</div>
                          <div className="text-xs text-slate-400 line-clamp-1">{phaseDef.subTitle}</div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-6 text-right">
                        <span className={`w-24 font-bold tabular-nums ${isCompleted ? 'text-white' : 'text-slate-600'}`}>
                          {formatSeconds(personalTime)}
                        </span>

                        <span className="w-24 text-slate-400 tabular-nums">
                          {formatSeconds(benchTime)}
                        </span>

                        <span className={`w-20 ${rankClass}`}>
                          {medal}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: ACHIEVEMENTS & BADGES */}
          {activeTab === 'milestones' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {milestones.map((m) => (
                <div
                  key={m.id}
                  className={`p-4 rounded-xl border flex items-start space-x-3.5 transition-all ${
                    m.achieved
                      ? 'bg-emerald-950/30 border-emerald-500/50 shadow-md'
                      : 'bg-slate-900/40 border-slate-800/80 opacity-60'
                  }`}
                >
                  <div className="text-3xl">{m.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white">{m.title}</span>
                      {m.achieved && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{m.desc}</p>
                    <div className="mt-2 text-xs font-bold">
                      {m.achieved ? (
                        <span className="text-emerald-400">STATUS: UNLOCKED</span>
                      ) : (
                        <span className="text-slate-500">STATUS: INCOMPLETE</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
