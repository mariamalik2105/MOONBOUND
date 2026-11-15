/**
 * MOONBOUND Economy & Crafting System
 * SpaceDollars (S✦), Resources, Recipes, Avatars, Pets, and Emotes.
 */

export interface ResourceCost {
  regolith?: number;
  metalOre?: number;
  silicon?: number;
  waterIce?: number;
  titanium?: number;
  seeds?: number;
  samples?: number;
  researchData?: number;
  helium3?: number;
  battery?: number;
}

export type ResourceId = keyof ResourceCost;

export interface BuildingRecipe {
  id: string;
  name: string;
  category: 'power' | 'life_support' | 'infrastructure' | 'science' | 'expansion';
  spaceDollars: number;
  materials: ResourceCost;
  description: string;
  powerGen?: number; // kW
  powerLoad?: number; // kW
  batteryCapacity?: number; // kWh
  oxygenGen?: number; // %/sec
  waterGen?: number; // L/sec
  foodGen?: number; // kg/min
  width: number;
  height: number;
  requiresBlueprint?: string;
}

export const INITIAL_SPACEDOLLARS = 150;

export const BUILDING_RECIPES: Record<string, BuildingRecipe> = {
  solar_panel: {
    id: 'solar_panel',
    name: 'Solar Panel',
    category: 'power',
    spaceDollars: 25,
    materials: { silicon: 2, metalOre: 2 },
    description: 'Generates electrical power during lunar daylight using photovoltaic cells.',
    powerGen: 15,
    width: 2,
    height: 2,
  },
  battery: {
    id: 'battery',
    name: 'Battery',
    category: 'power',
    spaceDollars: 30,
    materials: { metalOre: 3, silicon: 1 },
    description: 'Stores excess electrical energy for use during shadowed periods and lunar night.',
    batteryCapacity: 100,
    width: 2,
    height: 2,
  },
  habitat: {
    id: 'habitat',
    name: 'Habitat',
    category: 'infrastructure',
    spaceDollars: 60,
    materials: { regolith: 5, metalOre: 4 },
    description: 'Pressurized crew module with radiation-shielded regolith walls.',
    powerLoad: 8,
    width: 3,
    height: 3,
  },
  oxygen_generator: {
    id: 'oxygen_generator',
    name: 'Oxygen Generator',
    category: 'life_support',
    spaceDollars: 45,
    materials: { metalOre: 3, silicon: 2 },
    description: 'Extracts breathable O2 from lunar regolith minerals and water electrolysis.',
    oxygenGen: 1.2,
    powerLoad: 10,
    width: 2,
    height: 2,
  },
  water_storage: {
    id: 'water_storage',
    name: 'Water Storage',
    category: 'life_support',
    spaceDollars: 25,
    materials: { metalOre: 3, regolith: 2 },
    description: 'Insulated storage tank maintaining liquid water buffer against freezing.',
    powerLoad: 2,
    width: 2,
    height: 2,
  },
  water_recycler: {
    id: 'water_recycler',
    name: 'Water Recycler',
    category: 'life_support',
    spaceDollars: 40,
    materials: { metalOre: 3, silicon: 2 },
    description: 'Recovers up to 98% of humidity, hygiene, and metabolic wastewater.',
    waterGen: 0.8,
    powerLoad: 6,
    width: 2,
    height: 2,
  },
  greenhouse: {
    id: 'greenhouse',
    name: 'Greenhouse',
    category: 'life_support',
    spaceDollars: 50,
    materials: { regolith: 4, metalOre: 3, seeds: 2 },
    description: 'Hydroponic crop growth facility providing fresh nutrition and CO2 scrubbing.',
    foodGen: 1.5,
    powerLoad: 12,
    width: 3,
    height: 3,
  },
  research_lab: {
    id: 'research_lab',
    name: 'Research Lab',
    category: 'science',
    spaceDollars: 65,
    materials: { metalOre: 5, silicon: 3 },
    description: 'Spectrometers and core-sample analyzers to process scientific breakthroughs.',
    powerLoad: 14,
    width: 3,
    height: 3,
  },
  rover: {
    id: 'rover',
    name: 'Rover Garage & Craft',
    category: 'infrastructure',
    spaceDollars: 70,
    materials: { metalOre: 4, silicon: 3, battery: 1 },
    description: 'Deploys a pressurized exploration rover for rapid transport and long-range radar.',
    powerLoad: 5,
    width: 3,
    height: 3,
  },
  landing_pad: {
    id: 'landing_pad',
    name: 'Landing Pad',
    category: 'infrastructure',
    spaceDollars: 55,
    materials: { regolith: 6, metalOre: 4 },
    description: 'Sintered regolith platform preventing rocket plume dust blasts on habitats.',
    powerLoad: 1,
    width: 4,
    height: 4,
  },
  radiation_shelter: {
    id: 'radiation_shelter',
    name: 'Radiation Shelter',
    category: 'infrastructure',
    spaceDollars: 45,
    materials: { regolith: 8, metalOre: 2 },
    description: 'Sub-surface regolith vault shielding astronauts from coronal mass ejections.',
    powerLoad: 4,
    width: 3,
    height: 3,
  },
  processing_facility: {
    id: 'processing_facility',
    name: 'Processing Facility',
    category: 'science',
    spaceDollars: 75,
    materials: { metalOre: 5, silicon: 4 },
    description: 'Refines raw lunar minerals into structural alloys and purified silicon.',
    powerLoad: 16,
    width: 3,
    height: 3,
  },
  communication_tower: {
    id: 'communication_tower',
    name: 'Communication Tower',
    category: 'expansion',
    spaceDollars: 40,
    materials: { metalOre: 3, silicon: 3 },
    description: 'High-gain dish linking the lunar surface directly to NASA Deep Space Network.',
    powerLoad: 8,
    width: 2,
    height: 3,
  },
  medical_station: {
    id: 'medical_station',
    name: 'Medical Station',
    category: 'life_support',
    spaceDollars: 45,
    materials: { metalOre: 3, silicon: 2 },
    description: 'Advanced physiological monitoring, hyperbaric treatment, and radiation therapy.',
    powerLoad: 7,
    width: 2,
    height: 2,
  },
};

export interface AvatarDefinition {
  id: string;
  name: string;
  role: string;
  suitColor: string;
  accentColor: string;
  price: number;
  ability: string;
  /** The cost that comes with the perk. No specialist is pure upside. */
  tradeoff: string;
  description: string;
}

export const AVATARS: Record<string, AvatarDefinition> = {
  engineer: {
    id: 'engineer',
    name: 'Engineer',
    role: 'Infrastructure & Construction',
    suitColor: '#ea580c', // Orange
    accentColor: '#fdba74',
    price: 250,
    ability: 'Builds 15% faster and 10% cheaper. But: works outside a lot, so takes 15% more storm radiation.',
    tradeoff: '+15% storm radiation',
    description: 'Practical master of structural mechanics, 3D regolith sintering, and power grids.',
  },
  scientist: {
    id: 'scientist',
    name: 'Scientist',
    role: 'Planetary Geology & Physics',
    suitColor: '#2563eb', // Blue
    accentColor: '#93c5fd',
    price: 300,
    ability: '+50% Research Data from science challenges. But: extra experiments make labs use 25% more power.',
    tradeoff: 'Labs use 25% more power',
    description: 'Dedicated researcher probing lunar volatiles, impact melt, and cosmic origins.',
  },
  explorer: {
    id: 'explorer',
    name: 'Explorer',
    role: 'Field Reconnaissance',
    suitColor: '#16a34a', // Green
    accentColor: '#86efac',
    price: 275,
    ability: 'Scans a bigger area and moves 10% faster. But: always out exploring, so takes 25% more storm radiation.',
    tradeoff: '+25% storm radiation',
    description: 'Adventurous pathfinder surveying uncharted crater floors and permanent shadows.',
  },
  medic: {
    id: 'medic',
    name: 'Medic',
    role: 'Crew Health & Life Support',
    suitColor: '#f43f5e', // White & Red
    accentColor: '#ffffff',
    price: 275,
    ability: 'Crew uses less oxygen and water. But: busy with crew health, so buildings cost 10% more SpaceDollars.',
    tradeoff: 'Buildings cost 10% more S✦',
    description: 'Aerospace physician safeguarding the crew against hypoxia and microgravity fatigue.',
  },
  botanist: {
    id: 'botanist',
    name: 'Botanist',
    role: 'Bioregenerative Systems',
    suitColor: '#9333ea', // Purple
    accentColor: '#d8b4fe',
    price: 250,
    ability: 'Greenhouses grow 33% more food. But: brighter grow lights use 25% more power.',
    tradeoff: 'Greenhouses use +25% power',
    description: 'Agronomist engineering resilient dwarf crops in simulated lunar soils.',
  },
  technician: {
    id: 'technician',
    name: 'Technician',
    role: 'Diagnostics & Systems Repair',
    suitColor: '#ca8a04', // Yellow
    accentColor: '#fef08a',
    price: 300,
    ability: 'Gets 10% more power from solar panels. But: fixing machines leaves less time for science (−25% Research Data).',
    tradeoff: '−25% Research Data',
    description: 'Robotics expert capable of fixing abrasive lunar dust clogs on the fly.',
  },
};

export interface PetDefinition {
  id: string;
  name: string;
  species: string;
  price: number;
  ability: string;
  personality: string;
  color: string;
}

export const PETS: Record<string, PetDefinition> = {
  space_dog: {
    id: 'space_dog',
    name: 'Astro (Space Dog)',
    species: 'Canine Explorer',
    price: 180,
    ability: 'Barks and points towards high-grade mineral deposits within 15 meters.',
    personality: 'Loyal companion who loves chasing zero-g tennis balls.',
    color: '#d97706',
  },
  space_cat: {
    id: 'space_cat',
    name: 'Nova (Space Cat)',
    species: 'Feline Prowler',
    price: 200,
    ability: 'Occasionally discovers rare collectible crystals and caches.',
    personality: 'Curious and stealthy, prefers perching on solar panel arrays.',
    color: '#0284c7',
  },
  space_monkey: {
    id: 'space_monkey',
    name: 'Newton (Space Monkey)',
    species: 'Primate Navigator',
    price: 220,
    ability: 'Picks up loose nearby surface samples and delivers them to your inventory.',
    personality: 'Playful acrobat adept at swinging across habitat gantry trusses.',
    color: '#854d0e',
  },
  tardigrade: {
    id: 'tardigrade',
    name: 'Moss (Space Tardigrade)',
    species: 'Extremophile Mascot',
    price: 300,
    ability: 'Provides +30% research bonus during extreme thermal and radiation conditions.',
    personality: 'Indestructible microscopic friend sporting a custom micro-helmet.',
    color: '#059669',
  },
  space_tortoise: {
    id: 'space_tortoise',
    name: 'Shelldon (Space Tortoise)',
    species: 'Armored Scout',
    price: 180,
    ability: 'Helps identify hidden exploration points of interest and geological rilles.',
    personality: 'Slow, steady, and very thoughtful about lunar dust mitigation.',
    color: '#475569',
  },
  rocky: {
    id: 'rocky',
    name: 'ROCKY',
    species: 'Sentient Lunar Rock',
    price: 150,
    ability: 'Finds bonus mineral drops and cheers you on with expressive rock expressions.',
    personality: 'A friendly moon basalt rock with shiny eyes and a heart of solid titanium!',
    color: '#94a3b8',
  },
};

export interface EmoteDefinition {
  id: string;
  name: string;
  icon: string;
  price: number;
  description: string;
}

export const EMOTES: Record<string, EmoteDefinition> = {
  wave: { id: 'wave', name: 'Wave', icon: '👋', price: 25, description: 'Friendly astronaut greeting' },
  moon_dance: { id: 'moon_dance', name: 'Moon Dance', icon: '🕺', price: 50, description: 'Celebrate in 1/6th gravity' },
  zero_g_spin: { id: 'zero_g_spin', name: 'Zero-G Spin', icon: '🔄', price: 60, description: 'A smooth 360-degree float' },
  astronaut_salute: { id: 'astronaut_salute', name: 'Astronaut Salute', icon: '🫡', price: 35, description: 'Respect to Houston and crew' },
  moonwalk: { id: 'moonwalk', name: 'Moonwalk', icon: '👟', price: 75, description: 'Glide backwards in true lunar style' },
  happy_bounce: { id: 'happy_bounce', name: 'Happy Bounce', icon: '✨', price: 40, description: 'Joyful low-gravity hops' },
  facepalm: { id: 'facepalm', name: 'Facepalm', icon: '🤦', price: 30, description: 'When the drill overheats' },
  victory_dance: { id: 'victory_dance', name: 'Victory Dance', icon: '🏆', price: 85, description: 'First colony milestone dance' },
  rocky_hug: { id: 'rocky_hug', name: 'Rocky Hug', icon: '🪨', price: 45, description: 'Give your rock friend a gentle pat' },
  confused_pose: { id: 'confused_pose', name: 'Confused Pose', icon: '❓', price: 50, description: 'Where did the rover keys go?' },
};

/**
 * Checks if a player has enough resources and SpaceDollars to construct a building.
 */
export function canAffordBuilding(
  inventory: Record<string, number>,
  spaceDollars: number,
  buildingId: string,
  avatarId?: string
): { canAfford: boolean; missingMaterials: Record<string, number>; missingCurrency: number; finalCost: number } {
  const recipe = BUILDING_RECIPES[buildingId];
  if (!recipe) {
    return { canAfford: false, missingMaterials: {}, missingCurrency: 0, finalCost: 0 };
  }

  // Engineer perk: 10% discount. Medic trade-off: 10% surcharge.
  const isEngineer = avatarId === 'engineer';
  const finalCost = isEngineer
    ? Math.max(1, Math.floor(recipe.spaceDollars * 0.9))
    : avatarId === 'medic'
    ? Math.ceil(recipe.spaceDollars * 1.1)
    : recipe.spaceDollars;

  const missingMaterials: Record<string, number> = {};
  let canAffordMaterials = true;

  for (const [mat, req] of Object.entries(recipe.materials)) {
    if (req && req > 0) {
      const adjustedReq = isEngineer && req > 1 ? Math.max(1, Math.floor(req * 0.9)) : req;
      const current = inventory[mat] || 0;
      if (current < adjustedReq) {
        missingMaterials[mat] = adjustedReq - current;
        canAffordMaterials = false;
      }
    }
  }

  const missingCurrency = Math.max(0, finalCost - spaceDollars);
  const canAfford = canAffordMaterials && missingCurrency === 0;

  return { canAfford, missingMaterials, missingCurrency, finalCost };
}

/**
 * Deducts building cost from inventory and currency.
 */
export function deductBuildingCost(
  inventory: Record<string, number>,
  spaceDollars: number,
  buildingId: string,
  avatarId?: string
): { updatedInventory: Record<string, number>; updatedSpaceDollars: number } {
  const check = canAffordBuilding(inventory, spaceDollars, buildingId, avatarId);
  if (!check.canAfford) {
    throw new Error(`Cannot afford building ${buildingId}`);
  }

  const recipe = BUILDING_RECIPES[buildingId];
  const isEngineer = avatarId === 'engineer';
  const updatedInventory = { ...inventory };

  for (const [mat, req] of Object.entries(recipe.materials)) {
    if (req && req > 0) {
      const adjustedReq = isEngineer && req > 1 ? Math.max(1, Math.floor(req * 0.9)) : req;
      updatedInventory[mat] = Math.max(0, (updatedInventory[mat] || 0) - adjustedReq);
    }
  }

  const updatedSpaceDollars = spaceDollars - check.finalCost;
  return { updatedInventory, updatedSpaceDollars };
}

/** Research Data multiplier for science challenge rewards (Scientist +50%, Technician −25%). */
export function researchMultiplier(avatarId?: string): number {
  if (avatarId === 'scientist') return 1.5;
  if (avatarId === 'technician') return 0.75;
  return 1;
}
