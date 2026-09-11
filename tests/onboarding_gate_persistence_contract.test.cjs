const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const src = fs.readFileSync('src/components/OnboardingGate.tsx', 'utf8');

test('onboarding completion persistence is single-flight and rejection-safe', () => {
  assert.match(src, /const completionWriteRef = useRef<Promise<void> \| null>\(null\)/);
  assert.match(src, /if \(completionWriteRef\.current\) return;/);
  assert.match(src, /AsyncStorage\.setItem\(KEY, '1'\)[\s\S]*?\.catch\(\(\) => \{\}\)[\s\S]*?\.finally\(/);
  assert.match(src, /if \(completionWriteRef\.current === write\) completionWriteRef\.current = null/);
});

test('onboarding remains optimistic for the current session while storage persists', () => {
  const complete = src.slice(src.indexOf('const complete = () => {'), src.indexOf('if (done === null)'));
  assert.ok(complete.indexOf('setDone(true)') < complete.indexOf('AsyncStorage.setItem'));
});
