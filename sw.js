const CACHE_NAME = 'abra-learn-tw-v2';
const urlsToCache = [
  './',
  './index.html',
  './index1.html', // 確保測試檔也被快取
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/hanzi-writer@3.5/dist/hanzi-writer.min.js',
  'https://unpkg.com/@phosphor-icons/web',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&display=swap'
];

self.addEventListener('install', event => {
  // 1. 強制接管：跳過等待，立即啟動並安裝新的 Service Worker
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  // 2. 強制接管：接管所有客戶端頁面，並徹底清除舊版 (v1) 的幽靈快取
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // 1. 放行所有非 GET 的請求 (如 Firebase 的資料寫入、身分驗證 POST 請求)
  if (event.request.method !== 'GET') return;

  // 2. 放行 Firebase Firestore 與 Google API 相關請求，確保計數器與 AI 翻譯不被阻擋
  const url = new URL(event.request.url);
  if (url.hostname.includes('firestore.googleapis.com') || 
      url.hostname.includes('generativelanguage.googleapis.com') ||
      url.hostname.includes('identitytoolkit.googleapis.com') ||
      url.hostname.includes('firebase')) {
      return; // 直接交給瀏覽器原生網路處理，不攔截
  }

  // 3. 改為「網路優先 (Network First)」策略：確保每次都抓取最新網頁
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 如果網路請求成功，將最新版存入快取後回傳給網頁
        if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        // 只有在真正「網路斷線」發生 catch 錯誤時，才退而求其次使用本地舊快取 (維持 PWA 離線秒開)
        return caches.match(event.request);
      })
  );
});