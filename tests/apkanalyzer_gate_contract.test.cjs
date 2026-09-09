const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const workflow = fs.readFileSync('.github/workflows/ateek-2.2.yml', 'utf8');

test('production metrics fail when APKANALYZER is unavailable or fails', () => {
  assert.match(workflow, /APK_ANALYZER="\$\(find "\$ANDROID_HOME" -type f -name apkanalyzer -perm -111/);
  assert.match(workflow, /test -n "\$APK_ANALYZER"/);
  assert.doesNotMatch(workflow, /"\$APK_ANALYZER" apk summary "\$APK_PATH" \|\| true/);
  assert.doesNotMatch(workflow, /apkanalyzer not found on runner/);
});

test('production metrics verify APK identity and metric sections', () => {
  assert.match(workflow, /grep -Fq 'com\.yosef\.ateek' metrics-out\/APKANALYZER\.txt/);
  assert.match(workflow, /grep -Fq '2\.2\.0' metrics-out\/APKANALYZER\.txt/);
  assert.match(workflow, /grep -Fq '=== APK FILES ===' metrics-out\/APKANALYZER\.txt/);
  assert.match(workflow, /grep -Fq '=== DEX PACKAGES ===' metrics-out\/APKANALYZER\.txt/);
  assert.match(workflow, /test -s metrics-out\/APKANALYZER\.txt/);
});
