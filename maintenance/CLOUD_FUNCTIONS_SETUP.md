# Cloud Functions セットアップガイド

## 概要

Firebase Cloud Functionsを使用して、以下の機能をサーバーサイドで実装しています：

1. **Gemini API呼び出し** - クライアントからAPIキーを隠蔽
2. **スケジュール通知送信** - 定期的に通知をチェックして送信
3. **管理者機能** - ユーザー管理とクレジット付与

---

## 初期セットアップ

### 1. 依存関係のインストール

```bash
cd functions
npm install
```

### 2. 環境変数の設定

Firebase Cloud Functionsで環境変数を設定：

```bash
# Gemini API Key
firebase functions:config:set gemini.api_key="YOUR_GEMINI_API_KEY"

# Admin Password
firebase functions:config:set admin.password="YOUR_ADMIN_PASSWORD"
```

### 3. ローカル開発環境

ローカルでテストする場合は、`.runtimeconfig.json` を作成：

```bash
cd functions
firebase functions:config:get > .runtimeconfig.json
```

**注意**: `.runtimeconfig.json` は `.gitignore` に含めてください！

### 4. デプロイ

```bash
# すべてのFunctionsをデプロイ
firebase deploy --only functions

# 特定のFunctionのみデプロイ
firebase deploy --only functions:callGemini
```

---

## 実装されたFunctions

### 1. callGemini (呼び出し可能関数)

Gemini APIを呼び出してAI分析を実行します。

**呼び出し方法（クライアント側）:**

```javascript
const functions = firebase.functions();
const callGemini = functions.httpsCallable('callGemini');

try {
  const result = await callGemini({
    userId: 'user-id',
    message: 'ユーザーのメッセージ',
    conversationHistory: [
      { role: 'user', content: '前のメッセージ' },
      { role: 'model', content: 'AIの返答' }
    ],
    model: 'gemini-2.0-flash-exp'
  });

  console.log('AI Response:', result.data.response);
  console.log('Remaining Credits:', result.data.remainingCredits);
} catch (error) {
  console.error('Error:', error.message);
}
```

**セキュリティ:**
- ユーザー認証が必須
- 自分のユーザーIDのみ指定可能
- クレジット残高を自動チェック
- APIキーはサーバーサイドで管理

### 2. sendScheduledNotifications (スケジュール関数)

1分ごとに実行され、各ユーザーの通知スケジュールをチェックして通知を送信します。

**自動実行:**
- Cloud Schedulerが1分ごとに実行
- ユーザーの通知設定に基づいて送信
- 1日1回のみ送信（重複防止）

**動作:**
1. 全ユーザーの `notificationSchedules` をチェック
2. 現在時刻（±1分）に該当する通知を抽出
3. FCMトークンを取得して通知送信
4. `notificationsSent` コレクションに記録

### 3. adminGetUser (管理者関数)

管理者がユーザー情報を取得します。

**呼び出し方法:**

```javascript
const adminGetUser = functions.httpsCallable('adminGetUser');

const result = await adminGetUser({
  targetUserId: 'user-id',
  adminPassword: 'YOUR_ADMIN_PASSWORD'
});

console.log('User Data:', result.data.user);
```

### 4. adminAddCredits (管理者関数)

管理者がユーザーにクレジットを追加します。

**呼び出し方法:**

```javascript
const adminAddCredits = functions.httpsCallable('adminAddCredits');

const result = await adminAddCredits({
  targetUserId: 'user-id',
  amount: 100,
  type: 'free', // 'free' または 'paid'
  adminPassword: 'YOUR_ADMIN_PASSWORD'
});

console.log('New Balance:', result.data.newBalance);
```

---

## クライアント側の移行

### Gemini API呼び出しの移行

**変更前（クライアント側）:**
```javascript
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY); // APIキーが露出
const model = genAI.getGenerativeModel({model: "gemini-2.0-flash-exp"});
const result = await model.generateContent(prompt);
```

**変更後（Cloud Functions経由）:**
```javascript
const functions = firebase.functions();
const callGemini = functions.httpsCallable('callGemini');
const result = await callGemini({
  userId: userId,
  message: prompt,
  conversationHistory: history
});
```

### services.js の更新

`GeminiAPI.callGeminiWithCredit()` を以下のように更新：

```javascript
callGeminiWithCredit: async (userId, message, conversationHistory = [], userProfile = null, model = 'gemini-2.0-flash-exp') => {
  try {
    // DEV_MODEの場合は従来通りクライアント側で実行
    if (DEV_MODE) {
      // 既存のコード...
    } else {
      // 本番環境: Cloud Functions経由
      const functions = firebase.functions();
      const callGemini = functions.httpsCallable('callGemini');

      const result = await callGemini({
        userId: userId,
        message: message,
        conversationHistory: conversationHistory,
        model: model
      });

      if (result.data.success) {
        return {
          success: true,
          response: result.data.response,
          remainingCredits: result.data.remainingCredits
        };
      } else {
        throw new Error(result.data.error);
      }
    }
  } catch (error) {
    console.error('[GeminiAPI] Error:', error);
    return {
      success: false,
      error: error.message,
      noCredits: error.message.includes('クレジット')
    };
  }
}
```

---

## スケジュール通知の有効化

### Cloud Scheduler の設定

Firebase Consoleで以下を確認：

1. **Cloud Scheduler API を有効化**
   - https://console.cloud.google.com/cloudscheduler
   - 「APIを有効にする」をクリック

2. **関数のデプロイ**
   ```bash
   firebase deploy --only functions:sendScheduledNotifications
   ```

3. **動作確認**
   - Firebase Console → Functions → sendScheduledNotifications
   - ログで実行履歴を確認

### クライアント側の変更

`NotificationService.startNotificationChecker()` を以下のように変更：

```javascript
startNotificationChecker: (userId) => {
  if (DEV_MODE) {
    // DEV_MODE: クライアント側でチェック（既存のコード）
    // ...
  } else {
    // 本番環境: Cloud Functionsが自動実行
    console.log('[Notification] Notifications are handled by Cloud Functions');
    // クライアント側のチェッカーは不要
  }
}
```

---

## コスト管理

### Cloud Functions の料金

- **無料枠**: 月2百万回の呼び出し、40万GB秒のコンピューティング時間
- **スケジュール通知**: 1分ごと = 月43,200回（無料枠内）
- **Gemini API**: 従量課金（Google AI Studioの料金）

### コスト最適化

1. **Functionsのメモリを最適化**
   ```javascript
   exports.callGemini = onCall({
     memory: "256MB", // デフォルトは256MB
     timeoutSeconds: 60
   }, ...);
   ```

2. **スケジュール間隔を調整**
   ```javascript
   schedule: "every 5 minutes" // 1分 → 5分に変更
   ```

3. **アラートの設定**
   - Cloud Consoleで予算アラートを設定
   - 想定外の課金を防ぐ

---

## トラブルシューティング

### 環境変数が読み込まれない

```bash
# 現在の設定を確認
firebase functions:config:get

# 設定を再デプロイ
firebase deploy --only functions
```

### ローカルでテストできない

```bash
# Firebase Emulator を起動
firebase emulators:start --only functions

# 別のターミナルでテスト
curl http://localhost:5001/your-coach-plus/asia-northeast1/callGemini
```

### 通知が送信されない

1. **Cloud Scheduler が有効か確認**
   - https://console.cloud.google.com/cloudscheduler

2. **ログを確認**
   ```bash
   firebase functions:log --only sendScheduledNotifications
   ```

3. **FCMトークンが保存されているか確認**
   - Firestore → users → [userId] → tokens

---

## セキュリティ

### 実装されているセキュリティ対策

✅ Firebase Authentication による認証
✅ ユーザーIDの検証（自分のデータのみアクセス可能）
✅ 管理者パスワードによる管理機能の保護
✅ APIキーのサーバーサイド管理
✅ Firestore Security Rules

### 今後の改善案

- [ ] Firebase App Check の統合
- [ ] レート制限の実装
- [ ] 監査ログの記録
- [ ] IP制限（管理者機能）

---

## 次のステップ

1. ✅ Cloud Functions のセットアップ
2. ⬜ 環境変数の設定
3. ⬜ 依存関係のインストール
4. ⬜ テスト環境でデプロイ
5. ⬜ クライアント側コードの移行
6. ⬜ 本番環境へのデプロイ

詳細は `IMPLEMENTATION_SUMMARY.md` を参照してください。
