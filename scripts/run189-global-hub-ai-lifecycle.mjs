import fs from 'node:fs';

const file='src/components/GlobalHub.tsx';
let s=fs.readFileSync(file,'utf8');
const replace=(from,to,label)=>{if(!s.includes(from))throw new Error(`Run189 GlobalHub anchor missing: ${label}`);s=s.replace(from,to)};

replace(
  "import { useEffect,useState } from 'react';",
  "import { useEffect,useRef,useState } from 'react';",
  'React useRef import',
);

replace(
  '  const fabStyle=useAnimatedStyle(()=>({transform:[{scale:scale.value}]}));',
  '  const fabStyle=useAnimatedStyle(()=>({transform:[{scale:scale.value}]}));\n  const aiRequestRef=useRef(0);\n  useEffect(()=>()=>{aiRequestRef.current+=1;},[]);',
  'AI request generation lifecycle',
);

replace(
  "  const pressFab=()=>{haptics.medium();scale.value=.86;setTimeout(()=>{scale.value=withSpring(1,{damping:13,stiffness:210});},80);setOpen(true);};",
  "  const pressFab=()=>{haptics.medium();scale.value=.86;setTimeout(()=>{scale.value=withSpring(1,{damping:13,stiffness:210});},80);setOpen(true);};\n  const closeHub=()=>{aiRequestRef.current+=1;setBusy(false);setOpen(false);};",
  'close invalidates AI request',
);

const askStart="  const ask=async(kind:'price'|'description')=>{";
const askEnd='\n  const flush=async()=>';
const start=s.indexOf(askStart);
const end=s.indexOf(askEnd,start);
if(start<0||end<0)throw new Error('Run189 GlobalHub anchor missing: AI ask block');
const askBlock=`  const ask=async(kind:'price'|'description')=>{
    if(busy||!title.trim())return;
    const requestId=++aiRequestRef.current;
    haptics.light();setBusy(true);setAnswer('');
    try{
      const rows=await marketSnapshot(lowData?35:80);
      if(requestId!==aiRequestRef.current)return;
      const q=kind==='price'?\`أنت خبير تسعير في سوق عتيك العراقي. المنتج: \${title.trim()}. الفئة: \${category.trim()||'غير محددة'}. الحالة: \${condition.trim()||'غير محددة'}. اعتماداً فقط على بيانات السوق المرسلة لك، اقترح نطاق سعر عادل بالدينار العراقي مع تقدير تقريبي بالدولار، واشرح أسباب التقدير باختصار ولا تختلق إعلانات غير موجودة.\`:\`اكتب وصف إعلان احترافي وجذاب وقصير لمنتج بعنوان: \${title.trim()}، الفئة: \${category.trim()||'غير محددة'}، الحالة: \${condition.trim()||'غير محددة'}. لا تخترع مواصفات لم يذكرها المستخدم، واكتب النص المناسب لسوق عتيك بالعراق.\`;
      const {data,error}=await supabase.functions.invoke('ateek-assistant',{body:{question:q,listings:rows,favoritesCount:0,messagesCount:0,offersCount:0,marketSummary:{activeListings:rows.length}}});
      if(requestId!==aiRequestRef.current)return;
      if(error)throw error;
      const text=String(data?.answer||'');if(!text)throw new Error('لم يصل رد من المساعد');
      setAnswer(text);haptics.success();
    }catch(e){
      if(requestId===aiRequestRef.current){setAnswer(e instanceof Error?e.message:'تعذّر تنفيذ الطلب الآن');haptics.error();}
    }finally{
      if(requestId===aiRequestRef.current)setBusy(false);
    }
  };`;
s=s.slice(0,start)+askBlock+s.slice(end);

replace('onRequestClose={()=>setOpen(false)}','onRequestClose={closeHub}','modal close invalidation');
replace('accessibilityLabel={t(\'close\')} onPress={()=>setOpen(false)}','accessibilityLabel={t(\'close\')} onPress={closeHub}','close button invalidation');

fs.writeFileSync(file,s);

for(const needle of [
  'const aiRequestRef=useRef(0);',
  'useEffect(()=>()=>{aiRequestRef.current+=1;},[]);',
  'const closeHub=()=>{aiRequestRef.current+=1;setBusy(false);setOpen(false);};',
  'const requestId=++aiRequestRef.current;',
  'if(requestId!==aiRequestRef.current)return;',
  "supabase.functions.invoke('ateek-assistant'",
  'if(requestId===aiRequestRef.current)setBusy(false);',
  'onRequestClose={closeHub}',
])if(!s.includes(needle))throw new Error(`Run189 GlobalHub contract missing: ${needle}`);

console.log('Run #189 Global Hub reliability applied: stale AI results are isolated across close/unmount while protected assistant semantics remain unchanged.');
