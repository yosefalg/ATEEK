import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export function EmptyState({ icon, title, body }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }) {
  return <View style={styles.root}><View style={styles.icon}><Ionicons name={icon} size={34} color={colors.gold} /></View><Text style={styles.title}>{title}</Text><Text style={styles.body}>{body}</Text></View>;
}

const styles = StyleSheet.create({
  root: { padding: 35, alignItems: 'center' },
  icon: { width: 72, height: 72, borderRadius: 25, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  title: { color: colors.ink, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  body: { color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 7, lineHeight: 21 }
});
