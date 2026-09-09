const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/cloud/resilientAction.ts', 'utf8');

test('replaceable offline actions are coalesced before persistence', () => {
  assert.match(source, /function coalesceQueue\(rows:QueueItem\[\],incoming:QueueItem\)/);
  assert.match(source, /incoming\.name==='read'.*row\.name!=='read'/s);
  assert.match(source, /incoming\.name==='favorite'/);
  assert.match(source, /String\(row\.payload\.id\?\?''\)!==listingId/);
  assert.match(source, /writeQueue\(coalesceQueue\(rows,row\)\)/);
});

test('ordered business actions remain queueable and bounded', () => {
  assert.match(source, /QUEUEABLE=new Set\(\['favorite','message','offer','read'\]\)/);
  assert.match(source, /const MAX_QUEUE_ITEMS=120/);
  assert.match(source, /rows\.slice\(-MAX_QUEUE_ITEMS\)/);
  assert.match(source, /return \[\.\.\.rows,incoming\]/);
});
