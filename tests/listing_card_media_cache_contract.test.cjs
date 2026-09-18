const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const source = fs.readFileSync(path.join(process.cwd(), 'src/components/ListingCard.tsx'), 'utf8');

test('listing cards sanitize remote media before rendering', () => {
  assert.match(source, /const imageUri = safeRemoteMediaUrl\(item\.image\) \?\? '';/);
  assert.match(source, /source=\{\{ uri: imageUri \}\}/);
  assert.doesNotMatch(source, /source=\{\{\s*uri:\s*item\.image\s*\}\}/);
});

test('seller metrics cache stays bounded', () => {
  assert.match(source, /const MAX_SELLER_METRICS_CACHE = 250;/);
  assert.match(source, /while \(cache\.size > MAX_SELLER_METRICS_CACHE\)/);
  assert.match(source, /cache\.delete\(oldestKey\)/);
});

test('concurrent seller metric requests are deduplicated and cleaned up', () => {
  assert.match(source, /const pending = new Map<string, Promise<Metrics \| null>>\(\);/);
  assert.match(source, /const existing = pending\.get\(sellerId\);\s*if \(existing\) return existing;/);
  assert.match(source, /finally \{\s*pending\.delete\(sellerId\);\s*\}/);
  assert.match(source, /pending\.set\(sellerId, request\);/);
});

test('failed listing images degrade to an explicit fallback instead of retry loops', () => {
  assert.match(source, /const \[imageFailed, setImageFailed\] = useState\(false\);/);
  assert.match(source, /onError=\{\(\) => \{\s*setImageFailed\(true\);\s*setLoaded\(true\);\s*\}\}/);
  assert.match(source, /!hasImage \|\| imageFailed/);
});
