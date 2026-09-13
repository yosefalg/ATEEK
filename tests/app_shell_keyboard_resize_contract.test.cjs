const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('Android root shell relies on native adjustResize instead of applying a second JS keyboard resize', () => {
  const shell = fs.readFileSync('src/AppShell.tsx', 'utf8');
  const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));

  assert.equal(app.expo.android.softwareKeyboardLayoutMode, 'resize');
  assert.match(shell, /<KeyboardAvoidingView[^>]*enabled=\{isIOS\}[^>]*behavior=\{isIOS\?'padding':undefined\}/);
  assert.doesNotMatch(shell, /behavior=\{isIOS\?'padding':'height'\}/);
});

test('iOS keeps bounded keyboard offset and padding avoidance', () => {
  const shell = fs.readFileSync('src/AppShell.tsx', 'utf8');

  assert.match(shell, /const kOffset=Math\.max\(12,Math\.min\(40,Math\.round\(height\*\.025\)\)\)/);
  assert.match(shell, /keyboardVerticalOffset=\{isIOS\?kOffset:0\}/);
});
