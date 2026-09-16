import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const localeDir = path.join(root, 'src/i18n/locale');
const languages = ['ar', 'en', 'tr', 'fa'];
const catalogs = Object.fromEntries(languages.map(lang => [lang, JSON.parse(fs.readFileSync(path.join(localeDir, `${lang}.json`), 'utf8'))]));
const baseline = Object.keys(catalogs.ar).sort();
for (const lang of languages.slice(1)) {
  const keys = Object.keys(catalogs[lang]).sort();
  const missing = baseline.filter(k => !keys.includes(k));
  const extra = keys.filter(k => !baseline.includes(k));
  if (missing.length || extra.length) {
    console.error(`[i18n] ${lang}: missing=${missing.join(',')} extra=${extra.join(',')}`);
    process.exit(1);
  }
}

const scopedFiles = [
  'src/AppShell.tsx',
  'src/components/SafeReelVideo.tsx',
  'src/i18n/LocaleProvider.tsx',
];
const literalText = /<Text\b[^>]*>\s*([^<{][^<]*)<\/Text>/g;
const allowed = /^(ATEEK(?:\s*[•#].*)?|HLS|MP4)$/;
for (const rel of scopedFiles) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) continue;
  const src = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = literalText.exec(src))) {
    const raw = match[1].trim();
    if (!raw || raw.includes('{') || allowed.test(raw)) continue;
    console.error(`[i18n] hardcoded <Text> literal in ${rel}: ${raw.slice(0, 120)}`);
    process.exit(1);
  }
}
console.log(`[i18n] locale parity PASS (${baseline.length} keys x ${languages.length} locales); scoped hardcoded Text gate PASS`);
