/* Service worker mínimo: só torna o FLOW instalável no telemóvel.
   Não guarda nada em cache, para cada abertura vir sempre a versão publicada mais recente. */
self.addEventListener('install', function(){ self.skipWaiting() });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()) });
self.addEventListener('fetch', function(){ /* passa direto à rede */ });
