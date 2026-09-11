const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/screens/SearchScreen.tsx', 'utf8');

test('profile search canonicalizes usernames before the real Supabase RPC', () => {
  assert.match(source, /const normalizeUsername=\(value:string\)=>value\.replace\(\/\^@\/,''\)\.trim\(\)\.toLowerCase\(\)/);
  assert.match(source, /const name=normalizeUsername\(raw\)/);
  assert.match(source, /ateek_profile_by_username',\{p_username:name\}/);
  assert.match(source, /commitHistory\(`@\$\{name\}`\)/);
});

test('search history deduplicates equivalent casing and whitespace from the latest synchronous snapshot', () => {
  assert.match(source, /const key=normalize\(x\),next=\[x,\.\.\.historyRef\.current\.filter\(v=>normalize\(v\)!==key\)\]/);
  assert.match(source, /historyRef\.current=next;setHistory\(next\)/);
});

test('saved-search match counting avoids allocating a filtered listing array per saved search', () => {
  assert.match(source, /const savedMatches=useMemo\(\(\)=>\{let total=0;for\(const s of saved\)/);
  assert.doesNotMatch(source, /saved\.reduce\(\(n,s\)=>\{const q=normalize\(s\.q\);return n\+searchableListings\.filter/);
});
