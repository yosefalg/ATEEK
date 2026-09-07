import fs from 'node:fs';
const file='src/components/SpatialReelsHub.tsx';
let s=fs.readFileSync(file,'utf8');
const replace=(from,to,label)=>{if(!s.includes(from))throw new Error(`Run77 transform anchor missing: ${label}`);s=s.replace(from,to)};
replace('initialNumToRender={2} maxToRenderPerBatch={2}','initialNumToRender={1} maxToRenderPerBatch={1}','single reel render batch');
const safeCall='<SafeReelVideo reel={item} active={active === item.id} nextReel={visualReels[index+1] ?? null} onSkip={()=>{if(index+1<visualReels.length)listRef.current?.scrollToIndex({index:index+1,animated:true})}} />';
replace(safeCall,'<SafeReelVideo reel={item} active={active === item.id} />','remove preloader/skip coupling');
fs.writeFileSync(file,s);
console.log('Run #77 Reels transform applied: no next-reel preload, one-item render batches.');
