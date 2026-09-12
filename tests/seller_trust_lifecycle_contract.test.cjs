const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/components/SellerTrustPanel.tsx', 'utf8');

test('seller trust clears prior identity state before resolving a new seller', () => {
  assert.match(source, /useEffect\(\(\)=>\{let alive=true;setM\(null\);setError\(false\);setResolvedSellerId\(null\);/);
  assert.match(source, /if\(!sellerId\)return\(\)=>\{alive=false\}/);
  assert.match(source, /if\(resolvedSellerId!==sellerId\)return <ActivityIndicator/);
});

test('seller trust contains RPC transport failures without stale updates', () => {
  assert.match(source, /void Promise\.resolve\(supabase\.rpc\('ateek_seller_metrics',\{p_seller:sellerId\}\)\.then/);
  assert.match(source, /\.catch\(\(\)=>\{if\(!alive\)return;setError\(true\);setResolvedSellerId\(sellerId\)\}\)/);
  assert.match(source, /return\(\)=>\{alive=false\}/);
});

test('seller trust keeps the production metrics RPC and fails closed on errors', () => {
  assert.match(source, /supabase\.rpc\('ateek_seller_metrics',\{p_seller:sellerId\}\)/);
  assert.match(source, /if\(error\)\{setError\(true\);setResolvedSellerId\(sellerId\);return\}/);
  assert.match(source, /if\(error\)return null;/);
});
