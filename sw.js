const cacheName='audita-app-0.2.0';
// Somente arquivos estáticos do aplicativo. Nunca PDFs, SMS, backups ou relatórios.
const urls=['./','./index.html','./assets/app.js','./assets/app.css','./assets/pdf.worker.mjs','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png','./app.webmanifest'];
const approved=new Set(urls.map(url=>new URL(url,self.registration.scope).pathname));
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(cacheName).then(cache=>cache.addAll(urls)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('audita-app-')&&key!==cacheName).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin||!approved.has(url.pathname)||url.search)return;
  event.respondWith(caches.open(cacheName).then(async cache=>{
    try{
      const response=await fetch(event.request);
      if(response.ok)await cache.put(event.request,response.clone());
      return response.ok?response:await cache.match(event.request)||response;
    }catch{return await cache.match(event.request)||Response.error();}
  }));
});
