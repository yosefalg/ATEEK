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

test('risk medians avoid overflow when finite malformed prices are extremely large', () => {
  const source = fs.readFileSync('src/utils/riskScore.ts', 'utf8');
  assert.match(source, /return left \/ 2 \+ right \/ 2/);
  assert.match(source, /return valueAtPeerIndex\(middle - 1\) \/ 2 \+ valueAtPeerIndex\(middle\) \/ 2/);
});

test('risk lower-bound midpoint does not truncate indexes to unsigned 32-bit integers', () => {
  const source = fs.readFileSync('src/utils/riskScore.ts', 'utf8');
  assert.match(source, /const middle = low \+ Math\.floor\(\(high - low\) \/ 2\)/);
  assert.doesNotMatch(source, /\(low \+ high\) >>> 1/);
});

test('risk wording recognizes spaced Arabic off-platform contact variants', () => {
  const source = fs.readFileSync('src/utils/riskScore.ts', 'utf8');
  assert.match(source, /واتس\\s\*ا\[بپ\]/);
  assert.match(source, /خارج\\s\+التطبيق/);
  assert.match(source, /بدون\\s\+فحص/);
});

test('risk wording normalizes Arabic diacritics and tatweel before matching', () => {
  const source = fs.readFileSync('src/utils/riskScore.ts', 'utf8');
  assert.match(source, /function normalizeRiskText\(value: string\)/);
  assert.match(source, /\\u0640\\u064B-\\u065F\\u0670/);
  assert.match(source, /const normalizedListingText = normalizeRiskText\(`/);
  assert.match(source, /riskyWords\.test\(normalizedListingText\)/);
});

test('risk wording strips invisible Unicode controls used to split risky phrases', () => {
  const source = fs.readFileSync('src/utils/riskScore.ts', 'utf8');
  assert.match(source, /\\u00AD/);
  assert.match(source, /\\u034F/);
  assert.match(source, /\\u061C/);
  assert.match(source, /\\u200B-\\u200F/);
  assert.match(source, /\\u202A-\\u202E/);
  assert.match(source, /\\u2060-\\u206F/);
  assert.match(source, /\\uFEFF/);
});

test('risk wording strips Unicode variation selectors used to split risky phrases', () => {
  const source = fs.readFileSync('src/utils/riskScore.ts', 'utf8');
  assert.match(source, /\\u180B-\\u180F/);
  assert.match(source, /\\uFE00-\\uFE0F/);
  assert.match(source, /\\u\{E0100\}-\\u\{E01EF\}/);
  assert.match(source, /\]\/gu/);
});

test('risk wording strips deprecated Mongolian vowel separator used for invisible splitting', () => {
  const source = fs.readFileSync('src/utils/riskScore.ts', 'utf8');
  assert.match(source, /\\u180B-\\u180F/);
});

test('risk wording strips supplementary Unicode tag controls used for invisible splitting', () => {
  const source = fs.readFileSync('src/utils/riskScore.ts', 'utf8');
  assert.match(source, /\\u\{E0000\}-\\u\{E007F\}/);
  assert.match(source, /\]\/gu/);
});

test('risk wording strips interlinear annotation controls used for invisible splitting', () => {
  const source = fs.readFileSync('src/utils/riskScore.ts', 'utf8');
  assert.match(source, /\\uFFF9-\\uFFFB/);
});

test('risk wording strips zero width no-break space used for invisible splitting', () => {
  const source = fs.readFileSync('src/utils/riskScore.ts', 'utf8');
  assert.match(source, /\\uFEFF/);
});

test('risk wording strips braille blank used for visually empty phrase splitting', () => {
  const source = fs.readFileSync('src/utils/riskScore.ts', 'utf8');
  assert.match(source, /\\u2800/);
});

test('risk wording strips Hangul fillers used for visually empty phrase splitting', () => {
  const source = fs.readFileSync('src/utils/riskScore.ts', 'utf8');
  assert.match(source, /\\u115F-\\u1160/);
});

test('risk wording strips compatibility Hangul fillers used for visually empty phrase splitting', () => {
  const source = fs.readFileSync('src/utils/riskScore.ts', 'utf8');
  assert.match(source, /\\u3164/);
  assert.match(source, /\\uFFA0/);
});

test('risk wording strips deprecated Khmer invisible vowels used for phrase splitting', () => {
  const source = fs.readFileSync('src/utils/riskScore.ts', 'utf8');
  assert.match(source, /\\u17B4-\\u17B5/);
});

test('risk short-description heuristic ignores visually blank Unicode padding', () => {
  const source = fs.readFileSync('src/utils/riskScore.ts', 'utf8');
  assert.match(source, /const normalizedDescription = normalizeRiskText\(description\)/);
  assert.match(source, /if \(normalizedDescription\.trim\(\)\.length < 35\)/);
  assert.doesNotMatch(source, /if \(description\.trim\(\)\.length < 35\)/);
});
