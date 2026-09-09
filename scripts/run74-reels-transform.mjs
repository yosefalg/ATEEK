import fs from 'node:fs';

const file = 'src/components/SpatialReelsHub.tsx';
let s = fs.readFileSync(file, 'utf8');
const must = (from, to, label) => {
  if (!s.includes(from)) throw new Error(`Run74 transform anchor missing: ${label}`);
  s = s.replace(from, to);
};

must("import { ui } from '../theme/tokens';", "import { ui } from '../theme/tokens';\nimport { useLocale } from '../i18n/LocaleProvider';\nimport { readReelsSnapshot, writeReelsSnapshot } from '../services/reelsCache';", 'imports');
must("function Comments({ id, visible, close }: { id: string; visible: boolean; close: () => void }) {\n  const { height } = useWindowDimensions();", "function Comments({ id, visible, close }: { id: string; visible: boolean; close: () => void }) {\n  const { height } = useWindowDimensions();\n  const { t, formatDate } = useLocale();", 'comments locale');
must('<Text style={s.title}>التعليقات</Text>', '<Text style={s.title}>{t(\'reels.comments\')}</Text>', 'comments title');
must("<Text style={s.time}>{new Date(item.created_at).toLocaleString('ar-IQ')}</Text>", "<Text style={s.time}>{formatDate(item.created_at)}</Text>", 'comment date');
must('<Text style={s.empty}>لا توجد تعليقات بعد.</Text>', '<Text style={s.empty}>{t(\'reels.emptyComments\')}</Text>', 'empty comments');
must('placeholder="اكتب تعليقاً…"', 'placeholder={t(\'reels.commentPlaceholder\')}', 'comment placeholder');
must("export function SpatialReelsHub() {\n  const { height } = useWindowDimensions();", "export function SpatialReelsHub() {\n  const { height } = useWindowDimensions();\n  const { isRTL, t } = useLocale();", 'hub locale');

const oldLoad = "      const r = (data ?? []) as Reel[];\n      setReels(r); setActive((v) => v ?? r[0]?.id ?? null);\n      const ids = [...new Set(r.map((x) => x.listing_id).filter(Boolean))] as string[];\n      if (ids.length) {\n        const { data: ls, error: le } = await supabase.from('ateek_listings').select('id,seller_id,title,price,image,location,condition,latitude,longitude').in('id', ids);\n        if (le) throw le;\n        setListings(Object.fromEntries(((ls ?? []) as Listing[]).map((x) => [x.id, x])));\n      } else setListings({});";
const newLoad = "      const r = (data ?? []) as Reel[];\n      setReels(r); setActive((v) => v ?? r[0]?.id ?? null);\n      const ids = [...new Set(r.map((x) => x.listing_id).filter(Boolean))] as string[];\n      let listingMap: Record<string, Listing> = {};\n      if (ids.length) {\n        const { data: ls, error: le } = await supabase.from('ateek_listings').select('id,seller_id,title,price,image,location,condition,latitude,longitude').in('id', ids);\n        if (le) throw le;\n        listingMap = Object.fromEntries(((ls ?? []) as Listing[]).map((x) => [x.id, x]));\n      }\n      setListings(listingMap);\n      void writeReelsSnapshot(r, listingMap);";
must(oldLoad, newLoad, 'SWR write');

const oldEffect = "  useEffect(() => {\n    void Promise.all([load(), loadLive(), loadOwn()]).catch((e) => setLoadError(String(e?.message ?? e)));\n    const r = supabase.channel('ateek-reels-live')";
const newEffect = "  useEffect(() => {\n    let alive = true;\n    void readReelsSnapshot<Reel, Listing>().then((cached) => {\n      if (!alive || !cached?.reels.length) return;\n      setReels(cached.reels);\n      setListings(cached.listings);\n      setActive((v) => v ?? cached.reels[0]?.id ?? null);\n      setLoading(false);\n    }).finally(() => { if (alive) void Promise.all([load(), loadLive(), loadOwn()]).catch((e) => setLoadError(String(e?.message ?? e))); });\n    const r = supabase.channel('ateek-reels-live')";
must(oldEffect, newEffect, 'SWR read');
must("    return () => { void supabase.removeChannel(r); void supabase.removeChannel(a); };", "    return () => { alive = false; void supabase.removeChannel(r); void supabase.removeChannel(a); };", 'alive cleanup');
must("  if (loading) return <ReelsSkeleton />;", "  const visualReels = isRTL ? [...reels].reverse() : reels;\n  if (loading) return <ReelsSkeleton />;", 'visual reels');
must("<FlatList data={reels} keyExtractor={(x) => x.id}", "<FlatList data={visualReels} inverted={isRTL} keyExtractor={(x) => x.id}", 'RTL list');
must('<Text style={s.title}>تعذر تحميل الريلز</Text>', '<Text style={s.title}>{t(\'reels.loadFailed\')}</Text>', 'load failed');
must('<Text style={s.primaryText}>إعادة المحاولة</Text>', '<Text style={s.primaryText}>{t(\'reels.retry\')}</Text>', 'retry');
must('<Text style={s.live}>● مزاد مباشر</Text>', '<Text style={s.live}>● {t(\'reels.liveAuction\')}</Text>', 'auction label');
must('placeholder="مزايدتك"', 'placeholder={t(\'reels.bidPlaceholder\')}', 'bid placeholder');
must('<Text style={s.bidText}>زايد</Text>', '<Text style={s.bidText}>{t(\'reels.bid\')}</Text>', 'bid label');
must('name="chevron-back" size={ui.icon}', 'name={isRTL ? "chevron-forward" : "chevron-back"} size={ui.icon}', 'back icon');

for (const prop of ['caption','listTitle','price','live','title','commentBody','time','input','dealTitle','dealPrice','meta','captionInput','note']) {
  const re = new RegExp(`(${prop}: \\{[^}]*?)textAlign: 'right'`, 'g');
  s = s.replace(re, `$1textAlign: 'auto', writingDirection: 'auto'`);
}

fs.writeFileSync(file, s);
console.log('Run #74 Reels transform applied: SWR cache, RTL feed inversion, localized touched strings, logical arrow.');
