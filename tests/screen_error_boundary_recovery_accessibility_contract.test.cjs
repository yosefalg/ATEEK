const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(process.cwd(), 'src/components/ScreenErrorBoundary.tsx'), 'utf8');

test('contained runtime failures are announced immediately to assistive technology', () => {
  assert.match(source, /accessibilityRole=["']alert["']/);
  assert.match(source, /accessibilityLiveRegion=["']assertive["']/);
});

test('recovery action exposes a stable button label and contextual hint', () => {
  assert.match(source, /accessibilityRole=["']button["']/);
  assert.match(source, /accessibilityLabel=["']إعادة فتح الشاشة["']/);
  assert.match(source, /accessibilityHint=\{`يحاول تشغيل \$\{this\.props\.name\} من جديد`\}/);
});

test('decorative recovery icons remain hidden from accessibility traversal', () => {
  const hiddenIcons = source.match(/<Ionicons[^>]*accessibilityElementsHidden[^>]*\/>/g) || [];
  assert.ok(hiddenIcons.length >= 2, 'expected both decorative recovery icons to be hidden');
});

test('retry clears only the isolated error and advances the remount serial', () => {
  assert.match(source, /private retry = \(\) => this\.setState\(\(s\) => \(\{ error: null, serial: s\.serial \+ 1 \}\)\)/);
  assert.match(source, /<React\.Fragment key=\{this\.state\.serial\}>/);
});
