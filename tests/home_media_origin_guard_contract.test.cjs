const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(process.cwd(), 'src/screens/HomeScreen.tsx'), 'utf8');

test('home remote media uses the shared hardened HTTPS origin guard', () => {
  assert.match(source, /import \{ safeRemoteMediaUrl \} from '\.\.\/services\/videoSafety';/);
  assert.match(source, /const profileAvatar=safeRemoteMediaUrl\(firstNonEmpty\(profile\?\.avatar_url\)\)\?\?'';/);
  assert.match(source, /image=safeRemoteMediaUrl\(firstNonEmpty\(item\.image\)\)\?\?'';/);
  assert.match(source, /thumbnail=safeRemoteMediaUrl\(firstNonEmpty\(item\.thumbnail_url\)\)\?\?'';/);
});

test('home images only mount the validated media values', () => {
  assert.match(source, /source=\{\{uri:profileAvatar\}\}/);
  assert.match(source, /source=\{\{uri:image\}\}/);
  assert.match(source, /source=\{\{uri:thumbnail\}\}/);
  assert.doesNotMatch(source, /source=\{\{uri:(?:profile\?\.avatar_url|item\.image|item\.thumbnail_url)\}\}/);
});
