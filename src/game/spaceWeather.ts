/**
 * MOONBOUND Space Weather & Crew Radiation
 *
 * The solar storms in this game are REAL events from NASA's Space Weather
 * Database Of Notifications, Knowledge, Information (DONKI). The game tries to
 * load recent flares live (server proxy first, then api.nasa.gov directly). If
 * that fails it uses the curated archive below, and the UI says "archived"
 * instead of pretending the data is live.
 *
 * Radiation numbers are anchored to published measurements and NASA limits
 * (see RADIATION_FACTS). Storm doses are simplified GAME ESTIMATES, scaled so a
 * strong storm with no shielding stays under NASA's 250 mSv per-event limit.
 */

export type StormSeverity = 'minor' | 'moderate' | 'strong';

export interface SpaceWeatherEvent {
  id: string;
  /** ISO date of the flare peak (UTC) */
  date: string;
  /** Peak time, UTC, as text for display */
  peakTimeUTC: string;
  flareClass: string;
  activeRegion?: string;
  severity: StormSeverity;
  sourceLabel: string;
  sourceUrl: string;
  /** true only when fetched from DONKI during this session */
  live: boolean;
  fetchedAt?: string;
}

/**
 * Curated, verified real events (all X-class flares from Solar Cycle 25).
 * Times come from NASA Scientific Visualization Studio and NASA's
 * Solar Cycle 25 blog. NASA DONKI catalogs each of these flares.
 */
export const ARCHIVED_SOLAR_EVENTS: SpaceWeatherEvent[] = [
  {
    id: 'flr-2024-05-11-x5.8',
    date: '2024-05-11T01:23:00Z',
    peakTimeUTC: 'May 11, 2024 · 01:23 UTC',
    flareClass: 'X5.8',
    activeRegion: 'AR 13664',
    severity: 'strong',
    sourceLabel: 'NASA SVS: Strong Solar Flare Activity, May 10–14, 2024',
    sourceUrl: 'https://svs.gsfc.nasa.gov/14589',
    live: false,
  },
  {
    id: 'flr-2024-05-11-x1.5',
    date: '2024-05-11T11:44:00Z',
    peakTimeUTC: 'May 11, 2024 · 11:44 UTC',
    flareClass: 'X1.5',
    activeRegion: 'AR 13664',
    severity: 'moderate',
    sourceLabel: 'NASA SVS: Strong Solar Flare Activity, May 10–14, 2024',
    sourceUrl: 'https://svs.gsfc.nasa.gov/14589',
    live: false,
  },
  {
    id: 'flr-2024-05-14-x1.7',
    date: '2024-05-14T02:09:00Z',
    peakTimeUTC: 'May 14, 2024 · 02:09 UTC',
    flareClass: 'X1.7',
    severity: 'moderate',
    sourceLabel: 'NASA SVS: Strong Solar Flare Activity, May 10–14, 2024',
    sourceUrl: 'https://svs.gsfc.nasa.gov/14589',
    live: false,
  },
  {
    id: 'flr-2024-05-14-x1.2',
    date: '2024-05-14T12:55:00Z',
    peakTimeUTC: 'May 14, 2024 · 12:55 UTC',
    flareClass: 'X1.2',
    severity: 'moderate',
    sourceLabel: 'NASA SVS: Strong Solar Flare Activity, May 10–14, 2024',
    sourceUrl: 'https://svs.gsfc.nasa.gov/14589',
    live: false,
  },
  {
    id: 'flr-2024-10-03-x9.0',
    date: '2024-10-03T12:18:00Z',
    peakTimeUTC: 'Oct 3, 2024 · 12:18 UTC (8:18 a.m. ET)',
    flareClass: 'X9.0',
    activeRegion: 'AR 13842',
    severity: 'strong',
    sourceLabel: 'NASA Solar Cycle 25 blog: Sun Releases Strong Solar Flare (Oct 3, 2024)',
    sourceUrl: 'https://science.nasa.gov/blogs/solar-cycle-25/2024/10/03/sun-releases-strong-solar-flare-6',
    live: false,
  },
];

/** Real reference numbers used by the game, with where they come from. */
export const RADIATION_FACTS = {
  lunarSurfaceDailyMSv: 1.369,
  lunarSurfaceSource: {
    label: 'Zhang et al. 2020, Science Advances: Chang’e-4 Lunar Lander Neutron & Dosimetry (LND)',
    url: 'https://www.sci.news/space/radiation-dose-rates-lunar-surface-08893.html',
    note: 'Measured 1,369 µSv per day on the lunar surface: about 2.6× the cosmic-ray dose inside the ISS.',
  },
  careerLimitMSv: 600,
  perEventLimitMSv: 250,
  nasaLimitSource: {
    label: 'NASA OCHMO Radiation Protection Technical Brief (NASA-STD-3001)',
    url: 'https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf',
    note: 'Career limit: under 600 mSv. A solar particle event must stay under 250 mSv. A storm shelter with ~10 cm of water-equivalent shielding is recommended for big events.',
  },
  marsMay2024MicroGy: 8100,
  marsMay2024ChestXrays: 30,
  marsSource: {
    label: 'NASA/JPL (June 10, 2024): NASA Watches Mars Light Up During Epic Solar Storm',
    url: 'https://www.nasa.gov/?p=670127',
    note: 'Curiosity’s RAD instrument: an astronaut beside the rover on May 20, 2024 would have received 8,100 micrograys, about 30 chest X-rays.',
  },
} as const;

export const DONKI_INFO = {
  label: 'NASA DONKI: Space Weather Database Of Notifications, Knowledge, Information',
  url: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
  apiUrl: 'https://api.nasa.gov/',
};

// ---------------------------------------------------------------------------
// Game tuning (all in SIMULATION seconds; the colony sim advances 0.5 sim-s per real second)
// ---------------------------------------------------------------------------

export const SIM_SECONDS_PER_REAL_SECOND = 0.5;
/** One lunar day (sunrise to sunrise) is 480 sim-s and 29.5 Earth days long. */
export const SIM_SECONDS_PER_EARTH_DAY = 480 / 29.5;
export const BACKGROUND_DOSE_PER_SIM_SECOND =
  RADIATION_FACTS.lunarSurfaceDailyMSv / SIM_SECONDS_PER_EARTH_DAY;

export const STORM_WARNING_SECONDS = 20; // 40 real seconds to decide
export const STORM_ACTIVE_SECONDS = 25; // 50 real seconds
export const FIRST_STORM_DELAY = 60; // ~2 real minutes after reaching the surface
export const STORM_INTERVAL_MIN = 110;
export const STORM_INTERVAL_SPREAD = 70;

/** Dose the crew would take with NO shielding (game estimate). */
export const STORM_DOSE_MSV: Record<StormSeverity, number> = {
  minor: 30,
  moderate: 80,
  strong: 160,
};

export const REGOLITH_WALL_COST = 6;
export const KEEP_WORKING_RESEARCH_BONUS = 5;

export type StormChoice = 'shelter' | 'regolith_wall' | 'keep_working' | 'none';
export type ShelterKind = 'radiation_shelter' | 'habitat' | 'lander';

export const SHELTER_FACTOR: Record<ShelterKind, number> = {
  radiation_shelter: 0.1,
  habitat: 0.35,
  lander: 0.6,
};
export const REGOLITH_WALL_FACTOR = 0.5;

export interface StormState {
  event: SpaceWeatherEvent;
  phase: 'warning' | 'active' | 'debrief';
  timeLeft: number;
  choice?: StormChoice;
  shelterKind?: ShelterKind;
  /** dose the storm will deliver over the active phase, fixed when chosen */
  plannedDose: number;
  doseTaken: number;
  foodLost: number;
}

export interface RadiationState {
  crewDoseMSv: number;
  stormCount: number;
  nextStormIn: number;
  seed: number;
  missionOver: boolean;
  history: { eventId: string; flareClass: string; choice: StormChoice; dose: number }[];
}

export function createRadiationState(seed: number): RadiationState {
  return {
    crewDoseMSv: 0,
    stormCount: 0,
    nextStormIn: FIRST_STORM_DELAY,
    seed: Math.abs(Math.floor(seed)) % 1_000_000_007,
    missionOver: false,
    history: [],
  };
}

/** Small deterministic hash so storms vary per campaign but replay identically. */
export function hash32(a: number, b: number): number {
  let h = (a ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (b + 0x7f4a7c15), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

export function severityFromClass(flareClass: string): StormSeverity {
  const letter = flareClass.trim().charAt(0).toUpperCase();
  const mag = parseFloat(flareClass.slice(1)) || 1;
  if (letter === 'X') return mag >= 5 ? 'strong' : 'moderate';
  return 'minor';
}

export function pickStormEvent(
  pool: SpaceWeatherEvent[],
  seed: number,
  stormCount: number
): SpaceWeatherEvent {
  const list = pool.length > 0 ? pool : ARCHIVED_SOLAR_EVENTS;
  // Live events (if any) come first so the newest real storm is played first.
  const live = list.filter((e) => e.live);
  if (stormCount < live.length) return live[stormCount];
  const idx = (hash32(seed, 101) + stormCount) % list.length;
  return list[idx];
}

export function nextStormDelay(seed: number, stormCount: number): number {
  return STORM_INTERVAL_MIN + (hash32(seed, stormCount + 7) % STORM_INTERVAL_SPREAD);
}

export function avatarOutsideDoseMult(avatarId?: string): number {
  if (avatarId === 'explorer') return 1.25;
  if (avatarId === 'engineer') return 1.15;
  return 1;
}

export function bestShelter(buildingIds: string[]): ShelterKind {
  if (buildingIds.includes('radiation_shelter')) return 'radiation_shelter';
  if (buildingIds.includes('habitat')) return 'habitat';
  return 'lander';
}

export interface StormOption {
  id: Exclude<StormChoice, 'none'>;
  title: string;
  gets: string;
  costs: string;
  estimatedDose: number;
  available: boolean;
  unavailableReason?: string;
}

/** The three choices. Every one of them costs something. */
export function getStormOptions(
  event: SpaceWeatherEvent,
  buildingIds: string[],
  inventory: Record<string, number>,
  avatarId?: string
): StormOption[] {
  const base = STORM_DOSE_MSV[event.severity];
  const outside = avatarOutsideDoseMult(avatarId);
  const shelter = bestShelter(buildingIds);
  const shelterName =
    shelter === 'radiation_shelter'
      ? 'Radiation Shelter'
      : shelter === 'habitat'
      ? 'Habitat (thin walls: only part protection)'
      : 'Lander cabin (very little protection)';
  const regolith = inventory.regolith || 0;
  const shelterDose = round1(base * SHELTER_FACTOR[shelter]);
  const wallDose = round1(base * REGOLITH_WALL_FACTOR * outside);
  const shelterGets =
    shelterDose <= wallDose
      ? `Lowest radiation. Crew waits in the ${shelterName}.`
      : `Some protection. Crew waits in the ${shelterName}. Build a Radiation Shelter for real safety!`;

  return [
    {
      id: 'shelter',
      title: `Hide in the ${shelter === 'radiation_shelter' ? 'Radiation Shelter' : shelter === 'habitat' ? 'Habitat' : 'Lander'}`,
      gets: shelterGets,
      costs: 'Nobody can walk, mine, scan or build until the storm ends. The greenhouse and labs switch off, so no new food grows.',
      estimatedDose: shelterDose,
      available: true,
    },
    {
      id: 'regolith_wall',
      title: 'Pile Moon dirt on the habitat',
      gets: 'Cuts the dose in half and the crew keeps working.',
      costs: `Uses ${REGOLITH_WALL_COST} Regolith you could have built with.`,
      estimatedDose: wallDose,
      available: regolith >= REGOLITH_WALL_COST,
      unavailableReason:
        regolith >= REGOLITH_WALL_COST
          ? undefined
          : `Need ${REGOLITH_WALL_COST} Regolith (you have ${regolith}).`,
    },
    {
      id: 'keep_working',
      title: 'Keep working outside',
      gets: `Nothing stops, and you earn +${KEEP_WORKING_RESEARCH_BONUS} Research Data by measuring the storm.`,
      costs: 'The crew takes the full radiation dose.',
      estimatedDose: round1(base * outside),
      available: true,
    },
  ];
}

export function computePlannedDose(
  event: SpaceWeatherEvent,
  choice: StormChoice,
  shelterKind: ShelterKind,
  avatarId?: string
): number {
  const base = STORM_DOSE_MSV[event.severity];
  const outside = avatarOutsideDoseMult(avatarId);
  if (choice === 'shelter') return base * SHELTER_FACTOR[shelterKind];
  if (choice === 'regolith_wall') return base * REGOLITH_WALL_FACTOR * outside;
  return base * outside; // keep_working or no plan
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Plain-language storm strength for kids. */
export function severityLabel(s: StormSeverity): string {
  return s === 'strong' ? 'STRONG' : s === 'moderate' ? 'MEDIUM' : 'SMALL';
}

// ---------------------------------------------------------------------------
// Live DONKI feed (browser only). Never throws: falls back to the archive.
// ---------------------------------------------------------------------------

export interface SpaceWeatherFeed {
  status: 'live' | 'archived';
  events: SpaceWeatherEvent[];
  fetchedAt?: string;
  note: string;
}

interface DonkiFlare {
  flrID?: string;
  peakTime?: string;
  beginTime?: string;
  classType?: string;
  activeRegionNum?: number | null;
  link?: string;
}

export function mapDonkiFlares(raw: unknown, fetchedAt: string): SpaceWeatherEvent[] {
  if (!Array.isArray(raw)) return [];
  return (raw as DonkiFlare[])
    .filter((f) => typeof f?.classType === 'string' && /^[MX]/i.test(f.classType))
    .map((f) => {
      const when = f.peakTime || f.beginTime || '';
      const d = new Date(when.endsWith('Z') ? when : `${when}Z`);
      const valid = !Number.isNaN(d.getTime());
      return {
        id: f.flrID || `donki-${when}-${f.classType}`,
        date: valid ? d.toISOString() : when,
        peakTimeUTC: valid
          ? `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })} · ${d
              .toISOString()
              .slice(11, 16)} UTC`
          : when,
        flareClass: f.classType as string,
        activeRegion: f.activeRegionNum ? `AR ${f.activeRegionNum}` : undefined,
        severity: severityFromClass(f.classType as string),
        sourceLabel: 'NASA DONKI flare record (live)',
        sourceUrl: f.link || DONKI_INFO.url,
        live: true,
        fetchedAt,
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 6);
}

export async function loadSpaceWeatherFeed(): Promise<SpaceWeatherFeed> {
  const archived: SpaceWeatherFeed = {
    status: 'archived',
    events: ARCHIVED_SOLAR_EVENTS,
    note: 'Could not reach NASA DONKI right now, so the game uses real archived NASA flare records.',
  };
  if (typeof fetch === 'undefined') return archived;

  const end = new Date();
  const start = new Date(end.getTime() - 30 * 24 * 3600 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const urls = [
    `/api/space-weather?startDate=${fmt(start)}&endDate=${fmt(end)}`,
    `https://api.nasa.gov/DONKI/FLR?startDate=${fmt(start)}&endDate=${fmt(end)}&api_key=DEMO_KEY`,
  ];

  for (const url of urls) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) continue;
      const body = await res.json();
      const raw = Array.isArray(body) ? body : body?.flares;
      const fetchedAt = new Date().toISOString();
      const live = mapDonkiFlares(raw, fetchedAt);
      if (live.length > 0) {
        return {
          status: 'live',
          events: [...live, ...ARCHIVED_SOLAR_EVENTS],
          fetchedAt,
          note: `Loaded ${live.length} recent M/X-class flares from NASA DONKI (last 30 days).`,
        };
      }
      if (Array.isArray(raw)) {
        return {
          ...archived,
          fetchedAt,
          note: 'NASA DONKI answered, but there were no big (M or X) flares in the last 30 days. Using real archived storms instead.',
        };
      }
    } catch {
      // try the next source
    }
  }
  return archived;
}
