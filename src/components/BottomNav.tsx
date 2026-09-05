import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { TabId } from '../types';

const tabs: { id: TabId; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'home', label: 'الرئيسية', icon: 'home-outline' },
  { id: 'search', label: 'البحث', icon: 'search-outline' },
  { id: 'add', label: 'أضف', icon: 'add' },
  { id: 'chats', label: 'المحادثات', icon: 'chatbubble-ellipses-outline' },
  { id: 'profile', label: 'حسابي', icon: 'person-outline' }
];

export function BottomNav({ active, onChange }: { active: TabId; onChange: (tab: TabId) => void }) {
  return (
    <View style={styles.bar}>
      {tabs.map(tab => {
        const selected = active === tab.id;
        const add = tab.id === 'add';
        return (
          <Pressable key={tab.id} style={styles.tab} onPress={() => onChange(tab.id)}>
            <View style={add ? styles.addButton : undefined}>
              <Ionicons name={selected && !add ? (tab.icon as string).replace('-outline', '') as keyof typeof Ionicons.glyphMap : tab.icon} size={add ? 30 : 22} color={add ? colors.forest : selected ? colors.gold : colors.muted} />
            </View>
            <Text style={[styles.label, selected && styles.selected, add && styles.addLabel]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 76, backgroundColor: colors.paper, borderTopWidth: 1, borderTopColor: colors.line, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-around', paddingBottom: 7 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  label: { fontSize: 10, color: colors.muted, fontWeight: '600' },
  selected: { color: colors.forest, fontWeight: '800' },
  addButton: { width: 55, height: 55, borderRadius: 20, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', marginTop: -31, borderWidth: 5, borderColor: colors.cream },
  addLabel: { marginTop: -1, color: colors.forest, fontWeight: '800' }
});
