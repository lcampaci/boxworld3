'use strict';
const CACHE_NAME = 'boxworld-pwa-v8';
const APP_FILES = [
  './', './index.html', './style.css', './script.js', './levels.js', './manifest.json',
  './imagens/0.gif', './imagens/1.gif', './imagens/2.gif', './imagens/3.gif',
  './imagens/4.gif', './imagens/5.gif', './imagens/6.gif', './imagens/7.gif',
  './imagens/bg.gif', './imagens/r.gif', './imagens/icon-192.png', './imagens/icon-512.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(cached => {
    if (cached) return cached;
    return fetch(event.request).then(response => {
      if (response && response.ok && new URL(event.request.url).origin === self.location.origin) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      }
      return response;
    }).catch(() => caches.match('./index.html'));
  }));
});
