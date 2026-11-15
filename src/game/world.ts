/**
 * MOONBOUND world layout: one hand-placed map shared by the canvas engine
 * (drawing, collision, pathfinding) and the mission system (target markers).
 *
 * The base sits on a crater rim near the lunar south pole. The Sun skims the
 * horizon there, so a ridge to the north gets the most light and the crater to
 * the south is in permanent shadow (a "cold trap"). Panel output in the game
 * follows `sunFactorAt`, a simplified version of that real pattern.
 */

export const GRID = 24;

export const WORLD = { minX: -320, maxX: 1520, minY: -520, maxY: 1120 };

export const LANDER = { x: 400, y: 330, r: 44 };
/** Where the astronaut climbs down; the playable intro starts here. */
export const LADDER = { x: 400, y: 396 };
export const BASE_CENTER = { x: 420, y: 330 };
/** Buildings must stay this close to the lander so the base reads as one place. */
export const BASE_RADIUS = 470;

/** The permanently shadowed crater south of the base. */
export const COLD_TRAP = { x: 410, y: 880, rx: 330, ry: 190 };
/** Sunlit ridge north of the base: best place for solar panels. */
export const SUNNY_RIDGE = { x: 430, y: 110, rx: 300, ry: 90 };

export interface Boulder {
  x: number;
  y: number;
  r: number;
}

/** Large rocks the astronaut and rover cannot pass through. */
export const BOULDERS: Boulder[] = [
  { x: 150, y: 170, r: 22 },
  { x: 760, y: 200, r: 26 },
  { x: 690, y: 540, r: 18 },
  { x: 120, y: 560, r: 24 },
  { x: 300, y: 600, r: 16 },
  { x: 610, y: 640, r: 20 },
  { x: 880, y: 420, r: 30 },
  { x: 40, y: 360, r: 20 },
  { x: 250, y: -150, r: 28 },
  { x: 560, y: -230, r: 24 },
  { x: 380, y: -380, r: 30 },
  { x: 990, y: 180, r: 22 },
  { x: 1180, y: 460, r: 26 },
  { x: 1320, y: 260, r: 20 },
  { x: 160, y: 760, r: 20 },
  { x: 700, y: 770, r: 22 },
];

export type NodeType =
  | 'regolith'
  | 'metalOre'
  | 'silicon'
  | 'waterIce'
  | 'titanium'
  | 'samples'
  | 'helium3'
  | 'crate'
  | 'tech_wreck';

export interface NodeDef {
  id: string;
  x: number;
  y: number;
  type: NodeType;
  name: string;
  /** Materials given per collection. A crate gives a bundle instead (see CRATE_CONTENTS). */
  amount: number;
  /** How many times it can be collected before it is used up. */
  uses: number;
  /** Ice in the cold trap is invisible until a scan finds it. */
  hiddenUntilScanned?: boolean;
  /** Supply crates and samples can only be collected once per campaign. */
  oneTime?: boolean;
  zoneId: string;
}

export const CRATE_CONTENTS: Record<string, number> = { metalOre: 3, silicon: 2, regolith: 2 };

export const NODE_DEFS: NodeDef[] = [
  // Around the lander
  { id: 'crate-1', x: 560, y: 470, type: 'crate', name: 'Supply crate', amount: 0, uses: 1, oneTime: true, zoneId: 'zone_landing' },
  { id: 'reg-1', x: 250, y: 260, type: 'regolith', name: 'Loose regolith', amount: 3, uses: 3, zoneId: 'zone_landing' },
  { id: 'reg-2', x: 240, y: 470, type: 'regolith', name: 'Loose regolith', amount: 3, uses: 3, zoneId: 'zone_landing' },
  { id: 'reg-3', x: 640, y: 300, type: 'regolith', name: 'Loose regolith', amount: 3, uses: 3, zoneId: 'zone_landing' },
  { id: 'met-1', x: 330, y: 220, type: 'metalOre', name: 'Metal-rich rock', amount: 2, uses: 4, zoneId: 'zone_landing' },
  { id: 'met-2', x: 170, y: 380, type: 'metalOre', name: 'Metal-rich rock', amount: 2, uses: 4, zoneId: 'zone_landing' },
  { id: 'met-3', x: 700, y: 420, type: 'metalOre', name: 'Metal-rich rock', amount: 2, uses: 4, zoneId: 'zone_landing' },
  { id: 'met-4', x: 470, y: 560, type: 'metalOre', name: 'Metal-rich rock', amount: 2, uses: 4, zoneId: 'zone_landing' },
  { id: 'sil-1', x: 520, y: 220, type: 'silicon', name: 'Silica glass', amount: 2, uses: 4, zoneId: 'zone_landing' },
  { id: 'sil-2', x: 300, y: 520, type: 'silicon', name: 'Silica glass', amount: 2, uses: 4, zoneId: 'zone_landing' },
  { id: 'sil-3', x: 760, y: 330, type: 'silicon', name: 'Silica glass', amount: 2, uses: 4, zoneId: 'zone_landing' },
  { id: 'smp-1', x: 640, y: 160, type: 'samples', name: 'Bright highland rock', amount: 1, uses: 1, oneTime: true, zoneId: 'zone_landing' },

  // Highlands ridge (north)
  { id: 'hl-1', x: 320, y: -220, type: 'metalOre', name: 'Ridge boulder', amount: 3, uses: 3, zoneId: 'zone_highlands' },
  { id: 'hl-2', x: 470, y: -320, type: 'titanium', name: 'Dark titanium-rich rock', amount: 2, uses: 2, zoneId: 'zone_highlands' },
  { id: 'hl-3', x: 170, y: -280, type: 'regolith', name: 'Coarse regolith', amount: 4, uses: 3, zoneId: 'zone_highlands' },
  { id: 'hl-4', x: 620, y: -120, type: 'samples', name: 'Glassy impact rock', amount: 1, uses: 1, oneTime: true, zoneId: 'zone_highlands' },

  // Route south to the cold trap
  { id: 'rt-1', x: 230, y: 650, type: 'samples', name: 'Dark basalt chunk', amount: 1, uses: 1, oneTime: true, zoneId: 'zone_landing' },
  { id: 'rt-2', x: 560, y: 690, type: 'silicon', name: 'Frosty silica grains', amount: 2, uses: 3, zoneId: 'zone_cold_trap' },
  { id: 'rt-3', x: 760, y: 640, type: 'tech_wreck', name: 'Old sensor probe', amount: 2, uses: 1, oneTime: true, zoneId: 'zone_cold_trap' },

  // Cold trap ice (hidden until scanned)
  { id: 'ice-1', x: 330, y: 840, type: 'waterIce', name: 'Ice in the shadows', amount: 2, uses: 1, hiddenUntilScanned: true, zoneId: 'zone_cold_trap' },
  { id: 'ice-2', x: 470, y: 900, type: 'waterIce', name: 'Ice in the shadows', amount: 2, uses: 1, hiddenUntilScanned: true, zoneId: 'zone_cold_trap' },
  { id: 'ice-3', x: 580, y: 830, type: 'waterIce', name: 'Ice in the shadows', amount: 2, uses: 1, hiddenUntilScanned: true, zoneId: 'zone_cold_trap' },
  { id: 'ice-4', x: 260, y: 930, type: 'waterIce', name: 'Ice in the shadows', amount: 2, uses: 1, hiddenUntilScanned: true, zoneId: 'zone_cold_trap' },
  { id: 'ice-5', x: 410, y: 980, type: 'waterIce', name: 'Ice in the shadows', amount: 2, uses: 1, hiddenUntilScanned: true, zoneId: 'zone_cold_trap' },

  // Research basin (east)
  { id: 'rb-1', x: 1100, y: 330, type: 'helium3', name: 'Solar-wind soil', amount: 1, uses: 2, zoneId: 'zone_research' },
  { id: 'rb-2', x: 1230, y: 250, type: 'titanium', name: 'Impact glass', amount: 3, uses: 2, zoneId: 'zone_research' },
  { id: 'rb-3', x: 1060, y: 520, type: 'metalOre', name: 'Metal-rich rock', amount: 2, uses: 4, zoneId: 'zone_research' },
];

/** Where the rover waits once it is unpacked (start of the Uncover mission). */
export const ROVER_PARK = { x: 520, y: 400, heading: 0 };

export function ellipseInside(px: number, py: number, e: { x: number; y: number; rx: number; ry: number }, scale = 1) {
  const dx = (px - e.x) / (e.rx * scale);
  const dy = (py - e.y) / (e.ry * scale);
  return dx * dx + dy * dy <= 1;
}

/**
 * Fraction of full sunlight that reaches a spot (0–1). Simplified: the ridge
 * is best lit, the base gets most light, the crater floor gets none.
 */
export function sunFactorAt(x: number, y: number): number {
  if (ellipseInside(x, y, COLD_TRAP)) return 0;
  if (ellipseInside(x, y, COLD_TRAP, 1.25)) return 0.3;
  if (y < 170) return 1;
  if (y < 260) return 1 - ((y - 170) / 90) * 0.25;
  if (y > 560) return Math.max(0.35, 0.75 - ((y - 560) / 120) * 0.4);
  return 0.75;
}

export function zoneAt(x: number, y: number): string {
  if (y > 600) return 'zone_cold_trap';
  if (y < -40) return 'zone_highlands';
  if (x > 860) return 'zone_research';
  return 'zone_landing';
}

export const ZONE_NAMES: Record<string, string> = {
  zone_landing: 'Landing site',
  zone_highlands: 'Sunny ridge',
  zone_cold_trap: 'Shadowed crater',
  zone_research: 'East plain',
};

export const RESOURCE_NAMES: Record<string, { one: string; many: string }> = {
  regolith: { one: 'regolith', many: 'regolith' },
  metalOre: { one: 'piece of metal', many: 'pieces of metal' },
  silicon: { one: 'piece of silicon', many: 'pieces of silicon' },
  waterIce: { one: 'ice sample', many: 'ice samples' },
  titanium: { one: 'titanium chunk', many: 'titanium chunks' },
  seeds: { one: 'seed pack', many: 'seed packs' },
  samples: { one: 'rock sample', many: 'rock samples' },
  researchData: { one: 'research point', many: 'research points' },
  helium3: { one: 'helium-3 sample', many: 'helium-3 samples' },
  battery: { one: 'battery cell', many: 'battery cells' },
};

export const RESOURCE_LABEL: Record<string, string> = {
  regolith: 'Regolith',
  metalOre: 'Metal',
  silicon: 'Silicon',
  waterIce: 'Ice',
  titanium: 'Titanium',
  seeds: 'Seeds',
  samples: 'Rock samples',
  researchData: 'Research',
  helium3: 'Helium-3',
  battery: 'Battery cells',
};
