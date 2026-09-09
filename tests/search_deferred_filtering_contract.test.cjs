const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const chain = fs.readFileSync('scripts/run77-reels-transform.mjs', 'utf8');
const transform = fs.readFileSync('scripts/run172-search-deferred-filtering.mjs', 'utf8');

test('production transform chain includes deferred search filtering after chat hardening', () => {
  const chatIndex = chain.indexOf("await import('./run170-chat-presence-lifecycle.mjs');");
  const searchIndex = chain.indexOf("await import('./run172-search-deferred-filtering.mjs');");
  assert.ok(chatIndex >= 0, 'chat presence hardening must remain chained');
  assert.ok(searchIndex > chatIndex, 'search performance transform must run after existing production transforms');
});

test('search transform defers expensive listing filtering without deferring username routing', () => {
  assert.ok(transform.includes("useDeferredValue,useEffect,useMemo,useRef,useState"), 'React deferred value must be imported');
  assert.ok(transform.includes("const deferredQuery=useDeferredValue(query);"), 'search query must expose a deferred filtering value');
  assert.ok(transform.includes("const q=normalize(deferredQuery);"), 'local listing filtering must use the deferred value');
  assert.ok(transform.includes("if(query.trim().startsWith('@'))return[];"), 'username mode must continue switching immediately from the live query');
  assert.ok(transform.includes("[searchableListings,category,query,deferredQuery,near,sort]"), 'memo dependencies must track both immediate routing and deferred filtering state');
});
