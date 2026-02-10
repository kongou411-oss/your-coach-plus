# 運動消費カロリーMET統一 + 分析連携

## 実装日: 2026-02-10

---

## 概要

運動消費カロリーが3系統（ルーティン暫定値 / クエスト完了50kcal固定 / 手動入力）に分離していた問題を、MET計算で統一。分析AIプロンプトにも消費カロリー・部位情報・カロリー収支を連携。

### 設計方針（C案: ハイブリッド）

- **目標カロリー**: TrainingCalorieBonus（部位別事前加算）を維持 → クエスト食事量に反映
- **MET計算**: 実消費の記録・分析用（参考値）
- **分析AI**: 「摂取 vs 目標」で評価。運動消費を差し引かない（二重計上防止）

---

## 完了済み実装

### Phase 1: MetCalorieCalculator ✅

**新規ファイル**: `shared/.../util/MetCalorieCalculator.kt`

| 機能 | 説明 |
|------|------|
| `calculateCalories()` | MET × 体重 × 時間 × 強度乗数 |
| `estimateStrengthDuration()` | sets/repsから筋トレ時間推定 |
| `calculateWorkoutTotal()` | 複数エクササイズの合計 |
| `inferExerciseCategory()` | 日本語種目名 → ExerciseCategory推定 |
| `inferWorkoutType()` | カテゴリ → WorkoutType推定 |

**MET値テーブル** (Compendium of Physical Activities準拠):

| ExerciseCategory | MET | 根拠 |
|---|---|---|
| CHEST / BACK / SHOULDERS | 5.0 | 筋トレ中強度 |
| ARMS | 4.0 | 小筋群 |
| CORE | 3.8 | 自重系 |
| LEGS | 6.0 | 大筋群・複合 |
| RUNNING | 9.8 | 6mph |
| WALKING | 3.5 | brisk 3.5mph |
| CYCLING | 7.5 | 中強度 |
| SWIMMING | 7.0 | 中強度ラップ |
| HIIT | 8.0 | サーキット |
| YOGA | 3.0 | ハタヨガ |
| STRETCHING | 2.5 | 軽度 |
| SPORTS / OTHER | 5.0 / 4.0 | 汎用 |

**Intensity乗数**: LOW=0.8, MODERATE=1.0, HIGH=1.2, VERY_HIGH=1.4

---

### Phase 2: DailyScoreスキーマ拡張 ✅

| ファイル | 変更 |
|---------|------|
| `shared/.../domain/model/DailyScore.kt` | `totalCaloriesBurned: Int = 0` 追加 |
| `shared/.../data/repository/FirestoreScoreRepository.kt` | マッピング追加 |
| `androidApp/.../data/repository/FirestoreScoreRepository.kt` | 同上 |

後方互換: デフォルト=0、既存ドキュメントに影響なし。

---

### Phase 3: クエスト運動完了のMET化 ✅

**ファイル**: `shared/.../ui/screens/dashboard/DashboardScreenModel.kt`

**Before**: `caloriesBurned = 50`, `category = OTHER`, `totalDuration = 10` (ハードコード)

**After**:
```kotlin
val category = MetCalorieCalculator.inferExerciseCategory(exerciseName, splitType)
val bodyWeight = user?.profile?.weight ?: 70f
val duration = MetCalorieCalculator.estimateStrengthDuration(category, sets, reps)
val calories = MetCalorieCalculator.calculateCalories(category, bodyWeight, duration, MODERATE)
val workoutType = MetCalorieCalculator.inferWorkoutType(category)
```

対象関数:
- `executeExerciseDirectiveWithTime()`
- `executeExerciseDirectiveBatch()`

---

### Phase 4: 手動ワークアウトMETデフォルト ✅

| ファイル | 変更 |
|---------|------|
| `shared/.../ui/screens/workout/AddWorkoutScreenModel.kt` | UserRepository追加、`addExercise()`でMETデフォルト設定 |
| `shared/.../ui/screens/workout/AddWorkoutScreen.kt` | DI: userRepository注入 |

ユーザーが手動で上書き可能（MET値はデフォルト提案）。

---

### Phase 5: 分析プロンプト拡張 ✅

#### 5a. KMP側 (`AnalysisScreenModel.kt`)
- `routineRepository` 追加 → todaySplitType取得
- ワークアウトテキスト: 各運動に `~XXXkcal` 追加
- 目標セクション: `※トレーニング消費分を含む摂取目標` 注記
- カロリー収支: 「運動消費（参考）」として記載（二重計上防止の指示付き）

#### 5b. Android側 (`AnalysisViewModel.kt`)
- RoutineRepository追加 → splitType取得
- リクエストデータ: `splitType`, `totalCaloriesBurned`, 各exerciseの`caloriesBurned`

#### 5c. Cloud Functions (`functions/index.js`)
- `generateAnalysisPrompt`: splitType・消費カロリー・カロリー収支セクション追加
- 評価指示: 「摂取 vs 目標で評価。運動消費を差し引かない」

#### DI更新 (`SharedModule.kt`)
- AnalysisScreenModelに`routineRepository = get()`追加

---

### Phase 6: ルーティン表示 → 対応不要

ルーティン画面はカロリーを目立たせて表示していないため、変更なし。

---

## クエスト運動メニューの設計（確認済み）

### 現在の仕様

```
種目数 = trainingDuration ÷ 30（ユーザー設定連動）
セット = 5（固定）
レップ = trainingStyle依存（POWER=5, PUMP=10）
```

### カロリー連動フロー

```
[事前] TrainingCalorieBonus(部位別) → 目標カロリーに加算 → クエスト食事量に反映
[事後] MET計算 → 実消費を記録 → 分析AIの参考値
```

### 種目指定

- クエストは「4種目×5セット×10回」のようにボリュームのみ指示
- 具体的な種目はユーザーが自分で選択
- 完了時にMET計算で消費カロリーを自動算出

---

## 変更ファイル一覧

| ファイル | 種別 | Phase |
|---------|------|-------|
| `shared/.../util/MetCalorieCalculator.kt` | **新規** | 1 |
| `shared/.../domain/model/DailyScore.kt` | 修正 | 2 |
| `shared/.../data/repository/FirestoreScoreRepository.kt` | 修正 | 2 |
| `androidApp/.../data/repository/FirestoreScoreRepository.kt` | 修正 | 2 |
| `shared/.../ui/screens/dashboard/DashboardScreenModel.kt` | 修正 | 3 |
| `shared/.../ui/screens/workout/AddWorkoutScreenModel.kt` | 修正 | 4 |
| `shared/.../ui/screens/workout/AddWorkoutScreen.kt` | 修正 | 4 |
| `shared/.../ui/screens/analysis/AnalysisScreenModel.kt` | 修正 | 5a |
| `androidApp/.../analysis/AnalysisViewModel.kt` | 修正 | 5b |
| `functions/index.js` | 修正 | 5c |
| `shared/.../di/SharedModule.kt` | 修正 | 5 |

---

## 未デプロイ

- [ ] `firebase deploy --only functions` — CF側プロンプト変更の反映が必要

---

## TODO（明日以降）

### 高優先

- [ ] **ビルド確認**: `./gradlew :androidApp:assembleDebug` で全体コンパイル通過を確認
- [ ] **CFデプロイ**: `firebase deploy --only functions` で分析プロンプト変更を反映
- [ ] **動作検証（クエスト完了）**: 運動ディレクティブ完了 → Firestoreでworkoutレコードの`caloriesBurned`が50kcalではなくMET値になっていることを確認
- [ ] **動作検証（分析）**: 分析実行 → プロンプトに消費カロリー・部位・収支セクションが含まれることを確認

### 中優先

- [ ] **セット数のtrainingStyle連動検討**: 現在5固定 → POWER=4セット / PUMP=5セットにする価値があるか判断
- [ ] **手動ワークアウト検証**: 手動記録時にMETデフォルト値が入力欄に反映されることを確認
- [ ] **DailyScore.totalCaloriesBurned書き込み**: 現在フィールドは追加済みだが、スコア計算時に実際にworkoutsの消費カロリー合計を書き込む処理の確認

### 低優先

- [ ] **過去データ**: 50kcal固定で保存された過去のworkoutレコードは遡及更新しない（新規のみMET適用）
- [ ] **体重未設定ユーザー**: デフォルト70kg使用中 → オンボーディングで体重入力を必須化検討
- [ ] **種目名推定精度**: 日本語キーワードマッチの網羅性向上（現在は主要種目のみ対応）

---

## 注意事項

1. **TrainingCalorieBonus vs MET**: TrainingCalorieBonusはEPOC含む全セッション推定値（例: 脚=500kcal）、METはper-exercise実時間ベース（例: ~350kcal）。差異は仕様通り
2. **二重計上防止**: 分析AIには「摂取 vs 目標で評価、運動消費を差し引かない」と明示指示済み
3. **後方互換**: DailyScore.totalCaloriesBurned=0デフォルトで既存データに影響なし
