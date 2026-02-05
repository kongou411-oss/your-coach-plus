# Your Coach+ - Claude Code 指示書

## 最重要ルール

### 1. 解釈確認を実施
実装前に必ず以下の形式で確認し、承認を得ること：
```
## 指示内容の解釈確認
【ご指示】[引用]
【私の解釈】1. ... 2. ...
【実装内容】ファイル名と変更点
この解釈で実装してよろしいでしょうか？
```

### 2. 禁止事項
- 勝手にデプロイしない（「デプロイして」指示時のみ）
- 勝手にGit更新しない（確認→承認後のみ）
- 明示的指示なしにコード・機能を削除しない

---

## プロジェクト概要

| 項目 | 値 |
|------|-----|
| アプリ名 | Your Coach+ |
| パッケージ | com.yourcoach.plus |
| バージョン | 2.0.0 (versionCode 82) |
| 技術 | Kotlin Multiplatform + Jetpack Compose |
| 状態 | Android リリース済み / iOS 未実装 |

---

## ディレクトリ構成

```
ycn_re/
├── ycn_native/              # KMPメインプロジェクト
│   ├── androidApp/          # Android アプリ (Jetpack Compose)
│   ├── shared/              # 共通コード (commonMain/androidMain/iosMain)
│   └── iosApp/              # iOS アプリ (SwiftUI) ※骨格のみ
├── functions/               # Firebase Cloud Functions
├── public/                  # Firebase Hosting
├── maintenance/             # 運用ドキュメント
├── firestore.rules          # Firestore セキュリティルール
├── storage.rules            # Storage セキュリティルール
└── firebase.json            # Firebase 設定
```

---

## ビルドコマンド

### Android

```bash
# デバッグAPK
export JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" && cd C:/Users/yourc/ycn_re/ycn_native && ./gradlew :androidApp:assembleDebug

# リリースAAB (Play Store用)
export JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" && cd C:/Users/yourc/ycn_re/ycn_native && ./gradlew :androidApp:bundleRelease
```

### 出力先
- Debug: `ycn_native/androidApp/build/outputs/apk/debug/androidApp-debug.apk`
- Release: `ycn_native/androidApp/build/outputs/bundle/release/androidApp-release.aab`

### バージョンアップ時
1. `ycn_native/androidApp/build.gradle.kts` の versionCode +1、versionName 更新
2. `./gradlew :androidApp:bundleRelease` でAABビルド
3. `git add && git commit && git push`

---

## 主要ファイル

### Android UI (ycn_native/androidApp/.../android/)
| パス | 内容 |
|------|------|
| `ui/screens/dashboard/` | ダッシュボード |
| `ui/screens/auth/` | 認証・オンボーディング |
| `ui/screens/meal/` | 食事記録 |
| `ui/screens/workout/` | 運動記録 |
| `ui/screens/analysis/` | AI分析 |
| `ui/screens/settings/` | 設定（5タブ） |
| `ui/screens/subscription/` | サブスクリプション |
| `ui/components/` | 共通コンポーネント |
| `data/repository/` | Firestore実装 |
| `data/billing/` | Google Play Billing |

### Shared (ycn_native/shared/src/commonMain/.../shared/)
| パス | 内容 |
|------|------|
| `domain/model/` | データモデル |
| `domain/repository/` | リポジトリI/F |
| `data/database/` | 食品・運動DB |
| `util/` | ユーティリティ |

---

## Firebase

### Cloud Functions
```bash
# デプロイ
firebase deploy --only functions

# ログ確認
firebase functions:log --only sendPushNotification
```

### 呼び出し (KMP側)
```kotlin
private val functions = Firebase.functions("asia-northeast2")
functions.getHttpsCallable("scheduleNotification").call(data).await()
```

---

## コーディング規約

- **命名**: クラス=PascalCase, 関数=camelCase, 定数=UPPER_SNAKE_CASE
- **UI**: Material3 + Jetpack Compose
- **状態管理**: ViewModel + StateFlow
- **DI**: Koin

---

## 過去のバグ（再発防止）

| 日付 | バグ | 原因 | 修正 |
|------|------|------|------|
| 01/30 | クエスト完了が今日に記録 | `System.currentTimeMillis()` | `DateUtil.dateStringToTimestamp(selectedDate)` |
| 01/29 | ルーティンがDay1固定 | `createdAt`が毎回リセット | `patternCreatedAt`で保持 |
| 01/29 | ドロップダウン背景が白い | ダークモード未対応 | `surfaceContainer`背景追加 |

---

## 参照ドキュメント

| ファイル | 内容 |
|---------|------|
| `ycn_native/PROGRESS.md` | KMP移行進捗 |
| `maintenance/GOOGLE_PLAY_RELEASE_GUIDE.md` | Play Store申請手順 |
| `maintenance/GOOGLE_PLAY_BILLING_GUIDE.md` | 課金設定 |
| `maintenance/APP_STORE_RELEASE_GUIDE.md` | App Store申請（将来用） |
