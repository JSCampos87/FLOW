/* Service worker do FLOW.
   Rede primeiro (abre sempre a versão publicada mais recente); se não houver rede, usa a última cópia
   guardada da app — assim o tablet junto à máquina continua a abrir o FLOW sem Wi-Fi.
   Os dados vivem no Firestore, que tem a sua própria cache offline (js/store.js). */
var CACHE='flow-v4';
self.addEventListener('install', function(){ self.skipWaiting() });
self.addEventListener('activate', function(e){ e.waitUntil(caches.keys().then(function(k){ return Promise.all(k.filter(function(n){return n!==CACHE}).map(function(n){return caches.delete(n)})) }).then(function(){ return self.clients.claim() })) });
self.addEventListener('fetch', function(e){
  var r=e.request, u=new URL(r.url);
  if(r.method!=='GET' || u.origin!==location.origin) return;          /* Firebase, fontes, etc.: direto à rede */
  e.respondWith(fetch(r).then(function(res){
    if(res && res.ok && !/\/data\//.test(u.pathname)){ var c=res.clone(); caches.open(CACHE).then(function(cc){ cc.put(r,c) }) }
    return res;
  }).catch(function(){ return caches.match(r).then(function(m){ return m || caches.match('./index.html') }) }));
});
