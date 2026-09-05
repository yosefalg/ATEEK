import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

const rows = [
  ['cube-outline', 'إعلاناتي'], ['heart-outline', 'المفضلة'], ['pricetag-outline', 'عروضي'], ['shield-checkmark-outline', 'الأمان والتحقق'], ['settings-outline', 'الإعدادات']
] as const;

export function ProfileScreen({ listingCount, favoriteCount, offerCount }: { listingCount: number; favoriteCount: number; offerCount: number }) {
  return <ScrollView style={styles.root} contentContainerStyle={styles.content}><View style={styles.hero}><View style={styles.avatar}><Text style={styles.avatarText}>ي</Text></View><View style={styles.verified}><Ionicons name="checkmark" size={13} color={colors.paper} /></View><Text style={styles.name}>يوسف حسون علي</Text><Text style={styles.member}>عضو موثّق في عتيك</Text></View>
    <View style={styles.stats}><Stat value={listingCount} label="الإعلانات" /><View style={styles.divider} /><Stat value={favoriteCount} label="المفضلة" /><View style={styles.divider} /><Stat value={offerCount} label="العروض" /></View>
    <View style={styles.menu}>{rows.map(([icon, label]) => <Pressable key={label} style={styles.row}><Ionicons name="chevron-back" size={18} color={colors.muted} /><View style={styles.rowTitle}><Text style={styles.rowText}>{label}</Text><View style={styles.rowIcon}><Ionicons name={icon} size={20} color={colors.gold} /></View></View></Pressable>)}</View>
    <View style={styles.footer}><Text style={styles.brand}>ATEEK • عتيك</Text><Text style={styles.version}>الإصدار 1.0.0 — صُنع في العراق</Text></View>
  </ScrollView>;
}
function Stat({ value, label }: { value: number; label: string }) { return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream }, content: { paddingBottom: 28 }, hero: { backgroundColor: colors.forest, padding: 26, alignItems: 'center' }, avatar: { width: 82, height: 82, borderRadius: 30, backgroundColor: colors.gold, justifyContent: 'center', alignItems: 'center' }, avatarText: { fontSize: 42, fontWeight: '900', color: colors.forest }, verified: { position: 'absolute', top: 88, right: '39%', width: 23, height: 23, borderRadius: 12, backgroundColor: colors.success, borderWidth: 3, borderColor: colors.forest, alignItems: 'center', justifyContent: 'center' }, name: { color: colors.paper, fontSize: 21, fontWeight: '900', marginTop: 12 }, member: { color: colors.goldSoft, fontSize: 11, marginTop: 3 },
  stats: { height: 86, backgroundColor: colors.paper, margin: 16, borderRadius: 20, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-around', borderWidth: 1, borderColor: colors.line }, stat: { alignItems: 'center', flex: 1 }, statValue: { fontSize: 20, fontWeight: '900', color: colors.forest }, statLabel: { fontSize: 10, color: colors.muted, marginTop: 2 }, divider: { width: 1, height: 35, backgroundColor: colors.line },
  menu: { marginHorizontal: 16, backgroundColor: colors.paper, borderRadius: 21, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.line }, row: { height: 61, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.line }, rowTitle: { flexDirection: 'row-reverse', alignItems: 'center', gap: 11 }, rowIcon: { width: 37, height: 37, borderRadius: 13, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' }, rowText: { color: colors.ink, fontWeight: '800', fontSize: 14 }, footer: { alignItems: 'center', marginTop: 25 }, brand: { color: colors.forest, fontWeight: '900' }, version: { color: colors.muted, fontSize: 10, marginTop: 4 }
});
