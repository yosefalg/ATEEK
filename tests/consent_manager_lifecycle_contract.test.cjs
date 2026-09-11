const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/components/ConsentManager.tsx', 'utf8');

test('consent persistence avoids state updates after unmount', () => {
  assert.match(source, /const mountedRef = useRef\(true\)/);
  assert.match(source, /mountedRef\.current = true/);
  assert.match(source, /mountedRef\.current = false/);
  assert.match(source, /await AsyncStorage\.setItem\(KEY, JSON\.stringify\(value\)\);\s*if \(!mountedRef\.current\) return;/);
  assert.match(source, /if \(mountedRef\.current\) setSaving\(false\)/);
});

test('consent persistence only surfaces storage errors while mounted', () => {
  assert.match(source, /if \(mountedRef\.current\) \{\s*Alert\.alert\('تعذر حفظ الاختيارات'/);
});
