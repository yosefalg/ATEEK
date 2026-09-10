const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('cloud refresh coalesces overlapping requests, indexes profiles, and refreshes on resume', () => {
  const cloud = fs.readFileSync('src/cloud/useCloud.ts', 'utf8');
  assert.match(cloud, /refreshQueued=useRef\(false\)/);
  assert.match(cloud, /if\(busy\.current\)\{refreshQueued\.current=true;return;\}/);
  assert.match(cloud, /do\{/);
  assert.match(cloud, /refreshQueued\.current=false/);
  assert.match(cloud, /while\(alive\.current&&refreshQueued\.current\)/);
  assert.match(cloud, /const profilesById=new Map\(rows\.profiles!\.map/);
  assert.match(cloud, /profilesById\.get\(String\(x\.seller_id\)\)/);
  assert.doesNotMatch(cloud, /rows\.profiles!\.find\(v=>v\.id===x\.seller_id\)/);
  assert.match(cloud, /AppState\.addEventListener\('change',state=>\{if\(state==='active'\)void refresh\(\);\}\)/);
  assert.match(cloud, /appStateSubscription\.remove\(\)/);
  assert.match(cloud, /\.finally\(\(\)=>\{if\(alive\.current\)void refresh\(\);\}\)/);
});

test('cloud realtime teardown contains removeChannel promise failures', () => {
  const cloud = fs.readFileSync('src/cloud/useCloud.ts', 'utf8');
  assert.match(
    cloud,
    /return\(\)=>\{alive\.current=false;appStateSubscription\.remove\(\);clearInterval\(timer\);void supabase\.removeChannel\(channel\)\.catch\(\(\)=>\{\}\);\};/,
  );
  assert.doesNotMatch(cloud, /void supabase\.removeChannel\(channel\);/);
});
