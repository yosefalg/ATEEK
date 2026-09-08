const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('listing seller metrics cache stays bounded while preserving request coalescing', () => {
  const source = fs.readFileSync('src/components/ListingCard.tsx', 'utf8');

  assert.match(source, /const MAX_SELLER_METRICS_CACHE = 250/);
  assert.match(source, /function cacheSellerMetrics\(sellerId: string, metrics: Metrics\)/);
  assert.match(source, /while \(cache\.size > MAX_SELLER_METRICS_CACHE\)/);
  assert.match(source, /cache\.delete\(oldestKey\)/);
  assert.match(source, /cacheSellerMetrics\(sellerId, metrics\)/);
  assert.match(source, /const existing = pending\.get\(sellerId\)/);
  assert.match(source, /pending\.set\(sellerId, request\)/);
  assert.match(source, /pending\.delete\(sellerId\)/);
});
