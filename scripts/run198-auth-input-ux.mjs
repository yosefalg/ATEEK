import fs from 'node:fs';

const file='src/cloud/OnlineApp.tsx';
let s=fs.readFileSync(file,'utf8');

const replaceInput=(placeholder,to,label)=>{
  const escaped=placeholder.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const pattern=new RegExp(`<Input\\s+placeholder="${escaped}"[^>]*\\/>`,'g');
  const matches=[...s.matchAll(pattern)];
  if(matches.length!==1)throw new Error(`Run198 transform expected exactly one ${label} input, found ${matches.length}`);
  s=s.replace(pattern,to);
};

replaceInput('اسمك','<Input placeholder="اسمك" accessibilityLabel="اسم العرض" value={name} onChangeText={setName} autoComplete="name" textContentType="name" returnKeyType="next" maxLength={60}/>','registration name autofill');
replaceInput('البريد الإلكتروني','<Input placeholder="البريد الإلكتروني" accessibilityLabel="البريد الإلكتروني" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" returnKeyType="next" maxLength={254}/>','email autofill');
replaceInput('كلمة المرور','<Input placeholder="كلمة المرور" accessibilityLabel="كلمة المرور" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete={register?\'new-password\':\'current-password\'} textContentType={register?\'newPassword\':\'password\'} returnKeyType="done" onSubmitEditing={()=>void submit()} maxLength={128}/>','password manager and keyboard submit');

fs.writeFileSync(file,s);
console.log('Run #198 transform applied: auth fields expose safe autofill semantics and keyboard submission.');
