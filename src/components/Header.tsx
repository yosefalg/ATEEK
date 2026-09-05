import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export function Header({ onNotifications }: { onNotifications?: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable accessibilityLabel="الإشعارات" style={styles.iconButton} onPress={onNotifications ?? (() => Alert.alert('الإشعارات', 'لا توجد إشعارات.'))}><Ionicons name="notifications-outline" size={23} color={colors.cream} /></Pressable>
      <View style={styles.brand}>
        <View style={styles.logo}><Text style={styles.logoLetter}>ع</Text></View>
        <View><Text style={styles.name}>عتيك</Text><Text style={styles.tagline}>كل شيء له قيمة</Text></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { height: 76, backgroundColor: colors.forest, paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  logo: { width: 43, height: 43, borderRadius: 14, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  logoLetter: { color: colors.forest, fontSize: 27, fontWeight: '900' },
  name: { color: colors.cream, fontSize: 23, fontWeight: '900', textAlign: 'right' },
  tagline: { color: colors.goldSoft, fontSize: 10, marginTop: -2 },
  iconButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,.08)', alignItems: 'center', justifyContent: 'center' }
});
