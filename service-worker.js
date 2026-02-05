/* أكاديمية عايد الرسمية — PWA Service Worker */

const VERSION = 'v5.0.0';
const CACHE_NAME = `ayed-step-${VERSION}`;

const CORE_ASSETS = [
  './',
  './index.html',
  './start.html',
  './test.html',
  './results.html',
  './quiz.html',
  './progress.html',
  './faq.html',
  './group.html',
  './support.html',
  './privacy.html',
  './terms.html',
  './offline.html',
  './manifest.webmanifest',
  './assets/css/app.css',
  './assets/img/icons/icon-192.png',
  './assets/img/icons/icon-512.png',
  './assets/img/icons/favicon-32.png',
  './assets/content/notifications.json',
  './assets/content/reviews.json',
  './assets/content/stories.json',
  './assets/content/faq.json',
  './assets/content/share_templates.json',
  './assets/content/quran_verses.json',
  './assets/content/hadith.json',
  './assets/content/duas.json',
  './assets/content/assistant_content.json',
  './assets/content/group_templates.json',
  './assets/content/names_pool.json',
  './assets/data/questions.json',
  './assets/data/index_course.json',
  './assets/js/app.js',
  './assets/js/bootstrap.js',
  './assets/js/storage.js',
  './assets/js/notifications.js',
  './assets/js/assistant.js',
  './assets/js/share.js',
  './assets/js/index.js',
  './assets/js/start.js',
  './assets/js/test.js',
  './assets/js/results.js',
  './assets/js/questionBank.js',
  './assets/js/quiz.js',
  './assets/js/plan.js',
  './assets/js/progress.js',
  './assets/js/faq.js',
  './assets/js/group.js',
  './assets/js/support.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Only handle same-origin
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // Cache a copy
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      }).catch(() => caches.match('./offline.html'));
    })
  );
});
