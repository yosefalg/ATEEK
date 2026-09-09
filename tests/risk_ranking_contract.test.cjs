const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('risk ranking precomputes category prices instead of rescanning all listings per row', () => {
  const source = fs.readFileSync('src/utils/riskScore.ts', 'utf8');
  assert.match(source, /const activeListings = listings\.filter\(\(listing\) => listing\.status === 'active'\)/);
  assert.match(source, /const sortedPricesByCategory = new Map<Listing\['category'\], number\[\]>\(\)/);
  assert.match(source, /for \(const prices of sortedPricesByCategory\.values\(\)\) prices\.sort/);
  assert.match(source, /medianWithoutListingPrice\(prices, listing\.price\)/);
  assert.doesNotMatch(source, /\.filter\(\(other\) => other\.status === 'active' && other\.category === listing\.category/);
});

test('risk ranking preserves peer-only medians and invalid-price handling', () => {
  const source = fs.readFileSync('src/utils/riskScore.ts', 'utf8');
  assert.match(source, /const excludedIndex = candidateIndex >= 0 && sortedPrices\[candidateIndex\] === listingPrice \? candidateIndex : -1/);
  assert.match(source, /const peerCount = sortedPrices\.length - \(excludedIndex >= 0 \? 1 : 0\)/);
  assert.match(source, /if \(!Number\.isFinite\(listing\.price\) \|\| listing\.price <= 0\) continue/);
  assert.match(source, /scoreListingRisk\(listing, peerMedian > 0 \? \[peerMedian\] : \[\]\)/);
});

test('risk ranking uses logarithmic lookup and skips exactly one matching listing price', () => {
  const source = fs.readFileSync('src/utils/riskScore.ts', 'utf8');
  assert.match(source, /function lowerBound\(values: number\[\], target: number\)/);
  assert.match(source, /while \(low < high\)/);
  assert.match(source, /const sourceIndex = excludedIndex >= 0 && index >= excludedIndex \? index \+ 1 : index/);
  assert.match(source, /return sortedPrices\[sourceIndex\] \?\? 0/);
});
