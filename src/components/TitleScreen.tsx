import React from 'react';
import { Play, RotateCcw, Users, BookOpen, ShoppingBag, Trophy, Satellite, Settings as SettingsIcon } from 'lucide-react';
import { sound } from '../game/audio';

interface TitleScreenProps {
  hasExistingSave: boolean;
  onNewGame: () => void;
  onContinue: () => void;
  onOpenShop: () => void;
  onOpenCodex: () => void;
  onOpenRecords: () => void;
  onOpenMultiplayer: () => void;
  onOpenSettings: () => void;
  onOpenNasaData?: () => void;
}

/** Decorative starfield: [left %, top %, size px, twinkle delay s] */
const STARS: [number, number, number, number][] = [
  [6, 17, 2, 0.1], [12, 8, 1, 1.4], [18, 25, 2, 0.7], [24, 13, 1, 2.2], [30, 7, 1, 1.1],
  [36, 21, 2, 2.8], [43, 11, 1, 0.4], [49, 28, 1, 1.8], [55, 8, 2, 2.5], [61, 18, 1, 0.8],
  [69, 7, 1, 1.6], [75, 26, 2, 0.2], [82, 13, 1, 2.1], [89, 23, 2, 1.2], [95, 8, 1, 2.9],
  [9, 43, 1, 1.9], [17, 57, 2, 0.4], [27, 45, 1, 2.4], [34, 64, 1, 1], [42, 51, 2, 1.5],
  [51, 68, 1, 0.3], [60, 45, 2, 2.7], [68, 61, 1, 1.1], [78, 49, 1, 2.2], [86, 66, 2, 0.6],
  [94, 46, 1, 1.7], [14, 76, 1, 2.6], [38, 75, 1, 1.3], [72, 78, 1, 2], [91, 83, 2, 1.4],
];

export const TitleScreen: React.FC<TitleScreenProps> = ({
  hasExistingSave,
  onNewGame,
  onContinue,
  onOpenShop,
  onOpenCodex,
  onOpenRecords,
  onOpenMultiplayer,
  onOpenSettings,
  onOpenNasaData,
}) => {
  return (
    <div className="mb-title relative w-full h-full flex flex-col justify-between p-8 sm:p-12 overflow-hidden select-none text-slate-100">
      {/* Decorative backdrop: starfield, planets, Earth, Moon and lunar surface */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="mb-title-rings" />
        <div className="mb-title-glow" />
        <div className="mb-stars">
          {STARS.map(([left, top, size, delay], i) => (
            <i key={i} style={{ left: `${left}%`, top: `${top}%`, width: size + 1, height: size + 1, animationDelay: `${delay}s` }} />
          ))}
          <span className="mb-spark mb-spark-1">✦</span>
          <span className="mb-spark mb-spark-2">✦</span>
          <span className="mb-spark mb-spark-3">✦</span>
        </div>

        <div className="mb-planet mb-sun-planet">
          <div className="mb-planet-body">
            <span className="mb-planet-stripe mb-stripe-1" />
            <span className="mb-planet-stripe mb-stripe-2" />
            <span className="mb-planet-stripe mb-stripe-3" />
          </div>
        </div>
        <div className="mb-planet mb-blue-planet">
          <div className="mb-planet-body" />
        </div>

        {/* Large Moon backdrop */}
        <div className="mb-big-moon">
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="mb-earth">
          <span />
          <i />
        </div>
        <div className="mb-planet mb-ringed-planet">
          <div className="mb-planet-body">
            <span className="mb-planet-stripe mb-stripe-1" />
            <span className="mb-planet-stripe mb-stripe-2" />
          </div>
          <div className="mb-planet-ring" />
        </div>

        <div className="mb-moon-surface">
          <div className="mb-horizon mb-horizon-1" />
          <div className="mb-horizon mb-horizon-2" />
          <div className="mb-crater mb-crater-1" />
          <div className="mb-crater mb-crater-2" />
          <div className="mb-lunar-base" />
          <div className="mb-flag" />
        </div>
      </div>

      {/* Top Header: NASA Space Apps Challenge Badge */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="mb-label-pill flex items-center space-x-3 px-4 py-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#ffd44f]" />
          <span className=" text-xs text-white uppercase">
            NASA International Space Apps Challenge · Artemis Class
          </span>
        </div>
        <div className=" text-xs font-extrabold tracking-wider text-cyan-300">MISSION CLOCK: NOMINAL</div>
      </div>

      {/* Center Left: Bespoke Inline SVG Title Lockup */}
      <div className="relative z-10 max-w-xl my-auto space-y-6">
        <div>
          <svg className="mb-title-logo w-full max-w-[480px] h-auto" viewBox="0 0 520 100" fill="none">
            {/* Bold rounded logo lettering */}
            <text
              x="0"
              y="72"
              fill="#ffffff"
              fontFamily="'Baloo 2', Nunito, system-ui, sans-serif"
              fontWeight="800"
              fontSize="74"
              letterSpacing="3"
              textLength="508"
              lengthAdjust="spacingAndGlyphs"
            >
              MOON<tspan fill="#e93fd1">BOUND</tspan>
            </text>
            {/* Orbital ring accent */}
            <path
              d="M 12 88 Q 260 98 508 88"
              stroke="#8ceaff"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx="420" cy="90" r="6" fill="#ffd44f" />
          </svg>
          <p className="mb-label-pill inline-block text-white text-xs sm:text-sm uppercase mt-3 px-3 py-0.5">
            One Moon. Nine Phases. One Mission: Make It Home.
          </p>
        </div>

        <p className="mb-title-intro text-sm sm:text-base leading-relaxed">
          Build a Moon base where every choice has a cost. Real solar storms recorded by NASA will hit
          your crew: hide and lose work time, spend Moon dirt on shielding, or keep working and take
          the radiation. Can you keep your astronauts safe and make it home?
        </p>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {hasExistingSave && (
            <button
              onClick={() => {
                sound.playClick();
                onContinue();
              }}
              className="mb-btn-ledge flex items-center justify-center space-x-2 bg-emerald-600 border-emerald-300 text-white px-6 py-3.5"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Resume Expedition</span>
            </button>
          )}

          <button
            data-start="true"
            onClick={() => {
              sound.playClick();
              onNewGame();
            }}
            className="mb-btn-primary mb-glow flex items-center justify-center space-x-2 text-lg px-7 py-3 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Launch Mission (Space / Enter)</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onOpenMultiplayer();
            }}
            className="mb-btn-ledge flex items-center justify-center space-x-2 bg-gradient-to-b from-[#325491] to-[#18265f] border-[#8cccf4] text-white px-5 py-3.5"
          >
            <Users className="w-5 h-5 text-cyan-400" />
            <span>Co-op Crew</span>
          </button>
        </div>

        {/* Secondary Navigation Strip */}
        <div className="mb-title-rule flex flex-wrap items-center gap-3 pt-4 border-t">
          <button
            onClick={() => {
              sound.playClick();
              onOpenShop();
            }}
            className="mb-pill flex items-center space-x-1.5 px-3.5 py-2 text-xs uppercase"
          >
            <ShoppingBag className="w-4 h-4 text-amber-400" />
            <span>3D Armory & Pets</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onOpenCodex();
            }}
            className="mb-pill flex items-center space-x-1.5 px-3.5 py-2 text-xs uppercase"
          >
            <BookOpen className="w-4 h-4 text-blue-400" />
            <span>Space Codex</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onOpenRecords();
            }}
            className="mb-pill flex items-center space-x-1.5 px-3.5 py-2 text-xs uppercase"
          >
            <Trophy className="w-4 h-4 text-emerald-400" />
            <span>Mission Records</span>
          </button>

          {onOpenNasaData && (
            <button
              data-testid="open-nasa-data"
              onClick={() => {
                sound.playClick();
                onOpenNasaData();
              }}
              className="mb-pill flex items-center space-x-1.5 px-3.5 py-2 text-xs uppercase"
            >
              <Satellite className="w-4 h-4 text-cyan-300" />
              <span>NASA Data Used</span>
            </button>
          )}

          <button
            onClick={() => {
              sound.playClick();
              onOpenSettings();
            }}
            className="mb-pill flex items-center space-x-1.5 px-3.5 py-2 text-xs uppercase"
          >
            <SettingsIcon className="w-4 h-4 text-slate-400" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Bottom Safe Margin: Single Flat Control-Hint Line */}
      <div className="mb-title-foot relative z-10 text-center sm:text-left text-xs font-bold pt-4">
        Move: W A S D, arrows or click · Use: E · Scan: F · Build: B · Backpack: I · Rover: R · Pause: Esc
      </div>
    </div>
  );
};
