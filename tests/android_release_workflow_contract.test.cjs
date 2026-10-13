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


const productionWorkflow = fs.readFileSync(path.join(process.cwd(), '.github/workflows/ateek-2.2.yml'), 'utf8');

test('production release signing stays pinned, single-signer, and fail-closed', () => {
  for (const secret of [
    'ATEEK_ANDROID_KEYSTORE_B64',
    'ATEEK_ANDROID_KEYSTORE_PASSWORD',
    'ATEEK_ANDROID_KEY_ALIAS',
    'ATEEK_ANDROID_KEY_PASSWORD',
    'ATEEK_ANDROID_CERT_SHA256',
  ]) {
    assert.ok(productionWorkflow.includes(`secrets.${secret}`), `production workflow must use ${secret}`);
  }

  const validate = productionWorkflow.indexOf('- name: Validate release signing material');
  const inject = productionWorkflow.indexOf('- name: Inject pinned release signing config');
  const build = productionWorkflow.indexOf('- name: Build arm64 installable APK only');
  const signer = productionWorkflow.indexOf('- name: Verify APK signer and capture certificate evidence');
  const prepare = productionWorkflow.indexOf('- name: Prepare APK artifact');
  assert.ok(validate >= 0 && validate < inject && inject < build && build < signer && signer < prepare,
    'production must validate secrets, inject release signing, build, verify signer, then publish artifacts');

  const buildStep = productionWorkflow.slice(build, signer);
  for (const secret of [
    'ATEEK_ANDROID_KEYSTORE_PASSWORD',
    'ATEEK_ANDROID_KEY_ALIAS',
    'ATEEK_ANDROID_KEY_PASSWORD',
  ]) {
    assert.ok(buildStep.includes(`secrets.${secret}`), `production build step must receive ${secret}`);
  }

  assert.ok(productionWorkflow.includes('echo "ATEEK_KEYSTORE_PATH=$KEYSTORE_PATH" >> "$GITHUB_ENV"'));
  assert.ok(productionWorkflow.includes('signingConfig signingConfigs.release'));
  assert.ok(productionWorkflow.includes("grep -Eq '^Number of signers: 1$' metrics-out/APKSIGNER.txt"));
  assert.ok(productionWorkflow.includes('certificate DN: .*CN=Android Debug'));
  assert.ok(productionWorkflow.includes('Release signer mismatch'));
  assert.ok(productionWorkflow.includes('test ! -e android/app/build/outputs/bundle/release/app-release.aab'));
  assert.ok(productionWorkflow.includes('assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon'));
  assert.ok(productionWorkflow.includes('Physical Android device test=NOT PERFORMED BY CI'));
});

test('release keystore certificate matches the pinned fingerprint before signed build', () => {
  for (const [name, candidate, buildName] of [
    ['staging', workflow, '- name: Build arm64 staging APK only'],
    ['production', productionWorkflow, '- name: Build arm64 installable APK only'],
  ]) {
    const validate = candidate.indexOf('- name: Validate release signing material');
    const inject = candidate.indexOf('- name: Inject pinned release signing config');
    const build = candidate.indexOf(buildName);
    assert.ok(validate >= 0 && validate < inject && inject < build, name + ' must preflight before signing injection and build');
    const preflight = candidate.slice(validate, inject);
    assert.ok(preflight.includes('keytool -exportcert'), name + ' must export the keystore certificate');
    assert.ok(preflight.includes('-storepass:env ATEEK_ANDROID_KEYSTORE_PASSWORD'), name + ' must avoid embedding the store password in command arguments');
    assert.ok(preflight.includes('sha256sum "$CERT_PATH"'), name + ' must fingerprint the exported certificate');
    assert.ok(preflight.includes('The keystore certificate does not match ATEEK_ANDROID_CERT_SHA256'), name + ' must fail closed on a certificate mismatch');
    assert.ok(preflight.includes('refusing to build a signed APK'), name + ' must stop before a signed build on mismatch');
  }
});
