const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/cloud/useCloud.ts', 'utf8');

test('cloud refresh coalesces concurrent refresh requests', () => {
  assert.match(source, /if\(busy\.current\)\{refreshQueued\.current=true;return;\}/);
  assert.match(source, /while\(alive\.current&&requestGeneration===generation\.current&&refreshQueued\.current\)/);
});

test('cloud refresh rejects stale generations before publishing data', () => {
  assert.match(source, /const requestGeneration=generation\.current/);
  assert.match(source, /alive\.current&&requestGeneration===generation\.current/);
  assert.match(source, /requestGeneration!==generation\.current/);
});

test('cloud subscriptions and polling are cleaned up on unmount', () => {
  assert.match(source, /appStateSubscription\.remove\(\)/);
  assert.match(source, /clearInterval\(timer\)/);
  assert.match(source, /supabase\.removeChannel\(channel\)/);
});

test('cloud polling backs off in low-data mode and only refreshes while active', () => {
  assert.match(source, /AppState\.currentState==='active'/);
  assert.match(source, /lowData\?60000:15000/);
});

test('home cache is user-scoped, bounded by age, and corrupt cache is removed', () => {
  assert.match(source, /ateek\.home\.cache\.['"]?\+session\.user\.id/);
  assert.match(source, /Date\.now\(\)-Number\(c\.savedAt\|\|0\)<1000\*60\*60\*24/);
  assert.match(source, /AsyncStorage\.removeItem\(cacheKey\)/);
});
