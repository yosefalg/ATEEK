import fs from 'node:fs';

const file = 'src/components/ProductionAccountHub.tsx';
let source = fs.readFileSync(file, 'utf8');

const replace = (from, to, label) => {
  if (!source.includes(from)) throw new Error(`Run193 transform anchor missing: ${label}`);
  source = source.replace(from, to);
};

replace(
  "useEffect(()=>{void load().catch(e=>Alert.alert('التوثيق',String(e?.message??e)))},[]);",
  "useEffect(()=>{void load().catch(()=>Alert.alert('التوثيق','تعذّر تحميل حالة التوثيق الآن. تحقق من اتصال الإنترنت ثم أعد المحاولة.'))},[]);",
  'verification status error privacy',
);
replace(
  "}catch(e:any){Alert.alert('تعذر إرسال الطلب',String(e?.message??e))}finally{setBusy(false)}};",
  "}catch{Alert.alert('تعذر إرسال الطلب','تعذّر إرسال طلب التوثيق الآن. تحقق من اتصال الإنترنت ثم أعد المحاولة.')}finally{setBusy(false)}};",
  'verification submit error privacy',
);
replace(
  "}catch(e:any){Alert.alert('تعذر الحفظ',String(e?.message??e))}finally{saveBusyRef.current=false;setSaving(false)}};",
  "}catch{Alert.alert('تعذر الحفظ','لم يتم حفظ الإعدادات الآن. تحقق من اتصال الإنترنت ثم أعد المحاولة.')}finally{saveBusyRef.current=false;setSaving(false)}};",
  'settings save error privacy',
);
replace(
  "}catch(e:any){Alert.alert('تعذر التحديث',String(e?.message??e))}finally{passwordBusyRef.current=false;setPasswordBusy(false)}};",
  "}catch{Alert.alert('تعذر التحديث','تعذّر تحديث كلمة المرور الآن. تحقق من اتصال الإنترنت ثم أعد المحاولة.')}finally{passwordBusyRef.current=false;setPasswordBusy(false)}};",
  'password update error privacy',
);
replace(
  ").catch(e=>Alert.alert('تعذر الطلب',String(e?.message??e)))}]);",
  ").catch(()=>Alert.alert('تعذر الطلب','تعذّر تسجيل طلب حذف الحساب الآن. تحقق من اتصال الإنترنت ثم أعد المحاولة.'))}]);",
  'account deletion error privacy',
);
replace(
  "useEffect(()=>{void Location.getForegroundPermissionsAsync().then(p=>setLoc(p.status==='granted'?'مسموح أثناء الاستخدام':p.status==='denied'?'مرفوض':'غير محدد'))},[]);",
  "useEffect(()=>{void Location.getForegroundPermissionsAsync().then(p=>setLoc(p.status==='granted'?'مسموح أثناء الاستخدام':p.status==='denied'?'مرفوض':'غير محدد')).catch(()=>setLoc('تعذّر فحص الإذن'))},[]);",
  'location permission status rejection containment',
);
replace(
  "onPress={()=>void Location.requestForegroundPermissionsAsync().then(p=>setLoc(p.status==='granted'?'مسموح أثناء الاستخدام':'مرفوض'))}",
  "onPress={()=>void Location.requestForegroundPermissionsAsync().then(p=>setLoc(p.status==='granted'?'مسموح أثناء الاستخدام':'مرفوض')).catch(()=>setLoc('تعذّر طلب الإذن'))}",
  'location permission request rejection containment',
);

for (const needle of [
  "تعذّر تحميل حالة التوثيق الآن. تحقق من اتصال الإنترنت ثم أعد المحاولة.",
  "تعذّر إرسال طلب التوثيق الآن. تحقق من اتصال الإنترنت ثم أعد المحاولة.",
  "لم يتم حفظ الإعدادات الآن. تحقق من اتصال الإنترنت ثم أعد المحاولة.",
  "تعذّر تحديث كلمة المرور الآن. تحقق من اتصال الإنترنت ثم أعد المحاولة.",
  "تعذّر تسجيل طلب حذف الحساب الآن. تحقق من اتصال الإنترنت ثم أعد المحاولة.",
  "catch(()=>setLoc('تعذّر فحص الإذن'))",
  "catch(()=>setLoc('تعذّر طلب الإذن'))",
]) {
  if (!source.includes(needle)) throw new Error(`Run193 transform postcondition missing: ${needle}`);
}
if (source.includes("String(e?.message??e)")) {
  throw new Error('Run193 privacy postcondition failed: raw backend error details remain exposed in ProductionAccountHub');
}

fs.writeFileSync(file, source);
console.log('Run #193 account hub privacy/reliability applied: backend errors are sanitized and location permission rejections are contained.');
