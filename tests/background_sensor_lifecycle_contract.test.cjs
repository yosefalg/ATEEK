const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/components/DynamicBackground.tsx','utf8');

test('dynamic background verifies gyroscope availability before subscribing', () => {
  assert.match(source, /Gyroscope\.isAvailableAsync\(\)/);
  assert.match(source, /if\(disposed\|\|!available\)return/);
});

test('dynamic background tears down sensor work and avoids animation backlog', () => {
  assert.match(source, /sub\?\.remove\(\)/);
  assert.match(source, /disposed=true/);
  assert.match(source, /gx\.stopAnimation\(\);gy\.stopAnimation\(\);/);
  assert.match(source, /\.catch\(\(\)=>\{/);
});
