const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('production release contract is AAB 2.1.0 #15', () => {
  const app = JSON.parse(fs.readFileSync('app.json','utf8')).expo;
  const eas = JSON.parse(fs.readFileSync('eas.json','utf8'));
  assert.equal(app.version, '2.1.0');
  assert.equal(app.android.versionCode, 15);
  assert.equal(app.android.softwareKeyboardLayoutMode, 'resize');
  assert.equal(eas.build.production.android.buildType, 'app-bundle');
  assert.equal(eas.build.production.distribution, 'store');
});

test('screen isolation and reel fallback are wired', () => {
  const online = fs.readFileSync('src/cloud/OnlineApp.tsx','utf8');
  const reels = fs.readFileSync('src/components/SpatialReelsHub.tsx','utf8');
  const player = fs.readFileSync('src/components/SafeReelVideo.tsx','utf8');
  const guard = fs.readFileSync('src/services/videoSafety.ts','utf8');
  assert.match(online, /ScreenErrorBoundary name="Chat"/);
  assert.match(online, /ScreenErrorBoundary name="Reels"/);
  assert.match(online, /ScreenErrorBoundary name="Feed"/);
  assert.match(online, /ScreenErrorBoundary name="Settings"/);
  assert.match(reels, /SafeReelVideo/);
  assert.match(player, /VIDEO_READY_TIMEOUT_2000MS/);
  assert.match(player, /cloudinaryVideoThumbnail/);
  assert.match(guard, /u\.protocol !== 'https:'/);
});

test('Run 77 minimalist tokens remain exact', () => {
  const tokens = fs.readFileSync('src/theme/tokens.ts','utf8');
  assert.match(tokens, /#080B14/);
  assert.match(tokens, /#141824/);
  assert.match(tokens, /#C9A86C/);
  assert.match(tokens, /#F0F4FF/);
  assert.match(tokens, /#8A8FA8/);
  assert.match(tokens, /micro: 8/);
  assert.match(tokens, /standard: 16/);
  assert.match(tokens, /section: 24/);
  assert.match(tokens, /icon: 24/);
  assert.match(tokens, /card: 20/);
});

test('Run 77 home and root background contract is wired', () => {
  const home = fs.readFileSync('src/screens/HomeScreen.tsx','utf8');
  const nav = fs.readFileSync('src/components/BottomNav.tsx','utf8');
  const bg = fs.readFileSync('src/components/DynamicBackground.tsx','utf8');
  assert.match(home, /quickGrid/);
  assert.match(home, /أحدث الإعلانات/);
  assert.match(home, /أحدث الريلز/);
  assert.match(nav, /onLongPress/);
  assert.match(bg, /Gyroscope/);
  assert.match(bg, /10000/);
  assert.match(bg, /7000/);
  assert.match(bg, /5000/);
});
