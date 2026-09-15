const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const src = fs.readFileSync('src/components/OnboardingGate.tsx', 'utf8');

test('onboarding completion persistence is single-flight and rejection-safe', () => {
  assert.match(src, /const completionWriteRef = useRef<Promise<void> \| null>\(null\)/);
  assert.match(src, /if \(completionWriteRef\.current\) return;/);
  assert.match(src, /const persistCompletion = async \(\) => \{[\s\S]*?try \{[\s\S]*?await AsyncStorage\.setItem\(KEY, '1'\);[\s\S]*?\} catch \{[\s\S]*?try \{[\s\S]*?await AsyncStorage\.setItem\(KEY, '1'\);[\s\S]*?\} catch \{[\s\S]*?\}[\s\S]*?\}[\s\S]*?\};/);
  assert.match(src, /const write = persistCompletion\(\)[\s\S]*?\.finally\(/);
  assert.match(src, /if \(completionWriteRef\.current === write\) completionWriteRef\.current = null/);
});

test('onboarding remains optimistic for the current session while storage persists', () => {
  const complete = src.slice(src.indexOf('const complete = () => {'), src.indexOf('if (done === null)'));
  assert.ok(complete.indexOf('setDone(true)') < complete.indexOf('AsyncStorage.setItem'));
});

test('onboarding initial storage read has a bounded fallback and ignores late results', () => {
  assert.match(src, /const INITIAL_READ_TIMEOUT_MS = 2500/);
  assert.match(src, /let settled = false/);
  assert.match(src, /if \(!alive \|\| settled\) return/);
  assert.match(src, /settled = true;[\s\S]*?clearTimeout\(fallback\);[\s\S]*?setDone\(value\)/);
  assert.match(src, /const fallback = setTimeout\(\(\) => settleInitialRead\(false\), INITIAL_READ_TIMEOUT_MS\)/);
  assert.match(src, /AsyncStorage\.getItem\(KEY\)[\s\S]*?\.then\(\(v\) => settleInitialRead\(v === '1'\)\)[\s\S]*?\.catch\(\(\) => settleInitialRead\(false\)\)/);
  assert.match(src, /alive = false;[\s\S]*?clearTimeout\(fallback\)/);
});
