const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

test('production transform chains Reels comment resilience', () => {
  const chain = fs.readFileSync('scripts/run77-reels-transform.mjs', 'utf8');
  assert.match(chain, /run166-reels-error-resilience\.mjs/);
});

test('Reels comment refresh failures are contained and surfaced accessibly', () => {
  const transform = fs.readFileSync('scripts/run166-reels-error-resilience.mjs', 'utf8');
  assert.match(transform, /const safeLoad = useCallback/);
  assert.match(transform, /\.catch\(\(error: unknown\) => setLoadError/);
  assert.match(transform, /accessibilityRole=\\"alert\\"/);
  assert.match(transform, /تعذر تحميل التعليقات/);
  assert.match(transform, /t\('reels\.emptyComments'\)/);
});

test('Reels resilience transform targets the post-localization empty-comments markup', () => {
  const localization = fs.readFileSync('scripts/run74-reels-transform.mjs', 'utf8');
  const resilience = fs.readFileSync('scripts/run166-reels-error-resilience.mjs', 'utf8');
  assert.match(localization, /reels\.emptyComments/);
  assert.match(resilience, /ListEmptyComponent=\{<Text style=\{s\.empty\}>\{t\('reels\.emptyComments'\)\}<\/Text>\}/);
});
