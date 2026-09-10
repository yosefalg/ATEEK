const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/cloud/resilientAction.ts', 'utf8');

test('replaceable offline actions are coalesced before persistence', () => {
  assert.match(source, /function coalesceQueue\(rows:QueueItem\[],incoming:QueueItem\)/);
  assert.match(source, /incoming\.name==='read'.*row\.name!=='read'/s);
  assert.match(source, /incoming\.name==='favorite'/);
  assert.match(source, /String\(row\.payload\.id\?\?''\)!==listingId/);
  assert.match(source, /writeQueue\(coalesceQueue\(rows,row\)\)/);
});

test('queue pressure removes replaceable state before ordered business actions', () => {
  assert.match(source, /QUEUEABLE=new Set\(\['favorite','message','offer','read'\]\)/);
  assert.match(source, /const MAX_QUEUE_ITEMS=120/);
  assert.match(source, /function compactQueueForStorage\(rows:QueueItem\[]\)/);
  assert.match(source, /row\.name==='favorite'\|\|row\.name==='read'/);
  assert.match(source, /JSON\.stringify\(compactQueueForStorage\(rows\)\)/);
  assert.doesNotMatch(source, /rows\.slice\(-MAX_QUEUE_ITEMS\)/);
});

test('messages and offers preserve insertion ordering even when the soft queue budget is exceeded', () => {
  assert.match(source, /return \[\.\.\.rows,incoming\]/);
  assert.doesNotMatch(source, /row\.name==='message'.*removable--/s);
  assert.doesNotMatch(source, /row\.name==='offer'.*removable--/s);
});
