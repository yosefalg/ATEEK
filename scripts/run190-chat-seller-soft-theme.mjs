import fs from 'node:fs';

const replace = (source, from, to, label) => {
  if (!source.includes(from)) throw new Error(`Run190 anchor missing: ${label}`);
  return source.replace(from, to);
};

// Android already uses adjustResize in the native production hardening. Using
// KeyboardAvoidingView height on top of adjustResize double-resizes the DM and
// can push the composer away from the keyboard. Keep KAV padding on iOS only.
const dmFile = 'src/components/SpatialDealScreens.tsx';
let dm = fs.readFileSync(dmFile, 'utf8');
dm = replace(
  dm,
  `<KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>`,
  `<KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>`,
  'DM double keyboard resize',
);
dm = replace(
  dm,
  `<KeyboardAvoidingView style={styles.offerSheetBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>`,
  `<KeyboardAvoidingView style={styles.offerSheetBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>`,
  'offer sheet double keyboard resize',
);
dm = replace(
  dm,
  `        keyboardShouldPersistTaps="handled"\n        renderItem={({ item }) => {`,
  `        keyboardShouldPersistTaps="handled"\n        keyboardDismissMode="on-drag"\n        renderItem={({ item }) => {`,
  'message list keyboard dismissal',
);
dm = replace(
  dm,
  `<View style={styles.dmIdentity}>`,
  `<Pressable accessibilityRole="button" accessibilityLabel={\`فتح بروفايل \${counterpart?.name ?? 'المستخدم'}\`} disabled={!counterpartId} onPress={() => counterpartId && openSpatialProfile(counterpartId)} style={styles.dmIdentity}>`,
  'counterpart profile action',
);
dm = replace(dm, `</View>\n      </View>\n\n      {listing ? (`, `</Pressable>\n      </View>\n\n      {listing ? (`, 'counterpart profile close');
fs.writeFileSync(dmFile, dm);

// The legacy listing modal is still reachable from existing routes. Make its
// seller card navigate to the same real spatial profile used elsewhere.
const listingFile = 'src/screens/ListingDetails.tsx';
let listing = fs.readFileSync(listingFile, 'utf8');
listing = replace(
  listing,
  `import { Listing } from '../types';`,
  `import { Listing } from '../types';\nimport { openSpatialProfile } from '../social/spatialSocialBus';`,
  'listing seller profile import',
);
listing = replace(
  listing,
  `<View style={styles.seller} accessible accessibilityLabel={\`${'${item.seller}'}، ${'${item.verified ? \'بائع موثق\' : \'لم يُتحقق من هوية البائع\''}'}\`}>`,
  `<Pressable style={styles.seller} accessibilityRole="button" accessibilityLabel={\`${'${item.seller}'}، فتح بروفايل البائع\`} accessibilityHint="يعرض بروفايل البائع وتقييماته وإعلاناته" disabled={!item.sellerId} onPress={() => item.sellerId && openSpatialProfile(item.sellerId)}>`,
  'legacy seller card action',
);
listing = replace(
  listing,
  `</View>\n      <Text style={styles.heading}>قدّم عرضك</Text>`,
  `</Pressable>\n      <Text style={styles.heading}>قدّم عرضك</Text>`,
  'legacy seller card close',
);
fs.writeFileSync(listingFile, listing);

for (const [file, needles] of [
  [dmFile, [
    `behavior={Platform.OS === 'ios' ? 'padding' : undefined}`,
    `keyboardDismissMode="on-drag"`,
    `openSpatialProfile(counterpartId)`,
  ]],
  [listingFile, [
    `openSpatialProfile(item.sellerId)`,
    `accessibilityHint="يعرض بروفايل البائع وتقييماته وإعلاناته"`,
  ]],
]) {
  const source = fs.readFileSync(file, 'utf8');
  for (const needle of needles) if (!source.includes(needle)) throw new Error(`Run190 postcondition missing in ${file}: ${needle}`);
}

console.log('Run #190 applied: Android chat keyboard stabilized and seller profiles made directly reachable.');
