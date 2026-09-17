const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const source = fs.readFileSync(path.join(process.cwd(), 'src/components/AuthPortal.tsx'), 'utf8');

test('primary auth action exposes disabled and busy accessibility state', () => {
  assert.match(source, /accessibilityState=\{\{ disabled: props\.busy, busy: props\.busy \}\}/);
  assert.match(source, /disabled=\{props\.busy\}[\s\S]*?onPress=\{props\.onSubmit\}/);
});

test('secondary auth mode action cannot be triggered while auth request is busy', () => {
  assert.match(source, /accessibilityState=\{\{ disabled: props\.busy \}\}[\s\S]*?disabled=\{props\.busy\}[\s\S]*?onPress=\{props\.onToggleMode\}/);
});

test('busy auth action presents a progress indicator and status copy', () => {
  assert.match(source, /props\.busy \? <ActivityIndicator/);
  assert.match(source, /props\.busy \? 'جارٍ الاتصال…'/);
});

test('busy progress icon stays hidden from accessibility to avoid duplicate announcements', () => {
  assert.match(source, /<ActivityIndicator[^>]*accessibilityElementsHidden[^>]*importantForAccessibility="no"/);
});
