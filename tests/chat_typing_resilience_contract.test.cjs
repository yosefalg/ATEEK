const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const chain = fs.readFileSync('scripts/run77-reels-transform.mjs', 'utf8');
const transform = fs.readFileSync('scripts/run168-chat-typing-resilience.mjs', 'utf8');

test('production transform chain includes chat typing resilience', () => {
  assert.match(chain, /run168-chat-typing-resilience\.mjs/);
});

test('chat typing indicator owns and clears one timeout across lifecycle changes', () => {
  assert.match(transform, /typingTimeoutRef = useRef<ReturnType<typeof setTimeout> \| null>\(null\)/);
  assert.match(transform, /const nextTyping = Boolean\(payload\?\.typing\)/);
  assert.match(transform, /clearTimeout\(typingTimeoutRef\.current\)/);
  assert.match(transform, /typingTimeoutRef\.current = setTimeout\(\(\) => \{/);
  assert.match(transform, /typingTimeoutRef\.current = null/);
  assert.match(transform, /setTyping\(false\);\\n    const channel/);
});
