# 実装サマリー - 通知機能・セキュリティ強化

## 実装日
2025年10月30日

## 実装内容

### 1. 通知機能の実装 ✅

#### services.js の変更
- `NotificationService.scheduleNotification()`: 通知設定を保存し、スケジュールを登録
- `NotificationService.checkAndShowScheduledNotifications()`: 1分ごとに通知時刻をチェックし、該当する通知を表示
- `NotificationService.startNotificationChecker()`: 通知チェッカーを開始（1分間隔）
- `NotificationService.stopNotificationChecker()`: 通知チェッカーを停止

#### components/04_settings.js の変更
- `handleNotificationSettingChange()`: 通知設定保存時に自動的にスケジュール処理を呼び出し

#### components/08_app.js の変更
- DEV_MODE、本番モード両方でアプリ起動時に通知チェッカーを自動開始
- ユーザーがログインした後、通知権限がある場合にチェッカーを起動

#### index.html の変更
- `beforeunload`イベントでアプリ終了時に通知チェッカーを停止

### 2. Firebase Security Rules の作成 ✅

#### firestore.rules
- ユーザーは自分のデータのみアクセス可能
- 日次記録、分析、テンプレート、ルーティンすべてに認証チェック
- コミュニティ投稿は全ユーザーが閲覧可能、投稿者のみ編集・削除可能

#### storage.rules
- プロファイル画像、コミュニティ画像、食事画像にファイルサイズ制限
- 許可される画像形式: JPEG, PNG, WebP
- ユーザーは自分のファイルのみアップロード・削除可能

#### firebase.json
- Firestore と Storage のルールファイルを参照するよう更新

### 3. APIキーの保護 ✅

#### config.js.example の作成
- プレースホルダー付きの設定ファイルテンプレート
- 新規開発者が設定方法を理解しやすい

#### .gitignore の更新
- `config.js` を追加し、実際のAPIキーがGitHubにプッシュされないよう保護

#### SECURITY.md の作成
- セキュリティベストプラクティスのドキュメント
- セットアップ手順、既知の制限事項、インシデント対応手順

### 4. パスワード検証とリセット機能 ✅

#### components/02_auth.js の拡張

**追加機能:**
- パスワード強度インジケーター（弱い/普通/強い）
- パスワード確認フィールド（サインアップ時）
- パスワード表示/非表示トグル
- パスワードリセット機能（メール送信）
- エラーメッセージの日本語化

**パスワード強度評価基準:**
- 8文字以上
- 12文字以上
- 大文字と小文字の組み合わせ
- 数字を含む
- 記号を含む

### 5. セッション管理の改善 ✅

#### index.html
- `beforeunload`イベントでクリーンアップ処理
- 通知チェッカーの適切な停止

## デプロイ手順

### 1. 設定ファイルの作成

```bash
# config.js.example をコピー
cp config.js.example config.js

# config.js を編集して実際のAPIキーを設定
```

### 2. Firebase Security Rules のデプロイ

```bash
# Firebase CLI がインストールされていない場合
npm install -g firebase-tools

# Firebaseにログイン
firebase login

# Security Rules をデプロイ
firebase deploy --only firestore:rules,storage:rules
```

### 3. 本番モードへの切り替え

```javascript
// config.js
const DEV_MODE = false;  // 必ずfalseに設定
```

### 4. アプリのデプロイ

```bash
# Firebase Hosting にデプロイ
firebase deploy --only hosting
```

## テスト手順

### 通知機能のテスト

1. **通知権限の許可**
   - 設定画面 → 通知設定 → 「権限を許可」ボタンをクリック
   - ブラウザの通知権限ダイアログで「許可」を選択

2. **通知時刻の設定**
   - 各通知タイプ（ルーティン、食事、トレーニングなど）をONにする
   - 通知時刻を設定（テスト用に現在時刻の1-2分後に設定すると確認しやすい）

3. **通知の確認**
   - アプリを開いたまま、設定した時刻になると通知が表示される
   - 通知は1分ごとにチェックされる（±1分の余裕あり）
   - 同じ通知は1日1回のみ表示される

4. **DEV_MODEでの動作確認**
   - LocalStorageに`notificationSchedules_dev-user-001`として保存される
   - ブラウザのDevToolsでLocalStorageを確認可能

### セキュリティのテスト

1. **パスワード強度チェック**
   - サインアップ画面でパスワード入力時に強度インジケーターが表示される
   - 8文字未満では登録できない
   - パスワード確認フィールドが一致しないと登録できない

2. **パスワードリセット**
   - ログイン画面 → 「パスワードを忘れた方」
   - メールアドレスを入力してリセットメール送信
   - メールのリンクからパスワード再設定

3. **Firebase Security Rules**
   - 本番モード（DEV_MODE = false）でテスト
   - 他のユーザーのデータにアクセスできないことを確認
   - 未認証状態でデータにアクセスできないことを確認

## 既知の制限事項

### 通知機能
- **バックグラウンド通知の制限**: アプリが閉じている状態では通知が表示されません
- **タイミング精度**: 1分間隔でチェックするため、設定時刻から最大1分のズレが発生する可能性があります
- **本番環境での動作**: 完全なバックグラウンド通知にはサーバーサイド（Firebase Cloud Functions）の実装が必要です

### セキュリティ
- **クライアントサイドAPIキー**: Gemini APIキーとAdmin Passwordがクライアントサイドに露出しています
  - 推奨: Firebase Cloud Functionsへの移行
- **2FA未実装**: 2段階認証機能は今後の実装予定です

## 次のステップ（推奨）

### 優先度: 高
1. **Firebase Cloud Functionsの実装**
   - Gemini API呼び出しをサーバーサイドに移行
   - 管理者機能の保護
   - サーバーサイドからのプッシュ通知送信

2. **Firebase App Check の有効化**
   - 不正なクライアントからのAPIリクエストをブロック

### 優先度: 中
3. **2段階認証（2FA）の実装**
   - Firebase Multi-Factor Authenticationを使用
   - SMS または TOTP アプリ認証

4. **セッションタイムアウトの実装**
   - 一定時間非アクティブ後の自動ログアウト

### 優先度: 低
5. **通知機能の拡張**
   - Service Worker を使用した完全なバックグラウンド通知
   - 通知のカスタマイズ（音、振動パターンなど）

## トラブルシューティング

### 通知が表示されない
1. ブラウザの通知権限を確認
2. LocalStorage（DEV_MODE）またはFirestore（本番モード）に通知スケジュールが保存されているか確認
3. コンソールログで`[Notification]`を検索してエラーを確認

### Firebase Security Rules エラー
1. `firebase deploy --only firestore:rules,storage:rules`でルールをデプロイ
2. Firebase Console でルールが正しく反映されているか確認
3. `DEV_MODE = false`になっているか確認

### パスワードリセットメールが届かない
1. スパムフォルダを確認
2. Firebase Console → Authentication → Templates でメールテンプレートを確認
3. Firebase Console → Authentication → Sign-in method でメール/パスワード認証が有効になっているか確認

## サポート

問題が発生した場合は、以下を確認してください：
- ブラウザのコンソールログ
- Firebase Console のログ
- SECURITY.md の内容

GitHubのIssuesで報告する際は、以下の情報を含めてください：
- エラーメッセージ
- 再現手順
- ブラウザとバージョン
- DEV_MODEの設定
