/**
 * The Nine MOONBOUND Phases System
 * Spells: M-O-O-N-B-O-U-N-D
 * Short missions with one clear goal each, hands-on objectives, and a reward for every phase.
 */

export interface PhaseObjective {
  id: string;
  text: string;
  completed: boolean;
  hint: string;
}

export interface PhaseDefinition {
  letter: string;
  phaseIndex: number;
  id: string;
  name: string;
  subTitle: string;
  briefing: string;
  scienceLesson: string;
  objectives: PhaseObjective[];
  rewardSpaceDollars: number;
  unlockedBlueprints: string[];
  unlockedZoneId?: string;
}

export const MOONBOUND_PHASES: PhaseDefinition[] = [
  {
    letter: 'M',
    phaseIndex: 0,
    id: 'mission_prep',
    name: 'Get ready to fly',
    subTitle: 'Pick your specialist and pack the lander.',
    briefing: 'Choose who you will be, pack the three kits your base needs, then start the countdown.',
    scienceLesson: 'Every kilogram launched costs fuel, so crews pack only what they need and plan to use Moon materials too.',
    objectives: [
      { id: 'select_crew', text: 'Pick your specialist', completed: false, hint: 'Click a specialist card. Each has a perk and a cost.' },
      { id: 'inspect_manifest', text: 'Drop 3 kits into the cargo bay', completed: false, hint: 'Press Space (or click Drop) when the crane is right above the glowing slot.' },
      { id: 'ready_launch', text: 'Launch and fly up to space', completed: false, hint: 'Use ← → (or tap left/right) to dodge. Grab purple fuel. Press Space when it says DROP BOOSTERS.' },
    ],
    rewardSpaceDollars: 50,
    unlockedBlueprints: ['solar_panel', 'battery'],
    unlockedZoneId: 'zone_landing',
  },
  {
    letter: 'O',
    phaseIndex: 1,
    id: 'orbit',
    name: 'Reach for the Moon',
    subTitle: 'Open the solar wings, then fire the engine at the right moment.',
    briefing: 'You are circling Earth at about 7.8 km/s. Fire the big engine when the ship reaches the green window to head for the Moon.',
    scienceLesson: 'An orbit is falling sideways so fast that Earth curves away underneath you.',
    objectives: [
      { id: 'solar_array_deploy', text: 'Crank open the solar wings', completed: false, hint: 'Tap W fast (or click the Crank button) until the wings click open.' },
      { id: 'orbital_burn', text: 'Fire the engine inside the green window', completed: false, hint: 'Wait until the ship is inside the green arc, then press Space or click Fire.' },
    ],
    rewardSpaceDollars: 50,
    unlockedBlueprints: ['habitat'],
    unlockedZoneId: 'zone_landing',
  },
  {
    letter: 'O',
    phaseIndex: 2,
    id: 'outbound_journey',
    name: 'Cross to the Moon',
    subTitle: 'Steer by the stars, then keep the crew safe from radiation.',
    briefing: 'The Moon is 384,400 km away. A star camera keeps the ship pointed the right way.',
    scienceLesson: 'Away from Earth\u2019s magnetic field, crews shelter behind thick walls and water when the Sun flares.',
    objectives: [
      { id: 'star_nav', text: 'Fly through the asteroid field', completed: false, hint: 'Use ← → (or tap left/right) to dodge rocks. Purple cans give fuel.' },
      { id: 'radiation_check', text: 'Hide behind the water tanks when the Sun flares', completed: false, hint: 'When the flare warning shows, steer into the lane with the blue water tanks.' },
    ],
    rewardSpaceDollars: 60,
    unlockedBlueprints: ['oxygen_generator', 'water_storage'],
    unlockedZoneId: 'zone_landing',
  },
  {
    letter: 'N',
    phaseIndex: 3,
    id: 'navigation',
    name: 'Choose where to land',
    subTitle: 'Compare three sites and pick the best one for a base.',
    briefing: 'A Moon base needs steady sunlight, nearby ice, and a clear view of Earth for radio.',
    scienceLesson: 'NASA\u2019s Artemis program is aiming for the south pole, where sunny rims sit next to icy shadowed craters.',
    objectives: [
      { id: 'site_survey', text: 'Fly the scanner over all 3 landing sites', completed: false, hint: 'Move the scanner with the arrow keys or your mouse. Hover over a site until the ring fills.' },
      { id: 'select_target', text: 'Pick a site with sunlight and ice', completed: false, hint: 'A south pole site has both. Click Land here.' },
    ],
    rewardSpaceDollars: 70,
    unlockedBlueprints: ['landing_pad', 'water_recycler'],
    unlockedZoneId: 'zone_landing',
  },
  {
    letter: 'B',
    phaseIndex: 4,
    id: 'braking_and_landing',
    name: 'Land gently',
    subTitle: 'Slow the lander to under 3 m/s before it touches down.',
    briefing: 'There is no air on the Moon, so parachutes do not work. Fire the engine to brake.',
    scienceLesson: 'Parachutes need air to push against. Lunar landers brake with rocket engines instead.',
    objectives: [
      { id: 'terminal_guidance', text: 'Land on the flat pad slower than 3 m/s', completed: false, hint: 'Hold Space to brake. Use ← → to slide over the pad with the lights.' },
      { id: 'engine_shutdown', text: 'Climb down the ladder', completed: false, hint: 'Click Step outside, or press E.' },
    ],
    rewardSpaceDollars: 80,
    unlockedBlueprints: ['greenhouse', 'research_lab', 'radiation_shelter'],
    unlockedZoneId: 'zone_landing',
  },
  {
    letter: 'O',
    phaseIndex: 5,
    id: 'outpost',
    name: 'Build your base',
    subTitle: 'Build a habitat, solar power and an oxygen maker.',
    briefing: 'Collect materials, then build the three things a crew needs first: shelter, power and air.',
    scienceLesson: 'Near the south pole the Sun stays low, so high ground gets far more light than crater floors.',
    objectives: [
      { id: 'build_habitat', text: 'Build a habitat', completed: false, hint: 'Press B and choose Habitat. It needs 5 regolith and 4 metal.' },
      { id: 'build_power', text: 'Build a solar panel in sunlight and a battery', completed: false, hint: 'Place the panel on the bright ridge to the north. The battery stores power for the night.' },
      { id: 'activate_o2', text: 'Build and switch on an oxygen maker', completed: false, hint: 'Build an Oxygen Generator, walk to it and press E to connect it.' },
    ],
    rewardSpaceDollars: 100,
    unlockedBlueprints: ['rover', 'radiation_shelter'],
    unlockedZoneId: 'zone_highlands',
  },
  {
    letter: 'U',
    phaseIndex: 6,
    id: 'uncover',
    name: 'Find frozen water',
    subTitle: 'Drive the rover south, scan rocks and collect 3 ice samples.',
    briefing: 'The crater south of the base never sees sunlight. Ice may be hiding in its shadows.',
    scienceLesson: 'Crater floors near the poles that never get sunlight are among the coldest places measured in the solar system, cold enough to keep water ice frozen.',
    objectives: [
      { id: 'board_rover', text: 'Get in the rover', completed: false, hint: 'Walk to the rover and press R.' },
      { id: 'scan_crater', text: 'Scan 3 different rocks', completed: false, hint: 'Stop near a rock and press F. Each rock only counts once.' },
      { id: 'discover_ice', text: 'Collect 3 ice samples in the shadowed crater', completed: false, hint: 'Ice is hidden. Press F inside the crater to find it, then press E.' },
    ],
    rewardSpaceDollars: 120,
    unlockedBlueprints: ['processing_facility', 'communication_tower'],
    unlockedZoneId: 'zone_cold_trap',
  },
  {
    letter: 'N',
    phaseIndex: 7,
    id: 'network',
    name: 'Connect the base',
    subTitle: 'Set up water recycling, a science lab and a radio link to Earth.',
    briefing: 'Each new building needs one hands-on setup step before it works.',
    scienceLesson: 'The International Space Station recycles about 98% of its water, so very little has to be shipped up.',
    objectives: [
      { id: 'build_recycler', text: 'Build and set up a water recycler', completed: false, hint: 'Build a Water Recycler, then press E at it and connect the parts in order.' },
      { id: 'build_lab', text: 'Build a lab and run your first analysis', completed: false, hint: 'Build a Research Lab, then press E at it to compare two rock samples.' },
      { id: 'build_comm', text: 'Build a radio tower and aim it at Earth', completed: false, hint: 'Build a Communication Tower, then press E and turn the dish until the signal holds.' },
    ],
    rewardSpaceDollars: 150,
    unlockedBlueprints: ['medical_station'],
    unlockedZoneId: 'zone_research',
  },
  {
    letter: 'D',
    phaseIndex: 8,
    id: 'development',
    name: 'Make it home',
    subTitle: 'Grow food, clear the dust and keep the base steady.',
    briefing: 'A base that lasts makes its own food, keeps its machines clean and stays balanced day after day.',
    scienceLesson: 'Lunar dust is sharp and clingy. Apollo crews found it on everything, including inside their suits.',
    objectives: [
      { id: 'greenhouse_crop', text: 'Build a greenhouse and harvest a crop', completed: false, hint: 'Build a Greenhouse, wait for the plants to grow, then press E beside it.' },
      { id: 'dust_maintenance', text: 'Brush dust off a solar panel', completed: false, hint: 'A panel got dusty. Walk to the marked panel and press E.' },
      { id: 'sustainability_check', text: 'Keep power, air and water steady for 20 seconds', completed: false, hint: 'Keep oxygen above 50% and water above 20 L. If power runs low, turn on Power Saver.' },
    ],
    rewardSpaceDollars: 200,
    unlockedBlueprints: [],
    unlockedZoneId: 'zone_research',
  },
];

/**
 * Checks if current phase objectives are met.
 */
export function isPhaseComplete(phase: PhaseDefinition): boolean {
  return phase.objectives.every((obj) => obj.completed);
}

/**
 * Marks an objective completed and returns updated phases array.
 */
export function completeObjectiveInPhases(
  phases: PhaseDefinition[],
  phaseIndex: number,
  objectiveId: string
): { updatedPhases: PhaseDefinition[]; newlyCompletedPhase: boolean } {
  const updatedPhases = phases.map((p, idx) => {
    if (idx !== phaseIndex) return p;
    return {
      ...p,
      objectives: p.objectives.map((obj) => (obj.id === objectiveId ? { ...obj, completed: true } : obj)),
    };
  });

  const phaseAfter = updatedPhases[phaseIndex];
  const newlyCompletedPhase = isPhaseComplete(phaseAfter);

  return { updatedPhases, newlyCompletedPhase };
}
