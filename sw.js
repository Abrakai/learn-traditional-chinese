const CACHE_NAME = 'abra-learn-tw-v-stable-1';
const urlsToCache = [
  './',
  './index.html',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/hanzi-writer@3.5/dist/hanzi-writer.min.js',
  'https://unpkg.com/@phosphor-icons/web',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&display=swap'
];

self.addEventListener('install', event => {
  // 強制立刻接管，跳過等待狀態
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.all(urlsToCache.map(url => {
        return fetch(url).then(response => {
          if (response && response.ok) {
            return cache.put(url, response);
          }
        }).catch(err => console.warn('PWA Cache fetch failed for:', url, err));
      }));
    })
  );
});

self.addEventListener('activate', event => {
  // 啟動階段：徹底清除舊版幽靈快取，並加入 catch 防護
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    )).then(() => {
      return self.clients.claim().catch(err => console.warn('PWA Claim failed:', err));
    })
  );
});

self.addEventListener('fetch', event => {
  // 1. 放行所有非 GET 請求 (Firebase 寫入、登入等)
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  
  // 2. 終極白名單：非同網域 (Firebase, Gemini API, 教育部字典 API) 絕對不攔截，保證計數器與字典運作！
  if (url.origin !== self.location.origin) return; 

  // 3. 網路優先 (Network First)：先抓最新網頁，斷網時才退回快取
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});