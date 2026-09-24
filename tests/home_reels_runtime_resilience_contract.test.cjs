const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

test('home reels refresh coalesces overlapping realtime loads', () => {
  assert.match(source, /loading=false,refreshQueued=false/);
  assert.match(source, /if\(loading\)\{refreshQueued=true;return\}/);
  assert.match(source, /if\(alive&&refreshQueued\)\{refreshQueued=false;safeLoad\(\)\}/);
});

test('home reels subscription is removed and cannot update after unmount', () => {
  assert.match(source, /if\(!alive\)return/);
  assert.match(source, /return\(\)=>\{alive=false;refreshQueued=false;void supabase\.removeChannel\(ch\)\.catch\(\(\)=>\{\}\)\}/);
});

test('home remote media is sanitized and failed images fall back safely', () => {
  assert.match(source, /safeRemoteMediaUrl\(firstNonEmpty\(profile\?\.avatar_url\)\)/);
  assert.match(source, /safeRemoteMediaUrl\(firstNonEmpty\(item\.image\)\)/);
  assert.match(source, /safeRemoteMediaUrl\(firstNonEmpty\(item\.thumbnail_url\)\)/);
  assert.match(source, /failedImageUrls\.has/);
  assert.match(source, /onError=\{\(\)=>markImageFailed/);
});

test('home low-data mode reduces initial and batched horizontal rendering', () => {
  assert.match(source, /initialNumToRender=\{lowData\?2:4\}/);
  assert.match(source, /maxToRenderPerBatch=\{lowData\?2:4\}/);
  assert.match(source, /initialNumToRender=\{lowData\?1:3\}/);
  assert.match(source, /maxToRenderPerBatch=\{lowData\?1:3\}/);
});
