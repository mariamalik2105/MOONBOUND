import React, { useState } from 'react';
import { X, Hammer, Zap, Wind, Droplets, Shield, Cpu, Lock } from 'lucide-react';
import { BUILDING_RECIPES, canAffordBuilding } from '../game/economy';
import { sound } from '../game/audio';

interface BuildModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: Record<string, number>;
  spaceDollars: number;
  avatarId: string;
  unlockedBlueprints: string[];
  onSelectBuildingToPlace: (recipeId: string) => void;
}

export const BuildModal: React.FC<BuildModalProps> = ({
  isOpen,
  onClose,
  inventory,
  spaceDollars,
  avatarId,
  unlockedBlueprints,
  onSelectBuildingToPlace,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'All Structures' },
    { id: 'power', label: 'Power & Energy' },
    { id: 'life_support', label: 'Life Support' },
    { id: 'infrastructure', label: 'Infrastructure' },
    { id: 'science', label: 'Science & Refining' },
  ];

  const recipes = Object.values(BUILDING_RECIPES).filter((r) => {
    if (activeCategory === 'all') return true;
    return r.category === activeCategory;
  });

  return (
    <div className="mb-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 select-none">
      <div className="mb-card bg-moon-panel border border-slate-700/80 rounded-2xl max-w-4xl w-full max-h-[88vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-moon-panel">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Hammer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">
                COLONY CONSTRUCTION & FABRICATION
              </h2>
              <p className="text-xs text-slate-400">
                BALANCE: <span className="text-amber-400 font-bold">S✦{spaceDollars}</span> · REGOLITH 3D-PRINTING PROTOCOL
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

        {/* Category Tabs */}
        <div className="flex items-center space-x-2 px-5 py-3 border-b border-slate-800 bg-slate-900/50 overflow-x-auto text-xs">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                sound.playClick();
                setActiveCategory(cat.id);
              }}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? 'bg-cyan-600 text-slate-950 font-bold shadow'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Recipe Grid */}
        <div className="p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {recipes.map((recipe) => {
            const isUnlocked = unlockedBlueprints.includes(recipe.id);
            const affordCheck = canAffordBuilding(inventory, spaceDollars, recipe.id, avatarId);

            return (
              <div
                key={recipe.id}
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                  !isUnlocked
                    ? 'bg-slate-950/60 border-slate-800/60 opacity-60'
                    : affordCheck.canAfford
                    ? 'bg-slate-900/90 border-slate-700 hover:border-cyan-500/80 shadow-lg'
                    : 'bg-slate-900/50 border-slate-800/80'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-white flex items-center space-x-2">
                        <span>{recipe.name}</span>
                        {!isUnlocked && <Lock className="w-3.5 h-3.5 text-amber-500" />}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {recipe.description}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-amber-400 font-bold text-sm">
                        S✦{affordCheck.finalCost}
                      </div>
                      {avatarId === 'engineer' && (
                        <div className="text-xs text-emerald-400 font-bold">10% ENG DISC</div>
                      )}
                      {avatarId === 'medic' && (
                        <div className="text-xs text-orange-300 font-bold">+10% MEDIC COST</div>
                      )}
                    </div>
                  </div>

                  {/* Production specs badges */}
                  <div className="flex flex-wrap gap-2 mt-2.5 text-xs">
                    {recipe.powerGen && (
                      <span className="text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded flex items-center space-x-1">
                        <Zap className="w-3 h-3" />
                        <span>+{recipe.powerGen} kW</span>
                      </span>
                    )}
                    {recipe.powerLoad && (
                      <span className="text-amber-400 bg-amber-950/40 border border-amber-800/50 px-2 py-0.5 rounded flex items-center space-x-1">
                        <Zap className="w-3 h-3" />
                        <span>-{recipe.powerLoad} kW</span>
                      </span>
                    )}
                    {recipe.batteryCapacity && (
                      <span className="text-blue-400 bg-blue-950/40 border border-blue-800/50 px-2 py-0.5 rounded">
                        Cap: {recipe.batteryCapacity} kWh
                      </span>
                    )}
                    {recipe.oxygenGen && (
                      <span className="text-cyan-400 bg-cyan-950/40 border border-cyan-800/50 px-2 py-0.5 rounded flex items-center space-x-1">
                        <Wind className="w-3 h-3" />
                        <span>+{recipe.oxygenGen}% O2/s</span>
                      </span>
                    )}
                    {recipe.waterGen && (
                      <span className="text-blue-400 bg-blue-950/40 border border-blue-800/50 px-2 py-0.5 rounded flex items-center space-x-1">
                        <Droplets className="w-3 h-3" />
                        <span>+{recipe.waterGen} L/s</span>
                      </span>
                    )}
                  </div>

                  {/* Required Materials list */}
                  <div className="mt-3 pt-3 border-t border-slate-800/80">
                    <div className="text-xs uppercase text-slate-500 mb-1.5">
                      Required Materials:
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {Object.entries(recipe.materials).map(([mat, rawReq]) => {
                        const req =
                          avatarId === 'engineer' && (rawReq || 0) > 1
                            ? Math.max(1, Math.floor((rawReq || 0) * 0.9))
                            : rawReq;
                        const current = inventory[mat] || 0;
                        const isEnough = current >= (req || 0);
                        return (
                          <span
                            key={mat}
                            className={`px-2 py-0.5 rounded border ${
                              isEnough
                                ? 'bg-slate-800 text-slate-300 border-slate-700'
                                : 'bg-red-950/40 text-red-400 border-red-800/60'
                            }`}
                          >
                            {mat}: <b className={isEnough ? 'text-white' : 'text-red-400'}>{current}</b>/{req}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Place / Build Button */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="text-xs text-slate-400">
                    Grid Size: {recipe.width}x{recipe.height}
                  </div>

                  {isUnlocked ? (
                    <button
                      data-recipe={recipe.id}
                      disabled={!affordCheck.canAfford}
                      onClick={() => {
                        sound.playClick();
                        onSelectBuildingToPlace(recipe.id);
                        onClose();
                      }}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                        affordCheck.canAfford
                          ? 'bg-cyan-600 hover:bg-cyan-500 text-slate-950 shadow-md cursor-pointer'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {affordCheck.canAfford ? 'Build this' : 'Not enough materials'}
                    </button>
                  ) : (
                    <span className="text-xs text-amber-500/80 flex items-center space-x-1">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Locked: finish more missions</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
