const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/screens/OnboardingScreen.tsx', 'utf8');
const gateSource = fs.readFileSync('src/components/OnboardingGate.tsx', 'utf8');

test('onboarding keeps bounded responsive paging', () => {
  assert.match(source, /const pageWidth = Math\.max\(1, width\)/);
  assert.match(source, /getItemLayout=/);
  assert.match(source, /onScrollToIndexFailed=/);
  assert.match(source, /Math\.max\(0, Math\.min\(pages\.length - 1, nextIndex\)\)/);
});

test('onboarding recenters the active page after a viewport resize', () => {
  assert.match(source, /const previousPageWidth = useRef\(pageWidth\)/);
  assert.match(source, /if \(previousPageWidth\.current === pageWidth\) return/);
  assert.match(source, /scrollToOffset\(\{ offset: pageWidth \* index, animated: false \}\)/);
  assert.match(source, /cancelAnimationFrame\(frame\)/);
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

test('onboarding next navigation is single-flight while paging animation is active', () => {
  assert.match(source, /const \[moving, setMoving\] = useState\(false\)/);
  assert.match(source, /if \(moving\) return/);
  assert.match(source, /setMoving\(true\)[\s\S]*?scrollToIndex\(\{ index: index \+ 1, animated: true \}\)/);
  assert.match(source, /onMomentumScrollEnd=[\s\S]*?setMoving\(false\)/);
  assert.match(source, /onScrollToIndexFailed=[\s\S]*?setMoving\(false\)/);
});

test('onboarding blocks gesture paging while programmatic page navigation is active', () => {
  assert.match(source, /scrollEnabled=\{!moving\}/);
});

test('onboarding next control exposes the busy state to touch and assistive technology', () => {
  assert.match(source, /accessibilityState=\{\{ disabled: moving \}\}/);
  assert.match(source, /disabled=\{moving\}/);
  assert.match(source, /style=\{\[s\.primary, moving && s\.primaryBusy\]\}/);
});

test('onboarding completion persistence cannot leak an unhandled storage rejection', () => {
  assert.match(gateSource, /AsyncStorage\.setItem\(KEY, '1'\)[\s\S]*?\.catch\(\(\) => \{\}\)/);
  assert.match(gateSource, /setDone\(true\)/);
});
