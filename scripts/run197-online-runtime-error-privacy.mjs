import fs from 'node:fs';

const file='src/cloud/OnlineApp.tsx';
let s=fs.readFileSync(file,'utf8');
const replace=(from,to,label)=>{if(!s.includes(from))throw new Error(`Run197 transform anchor missing: ${label}`);s=s.replace(from,to)};

replace("async function attempt(fn:()=>Promise<unknown>){try{await fn()}catch(error:any){Alert.alert('تعذّر إكمال العملية',error.message||'تحقق من اتصال الإنترنت.')}}","async function attempt(fn:()=>Promise<unknown>){try{await fn()}catch{Alert.alert('تعذّر إكمال العملية','تحقق من اتصال الإنترنت وحاول مجددًا.')}}",'generic operation error privacy');
replace("if(error)setError(error.message);setSession(data.session);setReady(true)","if(error)setError('تعذّر قراءة الجلسة. حاول تسجيل الدخول مجددًا.');setSession(data.session);setReady(true)",'session bootstrap error privacy');
replace("}catch(error:any){setError(error.message||'تعذّر الاتصال')}finally{","}catch{setError(register?'تعذّر إنشاء الحساب الآن. تحقق من البيانات وحاول مجددًا.':'تعذّر تسجيل الدخول. تحقق من البيانات وحاول مجددًا.')}finally{",'auth provider error privacy');

fs.writeFileSync(file,s);
console.log('Run #197 transform applied: online runtime/auth errors no longer expose backend provider details.');
