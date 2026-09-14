import fs from 'node:fs';

const file = 'src/screens/AddListingScreen.tsx';
let source = fs.readFileSync(file, 'utf8');

const replace = (from, to, label) => {
  if (!source.includes(from)) throw new Error(`Run192 transform anchor missing: ${label}`);
  source = source.replace(from, to);
};

replace(
  "    } catch (error: unknown) {\n      const message = error instanceof Error ? error.message : 'حاول بصورة أخرى أو لاحقاً.';\n      Alert.alert('تعذّر تحليل الصورة', message);\n    } finally {",
  "    } catch {\n      Alert.alert('تعذّر تحليل الصورة', 'تعذّر إكمال التحليل الآن. تحقق من اتصال الإنترنت أو جرّب صورة أخرى.');\n    } finally {",
  'AI analysis user-facing error privacy',
);

replace(
  "    } catch (error: unknown) {\n      const message = error instanceof Error ? error.message : 'تحقق من اتصال الإنترنت ثم أعد المحاولة.';\n      Alert.alert('تعذّر نشر الإعلان', message);\n    } finally {",
  "    } catch {\n      Alert.alert('تعذّر نشر الإعلان', 'لم يكتمل النشر. تحقق من اتصال الإنترنت ثم أعد المحاولة.');\n    } finally {",
  'listing publish user-facing error privacy',
);

for (const needle of [
  "Alert.alert('تعذّر تحليل الصورة', 'تعذّر إكمال التحليل الآن. تحقق من اتصال الإنترنت أو جرّب صورة أخرى.')",
  "Alert.alert('تعذّر نشر الإعلان', 'لم يكتمل النشر. تحقق من اتصال الإنترنت ثم أعد المحاولة.')",
]) {
  if (!source.includes(needle)) throw new Error(`Run192 transform postcondition missing: ${needle}`);
}
if (source.includes('error instanceof Error ? error.message')) {
  throw new Error('Run192 privacy postcondition failed: raw backend error message remains exposed in AddListingScreen');
}

fs.writeFileSync(file, source);
console.log('Run #192 listing error privacy applied: backend exception details are no longer surfaced directly to end users.');
