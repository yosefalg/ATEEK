const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const workflow = fs.readFileSync(path.join(process.cwd(), '.github/workflows/ateek-2.2-staging.yml'), 'utf8');

test('Android staging release stays APK-only, arm64-only, and size bounded', () => {
  assert.ok(workflow.includes("buildType!=='apk'"));
  assert.ok(workflow.includes('assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon'));
  assert.ok(workflow.includes('test ! -e android/app/build/outputs/bundle/release/app-release.aab'));
  assert.ok(workflow.includes('[ "$APK_ABIS" = "arm64-v8a " ]'));
  assert.ok(workflow.includes('[ "$APK_BYTES" -le $((35*1024*1024)) ]'));
});

test('native hardening remains fail-closed for cleartext, keyboard resize, and JSC', () => {
  assert.ok(workflow.includes('android:usesCleartextTraffic="false"'));
  assert.ok(workflow.includes('android:windowSoftInputMode="adjustResize"'));
  assert.ok(workflow.includes('libjsc.so'));
  assert.ok(workflow.includes('libjscexecutor.so'));
  assert.ok(workflow.includes("! grep -qE '^lib/arm64-v8a/lib(jsc|jscexecutor)\\.so$'"));
});

test('release signing cannot fall back to debug or proceed without pinned secrets', () => {
  for (const secret of [
    'ATEEK_ANDROID_KEYSTORE_B64',
    'ATEEK_ANDROID_KEYSTORE_PASSWORD',
    'ATEEK_ANDROID_KEY_ALIAS',
    'ATEEK_ANDROID_KEY_PASSWORD',
    'ATEEK_ANDROID_CERT_SHA256',
  ]) {
    assert.ok(workflow.includes(secret));
  }
  assert.ok(workflow.includes('Unexpected signer'));
  assert.ok(workflow.includes('Native validation APK must remain unsigned before the release-signing gate'));
  assert.ok(workflow.includes('signingConfig signingConfigs.release'));
  assert.ok(workflow.includes('Could not replace generated release debug signing config'));
});

test('release verification pins package identity and records verification evidence', () => {
  assert.ok(workflow.includes("package: name='com.yosef.ateek'"));
  assert.ok(workflow.includes("versionCode='16'"));
  assert.ok(workflow.includes("versionName='2\\.2\\.0'"));
  assert.ok(workflow.includes('Physical Android device test=NOT PERFORMED BY CI'));
  assert.ok(workflow.includes('apkanalyzer'));
  assert.ok(workflow.includes('sha256sum'));
});
