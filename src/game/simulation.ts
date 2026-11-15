/**
 * MOONBOUND Colony Simulation System
 * Manages life support: Electricity (Solar/Battery), Oxygen, Water, Food, Dust, Thermal & Radiation.
 * Solar storms come from real NASA DONKI flare records (see spaceWeather.ts).
 */

import {
  RadiationState,
  StormState,
  StormChoice,
  SpaceWeatherEvent,
  ARCHIVED_SOLAR_EVENTS,
  BACKGROUND_DOSE_PER_SIM_SECOND,
  STORM_WARNING_SECONDS,
  STORM_ACTIVE_SECONDS,
  REGOLITH_WALL_COST,
  KEEP_WORKING_RESEARCH_BONUS,
  RADIATION_FACTS,
  createRadiationState,
  pickStormEvent,
  nextStormDelay,
  bestShelter,
  computePlannedDose,
  round1,
} from './spaceWeather';

export interface PlacedBuilding {
  instanceId: string;
  recipeId: string;
  x: number;
  y: number;
  status: 'active' | 'unpowered' | 'damaged' | 'constructing';
  health: number; // 0-100
  dustAccumulation: number; // 0-100%
  progress?: number; // 0-100% for constructing
  /** Solar panels: fraction of full sunlight at this spot (0–1). Older saves: treated as 1. */
  sunFactor?: number;
  /** false = built but not set up by hand yet (does nothing until activated). */
  online?: boolean;
  /** Greenhouses: crop growth 0–100. */
  growth?: number;
}

export interface ColonyResources {
  spaceDollars: number;
  powerStored: number; // kWh
  powerCapacity: number; // kWh
  powerGenCurrent: number; // kW
  powerLoadCurrent: number; // kW
  oxygen: number; // 0-100%
  water: number; // Liters
  maxWater: number;
  food: number; // kg
  maxFood: number;
  crewCount: number;
}

export interface ColonyProblemSolution {
  id: string;
  label: string;
  correct: boolean;
  feedback: string;
}

export interface ColonyEvent {
  id: string;
  title: string;
  description: string;
  scienceExplanation: string;
  severity: 'low' | 'medium' | 'high';
  active: boolean;
  timeRemaining: number; // seconds
  mitigationTip: string;
  rewardDollars: number;
  solutions: ColonyProblemSolution[];
}

export interface ZoneEnvironmentInfo {
  zoneId: string;
  zoneName: string;
  temperatureC: number;
  temperatureLabel: string;
  radiationLevel: 'Low' | 'Moderate' | 'Elevated';
  isColdTrap: boolean;
  scienceNote: string;
}

export interface SimulationState {
  resources: ColonyResources;
  buildings: PlacedBuilding[];
  sunlightIntensity: number; // 0.0 to 1.0 (lunar day/night)
  lunarTimeOfDay: number; // 0.0 to 1.0 cycle
  activeEvents: ColonyEvent[];
  powerSaverMode?: boolean;
  sustainabilitySeconds?: number;
  solvedEventIds?: string[];
  /** Crew radiation dose + storm scheduling (older saves may not have it). */
  radiation?: RadiationState;
  /** The current solar storm, if one is on its way or happening. */
  storm?: StormState | null;
  /** Temporary effects from colony decisions, in sim-seconds remaining. */
  modifiers?: { greenhouseOff?: number; o2Throttle?: number };
  stats: {
    totalPowerGenerated: number;
    totalOxygenProduced: number;
    totalWaterRecycled: number;
    daysSurvived: number;
  };
}

/**
 * Returns realistic, zone-specific lunar thermal & radiation telemetry.
 * The Moon does NOT have one uniform temperature!
 */
export function getZoneEnvironment(zoneId: string, sunlightIntensity: number): ZoneEnvironmentInfo {
  if (zoneId === 'zone_cold_trap') {
    return {
      zoneId,
      zoneName: 'South Pole Cold Trap (PSR)',
      temperatureC: -246,
      temperatureLabel: '-246°C (27 K)',
      radiationLevel: 'Low',
      isColdTrap: true,
      scienceNote: 'Sunlight NEVER reaches this crater floor, keeping comet water ice frozen solid.',
    };
  }

  const isDay = sunlightIntensity > 0.2;
  if (zoneId === 'zone_highlands') {
    const temp = isDay ? Math.round(45 + sunlightIntensity * 65) : -140;
    return {
      zoneId,
      zoneName: 'Highlands Ridge',
      temperatureC: temp,
      temperatureLabel: `${temp > 0 ? '+' : ''}${temp}°C`,
      radiationLevel: isDay ? 'Elevated' : 'Moderate',
      isColdTrap: false,
      scienceNote: 'High ridge catches extra grazing sunlight while open slopes face deep space.',
    };
  }

  if (zoneId === 'zone_research') {
    const temp = isDay ? Math.round(35 + sunlightIntensity * 60) : -135;
    return {
      zoneId,
      zoneName: 'Research Expansion Basin',
      temperatureC: temp,
      temperatureLabel: `${temp > 0 ? '+' : ''}${temp}°C`,
      radiationLevel: 'Moderate',
      isColdTrap: false,
      scienceNote: 'Volcanic basalt soil traps trace solar-wind particles and titanium minerals.',
    };
  }

  const baseTemp = isDay ? Math.round(30 + sunlightIntensity * 75) : -130;
  return {
    zoneId: 'zone_landing',
    zoneName: 'Landing Zone Alpha',
    temperatureC: baseTemp,
    temperatureLabel: `${baseTemp > 0 ? '+' : ''}${baseTemp}°C`,
    radiationLevel: isDay ? 'Moderate' : 'Low',
    isColdTrap: false,
    scienceNote: isDay
      ? 'Sunlit Shackleton Rim generates steady solar electricity.'
      : 'Lunar shadow! Batteries keep habitats warm at -130°C.',
  };
}

/**
 * Initializes default starting colony state.
 */
export function createInitialSimulationState(seed: number = Date.now()): SimulationState {
  return {
    radiation: createRadiationState(seed),
    storm: null,
    modifiers: {},
    resources: {
      spaceDollars: 150,
      powerStored: 40,
      powerCapacity: 50,
      powerGenCurrent: 0,
      powerLoadCurrent: 0,
      oxygen: 100,
      water: 50,
      maxWater: 100,
      food: 30,
      maxFood: 60,
      crewCount: 1,
    },
    buildings: [],
    sunlightIntensity: 1.0,
    lunarTimeOfDay: 0.25,
    activeEvents: [],
    powerSaverMode: false,
    sustainabilitySeconds: 0,
    solvedEventIds: [],
    stats: {
      totalPowerGenerated: 0,
      totalOxygenProduced: 0,
      totalWaterRecycled: 0,
      daysSurvived: 1,
    },
  };
}

const NONESSENTIAL_POWER_BUILDINGS = new Set([
  'research_lab',
  'processing_facility',
  'communication_tower',
]);

/**
 * Advances colony simulation by dt seconds.
 * Deterministic calculation for power, oxygen, water, food, dust, and educational problem events.
 */
export interface TickOptions {
  /** True once the crew is on the Moon (Outpost phase onward): radiation and storms apply. */
  onSurface?: boolean;
  /** Real NASA events to draw storms from (live DONKI first, then archive). */
  eventPool?: SpaceWeatherEvent[];
  /** Solar storms can arrive (defaults to onSurface). Off during the first base-building mission. */
  stormsEnabled?: boolean;
}

export function tickSimulation(
  state: SimulationState,
  dt: number,
  avatarId?: string,
  _petId?: string,
  options: TickOptions = {}
): SimulationState {
  const clampedDt = Math.min(dt, 0.5);
  const next: SimulationState = {
    ...state,
    resources: { ...state.resources },
    buildings: state.buildings.map((b) => ({ ...b })),
    activeEvents: state.activeEvents.map((e) => ({ ...e })),
    solvedEventIds: [...(state.solvedEventIds || [])],
    stats: { ...state.stats },
    radiation: state.radiation
      ? { ...state.radiation, history: [...state.radiation.history] }
      : createRadiationState(hashSeedFromState(state)),
    storm: state.storm ? { ...state.storm } : null,
    modifiers: { ...(state.modifiers || {}) },
  };

  const mods = next.modifiers!;
  const shelterLockdown = next.storm?.phase === 'active' && next.storm.choice === 'shelter';
  const greenhouseOff = shelterLockdown || (mods.greenhouseOff || 0) > 0;
  const o2Throttled = (mods.o2Throttle || 0) > 0;

  // 1. Advance lunar solar cycle (1 full lunar day = 480 seconds / 8 minutes game-time)
  const CYCLE_PERIOD = 480;
  const prevTime = next.lunarTimeOfDay;
  next.lunarTimeOfDay = (next.lunarTimeOfDay + clampedDt / CYCLE_PERIOD) % 1.0;
  if (next.lunarTimeOfDay < prevTime) {
    next.stats.daysSurvived += 1;
  }

  if (next.lunarTimeOfDay <= 0.7) {
    const dayProgress = next.lunarTimeOfDay / 0.7;
    next.sunlightIntensity = Math.sin(dayProgress * Math.PI);
  } else {
    next.sunlightIntensity = 0.0;
  }

  // 2. Calculate Total Power Generation and Load
  let powerGen = 0;
  let powerLoad = 0;
  let powerCapacity = 50; // Base lander backup storage
  let maxWater = 100;
  let oxygenGenRate = 0;
  let waterGenRate = 0;
  let foodGenRate = 0;

  const isTechnician = avatarId === 'technician';
  const isMedic = avatarId === 'medic';
  const isBotanist = avatarId === 'botanist';
  const isScientist = avatarId === 'scientist';
  const powerSaver = Boolean(next.powerSaverMode);

  for (const b of next.buildings) {
    if (b.status === 'constructing') {
      b.progress = (b.progress || 0) + (avatarId === 'engineer' ? clampedDt * 25 : clampedDt * 18);
      if (b.progress >= 100) {
        b.status = 'active';
        b.progress = 100;
      }
      continue;
    }

    if (b.status === 'damaged') continue;
    // Built but not set up yet: no power draw, no output.
    if (b.online === false) continue;

    // Power Saver pauses nonessential buildings to protect life support!
    if (powerSaver && NONESSENTIAL_POWER_BUILDINGS.has(b.recipeId)) {
      continue;
    }
    // Crew sheltering from a solar storm: labs and greenhouse are left switched off.
    if (shelterLockdown && NONESSENTIAL_POWER_BUILDINGS.has(b.recipeId)) {
      continue;
    }
    if (greenhouseOff && b.recipeId === 'greenhouse') {
      continue;
    }

    const cleanMultiplier = Math.max(0.2, 1 - b.dustAccumulation / 100);

    if (b.recipeId === 'solar_panel') {
      const gen = 15 * next.sunlightIntensity * (b.sunFactor ?? 1) * cleanMultiplier;
      powerGen += gen;
      b.dustAccumulation = Math.min(100, b.dustAccumulation + clampedDt * 0.2);
    } else if (b.recipeId === 'battery') {
      powerCapacity += 100;
    } else if (b.recipeId === 'habitat') {
      powerLoad += 8;
    } else if (b.recipeId === 'oxygen_generator') {
      powerLoad += o2Throttled ? 4 : 10;
      oxygenGenRate += (o2Throttled ? 0.4 : 1.2) * cleanMultiplier;
    } else if (b.recipeId === 'water_storage') {
      maxWater += 50;
    } else if (b.recipeId === 'water_recycler') {
      powerLoad += 6;
      waterGenRate += 0.8 * cleanMultiplier;
    } else if (b.recipeId === 'greenhouse') {
      // Botanist trade-off: brighter grow lights use 25% more power.
      powerLoad += isBotanist ? 15 : 12;
      foodGenRate += (isBotanist ? 2.0 : 1.5) * cleanMultiplier;
      // Crops grow to harvest in about 20 sim-seconds while powered (faster for the Botanist).
      b.growth = Math.min(100, (b.growth ?? 100) + clampedDt * (isBotanist ? 6.5 : 5) * cleanMultiplier);
    } else if (b.recipeId === 'research_lab') {
      // Scientist trade-off: runs extra experiments, labs use 25% more power.
      powerLoad += isScientist ? 17.5 : 14;
    } else if (b.recipeId === 'processing_facility') {
      powerLoad += isScientist ? 20 : 16;
    } else if (b.recipeId === 'communication_tower') {
      powerLoad += 8;
    } else if (b.recipeId === 'medical_station') {
      powerLoad += 7;
    }
  }

  if (isTechnician) {
    powerGen *= 1.1;
  }

  next.resources.powerGenCurrent = Math.round(powerGen * 10) / 10;
  next.resources.powerLoadCurrent = Math.round(powerLoad * 10) / 10;
  next.resources.powerCapacity = powerCapacity;
  next.resources.maxWater = maxWater;

  // 3. Power balance delta
  const netPowerKw = powerGen - powerLoad;
  const powerDeltaKwh = (netPowerKw * clampedDt) / 20;
  next.resources.powerStored = Math.min(
    powerCapacity,
    Math.max(0, next.resources.powerStored + powerDeltaKwh)
  );

  const hasPower = next.resources.powerStored > 0 || netPowerKw >= 0;

  for (const b of next.buildings) {
    if (b.status === 'constructing') continue;
    if (b.status !== 'damaged') {
      b.status = hasPower ? 'active' : 'unpowered';
    }
  }

  // 4. Oxygen Simulation
  const o2DrainRate = isMedic ? 0.25 : 0.4;
  if (hasPower && oxygenGenRate > 0) {
    next.resources.oxygen = Math.min(100, next.resources.oxygen + oxygenGenRate * clampedDt * 0.8);
  } else {
    next.resources.oxygen = Math.max(0, next.resources.oxygen - o2DrainRate * clampedDt);
  }

  // 5. Water Simulation
  const waterConsumption = (isMedic ? 0.06 : 0.1) * clampedDt;
  if (hasPower && waterGenRate > 0) {
    next.resources.water = Math.min(
      next.resources.maxWater,
      next.resources.water + (waterGenRate * 0.3 - waterConsumption) * clampedDt
    );
  } else {
    next.resources.water = Math.max(0, next.resources.water - waterConsumption);
  }

  // 6. Food Simulation
  if (hasPower && foodGenRate > 0) {
    next.resources.food = Math.min(
      next.resources.maxFood,
      next.resources.food + foodGenRate * 0.05 * clampedDt
    );
  } else {
    next.resources.food = Math.max(0, next.resources.food - 0.02 * clampedDt);
  }

  // 7. Sustainability streak (Phase D objective helper)
  const isSustainable =
    hasPower &&
    next.resources.oxygen >= 50 &&
    next.resources.water >= 20 &&
    oxygenGenRate > 0;
  if (isSustainable) {
    next.sustainabilitySeconds = (next.sustainabilitySeconds || 0) + clampedDt;
  } else {
    next.sustainabilitySeconds = 0;
  }

  // 7b. Count timers down on temporary decision effects
  if (mods.greenhouseOff) mods.greenhouseOff = Math.max(0, mods.greenhouseOff - clampedDt);
  if (mods.o2Throttle) mods.o2Throttle = Math.max(0, mods.o2Throttle - clampedDt);

  // 7c. Radiation + real NASA solar storms
  if (options.onSurface) {
    tickRadiationAndStorms(
      next,
      clampedDt,
      avatarId,
      options.eventPool || ARCHIVED_SOLAR_EVENTS,
      options.stormsEnabled ?? true
    );
  }

  // 8. Update stats
  next.stats.totalPowerGenerated += Math.max(0, powerGen * clampedDt);
  next.stats.totalOxygenProduced += Math.max(0, oxygenGenRate * clampedDt);
  next.stats.totalWaterRecycled += Math.max(0, waterGenRate * clampedDt);

  // 9. Tick active events & detect solvable educational colony problems
  next.activeEvents = next.activeEvents
    .map((e) => ({ ...e, timeRemaining: e.timeRemaining - clampedDt }))
    .filter((e) => e.timeRemaining > 0 && e.active);

  const hasActiveEvent = (id: string) => next.activeEvents.some((e) => e.id === id);

  // Alerts can come back later once the problem has really gone away.
  if (next.resources.powerStored > 40) {
    next.solvedEventIds = next.solvedEventIds!.filter((id) => id !== 'low_battery_alert');
  }
  if (!next.buildings.some((b) => b.recipeId === 'solar_panel' && b.dustAccumulation > 45)) {
    next.solvedEventIds = next.solvedEventIds!.filter((id) => id !== 'solar_dust_alert');
  }

  if (
    next.buildings.length > 0 &&
    next.resources.powerStored < 15 &&
    !next.powerSaverMode &&
    !hasActiveEvent('low_battery_alert') &&
    !next.solvedEventIds?.includes('low_battery_alert')
  ) {
    next.activeEvents.push({
      id: 'low_battery_alert',
      title: 'Colony Battery Low!',
      description: 'Stored electricity dropped below 15 kWh while buildings are drawing power.',
      scienceExplanation:
        'Solar panels stop making power when shadows fall or Moon dust blocks them. Switching non-essential labs into Power Saver Mode keeps Oxygen and Habitats running from Battery reserves!',
      severity: 'high',
      active: true,
      timeRemaining: 120,
      mitigationTip: 'Every fix costs something. Pick the cost your colony can live with.',
      rewardDollars: 20,
      solutions: [
        {
          id: 'enable_power_saver',
          label: 'Power Saver: switch off the labs, processing and radio tower. (Cost: no science or comms until you turn it back on.)',
          correct: true,
          feedback: 'Labs are off. Oxygen and the habitat keep running. Turn Power Saver off when the battery recovers, or your science stays paused.',
        },
        {
          id: 'dim_greenhouse',
          label: 'Turn off the greenhouse lights for a while. (Cost: no new food grows for ~2 minutes.)',
          correct: true,
          feedback: 'Greenhouse lights are off. You saved 12 kW, but your crew is eating stored food instead of fresh crops.',
        },
        {
          id: 'turn_off_oxygen',
          label: 'Turn the Oxygen Generator down low. (Cost: oxygen will slowly drop. Risky!)',
          correct: true,
          feedback: 'Oxygen Generator is on low power for ~2 minutes. Watch your O2 bar: real crews only do this when they have big oxygen tanks.',
        },
      ],
    });
  }

  const dustyPanel = next.buildings.find((b) => b.recipeId === 'solar_panel' && b.dustAccumulation > 45);
  if (
    dustyPanel &&
    !hasActiveEvent('solar_dust_alert') &&
    !next.solvedEventIds?.includes('solar_dust_alert')
  ) {
    next.activeEvents.push({
      id: 'solar_dust_alert',
      title: 'Lunar Dust on Solar Panels!',
      description: 'Static-charged Moon dust is blocking sunlight on your solar arrays.',
      scienceExplanation:
        'Sunlight gives tiny sharp Moon dust grains a static electric charge so they float and cling to glass solar panels, cutting electricity output.',
      severity: 'medium',
      active: true,
      timeRemaining: 120,
      mitigationTip: 'Walk to a dusty panel and press Space, or choose a fix below. Each fix costs something.',
      rewardDollars: 20,
      solutions: [
        {
          id: 'brush_panels',
          label: 'Electric dust brush on every panel. (Cost: 6 kWh of stored power.)',
          correct: true,
          feedback: 'Panels cleaned with the electric brush, using some battery power.',
        },
        {
          id: 'hand_clean',
          label: 'Send an astronaut out to brush them by hand. (Cost: extra radiation dose for the spacewalk.)',
          correct: true,
          feedback: 'Panels cleaned by hand. It saved power, but the spacewalk added about 2 mSv of radiation.',
        },
        {
          id: 'wash_with_hose',
          label: 'Spray water on the panels outside.',
          correct: false,
          feedback: 'In a vacuum, open water boils away and freezes into frost on the glass. You lost 5 L of water and the panels are still dusty!',
        },
      ],
    });
  }

  return next;
}

/**
 * Applies a player's solution choice to an active colony problem.
 */
export function solveColonyProblem(
  state: SimulationState,
  eventId: string,
  solutionId: string
): {
  nextState: SimulationState;
  solved: boolean;
  feedback: string;
  rewardDollars: number;
} {
  const event = state.activeEvents.find((e) => e.id === eventId);
  if (!event) {
    return { nextState: state, solved: false, feedback: 'Alert already cleared.', rewardDollars: 0 };
  }

  const option = event.solutions.find((s) => s.id === solutionId);
  if (!option) {
    return { nextState: state, solved: false, feedback: 'Invalid option.', rewardDollars: 0 };
  }

  if (!option.correct) {
    // Wrong ideas still cost something, like in real life.
    const lost: SimulationState = { ...state, resources: { ...state.resources } };
    if (solutionId === 'wash_with_hose') {
      lost.resources.water = Math.max(0, lost.resources.water - 5);
    }
    return {
      nextState: lost,
      solved: false,
      feedback: option.feedback,
      rewardDollars: 0,
    };
  }

  if (solutionId === 'brush_panels' && state.resources.powerStored < 6) {
    return {
      nextState: state,
      solved: false,
      feedback: 'Not enough battery for the electric brush (needs 6 kWh). Try cleaning by hand instead.',
      rewardDollars: 0,
    };
  }

  const nextState: SimulationState = {
    ...state,
    resources: { ...state.resources },
    buildings: state.buildings.map((b) => ({ ...b })),
    activeEvents: state.activeEvents.filter((e) => e.id !== eventId),
    solvedEventIds: Array.from(new Set([...(state.solvedEventIds || []), eventId])),
    modifiers: { ...(state.modifiers || {}) },
    radiation: state.radiation ? { ...state.radiation } : state.radiation,
  };

  const cleanPanels = () =>
    nextState.buildings.map((b) =>
      b.recipeId === 'solar_panel' ? { ...b, dustAccumulation: 0, status: 'active' as const } : b
    );

  if (solutionId === 'enable_power_saver') {
    // No free battery top-up: the only gain is the power you stop using.
    nextState.powerSaverMode = true;
  } else if (solutionId === 'dim_greenhouse') {
    nextState.modifiers!.greenhouseOff = 60;
  } else if (solutionId === 'turn_off_oxygen') {
    nextState.modifiers!.o2Throttle = 60;
  } else if (solutionId === 'brush_panels') {
    nextState.resources.powerStored = Math.max(0, nextState.resources.powerStored - 6);
    nextState.buildings = cleanPanels();
  } else if (solutionId === 'hand_clean') {
    if (nextState.radiation) {
      nextState.radiation.crewDoseMSv = round1(nextState.radiation.crewDoseMSv + 2);
    }
    nextState.buildings = cleanPanels();
  }

  return {
    nextState,
    solved: true,
    feedback: option.feedback,
    rewardDollars: event.rewardDollars,
  };
}

/**
 * Repairs a damaged or dusted building.
 */
export function repairBuilding(
  buildings: PlacedBuilding[],
  instanceId: string,
  _isTechnician = false
): PlacedBuilding[] {
  return buildings.map((b) => {
    if (b.instanceId === instanceId) {
      return {
        ...b,
        status: 'active',
        health: 100,
        dustAccumulation: 0,
      };
    }
    return b;
  });
}

// ---------------------------------------------------------------------------
// Radiation & solar storms
// ---------------------------------------------------------------------------

function hashSeedFromState(state: SimulationState): number {
  return Math.floor((state.stats?.totalPowerGenerated || 0) * 1000 + (state.lunarTimeOfDay || 0) * 1e6) || 12345;
}

function tickRadiationAndStorms(
  next: SimulationState,
  dt: number,
  avatarId: string | undefined,
  pool: SpaceWeatherEvent[],
  stormsEnabled: boolean
) {
  const rad = next.radiation!;
  if (rad.missionOver) return;

  // Background galactic cosmic rays (Chang'e-4 measured 1.369 mSv/day on the surface)
  rad.crewDoseMSv += BACKGROUND_DOSE_PER_SIM_SECOND * dt;

  const storm = next.storm;
  if (!storm) {
    if (stormsEnabled) rad.nextStormIn -= dt;
    if (stormsEnabled && rad.nextStormIn <= 0) {
      const event = pickStormEvent(pool, rad.seed, rad.stormCount);
      next.storm = {
        event,
        phase: 'warning',
        timeLeft: STORM_WARNING_SECONDS,
        plannedDose: 0,
        doseTaken: 0,
        foodLost: 0,
      };
    }
  } else if (storm.phase === 'warning') {
    storm.timeLeft -= dt;
    if (storm.timeLeft <= 0) {
      // Nobody made a plan: the storm hits the crew unprotected.
      if (!storm.choice) {
        storm.choice = 'none';
        storm.plannedDose = computePlannedDose(storm.event, 'none', 'lander', avatarId);
      }
      storm.phase = 'active';
      storm.timeLeft = STORM_ACTIVE_SECONDS;
    }
  } else if (storm.phase === 'active') {
    const step = Math.min(dt, storm.timeLeft);
    const dose = (storm.plannedDose / STORM_ACTIVE_SECONDS) * step;
    storm.doseTaken += dose;
    rad.crewDoseMSv += dose;
    if (storm.choice === 'shelter') {
      const greenhouses = next.buildings.filter((b) => b.recipeId === 'greenhouse').length;
      storm.foodLost += greenhouses * (avatarId === 'botanist' ? 2.0 : 1.5) * 0.05 * step;
    }
    storm.timeLeft -= dt;
    if (storm.timeLeft <= 0) {
      storm.phase = 'debrief';
      storm.timeLeft = 0;
      storm.doseTaken = round1(storm.doseTaken);
      storm.foodLost = round1(storm.foodLost);
      rad.history.push({
        eventId: storm.event.id,
        flareClass: storm.event.flareClass,
        choice: storm.choice || 'none',
        dose: storm.doseTaken,
      });
      rad.stormCount += 1;
      rad.nextStormIn = nextStormDelay(rad.seed, rad.stormCount);
    }
  }

  rad.crewDoseMSv = round1Precise(rad.crewDoseMSv);
  if (rad.crewDoseMSv >= RADIATION_FACTS.careerLimitMSv) {
    rad.missionOver = true;
  }
}

function round1Precise(n: number) {
  return Math.round(n * 1000) / 1000;
}

/**
 * Player picks how to handle an incoming storm (only during the warning).
 * Returns the updated simulation and inventory. Every choice costs something.
 */
export function chooseStormResponse(
  sim: SimulationState,
  inventory: Record<string, number>,
  choice: Exclude<StormChoice, 'none'>,
  avatarId?: string
): { simulation: SimulationState; inventory: Record<string, number>; ok: boolean; message: string } {
  const storm = sim.storm;
  if (!storm || storm.phase !== 'warning') {
    return { simulation: sim, inventory, ok: false, message: 'There is no storm warning right now.' };
  }
  if (storm.choice) {
    return { simulation: sim, inventory, ok: false, message: 'Your crew already has a plan.' };
  }

  const inv = { ...inventory };
  const shelterKind = bestShelter(sim.buildings.filter((b) => b.status !== 'constructing').map((b) => b.recipeId));

  if (choice === 'regolith_wall') {
    if ((inv.regolith || 0) < REGOLITH_WALL_COST) {
      return { simulation: sim, inventory, ok: false, message: `You need ${REGOLITH_WALL_COST} Regolith to build a dirt wall.` };
    }
    inv.regolith = (inv.regolith || 0) - REGOLITH_WALL_COST;
  }
  if (choice === 'keep_working') {
    inv.researchData = (inv.researchData || 0) + KEEP_WORKING_RESEARCH_BONUS;
  }

  const plannedDose = computePlannedDose(storm.event, choice, shelterKind, avatarId);
  const nextStorm: StormState = { ...storm, choice, shelterKind, plannedDose };
  const messages: Record<typeof choice, string> = {
    shelter: 'Crew heading to shelter. Work stops until the storm passes.',
    regolith_wall: `Moon-dirt wall built (−${REGOLITH_WALL_COST} Regolith). Crew keeps working.`,
    keep_working: `Crew keeps working (+${KEEP_WORKING_RESEARCH_BONUS} Research Data), but takes the full dose.`,
  };
  return { simulation: { ...sim, storm: nextStorm }, inventory: inv, ok: true, message: messages[choice] };
}

/** Closes the storm report so the next storm can be scheduled. */
export function acknowledgeStormDebrief(sim: SimulationState): SimulationState {
  if (sim.storm?.phase !== 'debrief') return sim;
  return { ...sim, storm: null };
}
