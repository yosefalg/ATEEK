const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('production release contract is AAB 2.1.0 #15', () => {
  const app = JSON.parse(fs.readFileSync('app.json','utf8')).expo;
  const eas = JSON.parse(fs.readFileSync('eas.json','utf8'));
  assert.equal(app.version, '2.1.0');
  assert.equal(app.android.versionCode, 15);
  assert.equal(eas.build.production.android.buildType, 'app-bundle');
  assert.equal(eas.build.production.distribution, 'store');
});

test('zero-crash isolation and video guards are wired', () => {
  const online = fs.readFileSync('src/cloud/OnlineApp.tsx','utf8');
  const reels = fs.readFileSync('src/components/SpatialReelsHub.tsx','utf8');
  const guard = fs.readFileSync('src/services/videoSafety.ts','utf8');
  assert.match(online, /ScreenErrorBoundary name="Chat"/);
  assert.match(online, /ScreenErrorBoundary name="Reels"/);
  assert.match(online, /ScreenErrorBoundary name="Feed"/);
  assert.match(online, /ScreenErrorBoundary name="Settings"/);
  assert.match(reels, /SafeReelVideo/);
  assert.match(guard, /u\.protocol !== 'https:'/);
});

test('AMOLED Titanium tokens remain exact', () => {
  const tokens = fs.readFileSync('src/theme/tokens.ts','utf8');
  assert.match(tokens, /#090A0F/);
  assert.match(tokens, /#13151F/);
  assert.match(tokens, /#E8B058/);
  assert.match(tokens, /micro: 8/);
  assert.match(tokens, /standard: 16/);
  assert.match(tokens, /section: 24/);
  assert.match(tokens, /icon: 24/);
});
