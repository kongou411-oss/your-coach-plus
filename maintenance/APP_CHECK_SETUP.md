# Firebase App Check セットアップガイド

## 概要

Firebase App Checkは、不正なクライアントからのAPIリクエストをブロックし、正規のアプリからのリクエストのみを受け付ける機能です。

**メリット:**
- ✅ 不正なAPIキーの使用を防止
- ✅ ボットや悪意あるクライアントをブロック
- ✅ Firebase サービス（Firestore, Storage, Cloud Functions）を保護

---

## セットアップ手順

### ステップ1: Firebase Consoleでの設定

1. **Firebase Console を開く**
   - https://console.firebase.google.com/project/your-coach-plus/appcheck

2. **App Check を有効化**
   - 「始める」をクリック

3. **reCAPTCHA v3 を登録**
   - Webアプリを選択
   - reCAPTCHA v3 サイトキーを取得

#### reCAPTCHA v3 サイトキーの取得

1. **Google reCAPTCHA 管理画面**
   - https://www.google.com/recaptcha/admin

2. **新しいサイトを登録**
   - ラベル: `Your Coach+ (Prod)`
   - reCAPTCHA type: **reCAPTCHA v3**
   - ドメイン:
     - `your-coach-plus.web.app`
     - `your-coach-plus.firebaseapp.com`
     - `localhost` (開発用)
   - 利用規約に同意

3. **サイトキーをコピー**
   - サイトキー: `6Lc...` (公開鍵)
   - シークレットキー: `6Lc...` (秘密鍵、Firebase Consoleで使用)

4. **Firebase Console に戻る**
   - App Check → Web アプリ → reCAPTCHA v3
   - サイトキーを入力
   - 「登録」をクリック

### ステップ2: クライアント側の実装

#### 2-1. index.html に App Check SDKを追加

```html
<!-- Firebase App Check SDK -->
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-check-compat.js"></script>
```

#### 2-2. components/00_init.js で App Check を初期化

```javascript
// ===== Firebase App Check初期化 =====
if (!DEV_MODE) {
    try {
        const appCheck = firebase.appCheck();
        appCheck.activate(
            'YOUR_RECAPTCHA_V3_SITE_KEY', // reCAPTCHA v3 サイトキー
            true // 自動トークンリフレッシュ
        );
        console.log('[AppCheck] Activated');
    } catch (error) {
        console.error('[AppCheck] Failed to activate:', error);
    }
}
```

### ステップ3: Cloud Functions の保護

#### 3-1. functions/index.js の更新

```javascript
const {onCall} = require("firebase-functions/v2/https");

exports.callGemini = onCall({
  region: "asia-northeast1",
  cors: true,
  // App Check を強制
  consumeAppCheckToken: true,
}, async (request) => {
  // App Check トークンの検証
  if (request.app === undefined) {
    throw new Error('App Check verification failed');
  }

  // 既存のコード...
});
```

### ステップ4: Firestore と Storage の保護

#### 4-1. Firebase Console での設定

1. **Firestore の設定**
   - Firebase Console → Firestore → App Check
   - 「強制」をオンにする
   - ⚠️ 注意: DEV_MODEのクライアントはアクセス不可になります

2. **Storage の設定**
   - Firebase Console → Storage → App Check
   - 「強制」をオンにする

#### 4-2. 段階的なロールアウト

本番環境への影響を最小限にするため、段階的に有効化：

**フェーズ1: モニタリングモード（推奨）**
- App Check を「モニタリング」モードで有効化
- リクエストをブロックせず、ログに記録のみ
- 不正なリクエストの量を確認

**フェーズ2: 強制モード**
- 問題がなければ「強制」モードに切り替え
- App Check トークンがないリクエストをブロック

---

## DEV_MODE との共存

### 開発環境でのテスト

App Checkは本番環境のみで有効化し、開発環境では無効化：

```javascript
if (!DEV_MODE && typeof firebase.appCheck === 'function') {
    const appCheck = firebase.appCheck();
    appCheck.activate(
        'YOUR_RECAPTCHA_V3_SITE_KEY',
        true
    );
}
```

### デバッグトークンの使用

ローカル開発で App Check をテストする場合：

1. **Firebase Console でデバッグトークンを取得**
   - App Check → デバッグトークン → 「新しいデバッグトークンを作成」

2. **ブラウザのコンソールで設定**
   ```javascript
   self.FIREBASE_APPCHECK_DEBUG_TOKEN = 'YOUR_DEBUG_TOKEN';
   ```

3. **ページをリロード**

---

## トラブルシューティング

### エラー: "App Check token is invalid"

**原因:**
- サイトキーが正しくない
- ドメインが登録されていない

**解決方法:**
1. reCAPTCHA 管理画面でドメインを確認
2. サイトキーが正しいか確認
3. ブラウザのキャッシュをクリア

### エラー: "App Check is not activated"

**原因:**
- App Check の初期化コードがない
- SDKが読み込まれていない

**解決方法:**
1. `firebase-app-check-compat.js` が読み込まれているか確認
2. `appCheck.activate()` が呼ばれているか確認

### 開発環境でアクセスできない

**原因:**
- App Check が強制モードで有効化されている

**解決方法:**
1. DEV_MODE の場合は App Check を無効化
2. または、デバッグトークンを使用

---

## セキュリティベストプラクティス

### 1. reCAPTCHA v3 のスコアを監視

Firebase Console → App Check → Metrics

- スコア 0.0-0.3: ボットの可能性が高い
- スコア 0.3-0.7: 疑わしい
- スコア 0.7-1.0: 人間の可能性が高い

### 2. アラートの設定

異常なトラフィックを検知：

- Cloud Monitoring でアラートを設定
- App Check の拒否率が高い場合に通知

### 3. ログの分析

定期的にログを確認：

```bash
firebase functions:log --only callGemini
```

---

## コスト

### reCAPTCHA Enterprise（オプション）

無料版の reCAPTCHA v3 には以下の制限があります：
- 月100万リクエストまで無料
- それ以上は reCAPTCHA Enterprise が必要（有料）

**reCAPTCHA Enterprise の料金:**
- 最初の100万リクエスト: 無料
- 100万リクエスト超: $1/1,000リクエスト

### Firebase App Check

- App Check 自体は無料
- reCAPTCHA の料金のみ発生

---

## 次のステップ

1. ✅ reCAPTCHA v3 サイトキーを取得
2. ⬜ Firebase Console で App Check を有効化
3. ⬜ クライアント側に App Check SDK を追加
4. ⬜ components/00_init.js で初期化
5. ⬜ Cloud Functions に `consumeAppCheckToken: true` を追加
6. ⬜ モニタリングモードで動作確認
7. ⬜ 強制モードに切り替え

---

## 参考リンク

- [Firebase App Check ドキュメント](https://firebase.google.com/docs/app-check)
- [reCAPTCHA v3 ドキュメント](https://developers.google.com/recaptcha/docs/v3)
- [Cloud Functions と App Check](https://firebase.google.com/docs/app-check/cloud-functions)
