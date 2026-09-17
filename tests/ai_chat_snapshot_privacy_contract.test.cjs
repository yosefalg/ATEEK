const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/screens/AIAssistantScreen.tsx', 'utf8');

test('AI chat snapshots are isolated per authenticated user and bounded locally', () => {
  assert.match(source, /const CACHE_PREFIX = 'ateek\.ai\.chat\.snapshot\.v1\.'/);
  assert.match(source, /AsyncStorage\.getItem\(CACHE_PREFIX \+ id\)/);
  assert.match(source, /AsyncStorage\.setItem\(CACHE_PREFIX \+ userId,/);
  assert.match(source, /messages: messages\.slice\(-50\)/);
  assert.match(source, /cached\.messages\.slice\(-50\)/);
});

test('remote AI history remains scoped to the authenticated user', () => {
  assert.match(source, /from\('ateek_ai_threads'\)[\s\S]*?\.eq\('user_id', id\)/);
  assert.match(source, /from\('ateek_ai_messages'\)[\s\S]*?\.eq\('thread_id', latest\)\.eq\('user_id', id\)/);
});

test('late hydration cannot overwrite a conversation after user interaction', () => {
  assert.match(source, /const userInteractedRef = useRef\(false\)/);
  assert.match(source, /if \(raw && !userInteractedRef\.current\)/);
  assert.match(source, /if \(!alive \|\| !latest \|\| userInteractedRef\.current\) return;/);
  assert.match(source, /if \(!alive \|\| userInteractedRef\.current\) return;/);
  assert.match(source, /userInteractedRef\.current = true;[\s\S]*?const generation = \+\+streamGeneration\.current;/);
});
