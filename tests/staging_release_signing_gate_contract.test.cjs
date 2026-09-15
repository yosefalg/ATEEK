const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const workflow = fs.readFileSync('.github/workflows/ateek-2.2-staging.yml', 'utf8');

test('staging release signing gate fails closed when any required secret is absent', () => {
  for (const name of [
    'ATEEK_ANDROID_KEYSTORE_B64',
    'ATEEK_ANDROID_KEYSTORE_PASSWORD',
    'ATEEK_ANDROID_KEY_ALIAS',
    'ATEEK_ANDROID_KEY_PASSWORD',
    'ATEEK_ANDROID_CERT_SHA256',
  ]) {
    assert.match(workflow, new RegExp(`secrets\\.${name}`));
  }
  assert.match(workflow, /missing=0/);
  assert.match(workflow, /\[ "\$missing" -eq 0 \]/);
  assert.match(workflow, /\^\[0-9a-f\]\{64\}\$/);
  assert.doesNotMatch(workflow, /signingConfig\s+signingConfigs\.debug/);
});

test('unsigned validation evidence cannot publish an installable APK', () => {
  assert.match(workflow, /Signing=UNSIGNED VALIDATION ONLY/);
  assert.match(workflow, /rm -f android\/app\/build\/outputs\/apk\/release\/\*\.apk/);
  assert.match(workflow, /name: ATEEK-2\.2-STAGING-UNSIGNED-VALIDATION-METRICS/);
  assert.match(workflow, /path: unsigned-validation-out\/\*/);
  assert.doesNotMatch(workflow, /path: unsigned-validation-out\/.*\.apk/);
});

test('signed staging APK remains arm64-only, non-debuggable, APK-only and size bounded', () => {
  assert.match(workflow, /-PreactNativeArchitectures=arm64-v8a/);
  assert.match(workflow, /test ! -e android\/app\/build\/outputs\/bundle\/release\/app-release\.aab/);
  assert.match(workflow, /! grep -q '\^application-debuggable'/);
  assert.match(workflow, /\[ "\$APK_ABIS" = "arm64-v8a " \]/);
  assert.match(workflow, /\[ "\$APK_BYTES" -le \$\(\(35\*1024\*1024\)\) \]/);
});
