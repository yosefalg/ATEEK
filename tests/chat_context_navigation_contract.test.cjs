const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const chain = fs.readFileSync('scripts/run77-reels-transform.mjs', 'utf8');
const transform = fs.readFileSync('scripts/run130-chat-context-navigation.mjs', 'utf8');

test('production transform chain applies chat context hardening', () => {
  assert.match(chain, /run130-chat-context-navigation\.mjs/);
});

test('chat linked-listing banner opens the actual listing instead of a no-op', () => {
  assert.match(transform, /onOpenListing: \(item: Listing\) => void/);
  assert.match(transform, /onOpenListing\(listing\)/);
  assert.match(transform, /onOpenListing=\{setSelected\}/);
});

test('conversation list uses indexed lookups for listings profiles and latest messages', () => {
  assert.match(transform, /latestMessageByThread = useMemo/);
  assert.match(transform, /listingById = useMemo/);
  assert.match(transform, /profileById = useMemo/);
  assert.match(transform, /const itemListing = listingById\.get\(item\.listing_id\)/);
  assert.match(transform, /const other = profileById\.get\(otherId\)/);
  assert.match(transform, /const last = latestMessageByThread\.get\(item\.id\)/);
});
