const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/components/ListingCard.tsx', 'utf8');

test('seller metrics network rejection is contained and pending request is always cleared', () => {
  assert.match(source, /await supabase\.rpc\('ateek_seller_metrics'/);
  assert.match(source, /catch\s*\{\s*return null;\s*\}\s*finally\s*\{\s*pending\.delete\(sellerId\);/s);
});

test('seller identity changes clear stale trust metrics before an uncached request resolves', () => {
  assert.match(
    source,
    /const cached = cache\.get\(sellerId\);[\s\S]*?if \(cached\) \{[\s\S]*?setMetrics\(cached\);[\s\S]*?return \(\) => \{[\s\S]*?alive = false;[\s\S]*?\};[\s\S]*?\}[\s\S]*?setMetrics\(null\);[\s\S]*?void getSellerMetrics\(sellerId\)/,
  );
});

test('listing card skips invalid or unsafe media URIs and renders an accessible fallback', () => {
  assert.match(source, /import \{ safeRemoteMediaUrl \} from '\.\.\/services\/videoSafety';/);
  assert.match(source, /const imageUri = safeRemoteMediaUrl\(item\.image\) \?\? '';/);
  assert.match(source, /const hasImage = imageUri\.length > 0;/);
  assert.match(source, /!hasImage \|\| imageFailed \?/);
  assert.match(source, /source=\{\{\s*uri:\s*imageUri\s*\}\}/);
  assert.match(source, /`لا توجد صورة للإعلان \$\{item\.title\}`/);
  assert.doesNotMatch(source, /const imageUri = item\.image\?\.trim\(\) \?\? '';/);
});
