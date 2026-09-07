const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('production release contract is APK-only 2.2.0 #16', () => {
  const app = JSON.parse(fs.readFileSync('app.json','utf8')).expo;
  const eas = JSON.parse(fs.readFileSync('eas.json','utf8'));
  assert.equal(app.version, '2.2.0');
  assert.equal(app.android.versionCode, 16);
  assert.equal(app.android.softwareKeyboardLayoutMode, 'resize');
  assert.equal(eas.build.production.android.buildType, 'apk');
  assert.equal(eas.build.production.distribution, 'internal');
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

test('ATEEK 2.2 visual tokens remain exact', () => {
  const tokens = fs.readFileSync('src/theme/tokens.ts','utf8');
  assert.match(tokens, /#0A0E17/);
  assert.match(tokens, /#131824/);
  assert.match(tokens, /#6C8DFF/);
  assert.match(tokens, /#F1F5F9/);
  assert.match(tokens, /#94A3B8/);
  assert.match(tokens, /micro: 8/);
  assert.match(tokens, /standard: 16/);
  assert.match(tokens, /section: 24/);
  assert.match(tokens, /icon: 24/);
  assert.match(tokens, /card: 22/);
});

test('home and dynamic root background contract is wired', () => {
  const home = fs.readFileSync('src/screens/HomeScreen.tsx','utf8');
  const nav = fs.readFileSync('src/components/BottomNav.tsx','utf8');
  const bg = fs.readFileSync('src/components/DynamicBackground.tsx','utf8');
  assert.match(home, /quickGrid/);
  assert.match(home, /أحدث الإعلانات/);
  assert.match(home, /أحدث الريلز/);
  assert.match(nav, /onLongPress/);
  assert.match(bg, /Gyroscope/);
  assert.match(bg, /LinearGradient/);
  assert.match(bg, /particleSeed/);
  assert.match(bg, /18000/);
  assert.match(bg, /24000/);
  assert.match(bg, /!lowData&&animationsEnabled&&particles\.map/);
});

test('Run 100 secure AI client and assistant screen are present', () => {
  const client = fs.readFileSync('src/ai/aiClient.ts','utf8');
  const screen = fs.readFileSync('src/screens/AIAssistantScreen.tsx','utf8');
  const edge = fs.readFileSync('supabase/functions/ai-chat/index.ts','utf8');
  assert.match(client, /functions\/v1\/ai-chat/);
  assert.match(client, /Authorization: `Bearer \$\{data\.session\.access_token\}`/);
  assert.match(screen, /ATEEK AI/);
  assert.match(screen, /requestAnimationFrame/);
  assert.match(edge, /OPENAI_API_KEY/);
  assert.match(edge, /\/v1\/responses/);
  assert.match(edge, /\/v1\/moderations/);
  assert.match(edge, /AI_CHAT_DAILY_LIMIT/);
});
