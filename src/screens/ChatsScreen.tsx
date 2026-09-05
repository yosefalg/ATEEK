import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

const chats = [
  { id: '1', name: 'كرار النجفي', item: 'راديو خشبي عتيق', text: 'أكدر أشوف صور إضافية؟', time: '12:40', unread: 2, image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80' },
  { id: '2', name: 'حسين جبار', item: 'نحاس أصفر للبيع', text: 'تم، اتفقنا على السعر.', time: 'أمس', unread: 0, image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80' }
];

export function ChatsScreen() {
  return <View style={styles.root}><View style={styles.header}><Text style={styles.title}>المحادثات</Text><Text style={styles.subtitle}>تفاوض واتفق بأمان داخل عتيك</Text></View>
    {chats.map(chat => <Pressable key={chat.id} style={styles.chat}><Image source={{ uri: chat.image }} style={styles.avatar} /><View style={styles.content}><View style={styles.line}><Text style={styles.time}>{chat.time}</Text><View style={styles.nameLine}><Text style={styles.name}>{chat.name}</Text><Ionicons name="checkmark-circle" size={15} color={colors.success} /></View></View><Text style={styles.item}>{chat.item}</Text><View style={styles.line}>{chat.unread ? <View style={styles.badge}><Text style={styles.badgeText}>{chat.unread}</Text></View> : <Ionicons name="checkmark-done" size={16} color={colors.success} />}<Text style={styles.message} numberOfLines={1}>{chat.text}</Text></View></View></Pressable>)}
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream }, header: { backgroundColor: colors.forest, padding: 20, alignItems: 'flex-end' }, title: { fontSize: 26, fontWeight: '900', color: colors.paper }, subtitle: { fontSize: 12, color: colors.goldSoft, marginTop: 3 },
  chat: { backgroundColor: colors.paper, marginHorizontal: 15, marginTop: 12, padding: 13, borderRadius: 19, flexDirection: 'row-reverse', gap: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.line }, avatar: { width: 58, height: 58, borderRadius: 20 }, content: { flex: 1 }, line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, nameLine: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }, name: { fontSize: 15, fontWeight: '900', color: colors.ink }, time: { fontSize: 10, color: colors.muted }, item: { textAlign: 'right', color: colors.gold, fontSize: 11, fontWeight: '700', marginTop: 2 }, message: { color: colors.muted, fontSize: 12, textAlign: 'right', marginTop: 6, flex: 1 }, badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.gold, justifyContent: 'center', alignItems: 'center' }, badgeText: { fontSize: 10, fontWeight: '900', color: colors.forest }
});
