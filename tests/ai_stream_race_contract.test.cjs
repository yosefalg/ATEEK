const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/screens/AIAssistantScreen.tsx', 'utf8');

test('AI stream events are scoped to the current request generation', () => {
  assert.match(source, /const streamGeneration = useRef\(0\);/);
  assert.match(source, /const generation = \+\+streamGeneration\.current;/);
  assert.match(source, /if \(streamGeneration\.current !== generation\) return;\s*handleEvent\(event\);/);
  assert.match(source, /if \(streamGeneration\.current !== generation\) \{\s*cancel\(\);\s*return;\s*\}/);
});

test('new chat and unmount invalidate stale streams and pending animation work', () => {
  const invalidations = source.match(/streamGeneration\.current \+= 1;/g) || [];
  assert.ok(invalidations.length >= 2, 'expected invalidation on both unmount and new chat');
  assert.match(source, /if \(frame\.current != null\) \{\s*cancelAnimationFrame\(frame\.current\);\s*frame\.current = null;\s*\}/);
});
