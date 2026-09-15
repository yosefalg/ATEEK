import fs from 'node:fs';

const file='src/cloud/OnlineApp.tsx';
let s=fs.readFileSync(file,'utf8');

const replaceByValue=(value,to,label,{optional=false}={})=>{
  const pattern=new RegExp(`<Input\\s+[^>]*value=\\{${value}\\}[^>]*\\/>`,'g');
  const matches=[...s.matchAll(pattern)];
  if(matches.length===0&&optional)return;
  if(matches.length!==1)throw new Error(`Run198 transform expected exactly one ${label} input, found ${matches.length}`);
  s=s.replace(pattern,to);
};

replaceByValue('name','<Input placeholder="اسمك" accessibilityLabel="اسم العرض" value={name} onChangeText={setName} autoComplete="name" textContentType="name" returnKeyType="next" maxLength={60}/>','registration name autofill');
replaceByValue('email','<Input placeholder="البريد الإلكتروني" accessibilityLabel="البريد الإلكتروني" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" returnKeyType="next" maxLength={254}/>','email autofill');
replaceByValue('password','<Input placeholder="كلمة المرور" accessibilityLabel="كلمة المرور" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete={register?\'new-password\':\'current-password\'} textContentType={register?\'newPassword\':\'password\'} returnKeyType="done" onSubmitEditing={()=>void submit()} maxLength={128}/>','password manager and keyboard submit');

fs.writeFileSync(file,s);
console.log('Run #198 transform applied: auth fields expose safe autofill semantics and keyboard submission.');
