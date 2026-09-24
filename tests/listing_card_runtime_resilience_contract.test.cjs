const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/components/ListingCard.tsx', 'utf8');

test('seller metrics requests stay bounded and deduplicated', () => {
  assert.match(source, /const MAX_SELLER_METRICS_CACHE = 250/);
  assert.match(source, /const pending = new Map<string, Promise<Metrics \| null>>\(\)/);
  assert.match(source, /const existing = pending\.get\(sellerId\)/);
  assert.match(source, /if \(existing\) return existing/);
  assert.match(source, /pending\.delete\(sellerId\)/);
  assert.match(source, /while \(cache\.size > MAX_SELLER_METRICS_CACHE\)/);
});

test('listing media remains fail-safe and low-data aware', () => {
  assert.match(source, /safeRemoteMediaUrl\(item\.image\) \?\? ''/);
  assert.match(source, /fadeDuration=\{lowData \? 0 : 180\}/);
  assert.match(source, /onError=\{\(\) => \{/);
  assert.match(source, /setImageFailed\(true\)/);
  assert.match(source, /setLoaded\(true\)/);
});

test('listing interactions retain accessibility and reduced-motion guards', () => {
  assert.match(source, /AccessibilityInfo\.isReduceMotionEnabled\(\)/);
  assert.match(source, /AccessibilityInfo\.addEventListener\('reduceMotionChanged', setReduceMotion\)/);
  assert.match(source, /const motionEnabled = animationsEnabled && !reduceMotion/);
  assert.match(source, /accessibilityLabel=\{favorite \? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'\}/);
  assert.match(source, /accessibilityState=\{\{ selected: favorite \}\}/);
  assert.match(source, /accessibilityLabel="فتح بروفايل البائع"/);
});
