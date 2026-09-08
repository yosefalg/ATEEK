import fs from 'node:fs';

const file='src/components/SpatialDealScreens.tsx';
let s=fs.readFileSync(file,'utf8');
const replace=(from,to,label)=>{if(!s.includes(from))throw new Error(`Run90 chat media anchor missing: ${label}`);s=s.replace(from,to)};

replace(
  "import * as Location from 'expo-location';",
  "import * as Location from 'expo-location';\nimport * as ImagePicker from 'expo-image-picker';\nimport * as ImageManipulator from 'expo-image-manipulator';\nimport * as FileSystem from 'expo-file-system/legacy';\nimport { decode } from 'base64-arraybuffer';",
  'chat media imports',
);

replace(
  "type AnyRow = Record<string, any>;",
  "type AnyRow = Record<string, any>;\nconst IMAGE_MESSAGE_PREFIX='[[ateek-image:';\nconst encodeImageMessage=(url:string)=>`${IMAGE_MESSAGE_PREFIX}${url}]]`;\nfunction parseImageMessage(body:unknown){const text=String(body??'');if(!text.startsWith(IMAGE_MESSAGE_PREFIX)||!text.endsWith(']]'))return null;const url=text.slice(IMAGE_MESSAGE_PREFIX.length,-2);const prefix=supabase.storage.from('ateek-images').getPublicUrl('').data.publicUrl;return url.startsWith(prefix)?url:null;}",
  'image message codec',
);

replace(
  "  const [typing, setTyping] = useState(false);",
  "  const [typing, setTyping] = useState(false);\n  const [mediaBusy, setMediaBusy] = useState(false);",
  'media busy state',
);

replace(
  "  const sendOffer = () => {",
  "  const sendImage = async () => {\n    if (!thread || busy || mediaBusy) return;\n    setMediaBusy(true);\n    try {\n      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();\n      if (!permission.granted) {\n        Alert.alert('صلاحية الصور مطلوبة', 'اسمح لعتيك بالوصول إلى الصور حتى تتمكن من إرسال صورة داخل المحادثة.');\n        return;\n      }\n      const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });\n      if (picked.canceled || !picked.assets?.[0]?.uri) return;\n      const compressed = await ImageManipulator.manipulateAsync(picked.assets[0].uri, [{ resize: { width: 1600 } }], { compress: 0.76, format: ImageManipulator.SaveFormat.JPEG });\n      const base64 = await FileSystem.readAsStringAsync(compressed.uri, { encoding: FileSystem.EncodingType.Base64 });\n      const objectPath = `${m.user.id}/chat/${thread}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;\n      const { error: uploadError } = await supabase.storage.from('ateek-images').upload(objectPath, decode(base64), { contentType: 'image/jpeg', upsert: false });\n      if (uploadError) throw uploadError;\n      const publicUrl = supabase.storage.from('ateek-images').getPublicUrl(objectPath).data.publicUrl;\n      await m.mutate('message', { thread_id: thread, body: encodeImageMessage(publicUrl) });\n      haptics.success();\n    } catch (error: unknown) {\n      const message = error instanceof Error ? error.message : String(error);\n      Alert.alert('تعذر إرسال الصورة', message || 'حاول مرة أخرى.');\n    } finally {\n      setMediaBusy(false);\n    }\n  };\n\n  const sendOffer = () => {",
  'send image action',
);

replace(
  "<Text numberOfLines={1} style={styles.threadPreview}>{last?.body ?? itemListing?.title ?? 'محادثة عتيك'}</Text>",
  "<Text numberOfLines={1} style={styles.threadPreview}>{parseImageMessage(last?.body) ? '📷 صورة' : (last?.body ?? itemListing?.title ?? 'محادثة عتيك')}</Text>",
  'thread image preview',
);

replace(
  "          const stateIcon = item.read_at ? 'checkmark-done' : item.delivered_at ? 'checkmark-done' : 'checkmark';",
  "          const stateIcon = item.read_at ? 'checkmark-done' : item.delivered_at ? 'checkmark-done' : 'checkmark';\n          const mediaUrl = parseImageMessage(item.body);",
  'message media parse',
);

replace(
  "              <Text style={styles.bubbleText}>{item.body}</Text>",
  "              {mediaUrl ? <Image source={{ uri: mediaUrl }} style={styles.messageImage} resizeMode=\"cover\" accessibilityLabel=\"صورة داخل المحادثة\" /> : <Text style={styles.bubbleText}>{item.body}</Text>}",
  'message media render',
);

replace(
  "        <Pressable accessibilityRole=\"button\" accessibilityLabel=\"المرفقات غير مفعلة لهذه المحادثة\" disabled style={styles.composerIconDisabled}>\n          <Ionicons name=\"add\" size={23} color=\"#566071\" />\n        </Pressable>",
  "        <Pressable accessibilityRole=\"button\" accessibilityLabel=\"إرسال صورة\" disabled={busy || mediaBusy} onPress={() => void sendImage()} style={[styles.composerIconDisabled, (busy || mediaBusy) && styles.disabled]}>\n          <Ionicons name={mediaBusy ? \"hourglass-outline\" : \"image-outline\"} size={22} color={mediaBusy ? \"#8A94A6\" : CYAN} />\n        </Pressable>",
  'enable image attachment button',
);

replace(
  "  bubbleText: { color: INK, fontSize: 14, lineHeight: 22, textAlign: 'right' },",
  "  bubbleText: { color: INK, fontSize: 14, lineHeight: 22, textAlign: 'right' },\n  messageImage: { width: 220, height: 220, maxWidth: '100%', borderRadius: 15, backgroundColor: TITANIUM },",
  'message image style',
);

fs.writeFileSync(file,s);
console.log('Run #90 chat media transform applied: authenticated Supabase image upload + real in-thread rendering.');
