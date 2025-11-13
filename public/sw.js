// Your Coach+ Service Worker
// PWA対応 + Network First戦略 + 自動バージョン管理

// キャッシュ名にタイムスタンプを含めて毎回デプロイ時に新しいキャッシュを作成
const CACHE_VERSION = 'v' + Date.now();
const CACHE_NAME = 'yourcoach-' + CACHE_VERSION;

// 最小限のキャッシュ対象（HTML、マニフェストのみ）
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Firestore APIはキャッシュしない
const shouldNotCache = (url) => {
  return url.includes('firestore.googleapis.com') ||
         url.includes('firebase.googleapis.com') ||
         url.includes('firebasestorage.googleapis.com');
};

// インストール時
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker... Cache:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('[SW] Cache installation failed:', error);
      })
  );
  // 新しいService Workerを即座にアクティブ化
  self.skipWaiting();
});

// アクティベーション時：古いキャッシュを削除
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker... New cache:', CACHE_NAME);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // yourcoach-で始まるキャッシュで、現在のキャッシュ名と異なるものを削除
          if (cacheName.startsWith('yourcoach-') && cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // すべてのクライアントを即座に制御下に置く
  return self.clients.claim();
});

// フェッチイベント：Network First戦略（オフライン時のみキャッシュ）
self.addEventListener('fetch', (event) => {
  // Firestore APIはキャッシュしない（常にネットワークから取得）
  if (shouldNotCache(event.request.url)) {
    return event.respondWith(fetch(event.request));
  }

  // Network First: ネットワーク優先、オフライン時のみキャッシュ
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // ネットワークから取得成功
        // レスポンスが有効な場合、キャッシュに保存
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
        }
        return response;
      })
      .catch((error) => {
        // ネットワークエラー（オフライン）時のみキャッシュから取得
        console.log('[SW] Network failed, trying cache:', event.request.url);
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[SW] Serving from cache:', event.request.url);
              return cachedResponse;
            }
            // キャッシュにもない場合はエラーをスロー
            throw error;
          });
      })
  );
});

// Service Workerのメッセージハンドラ（更新通知用）
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skipping waiting on user request');
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker loaded. Cache version:', CACHE_VERSION);
