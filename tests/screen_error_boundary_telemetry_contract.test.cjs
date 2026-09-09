const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/components/ScreenErrorBoundary.tsx', 'utf8');

test('screen error telemetry deduplicates identical rapid crash reports', () => {
  assert.match(source, /TELEMETRY_DEDUPE_MS\s*=\s*30_000/);
  assert.match(source, /this\.lastTelemetry\?\.signature === signature/);
  assert.match(source, /if \(duplicate\) return;/);
});

test('screen recovery resets when boundary context changes', () => {
  assert.match(source, /prev\.resetKey !== this\.props\.resetKey \|\| prev\.name !== this\.props\.name/);
});

test('screen failure UI announces assertively and exposes retry intent', () => {
  assert.match(source, /accessibilityLiveRegion="assertive"/);
  assert.match(source, /accessibilityHint=\{`يحاول تشغيل \$\{this\.props\.name\} من جديد`\}/);
});
