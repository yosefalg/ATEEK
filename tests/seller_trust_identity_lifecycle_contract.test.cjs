const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/components/SellerTrustPanel.tsx', 'utf8');

test('seller trust metrics never render for a previous seller id', () => {
  assert.match(source, /const\[resolvedSellerId,setResolvedSellerId\]=useState<string\|null>\(null\)/);
  assert.match(source, /if\(error\)\{setError\(true\);setResolvedSellerId\(sellerId\);return\}/);
  assert.match(source, /setM\(data as Metrics\);setResolvedSellerId\(sellerId\)/);
  assert.match(source, /if\(resolvedSellerId!==sellerId\)return <ActivityIndicator/);
  assert.match(source, /return\(\)=>\{alive=false\}/);
  assert.doesNotMatch(source, /if\(!m&&!error\)return <ActivityIndicator/);
});
