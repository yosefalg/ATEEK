const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const source = fs.readFileSync(path.join(process.cwd(), 'src/components/ListingCard.tsx'), 'utf8');

test('seller metrics never update an unmounted or repurposed listing card', () => {
  assert.match(source, /let alive = true;/);
  assert.match(source, /getSellerMetrics\(sellerId\)\.then\(value => \{\s*if \(alive && value\) setMetrics\(value\);\s*\}\)/);
  assert.match(source, /return \(\) => \{\s*alive = false;\s*\};/);
  assert.match(source, /\}, \[item\.sellerId\]\);/);
});

test('seller identity changes clear stale metrics before an async refresh', () => {
  assert.match(source, /if \(!sellerId\) \{\s*setMetrics\(null\);/);
  assert.match(source, /const cached = cache\.get\(sellerId\);/);
  assert.match(source, /if \(cached\) \{\s*setMetrics\(cached\);/);
  assert.match(source, /setMetrics\(null\);\s*void getSellerMetrics\(sellerId\)/);
});

test('seller metrics RPC failure remains fail-soft and cannot poison the cache', () => {
  assert.match(source, /if \(error \|\| !data\) return null;/);
  assert.match(source, /catch \{\s*return null;\s*\}/);
  assert.match(source, /cacheSellerMetrics\(sellerId, metrics\);/);
  assert.match(source, /finally \{\s*pending\.delete\(sellerId\);\s*\}/);
});
