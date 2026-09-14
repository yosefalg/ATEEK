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
    /\}\)\(\)\.catch\(\(\) => \{ if \(active\) setReady\(true\); \}\);/,
    'bootstrap failure recovery must respect the effect lifetime guard',
  );
});
