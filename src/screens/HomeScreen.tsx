import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Header } from '../components/Header';
import { ListingCard } from '../components/ListingCard';
import { categories } from '../data/seed';
import { colors, shadows } from '../theme/colors';
import { Listing } from '../types';

type Props = { listings: Listing[]; favorites: string[]; onFavorite: (id: string) => void; onOpen: (item: Listing) => void; onSearch: (category?: string) => void; onNotifications?: () => void };

const trustItems = [
  { icon: 'shield-checkmark-outline' as const, label: 'حماية وبلاغات' },
  { icon: 'chatbubbles-outline' as const, label: 'تفاوض مباشر' },
  { icon: 'leaf-outline' as const, label: 'إعادة استخدام' }
];

export function HomeScreen({ listings, favorites, onFavorite, onOpen, onSearch, onNotifications }: Props) {
  return (
    <FlatList
      data={listings}
      keyExtractor={item => item.id}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={<>
        <Header onNotifications={onNotifications} />
        <View style={styles.topArea}>
          <Pressable onPress={() => onSearch()} style={styles.search}>
            <Ionicons name="search-outline" size={20} color={colors.muted} />
            <TextInput editable={false} pointerEvents="none" placeholder="ابحث عن تحفة، خردة، جهاز..." placeholderTextColor={colors.muted} style={styles.searchInput} />
            <View style={styles.filterBubble}><Ionicons name="options-outline" size={18} color={colors.forest} /></View>
          </Pressable>

          <LinearGradient colors={[colors.forestSoft, colors.forest, '#0B1F1A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.heroGlow} />
            <View style={styles.heroOrnament}><Ionicons name="leaf" size={72} color="rgba(105,182,107,.18)" /></View>
            <Text style={styles.eyebrow}>ATEEK MARKETPLACE</Text>
            <Text style={styles.heroTitle}>حوّل ما لا تحتاجه{`\n`}إلى قيمة حقيقية</Text>
            <Text style={styles.heroText}>بيع • شراء • تفاوض • إعادة استخدام</Text>
            <Pressable onPress={() => onSearch()} style={styles.heroButton}><Text style={styles.heroButtonText}>استكشف السوق</Text><Ionicons name="arrow-back" size={16} color={colors.forest} /></Pressable>
          </LinearGradient>

          <View style={styles.trustRow}>{trustItems.map(item => <View key={item.label} style={styles.trustChip}><Ionicons name={item.icon} size={15} color={colors.success} /><Text style={styles.trustText}>{item.label}</Text></View>)}</View>

          <View style={styles.statsCard}>
            <View style={styles.stat}><Text style={styles.statValue}>{listings.length}</Text><Text style={styles.statLabel}>إعلان متاح</Text></View>
            <View style={styles.statDivider} />
            <View style={styles.stat}><Text style={styles.statValue}>{favorites.length}</Text><Text style={styles.statLabel}>في مفضلتك</Text></View>
            <View style={styles.statDivider} />
            <View style={styles.stat}><Text style={styles.statValue}>{categories.length}</Text><Text style={styles.statLabel}>قسم</Text></View>
          </View>

          <View style={styles.sectionHeading}><Text onPress={() => onSearch()} style={styles.link}>عرض الكل</Text><Text style={styles.sectionTitle}>تصفح الأقسام</Text></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories} style={{ transform: [{ scaleX: -1 }] }}>
            {categories.map(category => <Pressable key={category.id} onPress={() => onSearch(category.id)} style={[styles.category, { transform: [{ scaleX: -1 }] }]}><View style={styles.categoryIcon}><Ionicons name={category.icon} size={24} color={colors.gold} /></View><Text style={styles.categoryText}>{category.label}</Text></Pressable>)}
          </ScrollView>
          <View style={styles.sectionHeading}><Text style={styles.link}>الأحدث أولًا</Text><Text style={styles.sectionTitle}>مختارة لك</Text></View>
        </View>
      </>}
      ListEmptyComponent={<View style={styles.empty}><Ionicons name="cube-outline" size={44} color={colors.muted}/><Text style={styles.emptyTitle}>السوق بانتظار أول إعلان</Text><Text style={styles.emptyText}>أضف سلعة أو وسّع البحث لرؤية نتائج أكثر.</Text></View>}
      renderItem={({ item }) => <ListingCard item={item} favorite={favorites.includes(item.id)} onFavorite={() => onFavorite(item.id)} onPress={() => onOpen(item)} />}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 22, backgroundColor: colors.cream }, row: { paddingHorizontal: 16, justifyContent: 'space-between' },
  topArea: { padding: 16 }, search: { height: 52, borderRadius: 17, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 15, ...shadows.card },
  searchInput: { flex: 1, textAlign: 'right', writingDirection: 'rtl', color: colors.ink, fontSize: 14, marginRight: 8 }, filterBubble: { width: 32, height: 32, borderRadius: 11, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center' },
  hero: { minHeight: 205, borderRadius: 27, padding: 22, marginTop: 15, alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden', ...shadows.card },
  heroGlow: { position: 'absolute', width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(216,169,78,.08)', left: -55, top: -70 },
  heroOrnament: { position: 'absolute', left: 20, bottom: 30 }, eyebrow: { color: colors.gold, fontSize: 10, fontWeight: '900', letterSpacing: 1.1 }, heroTitle: { color: colors.paper, fontSize: 26, fontWeight: '900', lineHeight: 35, textAlign: 'right', marginTop: 5 }, heroText: { color: colors.goldSoft, fontSize: 11, marginTop: 8 },
  heroButton: { marginTop: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 7, backgroundColor: colors.gold, borderRadius: 13, paddingHorizontal: 13, paddingVertical: 9 }, heroButtonText: { color: colors.forest, fontSize: 11, fontWeight: '900' },
  trustRow: { flexDirection: 'row-reverse', gap: 7, marginTop: 11, flexWrap: 'wrap' }, trustChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, backgroundColor: '#EEF4EF', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 }, trustText: { fontSize: 10, color: colors.ink, fontWeight: '700' },
  statsCard: { marginTop: 12, backgroundColor: colors.paper, borderRadius: 18, borderWidth: 1, borderColor: colors.line, paddingVertical: 12, flexDirection: 'row-reverse', justifyContent: 'space-around', alignItems: 'center' }, stat: { alignItems: 'center', minWidth: 72 }, statValue: { fontSize: 18, fontWeight: '900', color: colors.forest }, statLabel: { fontSize: 9, color: colors.muted, marginTop: 2 }, statDivider: { width: 1, height: 27, backgroundColor: colors.line },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 12 }, sectionTitle: { fontSize: 18, fontWeight: '900', color: colors.ink }, link: { fontSize: 11, color: colors.success, fontWeight: '700' },
  categories: { gap: 10, paddingHorizontal: 1 }, category: { width: 88, alignItems: 'center', gap: 7 }, categoryIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' }, categoryText: { fontSize: 11, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  empty: { marginHorizontal: 16, marginTop: 10, borderRadius: 20, padding: 26, backgroundColor: colors.paper, alignItems: 'center', borderWidth: 1, borderColor: colors.line }, emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '900', marginTop: 10 }, emptyText: { color: colors.muted, fontSize: 11, marginTop: 5, textAlign: 'center' }
});
