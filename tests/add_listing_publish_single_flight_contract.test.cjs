const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/screens/AddListingScreen.tsx', 'utf8');

test('listing publication is synchronously single-flight before React state commits', () => {
  assert.match(source, /const publishInFlightRef = useRef\(false\);/);
  assert.match(source, /if \(publishInFlightRef\.current \|\| publishing \|\| analyzing\) return;/);
  assert.match(source, /publishInFlightRef\.current = true;\s*setPublishing\(true\);/s);
  assert.match(source, /finally \{\s*publishInFlightRef\.current = false;\s*setPublishing\(false\);/s);
});

test('single-flight guard preserves the real publish callback and draft cleanup', () => {
  assert.match(source, /await onAdd\(\{/);
  assert.match(source, /publishedRef\.current = true;/);
  assert.match(source, /await draftWriteChainRef\.current\.catch\(\(\) => \{\}\);/);
  assert.match(source, /await AsyncStorage\.removeItem\(DRAFT_KEY\)\.catch\(\(\) => \{\}\);/);
});

test('listing AI analysis is synchronously single-flight before React state commits', () => {
  assert.match(source, /const analyzeInFlightRef = useRef\(false\);/);
  assert.match(source, /if \(!image \|\| analyzeInFlightRef\.current \|\| analyzing \|\| publishing\) return;/);
  assert.match(source, /analyzeInFlightRef\.current = true;\s*setAnalyzing\(true\);/s);
  assert.match(source, /finally \{[\s\S]*?analyzeInFlightRef\.current = false;\s*setAnalyzing\(false\);/);
  assert.match(source, /FileSystem\.deleteAsync\(compressedUri, \{ idempotent: true \}\)\.catch\(\(\) => \{\}\);[\s\S]*?analyzeInFlightRef\.current = false;/);
});

test('analysis single-flight guard preserves the real Supabase classifier path', () => {
  assert.match(source, /supabase\.functions\.invoke\('ai-classify'/);
  assert.match(source, /imageBase64: base64/);
  assert.match(source, /if \(data\?\.category && categories\.some\(item => item\.id === data\.category\)\) setCategory/);
});

test('listing image picker is synchronously single-flight across permission and picker awaits', () => {
  assert.match(source, /const pickImageInFlightRef = useRef\(false\);/);
  assert.match(source, /if \(pickImageInFlightRef\.current \|\| publishing \|\| analyzing\) return;/);
  assert.match(source, /pickImageInFlightRef\.current = true;\s*try \{/s);
  assert.match(source, /finally \{\s*pickImageInFlightRef\.current = false;\s*\}/s);
});

test('image picker guard preserves the real permission and selected asset flow', () => {
  assert.match(source, /ImagePicker\.requestMediaLibraryPermissionsAsync\(\)/);
  assert.match(source, /ImagePicker\.launchImageLibraryAsync\(\{ mediaTypes: \['images'\], quality: 0\.75, allowsEditing: true \}\)/);
  assert.match(source, /if \(!result\.canceled && result\.assets\[0\]\) setImage\(result\.assets\[0\]\.uri\);/);
});
