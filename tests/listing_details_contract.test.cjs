const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('listing details keeps offer entry accessible and guarded', () => {
  const screen = fs.readFileSync('src/screens/ListingDetails.tsx','utf8');
  assert.match(screen, /const offerValue = parsePrice\(offer\)/);
  assert.match(screen, /const canSubmitOffer = Boolean\(offerValue\)/);
  assert.match(screen, /disabled=\{!canSubmitOffer\}/);
  assert.match(screen, /accessibilityState=\{\{ disabled: !canSubmitOffer \}\}/);
  assert.match(screen, /accessibilityViewIsModal/);
  assert.match(screen, /returnKeyType="done"/);
  assert.match(screen, /maxLength=\{14\}/);
  assert.match(screen, /onSubmitEditing=\{submit\}/);
  assert.match(screen, /offerButtonDisabled: \{ opacity: 0\.5 \}/);
  assert.match(screen, /يحفظ مسودة العرض محليًا دون إرسالها للبائع/);
});

test('listing details clears stale offer input across item and visibility changes', () => {
  const screen = fs.readFileSync('src/screens/ListingDetails.tsx','utf8');
  assert.match(screen, /import \{ useEffect, useState \} from 'react';/);
  assert.match(screen, /useEffect\(\(\) => \{[\s\S]*?setOffer\(''\);[\s\S]*?\}, \[item\?\.id, visible\]\);/);
});
