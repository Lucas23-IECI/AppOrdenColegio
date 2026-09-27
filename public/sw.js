const CACHE='orden-app-v2';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['/','/favicon.svg','/manifest.webmanifest'])));});
self.addEventListener('activate',event=>{event.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('orden-app-')&&k!==CACHE).map(k=>caches.delete(k))))]));});
self.addEventListener('message',event=>{if(event.data?.type==='PREPARE'){event.waitUntil(caches.open(CACHE).then(async cache=>{let ok=true;for(const path of event.data.urls??[]){try{const url=new URL(path,self.location.origin);if(url.origin===self.location.origin&&/^https?:$/.test(url.protocol)&&!url.pathname.startsWith('/api/')&&!url.pathname.includes('signin')){if(!await cache.match(url.href))await cache.add(url.href);}}catch{ok=false;}}event.ports[0]?.postMessage({ok});}).catch(()=>event.ports[0]?.postMessage({ok:false})));}});
self.addEventListener('fetch',event=>{
 const req=event.request;const url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.includes('signin')||url.pathname.includes('signout')||url.pathname.includes('callback')||req.headers.get('RSC'))return;
 if(req.mode==='navigate'){event.respondWith(fetch(req).then(res=>{if(res.ok&&new URL(res.url).origin===self.location.origin&&!res.redirected){const copy=res.clone();caches.open(CACHE).then(cache=>cache.put('/',copy));}return res;}).catch(()=>caches.match('/')));return;}
 if(['script','style','font','image'].includes(req.destination)){event.respondWith(caches.match(req).then(cached=>cached??fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(cache=>cache.put(req,copy));}return res;})));}
});
