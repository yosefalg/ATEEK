const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/components/DynamicBackground.tsx','utf8');

test('dynamic background verifies gyroscope availability before subscribing', () => {
  assert.match(source, /Gyroscope\.isAvailableAsync\(\)/);
  assert.match(source, /if\(disposed\|\|sub\|\|!available\|\|AppState\.currentState!==['"]active['"]\)return/);
});

test('dynamic background tears down sensor work and avoids animation backlog', () => {
  assert.match(source, /sub\?\.remove\(\)/);
  assert.match(source, /disposed=true/);
  assert.match(source, /gx\.stopAnimation\(\);gy\.stopAnimation\(\);/);
  assert.match(source, /\.catch\(\(\)=>\{/);
});

test('dynamic background suspends gyroscope while app is not active', () => {
  assert.match(source, /AppState\.addEventListener\(['"]change['"],state=>\{if\(state===['"]active['"]\)start\(\);else stop\(\)\}\)/);
  assert.match(source, /if\(AppState\.currentState===['"]active['"]\)start\(\)/);
  assert.match(source, /if\(disposed\|\|AppState\.currentState!==['"]active['"]\)return/);
  assert.match(source, /return\(\)=>\{disposed=true;appStateSub\.remove\(\);stop\(\)\}/);
});

test('dynamic background suspends all decorative animation loops while app is not active', () => {
  assert.match(source, /const animations=\[spin\(r1,18000,1\),spin\(r2,24000,1\),breathe\(pulse1/);
  assert.match(source, /\.\.\.particles\.map\(p=>Animated\.loop/);
  assert.match(source, /const start=\(\)=>\{if\(running\)return;running=true;animations\.forEach\(a=>a\.start\(\)\)\}/);
  assert.match(source, /const stop=\(\)=>\{if\(!running\)return;running=false;animations\.forEach\(a=>a\.stop\(\)\)\}/);
  assert.match(source, /const appStateSub=AppState\.addEventListener\(['"]change['"],state=>\{if\(state===['"]active['"]\)start\(\);else stop\(\)\}\)/);
  assert.match(source, /return\(\)=>\{appStateSub\.remove\(\);stop\(\)\}/);
});
