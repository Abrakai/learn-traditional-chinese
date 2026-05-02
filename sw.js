const CACHE_NAME = 'abra-learn-tw-v1';
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
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
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

  // 3. 一般靜態資源與 UI 介面，執行原本的快取邏輯，確保 PWA 秒開與離線支援
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) { return response; }
        return fetch(event.request).catch(() => {
          // Offline fallback logic is handled directly in UI via window 'offline' event
        });
      })
  );
});