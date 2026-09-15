const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const transform = fs.readFileSync('scripts/run197-online-runtime-error-privacy.mjs', 'utf8');

const replacementPayloads = [...transform.matchAll(/replace\(("(?:[^"\\]|\\.)*"),("(?:[^"\\]|\\.)*"),/g)]
  .map(([, , replacement]) => JSON.parse(replacement))
  .join('\n');

test('online session bootstrap has a finite timeout and safe recovery', () => {
  assert.match(replacementPayloads, /setTimeout\(\(\)=>finish\(null,'تعذّر قراءة الجلسة/);
  assert.match(replacementPayloads, /,5000\)/);
  assert.match(replacementPayloads, /clearTimeout\(timer\)/);
  assert.match(replacementPayloads, /settled=false/);
  assert.match(replacementPayloads, /if\(!alive\|\|settled\)return/);
});

test('auth state can settle bootstrap without exposing provider errors', () => {
  assert.match(replacementPayloads, /onAuthStateChange/);
  assert.match(replacementPayloads, /if\(!settled\)\{settled=true;clearTimeout\(timer\);setReady\(true\)\}/);
  assert.doesNotMatch(replacementPayloads, /setError\(error\.message/);
  assert.doesNotMatch(replacementPayloads, /Alert\.alert\([^\n]*error\.message/);
});
