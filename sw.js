const CACHE_NAME = 'abra-learn-tw-v5';
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
  // 強制立刻接管，跳過等待狀態
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.all(urlsToCache.map(url => {
        // 使用 reload 強制繞過瀏覽器 HTTP 快取，抓取 GitHub 上的最新檔案，徹底消滅幽靈快取
        return fetch(url, { cache: 'reload' }).then(response => {
          if (response && response.ok) {
            return cache.put(url, response);
          }
        }).catch(err => console.warn('Cache fetch failed:', url, err));
      }));
    })
  );
});

self.addEventListener('activate', event => {
  // 啟動階段：接管所有客戶端頁面，並徹底清除舊版 (v1~v4) 的快取
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      })
    )).then(() => self.clients.claim()) 
  );
});

self.addEventListener('fetch', event => {
  // 1. 放行所有非 GET 的請求 (如 Firebase 的資料寫入、身分驗證 POST 請求)
  if (event.request.method !== 'GET') {
      return;
  }

  const url = new URL(event.request.url);
  
  // 2. 終極白名單：若不是當前網域 (abrakai.github.io)，代表是外部 API (Firebase, Moedict, Gemini 等)
  // 絕對不攔截，直接交由瀏覽器原生網路處理！
  if (url.origin !== self.location.origin) {
      return; 
  }

  // 3. 改為「網路優先 (Network First)」策略：確保每次都優先抓取最新網頁，斷網時才退回快取
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => {
         // 斷線時，回傳快取檔案
         return caches.match(event.request);
      }) 
  );
});