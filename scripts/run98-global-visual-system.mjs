import fs from 'node:fs';

const onlineFile='src/cloud/OnlineApp.tsx';
let online=fs.readFileSync(onlineFile,'utf8');
if(!online.includes("import { AuthPortal } from '../components/AuthPortal';")){
  online=online.replace(
    "import { ScreenErrorBoundary } from '../components/ScreenErrorBoundary';",
    "import { ScreenErrorBoundary } from '../components/ScreenErrorBoundary';\nimport { AuthPortal } from '../components/AuthPortal';"
  );
}
const authStart=online.indexOf('function Auth({initialError}');
const notificationHelper=online.indexOf('function notificationTime',authStart);
const notificationsScreen=online.indexOf('function NotificationsScreen',authStart);
const authEnd=notificationHelper>=0?notificationHelper:notificationsScreen;
if(authStart<0||authEnd<0)throw new Error('Run98 auth function anchor missing');
const auth=`function Auth({initialError}:{initialError:string}){const[register,setRegister]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(initialError);const submit=async()=>{if(busy)return;if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email.trim())||password.length<10||(register&&!name.trim()))return void setError('أدخل بريدًا صحيحًا وكلمة مرور من 10 أحرف واسمًا عند التسجيل.');setBusy(true);setError('');try{if(register){const{data,error}=await supabase.auth.signUp({email:email.trim(),password,options:{data:{name:name.trim()}}});if(error)throw error;if(!data.session){setRegister(false);setError('تحقق من بريدك وافتح رسالة التأكيد، ثم عد وسجّل الدخول.')}}else{const{error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(error)throw error}}catch(error:any){setError(error.message||'تعذّر الاتصال')}finally{setBusy(false)}};return <AuthPortal register={register} email={email} password={password} name={name} busy={busy} error={error} onEmail={setEmail} onPassword={setPassword} onName={setName} onSubmit={()=>void submit()} onToggleMode={()=>{setRegister(!register);setError('')}}/>}\n`;
online=online.slice(0,authStart)+auth+online.slice(authEnd);
fs.writeFileSync(onlineFile,online);

const accountFile='src/components/ProductionAccountHub.tsx';
let account=fs.readFileSync(accountFile,'utf8');
const replacements=[
  ["['premium','Premium','diamond-outline']","['premium','عتيك بلس','diamond-outline']"],
  ["title:'Creator'","title:'صانع محتوى'"],
  ["title:'Merchant'","title:'تاجر'"],
  ["title:'Business'","title:'أعمال'"],
  ['<Text style={s.title}>ATEEK Premium</Text>','<Text style={s.title}>عتيك بلس</Text>'],
  ['Choice label="Auto"','Choice label="تلقائي"'],
  ['Choice label="AMOLED Dark"','Choice label="أسود AMOLED"'],
  ['Choice label="Titanium Grey"','Choice label="تيتانيوم"']
];
for(const [from,to] of replacements){
  if(!account.includes(from))throw new Error(`Run98 account anchor missing: ${from}`);
  account=account.replace(from,to);
}
fs.writeFileSync(accountFile,account);

const reelsFile='src/components/SpatialReelsHub.tsx';
let reels=fs.readFileSync(reelsFile,'utf8');
const onViewAnchor="  const onView = useRef(({ viewableItems }: { viewableItems: Array<{ item: Reel }> }) => setActive(viewableItems[0]?.item.id ?? null)).current;";
if(!reels.includes(onViewAnchor))throw new Error('Run98 Reels onView anchor missing');
reels=reels.replace(onViewAnchor,`${onViewAnchor}\n  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;`);
const inlineViewability='viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}';
if(!reels.includes(inlineViewability))throw new Error('Run98 inline Reels viewability config missing');
reels=reels.replace(inlineViewability,'viewabilityConfig={viewabilityConfig}');
const activeAnchor='setReels(r); setActive((v) => v ?? r[0]?.id ?? null);';
if(reels.includes(activeAnchor))reels=reels.replace(activeAnchor,"setReels(r); setActive((v) => (v && r.some((x) => x.id === v) ? v : r[0]?.id ?? null));");
fs.writeFileSync(reelsFile,reels);

const authPortal=fs.readFileSync('src/components/AuthPortal.tsx','utf8');
const palette=fs.readFileSync('src/theme/colors.ts','utf8');
const tokens=fs.readFileSync('src/theme/tokens.ts','utf8');
const required=[
  [online,"import { AuthPortal } from '../components/AuthPortal';",'AuthPortal import'],
  [online,'return <AuthPortal register={register}','AuthPortal render'],
  [online,'function notificationTime','notifications helper preserved'],
  [authPortal,'accessibilityLiveRegion="polite"','auth accessibility live region'],
  [authPortal,"behavior={Platform.OS === 'ios' ? 'padding' : 'height'}",'Android auth keyboard avoidance'],
  [account,"['premium','عتيك بلس','diamond-outline']",'Arabic premium tab'],
  [palette,"gold:'#D6B36C'",'global accent palette'],
  [tokens,"background: '#07090D'",'global background token'],
  [reels,'viewabilityConfig={viewabilityConfig}','stable Reels viewability config']
];
for(const [source,needle,label] of required){if(!source.includes(needle))throw new Error(`Run98 contract missing: ${label}`)}

console.log('Run #98 global visual system applied: premium auth portal, Arabic account labels, unified palette, stable Reels viewability, preserved Supabase Auth flow and notification helper.');
