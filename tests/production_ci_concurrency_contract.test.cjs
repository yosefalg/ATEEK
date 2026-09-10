const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const workflow = fs.readFileSync('.github/workflows/ateek-2.2.yml', 'utf8');

test('production APK workflow serializes builds instead of running them concurrently', () => {
  assert.match(workflow, /\nconcurrency:\s*\n\s+group:\s*ateek-2\.2-production\s*\n\s+cancel-in-progress:\s*false\b/);
});

test('production APK workflow remains scoped to the production-ready-2.2 branch', () => {
  assert.match(workflow, /branches:\s*\[production-ready-2\.2\]/);
});
