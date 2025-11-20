// ===== Firebase Cloud Messaging Service Worker =====
// バックグラウンド通知を受信するためのService Worker

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase設定（config.jsから取得できないため、ここに直接記載）
const firebaseConfig = {
    apiKey: "AIzaSyCEjjDWZW2X6oM0wNLiQEPp6tGC3m9I4_I",
    authDomain: "your-coach-plus.firebaseapp.com",
    projectId: "your-coach-plus",
    storageBucket: "your-coach-plus.firebasestorage.app",
    messagingSenderId: "654534642431",
    appId: "1:654534642431:web:4eb24b2cc84dbdd39e6bb2",
    measurementId: "G-1NLXFYDCJF"
};

// Firebase初期化
firebase.initializeApp(firebaseConfig);

// Messagingインスタンスを取得
const messaging = firebase.messaging();

// バックグラウンド通知を受信
messaging.onBackgroundMessage(async (payload) => {
    console.log('[firebase-messaging-sw.js] バックグラウンド通知受信:', payload);

    // フォアグラウンド時（ページが開いている時）は通知を表示しない
    // onMessageハンドラが処理するため
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const hasVisibleClient = clients.some(client => client.visibilityState === 'visible');

    if (hasVisibleClient) {
        console.log('[firebase-messaging-sw.js] ページが開いているため、Service Workerは通知をスキップ');
        return; // 通知を表示しない
    }

    console.log('[firebase-messaging-sw.js] バックグラウンド時のため、Service Workerが通知を表示');

    const notificationTitle = payload.notification?.title || 'Your Coach+';
    const notificationBody = payload.notification?.body || '新しい通知があります';

    // タグをタイトル+タイプで固定（重複防止）
    // 同じタイプの同じタイトルの通知のみ統合（異なる時刻の通知は別々に表示）
    const notificationType = payload.data?.type || 'notification';
    const notificationTag = `${notificationTitle}-${notificationType}`;

    const notificationOptions = {
        body: notificationBody,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        vibrate: [200, 100, 200],
        tag: notificationTag,
        requireInteraction: true,
        renotify: true,
        data: {
            url: payload.data?.url || '/',
            ...payload.data
        },
        actions: [
            { action: 'open', title: '開く', icon: '/icons/icon-72.png' },
            { action: 'close', title: '閉じる' }
        ]
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// 通知クリック時の処理
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] 通知クリック:', event);

    event.notification.close();

    if (event.action === 'open') {
        const urlToOpen = event.notification.data?.url || '/';
        event.waitUntil(
            clients.openWindow(urlToOpen)
        );
    }
    // 'close' アクションの場合は何もしない
});
