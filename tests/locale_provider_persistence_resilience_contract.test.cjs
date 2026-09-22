const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/i18n/LocaleProvider.tsx', 'utf8');

test('locale switching always clears busy state when persistence fails', () => {
  assert.match(source, /try \{\s*if \(persist\) await AsyncStorage\.setItem\(LOCALE_KEY, next\);\s*\} finally \{/s);
  assert.match(source, /finally \{[\s\S]*setLastSwitchMs\(elapsed\);[\s\S]*setSwitching\(false\);/);
});

test('locale bootstrap does not update readiness after unmount', () => {
  const bootstrap = source.match(/void Promise\.race\(\[storageRead, timeout\]\)\.then\(storedRaw => \{([\s\S]*?)\}\)\.catch\(\(\) => \{([\s\S]*?)\}\);/);
  assert.ok(bootstrap, 'bounded bootstrap must retain explicit success and failure handlers');
  for (const [name, body] of [['success', bootstrap[1]], ['failure', bootstrap[2]]]) {
    assert.match(body, /if \(!active\) return;/, `${name} path must respect the effect lifetime guard`);
    assert.match(body, /setReady\(true\);/, `${name} path must settle readiness while mounted`);
  }
  assert.match(
    source,
    /return \(\) => \{\s*active = false;\s*if \(timeoutId\) clearTimeout\(timeoutId\);\s*\};/s,
    'bootstrap cleanup must invalidate late completions and cancel its timeout',
  );
});
