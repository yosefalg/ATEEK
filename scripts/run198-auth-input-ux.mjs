import fs from 'node:fs';

const file='src/components/AuthPortal.tsx';
let s=fs.readFileSync(file,'utf8');

const replaceField=(value,to,label)=>{
  const pattern=new RegExp(`<Field\\s+[\\s\\S]*?value=\\{props\\.${value}\\}[\\s\\S]*?\\/>`,'g');
  const matches=[...s.matchAll(pattern)];
  if(matches.length!==1)throw new Error(`Run198 transform expected exactly one ${label} field, found ${matches.length}`);
  s=s.replace(pattern,to);
};

replaceField('name',`<Field
              icon="person-outline"
              label="الاسم"
              placeholder="اسمك"
              value={props.name}
              onChangeText={props.onName}
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
              maxLength={60}
              colors={colors}
            />`,'registration name autofill');

replaceField('email',`<Field
            icon="mail-outline"
            label="البريد الإلكتروني"
            placeholder="name@example.com"
            value={props.email}
            onChangeText={props.onEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            maxLength={254}
            colors={colors}
          />`,'email autofill');

replaceField('password',`<Field
            icon="lock-closed-outline"
            label="كلمة المرور"
            placeholder="10 أحرف على الأقل"
            value={props.password}
            onChangeText={props.onPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={props.register?'new-password':'current-password'}
            textContentType={props.register?'newPassword':'password'}
            returnKeyType="done"
            onSubmitEditing={props.onSubmit}
            maxLength={128}
            colors={colors}
          />`,'password manager and keyboard submit');

const required=[
  'autoComplete="name"',
  'autoComplete="email"',
  "autoComplete={props.register?'new-password':'current-password'}",
  "textContentType={props.register?'newPassword':'password'}",
  'onSubmitEditing={props.onSubmit}'
];
for(const needle of required){if(!s.includes(needle))throw new Error(`Run198 contract missing: ${needle}`)}

fs.writeFileSync(file,s);
console.log('Run #198 transform applied: AuthPortal fields expose safe autofill semantics and keyboard submission.');
