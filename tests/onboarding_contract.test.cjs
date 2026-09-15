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

test('onboarding releases a page-transition lock after viewport recentering', () => {
  assert.match(source, /requestAnimationFrame\(\(\) => \{[\s\S]*?scrollToOffset\(\{ offset: pageWidth \* index, animated: false \}\);[\s\S]*?releaseMovement\(\);[\s\S]*?\}\)/);
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
  assert.match(source, /if \(moving \|\| completing\) return/);
  assert.match(source, /setMoving\(true\)[\s\S]*?scrollToIndex\(\{ index: index \+ 1, animated: true \}\)/);
  assert.match(source, /onMomentumScrollEnd=[\s\S]*?releaseMovement\(\)/);
  assert.match(source, /onScrollToIndexFailed=[\s\S]*?releaseMovement\(\)/);
});

test('onboarding page-transition lock has a bounded recovery path', () => {
  assert.match(source, /const movementRecoveryRef = useRef<ReturnType<typeof setTimeout> \| null>\(null\)/);
  assert.match(source, /movementRecoveryRef\.current = setTimeout\(\(\) => \{[\s\S]*?setMoving\(false\);[\s\S]*?\}, 1500\)/);
  assert.match(source, /useEffect\(\(\) => \(\) => clearMovementRecovery\(\), \[\]\)/);
  assert.match(source, /const releaseMovement = \(\) => \{[\s\S]*?clearMovementRecovery\(\);[\s\S]*?setMoving\(false\);/);
});

test('onboarding completion is synchronously single-flight for finish and skip actions', () => {
  assert.match(source, /const completionRef = useRef\(false\)/);
  assert.match(source, /const finish = \(\) => \{[\s\S]*?if \(completionRef\.current\) return;[\s\S]*?completionRef\.current = true;[\s\S]*?setCompleting\(true\);[\s\S]*?onDone\(\);/);
  assert.match(source, /if \(index >= pages\.length - 1\) return finish\(\)/);
  assert.match(source, /const controlsDisabled = moving \|\| completing/);
  assert.match(source, /accessibilityLabel="تخطي المقدمة"[\s\S]*?disabled=\{controlsDisabled\} onPress=\{finish\}/);
});

test('onboarding blocks gesture paging while programmatic page navigation is active', () => {
  assert.match(source, /scrollEnabled=\{!moving\}/);
});

test('onboarding controls expose completion busy state to touch and assistive technology', () => {
  assert.match(source, /const controlsDisabled = moving \|\| completing/);
  const sharedStateMatches = source.match(/accessibilityState=\{\{ disabled: controlsDisabled, busy: completing \}\}/g) || [];
  const sharedDisabledMatches = source.match(/disabled=\{controlsDisabled\}/g) || [];
  assert.equal(sharedStateMatches.length, 2);
  assert.equal(sharedDisabledMatches.length, 2);
});

test('onboarding completion persistence retries once without blocking the current session', () => {
  assert.match(gateSource, /const persistCompletion = async \(\) => \{/);
  const persistenceAttempts = gateSource.match(/await AsyncStorage\.setItem\(KEY, '1'\)/g) || [];
  assert.equal(persistenceAttempts.length, 2);
  assert.match(gateSource, /catch \{[\s\S]*?try \{[\s\S]*?await AsyncStorage\.setItem\(KEY, '1'\);[\s\S]*?\} catch \{/);
  assert.match(gateSource, /const write = persistCompletion\(\)[\s\S]*?\.finally\(/);
  assert.match(gateSource, /setDone\(true\)/);
});
