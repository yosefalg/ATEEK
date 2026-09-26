const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/i18n/LocaleProvider.tsx', 'utf8');

test('locale switching keeps runtime preference usable when persistence fails', () => {
  const queueStart = source.indexOf('persistenceQueue.current = persistenceQueue.current');
  const awaitQueue = source.indexOf('await persistenceQueue.current;', queueStart);
  assert.notEqual(queueStart, -1, 'locale persistence must remain serialized through the existing queue');
  assert.notEqual(awaitQueue, -1, 'runtime switching must wait for its ordered persistence attempt to settle');
  const queueBody = source.slice(queueStart, awaitQueue);
  assert.match(
    queueBody,
    /\.catch\(\(\) => undefined\)/,
    'a prior rejected queue entry must not poison later locale switches',
  );
  assert.match(
    queueBody,
    /\.then\(\(\) => Promise\.resolve\(\)\.then\(\(\) => AsyncStorage\.setItem\(LOCALE_KEY, next\)\)\.catch\(\(\) => undefined\)\)/,
    'the native storage call must be deferred so both synchronous throws and asynchronous rejections are isolated',
  );
  assert.match(source, /finally \{[\s\S]*setLastSwitchMs\(elapsed\);[\s\S]*setSwitching\(false\);/);
});

test('rapid locale changes let only the newest switch settle busy state and timing', () => {
  assert.match(
    source,
    /const switchId = \+\+switchSequence\.current;/,
    'each locale switch must receive a monotonically increasing sequence id',
  );
  assert.match(
    source,
    /if \(mounted\.current && switchId === switchSequence\.current\) \{\s*setLastSwitchMs\(elapsed\);\s*setSwitching\(false\);\s*\}/s,
    'an older queued persistence completion or an unmounted provider must not clear switching state or overwrite timing for a newer selection',
  );
});

test('re-selecting the active locale is a zero-cost no-op', () => {
  assert.match(
    source,
    /setLocale: next => next === activeLocale\.current \? Promise\.resolve\(0\) : apply\(next\),/,
    'the synchronous active locale must bypass persistence and switching-state churn, including duplicate taps before React rerenders',
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
    /return \(\) => \{\s*active = false;\s*mounted\.current = false;\s*if \(timeoutId\) clearTimeout\(timeoutId\);\s*\};/s,
    'bootstrap cleanup must invalidate late completions, mark the provider unmounted, and cancel its timeout',
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

test('locale bootstrap treats synchronous and asynchronous AsyncStorage read failures as an ordinary fallback', () => {
  assert.match(
    source,
    /const storageRead = Promise\.resolve\(\)\.then\(\(\) => AsyncStorage\.getItem\(LOCALE_KEY\)\)\.catch\(\(\) => null\);/,
    'storage read throws and rejections must both be converted to the same bounded fallback path as a timeout',
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
