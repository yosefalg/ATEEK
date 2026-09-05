import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, shadows } from '../theme/colors';

export function Header({ onNotifications }: { onNotifications?: () => void }) {
  return (
    <LinearGradient colors={[colors.forest, '#0A1D18']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
      <Pressable accessibilityLabel="الإشعارات" style={styles.iconButton} onPress={onNotifications ?? (() => Alert.alert('الإشعارات', 'لا توجد إشعارات.'))}>
        <Ionicons name="notifications-outline" size={22} color={colors.cream} />
        <View style={styles.dot} />
      </Pressable>
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Ionicons name="leaf" size={17} color="#69B66B" style={styles.leaf} />
          <Ionicons name="sync" size={29} color={colors.forest} />
        </View>
        <View>
          <View style={styles.nameRow}><Text style={styles.name}>عتيك</Text><Text style={styles.beta}>ATEEK</Text></View>
          <Text style={styles.tagline}>كل شيء له قيمة من جديد</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { height: 82, paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', ...shadows.card },
  brand: { flexDirection: 'row-reverse', alignItems: 'center', gap: 11 },
  logo: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-3deg' }], borderWidth: 1, borderColor: 'rgba(255,255,255,.2)' },
  leaf: { position: 'absolute', right: 5, top: 5, zIndex: 2 },
  nameRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7 },
  name: { color: colors.cream, fontSize: 23, fontWeight: '900', textAlign: 'right' },
  beta: { color: colors.gold, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  tagline: { color: colors.goldSoft, fontSize: 10, marginTop: -2, textAlign: 'right' },
  iconButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,.06)' },
  dot: { position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: colors.gold, top: 8, right: 8 }
});
