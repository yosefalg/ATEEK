import fs from 'node:fs';

const file = 'src/components/SpatialDealScreens.tsx';
let s = fs.readFileSync(file, 'utf8');

const replace = (from, to, label) => {
  if (!s.includes(from)) throw new Error(`Run168 chat typing anchor missing: ${label}`);
  s = s.replace(from, to);
};

replace(
  "  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);",
  "  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);\n  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);",
  'typing timeout ref',
);

replace(
  "  useEffect(() => {\n    if (!thread) return;\n    const channel = supabase.channel(`ateek-deal-dm-${thread}`, {",
  "  useEffect(() => {\n    if (!thread) return;\n    setTyping(false);\n    const channel = supabase.channel(`ateek-deal-dm-${thread}`, {",
  'reset typing on thread switch',
);

replace(
  "      .on('broadcast', { event: 'typing' }, ({ payload }) => {\n        if (payload?.user_id !== m.user.id) {\n          setTyping(Boolean(payload?.typing));\n          if (payload?.typing) setTimeout(() => setTyping(false), 1800);\n        }\n      })",
  "      .on('broadcast', { event: 'typing' }, ({ payload }) => {\n        if (payload?.user_id !== m.user.id) {\n          const nextTyping = Boolean(payload?.typing);\n          if (typingTimeoutRef.current) {\n            clearTimeout(typingTimeoutRef.current);\n            typingTimeoutRef.current = null;\n          }\n          setTyping(nextTyping);\n          if (nextTyping) {\n            typingTimeoutRef.current = setTimeout(() => {\n              typingTimeoutRef.current = null;\n              setTyping(false);\n            }, 1800);\n          }\n        }\n      })",
  'single owned typing timer',
);

replace(
  "    return () => {\n      channelRef.current = null;\n      void supabase.removeChannel(channel);\n    };",
  "    return () => {\n      if (typingTimeoutRef.current) {\n        clearTimeout(typingTimeoutRef.current);\n        typingTimeoutRef.current = null;\n      }\n      channelRef.current = null;\n      void supabase.removeChannel(channel);\n    };",
  'typing timer cleanup',
);

fs.writeFileSync(file, s);
console.log('Run #168 chat typing resilience applied: stale typing timers are cancelled across events and thread lifecycle changes.');
