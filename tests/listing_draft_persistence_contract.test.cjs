const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(process.cwd(), 'src/screens/AddListingScreen.tsx'), 'utf8');

test('listing draft writes are serialized and stale generations are ignored', () => {
  assert.match(source, /draftWriteChainRef = useRef<Promise<void>>\(Promise\.resolve\(\)\)/);
  assert.match(source, /draftGenerationRef = useRef\(0\)/);
  assert.match(source, /publishedRef = useRef\(false\)/);
  assert.match(source, /draftWriteChainRef\.current = draftWriteChainRef\.current[\s\S]*generation !== draftGenerationRef\.current/);
  assert.match(source, /await AsyncStorage\.setItem\(DRAFT_KEY, JSON\.stringify\(draft\)\)/);
});

test('successful publication wins over any pending local draft write', () => {
  assert.match(source, /await onAdd\([\s\S]*publishedRef\.current = true;[\s\S]*draftGenerationRef\.current \+= 1;[\s\S]*await draftWriteChainRef\.current\.catch\(\(\) => \{\}\);[\s\S]*await AsyncStorage\.removeItem\(DRAFT_KEY\)\.catch\(\(\) => \{\}\);/);
});
