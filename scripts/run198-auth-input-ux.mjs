import fs from 'node:fs';

const file='src/cloud/OnlineApp.tsx';
let s=fs.readFileSync(file,'utf8');
const replace=(from,to,label)=>{if(!s.includes(from))throw new Error(`Run198 transform anchor missing: ${label}`);s=s.replace(from,to)};

replace('<Input placeholder="اسمك" value={name} onChangeText={setName} maxLength={60}/>','<Input placeholder="اسمك" accessibilityLabel="اسم العرض" value={name} onChangeText={setName} autoComplete="name" textContentType="name" returnKeyType="next" maxLength={60}/>','registration name autofill');
replace('<Input placeholder="البريد الإلكتروني" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} maxLength={254}/>','<Input placeholder="البريد الإلكتروني" accessibilityLabel="البريد الإلكتروني" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" returnKeyType="next" maxLength={254}/>','email autofill');
replace('<Input placeholder="كلمة المرور" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" maxLength={128}/>','<Input placeholder="كلمة المرور" accessibilityLabel="كلمة المرور" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete={register?\'new-password\':\'current-password\'} textContentType={register?\'newPassword\':\'password\'} returnKeyType="done" onSubmitEditing={()=>void submit()} maxLength={128}/>','password manager and keyboard submit');

fs.writeFileSync(file,s);
console.log('Run #198 transform applied: auth fields expose safe autofill semantics and keyboard submission.');
