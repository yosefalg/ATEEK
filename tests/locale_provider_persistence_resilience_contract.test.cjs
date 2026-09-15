const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/i18n/LocaleProvider.tsx', 'utf8');

test('locale switching always clears busy state when persistence fails', () => {
  assert.match(source, /try \{\s*if \(persist\) await AsyncStorage\.setItem\(LOCALE_KEY, next\);\s*\} finally \{/s);
  assert.match(source, /finally \{[\s\S]*setLastSwitchMs\(elapsed\);[\s\S]*setSwitching\(false\);/);
});

test('locale bootstrap does not update readiness after unmount', () => {
  assert.match(
    source,
    /void Promise\.race\(\[storageRead, timeout\]\)\.then\(storedRaw => \{[\s\S]*if \(!active\) return;[\s\S]*setReady\(true\);[\s\S]*\}\)\.catch\(\(\) => \{ if \(active\) setReady\(true\); \}\);/,
    'bounded bootstrap success and failure paths must both respect the effect lifetime guard',
  );
  assert.match(
    source,
    /return \(\) => \{\s*active = false;\s*if \(timeoutId\) clearTimeout\(timeoutId\);\s*\};/s,
    'bootstrap cleanup must invalidate late completions and cancel its timeout',
  );
});
