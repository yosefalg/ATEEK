import fs from 'node:fs';

const file = 'src/screens/HomeScreen.tsx';
let s = fs.readFileSync(file, 'utf8');

const replace = (from, to, label) => {
  if (!s.includes(from)) throw new Error(`Run183 Home anchor missing: ${label}`);
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

fs.writeFileSync(file, s);
for (const needle of [
  'const FAILED_IMAGE_CACHE_LIMIT=64;',
  'while(next.size>FAILED_IMAGE_CACHE_LIMIT)',
  'next.delete(oldest);',
]) {
  if (!s.includes(needle)) throw new Error(`Run183 Home contract missing: ${needle}`);
}
console.log('Run #183 Home reliability applied: failed remote-media memory is bounded without changing data or navigation behavior.');
