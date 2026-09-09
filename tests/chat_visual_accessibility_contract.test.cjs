const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const transform = fs.readFileSync('scripts/run177-chat-visual-accessibility-polish.mjs', 'utf8');
const chain = fs.readFileSync('scripts/run77-reels-transform.mjs', 'utf8');

test('chat visual polish runs after negotiation layout transform', () => {
  const layoutIndex = chain.indexOf("await import('./run163-chat-layout-polish.mjs');");
  const polishIndex = chain.indexOf("await import('./run177-chat-visual-accessibility-polish.mjs');");
  assert.ok(layoutIndex >= 0, 'negotiation layout transform must remain chained');
  assert.ok(polishIndex > layoutIndex, 'visual polish must run after negotiation layout styles exist');
});

test('negotiation UI increases readability and touch target hierarchy without changing mutations', () => {
  assert.match(transform, /fontSize: 12, fontWeight: '900'/);
  assert.match(transform, /minHeight: 46/);
  assert.match(transform, /minHeight: 50/);
  assert.match(transform, /fontSize: 14/);
  assert.match(transform, /maxHeight: '82%'/);
  assert.doesNotMatch(transform, /m\.mutate|supabase\.|ateek-assistant|setThread\(/);
});

test('offer decision controls remain visually distinct and large enough for deliberate actions', () => {
  assert.match(transform, /miniAccept: \{ minHeight: 38/);
  assert.match(transform, /miniReject: \{ minHeight: 38/);
  assert.match(transform, /completeButton: \{ minHeight: 40/);
});
