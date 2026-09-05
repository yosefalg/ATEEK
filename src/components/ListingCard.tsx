import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatPrice } from '../data/seed';
import { colors, shadows } from '../theme/colors';
import { Listing } from '../types';

type Props = {
  item: Listing;
  favorite: boolean;
  onFavorite: () => void;
  onPress: () => void;
};

export function ListingCard({ item, favorite, onFavorite, onPress }: Props) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.imageWrap}>
        <Image source={{ uri: item.image }} style={styles.image} />
        <Pressable style={styles.favorite} onPress={onFavorite} hitSlop={8}>
          <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={20} color={favorite ? colors.danger : colors.ink} />
        </Pressable>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.price}>{formatPrice(item.price)}</Text>
        <View style={styles.meta}>
          <View style={styles.metaItem}><Ionicons name="location-outline" size={13} color={colors.muted} /><Text style={styles.metaText}>{item.location}</Text></View>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.metaText}>{item.age}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: '48.3%', backgroundColor: colors.paper, borderRadius: 18, overflow: 'hidden', marginBottom: 14, ...shadows.card },
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  imageWrap: { height: 145, backgroundColor: colors.line },
  image: { width: '100%', height: '100%' },
  favorite: { position: 'absolute', top: 9, left: 9, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,.92)', alignItems: 'center', justifyContent: 'center' },
  body: { padding: 11, alignItems: 'flex-end' },
  title: { color: colors.ink, fontSize: 14, fontWeight: '700', writingDirection: 'rtl', width: '100%', textAlign: 'right' },
  price: { color: colors.forest, fontSize: 15, fontWeight: '900', marginTop: 6 },
  meta: { flexDirection: 'row-reverse', alignItems: 'center', marginTop: 7, width: '100%' },
  metaItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 2 },
  metaText: { color: colors.muted, fontSize: 10 },
  dot: { color: colors.muted, marginHorizontal: 5 }
});
