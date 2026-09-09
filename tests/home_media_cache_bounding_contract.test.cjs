const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const chain = fs.readFileSync('scripts/run77-reels-transform.mjs', 'utf8');
const transform = fs.readFileSync('scripts/run183-home-media-cache-bounding.mjs', 'utf8');
const source = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

test('Home media cache hardening runs after Home accessibility polish', () => {
  const a11yIndex = chain.indexOf("await import('./run182-home-accessibility-polish.mjs');");
  const cacheIndex = chain.indexOf("await import('./run183-home-media-cache-bounding.mjs');");
  assert.ok(a11yIndex >= 0, 'Home accessibility polish must remain chained');
  assert.ok(cacheIndex > a11yIndex, 'media cache hardening must run after Home accessibility polish');
});

test('Home failed remote-media state is bounded without changing real data wiring', () => {
  assert.match(source, /const FAILED_IMAGE_CACHE_LIMIT=64;/);
  assert.match(source, /while\(next\.size>FAILED_IMAGE_CACHE_LIMIT\)/);
  assert.match(source, /next\.delete\(oldest\);/);
  assert.match(source, /supabase\.from\('reels'\)/);
  assert.match(source, /supabase\.channel\('home-run77-reels'\)/);
});

test('cache hardening transform is scoped away from navigation and backend semantics', () => {
  assert.doesNotMatch(transform, /supabase\.|onNavigate\(|onFavorite\(|onOpen\(|tab:/);
});
