# تشغيل وبناء APK على Replit

افتح Shell داخل مجلد ATEEK ثم شغّل الأمر التالي بعد تسجيل الدخول إلى حساب Expo:

```bash
npm install && npm run typecheck && npm test && npx eas-cli login && npx eas-cli build --platform android --profile preview
```

النتيجة المطلوبة هي APK من ملف `eas.json` باستخدام `android.buildType=apk`.
لا تضع مفاتيح Supabase السرية أو service_role داخل Replit أو APK. التطبيق يستخدم المفتاح publishable فقط، وقاعدة البيانات محمية بواسطة RLS.

بعد اكتمال EAS سيظهر رابط APK في Shell وداخل صفحة Builds في حساب Expo. تثبّت APK على هاتفك، ثم أنشئ حسابًا بالبريد وكلمة مرور لا تقل عن 10 أحرف.

## البناء المجاني من GitHub Actions

الملف `.github/workflows/build-apk.yml` يبني APK تجريبيًا قابلًا للتثبيت دون حساب Expo أو EAS. ارفع المشروع إلى مستودع GitHub، افتح تبويب Actions، اختر `Build ATEEK APK` ثم `Run workflow`. بعد النجاح نزّل `ateek-debug-apk` من Artifacts.

هذا APK موقّع بمفتاح debug ومناسب للاختبار والتثبيت المباشر. نشره في Google Play يحتاج مفتاح release خاصًا بك.

قبل نشر عام، فعّل تأكيد البريد في إعدادات Auth، واضبط اسم التطبيق وسياسة الخصوصية والبريد المرسل، ثم اختبر التسجيل، رفع الصورة، المحادثة، العرض، القبول، الإتمام والتقييم بحسابين مختلفين.
