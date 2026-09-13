const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('spatial profile bus isolates subscriber failures and iterates a stable snapshot', () => {
  const source = fs.readFileSync('src/social/spatialSocialBus.ts', 'utf8');
  assert.match(source, /for \(const listener of \[\.\.\.listeners\]\) \{/);
  assert.match(source, /try \{\s*listener\(userId\);\s*\} catch \{/s);
  assert.doesNotMatch(source, /for \(const listener of listeners\) listener\(userId\);/);
});
