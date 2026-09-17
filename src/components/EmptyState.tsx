import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAteekTheme } from '../theme/ThemeProvider';

export const EmptyState = memo(function EmptyState({ icon, title, body }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }) {
  const { colors } = useAteekTheme();
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${title}. ${body}`}
      accessibilityLiveRegion="polite"
      style={styles.root}
    >
      <View style={[styles.icon, { backgroundColor: colors.forest }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Ionicons name={icon} size={34} color={colors.gold} />
      </View>
      <Text style={[styles.title, { color: colors.ink }]} accessibilityElementsHidden importantForAccessibility="no">{title}</Text>
      <Text style={[styles.body, { color: colors.muted }]} accessibilityElementsHidden importantForAccessibility="no">{body}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  root: { padding: 35, alignItems: 'center' },
  icon: { width: 72, height: 72, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  title: { fontSize: 18, fontWeight: '900', textAlign: 'center' },
  body: { fontSize: 13, textAlign: 'center', marginTop: 7, lineHeight: 21 }
});
