# 通知重複の確認方法

ブラウザのコンソールで以下を実行してください：

```javascript
// 1. Service Workerの数を確認
navigator.serviceWorker.getRegistrations().then(registrations => {
    console.log('Service Workers:', registrations.length);
    registrations.forEach((reg, i) => {
        console.log(`SW ${i}:`, reg.active?.scriptURL);
    });
});

// 2. フォアグラウンドリスナーが複数回登録されていないか確認
// services.js の setupForegroundListener が複数回呼ばれている可能性

// 3. 通知が来た時のログを確認
// [Notification] Foreground message received が2回出ていないか
```

## 対策

もし Service Worker が複数登録されている場合：

```javascript
// 古い Service Worker を削除
navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => reg.unregister());
}).then(() => {
    console.log('全てのService Workerを削除しました。ページをリロードしてください。');
});
```
