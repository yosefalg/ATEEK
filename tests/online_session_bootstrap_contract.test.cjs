const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const transform = fs.readFileSync('scripts/run197-online-runtime-error-privacy.mjs', 'utf8');

test('online session bootstrap has a finite timeout and safe recovery', () => {
  assert.match(transform, /setTimeout\(\(\)=>finish\(null,'تعذّر قراءة الجلسة/);
  assert.match(transform, /,5000\)/);
  assert.match(transform, /clearTimeout\(timer\)/);
  assert.match(transform, /settled=false/);
  assert.match(transform, /if\(!alive\|\|settled\)return/);
});

test('auth state can settle bootstrap without exposing provider errors', () => {
  assert.match(transform, /onAuthStateChange/);
  assert.match(transform, /if\(!settled\)\{settled=true;clearTimeout\(timer\);setReady\(true\)\}/);
  assert.doesNotMatch(transform, /setError\(error\.message/);
  assert.doesNotMatch(transform, /Alert\.alert\([^\n]*error\.message/);
});
