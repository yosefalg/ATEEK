const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/cloud/resilientAction.ts', 'utf8');

test('offline queue serializes enqueue mutations so parallel actions cannot overwrite each other', () => {
  assert.match(source, /let queueMutation:Promise<void>=Promise\.resolve\(\)/);
  assert.match(source, /async function mutateQueue<T>/);
  assert.match(source, /await mutateQueue\(async\(\)=>\{const rows=await readQueue\(\);await writeQueue\(coalesceQueue\(rows,row\)\);\}\)/);
  assert.match(source, /function coalesceQueue\(rows:QueueItem\[],incoming:QueueItem\)/);
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

test('persisted offline queue accepts only known queueable action names and object payloads', () => {
  assert.match(source, /function isQueueItem\(value:unknown\):value is QueueItem/);
  assert.match(source, /QUEUEABLE\.has\(value\.name\)/);
  assert.match(source, /isRecord\(value\.payload\)/);
  assert.match(source, /rows\.filter\(isQueueItem\)/);
});

test('persisted offline queue rejects malformed identity and timestamps before replay', () => {
  assert.match(source, /typeof value\.id==='string'&&value\.id\.length>0/);
  assert.match(source, /typeof value\.createdAt==='number'&&Number\.isFinite\(value\.createdAt\)/);
});
