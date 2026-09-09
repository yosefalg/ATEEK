import fs from 'node:fs';

const file = 'src/screens/HomeScreen.tsx';
let s = fs.readFileSync(file, 'utf8');

const replace = (from, to, label) => {
  if (!s.includes(from)) throw new Error(`Run182 Home anchor missing: ${label}`);
  s = s.replace(from, to);
};

replace(
  "const firstNonEmpty=(...values:unknown[])=>values.map(value=>String(value??'').trim()).find(Boolean)??'';",
  "const firstNonEmpty=(...values:unknown[])=>values.map(value=>String(value??'').trim()).find(Boolean)??'';\nconst FAILED_IMAGE_CACHE_LIMIT=64;",
  'failed image cache limit',
);

replace(
  `  const markImageFailed=(uri:string)=>setFailedImageUrls(current=>{\n    if(current.has(uri))return current;\n    const next=new Set(current);\n    next.add(uri);\n    return next;\n  });`,
  `  const markImageFailed=(uri:string)=>setFailedImageUrls(current=>{\n    if(current.has(uri))return current;\n    const next=new Set(current);\n    next.add(uri);\n    while(next.size>FAILED_IMAGE_CACHE_LIMIT){\n      const oldest=next.values().next().value;\n      if(!oldest)break;\n      next.delete(oldest);\n    }\n    return next;\n  });`,
  'bounded failed image cache',
);

replace(
  "sectionAction:{minHeight:32,borderRadius:12,borderWidth:1,paddingHorizontal:9,flexDirection:'row-reverse',alignItems:'center',gap:4}",
  "sectionAction:{minHeight:44,borderRadius:14,borderWidth:1,paddingHorizontal:12,flexDirection:'row-reverse',alignItems:'center',gap:5,justifyContent:'center'}",
  'section action touch target',
);

fs.writeFileSync(file, s);
for (const needle of [
  'const FAILED_IMAGE_CACHE_LIMIT=64;',
  'while(next.size>FAILED_IMAGE_CACHE_LIMIT)',
  'next.delete(oldest);',
  'sectionAction:{minHeight:44',
  "paddingHorizontal:12",
]) {
  if (!s.includes(needle)) throw new Error(`Run182 Home contract missing: ${needle}`);
}
console.log('Run #182 Home reliability/accessibility applied: bounded failed-media memory and 44dp secondary action targets.');
