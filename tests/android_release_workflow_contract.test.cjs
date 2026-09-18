const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const workflow = fs.readFileSync(path.join(process.cwd(), '.github/workflows/ateek-2.2-staging.yml'), 'utf8');

test('Android staging release stays APK-only, arm64-only, and size bounded', () => {
  assert.match(workflow, /buildType!=='apk'/);
  assert.match(workflow, /assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon/);
  assert.match(workflow, /test ! -e android\/app\/build\/outputs\/bundle\/release\/app-release\.aab/);
  assert.match(workflow, /\[ "\$APK_ABIS" = "arm64-v8a " \]/);
  assert.match(workflow, /\[ "\$APK_BYTES" -le \$\(\(35\*1024\*1024\)\) \]/);
});

test('native hardening remains fail-closed for cleartext, keyboard resize, and JSC', () => {
  assert.match(workflow, /android:usesCleartextTraffic=\\"false\\"/);
  assert.match(workflow, /android:windowSoftInputMode=\\"adjustResize\\"/);
  assert.match(workflow, /libjsc\.so/);
  assert.match(workflow, /libjscexecutor\.so/);
  assert.match(workflow, /! grep -qE '\^lib\/arm64-v8a\/lib\(jsc\|jscexecutor\)\\\.so\$'/);
});

test('release signing cannot fall back to debug or proceed without pinned secrets', () => {
  for (const secret of [
    'ATEEK_ANDROID_KEYSTORE_B64',
    'ATEEK_ANDROID_KEYSTORE_PASSWORD',
    'ATEEK_ANDROID_KEY_ALIAS',
    'ATEEK_ANDROID_KEY_PASSWORD',
    'ATEEK_ANDROID_CERT_SHA256',
  ]) {
    assert.match(workflow, new RegExp(secret));
  }
  assert.match(workflow, /Unexpected signer/);
  assert.match(workflow, /Native validation APK must remain unsigned before the release-signing gate/);
  assert.match(workflow, /signingConfig signingConfigs\.release/);
  assert.match(workflow, /Could not replace generated release debug signing config/);
});

test('release verification pins package identity and explicitly records physical-device status', () => {
  assert.match(workflow, /package: name='com\.yosef\.ateek'/);
  assert.match(workflow, /versionCode='16'/);
  assert.match(workflow, /versionName='2\\\.2\\\.0'/);
  assert.match(workflow, /Physical Android device test=NOT PERFORMED BY CI/);
  assert.match(workflow, /apkanalyzer/);
  assert.match(workflow, /sha256sum/);
});
