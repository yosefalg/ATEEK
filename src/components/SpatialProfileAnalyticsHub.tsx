import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { Cloud } from '../cloud/useCloud';
import { supabase } from '../cloud/client';
import { Listing } from '../types';
import { BUILD_INFO } from '../config/buildInfo';
import { formatPrice } from '../data/seed';
import { haptics } from '../system/haptics';
import { useAteekTheme } from '../theme/ThemeProvider';

const BG = '#090A0F';
const TITANIUM = '#151922';
const GLASS = 'rgba(255,255,255,0.055)';
const LINE = 'rgba(190,198,211,0.16)';
const INK = '#F6F8FB';
const MUTED = '#8A94A6';
const CYAN = '#73F0CF';
const GOLD = '#E0B66C';
const DANGER = '#FF7B86';
const CACHE_TTL = 10 * 60 * 1000;

type Analytics = {
  followers: number;
  recentFollowers: Array<{ id: string; name: string; username?: string | null; avatar_url?: string | null; created_at: string }>;
  profileViews30d: number;
  lifetimeListingViews: number;
  rating: number;
  ratingCount: number;
  completedDeals: number;
  responseSecondsAvg: number;
  badges: string[];
  generatedAt?: string;
};

type SocialPost = {
  id: string;
  user_id: string;
  body: string;
  image_path?: string | null;
  listing_id?: string | null;
  created_at: string;
};

type Section = 'overview' | 'activity' | 'merchant' | 'settings';

function n(value: unknown) {
  const x = Number(value ?? 0);
  return Number.isFinite(x) ? x : 0;
}

function formatCount(value: number) {
  return new Intl.NumberFormat('ar-IQ').format(Math.max(0, Math.round(value)));
}

function responseLabel(seconds: number) {
  if (!seconds) return 'غير متاح';
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))} ث`;
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))} د`;
  return `${Math.max(1, Math.round(seconds / 3600))} س`;
}

function Avatar({ uri, size = 42 }: { uri?: string | null; size?: number }) {
  return (
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }]}> 
      {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} /> : <Ionicons name="person" color="#AAB3C2" size={Math.round(size * 0.48)} />}
    </View>
  );
}

function Metric({ icon, label, value, accent = CYAN }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; accent?: string }) {
  return (
    <View style={s.metric}>
      <Ionicons name={icon} size={18} color={accent} />
      <Text style={s.metricLabel}>{label}</Text>
      <Text numberOfLines={2} style={s.metricValue}>{value}</Text>
    </View>
  );
}

function ToggleRow({ icon, title, note, value, onChange }: { icon: keyof typeof Ionicons.glyphMap; title: string; note: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={s.settingRow}>
      <View style={s.settingIcon}><Ionicons name={icon} size={19} color={CYAN} /></View>
      <View style={{ flex: 1 }}><Text style={s.settingTitle}>{title}</Text><Text style={s.settingNote}>{note}</Text></View>
      <Switch value={value} onValueChange={(v) => { haptics.tap(); onChange(v); }} trackColor={{ false: '#343B48', true: '#2E8B75' }} thumbColor={value ? CYAN : '#B8C0CE'} />
    </View>
  );
}

async function pickAndUpload(uid: string, prefix: string) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('يلزم السماح بالوصول إلى الصور.');
  const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: true });
  if (picked.canceled || !picked.assets[0]?.uri) return null;
  const compressed = await ImageManipulator.manipulateAsync(
    picked.assets[0].uri,
    [{ resize: { width: 1600 } }],
    { compress: 0.78, format: ImageManipulator.SaveFormat.JPEG },
  );
  const base64 = await FileSystem.readAsStringAsync(compressed.uri, { encoding: FileSystem.EncodingType.Base64 });
  const path = `${uid}/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  const { error } = await supabase.storage.from('ateek-images').upload(path, decode(base64), { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return path;
}

export function SpatialProfileAnalyticsHub({ m, onOpen }: { m: Cloud; onOpen: (x: Listing) => void }) {
  const theme = useAteekTheme();
  const profile = m.profiles.find((x) => x.id === m.user.id);
  const cacheKey = `ateek.analytics.v19.${m.user.id}`;
  const [section, setSection] = useState<Section>('overview');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsBusy, setAnalyticsBusy] = useState(false);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [postBody, setPostBody] = useState('');
  const [postImage, setPostImage] = useState<string | null>(null);
  const [postBusy, setPostBusy] = useState(false);
  const [username, setUsername] = useState(String(profile?.username ?? ''));
  const [bio, setBio] = useState(String(profile?.bio ?? ''));
  const [coverUrl, setCoverUrl] = useState(String(profile?.cover_url ?? ''));
  const [hours, setHours] = useState(String(profile?.business_hours ?? ''));
  const [notifyMessages, setNotifyMessages] = useState(profile?.notify_messages !== false);
  const [notifyAuctions, setNotifyAuctions] = useState(profile?.notify_auctions !== false);
  const [notifyFollowers, setNotifyFollowers] = useState(profile?.notify_followers !== false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [ticket, setTicket] = useState('');
  const [ticketBusy, setTicketBusy] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  const loadPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from('ateek_social_posts')
      .select('id,user_id,body,image_path,listing_id,created_at')
      .eq('user_id', m.user.id)
      .order('created_at', { ascending: false })
      .limit(theme.lowData ? 30 : 80);
    if (error) throw error;
    setPosts((data ?? []) as SocialPost[]);
  }, [m.user.id, theme.lowData]);

  const refreshAnalytics = useCallback(async () => {
    setAnalyticsBusy(true);
    try {
      const { data, error } = await supabase.rpc('ateek_profile_analytics', { p_profile: m.user.id });
      if (error) throw error;
      const raw = (data ?? {}) as Record<string, unknown>;
      const next: Analytics = {
        followers: n(raw.followers),
        recentFollowers: Array.isArray(raw.recentFollowers) ? raw.recentFollowers as Analytics['recentFollowers'] : [],
        profileViews30d: n(raw.profileViews30d),
        lifetimeListingViews: n(raw.lifetimeListingViews),
        rating: n(raw.rating),
        ratingCount: n(raw.ratingCount),
        completedDeals: n(raw.completedDeals),
        responseSecondsAvg: n(raw.responseSecondsAvg),
        badges: Array.isArray(raw.badges) ? raw.badges.map(String) : [],
        generatedAt: typeof raw.generatedAt === 'string' ? raw.generatedAt : undefined,
      };
      setAnalytics(next);
      await AsyncStorage.setItem(cacheKey, JSON.stringify({ data: next, savedAt: Date.now() }));
    } catch (error: any) {
      Alert.alert('تعذر تحديث التحليلات', String(error?.message ?? error));
    } finally {
      setAnalyticsBusy(false);
    }
  }, [cacheKey, m.user.id]);

  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem(cacheKey).then((raw) => {
      if (!alive || !raw) return;
      try {
        const cached = JSON.parse(raw) as { data?: Analytics; savedAt?: number };
        if (cached.data) setAnalytics(cached.data);
        if (!cached.savedAt || Date.now() - cached.savedAt > CACHE_TTL) void refreshAnalytics();
      } catch {
        void refreshAnalytics();
      }
    }).catch(() => void refreshAnalytics());
    void refreshAnalytics();
    void loadPosts().catch(() => {});
    return () => { alive = false; };
  }, [cacheKey, loadPosts, refreshAnalytics]);

  useEffect(() => {
    setUsername(String(profile?.username ?? ''));
    setBio(String(profile?.bio ?? ''));
    setCoverUrl(String(profile?.cover_url ?? ''));
    setHours(String(profile?.business_hours ?? ''));
    setNotifyMessages(profile?.notify_messages !== false);
    setNotifyAuctions(profile?.notify_auctions !== false);
    setNotifyFollowers(profile?.notify_followers !== false);
  }, [profile?.username, profile?.bio, profile?.cover_url, profile?.business_hours, profile?.notify_messages, profile?.notify_auctions, profile?.notify_followers]);

  const mine = useMemo(() => m.listings.filter((x) => x.owner && x.status !== 'removed'), [m.listings]);
  const favorites = useMemo(() => m.listings.filter((x) => m.favorites.includes(x.id)), [m.favorites, m.listings]);
  const blockedProfiles = useMemo(() => m.blocks.map((b) => m.profiles.find((p) => p.id === b.blocked_id)).filter(Boolean), [m.blocks, m.profiles]);

  const publishPost = async () => {
    if (!postBody.trim() || postBusy) return;
    setPostBusy(true);
    try {
      const { error } = await supabase.rpc('ateek_social_post_create', {
        p_body: postBody.trim(),
        p_image_path: postImage,
        p_listing_id: null,
      });
      if (error) throw error;
      haptics.success();
      setPostBody('');
      setPostImage(null);
      await loadPosts();
    } catch (error: any) {
      Alert.alert('تعذر نشر التحديث', String(error?.message ?? error));
    } finally {
      setPostBusy(false);
    }
  };

  const pickPostImage = async () => {
    try {
      const path = await pickAndUpload(m.user.id, 'social');
      if (path) { haptics.tap(); setPostImage(path); }
    } catch (error: any) { Alert.alert('تعذر رفع الصورة', String(error?.message ?? error)); }
  };

  const pickCover = async () => {
    try {
      const path = await pickAndUpload(m.user.id, 'cover');
      if (!path) return;
      setCoverUrl(supabase.storage.from('ateek-images').getPublicUrl(path).data.publicUrl);
      haptics.tap();
    } catch (error: any) { Alert.alert('تعذر رفع الغلاف', String(error?.message ?? error)); }
  };

  const saveSettings = async () => {
    if (saveBusy) return;
    setSaveBusy(true);
    try {
      const { error } = await supabase.rpc('ateek_profile_settings_update', {
        p_username: username,
        p_bio: bio,
        p_cover_url: coverUrl,
        p_business_hours: hours,
        p_notify_messages: notifyMessages,
        p_notify_auctions: notifyAuctions,
        p_notify_followers: notifyFollowers,
      });
      if (error) throw error;
      haptics.success();
      await m.refresh();
      Alert.alert('تم الحفظ', 'تم تحديث صفحة عتيك وإعدادات التفاعل.');
    } catch (error: any) {
      Alert.alert('تعذر حفظ الإعدادات', String(error?.message ?? error));
    } finally { setSaveBusy(false); }
  };

  const sendTicket = async () => {
    if (ticketBusy || ticket.trim().length < 5) return;
    setTicketBusy(true);
    try {
      const { error } = await supabase.rpc('ateek_support_ticket_create', { p_body: ticket.trim() });
      if (error) throw error;
      setTicket('');
      haptics.success();
      Alert.alert('تم الإرسال', 'وصل البلاغ إلى مركز دعم عتيك.');
    } catch (error: any) { Alert.alert('تعذر إرسال البلاغ', String(error?.message ?? error)); }
    finally { setTicketBusy(false); }
  };

  const postImageUrl = (path?: string | null) => path ? supabase.storage.from('ateek-images').getPublicUrl(path).data.publicUrl : null;

  return (
    <ScrollView style={s.root} contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
      <View style={s.hero}>
        {coverUrl ? <Image source={{ uri: coverUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
        <View style={s.heroShade} />
        <View style={s.heroTop}><Text style={s.eyebrow}>ATEEK SOCIAL COMMAND CENTER</Text><Text style={s.version}>1.9.0 • #12</Text></View>
        <View style={s.identityRow}>
          <Avatar uri={profile?.avatar_url} size={68} />
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <View style={s.nameRow}><Text style={s.name}>{profile?.name || 'حسابي'}</Text>{profile?.verified ? <Ionicons name="shield-checkmark" size={18} color={CYAN} /> : null}</View>
            {!!profile?.username && <Text style={s.handle}>@{profile.username}</Text>}
            {!!profile?.bio && <Text numberOfLines={2} style={s.bio}>{profile.bio}</Text>}
          </View>
        </View>
        <View style={s.badges}>{analytics?.badges.map((badge) => <View key={badge} style={s.badge}><Ionicons name="sparkles" size={12} color={GOLD} /><Text style={s.badgeText}>{badge}</Text></View>)}</View>
      </View>

      <View style={s.tabs}>
        {([
          ['overview', 'التحليلات', 'analytics-outline'],
          ['activity', 'النشاط', 'pulse-outline'],
          ['merchant', 'الصفحة', 'storefront-outline'],
          ['settings', 'الإعدادات', 'options-outline'],
        ] as Array<[Section, string, keyof typeof Ionicons.glyphMap]>).map(([id, label, icon]) => (
          <Pressable key={id} onPress={() => { haptics.tap(); setSection(id); }} style={[s.tab, section === id && s.tabActive]}>
            <Ionicons name={icon} size={17} color={section === id ? BG : CYAN} /><Text style={[s.tabText, section === id && s.tabTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {section === 'overview' && <>
        <View style={s.sectionHeader}><View><Text style={s.sectionTitle}>Analytics Hub</Text><Text style={s.sectionSub}>إحصائيات حقيقية مجمعة من Supabase</Text></View><Pressable disabled={analyticsBusy} onPress={() => void refreshAnalytics()} style={s.iconButton}>{analyticsBusy ? <ActivityIndicator color={CYAN} /> : <Ionicons name="refresh" size={18} color={CYAN} />}</Pressable></View>
        <View style={s.metricsGrid}>
          <Metric icon="people-outline" label="المتابعون" value={analytics ? formatCount(analytics.followers) : '—'} />
          <Metric icon="person-add-outline" label="زوار 30 يوم" value={analytics ? formatCount(analytics.profileViews30d) : '—'} accent="#70B8FF" />
          <Metric icon="eye-outline" label="مشاهدات الإعلانات" value={analytics ? formatCount(analytics.lifetimeListingViews) : '—'} accent={GOLD} />
          <Metric icon="star-outline" label="التقييم" value={analytics ? `${analytics.rating.toFixed(1)} / 5 (${formatCount(analytics.ratingCount)})` : '—'} accent={GOLD} />
          <Metric icon="timer-outline" label="متوسط الرد" value={analytics ? responseLabel(analytics.responseSecondsAvg) : '—'} />
          <Metric icon="checkmark-circle-outline" label="صفقات مكتملة" value={analytics ? formatCount(analytics.completedDeals) : '—'} />
        </View>
        <View style={s.panel}>
          <Text style={s.panelTitle}>أحدث المتابعين</Text>
          {!analytics?.recentFollowers.length ? <Text style={s.empty}>لا توجد متابعات حديثة مسجلة.</Text> : analytics.recentFollowers.map((f) => (
            <View key={`${f.id}-${f.created_at}`} style={s.followerRow}><Avatar uri={f.avatar_url} /><View style={{ flex: 1 }}><Text style={s.rowTitle}>{f.name}</Text><Text style={s.rowSub}>{f.username ? `@${f.username}` : 'بدون معرف'} • {new Date(f.created_at).toLocaleDateString('ar-IQ')}</Text></View></View>
          ))}
        </View>
        <View style={s.panel}><Text style={s.panelTitle}>إعلاناتي</Text>{mine.length === 0 ? <Text style={s.empty}>لا توجد إعلانات منشورة.</Text> : mine.slice(0, 8).map((item) => <Pressable key={item.id} onPress={() => onOpen(item)} style={s.listingRow}><View style={{ flex: 1 }}><Text style={s.rowTitle}>{item.title}</Text><Text style={s.rowSub}>{formatPrice(item.price)} • {item.status}</Text></View><Ionicons name="chevron-back" size={18} color={MUTED} /></Pressable>)}</View>
      </>}

      {section === 'activity' && <>
        <View style={s.panel}>
          <Text style={s.panelTitle}>نشر تحديث</Text>
          <TextInput value={postBody} onChangeText={setPostBody} maxLength={1000} multiline placeholder="شارك تحديثًا عن سلعة أو صفقة…" placeholderTextColor={MUTED} style={s.bigInput} />
          {postImage ? <View style={s.pendingImage}><Image source={{ uri: postImageUrl(postImage)! }} style={StyleSheet.absoluteFill} /><Pressable onPress={() => setPostImage(null)} style={s.removeImage}><Ionicons name="close" color={INK} size={18} /></Pressable></View> : null}
          <View style={s.actionRow}><Pressable disabled={postBusy} onPress={() => void pickPostImage()} style={s.secondaryAction}><Ionicons name="image-outline" size={18} color={CYAN} /><Text style={s.secondaryText}>صورة</Text></Pressable><Pressable disabled={postBusy || !postBody.trim()} onPress={() => void publishPost()} style={[s.primaryAction, (postBusy || !postBody.trim()) && s.disabled]}>{postBusy ? <ActivityIndicator color={BG} /> : <><Ionicons name="send" size={17} color={BG} /><Text style={s.primaryText}>نشر</Text></>}</Pressable></View>
        </View>
        <View style={s.panel}><Text style={s.panelTitle}>خلاصة نشاطي</Text>{posts.length === 0 ? <Text style={s.empty}>لا توجد منشورات بعد.</Text> : posts.map((post) => { const uri = postImageUrl(post.image_path); return <View key={post.id} style={s.post}><View style={s.postHead}><Text style={s.rowSub}>{new Date(post.created_at).toLocaleString('ar-IQ')}</Text><Pressable onPress={() => Alert.alert('حذف المنشور؟', 'سيختفي من صفحة النشاط.', [{ text: 'إلغاء' }, { text: 'حذف', style: 'destructive', onPress: () => void supabase.from('ateek_social_posts').delete().eq('id', post.id).then(() => loadPosts()) }])}><Ionicons name="trash-outline" size={17} color={DANGER} /></Pressable></View><Text style={s.postBody}>{post.body}</Text>{uri ? <Image source={{ uri }} style={s.postImage} /> : null}</View>; })}</View>
      </>}

      {section === 'merchant' && <>
        <View style={s.panel}><Text style={s.panelTitle}>Pro Merchant Hub</Text><Text style={s.panelHint}>خصص هويتك التجارية. المعرف يخضع لقيد التفرد الحقيقي في قاعدة البيانات.</Text><Text style={s.label}>@username</Text><TextInput value={username} onChangeText={(x) => setUsername(x.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24))} autoCapitalize="none" style={s.input} placeholder="username" placeholderTextColor={MUTED} /><Text style={s.label}>السيرة الذاتية</Text><TextInput value={bio} onChangeText={setBio} maxLength={300} multiline style={s.bigInput} placeholder="نبذة عن نشاطك…" placeholderTextColor={MUTED} /><Text style={s.label}>ساعات العمل / الرد</Text><TextInput value={hours} onChangeText={setHours} maxLength={160} style={s.input} placeholder="مثال: يوميًا 9ص - 9م" placeholderTextColor={MUTED} /><Text style={s.label}>الغلاف</Text>{coverUrl ? <Image source={{ uri: coverUrl }} style={s.coverPreview} /> : null}<Pressable onPress={() => void pickCover()} style={s.secondaryAction}><Ionicons name="images-outline" size={18} color={CYAN} /><Text style={s.secondaryText}>اختيار غلاف حقيقي</Text></Pressable><Pressable disabled={saveBusy} onPress={() => void saveSettings()} style={[s.primaryAction, saveBusy && s.disabled]}>{saveBusy ? <ActivityIndicator color={BG} /> : <Text style={s.primaryText}>حفظ الصفحة التجارية</Text>}</Pressable></View>
        <View style={s.panel}><Text style={s.panelTitle}>تنبيهات المتابعين والتفاعل</Text><ToggleRow icon="chatbubble-ellipses-outline" title="الرسائل" note="تنبيهات المحادثات المباشرة" value={notifyMessages} onChange={setNotifyMessages} /><ToggleRow icon="hammer-outline" title="المزادات" note="تنبيهات العروض والمزايدات" value={notifyAuctions} onChange={setNotifyAuctions} /><ToggleRow icon="people-outline" title="المتابعون" note="تنبيهات شبكة المتابعة والنشاط" value={notifyFollowers} onChange={setNotifyFollowers} /></View>
      </>}

      {section === 'settings' && <>
        <View style={s.panel}><Text style={s.panelTitle}>الحساب والخصوصية</Text><Text style={s.panelHint}>المستخدمون المحظورون من بيانات حسابك الفعلية.</Text>{blockedProfiles.length === 0 ? <Text style={s.empty}>لا يوجد مستخدمون محظورون.</Text> : blockedProfiles.map((p: any) => <View key={p.id} style={s.followerRow}><Avatar uri={p.avatar_url} /><View style={{ flex: 1 }}><Text style={s.rowTitle}>{p.name ?? 'مستخدم عتيك'}</Text><Text style={s.rowSub}>{p.username ? `@${p.username}` : ''}</Text></View></View>)}</View>
        <View style={s.panel}><Text style={s.panelTitle}>المظهر والأداء</Text><ToggleRow icon="moon-outline" title="AMOLED Dark" note="خلفية OLED Titanium #090A0F" value={theme.resolved === 'dark'} onChange={(v) => theme.setMode(v ? 'dark' : 'light')} /><ToggleRow icon="speedometer-outline" title="Low Data Mode" note="تقليل دورية المزامنة وحجم القوائم" value={theme.lowData} onChange={theme.setLowData} /></View>
        <View style={s.panel}><Text style={s.panelTitle}>المفضلة</Text>{favorites.length === 0 ? <Text style={s.empty}>لا توجد مفضلة.</Text> : favorites.slice(0, 6).map((item) => <Pressable key={item.id} onPress={() => onOpen(item)} style={s.listingRow}><View style={{ flex: 1 }}><Text style={s.rowTitle}>{item.title}</Text><Text style={s.rowSub}>{formatPrice(item.price)}</Text></View><Ionicons name="heart" color={DANGER} size={18} /></Pressable>)}</View>
        <View style={s.panel}><Text style={s.panelTitle}>الدعم والأمان</Text><View style={s.about}><Ionicons name="shield-checkmark-outline" size={24} color={CYAN} /><View style={{ flex: 1 }}><Text style={s.rowTitle}>عن عتيك</Text><Text style={s.rowSub}>ATEEK {BUILD_INFO.versionName} • #{BUILD_INFO.versionCode} • {BUILD_INFO.shortSha}</Text></View></View><Pressable onPress={() => { haptics.tap(); setTermsOpen(!termsOpen); }} style={s.listingRow}><Text style={s.rowTitle}>شروط الخدمة والبيع الآمن</Text><Ionicons name={termsOpen ? 'chevron-up' : 'chevron-down'} size={18} color={MUTED} /></Pressable>{termsOpen ? <Text style={s.terms}>استخدم عتيك لعرض سلع حقيقية ومفاوضات مشروعة. لا تشارك كلمات المرور أو رموز التحقق أو البيانات المصرفية الحساسة داخل المحادثات، وافحص السلعة قبل إتمام الصفقة. البلاغات والحظر متاحان لحماية المجتمع.</Text> : null}<TextInput value={ticket} onChangeText={setTicket} maxLength={2000} multiline style={s.bigInput} placeholder="أبلغ عن مشكلة تقنية أو إساءة…" placeholderTextColor={MUTED} /><Pressable disabled={ticketBusy || ticket.trim().length < 5} onPress={() => void sendTicket()} style={[s.secondaryAction, (ticketBusy || ticket.trim().length < 5) && s.disabled]}>{ticketBusy ? <ActivityIndicator color={CYAN} /> : <><Ionicons name="bug-outline" size={18} color={CYAN} /><Text style={s.secondaryText}>إرسال إلى الدعم</Text></>}</Pressable><Pressable onPress={() => void supabase.auth.signOut()} style={s.logout}><Ionicons name="log-out-outline" size={18} color={DANGER} /><Text style={s.logoutText}>تسجيل الخروج</Text></Pressable></View>
      </>}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  page: { padding: 14, paddingBottom: 110, gap: 12 },
  hero: { minHeight: 226, borderRadius: 28, overflow: 'hidden', backgroundColor: TITANIUM, borderWidth: 1, borderColor: LINE, padding: 18, justifyContent: 'space-between' },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(9,10,15,0.68)' },
  heroTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: CYAN, fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  version: { color: '#B4BDCB', fontSize: 11, fontWeight: '700' },
  identityRow: { flexDirection: 'row-reverse', gap: 14, alignItems: 'center' },
  avatar: { backgroundColor: '#202632', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(115,240,207,0.25)' },
  nameRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  name: { color: INK, fontSize: 24, fontWeight: '900', textAlign: 'right' },
  handle: { color: CYAN, fontSize: 12, marginTop: 2 },
  bio: { color: '#BCC4D1', fontSize: 12, lineHeight: 19, textAlign: 'right', marginTop: 5 },
  badges: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 7 },
  badge: { flexDirection: 'row-reverse', gap: 5, alignItems: 'center', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(224,182,108,0.32)', backgroundColor: 'rgba(224,182,108,0.09)', paddingHorizontal: 9, paddingVertical: 5 },
  badgeText: { color: GOLD, fontSize: 10, fontWeight: '800' },
  tabs: { flexDirection: 'row-reverse', gap: 7 },
  tab: { flex: 1, minHeight: 54, borderRadius: 17, borderWidth: 1, borderColor: LINE, backgroundColor: GLASS, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabActive: { backgroundColor: CYAN, borderColor: CYAN },
  tabText: { color: '#B4BDCB', fontSize: 10, fontWeight: '800' },
  tabTextActive: { color: BG },
  sectionHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingTop: 5 },
  sectionTitle: { color: INK, fontSize: 20, fontWeight: '900', textAlign: 'right' },
  sectionSub: { color: MUTED, fontSize: 10, marginTop: 3, textAlign: 'right' },
  iconButton: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, borderColor: LINE, backgroundColor: GLASS, alignItems: 'center', justifyContent: 'center' },
  metricsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 9 },
  metric: { width: '48.5%', minHeight: 112, padding: 14, borderRadius: 22, backgroundColor: TITANIUM, borderWidth: 1, borderColor: LINE, justifyContent: 'space-between' },
  metricLabel: { color: MUTED, fontSize: 10, textAlign: 'right' },
  metricValue: { color: INK, fontSize: 18, fontWeight: '900', textAlign: 'right' },
  panel: { backgroundColor: TITANIUM, borderWidth: 1, borderColor: LINE, borderRadius: 24, padding: 15, gap: 11 },
  panelTitle: { color: INK, fontSize: 17, fontWeight: '900', textAlign: 'right' },
  panelHint: { color: MUTED, fontSize: 11, lineHeight: 18, textAlign: 'right' },
  followerRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, backgroundColor: GLASS, borderRadius: 17, padding: 10 },
  rowTitle: { color: INK, fontSize: 13, fontWeight: '800', textAlign: 'right' },
  rowSub: { color: MUTED, fontSize: 10, marginTop: 3, textAlign: 'right' },
  empty: { color: MUTED, fontSize: 12, textAlign: 'right', paddingVertical: 8 },
  listingRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: LINE, paddingVertical: 10 },
  bigInput: { minHeight: 96, maxHeight: 170, borderRadius: 18, borderWidth: 1, borderColor: LINE, backgroundColor: BG, padding: 13, color: INK, textAlign: 'right', textAlignVertical: 'top' },
  input: { minHeight: 50, borderRadius: 16, borderWidth: 1, borderColor: LINE, backgroundColor: BG, paddingHorizontal: 13, color: INK, textAlign: 'right' },
  label: { color: '#C5CCD7', fontSize: 11, fontWeight: '800', textAlign: 'right' },
  actionRow: { flexDirection: 'row-reverse', gap: 9 },
  primaryAction: { flex: 1, minHeight: 48, borderRadius: 16, backgroundColor: CYAN, alignItems: 'center', justifyContent: 'center', flexDirection: 'row-reverse', gap: 7 },
  primaryText: { color: BG, fontWeight: '900', fontSize: 12 },
  secondaryAction: { minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(115,240,207,0.28)', backgroundColor: 'rgba(115,240,207,0.06)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row-reverse', gap: 7, paddingHorizontal: 14 },
  secondaryText: { color: CYAN, fontWeight: '800', fontSize: 12 },
  disabled: { opacity: 0.45 },
  pendingImage: { height: 180, borderRadius: 19, overflow: 'hidden', backgroundColor: BG },
  removeImage: { position: 'absolute', left: 9, top: 9, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  post: { borderRadius: 20, borderWidth: 1, borderColor: LINE, backgroundColor: GLASS, padding: 12, gap: 9 },
  postHead: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  postBody: { color: INK, fontSize: 14, lineHeight: 22, textAlign: 'right' },
  postImage: { width: '100%', height: 210, borderRadius: 16, backgroundColor: BG },
  coverPreview: { width: '100%', height: 150, borderRadius: 18, backgroundColor: BG },
  settingRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: LINE },
  settingIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: 'rgba(115,240,207,0.07)', alignItems: 'center', justifyContent: 'center' },
  settingTitle: { color: INK, fontSize: 13, fontWeight: '800', textAlign: 'right' },
  settingNote: { color: MUTED, fontSize: 9, marginTop: 3, textAlign: 'right' },
  about: { flexDirection: 'row-reverse', gap: 10, alignItems: 'center', backgroundColor: GLASS, borderRadius: 17, padding: 11 },
  terms: { color: '#B8C1CE', fontSize: 11, lineHeight: 20, textAlign: 'right' },
  logout: { minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,123,134,0.25)', backgroundColor: 'rgba(255,123,134,0.06)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row-reverse', gap: 7 },
  logoutText: { color: DANGER, fontWeight: '900', fontSize: 12 },
});
