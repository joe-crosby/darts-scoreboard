const CACHE = 'darts-cache-v1.8';
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
  './src/ui/savedGamesView.js',
  './src/ui/winnerCelebrationView.js',
  './src/games/baseGame.js',
  './src/games/standardCountDown.js',
  './src/games/cricket.js',
  './src/games/shanghai.js',
  './src/games/shanghaiScoring.js'
];

self.addEventListener("install", event => {
  self.skipWaiting();

  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);

    // Precache all assets with cache-bypass for freshness
    await cache.addAll(
      ASSETS.map(url => new Request(url, { cache: "reload" }))
    );
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {

    // 1. Delete old caches (your original logic)
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key !== CACHE)
        .map(key => caches.delete(key))
    );

    // 2. Take control of all pages under this SW's scope
    await self.clients.claim();

    // 3. Refresh ONLY your app's windows
    const clients = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    });

    for (const client of clients) {
      // Only refresh windows that belong to YOUR app
      if (client.url.startsWith(self.registration.scope)) {
        client.navigate(client.url);
      }
    }

  })());
});


self.addEventListener("fetch", event => {
  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    return cached || fetch(event.request);
  })());
});
