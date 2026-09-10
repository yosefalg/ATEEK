const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const workflow = fs.readFileSync('.github/workflows/ateek-2.2.yml', 'utf8');
const stagingWorkflow = fs.readFileSync('.github/workflows/ateek-2.2-staging.yml', 'utf8');

test('production release artifact remains APK-only arm64 and size bounded', () => {
  assert.match(workflow, /MAX_BYTES=\$\(\(35\*1024\*1024\)\)/);
  assert.match(workflow, /test ! -e android\/app\/build\/outputs\/bundle\/release\/app-release\.aab/);
  assert.match(workflow, /\[ "\$APK_ABIS" = "arm64-v8a " \]/);
  assert.match(workflow, /name: ATEEK-2\.2-INSTALLABLE-APK-ARM64/);
  assert.match(workflow, /retention-days: 30/);
});

test('production release evidence stays truthful and independently auditable', () => {
  assert.match(workflow, /Package=com\.yosef\.ateek/);
  assert.match(workflow, /Debuggable=NO \(enforced by release verifier\)/);
  assert.match(workflow, /AAB production=DISABLED/);
  assert.match(workflow, /Physical Android device test=NOT PERFORMED BY CI/);
  assert.match(workflow, /"\$APK_ANALYZER" apk summary "\$APK_PATH"/);
  assert.match(workflow, /SHA=\$\(sha256sum "\$APK_PATH" \| awk '\{print \$1\}'\)/);
});

test('release verifier is safe under set -o pipefail and cannot false-fail on early pipe close', () => {
  assert.match(workflow, /PACKAGE_LINE="\$\{BADGING%%\$'\\n'\*\}"/);
  assert.match(workflow, /grep -Fq "package: name='com\.yosef\.ateek'" <<< "\$PACKAGE_LINE"/);
  assert.match(workflow, /grep -q '\^application-debuggable' <<< "\$BADGING"/);
  assert.match(workflow, /APK_ANALYZER="\$\(find "\$ANDROID_HOME" -type f -name apkanalyzer -perm -111 -print -quit 2>\/dev\/null\)"/);
  assert.doesNotMatch(workflow, /printf '%s\\n' "\$BADGING" \| head -n 1/);
  assert.doesNotMatch(workflow, /find "\$ANDROID_HOME"[^\n]+\| head -n 1/);
});

test('staging produces the same APKANALYZER evidence sections required in production', () => {
  for (const marker of ['=== APK SUMMARY ===', '=== APK FILES ===', '=== DEX PACKAGES ===']) {
    assert.match(stagingWorkflow, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(stagingWorkflow, /"\$APK_ANALYZER" apk summary "\$APK_PATH"/);
  assert.match(stagingWorkflow, /"\$APK_ANALYZER" files list "\$APK_PATH"/);
  assert.match(stagingWorkflow, /"\$APK_ANALYZER" dex packages "\$APK_PATH"/);
  assert.match(stagingWorkflow, /grep -Eq '\(\^\|\[\[:space:\]\]\)16\(\[\[:space:\]\]\|\$\)' metrics-out\/APKANALYZER\.txt/);
  assert.match(stagingWorkflow, /grep -Fq '2\.2\.0' metrics-out\/APKANALYZER\.txt/);
});
