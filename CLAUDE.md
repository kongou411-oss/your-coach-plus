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
| バージョン | 2.1.6 (versionCode 100) |
| 技術 | Kotlin Multiplatform + Compose Multiplatform + Voyager |
| 状態 | Android リリース済み / iOS 未実装 |

---

## アーキテクチャ

全ロジック・全UIは `shared/src/commonMain/` に集約。androidAppは最小限のエントリーポイント。

```
ycn_re/
├── ycn_native/              # KMPメインプロジェクト
│   ├── shared/              # 全コード（commonMain/androidMain/iosMain）
│   │   └── src/commonMain/  # ← 主要コードはすべてここ
│   ├── androidApp/          # Android最小限エントリーポイント
│   └── iosApp/              # iOS アプリ（骨格のみ）
├── functions/               # Firebase Cloud Functions
├── public/                  # Firebase Hosting（管理パネル）
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

# デバッグインストール
"/c/Users/yourc/AppData/Local/Android/Sdk/platform-tools/adb.exe" install -r C:/Users/yourc/ycn_re/ycn_native/androidApp/build/outputs/apk/debug/androidApp-debug.apk

# リリースAAB (Play Store用)
export JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" && cd C:/Users/yourc/ycn_re/ycn_native && ./gradlew :androidApp:bundleRelease
```

### 出力先
- Debug: `ycn_native/androidApp/build/outputs/apk/debug/androidApp-debug.apk`
- Release: `ycn_native/androidApp/build/outputs/bundle/release/androidApp-release.aab`

### バージョンアップ時（リリース毎に必ず全箇所更新）
1. `ycn_native/androidApp/build.gradle.kts` の versionCode +1、versionName 更新
2. `shared/.../settings/SettingsScreenModel.kt` の `appVersion` を新バージョンに更新（設定→その他→バージョン表示）
3. `CLAUDE.md` 冒頭のバージョン表記を更新
4. `./gradlew :androidApp:bundleRelease` でAABビルド
5. `git add && git commit && git push`

---

## 主要ファイル

### Shared（全ロジック・全UI）: `ycn_native/shared/src/commonMain/.../shared/`
| パス | 内容 |
|------|------|
| `ui/screens/dashboard/` | ダッシュボード（スコアボード・クエスト・食事運動記録） |
| `ui/screens/auth/` | 認証・オンボーディング・プロフィール初期設定 |
| `ui/screens/meal/` | 食事記録・AI食品認識 |
| `ui/screens/workout/` | 運動記録・ワークアウトレコーダー |
| `ui/screens/analysis/` | AI分析（Gemini連携） |
| `ui/screens/settings/` | 設定（5タブ）・プロフィール編集・フィードバック |
| `ui/screens/subscription/` | サブスクリプション・課金 |
| `ui/screens/history/` | 履歴・グラフ |
| `ui/screens/pgbase/` | PGBASE教科書 |
| `ui/screens/badges/` | バッジシステム |
| `ui/screens/comy/` | コミュニティ |
| `ui/components/` | 共通コンポーネント |
| `domain/model/` | データモデル |
| `domain/repository/` | リポジトリインターフェース |
| `data/repository/` | Firestore実装（GitLive SDK） |
| `data/database/` | 食品・運動ローカルDB |
| `di/SharedModule.kt` | Koin DI（全ScreenModel登録） |
| `util/` | ユーティリティ（DateUtil, FirestoreProfileParser等） |

### Android固有: `ycn_native/androidApp/.../android/`
| パス | 内容 |
|------|------|
| `MainActivity.kt` | Voyager Navigator起動 |
| `YourCoachApp.kt` | Application（Firebase初期化） |
| `di/AppModule.kt` | Android固有DI（Billing, Storage） |
| `data/billing/` | Google Play Billing実装 |
| `service/` | FCMサービス |

---

## Firebase

### Cloud Functions
```bash
# 全関数デプロイ
firebase deploy --only functions

# 個別デプロイ
firebase deploy --only functions:sendFeedback

# ログ確認
firebase functions:log --only sendPushNotification
```

### 呼び出し (KMP側)
```kotlin
val functions = Firebase.functions("asia-northeast2")
functions.httpsCallable("sendFeedback").invoke(data)
```

### Firestore注意点
- GitLive SDK の `get<Map<String, Any?>>()` は使用不可（SerializationException）
- 個別フィールドを `get<String?>()`, `get<Double?>()` 等で読み取る（FirestoreProfileParser参照）
- プロフィール更新はドット記法 `"profile.fieldName"` で個別フィールド更新

---

## コーディング規約

- **命名**: クラス=PascalCase, 関数=camelCase, 定数=UPPER_SNAKE_CASE
- **UI**: Material3 + Compose Multiplatform
- **画面遷移**: Voyager (Screen + ScreenModel)
- **状態管理**: ScreenModel + StateFlow
- **DI**: Koin (SharedModule + AppModule)
- **署名情報**: `local.properties` から読み取り（ハードコード禁止）

---

## 過去のバグ（再発防止）

| 日付 | バグ | 原因 | 修正 |
|------|------|------|------|
| 02/16 | プロフィール保存が反映されない | GitLive SDK `get<Map<String,Any?>>()` がSerializationException | 個別フィールド読み取りに変更（FirestoreProfileParser） |
| 02/16 | プロフィール更新で既存フィールド消失 | `update(mapOf("profile" to map))` が全置換 | ドット記法 `"profile.fieldName"` に変更 |
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
