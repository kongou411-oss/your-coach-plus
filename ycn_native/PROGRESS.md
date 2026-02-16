# Your Coach+ KMP 統合進捗

**最終更新**: 2026-02-16
**バージョン**: 2.0.7 (versionCode 91)
**ステータス**: Shared層一本化完了 / リリース済み

---

## アーキテクチャ現状

```
ycn_native/
├── shared/src/commonMain/   ← 全ロジック・全UI（52ファイル）
│   ├── domain/model/        データモデル
│   ├── domain/repository/   リポジトリI/F
│   ├── data/repository/     Firestore実装（GitLive SDK）
│   ├── data/database/       食品・運動DB
│   ├── ui/screens/          全画面（Voyager Screen + ScreenModel）
│   ├── ui/theme/            共通テーマ
│   ├── di/SharedModule.kt   Koin DI（全ScreenModel登録）
│   └── util/                ユーティリティ
├── shared/src/androidMain/  Android固有actual（カメラ、WebView等）
├── shared/src/iosMain/      iOS固有actual（骨格のみ）
├── androidApp/              Android最小限エントリーポイント（11ファイル）
│   ├── MainActivity.kt      Voyager Navigator起動
│   ├── YourCoachApp.kt      Application（Firebase初期化）
│   ├── di/AppModule.kt      Android固有DI（Gemini, Storage, Billing）
│   ├── data/billing/        Google Play Billing
│   ├── data/service/        Gemini, Firebase Storage
│   ├── service/             FCMサービス
│   └── ui/theme/            Android Material Theme
└── iosApp/                  iOS（未実装）
```

---

## 完了済み

### リポジトリ層一本化 ✅

Android版15リポジトリを削除、全てShared `commonMain` のGitLive SDK実装に統合。

| リポジトリ | 状態 |
|-----------|------|
| FirebaseAuthRepository | Shared統合済 |
| FirestoreUserRepository | Shared統合済 |
| FirestoreMealRepository | Shared統合済 |
| FirestoreWorkoutRepository | Shared統合済 |
| FirestoreRoutineRepository | Shared統合済 |
| FirestoreScoreRepository | Shared統合済 |
| FirestoreAnalysisRepository | Shared統合済 |
| FirestoreBadgeRepository | Shared統合済 |
| FirestoreConditionRepository | Shared統合済 |
| FirestoreCustomExerciseRepository | Shared統合済 |
| FirestoreCustomFoodRepository | Shared統合済 |
| FirestoreDirectiveRepository | Shared統合済 |
| FirestorePgBaseRepository | Shared統合済 |
| FirestoreComyRepository | Shared統合済 |
| FirestoreRmRepository | Shared統合済 |
| FirestoreNotificationSettingsRepository | Shared統合済 |
| RoutinePresets | Shared統合済 |

### UI層一本化 ✅

Android NavHost → Voyager Navigator 切替完了。全52画面がShared層。

| 画面カテゴリ | ファイル数 | 行数 | 状態 |
|-------------|-----------|------|------|
| dashboard | 3 | 4,208 | ✅ |
| settings | 14 | 5,837 | ✅ |
| meal | 4 | 3,557 | ✅ |
| workout | 4 | 2,651 | ✅ |
| auth | 7 | 3,675 | ✅ |
| analysis | 2 | 2,177 | ✅ |
| history | 2 | 2,509 | ✅ |
| comy | 5 | 2,360 | ✅ |
| subscription | 2 | 1,294 | ✅ |
| pgbase | 4 | 1,066 | ✅ |
| notification | 2 | 981 | ✅ |
| badges | 2 | 545 | ✅ |
| main | 1 | - | ✅ |
| splash | 1 | - | ✅ |

### バッジシステム修正 ✅ (2026-02-16)

全18バッジが内容通りに獲得可能。

| 修正 | 詳細 |
|------|------|
| ストリーク5バッジ | `profile.streak`参照 → 食事・運動の記録日からリアルタイム計算 |
| 食事記録時バッジチェック | `updateBadgeStats`(no-op) → `checkAndAwardBadges`呼出 |
| 運動記録時バッジチェック | バッジチェック未接続 → AddWorkout/WorkoutRecorderに`badgeRepository`追加 |
| バッジ進捗表示 | 未更新カウンタ参照 → Firestoreから実データクエリ（streak計算+meals count） |
| early_birdバッジ | 未保存のslot条件削除 → JST 7時前の食事記録で獲得可能に |

### 利用規約リンク修正 ✅ (2026-02-16)

SignUpScreenの「利用規約とプライバシーポリシーに同意」テキストを、個別タップ可能なリンクに変更。LegalWebViewScreenへ遷移。

### 直近のバグ修正 ✅

| 修正 | ファイル |
|------|---------|
| プロフィール設定: 食事回数にiアイコン追加 | ProfileEditScreen.kt |
| 通知許可失敗: PushNotificationHelper初期化 | YourCoachApp.kt, MainActivity.kt |
| プレミアム登録エラー: パッケージ名修正 | functions/index.js (`com.yourcoach.plus`) |
| ルーティン設定UI: フル機能復元 | RoutineSettingsScreen.kt, ScreenModel |
| テンプレート管理: 作成UI復元 | TemplateSettingsScreen.kt |
| クエスト連動設定: タイムライン生成復元 | MealSlotSettingsScreen.kt, ScreenModel |
| デフォルト値修正: trainingTime=17:00, trainingAfterMeal=3 | MealSlotSettingsScreenModel.kt |
| ラベル修正: 「トレーニング前の食事番号は？」 | MealSlotSettingsScreen.kt |
| ヘルプ: COMY機能追加 | HelpScreen.kt |
| 出典・参考文献を「このアプリについて」に統合 | SettingsScreen.kt |
| バージョン表示: 1.0.0 → 2.0.6 | SettingsScreenModel.kt |
| テンプレート空表示: ＋ボタン推奨テキスト | TemplateSettingsScreen.kt |
| Firebase Functions: firebase-functions最新版更新 | functions/package.json |

### Firebase Cloud Functions デプロイ ✅

パッケージ名修正 + バッジシステム修正 反映済み (2026-02-16)。

---

## 残タスク

### iOS対応時

| 項目 | 詳細 |
|------|------|
| 購入復元ボタン | SubscriptionScreen — App Store審査必須要件 |
| iOS actual実装 | カメラ、WebView、Billing等のiOS固有コード |

### 対象外（旧React版の機能 / 現行アプリ不要）

| 項目 | 理由 |
|------|------|
| 年額プラン表示 | 法人のみ年額、アプリ内は個人向け月額のみ |
| レストタイマー | 旧React版の機能 |
| ギフトコード入力 | 旧React版の機能（Cloud Functions側のみ残留） |
| 紹介コード入力 | 旧React版の機能（Cloud Functions側のみ残留） |
| ストリーク表示 | 不要（バックエンドは存在、UI不要） |
| スコア表示 | 不要（バックエンドは存在、UI不要） |

---

## 旧Webアプリ残留ファイル

`public/` に旧Webアプリのレガシーファイルが残留（約12,000行）。

### 削除可能

| ファイル | 行数 | 理由 |
|---------|------|------|
| home.html, home - コピー.html | 1,164 | 旧Webアプリホーム |
| history_v10_standalone.html | 5,591 | 旧履歴グラフ |
| services.js | 3,636 | 旧Webアプリロジック |
| utils.js | 973 | 旧ユーティリティ |
| notificationSound.js | 172 | 旧通知音 |
| foodDatabase.js | 391 | 旧食品DB（Firestoreに移行済み） |
| trainingDatabase.js | 1,200 | 旧運動DB（同上） |
| module/Nutrition/ (11ファイル) | ~8,000 | 旧教科書（/module/v2/ に置換済み） |
| module/*.html (テンプレ等7ファイル) | ~4,000 | 旧モジュールテンプレ |

### 維持必須

| ファイル | 理由 |
|---------|------|
| module/v2/*.html + CSS | PG BASE教科書（WebViewで読み込み中） |
| terms.html, privacy.html, tokushoho.html | 法的ページ（アプリからリンク） |
| trainer.html, trainer-login.html | トレーナーポータル（現役） |
| js/trainer-functions.js, js/cq-databases.js | トレーナーポータルロジック |
| b2b2c.html, b2b2c-success.html | 法人プラン決済 |
| config.js | Firebase設定（トレーナー等が使用） |
| admin.html, admin-login.html, admin-customquest.html | 管理ツール（要検討） |

---

## ビルドコマンド

```bash
# デバッグAPK
export JAVA_HOME="/c/Program Files/Android/Android Studio/jbr"
cd C:/Users/yourc/ycn_re/ycn_native
./gradlew :androidApp:assembleDebug

# リリースAAB
./gradlew :androidApp:bundleRelease

# デバイスインストール
"/c/Users/yourc/AppData/Local/Android/Sdk/platform-tools/adb.exe" install -r androidApp/build/outputs/apk/debug/androidApp-debug.apk

# Firebase Functions デプロイ
cd C:/Users/yourc/ycn_re && firebase deploy --only functions

# Firebase Hosting デプロイ
firebase deploy --only hosting
```

---

## 未コミット変更

- バッジシステム修正（全18バッジ獲得可能化）
- 利用規約リンク修正（SignUpScreen）
- PROGRESS.md更新
