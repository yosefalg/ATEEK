import fs from 'node:fs';

const dmFile = 'src/components/SpatialDealScreens.tsx';
let dm = fs.readFileSync(dmFile, 'utf8');
const replace = (from, to, label) => {
  if (!dm.includes(from)) throw new Error(`Run191 anchor missing: ${label}`);
  dm = dm.replace(from, to);
};

// Use the real window width already available in this component file to keep
// DM content readable on compact phones and centered on tablets/large screens.
replace(
  `export function SpatialDMHub({ m, thread, setThread }: { m: Cloud; thread: string | null; setThread: (id: string | null) => void }) {\n  const [body, setBody] = useState('');`,
  `export function SpatialDMHub({ m, thread, setThread }: { m: Cloud; thread: string | null; setThread: (id: string | null) => void }) {\n  const { width } = useWindowDimensions();\n  const compact = width < 380;\n  const contentWidth = Math.min(width, 720);\n  const [body, setBody] = useState('');`,
  'responsive DM dimensions',
);
replace(
  `<View style={styles.dmHeader}>`,
  `<View style={[styles.dmHeader, { width: contentWidth, alignSelf: 'center', paddingHorizontal: compact ? 10 : 14 }]}>`,
  'responsive DM header',
);
replace(
  `style={styles.messagesList}\n        contentContainerStyle={styles.messagesContent}`,
  `style={[styles.messagesList, { width: contentWidth, alignSelf: 'center' }]}\n        contentContainerStyle={[styles.messagesContent, { paddingHorizontal: compact ? 10 : 16 }]}`,
  'responsive message list',
);
replace(
  `<View style={styles.composer}>`,
  `<View style={[styles.composer, { width: contentWidth, alignSelf: 'center', paddingHorizontal: compact ? 8 : 12 }]}>`,
  'responsive composer',
);

// Modernize the primitive black/teal palette without touching backend state.
const palette = new Map([
  [`const OBSIDIAN = '#090A0F';`, `const OBSIDIAN = '#101827';`],
  [`const TITANIUM = '#151922';`, `const TITANIUM = '#182235';`],
  [`const LINE = '#2B313D';`, `const LINE = '#34435B';`],
  [`const INK = '#F6F8FB';`, `const INK = '#F8FAFC';`],
  [`const MUTED = '#8A94A6';`, `const MUTED = '#A7B2C4';`],
  [`const CYAN = '#73F0CF';`, `const CYAN = '#5EEAD4';`],
  [`const GOLD = '#E2B469';`, `const GOLD = '#F4C76B';`],
]);
for (const [from, to] of palette) replace(from, to, `palette ${from}`);

// Ensure the real profile target is comfortably tappable and communicates interaction.
replace(
  `style={styles.dmIdentity}>`,
  `style={[styles.dmIdentity, { minHeight: 48, justifyContent: 'center' }]} android_ripple={{ color: 'rgba(94,234,212,0.10)' }}>`,
  'profile interaction polish',
);

fs.writeFileSync(dmFile, dm);

for (const needle of [
  `const { width } = useWindowDimensions();`,
  `const contentWidth = Math.min(width, 720);`,
  `paddingHorizontal: compact ? 10 : 16`,
  `width: contentWidth, alignSelf: 'center'`,
  `android_ripple={{ color: 'rgba(94,234,212,0.10)' }}`,
  `const OBSIDIAN = '#101827';`,
]) {
  if (!dm.includes(needle)) throw new Error(`Run191 postcondition missing: ${needle}`);
}
console.log('Run #191 applied: responsive DM sizing, keyboard-safe composer layout, modern palette and profile interaction polish.');
