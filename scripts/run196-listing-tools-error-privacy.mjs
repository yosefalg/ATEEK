import fs from 'node:fs';

const file='src/components/Build2Tools.tsx';
let s=fs.readFileSync(file,'utf8');
const replace=(from,to,label)=>{if(!s.includes(from))throw new Error(`Run196 transform anchor missing: ${label}`);s=s.replace(from,to)};

replace("}catch(e:any){if(mountedRef.current)Alert.alert('تعذّر التنفيذ',e.message||'حاول مجددًا');}finally{","}catch{if(mountedRef.current)Alert.alert('تعذّر التنفيذ','تعذّر إكمال العملية الآن. حاول مجددًا.');}finally{",'owner listing RPC error privacy');
replace("}catch(e:any){if(mountedRef.current)Alert.alert('تعذّرت المشاركة',e.message||'حاول مجددًا');}finally{","}catch{if(mountedRef.current)Alert.alert('تعذّرت المشاركة','تعذّر تجهيز المشاركة الآن. حاول مجددًا.');}finally{",'share provider error privacy');

fs.writeFileSync(file,s);
console.log('Run #196 transform applied: listing tools errors no longer expose backend/provider details.');
