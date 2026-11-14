/* Cache da interface e da biblioteca Leaflet. Sem prefetch de mosaicos OSM. */
const CACHE='travelbook-shell-v1.1-sync';
const BASE=self.registration.scope;
const SHELL=['./','./index.html','./assets/style.css','./assets/app.js','./assets/db.js','./assets/sync.js','./assets/utils.js','./icons/icon.svg','./icons/icon-192.png','./icons/icon-512.png','./manifest.webmanifest'];
const LEAFLET=[
 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css',
 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js'
];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(async cache=>{
    await cache.addAll(SHELL.map(path=>new URL(path,BASE).toString()));
    /* Opcional: se a CDN estiver indisponível, a instalação offline não falha. */
    await Promise.allSettled(LEAFLET.map(async url=>{
      const response=await fetch(url,{mode:'cors'});
      if(response.ok)await cache.put(url,response);
    }));
  }).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('travelbook-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(LEAFLET.includes(url.href)){
    event.respondWith(caches.match(event.request,{ignoreSearch:false}).then(cached=>cached||fetch(event.request).then(response=>{
      if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
      return response;
    })));
    return;
  }
  if(url.origin!==self.location.origin)return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok && url.pathname.startsWith(new URL(BASE).pathname)){
      const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));
    }
    return response;
  }).catch(()=>caches.match(event.request).then(hit=>hit||(event.request.mode==='navigate'?caches.match(new URL('./index.html',BASE).toString()):Response.error()))));
});
