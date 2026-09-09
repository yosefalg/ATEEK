import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const transformScripts = fs.readdirSync('scripts')
  .filter((name) => /^run\d+.*\.mjs$/.test(name))
  .sort();
for (const name of transformScripts) {
  const result = spawnSync(process.execPath, ['--check', `scripts/${name}`], { encoding: 'utf8' });
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim();
    throw new Error(`Production transform syntax preflight failed for ${name}${detail ? `:\n${detail}` : ''}`);
  }
}
console.log(`Production transform syntax preflight passed (${transformScripts.length} scripts).`);

const file='src/components/SpatialReelsHub.tsx';
let s=fs.readFileSync(file,'utf8');
const replace=(from,to,label)=>{if(!s.includes(from))throw new Error(`Run77 transform anchor missing: ${label}`);s=s.replace(from,to)};
replace('initialNumToRender={2} maxToRenderPerBatch={2}','initialNumToRender={1} maxToRenderPerBatch={1}','single reel render batch');
const safeCall='<SafeReelVideo reel={item} active={active === item.id} nextReel={visualReels[index+1] ?? null} onSkip={()=>{if(index+1<visualReels.length)listRef.current?.scrollToIndex({index:index+1,animated:true})}} />';
replace(safeCall,'<SafeReelVideo reel={item} active={active === item.id} />','remove preloader/skip coupling');
fs.writeFileSync(file,s);

const dmFile='src/components/SpatialDealScreens.tsx';
let dm=fs.readFileSync(dmFile,'utf8');
const oldKeyboard='<KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === \'ios\' ? \'padding\' : undefined}>';
const newKeyboard='<KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === \'ios\' ? \'padding\' : \'height\'} keyboardVerticalOffset={0}>';
if(!dm.includes(oldKeyboard))throw new Error('Run77 transform anchor missing: Android DM keyboard avoidance');
dm=dm.replace(oldKeyboard,newKeyboard);
fs.writeFileSync(dmFile,dm);
console.log('Run #77 transform applied: reel memory discipline and Android chat keyboard avoidance.');

await import('./run90-chat-media-transform.mjs');
await import('./run91-profile-polish-transform.mjs');
await import('./run91-ai-navigation-polish.mjs');
await import('./run93-video-qa-fixes.mjs');
await import('./run95-data-refresh-hardening.mjs');
await import('./run96-notifications-ux.mjs');
await import('./run98-global-visual-system.mjs');
await import('./run100-openai-ai-hub.mjs');
await import('./run101-context-ai-transform.mjs');
await import('./run130-chat-context-navigation.mjs');
await import('./run163-chat-layout-polish.mjs');
