const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/components/ListingCard.tsx', 'utf8');

test('seller metrics network rejection is contained and pending request is always cleared', () => {
  assert.match(source, /await supabase\.rpc\('ateek_seller_metrics'/);
  assert.match(source, /catch\s*\{\s*return null;\s*\}\s*finally\s*\{\s*pending\.delete\(sellerId\);/s);
});
