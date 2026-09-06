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

function mergeStyleBody(body, overrides) {
  const keys = Object.keys(overrides);
  let clean = body;
  for (const key of keys) {
    clean = clean.replace(new RegExp(`(?:^|,)\\s*${key}\\s*:\\s*[^,}]+`, 'g'), '');
  }
  clean = clean.replace(/^\s*,|,\s*,/g, ',').replace(/^,|,$/g, '').trim();
  const additions = Object.entries(overrides).map(([k,v]) => `${k}:${v}`).join(',');
  return [clean, additions].filter(Boolean).join(',');
}

patch('src/components/SpatialReelsHub.tsx', [
  ['safe-area import', s => s.replace("import { VideoView,useVideoPlayer } from 'expo-video';", "import { VideoView,useVideoPlayer } from 'expo-video';\nimport { useSafeAreaInsets } from 'react-native-safe-area-context';")],
  ['safe-area hook', s => s.replace("export function SpatialReelsHub(){const{height}=useWindowDimensions();", "export function SpatialReelsHub(){const{height}=useWindowDimensions();const insets=useSafeAreaInsets();")],
  ['80 percent viewability', s => s.replace('itemVisiblePercentThreshold:70', 'itemVisiblePercentThreshold:80')],
  ['caption max two lines', s => s.replace('<Text style={s.caption}>{item.caption}</Text>', '<Text numberOfLines={2} ellipsizeMode="tail" style={s.caption}>{item.caption}</Text>')],
  ['deal tag safe bottom', s => s.replace('<View style={s.bottom}>', '<View style={[s.bottom,{bottom:insets.bottom+80}]}>')],
  ['52px action rail', s => s.replace(/rail:\{([^}]*)\}/, (_m, body) => `rail:{${mergeStyleBody(body,{width:'52',gap:'16',alignItems:"'center'"})}}`)],
]);

patch('src/components/SpatialDealScreens.tsx', [
  ['window height for keyboard offset', s => s.replace("export function SpatialDMHub({ m, thread, setThread }: { m: Cloud; thread: string | null; setThread: (id: string | null) => void }) {", "export function SpatialDMHub({ m, thread, setThread }: { m: Cloud; thread: string | null; setThread: (id: string | null) => void }) {\n  const { height: windowHeight } = useWindowDimensions();")],
  ['dynamic keyboard docking', s => s.replace("<KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>", "<KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Math.max(12, Math.min(72, Math.round(windowHeight * 0.04)))}>")],
  ['bubble max width', s => s.replace(/bubble:\s*\{([^}]*)\}/, (_m, body) => `bubble: {${mergeStyleBody(body,{maxWidth:"'78%'"})}}`)],
  ['reference card fixed height', s => s.replace(/contextBanner:\s*\{([^}]*)\}/, (_m, body) => `contextBanner: {${mergeStyleBody(body,{height:'56',minHeight:'56',maxHeight:'56',overflow:"'hidden'"})}}`)],
  ['message list top anchor', s => s.replace(/messagesContent:\s*\{([^}]*)\}/, (_m, body) => `messagesContent: {${mergeStyleBody(body,{paddingTop:'64'})}}`)],
]);

patch('src/components/SpatialProfileAnalyticsHub.tsx', [
  ['standard page padding', s => s.replace(/page:\s*\{([^}]*)\}/, (_m, body) => `page: {${mergeStyleBody(body,{paddingHorizontal:'16',gap:'12'})}}`)],
  ['metric glass clipping', s => s.replace(/metric:\s*\{([^}]*)\}/, (_m, body) => `metric: {${mergeStyleBody(body,{borderRadius:'16',overflow:"'hidden'"})}}`)],
  ['panel glass clipping', s => s.replace(/panel:\s*\{([^}]*)\}/, (_m, body) => `panel: {${mergeStyleBody(body,{borderRadius:'16',overflow:"'hidden'"})}}`)],
  ['24 icon frame', s => s.replace(/settingIcon:\s*\{([^}]*)\}/, (_m, body) => `settingIcon: {${mergeStyleBody(body,{width:'24',height:'24',minWidth:'24',alignItems:"'center'",justifyContent:"'center'"})}}`)],
  ['setting row switch anchor', s => s.replace(/settingRow:\s*\{([^}]*)\}/, (_m, body) => `settingRow: {${mergeStyleBody(body,{alignItems:"'center'",justifyContent:"'space-between'"})}}`)],
]);

console.log('Run #57 visual refinement applied deterministically without duplicate style keys.');
