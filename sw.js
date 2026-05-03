const CACHE_NAME = 'abra-learn-tw-v-fresh';
const urlsToCache = [
  './',
  './index.html',
  './index1.html',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/hanzi-writer@3.5/dist/hanzi-writer.min.js',
  'https://unpkg.com/@phosphor-icons/web',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&display=swap'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => { if (key !== CACHE_NAME) return caches.delete(key); })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // 1. 放行所有非 GET 請求
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  
  // 2. 終極白名單：非同網域 (Firebase, Gemini API, 字典 API) 絕對不攔截，保證計數器運作
  if (url.origin !== self.location.origin) return; 

  // 3. 網路優先 (Network First)：先抓最新網頁，斷網時才退回快取
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});