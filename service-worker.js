/* =============================================================================
   service-worker.js — DEIXA O APP FUNCIONAR SEM INTERNET
   -----------------------------------------------------------------------------
   Estratégia "rede primeiro": tenta a internet (para pegar a versão mais nova) e, se falhar,
   usa a cópia guardada. Ao mudar qualquer arquivo da lista, aumente VERSAO_CACHE.
   ============================================================================= */
const VERSAO_CACHE = 'comecaja-v1';
const ARQUIVOS = [
  './', 'index.html', 'manifest.json',
  'css/base.css', 'css/componentes.css', 'css/hoje.css',
  'js/config.js', 'js/logica.js', 'js/utilitarios.js', 'js/armazenamento.js', 'js/foco.js', 'js/hoje.js', 'js/pwa.js',
  'icones/icone-192.png', 'icones/icone-512.png', 'icones/apple-touch-icon.png'
];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSAO_CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO_CACHE).map((n) => caches.delete(n)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then((r) => { const copia = r.clone(); caches.open(VERSAO_CACHE).then((c) => c.put(e.request, copia)); return r; })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html')))
  );
});
