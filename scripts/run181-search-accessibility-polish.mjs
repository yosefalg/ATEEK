import fs from 'node:fs';

const file = 'src/screens/SearchScreen.tsx';
let s = fs.readFileSync(file, 'utf8');

const replace = (from, to, label) => {
  if (!s.includes(from)) throw new Error(`Run181 search anchor missing: ${label}`);
  s = s.replace(from, to);
};

replace(
  '      {!isUsernameQuery&&<Text accessibilityRole="text" accessibilityLabel={`عدد نتائج البحث ${filtered.length}`} style={[styles.resultCount,{color:colors.muted}]}>{filtered.length} نتيجة</Text>}',
  '      {!isUsernameQuery&&<Text accessibilityRole="text" accessibilityLiveRegion="polite" accessibilityLabel={`عدد نتائج البحث ${filtered.length}`} style={[styles.resultCount,{color:colors.muted}]}>{filtered.length} نتيجة</Text>}',
  'result count live region',
);

replace(
  'sortChip:{minHeight:38,',
  'sortChip:{minHeight:44,',
  'sort touch target',
);

replace(
  'historyChip:{minHeight:38,',
  'historyChip:{minHeight:44,',
  'history touch target',
);

replace(
  'chip:{paddingHorizontal:16,height:38,',
  'chip:{paddingHorizontal:16,minHeight:44,',
  'category touch target',
);

fs.writeFileSync(file, s);

for (const needle of [
  'accessibilityLiveRegion="polite" accessibilityLabel={`عدد نتائج البحث ${filtered.length}`}',
  'sortChip:{minHeight:44,',
  'historyChip:{minHeight:44,',
  'chip:{paddingHorizontal:16,minHeight:44,',
]) {
  if (!s.includes(needle)) throw new Error(`Run181 search contract missing: ${needle}`);
}

console.log('Run #181 search accessibility polish applied: live result announcements and larger touch targets.');
