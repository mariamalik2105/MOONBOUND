import React from 'react';
import { X, Package, Sparkles } from 'lucide-react';
import { sound } from '../game/audio';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: Record<string, number>;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({ isOpen, onClose, inventory }) => {
  if (!isOpen) return null;

  const catalog = [
    {
      id: 'regolith',
      name: 'Lunar Regolith',
      category: 'Bulk Feedstock',
      desc: 'Fine abrasive grey lunar soil composed of pulverized anorthosite and basalt. Used for 3D sintering habitat walls and radiation berms.',
      color: '#94a3b8',
    },
    {
      id: 'metalOre',
      name: 'Basalt Metal Ore',
      category: 'Structural Metal',
      desc: 'Iron-rich volcanic basalt containing ilmenite. Smelted for structural frames, airlock trusses, and heavy machinery.',
      color: '#cbd5e1',
    },
    {
      id: 'silicon',
      name: 'Silicon-rich Regolith',
      category: 'Semiconductor',
      desc: 'High-purity silicate mineral grains extracted from highlands crust. Critical for manufacturing photovoltaic cells and microcircuits.',
      color: '#818cf8',
    },
    {
      id: 'waterIce',
      name: 'Cryogenic Water Ice',
      category: 'Life Support / Volatiles',
      desc: 'Frozen water volatiles preserved in permanently shadowed craters at 40 Kelvin. Extracted for drinking, oxygen electrolysis, and rocket fuel.',
      color: '#38bdf8',
    },
    {
      id: 'titanium',
      name: 'Titanium Ore',
      category: 'Aerospace Alloy',
      desc: 'Rare high-strength titanium mineral deposits from impact crater shock melt. Essential for rover chassis and pressurized airlocks.',
      color: '#f8fafc',
    },
    {
      id: 'seeds',
      name: 'Plant Seeds',
      category: 'Bioregenerative',
      desc: 'Specially engineered dwarf wheat and radish seeds. Cultivated inside hydroponic greenhouses for crew nutrition and oxygen replenishment.',
      color: '#4ade80',
    },
    {
      id: 'samples',
      name: 'Geological Samples',
      category: 'Science Core',
      desc: 'Uncontaminated rock cores and impact breccia collected during surface EVA. Processed in research labs for science breakthroughs.',
      color: '#fbbf24',
    },
    {
      id: 'researchData',
      name: 'Research Telemetry Data',
      category: 'Scientific Data',
      desc: 'Spectrometer scans and lunar seismological data gathered from sensor arrays. Used to unlock advanced blueprint technologies.',
      color: '#c084fc',
    },
    {
      id: 'helium3',
      name: 'Helium-3 Volatiles',
      category: 'Exotic Energy',
      desc: 'Rare non-radioactive fusion isotope deposited by the solar wind over billions of years. Used for late-game advanced research.',
      color: '#f43f5e',
    },
  ];

  return (
    <div className="mb-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 select-none">
      <div className="mb-card bg-moon-panel border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-moon-panel">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white">Backpack</h2>
              <p className="text-sm text-moon-muted">Materials you have collected (I to close)</p>
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

        {/* Resources Grid */}
        <div className="p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {catalog.map((item) => {
            const count = inventory[item.id] || 0;
            return (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">{item.name}</span>
                    <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: item.color }} />
                  </div>
                  <div className="text-xs text-cyan-400 mt-0.5">{item.category}</div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">{item.desc}</p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Quantity</span>
                  <span className="text-base font-bold text-white tabular-nums">{count}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
