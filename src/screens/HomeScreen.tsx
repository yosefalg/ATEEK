import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Header } from '../components/Header';
import { ListingCard } from '../components/ListingCard';
import { categories } from '../data/seed';
import { colors } from '../theme/colors';
import { CategoryId, Listing } from '../types';

type Props = { listings: Listing[]; favorites: string[]; onFavorite: (id: string) => void; onOpen: (item: Listing) => void; onSearch: (category?: string) => void; onNotifications?: () => void };

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
          <Pressable onPress={() => onSearch()} style={styles.search}><Ionicons name="search-outline" size={20} color={colors.muted} /><TextInput editable={false} pointerEvents="none" placeholder="ابحث عن تحفة، خردة، جهاز..." placeholderTextColor={colors.muted} style={styles.searchInput} /></Pressable>
          <LinearGradient colors={[colors.forestSoft, colors.forest]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.heroOrnament}><Ionicons name="sparkles" size={68} color="rgba(216,169,78,.2)" /></View>
            <Text style={styles.eyebrow}>سوق عتيك الموثوق</Text><Text style={styles.heroTitle}>حوّل ما لا تحتاجه{`\n`}إلى قيمة حقيقية</Text>
            <Text style={styles.heroText}>اكتشف قيمة مقتنياتك ورتّب إعلاناتك</Text>
          </LinearGradient>
          <View style={styles.sectionHeading}><Text onPress={() => onSearch()} style={styles.link}>عرض الكل</Text><Text style={styles.sectionTitle}>تصفح الأقسام</Text></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories} style={{ transform: [{ scaleX: -1 }] }}>
            {categories.map(category => <Pressable key={category.id} onPress={() => onSearch(category.id)} style={[styles.category, { transform: [{ scaleX: -1 }] }]}><View style={styles.categoryIcon}><Ionicons name={category.icon} size={24} color={colors.gold} /></View><Text style={styles.categoryText}>{category.label}</Text></Pressable>)}
          </ScrollView>
          <View style={styles.sectionHeading}><Text style={styles.link}>الأحدث أولًا</Text><Text style={styles.sectionTitle}>مختارة لك</Text></View>
        </View>
      </>}
      renderItem={({ item }) => <ListingCard item={item} favorite={favorites.includes(item.id)} onFavorite={() => onFavorite(item.id)} onPress={() => onOpen(item)} />}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 18, backgroundColor: colors.cream }, row: { paddingHorizontal: 16, justifyContent: 'space-between' },
  topArea: { padding: 16 }, search: { height: 50, borderRadius: 16, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 15 },
  searchInput: { flex: 1, textAlign: 'right', writingDirection: 'rtl', color: colors.ink, fontSize: 14, marginRight: 8 },
  hero: { height: 174, borderRadius: 25, padding: 22, marginTop: 14, alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden' },
  heroOrnament: { position: 'absolute', left: 18, bottom: 25 }, eyebrow: { color: colors.gold, fontSize: 11, fontWeight: '800' }, heroTitle: { color: colors.paper, fontSize: 25, fontWeight: '900', lineHeight: 34, textAlign: 'right', marginTop: 5 }, heroText: { color: colors.goldSoft, fontSize: 11, marginTop: 8 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 12 }, sectionTitle: { fontSize: 18, fontWeight: '900', color: colors.ink }, link: { fontSize: 11, color: colors.success, fontWeight: '700' },
  categories: { gap: 10, paddingHorizontal: 1 }, category: { width: 88, alignItems: 'center', gap: 7 }, categoryIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' }, categoryText: { fontSize: 11, fontWeight: '700', color: colors.ink, textAlign: 'center' }
});
