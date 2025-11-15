// Your Coach+ Service Worker
// PWA対応 + Network First戦略 + 自動バージョン管理

// キャッシュ名にタイムスタンプを含めて毎回デプロイ時に新しいキャッシュを作成
// 強制キャッシュクリア: 2025-11-15 15:36 (8軸スコア修正)
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
    return event.respondWith(
      fetch(event.request).catch((error) => {
        console.error('[SW] Firebase API fetch failed:', error);
        // Firebase APIのエラーは伝播させる
        return new Response(JSON.stringify({ error: 'Network request failed' }), {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
  }

  // Network First: ネットワーク優先、オフライン時のみキャッシュ
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // ネットワークから取得成功
        // レスポンスが有効な場合のみキャッシュに保存
        if (response && response.ok && response.status === 200) {
          // response.typeをチェック（basic, cors, opaqueなど）
          if (response.type === 'basic' || response.type === 'cors') {
            try {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                })
                .catch((cacheError) => {
                  console.warn('[SW] Cache put failed:', cacheError);
                });
            } catch (cloneError) {
              console.warn('[SW] Response clone failed:', cloneError);
            }
          }
        }
        return response;
      })
      .catch((error) => {
        // ネットワークエラー（オフライン）時のみキャッシュから取得
        console.log('[SW] Network failed, trying cache:', event.request.url, error);
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[SW] Serving from cache:', event.request.url);
              return cachedResponse;
            }
            // キャッシュにもない場合はオフラインページを返す
            console.warn('[SW] No cache available for:', event.request.url);
            // ナビゲーションリクエストの場合はindex.htmlを返す
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            // その他のリクエストはエラーレスポンスを返す
            return new Response('Offline - Resource not available', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain' }
            });
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
