const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workflowPath = path.join(process.cwd(), '.github/workflows/ateek-2.2-staging.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');

function indexOfOrFail(haystack, needle) {
  const index = haystack.indexOf(needle);
  assert.notEqual(index, -1, `Expected staging workflow to contain: ${needle}`);
  return index;
}

test('staging validates application code before requiring release signing material', () => {
  const staticValidation = indexOfOrFail(workflow, '- name: Static validation');
  const signingGate = indexOfOrFail(workflow, '- name: Validate release signing material');
  assert.ok(staticValidation < signingGate, 'Static validation must run before the signing-secret gate');

  for (const command of [
    'npm run typecheck',
    'npm run i18n:check',
    'npm test',
    'npx expo-doctor@latest',
    'npx expo export --platform android --output-dir dist-ci',
  ]) {
    assert.match(workflow, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('staging release APK cannot silently fall back to Android debug signing', () => {
  assert.match(workflow, /signingConfig signingConfigs\.release/);
  assert.match(workflow, /Could not replace generated release debug signing config/);
  assert.match(workflow, /CN=Android Debug/);
  assert.match(workflow, /Release signer mismatch/);
  assert.match(workflow, /Number of signers: 1/);
});

test('staging release signing identity is pinned to explicit GitHub secrets', () => {
  for (const secret of [
    'ATEEK_ANDROID_KEYSTORE_B64',
    'ATEEK_ANDROID_KEYSTORE_PASSWORD',
    'ATEEK_ANDROID_KEY_ALIAS',
    'ATEEK_ANDROID_KEY_PASSWORD',
    'ATEEK_ANDROID_CERT_SHA256',
  ]) {
    assert.match(workflow, new RegExp(`secrets\\.${secret}`));
  }

  assert.match(workflow, /\^\[0-9a-f\]\{64\}\$/);
  assert.match(workflow, /ACTUAL.*EXPECTED|EXPECTED.*ACTUAL/s);
});

test('staging packaging contract stays APK-only arm64-v8a and size bounded', () => {
  assert.match(workflow, /assembleRelease -PreactNativeArchitectures=arm64-v8a/);
  assert.match(workflow, /app-release\.apk/);
  assert.match(workflow, /test ! -e android\/app\/build\/outputs\/bundle\/release\/app-release\.aab/);
  assert.match(workflow, /\[ "\$APK_ABIS" = "arm64-v8a " \]/);
  assert.match(workflow, /35\*1024\*1024/);
  assert.match(workflow, /Physical Android device test=NOT PERFORMED BY CI/);
});
