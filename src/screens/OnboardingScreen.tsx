import { useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ui } from '../theme/tokens';

const pages = [
  { icon: 'storefront-outline' as const, title: 'سوق عراقي اجتماعي متكامل', body: 'بيع وشراء، تفاوض، تقييمات، متابعات، ريلز ومزادات مباشرة في تجربة واحدة.' },
  { icon: 'sparkles-outline' as const, title: 'ذكاء عتيك داخل التطبيق', body: 'مساعد ذكي حقيقي يعمل فوق بياناتك المسموح بها ويساعدك في الوصف والسعر واتخاذ القرار.' },
  { icon: 'shield-checkmark-outline' as const, title: 'مصمم للاستقرار والأمان', body: 'احتواء أخطاء الشاشات، تحقق صارم من الفيديو، تخزين سحابي وصلاحيات Android محدودة قدر الإمكان.' },
];

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const { width } = useWindowDimensions();
  const ref = useRef<FlatList<(typeof pages)[number]>>(null);
  const [index, setIndex] = useState(0);
  const next = () => {
    if (index >= pages.length - 1) return onDone();
    ref.current?.scrollToIndex({ index: index + 1, animated: true });
  };
  return (
    <View style={s.root}>
      <View style={s.brandRow}><Text style={s.brand}>ATEEK</Text><Text style={s.ar}>عتيك</Text></View>
      <FlatList
        ref={ref}
        data={pages}
        keyExtractor={(x) => x.title}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width)))}
        renderItem={({ item }) => (
          <View style={[s.page, { width }]}>
            <View style={s.hero}><Ionicons name={item.icon} size={76} color={ui.colors.accent} /></View>
            <Text style={s.title}>{item.title}</Text>
            <Text style={s.body}>{item.body}</Text>
          </View>
        )}
      />
      <View style={s.dots}>{pages.map((_, i) => <View key={i} style={[s.dot, i === index && s.dotActive]} />)}</View>
      <Pressable accessibilityRole="button" onPress={next} style={s.primary}><Text style={s.primaryText}>{index === pages.length - 1 ? 'ابدأ استخدام عتيك' : 'التالي'}</Text><Ionicons name="arrow-back" size={ui.icon} color={ui.colors.background} /></Pressable>
      <Pressable accessibilityRole="button" onPress={onDone} style={s.skip}><Text style={s.skipText}>تخطي</Text></Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: ui.colors.background, paddingTop: 54, paddingBottom: 24 },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: ui.spacing.section, alignItems: 'baseline' },
  brand: { color: ui.colors.accent, fontWeight: '900', letterSpacing: 2, fontSize: 18 },
  ar: { color: ui.colors.text, fontWeight: '900', fontSize: 24 },
  page: { paddingHorizontal: ui.spacing.section, alignItems: 'center', justifyContent: 'center', gap: 18 },
  hero: { width: 164, height: 164, borderRadius: 48, backgroundColor: ui.colors.card, borderWidth: 1, borderColor: ui.colors.line, alignItems: 'center', justifyContent: 'center' },
  title: { color: ui.colors.text, fontWeight: '900', fontSize: 26, textAlign: 'center' },
  body: { color: ui.colors.muted, fontSize: 15, lineHeight: 25, textAlign: 'center', maxWidth: 460 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 18 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3A3F4A' },
  dotActive: { width: 24, backgroundColor: ui.colors.accent },
  primary: { marginHorizontal: ui.spacing.standard, minHeight: 54, borderRadius: ui.radius.card, backgroundColor: ui.colors.accent, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: ui.colors.background, fontWeight: '900' },
  skip: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  skipText: { color: ui.colors.muted, fontWeight: '700' },
});
