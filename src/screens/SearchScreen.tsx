import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { ListingCard } from '../components/ListingCard';
import { categories } from '../data/seed';
import { colors } from '../theme/colors';
import { Listing } from '../types';

export function SearchScreen({ listings, favorites, onFavorite, onOpen, initialCategory = 'all' }: { listings: Listing[]; favorites: string[]; onFavorite: (id: string) => void; onOpen: (item: Listing) => void; initialCategory?: string }) {
  const [query, setQuery] = useState(''); const [category, setCategory] = useState(initialCategory);
  const filtered = useMemo(() => listings.filter(item => (category === 'all' || item.category === category) && (`${item.title} ${item.location} ${item.description}`).includes(query.trim())), [listings, category, query]);
  return <View style={styles.root}>
    <View style={styles.header}><Text style={styles.title}>اكتشف الكنوز</Text><Text style={styles.subtitle}>ابحث بين أحدث المعروضات في العراق</Text><View style={styles.search}><Ionicons name="options-outline" size={21} color={colors.gold} /><TextInput autoFocus value={query} onChangeText={setQuery} placeholder="ماذا تبحث عنه؟" placeholderTextColor={colors.muted} style={styles.input} /><Ionicons name="search" size={21} color={colors.muted} /></View></View>
    <View style={styles.chips}><FlatList horizontal inverted showsHorizontalScrollIndicator={false} data={[{ id: 'all', label: 'الكل' }, ...categories]} keyExtractor={item => item.id} renderItem={({ item }) => <Pressable onPress={() => setCategory(item.id)} style={[styles.chip, category === item.id && styles.chipActive]}><Text style={[styles.chipText, category === item.id && styles.chipTextActive]}>{item.label}</Text></Pressable>} /></View>
    <FlatList data={filtered} keyExtractor={item => item.id} numColumns={2} columnWrapperStyle={styles.row} contentContainerStyle={styles.results} ListEmptyComponent={<EmptyState icon="search-outline" title="لم نجد نتائج" body="جرّب كلمة أخرى أو اختر قسمًا مختلفًا" />} renderItem={({ item }) => <ListingCard item={item} favorite={favorites.includes(item.id)} onFavorite={() => onFavorite(item.id)} onPress={() => onOpen(item)} />} />
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream }, header: { backgroundColor: colors.forest, padding: 20, paddingTop: 24, alignItems: 'flex-end' }, title: { color: colors.paper, fontSize: 26, fontWeight: '900' }, subtitle: { color: colors.goldSoft, fontSize: 12, marginTop: 3 },
  search: { marginTop: 17, width: '100%', height: 52, borderRadius: 17, backgroundColor: colors.paper, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8 }, input: { flex: 1, textAlign: 'right', writingDirection: 'rtl', color: colors.ink },
  chips: { height: 61, paddingVertical: 11, paddingHorizontal: 10 }, chip: { paddingHorizontal: 16, height: 38, justifyContent: 'center', borderRadius: 14, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, marginHorizontal: 4 }, chipActive: { backgroundColor: colors.gold, borderColor: colors.gold }, chipText: { color: colors.muted, fontSize: 12, fontWeight: '700' }, chipTextActive: { color: colors.forest },
  results: { padding: 16, paddingTop: 4 }, row: { justifyContent: 'space-between' }
});
