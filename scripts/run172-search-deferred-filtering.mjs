import fs from 'node:fs';

const file = 'src/screens/SearchScreen.tsx';
let s = fs.readFileSync(file, 'utf8');

const replace = (from, to, label) => {
  if (!s.includes(from)) throw new Error(`Run172 search anchor missing: ${label}`);
  s = s.replace(from, to);
};

replace(
  "import { useEffect,useMemo,useRef,useState } from 'react';",
  "import { useDeferredValue,useEffect,useMemo,useRef,useState } from 'react';",
  'React deferred value import',
);

replace(
  "  const favoriteIds=useMemo(()=>new Set(favorites),[favorites]);\n  const searchableListings=useMemo(()=>listings.map(item=>({item,text:searchable(item)})),[listings]);",
  "  const favoriteIds=useMemo(()=>new Set(favorites),[favorites]);\n  const deferredQuery=useDeferredValue(query);\n  const searchableListings=useMemo(()=>listings.map(item=>({item,text:searchable(item)})),[listings]);",
  'deferred query state',
);

replace(
  "    const q=normalize(query);",
  "    const q=normalize(deferredQuery);",
  'deferred local search normalization',
);

replace(
  "  },[searchableListings,category,query,near,sort]);",
  "  },[searchableListings,category,query,deferredQuery,near,sort]);",
  'deferred filter dependency',
);

fs.writeFileSync(file, s);
console.log('Run #172 search performance applied: defer local listing filtering while keeping username routing immediate.');
