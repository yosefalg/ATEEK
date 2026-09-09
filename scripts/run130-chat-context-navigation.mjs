import fs from 'node:fs';

const dmFile = 'src/components/SpatialDealScreens.tsx';
let dm = fs.readFileSync(dmFile, 'utf8');
const replace = (from, to, label) => {
  if (!dm.includes(from)) throw new Error(`Run130 chat anchor missing: ${label}`);
  dm = dm.replace(from, to);
};

replace(
  "export function SpatialDMHub({ m, thread, setThread }: { m: Cloud; thread: string | null; setThread: (id: string | null) => void }) {",
  "export function SpatialDMHub({ m, thread, setThread, onOpenListing }: { m: Cloud; thread: string | null; setThread: (id: string | null) => void; onOpenListing: (item: Listing) => void }) {",
  'DM listing navigation callback',
);

replace(
  "  const threadMessages = useMemo(\n    () => m.messages.filter((x) => x.thread_id === thread),\n    [m.messages, thread],\n  );",
  "  const threadMessages = useMemo(\n    () => m.messages.filter((x) => x.thread_id === thread),\n    [m.messages, thread],\n  );\n  const listingById = useMemo(() => new Map(m.listings.map((item) => [item.id, item] as const)), [m.listings]);\n  const profileById = useMemo(() => new Map(m.profiles.map((item) => [item.id, item] as const)), [m.profiles]);\n  const latestMessageByThread = useMemo(() => {\n    const map = new Map<string, (typeof m.messages)[number]>();\n    for (const message of m.messages) map.set(message.thread_id, message);\n    return map;\n  }, [m.messages]);",
  'memoized chat indexes',
);

replace(
  "          const itemListing = m.listings.find((x) => x.id === item.listing_id);\n          const otherId = item.buyer_id === m.user.id ? item.seller_id : item.buyer_id;\n          const other = m.profiles.find((x) => x.id === otherId);\n          const last = [...m.messages].reverse().find((x) => x.thread_id === item.id);",
  "          const itemListing = listingById.get(item.listing_id);\n          const otherId = item.buyer_id === m.user.id ? item.seller_id : item.buyer_id;\n          const other = profileById.get(otherId);\n          const last = latestMessageByThread.get(item.id);",
  'indexed conversation list lookups',
);

replace(
  "          onPress={() => haptics.light()}\n          style={styles.contextBanner}",
  "          onPress={() => { haptics.light(); onOpenListing(listing); }}\n          style={styles.contextBanner}",
  'open linked listing',
);

fs.writeFileSync(dmFile, dm);

const appFile = 'src/cloud/OnlineApp.tsx';
let app = fs.readFileSync(appFile, 'utf8');
const oldHub = '<SpatialDMHub m={m} thread={thread} setThread={setThread}/>';
const newHub = '<SpatialDMHub m={m} thread={thread} setThread={setThread} onOpenListing={setSelected}/>';
if (!app.includes(oldHub)) throw new Error('Run130 OnlineApp anchor missing: SpatialDMHub invocation');
app = app.replace(oldHub, newHub);
fs.writeFileSync(appFile, app);

console.log('Run #130 chat hardening applied: linked-listing navigation and indexed conversation lookups.');
