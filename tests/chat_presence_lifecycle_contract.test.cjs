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

test('chat presence replacement resets state when no thread is active or a new thread opens', () => {
  assert.ok(
    transform.includes("if (!thread) {\\n      setOnline(false);\\n      setTyping(false);\\n      return;\\n    }\\n    let active = true;\\n    setOnline(false);\\n    setTyping(false);"),
    'replacement must clear stale online and typing state before subscribing to a thread',
  );
});

test('stale realtime callbacks are guarded and cleanup invalidates the active generation', () => {
  const staleGuards = transform.match(/if \(!active\) return;/g) ?? [];
  assert.ok(staleGuards.length >= 3, 'presence, typing, and subscribe replacements require active-generation guards');
  assert.ok(
    transform.includes('return () => {\\n      active = false;\\n      if (typingTimeoutRef.current) {'),
    'cleanup replacement must invalidate callbacks before continuing timer/channel cleanup from run168',
  );
});
