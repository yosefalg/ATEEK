import { useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Marketplace } from '../store/useMarketplaceV2';
import { Listing } from '../types';
import { formatPrice } from '../data/seed';
import { colors } from '../theme/colors';
import { EmptyState } from '../components/EmptyState';
export function WorkspaceScreen({ market: m, onOpen, initial = 'المفضلة' }: { market: Marketplace; onOpen: (x: Listing) => void; initial?: string }) {
  const [section, setSection] = useState(initial);
  const [name, setName] = useState(m.name);
  const items = section === 'المفضلة' ? m.listings.filter(x => m.favorites.includes(x.id)) : m.listings.filter(x => x.owner || x.seller === 'يوسف');
  return <ScrollView contentContainerStyle={s.page}>
    <Text style={s.title}>أهلًا، {m.name}</Text>
    <Text style={s.muted}>ملف محلي على جهازك • ليس حسابًا موثّقًا</Text>
    <View style={s.tabs}>{['المفضلة', 'إعلاناتي', 'عروضي', 'الإعدادات'].map(t => <Pressable accessibilityRole="button" key={t} onPress={() => setSection(t)} style={[s.chip, section === t && s.active]}><Text style={{ color: section === t ? colors.paper : colors.ink }}>{t}</Text></Pressable>)}</View>
    {section === 'الإعدادات' ? <View style={s.card}>
      <Text style={s.heading}>اسم العرض</Text><TextInput accessibilityLabel="اسم العرض" maxLength={60} value={name} onChangeText={setName} style={s.input} />
      <Pressable style={s.button} onPress={() => { if (!name.trim()) return Alert.alert('اكتب اسمًا'); m.saveName(name); }}><Text>حفظ الاسم</Text></Pressable>
      <Text style={s.muted}>لا توجد خدمة تسجيل دخول أو إرسال أو توثيق في هذه النسخة. لا تدخل بيانات حساسة في المحادثات. الإعلانات المرفقة أمثلة تجريبية وليست عروض بيع مؤكدة.</Text>
    </View> : section === 'عروضي' ? <>
      {!m.offers.length && <EmptyState icon="pricetag-outline" title="لا توجد عروض" body="افتح سلعة وسجّل عرض سعر محليًا." />}
      {m.offers.map(o => <View key={o.id} style={s.card}><Text style={s.heading}>{m.listings.find(x => x.id === o.listingId)?.title ?? 'إعلان غير متاح'}</Text><Text style={s.price}>{formatPrice(o.amount)}</Text><Text style={s.muted}>مسودة محلية • لم تُرسل للبائع</Text><Pressable style={s.button} onPress={() => Alert.alert('حذف العرض؟', 'سيُحذف من هذا الجهاز.', [{ text: 'إلغاء' }, { text: 'حذف', style: 'destructive', onPress: () => m.withdrawOffer(o.id) }])}><Text>حذف المسودة</Text></Pressable></View>)}
    </> : <>
      {!items.length && <EmptyState icon="cube-outline" title="لا توجد عناصر بعد" body={section === 'المفضلة' ? 'اضغط القلب على أي إعلان لحفظه هنا.' : 'أضف إعلانك الأول من زر الإضافة.'} />}
      {items.map(x => <View key={x.id} style={s.card}><Pressable onPress={() => onOpen(x)}><Text style={s.heading}>{x.title}</Text><Text style={s.price}>{formatPrice(x.price)}</Text><Text style={s.muted}>{x.location} • {x.condition}</Text></Pressable><Pressable style={s.button} onPress={() => section === 'المفضلة' ? m.toggleFavorite(x.id) : Alert.alert('حذف الإعلان؟', 'لا يمكن التراجع من داخل التطبيق.', [{ text: 'إلغاء' }, { text: 'حذف', style: 'destructive', onPress: () => m.removeListing(x.id) }])}><Text>{section === 'المفضلة' ? 'إزالة من المفضلة' : 'حذف إعلاني'}</Text></Pressable></View>)}
    </>}
  </ScrollView>;
}
export function LocalChats({ market: m, activeId, onSelect }: { market: Marketplace; activeId: string | null; onSelect: (id: string | null) => void }) {
  const [draft, setDraft] = useState('');
  const ids = [...new Set(m.messages.map(x => x.listingId))].reverse();
  const listing = m.listings.find(x => x.id === activeId);
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={s.page}><Text style={s.title}>{activeId ? listing?.title ?? 'إعلان غير متاح' : 'محادثاتي'}</Text><Text style={s.muted}>دفتر محادثات محلي — الرسائل لا تصل إلى البائع.</Text>
    {activeId && <Pressable style={s.chip} onPress={() => onSelect(null)}><Text>رجوع إلى المحادثات</Text></Pressable>}</View>
    {activeId ? <>
      <FlatList style={{ flex: 1 }} contentContainerStyle={{ padding: 18 }} data={m.messages.filter(x => x.listingId === activeId)} keyExtractor={x => x.id} ListEmptyComponent={<EmptyState icon="chatbubble-outline" title="ابدأ مسودة محادثة" body="تُحفظ على هاتفك فقط، دون ردود آلية وهمية." />} renderItem={({ item }) => <View style={s.card}><Text style={s.heading}>{item.text}</Text><Text style={s.muted}>{new Date(item.createdAt).toLocaleString('ar-IQ')} • محلي</Text></View>} />
      <View style={s.page}><TextInput accessibilityLabel="نص الرسالة المحلية" placeholder="اكتب رسالتك…" maxLength={2000} multiline value={draft} onChangeText={setDraft} style={s.input} /><Pressable disabled={!draft.trim()} style={[s.button, !draft.trim() && { opacity: 0.4 }]} onPress={() => { m.sendMessage(activeId, draft); setDraft(''); }}><Text>حفظ الرسالة محليًا</Text></Pressable></View>
    </> : <FlatList data={ids} contentContainerStyle={{ padding: 18 }} keyExtractor={x => x} ListEmptyComponent={<EmptyState icon="chatbubble-outline" title="لا توجد محادثات" body="افتح إعلانًا واضغط مراسلة البائع." />} renderItem={({ item }) => <Pressable style={s.card} onPress={() => onSelect(item)}><Text style={s.heading}>{m.listings.find(x => x.id === item)?.title ?? 'إعلان غير متاح'}</Text><Text style={s.muted} numberOfLines={1}>{m.messages.filter(x => x.listingId === item).slice(-1)[0]?.text}</Text></Pressable>} />}
  </KeyboardAvoidingView>;
}
const s = StyleSheet.create({
  page: { padding: 18, gap: 12 }, title: { fontSize: 25, fontWeight: '900', color: colors.forest, textAlign: 'right' },
  heading: { fontSize: 16, fontWeight: '700', color: colors.ink, textAlign: 'right' },
  muted: { color: colors.muted, lineHeight: 23, textAlign: 'right', fontSize: 12 },
  tabs: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 7 }, chip: { padding: 12, borderRadius: 15, backgroundColor: colors.paper }, active: { backgroundColor: colors.forest },
  card: { padding: 17, borderRadius: 20, backgroundColor: colors.paper, gap: 10, marginBottom: 12, borderWidth: 1, borderColor: colors.line },
  input: { padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.line, textAlign: 'right', backgroundColor: colors.paper, maxHeight: 120 },
  button: { padding: 14, backgroundColor: colors.goldSoft, borderRadius: 14, alignItems: 'center' },
  price: { fontWeight: '900', color: colors.success, fontSize: 18, textAlign: 'right' }
});
