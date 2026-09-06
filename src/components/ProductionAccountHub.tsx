import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Cloud } from '../cloud/useCloud';
import { supabase } from '../cloud/client';
import { Listing } from '../types';
import { SpatialProfileAnalyticsHub } from './SpatialProfileAnalyticsHub';
import { BUILD_INFO } from '../config/buildInfo';
import { haptics } from '../system/haptics';
import { useAteekTheme } from '../theme/ThemeProvider';
import { ui } from '../theme/tokens';

type Tab = 'profile' | 'verify' | 'premium' | 'settings';
type Verification = { verified: boolean; status: 'none' | 'pending' | 'approved' | 'rejected' | 'verified'; requestedAt?: string | null };

type Props = { m: Cloud; onOpen: (x: Listing) => void };

function TopTabs({ tab, setTab }: { tab: Tab; setTab: (x: Tab) => void }) {
  const rows: Array<[Tab, string, keyof typeof Ionicons.glyphMap]> = [
    ['profile', 'ملفي', 'person-outline'], ['verify', 'التوثيق', 'shield-checkmark-outline'], ['premium', 'Premium', 'diamond-outline'], ['settings', 'الإعدادات', 'settings-outline'],
  ];
  return <View style={s.tabs}>{rows.map(([id, label, icon]) => <Pressable key={id} onPress={() => { haptics.tap(); setTab(id); }} style={[s.tab, tab === id && s.tabActive]}><Ionicons name={icon} size={ui.icon} color={tab === id ? ui.colors.accent : ui.colors.muted} /><Text style={[s.tabText, tab === id && { color: ui.colors.text }]}>{label}</Text></Pressable>)}</View>;
}

function VerificationPanel() {
  const [state, setState] = useState<Verification | null>(null);
  const [busy, setBusy] = useState(false);
  const load = async () => {
    const { data, error } = await supabase.rpc('ateek_verification_status');
    if (error) throw error;
    setState((data ?? { verified: false, status: 'none' }) as Verification);
  };
  useEffect(() => { void load().catch((e) => Alert.alert('التوثيق', String(e?.message ?? e))); }, []);
  const submit = async () => {
    if (busy || state?.verified || state?.status === 'pending') return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc('ateek_verification_request_submit');
      if (error) throw error;
      haptics.success();
      await load();
      Alert.alert('تم استلام الطلب', 'التوثيق مجاني. تم إرسال الطلب للمراجعة دون أي عملية دفع.');
    } catch (e: any) { Alert.alert('تعذر إرسال الطلب', String(e?.message ?? e)); }
    finally { setBusy(false); }
  };
  const label = state?.verified ? 'حساب موثّق' : state?.status === 'pending' ? 'قيد المراجعة' : state?.status === 'rejected' ? 'يمكنك إعادة الطلب لاحقاً' : 'غير موثّق';
  return <ScrollView contentContainerStyle={s.page}><View style={s.heroCard}><Ionicons name="shield-checkmark" size={48} color={ui.colors.accent} /><Text style={s.title}>التوثيق المجاني</Text><Text style={s.body}>طلب مباشر عبر Supabase. الشارة لا تُمنح تلقائياً؛ لا يوجد شراء أو تحايل على المراجعة.</Text><View style={s.status}><Text style={s.statusText}>{label}</Text></View><Pressable disabled={busy || state?.verified || state?.status === 'pending'} onPress={() => void submit()} style={[s.primary, (busy || state?.verified || state?.status === 'pending') && { opacity: .45 }]}>{busy ? <ActivityIndicator color={ui.colors.background} /> : <Text style={s.primaryText}>{state?.verified ? 'تم التوثيق' : state?.status === 'pending' ? 'الطلب قيد المراجعة' : 'طلب التوثيق الآن'}</Text>}</Pressable></View></ScrollView>;
}

const premiumPlans = [
  { id: 'creator', title: 'Creator', note: 'أدوات حضور وصناعة محتوى وتحليلات موسعة.' },
  { id: 'merchant', title: 'Merchant', note: 'واجهة تاجر محسنة وإدارة نشاط احترافية.' },
  { id: 'business', title: 'Business', note: 'مزايا فرق وعلامات تجارية عند توفر الدفع.' },
] as const;

function PremiumPanel() {
  const [busy, setBusy] = useState<string | null>(null);
  const save = async (plan: string) => {
    if (busy) return;
    setBusy(plan);
    try {
      const { error } = await supabase.rpc('ateek_premium_interest_save', { p_plan: plan });
      if (error) throw error;
      haptics.success();
      Alert.alert('تم تسجيل اهتمامك', 'لا توجد عملية دفع حالياً. سيتم استخدام هذا التسجيل فقط لمعرفة الباقة المطلوبة عند إطلاق الدفع الحقيقي.');
    } catch (e: any) { Alert.alert('تعذر الحفظ', String(e?.message ?? e)); }
    finally { setBusy(null); }
  };
  return <ScrollView contentContainerStyle={s.page}><Text style={s.title}>ATEEK Premium</Text><Text style={s.body}>واجهة إنتاجية جاهزة للربط مع بوابة دفع مستقبلية، من دون محاكاة اشتراك أو تفعيل وهمي.</Text>{premiumPlans.map((p) => <View key={p.id} style={s.card}><View style={s.row}><Ionicons name="diamond-outline" size={ui.icon} color={ui.colors.accent} /><Text style={s.cardTitle}>{p.title}</Text></View><Text style={s.body}>{p.note}</Text><Pressable disabled={!!busy} onPress={() => void save(p.id)} style={s.secondary}>{busy === p.id ? <ActivityIndicator color={ui.colors.accent} /> : <Text style={s.secondaryText}>سجّل اهتمامي</Text>}</Pressable></View>)}</ScrollView>;
}

function SettingsPanel({ m }: { m: Cloud }) {
  const theme = useAteekTheme();
  const [loc, setLoc] = useState('غير مفحوص');
  const [ticket, setTicket] = useState('');
  const [sending, setSending] = useState(false);
  const checkLocation = async (ask = false) => {
    const p = ask ? await Location.requestForegroundPermissionsAsync() : await Location.getForegroundPermissionsAsync();
    setLoc(p.status === 'granted' ? 'مسموح أثناء الاستخدام' : p.status === 'denied' ? 'مرفوض' : 'غير محدد');
  };
  useEffect(() => { void checkLocation(false); }, []);
  const sendSupport = async () => {
    if (sending || ticket.trim().length < 5) return;
    setSending(true);
    try {
      const { error } = await supabase.rpc('ateek_support_ticket_create', { p_body: ticket.trim() });
      if (error) throw error;
      setTicket('');
      haptics.success();
      Alert.alert('تم الإرسال', 'وصل طلبك إلى مركز دعم عتيك.');
    } catch (e: any) { Alert.alert('تعذر الإرسال', String(e?.message ?? e)); }
    finally { setSending(false); }
  };
  return <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled"><Text style={s.title}>مركز الإعدادات الموحد</Text><View style={s.card}><Text style={s.cardTitle}>المظهر والأداء</Text><Pressable onPress={() => { haptics.tap(); theme.toggle(); }} style={s.setting}><Ionicons name="contrast-outline" size={ui.icon} color={ui.colors.accent} /><View style={s.settingCopy}><Text style={s.settingTitle}>الوضع المرئي</Text><Text style={s.body}>{theme.resolved === 'dark' ? 'AMOLED Titanium Dark' : 'الوضع الفاتح'}</Text></View></Pressable><Pressable onPress={() => { haptics.tap(); theme.setLowData(!theme.lowData); }} style={s.setting}><Ionicons name="speedometer-outline" size={ui.icon} color={ui.colors.accent} /><View style={s.settingCopy}><Text style={s.settingTitle}>Low Data Mode</Text><Text style={s.body}>{theme.lowData ? 'مفعّل' : 'متوقف'}</Text></View></Pressable></View><View style={s.card}><Text style={s.cardTitle}>الخصوصية والأذونات</Text><Text style={s.body}>الحسابات المحظورة: {m.blocks.length}</Text><Pressable onPress={() => void checkLocation(true)} style={s.setting}><Ionicons name="location-outline" size={ui.icon} color={ui.colors.accent} /><View style={s.settingCopy}><Text style={s.settingTitle}>إذن الموقع</Text><Text style={s.body}>{loc}</Text></View></Pressable></View><View style={s.card}><Text style={s.cardTitle}>الدعم والإصدار</Text><Text style={s.body}>ATEEK {BUILD_INFO.versionName} • Build #{BUILD_INFO.versionCode} • {BUILD_INFO.shortSha}</Text><TextInput value={ticket} onChangeText={setTicket} maxLength={1200} multiline placeholder="اكتب طلب دعم أو بلاغ تقني" placeholderTextColor={ui.colors.muted} style={s.input} /><Pressable disabled={sending || ticket.trim().length < 5} onPress={() => void sendSupport()} style={s.secondary}>{sending ? <ActivityIndicator color={ui.colors.accent} /> : <Text style={s.secondaryText}>إرسال للدعم</Text>}</Pressable></View><Pressable onPress={() => void supabase.auth.signOut()} style={s.danger}><Ionicons name="log-out-outline" size={ui.icon} color={ui.colors.danger} /><Text style={s.dangerText}>تسجيل الخروج</Text></Pressable></ScrollView>;
}

export function ProductionAccountHub({ m, onOpen }: Props) {
  const [tab, setTab] = useState<Tab>('profile');
  return <View style={s.root}><TopTabs tab={tab} setTab={setTab} /><View style={{ flex: 1 }}>{tab === 'profile' ? <SpatialProfileAnalyticsHub m={m} onOpen={onOpen} /> : tab === 'verify' ? <VerificationPanel /> : tab === 'premium' ? <PremiumPanel /> : <SettingsPanel m={m} />}</View></View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: ui.colors.background },
  tabs: { flexDirection: 'row-reverse', gap: 8, paddingHorizontal: 8, paddingVertical: 8, backgroundColor: ui.colors.background, borderBottomWidth: 1, borderBottomColor: ui.colors.line },
  tab: { flex: 1, minHeight: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabActive: { backgroundColor: ui.colors.card, borderWidth: 1, borderColor: ui.colors.line },
  tabText: { color: ui.colors.muted, fontWeight: '800', fontSize: 10 },
  page: { padding: ui.spacing.standard, paddingBottom: 40, gap: ui.spacing.standard },
  heroCard: { backgroundColor: ui.colors.card, borderRadius: ui.radius.sheet, padding: ui.spacing.section, borderWidth: 1, borderColor: ui.colors.line, alignItems: 'center', gap: 14 },
  title: { color: ui.colors.text, fontSize: 24, fontWeight: '900', textAlign: 'right' },
  body: { color: ui.colors.muted, lineHeight: 22, textAlign: 'right' },
  status: { borderRadius: ui.radius.round, backgroundColor: 'rgba(232,176,88,.12)', paddingHorizontal: 14, paddingVertical: 8 },
  statusText: { color: ui.colors.accent, fontWeight: '900' },
  primary: { minHeight: 52, width: '100%', borderRadius: ui.radius.card, backgroundColor: ui.colors.accent, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: ui.colors.background, fontWeight: '900' },
  card: { backgroundColor: ui.colors.card, borderRadius: ui.radius.card, borderWidth: 1, borderColor: ui.colors.line, padding: ui.spacing.standard, gap: 12 },
  row: { flexDirection: 'row-reverse', gap: 8, alignItems: 'center' },
  cardTitle: { color: ui.colors.text, fontSize: 17, fontWeight: '900', textAlign: 'right' },
  secondary: { minHeight: 48, borderRadius: ui.radius.card, borderWidth: 1, borderColor: ui.colors.accent, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: ui.colors.accent, fontWeight: '900' },
  setting: { minHeight: 58, flexDirection: 'row-reverse', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: ui.colors.line, paddingTop: 12 },
  settingCopy: { flex: 1 },
  settingTitle: { color: ui.colors.text, fontWeight: '900', textAlign: 'right' },
  input: { minHeight: 96, borderRadius: ui.radius.card, borderWidth: 1, borderColor: ui.colors.line, color: ui.colors.text, padding: 12, textAlign: 'right', textAlignVertical: 'top' },
  danger: { minHeight: 52, borderRadius: ui.radius.card, borderWidth: 1, borderColor: 'rgba(255,123,134,.35)', flexDirection: 'row-reverse', gap: 8, alignItems: 'center', justifyContent: 'center' },
  dangerText: { color: ui.colors.danger, fontWeight: '900' },
});
