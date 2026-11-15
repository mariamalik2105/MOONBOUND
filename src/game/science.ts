/**
 * MOONBOUND Mission Knowledge, Research Tree & Space Codex
 * Written for explorers ages 10-15 with expandable "Curious Explorer" NASA deep-dives.
 * Authoritative sources: NASA Moon Science, LRO, Apollo, Artemis, LCROSS, PDS.
 * Framework:
 * 1. DISCOVER: What your scanner spotted on the lunar surface.
 * 2. UNDERSTAND: Clear science explanation (plus expandable NASA Deep Dive).
 * 3. APPLY: Engineering decision with real colony rewards & unlocks.
 */

export interface MissionKnowledgeEntry {
  id: string;
  title: string;
  category: 'geology' | 'power' | 'life_support' | 'radiation' | 'water_ice';
  nodeTypes: string[];
  discoveryPrompt: string;
  understandExplanation: string;
  deepDiveExplanation: string;
  sourceUrl: string;
  sourceLabel: string;
  unlocksBlueprint?: string;
  unlocksCodexId?: string;
  applyChallenge: {
    question: string;
    options: {
      text: string;
      correct: boolean;
      feedback: string;
    }[];
    rewardDollars: number;
    rewardResearchData: number;
    rewardResource?: { resource: string; amount: number };
  };
}

export const MISSION_KNOWLEDGE_ENTRIES: MissionKnowledgeEntry[] = [
  {
    id: 'lunar_regolith',
    title: 'Moon Dirt & Making Oxygen',
    category: 'geology',
    nodeTypes: ['regolith', 'samples'],
    discoveryPrompt: 'Your scanner spotted fine grey Moon dust (called regolith) covering the ground like crunchy powdered glass!',
    understandExplanation:
      'Moon dirt is not soft like garden soil on Earth. It is made of tiny sharp rock pieces created when space rocks crashed into the Moon for billions of years. Amazingly, up to 40% of Moon rock is actually oxygen trapped inside minerals! By baking Moon dirt in a special hot oven, astronauts can squeeze out breathable oxygen.',
    deepDiveExplanation:
      'Lunar regolith contains mineral grains such as ilmenite (FeTiO3). Through hydrogen or carbothermal reduction at 900–1,000°C, engineers split oxygen atoms away from iron and titanium to create water vapor, which is then split by electricity (electrolysis) into O2 gas and hydrogen.',
    sourceUrl: 'https://science.nasa.gov/moon/',
    sourceLabel: 'NASA Science: Moon (general reference)',
    unlocksCodexId: 'codex_lunar_regolith',
    applyChallenge: {
      question:
        'Your habitat oxygen tank is getting low! How can your crew make fresh oxygen right here on the Moon?',
      options: [
        {
          text: 'Heat oxygen-rich Moon dirt inside an Oxygen Generator to pull out trapped oxygen gas.',
          correct: true,
          feedback: 'Awesome job! Heating ilmenite Moon dirt releases oxygen so your astronauts can breathe safely.',
        },
        {
          text: 'Open a habitat window to let outside Moon air blow in.',
          correct: false,
          feedback: 'Careful! The Moon has almost no air at all—it is a hard vacuum! Opening a window would let all our air escape.',
        },
        {
          text: 'Sweep raw Moon dust straight into the air vents.',
          correct: false,
          feedback: 'Ouch! Moon dust is sharp like tiny glass splinters and would clog machines and hurt astronauts’ lungs.',
        },
      ],
      rewardDollars: 35,
      rewardResearchData: 6,
      rewardResource: { resource: 'metalOre', amount: 3 },
    },
  },
  {
    id: 'solar_illumination',
    title: 'Peaks of Eternal Light & Solar Power',
    category: 'power',
    nodeTypes: ['silicon'],
    discoveryPrompt: 'Long shadows stretch across the crater rim while bright sunlight shines near the horizon!',
    understandExplanation:
      'The Moon spins almost completely upright, so at the South Pole the Sun slides low along the horizon like a permanent golden sunset. High crater rims catch sunlight almost all year long! Scientists call these sunny mountaintops "Peaks of Eternal Light"—the perfect spot for solar panels.',
    deepDiveExplanation:
      'Because the Moon’s axial tilt is only 1.54° (Earth is 23.4°), solar rays hit polar regions at grazing angles. Elevated ridges like Shackleton Crater Rim and Malapert Mountain receive sunlight 86–90% of the lunar year, whereas equatorial bases experience 14 Earth days of continuous freezing night.',
    sourceUrl: 'https://ode.rsl.wustl.edu/moon/',
    sourceLabel: 'Lunar Orbital Data Explorer (hosts LRO data)',
    unlocksBlueprint: 'solar_panel',
    unlocksCodexId: 'codex_solar_illumination',
    applyChallenge: {
      question:
        'Sunlight at the Moon’s South Pole shines sideways from low near the horizon. How should you mount your solar panels?',
      options: [
        {
          text: 'Stand the solar panels upright on spinning poles so they can follow the low Sun all around.',
          correct: true,
          feedback: 'Brilliant engineering! Standing panels face the sideways sunlight directly and make maximum electricity.',
        },
        {
          text: 'Lay the solar panels completely flat on the ground.',
          correct: false,
          feedback: 'Not quite! When the Sun is low on the horizon, flat panels barely catch any rays and collect more falling dust.',
        },
        {
          text: 'Hide the solar panels underground to keep them warm.',
          correct: false,
          feedback: 'Solar panels need direct sunlight photons hitting their silicon cells to generate electricity!',
        },
      ],
      rewardDollars: 40,
      rewardResearchData: 6,
    },
  },
  {
    id: 'water_ice_cold_traps',
    title: 'Frozen Water Ice in Dark Craters',
    category: 'water_ice',
    nodeTypes: ['waterIce'],
    discoveryPrompt: 'Inside this pitch-black crater floor, temperatures drop below -246°C—colder than Pluto!',
    understandExplanation:
      'Deep craters at the Moon’s South Pole have walls so tall that sunlight NEVER reaches the bottom. Scientists call these "Cold Traps." Over billions of years, comets crashed into the Moon and left water behind. In these super-cold shadows, that water froze solid as rock-hard ice!',
    deepDiveExplanation:
      'In 2009, NASA’s LCROSS mission intentionally impacted Cabeus Crater and analyzed the dust plume, confirming water ice makes up roughly 5% by mass in some Permanently Shadowed Regions (PSRs). Mined ice can be purified for drinking, split into O2 for breathing, or turned into liquid hydrogen and oxygen rocket fuel.',
    sourceUrl: 'https://science.nasa.gov/mission/lcross/',
    sourceLabel: 'NASA LCROSS Mission Results',
    unlocksBlueprint: 'water_recycler',
    unlocksCodexId: 'codex_water_ice',
    applyChallenge: {
      question:
        'You found frozen water ice mixed into rock-hard dirt inside a freezing dark crater. How should your team collect it?',
      options: [
        {
          text: 'Use a heated dome or microwave drill to warm the ice into steam, then catch it in cold tanks.',
          correct: true,
          feedback: 'Spot on! Turning ice straight into vapor (sublimation) lets us trap clean water inside sealed tanks.',
        },
        {
          text: 'Spray liquid water from a hose into the crater to melt the ice.',
          correct: false,
          feedback: 'In the Moon’s vacuum, open liquid water instantly boils into gas and freezes into snow—you would lose it all!',
        },
        {
          text: 'Light a campfire on the crater floor.',
          correct: false,
          feedback: 'Fire cannot burn on the Moon because there is no oxygen gas in the air!',
        },
      ],
      rewardDollars: 50,
      rewardResearchData: 8,
      rewardResource: { resource: 'waterIce', amount: 4 },
    },
  },
  {
    id: 'radiation_shielding',
    title: 'Space Radiation & Moon-Dirt Roofs',
    category: 'radiation',
    nodeTypes: ['titanium'],
    discoveryPrompt: 'Radiation sensor beep! Invisible high-energy particles from the Sun and deep space hit the Moon.',
    understandExplanation:
      'Earth has a thick blanket of air and an invisible magnetic shield that block dangerous space radiation. The Moon has neither! To keep astronauts safe during solar storms, we can pile thick Moon dirt (regolith) over our habitats or build underground Radiation Shelters.',
    deepDiveExplanation:
      'The lunar surface receives both steady Galactic Cosmic Rays (GCRs) and sudden Solar Particle Events (SPEs). NASA studies show that 2 to 3 meters of compacted lunar regolith overburden significantly absorbs ionizing protons and reduces radiation exposure to safe crew limits.',
    sourceUrl: 'https://pds.nasa.gov/',
    sourceLabel: 'NASA Planetary Data System (archive home)',
    unlocksBlueprint: 'radiation_shelter',
    unlocksCodexId: 'codex_radiation',
    applyChallenge: {
      question:
        'Mission Control warns that a strong Solar Storm is arriving in 10 minutes! What is the safest plan for your crew?',
      options: [
        {
          text: 'Move all astronauts inside the Radiation Shelter protected by thick regolith walls.',
          correct: true,
          feedback: 'Safe choice! Thick layers of Moon dirt block dangerous solar storm particles just like a giant umbrella.',
        },
        {
          text: 'Go outside onto the tallest crater rim to watch the storm.',
          correct: false,
          feedback: 'Too risky! Standing outside during a solar storm exposes astronauts to high space radiation.',
        },
        {
          text: 'Put extra sunscreen on the spacesuit helmets.',
          correct: false,
          feedback: 'Sunscreen blocks Earth sunburns (UV rays), not fast-moving cosmic radiation particles!',
        },
      ],
      rewardDollars: 45,
      rewardResearchData: 7,
    },
  },
  {
    id: 'basalt_volcanoes',
    title: 'Ancient Moon Volcanoes & Metal Ore',
    category: 'geology',
    nodeTypes: ['metalOre'],
    discoveryPrompt: 'Dark heavy volcanic rock packed with iron and titanium flecks!',
    understandExplanation:
      'Billions of years ago, giant volcanoes erupted on the Moon and flooded huge low plains with dark lava. When that lava cooled, it turned into dark basalt rock full of iron and titanium! Astronauts can melt this metal ore to build strong rover frames and habitat airlocks.',
    deepDiveExplanation:
      'The dark patches you can see on the Moon from Earth are called "maria" (Latin for seas), formed by ancient flood basalts 3 to 3.5 billion years ago. Highland areas are older, lighter-colored anorthosite crust rich in aluminum and calcium.',
    sourceUrl: 'https://science.nasa.gov/moon/geology/',
    sourceLabel: 'NASA Moon Geology — Maria & Highlands',
    unlocksBlueprint: 'processing_facility',
    unlocksCodexId: 'codex_lunar_geography',
    applyChallenge: {
      question:
        'Look up at the full Moon from Earth: what are the big dark patches actually made of?',
      options: [
        {
          text: 'Ancient hardened lava plains (basalt) rich in iron and metal minerals.',
          correct: true,
          feedback: 'Correct! Early astronomers thought they were oceans ("maria"), but Apollo astronauts proved they are ancient lava rock!',
        },
        {
          text: 'Deep liquid oceans of saltwater.',
          correct: false,
          feedback: 'There are no liquid oceans on the Moon—water would boil away in the vacuum of space!',
        },
        {
          text: 'Giant shadows from Earth clouds.',
          correct: false,
          feedback: 'Those dark shapes never move because they are real volcanic rock plains on the Moon’s surface.',
        },
      ],
      rewardDollars: 35,
      rewardResearchData: 6,
      rewardResource: { resource: 'metalOre', amount: 2 },
    },
  },
  {
    id: 'space_farming',
    title: 'Moon Greenhouses & Growing Space Food',
    category: 'life_support',
    nodeTypes: ['seeds', 'crate'],
    discoveryPrompt: 'Supply crate scan: Dwarf wheat, radish seeds, and hydroponic nutrient packets!',
    understandExplanation:
      'Sending groceries to the Moon on rockets is super expensive! Instead, astronauts build indoor Greenhouses with special pink and blue LED lights, water, and plant food. Growing plants gives the crew fresh veggies to eat AND plants naturally breathe in CO2 and release fresh oxygen!',
    deepDiveExplanation:
      'Bioregenerative life support systems use hydroponics or aeroponics inside pressurized domes. Plants absorb crew-exhaled carbon dioxide during photosynthesis and transpire pure water vapor that can be recaptured by dehumidifiers.',
    sourceUrl: 'https://science.nasa.gov/moon/',
    sourceLabel: 'NASA Science: Moon (general reference)',
    unlocksBlueprint: 'greenhouse',
    unlocksCodexId: 'codex_greenhouse_systems',
    applyChallenge: {
      question:
        'Why are Greenhouses so helpful for a long-term Moon colony?',
      options: [
        {
          text: 'Plants grow fresh food AND turn crew carbon dioxide (CO2) back into breathable oxygen!',
          correct: true,
          feedback: 'Double win! Plants feed the astronauts and help clean the air inside the base.',
        },
        {
          text: 'Plants can grow outside in open Moon dirt with no dome or water.',
          correct: false,
          feedback: 'Outside there is no air, freezing/boiling temperatures, and zero liquid water—plants need a pressurized dome!',
        },
        {
          text: 'Plants generate rocket fuel directly from Moon gravity.',
          correct: false,
          feedback: 'Plants use light, water, and CO2 to grow—they are living food and air helpers, not gravity engines!',
        },
      ],
      rewardDollars: 40,
      rewardResearchData: 7,
      rewardResource: { resource: 'seeds', amount: 2 },
    },
  },
  {
    id: 'helium3_solar_wind',
    title: 'Solar Wind & Rare Helium-3',
    category: 'power',
    nodeTypes: ['helium3'],
    discoveryPrompt: 'Rare trace gas bubble trapped inside volcanic lunar soil grains!',
    understandExplanation:
      'The Sun blows an invisible stream of tiny particles called the "solar wind." Because the Moon has no air shield, tiny amounts of a rare gas called Helium-3 get stuck in Moon dust over billions of years. Scientists study it for future clean fusion energy—but it is very rare and NOT an easy everyday fuel yet!',
    deepDiveExplanation:
      'Helium-3 concentrations in lunar regolith are extremely low (measured in parts per billion—roughly 20–50 milligrams per metric ton of soil). While scientists research future aneutronic fusion concepts, real lunar bases today rely on solar arrays, batteries, and fission reactors—not Helium-3.',
    sourceUrl: 'https://science.nasa.gov/moon/',
    sourceLabel: 'NASA Science: Moon (general reference)',
    unlocksCodexId: 'codex_lunar_history',
    applyChallenge: {
      question:
        'True or False science check: Should a new Moon base count on Helium-3 as an easy day-one power source?',
      options: [
        {
          text: 'No! Helium-3 is super rare and fusion reactors using it are still being researched—use Solar Panels and Batteries first.',
          correct: true,
          feedback: 'Smart scientist! Reliable solar panels and batteries keep the lights on today while Helium-3 stays a rare research topic.',
        },
        {
          text: 'Yes! You can scoop one bucket of Moon dust to power a whole city immediately.',
          correct: false,
          feedback: 'Careful! That is a common sci-fi myth—Helium-3 exists only in tiny trace amounts and needs advanced future fusion tech.',
        },
      ],
      rewardDollars: 55,
      rewardResearchData: 10,
      rewardResource: { resource: 'helium3', amount: 1 },
    },
  },
  {
    id: 'lunar_dust_problem',
    title: 'Sticky Moon Dust & Equipment Care',
    category: 'power',
    nodeTypes: ['tech_wreck'],
    discoveryPrompt: 'Damaged solar tech scan: Static-charged grey dust is coating the glass and joints!',
    understandExplanation:
      'Moon dust is sneaky! Sunlight zaps the tiny dust grains with static electricity—just like a balloon sticking to your hair! That makes sharp Moon dust float up and cling to spacesuits, visors, and solar panels, blocking sunlight. Brushing and cleaning equipment keeps your colony running strong.',
    deepDiveExplanation:
      'Ultraviolet radiation and solar wind plasma electrostatically charge fine lunar dust particles, causing "electrostatic dust levitation" near the day-night terminator. Apollo astronauts found abrasive dust wore down suit seals and overheated radiators.',
    sourceUrl: 'https://science.nasa.gov/moon/',
    sourceLabel: 'NASA Science: Moon (general reference)',
    unlocksBlueprint: 'solar_panel',
    unlocksCodexId: 'codex_lunar_regolith',
    applyChallenge: {
      question:
        'Your solar panels are dusty and making less electricity! What makes Moon dust stick to panels so stubbornly?',
      options: [
        {
          text: 'Static electricity from sunlight charges the sharp dust grains so they cling like magnets.',
          correct: true,
          feedback: 'You got it! Walking up to dusty panels and brushing them clean [Space] brings power right back to 100%!',
        },
        {
          text: 'Sticky tree sap from Moon forests.',
          correct: false,
          feedback: 'There are no trees or plants growing outside on the Moon—it is static electricity!',
        },
        {
          text: 'Mud puddles left by lunar rainstorms.',
          correct: false,
          feedback: 'The Moon has no rain or mud—its dust is bone-dry and electrically charged.',
        },
      ],
      rewardDollars: 35,
      rewardResearchData: 7,
    },
  },
];

/**
 * Matches a scanned node type or category to the best Mission Knowledge entry.
 * Prefers entries the player hasn't solved yet so every scan teaches something new!
 */
export function findKnowledgeForScanTarget(
  nodeTypeOrCategory: string,
  completedChallengeIds: string[] = []
): MissionKnowledgeEntry {
  const exactMatches = MISSION_KNOWLEDGE_ENTRIES.filter(
    (entry) =>
      entry.nodeTypes.includes(nodeTypeOrCategory) || entry.category === nodeTypeOrCategory
  );

  const pool = exactMatches.length > 0 ? exactMatches : MISSION_KNOWLEDGE_ENTRIES;
  const unsolved = pool.find((entry) => !completedChallengeIds.includes(entry.id));
  if (unsolved) return unsolved;

  const anyUnsolved = MISSION_KNOWLEDGE_ENTRIES.find(
    (entry) => !completedChallengeIds.includes(entry.id)
  );
  return pool[0] || anyUnsolved || MISSION_KNOWLEDGE_ENTRIES[0];
}

export interface CodexEntry {
  id: string;
  title: string;
  category: string;
  shortSummary: string;
  kidFriendlyText: string;
  detailedText: string;
  nasaFact: string;
  sourceUrl: string;
  sourceLabel: string;
  starterUnlocked?: boolean;
}

export const SPACE_CODEX: CodexEntry[] = [
  {
    id: 'codex_lunar_geography',
    title: 'Lunar Geography: Craters, Maria & Highlands',
    category: 'Lunar Geography',
    shortSummary: 'Explore giant impact craters, bright highlands, and dark ancient lava plains.',
    kidFriendlyText:
      'Even without a telescope, you can see light and dark areas on the Moon! The bright bumpy areas are ancient Highlands covered in craters from space rock crashes. The darker flat areas are called Maria—ancient lava lakes that cooled into solid rock billions of years ago. At the South Pole, giant mountains and deep craters sit side by side!',
    detailedText:
      'Lunar topography spans over 18 kilometers from the bottom of the South Pole–Aitken Basin (one of the largest impact basins in the solar system) to the highest highland peaks. Without wind or rain erosion, craters formed billions of years ago stay sharp and preserved.',
    nasaFact: 'The South Pole–Aitken Basin on the Moon’s far side is about 2,500 km wide—nearly the width of the United States!',
    sourceUrl: 'https://science.nasa.gov/moon/',
    sourceLabel: 'NASA Science: Moon (general reference)',
    starterUnlocked: true,
  },
  {
    id: 'codex_moon_phases',
    title: 'Moon Phases & Orbit Around Earth',
    category: 'Moon Phases & Orbit',
    shortSummary: 'Why the Moon changes shape in our sky and takes 27.3 days to orbit Earth.',
    kidFriendlyText:
      'The Moon does not make its own light—it shines like a giant mirror reflecting sunlight! As the Moon travels around Earth once every month, we see different amounts of its sunlit half, making New Moon, Crescent, Quarter, and Full Moon shapes. Plus, the Moon spins in sync with its orbit, so the same side always faces Earth!',
    detailedText:
      'Because the Moon is tidally locked to Earth, its rotation period equals its orbital period (~27.3 days). A complete lunar day-night cycle (one sunrise to the next sunrise on the Moon) lasts 29.5 Earth days: about 14.75 days of blazing daytime followed by 14.75 days of freezing night.',
    nasaFact: 'The "far side" of the Moon is NOT always dark—it gets just as much sunlight as the near side during a New Moon!',
    sourceUrl: 'https://science.nasa.gov/moon/moon-phases/',
    sourceLabel: 'NASA Moon Phases Guide',
    starterUnlocked: true,
  },
  {
    id: 'codex_lunar_gravity',
    title: 'Lunar Gravity: 1/6th of Earth',
    category: 'Gravity',
    shortSummary: 'Moon gravity is 6 times weaker than Earth—you can jump super high!',
    kidFriendlyText:
      'If you weigh 30 kg (66 pounds) on Earth, you would feel like only 5 kg (11 pounds) on the Moon! Because the Moon is much smaller and lighter than Earth, its gravity pull is 1/6th as strong. Astronauts bounce like kangaroos in slow motion—but heavy rocks still have the same mass, so you still have to be careful stopping!',
    detailedText:
      'Surface gravitational acceleration on the Moon is 1.62 m/s² compared to Earth’s 9.81 m/s² (0.166 g). While weight decreases by 83%, inertia (mass) stays identical, meaning turning or braking a loaded lunar rover requires careful traction and distance.',
    nasaFact: 'Apollo astronauts invented the playful "kangaroo hop" because regular Earth walking felt awkward in 1/6th gravity!',
    sourceUrl: 'https://science.nasa.gov/moon/',
    sourceLabel: 'NASA Science: Moon (general reference)',
    starterUnlocked: true,
  },
  {
    id: 'codex_lunar_regolith',
    title: 'Lunar Regolith & Sharp Moon Dust',
    category: 'Lunar Regolith',
    shortSummary: 'Powdery grey rock fragments created by billions of micrometeorite hits.',
    kidFriendlyText:
      'Moon dirt is called regolith. On Earth, wind and water smooth sand grains into round pebbles. On the Moon, there is no wind or rain, so tiny space rocks smash the surface into razor-sharp, powdery glass dust! It sticks to suits with static electricity—AND we can melt it in 3D printers to build Moon bricks!',
    detailedText:
      'Lunar regolith coats the bedrock to depths of 4–15 meters. Rich in silicon, oxygen, iron, calcium, aluminum, and titanium, it serves as both a hazard to seals and solar arrays and a primary construction feedstock for sintered landing pads and radiation shielding.',
    nasaFact: 'Apollo 17 commander Gene Cernan said lunar dust was one of the biggest challenges of working on the Moon!',
    sourceUrl: 'https://science.nasa.gov/moon/',
    sourceLabel: 'NASA Science: Moon (general reference)',
    starterUnlocked: true,
  },
  {
    id: 'codex_solar_illumination',
    title: 'Solar Illumination & Temperature Swings',
    category: 'Solar Illumination',
    shortSummary: 'Blazing +120°C in direct sun, freezing -130°C at night, and -246°C in polar craters!',
    kidFriendlyText:
      'Without air to hold heat like a cozy blanket, the Moon has extreme temperatures! Where the Sun shines straight down, rocks heat up hotter than boiling water (+120°C). At night it drops to -130°C! At the South Pole, tall crater rims stay sunny almost all year, making great spots for solar panels.',
    detailedText:
      'Because the Moon has only a 1.54° axial tilt, polar peaks such as Shackleton Crater Rim experience near-continuous grazing sunlight (Peaks of Eternal Light), while nearby crater floors remain in permanent shadow at ~27–40 Kelvin (-246°C to -233°C).',
    nasaFact: 'NASA’s Lunar Reconnaissance Orbiter mapped polar illumination so Artemis crews can park near steady solar power!',
    sourceUrl: 'https://ode.rsl.wustl.edu/moon/',
    sourceLabel: 'Lunar Orbital Data Explorer (hosts LRO data)',
  },
  {
    id: 'codex_radiation',
    title: 'Space Radiation & Regolith Shielding',
    category: 'Radiation',
    shortSummary: 'Why habitats use thick Moon dirt roofs to block solar storms.',
    kidFriendlyText:
      'Space is full of invisible super-fast particles zooming from the Sun and distant stars. On Earth, our sky and magnetic field protect us. On the Moon, astronauts need thick spacesuits, Radiation Shelters, and 2-meter-thick Moon-dirt roofs piled on top of their homes to stay safe during solar flares!',
    detailedText:
      'Galactic Cosmic Rays (GCRs) and Solar Particle Events (SPEs) pose biological risks during long lunar stays. Compacted regolith or water walls provide dense atomic mass that attenuates energetic protons before they reach living quarters.',
    nasaFact: 'Artemis I carried mannequins Helga and Zohar inside Orion with thousands of radiation sensors to measure crew safety!',
    sourceUrl: 'https://pds.nasa.gov/',
    sourceLabel: 'NASA Planetary Data System (archive home)',
  },
  {
    id: 'codex_water_ice',
    title: 'Water Ice in Permanently Shadowed Craters',
    category: 'Water Ice',
    shortSummary: 'Ancient frozen water hidden inside freezing polar shadows.',
    kidFriendlyText:
      'You will not find lakes or rivers on the Moon, and water ice cannot survive in warm sunlight. Instead, frozen water ice hides in super-cold crater bottoms near the South Pole that NEVER see the Sun! Finding that ice is huge: astronauts can melt it to drink, split it for oxygen, and even make rocket fuel!',
    detailedText:
      'Confirmed by NASA’s LCROSS impactor and Chandrayaan-1 M3 spectrometer data, volatiles including water ice exist in Permanently Shadowed Regions (PSRs). Extracting water ice in-situ saves hauling heavy water tanks from Earth.',
    nasaFact: 'Launching just 1 liter of water from Earth to the Moon costs thousands of dollars—mining Moon ice changes everything!',
    sourceUrl: 'https://science.nasa.gov/mission/lcross/',
    sourceLabel: 'NASA LCROSS Mission',
  },
  {
    id: 'codex_oxygen_production',
    title: 'Oxygen Production: Breathing on the Moon',
    category: 'Oxygen Production',
    shortSummary: 'Extracting breathable O2 from Moon minerals and water ice.',
    kidFriendlyText:
      'There is zero breathable air outside on the Moon! Inside your pressurized dome and spacesuit, Oxygen Generators work nonstop. They can use electricity to split water (H2O) into oxygen gas, or bake oxygen-rich Moon rocks like ilmenite to release trapped oxygen atoms!',
    detailedText:
      'In-Situ Resource Utilization (ISRU) experiments test molten regolith electrolysis and hydrogen reduction of ilmenite (FeTiO3) to generate continuous O2 for crew respiration and oxidizer.',
    nasaFact: 'Even though the Moon looks dry and dusty, nearly half the weight of Moon rocks is chemically locked oxygen!',
    sourceUrl: 'https://science.nasa.gov/moon/',
    sourceLabel: 'NASA Science: Moon (general reference)',
  },
  {
    id: 'codex_water_recycling',
    title: 'Water Recycling: Every Drop Counts',
    category: 'Water Recycling',
    shortSummary: 'Space colonies recycle up to 98% of their water—just like the Space Station!',
    kidFriendlyText:
      'Nothing goes to waste in space! A Water Recycler catches moisture from astronauts’ breath, sweat, hand-washing, and greenhouse plants, filters it super clean, and turns it back into fresh drinking water. On the International Space Station, astronauts say: "Today’s coffee is tomorrow’s coffee!"',
    detailedText:
      'Closed-loop Environmental Control and Life Support Systems (ECLSS) use multifiltration beds, catalytic oxidizers, and vacuum distillation to achieve ~98% water recovery efficiency.',
    nasaFact: 'Water recycled aboard the International Space Station is actually purer than most city tap water on Earth!',
    sourceUrl: 'https://science.nasa.gov/moon/',
    sourceLabel: 'NASA Science: Moon (general reference)',
  },
  {
    id: 'codex_greenhouse_systems',
    title: 'Greenhouse Systems: Growing Moon Crops',
    category: 'Greenhouse Systems',
    shortSummary: 'Hydroponic domes grow fresh food while plants scrub CO2 into oxygen.',
    kidFriendlyText:
      'Astronauts love fresh crunchy food! Inside lunar Greenhouses, fast-growing dwarf plants, lettuce, radishes, and wheat grow in nutrient-rich water (hydroponics) under glowing LED lights. As plants grow, they drink up the carbon dioxide we breathe out and make fresh oxygen in return!',
    detailedText:
      'Controlled Environment Agriculture (CEA) optimizes red/blue LED spectra, humidity recovery, and root-zone aeration so crews can produce nutritious calories using minimal water and electrical power.',
    nasaFact: 'Astronauts have already grown and eaten space radishes, chili peppers, and zinnia flowers aboard the ISS!',
    sourceUrl: 'https://science.nasa.gov/moon/',
    sourceLabel: 'NASA Science: Moon (general reference)',
  },
  {
    id: 'codex_lunar_history',
    title: 'Lunar Exploration History: Apollo to Artemis',
    category: 'Exploration History',
    shortSummary: 'From the first footprints in 1969 to building lasting Moon bases today.',
    kidFriendlyText:
      'In 1969, Apollo 11 astronauts Neil Armstrong and Buzz Aldrin became the first humans to walk on the Moon while Michael Collins orbited above. Twelve Apollo astronauts explored the Moon through 1972. Today, NASA’s Artemis program is returning to the South Pole to learn how to live and work on another world!',
    detailedText:
      'Apollo 11 through 17 returned 382 kg (842 lbs) of lunar rocks that transformed planetary science. Modern missions—including LRO, Artemis, and international partners—focus on sustainable South Pole exploration near water ice deposits.',
    nasaFact: 'Apollo astronauts drove the battery-powered Lunar Roving Vehicle up to 35.9 km across lunar valleys and hills!',
    sourceUrl: 'https://science.nasa.gov/moon/',
    sourceLabel: 'NASA Science: Moon (general reference)',
    starterUnlocked: true,
  },
  {
    id: 'codex_space_animals',
    title: 'Space Animals & Biological Experiments',
    category: 'Space Biology',
    shortSummary: 'Meet Tardigrades ("water bears") and the brave critters that helped science!',
    kidFriendlyText:
      'Before astronauts flew to space, brave animal explorers like monkeys (Able & Baker), dogs, and tortoises (on Zond 5, which looped around the Moon in 1968!) helped scientists test space safety. And tiny eight-legged Tardigrades—nicknamed "water bears"—can survive freezing cold, vacuum, and radiation!',
    detailedText:
      'Biological payloads remain vital to deep-space science: Artemis I carried yeast, fungi, algae, and plant seeds around the Moon to study how deep-space radiation affects DNA and cell repair before long human missions.',
    nasaFact: 'In 1968, two tortoises orbited the Moon aboard Zond 5 and returned safely to Earth—inspiring Shelldon in MOONBOUND!',
    sourceUrl: 'https://science.nasa.gov/moon/',
    sourceLabel: 'NASA Science: Moon (general reference)',
    starterUnlocked: true,
  },
];

export interface ResearchNode {
  id: string;
  name: string;
  category: 'power' | 'life_support' | 'shielding' | 'science';
  costResearchData: number;
  summary: string;
  scienceTakeaway: string;
  unlocksBlueprint?: string;
  unlocksBlueprints?: string[];
  bonusEffect: string;
}

export const RESEARCH_NODES: ResearchNode[] = [
  {
    id: 'res_hydroponics',
    name: 'LED Hydroponic Farming',
    category: 'life_support',
    costResearchData: 6,
    summary: 'Unlocks the Greenhouse blueprint so astronauts can grow fresh food and recycle air.',
    scienceTakeaway: 'Plants use red & blue LED light to turn CO2 + water into food and O2!',
    unlocksBlueprint: 'greenhouse',
    unlocksBlueprints: ['greenhouse'],
    bonusEffect: 'Unlocks Greenhouse Blueprint',
  },
  {
    id: 'res_closed_loop',
    name: 'Closed-Loop Water Recovery',
    category: 'life_support',
    costResearchData: 8,
    summary: 'Unlocks the Water Recycler to recover 98% of colony moisture and humidity.',
    scienceTakeaway: 'Filtering & distilling every drop keeps crews alive without Earth deliveries.',
    unlocksBlueprint: 'water_recycler',
    unlocksBlueprints: ['water_recycler'],
    bonusEffect: 'Unlocks Water Recycler Blueprint',
  },
  {
    id: 'res_rover_mobility',
    name: '1/6th-G Rover Suspension',
    category: 'science',
    costResearchData: 10,
    summary: 'Unlocks Rover Garage & Craft upgrades and maps cold-trap craters safely.',
    scienceTakeaway: 'Wire-mesh wheels grip fluffy regolith without popping in hard vacuum!',
    unlocksBlueprint: 'rover',
    unlocksBlueprints: ['rover'],
    bonusEffect: 'Unlocks Rover Blueprint',
  },
  {
    id: 'res_regolith_shield',
    name: 'Regolith Radiation Vaults',
    category: 'shielding',
    costResearchData: 10,
    summary: 'Unlocks the Radiation Shelter to keep crew safe during solar particle storms.',
    scienceTakeaway: '2+ meters of packed Moon dirt blocks high-energy solar storm particles.',
    unlocksBlueprint: 'radiation_shelter',
    unlocksBlueprints: ['radiation_shelter'],
    bonusEffect: 'Unlocks Radiation Shelter Blueprint',
  },
  {
    id: 'res_ore_refining',
    name: 'Ilmenite Ore Smelting',
    category: 'power',
    costResearchData: 12,
    summary: 'Unlocks the Processing Facility & Research Lab for advanced lunar construction.',
    scienceTakeaway: 'Smelting basalt ore extracts iron, silicon, and oxygen right on site.',
    unlocksBlueprint: 'processing_facility',
    unlocksBlueprints: ['processing_facility', 'research_lab'],
    bonusEffect: 'Unlocks Processing Facility & Research Lab',
  },
  {
    id: 'res_deep_space_comms',
    name: 'Deep Space Network Relay',
    category: 'science',
    costResearchData: 12,
    summary: 'Unlocks the High-Gain Communication Tower & Medical Station.',
    scienceTakeaway: 'Line-of-sight dishes beam telemetry 384,400 km back to Earth!',
    unlocksBlueprint: 'communication_tower',
    unlocksBlueprints: ['communication_tower', 'medical_station'],
    bonusEffect: 'Unlocks Comms Tower & Medical Station',
  },
];
