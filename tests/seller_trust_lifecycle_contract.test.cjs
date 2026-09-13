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
  assert.match(source, /\.catch\(\(\)=>\{if\(!alive\)return;setM\(null\);setError\(true\);setResolvedSellerId\(sellerId\)\}\)/);
  assert.match(source, /return\(\)=>\{alive=false\}/);
});

test('seller trust validates RPC metrics and fails closed on malformed data or errors', () => {
  assert.match(source, /supabase\.rpc\('ateek_seller_metrics',\{p_seller:sellerId\}\)/);
  assert.match(source, /function isMetrics\(value:unknown\):value is Metrics/);
  assert.match(source, /Number\.isSafeInteger\(m\.completedDeals\).*Number\.isSafeInteger\(m\.accountAgeDays\)/);
  assert.match(source, /if\(error\|\|!isMetrics\(data\)\)\{setM\(null\);setError\(true\);setResolvedSellerId\(sellerId\);return\}/);
  assert.match(source, /if\(error\|\|!m\)return null;/);
});
