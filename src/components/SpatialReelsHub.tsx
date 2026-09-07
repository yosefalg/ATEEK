import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../cloud/client';
import { haptics } from '../system/haptics';
import { SafeReelVideo } from './SafeReelVideo';
import { ui } from '../theme/tokens';

type Reel = { id: string; author_id: string; listing_id?: string | null; playback_url?: string | null; hls_url?: string | null; media_provider: 'supabase' | 'cloudinary'; caption: string; created_at: string };
type Listing = { id: string; seller_id: string; title: string; price: number; image: string; location: string; condition: string; latitude?: number | null; longitude?: number | null };
type Auction = { auction_id: string; listing_id: string; status: string; ends_at: string; starting_price: number; min_increment: number; highest_bid?: number | null };
type Comment = { id: string; reel_id: string; author_id: string; body: string; created_at: string };

const iq = (v: number) => new Intl.NumberFormat('ar-IQ').format(Math.max(0, Math.round(v))) + ' د.ع';

function Comments({ id, visible, close }: { id: string; visible: boolean; close: () => void }) {
  const { height } = useWindowDimensions();
  const [rows, setRows] = useState<Comment[]>([]);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase.from('reel_comments').select('id,reel_id,author_id,body,created_at').eq('reel_id', id).order('created_at', { ascending: true }).limit(150);
    if (error) throw error;
    setRows((data ?? []) as Comment[]);
  }, [id]);
  useEffect(() => {
    if (!visible || !id) return;
    void load();
    const ch = supabase.channel(`reel-comments-${id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'reel_comments', filter: `reel_id=eq.${id}` }, () => void load()).subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [visible, id, load]);
  const send = async () => {
    if (!body.trim() || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc('ateek_reel_comment', { p_reel: id, p_body: body.trim() });
      if (error) throw error;
      setBody(''); haptics.success();
    } catch (e: any) { Alert.alert('تعذر التعليق', String(e?.message ?? e)); }
    finally { setBusy(false); }
  };
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={close}><View style={s.backdrop}><KeyboardAvoidingView style={s.comments} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Math.max(12, Math.min(40, Math.round(height * .025)))}><View style={s.head}><Pressable onPress={close} style={s.icon}><Ionicons name="close" size={ui.icon} color={ui.colors.text} /></Pressable><Text style={s.title}>التعليقات</Text></View><FlatList data={rows} keyExtractor={(x) => x.id} contentContainerStyle={{ padding: 12, gap: 8 }} renderItem={({ item }) => <View style={s.comment}><Text style={s.commentBody}>{item.body}</Text><Text style={s.time}>{new Date(item.created_at).toLocaleString('ar-IQ')}</Text></View>} ListEmptyComponent={<Text style={s.empty}>لا توجد تعليقات بعد.</Text>} /><View style={s.composer}><TextInput value={body} onChangeText={setBody} placeholder="اكتب تعليقاً…" placeholderTextColor={ui.colors.muted} style={s.input} multiline maxLength={600} /><Pressable disabled={busy || !body.trim()} onPress={() => void send()} style={[s.send, (busy || !body.trim()) && { opacity: .4 }]}>{busy ? <ActivityIndicator color={ui.colors.background} /> : <Ionicons name="send" size={ui.icon} color={ui.colors.background} />}</Pressable></View></KeyboardAvoidingView></View></Modal>;
}

function ReelsSkeleton() {
  return <View style={s.emptyWrap}><View style={s.bigSkeleton} /><View style={s.smallSkeleton} /><View style={[s.smallSkeleton, { width: '52%' }]} /></View>;
}

export function SpatialReelsHub() {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [reels, setReels] = useState<Reel[]>([]);
  const [listings, setListings] = useState<Record<string, Listing>>({});
  const [auctions, setAuctions] = useState<Record<string, Auction>>({});
  const [active, setActive] = useState<string | null>(null);
  const [comments, setComments] = useState<string | null>(null);
  const [deal, setDeal] = useState<Listing | null>(null);
  const [composer, setComposer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [caption, setCaption] = useState('');
  const [own, setOwn] = useState<Listing[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);
  const [bid, setBid] = useState('');

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const { data, error } = await supabase.from('reels').select('id,author_id,listing_id,playback_url,hls_url,media_provider,caption,created_at').eq('status', 'active').order('created_at', { ascending: false }).limit(80);
      if (error) throw error;
      const r = (data ?? []) as Reel[];
      setReels(r); setActive((v) => v ?? r[0]?.id ?? null);
      const ids = [...new Set(r.map((x) => x.listing_id).filter(Boolean))] as string[];
      if (ids.length) {
        const { data: ls, error: le } = await supabase.from('ateek_listings').select('id,seller_id,title,price,image,location,condition,latitude,longitude').in('id', ids);
        if (le) throw le;
        setListings(Object.fromEntries(((ls ?? []) as Listing[]).map((x) => [x.id, x])));
      } else setListings({});
    } catch (e: any) { setLoadError(String(e?.message ?? e)); }
    finally { setLoading(false); }
  }, []);

  const loadLive = useCallback(async () => {
    const { data, error } = await supabase.from('live_auctions').select('auction_id,listing_id,status,ends_at,starting_price,min_increment,highest_bid').eq('status', 'active').gt('ends_at', new Date().toISOString()).limit(100);
    if (error) throw error;
    setAuctions(Object.fromEntries(((data ?? []) as Auction[]).map((x) => [x.listing_id, x])));
  }, []);

  const loadOwn = useCallback(async () => {
    const { data: a } = await supabase.auth.getUser();
    if (!a.user) return;
    const { data, error } = await supabase.from('ateek_listings').select('id,seller_id,title,price,image,location,condition,latitude,longitude').eq('seller_id', a.user.id).eq('status', 'active').order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    setOwn((data ?? []) as Listing[]);
  }, []);

  useEffect(() => {
    void Promise.all([load(), loadLive(), loadOwn()]).catch((e) => setLoadError(String(e?.message ?? e)));
    const r = supabase.channel('ateek-reels-live').on('postgres_changes', { event: '*', schema: 'public', table: 'reels' }, () => void load()).subscribe();
    const a = supabase.channel('ateek-auctions-live-v2').on('postgres_changes', { event: '*', schema: 'public', table: 'live_auctions' }, () => void loadLive()).subscribe();
    return () => { void supabase.removeChannel(r); void supabase.removeChannel(a); };
  }, [load, loadLive, loadOwn]);

  const create = async () => {
    if (busy) return;
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) return void Alert.alert('يلزم السماح بالوصول إلى الفيديوهات');
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1, videoMaxDuration: 60 });
    if (picked.canceled || !picked.assets[0]?.uri) return;
    const asset = picked.assets[0];
    if (asset.fileSize && asset.fileSize > 80 * 1024 * 1024) return void Alert.alert('الفيديو أكبر من 80MB');
    setBusy(true);
    try {
      const { data: ss } = await supabase.auth.getSession();
      const uid = ss.session?.user.id;
      if (!uid) throw new Error('AUTH_REQUIRED');
      const cloud = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const preset = process.env.EXPO_PUBLIC_CLOUDINARY_UNSIGNED_PRESET;
      let provider: 'supabase' | 'cloudinary' = 'supabase', url = '', hls: string | null = null, path: string | null = null;
      if (cloud && preset) {
        const form = new FormData();
        form.append('file', { uri: asset.uri, type: asset.mimeType || 'video/mp4', name: asset.fileName || `reel-${Date.now()}.mp4` } as any);
        form.append('upload_preset', preset);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/video/upload`, { method: 'POST', body: form });
        if (!res.ok) throw new Error(`Cloudinary upload failed: HTTP ${res.status}`);
        const j = await res.json() as { secure_url?: string; public_id?: string };
        if (!j.secure_url || !j.public_id) throw new Error('Cloudinary response missing media identity');
        provider = 'cloudinary'; url = j.secure_url; hls = `https://res.cloudinary.com/${cloud}/video/upload/sp_auto/${j.public_id}.m3u8`;
      } else {
        const res = await fetch(asset.uri); const bytes = await res.arrayBuffer();
        path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`;
        const { error } = await supabase.storage.from('ateek-videos').upload(path, bytes, { contentType: asset.mimeType || 'video/mp4', upsert: false });
        if (error) throw error;
        url = supabase.storage.from('ateek-videos').getPublicUrl(path).data.publicUrl;
      }
      const { error } = await supabase.rpc('ateek_reel_create', { p_listing: chosen, p_storage_path: path, p_playback_url: url, p_hls_url: hls, p_media_provider: provider, p_thumbnail_url: null, p_caption: caption.trim(), p_duration_seconds: asset.duration ? Math.max(1, Math.round(asset.duration / 1000)) : null });
      if (error) throw error;
      setComposer(false); setCaption(''); setChosen(null); haptics.success(); await load();
    } catch (e: any) { Alert.alert('تعذر نشر الريل', String(e?.message ?? e)); }
    finally { setBusy(false); }
  };

  const place = async (a: Auction) => {
    const amount = Number(bid.replace(/[^\d]/g, ''));
    const floor = Number(a.highest_bid ?? a.starting_price) + Number(a.min_increment);
    if (!Number.isFinite(amount) || amount < floor) return void Alert.alert(`الحد الأدنى ${iq(floor)}`);
    const { error } = await supabase.rpc('ateek_bid_place', { p_auction: a.auction_id, p_amount: Math.round(amount) });
    if (error) return void Alert.alert('تعذر إرسال المزايدة', error.message);
    setBid(''); haptics.success();
  };

  const onView = useRef(({ viewableItems }: { viewableItems: Array<{ item: Reel }> }) => setActive(viewableItems[0]?.item.id ?? null)).current;
  if (loading) return <ReelsSkeleton />;
  if (loadError && !reels.length) return <View style={s.emptyWrap}><Ionicons name="cloud-offline-outline" size={48} color={ui.colors.muted} /><Text style={s.title}>تعذر تحميل الريلز</Text><Text style={s.empty}>{loadError}</Text><Pressable onPress={() => { setLoading(true); void load(); }} style={s.primary}><Text style={s.primaryText}>إعادة المحاولة</Text></Pressable></View>;

  return <View style={s.root}><FlatList data={reels} keyExtractor={(x) => x.id} pagingEnabled windowSize={3} initialNumToRender={2} maxToRenderPerBatch={2} removeClippedSubviews viewabilityConfig={{ itemVisiblePercentThreshold: 80 }} onViewableItemsChanged={onView} renderItem={({ item }) => { const l = item.listing_id ? listings[item.listing_id] : undefined; const a = item.listing_id ? auctions[item.listing_id] : undefined; return <View style={[s.reel, { height: Math.max(520, height - 84) }]}><SafeReelVideo reel={item} active={active === item.id} /><View style={s.scrim} /><View style={s.top}><Text style={s.brand}>ATEEK REELS</Text><Pressable onPress={() => setComposer(true)} style={s.icon}><Ionicons name="add" size={ui.icon} color={ui.colors.text} /></Pressable></View><View style={s.rail}><Pressable onPress={() => setComments(item.id)} style={s.round}><Ionicons name="chatbubble-outline" size={ui.icon} color={ui.colors.text} /></Pressable><Text style={s.provider}>{item.media_provider === 'cloudinary' ? 'HLS' : 'MP4'}</Text></View><View style={[s.bottom, { bottom: insets.bottom + 80 }]}>{!!item.caption && <Text numberOfLines={2} ellipsizeMode="tail" style={s.caption}>{item.caption}</Text>}{l && <Pressable onPress={() => { haptics.medium(); setDeal(l); }} style={s.listing}>{!!l.image && <Image source={{ uri: l.image }} style={s.thumb} />}<View style={{ flex: 1 }}><Text numberOfLines={1} style={s.listTitle}>{l.title}</Text><Text style={s.price}>{iq(Number(l.price))}</Text></View><Ionicons name="chevron-back" size={ui.icon} color={ui.colors.success} /></Pressable>}{a && <View style={s.auction}><View style={{ flex: 1 }}><Text style={s.live}>● مزاد مباشر</Text><Text style={s.price}>{iq(Number(a.highest_bid ?? a.starting_price))}</Text></View><TextInput value={bid} onChangeText={setBid} keyboardType="number-pad" placeholder="مزايدتك" placeholderTextColor={ui.colors.muted} style={s.bidInput} /><Pressable onPress={() => void place(a)} style={s.bidBtn}><Text style={s.bidText}>زايد</Text></Pressable></View>}</View></View>; }} ListEmptyComponent={<View style={s.emptyWrap}><Ionicons name="play-circle-outline" size={54} color={ui.colors.muted} /><Text style={s.title}>لا توجد ريلز بعد</Text><Text style={s.empty}>كل ما يظهر هنا يأتي من قاعدة البيانات الحقيقية.</Text><Pressable onPress={() => setComposer(true)} style={s.primary}><Text style={s.primaryText}>إضافة ريل</Text></Pressable></View>} /><Comments id={comments ?? ''} visible={!!comments} close={() => setComments(null)} /><Modal visible={!!deal} transparent animationType="slide" onRequestClose={() => setDeal(null)}><View style={s.backdrop}><View style={s.sheet}><View style={s.head}><Pressable onPress={() => setDeal(null)} style={s.icon}><Ionicons name="close" size={ui.icon} color={ui.colors.text} /></Pressable><Text style={s.title}>تفاصيل الصفقة</Text></View>{deal && <>{!!deal.image && <Image source={{ uri: deal.image }} style={s.dealImage} />}<Text style={s.dealTitle}>{deal.title}</Text><Text style={s.dealPrice}>{iq(Number(deal.price))}</Text><Text style={s.meta}>{deal.condition} • {deal.location}</Text></>}</View></View></Modal><Modal visible={composer} transparent animationType="slide" onRequestClose={() => setComposer(false)}><View style={s.backdrop}><View style={s.sheet}><View style={s.head}><Pressable onPress={() => setComposer(false)} style={s.icon}><Ionicons name="close" size={ui.icon} color={ui.colors.text} /></Pressable><Text style={s.title}>نشر ريل</Text></View><TextInput value={caption} onChangeText={setCaption} placeholder="وصف قصير للريل" placeholderTextColor={ui.colors.muted} style={s.captionInput} maxLength={1000} /><Text style={s.meta}>اربط الريل بإعلانك (اختياري)</Text><FlatList horizontal inverted data={own} keyExtractor={(x) => x.id} contentContainerStyle={{ gap: 8 }} renderItem={({ item }) => <Pressable onPress={() => setChosen((v) => v === item.id ? null : item.id)} style={[s.choice, chosen === item.id && { borderColor: ui.colors.success }]}><Text numberOfLines={1} style={s.choiceText}>{item.title}</Text></Pressable>} /><Pressable disabled={busy} onPress={() => void create()} style={[s.primary, busy && { opacity: .5 }]}>{busy ? <ActivityIndicator color={ui.colors.background} /> : <><Ionicons name="videocam" size={ui.icon} color={ui.colors.background} /><Text style={s.primaryText}>اختيار الفيديو ورفعه</Text></>}</Pressable><Text style={s.note}>Cloudinary HLS يعمل فقط عند وجود إعدادات Cloudinary الحقيقية؛ بخلاف ذلك يتم الرفع الفعلي إلى Supabase Storage.</Text></View></View></Modal></View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: ui.colors.background },
  reel: { width: '100%', backgroundColor: ui.colors.background, overflow: 'hidden' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,.22)' },
  top: { position: 'absolute', top: 12, left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { color: ui.colors.text, fontWeight: '900', letterSpacing: 1.2 },
  icon: { width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(9,10,15,.82)', borderWidth: 1, borderColor: ui.colors.line, alignItems: 'center', justifyContent: 'center' },
  rail: { position: 'absolute', right: 14, bottom: 210, width: 52, gap: 16, alignItems: 'center' },
  round: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(9,10,15,.82)', borderWidth: 1, borderColor: ui.colors.line, alignItems: 'center', justifyContent: 'center' },
  provider: { color: ui.colors.success, fontSize: 9, fontWeight: '900', backgroundColor: 'rgba(9,10,15,.82)', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 },
  bottom: { position: 'absolute', left: 14, right: 14, gap: 8 },
  caption: { color: ui.colors.text, textAlign: 'right', fontWeight: '700' },
  listing: { minHeight: 64, borderRadius: 16, backgroundColor: 'rgba(19,21,31,.92)', borderWidth: 1, borderColor: ui.colors.line, flexDirection: 'row-reverse', gap: 10, alignItems: 'center', padding: 8 },
  thumb: { width: 48, height: 48, borderRadius: 12, backgroundColor: ui.colors.card },
  listTitle: { color: ui.colors.text, fontWeight: '900', textAlign: 'right' },
  price: { color: ui.colors.accent, fontWeight: '900', textAlign: 'right' },
  auction: { minHeight: 58, borderRadius: 16, backgroundColor: 'rgba(19,21,31,.94)', borderWidth: 1, borderColor: 'rgba(232,176,88,.35)', flexDirection: 'row-reverse', alignItems: 'center', gap: 8, padding: 8 },
  live: { color: '#FF7B86', fontWeight: '900', textAlign: 'right' },
  bidInput: { width: 94, height: 42, borderRadius: 12, backgroundColor: ui.colors.background, color: ui.colors.text, paddingHorizontal: 8, textAlign: 'center' },
  bidBtn: { height: 42, paddingHorizontal: 14, borderRadius: 12, backgroundColor: ui.colors.accent, justifyContent: 'center' },
  bidText: { color: ui.colors.background, fontWeight: '900' },
  emptyWrap: { flex: 1, backgroundColor: ui.colors.background, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { color: ui.colors.text, fontSize: 22, fontWeight: '900', textAlign: 'right' },
  empty: { color: ui.colors.muted, textAlign: 'center', lineHeight: 22 },
  primary: { minHeight: 50, borderRadius: 16, backgroundColor: ui.colors.accent, paddingHorizontal: 18, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: ui.colors.background, fontWeight: '900' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.62)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: ui.colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, gap: 12, maxHeight: '86%' },
  comments: { backgroundColor: ui.colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '82%', minHeight: '55%' },
  head: { minHeight: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  comment: { backgroundColor: ui.colors.cardRaised, borderRadius: 14, padding: 10, gap: 4 },
  commentBody: { color: ui.colors.text, textAlign: 'right' },
  time: { color: ui.colors.muted, fontSize: 10, textAlign: 'right' },
  composer: { flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: ui.colors.line },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 14, backgroundColor: ui.colors.background, color: ui.colors.text, padding: 10, textAlign: 'right' },
  send: { width: 44, height: 44, borderRadius: 14, backgroundColor: ui.colors.accent, alignItems: 'center', justifyContent: 'center' },
  dealImage: { width: '100%', height: 230, borderRadius: 18, backgroundColor: ui.colors.background },
  dealTitle: { color: ui.colors.text, fontSize: 20, fontWeight: '900', textAlign: 'right' },
  dealPrice: { color: ui.colors.accent, fontSize: 18, fontWeight: '900', textAlign: 'right' },
  meta: { color: ui.colors.muted, textAlign: 'right' },
  captionInput: { minHeight: 90, borderRadius: 16, backgroundColor: ui.colors.background, color: ui.colors.text, padding: 12, textAlign: 'right', textAlignVertical: 'top' },
  choice: { maxWidth: 160, borderRadius: 14, borderWidth: 1, borderColor: ui.colors.line, paddingHorizontal: 12, paddingVertical: 10 },
  choiceText: { color: ui.colors.text, maxWidth: 140 },
  note: { color: ui.colors.muted, fontSize: 11, lineHeight: 18, textAlign: 'right' },
  bigSkeleton: { width: 110, height: 110, borderRadius: 32, backgroundColor: ui.colors.card },
  smallSkeleton: { width: '72%', height: 14, borderRadius: 8, backgroundColor: ui.colors.card },
});
