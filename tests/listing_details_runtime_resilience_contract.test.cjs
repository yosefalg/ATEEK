const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(process.cwd(), 'src/screens/ListingDetails.tsx'), 'utf8');

test('listing details keeps remote media fail-closed with explicit retry', () => {
  assert.match(source, /safeRemoteMediaUrl\(item\.image\)/);
  assert.match(source, /showImageFallback = imageFailed \|\| !hasImage/);
  assert.match(source, /onError=\{\(\) => setImageFailed\(true\)\}/);
  assert.match(source, /const retryImage = \(\) =>/);
  assert.match(source, /setImageRetry\(value => value \+ 1\)/);
  assert.match(source, /key=\{`\$\{item\.id\}-\$\{imageRetry\}`\}/);
});

test('listing details prevents duplicate offer submissions and never claims remote delivery', () => {
  assert.match(source, /const offerSubmissionRef = useRef\(false\)/);
  assert.match(source, /if \(offerSubmissionRef\.current\) return/);
  assert.match(source, /offerSubmissionRef\.current = true/);
  assert.match(source, /onOffer\(value\)/);
  assert.match(source, /محفوظة محليًا فقط\. لم تُرسل للبائع/);
  assert.match(source, /offerSubmissionRef\.current = false/);
});

test('listing details preserves modal and primary action accessibility semantics', () => {
  assert.match(source, /accessibilityViewIsModal/);
  assert.match(source, /accessibilityLabel="إغلاق تفاصيل الإعلان"/);
  assert.match(source, /accessibilityState=\{\{ selected: favorite \}\}/);
  assert.match(source, /accessibilityState=\{\{ disabled: !canSubmitOffer \}\}/);
  assert.match(source, /accessibilityLabel=\{`مراسلة البائع \$\{item\.seller\}`\}/);
});
