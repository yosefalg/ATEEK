const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/i18n/LocaleProvider.tsx', 'utf8');

test('locale switching always clears busy state when persistence fails', () => {
  assert.match(source, /try \{\s*if \(persist\) await AsyncStorage\.setItem\(LOCALE_KEY, next\);\s*\} finally \{/s);
  assert.match(source, /finally \{[\s\S]*setLastSwitchMs\(elapsed\);[\s\S]*setSwitching\(false\);/);
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
