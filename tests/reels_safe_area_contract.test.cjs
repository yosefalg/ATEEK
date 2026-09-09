const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const shell = fs.readFileSync('src/AppShell.tsx', 'utf8');
const reels = fs.readFileSync('src/components/SpatialReelsHub.tsx', 'utf8');
const pkg = require('../package.json');

test('Reels safe-area hook is always mounted under SafeAreaProvider', () => {
  assert.match(reels, /useSafeAreaInsets\(\)/);
  assert.match(shell, /import \{ SafeAreaProvider \} from 'react-native-safe-area-context';/);
  assert.match(shell, /<SafeAreaProvider><LocaleProvider><LocalizedApp\/><\/LocaleProvider><\/SafeAreaProvider>/);
});

test('safe-area provider uses the existing Expo-compatible dependency', () => {
  assert.equal(pkg.dependencies['react-native-safe-area-context'], '~5.6.0');
});
