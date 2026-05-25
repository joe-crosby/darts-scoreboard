const VERSION = '2.0';
const NAME = 'darts-cache';
const CACHE_NAME = `${NAME}-v${VERSION}`;
const ASSETS = [
  './',
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
    const cache = await caches.open(CACHE_NAME);

    await cache.addAll(
      ASSETS.map(url => new Request(url, { cache: "reload" }))
    );
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {

    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key.startsWith(NAME) && key !== CACHE_NAME)
        .map(key => { console.log(`Deleting cache: ${key}`); return caches.delete(key) })
    );

    await self.clients.claim();

  })());
});


self.addEventListener("fetch", event => {
  event.respondWith((async () => {
    try {
      const url = new URL(event.request.url);
      let request = event.request;

      if (url.origin === location.origin &&
          (url.pathname === '/' || url.pathname === '/index' || url.pathname === '/index.html')) {
        request = new Request('./index.html');
      }

      const cached = await caches.match(request);
      return cached || fetch(event.request);
    } catch (err) {
      console.error('Fetch failed; returning offline page instead.', err);
      return await caches.match('./index.html');
    }
  })());
});
