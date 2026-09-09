const fs=require('node:fs');
const test=require('node:test');
const assert=require('node:assert/strict');

const source=fs.readFileSync('src/AppShell.tsx','utf8');

test('app error recovery remounts the failed subtree',()=>{
  assert.match(source,/retryKey:number/);
  assert.match(source,/retryKey:retryKey\+1/);
  assert.match(source,/<React\.Fragment key=\{this\.state\.retryKey\}>/);
});

test('app error fallback is announced and exposes an accessible retry action',()=>{
  assert.match(source,/accessibilityRole="alert"/);
  assert.match(source,/accessibilityLiveRegion="assertive"/);
  assert.match(source,/accessibilityLabel=\{l\.retry\}/);
  assert.match(source,/accessibilityRole="button"/);
});
