const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/i18n/LocaleProvider.tsx', 'utf8');

test('locale switching keeps runtime preference usable when persistence fails', () => {
  assert.match(
    source,
    /if \(persist\) await AsyncStorage\.setItem\(LOCALE_KEY, next\)\.catch\(\(\) => undefined\);/,
    'storage write failures must not reject an otherwise successful runtime locale switch',
  );
  assert.match(source, /finally \{[\s\S]*setLastSwitchMs\(elapsed\);[\s\S]*setSwitching\(false\);/);
});

test('re-selecting the active locale is a zero-cost no-op', () => {
  assert.match(
    source,
    /setLocale: next => next === locale \? Promise\.resolve\(0\) : apply\(next\),/,
    'the active locale must bypass persistence and switching-state churn',
  );
});

test('locale bootstrap does not update readiness after unmount', () => {
  const bootstrapStart = source.indexOf('void Promise.race([storageRead, timeout]).then(storedRaw => {');
  const catchStart = source.indexOf('}).catch(() => {', bootstrapStart);
  const cleanupStart = source.indexOf('return () => {', catchStart);
  assert.notEqual(bootstrapStart, -1, 'bounded bootstrap must retain its success handler');
  assert.notEqual(catchStart, -1, 'bounded bootstrap must retain its failure handler');
  assert.notEqual(cleanupStart, -1, 'bounded bootstrap must retain effect cleanup');

  const successBody = source.slice(bootstrapStart, catchStart);
  const failureBody = source.slice(catchStart, cleanupStart);
  for (const [name, body] of [['success', successBody], ['failure', failureBody]]) {
    assert.match(body, /if \(!active\) return;/, `${name} path must respect the effect lifetime guard`);
    assert.match(body, /setReady\(true\);/, `${name} path must settle readiness while mounted`);
  }
  assert.match(
    source.slice(cleanupStart),
    /return \(\) => \{\s*active = false;\s*if \(timeoutId\) clearTimeout\(timeoutId\);\s*\};/s,
    'bootstrap cleanup must invalidate late completions and cancel its timeout',
  );
});

test('locale bootstrap rejects corrupt persisted values and falls back to the device locale', () => {
  assert.match(
    source,
    /function persistedLocale\(code\?: string \| null\): LocaleCode \| null \{[\s\S]*v === 'ar' \|\| v === 'en' \|\| v === 'tr' \|\| v === 'fa' \? v : null;[\s\S]*\}/,
    'persisted app state must accept only exact supported locale codes',
  );
  assert.match(
    source,
    /function deviceLocale\(\): LocaleCode \{[\s\S]*return normalize\(getLocales\(\)\[0\]\?\.languageCode\);[\s\S]*catch \{\s*return 'ar';\s*\}[\s\S]*\}/,
    'device locale lookup must normalize supported locale metadata and fail safely when native metadata is unavailable',
  );

  const bootstrapStart = source.indexOf('void Promise.race([storageRead, timeout]).then(storedRaw => {');
  const catchStart = source.indexOf('}).catch(() => {', bootstrapStart);
  assert.notEqual(bootstrapStart, -1, 'bounded bootstrap success path must exist');
  assert.notEqual(catchStart, -1, 'bounded bootstrap failure path must exist');
  const successBody = source.slice(bootstrapStart, catchStart);
  assert.ok(
    successBody.includes('const stored = persistedLocale(storedRaw);') &&
      successBody.includes('const detected = stored ?? deviceLocale();'),
    'missing or corrupt persisted state must fall back through the guarded device locale helper',
  );
});

test('locale bootstrap treats AsyncStorage read failures as an ordinary fallback', () => {
  assert.match(
    source,
    /const storageRead = AsyncStorage\.getItem\(LOCALE_KEY\)\.catch\(\(\) => null\);/,
    'storage read rejection must be converted to the same bounded fallback path as a timeout',
  );
});

test('localized number formatting rejects non-finite values before Intl', () => {
  assert.match(
    source,
    /formatNumber: value => Number\.isFinite\(value\) \? new Intl\.NumberFormat\(localeTag\)\.format\(value\) : '',/,
    'NaN and Infinity must never leak into production UI through locale formatting',
  );
});

test('localized date formatting rejects invalid dates and survives unsupported native calendars', () => {
  assert.match(
    source,
    /const date = new Date\(value\);\s*if \(Number\.isNaN\(date\.getTime\(\)\)\) return '';/s,
    'invalid date values must be rejected before Intl formatting',
  );
  assert.match(
    source,
    /try \{\s*return new Intl\.DateTimeFormat\(localeTag, \{ dateStyle: 'medium', calendar: calendar \|\| undefined \}\)\.format\(date\);\s*\} catch \{[\s\S]*return new Intl\.DateTimeFormat\(localeTag, \{ dateStyle: 'medium' \}\)\.format\(date\);\s*\}/,
    'unsupported platform calendar identifiers must fall back to the locale default calendar',
  );
});
