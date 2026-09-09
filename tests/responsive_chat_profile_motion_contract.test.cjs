const fs = require('fs');
const assert = require('assert');

const run = fs.readFileSync('scripts/run191-responsive-chat-profile-motion.mjs', 'utf8');
const pipeline = fs.readFileSync('scripts/run77-reels-transform.mjs', 'utf8');

assert(run.includes(`const contentWidth = Math.min(width, 720);`));
assert(run.includes(`const compact = width < 380;`));
assert(run.includes(`paddingHorizontal: compact ? 10 : 16`));
assert(run.includes(`android_ripple={{ color: 'rgba(94,234,212,0.10)' }}`));
assert(run.includes(`const OBSIDIAN = '#101827';`));
assert(run.includes(`openSpatialProfile`) === false, 'Run191 must preserve Run190 real profile navigation instead of replacing it');
assert(pipeline.includes(`await import('./run190-chat-seller-soft-theme.mjs');\nawait import('./run191-responsive-chat-profile-motion.mjs');`));
console.log('responsive chat/profile/motion contract passed');
