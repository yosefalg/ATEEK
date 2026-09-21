const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'ListingCard.tsx'), 'utf8');

test('seller metrics cache remains bounded', () => {
  assert.match(source, /const MAX_SELLER_METRICS_CACHE = 250;/);
  assert.match(source, /while \(cache\.size > MAX_SELLER_METRICS_CACHE\)/);
  assert.match(source, /const oldestKey = cache\.keys\(\)\.next\(\)\.value/);
  assert.match(source, /cache\.delete\(oldestKey\);/);
});

test('concurrent seller metrics requests are deduplicated', () => {
  assert.match(source, /const pending = new Map<string, Promise<Metrics \| null>>\(\);/);
  assert.match(source, /const existing = pending\.get\(sellerId\);\s*if \(existing\) return existing;/s);
  assert.match(source, /pending\.set\(sellerId, request\);/);
  assert.match(source, /finally \{\s*pending\.delete\(sellerId\);\s*\}/s);
});

test('failed seller metrics requests are not cached as trusted data', () => {
  assert.match(source, /if \(error \|\| !data\) return null;/);
  assert.match(source, /cacheSellerMetrics\(sellerId, metrics\);/);
  assert.doesNotMatch(source, /cacheSellerMetrics\(sellerId, null\)/);
});
