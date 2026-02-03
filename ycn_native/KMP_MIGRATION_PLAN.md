# KMP共通化 移行計画

## 概要
Android版Your Coach+をKotlin Multiplatform (KMP)で共通化し、iOS版でも同じUIを提供する。

## 現状
- Android版: 83ファイル、フル機能実装済み
- iOS版: Compose Multiplatformスケルトンのみ

---

## Phase 1: 基盤整備 ✅ 完了

### 実装内容
- [x] Firebase KMP (GitLive) 依存関係追加
- [x] Voyager ナビゲーション追加
- [x] 共通テーマ（Color, Type, Shape, Theme）
- [x] App.kt エントリーポイント
- [x] 基本的なOnboarding/Dashboard画面（プレースホルダー）

### ファイル
```
shared/src/commonMain/kotlin/com/yourcoach/plus/shared/
├── ui/
│   ├── theme/
│   │   ├── Color.kt
│   │   ├── Type.kt
│   │   ├── Shape.kt
│   │   └── Theme.kt
│   ├── navigation/
│   │   └── Screen.kt
│   ├── App.kt
│   └── screens/
│       ├── auth/OnboardingScreen.kt
│       └── dashboard/DashboardScreen.kt
```

---

## Phase 2: データ層 ✅ 完了

### 目標
Firebase KMPを使用してiOS/Android共通のデータアクセス層を構築

### タスク
- [x] 認証リポジトリ (AuthRepository) 実装
- [x] ユーザーリポジトリ (UserRepository) 実装
- [x] 食事リポジトリ (MealRepository) 実装
- [x] 運動リポジトリ (WorkoutRepository) 実装
- [ ] スコアリポジトリ (ScoreRepository) 実装 ※Android版のみ、共通化は後回し
- [x] Koin DIモジュール設定

### 実装済みファイル
```
shared/src/commonMain/kotlin/com/yourcoach/plus/shared/
├── data/
│   └── repository/
│       ├── FirebaseAuthRepository.kt
│       ├── FirestoreUserRepository.kt
│       ├── FirestoreMealRepository.kt
│       └── FirestoreWorkoutRepository.kt
├── di/
│   └── SharedModule.kt
```

---

## Phase 3: コアコンポーネント ✅ 完了

### 目標
共通UIコンポーネントを作成し、両プラットフォームで再利用

### タスク
- [x] HudHeader（PFC表示ヘッダー）
- [x] DateSelector（日付選択）
- [x] NutritionCard（栄養カード）
- [x] LoadingOverlay
- [x] MealListSection
- [x] WorkoutListSection
- [x] ConditionSection
- [x] UnifiedTimeline
- [ ] ErrorDialog（必要に応じて追加）
- [ ] ConfirmDialog（必要に応じて追加）

### 実装済みファイル
```
shared/src/commonMain/kotlin/com/yourcoach/plus/shared/
├── ui/
│   └── components/
│       ├── HudHeader.kt
│       ├── DateSelector.kt
│       ├── NutritionCard.kt
│       ├── LoadingOverlay.kt
│       ├── MealListSection.kt
│       ├── WorkoutListSection.kt
│       ├── ConditionSection.kt
│       └── UnifiedTimeline.kt
```

---

## Phase 4: 主要画面 ✅ 完了

### 目標
メイン機能の画面を共通化

### タスク
- [x] DashboardScreen（フル機能）
- [x] DashboardScreenModel
- [x] DashboardModels
- [x] AddMealScreen
- [x] AddMealScreenModel
- [x] AddWorkoutScreen
- [x] AddWorkoutScreenModel
- [ ] BottomNavigation（iOS側で実装が必要）

### 実装済みファイル
```
shared/src/commonMain/kotlin/com/yourcoach/plus/shared/
├── ui/
│   └── screens/
│       ├── dashboard/
│       │   ├── DashboardScreen.kt
│       │   ├── DashboardScreenModel.kt
│       │   └── DashboardModels.kt
│       ├── meal/
│       │   ├── AddMealScreen.kt
│       │   └── AddMealScreenModel.kt
│       └── workout/
│           ├── AddWorkoutScreen.kt
│           └── AddWorkoutScreenModel.kt
```

---

## Phase 5: 設定・分析 ✅ 完了

### タスク
- [x] SettingsScreen
- [x] SettingsScreenModel
- [x] AnalysisScreen
- [x] AnalysisScreenModel
- [x] HistoryScreen
- [x] HistoryScreenModel
- [x] NotificationSettingsScreen
- [x] NotificationSettingsScreenModel
- [ ] ProfileSetupScreen（オンボーディング時に必要）

### 実装済みファイル
```
shared/src/commonMain/kotlin/com/yourcoach/plus/shared/
├── ui/
│   └── screens/
│       ├── settings/
│       │   ├── SettingsScreen.kt
│       │   └── SettingsScreenModel.kt
│       ├── analysis/
│       │   ├── AnalysisScreen.kt
│       │   └── AnalysisScreenModel.kt
│       ├── history/
│       │   ├── HistoryScreen.kt
│       │   └── HistoryScreenModel.kt
│       └── notification/
│           ├── NotificationSettingsScreen.kt
│           └── NotificationSettingsScreenModel.kt
```

---

## Phase 6: 高度な機能 🔄 一部完了

### タスク
- [x] UnifiedTimeline（基本実装済み）
- [ ] MealEditDialog
- [ ] WorkoutEditDialog
- [ ] CelebrationModal
- [ ] テンプレート機能
- [ ] Subscription画面

---

## 技術スタック

| 機能 | ライブラリ |
|------|-----------|
| UI | Compose Multiplatform |
| ナビゲーション | Voyager |
| DI | Koin |
| Firebase | GitLive firebase-kotlin-sdk |
| 状態管理 | Voyager ScreenModel + StateFlow |
| 日時 | kotlinx-datetime |
| シリアライズ | kotlinx-serialization |

---

## 注意事項

### プラットフォーム固有の処理
以下は expect/actual パターンで実装:
- 画像選択（カメラ/ギャラリー）
- プッシュ通知
- 課金処理
- ディープリンク

### 移行中の共存
- Android版は既存コードを維持
- 新機能は共通モジュールに実装
- 段階的に既存コードを共通モジュールに移行

---

## 進捗更新

| Phase | 状態 | 開始日 | 完了日 |
|-------|------|--------|--------|
| 1 | ✅ 完了 | 2026-02-03 | 2026-02-03 |
| 2 | ✅ 完了 | 2026-02-03 | 2026-02-03 |
| 3 | ✅ 完了 | 2026-02-03 | 2026-02-03 |
| 4 | ✅ 完了 | 2026-02-03 | 2026-02-03 |
| 5 | ✅ 完了 | 2026-02-03 | 2026-02-03 |
| 6 | 🔄 進行中 | 2026-02-03 | - |

---

## 残りの作業

### 優先度高
1. iOSビルドエラーの修正（型定義の重複解消済み）
2. iOS側のKoin DI設定確認
3. iOS実機テスト
4. Google Sign-In の expect/actual 実装

### 優先度中
1. BottomNavigation共通化
2. ErrorDialog / ConfirmDialog

### 優先度低
1. MealEditDialog / WorkoutEditDialog
2. CelebrationModal
3. テンプレート機能
4. Subscription画面

---

## 認証画面 ✅ 完了 (2026-02-03追加)

### 実装済みファイル
```
shared/src/commonMain/kotlin/com/yourcoach/plus/shared/ui/screens/auth/
├── LoginScreen.kt             # ログイン画面（初期画面）
├── SignUpScreen.kt            # 新規登録画面
├── ForgotPasswordScreen.kt    # パスワードリセット
├── ProfileSetupScreen.kt      # プロフィール設定（4ステップ）
├── ProfileSetupScreenModel.kt # プロフィール設定ロジック
├── AuthScreenModel.kt         # 認証ロジック共通
└── OnboardingScreen.kt        # (未使用) 将来のチュートリアル用
```

### 認証フロー（Android版と同様）
1. アプリ起動時:
   - 未ログイン → `LoginScreen`
   - ログイン済み + オンボーディング未完了 → `ProfileSetupScreen`
   - ログイン済み + オンボーディング完了 → `DashboardScreen`
2. `LoginScreen` / `SignUpScreen` → メール認証 or Google認証
3. `ProfileSetupScreen` → 新規ユーザーのプロフィール設定
4. `DashboardScreen` → メイン画面

### App.kt エントリーポイント
- 起動時に認証状態とオンボーディング状態をチェック
- 適切な初期画面を表示

### 注意事項
- Google Sign-In はプラットフォーム固有のため expect/actual パターンで実装予定
- 利用規約/プライバシーポリシーのURL表示もプラットフォーム固有
