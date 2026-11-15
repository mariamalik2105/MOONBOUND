import test from 'node:test';
import assert from 'node:assert/strict';

process.env.MOONBOUND_NO_LISTEN = '1';

test('Server: rejects unknown, off-grid, out-of-map and overlapping buildings', async () => {
  const { validatePlacement } = await import('../server');
  const room = { roomId: 'r', hostId: 'h', players: new Map(), buildings: [] as any[], sharedInventory: {}, sharedSpaceDollars: 0 };
  assert.equal(validatePlacement(room as any, { recipeId: 'death_ray', x: 0, y: 0 }), 'Unknown building.');
  assert.match(validatePlacement(room as any, { recipeId: 'habitat', x: 5, y: 0 }) || '', /grid/);
  assert.match(validatePlacement(room as any, { recipeId: 'habitat', x: 24 * 1000, y: 0 }) || '', /Outside/);
  assert.equal(validatePlacement(room as any, { recipeId: 'habitat', x: 48, y: 48 }), null);
  room.buildings.push({ instanceId: 'a', recipeId: 'habitat', x: 48, y: 48, status: 'active', health: 100, dustAccumulation: 0 });
  assert.match(validatePlacement(room as any, { recipeId: 'solar_panel', x: 72, y: 72 }) || '', /already/);
  assert.equal(validatePlacement(room as any, { recipeId: 'solar_panel', x: 240, y: 240 }), null);
});
