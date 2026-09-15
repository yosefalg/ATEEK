const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('src/screens/SearchScreen.tsx','utf8');

assert(src.includes("Alert.alert('تعذر البحث','تعذر فتح البروفايل الآن. حاول مرة أخرى.')"),'profile lookup must use a stable user-safe error');
assert(src.includes("Alert.alert('تعذر تحديد الموقع','تحقق من خدمة الموقع وحاول مرة أخرى.')"),'location lookup must use a stable user-safe error');
assert(!src.includes("e.message||'تعذر فتح البروفايل.'"),'profile lookup must not expose Supabase/backend error.message');
assert(!src.includes("e?.message||'تحقق من خدمة الموقع وحاول مرة أخرى.'"),'location lookup must not expose provider/native error.message');
assert(src.includes("supabase.rpc('ateek_profile_by_username'"),'real username RPC behavior must remain intact');
assert(src.includes('Location.requestForegroundPermissionsAsync()'),'real location permission flow must remain intact');
console.log('search error privacy contract: ok');
