import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARCHIVED_SOLAR_EVENTS,
  RADIATION_FACTS,
  STORM_DOSE_MSV,
  STORM_WARNING_SECONDS,
  STORM_ACTIVE_SECONDS,
  FIRST_STORM_DELAY,
  getStormOptions,
  mapDonkiFlares,
  pickStormEvent,
  severityFromClass,
} from './spaceWeather';
import {
  createInitialSimulationState,
  tickSimulation,
  chooseStormResponse,
  acknowledgeStormDebrief,
  SimulationState,
  solveColonyProblem,
} from './simulation';
import { canAffordBuilding, researchMultiplier, AVATARS } from './economy';

const ON = { onSurface: true };

function run(state: SimulationState, simSeconds: number, avatarId?: string, opts = ON) {
  let s = state;
  for (let t = 0; t < simSeconds; t += 0.5) s = tickSimulation(s, 0.5, avatarId, undefined, opts);
  return s;
}

function toWarning(seed = 42, avatarId?: string) {
  const s = run(createInitialSimulationState(seed), FIRST_STORM_DELAY + 0.5, avatarId);
  assert.equal(s.storm?.phase, 'warning');
  return s;
}

test('Data: archive holds verified real X-class flares with NASA sources', () => {
  assert.ok(ARCHIVED_SOLAR_EVENTS.length >= 5);
  for (const e of ARCHIVED_SOLAR_EVENTS) {
    assert.match(e.flareClass, /^X\d/);
    assert.match(e.sourceUrl, /nasa\.gov/);
    assert.equal(e.live, false, 'archived events must never be labelled live');
  }
  assert.equal(RADIATION_FACTS.careerLimitMSv, 600);
  assert.ok(STORM_DOSE_MSV.strong < RADIATION_FACTS.perEventLimitMSv);
});

test('Data: DONKI flare JSON maps to live events (M/X only), newest first', () => {
  const mapped = mapDonkiFlares(
    [
      { flrID: 'a', peakTime: '2026-11-01T10:00Z', classType: 'C3.2' },
      { flrID: 'b', peakTime: '2026-11-02T10:00Z', classType: 'M2.1', activeRegionNum: 14000 },
      { flrID: 'c', peakTime: '2026-11-05T08:30Z', classType: 'X1.1' },
    ],
    '2026-11-12T00:00:00Z'
  );
  assert.deepEqual(mapped.map((m) => m.id), ['c', 'b']);
  assert.equal(mapped[0].live, true);
  assert.equal(mapped[1].severity, 'minor');
  assert.equal(mapped[1].activeRegion, 'AR 14000');
  assert.deepEqual(mapDonkiFlares({ error: 'x' }, 'now'), []);
});

test('Storms: severity follows flare class', () => {
  assert.equal(severityFromClass('X9.0'), 'strong');
  assert.equal(severityFromClass('X1.2'), 'moderate');
  assert.equal(severityFromClass('M5.0'), 'minor');
});

test('Storms: nothing happens before the crew is on the Moon', () => {
  const s = run(createInitialSimulationState(1), 200, undefined, { onSurface: false });
  assert.equal(s.storm, null);
  assert.equal(s.radiation?.crewDoseMSv, 0);
});

test('Radiation: background dose matches Chang’e-4 rate (1.369 mSv per Earth day)', () => {
  const earthDay = 480 / 29.5;
  const s = run(createInitialSimulationState(1), earthDay);
  assert.ok(Math.abs((s.radiation?.crewDoseMSv || 0) - 1.369) < 0.1);
});

test('Storms: same seed gives the same storm; different seeds can differ (replayability)', () => {
  const a = toWarning(7).storm!.event.id;
  const b = toWarning(7).storm!.event.id;
  assert.equal(a, b);
  const ids = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((seed) => pickStormEvent(ARCHIVED_SOLAR_EVENTS, seed, 0).id));
  assert.ok(ids.size > 1);
});

test('Storms: every option costs something (no free safe choice)', () => {
  const s = toWarning(3);
  const opts = getStormOptions(s.storm!.event, ['habitat'], { regolith: 10 });
  assert.equal(opts.length, 3);
  for (const o of opts) {
    assert.ok(o.costs.length > 10, `${o.id} must state a cost`);
    assert.ok(o.estimatedDose > 0, `${o.id} still has some dose`);
  }
  const doses = Object.fromEntries(opts.map((o) => [o.id, o.estimatedDose]));
  assert.ok(doses.shelter < doses.regolith_wall && doses.regolith_wall < doses.keep_working);
});

test('Storms: shelter lowers dose but stops food production', () => {
  let s = toWarning(11);
  s.buildings.push(
    { instanceId: 'h', recipeId: 'radiation_shelter', x: 0, y: 0, status: 'active', health: 100, dustAccumulation: 0 },
    { instanceId: 'g', recipeId: 'greenhouse', x: 100, y: 0, status: 'active', health: 100, dustAccumulation: 0 },
    { instanceId: 'p', recipeId: 'solar_panel', x: 200, y: 0, status: 'active', health: 100, dustAccumulation: 0 }
  );
  const before = s.radiation!.crewDoseMSv;
  const r = chooseStormResponse(s, { regolith: 0 }, 'shelter');
  assert.equal(r.ok, true);
  s = run(r.simulation, STORM_WARNING_SECONDS + STORM_ACTIVE_SECONDS + 1);
  assert.equal(s.storm?.phase, 'debrief');
  const full = STORM_DOSE_MSV[s.storm!.event.severity];
  assert.ok(s.storm!.doseTaken <= full * 0.1 + 0.2, 'shelter blocks ~90%');
  assert.ok(s.storm!.foodLost > 0, 'greenhouse was off');
  assert.ok(s.radiation!.crewDoseMSv > before);
  assert.equal(s.radiation!.history.length, 1);
  const cleared = acknowledgeStormDebrief(s);
  assert.equal(cleared.storm, null);
});

test('Storms: regolith wall spends Regolith; keep working gives research but full dose', () => {
  const s = toWarning(5);
  const noDirt = chooseStormResponse(s, { regolith: 2 }, 'regolith_wall');
  assert.equal(noDirt.ok, false);
  const wall = chooseStormResponse(s, { regolith: 9 }, 'regolith_wall');
  assert.equal(wall.inventory.regolith, 3);
  const work = chooseStormResponse(s, { researchData: 1 }, 'keep_working');
  assert.equal(work.inventory.researchData, 6);
  assert.ok(work.simulation.storm!.plannedDose > wall.simulation.storm!.plannedDose);
  const again = chooseStormResponse(work.simulation, {}, 'shelter');
  assert.equal(again.ok, false, 'cannot change plan once chosen');
});

test('Storms: no plan in time means the full dose', () => {
  let s = toWarning(9);
  s = run(s, STORM_WARNING_SECONDS + STORM_ACTIVE_SECONDS + 1);
  assert.equal(s.storm?.choice, 'none');
  assert.ok(Math.abs(s.storm!.doseTaken - STORM_DOSE_MSV[s.storm!.event.severity]) < 1);
});

test('Radiation: reaching NASA’s 600 mSv career limit ends the mission', () => {
  const s = createInitialSimulationState(2);
  s.radiation!.crewDoseMSv = 599.99;
  const next = run(s, 1);
  assert.equal(next.radiation!.missionOver, true);
});

test('Specialists: perks come with costs', () => {
  for (const a of Object.values(AVATARS)) assert.ok(a.tradeoff.length > 5, `${a.id} needs a trade-off`);
  assert.equal(researchMultiplier('scientist'), 1.5);
  assert.equal(researchMultiplier('technician'), 0.75);
  assert.equal(canAffordBuilding({ silicon: 2, metalOre: 2 }, 100, 'solar_panel', 'medic').finalCost, 28);
  const s = toWarning(4, 'explorer');
  const ex = getStormOptions(s.storm!.event, [], { regolith: 9 }, 'explorer');
  const base = getStormOptions(s.storm!.event, [], { regolith: 9 });
  assert.ok(ex[2].estimatedDose > base[2].estimatedDose);
});

test('Alerts: dust fixes cost power or dose; the hose myth wastes water', () => {
  const s = createInitialSimulationState(1);
  s.resources.powerStored = 20;
  s.buildings.push({ instanceId: 'p', recipeId: 'solar_panel', x: 0, y: 0, status: 'active', health: 100, dustAccumulation: 80 });
  const t = tickSimulation(s, 0.5);
  assert.ok(t.activeEvents.some((e) => e.id === 'solar_dust_alert'));
  const brush = solveColonyProblem(t, 'solar_dust_alert', 'brush_panels');
  assert.ok(brush.nextState.resources.powerStored < t.resources.powerStored);
  const hand = solveColonyProblem(t, 'solar_dust_alert', 'hand_clean');
  assert.ok(hand.nextState.radiation!.crewDoseMSv > t.radiation!.crewDoseMSv);
  const hose = solveColonyProblem(t, 'solar_dust_alert', 'wash_with_hose');
  assert.equal(hose.solved, false);
  assert.equal(hose.nextState.resources.water, t.resources.water - 5);
});

test('Storms: "Lowest radiation" is only promised when it is true', () => {
  const e = ARCHIVED_SOLAR_EVENTS.find((x) => x.severity === 'strong')!;
  const noShelter = getStormOptions(e, [], { regolith: 9 });
  assert.ok(noShelter[0].estimatedDose > noShelter[1].estimatedDose);
  assert.doesNotMatch(noShelter[0].gets, /Lowest/);
  const withShelter = getStormOptions(e, ['radiation_shelter'], { regolith: 9 });
  assert.match(withShelter[0].gets, /Lowest/);
});
