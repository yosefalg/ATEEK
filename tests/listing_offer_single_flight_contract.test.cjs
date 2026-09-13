const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/screens/ListingDetails.tsx', 'utf8');

test('listing offer submission is synchronously single-flight before React clears the draft', () => {
  assert.match(source, /const offerSubmissionRef = useRef\(false\);/);
  assert.match(source, /if \(offerSubmissionRef\.current\) return;/);
  assert.match(source, /offerSubmissionRef\.current = true;/);
  assert.match(source, /if \(!offer\) offerSubmissionRef\.current = false;/);
});

test('listing offer single-flight guard preserves the real local draft callback and truthful confirmation', () => {
  assert.match(source, /onOffer\(value\);/);
  assert.match(source, /setOffer\(''\);/);
  assert.match(source, /محفوظة محليًا فقط\. لم تُرسل للبائع/);
  assert.match(source, /catch \(error\) \{[\s\S]*offerSubmissionRef\.current = false;[\s\S]*throw error;/);
});
