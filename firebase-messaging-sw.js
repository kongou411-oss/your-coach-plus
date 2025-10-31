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

// バックグラウンド通知チェッカー（30秒ごと）
let notificationCheckInterval;

function startBackgroundNotificationChecker() {
  if (notificationCheckInterval) {
    clearInterval(notificationCheckInterval);
  }

  console.log('[firebase-messaging-sw.js] Background notification checker started');

  // 初回チェック
  checkScheduledNotifications();

  // 30秒ごとにチェック
  notificationCheckInterval = setInterval(() => {
    checkScheduledNotifications();
  }, 30000);
}

async function checkScheduledNotifications() {
  try {
    console.log('[SW] Checking scheduled notifications...');

    // LocalStorageはService Workerで使えないため、IndexedDBまたはCache APIを使用
    // ここでは簡易的に、メインスレッドに通知チェックを依頼
    const allClients = await clients.matchAll({ includeUncontrolled: true });

    if (allClients.length === 0) {
      // タブが開いていない場合、IndexedDBから直接読み取り
      await checkNotificationsFromStorage();
    } else {
      // タブが開いている場合はメインスレッドに依頼
      allClients.forEach(client => {
        client.postMessage({
          type: 'CHECK_NOTIFICATIONS'
        });
      });
    }
  } catch (error) {
    console.error('[SW] Error checking notifications:', error);
  }
}

async function checkNotificationsFromStorage() {
  try {
    // IndexedDBから通知スケジュールを取得
    const db = await openDatabase();
    const schedules = await getNotificationSchedules(db);

    if (!schedules || schedules.length === 0) {
      return;
    }

    const now = new Date();
    const currentTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

    // 今日表示済みの通知を取得
    const shownNotifications = await getShownNotifications(db, today) || [];

    for (const schedule of schedules) {
      const notificationId = schedule.type + '_' + schedule.time;

      if (shownNotifications.includes(notificationId)) {
        continue;
      }

      const [scheduleHours, scheduleMinutes] = schedule.time.split(':').map(Number);
      const scheduledTime = scheduleHours * 60 + scheduleMinutes;
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      if (Math.abs(scheduledTime - currentMinutes) <= 1) {
        // 通知を表示
        await self.registration.showNotification(schedule.title, {
          body: schedule.body,
          icon: '/icons/icon-192.png',
          tag: schedule.type,
          requireInteraction: false
        });

        // 表示済みとしてマーク
        shownNotifications.push(notificationId);
        await saveShownNotifications(db, today, shownNotifications);

        console.log('[SW] Notification shown:', schedule);
      }
    }
  } catch (error) {
    console.error('[SW] Error checking from storage:', error);
  }
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('YourCoachNotifications', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('schedules')) {
        db.createObjectStore('schedules');
      }
      if (!db.objectStoreNames.contains('shown')) {
        db.createObjectStore('shown');
      }
    };
  });
}

function getNotificationSchedules(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['schedules'], 'readonly');
    const store = transaction.objectStore('schedules');
    const request = store.get('dev-user-001');

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getShownNotifications(db, date) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['shown'], 'readonly');
    const store = transaction.objectStore('shown');
    const request = store.get('dev-user-001_' + date);

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function saveShownNotifications(db, date, shown) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['shown'], 'readwrite');
    const store = transaction.objectStore('shown');
    const request = store.put(shown, 'dev-user-001_' + date);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Service Worker起動時にチェッカー開始
startBackgroundNotificationChecker();
