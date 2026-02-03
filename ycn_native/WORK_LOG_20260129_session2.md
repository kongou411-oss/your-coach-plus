# 作業記録 2026/01/29 セッション2

## 実装した機能

### 1. 日付ナビゲーション
- **DashboardScreen.kt**: 翌日ボタンの`enabled = !isToday`制限を削除
- 未来の日付へも移動可能に

### 2. AI分析プロンプト改善

#### アスタリスク禁止
- `**結論**` → `[結論]` 形式に変更
- 重要ルールに「アスタリスク(*)は絶対に使用しない」追加
- 指示書抽出パターンを新形式に対応

#### 食事表記の統一
- 「朝食・昼食・夕食」→「食事1・食事2・食事3...」形式に統一
- 写真解析・記録画面と表記を合わせた

#### プロフィール情報の活用
- 性別、年齢、身長、体重、体脂肪率、目標体重
- 活動レベル、トレーニングスタイル
- FitnessGoalの日本語化

#### 食事回数分のPFC指示
- mealsPerDayに基づいて動的に食事指示を生成
- 各食事にPFC目標を明示

### 3. 睡眠指示の形式変更
- 変更前: `【睡眠】[時刻]までに就寝`
- 変更後: `【睡眠】[7-9の数値]時間確保`

### 4. 指示書の変更・深堀り機能
- Q&Aで「鶏むね→鶏もも」などの変更リクエストを検出
- `extractAndUpdateDirective()`関数追加
- 修正された指示書を自動的にFirestoreに保存

### 5. レポート切れ修正
- **AnalysisScreen.kt**: `maxLines = 10`制限を削除
- 選択時にレポート全文を表示

### 6. トレーニングタイミング設定

#### UserProfileに追加
```kotlin
val trainingTime: String? = null,
val trainingAfterMeal: Int? = null,
val preWorkoutProtein: Int = 20,
val preWorkoutFat: Int = 5,
val preWorkoutCarbs: Int = 50,
val postWorkoutProtein: Int = 30,
val postWorkoutFat: Int = 5,
val postWorkoutCarbs: Int = 60,
```

#### 生成例（5食、食事3後にトレ）
```
- 【食事1】P35g・F20g・C67g
- 【食事2】P35g・F20g・C67g
- 【食事3】[トレ前] P20g・F5g・C50g（高GI推奨）
  ↓ トレーニング ↓
- 【食事4】[トレ後] P30g・F5g・C60g（高GI+プロテイン推奨）
- 【食事5】P35g・F20g・C67g
```

### 7. 食材設定・代替候補機能

#### UserProfileに追加
```kotlin
val preferredCarbSources: List<String> = listOf("白米", "玄米"),
val preferredProteinSources: List<String> = listOf("鶏むね肉", "鮭"),
val preferredFatSources: List<String> = listOf("オリーブオイル", "アボカド"),
val avoidFoods: List<String> = emptyList(),
```

#### FoodDatabaseに追加
```kotlin
fun findAlternatives(food: FoodItem, maxResults: Int = 5): List<FoodItem>
fun findByTargetPfc(category, targetP, targetF, targetC): List<FoodItem>
fun getHighGiFoods(): List<FoodItem>
fun getLowGiFoods(): List<FoodItem>
```

#### Q&A食材変更
- 「白米を他のものに変えたい」などのリクエスト時
- FoodDatabaseから同カテゴリの代替候補を提示
- PFC値を含めて比較可能

## 変更ファイル一覧

### shared モジュール
- `shared/src/commonMain/kotlin/com/yourcoach/plus/shared/domain/model/User.kt`
- `shared/src/commonMain/kotlin/com/yourcoach/plus/shared/domain/model/Directive.kt`
- `shared/src/commonMain/kotlin/com/yourcoach/plus/shared/data/database/FoodDatabase.kt`

### androidApp モジュール
- `androidApp/src/main/java/com/yourcoach/plus/android/ui/screens/dashboard/DashboardScreen.kt`
- `androidApp/src/main/java/com/yourcoach/plus/android/ui/screens/analysis/AnalysisViewModel.kt`
- `androidApp/src/main/java/com/yourcoach/plus/android/ui/screens/analysis/AnalysisScreen.kt`

## ビルド成果物
- Debug APK: `androidApp/build/outputs/apk/debug/androidApp-debug.apk`
- Release AAB: `androidApp/build/outputs/bundle/release/androidApp-release.aab`

## 残タスク
- 設定画面でトレーニングタイミング・食材設定を編集可能にするUI
- 指示書生成を質問で深掘り（対話形式での要件確認）
