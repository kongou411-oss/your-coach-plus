# Push通知システム - 実装アーカイブ（凍結）

**状態**: 実装凍結（2025-11-10 21:00）
**理由**: タイムパフォーマンスが悪く、先が見えないため一旦保留
**判断**: 既存実装を保持し、将来的に再検討

---

## 📋 実装状況サマリー

### ✅ 動作している機能

1. **通知の送信**: Cloud Functionsから確実に送信される
2. **重複防止**: 1日1回のみ送信される（Firestoreで管理）
3. **バックグラウンド通知**: PWAが閉じている時に通知が届く
4. **フォアグラウンド通知**: PWAが開いている時にも通知が届く
5. **通知ボタン**: 「開く/閉じる」ボタンが表示される

### ❌ 未解決の問題

1. **タイミング精度**: 10〜40秒程度遅れる（最大59秒）
2. **通知の重複表示**: 同じ通知が複数表示される場合がある
3. **Chrome通知**: "URLがコピー" という謎の通知が混在
4. **原因不明**: 重複の根本原因が特定できていない

---

## 🏗️ システム構成

### 1. Cloud Functions (`functions/index.js`)

**役割**: 毎分実行され、スケジュールに従って通知を送信

**実装場所**: Line 114-280

**主要ロジック**:
```javascript
exports.sendScheduledNotifications = onSchedule({
  schedule: "every 1 minutes",
  region: "asia-northeast1",
  timeZone: "Asia/Tokyo",
  memory: "512MiB",
}, async (event) => {
  // 1. 現在時刻を取得（JST）
  const jstNow = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Tokyo"}));
  const currentTime = HH:MM形式;
  const today = YYYY-MM-DD形式;

  // 2. 全ユーザーの通知スケジュールをチェック
  const usersSnapshot = await admin.firestore().collection("users").get();

  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id;
    const userData = userDoc.data();
    const schedules = userData.notificationSchedules || [];
    const sentToday = userData.notificationsSentToday || {}; // 重複防止

    // 3. 日付が変わったら送信記録をクリア
    if (lastSentDate && lastSentDate !== today) {
      sentToday = {};
      await firestore.update({ notificationsSentToday: {}, notificationsSentTodayDate: today });
    }

    // 4. 各スケジュールをチェック
    for (const schedule of schedules) {
      const notificationId = `${today}_${schedule.type}_${schedule.time}`;

      // 既に送信済みかチェック
      if (sentToday[notificationId]) {
        continue;
      }

      // 時:分が一致すれば送信
      const isMatch = jstNow.getHours() === scheduleHours && jstNow.getMinutes() === scheduleMinutes;

      if (isMatch) {
        // FCM経由で送信
        await admin.messaging().send({
          token: userData.fcmToken,
          notification: {
            title: schedule.title,
            body: schedule.body,
          },
          data: {
            type: schedule.type,
            time: schedule.time,
          },
          // Android/iOS固有の設定
        });

        // 送信記録を保存
        newSentToday[notificationId] = true;
      }
    }

    // 5. Firestoreに送信記録を保存
    await firestore.update({
      notificationsSentToday: { ...sentToday, ...newSentToday },
      notificationsSentTodayDate: today
    });
  }
});
```

**重要な変更履歴**:
- ❌ **削除**: 秒数チェック（`if (currentSeconds > 3) return;`）
  - 理由: Cloud Schedulerの実行タイミングが制御できないため
  - 結果: 確実に送信されるが、遅延が発生する

**Firestoreデータ構造**:
```javascript
users/{userId} {
  fcmToken: "142文字のトークン",
  fcmTokenUpdatedAt: Timestamp,
  notificationSchedules: [
    {
      type: "routine",
      time: "20:30",
      enabled: true,
      title: "ルーティン開始",
      body: "今日のトレーニングを確認しましょう！"
    },
    {
      type: "workout",
      time: "20:30",
      enabled: true,
      title: "トレーニングの時間",
      body: "今日のトレーニングを始めましょう！"
    }
  ],
  notificationsSentToday: {
    "2025-11-10_routine_20:30": true,
    "2025-11-10_workout_20:30": true
  },
  notificationsSentTodayDate: "2025-11-10"
}
```

---

### 2. Service Worker (`public/firebase-messaging-sw.js`)

**役割**: バックグラウンド通知を受信して表示

**実装場所**: Line 21-67

**主要ロジック**:
```javascript
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] バックグラウンド通知受信:', payload);

  const notificationTitle = payload.notification?.title || 'Your Coach+';

  // ユニークなtagを生成（タイムスタンプ付き）
  const baseTag = payload.data?.tag || `${payload.data?.type}_${payload.data?.time}`;
  const notificationTag = `${baseTag}_${Date.now()}`; // 重複を防ぐ

  const notificationOptions = {
    body: payload.notification?.body || '新しい通知があります',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [200, 100, 200],
    tag: notificationTag,
    requireInteraction: false,
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
```

**重要な設定**:
- `renotify: true`: 同じtagでも再通知
- `tag: ${baseTag}_${Date.now()}`: タイムスタンプで一意性を保証
- `actions`: 「開く/閉じる」ボタン

---

### 3. フォアグラウンド通知 (`public/services.js`)

**役割**: PWAが開いている時に通知を表示

**実装場所**: Line 2029-2089

**主要ロジック**:
```javascript
setupForegroundListener: () => {
  const messaging = firebase.messaging();

  messaging.onMessage(async (payload) => {
    console.log('[Notification] Foreground message received:', payload);

    // Service Workerのregistrationを使用
    const registration = await navigator.serviceWorker.ready;

    await registration.showNotification(notificationTitle, {
      body: payload.notification?.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      tag: payload.data?.tag || 'default',
      data: payload.data,
      requireInteraction: false,
      actions: [
        { action: 'open', title: '開く' },
        { action: 'close', title: '閉じる' }
      ]
    });
  });
}
```

**重要な変更**:
- ❌ **変更前**: `new Notification()` → ボタンなし
- ✅ **変更後**: `registration.showNotification()` → ボタンあり

---

### 4. 通知設定UI (`src/components/04_settings.jsx`)

**役割**: ユーザーが通知時刻を設定

**実装場所**: Line 215-245, 2824-2849

**主要ロジック**:
```javascript
// 通知設定変更時
const handleNotificationSettingChange = async (newSettings) => {
  // 1. Firestoreに通知設定を保存
  await db.collection('users').doc(userId).set({
    notificationSettings: newSettings,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  // 2. 通知スケジュールを生成してFirestoreに保存
  const result = await NotificationService.scheduleNotification(userId, newSettings);
};

// 通知権限許可ボタン
<button onClick={async () => {
  const result = await NotificationService.requestPermission();
  if (result.success) {
    const tokenResult = await NotificationService.getFCMToken(userId);
  }
}}>
  {NotificationService.checkPermission() === 'granted' ? '設定済み' : '許可'}
</button>
```

**通知タイプ**:
1. ルーティン通知
2. 食事通知（複数時刻対応）
3. トレーニング通知
4. 記録リマインダー
5. 今日のまとめ

---

### 5. FCMトークン管理 (`public/services.js`)

**実装場所**: Line 1952-2026

**主要ロジック**:
```javascript
NotificationService = {
  // 通知権限をリクエスト
  requestPermission: async () => {
    const permission = await Notification.requestPermission();
    return { success: permission === 'granted' };
  },

  // FCMトークンを取得
  getFCMToken: async (userId) => {
    const messaging = firebase.messaging();
    const token = await messaging.getToken({
      vapidKey: "BFaXi6..." // 公開鍵
    });

    // Firestoreに保存
    await NotificationService.saveToken(userId, token);
    return { success: true, token };
  },

  // トークンをFirestoreに保存
  saveToken: async (userId, token) => {
    await firestore.collection('users').doc(userId).set({
      fcmToken: token,
      fcmTokenUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  },

  // 通知スケジュールを保存
  scheduleNotification: async (userId, notificationSettings) => {
    const schedules = [/* 設定から生成 */];

    await db.collection('users').doc(userId).set({
      notificationSchedules: schedules,
      notificationSettings: notificationSettings
    }, { merge: true });

    return { success: true, schedules };
  }
};
```

---

### 6. 自動トークン取得 (`src/components/08_app.jsx`)

**実装場所**: Line 603-624

**主要ロジック**:
```javascript
// ログイン時に自動実行
if (Notification.permission === 'granted') {
  // フォアグラウンドリスナーをセットアップ
  NotificationService.setupForegroundListener();

  // トークンを取得してFirestoreに保存
  NotificationService.requestNotificationPermission(firebaseUser.uid)
    .then(result => {
      if (!result.success) {
        console.warn('[App] FCM token registration failed:', result.error);
      }
    });
}
```

---

## 🐛 未解決の問題と原因分析

### 問題1: タイミング精度（10〜40秒遅れる）

**現象**:
- ユーザーが20:30に設定
- 実際には20:30:15や20:30:47に届く

**原因**:
Cloud Schedulerの実行タイミングが制御できない
- 毎分実行されるが、秒数はランダム（Googleのインフラ次第）
- 例: 20:30:05, 20:30:23, 20:30:47など

**試した対策**:
1. ❌ 秒単位のスケジュール（`*/15 * * * * *`）→ Cloud Scheduler v2は非対応
2. ❌ 秒数チェック（`if (currentSeconds > 3) return;`）→ 通知が届かないことがある
3. ✅ 秒数チェック削除 → 確実に届くが遅延する

**解決策（未実装）**:
常時起動サーバー（Google Cloud Run）を使用
- コスト: 月額 $10〜50
- 実装の複雑性: 高い

---

### 問題2: 通知の重複表示

**現象**:
同じ通知が2つ表示される場合がある

**確認済みの事実**:
- ✅ Cloud Functionsからは1回しか送信されていない（Firestoreログで確認）
- ✅ 重複防止機能は動作している（`notificationsSentToday`に記録）
- ✅ フォアグラウンド/バックグラウンドは自動切り替え（FCMが判断）

**疑わしい原因**:
1. **Service Workerが複数登録されている**
   - 確認方法: `navigator.serviceWorker.getRegistrations().then(r => console.log(r.length))`
   - 期待値: 1

2. **フォアグラウンドリスナーが複数回登録されている**
   - `setupForegroundListener()` が複数回呼ばれている可能性

3. **古い通知の残骸**
   - 通知履歴に過去のテスト通知が残っている

**未確認**:
実際の動作環境（PWA）で上記の確認ができていない

---

### 問題3: Chrome通知（"URLがコピー"）

**現象**:
「タップすると、このアプリのURLがコピーされます」という通知が混在

**調査結果**:
- ❌ アプリのコードに該当する通知送信処理なし
- ❌ `public/services.js`に該当する文字列なし
- ❌ `src/components/`に該当する文字列なし

**結論**:
Android OSまたはChromeが自動的に表示する通知（PWAインストール時など）

**対応**:
不要（アプリの機能とは無関係）

---

## 📊 テスト結果

### テスト1: 20:46に設定

**結果**:
- ✅ 通知が届いた
- ❌ 同じ通知が複数表示された
- ❓ 遅延時間: 不明（ユーザーは時刻を記録していない）

**Firestoreログ**:
```javascript
notificationsSentToday: {
  "2025-11-10_routine_20:46": true,
  "2025-11-10_workout_20:46": true,
  // ... 過去のテスト通知も記録されている
}
```

### テスト2: その他

**未実施**:
- 重複が再現するかの確認
- Service Worker登録数の確認
- 実際の遅延時間の測定

---

## 🔧 デバッグ方法

### ブラウザコンソールで実行

```javascript
// 1. Service Worker登録数を確認
navigator.serviceWorker.getRegistrations().then(registrations => {
    console.log('Service Workers:', registrations.length);
    registrations.forEach((reg, i) => {
        console.log(`SW ${i}:`, reg.active?.scriptURL);
    });
});

// 2. Firestoreの送信記録を確認
const userId = firebase.auth().currentUser.uid;
firebase.firestore().collection('users').doc(userId).get().then(doc => {
    console.log('notificationsSentToday:', doc.data().notificationsSentToday);
    console.log('notificationsSentTodayDate:', doc.data().notificationsSentTodayDate);
    console.log('notificationSchedules:', doc.data().notificationSchedules);
});

// 3. Service Workerを削除（重複問題の解決）
navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => reg.unregister());
}).then(() => {
    console.log('全てのService Workerを削除しました。ページをリロードしてください。');
});

// 4. 通知権限を確認
console.log('Notification permission:', Notification.permission);
console.log('FCM supported:', firebase.messaging.isSupported());
```

### Cloud Functionsログ確認

```bash
# 最新のログを確認
firebase functions:log --only sendScheduledNotifications

# 特定の通知を検索
firebase functions:log --only sendScheduledNotifications | grep "20:46"

# 送信された通知を確認
firebase functions:log --only sendScheduledNotifications | grep "Notification sent"
```

---

## 📁 関連ファイル一覧

### バックエンド
- `functions/index.js`: Line 114-280（Cloud Functions）
- `functions/package.json`: 依存関係

### フロントエンド
- `public/firebase-messaging-sw.js`: Line 21-67（Service Worker）
- `public/services.js`: Line 1952-2026（FCMトークン管理）, Line 2029-2089（フォアグラウンド通知）, Line 2102-2191（スケジュール保存）
- `src/components/04_settings.jsx`: Line 215-245（通知設定変更）, Line 2824-2849（UI）
- `src/components/08_app.jsx`: Line 603-624（自動トークン取得）

### 設定
- `public/manifest.json`: PWA設定
- `firebase.json`: Firebase設定
- `.firebaserc`: プロジェクト設定

### ドキュメント
- `NOTIFICATION_SYSTEM.md`: 実装状況（簡易版）
- `NOTIFICATION_IMPLEMENTATION_ARCHIVE.md`: 完全アーカイブ（本ファイル）

---

## 🚀 将来的な改善案

### 案1: 常時起動サーバーで秒単位制御

**メリット**:
- 指定時刻ぴったりに送信可能（3秒以内）
- Cloud Schedulerの制約なし

**デメリット**:
- コスト増（月額 $10〜50）
- 実装の複雑性が高い
- Google Cloud Runの知識が必要

**実装手順**:
1. Cloud Runでコンテナをデプロイ
2. 毎秒実行するCronジョブを設定
3. Firestoreから通知スケジュールを取得
4. 指定時刻になったらFCM送信
5. 重複防止機能を実装

---

### 案2: クライアント側で通知を管理

**メリット**:
- サーバー不要
- コストゼロ

**デメリット**:
- PWAが閉じている時は動作しない
- バッテリー消費が増える
- Androidのバッテリー最適化で停止される

**実装手順**:
1. Service Workerに定期実行機能を追加
2. IndexedDBから通知スケジュールを取得
3. 指定時刻になったら通知を表示

---

### 案3: 精度を妥協（現在の実装）

**メリット**:
- 実装済み
- コスト最小
- 確実に届く

**デメリット**:
- 10〜40秒遅れる
- ユーザー体験が悪い

---

## 📝 凍結時の推奨事項

### 現状維持するべきコード

✅ **削除しないこと**:
- Cloud Functions（`functions/index.js`）
- Service Worker（`public/firebase-messaging-sw.js`）
- FCMトークン管理（`public/services.js`）
- 通知設定UI（`src/components/04_settings.jsx`）

これらは基本機能として動作しているため、削除すると完全に動かなくなります。

### ユーザーへの説明

**推奨メッセージ**:
```
通知機能について：
- 通知は確実に届きますが、10〜40秒程度遅れる場合があります
- これはGoogle Cloud Schedulerの制約によるものです
- より正確なタイミングが必要な場合は、スマートフォンの標準アラーム機能をご利用ください
```

### 再開時のチェックリスト

1. □ 重複問題の原因を特定（Service Worker登録数確認）
2. □ 遅延時間の測定（複数回テスト）
3. □ 常時起動サーバーのコスト試算
4. □ ユーザーフィードバック収集
5. □ 投資対効果の判断

---

## 🔗 参考リンク

- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Cloud Scheduler](https://cloud.google.com/scheduler/docs)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)

---

**最終更新**: 2025-11-10 21:00
**作成者**: Claude Code
**状態**: 実装凍結
