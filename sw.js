const CACHE_NAME = 'abra-learn-tw-v4';
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
  // 啟動階段：接管所有客戶端頁面，並徹底清除舊版 (v1, v2, v3 等) 的快取
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => { if (key !== CACHE_NAME) return caches.delete(key); })
    )).then(() => self.clients.claim()) 
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // 終極解法：只攔截「同網域」的靜態資源，所有外部 API (Firebase, Moedict, Google) 全部直接放行！
  if (url.origin !== self.location.origin) {
      return; 
  }
  if (event.request.method !== 'GET') return;

  // 改為「網路優先 (Network First)」策略：確保每次都優先抓取最新網頁，斷網時才退回快取
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