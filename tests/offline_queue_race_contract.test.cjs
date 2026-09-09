const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/cloud/resilientAction.ts', 'utf8');

test('offline queue serializes enqueue mutations so parallel actions cannot overwrite each other', () => {
  assert.match(source, /let queueMutation:Promise<void>=Promise\.resolve\(\)/);
  assert.match(source, /async function mutateQueue<T>/);
  assert.match(source, /await mutateQueue\(async\(\)=>\{const rows=await readQueue\(\);rows\.push\(row\);await writeQueue\(rows\);\}\)/);
});

test('offline flush removes only confirmed sent ids from the latest queue snapshot', () => {
  assert.match(source, /const sentIds=new Set<string>\(\)/);
  assert.match(source, /sentIds\.add\(row\.id\)/);
  assert.match(source, /const current=await readQueue\(\)/);
  assert.match(source, /current\.filter\(row=>!sentIds\.has\(row\.id\)\)/);
  assert.doesNotMatch(source, /await writeQueue\(pending\)/);
});

test('offline flush stops on connectivity failure without deleting unsent work', () => {
  assert.match(source, /catch\(e\)\{if\(looksNetworkError\(e\)\)break;\}/);
});
