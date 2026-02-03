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
- ❌ 勝手にGit更新しない（確認→承認後のみ）
- ❌ 明示的指示なしにコード・機能を削除しない

---

## プロジェクト構成

```
ycn_re/
├── ycn_native/           ← KMPメインプロジェクト (Kotlin Multiplatform + Compose)
│   ├── androidApp/       ← Android アプリ
│   └── shared/           ← 共通コード
├── functions/            ← Firebase Cloud Functions (通知機能)
├── firestore.rules       ← Firestore認可ルール
├── storage.rules         ← Storage認可ルール
└── firebase.json         ← Firebase設定
```

---

## KMP ネイティブアプリ（ycn_native）

### ビルド手順（Windows）

```bash
# デバッグAPKビルド
export JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" && cd C:/Users/yourc/ycn_re/ycn_native && ./gradlew :androidApp:assembleDebug

# リリースAABビルド（Play Store用）
export JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" && cd C:/Users/yourc/ycn_re/ycn_native && ./gradlew :androidApp:bundleRelease
```

**⚠️ クリーンビルドが必要な場合（キャッシュ問題など）：**
- Android Studio: Build → Clean Project → Rebuild Project

**ビルド出力先：**
- Debug APK: `ycn_native/androidApp/build/outputs/apk/debug/androidApp-debug.apk`
- Release AAB: `ycn_native/androidApp/build/outputs/bundle/release/androidApp-release.aab`

### バージョンアップ時

⚠️ **「バージョンアップ」と言われたら必ず以下を全て実行**:
1. `ycn_native/androidApp/build.gradle.kts` の versionCode +1、versionName 更新
2. `./gradlew :androidApp:bundleRelease` でAABビルド
3. `git add -A && git commit && git push`

### ファイル構造

```
ycn_native/
├── androidApp/src/main/java/com/yourcoach/plus/android/
│   ├── ui/screens/           ← 画面
│   │   ├── dashboard/        ← ダッシュボード
│   │   ├── auth/             ← 認証・オンボーディング
│   │   ├── settings/         ← 設定
│   │   ├── meal/             ← 食事記録
│   │   ├── workout/          ← 運動記録
│   │   ├── analysis/         ← AI分析
│   │   ├── notification/     ← 通知設定
│   │   └── subscription/     ← サブスク
│   ├── ui/components/        ← 共通コンポーネント
│   ├── data/repository/      ← Firestoreリポジトリ
│   ├── data/billing/         ← Google Play課金
│   └── service/              ← FCMサービス
├── shared/src/commonMain/kotlin/com/yourcoach/plus/shared/
│   ├── domain/model/         ← データモデル
│   ├── domain/repository/    ← リポジトリインターフェース
│   └── util/                 ← ユーティリティ
└── build.gradle.kts
```

### デバッグ方法

**Android Studio Logcat：**
1. Android Studio 下部の「Logcat」タブ
2. フィルター: `YourCoach` または関連タグで検索

---

## Firebase Cloud Functions

### 通知システム
- 実装: `ycn_native/.../notification/NotificationSettingsViewModel.kt` + `functions/index.js`
- 4タブ構成: 食事・運動・分析・カスタム
- FCMトークンは `users/{userId}.fcmTokens` に配列で保存
- **連鎖スケジューリング方式**: Cloud Tasks で翌日タスクを自動作成して毎日繰り返し

### Cloud Functions 呼び出し（KMP側）
```kotlin
private val functions = Firebase.functions("asia-northeast2")
functions.getHttpsCallable("scheduleNotification").call(data).await()
```

### デプロイ
```bash
firebase deploy --only functions
```

### ログ確認
```bash
firebase functions:log --only sendPushNotification
```

---

## コーディング規約

- **命名**: クラス=PascalCase, 関数=camelCase, 定数=UPPER_SNAKE_CASE
- **スタイル**: Material3 + Compose
- **状態管理**: ViewModel + StateFlow

---

## 実装報告フォーマット

```markdown
## 実装完了報告

### 実装内容
[概要]

### 変更ファイル
1. `ファイル名`: Line XXX-YYY - [変更内容]

### 確認方法
**場所**: [画面名]
**手順**: 1. ... 2. ...
**期待動作**: ✅ ...
```

---

## 過去のバグ（再発防止）

| 日付 | バグ | 原因 | 修正 |
|------|------|------|------|
| 2026/01/30 | クエスト完了が今日に記録される | `timestamp = System.currentTimeMillis()` で常に今日の時刻 | `DateUtil.dateStringToTimestamp(selectedDate)` で選択日のタイムスタンプを使用 |
| 2026/01/29 | ルーティンがDay1固定 | `saveRoutine()`で`createdAt`が毎回リセット | `patternCreatedAt`変数で元の作成日時を保持 |
| 2026/01/29 | ドロップダウン背景が白い | ExposedDropdownMenuがダークモード未対応 | `Modifier.background(MaterialTheme.colorScheme.surfaceContainer)` を追加 |
| 2025/11/26 | 2回目以降の通知が来ない | `rescheduleNotification()` で未定義変数参照 | 変数名を修正 |

---

## 参照ドキュメント

- KMP進捗: `ycn_native/PROGRESS.md`
- 作業ログ: `ycn_native/WORK_LOG_*.md`
