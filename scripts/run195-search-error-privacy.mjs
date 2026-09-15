import fs from 'node:fs';

const file='src/screens/SearchScreen.tsx';
let s=fs.readFileSync(file,'utf8');
const replace=(from,to,label)=>{if(!s.includes(from))throw new Error(`Run195 transform anchor missing: ${label}`);s=s.replace(from,to)};

replace("catch(e:any){if(requestId===usernameRequestRef.current)Alert.alert('تعذر البحث',e.message||'تعذر فتح البروفايل.');return true}","catch{if(requestId===usernameRequestRef.current)Alert.alert('تعذر البحث','تعذر فتح البروفايل الآن. حاول مرة أخرى.');return true}",'profile lookup backend error privacy');
replace("catch(e:any){if(requestId===locationRequestRef.current)Alert.alert('تعذر تحديد الموقع',e?.message||'تحقق من خدمة الموقع وحاول مرة أخرى.')}","catch{if(requestId===locationRequestRef.current)Alert.alert('تعذر تحديد الموقع','تحقق من خدمة الموقع وحاول مرة أخرى.')}",'location provider error privacy');

fs.writeFileSync(file,s);
console.log('Run #195 transform applied: search errors no longer expose backend/provider details.');
