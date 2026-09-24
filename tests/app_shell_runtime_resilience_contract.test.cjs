const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/AppShell.tsx', 'utf8');

test('Android preserves native adjustResize by disabling JS keyboard avoidance', () => {
  assert.match(source, /const isIOS=Platform\.OS==='ios'/);
  assert.match(source, /enabled=\{isIOS\}/);
  assert.match(source, /behavior=\{isIOS\?'padding':undefined\}/);
  assert.match(source, /keyboardVerticalOffset=\{isIOS\?kOffset:0\}/);
});

test('shell direction follows locale RTL state without changing route semantics', () => {
  assert.match(source, /direction:isRTL\?'rtl':'ltr'/);
  assert.match(source, /<OnlineApp\/>/);
  assert.match(source, /<SpatialSocialHub\/>/);
});

test('reduced-motion preference prevents shell entrance timing animations', () => {
  assert.match(source, /if\(!animationsEnabled\)\{opacity\.value=1;scale\.value=1;return\}/);
  assert.match(source, /withTiming\(1,\{duration:180\}\)/);
});

test('error boundary exposes an accessible recoverable failure state', () => {
  assert.match(source, /accessibilityRole="alert"/);
  assert.match(source, /accessibilityLiveRegion="assertive"/);
  assert.match(source, /accessibilityRole="button"/);
  assert.match(source, /onPress=\{this\.reset\}/);
  assert.match(source, /failed:false,retryKey:retryKey\+1/);
});

test('provider order keeps locale available to localized boundary and theme consumers', () => {
  assert.match(source, /<SafeAreaProvider><LocaleProvider><LocalizedApp\/><\/LocaleProvider><\/SafeAreaProvider>/);
  assert.match(source, /<AppErrorBoundary labels=\{labels\}><ThemeProvider><ConsentManager><OnboardingGate><Shell\/><\/OnboardingGate><\/ConsentManager><\/ThemeProvider><\/AppErrorBoundary>/);
});
