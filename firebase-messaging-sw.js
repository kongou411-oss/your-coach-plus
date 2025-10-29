// Firebase Messaging Service Worker
// バックグラウンド通知を処理

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase設定（config.jsと同じ設定を使用）
// 注意: 本番環境ではFirebase Consoleの設定を使用してください
firebase.initializeApp({
  apiKey: "AIzaSyDtdRgSvHeFgWQczUH9o_8MRnZqNGn9eBw",
  authDomain: "yourcoach-c1f28.firebaseapp.com",
  projectId: "yourcoach-c1f28",
  storageBucket: "yourcoach-c1f28.firebasestorage.app",
  messagingSenderId: "366193088662",
  appId: "1:366193088662:web:4eb24b2cc84dbdd39e6bb2"
});

const messaging = firebase.messaging();

// バックグラウンド通知を受信した時の処理
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] バックグラウンド通知受信:', payload);

  const notificationTitle = payload.notification?.title || 'Your Coach+';
  const notificationOptions = {
    body: payload.notification?.body || '新しい通知があります',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [200, 100, 200],
    tag: payload.data?.tag || 'default',
    requireInteraction: false,
    data: {
      url: payload.data?.url || '/',
      ...payload.data
    },
    actions: [
      {
        action: 'open',
        title: '開く',
        icon: '/icons/icon-72.png'
      },
      {
        action: 'close',
        title: '閉じる'
      }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// 通知をクリックした時の処理
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] 通知クリック:', event);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // 通知をクリックしたらアプリを開く
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 既に開いているウィンドウがあればフォーカス
        for (let client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // なければ新しいウィンドウを開く
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Service Workerのインストール
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service Workerインストール');
  self.skipWaiting();
});

// Service Workerのアクティベーション
self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service Workerアクティベート');
  event.waitUntil(clients.claim());
});
