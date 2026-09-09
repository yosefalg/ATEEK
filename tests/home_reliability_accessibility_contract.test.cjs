const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const chain = fs.readFileSync('scripts/run77-reels-transform.mjs', 'utf8');
const transform = fs.readFileSync('scripts/run182-home-reliability-accessibility.mjs', 'utf8');
const source = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

test('Home reliability polish runs after existing search/listing transforms', () => {
  const searchIndex = chain.indexOf("await import('./run181-search-accessibility-polish.mjs');");
  const homeIndex = chain.indexOf("await import('./run182-home-reliability-accessibility.mjs');");
  assert.ok(searchIndex >= 0, 'search accessibility transform must remain chained');
  assert.ok(homeIndex > searchIndex, 'Home reliability transform must run after existing production polish');
});

test('Home failed-media memory stays bounded and secondary actions meet 44dp target', () => {
  assert.match(source, /const FAILED_IMAGE_CACHE_LIMIT=64;/);
  assert.match(source, /while\(next\.size>FAILED_IMAGE_CACHE_LIMIT\)/);
  assert.match(source, /next\.delete\(oldest\);/);
  assert.match(source, /sectionAction:\{minHeight:44/);
  assert.match(source, /paddingHorizontal:12/);
});

test('Home polish preserves real Supabase reels and existing navigation semantics', () => {
  assert.match(source, /supabase\.from\('reels'\)/);
  assert.match(source, /supabase\.channel\('home-run77-reels'\)/);
  assert.match(source, /onNavigate\(q\.tab\)/);
  assert.doesNotMatch(transform, /supabase\.from\(|onNavigate\(|tab:/);
});
