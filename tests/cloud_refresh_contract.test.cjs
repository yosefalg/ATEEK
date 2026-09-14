const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('cloud refresh coalesces overlapping requests, indexes profiles, and refreshes on resume', () => {
  const cloud = fs.readFileSync('src/cloud/useCloud.ts', 'utf8');
  assert.match(cloud, /refreshQueued=useRef\(false\)/);
  assert.match(cloud, /if\(busy\.current\)\{refreshQueued\.current=true;return;\}/);
  assert.match(cloud, /do\{/);
  assert.match(cloud, /refreshQueued\.current=false/);
  assert.match(cloud, /while\(alive\.current&&requestGeneration===generation\.current&&refreshQueued\.current\)/);
  assert.match(cloud, /const profilesById=new Map\(rows\.profiles!\.map/);
  assert.match(cloud, /profilesById\.get\(String\(x\.seller_id\)\)/);
  assert.doesNotMatch(cloud, /rows\.profiles!\.find\(v=>v\.id===x\.seller_id\)/);
  assert.match(cloud, /AppState\.addEventListener\('change',state=>\{if\(state==='active'\)void refresh\(\);\}\)/);
  assert.match(cloud, /appStateSubscription\.remove\(\)/);
  assert.match(cloud, /\.finally\(\(\)=>\{if\(alive\.current&&effectGeneration===generation\.current\)void refresh\(\);\}\)/);
});

test('cloud cache bootstrap contains AsyncStorage read failures and still schedules refresh', () => {
  const cloud = fs.readFileSync('src/cloud/useCloud.ts', 'utf8');
  assert.match(cloud, /AsyncStorage\.getItem\(cacheKey\)\.then\(/);
  assert.match(cloud, /\}\)\.catch\(\(\)=>\{\}\)\.finally\(\(\)=>\{if\(alive\.current&&effectGeneration===generation\.current\)void refresh\(\);\}\)/);
});

test('cloud realtime teardown contains removeChannel promise failures', () => {
  const cloud = fs.readFileSync('src/cloud/useCloud.ts', 'utf8');
  assert.match(
    cloud,
    /return\(\)=>\{alive\.current=false;appStateSubscription\.remove\(\);clearInterval\(timer\);void supabase\.removeChannel\(channel\)\.catch\(\(\)=>\{\}\);\};/,
  );
  assert.doesNotMatch(cloud, /void supabase\.removeChannel\(channel\);/);
});

test('cloud lifecycle generation prevents prior-session refresh and cache work from committing after identity changes', () => {
  const cloud = fs.readFileSync('src/cloud/useCloud.ts', 'utf8');
  assert.match(cloud, /generation=useRef\(0\)/);
  assert.match(cloud, /const requestGeneration=generation\.current/);
  assert.match(cloud, /if\(alive\.current&&requestGeneration===generation\.current\)\{const next=/);
  assert.match(cloud, /if\(alive\.current&&requestGeneration===generation\.current\)setError/);
  assert.match(cloud, /const effectGeneration=\+\+generation\.current/);
  assert.match(cloud, /if\(!alive\.current\|\|effectGeneration!==generation\.current\|\|!raw\)return/);
  assert.match(cloud, /requestGeneration!==generation\.current&&refreshQueued\.current\)\{refreshQueued\.current=false;void refreshRef\.current\(\);\}/);
});
