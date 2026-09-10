const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/ai/aiClient.ts', 'utf8');

test('expired AI task cache cleanup is rejection-safe', () => {
  assert.match(
    source,
    /void AsyncStorage\.removeItem\(key\)\.catch\(\(\) => \{\}\);/,
    'expired cache deletion must contain AsyncStorage rejection instead of leaking an unhandled promise rejection',
  );
});

test('AI task cache still expires before protected task request flow continues', () => {
  assert.match(source, /if \(Date\.now\(\) - cached\.at < ttlMs\) return cached\.value;/);
  assert.match(source, /const headers = await authHeaders\(\);/);
});
