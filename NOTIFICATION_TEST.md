# 通知機能テストコマンド集

## 🎉 修正完了事項

### トークン上書き問題の修正（2025-11-10）
- **問題**: 設定画面で通知時刻を変更すると、FCMトークンが古い値で上書きされていた
- **原因**: `handleNotificationSettingChange`が`onUpdateProfile`でプロファイル全体を保存していた
- **修正**: 通知設定のみを個別にFirestoreに保存するように変更（`src/components/04_settings.jsx` Line 220-242）
- **結果**: 設定変更してもFCMトークンが保護されるようになった

---

## 1. 現在のFCMトークンを確認

```javascript
const userId = firebase.auth().currentUser.uid;
const doc = await firebase.firestore().collection('users').doc(userId).get();
console.log('Current fcmToken:', doc.data().fcmToken);
console.log('Token length:', doc.data().fcmToken?.length);
```

---

## 2. 本番環境の新しいトークンを取得・保存

```javascript
const messaging = firebase.messaging();
const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
const newToken = await messaging.getToken({
  vapidKey: 'BIifQg3P5w9Eb4JU4EDqx7bbNeAhveYPK2GCeEyi28A6-y04sm11TASGWBoI0Enewki1f7PFvQ6KjsQb5J5EMXU',
  serviceWorkerRegistration: registration
});
console.log('New FCM Token:', newToken);
console.log('Token length:', newToken.length);

const userId = firebase.auth().currentUser.uid;
await firebase.firestore().collection('users').doc(userId).set({
  fcmToken: newToken,
  fcmTokenUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
}, { merge: true });
console.log('Token saved successfully');
```

---

## 3. 通知スケジュールを確認

```javascript
const userId = firebase.auth().currentUser.uid;
const doc = await firebase.firestore().collection('users').doc(userId).get();
const schedules = doc.data().notificationSchedules;
console.log('Schedules:', JSON.stringify(schedules, null, 2));
```

---

## 4. テスト通知を送信（90秒後）

```javascript
const userId = firebase.auth().currentUser.uid;
const today = new Date().toLocaleDateString('ja-JP', {timeZone: 'Asia/Tokyo'}).split('/').map((v, i) => i === 0 ? v : v.padStart(2, '0')).join('-');
await firebase.firestore().collection('notificationsSent').doc(`${userId}_${today}`).delete();

const now = new Date();
const jstNow = new Date(now.toLocaleString('en-US', {timeZone: 'Asia/Tokyo'}));
const nextMinute = new Date(jstNow.getTime() + 90000);
const testTime = `${String(nextMinute.getHours()).padStart(2, '0')}:${String(nextMinute.getMinutes()).padStart(2, '0')}`;

await firebase.firestore().collection('users').doc(userId).update({
  notificationSchedules: [{
    type: 'workout',
    time: testTime,
    enabled: true,
    title: 'トレーニングの時間',
    body: '今日のトレーニングを始めましょう！'
  }]
});

console.log('テスト通知:', testTime, '（ブラウザ最小化推奨）');
```

---

## 5. Service Workerを再起動

```javascript
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
  console.log('Service Workers unregistered');
  setTimeout(() => location.reload(), 1000);
});
```

---

## 6. 送信済みマークを削除

```javascript
const today = new Date().toLocaleDateString('ja-JP', {timeZone: 'Asia/Tokyo'}).split('/').map((v, i) => i === 0 ? v : v.padStart(2, '0')).join('-');
const userId = firebase.auth().currentUser.uid;
await firebase.firestore().collection('notificationsSent').doc(`${userId}_${today}`).delete();
console.log('送信済みマーク削除完了');
```

---

## 7. 手動でテスト通知を表示

```javascript
new Notification('テスト通知', {
  body: 'これはテスト通知です',
  icon: '/icons/icon-192.png'
});
```

---

## トラブルシューティング

### トークンが古い場合
1. 手順2で新しいトークンを取得
2. 手順4でテスト通知を送信

### 通知が届かない場合
1. 手順1でトークンを確認（142文字程度が正常）
2. 手順3でスケジュールを確認（enabled: trueか確認）
3. Cloud Functionsのログを確認：`firebase functions:log --only sendScheduledNotifications`

### ポップアップが表示されない場合
- Windows設定 → システム → 通知 → Google Chrome → 通知バナーを表示する
- Chrome設定 → プライバシーとセキュリティ → サイトの設定 → 通知 → your-coach-plus.web.app を許可

---

## 重要な注意点

- **ローカル環境（localhost:8000）と本番環境（your-coach-plus.web.app）では異なるトークンが必要**
- **同じ通知は1日1回のみ送信される**（送信済みマークを削除すれば再送可能）
- **バックグラウンド通知（ブラウザ最小化時）のみ動作確認済み**
- **フォアグラウンド通知には別途 onMessage リスナーが必要**
