# デバッグツール

## ログイン機能のテスト

### 方法1: DEV_MODEを一時的にオフにする

1. `config.js` を編集：
```javascript
const DEV_MODE = false;  // true → false に変更
```

2. ページをリロード（Ctrl+R または F5）

3. ログイン画面が表示されます

**注意**: Firebase Authenticationを使用するため、インターネット接続が必要です。

---

## 通知機能のデバッグ

### ブラウザコンソールでのデバッグコマンド

ブラウザのDevTools（F12）→ Console タブで以下を実行：

#### 1. 通知スケジュールを確認
```javascript
// 保存されている通知スケジュールを表示
const schedules = localStorage.getItem('notificationSchedules_dev-user-001');
console.log('Notification Schedules:', JSON.parse(schedules));
```

#### 2. 通知権限を確認
```javascript
console.log('Notification Permission:', Notification.permission);
```

#### 3. 通知チェッカーの状態を確認
```javascript
console.log('Notification Checker Running:', window.notificationCheckInterval !== undefined);
```

#### 4. 手動で通知をテスト
```javascript
// 即座に通知を表示
new Notification('テスト通知', {
    body: 'これはテスト通知です',
    icon: '/icons/icon-192.png'
});
```

#### 5. 通知チェッカーを手動起動
```javascript
NotificationService.startNotificationChecker('dev-user-001');
```

#### 6. 通知スケジュールを手動で確認
```javascript
NotificationService.checkAndShowScheduledNotifications('dev-user-001');
```

#### 7. 通知スケジュールを手動で作成（テスト用）
```javascript
// 現在時刻の1分後に通知を設定
const now = new Date();
const testTime = new Date(now.getTime() + 60000); // 1分後
const timeStr = testTime.getHours().toString().padStart(2, '0') + ':' +
                testTime.getMinutes().toString().padStart(2, '0');

const testSchedule = [{
    type: 'test',
    time: timeStr,
    enabled: true,
    title: 'テスト通知',
    body: '1分後の通知テストです'
}];

localStorage.setItem('notificationSchedules_dev-user-001', JSON.stringify(testSchedule));
console.log('テスト通知を設定しました:', timeStr);

// チェッカーを再起動
NotificationService.stopNotificationChecker();
NotificationService.startNotificationChecker('dev-user-001');
```

#### 8. 今日表示された通知をクリア（再テスト用）
```javascript
const today = new Date();
const dateStr = today.getFullYear() + '-' +
                String(today.getMonth() + 1).padStart(2, '0') + '-' +
                String(today.getDate()).padStart(2, '0');
localStorage.removeItem('notificationsShown_dev-user-001_' + dateStr);
console.log('表示済み通知をクリアしました');
```

---

## LocalStorageの確認方法

### DevToolsで確認
1. F12でDevToolsを開く
2. **Application** タブをクリック
3. 左側のメニューから **Local Storage** → **http://localhost:8080** を展開
4. 以下のキーを確認：
   - `notificationSchedules_dev-user-001`: 通知スケジュール
   - `notificationsShown_dev-user-001_YYYY-MM-DD`: 今日表示済みの通知
   - `fcmToken_dev-user-001`: FCMトークン（DEV_MODE）

### コンソールで全てのLocalStorageを表示
```javascript
// 通知関連のLocalStorageを全て表示
Object.keys(localStorage)
    .filter(key => key.includes('notification'))
    .forEach(key => {
        console.log(key + ':', localStorage.getItem(key));
    });
```

---

## よくある問題と解決方法

### 通知が表示されない場合

#### チェック1: 通知権限
```javascript
if (Notification.permission !== 'granted') {
    console.error('通知権限が許可されていません');
    Notification.requestPermission();
}
```

#### チェック2: 通知スケジュールの存在
```javascript
const schedules = localStorage.getItem('notificationSchedules_dev-user-001');
if (!schedules) {
    console.error('通知スケジュールが保存されていません');
} else {
    console.log('スケジュール数:', JSON.parse(schedules).length);
}
```

#### チェック3: 通知チェッカーの稼働
```javascript
if (!window.notificationCheckInterval) {
    console.error('通知チェッカーが起動していません');
    NotificationService.startNotificationChecker('dev-user-001');
}
```

#### チェック4: 現在時刻と通知時刻の確認
```javascript
const now = new Date();
const currentTime = now.getHours().toString().padStart(2, '0') + ':' +
                    now.getMinutes().toString().padStart(2, '0');
console.log('現在時刻:', currentTime);

const schedules = JSON.parse(localStorage.getItem('notificationSchedules_dev-user-001') || '[]');
schedules.forEach(s => {
    console.log('スケジュール:', s.type, 'at', s.time);
});
```

---

## DEV_PREMIUM_MODEの切り替え

### クレジット消費をスキップ
```javascript
localStorage.setItem('DEV_PREMIUM_MODE', 'true');
console.log('DEV_PREMIUM_MODE: ON');
// ページをリロード
location.reload();
```

### 通常モード（クレジット消費あり）
```javascript
localStorage.removeItem('DEV_PREMIUM_MODE');
console.log('DEV_PREMIUM_MODE: OFF');
// ページをリロード
location.reload();
```

---

## クレジット手動追加

```javascript
// 100クレジット追加
ExperienceService.addFreeCredits('dev-user-001', 100).then(result => {
    console.log('クレジット追加結果:', result);
});
```

---

## 使用日数の変更（機能開放テスト用）

```javascript
// 7日目に設定（「破」段階、履歴機能開放）
localStorage.setItem('yourCoachBeta_usageDays', '7');
location.reload();

// 21日目に設定（「離」段階）
localStorage.setItem('yourCoachBeta_usageDays', '21');
location.reload();
```

---

## 全データのリセット

```javascript
// 警告: 全てのデータが削除されます
if (confirm('全てのデータを削除しますか？')) {
    localStorage.clear();
    location.reload();
}
```
