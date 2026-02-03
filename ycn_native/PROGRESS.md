# KMP ネイティブ化 進捗記録

**最終更新**: 2026-01-28
**ステータス**: Phase 1-3 完了 ✅ **全画面・ビジネスロジック実装完了！**

## ビルド結果
- ✅ Debug APK: `androidApp-debug.apk` (27.5MB)
- ✅ Release AAB: `androidApp-release.aab` (9.7MB)

---

## 完了項目

### 1. プロジェクト基盤 (100%)
- [x] `settings.gradle.kts` - モジュール設定
- [x] `build.gradle.kts` - ルートビルド設定
- [x] `gradle.properties` - Gradle設定
- [x] `gradle/libs.versions.toml` - バージョンカタログ（全依存関係）
- [x] `gradle/wrapper/gradle-wrapper.properties`

### 2. shared モジュール (100%)
- [x] `shared/build.gradle.kts` - KMPビルド設定
- [x] ドメインモデル
  - `User.kt`, `UserProfile`, Gender, ActivityLevel, FitnessGoal
  - `Meal.kt`, `MealItem`, `MealType`(BREAKFAST/LUNCH/DINNER/SNACK/SUPPLEMENT), `MealTemplate`
  - `Workout.kt`, `Exercise`, `WorkoutType`, `ExerciseCategory`, `WorkoutTemplate`
  - `DailyScore.kt`, `ScoreAxis`, `StreakInfo`, `Badge` - 10軸スコアシステム対応
- [x] リポジトリインターフェース
  - `AuthRepository.kt`
  - `UserRepository.kt`
  - `MealRepository.kt`
  - `WorkoutRepository.kt`
  - `ScoreRepository.kt`
- [x] ユースケース（ビジネスロジック） ← **NEW**
  - `ScoreCalculator.kt` - 10軸スコア計算（食事60% + 運動30% + コンディション10%）
  - `StreakCalculator.kt` - ストリーク計算（freeze対応）
- [x] データベース（静的データ） ← **NEW**
  - `FoodItem.kt` - 食品データモデル（100gあたり栄養素）
  - `FoodDatabase.kt` - 日本食品データベース（約40種類）
  - `ExerciseItem.kt` - 運動データモデル（筋肉群・器具）
  - `ExerciseDatabase.kt` - 運動データベース（約40種類）
- [x] ユーティリティ
  - `DateUtil.kt` - 日付処理
  - `Result.kt` - エラーハンドリング、AppError
- [x] DI
  - `SharedModule.kt`
  - `PlatformModule.android.kt`
  - `PlatformModule.ios.kt`

### 3. androidApp モジュール (95%)

#### 基盤 (100%)
- [x] `build.gradle.kts`
- [x] `proguard-rules.pro`
- [x] `AndroidManifest.xml`
- [x] `YourCoachApp.kt` - Application クラス（通知チャンネル設定）
- [x] `MainActivity.kt`
- [x] `AppModule.kt` - Koin DI（全ViewModel登録済み）

#### Theme (100%)
- [x] `Color.kt` - Duolingo風カラーパレット
- [x] `Type.kt` - タイポグラフィ
- [x] `Shape.kt` - シェイプ定義
- [x] `Theme.kt` - Material 3 テーマ

#### Navigation (100%)
- [x] `Screen.kt` - 画面定義
- [x] `YourCoachNavHost.kt` - ナビゲーション設定（全画面接続済み）

#### Resources (100%)
- [x] `strings.xml`
- [x] `colors.xml`
- [x] `themes.xml`

#### 認証画面 (100%)
- [x] `AuthViewModel.kt` - Firebase Auth連携
- [x] `LoginScreen.kt` - メール/Googleログイン
- [x] `SignUpScreen.kt` - メール/Google新規登録
- [x] `ForgotPasswordScreen.kt` - パスワードリセット
- [x] `OnboardingScreen.kt`
- [x] `GoogleAuthHelper.kt` - Credential Manager API
- [x] `ProfileSetupScreen.kt` - プロフィール設定（4ステップ）← NEW
  - Step 0: 基本情報（ニックネーム、年齢、性別、スタイル）
  - Step 1: 体組成（身長、体重、体脂肪率、BMR/TDEE計算）
  - Step 2: 目標・活動レベル（FitnessGoal、ActivityLevel、カロリー調整）
  - Step 3: PFCバランス（タンパク質/脂質/炭水化物比率）

#### ダッシュボード (100%)
- [x] `DashboardViewModel.kt`
- [x] `DashboardScreen.kt` - 8軸スコア、ストリーク、クイックアクション

#### 食事記録 (100%) ← UPDATED
- [x] `MealViewModel.kt` - 量調整機能追加
- [x] `AddMealScreen.kt` - 手動入力、栄養サマリー、食品検索、量調整
  - 食品データベース検索（カテゴリ/キーワード）
  - 量調整UI（+/-ボタン、クイック選択チップ）
  - 栄養素自動計算（量に応じてリアルタイム更新）
  - テンプレート保存/適用UI ← **NEW**
- [x] `AiFoodRecognitionScreen.kt` - CameraX撮影、Gemini Vision API連携

#### 運動記録 (100%) ← UPDATED
- [x] `WorkoutViewModel.kt`
- [x] `AddWorkoutScreen.kt` - タイプ選択、強度、運動追加
  - 運動データベース検索（カテゴリ/キーワード）
  - 筋肉部位表示
  - セット/回数/重量/時間/距離入力
  - テンプレート保存/適用UI ← **NEW**

#### 履歴画面 (100%) ← UPDATED
- [x] `HistoryViewModel.kt` - 日付選択、月切り替え、グラフデータ
- [x] `HistoryScreen.kt` - カレンダービュー、グラフビュー（Compose Canvas実装完了）

#### PGBASE画面 (100%) ← NEW
- [x] `PgBaseViewModel.kt` - 記事読み込み、カテゴリフィルター
- [x] `PgBaseScreen.kt` - 教科書UI、進捗表示

#### COMY画面 (100%) ← NEW
- [x] `ComyViewModel.kt` - 投稿読み込み、いいね
- [x] `ComyScreen.kt` - コミュニティUI、投稿カード

#### 設定画面 (100%) ← UPDATED
- [x] `SettingsViewModel.kt` - ユーザー情報、ログアウト
- [x] `SettingsScreen.kt` - 4タブ構造（基本/機能/データ/その他）← **NEW**
  - HorizontalPager + TabRowでスワイプ対応
  - 基本タブ: プロフィール、通知、バッジ
  - 機能タブ: 目標、プレミアム、AI設定
  - データタブ: エクスポート/インポート、アカウント削除
  - その他タブ: ヘルプ、法的情報、ログアウト
- [x] `ProfileSettingsScreen.kt` - プロフィール編集（体組成、目標、PFCバランス）← NEW

#### AI分析画面 (100%) ← NEW
- [x] `AnalysisViewModel.kt` - 分析実行、クレジット管理
- [x] `AnalysisScreen.kt` - 分析タイプ選択、結果表示

#### Firebase実装 (100%)
- [x] `FirebaseAuthRepository.kt`
- [x] `FirestoreUserRepository.kt`

#### サービス (100%)
- [x] `YourCoachMessagingService.kt` - FCM

---

## 未完了項目（次のステップ）

### androidApp 画面
- [x] ~~`HistoryScreen.kt` - 履歴~~ ✅ 完了
- [x] ~~`PgBaseScreen.kt` - PGBASE（教科書）~~ ✅ 完了
- [x] ~~`ComyScreen.kt` - COMY（Q&A）~~ ✅ 完了
- [x] ~~`SettingsScreen.kt` - 設定~~ ✅ 完了
- [x] ~~`AnalysisScreen.kt` - AI分析~~ ✅ 完了
- [x] `AiFoodRecognitionScreen.kt` - AI食品認識（CameraX）✅ 完了

### Firestoreリポジトリ
- [x] `FirestoreMealRepository.kt` ✅ 完了
- [x] `FirestoreWorkoutRepository.kt` ✅ 完了
- [x] `FirestoreScoreRepository.kt` ✅ 完了

### 共通UIコンポーネント
- [x] `LoadingButton.kt` ✅ 完了
- [x] `ScoreChart.kt` ✅ 完了（Compose Canvas実装）
- [x] `StreakCard.kt` ✅ 完了
- [x] `ErrorDialog.kt` ✅ 完了

### その他
- [x] `gradlew`, `gradlew.bat` - Gradle Wrapper実行ファイル ✅ 完了
- [x] `google-services.json` 配置 ✅ 完了
- [x] ~~DIモジュール完成（全ViewModelの登録）~~ ✅ 完了
- [x] ~~Navigation更新（新画面追加）~~ ✅ 完了
- [x] ビルドエラー修正（ProGuardルール追加）✅ 完了

### 4. ビジネスロジック実装 (100%) ← **NEW**

#### 10軸スコア計算システム (ScoreCalculator.kt)
元の `services.js` の `calculateScores` 関数を完全移植

**食事スコア (60%)**:
- カロリー (10%): 目標±10%で100点
- タンパク質 (20%): 目標達成で100点
- 脂質 (20%): 目標±15%で100点
- 炭水化物 (20%): 目標±15%で100点
- DIAAS (5%): 100で100点
- 脂肪酸バランス (5%): P:M:S = 1:1.5:1で100点
- GL (5%): <100で100点
- 食物繊維 (5%): 25g以上で100点
- ビタミン (5%): 充足率100%で100点
- ミネラル (5%): 充足率100%で100点

**運動スコア (30%)**:
- 運動時間 (70%): 60分で100点
- 種目数 (30%): 5種目で100点
- 休養日モード対応（係数0.5）

**コンディションスコア (10%)**:
- 睡眠時間 (40%): 7-8時間で100点
- 睡眠品質 (20%): 5/5で100点
- 消化・集中・ストレス (各13.3%): 5/5で100点

#### ストリーク計算システム (StreakCalculator.kt)
- 連続記録日数の自動計算
- ストリークフリーズ対応
- 最長ストリークの追跡

---

## 作成ファイル数

| カテゴリ | ファイル数 |
|---------|-----------|
| ルート設定 | 4 |
| shared | 20 |
| androidApp | 47 |
| **合計** | **71** |

### 今回追加したファイル (28ファイル)
- `history/HistoryViewModel.kt`
- `history/HistoryScreen.kt`
- `pgbase/PgBaseViewModel.kt`
- `pgbase/PgBaseScreen.kt`
- `comy/ComyViewModel.kt`
- `comy/ComyScreen.kt`
- `settings/SettingsViewModel.kt`
- `settings/SettingsScreen.kt`
- `analysis/AnalysisViewModel.kt` (AI分析対応に更新)
- `analysis/AnalysisScreen.kt` (タブUI・Q&A対応に更新)
- `data/repository/FirestoreMealRepository.kt`
- `data/repository/FirestoreWorkoutRepository.kt`
- `data/repository/FirestoreScoreRepository.kt`
- `data/repository/FirestoreAnalysisRepository.kt`
- `data/service/FirebaseGeminiService.kt`
- `ui/components/LoadingButton.kt`
- `ui/components/ErrorDialog.kt`
- `ui/components/StreakCard.kt`
- `ui/components/ScoreChart.kt`
- `shared/domain/usecase/ScoreCalculator.kt`
- `shared/domain/usecase/StreakCalculator.kt`
- `shared/domain/service/GeminiService.kt`
- `shared/domain/repository/AnalysisRepository.kt`
- `shared/data/database/FoodItem.kt` ← **NEW**
- `shared/data/database/FoodDatabase.kt` ← **NEW**
- `shared/data/database/ExerciseItem.kt` ← **NEW**
- `shared/data/database/ExerciseDatabase.kt` ← **NEW**

---

## 再開手順

1. このファイル（`PROGRESS.md`）を確認
2. ~~`HistoryScreen.kt` の作成を再開~~ ✅ 完了
3. ~~残りの画面（PgBase, Comy, Settings, Analysis）を作成~~ ✅ 完了
4. Firestoreリポジトリを完成（次のステップ）
5. ~~DIモジュールとNavigationを更新~~ ✅ 完了
6. ビルドテスト

### 次の優先タスク（Phase 2）
1. ~~`FirestoreMealRepository.kt` - 食事データ永続化~~ ✅ 完了
2. ~~`FirestoreWorkoutRepository.kt` - 運動データ永続化~~ ✅ 完了
3. ~~`FirestoreScoreRepository.kt` - スコアデータ永続化~~ ✅ 完了
4. ~~共通UIコンポーネント（LoadingButton, ErrorDialog等）~~ ✅ 完了
5. ~~gradlew, gradlew.bat - Gradle Wrapper実行ファイル~~ ✅ 完了
6. ~~google-services.json 配置~~ ✅ 完了
7. ~~ビルドテスト・動作確認~~ ✅ 完了（Debug/Release両方成功）
8. ~~Google認証・メール認証~~ ✅ 完了
9. ~~CameraXでAI食品認識機能~~ ✅ 完了
10. ~~グラフ機能（Compose Canvas実装）~~ ✅ 完了
11. ~~ScoreCalculator.kt - 10軸スコア計算ロジック~~ ✅ 完了
12. ~~StreakCalculator.kt - ストリーク計算ロジック~~ ✅ 完了
13. **実機テスト・動作確認**
14. Release署名キー作成
15. Play Store公開準備

### ビジネスロジック（Phase 3）✅ 完了
- [x] ~~AI分析機能（Gemini API連携）~~ ✅ 完了
- [x] ~~AI食品認識（写真→Gemini Vision）~~ ✅ 完了
- [x] ~~Premium/サブスクリプション機能~~ ✅ 完了
- [x] ~~食品データベース連携~~ ✅ 完了
- [x] ~~運動データベース連携~~ ✅ 完了
- [x] ~~プッシュ通知（FCM）~~ ✅ 完了
- [x] ~~実績/バッジシステム~~ ✅ 完了

### 実績/バッジシステムの実装内容 ← **NEW**
- `BadgeRepository.kt` (shared) - バッジインターフェース
  - バッジ定義（17種類）
  - カテゴリ: STREAK, NUTRITION, EXERCISE, MILESTONE, SPECIAL
  - 進捗追跡型
- `FirestoreBadgeRepository.kt` (Android) - Firestore実装
  - ユーザーバッジ取得/監視
  - バッジ付与
  - 進捗取得
- `BadgesViewModel.kt` - バッジ画面ViewModel
  - フィルタリング
  - カテゴリ別表示
- `BadgesScreen.kt` - バッジ画面UI
  - サマリーカード（獲得数/総数）
  - カテゴリフィルター
  - バッジカード（獲得済み/未獲得/進捗表示）

### プッシュ通知（FCM）機能の実装内容
- `YourCoachMessagingService.kt` - FCMサービス（トークン管理・通知受信）
  - FCMトークンをFirestoreに自動保存
  - 通知ペイロードの処理
  - データペイロードの処理（食事/運動/分析/ストリーク）
- `NotificationSettingsViewModel.kt` - 通知設定ViewModel
  - 設定の読み込み/保存
  - 通知権限チェック
  - 時間設定管理
- `NotificationSettingsScreen.kt` - 通知設定UI
  - 通知権限リクエスト
  - 食事リマインダー（朝食/昼食/夕食時間設定）
  - 運動リマインダー（時間設定）
  - AI分析リマインダー（時間設定）
  - ストリーク警告（ON/OFF）
  - タイムピッカーダイアログ

### Premium/サブスクリプション機能の実装内容
- `PremiumService.kt` (shared) - Premium判定ロジック
  - 7日間無料トライアル
  - サブスクリプション状態判定
  - B2B2C/ギフトコード対応
  - 分析アクセス制御
- `BillingRepository.kt` (shared) - 課金インターフェース
  - 商品情報、購入結果、サブスク状態の型定義
- `GooglePlayBillingRepository.kt` (Android) - Google Play Billing実装
  - 商品一覧取得
  - サブスクリプション購入
  - クレジットパック購入（消耗品）
  - 購入確認（acknowledge）
  - サブスク状態確認
- `SubscriptionViewModel.kt` - UIロジック
  - 商品表示
  - 購入フロー
  - 接続状態管理
- `SubscriptionScreen.kt` - UI
  - プレミアムヘッダー
  - 機能一覧
  - プラン選択（月額/年間）
  - クレジットパック購入
  - 購入成功/エラー表示

### 食品・運動データベースの実装内容 ← **NEW**

**shared モジュールに静的データベースとして実装**

#### FoodDatabase (shared/data/database/)
- `FoodItem.kt` - 食品データモデル
  - 100gあたりの栄養素（日本食品標準成分表 八訂準拠）
  - 基本栄養素: カロリー、タンパク質、脂質、炭水化物、食物繊維
  - タンパク質品質: アミノ酸スコア、PDCAAS、DIAAS、DIT
  - 脂肪酸: 飽和、一価不飽和、多価不飽和
  - ビタミン: A, B群, C, D, E, K等
  - ミネラル: ナトリウム、カルシウム、鉄、亜鉛等
- `FoodCategory.kt` - 食品カテゴリ（肉類、魚介類、野菜類等16種）
- `FoodDatabase.kt` - 約40種類の代表的な日本食品データ
  - 検索機能: `searchByName()`, `searchByCategory()`
  - カテゴリ取得: `getAllCategories()`
  - 高タンパク食品: `getHighProteinFoods()`

#### ExerciseDatabase (shared/data/database/)
- `ExerciseItem.kt` - 運動データモデル
  - 基本情報: 名前、カテゴリ、サブカテゴリ
  - 運動タイプ: 有酸素/無酸素/柔軟性/バランス
  - 関節タイプ: 多関節(上半身/下半身)/単関節(上半身/下半身)/有酸素/体幹
  - 筋肉群: 主動筋、補助筋
  - 器具、難易度、動作タイプ（プッシュ/プル）
  - デフォルト値: 距離、TUT、インターバル係数
- `ExerciseCategory.kt` - 運動カテゴリ（胸、背中、肩、腕、脚、体幹、有酸素等10種）
- `ExerciseDatabase.kt` - 約40種類の運動データ
  - 検索機能: `searchByName()`, `searchByCategory()`
  - カテゴリ取得: `getAllCategories()`
  - 筋肉群別: `searchByMuscle()`
  - 器具別: `searchByEquipment()`

### AI食品認識（写真→Gemini Vision）の実装内容 ← **NEW**

**GeminiService** に画像分析メソッドを追加:
- `analyzeImage()` - Base64画像をCloud Functions経由でGemini Vision APIに送信

**AiFoodRecognitionViewModel** の更新:
- CameraXで撮影した画像をBase64に変換
- 食品認識専用プロンプトでGemini API呼び出し
- JSONレスポンスをパースして `RecognizedFood` リストに変換
- パッケージ栄養成分表示の読み取り対応
- 料理を食材単位に分解して栄養計算

**レスポンス形式**:
```json
{
  "hasPackageInfo": false,
  "foods": [
    {
      "name": "食材名",
      "amount": 100,
      "confidence": 0.95,
      "itemType": "food",
      "cookingState": "加熱済",
      "nutritionPer100g": {
        "calories": 200,
        "protein": 20,
        "fat": 10,
        "carbs": 5
      }
    }
  ]
}
```

### AI分析機能の実装内容
- `GeminiService.kt` (shared) - Gemini APIインターフェース
- `FirebaseGeminiService.kt` - Firebase Cloud Functions経由でGemini API呼び出し
- `AnalysisRepository.kt` (shared) - 分析レポート管理インターフェース
- `FirestoreAnalysisRepository.kt` - Firestore実装（レポート保存/取得/削除）
- `AnalysisViewModel.kt` - 本格的なAI分析ロジック
  - 分析プロンプト構築（スコア・食事・運動データ含む）
  - Q&A機能（追加質問への回答）
  - レポート保存・履歴管理
  - クレジット消費管理
- `AnalysisScreen.kt` - 新UI
  - 分析/履歴タブ
  - 分析生成カード
  - 会話バブルUI
  - レポート保存ダイアログ

---

## ビルド確認コマンド

```bash
# JAVA_HOME 設定（Windows）
export JAVA_HOME="/c/Program Files/Android/Android Studio/jbr"

# デバッグビルド
cd ycn_native
./gradlew assembleDebug
# 出力: androidApp/build/outputs/apk/debug/androidApp-debug.apk

# リリースビルド（Play Store用AAB）
./gradlew bundleRelease
# 出力: androidApp/build/outputs/bundle/release/androidApp-release.aab
```

**必須ファイル**:
- `androidApp/google-services.json` - Firebase設定（既に配置済み）
- `local.properties` - Android SDK パス（既に生成済み）
