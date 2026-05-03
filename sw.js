const CACHE_NAME = 'abra-learn-tw-v-stable-3';
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
  // 啟動階段：徹底清除舊版所有幽靈快取，保證系統能載入最新設定
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
  
  // 2. 終極防護白名單：只要不是當前網域的資源 (代表是 Firebase, Gemini API 或 教育部字典 API)
  // 絕對不予攔截，直接放行給瀏覽器原生處理，保證 API 暢通無阻！
  if (url.origin !== self.location.origin) return; 

  // 3. 網路優先 (Network First)：先抓最新網頁，真斷網時才退回快取
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