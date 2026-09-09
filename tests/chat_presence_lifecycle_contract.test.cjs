const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const chain = fs.readFileSync('scripts/run77-reels-transform.mjs', 'utf8');
const transform = fs.readFileSync('scripts/run170-chat-presence-lifecycle.mjs', 'utf8');

test('production transform chain includes chat presence lifecycle hardening after typing resilience', () => {
  const typingIndex = chain.indexOf("await import('./run168-chat-typing-resilience.mjs');");
  const presenceIndex = chain.indexOf("await import('./run170-chat-presence-lifecycle.mjs');");
  assert.ok(typingIndex >= 0, 'typing resilience transform must remain chained');
  assert.ok(presenceIndex > typingIndex, 'presence lifecycle transform must run after typing resilience');
});

test('chat presence state resets when no thread is active or a new thread opens', () => {
  assert.match(transform, /if \(!thread\) \{\s*setOnline\(false\);\s*setTyping\(false\);\s*return;/s);
  assert.match(transform, /let active = true;\s*setOnline\(false\);\s*setTyping\(false\);/s);
});

test('stale realtime callbacks are ignored and invalidated before channel cleanup', () => {
  const staleGuards = transform.match(/if \(!active\) return;/g) ?? [];
  assert.ok(staleGuards.length >= 3, 'presence, typing, and subscribe callbacks require active-generation guards');
  assert.match(transform, /return \(\) => \{\s*active = false;/s);
  assert.ok(
    transform.indexOf('active = false;') < transform.indexOf('void supabase.removeChannel(channel);'),
    'callbacks must be invalidated before asynchronous channel removal',
  );
});
