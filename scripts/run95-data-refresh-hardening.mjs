import fs from 'node:fs';

const replace=(source,from,to,label)=>{if(!source.includes(from))throw new Error(`Run95 data refresh anchor missing: ${label}`);return source.replace(from,to)};
const replaceIfNeeded=(source,from,to,label)=>source.includes(to)?source:replace(source,from,to,label);

const cloudFile='src/cloud/useCloud.ts';
let cloud=fs.readFileSync(cloudFile,'utf8');
cloud=replaceIfNeeded(
  cloud,
  "const timer=setInterval(()=>{if(AppState.currentState==='active')void refresh();},lowData?60000:15000);return()=>{alive.current=false;clearInterval(timer);void supabase.removeChannel(channel);};",
  "const appStateSubscription=AppState.addEventListener('change',state=>{if(state==='active')void refresh();});const timer=setInterval(()=>{if(AppState.currentState==='active')void refresh();},lowData?60000:15000);return()=>{alive.current=false;appStateSubscription.remove();clearInterval(timer);void supabase.removeChannel(channel).catch(()=>{});};",
  'refresh immediately when app returns to foreground',
);
fs.writeFileSync(cloudFile,cloud);

const profileFile='src/components/SpatialProfileAnalyticsHub.tsx';
let profile=fs.readFileSync(profileFile,'utf8');
profile=replaceIfNeeded(
  profile,
  "        if (cached.data) setAnalytics(cached.data);\n        if (!cached.savedAt || Date.now() - cached.savedAt > CACHE_TTL) void refreshAnalytics();\n      } catch {\n        void refreshAnalytics();\n      }\n    }).catch(() => void refreshAnalytics());\n    void refreshAnalytics();",
  "        if (cached.data) setAnalytics(cached.data);\n      } catch {\n        void AsyncStorage.removeItem(cacheKey).catch(() => {});\n      }\n    }).catch(() => {});\n    void refreshAnalytics();",
  'avoid duplicate analytics RPC during cache hydration',
);
fs.writeFileSync(profileFile,profile);

console.log('Run #95 data refresh hardening applied: immediate foreground sync and single analytics refresh per mount.');
