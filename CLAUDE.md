# Your Coach+ - Claude Code 指示書

## 🚨 最重要ルール

### 1. 解釈確認を100%実施
実装前に必ず以下の形式で確認し、承認を得ること：
```
## 指示内容の解釈確認
【ご指示】[引用]
【私の解釈】1. ... 2. ...
【実装内容】ファイル名と変更点
この解釈で実装してよろしいでしょうか？
```

### 2. 禁止事項
- ❌ 勝手にデプロイしない（「デプロイして」指示時のみ）
- ❌ 勝手にGit更新しない（3時間ごとに確認→承認後のみ）
- ❌ 明示的指示なしにコード・機能を削除しない
- ❌ 「ブラウザキャッシュクリアしてください」と言わない（ユーザーは実施済み）

### 3. services.js の二重管理
```
DataService.xxx を使用 → public/services.js を編集
import { xxx } from '../services' → src/services.js を編集
```
※ 現在はほぼ `public/services.js` が使用されている

---

## 開発フロー

### 作業開始時
```bash
npm run dev  # http://localhost:8000 でホットリロード
```

### 実装完了時
1. コンソール(F12)でエラー確認
2. 動作確認
3. ユーザーに報告

### デプロイ時（指示された場合のみ）

⚠️ **「デプロイして」と言われたら必ず以下を全て実行**:
1. `firebase deploy --only functions` （Cloud Functions変更時）
2. `npm run build && firebase deploy --only hosting` （フロント変更時）
3. `git add -A && git commit && git push`

```bash
# フルデプロイコマンド
npm run auto-release && npm run build && git add -A && git commit -m "変更内容" && git push && firebase deploy
```

**Minor/Major版の場合**: デプロイ前に以下を手動更新
- `src/config.js` の RELEASE_NOTES
- `public/home.html` のリリースノートセクション

#### 過去のデプロイ漏れ（再発防止）
| 日付 | ミス | 原因 | 対策 |
|------|------|------|------|
| 2025/11/26 | hostingデプロイ漏れ | functions のみデプロイしてhostingを忘れた | 「デプロイして」=functions+hosting+git全て実行 |

---

## ファイル構造（要点）

```
src/components/*.jsx  ← 編集対象
public/services.js    ← DataService（グローバル変数）
public/config.js      ← Firebase設定
dist/                 ← ビルド出力（デプロイ対象）
```

### 主要コンポーネント
| ファイル | 機能 |
|---------|------|
| 02_auth.jsx | 認証・オンボーディング |
| 03_dashboard.jsx | ダッシュボード |
| 04_settings*.jsx | 設定（5タブ分割） |
| 05_analysis.jsx | AI分析 |
| 08_app.jsx | メインアプリ・BAB |
| 19_add_meal_modal.jsx | 食事記録 |
| 20_add_workout_modal.jsx | 運動記録 |

---

## コマンド一覧

| コマンド | 用途 |
|---------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | ビルド |
| `npm run auto-release` | バージョン自動更新 |
| `firebase deploy --only hosting` | デプロイ |

---

## コーディング規約

- **命名**: コンポーネント=PascalCase, 関数=camelCase, 定数=UPPER_SNAKE_CASE
- **スタイル**: Tailwind CSS優先
- **アイコン**:
  - HelpCircle(?)=使い方説明
  - Info(i)=仕組み・数値説明

---

## UI注意事項

### BAB（Bottom Action Bar）
- 画面下部のタブバー（ホーム、履歴、PGBASE、COMY、設定）
- FABとは呼ばない（削除済み）
- 実装: `08_app.jsx`

### 通知システム
- 実装: `21_notification_settings.jsx` + `functions/index.js`
- 4タブ構成: 食事・運動・分析・カスタム
- 各タブでタイトル・本文・時刻をカスタマイズ可能
- FCMトークンは `users/{userId}.fcmTokens` に配列で保存
- **連鎖スケジューリング方式**: Cloud Tasks で翌日タスクを自動作成して毎日繰り返し

#### 過去のバグ（再発防止）
| 日付 | バグ | 原因 | 修正 |
|------|------|------|------|
| 2025/11/26 | 2回目以降の通知が来ない | `rescheduleNotification()` Line 447 で未定義変数 `nextDateJST` を参照 | `tomorrowJST` に修正（Line 420で定義済み）|

#### 通知システム実装時の注意
- 変数名は定義箇所と使用箇所で必ず一致させる
- try-catch でエラーが隠蔽されるため、ログを必ず確認する
- Cloud Functions のログ確認: `firebase functions:log --only sendPushNotification`

---

## 実装報告フォーマット

```markdown
## 実装完了報告

### 実装内容
[概要]

### 変更ファイル
1. `ファイル名`: Line XXX-YYY - [変更内容]

### 確認方法
**場所**: [メニューパス]
**手順**: 1. ... 2. ...
**期待動作**: ✅ ...
```

---

## Capacitor ネイティブアプリ対応

### 🚨 重要: ネイティブアプリ（iOS/Android）で開発中
- **Web版は廃止済み**（PWA → ネイティブ完全移行）
- `npm run dev` はコード変更の即時確認用（最終確認は必ずネイティブで）

### 開発環境の分担

| 作業 | Mac | Windows |
|------|-----|---------|
| **iOS開発・テスト** | ✅ | ❌ |
| **iOSビルド（App Store）** | ✅ | ❌ |
| **Androidビルド（AAB）** | ❌ | ✅ |
| **Firebase deploy** | ✅ | ✅ |
| **Git操作** | ✅ | ✅ |
| **Web開発（npm run dev）** | ✅ | ✅ |

### iOSビルド手順（Mac専用）

```bash
# 1. Webビルド
npm run build

# 2. iOSに同期
npx cap sync ios

# 3. Xcodeで実行
# Xcode: ▶ボタン または Product → Run
```

**App Store用ビルド：**
- Xcode: Product → Archive → Distribute App

### Androidビルド手順（Windows専用）

```bash
# 1. Webビルド（dist/生成）
npm run build

# 2. Androidに同期（dist/ → android/app/src/main/assets/）
npx cap sync android

# 3. リリース版AABビルド（JAVA_HOME設定必須）
export JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" && cd android && ./gradlew bundleRelease
```

**⚠️ クリーンビルドが必要な場合（キャッシュ問題など）：**
- Claude Codeではなく **Android Studio** で実行してもらう
- Android Studio: Build → Clean Project → Rebuild Project

**ビルド完了後のファイル場所：**
- **AAB（Play Store用）**: `android/app/build/outputs/bundle/release/app-release.aab` ← 基本はこちらを使用
- Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`

**⚠️ Play Storeアップロード時のバージョンコード：**
- 同じversionCodeは再アップロード不可
- エラー時は `android/app/build.gradle` の `versionCode` を +1 する
- 現在: versionCode **8**, versionName **1.0.7**

**ユーザーの役割**: 考える・指示するのみ。実行はすべてClaude Codeが行う。

### デバッグ方法（ネイティブ）

**Android Studio Logcat でログ確認：**
1. Android Studio 下部の「Logcat」タブ
2. フィルター: `chromium` または `Console` で検索
3. WebView内のconsole.log/errorが表示される

**Chrome リモートデバッグ（推奨）：**
1. Android端末: 設定 → 開発者オプション → USBデバッグ ON
2. USB接続
3. PC Chrome: `chrome://inspect` を開く
4. WebView が表示される → 「inspect」クリック
5. DevTools でコンソール・ネットワーク確認可能

### ファイル構造
```
android/                   ← Androidプロジェクト
├── app/
│   ├── src/main/assets/   ← distからコピーされる
│   └── google-services.json ← Firebase設定（要手動配置）
capacitor.config.json      ← Capacitor設定
src/capacitor-push.js      ← ネイティブプッシュ通知
src/main.jsx               ← StatusBar設定
```

### セーフエリア（ステータスバー対応）

**重要**: パディングの多重適用に注意

| 画面タイプ | 対応方法 |
|-----------|---------|
| ダッシュボード（非fixed） | `body.native-app` の `padding-top` で自動対応 |
| フルスクリーンビュー（`fixed inset-0`） | ヘッダーに `native-safe-header` クラスを追加 |

**CSSクラス（`src/index.css`）**:
- `body.native-app`: ネイティブ時に自動付与（`src/main.jsx`）
- `native-safe-header`: フルスクリーンビューのヘッダー用

**フルスクリーンビュー一覧**（`native-safe-header` が必要）:
- `05_analysis.jsx`: AnalysisView
- `06_community.jsx`: PGBaseView, COMYView, CommunityPostView
- `16_history_v10.jsx` + `public/history_v10_standalone.html`: 履歴

#### 過去のバグ（再発防止）
| 日付 | バグ | 原因 | 修正 |
|------|------|------|------|
| 2025/11/29 | ステータスバー余白が多すぎる | body, fullscreen-view, header に3重でpadding適用 | ダッシュボードはbodyのみ、フルスクリーンはheaderのみに統一 |

### Google認証（ネイティブ）
- プラグイン: `@southdevs/capacitor-google-auth`
- 初期化: `02_auth.jsx` の `useEffect` で `GoogleAuth.initialize()`

**Android:**
- SHA-1フィンガープリント: Firebase Console に登録必須
- `google-services.json`: Firebase Console からダウンロード → `android/app/` に配置

**iOS:**
- `GoogleService-Info.plist`: Firebase Console からダウンロード → `ios/App/App/` に配置
- `Info.plist`: REVERSED_CLIENT_ID を URL Scheme に追加済み
- `GoogleAuth.signIn()` には `scopes` と `serverClientId` を必ず渡す（iOSプラグイン要件）

#### 過去のバグ（再発防止）
| 日付 | バグ | 原因 | 修正 |
|------|------|------|------|
| 2025/12/05 | iOS「must provide scope」エラー | `GoogleAuth.signIn()` にscopes未指定 | `signIn({ scopes: ['profile', 'email'], serverClientId: '...' })` に変更 |
| 2025/12/05 | iOS「auth/requests-from-referer-blocked」 | Firebase Browser KeyにHTTPリファラー制限 | Google Cloud Console でAPI Key制限を「なし」に変更 |

### プッシュ通知（ネイティブ）
- PWA: `firebase-messaging-sw.js` + FCMトークン
- ネイティブ: `@capacitor/push-notifications` + `src/capacitor-push.js`
- 両方のトークンを `users/{userId}.fcmTokens` 配列に保存してマルチキャスト

---

## 参照ドキュメント

詳細な技術仕様・トラブルシューティングは `README.md` を参照。
