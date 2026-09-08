const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/screens/OnboardingScreen.tsx', 'utf8');

test('onboarding keeps bounded responsive paging', () => {
  assert.match(source, /const pageWidth = Math\.max\(1, width\)/);
  assert.match(source, /getItemLayout=/);
  assert.match(source, /onScrollToIndexFailed=/);
  assert.match(source, /Math\.max\(0, Math\.min\(pages\.length - 1, nextIndex\)\)/);
});

test('onboarding keeps lightweight list rendering', () => {
  assert.match(source, /initialNumToRender=\{1\}/);
  assert.match(source, /maxToRenderPerBatch=\{2\}/);
  assert.match(source, /windowSize=\{3\}/);
  assert.match(source, /removeClippedSubviews/);
});

test('onboarding exposes progress and actionable accessibility hints', () => {
  assert.match(source, /accessibilityLiveRegion="polite"/);
  assert.match(source, /accessibilityLabel=\{`الصفحة \$\{index \+ 1\} من \$\{pages\.length\}`\}/);
  assert.match(source, /accessibilityHint=\{index === pages\.length - 1/);
  assert.match(source, /accessibilityHint="ينهي المقدمة ويفتح عتيك مباشرة"/);
});
