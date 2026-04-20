const CACHE = 'darts-cache-v1.3';
const ASSETS = [
  '/',
  './index.html',
  './styles.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.6/dist/css/bootstrap.min.css',
  './manifest.json',
  './images/dartboard.svg',
  './src/app.js',
  './src/storage.js',
  './src/gameRegistry.js',
  './src/stats.js',
  './src/utils.js',
  './src/ui/scoreboardView.js',
  './src/ui/historyView.js',
  './src/ui/messageModalView.js',
  './src/games/baseGame.js',
  './src/games/standardCountDown.js',
  './src/games/cricket.js',
  './src/games/shanghai.js',
  './src/games/shanghaiScoring.js'
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
