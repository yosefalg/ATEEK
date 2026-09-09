import fs from 'node:fs';

const file = 'src/components/SpatialReelsHub.tsx';
let s = fs.readFileSync(file, 'utf8');
const replace = (from, to, label) => {
  if (!s.includes(from)) throw new Error(`Run166 reels anchor missing: ${label}`);
  s = s.replace(from, to);
};

replace(
  "  const [busy, setBusy] = useState(false);\n  const load = useCallback(async () => {\n    if (!id) return;",
  "  const [busy, setBusy] = useState(false);\n  const [loadError, setLoadError] = useState('');\n  const load = useCallback(async () => {\n    if (!id) return;\n    setLoadError('');",
  'comment loading error state',
);

replace(
  "  useEffect(() => {\n    if (!visible || !id) return;\n    void load();\n    const ch = supabase.channel(`reel-comments-${id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'reel_comments', filter: `reel_id=eq.${id}` }, () => void load()).subscribe();",
  "  const safeLoad = useCallback(() => {\n    void load().catch((error: unknown) => setLoadError(error instanceof Error ? error.message : String(error)));\n  }, [load]);\n  useEffect(() => {\n    if (!visible || !id) return;\n    safeLoad();\n    const ch = supabase.channel(`reel-comments-${id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'reel_comments', filter: `reel_id=eq.${id}` }, safeLoad).subscribe();",
  'contained comment refresh',
);

replace(
  "  }, [visible, id, load]);",
  "  }, [visible, id, safeLoad]);",
  'comment effect dependencies',
);

replace(
  "ListEmptyComponent={<Text style={s.empty}>لا توجد تعليقات بعد.</Text>}",
  "ListEmptyComponent={<Text accessibilityRole=\"alert\" style={s.empty}>{loadError ? `تعذر تحميل التعليقات: ${loadError}` : 'لا توجد تعليقات بعد.'}</Text>}",
  'comment error feedback',
);

fs.writeFileSync(file, s);
console.log('Run #166 Reels resilience applied: comment fetch/realtime failures are contained and surfaced without unhandled rejections.');
