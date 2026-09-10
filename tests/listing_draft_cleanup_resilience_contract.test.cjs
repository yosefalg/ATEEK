const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const source = fs.readFileSync(path.join(process.cwd(), 'src/screens/AddListingScreen.tsx'), 'utf8');

test('listing draft cleanup paths contain AsyncStorage removal failures', () => {
  const guardedRemovals = source.match(/AsyncStorage\.removeItem\(DRAFT_KEY\)\.catch\(\(\) => \{\}\)/g) ?? [];

  // Corrupt draft, invalid draft, explicit discard, and successful publication
  // must all remain safe if local storage rejects a cleanup write.
  assert.ok(
    guardedRemovals.length >= 4,
    `expected at least 4 rejection-safe draft removals, found ${guardedRemovals.length}`,
  );
});

test('draft restore failure still releases the screen without deleting unknown storage state', () => {
  assert.match(
    source,
    /AsyncStorage\.getItem\(DRAFT_KEY\)[\s\S]*?\.catch\(\(\) => \{\s*if \(active\) setDraftReady\(true\);\s*\}\)/,
  );
  assert.doesNotMatch(
    source,
    /AsyncStorage\.getItem\(DRAFT_KEY\)[\s\S]*?\.catch\(\(\) => \{[\s\S]*?removeItem\(DRAFT_KEY\)/,
  );
});

test('successful publication still waits for pending draft work before cleanup', () => {
  assert.match(source, /publishedRef\.current = true;/);
  assert.match(source, /draftGenerationRef\.current \+= 1;/);
  assert.match(source, /await draftWriteChainRef\.current\.catch\(\(\) => \{\}\);/);
  assert.match(source, /await AsyncStorage\.removeItem\(DRAFT_KEY\)\.catch\(\(\) => \{\}\);/);
});
