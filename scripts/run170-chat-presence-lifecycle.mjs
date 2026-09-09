import fs from 'node:fs';

const file = 'src/components/SpatialDealScreens.tsx';
let s = fs.readFileSync(file, 'utf8');

const replace = (from, to, label) => {
  if (!s.includes(from)) throw new Error(`Run170 chat presence anchor missing: ${label}`);
  s = s.replace(from, to);
};

replace(
  "  useEffect(() => {\n    if (!thread) return;\n    setTyping(false);\n    const channel = supabase.channel(`ateek-deal-dm-${thread}`, {",
  "  useEffect(() => {\n    if (!thread) {\n      setOnline(false);\n      setTyping(false);\n      return;\n    }\n    let active = true;\n    setOnline(false);\n    setTyping(false);\n    const channel = supabase.channel(`ateek-deal-dm-${thread}`, {",
  'reset stale presence on thread switch',
);

replace(
  "      .on('presence', { event: 'sync' }, () => {\n        const state = channel.presenceState();\n        setOnline(Object.keys(state).some((key) => key !== m.user.id));\n      })",
  "      .on('presence', { event: 'sync' }, () => {\n        if (!active) return;\n        const state = channel.presenceState();\n        setOnline(Object.keys(state).some((key) => key !== m.user.id));\n      })",
  'ignore stale presence sync callbacks',
);

replace(
  "      .on('broadcast', { event: 'typing' }, ({ payload }) => {\n        if (payload?.user_id !== m.user.id) {",
  "      .on('broadcast', { event: 'typing' }, ({ payload }) => {\n        if (!active) return;\n        if (payload?.user_id !== m.user.id) {",
  'ignore stale typing callbacks',
);

replace(
  "      .subscribe((status) => {\n        if (status === 'SUBSCRIBED') void channel.track({ user_id: m.user.id, at: new Date().toISOString() });\n      });",
  "      .subscribe((status) => {\n        if (!active) return;\n        if (status === 'SUBSCRIBED') void channel.track({ user_id: m.user.id, at: new Date().toISOString() });\n      });",
  'ignore stale subscription callbacks',
);

replace(
  "    return () => {\n      if (typingTimeoutRef.current) {",
  "    return () => {\n      active = false;\n      if (typingTimeoutRef.current) {",
  'invalidate realtime callbacks before cleanup',
);

fs.writeFileSync(file, s);
console.log('Run #170 chat presence lifecycle applied: stale realtime callbacks cannot leak online/typing state across threads.');
