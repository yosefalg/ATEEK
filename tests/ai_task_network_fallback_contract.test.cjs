const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const transform = fs.readFileSync('scripts/run175-ai-task-network-fallback.mjs', 'utf8');
const chain = fs.readFileSync('scripts/run77-reels-transform.mjs', 'utf8');

test('contextual AI tasks fall back to protected Gemini on network failure or timeout', () => {
  assert.match(transform, /\.catch\(\(\) => null\)\.finally\(\(\) => clearTimeout\(timeout\)\)/);
  assert.match(transform, /if \(!response\) return await invokeProtectedTask<T>\(mode, clean\);/);
  assert.match(transform, /signal: controller\.signal/);
});

test('AI network fallback transform runs after protected Gemini fallback helper is installed', () => {
  const helperIndex = chain.indexOf("await import('./run173-ai-gemini-fallback-hardening.mjs');");
  const networkIndex = chain.indexOf("await import('./run175-ai-task-network-fallback.mjs');");
  assert.ok(helperIndex >= 0, 'protected Gemini fallback transform must remain chained');
  assert.ok(networkIndex > helperIndex, 'network fallback must run after the protected task helper is installed');
});
