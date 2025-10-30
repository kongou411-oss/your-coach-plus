# セキュリティガイド

## 初期セットアップ

### 1. 設定ファイルの作成

```bash
# config.js.example をコピーして config.js を作成
cp config.js.example config.js
```

### 2. APIキーの設定

`config.js` を編集して、以下のAPIキーを設定してください：

```javascript
// Gemini API Key (Google AI Studio で取得)
const GEMINI_API_KEY = 'YOUR_ACTUAL_GEMINI_API_KEY';

// Admin Password (管理者用パスワード)
const ADMIN_PASSWORD = 'YOUR_STRONG_ADMIN_PASSWORD';
```

### 3. Firebase Security Rulesのデプロイ

```bash
# Firebase CLIをインストール（初回のみ）
npm install -g firebase-tools

# Firebaseにログイン
firebase login

# Security Rulesをデプロイ
firebase deploy --only firestore:rules,storage:rules
```

## セキュリティベストプラクティス

### Firebase Security Rules

- ✅ `firestore.rules` と `storage.rules` が適切に設定されています
- ✅ ユーザーは自分のデータのみアクセス可能
- ✅ 認証されていないユーザーはデータにアクセス不可

### 認証

#### パスワード要件

- 最小6文字（Firebase Auth のデフォルト）
- 推奨: 8文字以上、大小英字・数字・記号を含む

#### サポートされる認証方法

- メールアドレス＋パスワード
- Googleソーシャルログイン

#### 2段階認証（2FA）

**現在未実装 - 今後の実装予定**

Firebase Multi-Factor Authentication を使用した2FAの実装を計画中：
- SMS認証
- TOTPアプリ認証（Google Authenticatorなど）

### APIキーの保護

#### クライアントサイドの制限

クライアントサイドアプリケーションでは、APIキーを完全に隠すことはできません。以下の対策で不正利用を防ぎます：

1. **Firebase App Check の実装**（推奨）
   ```javascript
   // App Checkを有効化すると、不正なクライアントからのリクエストをブロック
   ```

2. **API使用量の監視**
   - Google Cloud ConsoleでGemini APIの使用量を監視
   - 異常な使用パターンを検出したらキーをローテーション

3. **Firebase Security Rules**
   - 適切に設定されたRulesにより、認証されたユーザーのみがFirestoreにアクセス可能

#### サーバーサイドへの移行（推奨）

本番環境では、以下の機能をサーバーサイド（Firebase Cloud Functions）に移行することを強く推奨します：

- Gemini API呼び出し
- 管理者機能
- サブスクリプション管理

### 開発モード（DEV_MODE）の注意事項

⚠️ **警告**: `DEV_MODE = true` では認証が完全にバイパスされます。

**開発モード時の動作:**
- Firebase認証がスキップされる
- 固定ユーザーID（dev-user-001）で自動ログイン
- LocalStorageにデータを保存

**本番環境にデプロイする前に:**
```javascript
// config.js
const DEV_MODE = false;  // 必ずfalseに設定
```

### 既知の制限事項

#### 1. 管理者パスワードがクライアントサイドに露出

**現在の状態:** `ADMIN_PASSWORD` が `config.js` にハードコードされています。

**リスク:** ソースコードを見れば誰でもパスワードを確認できます。

**対策:** 管理者機能をFirebase Cloud Functionsに移行し、Firebase Custom Claimsを使用してロールベースのアクセス制御を実装してください。

#### 2. Gemini APIキーがクライアントサイドに露出

**現在の状態:** APIキーがクライアントサイドで使用されています。

**リスク:** 不正なユーザーがAPIキーを取得し、課金される可能性があります。

**対策:**
- Google Cloud ConsoleでAPI制限を設定
- Firebase Cloud Functionsを使用してサーバーサイドでAPI呼び出しを実行

## デプロイ前チェックリスト

- [ ] `DEV_MODE = false` に設定
- [ ] 本番用の強力な `ADMIN_PASSWORD` を設定
- [ ] Firebase Security Rulesをデプロイ
- [ ] API使用量のアラートを設定
- [ ] HTTPS通信が有効（Firebase Hostingは自動）
- [ ] `config.js` が `.gitignore` に含まれている
- [ ] Firebase App Checkを有効化（推奨）

## インシデント対応

### APIキーが漏洩した場合

1. **即座にキーを無効化**
   - Google Cloud Console → API & Services → Credentials
   - Firebase Console → Project Settings

2. **新しいキーを生成**

3. **`config.js` を更新**

4. **Gitの履歴からキーを削除**（必要に応じて）
   ```bash
   # git-filter-repo を使用（推奨）
   pip install git-filter-repo
   git filter-repo --path config.js --invert-paths
   ```

### 不正アクセスを検知した場合

1. **Firebase Consoleで異常なアクティビティを確認**

2. **Security Rulesを厳格化**

3. **疑わしいユーザーアカウントを無効化**

4. **すべてのFCMトークンをリセット**

## サポート

セキュリティに関する問題を発見した場合は、GitHubのIssuesで報告してください（機密情報は含めないこと）。

重大なセキュリティ脆弱性は、プロジェクトメンテナーに直接連絡してください。
