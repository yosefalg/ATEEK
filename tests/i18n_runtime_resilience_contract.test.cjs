const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/i18n/LocaleProvider.tsx', 'utf8');

test('locale bootstrap is bounded and falls back safely', () => {
  assert.match(source, /LOCALE_BOOTSTRAP_TIMEOUT_MS\s*=\s*2500/);
  assert.match(source, /Promise\.race\(\[storageRead, timeout\]\)/);
  assert.match(source, /const detected = stored \?\? deviceLocale\(\)/);
});

test('locale persistence is serialized and stale switches cannot settle UI state', () => {
  assert.match(source, /persistenceQueue\.current\s*=\s*persistenceQueue\.current/);
  assert.match(source, /const switchId = \+\+switchSequence\.current/);
  assert.match(source, /switchId === switchSequence\.current/);
  assert.match(source, /mounted\.current/);
});

test('duplicate locale selections are coalesced without storage writes', () => {
  assert.match(source, /next === activeLocale\.current \? Promise\.resolve\(0\) : apply\(next\)/);
});

test('formatters reject malformed values and calendar incompatibility degrades safely', () => {
  assert.match(source, /Number\.isFinite\(value\)/);
  assert.match(source, /Number\.isNaN\(date\.getTime\(\)\)/);
  assert.match(source, /new Intl\.DateTimeFormat\(localeTag, \{ dateStyle: 'medium' \}\)\.format\(date\)/);
});
