import test from 'node:test';
import assert from 'node:assert/strict';
import { createNewGameSave, migrateSave, GameSaveData } from './saveSystem';
import {
  applyGameEvent,
  completeCurrentPhase,
  getMissionGuide,
  isPhaseReady,
  missingMaterialsMessage,
  restartCurrentPhase,
  scansInPhase,
  GameEvent,
} from './progression';

function run(save: GameSaveData, events: GameEvent[]) {
  let s = save;
  for (const e of events) s = applyGameEvent(s, e).save;
  return s;
}

function rich(save: GameSaveData): GameSaveData {
  return { ...save, inventory: { ...save.inventory, regolith: 99, metalOre: 99, silicon: 99, seeds: 9 }, spaceDollars: 9999 };
}

function finishFlight(save: GameSaveData) {
  const ids = [
    ['select_crew', 'inspect_manifest', 'ready_launch'],
    ['solar_array_deploy', 'orbital_burn'],
    ['star_nav', 'radiation_check'],
    ['site_survey', 'select_target'],
    ['terminal_guidance', 'engine_shutdown'],
  ];
  let s = save;
  for (const group of ids) {
    s = run(s, group.map((objective) => ({ type: 'flight', objective }) as GameEvent));
    const r = completeCurrentPhase(s);
    assert.equal(r.ok, true, `flight phase ${s.currentPhaseIndex} should complete`);
    s = r.save;
  }
  return s;
}

let n = 0;
const build = (recipeId: string, x = 0, y = 0, sunFactor = 1): GameEvent => ({
  type: 'build',
  recipeId,
  x: x + n * 100,
  y,
  sunFactor,
  instanceId: `b${++n}`,
});

test('Progression: a briefing click cannot complete a mission', () => {
  const s = createNewGameSave();
  const r = completeCurrentPhase(s);
  assert.equal(r.ok, false);
  assert.equal(r.save.currentPhaseIndex, 0);
  assert.equal(r.save.spaceDollars, s.spaceDollars);
});

test('Progression: flight tasks complete phases and pay each reward once', () => {
  const s = finishFlight(createNewGameSave());
  assert.equal(s.currentPhaseIndex, 5);
  assert.equal(s.spaceDollars, 150 + 50 + 50 + 60 + 70 + 80);
  assert.deepEqual(s.progress.rewardsClaimed, ['mission_prep', 'orbit', 'outbound_journey', 'navigation', 'braking_and_landing']);
});

test('Progression: surface intro must be finished before the Outpost mission can end', () => {
  let s = rich(finishFlight(createNewGameSave()));
  s = run(s, [build('habitat'), build('solar_panel'), build('battery'), build('oxygen_generator'), { type: 'activate', recipeId: 'oxygen_generator' }]);
  assert.equal(isPhaseReady(s), false, 'tutorial not finished yet');
  assert.equal(getMissionGuide(s).current.text.startsWith('Step off'), true);
  s = run(s, [{ type: 'walkedOffLander' }]);
  assert.equal(getMissionGuide(s).current.text, 'Open the supply crate');
  s = run(s, [{ type: 'collect', nodeId: 'crate-1', nodeType: 'crate', amount: 0, usesLeft: 0 }]);
  assert.equal(s.progress.tutorialStep, 2);
  assert.equal(isPhaseReady(s), true);
});

test('Progression: shady solar panels do not count, oxygen needs hands-on setup', () => {
  let s = rich(finishFlight(createNewGameSave()));
  s = run(s, [{ type: 'skipTutorial' }, build('habitat'), build('solar_panel', 0, 0, 0.35), build('battery'), build('oxygen_generator')]);
  const obj = (id: string) => s.phases[5].objectives.find((o) => o.id === id)!.completed;
  assert.equal(obj('build_habitat'), true);
  assert.equal(obj('build_power'), false, 'shady panel');
  assert.equal(obj('activate_o2'), false, 'not connected yet');
  assert.equal(s.simulation.buildings.find((b) => b.recipeId === 'oxygen_generator')!.online, false);
  s = run(s, [build('solar_panel', 0, 0, 1), { type: 'activate', recipeId: 'oxygen_generator' }]);
  assert.equal(isPhaseReady(s), true);
  assert.equal(s.simulation.buildings.find((b) => b.recipeId === 'oxygen_generator')!.online, undefined);
});

test('Progression: building without materials gives a specific message and changes nothing', () => {
  const s: GameSaveData = { ...finishFlight(createNewGameSave()), avatarId: 'scientist', inventory: { regolith: 5, metalOre: 2, silicon: 0 } };
  assert.equal(missingMaterialsMessage(s, 'habitat'), 'Not enough metal. Find 2 more pieces of metal.');
  const r = applyGameEvent(s, build('habitat'));
  assert.equal(r.save, s);
  assert.equal(r.effects[0].kind, 'error');
});

test('Progression: scanning the same rock twice counts once, and only scans in this mission count', () => {
  let s = rich(finishFlight(createNewGameSave()));
  s = run(s, [{ type: 'scan', nodeIds: ['reg-1', 'met-1'] }]); // scanned during Outpost
  s = { ...s, currentPhaseIndex: 6 };
  assert.equal(scansInPhase(s, 6), 0);
  s = run(s, [{ type: 'scan', nodeIds: ['reg-1'] }, { type: 'scan', nodeIds: ['reg-1'] }, { type: 'scan', nodeIds: ['met-1'] }]);
  assert.equal(scansInPhase(s, 6), 2);
  assert.equal(s.phases[6].objectives.find((o) => o.id === 'scan_crater')!.completed, false);
  s = run(s, [{ type: 'scan', nodeIds: ['sil-1'] }]);
  assert.equal(s.phases[6].objectives.find((o) => o.id === 'scan_crater')!.completed, true);
});

test('Progression: ice samples only count from the Uncover mission on', () => {
  let s = rich(finishFlight(createNewGameSave()));
  s = run(s, [{ type: 'collect', nodeId: 'ice-1', nodeType: 'waterIce', amount: 2, usesLeft: 0 }]);
  assert.equal(s.progress.counters.iceSamples || 0, 0);
  s = { ...s, currentPhaseIndex: 6 };
  s = run(s, ['ice-2', 'ice-3', 'ice-4'].map((id) => ({ type: 'collect', nodeId: id, nodeType: 'waterIce', amount: 2, usesLeft: 0 }) as GameEvent));
  assert.equal(s.progress.counters.iceSamples, 3);
  assert.equal(s.phases[6].objectives.find((o) => o.id === 'discover_ice')!.completed, true);
});

function playWholeCampaign() {
  let s = rich(finishFlight(createNewGameSave()));
  s = run(s, [{ type: 'skipTutorial' }, build('habitat'), build('solar_panel'), build('battery'), build('oxygen_generator'), { type: 'activate', recipeId: 'oxygen_generator' }]);
  let r = completeCurrentPhase(s);
  assert.equal(r.ok, true);
  s = r.save;
  assert.equal(s.progress.flags.roverUnlocked, true, 'rover is unpacked for Uncover');
  s = run(s, [
    { type: 'boardRover' },
    { type: 'scan', nodeIds: ['a', 'b', 'c'] },
    ...['ice-1', 'ice-2', 'ice-3'].map((id) => ({ type: 'collect', nodeId: id, nodeType: 'waterIce', amount: 2, usesLeft: 0 }) as GameEvent),
  ]);
  s = completeCurrentPhase(s).save;
  assert.equal(s.currentPhaseIndex, 7);
  s = rich(s);
  s = run(s, [build('water_recycler'), build('research_lab'), build('communication_tower')]);
  assert.equal(isPhaseReady(s), false, 'built but not set up');
  s = run(s, ['water_recycler', 'research_lab', 'communication_tower'].map((recipeId) => ({ type: 'activate', recipeId }) as GameEvent));
  s = completeCurrentPhase(s).save;
  assert.equal(s.currentPhaseIndex, 8);
  const dusty = s.simulation.buildings.find((b) => b.recipeId === 'solar_panel')!;
  assert.ok(dusty.dustAccumulation >= 70, 'a panel gets dusty when Development starts');
  s = rich(s);
  s = run(s, [build('greenhouse')]);
  const gh = s.simulation.buildings.find((b) => b.recipeId === 'greenhouse')!;
  const early = applyGameEvent(s, { type: 'harvest', instanceId: gh.instanceId });
  assert.equal(early.effects[0].kind, 'error', 'cannot harvest before crops grow');
  s = { ...s, simulation: { ...s.simulation, buildings: s.simulation.buildings.map((b) => (b === gh ? { ...b, growth: 100 } : b)) } };
  s = run(s, [{ type: 'harvest', instanceId: gh.instanceId }, { type: 'cleanDust', instanceId: dusty.instanceId }, { type: 'sustain', seconds: 21 }]);
  return s;
}

test('Progression: the whole campaign reaches a real completed state with no dead end', () => {
  const s = playWholeCampaign();
  const before = s.spaceDollars;
  const r = completeCurrentPhase(s);
  assert.equal(r.ok, true);
  assert.equal(r.reward!.campaignComplete, true);
  assert.equal(r.save.progress.campaignComplete, true);
  assert.equal(r.save.spaceDollars, before + 200);
  assert.equal(r.save.progress.badges.length, 9);
  assert.equal(getMissionGuide(r.save).complete, true);

  // The final reward cannot be claimed again
  const again = completeCurrentPhase(r.save);
  assert.equal(again.ok, false);
  assert.equal(again.save.spaceDollars, r.save.spaceDollars);
});

test('Progression: restarting a mission resets its tasks but keeps buildings', () => {
  let s = rich(finishFlight(createNewGameSave()));
  s = { ...s, currentPhaseIndex: 6, progress: { ...s.progress, flags: { ...s.progress.flags, roverUnlocked: true } } };
  s = run(s, [{ type: 'boardRover' }, { type: 'scan', nodeIds: ['a', 'b'] }]);
  const restarted = restartCurrentPhase(s);
  assert.equal(restarted.phases[6].objectives.every((o) => !o.completed), true);
  assert.equal(scansInPhase(restarted, 6), 0);
  assert.equal(restarted.simulation.buildings.length, s.simulation.buildings.length);
});

test('Saves: version 1 saves migrate without losing progress', () => {
  const v1 = createNewGameSave() as unknown as Record<string, unknown>;
  delete v1.progress;
  v1.version = 1;
  v1.currentPhaseIndex = 7;
  const sim = v1.simulation as GameSaveData['simulation'];
  sim.buildings = [
    { instanceId: 'x', recipeId: 'oxygen_generator', x: 0, y: 0, status: 'active', health: 100, dustAccumulation: 0 },
    { instanceId: 'y', recipeId: 'water_recycler', x: 100, y: 0, status: 'active', health: 100, dustAccumulation: 0 },
  ];
  const m = migrateSave(v1 as unknown as GameSaveData);
  assert.equal(m.version, 2);
  assert.equal(m.currentPhaseIndex, 7);
  assert.equal(m.progress.rewardsClaimed.length, 7, 'earlier phases count as rewarded');
  assert.equal(m.progress.activated.oxygen_generator, true, 'existing buildings keep working');
  assert.equal(m.phases[7].objectives.find((o) => o.id === 'build_recycler')!.completed, true);
  assert.equal(m.progress.tutorialStep, 2);
  // Rewards for phases already passed cannot be claimed again
  assert.equal(m.spaceDollars, 150);
});

test('Mini-games: a keyed bonus pays once; chores can repeat; watering speeds growth', () => {
  let s = createNewGameSave();
  const start = s.spaceDollars;
  s = run(s, [
    { type: 'bonus', dollars: 20, key: 'flight:launch' },
    { type: 'bonus', dollars: 20, key: 'flight:launch' },
  ]);
  assert.equal(s.spaceDollars, start + 20, 'flight bonus only once');
  s = run(s, [
    { type: 'bonus', dollars: 8 },
    { type: 'bonus', dollars: 8 },
  ]);
  assert.equal(s.spaceDollars, start + 36, 'chores repeat');
  s = {
    ...s,
    simulation: {
      ...s.simulation,
      buildings: [{ instanceId: 'g', recipeId: 'greenhouse', x: 0, y: 0, status: 'active', health: 100, dustAccumulation: 0, growth: 10 }],
    },
  };
  s = run(s, [{ type: 'water', instanceId: 'g' }]);
  assert.equal(s.simulation.buildings[0].growth, 35);
  const before = s.simulation.resources.powerStored;
  s = run(s, [{ type: 'boostPower', fraction: -5 }]);
  assert.equal(s.simulation.resources.powerStored, 0, 'never negative');
  assert.ok(before >= 0);
});
