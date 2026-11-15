import test from 'node:test';
import assert from 'node:assert/strict';
import { canAffordBuilding, deductBuildingCost } from './economy';
import {
  createInitialSimulationState,
  tickSimulation,
  repairBuilding,
  getZoneEnvironment,
  solveColonyProblem,
} from './simulation';
import { MOONBOUND_PHASES, isPhaseComplete, completeObjectiveInPhases } from './phases';
import { createNewGameSave, validateSaveData, exportSaveToJson, importSaveFromJson } from './saveSystem';
import {
  MISSION_KNOWLEDGE_ENTRIES,
  SPACE_CODEX,
  RESEARCH_NODES,
  findKnowledgeForScanTarget,
} from './science';

test('Economy: canAffordBuilding correctly identifies missing materials and currency', () => {
  const emptyInventory = { silicon: 0, metalOre: 0 };
  const check = canAffordBuilding(emptyInventory, 10, 'solar_panel');
  assert.equal(check.canAfford, false);
  assert.equal(check.missingMaterials.silicon, 2);
  assert.equal(check.missingMaterials.metalOre, 2);
  assert.equal(check.missingCurrency, 15); // 25 - 10
});

test('Economy: canAffordBuilding approves when resources and SpaceDollars are sufficient', () => {
  const inventory = { silicon: 3, metalOre: 4 };
  const check = canAffordBuilding(inventory, 50, 'solar_panel');
  assert.equal(check.canAfford, true);
  assert.equal(check.missingCurrency, 0);
  assert.equal(Object.keys(check.missingMaterials).length, 0);
});

test('Economy: Engineer avatar grants discount on build cost', () => {
  const inventory = { silicon: 2, metalOre: 2 };
  const checkStandard = canAffordBuilding(inventory, 25, 'solar_panel');
  const checkEngineer = canAffordBuilding(inventory, 25, 'solar_panel', 'engineer');
  assert.equal(checkStandard.finalCost, 25);
  assert.equal(checkEngineer.finalCost, 22);
});

test('Economy: deductBuildingCost cleanly subtracts materials and currency', () => {
  const inventory = { silicon: 5, metalOre: 5 };
  const { updatedInventory, updatedSpaceDollars } = deductBuildingCost(inventory, 100, 'solar_panel');
  assert.equal(updatedInventory.silicon, 3);
  assert.equal(updatedInventory.metalOre, 3);
  assert.equal(updatedSpaceDollars, 75);
});

test('Simulation: Day-night cycle and solar generation logic', () => {
  const initial = createInitialSimulationState();
  assert.equal(initial.resources.powerStored, 40);

  initial.buildings.push({
    instanceId: 'panel-1',
    recipeId: 'solar_panel',
    x: 100,
    y: 100,
    status: 'active',
    health: 100,
    dustAccumulation: 0,
  });

  const nextState = tickSimulation(initial, 1.0);
  assert.ok(nextState.resources.powerGenCurrent > 0, 'Solar panel should generate power during daytime');
  assert.ok(nextState.resources.powerStored >= 40, 'Power should increase or remain stored');
});

test('Simulation: Repairing building restores health and clears dust', () => {
  const buildings = [
    {
      instanceId: 'panel-1',
      recipeId: 'solar_panel',
      x: 100,
      y: 100,
      status: 'damaged' as const,
      health: 40,
      dustAccumulation: 75,
    },
  ];

  const repaired = repairBuilding(buildings, 'panel-1');
  assert.equal(repaired[0].status, 'active');
  assert.equal(repaired[0].health, 100);
  assert.equal(repaired[0].dustAccumulation, 0);
});

test('Simulation: Zone environment reflects extreme Cold Trap PSR vs sunlit landing zone', () => {
  const coldTrap = getZoneEnvironment('zone_cold_trap', 1.0);
  assert.equal(coldTrap.isColdTrap, true);
  assert.equal(coldTrap.temperatureC, -246);
  assert.ok(coldTrap.temperatureLabel.includes('-246°C'));

  const landingDay = getZoneEnvironment('zone_landing', 1.0);
  const landingNight = getZoneEnvironment('zone_landing', 0.0);
  assert.ok(landingDay.temperatureC > 50);
  assert.equal(landingNight.temperatureC, -130);
});

test('Simulation: Low battery alert spawns and solveColonyProblem activates Power Saver Mode', () => {
  const state = createInitialSimulationState();
  state.resources.powerStored = 10;
  state.buildings.push({
    instanceId: 'lab-1',
    recipeId: 'research_lab',
    x: 200,
    y: 200,
    status: 'active',
    health: 100,
    dustAccumulation: 0,
  });

  const ticked = tickSimulation(state, 0.5);
  assert.ok(
    ticked.activeEvents.some((e) => e.id === 'low_battery_alert'),
    'Low battery alert should activate below 15 kWh'
  );

  // Every option works, but none of them is free.
  const throttled = solveColonyProblem(ticked, 'low_battery_alert', 'turn_off_oxygen');
  assert.equal(throttled.solved, true);
  assert.ok((throttled.nextState.modifiers?.o2Throttle || 0) > 0, 'oxygen generator runs on low');

  const solved = solveColonyProblem(ticked, 'low_battery_alert', 'enable_power_saver');
  assert.equal(solved.solved, true);
  assert.equal(solved.nextState.powerSaverMode, true);
  // No free emergency battery top-up any more.
  assert.equal(solved.nextState.resources.powerStored, ticked.resources.powerStored);
});

test('Simulation: Sustainability seconds accumulate only when life support is healthy', () => {
  const state = createInitialSimulationState();
  state.buildings.push(
    { instanceId: 's1', recipeId: 'solar_panel', x: 0, y: 0, status: 'active', health: 100, dustAccumulation: 0 },
    { instanceId: 'o1', recipeId: 'oxygen_generator', x: 48, y: 0, status: 'active', health: 100, dustAccumulation: 0 }
  );

  const next = tickSimulation(state, 0.5);
  assert.ok((next.sustainabilitySeconds || 0) >= 0.5);

  next.resources.oxygen = 20;
  const reset = tickSimulation(next, 0.5);
  assert.equal(reset.sustainabilitySeconds, 0);
});

test('Phases: Progress and objective completion engine', () => {
  const phases = JSON.parse(JSON.stringify(MOONBOUND_PHASES));
  const phase0 = phases[0];
  assert.equal(isPhaseComplete(phase0), false);
  assert.ok(phase0.scienceLesson.length > 10);

  const { updatedPhases: p1 } = completeObjectiveInPhases(phases, 0, 'select_crew');
  const { updatedPhases: p2 } = completeObjectiveInPhases(p1, 0, 'inspect_manifest');
  const { updatedPhases: p3, newlyCompletedPhase } = completeObjectiveInPhases(p2, 0, 'ready_launch');

  assert.equal(newlyCompletedPhase, true);
  assert.equal(isPhaseComplete(p3[0]), true);
});

test('Science: All 12 Codex entries, 8 Knowledge challenges, 6 Research nodes & node matching work', () => {
  assert.equal(SPACE_CODEX.length, 12);
  assert.equal(MISSION_KNOWLEDGE_ENTRIES.length, 8);
  assert.equal(RESEARCH_NODES.length, 6);

  const iceEntry = findKnowledgeForScanTarget('waterIce', []);
  assert.equal(iceEntry.id, 'water_ice_cold_traps');

  const wreckEntry = findKnowledgeForScanTarget('tech_wreck', []);
  assert.equal(wreckEntry.id, 'lunar_dust_problem');

  // If water_ice_cold_traps already solved, prefer another unsolved entry when fallback needed
  const he3Entry = findKnowledgeForScanTarget('helium3', []);
  assert.equal(he3Entry.id, 'helium3_solar_wind');
});

test('SaveSystem: Schema validation and JSON export/import round-trip', () => {
  const newSave = createNewGameSave('test_slot', 'Apollo Explorer');
  assert.equal(validateSaveData(newSave), true);
  assert.ok((newSave.inventory.researchData || 0) >= 6);
  assert.ok((newSave.unlockedCodexIds || []).length >= 4);

  const exported = exportSaveToJson(newSave);
  const imported = importSaveFromJson(exported);
  assert.equal(imported.success, true);
  assert.equal(imported.data?.campaignName, 'Apollo Explorer');
  assert.equal(imported.data?.spaceDollars, 150);

  const badImport = importSaveFromJson('{"invalid": true}');
  assert.equal(badImport.success, false);
});

test('MissionRecords: Telemetry initialization and speedrun leaderboard updates', () => {
  const save = createNewGameSave('test_records', 'Artemis Speeder');
  assert.ok(save.records, 'Save should initialize with mission records data');
  assert.equal(save.records.totalDistanceOnFoot, 0);
  assert.equal(save.records.totalDistanceInRover, 0);
  assert.equal(save.records.totalResourcesHarvested, 0);
  assert.equal(save.records.phaseLeaderboard.length, 9);

  save.records.totalDistanceOnFoot += 150.5;
  save.records.totalDistanceInRover += 850.2;
  const totalMeters = save.records.totalDistanceOnFoot + save.records.totalDistanceInRover;
  assert.equal(Math.round(totalMeters), 1001);

  save.records.totalResourcesHarvested += 25;
  save.records.totalResourcesHarvested += 10;
  assert.equal(save.records.totalResourcesHarvested, 35);

  const phaseIndex = 0;
  const recordedTime = 24.8;
  save.records.phaseCompletionTimes[phaseIndex] = recordedTime;
  save.records.phaseLeaderboard[phaseIndex].bestTimeSeconds = recordedTime;
  save.records.phaseLeaderboard[phaseIndex].completedAt = Date.now();

  assert.equal(save.records.phaseCompletionTimes[0], 24.8);
  assert.equal(save.records.phaseLeaderboard[0].bestTimeSeconds, 24.8);
  assert.ok(
    save.records.phaseLeaderboard[0].bestTimeSeconds! < save.records.phaseLeaderboard[0].benchmarkRecordSeconds,
    'Player time beats the game benchmark time'
  );
});
