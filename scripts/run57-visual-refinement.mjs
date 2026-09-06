import fs from 'node:fs';

function patch(path, transforms) {
  let src = fs.readFileSync(path, 'utf8');
  for (const [label, fn] of transforms) {
    const before = src;
    src = fn(src);
    if (src === before) throw new Error(`Run57 patch failed: ${label} in ${path}`);
  }
  fs.writeFileSync(path, src);
}

function setStyleProps(source, styleName, overrides) {
  const re = new RegExp(`(${styleName}\\s*:\\s*\\{)([^{}]*)(\\})`);
  const m = source.match(re);
  if (!m) throw new Error(`Run57 style not found: ${styleName}`);
  let body = m[2];
  for (const [key, value] of Object.entries(overrides)) {
    const propRe = new RegExp(`\\b${key}\\s*:\\s*(?:'[^']*'|\"[^\"]*\"|[^,}]+)\\s*,?`, 'g');
    body = body.replace(propRe, '');
    body = body.replace(/,\s*,/g, ',').replace(/^\s*,|,\s*$/g, '').trim();
    body = body ? `${body}, ${key}: ${value}` : `${key}: ${value}`;
  }
  return source.replace(re, `$1${body}$3`);
}

function assertSingleStyleProp(path, styleName, key) {
  const src = fs.readFileSync(path, 'utf8');
  const re = new RegExp(`${styleName}\\s*:\\s*\\{([^{}]*)\\}`);
  const m = src.match(re);
  if (!m) throw new Error(`Run57 assertion style not found: ${styleName} in ${path}`);
  const propRe = new RegExp(`\\b${key}\\s*:`, 'g');
  const count = (m[1].match(propRe) || []).length;
  if (count !== 1) throw new Error(`Run57 duplicate/missing style property: ${styleName}.${key} count=${count}`);
}

patch('src/components/SpatialReelsHub.tsx', [
  ['safe-area import', s => s.replace("import { VideoView,useVideoPlayer } from 'expo-video';", "import { VideoView,useVideoPlayer } from 'expo-video';\nimport { useSafeAreaInsets } from 'react-native-safe-area-context';")],
  ['safe-area hook', s => s.replace("export function SpatialReelsHub(){const{height}=useWindowDimensions();", "export function SpatialReelsHub(){const{height}=useWindowDimensions();const insets=useSafeAreaInsets();")],
  ['80 percent viewability', s => s.replace('itemVisiblePercentThreshold:70', 'itemVisiblePercentThreshold:80')],
  ['caption max two lines', s => s.replace('<Text style={s.caption}>{item.caption}</Text>', '<Text numberOfLines={2} ellipsizeMode="tail" style={s.caption}>{item.caption}</Text>')],
  ['deal tag safe bottom', s => s.replace('<View style={s.bottom}>', '<View style={[s.bottom,{bottom:insets.bottom+80}]}>')],
  ['52px action rail', s => setStyleProps(s, 'rail', { width: '52', gap: '16', alignItems: "'center'" })],
]);

patch('src/components/SpatialDealScreens.tsx', [
  ['window height for keyboard offset', s => s.replace("export function SpatialDMHub({ m, thread, setThread }: { m: Cloud; thread: string | null; setThread: (id: string | null) => void }) {", "export function SpatialDMHub({ m, thread, setThread }: { m: Cloud; thread: string | null; setThread: (id: string | null) => void }) {\n  const { height: windowHeight } = useWindowDimensions();")],
  ['dynamic keyboard docking', s => s.replace("<KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>", "<KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Math.max(12, Math.min(72, Math.round(windowHeight * 0.04)))}>")],
  ['bubble max width', s => setStyleProps(s, 'bubble', { maxWidth: "'78%'" })],
  ['reference card fixed height', s => setStyleProps(s, 'contextBanner', { height: '56', minHeight: '56', maxHeight: '56', overflow: "'hidden'" })],
  ['message list top anchor', s => setStyleProps(s, 'messagesContent', { paddingTop: '64' })],
]);

patch('src/components/SpatialProfileAnalyticsHub.tsx', [
  ['standard page padding', s => setStyleProps(s, 'page', { paddingHorizontal: '16', gap: '12' })],
  ['metric glass clipping', s => setStyleProps(s, 'metric', { borderRadius: '16', overflow: "'hidden'" })],
  ['panel glass clipping', s => setStyleProps(s, 'panel', { borderRadius: '16', overflow: "'hidden'" })],
  ['24 icon frame', s => setStyleProps(s, 'settingIcon', { width: '24', height: '24', minWidth: '24', alignItems: "'center'", justifyContent: "'center'" })],
  ['setting row switch anchor', s => setStyleProps(s, 'settingRow', { alignItems: "'center'", justifyContent: "'space-between'" })],
]);

for (const [path, style, keys] of [
  ['src/components/SpatialReelsHub.tsx', 'rail', ['width','gap','alignItems']],
  ['src/components/SpatialDealScreens.tsx', 'bubble', ['maxWidth']],
  ['src/components/SpatialDealScreens.tsx', 'contextBanner', ['height','minHeight','maxHeight','overflow']],
  ['src/components/SpatialDealScreens.tsx', 'messagesContent', ['paddingTop']],
  ['src/components/SpatialProfileAnalyticsHub.tsx', 'page', ['paddingHorizontal','gap']],
  ['src/components/SpatialProfileAnalyticsHub.tsx', 'metric', ['borderRadius','overflow']],
  ['src/components/SpatialProfileAnalyticsHub.tsx', 'panel', ['borderRadius','overflow']],
  ['src/components/SpatialProfileAnalyticsHub.tsx', 'settingIcon', ['width','height','minWidth','alignItems','justifyContent']],
  ['src/components/SpatialProfileAnalyticsHub.tsx', 'settingRow', ['alignItems','justifyContent']],
]) {
  for (const key of keys) assertSingleStyleProp(path, style, key);
}

console.log('Run #57 visual refinement applied and duplicate style keys verified absent.');
