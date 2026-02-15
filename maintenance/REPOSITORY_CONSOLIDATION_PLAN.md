# リポジトリ統合計画書

## 目的
Android版とShared版で重複しているリポジトリ実装を、Shared版に一本化する。
Android版を基準とし、Shared版をAndroid版と同等にアップデートした後、Android版の重複を削除する。

## 現状
- Android版: 13リポジトリ実装（`androidApp/.../data/repository/`）← 本番で使用中
- Shared版: 16リポジトリ実装（`shared/.../data/repository/`）← AppModuleで上書きされ未使用
- Koin読み込み順: sharedModule → platformModule → appModule（最後が勝つ）

## 最終形
- Shared版: 15リポジトリ（統合済み・これが本体）
- AppModule: ViewModel定義 + Android専用3つのみ
  - GooglePlayBillingRepository（Google Play課金）
  - FirebaseStorageService（Bitmap依存の画像圧縮）
  - FirebaseGeminiService（Android Firebase SDK依存）

---

## Phase 0: 前提条件の修正

### 0-1: Exercise.setDetailsの保存/読み込み追加（既存バグ修正）

**問題**: exerciseToMap()にsetDetailsが含まれておらず、WorkoutRecorderのセット詳細データが失われている。Android版・Shared版の両方で同じバグ。

**対象ファイル**:
- `androidApp/.../data/repository/FirestoreWorkoutRepository.kt` の exerciseToMap() と mapToExercise()
- `shared/.../data/repository/FirestoreWorkoutRepository.kt` の exerciseToMap() と mapToExercise()

**変更内容**:
- exerciseToMap()に `"setDetails" to exercise.setDetails.map { setToMap(it) }` を追加
- mapToExercise()に setDetails の読み込み処理を追加

### 0-2: 4つのViewModelをインターフェース型 + DI注入に修正

**問題**: 以下のViewModelがAndroid実装クラスを直接new/importしており、リポジトリ切り替えが効かない。

#### 0-2-1: AnalysisViewModel
- ファイル: `androidApp/.../ui/screens/analysis/AnalysisViewModel.kt`
- 問題: コンストラクタ3個が実装型 + 内部7個を直接new
- 修正: 全10個をインターフェース型に変更し、Koin経由で注入
- AppModule.ktのviewModel定義も修正（キャスト削除、get()追加）

#### 0-2-2: RoutineSettingsViewModel
- ファイル: `androidApp/.../ui/screens/settings/RoutineSettingsScreen.kt` 内
- 問題: MealRepository, WorkoutRepositoryを直接new
- 修正: インターフェース型に変更、AppModuleで注入

#### 0-2-3: TemplateSettingsViewModel
- ファイル: `androidApp/.../ui/screens/settings/TemplateSettingsScreen.kt` 内
- 問題: MealRepository, WorkoutRepositoryを直接new
- 修正: インターフェース型に変更、AppModuleで注入

#### 0-2-4: MealSlotSettingsViewModel
- ファイル: `androidApp/.../ui/screens/settings/MealSlotSettingsScreen.kt` 内
- 問題: UserRepository, MealRepository, WorkoutRepositoryを直接new
- 修正: インターフェース型に変更、AppModuleで注入

### 0-3: SettingsScreen.ktのGoogleAuthHelper参照をViewModel経由に変更

- ファイル: `androidApp/.../ui/screens/settings/SettingsScreen.kt` 行259
- 問題: Composable内でGoogleAuthHelper(act)を直接インスタンス化
- 修正: SettingsViewModelに移動またはexpect/actualで抽象化

---

## Phase 1: Shared版リポジトリをAndroid版と同等にアップデート

**原則**: この間、本番はAndroid版のまま。Shared版をどれだけ触っても本番に影響なし。

### 1-1: FirestoreConditionRepository（極小）
- 差分: SDK差のみ（確認済み）
- 作業: 差分なしを最終確認

### 1-2: FirestoreCustomExerciseRepository（小）
- 差分: incrementUsage()でトランザクション未使用
- 作業: runTransaction追加

### 1-3: FirestoreCustomFoodRepository（小）
- 差分: incrementUsage()でトランザクション未使用、getCustomFoods()のlimit(100)なし
- 作業: runTransaction追加、limit(100)追加

### 1-4: FirestoreDirectiveRepository（小）
- 差分: updateDirective()が全体set()になっている（Android版は部分更新）
- 作業: 部分更新に修正

### 1-5: FirebaseAuthRepository（小）
- 差分: reauthenticateWithGoogleAndDelete()の実装差、getCurrentUser()のtry-catch差
- 作業: Android版のロジックに合わせる

### 1-6: FirestoreMealRepository（小）
- 差分: incrementTemplateUsage()でトランザクション未使用
- 作業: runTransaction追加

### 1-7: FirestoreWorkoutRepository（小）
- 差分: incrementTemplateUsage()でトランザクション未使用
- 作業: runTransaction追加
- ※ 0-1で追加したsetDetails対応もShared版に反映

### 1-8: FirestoreAnalysisRepository（中）
- 差分: consumeCredit()のトランザクション未実装
- 作業: runTransaction実装、getCreditInfo()のフォールバック処理

### 1-9: FirestorePgBaseRepository（中）
- 差分: purchaseArticle()にuseCredits統合なし
- 作業: UserRepository依存注入追加、useCredits統合

### 1-10: FirestoreUserRepository（中）
- 差分: addCredits/useCreditsのトランザクション未使用、CF連携差、一部フィールド差
- 作業: トランザクション実装、Cloud Function呼び出し追加、フィールド同期

### 1-11: FirestoreComyRepository（中）
- 差分: toggleLike/addComment/deleteCommentのトランザクション未実装、deletePostのコメント連鎖削除なし
- 作業: 3箇所のrunTransaction実装、deletePost修正

### 1-12: FirestoreBadgeRepository（中）
- 差分: データ構造差（earnedBadges List<String> vs badges List<Map>）、CF連携未実装
- 作業: データ構造をAndroid版に合わせる、CF連携追加

### 1-13: FirestoreRoutineRepository（大）
- 差分: executeRoutineMeals/Workouts/copyPresetToUserが全てスタブ
- 作業: Android版のロジックを完全移植（MealRepository/WorkoutRepository依存注入追加）

### 1-14: FirestoreScoreRepository（大）
- 差分: recalculateScore()の完全計算ロジック未実装、getWeeklySummary()が3軸（Android版は13軸）
- 作業: recalculateScore()完全実装、13軸WeeklySummary実装

### 1-15: FirestoreRmRepository（なし）
- Shared版のみ存在。変更不要。

---

## Phase 2: RoutinePresets.ktをShared層に移動

- 移動元: `androidApp/.../data/repository/RoutinePresets.kt` (30,217行)
- 移動先: `shared/.../data/repository/RoutinePresets.kt`
- パッケージ変更: `com.yourcoach.plus.android.data.repository` → `com.yourcoach.plus.shared.data.repository`
- Android固有API依存: なし（java.util.UUIDのみ → KMP対応済み）
- 参照元の修正: Android版FirestoreRoutineRepository.ktのimport変更

---

## Phase 3: AppModuleの切り替え + ビルド検証

### 3-1: AppModule.ktからリポジトリ定義を削除

削除対象（15行）:
```kotlin
// これらを全て削除 → sharedModuleの定義がそのまま使われる
single<AuthRepository> { FirebaseAuthRepository() }
single<UserRepository> { FirestoreUserRepository() }
single<MealRepository> { FirestoreMealRepository() }
single<WorkoutRepository> { FirestoreWorkoutRepository() }
single<ScoreRepository> { FirestoreScoreRepository() }
single<AnalysisRepository> { FirestoreAnalysisRepository() }
single<BadgeRepository> { FirestoreBadgeRepository() }
single<ConditionRepository> { FirestoreConditionRepository() }
single<DirectiveRepository> { FirestoreDirectiveRepository() }
single<RoutineRepository> { FirestoreRoutineRepository(...) }
single<CustomFoodRepository> { FirestoreCustomFoodRepository() }
single<CustomExerciseRepository> { FirestoreCustomExerciseRepository() }
single<PgBaseRepository> { FirestorePgBaseRepository(get()) }
single<ComyRepository> { FirestoreComyRepository() }
```

残すもの:
```kotlin
val appModule = module {
    // Android専用サービス
    single<GeminiService> { FirebaseGeminiService() }
    single { FirebaseStorageService(androidContext()) }
    single<BillingRepository> { GooglePlayBillingRepository(androidContext()) }

    // ViewModel定義（全て残す）
    viewModel { DashboardViewModel(get(), get(), ...) }
    // ...
}
```

### 3-2: ビルド検証
```bash
export JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" && cd C:/Users/yourc/ycn_re/ycn_native && ./gradlew :androidApp:assembleDebug
```

### 3-3: 動作検証チェックリスト
- [ ] ログイン/ログアウト
- [ ] ダッシュボード表示
- [ ] 食事記録の追加/編集/削除
- [ ] 運動記録の追加/編集/削除
- [ ] ルーティン表示/実行
- [ ] AI分析（クレジット消費）
- [ ] コミュニティ（投稿/いいね/コメント）
- [ ] 設定画面全タブ
- [ ] プロフィール更新

---

## Phase 4: Android側の重複ファイル一括削除

### 削除対象ファイル（13ファイル, 約5,400行）
```
androidApp/.../data/repository/
├── FirebaseAuthRepository.kt        (249行) → 削除
├── FirestoreAnalysisRepository.kt   (255行) → 削除
├── FirestoreBadgeRepository.kt      (197行) → 削除
├── FirestoreComyRepository.kt       (484行) → 削除
├── FirestoreConditionRepository.kt  (134行) → 削除
├── FirestoreCustomExerciseRepository.kt (138行) → 削除
├── FirestoreCustomFoodRepository.kt (221行) → 削除
├── FirestoreDirectiveRepository.kt  (197行) → 削除
├── FirestoreMealRepository.kt       (382行) → 削除
├── FirestorePgBaseRepository.kt     (336行) → 削除
├── FirestoreRoutineRepository.kt    (528行) → 削除
├── FirestoreScoreRepository.kt      (732行) → 削除
├── FirestoreUserRepository.kt       (661行) → 削除
└── RoutinePresets.kt                (30,217行) → Phase 2で移動済み
```

### 残すファイル（Android専用）
```
androidApp/.../data/
├── billing/
│   └── GooglePlayBillingRepository.kt  → 残す
└── service/
    ├── FirebaseGeminiService.kt         → 残す
    └── FirebaseStorageService.kt        → 残す
```

### 4-1: import文のクリーンアップ
- `import com.yourcoach.plus.android.data.repository.*` が残っている箇所を全て確認・削除
- 必要に応じて `import com.yourcoach.plus.shared.data.repository.*` に変更

### 4-2: 最終ビルド検証

---

## 技術メモ

### GitLive Firebase SDK 2.1.0 対応状況
| 機能 | 対応 | Shared層実績 |
|-----|:--:|:--:|
| runTransaction | ○ | 未使用（Phase 1で追加） |
| batch() | ○ | RoutineRepositoryで実績あり |
| FieldValue.increment | ○ | 多数で実績あり |
| FieldValue.arrayUnion | ○ | Badge/Tokenで実績あり |
| snapshots (Flow) | ○ | 全リポジトリで実績あり |
| Cloud Functions | ○ | expect/actualで実装済み |
| Source.SERVER | ○ | UserRepositoryで実績あり |

### Koin 3.5.6 動作
- デフォルト`allowOverride=true`
- 後から読み込んだモジュールが上書き
- appModuleからリポジトリ定義を削除 → sharedModuleの定義が使われる

### Serialization
- 全モデルに@Serializable付与済み
- @SerialName未使用（プロパティ名=Firestoreフィールド名）
- GitLive SDKのget<T>()でNumber型は自動変換（Long↔Int, Double↔Float）
