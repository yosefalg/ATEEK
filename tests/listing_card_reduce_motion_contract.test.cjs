const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'ListingCard.tsx'), 'utf8');

test('listing cards honor both ATEEK and system reduce-motion preferences', () => {
  assert.match(source, /AccessibilityInfo\.isReduceMotionEnabled\(\)/);
  assert.match(source, /AccessibilityInfo\.addEventListener\(['"]reduceMotionChanged['"],\s*setReduceMotion\)/);
  assert.match(source, /const motionEnabled = animationsEnabled && !reduceMotion;/);
});

test('listing card reduce-motion subscription is lifecycle safe', () => {
  assert.match(source, /let active = true;/);
  assert.match(source, /if \(active\) setReduceMotion\(value\);/);
  assert.match(source, /active = false;/);
  assert.match(source, /subscription\.remove\(\);/);
});

test('disabled motion resets transforms and bypasses spring press animation', () => {
  assert.match(source, /if \(!motionEnabled\) \{\s*press\.value = 1;\s*tilt\.value = 0;\s*\}/s);
  assert.match(source, /if \(!motionEnabled\) return;\s*press\.value = withSpring/s);
  assert.match(source, /if \(!motionEnabled\) \{\s*press\.value = 1;\s*tilt\.value = 0;\s*return;\s*\}/s);
});
