import fs from 'node:fs';

const file = 'src/components/SpatialDealScreens.tsx';
let s = fs.readFileSync(file, 'utf8');

const replace = (from, to, label) => {
  if (!s.includes(from)) throw new Error(`Run178 listing accessibility anchor missing: ${label}`);
  s = s.replace(from, to);
};

replace(
  '<Pressable\n          style={StyleSheet.absoluteFill}\n          onPressIn={() => { tilt.value = withSpring(0.6); }}',
  '<Pressable\n          accessibilityRole="button"\n          accessibilityLabel="تكبير صورة الإعلان"\n          style={StyleSheet.absoluteFill}\n          onPressIn={() => { tilt.value = withSpring(0.6); }}',
  'listing image zoom action',
);

replace(
  '<Pressable accessibilityLabel="إغلاق الصورة" onPress={() => setZoom(false)} style={styles.zoomClose}>',
  '<Pressable accessibilityRole="button" accessibilityLabel="إغلاق الصورة" onPress={() => setZoom(false)} style={styles.zoomClose}>',
  'zoom close role',
);

replace(
  '<Pressable accessibilityLabel="رجوع" onPress={() => { haptics.light(); close(); }} style={styles.headerIcon}>',
  '<Pressable accessibilityRole="button" accessibilityLabel="رجوع" onPress={() => { haptics.light(); close(); }} style={styles.headerIcon}>',
  'listing back role',
);

replace(
  '<Text style={styles.eyebrow}>SPATIAL LISTING</Text>',
  '<Text style={styles.eyebrow}>إعلان عتيك</Text>',
  'localized listing eyebrow',
);

replace(
  '          <Pressable\n            accessibilityLabel={m.favorites.includes(item.id) ? \'إزالة من المفضلة\' : \'إضافة إلى المفضلة\'}\n            onPress={() => { haptics.tap(); void m.mutate(\'favorite\', { id: item.id, saved: !m.favorites.includes(item.id) }); }}',
  '          <Pressable\n            accessibilityRole="button"\n            accessibilityLabel={m.favorites.includes(item.id) ? \'إزالة من المفضلة\' : \'إضافة إلى المفضلة\'}\n            accessibilityState={{ selected: m.favorites.includes(item.id) }}\n            onPress={() => { haptics.tap(); void m.mutate(\'favorite\', { id: item.id, saved: !m.favorites.includes(item.id) }); }}',
  'favorite selected semantics',
);

fs.writeFileSync(file, s);
console.log('Run #178 listing accessibility polish applied: localized listing identity and explicit accessible action semantics without changing listing behavior.');
