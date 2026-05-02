const CACHE_NAME = 'abra-learn-tw-v3';
const urlsToCache = [
  './',
  './index.html',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/hanzi-writer@3.5/dist/hanzi-writer.min.js',
  'https://unpkg.com/@phosphor-icons/web',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&display=swap'
];

self.addEventListener('install', event => {
  // 1. 強制接管：跳過等待，立即啟動並安裝新的 Service Worker
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.all(urlsToCache.map(url => {
        // 使用 reload 強制繞過瀏覽器 HTTP 快取，抓取 GitHub 上的最新檔案，徹底消滅幽靈快取
        return fetch(url, { cache: 'reload' }).then(response => {
          if (response.ok) {
            return cache.put(url, response);
          }
        }).catch(err => console.warn('Cache fetch failed:', url, err));
      }));
    })
  );
});

self.addEventListener('activate', event => {
  // 2. 啟動階段：接管所有客戶端頁面，並徹底清除舊版 (v1, v2) 的快取
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

  // 2. 徹底放行 Firebase Firestore、Google API 與底層腳本，確保計數器與 AI 翻譯不被阻擋
  const url = new URL(event.request.url);
  if (url.hostname.includes('firestore.googleapis.com') || 
      url.hostname.includes('generativelanguage.googleapis.com') ||
      url.hostname.includes('identitytoolkit.googleapis.com') ||
      url.hostname.includes('firebase') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('gstatic.com')) {
      return; // 直接交給瀏覽器原生網路處理，完全不攔截
  }

  // 3. 改為「網路優先 (Network First)」策略：確保每次都抓取最新網頁
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 如果網路請求成功，將最新版存入快取後回傳給網頁
        if (response && response.status === 200 && response.type === 'basic') {
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