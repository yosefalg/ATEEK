import fs from 'node:fs';

const file='src/components/SpatialProfileAnalyticsHub.tsx';
let s=fs.readFileSync(file,'utf8');
const replace=(from,to,label)=>{if(!s.includes(from))throw new Error(`Run91 profile anchor missing: ${label}`);s=s.replace(from,to)};

replace(
  "  const [saveBusy, setSaveBusy] = useState(false);",
  "  const [saveBusy, setSaveBusy] = useState(false);\n  const [avatarBusy, setAvatarBusy] = useState(false);",
  'avatar busy state',
);

replace(
  "  const pickCover = async () => {",
  "  const pickAvatar = async () => {\n    if (avatarBusy) return;\n    setAvatarBusy(true);\n    try {\n      const path = await pickAndUpload(m.user.id, 'avatar');\n      if (!path) return;\n      const avatarUrl = supabase.storage.from('ateek-images').getPublicUrl(path).data.publicUrl;\n      const { error } = await supabase.rpc('ateek_profile_social_update', { p_bio: null, p_avatar_url: avatarUrl, p_cover_url: null });\n      if (error) throw error;\n      haptics.success();\n      await m.refresh();\n    } catch (error: unknown) {\n      const message = error instanceof Error ? error.message : String(error);\n      Alert.alert('تعذر تحديث الصورة الشخصية', message || 'حاول مرة أخرى.');\n    } finally {\n      setAvatarBusy(false);\n    }\n  };\n\n  const pickCover = async () => {",
  'avatar upload action',
);

replace(
  "<View style={s.heroTop}><Text style={s.eyebrow}>ATEEK SOCIAL COMMAND CENTER</Text><Text style={s.version}>1.9.0 • #12</Text></View>",
  "<View style={s.heroTop}><Text style={s.eyebrow}>ATEEK SOCIAL COMMAND CENTER</Text><Text style={s.version}>ATEEK {BUILD_INFO.versionName} • #{BUILD_INFO.versionCode}</Text></View>",
  'truthful build identity',
);

replace(
  "<Text style={s.label}>الغلاف</Text>{coverUrl ? <Image source={{ uri: coverUrl }} style={s.coverPreview} /> : null}",
  "<Text style={s.label}>الصورة الشخصية</Text><View style={s.profilePhotoEditor}><Avatar uri={profile?.avatar_url} size={76} /><Pressable accessibilityRole=\"button\" accessibilityLabel=\"تغيير الصورة الشخصية\" disabled={avatarBusy} onPress={() => void pickAvatar()} style={[s.secondaryAction, avatarBusy && s.disabled]}>{avatarBusy ? <ActivityIndicator color={CYAN} /> : <><Ionicons name=\"camera-outline\" size={18} color={CYAN} /><Text style={s.secondaryText}>تغيير الصورة الشخصية</Text></>}</Pressable></View><Text style={s.label}>الغلاف</Text>{coverUrl ? <Image source={{ uri: coverUrl }} style={s.coverPreview} /> : null}",
  'profile avatar editor',
);

replace(
  "  coverPreview: { width: '100%', height: 150, borderRadius: 18, backgroundColor: BG },",
  "  coverPreview: { width: '100%', height: 150, borderRadius: 18, backgroundColor: BG },\n  profilePhotoEditor: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, flexWrap: 'wrap' },",
  'profile avatar editor style',
);

fs.writeFileSync(file,s);
console.log('Run #91 profile polish applied: real avatar upload via existing Supabase RPC and truthful build identity.');
