const CACHE = 'english-adventure-v2';
const FILES = [
  './',
  './index.html',
  './style.css',
  './js/data.js',
  './js/app.js',
  './js/phonics.js',
  './js/wordmatch.js',
  './js/spelling.js',
  './js/speaking.js',
  './js/snake.js',
  './js/bgm.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
