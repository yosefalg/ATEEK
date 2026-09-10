const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const chain = fs.readFileSync('scripts/run77-reels-transform.mjs', 'utf8');
const transform = fs.readFileSync('scripts/run184-listing-ai-temp-cleanup.mjs', 'utf8');
const source = fs.readFileSync('src/screens/AddListingScreen.tsx', 'utf8');

test('listing AI temp cleanup runs after existing Home reliability transforms', () => {
  const homeIndex = chain.indexOf("await import('./run183-home-media-cache-bounding.mjs');");
  const cleanupIndex = chain.indexOf("await import('./run184-listing-ai-temp-cleanup.mjs');");
  assert.ok(homeIndex >= 0, 'Run #183 must remain chained');
  assert.ok(cleanupIndex > homeIndex, 'Run #184 must run after Run #183');
});

test('listing AI temp cleanup tracks and deletes only the derived analysis image', () => {
  assert.match(transform, /let compressedUri: string \| null = null;/);
  assert.match(transform, /compressedUri = compressed\.uri;/);
  assert.match(transform, /compressedUri && compressedUri !== image/);
  assert.match(transform, /FileSystem\.deleteAsync\(compressedUri, \{ idempotent: true \}\)/);
});

test('listing AI cleanup anchor stays local to analyzeImage and independent of later function insertion', () => {
  assert.match(transform, /setAnalyzing\(false\);\\n    }\\n  };/);
  assert.doesNotMatch(transform, /const publish = async/);
  assert.doesNotMatch(transform, /const improveDescription = async/);
});

test('listing AI cleanup preserves the real Supabase classifier and listing semantics', () => {
  assert.match(source, /supabase\.functions\.invoke\('ai-classify'/);
  assert.match(source, /mimeType: 'image\/jpeg'/);
  assert.match(source, /categories: categories\.map/);
  assert.doesNotMatch(transform, /supabase\.|onAdd\(|AsyncStorage\.(setItem|removeItem)/);
});
