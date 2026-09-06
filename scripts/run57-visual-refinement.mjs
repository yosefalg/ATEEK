import fs from 'node:fs';

function patch(path, transforms) {
  let src = fs.readFileSync(path, 'utf8');
  for (const [label, from, to] of transforms) {
    if (!src.includes(from)) throw new Error(`Run57 patch failed: ${label} in ${path}`);
    src = src.replace(from, to);
  }
  fs.writeFileSync(path, src);
}

patch('src/components/SpatialReelsHub.tsx', [
  ['safe-area import', "import { VideoView,useVideoPlayer } from 'expo-video';", "import { VideoView,useVideoPlayer } from 'expo-video';\nimport { useSafeAreaInsets } from 'react-native-safe-area-context';"],
  ['safe-area hook', "export function SpatialReelsHub(){const{height}=useWindowDimensions();", "export function SpatialReelsHub(){const{height}=useWindowDimensions();const insets=useSafeAreaInsets();"],
  ['80 percent viewability', 'itemVisiblePercentThreshold:70', 'itemVisiblePercentThreshold:80'],
  ['caption max two lines', '<Text style={s.caption}>{item.caption}</Text>', '<Text numberOfLines={2} ellipsizeMode="tail" style={s.caption}>{item.caption}</Text>'],
  ['deal tag safe bottom', '<View style={s.bottom}>', '<View style={[s.bottom,{bottom:insets.bottom+80}]}>'],
  ['52px action rail', "rail:{position:'absolute',right:14,bottom:210,gap:9,alignItems:'center'}", "rail:{position:'absolute',right:14,bottom:210,width:52,gap:16,alignItems:'center'}"],
]);

patch('src/components/SpatialDealScreens.tsx', [
  ['window height for keyboard offset', "export function SpatialDMHub({ m, thread, setThread }: { m: Cloud; thread: string | null; setThread: (id: string | null) => void }) {", "export function SpatialDMHub({ m, thread, setThread }: { m: Cloud; thread: string | null; setThread: (id: string | null) => void }) {\n  const { height: windowHeight } = useWindowDimensions();"],
  ['dynamic keyboard docking', "<KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>", "<KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Math.max(12, Math.min(72, Math.round(windowHeight * 0.04)))}>"],
  ['bubble max width', "  bubble: { maxWidth: '84%', minWidth: 94, borderRadius: 20, borderWidth: 1, paddingHorizontal: 13, paddingTop: 10, paddingBottom: 8 },", "  bubble: { maxWidth: '78%', minWidth: 94, borderRadius: 20, borderWidth: 1, paddingHorizontal: 13, paddingTop: 10, paddingBottom: 8 },"],
  ['message list top anchor', "  messagesContent: { paddingHorizontal: 12, paddingVertical: 14, gap: 8 },", "  messagesContent: { paddingHorizontal: 12, paddingTop: 64, paddingBottom: 14, gap: 8 },"],
]);

patch('src/components/SpatialProfileAnalyticsHub.tsx', [
  ['standard page padding', "  page: { padding: 14, paddingBottom: 110, gap: 12 },", "  page: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 110, gap: 12 },"],
  ['metric glass clipping', "  metric: { width: '48.5%', minHeight: 112, padding: 14, borderRadius: 22, backgroundColor: TITANIUM, borderWidth: 1, borderColor: LINE, justifyContent: 'space-between' },", "  metric: { width: '48.5%', minHeight: 112, padding: 14, borderRadius: 16, overflow: 'hidden', backgroundColor: TITANIUM, borderWidth: 1, borderColor: LINE, justifyContent: 'space-between' },"],
  ['panel glass clipping', "  panel: { backgroundColor: TITANIUM, borderWidth: 1, borderColor: LINE, borderRadius: 24, padding: 15, gap: 11 },", "  panel: { backgroundColor: TITANIUM, borderWidth: 1, borderColor: LINE, borderRadius: 16, overflow: 'hidden', padding: 15, gap: 12 },"],
  ['setting row switch anchor', "  settingRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: LINE },", "  settingRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: LINE },"],
  ['24 icon frame', "  settingIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: 'rgba(115,240,207,0.07)', alignItems: 'center', justifyContent: 'center' },", "  settingIcon: { width: 24, height: 24, minWidth: 24, borderRadius: 8, overflow: 'hidden', backgroundColor: 'rgba(115,240,207,0.07)', alignItems: 'center', justifyContent: 'center' },"],
]);

console.log('Run #57 visual refinement applied with exact source replacements.');
