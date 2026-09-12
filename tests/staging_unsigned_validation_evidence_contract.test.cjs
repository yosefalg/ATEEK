const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workflowPath = path.join(process.cwd(), '.github/workflows/ateek-2.2-staging.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');

function indexOfOrFail(needle) {
  const index = workflow.indexOf(needle);
  assert.notEqual(index, -1, `Expected staging workflow to contain: ${needle}`);
  return index;
}

test('unsigned native validation evidence is retained before the signing-secret gate', () => {
  const verifyUnsigned = indexOfOrFail('- name: Verify unsigned native validation APK');
  const uploadEvidence = indexOfOrFail('- name: Upload unsigned validation evidence');
  const signingGate = indexOfOrFail('- name: Validate release signing material');

  assert.ok(verifyUnsigned < uploadEvidence, 'Unsigned APK must be verified before evidence upload');
  assert.ok(uploadEvidence < signingGate, 'Unsigned evidence must be retained before signing secrets are required');
  assert.match(workflow, /name: ATEEK-2\.2-STAGING-UNSIGNED-VALIDATION-METRICS/);
  assert.match(workflow, /retention-days: 7/);
});

test('unsigned validation evidence records auditable identity and APKANALYZER output', () => {
  for (const marker of [
    'SHA-256=%s',
    'ABI=arm64-v8a',
    'Package=com.yosef.ateek',
    'Version=2.2.0',
    'VersionCode=16',
    'Debuggable=NO',
    'Signing=UNSIGNED VALIDATION ONLY',
    'AAB=DISABLED',
    'Physical Android device test=NOT PERFORMED BY CI',
    'unsigned-validation-out/APKANALYZER.txt',
  ]) {
    assert.ok(workflow.includes(marker), `Expected unsigned validation evidence marker: ${marker}`);
  }

  assert.match(workflow, /apkanalyzer -perm -111/);
  assert.match(workflow, /apk summary "\$APK_PATH" > unsigned-validation-out\/APKANALYZER\.txt/);
  assert.match(workflow, /grep -Fq 'com\.yosef\.ateek' unsigned-validation-out\/APKANALYZER\.txt/);
});

test('unsigned validation fails closed on identity, ABI, size, debug, JSC, AAB, or accidental signing drift', () => {
  assert.match(workflow, /package: name='com\.yosef\.ateek'/);
  assert.match(workflow, /versionCode='16'.*versionName='2\\\.2\\\.0'/s);
  assert.match(workflow, /! grep -q '\^application-debuggable'/);
  assert.match(workflow, /\[ "\$APK_ABIS" = "arm64-v8a " \]/);
  assert.match(workflow, /lib\(jsc\|jscexecutor\)\\\.so/);
  assert.match(workflow, /\[ "\$APK_BYTES" -le \$\(\(35\*1024\*1024\)\) \]/);
  assert.match(workflow, /test ! -e android\/app\/build\/outputs\/bundle\/release\/app-release\.aab/);
  assert.match(workflow, /if "\$APKSIGNER" verify "\$APK_PATH"/);
  assert.match(workflow, /Native validation APK must remain unsigned before the release-signing gate/);
});

test('unsigned APK payload is removed after evidence extraction so it cannot be mistaken for a release artifact', () => {
  const metricsWrite = indexOfOrFail("unsigned-validation-out/METRICS.txt");
  const cleanup = indexOfOrFail('rm -f android/app/build/outputs/apk/release/*.apk');
  const signingGate = indexOfOrFail('- name: Validate release signing material');

  assert.ok(metricsWrite < cleanup, 'Metrics must be extracted before unsigned APK cleanup');
  assert.ok(cleanup < signingGate, 'Unsigned APK must be removed before signed release work begins');
  assert.doesNotMatch(workflow, /name: ATEEK-2\.2-STAGING-UNSIGNED[^\n]*APK/);
});
