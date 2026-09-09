import fs from 'node:fs';

const file = 'src/components/SpatialDealScreens.tsx';
let s = fs.readFileSync(file, 'utf8');

const replace = (from, to, label) => {
  if (!s.includes(from)) throw new Error(`Run177 chat visual anchor missing: ${label}`);
  s = s.replace(from, to);
};

const replacements = [
  ["  chatSafetyText: { flex: 1, color: '#A8B7B2', fontSize: 9, lineHeight: 15, textAlign: 'right' },", "  chatSafetyText: { flex: 1, color: '#B8C7C2', fontSize: 11, lineHeight: 17, textAlign: 'right' },", 'safety text readability'],
  ["  dealToolsButton: { minHeight: 42, alignSelf: 'flex-end', borderRadius: 14, borderWidth: 1, borderColor: '#2D4E48', backgroundColor: '#101A19', paddingHorizontal: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 7 },", "  dealToolsButton: { minHeight: 46, alignSelf: 'stretch', borderRadius: 16, borderWidth: 1, borderColor: '#315A52', backgroundColor: '#101C1A', paddingHorizontal: 14, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 },", 'negotiation touch target'],
  ["  dealToolsText: { color: '#D7EEE7', fontSize: 10, fontWeight: '900' },", "  dealToolsText: { color: '#E2F4EF', fontSize: 12, fontWeight: '900' },", 'negotiation label readability'],
  ["  dealCount: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: CYAN, alignItems: 'center', justifyContent: 'center' },", "  dealCount: { minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 7, backgroundColor: CYAN, alignItems: 'center', justifyContent: 'center' },", 'offer count badge'],
  ["  dealCountText: { color: OBSIDIAN, fontSize: 9, fontWeight: '900' },", "  dealCountText: { color: OBSIDIAN, fontSize: 11, fontWeight: '900' },", 'offer count text'],
  ["  offerSheet: { maxHeight: '76%', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: '#343D49', backgroundColor: '#0F1219', padding: 14, paddingBottom: Platform.OS === 'ios' ? 30 : 18 },", "  offerSheet: { maxHeight: '82%', borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 1, borderColor: '#3A4452', backgroundColor: '#0C1017', padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 20 },", 'sheet visual hierarchy'],
  ["  offerSheetTitle: { color: INK, fontSize: 18, fontWeight: '900', textAlign: 'right' },", "  offerSheetTitle: { color: INK, fontSize: 20, fontWeight: '900', textAlign: 'right' },", 'sheet title'],
  ["  offerSheetSub: { color: MUTED, fontSize: 9, lineHeight: 15, textAlign: 'right', marginTop: 3 },", "  offerSheetSub: { color: '#9AA5B5', fontSize: 11, lineHeight: 17, textAlign: 'right', marginTop: 4 },", 'sheet subtitle'],
  ["  offerInput: { flex: 1, height: 48, borderRadius: 15, borderWidth: 1, borderColor: LINE, backgroundColor: '#11151D', color: INK, paddingHorizontal: 12, textAlign: 'right' },", "  offerInput: { flex: 1, height: 50, borderRadius: 16, borderWidth: 1, borderColor: '#394250', backgroundColor: '#11161F', color: INK, paddingHorizontal: 14, textAlign: 'right', fontSize: 14 },", 'offer input readability'],
  ["  offerButton: { height: 48, borderRadius: 15, paddingHorizontal: 14, backgroundColor: CYAN, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6 },", "  offerButton: { minHeight: 50, borderRadius: 16, paddingHorizontal: 16, backgroundColor: CYAN, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7 },", 'offer button target'],
  ["  offerButtonText: { color: OBSIDIAN, fontWeight: '900', fontSize: 11 },", "  offerButtonText: { color: OBSIDIAN, fontWeight: '900', fontSize: 12 },", 'offer button text'],
  ["  offerEmptyTitle: { color: INK, fontSize: 13, fontWeight: '900', marginTop: 6 },", "  offerEmptyTitle: { color: INK, fontSize: 14, fontWeight: '900', marginTop: 7 },", 'empty title'],
  ["  offerEmptyText: { color: MUTED, fontSize: 9, marginTop: 3 },", "  offerEmptyText: { color: '#9AA5B5', fontSize: 11, lineHeight: 17, marginTop: 4, textAlign: 'center' },", 'empty text'],
  ["  offerCard: { borderRadius: 15, borderWidth: 1, borderColor: LINE, backgroundColor: '#11151D', padding: 10, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },", "  offerCard: { borderRadius: 16, borderWidth: 1, borderColor: '#343D49', backgroundColor: '#11161F', padding: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },", 'offer card spacing'],
  ["  offerValue: { color: GOLD, fontWeight: '900', fontSize: 13, textAlign: 'right' },", "  offerValue: { color: GOLD, fontWeight: '900', fontSize: 14, textAlign: 'right' },", 'offer amount readability'],
  ["  offerStatus: { color: MUTED, fontSize: 9, textAlign: 'right', marginTop: 2 },", "  offerStatus: { color: '#9AA5B5', fontSize: 11, lineHeight: 16, textAlign: 'right', marginTop: 3 },", 'offer status readability'],
  ["  miniAccept: { borderRadius: 10, backgroundColor: CYAN, paddingHorizontal: 10, paddingVertical: 7 },", "  miniAccept: { minHeight: 38, borderRadius: 11, backgroundColor: CYAN, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },", 'accept target'],
  ["  miniAcceptText: { color: OBSIDIAN, fontSize: 9, fontWeight: '900' },", "  miniAcceptText: { color: OBSIDIAN, fontSize: 11, fontWeight: '900' },", 'accept text'],
  ["  miniReject: { borderRadius: 10, borderWidth: 1, borderColor: '#66303A', paddingHorizontal: 10, paddingVertical: 7 },", "  miniReject: { minHeight: 38, borderRadius: 11, borderWidth: 1, borderColor: '#713641', paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },", 'reject target'],
  ["  miniRejectText: { color: DANGER, fontSize: 9, fontWeight: '900' },", "  miniRejectText: { color: DANGER, fontSize: 11, fontWeight: '900' },", 'reject text'],
  ["  completeButton: { borderRadius: 10, backgroundColor: GOLD, paddingHorizontal: 10, paddingVertical: 8 },", "  completeButton: { minHeight: 40, borderRadius: 11, backgroundColor: GOLD, paddingHorizontal: 12, paddingVertical: 9, alignItems: 'center', justifyContent: 'center' },", 'complete target'],
  ["  completeButtonText: { color: OBSIDIAN, fontSize: 9, fontWeight: '900' },", "  completeButtonText: { color: OBSIDIAN, fontSize: 11, fontWeight: '900' },", 'complete text'],
];

for (const [from, to, label] of replacements) replace(from, to, label);

fs.writeFileSync(file, s);
console.log('Run #177 chat visual/accessibility polish applied: larger readable type, stronger hierarchy, and safer touch targets without changing deal semantics.');
