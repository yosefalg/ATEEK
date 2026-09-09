const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/components/SpatialDealScreens.tsx', 'utf8');
const transform = fs.readFileSync('scripts/run77-reels-transform.mjs', 'utf8');

test('production transform applies chat layout polish after chat media/context transforms', () => {
  assert.match(transform, /run130-chat-context-navigation\.mjs/);
  assert.match(transform, /run163-chat-layout-polish\.mjs/);
  assert.ok(transform.indexOf('run163-chat-layout-polish.mjs') > transform.indexOf('run130-chat-context-navigation.mjs'));
});

test('chat timeline no longer renders the persistent offer stack inline', () => {
  assert.doesNotMatch(source, /style=\{styles\.offersStack\}/);
  assert.doesNotMatch(source, /style=\{styles\.offerStrip\}/);
  assert.match(source, /styles\.dealToolsButton/);
  assert.match(source, />العروض والتفاوض</);
});

test('negotiation remains real and accessible inside a dedicated sheet', () => {
  assert.match(source, /visible=\{offerSheetOpen\}/);
  assert.match(source, /const threadOffers = useMemo\(\(\) => m\.offers\.filter/);
  assert.match(source, /onPress=\{sendOffer\}/);
  assert.match(source, /run\('respond', \{ offer_id: offer\.id, status: 'accepted' \}\)/);
  assert.match(source, /run\('respond', \{ offer_id: offer\.id, status: 'rejected' \}\)/);
  assert.match(source, /run\('complete', \{ offer_id: offer\.id \}\)/);
  assert.match(source, /accessibilityHint="يفتح لوحة تقديم العرض ومراجعة العروض الحالية"/);
});

test('chat keeps a compact safety reminder without blocking the message timeline', () => {
  assert.match(source, /style=\{styles\.chatSafetyNote\}/);
  assert.match(source, /لا تشارك رموز التحقق أو بيانات الدفع/);
  assert.match(source, /messagesList: \{ flex: 1 \}/);
});
