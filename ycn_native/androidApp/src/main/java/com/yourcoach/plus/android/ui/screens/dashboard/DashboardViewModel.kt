package com.yourcoach.plus.android.ui.screens.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.yourcoach.plus.shared.domain.model.Condition
import com.yourcoach.plus.shared.domain.model.DailyScore
import com.yourcoach.plus.shared.domain.model.Directive
import com.yourcoach.plus.shared.domain.model.DirectiveActionItem
import com.yourcoach.plus.shared.domain.model.DirectiveActionType
import com.yourcoach.plus.shared.domain.model.DirectiveType
import com.yourcoach.plus.shared.domain.model.MealItem
import com.yourcoach.plus.shared.domain.model.MealType
import com.yourcoach.plus.shared.domain.model.Meal
import com.yourcoach.plus.shared.domain.model.StreakInfo
import com.yourcoach.plus.shared.domain.model.User
import com.yourcoach.plus.shared.domain.model.Workout
import com.yourcoach.plus.shared.domain.model.RoutineDay
import com.yourcoach.plus.shared.domain.model.MealSlot
import com.yourcoach.plus.shared.domain.model.MealSlotConfig
import com.yourcoach.plus.shared.domain.model.FitnessGoal
import com.yourcoach.plus.shared.domain.model.CustomQuest
import com.yourcoach.plus.shared.domain.model.CustomQuestItem
import com.yourcoach.plus.shared.domain.model.CustomQuestSlotType
import com.yourcoach.plus.shared.domain.model.RmRecord
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.CustomQuestRepository
import com.yourcoach.plus.shared.domain.repository.BadgeRepository
import com.yourcoach.plus.shared.domain.repository.ConditionRepository
import com.yourcoach.plus.shared.domain.repository.RoutineRepository
import com.yourcoach.plus.shared.domain.repository.DirectiveRepository
import com.yourcoach.plus.shared.domain.repository.MealRepository
import com.yourcoach.plus.shared.domain.repository.RmRepository
import com.yourcoach.plus.shared.domain.repository.UserRepository
import com.yourcoach.plus.shared.domain.repository.WorkoutRepository
import com.yourcoach.plus.shared.domain.repository.ScoreRepository
import com.yourcoach.plus.shared.util.DateUtil
import com.yourcoach.plus.shared.domain.model.DetailedNutrition
import com.yourcoach.plus.shared.domain.usecase.NutritionCalculator
import com.yourcoach.plus.shared.data.database.BodymakingFoodDatabase
import com.yourcoach.plus.shared.data.database.FoodDatabase
import com.yourcoach.plus.shared.data.database.FoodItem
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeout
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * ダッシュボード画面の状態
 */
data class DashboardUiState(
    val isLoading: Boolean = true,
    val error: String? = null,
    val date: String = DateUtil.todayString(),
    val dateDisplay: String = DateUtil.formatDateForDisplay(DateUtil.todayString()),
    val score: DailyScore? = null,
    val meals: List<Meal> = emptyList(),
    val workouts: List<Workout> = emptyList(),
    val streakInfo: StreakInfo = StreakInfo(),
    val user: User? = null,
    // カロリー・栄養素
    val totalCalories: Int = 0,
    val targetCalories: Int = 2000,
    val targetProtein: Float = 120f,
    val targetCarbs: Float = 250f,
    val targetFat: Float = 60f,
    val totalProtein: Float = 0f,
    val totalCarbs: Float = 0f,
    val totalFat: Float = 0f,
    // 成功メッセージ
    val successMessage: String? = null,
    // 詳細栄養素
    val averageDiaas: Float = 0f,
    val saturatedFat: Float = 0f,
    val mediumChainFat: Float = 0f,        // MCT (中鎖脂肪酸)
    val monounsaturatedFat: Float = 0f,
    val polyunsaturatedFat: Float = 0f,
    val fattyAcidScore: Int = 0,
    val fattyAcidRating: String = "-",
    val fattyAcidLabel: String = "-",
    val vitaminScores: Map<String, Float> = emptyMap(),
    val mineralScores: Map<String, Float> = emptyMap(),
    // GL管理・血糖管理
    val totalGL: Float = 0f,
    val glLimit: Float = 120f,  // 一般: 40*3=120, ボディメイカー: 70*3=210
    val glScore: Int = 0,
    val glLabel: String = "-",
    val adjustedGL: Float = 0f,           // 補正後GL値
    val bloodSugarRating: String = "-",   // 血糖管理評価 (A+, A, B, C)
    val bloodSugarLabel: String = "-",    // 血糖管理ラベル (優秀, 良好, 普通, 要改善)
    val highGIPercent: Float = 0f,        // GI66以上の炭水化物の割合
    val lowGIPercent: Float = 0f,         // GI66未満の炭水化物の割合
    val glModifiers: List<Pair<String, Float>> = emptyList(),  // GL補正要因
    val mealsPerDay: Int = 5,             // 想定食事回数
    val mealGLLimit: Float = 24f,         // 1食あたりの動的GL上限
    val mealAbsoluteGLLimit: Float = 40f, // 1食あたりの絶対GL上限
    // 食物繊維
    val totalFiber: Float = 0f,
    val totalSolubleFiber: Float = 0f,      // 水溶性食物繊維
    val totalInsolubleFiber: Float = 0f,    // 不溶性食物繊維
    val fiberScore: Int = 0,
    val fiberRating: String = "-",
    val fiberLabel: String = "-",
    val carbFiberRatio: Float = 0f,
    // コンディション
    val condition: Condition? = null,
    // 指示書
    val directive: Directive? = null,
    // カスタムクエスト（トレーナー指定メニュー）
    val customQuest: CustomQuest? = null,
    val showDirectiveEditDialog: Boolean = false,
    // ピンポイントカロリー調整
    val calorieOverride: com.yourcoach.plus.shared.domain.model.CalorieOverride? = null,
    val showCalorieOverrideDialog: Boolean = false,
    // ルーティン
    val todayRoutine: RoutineDay? = null,
    val isExecutingRoutine: Boolean = false,
    val routineSuccessMessage: String? = null,
    // 手動休養日設定（ルーティンとは独立）
    val isManualRestDay: Boolean = false,
    // 指示書実行
    val executedDirectiveItems: Set<Int> = emptySet(),
    val editedDirectiveTexts: Map<Int, String> = emptyMap(), // 編集されたクエストテキスト
    val isExecutingDirectiveItem: Boolean = false,
    // クエスト生成
    val isGeneratingQuest: Boolean = false,
    val questGenerationError: String? = null,
    val showQuestSettingsDialog: Boolean = false,
    // 食事編集
    val editingMeal: Meal? = null,
    val showMealEditDialog: Boolean = false,
    // 運動編集
    val editingWorkout: Workout? = null,
    val showWorkoutEditDialog: Boolean = false,
    // タイムライン表示
    val timelineSlots: List<TimelineSlotInfo> = emptyList(),
    val nextMealSlot: TimelineSlotInfo? = null,
    val timeUntilNextMeal: Int = 0,  // 分
    val currentTimeMinutes: Int = 0,  // 現在時刻（0:00からの分数）
    val trainingTimeMinutes: Int? = null,  // トレーニング時刻（0:00からの分数）
    val hasTimelineConfig: Boolean = false,  // タイムライン設定が有効か
    // Pro Cockpit UI用
    val unifiedTimeline: List<UnifiedTimelineItem> = emptyList(),
    val microIndicators: List<MicroIndicator> = emptyList(),
    val showMicroDetailSheet: Boolean = false,
    // お祝いモーダル
    val celebrationQueue: List<CelebrationInfo> = emptyList(),
    val currentCelebration: CelebrationInfo? = null,
    // RM記録
    val latestRmRecords: Map<String, RmRecord> = emptyMap(),
    val editingRmRecord: RmRecord? = null,
    val showRmEditDialog: Boolean = false,
    val showRmAddDialog: Boolean = false,
    // 運動クエスト完了シート
    val showWorkoutCompletionSheet: Boolean = false,
    val workoutCompletionItem: UnifiedTimelineItem? = null,
    val workoutCompletionExercises: List<WorkoutCompletionExercise> = emptyList()
)

/**
 * お祝い情報
 */
data class CelebrationInfo(
    val type: CelebrationInfoType,
    val level: Int? = null,
    val credits: Int? = null,
    val badgeId: String? = null,
    val badgeName: String? = null
)

enum class CelebrationInfoType {
    LEVEL_UP,
    BADGE_EARNED
}

/**
 * 運動クエスト完了シート用の種目データ
 * 統一カロリー計算式: (volume × 0.05) + (duration × 3)
 */
data class WorkoutCompletionExercise(
    val name: String,
    val category: String,
    val sets: Int,
    val reps: Int,
    val weight: Float?,
    val isWeightEstimated: Boolean = false,
    val rmPercentMin: Float? = null,
    val rmPercentMax: Float? = null
) {
    val duration: Int get() = sets * 5
    val volume: Float get() = sets * reps * (weight ?: 0f)
    val calories: Int get() = ((volume * 0.05f) + (duration * 3)).toInt().coerceAtLeast(0)
}

/**
 * 統合タイムラインアイテム（Pro Cockpit用）
 * 食事スロット（クエスト）、実際の食事記録、運動記録を統合
 */
data class UnifiedTimelineItem(
    val id: String,
    val type: TimelineItemType,
    val timeMinutes: Int,              // 0:00からの分数
    val timeString: String,            // "17:30"
    val title: String,                 // "トレ前" or "背中トレ"
    val subtitle: String?,             // "切り餅 2個 + ホエイ"
    val status: TimelineItemStatus,    // COMPLETED, CURRENT, UPCOMING
    val isTrainingRelated: Boolean = false,
    val actionItems: List<DirectiveActionItem>? = null, // クエストの場合
    val linkedMeal: Meal? = null,      // 実際の食事記録（記録済みの場合）
    val linkedWorkout: Workout? = null, // 実際の運動記録（記録済みの場合）
    val slotInfo: TimelineSlotInfo? = null, // 元のスロット情報
    val isCustomQuest: Boolean = false,     // カスタムクエスト（ゴールド枠表示用）
    val customQuestSlotKey: String? = null, // カスタムクエストのスロットキー (例: "meal_1")
    val customQuestItems: List<CustomQuestItem>? = null // カスタムクエストのアイテム（事前計算マクロミクロ付き）
) {
    val isRecorded: Boolean get() = linkedMeal != null || linkedWorkout != null
    val isQuest: Boolean get() = (slotInfo != null || isCustomQuest) && !isRecorded
}

enum class TimelineItemType { MEAL, WORKOUT, CONDITION }
enum class TimelineItemStatus { COMPLETED, CURRENT, UPCOMING }

/**
 * Micro+インジケーター（Pro Cockpit HUDヘッダー用）
 */
data class MicroIndicator(
    val type: MicroIndicatorType,
    val score: Float,                  // 0.0 - 1.0
    val status: IndicatorStatus,       // GOOD, WARNING, ALERT
    val label: String                  // "0.98", "⚠️" など
)

enum class MicroIndicatorType { DIAAS, FATTY_ACID, FIBER, VITAMIN_MINERAL }
enum class IndicatorStatus { GOOD, WARNING, ALERT }

/**
 * タイムラインスロット情報（計算済み時刻付き）
 */
data class TimelineSlotInfo(
    val slotNumber: Int,
    val displayName: String,
    val timeMinutes: Int,  // 0:00からの分数
    val timeString: String,  // "07:30"形式
    val isTrainingRelated: Boolean,  // トレ前後か
    val isCompleted: Boolean = false,  // 該当食事が記録済みか
    val relativeTimeLabel: String? = null,  // "起床+30分"などの表示用
    val foodExamples: List<String> = emptyList()  // コスト帯に応じた食品例
)

/**
 * 並列読み込み用データバンドル
 */
private data class DashboardDataBundle(
    val user: User?,
    val meals: List<Meal>,
    val workouts: List<Workout>,
    val score: DailyScore?,
    val streakInfo: StreakInfo,
    val condition: Condition?,
    val directive: Directive?,
    val customQuest: CustomQuest?,
    val calorieOverride: com.yourcoach.plus.shared.domain.model.CalorieOverride?,
    val todayRoutine: RoutineDay?,
    val isManualRestDay: Boolean
)

/**
 * ダッシュボードViewModel
 */
class DashboardViewModel(
    private val authRepository: AuthRepository,
    private val userRepository: UserRepository,
    private val mealRepository: MealRepository,
    private val workoutRepository: WorkoutRepository,
    private val scoreRepository: ScoreRepository,
    private val conditionRepository: ConditionRepository,
    private val directiveRepository: DirectiveRepository,
    private val routineRepository: RoutineRepository,
    private val badgeRepository: BadgeRepository,
    private val customQuestRepository: CustomQuestRepository,
    private val rmRepository: RmRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    // RM記録キャッシュ（種目名→最新のRmRecord）
    private var rmRecordCache: Map<String, RmRecord> = emptyMap()

    // AuthRepository経由で現在のユーザーIDを取得
    private val currentUserId: String?
        get() = authRepository.getCurrentUserId()

    init {
        loadDashboardData()
        checkLoginBonus()
    }

    /**
     * ログインボーナスをチェック・付与（1日1回10XP）
     */
    private fun checkLoginBonus() {
        val userId = currentUserId ?: return
        viewModelScope.launch {
            userRepository.checkAndGrantLoginBonus(userId)
                .onSuccess { granted ->
                    if (granted) {
                        android.util.Log.d("DashboardVM", "ログインボーナス付与: +10XP")
                    }
                    // ログイン時にバッジチェック
                    checkBadges()
                }
                .onFailure { e ->
                    android.util.Log.e("DashboardVM", "ログインボーナス確認エラー", e)
                }
        }
    }

    /**
     * バッジ達成チェック＆自動付与
     */
    private fun checkBadges() {
        android.util.Log.d("DashboardVM", "checkBadges: 開始")
        viewModelScope.launch {
            badgeRepository.checkAndAwardBadges()
                .onSuccess { awardedBadges ->
                    android.util.Log.d("DashboardVM", "checkBadges: 成功, バッジ数=${awardedBadges.size}")
                    if (awardedBadges.isNotEmpty()) {
                        android.util.Log.d("DashboardVM", "新規バッジ獲得: $awardedBadges")
                        // バッジ獲得のお祝いをキューに追加
                        awardedBadges.forEach { badgeId ->
                            android.util.Log.d("DashboardVM", "お祝いキュー追加: $badgeId")
                            queueCelebration(CelebrationInfo(
                                type = CelebrationInfoType.BADGE_EARNED,
                                badgeId = badgeId,
                                badgeName = getBadgeName(badgeId)
                            ))
                        }
                    }
                }
                .onFailure { e ->
                    android.util.Log.e("DashboardVM", "バッジチェックエラー", e)
                }
        }
    }

    /**
     * バッジ統計を更新
     */
    private fun updateBadgeStats(action: String, data: Map<String, Any>? = null) {
        android.util.Log.d("DashboardVM", "updateBadgeStats: action=$action")
        viewModelScope.launch {
            badgeRepository.updateBadgeStats(action, data)
                .onSuccess {
                    android.util.Log.d("DashboardVM", "updateBadgeStats: 成功、checkBadges呼び出し")
                    // 統計更新後にバッジチェック
                    checkBadges()
                }
                .onFailure { e ->
                    android.util.Log.e("DashboardVM", "updateBadgeStats: 失敗", e)
                }
        }
    }

    /**
     * 経験値を追加（レベルアップ時は無料クレジット+1）
     */
    private fun grantExperience(reason: String) {
        val userId = currentUserId ?: return
        viewModelScope.launch {
            userRepository.addExperience(userId, 10)
                .onSuccess { (newExp, leveledUp) ->
                    android.util.Log.d("DashboardVM", "$reason: +10XP (合計: $newExp XP)")
                    if (leveledUp) {
                        android.util.Log.d("DashboardVM", "レベルアップ! 無料クレジット+1")
                        // レベルアップのお祝いを表示
                        val newLevel = _uiState.value.user?.profile?.calculateLevel()?.plus(1) ?: 2
                        queueCelebration(CelebrationInfo(
                            type = CelebrationInfoType.LEVEL_UP,
                            level = newLevel,
                            credits = 1
                        ))
                        // ユーザーデータを再読み込み
                        loadDashboardData()
                    }
                }
                .onFailure { e ->
                    android.util.Log.e("DashboardVM", "経験値付与エラー: $reason", e)
                }
        }
    }

    /**
     * お祝いをキューに追加
     */
    private fun queueCelebration(celebration: CelebrationInfo) {
        android.util.Log.d("DashboardVM", "queueCelebration: ${celebration.type}, badgeId=${celebration.badgeId}")
        _uiState.update { state ->
            val newQueue = state.celebrationQueue + celebration
            // 現在表示中でなければ最初のものを表示開始
            if (state.currentCelebration == null && newQueue.isNotEmpty()) {
                android.util.Log.d("DashboardVM", "queueCelebration: 即時表示開始")
                state.copy(
                    celebrationQueue = newQueue.drop(1),
                    currentCelebration = newQueue.first()
                )
            } else {
                android.util.Log.d("DashboardVM", "queueCelebration: キューに追加 (現在表示中あり)")
                state.copy(celebrationQueue = newQueue)
            }
        }
    }

    /**
     * 現在のお祝いを閉じて次を表示
     */
    fun dismissCelebration() {
        _uiState.update { state ->
            val queue = state.celebrationQueue
            if (queue.isNotEmpty()) {
                state.copy(
                    celebrationQueue = queue.drop(1),
                    currentCelebration = queue.first()
                )
            } else {
                state.copy(currentCelebration = null)
            }
        }
    }

    /**
     * バッジIDから名前を取得
     */
    private fun getBadgeName(badgeId: String): String {
        return when (badgeId) {
            "streak_3" -> "3日連続"
            "streak_7" -> "1週間連続"
            "streak_14" -> "2週間連続"
            "streak_30" -> "1ヶ月連続"
            "streak_100" -> "100日連続"
            "nutrition_perfect_day" -> "パーフェクトデイ"
            "nutrition_protein_master" -> "プロテインマスター"
            "nutrition_balanced" -> "バランス上手"
            "exercise_first" -> "はじめの一歩"
            "exercise_60min" -> "60分達成"
            "exercise_variety" -> "多彩なトレーニング"
            "milestone_first_meal" -> "最初の一食"
            "milestone_10_meals" -> "10食達成"
            "milestone_100_meals" -> "100食達成"
            "milestone_first_analysis" -> "初めてのAI分析"
            "special_early_bird" -> "早起き鳥"
            "special_weekend_warrior" -> "週末戦士"
            "special_score_100" -> "パーフェクトスコア"
            else -> badgeId
        }
    }

    /**
     * ダッシュボードデータを読み込み
     * 複数のFirestore呼び出しを並列実行して高速化
     */
    fun loadDashboardData() {
        android.util.Log.d("DashboardVM", "loadDashboardData() 開始")
        viewModelScope.launch {
            val userId = currentUserId
            if (userId == null) {
                android.util.Log.d("DashboardVM", "loadDashboardData() userId=null, 中断")
                _uiState.update { it.copy(isLoading = false, error = "ログインが必要です") }
                return@launch
            }
            android.util.Log.d("DashboardVM", "loadDashboardData() userId=$userId")

            _uiState.update { it.copy(isLoading = true, error = null) }

            try {
                val date = _uiState.value.date

                // 全データを並列で取得（大幅な高速化）
                val (
                    user, meals, workouts, score, streakInfo,
                    condition, directive, customQuest, calorieOverride, todayRoutine, isManualRestDay
                ) = coroutineScope {
                    val userDeferred = async { userRepository.getUser(userId).getOrNull() }
                    val mealsDeferred = async { mealRepository.getMealsForDate(userId, date).getOrDefault(emptyList()) }
                    val workoutsDeferred = async { workoutRepository.getWorkoutsForDate(userId, date).getOrDefault(emptyList()) }
                    val scoreDeferred = async { scoreRepository.getScoreForDate(userId, date).getOrNull() }
                    val streakDeferred = async { scoreRepository.getStreakInfo(userId).getOrDefault(StreakInfo()) }
                    val conditionDeferred = async { conditionRepository.getCondition(userId, date).getOrNull() }
                    val directiveDeferred = async { directiveRepository.getDirective(userId, date).getOrNull() }
                    val customQuestDeferred = async { customQuestRepository.getCustomQuest(userId, date).getOrNull() }
                    val calorieOverrideDeferred = async { scoreRepository.getCalorieOverride(userId, date).getOrNull() }
                    val todayRoutineDeferred = async { routineRepository.getRoutineForDate(userId, date).getOrNull() }
                    val restDayDeferred = async { scoreRepository.getRestDayStatus(userId, date).getOrDefault(false) }

                    var loadedUser = userDeferred.await()

                    // GitLive Firebase SDKのバグ回避: Native Firebase SDKでorganizationNameを取得
                    if (loadedUser != null && loadedUser.organizationName == null) {
                        try {
                            val nativeOrgName = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
                                val task = com.google.firebase.firestore.FirebaseFirestore.getInstance()
                                    .collection("users")
                                    .document(userId)
                                    .get()
                                val doc = com.google.android.gms.tasks.Tasks.await(task)
                                doc.getString("organizationName")
                            }
                            if (nativeOrgName != null) {
                                loadedUser = loadedUser.copy(organizationName = nativeOrgName)
                            }
                        } catch (e: Exception) {
                            android.util.Log.e("DashboardVM", "Native Firebase check failed: ${e.message}")
                        }
                    }

                    DashboardDataBundle(
                        user = loadedUser,
                        meals = mealsDeferred.await(),
                        workouts = workoutsDeferred.await(),
                        score = scoreDeferred.await(),
                        streakInfo = streakDeferred.await(),
                        condition = conditionDeferred.await(),
                        directive = directiveDeferred.await(),
                        customQuest = customQuestDeferred.await(),
                        calorieOverride = calorieOverrideDeferred.await(),
                        todayRoutine = todayRoutineDeferred.await(),
                        isManualRestDay = restDayDeferred.await()
                    )
                }

                // RM記録を常に読み込む（レコードタブ表示 + クエストRM%計算用）
                rmRepository.getLatestRmByExercise(userId).onSuccess { records ->
                    rmRecordCache = records
                    _uiState.update { it.copy(latestRmRecords = records) }
                }

                // TDEEと目標PFCを計算（日常活動 + 目的調整 + トレ日加算）
                val (targetCalories, targetProtein, targetCarbs, targetFat) = calculateTargets(user, todayRoutine, isManualRestDay)

                // 合計栄養素を計算
                val totalCalories = meals.sumOf { it.totalCalories }
                val totalProtein = meals.sumOf { it.totalProtein.toDouble() }.toFloat()
                val totalCarbs = meals.sumOf { it.totalCarbs.toDouble() }.toFloat()
                val totalFat = meals.sumOf { it.totalFat.toDouble() }.toFloat()

                // 詳細栄養素を計算
                val isBodymaker = true  // 全ユーザー共通でボディメイカーモード
                val profile = user?.profile
                val weight = profile?.weight ?: 70f
                val bodyFatPercentage = profile?.bodyFatPercentage ?: 20f
                val lbm = weight * (1 - bodyFatPercentage / 100f)
                val mealsPerDay = profile?.mealsPerDay ?: 5
                val detailedNutrition = NutritionCalculator.calculate(meals, isBodymaker, lbm, mealsPerDay, profile?.goal)

                // タイムライン情報を計算（ルーティン連動）
                val timelineInfo = calculateTimelineInfo(user, meals, todayRoutine)

                _uiState.update {
                    it.copy(
                        isLoading = false,
                        user = user,
                        score = score,
                        meals = meals,
                        workouts = workouts,
                        streakInfo = streakInfo,
                        targetCalories = targetCalories,
                        targetProtein = targetProtein,
                        targetCarbs = targetCarbs,
                        targetFat = targetFat,
                        totalCalories = totalCalories,
                        totalProtein = totalProtein,
                        totalCarbs = totalCarbs,
                        totalFat = totalFat,
                        // 詳細栄養素
                        averageDiaas = detailedNutrition.averageDiaas,
                        saturatedFat = detailedNutrition.saturatedFat,
                        mediumChainFat = detailedNutrition.mediumChainFat,
                        monounsaturatedFat = detailedNutrition.monounsaturatedFat,
                        polyunsaturatedFat = detailedNutrition.polyunsaturatedFat,
                        fattyAcidScore = detailedNutrition.fattyAcidScore,
                        fattyAcidRating = detailedNutrition.fattyAcidRating,
                        fattyAcidLabel = detailedNutrition.fattyAcidLabel,
                        vitaminScores = detailedNutrition.vitaminScores,
                        mineralScores = detailedNutrition.mineralScores,
                        // GL管理・血糖管理
                        totalGL = detailedNutrition.totalGL,
                        glLimit = detailedNutrition.glLimit,
                        glScore = detailedNutrition.glScore,
                        glLabel = detailedNutrition.glLabel,
                        adjustedGL = detailedNutrition.adjustedGL,
                        bloodSugarRating = detailedNutrition.bloodSugarRating,
                        bloodSugarLabel = detailedNutrition.bloodSugarLabel,
                        highGIPercent = detailedNutrition.highGIPercent,
                        lowGIPercent = detailedNutrition.lowGIPercent,
                        glModifiers = detailedNutrition.glModifiers,
                        mealsPerDay = detailedNutrition.mealsPerDay,
                        mealGLLimit = detailedNutrition.mealGLLimit,
                        mealAbsoluteGLLimit = detailedNutrition.mealAbsoluteGLLimit,
                        // 食物繊維
                        totalFiber = detailedNutrition.totalFiber,
                        totalSolubleFiber = detailedNutrition.totalSolubleFiber,
                        totalInsolubleFiber = detailedNutrition.totalInsolubleFiber,
                        fiberScore = detailedNutrition.fiberScore,
                        fiberRating = detailedNutrition.fiberRating,
                        fiberLabel = detailedNutrition.fiberLabel,
                        carbFiberRatio = detailedNutrition.carbFiberRatio,
                        condition = condition,
                        directive = directive,
                        customQuest = customQuest,
                        calorieOverride = calorieOverride,
                        todayRoutine = todayRoutine,
                        isManualRestDay = isManualRestDay,
                        // Firestoreから保存済みの完了状態を復元
                        executedDirectiveItems = directive?.executedItems?.toSet() ?: emptySet(),
                        // タイムライン
                        timelineSlots = timelineInfo.slots,
                        nextMealSlot = timelineInfo.nextMealSlot,
                        timeUntilNextMeal = timelineInfo.timeUntilNextMeal,
                        currentTimeMinutes = timelineInfo.currentTimeMinutes,
                        trainingTimeMinutes = timelineInfo.trainingTimeMinutes,
                        hasTimelineConfig = timelineInfo.hasTimelineConfig,
                        // Pro Cockpit UI用
                        unifiedTimeline = buildUnifiedTimeline(
                            timelineSlots = timelineInfo.slots,
                            meals = meals,
                            workouts = workouts,
                            directive = directive,
                            customQuest = customQuest,
                            currentTimeMinutes = timelineInfo.currentTimeMinutes,
                            trainingTimeMinutes = timelineInfo.trainingTimeMinutes
                        ),
                        microIndicators = buildMicroIndicators(
                            averageDiaas = detailedNutrition.averageDiaas,
                            fattyAcidScore = detailedNutrition.fattyAcidScore,
                            fiberScore = detailedNutrition.fiberScore,
                            vitaminScores = detailedNutrition.vitaminScores,
                            mineralScores = detailedNutrition.mineralScores
                        )
                    )
                }

                // カロリーオーバーライドが存在する場合は目標値を再計算
                if (calorieOverride != null) {
                    recalculateTargetsWithOverride(calorieOverride)
                }

                // 新規バッジがあればお祝いモーダルを表示
                android.util.Log.d("DashboardVM", "loadDashboardData() 完了、checkBadges呼び出し")
                checkBadges()
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = e.message ?: "データの読み込みに失敗しました"
                    )
                }
            }
        }
    }

    /**
     * ユーザープロフィールから目標PFCを取得
     * TDEE（日常活動）+ 目的調整 + トレ日加算で計算
     */
    private fun calculateTargets(
        user: User?,
        todayRoutine: com.yourcoach.plus.shared.domain.model.RoutineDay? = null,
        isManualRestDay: Boolean = false
    ): NutritionTargets {
        val profile = user?.profile

        if (profile == null || profile.weight == null) {
            // デフォルト値
            return NutritionTargets(2000, 120f, 250f, 60f)
        }

        val weight = profile.weight!!
        val bodyFatPercentage = profile.bodyFatPercentage ?: 20f

        // LBM（除脂肪体重）を計算
        val lbm = weight * (1 - bodyFatPercentage / 100)
        val fatMass = weight - lbm

        // BMR計算（Katch-McArdle式 + 脂肪組織代謝）
        val lbmMetabolism = 370 + (21.6 * lbm)
        val fatMetabolism = fatMass * 4.5f
        val bmr = lbmMetabolism + fatMetabolism

        // 日常活動係数（運動を除く）
        val activityMultiplier = profile.activityLevel?.multiplier
            ?: com.yourcoach.plus.shared.domain.model.ActivityLevel.DESK_WORK.multiplier

        // TDEE計算（日常活動のみ）
        val tdee = (bmr * activityMultiplier).toFloat()

        // 目標に応じたカロリー調整
        val goalAdjustment = when (profile.goal) {
            com.yourcoach.plus.shared.domain.model.FitnessGoal.LOSE_WEIGHT -> -300f
            com.yourcoach.plus.shared.domain.model.FitnessGoal.GAIN_MUSCLE -> 300f
            com.yourcoach.plus.shared.domain.model.FitnessGoal.MAINTAIN -> 0f
            else -> 0f
        }

        // カスタムカロリー調整がプロフィールにある場合は優先
        val calorieAdjustment = if (profile.calorieAdjustment != 0) {
            profile.calorieAdjustment.toFloat()
        } else {
            goalAdjustment
        }

        // トレ日加算（ルーティンから部位を取得）
        val isRestDay = isManualRestDay || (todayRoutine?.isRestDay == true)
        val trainingBonus = com.yourcoach.plus.shared.domain.model.TrainingCalorieBonus.fromSplitType(
            todayRoutine?.splitType,
            isRestDay,
            overrides = profile.trainingCalorieBonuses
        )

        val adjustedCalories = tdee + calorieAdjustment + trainingBonus

        // PFC比率から計算（デフォルト P30/F25/C45）
        val proteinRatio = profile.proteinRatioPercent / 100f
        val fatRatio = profile.fatRatioPercent / 100f
        val carbRatio = profile.carbRatioPercent / 100f

        val targetProtein = adjustedCalories * proteinRatio / 4f
        val targetFat = adjustedCalories * fatRatio / 9f
        val targetCarbs = adjustedCalories * carbRatio / 4f

        return NutritionTargets(
            adjustedCalories.toInt(),
            targetProtein,
            targetCarbs,
            targetFat
        )
    }

    /**
     * 日付を変更
     */
    fun changeDate(date: String) {
        _uiState.update {
            it.copy(
                date = date,
                dateDisplay = DateUtil.formatDateForDisplay(date)
            )
        }
        loadDashboardData()
    }

    /**
     * 前日へ
     */
    fun goToPreviousDay() {
        val previousDate = DateUtil.previousDay(_uiState.value.date)
        changeDate(previousDate)
    }

    /**
     * 翌日へ（未来日も許可）
     */
    fun goToNextDay() {
        val currentDate = _uiState.value.date
        val nextDate = DateUtil.nextDay(currentDate)
        changeDate(nextDate)
    }

    /**
     * 今日に戻る
     */
    fun goToToday() {
        changeDate(DateUtil.todayString())
    }

    /**
     * エラーをクリア
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    /**
     * 成功メッセージをクリア
     */
    fun clearSuccessMessage() {
        _uiState.update { it.copy(successMessage = null) }
    }

    // ========== RM記録操作 ==========

    fun showRmEditDialog(record: RmRecord) {
        _uiState.update { it.copy(editingRmRecord = record, showRmEditDialog = true) }
    }

    fun hideRmEditDialog() {
        _uiState.update { it.copy(editingRmRecord = null, showRmEditDialog = false) }
    }

    fun showRmAddDialog() {
        _uiState.update { it.copy(showRmAddDialog = true) }
    }

    fun hideRmAddDialog() {
        _uiState.update { it.copy(showRmAddDialog = false) }
    }

    /**
     * RM記録を新規追加
     */
    fun addRmRecord(exerciseName: String, category: String, weight: Float, reps: Int) {
        val userId = currentUserId ?: return
        viewModelScope.launch {
            val record = RmRecord(
                exerciseName = exerciseName,
                category = category,
                weight = weight,
                reps = reps,
                timestamp = DateUtil.currentTimestamp(),
                createdAt = DateUtil.currentTimestamp()
            )
            rmRepository.addRmRecord(userId, record).onSuccess {
                rmRecordCache = rmRecordCache.toMutableMap().apply { put(exerciseName, record) }
                _uiState.update { it.copy(
                    latestRmRecords = rmRecordCache,
                    showRmAddDialog = false,
                    successMessage = "${exerciseName}のRM記録を追加しました"
                ) }
            }.onFailure { e ->
                _uiState.update { it.copy(error = e.message ?: "RM記録の追加に失敗しました") }
            }
        }
    }

    /**
     * RM記録を更新（新しいレコードとして追加 → 履歴に残る）
     */
    fun updateRmRecord(exerciseName: String, category: String, weight: Float, reps: Int) {
        val userId = currentUserId ?: return
        viewModelScope.launch {
            val record = RmRecord(
                exerciseName = exerciseName,
                category = category,
                weight = weight,
                reps = reps,
                timestamp = DateUtil.currentTimestamp(),
                createdAt = DateUtil.currentTimestamp()
            )
            rmRepository.addRmRecord(userId, record).onSuccess {
                // キャッシュとUI更新
                rmRecordCache = rmRecordCache.toMutableMap().apply { put(exerciseName, record) }
                _uiState.update { it.copy(
                    latestRmRecords = rmRecordCache,
                    editingRmRecord = null,
                    showRmEditDialog = false,
                    successMessage = "${exerciseName}のRM記録を更新しました"
                ) }
            }.onFailure { e ->
                _uiState.update { it.copy(error = e.message ?: "RM記録の更新に失敗しました") }
            }
        }
    }

    /**
     * RM記録を削除（Firestore + UI）
     */
    fun deleteRmRecord(record: RmRecord) {
        val userId = currentUserId ?: return
        if (record.id.isEmpty()) return
        viewModelScope.launch {
            rmRepository.deleteRmRecord(userId, record.id).onSuccess {
                rmRecordCache = rmRecordCache.toMutableMap().apply { remove(record.exerciseName) }
                _uiState.update { it.copy(
                    latestRmRecords = rmRecordCache,
                    editingRmRecord = null,
                    showRmEditDialog = false
                ) }
            }.onFailure { e ->
                _uiState.update { it.copy(error = e.message ?: "RM記録の削除に失敗しました") }
            }
        }
    }

    /**
     * データをリフレッシュ
     */
    fun refresh() {
        android.util.Log.d("DashboardVM", "refresh() 呼び出し")
        loadDashboardData()
    }

    /**
     * コンディションを更新
     */
    fun updateCondition(
        sleepHours: Int? = null,
        sleepQuality: Int? = null,
        digestion: Int? = null,
        focus: Int? = null,
        stress: Int? = null
    ) {
        val userId = currentUserId ?: return

        viewModelScope.launch {
            val currentCondition = _uiState.value.condition ?: Condition(
                userId = userId,
                date = _uiState.value.date
            )

            val updatedCondition = currentCondition.copy(
                sleepHours = sleepHours ?: currentCondition.sleepHours,
                sleepQuality = sleepQuality ?: currentCondition.sleepQuality,
                digestion = digestion ?: currentCondition.digestion,
                focus = focus ?: currentCondition.focus,
                stress = stress ?: currentCondition.stress,
                updatedAt = System.currentTimeMillis()
            )

            conditionRepository.saveCondition(updatedCondition)
                .onSuccess {
                    _uiState.update { it.copy(condition = updatedCondition) }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(error = e.message) }
                }
        }
    }

    /**
     * 指示書を完了
     */
    fun completeDirective() {
        val userId = currentUserId ?: return

        viewModelScope.launch {
            val date = _uiState.value.date
            directiveRepository.completeDirective(userId, date)
                .onSuccess {
                    val currentDirective = _uiState.value.directive
                    if (currentDirective != null) {
                        _uiState.update { it.copy(directive = currentDirective.copy(completed = true)) }
                    }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(error = e.message) }
                }
        }
    }

    /**
     * 指示書を更新
     */
    fun updateDirective(newMessage: String) {
        viewModelScope.launch {
            val currentDirective = _uiState.value.directive ?: return@launch
            val updatedDirective = currentDirective.copy(message = newMessage)

            directiveRepository.updateDirective(updatedDirective)
                .onSuccess {
                    _uiState.update { it.copy(directive = updatedDirective, showDirectiveEditDialog = false) }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(error = e.message) }
                }
        }
    }

    /**
     * 指示書を削除
     */
    fun deleteDirective() {
        val userId = currentUserId ?: return

        viewModelScope.launch {
            val date = _uiState.value.date
            directiveRepository.deleteDirective(userId, date)
                .onSuccess {
                    _uiState.update { it.copy(directive = null, showDirectiveEditDialog = false) }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(error = e.message) }
                }
        }
    }

    /**
     * 指示書編集ダイアログ表示
     */
    fun showDirectiveEditDialog() {
        _uiState.update { it.copy(showDirectiveEditDialog = true) }
    }

    /**
     * 指示書編集ダイアログ非表示
     */
    fun hideDirectiveEditDialog() {
        _uiState.update { it.copy(showDirectiveEditDialog = false) }
    }

    // ===== ピンポイントカロリー調整 =====

    /**
     * ピンポイントカロリー調整ダイアログを表示
     */
    fun showCalorieOverrideDialog() {
        _uiState.update { it.copy(showCalorieOverrideDialog = true) }
    }

    /**
     * ピンポイントカロリー調整ダイアログを非表示
     */
    fun hideCalorieOverrideDialog() {
        _uiState.update { it.copy(showCalorieOverrideDialog = false) }
    }

    /**
     * ピンポイントカロリー調整を適用
     */
    fun applyCalorieOverride(override: com.yourcoach.plus.shared.domain.model.CalorieOverride) {
        val userId = currentUserId ?: return

        viewModelScope.launch {
            val date = _uiState.value.date
            scoreRepository.applyCalorieOverride(userId, date, override)
                .onSuccess {
                    _uiState.update { state ->
                        state.copy(
                            calorieOverride = override,
                            showCalorieOverrideDialog = false
                        )
                    }
                    // 目標カロリー・PFCを再計算
                    recalculateTargetsWithOverride(override)
                }
                .onFailure { e ->
                    _uiState.update { it.copy(error = e.message) }
                }
        }
    }

    /**
     * ピンポイントカロリー調整を解除
     */
    fun clearCalorieOverride() {
        val userId = currentUserId ?: return

        viewModelScope.launch {
            val date = _uiState.value.date
            scoreRepository.clearCalorieOverride(userId, date)
                .onSuccess {
                    _uiState.update { it.copy(calorieOverride = null) }
                    // 元の目標に戻す
                    val state = _uiState.value
                    val user = state.user
                    val (targetCalories, targetProtein, targetCarbs, targetFat) = calculateTargets(user, state.todayRoutine, state.isManualRestDay)
                    _uiState.update { state ->
                        state.copy(
                            targetCalories = targetCalories,
                            targetProtein = targetProtein,
                            targetCarbs = targetCarbs,
                            targetFat = targetFat
                        )
                    }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(error = e.message) }
                }
        }
    }

    /**
     * オーバーライドに基づいて目標カロリー・PFCを再計算
     */
    private fun recalculateTargetsWithOverride(override: com.yourcoach.plus.shared.domain.model.CalorieOverride) {
        val state = _uiState.value
        val user = state.user
        val (baseCalories, _, _, _) = calculateTargets(user, state.todayRoutine, state.isManualRestDay)

        // カロリー調整を適用
        val adjustedCalories = baseCalories + override.calorieAdjustment

        // PFC比率を適用
        val pfcRatio = override.pfcOverride
        val targetProtein: Float
        val targetFat: Float
        val targetCarbs: Float

        if (pfcRatio != null) {
            targetProtein = (adjustedCalories * pfcRatio.protein / 100f / 4f)
            targetFat = (adjustedCalories * pfcRatio.fat / 100f / 9f)
            targetCarbs = (adjustedCalories * pfcRatio.carbs / 100f / 4f)
        } else {
            // デフォルト比率（P30:F25:C45）
            targetProtein = (adjustedCalories * 0.30f / 4f)
            targetFat = (adjustedCalories * 0.25f / 9f)
            targetCarbs = (adjustedCalories * 0.45f / 4f)
        }

        _uiState.update { state ->
            state.copy(
                targetCalories = adjustedCalories,
                targetProtein = targetProtein,
                targetCarbs = targetCarbs,
                targetFat = targetFat
            )
        }
    }

    /**
     * 食事を削除
     */
    fun deleteMeal(meal: Meal) {
        val userId = currentUserId ?: return

        viewModelScope.launch {
            mealRepository.deleteMeal(userId, meal.id)
                .onSuccess {
                    // 食事リストから削除して再計算
                    val updatedMeals = _uiState.value.meals.filter { it.id != meal.id }
                    val user = _uiState.value.user
                    val isBodymaker = true  // 全ユーザー共通でボディメイカーモード
                    val profile = user?.profile
                    val weight = profile?.weight ?: 70f
                    val bodyFatPercentage = profile?.bodyFatPercentage ?: 20f
                    val lbm = weight * (1 - bodyFatPercentage / 100f)
                    val mealsPerDay = profile?.mealsPerDay ?: 5
                    val detailedNutrition = NutritionCalculator.calculate(updatedMeals, isBodymaker, lbm, mealsPerDay, profile?.goal)

                    _uiState.update { state ->
                        state.copy(
                            meals = updatedMeals,
                            totalCalories = updatedMeals.sumOf { it.totalCalories },
                            totalProtein = updatedMeals.sumOf { it.totalProtein.toDouble() }.toFloat(),
                            totalCarbs = updatedMeals.sumOf { it.totalCarbs.toDouble() }.toFloat(),
                            totalFat = updatedMeals.sumOf { it.totalFat.toDouble() }.toFloat(),
                            // 詳細栄養素
                            averageDiaas = detailedNutrition.averageDiaas,
                            saturatedFat = detailedNutrition.saturatedFat,
                            mediumChainFat = detailedNutrition.mediumChainFat,
                            monounsaturatedFat = detailedNutrition.monounsaturatedFat,
                            polyunsaturatedFat = detailedNutrition.polyunsaturatedFat,
                            fattyAcidScore = detailedNutrition.fattyAcidScore,
                            fattyAcidRating = detailedNutrition.fattyAcidRating,
                            fattyAcidLabel = detailedNutrition.fattyAcidLabel,
                            vitaminScores = detailedNutrition.vitaminScores,
                            mineralScores = detailedNutrition.mineralScores,
                            // GL管理・血糖管理
                            totalGL = detailedNutrition.totalGL,
                            glScore = detailedNutrition.glScore,
                            glLabel = detailedNutrition.glLabel,
                            adjustedGL = detailedNutrition.adjustedGL,
                            bloodSugarRating = detailedNutrition.bloodSugarRating,
                            bloodSugarLabel = detailedNutrition.bloodSugarLabel,
                            highGIPercent = detailedNutrition.highGIPercent,
                            lowGIPercent = detailedNutrition.lowGIPercent,
                            glModifiers = detailedNutrition.glModifiers,
                            mealsPerDay = detailedNutrition.mealsPerDay,
                            mealGLLimit = detailedNutrition.mealGLLimit,
                        mealAbsoluteGLLimit = detailedNutrition.mealAbsoluteGLLimit,
                            // 食物繊維
                            totalFiber = detailedNutrition.totalFiber,
                            totalSolubleFiber = detailedNutrition.totalSolubleFiber,
                            totalInsolubleFiber = detailedNutrition.totalInsolubleFiber,
                            fiberScore = detailedNutrition.fiberScore,
                            fiberRating = detailedNutrition.fiberRating,
                            fiberLabel = detailedNutrition.fiberLabel,
                            carbFiberRatio = detailedNutrition.carbFiberRatio
                        )
                    }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(error = e.message) }
                }
        }
    }

    // ========== 食事編集関連 ==========

    /**
     * 食事編集ダイアログを表示
     */
    fun showMealEditDialog(meal: Meal) {
        _uiState.update { it.copy(editingMeal = meal, showMealEditDialog = true) }
    }

    /**
     * 食事編集ダイアログを非表示
     */
    fun hideMealEditDialog() {
        _uiState.update { it.copy(editingMeal = null, showMealEditDialog = false) }
    }

    /**
     * 食事を更新
     */
    fun updateMeal(updatedMeal: Meal) {
        viewModelScope.launch {
            mealRepository.updateMeal(updatedMeal)
                .onSuccess {
                    _uiState.update { state ->
                        state.copy(
                            showMealEditDialog = false,
                            editingMeal = null,
                            successMessage = "食事を更新しました"
                        )
                    }
                    // データを再読み込み
                    loadDashboardData()
                }
                .onFailure { e ->
                    _uiState.update { it.copy(error = e.message) }
                }
        }
    }

    /**
     * 食事をテンプレートとして保存
     */
    fun saveMealAsTemplate(meal: Meal) {
        val userId = currentUserId ?: return

        viewModelScope.launch {
            val template = com.yourcoach.plus.shared.domain.model.MealTemplate(
                id = java.util.UUID.randomUUID().toString(),
                userId = userId,
                name = meal.name ?: when (meal.type) {
                    com.yourcoach.plus.shared.domain.model.MealType.BREAKFAST -> "朝食"
                    com.yourcoach.plus.shared.domain.model.MealType.LUNCH -> "昼食"
                    com.yourcoach.plus.shared.domain.model.MealType.DINNER -> "夕食"
                    com.yourcoach.plus.shared.domain.model.MealType.SNACK -> "間食"
                    com.yourcoach.plus.shared.domain.model.MealType.SUPPLEMENT -> "サプリ"
                },
                items = meal.items,
                totalCalories = meal.totalCalories,
                totalProtein = meal.totalProtein,
                totalCarbs = meal.totalCarbs,
                totalFat = meal.totalFat,
                createdAt = System.currentTimeMillis()
            )

            mealRepository.saveMealTemplate(template)
                .onSuccess {
                    _uiState.update { it.copy(successMessage = "テンプレートを保存しました") }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(error = e.message) }
                }
        }
    }

    // ========== 運動編集関連 ==========

    /**
     * 運動編集ダイアログを表示
     */
    fun showWorkoutEditDialog(workout: Workout) {
        _uiState.update { it.copy(editingWorkout = workout, showWorkoutEditDialog = true) }
    }

    /**
     * 運動編集ダイアログを非表示
     */
    fun hideWorkoutEditDialog() {
        _uiState.update { it.copy(editingWorkout = null, showWorkoutEditDialog = false) }
    }

    /**
     * 運動を更新
     */
    fun updateWorkout(updatedWorkout: Workout) {
        viewModelScope.launch {
            workoutRepository.updateWorkout(updatedWorkout)
                .onSuccess {
                    _uiState.update { state ->
                        state.copy(
                            showWorkoutEditDialog = false,
                            editingWorkout = null,
                            successMessage = "運動を更新しました"
                        )
                    }
                    // データを再読み込み
                    loadDashboardData()
                }
                .onFailure { e ->
                    _uiState.update { it.copy(error = e.message) }
                }
        }
    }

    /**
     * 運動を削除
     */
    fun deleteWorkout(workout: Workout) {
        val userId = currentUserId ?: return

        viewModelScope.launch {
            workoutRepository.deleteWorkout(userId, workout.id)
                .onSuccess {
                    // 運動リストから削除
                    val updatedWorkouts = _uiState.value.workouts.filter { it.id != workout.id }
                    _uiState.update { state ->
                        state.copy(
                            workouts = updatedWorkouts,
                            successMessage = "運動を削除しました"
                        )
                    }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(error = e.message) }
                }
        }
    }

    /**
     * 運動をテンプレートとして保存
     */
    fun saveWorkoutAsTemplate(workout: Workout) {
        val userId = currentUserId ?: return

        viewModelScope.launch {
            val template = com.yourcoach.plus.shared.domain.model.WorkoutTemplate(
                id = java.util.UUID.randomUUID().toString(),
                userId = userId,
                name = workout.name ?: when (workout.type) {
                    com.yourcoach.plus.shared.domain.model.WorkoutType.STRENGTH -> "筋トレ"
                    com.yourcoach.plus.shared.domain.model.WorkoutType.CARDIO -> "有酸素"
                    com.yourcoach.plus.shared.domain.model.WorkoutType.FLEXIBILITY -> "柔軟"
                    com.yourcoach.plus.shared.domain.model.WorkoutType.SPORTS -> "スポーツ"
                    com.yourcoach.plus.shared.domain.model.WorkoutType.DAILY_ACTIVITY -> "日常活動"
                },
                type = workout.type,
                exercises = workout.exercises,
                estimatedDuration = workout.totalDuration,
                estimatedCalories = workout.totalCaloriesBurned,
                createdAt = System.currentTimeMillis()
            )

            workoutRepository.saveWorkoutTemplate(template)
                .onSuccess {
                    _uiState.update { it.copy(successMessage = "テンプレートを保存しました") }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(error = e.message) }
                }
        }
    }

    // ========== ルーティン関連 ==========

    /**
     * 今日のルーティンをワンタップ実行（食事・運動を一括記録）
     */
    fun executeRoutine() {
        val userId = currentUserId ?: return
        val todayRoutine = _uiState.value.todayRoutine ?: return

        viewModelScope.launch {
            _uiState.update { it.copy(isExecutingRoutine = true) }

            val today = _uiState.value.date
            routineRepository.executeRoutine(userId, today, todayRoutine)
                .onSuccess { count ->
                    _uiState.update {
                        it.copy(
                            isExecutingRoutine = false,
                            routineSuccessMessage = "${count}件の記録を完了しました"
                        )
                    }
                    // データを再読み込み
                    loadDashboardData()
                }
                .onFailure { e ->
                    _uiState.update {
                        it.copy(
                            isExecutingRoutine = false,
                            error = e.message ?: "ルーティンの実行に失敗しました"
                        )
                    }
                }
        }
    }

    /**
     * 今日の食事ルーティンのみ実行
     */
    fun executeRoutineMeals() {
        val userId = currentUserId ?: return
        val todayRoutine = _uiState.value.todayRoutine ?: return

        viewModelScope.launch {
            _uiState.update { it.copy(isExecutingRoutine = true) }

            val today = _uiState.value.date
            routineRepository.executeRoutineMeals(userId, today, todayRoutine)
                .onSuccess { count ->
                    _uiState.update {
                        it.copy(
                            isExecutingRoutine = false,
                            routineSuccessMessage = "${count}件の食事を記録しました"
                        )
                    }
                    loadDashboardData()
                }
                .onFailure { e ->
                    _uiState.update {
                        it.copy(
                            isExecutingRoutine = false,
                            error = e.message ?: "食事の記録に失敗しました"
                        )
                    }
                }
        }
    }

    /**
     * 今日の運動ルーティンのみ実行
     */
    fun executeRoutineWorkouts() {
        val userId = currentUserId ?: return
        val todayRoutine = _uiState.value.todayRoutine ?: return

        viewModelScope.launch {
            _uiState.update { it.copy(isExecutingRoutine = true) }

            val today = _uiState.value.date
            routineRepository.executeRoutineWorkouts(userId, today, todayRoutine)
                .onSuccess { count ->
                    _uiState.update {
                        it.copy(
                            isExecutingRoutine = false,
                            routineSuccessMessage = "${count}件の運動を記録しました"
                        )
                    }
                    loadDashboardData()
                }
                .onFailure { e ->
                    _uiState.update {
                        it.copy(
                            isExecutingRoutine = false,
                            error = e.message ?: "運動の記録に失敗しました"
                        )
                    }
                }
        }
    }

    /**
     * ルーティン成功メッセージをクリア
     */
    fun clearRoutineSuccessMessage() {
        _uiState.update { it.copy(routineSuccessMessage = null) }
    }

    /**
     * 手動休養日を切り替え（ルーティンとは独立）
     */
    fun toggleRestDay(isRestDay: Boolean) {
        val userId = currentUserId ?: return
        val date = _uiState.value.date

        viewModelScope.launch {
            // UIを即座に更新
            _uiState.update { it.copy(isManualRestDay = isRestDay) }

            // Firestoreに保存（dailyScoresのrestDayフィールドとして保存）
            scoreRepository.updateRestDayStatus(userId, date, isRestDay)
                .onFailure { e ->
                    // エラー時はUIを戻す
                    _uiState.update { it.copy(
                        isManualRestDay = !isRestDay,
                        error = "休養日の設定に失敗しました"
                    ) }
                }
        }
    }

    // ========== タイムライン自動記録 ==========

    /**
     * タイムラインスロットから食事を自動記録
     * slotInfo.foodExamples（例: ["鶏むね肉", "白米"]）から食事を作成して記録
     */
    fun recordMealFromTimelineSlot(item: UnifiedTimelineItem) {
        val userId = currentUserId ?: return
        val slotInfo = item.slotInfo ?: return

        if (slotInfo.foodExamples.isEmpty()) {
            _uiState.update { it.copy(error = "食材情報がありません") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isExecutingDirectiveItem = true) }

            try {
                val mealItems = mutableListOf<MealItem>()
                var totalCalories = 0
                var totalProtein = 0f
                var totalCarbs = 0f
                var totalFat = 0f
                var totalFiber = 0f
                var totalGL = 0f

                // 各食材例から MealItem を作成
                for (foodName in slotInfo.foodExamples) {
                    val cleanedName = cleanFoodName(foodName)
                    val foodData = searchFoodFlexible(cleanedName) ?: searchFoodFlexible(foodName)

                    // デフォルト量を決定
                    val defaultAmount = when {
                        foodName.contains("プロテイン") -> 30f
                        foodName.contains("米") -> 150f
                        foodName.contains("餅") -> 100f
                        foodName.contains("肉") -> 150f
                        foodName.contains("魚") || foodName.contains("鮭") || foodName.contains("サバ") -> 100f
                        foodName.contains("岩塩") || foodName.contains("塩") -> 3f
                        else -> 100f
                    }

                    val mealItem = createMealItemFromFood(foodData, foodName, defaultAmount, "g")

                    android.util.Log.d("DashboardVM", "Timeline record: ${mealItem.name} ${mealItem.amount}g (${mealItem.calories}kcal)")

                    mealItems.add(mealItem)
                    totalCalories += mealItem.calories
                    totalProtein += mealItem.protein
                    totalCarbs += mealItem.carbs
                    totalFat += mealItem.fat
                    totalFiber += mealItem.fiber
                    if (mealItem.gi > 0 && mealItem.carbs > 0) {
                        totalGL += (mealItem.gi * mealItem.carbs / 100f)
                    }
                }

                // 選択中の日付 + スロット時刻でタイムスタンプを作成
                val selectedDate = _uiState.value.date
                val baseTimestamp = DateUtil.dateStringToTimestamp(selectedDate)
                val targetTimestamp = baseTimestamp + (slotInfo.timeMinutes * 60 * 1000L)

                val meal = Meal(
                    id = "",
                    userId = userId,
                    name = slotInfo.displayName,
                    type = MealType.SNACK,
                    items = mealItems,
                    totalCalories = totalCalories,
                    totalProtein = totalProtein,
                    totalCarbs = totalCarbs,
                    totalFat = totalFat,
                    totalFiber = totalFiber,
                    totalGL = totalGL,
                    isTemplate = false,
                    timestamp = targetTimestamp,
                    createdAt = System.currentTimeMillis()
                )

                mealRepository.addMeal(meal)
                    .onSuccess {
                        android.util.Log.d("DashboardVM", "Timeline meal recorded: ${slotInfo.displayName}")
                        _uiState.update { it.copy(successMessage = "${slotInfo.displayName}を記録しました") }
                        // バッジ統計更新
                        updateBadgeStats("meal_recorded")
                        loadDashboardData()
                    }
                    .onFailure { e ->
                        android.util.Log.e("DashboardVM", "Timeline meal record failed: ${e.message}")
                        _uiState.update { it.copy(error = "記録に失敗しました: ${e.message}") }
                    }
            } finally {
                _uiState.update { it.copy(isExecutingDirectiveItem = false) }
            }
        }
    }

    /**
     * Directiveの食事アイテムをタイムラインから自動記録
     */
    fun recordMealFromDirectiveItem(item: UnifiedTimelineItem) {
        val actionItem = item.actionItems?.firstOrNull() ?: return
        executeDirectiveItemWithTime(actionItem, item.timeMinutes)
    }

    /**
     * カスタムクエスト（トレーナー指定）の食事を自動記録
     * 事前計算済みマクロミクロをそのままMealとして保存（FoodDB検索なし）
     */
    fun recordMealFromCustomQuest(item: UnifiedTimelineItem) {
        val userId = currentUserId ?: return
        val slotKey = item.customQuestSlotKey ?: return
        val questItems = item.customQuestItems ?: return

        viewModelScope.launch {
            _uiState.update { it.copy(isExecutingDirectiveItem = true) }
            try {
                val selectedDate = _uiState.value.date
                val baseTimestamp = DateUtil.dateStringToTimestamp(selectedDate)
                val targetTimestamp = baseTimestamp + (item.timeMinutes * 60 * 1000L)

                val mealItems = questItems.map { cqItem ->
                    MealItem(
                        name = cqItem.foodName,
                        amount = cqItem.amount,
                        unit = cqItem.unit,
                        calories = MealItem.calculateCalories(cqItem.protein, cqItem.fat, cqItem.carbs),
                        protein = cqItem.protein,
                        carbs = cqItem.carbs,
                        fat = cqItem.fat,
                        fiber = cqItem.fiber,
                        solubleFiber = cqItem.solubleFiber,
                        insolubleFiber = cqItem.insolubleFiber,
                        sugar = cqItem.sugar,
                        saturatedFat = cqItem.saturatedFat,
                        monounsaturatedFat = cqItem.monounsaturatedFat,
                        polyunsaturatedFat = cqItem.polyunsaturatedFat,
                        diaas = cqItem.diaas,
                        gi = cqItem.gi,
                        vitamins = cqItem.vitamins,
                        minerals = cqItem.minerals
                    )
                }

                val totalCalories = mealItems.sumOf { it.calories }
                val totalProtein = mealItems.sumOf { it.protein.toDouble() }.toFloat()
                val totalCarbs = mealItems.sumOf { it.carbs.toDouble() }.toFloat()
                val totalFat = mealItems.sumOf { it.fat.toDouble() }.toFloat()
                val totalFiber = mealItems.sumOf { it.fiber.toDouble() }.toFloat()
                val totalGL = mealItems.sumOf {
                    if (it.gi > 0 && it.carbs > 0) (it.gi * it.carbs / 100f).toDouble() else 0.0
                }.toFloat()

                val meal = Meal(
                    id = "",
                    userId = userId,
                    name = "カスタム: ${item.title}",
                    type = MealType.SNACK,
                    items = mealItems,
                    totalCalories = totalCalories,
                    totalProtein = totalProtein,
                    totalCarbs = totalCarbs,
                    totalFat = totalFat,
                    totalFiber = totalFiber,
                    totalGL = totalGL,
                    isTemplate = true,
                    timestamp = targetTimestamp,
                    createdAt = System.currentTimeMillis()
                )

                mealRepository.addMeal(meal)
                    .onSuccess {
                        android.util.Log.d("DashboardVM", "CustomQuest meal recorded: ${item.title}, ${mealItems.size} items, ${totalCalories}kcal")
                        markCustomQuestSlotCompleted(slotKey)
                        updateBadgeStats("meal_recorded")
                        _uiState.update { it.copy(successMessage = "${item.title}を記録しました（${totalCalories}kcal）") }
                        loadDashboardData()
                    }
                    .onFailure { e ->
                        android.util.Log.e("DashboardVM", "CustomQuest meal record failed: ${e.message}")
                        _uiState.update { it.copy(error = "記録に失敗しました: ${e.message}") }
                    }
            } finally {
                _uiState.update { it.copy(isExecutingDirectiveItem = false) }
            }
        }
    }

    /**
     * カスタムクエスト（トレーナー指定）の運動を自動記録
     * CustomQuestItemからExerciseリストを構築して保存
     */
    fun recordWorkoutFromCustomQuest(item: UnifiedTimelineItem) {
        val userId = currentUserId ?: return
        val slotKey = item.customQuestSlotKey ?: return
        val questItems = item.customQuestItems ?: return

        viewModelScope.launch {
            _uiState.update { it.copy(isExecutingDirectiveItem = true) }
            try {
                val selectedDate = _uiState.value.date
                val baseTimestamp = DateUtil.dateStringToTimestamp(selectedDate)
                val targetTimestamp = baseTimestamp + (item.timeMinutes * 60 * 1000L)

                // スロットタイトルからカロリー係数を取得（部位名が含まれるため正確）
                val slotCalorieCoeff = getCalorieCoefficient(item.title)

                val exercises = questItems.map { cqItem ->
                    val category = when (cqItem.category) {
                        "胸" -> com.yourcoach.plus.shared.domain.model.ExerciseCategory.CHEST
                        "背中" -> com.yourcoach.plus.shared.domain.model.ExerciseCategory.BACK
                        "肩" -> com.yourcoach.plus.shared.domain.model.ExerciseCategory.SHOULDERS
                        "腕" -> com.yourcoach.plus.shared.domain.model.ExerciseCategory.ARMS
                        "脚" -> com.yourcoach.plus.shared.domain.model.ExerciseCategory.LEGS
                        "腹筋・体幹" -> com.yourcoach.plus.shared.domain.model.ExerciseCategory.CORE
                        "有酸素" -> com.yourcoach.plus.shared.domain.model.ExerciseCategory.RUNNING
                        else -> com.yourcoach.plus.shared.domain.model.ExerciseCategory.OTHER
                    }
                    // duration: 明示値 > sets×5分
                    val duration = cqItem.duration ?: ((cqItem.sets ?: 6) * 5)
                    com.yourcoach.plus.shared.domain.model.Exercise(
                        name = cqItem.foodName,
                        category = category,
                        sets = cqItem.sets,
                        reps = cqItem.reps,
                        weight = cqItem.weight,
                        duration = duration,
                        distance = cqItem.distance,
                        caloriesBurned = duration * slotCalorieCoeff
                    )
                }

                val totalDuration = exercises.sumOf { it.duration ?: 0 }
                val totalCalories = exercises.sumOf { it.caloriesBurned }

                val workout = Workout(
                    id = "",
                    userId = userId,
                    name = item.title,
                    type = com.yourcoach.plus.shared.domain.model.WorkoutType.STRENGTH,
                    exercises = exercises,
                    totalDuration = totalDuration,
                    totalCaloriesBurned = totalCalories,
                    intensity = com.yourcoach.plus.shared.domain.model.WorkoutIntensity.MODERATE,
                    note = "カスタムクエスト",
                    timestamp = targetTimestamp,
                    createdAt = System.currentTimeMillis()
                )

                workoutRepository.addWorkout(workout)
                    .onSuccess {
                        android.util.Log.d("DashboardVM", "CustomQuest workout recorded: ${item.title}, ${totalCalories}kcal")
                        markCustomQuestSlotCompleted(slotKey)
                        updateBadgeStats("workout_recorded", mapOf("duration" to totalDuration))
                        _uiState.update { it.copy(successMessage = "${item.title}を記録しました（${totalCalories}kcal）") }
                        loadDashboardData()
                    }
                    .onFailure { e ->
                        android.util.Log.e("DashboardVM", "CustomQuest workout record failed: ${e.message}")
                        _uiState.update { it.copy(error = "記録に失敗しました: ${e.message}") }
                    }
            } finally {
                _uiState.update { it.copy(isExecutingDirectiveItem = false) }
            }
        }
    }

    /**
     * カスタムクエストのスロットを完了済みとしてFirestoreに保存
     */
    private suspend fun markCustomQuestSlotCompleted(slotKey: String) {
        val userId = currentUserId ?: return
        val selectedDate = _uiState.value.date
        val customQuest = _uiState.value.customQuest ?: return
        val docDate = if (customQuest.date == "_default") "_default" else selectedDate

        val itemIndices = customQuest.slots[slotKey]?.items?.indices?.toList() ?: listOf(0)
        customQuestRepository.updateExecutedItems(userId, docDate, slotKey, itemIndices)
            .onSuccess {
                android.util.Log.d("DashboardVM", "CustomQuest slot $slotKey marked completed")
            }
            .onFailure { e ->
                android.util.Log.e("DashboardVM", "Failed to mark custom quest slot: ${e.message}")
            }
    }

    /**
     * クエスト完了の取り消し（カスタム・デフォルト両対応）
     * 1. 記録済み食事/運動を削除
     * 2. executedItemsから該当スロットを除去
     * 3. タイムラインを再読み込み
     */
    fun undoQuestCompletion(item: UnifiedTimelineItem) {
        val userId = currentUserId ?: return
        viewModelScope.launch {
            try {
                // 1. 記録済み食事/運動を削除
                item.linkedMeal?.let { meal ->
                    mealRepository.deleteMeal(userId, meal.id)
                }
                item.linkedWorkout?.let { workout ->
                    workoutRepository.deleteWorkout(userId, workout.id)
                }

                // 2. executedItemsから除去
                if (item.isCustomQuest && item.customQuestSlotKey != null) {
                    // カスタムクエスト: executedItemsからslotKeyを削除
                    undoCustomQuestSlot(item.customQuestSlotKey)
                } else if (item.id.startsWith("directive_")) {
                    // デフォルトクエスト: executedItemsからインデックスを削除
                    undoDirectiveItem(item)
                }

                // 3. リロード
                loadDashboardData()
                _uiState.update { it.copy(successMessage = "「${item.title}」の完了を取り消しました") }
            } catch (e: Exception) {
                android.util.Log.e("DashboardVM", "Undo failed: ${e.message}")
            }
        }
    }

    private suspend fun undoCustomQuestSlot(slotKey: String) {
        val userId = currentUserId ?: return
        val selectedDate = _uiState.value.date
        val customQuest = _uiState.value.customQuest ?: return
        val docDate = if (customQuest.date == "_default") "_default" else selectedDate

        // executedItemsから該当スロットを空リストに更新（＝未完了）
        customQuestRepository.updateExecutedItems(userId, docDate, slotKey, emptyList())
    }

    private suspend fun undoDirectiveItem(item: UnifiedTimelineItem) {
        val userId = currentUserId ?: return
        val directive = _uiState.value.directive ?: return

        val index = when {
            item.id.startsWith("directive_meal_") ->
                item.id.removePrefix("directive_meal_").toIntOrNull()?.minus(1) ?: return
            item.id == "directive_workout" ->
                directive.message.lines().filter { it.startsWith("【食事") }.size
            item.id == "directive_sleep" -> {
                val mealCount = directive.message.lines().filter { it.startsWith("【食事") }.size
                val hasWorkout = directive.message.lines().any { it.startsWith("【運動") }
                mealCount + (if (hasWorkout) 1 else 0)
            }
            else -> return
        }

        val updatedExecutedItems = directive.executedItems.toMutableList()
        updatedExecutedItems.remove(index)

        val updatedDirective = directive.copy(executedItems = updatedExecutedItems)
        directiveRepository.saveDirective(updatedDirective)
    }

    /**
     * Directiveの運動アイテムをタイムラインから自動記録
     * カロリー計算: 部位 × トレーニング時間（分） × 係数
     * 係数: 脚・背中=5, 胸・肩=3, 腕・腹=2 kcal/分（初中級者向け）
     */
    fun recordWorkoutFromDirectiveItem(item: UnifiedTimelineItem) {
        val userId = currentUserId ?: return

        viewModelScope.launch {
            _uiState.update { it.copy(isExecutingDirectiveItem = true) }

            try {
                // 選択中の日付でタイムスタンプを作成
                val selectedDate = _uiState.value.date
                val baseTimestamp = DateUtil.dateStringToTimestamp(selectedDate)
                val targetTimestamp = baseTimestamp + (item.timeMinutes * 60 * 1000L)

                val workoutText = item.subtitle ?: ""
                android.util.Log.d("DashboardVM", "recordWorkout: title=${item.title}, subtitle=${item.subtitle}")

                // 新形式: 「・」行から種目詳細をパース
                val bulletLines = workoutText.split("\n").filter { it.trimStart().startsWith("・") }
                val headerLine = workoutText.split("\n").firstOrNull() ?: workoutText

                // 消費予測をヘッダーから取得（例: "消費予測510kcal"）
                val predictedCalMatch = Regex("消費予測(\\d+)kcal").find(headerLine)
                val predictedCalories = predictedCalMatch?.groupValues?.get(1)?.toIntOrNull()

                // 時間をヘッダーから取得（例: "120分"）
                val durationMatch = Regex("(\\d+)分").find(headerLine)
                val headerDuration = durationMatch?.groupValues?.get(1)?.toIntOrNull()

                if (bulletLines.isNotEmpty()) {
                    // 新形式: 種目ごとの詳細あり
                    val exerciseList = bulletLines.map { line ->
                        val name = line.removePrefix("・").substringBefore(" ").trim()
                        val setsMatch = Regex("(\\d+)セット").find(line)
                        val repsMatch = Regex("(\\d+)回/セット").find(line)
                        val durMatch = Regex("×(\\d+)分").find(line)
                        val sets = setsMatch?.groupValues?.get(1)?.toIntOrNull() ?: 6
                        val reps = repsMatch?.groupValues?.get(1)?.toIntOrNull() ?: 10
                        val exDuration = durMatch?.groupValues?.get(1)?.toIntOrNull() ?: (sets * 5)
                        Triple(name, sets to reps, exDuration)
                    }

                    val totalDuration = headerDuration ?: exerciseList.sumOf { it.third }
                    val totalCalories = predictedCalories ?: (totalDuration * getCalorieCoefficient(item.title))
                    val caloriesPerEx = totalCalories / exerciseList.size

                    val exercises = exerciseList.map { (name, setsReps, dur) ->
                        com.yourcoach.plus.shared.domain.model.Exercise(
                            name = name,
                            category = com.yourcoach.plus.shared.domain.model.ExerciseCategory.OTHER,
                            sets = setsReps.first,
                            reps = setsReps.second,
                            weight = null,
                            duration = dur,
                            caloriesBurned = caloriesPerEx
                        )
                    }

                    android.util.Log.d("DashboardVM", "recordWorkout: ${exerciseList.size} exercises, duration=${totalDuration}min, calories=$totalCalories")

                    val workout = Workout(
                        id = "",
                        userId = userId,
                        name = item.title,
                        type = com.yourcoach.plus.shared.domain.model.WorkoutType.STRENGTH,
                        exercises = exercises,
                        totalDuration = totalDuration,
                        totalCaloriesBurned = totalCalories,
                        intensity = com.yourcoach.plus.shared.domain.model.WorkoutIntensity.MODERATE,
                        note = workoutText,
                        timestamp = targetTimestamp,
                        createdAt = System.currentTimeMillis()
                    )

                    workoutRepository.addWorkout(workout)
                        .onSuccess {
                            android.util.Log.d("DashboardVM", "Directive workout recorded: ${item.title}, duration=${totalDuration}min, calories=$totalCalories")
                            _uiState.update { it.copy(successMessage = "${item.title}を記録しました（${totalCalories}kcal）") }
                            updateBadgeStats("workout_recorded", mapOf("duration" to totalDuration))
                            markDirectiveItemCompleted(item)
                            loadDashboardData()
                        }
                        .onFailure { e ->
                            android.util.Log.e("DashboardVM", "Directive workout record failed: ${e.message}")
                            _uiState.update { it.copy(error = "記録に失敗しました: ${e.message}") }
                        }

                    return@launch
                }

                // フォールバック: 旧形式（"N種目×Nセット×N回"）
                val workoutInfo = parseWorkoutInfoFromText(workoutText)
                android.util.Log.d("DashboardVM", "recordWorkout(legacy): parsed exercises=${workoutInfo.exercises}, sets=${workoutInfo.sets}, reps=${workoutInfo.reps}")

                val durationMinutes = headerDuration ?: (workoutInfo.exercises * 30)
                val calculatedCalories = predictedCalories ?: (durationMinutes * getCalorieCoefficient(item.title))

                val caloriesPerExercise = calculatedCalories / workoutInfo.exercises
                val exercises = (1..workoutInfo.exercises).map { i ->
                    com.yourcoach.plus.shared.domain.model.Exercise(
                        name = "${item.title} #$i",
                        category = com.yourcoach.plus.shared.domain.model.ExerciseCategory.OTHER,
                        sets = workoutInfo.sets,
                        reps = workoutInfo.reps,
                        weight = null,
                        caloriesBurned = caloriesPerExercise
                    )
                }

                val workout = Workout(
                    id = "",
                    userId = userId,
                    name = item.title,
                    type = com.yourcoach.plus.shared.domain.model.WorkoutType.STRENGTH,
                    exercises = exercises,
                    totalDuration = durationMinutes,
                    totalCaloriesBurned = calculatedCalories,
                    intensity = com.yourcoach.plus.shared.domain.model.WorkoutIntensity.MODERATE,
                    note = workoutText,
                    timestamp = targetTimestamp,
                    createdAt = System.currentTimeMillis()
                )

                workoutRepository.addWorkout(workout)
                    .onSuccess {
                        android.util.Log.d("DashboardVM", "Directive workout recorded: ${item.title}, duration=${durationMinutes}min, calories=$calculatedCalories")
                        _uiState.update { it.copy(
                            successMessage = "${item.title}を記録しました（${calculatedCalories}kcal）"
                        ) }
                        // バッジ統計更新（運動時間付き）
                        updateBadgeStats("workout_recorded", mapOf("duration" to durationMinutes))
                        markDirectiveItemCompleted(item)
                        loadDashboardData()
                    }
                    .onFailure { e ->
                        android.util.Log.e("DashboardVM", "Directive workout record failed: ${e.message}")
                        _uiState.update { it.copy(error = "記録に失敗しました: ${e.message}") }
                    }
            } finally {
                _uiState.update { it.copy(isExecutingDirectiveItem = false) }
            }
        }
    }

    /**
     * 運動クエスト完了シートを表示
     * CustomQuest/Directive両対応で種目リストを構築し、RM記録から推定重量をプリフィル
     */
    fun showWorkoutCompletionSheet(item: UnifiedTimelineItem) {
        val exercises = mutableListOf<WorkoutCompletionExercise>()

        if (item.isCustomQuest && item.customQuestItems != null) {
            // カスタムクエスト: customQuestItemsから構築
            for (cqItem in item.customQuestItems) {
                val rmRecord = rmRecordCache[cqItem.foodName]
                val rmMin = cqItem.rmPercentMin
                val rmMax = cqItem.rmPercentMax

                val estimatedWeight: Float?
                val isEstimated: Boolean
                if (rmRecord != null && (rmMin != null || rmMax != null)) {
                    val avgPercent = ((rmMin ?: rmMax!!) + (rmMax ?: rmMin!!)) / 2f
                    estimatedWeight = (rmRecord.weight * avgPercent / 100f)
                    isEstimated = true
                } else if (cqItem.weight != null && (cqItem.weight ?: 0f) > 0f) {
                    estimatedWeight = cqItem.weight!!
                    isEstimated = false
                } else {
                    estimatedWeight = null
                    isEstimated = false
                }

                exercises.add(WorkoutCompletionExercise(
                    name = cqItem.foodName,
                    category = cqItem.category ?: "",
                    sets = cqItem.sets ?: 6,
                    reps = cqItem.reps ?: 10,
                    weight = estimatedWeight,
                    isWeightEstimated = isEstimated,
                    rmPercentMin = rmMin,
                    rmPercentMax = rmMax
                ))
            }
        } else if (item.id.startsWith("directive_")) {
            // Directive: subtitleの「・」行からパース
            val workoutText = item.subtitle ?: ""
            val bulletLines = workoutText.split("\n").filter { it.trimStart().startsWith("・") }

            for (line in bulletLines) {
                val name = line.removePrefix("・").substringBefore(" ").trim()
                val setsMatch = Regex("(\\d+)セット").find(line)
                val repsMatch = Regex("(\\d+)回/セット").find(line)
                val sets = setsMatch?.groupValues?.get(1)?.toIntOrNull() ?: 6
                val reps = repsMatch?.groupValues?.get(1)?.toIntOrNull() ?: 10

                val rmRecord = rmRecordCache[name]
                // Directiveにはrm%が無いので、RM記録のweight自体をプリフィル
                val estimatedWeight = rmRecord?.weight
                val isEstimated = rmRecord != null

                exercises.add(WorkoutCompletionExercise(
                    name = name,
                    category = "",
                    sets = sets,
                    reps = reps,
                    weight = estimatedWeight,
                    isWeightEstimated = isEstimated
                ))
            }

            // bulletLinesが空の場合はフォールバックで1種目
            if (exercises.isEmpty()) {
                exercises.add(WorkoutCompletionExercise(
                    name = item.title,
                    category = "",
                    sets = 6,
                    reps = 10,
                    weight = null
                ))
            }
        }

        _uiState.update { it.copy(
            showWorkoutCompletionSheet = true,
            workoutCompletionItem = item,
            workoutCompletionExercises = exercises
        ) }
    }

    /**
     * 運動クエスト完了シートの種目を更新（セット/回数/重量変更時）
     */
    fun updateWorkoutCompletionExercise(index: Int, updated: WorkoutCompletionExercise) {
        val current = _uiState.value.workoutCompletionExercises.toMutableList()
        if (index in current.indices) {
            current[index] = updated
            _uiState.update { it.copy(workoutCompletionExercises = current) }
        }
    }

    /**
     * 運動クエスト完了シートの記録を確定
     * 統一カロリー計算: (totalVolume × 0.05) + (totalDuration × 3)
     */
    fun confirmWorkoutCompletion() {
        val userId = currentUserId ?: return
        val item = _uiState.value.workoutCompletionItem ?: return
        val exercises = _uiState.value.workoutCompletionExercises

        viewModelScope.launch {
            _uiState.update { it.copy(isExecutingDirectiveItem = true) }
            try {
                val selectedDate = _uiState.value.date
                val baseTimestamp = DateUtil.dateStringToTimestamp(selectedDate)
                val targetTimestamp = baseTimestamp + (item.timeMinutes * 60 * 1000L)

                val exerciseModels = exercises.map { ex ->
                    val category = when (ex.category) {
                        "胸" -> com.yourcoach.plus.shared.domain.model.ExerciseCategory.CHEST
                        "背中" -> com.yourcoach.plus.shared.domain.model.ExerciseCategory.BACK
                        "肩" -> com.yourcoach.plus.shared.domain.model.ExerciseCategory.SHOULDERS
                        "腕" -> com.yourcoach.plus.shared.domain.model.ExerciseCategory.ARMS
                        "脚" -> com.yourcoach.plus.shared.domain.model.ExerciseCategory.LEGS
                        "腹筋・体幹" -> com.yourcoach.plus.shared.domain.model.ExerciseCategory.CORE
                        "有酸素" -> com.yourcoach.plus.shared.domain.model.ExerciseCategory.RUNNING
                        else -> com.yourcoach.plus.shared.domain.model.ExerciseCategory.OTHER
                    }
                    com.yourcoach.plus.shared.domain.model.Exercise(
                        name = ex.name,
                        category = category,
                        sets = ex.sets,
                        reps = ex.reps,
                        weight = ex.weight,
                        duration = ex.duration,
                        caloriesBurned = ex.calories
                    )
                }

                val totalDuration = exercises.sumOf { it.duration }
                val totalCalories = exercises.sumOf { it.calories }

                val workout = Workout(
                    id = "",
                    userId = userId,
                    name = item.title,
                    type = com.yourcoach.plus.shared.domain.model.WorkoutType.STRENGTH,
                    exercises = exerciseModels,
                    totalDuration = totalDuration,
                    totalCaloriesBurned = totalCalories,
                    intensity = com.yourcoach.plus.shared.domain.model.WorkoutIntensity.MODERATE,
                    note = if (item.isCustomQuest) "カスタムクエスト" else (item.subtitle ?: ""),
                    timestamp = targetTimestamp,
                    createdAt = System.currentTimeMillis()
                )

                workoutRepository.addWorkout(workout)
                    .onSuccess {
                        android.util.Log.d("DashboardVM", "WorkoutCompletion recorded: ${item.title}, ${totalCalories}kcal")
                        // 完了マーク
                        if (item.isCustomQuest && item.customQuestSlotKey != null) {
                            markCustomQuestSlotCompleted(item.customQuestSlotKey)
                        } else if (item.id.startsWith("directive_")) {
                            markDirectiveItemCompleted(item)
                        }
                        updateBadgeStats("workout_recorded", mapOf("duration" to totalDuration))
                        _uiState.update { it.copy(
                            successMessage = "${item.title}を記録しました（${totalCalories}kcal）",
                            showWorkoutCompletionSheet = false,
                            workoutCompletionItem = null,
                            workoutCompletionExercises = emptyList()
                        ) }
                        loadDashboardData()
                    }
                    .onFailure { e ->
                        android.util.Log.e("DashboardVM", "WorkoutCompletion failed: ${e.message}")
                        _uiState.update { it.copy(error = "記録に失敗しました: ${e.message}") }
                    }
            } finally {
                _uiState.update { it.copy(isExecutingDirectiveItem = false) }
            }
        }
    }

    /**
     * 運動クエスト完了シートを閉じる
     */
    fun dismissWorkoutCompletionSheet() {
        _uiState.update { it.copy(
            showWorkoutCompletionSheet = false,
            workoutCompletionItem = null,
            workoutCompletionExercises = emptyList()
        ) }
    }

    /**
     * 部位名からカロリー係数を取得
     * 初中級者向け係数: 脚・背中=5, 胸・肩=3, 腕・腹=2 kcal/分
     */
    private fun getCalorieCoefficient(workoutName: String): Int {
        val name = workoutName.lowercase()
        return when {
            // 高強度（5 kcal/分）: 脚、下半身、背中、プル
            name.contains("脚") || name.contains("下半身") ||
            name.contains("背中") || name.contains("プル") ||
            name.contains("leg") || name.contains("back") ||
            name.contains("pull") || name.contains("lower") -> 5

            // 低強度（2 kcal/分）: 腕、腹、体幹
            name.contains("腕") || name.contains("二頭") || name.contains("三頭") ||
            name.contains("腹") || name.contains("体幹") ||
            name.contains("arm") || name.contains("bicep") || name.contains("tricep") ||
            name.contains("abs") || name.contains("core") -> 2

            // 中強度（3 kcal/分）: 胸、肩、上半身、プッシュ、全身、その他
            else -> 3
        }
    }

    /**
     * ワークアウト情報データクラス
     */
    private data class WorkoutInfoParsed(
        val name: String,
        val exercises: Int,
        val sets: Int,
        val reps: Int,
        val totalSets: Int
    )

    /**
     * テキストからワークアウト情報をパース
     * 例: "4種目×5セット×5回（計20セット）"
     */
    private fun parseWorkoutInfoFromText(text: String): WorkoutInfoParsed {
        // 種目数
        val exercisesMatch = Regex("(\\d+)種目").find(text)
        val exercises = exercisesMatch?.groupValues?.get(1)?.toIntOrNull() ?: 1

        // セット数（種目あたり）
        val setsMatch = Regex("(\\d+)セット").find(text)
        val sets = setsMatch?.groupValues?.get(1)?.toIntOrNull() ?: 5

        // レップ数
        val repsMatch = Regex("(\\d+)回").find(text)
        val reps = repsMatch?.groupValues?.get(1)?.toIntOrNull() ?: 10

        // 合計セット
        val totalSetsMatch = Regex("計(\\d+)セット").find(text)
        val totalSets = totalSetsMatch?.groupValues?.get(1)?.toIntOrNull() ?: (exercises * sets)

        // 名前
        val name = text.substringBefore(" ").ifEmpty { "トレーニング" }

        return WorkoutInfoParsed(name, exercises, sets, reps, totalSets)
    }

    /**
     * Directiveの睡眠アイテムをタイムラインから完了としてマーク
     */
    fun recordConditionFromDirectiveItem(item: UnifiedTimelineItem) {
        viewModelScope.launch {
            _uiState.update { it.copy(isExecutingDirectiveItem = true) }

            try {
                markDirectiveItemCompleted(item)
                _uiState.update { it.copy(successMessage = "${item.title}を完了しました") }
                loadDashboardData()
            } finally {
                _uiState.update { it.copy(isExecutingDirectiveItem = false) }
            }
        }
    }

    /**
     * DirectiveのexecutedItemsを更新して完了済みとしてマーク
     */
    private suspend fun markDirectiveItemCompleted(item: UnifiedTimelineItem) {
        val userId = currentUserId ?: return
        val selectedDate = _uiState.value.date
        val directive = _uiState.value.directive ?: return

        // アイテムのインデックスを取得（directive_meal_N や directive_workout から）
        val index = when {
            item.id.startsWith("directive_meal_") -> {
                item.id.removePrefix("directive_meal_").toIntOrNull()?.minus(1) ?: return
            }
            item.id == "directive_workout" -> {
                // 運動は食事の後に来る（mealsの数がインデックス）
                directive.message.lines().filter { it.startsWith("【食事") }.size
            }
            item.id == "directive_sleep" -> {
                // 睡眠は運動の後
                val mealCount = directive.message.lines().filter { it.startsWith("【食事") }.size
                val hasWorkout = directive.message.lines().any { it.startsWith("【運動") }
                mealCount + (if (hasWorkout) 1 else 0)
            }
            else -> return
        }

        val updatedExecutedItems = directive.executedItems.toMutableList()
        if (!updatedExecutedItems.contains(index)) {
            updatedExecutedItems.add(index)
        }

        val updatedDirective = directive.copy(executedItems = updatedExecutedItems)
        directiveRepository.saveDirective(updatedDirective)
            .onSuccess {
                android.util.Log.d("DashboardVM", "Directive item $index marked as completed")
            }
            .onFailure { e ->
                android.util.Log.e("DashboardVM", "Failed to mark directive item: ${e.message}")
            }
    }

    // ========== 指示書実行関連 ==========

    /**
     * 指示書アイテムを実行
     * 食事の場合: 食品を自動記録
     * 運動の場合: 運動を自動記録
     * コンディションの場合: コンディション記録画面へ誘導
     */
    fun executeDirectiveItem(item: DirectiveActionItem) {
        // originalTextから時刻を抽出、見つからなければ12:00
        val timeMinutes = extractTimeFromDirective(item.originalText) ?: (12 * 60)
        executeDirectiveItemWithTime(item, timeMinutes)
    }

    /**
     * 時刻指定でDirectiveを実行
     */
    fun executeDirectiveItemWithTime(item: DirectiveActionItem, timeMinutes: Int) {
        val userId = currentUserId ?: return

        viewModelScope.launch {
            _uiState.update { it.copy(isExecutingDirectiveItem = true) }

            when (item.actionType) {
                DirectiveActionType.MEAL -> {
                    executeMealDirectiveWithTime(userId, item, timeMinutes)
                }
                DirectiveActionType.EXERCISE -> {
                    executeExerciseDirectiveWithTime(userId, item, timeMinutes)
                }
                DirectiveActionType.CONDITION -> {
                    // コンディションは自動記録ではなく完了マークのみ
                    markDirectiveItemExecuted(item)
                }
                DirectiveActionType.ADVICE -> {
                    // アドバイスは実行不可
                }
            }

            _uiState.update { it.copy(isExecutingDirectiveItem = false) }
        }
    }

    /**
     * Directiveテキストから時刻を抽出（例: "07:30" -> 450分）
     */
    private fun extractTimeFromDirective(text: String): Int? {
        val timePattern = Regex("(\\d{1,2}):(\\d{2})")
        val match = timePattern.find(text) ?: return null
        val hours = match.groupValues[1].toIntOrNull() ?: return null
        val minutes = match.groupValues[2].toIntOrNull() ?: return null
        return hours * 60 + minutes
    }

    /**
     * 食事指示を実行（個別タップ時）- 時刻はoriginalTextから抽出
     */
    private suspend fun executeMealDirective(userId: String, item: DirectiveActionItem) {
        val timeMinutes = extractTimeFromDirective(item.originalText) ?: (12 * 60)
        executeMealDirectiveWithTime(userId, item, timeMinutes)
    }

    /**
     * 食事指示を実行（時刻指定版）
     * 1行に複数の食品がある場合（例: "鶏むね肉100g, 白米130g, アボカド60g"）は全て記録
     */
    private suspend fun executeMealDirectiveWithTime(userId: String, item: DirectiveActionItem, timeMinutes: Int) {
        // originalTextから複数の食品を抽出
        val foodEntries = parseMultipleFoods(item.originalText)

        android.util.Log.d("DashboardVM", "executeMealDirectiveWithTime: originalText=${item.originalText}, time=${timeMinutes}min")
        android.util.Log.d("DashboardVM", "executeMealDirectiveWithTime: 抽出された食品数=${foodEntries.size}")

        if (foodEntries.isEmpty()) {
            // フォールバック: 従来の単一食品処理
            val itemName = item.itemName ?: return
            val amount = item.amount ?: 100f
            val unit = item.unit ?: "g"
            val cleanedName = cleanFoodName(itemName)
            val foodData = searchFoodFlexible(cleanedName) ?: searchFoodFlexible(itemName)
            val mealItem = createMealItemFromFood(foodData, itemName, amount, unit)
            saveSingleFoodMealWithReloadAndTime(userId, item, mealItem, foodData?.name ?: itemName, timeMinutes)
            return
        }

        // 複数の食品からMealItemリストを作成
        val mealItems = mutableListOf<MealItem>()
        var totalCalories = 0
        var totalProtein = 0f
        var totalCarbs = 0f
        var totalFat = 0f
        var totalFiber = 0f
        var totalGL = 0f

        for ((foodName, amount, unit) in foodEntries) {
            val cleanedName = cleanFoodName(foodName)
            val foodData = searchFoodFlexible(cleanedName) ?: searchFoodFlexible(foodName)
            val mealItem = createMealItemFromFood(foodData, foodName, amount, unit)

            android.util.Log.d("DashboardVM", "  - ${mealItem.name}: ${mealItem.amount}${mealItem.unit} (${mealItem.calories}kcal)")

            mealItems.add(mealItem)
            totalCalories += mealItem.calories
            totalProtein += mealItem.protein
            totalCarbs += mealItem.carbs
            totalFat += mealItem.fat
            totalFiber += mealItem.fiber
            if (mealItem.gi > 0 && mealItem.carbs > 0) {
                totalGL += (mealItem.gi * mealItem.carbs / 100f)
            }
        }

        // 選択中の日付 + 指定時刻でタイムスタンプを作成
        val selectedDate = _uiState.value.date
        val baseTimestamp = DateUtil.dateStringToTimestamp(selectedDate)
        val targetTimestamp = baseTimestamp + (timeMinutes * 60 * 1000L)

        // ラベル名を抽出（【食事1】など）
        val labelMatch = Regex("【([^】]+)】").find(item.originalText)
        val mealLabel = labelMatch?.groupValues?.get(1) ?: "指示書"

        val meal = Meal(
            id = "",
            userId = userId,
            name = "指示書: $mealLabel",
            type = MealType.SNACK,
            items = mealItems,
            totalCalories = totalCalories,
            totalProtein = totalProtein,
            totalCarbs = totalCarbs,
            totalFat = totalFat,
            totalFiber = totalFiber,
            totalGL = totalGL,
            isTemplate = false,
            timestamp = targetTimestamp,
            createdAt = System.currentTimeMillis()
        )

        mealRepository.addMeal(meal)
            .onSuccess {
                android.util.Log.d("DashboardVM", "食事記録成功: ${mealItems.size}アイテム at ${timeMinutes}min")
                markDirectiveItemExecuted(item)
                updateBadgeStats("meal_recorded")
                loadDashboardData()
            }
            .onFailure { e ->
                android.util.Log.e("DashboardVM", "食事記録失敗: ${e.message}")
                _uiState.update { it.copy(error = "食事の記録に失敗しました: ${e.message}") }
            }
    }

    /**
     * 単一食品の食事を保存してリロード（個別タップ用フォールバック）
     */
    private suspend fun saveSingleFoodMealWithReload(
        userId: String,
        item: DirectiveActionItem,
        mealItem: MealItem,
        displayName: String
    ) {
        val timeMinutes = extractTimeFromDirective(item.originalText) ?: (12 * 60)
        saveSingleFoodMealWithReloadAndTime(userId, item, mealItem, displayName, timeMinutes)
    }

    /**
     * 単一食品の食事を保存してリロード（時刻指定版）
     */
    private suspend fun saveSingleFoodMealWithReloadAndTime(
        userId: String,
        item: DirectiveActionItem,
        mealItem: MealItem,
        displayName: String,
        timeMinutes: Int
    ) {
        val selectedDate = _uiState.value.date
        val baseTimestamp = DateUtil.dateStringToTimestamp(selectedDate)
        val targetTimestamp = baseTimestamp + (timeMinutes * 60 * 1000L)
        val totalGL = if (mealItem.gi > 0 && mealItem.carbs > 0) (mealItem.gi * mealItem.carbs / 100f) else 0f

        val meal = Meal(
            id = "",
            userId = userId,
            name = "指示書: $displayName",
            type = MealType.SNACK,
            items = listOf(mealItem),
            totalCalories = mealItem.calories,
            totalProtein = mealItem.protein,
            totalCarbs = mealItem.carbs,
            totalFat = mealItem.fat,
            totalFiber = mealItem.fiber,
            totalGL = totalGL,
            isTemplate = false,
            timestamp = targetTimestamp,
            createdAt = System.currentTimeMillis()
        )

        mealRepository.addMeal(meal)
            .onSuccess {
                markDirectiveItemExecuted(item)
                updateBadgeStats("meal_recorded")
                loadDashboardData()
            }
            .onFailure { e ->
                _uiState.update { it.copy(error = "食事の記録に失敗しました: ${e.message}") }
            }
    }

    /**
     * 運動指示を実行 - 時刻はoriginalTextから抽出
     */
    private suspend fun executeExerciseDirective(userId: String, item: DirectiveActionItem) {
        val timeMinutes = extractTimeFromDirective(item.originalText) ?: (12 * 60)
        executeExerciseDirectiveWithTime(userId, item, timeMinutes)
    }

    /**
     * 運動指示を実行（時刻指定版）
     */
    private suspend fun executeExerciseDirectiveWithTime(userId: String, item: DirectiveActionItem, timeMinutes: Int) {
        val exerciseName = item.itemName ?: return
        val amount = item.amount?.toInt() ?: 10
        val unit = item.unit ?: "回"

        // 運動記録を作成
        val exercise = com.yourcoach.plus.shared.domain.model.Exercise(
            name = exerciseName,
            category = com.yourcoach.plus.shared.domain.model.ExerciseCategory.OTHER,
            sets = if (unit == "セット") amount else 3,
            reps = if (unit == "回") amount else 10,
            caloriesBurned = 50  // 仮の消費カロリー
        )

        // 選択中の日付 + 指定時刻でタイムスタンプを作成
        val selectedDate = _uiState.value.date
        val baseTimestamp = DateUtil.dateStringToTimestamp(selectedDate)
        val targetTimestamp = baseTimestamp + (timeMinutes * 60 * 1000L)

        val workout = Workout(
            id = "",
            userId = userId,
            name = "指示書: $exerciseName",
            type = com.yourcoach.plus.shared.domain.model.WorkoutType.STRENGTH,
            exercises = listOf(exercise),
            totalDuration = 10,
            totalCaloriesBurned = 50,
            intensity = com.yourcoach.plus.shared.domain.model.WorkoutIntensity.MODERATE,
            timestamp = targetTimestamp,
            createdAt = System.currentTimeMillis()
        )

        workoutRepository.addWorkout(workout)
            .onSuccess {
                markDirectiveItemExecuted(item)
                loadDashboardData()
            }
            .onFailure { e ->
                _uiState.update { it.copy(error = "運動の記録に失敗しました: ${e.message}") }
            }
    }

    /**
     * 指示書アイテムを実行済みとしてマーク
     */
    private fun markDirectiveItemExecuted(item: DirectiveActionItem) {
        // 既に完了済みの場合はスキップ（XP二重付与防止）
        val alreadyCompleted = _uiState.value.executedDirectiveItems.contains(item.index)

        _uiState.update { state ->
            state.copy(
                executedDirectiveItems = state.executedDirectiveItems + item.index
            )
        }
        // Firestoreに永続化
        saveExecutedItemsToFirestore()

        // 新規完了の場合のみ経験値付与
        if (!alreadyCompleted) {
            grantExperience("クエスト達成")
        }
    }

    /**
     * 指示書実行状態をリセット
     */
    fun resetExecutedDirectiveItems() {
        _uiState.update { it.copy(executedDirectiveItems = emptySet(), editedDirectiveTexts = emptyMap()) }
        // Firestoreに永続化
        saveExecutedItemsToFirestore()
    }

    /**
     * 指示書アイテムの完了を取り消し
     * 誤操作対策：完了したアイテムを再タップで未完了に戻す
     */
    fun undoDirectiveItem(item: DirectiveActionItem) {
        _uiState.update { state ->
            state.copy(
                executedDirectiveItems = state.executedDirectiveItems - item.index,
                editedDirectiveTexts = state.editedDirectiveTexts - item.index
            )
        }
        // Firestoreに永続化
        saveExecutedItemsToFirestore()
    }

    /**
     * executedDirectiveItemsをFirestoreに保存
     */
    private fun saveExecutedItemsToFirestore() {
        val userId = currentUserId ?: return
        val date = _uiState.value.date
        val executedItems = _uiState.value.executedDirectiveItems.toList()

        viewModelScope.launch {
            directiveRepository.updateExecutedItems(userId, date, executedItems)
        }
    }

    /**
     * 編集付きで指示書アイテムを実行
     * ユーザーが量を調整した場合に使用
     */
    fun executeDirectiveItemWithEdit(item: DirectiveActionItem, editedText: String) {
        val userId = currentUserId ?: return

        viewModelScope.launch {
            _uiState.update { it.copy(isExecutingDirectiveItem = true) }

            // 編集済みテキストを保存
            _uiState.update { state ->
                state.copy(
                    editedDirectiveTexts = state.editedDirectiveTexts + (item.index to editedText)
                )
            }

            // テキストから量をパース（例: "白米100g" → 100f）
            val adjustedItem = parseEditedItem(item, editedText)

            when (item.actionType) {
                DirectiveActionType.MEAL -> {
                    executeMealDirective(userId, adjustedItem)
                }
                DirectiveActionType.EXERCISE -> {
                    executeExerciseDirective(userId, adjustedItem)
                }
                DirectiveActionType.CONDITION -> {
                    markDirectiveItemExecuted(item)
                }
                DirectiveActionType.ADVICE -> {
                    // アドバイスは実行不可
                }
            }

            _uiState.update { it.copy(isExecutingDirectiveItem = false) }
        }
    }

    /**
     * 編集されたテキストから量を抽出してDirectiveActionItemを更新
     */
    private fun parseEditedItem(item: DirectiveActionItem, editedText: String): DirectiveActionItem {
        // 数字を抽出（例: "白米100g（8割）" → 100、"鶏むね肉150g" → 150）
        val numberRegex = Regex("""(\d+(?:\.\d+)?)(?:g|kg|ml|L|回|分|セット)?""")
        val match = numberRegex.find(editedText)
        val newAmount = match?.groupValues?.getOrNull(1)?.toFloatOrNull()

        return if (newAmount != null && newAmount != item.amount) {
            item.copy(amount = newAmount)
        } else {
            item
        }
    }

    /**
     * 食品名をクレンジング（ラベルや修飾語を除去）
     */
    private fun cleanFoodName(name: String): String {
        return name
            // [トレ前]、[トレ後]などのラベルを除去
            .replace(Regex("\\[.+?\\]\\s*"), "")
            // 【〇〇】ラベルを除去
            .replace(Regex("【.+?】\\s*"), "")
            // 「を」「追加」などを除去
            .replace("を", "")
            .replace("追加", "")
            .replace("食べる", "")
            .replace("摂る", "")
            // 前後の空白を除去
            .trim()
    }

    /**
     * 柔軟な食品検索（BodymakingFoodDatabase優先）
     */
    private fun searchFoodFlexible(query: String): FoodItem? {
        if (query.isBlank()) return null

        // クエリを正規化（括弧・スペースを除去）
        val normalizedQuery = normalizeForSearch(query)
        android.util.Log.d("DashboardVM", "searchFoodFlexible: query='$query', normalized='$normalizedQuery'")

        // 1. BodymakingFoodDatabaseから検索（IDまたは表示名）
        BodymakingFoodDatabase.getById(query)?.let { bmFood ->
            BodymakingFoodDatabase.toFoodItem(bmFood)?.let {
                android.util.Log.d("DashboardVM", "  -> Found by ID: ${it.name}")
                return it
            }
        }

        // 2. BodymakingFood表示名で正規化マッチング
        BodymakingFoodDatabase.allFoods
            .find {
                val normalizedDisplay = normalizeForSearch(it.displayName)
                normalizedDisplay.contains(normalizedQuery) || normalizedQuery.contains(normalizedDisplay)
            }
            ?.let { bmFood ->
                BodymakingFoodDatabase.toFoodItem(bmFood)?.let {
                    android.util.Log.d("DashboardVM", "  -> Found by BM displayName: ${it.name}")
                    return it
                }
            }

        // 3. FoodDatabase完全一致検索
        FoodDatabase.getFoodByName(query)?.let {
            android.util.Log.d("DashboardVM", "  -> Found exact match: ${it.name}")
            return it
        }

        // 4. FoodDatabase正規化マッチング
        FoodDatabase.allFoods
            .find {
                val normalizedName = normalizeForSearch(it.name)
                normalizedName.contains(normalizedQuery) || normalizedQuery.contains(normalizedName)
            }
            ?.let {
                android.util.Log.d("DashboardVM", "  -> Found by normalized match: ${it.name}")
                return it
            }

        // 5. 通常の部分一致検索
        FoodDatabase.searchFoods(query).firstOrNull()?.let {
            android.util.Log.d("DashboardVM", "  -> Found by search: ${it.name}")
            return it
        }

        // 6. 基本名での検索（括弧内を除去）
        val baseName = query.replace(Regex("[（()）]"), "").replace(Regex("\\s+"), "").trim()
        if (baseName != normalizedQuery && baseName.isNotBlank()) {
            FoodDatabase.searchFoods(baseName).firstOrNull()?.let {
                android.util.Log.d("DashboardVM", "  -> Found by baseName: ${it.name}")
                return it
            }
        }

        // 7. さらに短い名前での検索（最初の2-3文字）
        if (normalizedQuery.length >= 2) {
            val shortName = normalizedQuery.take(3)
            BodymakingFoodDatabase.allFoods
                .filter { normalizeForSearch(it.displayName).contains(shortName) }
                .firstOrNull()?.let { bmFood ->
                    BodymakingFoodDatabase.toFoodItem(bmFood)?.let {
                        android.util.Log.d("DashboardVM", "  -> Found by short BM: ${it.name}")
                        return it
                    }
                }
            FoodDatabase.allFoods
                .filter { normalizeForSearch(it.name).contains(shortName) }
                .minByOrNull { it.name.length }
                ?.let {
                    android.util.Log.d("DashboardVM", "  -> Found by short FD: ${it.name}")
                    return it
                }
        }

        android.util.Log.w("DashboardVM", "  -> NOT FOUND: $query")
        return null
    }

    /**
     * 検索用に文字列を正規化（括弧・スペース・記号を除去）
     */
    private fun normalizeForSearch(text: String): String {
        return text
            .replace(Regex("[（()）\\[\\]【】]"), "")
            .replace(Regex("\\s+"), "")
            .replace("サイズ", "")
            .replace("生", "")
            .lowercase()
    }

    /**
     * 全ての未完了指示書アイテムを完了
     */
    fun completeAllDirectiveItems() {
        val userId = currentUserId ?: return
        val directive = _uiState.value.directive ?: return
        val actionItems = directive.getActionItems()
        val executableItems = actionItems.filter { it.actionType != DirectiveActionType.ADVICE }
        val uncompletedItems = executableItems.filter { !_uiState.value.executedDirectiveItems.contains(it.index) }

        // デバッグログ
        android.util.Log.d("DashboardVM", "=== completeAllDirectiveItems ===")
        android.util.Log.d("DashboardVM", "指示書メッセージ: ${directive.message}")
        android.util.Log.d("DashboardVM", "getActionItems結果: ${actionItems.size}件")
        actionItems.forEachIndexed { idx, item ->
            android.util.Log.d("DashboardVM", "  [$idx] ${item.actionType}: ${item.itemName} ${item.amount}${item.unit}")
        }
        android.util.Log.d("DashboardVM", "実行可能: ${executableItems.size}件, 未完了: ${uncompletedItems.size}件")

        if (uncompletedItems.isEmpty()) return

        viewModelScope.launch {
            _uiState.update { it.copy(isExecutingDirectiveItem = true) }

            // 各アイテムを順次処理（loadDashboardDataは最後に1回だけ呼ぶ）
            for (item in uncompletedItems) {
                android.util.Log.d("DashboardVM", "処理中: ${item.actionType} - ${item.itemName}")
                when (item.actionType) {
                    DirectiveActionType.MEAL -> {
                        executeMealDirectiveBatch(userId, item)
                    }
                    DirectiveActionType.EXERCISE -> {
                        executeExerciseDirectiveBatch(userId, item)
                    }
                    DirectiveActionType.CONDITION -> {
                        markDirectiveItemExecuted(item)
                    }
                    DirectiveActionType.ADVICE -> {
                        // スキップ
                    }
                }
            }

            // 全アイテム処理後に一度だけデータをリロード
            loadDashboardData()
            _uiState.update { it.copy(isExecutingDirectiveItem = false) }
        }
    }

    /**
     * 食事指示を実行（バッチ用：loadDashboardDataを呼ばない）
     * 1行に複数の食品がある場合（例: "鶏むね肉100g, 白米130g, アボカド60g"）は全て記録
     */
    private suspend fun executeMealDirectiveBatch(userId: String, item: DirectiveActionItem) {
        // originalTextから複数の食品を抽出
        val foodEntries = parseMultipleFoods(item.originalText)

        android.util.Log.d("DashboardVM", "executeMealDirectiveBatch: originalText=${item.originalText}")
        android.util.Log.d("DashboardVM", "executeMealDirectiveBatch: 抽出された食品数=${foodEntries.size}")
        foodEntries.forEach { (name, amount, unit) ->
            android.util.Log.d("DashboardVM", "  - $name: ${amount}${unit}")
        }

        if (foodEntries.isEmpty()) {
            // フォールバック: 従来の単一食品処理
            val itemName = item.itemName ?: return
            val amount = item.amount ?: 100f
            val unit = item.unit ?: "g"
            val cleanedName = cleanFoodName(itemName)
            val foodData = searchFoodFlexible(cleanedName) ?: searchFoodFlexible(itemName)
            val mealItem = createMealItemFromFood(foodData, itemName, amount, unit)
            saveSingleFoodMeal(userId, item, mealItem, foodData?.name ?: itemName)
            return
        }

        // 複数の食品からMealItemリストを作成
        val mealItems = mutableListOf<MealItem>()
        var totalCalories = 0
        var totalProtein = 0f
        var totalCarbs = 0f
        var totalFat = 0f
        var totalFiber = 0f
        var totalGL = 0f

        for ((foodName, amount, unit) in foodEntries) {
            val cleanedName = cleanFoodName(foodName)
            val foodData = searchFoodFlexible(cleanedName) ?: searchFoodFlexible(foodName)
            val mealItem = createMealItemFromFood(foodData, foodName, amount, unit)

            mealItems.add(mealItem)
            totalCalories += mealItem.calories
            totalProtein += mealItem.protein
            totalCarbs += mealItem.carbs
            totalFat += mealItem.fat
            totalFiber += mealItem.fiber
            if (mealItem.gi > 0 && mealItem.carbs > 0) {
                totalGL += (mealItem.gi * mealItem.carbs / 100f)
            }
        }

        // 選択中の日付のタイムスタンプを取得
        val selectedDate = _uiState.value.date
        val targetTimestamp = DateUtil.dateStringToTimestamp(selectedDate) + 12 * 60 * 60 * 1000

        // ラベル名を抽出（【食事1】など）
        val labelMatch = Regex("【([^】]+)】").find(item.originalText)
        val mealLabel = labelMatch?.groupValues?.get(1) ?: "指示書"

        val meal = Meal(
            id = "",
            userId = userId,
            name = "指示書: $mealLabel",
            type = MealType.SNACK,
            items = mealItems,
            totalCalories = totalCalories,
            totalProtein = totalProtein,
            totalCarbs = totalCarbs,
            totalFat = totalFat,
            totalFiber = totalFiber,
            totalGL = totalGL,
            isTemplate = false,
            timestamp = targetTimestamp,
            createdAt = System.currentTimeMillis()
        )

        mealRepository.addMeal(meal)
            .onSuccess {
                android.util.Log.d("DashboardVM", "食事記録成功: ${mealItems.size}アイテム")
                markDirectiveItemExecuted(item)
                updateBadgeStats("meal_recorded")
            }
            .onFailure { e ->
                android.util.Log.e("DashboardVM", "食事記録失敗: ${e.message}")
                _uiState.update { it.copy(error = "食事の記録に失敗しました: ${e.message}") }
            }
    }

    /**
     * 指示書テキストから複数の食品を抽出
     * 例: "【食事1】鶏むね肉100g, 白米130g, アボカド60g" -> [(鶏むね肉, 100, g), (白米, 130, g), (アボカド, 60, g)]
     */
    private fun parseMultipleFoods(text: String): List<Triple<String, Float, String>> {
        // 【ラベル】を除去
        var cleanText = text.replace(Regex("^-?\\s*【[^】]+】\\s*"), "").trim()
        // [トレ前][トレ後]などのタグも除去
        cleanText = cleanText.replace(Regex("\\[[^\\]]+\\]\\s*"), "").trim()
        // PFCターゲット部分を除去: "P31g F11g C69g" や "P20g・F10g・C50g" など
        cleanText = cleanText.replace(Regex("P\\d+g\\s*[・/\\s]*F\\d+g\\s*[・/\\s]*C\\d+g\\s*"), "").trim()
        // (A), (B), (C) の選択肢表示を除去
        cleanText = cleanText.replace(Regex("\\([ABC]\\)\\s*"), "").trim()

        android.util.Log.d("DashboardVM", "parseMultipleFoods: cleanText=$cleanText")

        val results = mutableListOf<Triple<String, Float, String>>()

        // カンマまたは「、」で分割
        val parts = cleanText.split(Regex("[,、]"))

        for (part in parts) {
            val trimmedPart = part.trim()
            if (trimmedPart.isEmpty()) continue

            // 食品名と量を抽出: "鶏むね肉100g" or "鶏むね肉（皮なし）100g" or "白米 130g"
            val foodPattern = Regex("(.+?)(\\d+(?:\\.\\d+)?)(g|kg|ml|L|個|枚|杯|本|切れ)")
            val match = foodPattern.find(trimmedPart)

            if (match != null) {
                val foodName = match.groupValues[1].trim()
                    .replace(Regex("^[・\\-\\*]\\s*"), "")
                    .trim()
                val amount = match.groupValues[2].toFloatOrNull() ?: 100f
                val unit = match.groupValues[3]

                // 単独のP, F, Cは食品名ではないのでスキップ
                if (foodName.isNotEmpty() && !foodName.matches(Regex("^[PFC]$"))) {
                    // 卵の場合、gを個数に変換（Lサイズ=64g）
                    val (finalAmount, finalUnit) = convertEggToKo(foodName, amount, unit)
                    results.add(Triple(foodName, finalAmount, finalUnit))
                }
            }
        }

        return results
    }

    /**
     * 卵の場合、グラム表記を個数に変換
     */
    private fun convertEggToKo(foodName: String, amount: Float, unit: String): Pair<Float, String> {
        val lowerName = foodName.lowercase()
        if (unit == "g" && (lowerName.contains("卵") || lowerName.contains("全卵") || lowerName.contains("たまご"))) {
            // Lサイズ=64g として個数に変換
            val eggSize = when {
                lowerName.contains("ll") -> 70f
                lowerName.contains("l") -> 64f
                lowerName.contains("m") -> 58f
                lowerName.contains("s") -> 52f
                else -> 64f  // デフォルトLサイズ
            }
            val count = (amount / eggSize).let { kotlin.math.round(it) }
            if (count >= 1) {
                return Pair(count, "個")
            }
        }
        return Pair(amount, unit)
    }

    /**
     * 食品名と単位から実際のグラム数を計算
     * 「個」「本」「枚」などの単位の場合は標準重量を乗算
     */
    private fun calculateActualGrams(foodName: String, amount: Float, unit: String): Float {
        // g, kg, ml, L の場合はそのまま（kgは1000倍、Lは1000倍）
        return when (unit.lowercase()) {
            "g" -> amount
            "kg" -> amount * 1000f
            "ml" -> amount  // 水系は1ml≈1g
            "l" -> amount * 1000f
            else -> {
                // 個、本、枚、杯、切れ などの場合は標準単位重量を使用
                val standardWeight = getStandardUnitWeight(foodName, unit)
                amount * standardWeight
            }
        }
    }

    /**
     * 食品の標準単位重量を取得（1個/1本あたりのグラム数）
     */
    private fun getStandardUnitWeight(foodName: String, unit: String): Float {
        val lowerName = foodName.lowercase()

        return when {
            // 卵類（サイズ順にチェック）
            (lowerName.contains("ll") || lowerName.contains("LL")) && (lowerName.contains("卵") || lowerName.contains("たまご")) -> 70f
            (lowerName.contains("l") || lowerName.contains("L")) && (lowerName.contains("卵") || lowerName.contains("たまご") || lowerName.contains("全卵")) -> 64f
            (lowerName.contains("m") || lowerName.contains("M")) && (lowerName.contains("卵") || lowerName.contains("たまご")) -> 58f
            (lowerName.contains("s") || lowerName.contains("S")) && (lowerName.contains("卵") || lowerName.contains("たまご")) -> 52f
            lowerName.contains("卵") || lowerName.contains("たまご") || lowerName.contains("全卵") -> 64f  // デフォルトLサイズ

            // 果物
            lowerName.contains("バナナ") -> 100f  // 可食部
            lowerName.contains("りんご") || lowerName.contains("リンゴ") -> 250f
            lowerName.contains("みかん") -> 80f
            lowerName.contains("オレンジ") -> 150f
            lowerName.contains("キウイ") -> 80f

            // もち・パン
            lowerName.contains("もち") || lowerName.contains("餅") -> 50f
            lowerName.contains("パン") && unit == "枚" -> 60f  // 6枚切り
            lowerName.contains("おにぎり") -> 100f

            // 豆腐
            lowerName.contains("豆腐") && unit == "丁" -> 300f

            // プロテイン（スクープ）
            lowerName.contains("プロテイン") && unit == "杯" -> 30f

            // 飲料（杯）
            unit == "杯" -> 200f  // コップ1杯

            // 切れ（魚など）
            unit == "切れ" -> 80f

            // デフォルト：1単位 = 100g として推定
            else -> 100f
        }
    }

    /**
     * 食品データからMealItemを作成
     */
    private fun createMealItemFromFood(
        foodData: FoodItem?,
        fallbackName: String,
        amount: Float,
        unit: String
    ): MealItem {
        // 実際のグラム数を計算
        val actualGrams = calculateActualGrams(fallbackName, amount, unit)
        val ratio = actualGrams / 100f

        android.util.Log.d("DashboardVM", "createMealItemFromFood: $fallbackName, amount=$amount, unit=$unit, actualGrams=$actualGrams, ratio=$ratio")

        return if (foodData != null) {
            val protein = foodData.protein * ratio
            val fat = foodData.fat * ratio
            val carbs = foodData.carbs * ratio
            MealItem(
                name = foodData.name,
                amount = amount,
                unit = unit,
                calories = MealItem.calculateCalories(protein, fat, carbs),
                protein = protein,
                carbs = carbs,
                fat = fat,
                fiber = foodData.fiber * ratio,
                solubleFiber = foodData.solubleFiber * ratio,
                insolubleFiber = foodData.insolubleFiber * ratio,
                sugar = foodData.sugar * ratio,
                gi = foodData.gi ?: 0,
                saturatedFat = foodData.saturatedFat * ratio,
                monounsaturatedFat = foodData.monounsaturatedFat * ratio,
                polyunsaturatedFat = foodData.polyunsaturatedFat * ratio,
                diaas = foodData.diaas,
                vitamins = mapOf(
                    "vitaminA" to foodData.vitaminA * ratio,
                    "vitaminB1" to foodData.vitaminB1 * ratio,
                    "vitaminB2" to foodData.vitaminB2 * ratio,
                    "vitaminB6" to foodData.vitaminB6 * ratio,
                    "vitaminB12" to foodData.vitaminB12 * ratio,
                    "vitaminC" to foodData.vitaminC * ratio,
                    "vitaminD" to foodData.vitaminD * ratio,
                    "vitaminE" to foodData.vitaminE * ratio,
                    "vitaminK" to foodData.vitaminK * ratio,
                    "niacin" to foodData.niacin * ratio,
                    "pantothenicAcid" to foodData.pantothenicAcid * ratio,
                    "biotin" to foodData.biotin * ratio,
                    "folicAcid" to foodData.folicAcid * ratio
                ),
                minerals = mapOf(
                    "sodium" to foodData.sodium * ratio,
                    "potassium" to foodData.potassium * ratio,
                    "calcium" to foodData.calcium * ratio,
                    "magnesium" to foodData.magnesium * ratio,
                    "phosphorus" to foodData.phosphorus * ratio,
                    "iron" to foodData.iron * ratio,
                    "zinc" to foodData.zinc * ratio,
                    "copper" to foodData.copper * ratio,
                    "manganese" to foodData.manganese * ratio,
                    "iodine" to foodData.iodine * ratio,
                    "selenium" to foodData.selenium * ratio,
                    "chromium" to foodData.chromium * ratio,
                    "molybdenum" to foodData.molybdenum * ratio
                )
            )
        } else {
            // 推定値を使用（食品タイプに基づいて計算）
            android.util.Log.w("DashboardVM", "createMealItemFromFood: Using fallback for '$fallbackName'")
            val lowerName = fallbackName.lowercase()
            val (estCal, estP, estC, estF, estDiaas) = when {
                // 炭水化物源（米、麺、餅、パン）- 低P高C
                lowerName.contains("米") || lowerName.contains("ごはん") ||
                lowerName.contains("麺") || lowerName.contains("パン") ||
                lowerName.contains("餅") || lowerName.contains("もち") ||
                lowerName.contains("うどん") || lowerName.contains("そば") -> {
                    listOf(1.5f, 0.025f, 0.35f, 0.005f, 0.5f)  // 白米: 150kcal/100g, P2.5g, C35g, F0.5g
                }
                // タンパク質源（肉、魚、卵）- 高P低C
                lowerName.contains("肉") || lowerName.contains("チキン") ||
                lowerName.contains("魚") || lowerName.contains("サーモン") ||
                lowerName.contains("鮭") || lowerName.contains("サバ") -> {
                    listOf(1.5f, 0.20f, 0f, 0.05f, 1.0f)  // 鶏肉: 150kcal/100g, P20g, C0g, F5g
                }
                lowerName.contains("卵") || lowerName.contains("たまご") -> {
                    listOf(1.5f, 0.12f, 0.005f, 0.10f, 1.1f)  // 卵: 150kcal/100g, P12g, C0.5g, F10g
                }
                // 野菜
                lowerName.contains("ブロッコリー") || lowerName.contains("野菜") ||
                lowerName.contains("サラダ") -> {
                    listOf(0.3f, 0.03f, 0.05f, 0.005f, 0.8f)  // 野菜: 30kcal/100g, P3g, C5g, F0.5g
                }
                // プロテインサプリ
                lowerName.contains("プロテイン") || lowerName.contains("ホエイ") -> {
                    listOf(3.8f, 0.75f, 0.05f, 0.03f, 1.0f)  // プロテイン: 380kcal/100g, P75g, C5g, F3g
                }
                // デフォルト（中程度）
                else -> listOf(1.2f, 0.08f, 0.15f, 0.05f, 0.7f)
            }
            val estProtein = actualGrams * estP
            val estFat = actualGrams * estF
            val estCarbs = actualGrams * estC
            MealItem(
                name = fallbackName,
                amount = amount,
                unit = unit,
                calories = MealItem.calculateCalories(estProtein, estFat, estCarbs),
                protein = estProtein,
                carbs = estCarbs,
                fat = estFat,
                fiber = 0f,
                solubleFiber = 0f,
                insolubleFiber = 0f,
                sugar = 0f,
                gi = 0,
                saturatedFat = 0f,
                monounsaturatedFat = 0f,
                polyunsaturatedFat = 0f,
                diaas = estDiaas,
                vitamins = emptyMap(),
                minerals = emptyMap()
            )
        }
    }

    /**
     * 単一食品の食事を保存（フォールバック用）
     */
    private suspend fun saveSingleFoodMeal(
        userId: String,
        item: DirectiveActionItem,
        mealItem: MealItem,
        displayName: String
    ) {
        val selectedDate = _uiState.value.date
        val targetTimestamp = DateUtil.dateStringToTimestamp(selectedDate) + 12 * 60 * 60 * 1000
        val totalGL = if (mealItem.gi > 0 && mealItem.carbs > 0) (mealItem.gi * mealItem.carbs / 100f) else 0f

        val meal = Meal(
            id = "",
            userId = userId,
            name = "指示書: $displayName",
            type = MealType.SNACK,
            items = listOf(mealItem),
            totalCalories = mealItem.calories,
            totalProtein = mealItem.protein,
            totalCarbs = mealItem.carbs,
            totalFat = mealItem.fat,
            totalFiber = mealItem.fiber,
            totalGL = totalGL,
            isTemplate = false,
            timestamp = targetTimestamp,
            createdAt = System.currentTimeMillis()
        )

        mealRepository.addMeal(meal)
            .onSuccess {
                markDirectiveItemExecuted(item)
                updateBadgeStats("meal_recorded")
            }
            .onFailure { e ->
                _uiState.update { it.copy(error = "食事の記録に失敗しました: ${e.message}") }
            }
    }

    // ========== タイムライン関連 ==========

    /**
     * タイムライン情報を計算
     * ユーザープロフィールから食事スロットの時刻を計算
     */
    private fun calculateTimelineInfo(user: User?, meals: List<Meal>, todayRoutine: RoutineDay? = null): TimelineInfo {
        val profile = user?.profile ?: return TimelineInfo()

        // タイムライン設定が有効かチェック
        val wakeUpTime = profile.wakeUpTime ?: return TimelineInfo()
        val sleepTime = profile.sleepTime ?: return TimelineInfo()
        val mealsPerDay = profile.mealsPerDay

        // 時刻を分数に変換
        val wakeUpMinutes = parseTimeToMinutes(wakeUpTime) ?: return TimelineInfo()
        val sleepMinutes = parseTimeToMinutes(sleepTime) ?: return TimelineInfo()

        // 休養日判定（ルーティンが休み/オフまたは手動休養日）
        val isRestDay = todayRoutine?.splitType in listOf("休み", "オフ") || _uiState.value.isManualRestDay

        // トレーニング時間（デフォルト17:00、休養日はnull）
        val trainingTimeStr = profile.trainingTime ?: "17:00"
        val trainingMinutes = if (isRestDay) null else parseTimeToMinutes(trainingTimeStr)

        // トレ前食事（デフォルト3食目、休養日またはトレ時間未設定はnull）
        val trainingAfterMeal = if (isRestDay || trainingMinutes == null) null else (profile.trainingAfterMeal ?: 3)

        // 現在時刻を取得
        val now = java.util.Calendar.getInstance()
        val currentTimeMinutes = now.get(java.util.Calendar.HOUR_OF_DAY) * 60 + now.get(java.util.Calendar.MINUTE)

        // 食事スロット設定: ユーザー保存済みのabsoluteTimeがあればそれを優先
        val baseConfig = MealSlotConfig.createTimelineRoutine(
            mealsPerDay = mealsPerDay,
            trainingAfterMeal = trainingAfterMeal
        )
        val savedConfig = profile.mealSlotConfig
        val mealSlotConfig = if (savedConfig != null && savedConfig.slots.any { it.absoluteTime != null }) {
            // 保存済みのabsoluteTimeをベースに上書き（トレーナー設定優先）
            val mergedSlots = baseConfig.slots.map { baseSlot ->
                val savedSlot = savedConfig.slots.find { it.slotNumber == baseSlot.slotNumber }
                if (savedSlot?.absoluteTime != null) {
                    // absoluteTimeがある場合はrelativeTimeをクリアしてabsoluteTimeを使用
                    baseSlot.copy(relativeTime = null, absoluteTime = savedSlot.absoluteTime)
                } else {
                    baseSlot
                }
            }
            baseConfig.copy(slots = mergedSlots)
        } else {
            baseConfig
        }

        // コスト帯（予算）を取得
        val budgetTier = profile.budgetTier

        // 記録済み食事の数をカウント
        val recordedMealCount = meals.size

        // 各スロットの時刻を計算（meal相対時刻を解決するため一括計算）
        val allSlotTimes = mealSlotConfig.calculateAllSlotTimes(wakeUpMinutes, trainingMinutes, sleepMinutes)

        val timelineSlots = mealSlotConfig.slots.mapNotNull { slot ->
            val actualTime = allSlotTimes[slot.slotNumber]
                ?: return@mapNotNull null

            // トレ前後かどうか判定
            val isTrainingRelated = trainingAfterMeal != null &&
                    (slot.slotNumber == trainingAfterMeal || slot.slotNumber == trainingAfterMeal + 1)

            // 相対時刻ラベルを生成
            val relativeLabel = when {
                slot.relativeTime?.startsWith("wake") == true -> {
                    val offset = slot.relativeTime!!.removePrefix("wake").let {
                        if (it.startsWith("+")) it.removePrefix("+").toIntOrNull() ?: 0
                        else if (it.startsWith("-")) -(it.removePrefix("-").toIntOrNull() ?: 0)
                        else 0
                    }
                    when {
                        offset == 0 -> "起床時"
                        offset > 0 -> "起床+${offset}分"
                        else -> "起床${offset}分前"
                    }
                }
                slot.relativeTime?.startsWith("training") == true -> {
                    val offset = slot.relativeTime!!.removePrefix("training").let {
                        if (it.startsWith("+")) it.removePrefix("+").toIntOrNull() ?: 0
                        else if (it.startsWith("-")) -(it.removePrefix("-").toIntOrNull() ?: 0)
                        else 0
                    }
                    when {
                        offset > 0 -> "トレーニング後+${offset}分"
                        offset < 0 -> "トレーニング前${kotlin.math.abs(offset)}分"
                        else -> "トレーニング直後"
                    }
                }
                slot.relativeTime?.startsWith("sleep") == true -> {
                    val offset = slot.relativeTime!!.removePrefix("sleep").let {
                        if (it.startsWith("+")) it.removePrefix("+").toIntOrNull() ?: 0
                        else if (it.startsWith("-")) -(it.removePrefix("-").toIntOrNull() ?: 0)
                        else 0
                    }
                    if (offset < 0) "就寝${kotlin.math.abs(offset)}分前" else "就寝+${offset}分"
                }
                slot.relativeTime?.startsWith("meal") == true -> {
                    // meal1+240 のような形式を解析
                    val mealPattern = Regex("""meal(\d+)([+-]\d+)?""")
                    val match = mealPattern.matchEntire(slot.relativeTime!!)
                    if (match != null) {
                        val prevMealNum = match.groupValues[1].toIntOrNull() ?: 1
                        val offset = match.groupValues[2].let { offsetStr ->
                            if (offsetStr.isBlank()) 0
                            else if (offsetStr.startsWith("+")) offsetStr.removePrefix("+").toIntOrNull() ?: 0
                            else if (offsetStr.startsWith("-")) -(offsetStr.removePrefix("-").toIntOrNull() ?: 0)
                            else 0
                        }
                        val hours = offset / 60
                        val mins = offset % 60
                        when {
                            hours > 0 && mins > 0 -> "食事${prevMealNum}の${hours}時間${mins}分後"
                            hours > 0 -> "食事${prevMealNum}の${hours}時間後"
                            mins > 0 -> "食事${prevMealNum}の${mins}分後"
                            else -> "食事${prevMealNum}の直後"
                        }
                    } else null
                }
                else -> null
            }

            // ルーティン連動: トレーニング部位に応じた食品例
            val bodyPart = todayRoutine?.splitType  // "胸", "背中", "脚", "休み"等
            val costTier = budgetTier
            val foodExamples = if (isTrainingRelated) {
                // トレ前後: 餅 + ホエイ（+ 塩）
                if (slot.relativeTime?.contains("before") == true || slot.relativeTime?.contains("-") == true) {
                    listOf("切り餅", "岩塩3g")  // トレ前は塩も
                } else {
                    listOf("切り餅", "ホエイプロテイン")  // トレ後
                }
            } else {
                // 通常食: ルーティン連動でタンパク質を決定
                val protein = BodymakingFoodDatabase.getProteinForTraining(bodyPart, costTier)
                val carb = if (profile.goal == FitnessGoal.LOSE_WEIGHT) "玄米" else "白米"
                listOf(protein.displayName, carb)
            }

            TimelineSlotInfo(
                slotNumber = slot.slotNumber,
                displayName = slot.getDisplayName(),
                timeMinutes = actualTime,
                timeString = MealSlot.minutesToTimeString(actualTime),
                isTrainingRelated = isTrainingRelated,
                isCompleted = slot.slotNumber <= recordedMealCount,
                relativeTimeLabel = relativeLabel,
                foodExamples = foodExamples
            )
        }.sortedBy { it.timeMinutes }

        // 次の食事を特定
        val nextMealSlot = timelineSlots.firstOrNull { !it.isCompleted && it.timeMinutes > currentTimeMinutes }
            ?: timelineSlots.firstOrNull { !it.isCompleted }

        // 次の食事までの時間を計算
        val timeUntilNextMeal = if (nextMealSlot != null) {
            val diff = nextMealSlot.timeMinutes - currentTimeMinutes
            if (diff < 0) diff + 1440 else diff  // 翌日の場合は+24h
        } else 0

        return TimelineInfo(
            slots = timelineSlots,
            nextMealSlot = nextMealSlot,
            timeUntilNextMeal = timeUntilNextMeal,
            currentTimeMinutes = currentTimeMinutes,
            trainingTimeMinutes = trainingMinutes,
            hasTimelineConfig = true
        )
    }

    /**
     * 時刻文字列を分数に変換
     */
    private fun parseTimeToMinutes(time: String): Int? {
        val parts = time.split(":")
        if (parts.size != 2) return null
        val hours = parts[0].toIntOrNull() ?: return null
        val minutes = parts[1].toIntOrNull() ?: return null
        return hours * 60 + minutes
    }

    /**
     * タイムラインを更新（毎分呼び出し用）
     */
    fun updateTimelineNow() {
        val user = _uiState.value.user
        val meals = _uiState.value.meals
        val todayRoutine = _uiState.value.todayRoutine
        val timelineInfo = calculateTimelineInfo(user, meals, todayRoutine)

        _uiState.update { state ->
            state.copy(
                timelineSlots = timelineInfo.slots,
                nextMealSlot = timelineInfo.nextMealSlot,
                timeUntilNextMeal = timelineInfo.timeUntilNextMeal,
                currentTimeMinutes = timelineInfo.currentTimeMinutes,
                trainingTimeMinutes = timelineInfo.trainingTimeMinutes,
                hasTimelineConfig = timelineInfo.hasTimelineConfig
            )
        }
    }

    /**
     * 運動指示を実行（バッチ用：loadDashboardDataを呼ばない）
     */
    private suspend fun executeExerciseDirectiveBatch(userId: String, item: DirectiveActionItem) {
        val exerciseName = item.itemName ?: return
        val amount = item.amount?.toInt() ?: 10
        val unit = item.unit ?: "回"

        val exercise = com.yourcoach.plus.shared.domain.model.Exercise(
            name = exerciseName,
            category = com.yourcoach.plus.shared.domain.model.ExerciseCategory.OTHER,
            sets = if (unit == "セット") amount else 3,
            reps = if (unit == "回") amount else 10,
            caloriesBurned = 50
        )

        // 選択中の日付のタイムスタンプを取得（未来日対応）
        val selectedDate = _uiState.value.date
        val targetTimestamp = DateUtil.dateStringToTimestamp(selectedDate) + 12 * 60 * 60 * 1000 // 正午に設定

        val workout = Workout(
            id = "",
            userId = userId,
            name = "指示書: $exerciseName",
            type = com.yourcoach.plus.shared.domain.model.WorkoutType.STRENGTH,
            exercises = listOf(exercise),
            totalDuration = 10,
            totalCaloriesBurned = 50,
            intensity = com.yourcoach.plus.shared.domain.model.WorkoutIntensity.MODERATE,
            timestamp = targetTimestamp,
            createdAt = System.currentTimeMillis()
        )

        workoutRepository.addWorkout(workout)
            .onSuccess { markDirectiveItemExecuted(item) }
            .onFailure { e ->
                _uiState.update { it.copy(error = "運動の記録に失敗しました: ${e.message}") }
            }
    }

    // ========== クエスト生成 ==========

    /**
     * 明日のクエストを生成
     * Cloud Function generateQuestを呼び出し、Directiveとして保存
     */
    fun generateQuest() {
        val userId = currentUserId ?: return
        val user = _uiState.value.user ?: return

        // カスタムクエストが設定されている場合はAI生成をブロック
        if (_uiState.value.customQuest != null) {
            _uiState.update { it.copy(questGenerationError = "トレーナーのプラン実行中のため、AI生成は利用できません") }
            return
        }

        // プレミアム会員チェック（isPremium または 所属名で判定）
        if (user.isPremium != true && !user.hasCorporatePremium) {
            _uiState.update { it.copy(questGenerationError = "クエスト生成はプレミアム会員限定機能です") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isGeneratingQuest = true, questGenerationError = null) }

            try {
                val functions = com.google.firebase.functions.FirebaseFunctions
                    .getInstance("asia-northeast2")

                // プロフィール情報を収集
                val profile = user.profile
                val goal = profile?.goal?.name ?: "MAINTAIN"
                val budgetTier = profile?.budgetTier ?: 2
                val mealsPerDay = profile?.mealsPerDay ?: 5
                val trainingAfterMeal = profile?.trainingAfterMeal
                val targetDate = DateUtil.nextDay(DateUtil.todayString())

                // 翌日のルーティンを取得（ダッシュボードと同じ計算）
                val tomorrowRoutine = routineRepository.getRoutineForDate(userId, targetDate).getOrNull()
                val rawSplitType = tomorrowRoutine?.splitType ?: "off"

                // splitTypeは日本語→英語変換（Cloud Function側と同期）
                val splitType = when (rawSplitType) {
                    "胸" -> "chest"
                    "背中" -> "back"
                    "脚" -> "legs"
                    "肩" -> "shoulders"
                    "腕" -> "arms"
                    "腹筋" -> "abs"
                    "腹筋・体幹" -> "abs_core"
                    "有酸素" -> "cardio"
                    "休み" -> "rest"
                    "オフ" -> "off"
                    "上半身" -> "upper_body"
                    "下半身" -> "lower_body"
                    "全身" -> "full_body"
                    "プッシュ" -> "push"
                    "プル" -> "pull"
                    "胸・三頭" -> "chest_triceps"
                    "背中・二頭" -> "back_biceps"
                    "肩・腕" -> "shoulders_arms"
                    else -> rawSplitType.lowercase()
                }

                android.util.Log.d("DashboardVM", "generateQuest: 翌日ルーティン=$rawSplitType → $splitType")

                // 目標PFC（明日のルーティンに基づいて再計算）
                val tomorrowTargets = calculateTargets(user, tomorrowRoutine, isManualRestDay = false)
                val targetProtein = tomorrowTargets.protein
                val targetCarbs = tomorrowTargets.carbs
                val targetFat = tomorrowTargets.fat
                val targetCalories = tomorrowTargets.calories

                android.util.Log.d("DashboardVM", "generateQuest: 明日の目標 cal=$targetCalories, P=$targetProtein, F=$targetFat, C=$targetCarbs")

                // 体組成（LBM計算用）
                val weight = profile?.weight ?: 70f
                val bodyFatPercentage = profile?.bodyFatPercentage ?: 20f
                val lbm = weight * (1 - bodyFatPercentage / 100f)

                // 食物繊維目標値（LBMベース + 目標別調整）
                val baseFiber = lbm * 0.4f
                val fiberTarget = when (profile?.goal) {
                    com.yourcoach.plus.shared.domain.model.FitnessGoal.LOSE_WEIGHT -> baseFiber * 1.25f
                    com.yourcoach.plus.shared.domain.model.FitnessGoal.GAIN_MUSCLE -> baseFiber * 0.9f
                    else -> baseFiber
                }

                // タイムスケジュール
                val wakeUpTime = profile?.wakeUpTime ?: "06:00"
                val trainingTime = profile?.trainingTime
                val sleepTime = profile?.sleepTime ?: "23:00"
                val trainingDuration = profile?.trainingDuration ?: 120

                val trainingStyle = profile?.trainingStyle?.name ?: "PUMP"

                val data = hashMapOf(
                    "goal" to goal,
                    "budgetTier" to budgetTier,
                    "mealsPerDay" to mealsPerDay,
                    "splitType" to splitType,
                    "targetDate" to targetDate,
                    "targetProtein" to targetProtein,
                    "targetCarbs" to targetCarbs,
                    "targetFat" to targetFat,
                    "targetCalories" to targetCalories,
                    "fiberTarget" to fiberTarget,
                    "trainingAfterMeal" to trainingAfterMeal,
                    "trainingStyle" to trainingStyle,
                    "wakeUpTime" to wakeUpTime,
                    "trainingTime" to trainingTime,
                    "sleepTime" to sleepTime,
                    "trainingDuration" to trainingDuration,
                    "weight" to weight,
                    "bodyFatPercentage" to bodyFatPercentage
                )

                android.util.Log.d("DashboardVM", "generateQuest: 呼び出し開始 $data")

                val result = withTimeout(300_000L) {
                    functions
                        .getHttpsCallable("generateQuest")
                        .withTimeout(300, java.util.concurrent.TimeUnit.SECONDS)
                        .call(data)
                        .await()
                }

                val response = result.data as? Map<*, *>
                android.util.Log.d("DashboardVM", "=== generateQuest レスポンス ===")
                android.util.Log.d("DashboardVM", "success: ${response?.get("success")}")
                android.util.Log.d("DashboardVM", "directiveMessage:\n${response?.get("directiveMessage")}")

                _uiState.update { it.copy(isGeneratingQuest = false) }

                // クエスト生成で経験値獲得
                grantExperience("クエスト生成")

                // 翌日に切り替えて即時反映（Firestoreから最新データを取得）
                changeDate(targetDate)
                android.util.Log.d("DashboardVM", "generateQuest: 翌日 $targetDate に切り替え")
            } catch (_: kotlinx.coroutines.TimeoutCancellationException) {
                android.util.Log.e("DashboardVM", "generateQuest: タイムアウト")
                _uiState.update {
                    it.copy(
                        isGeneratingQuest = false,
                        questGenerationError = "クエスト生成がタイムアウトしました。再度お試しください。"
                    )
                }
            } catch (e: Exception) {
                android.util.Log.e("DashboardVM", "generateQuest: 例外発生", e)
                _uiState.update {
                    it.copy(
                        isGeneratingQuest = false,
                        questGenerationError = "エラー: ${e.message}"
                    )
                }
            }
        }
    }

    /**
     * クエストJSONをDirectiveに変換して保存
     */
    private suspend fun saveQuestAsDirective(userId: String, targetDate: String, quest: Map<*, *>) {
        val messageLines = mutableListOf<String>()

        // 食事クエスト
        val meals = quest["meals"] as? List<*>
        meals?.forEach { meal ->
            val mealMap = meal as? Map<*, *> ?: return@forEach
            val slot = (mealMap["slot"] as? Number)?.toInt() ?: return@forEach
            val foods = mealMap["foods"] as? List<*> ?: return@forEach
            val pfcTarget = mealMap["pfc_target"] as? String ?: ""

            val foodStrings = foods.mapNotNull { food ->
                val foodMap = food as? Map<*, *> ?: return@mapNotNull null
                val foodId = foodMap["food_id"] as? String ?: return@mapNotNull null
                val amount = (foodMap["amount"] as? Number)?.toInt() ?: 100
                val unit = foodMap["unit"] as? String ?: "g"

                // BodymakingFoodDatabaseから表示名を取得
                val displayName = BodymakingFoodDatabase.getById(foodId)?.displayName ?: foodId
                "$displayName ${amount}$unit"
            }

            if (foodStrings.isNotEmpty()) {
                val pfcLabel = if (pfcTarget.isNotEmpty()) " $pfcTarget" else ""
                messageLines.add("【食事$slot】$pfcLabel ${foodStrings.joinToString(" + ")}")
            }
        }

        // 運動クエスト（30分あたり1種目×5セット）
        val workout = quest["workout"] as? Map<*, *>
        workout?.let {
            val name = it["name"] as? String ?: "運動"
            val exercises = (it["exercises"] as? Number)?.toInt() ?: 4
            val setsPerExercise = (it["sets"] as? Number)?.toInt() ?: 5
            val totalSets = (it["total_sets"] as? Number)?.toInt() ?: (exercises * setsPerExercise)
            messageLines.add("【運動】$name ${exercises}種目×${setsPerExercise}セット（計${totalSets}セット）")
        }

        // 睡眠クエスト
        val sleep = quest["sleep"] as? Map<*, *>
        sleep?.let {
            val hours = (it["hours"] as? Number)?.toInt() ?: 7
            val note = it["note"] as? String
            val noteLabel = if (!note.isNullOrEmpty()) " ($note)" else ""
            messageLines.add("【睡眠】${hours}時間確保$noteLabel")
        }

        if (messageLines.isEmpty()) {
            android.util.Log.w("DashboardVM", "saveQuestAsDirective: 有効なクエストがありません")
            return
        }

        val directive = Directive(
            userId = userId,
            date = targetDate,
            message = messageLines.joinToString("\n"),
            type = DirectiveType.MEAL,
            completed = false,
            createdAt = System.currentTimeMillis()
        )

        directiveRepository.saveDirective(directive)
            .onSuccess {
                android.util.Log.d("DashboardVM", "saveQuestAsDirective: 保存成功 ${messageLines.size}件")
            }
            .onFailure { e ->
                android.util.Log.e("DashboardVM", "saveQuestAsDirective: 保存失敗", e)
                _uiState.update { it.copy(questGenerationError = "保存失敗: ${e.message}") }
            }
    }

    /**
     * Cloud Functionから返されたdirectiveMessageを直接保存
     */
    private suspend fun saveDirectiveMessage(userId: String, targetDate: String, message: String) {
        val directive = Directive(
            userId = userId,
            date = targetDate,
            message = message,
            type = DirectiveType.MEAL,
            completed = false,
            createdAt = System.currentTimeMillis()
        )

        directiveRepository.saveDirective(directive)
            .onSuccess {
                val lineCount = message.lines().filter { it.isNotBlank() }.size
                android.util.Log.d("DashboardVM", "saveDirectiveMessage: 保存成功 ${lineCount}件")
            }
            .onFailure { e ->
                android.util.Log.e("DashboardVM", "saveDirectiveMessage: 保存失敗", e)
                _uiState.update { it.copy(questGenerationError = "保存失敗: ${e.message}") }
            }
    }

    /**
     * クエスト生成エラーをクリア
     */
    fun clearQuestGenerationError() {
        _uiState.update { it.copy(questGenerationError = null) }
    }

    // ========== Pro Cockpit UI 関連 ==========

    /**
     * Micro+詳細シートの表示/非表示を切り替え
     */
    fun toggleMicroDetailSheet(show: Boolean) {
        _uiState.update { it.copy(showMicroDetailSheet = show) }
    }

    /**
     * 統合タイムラインを構築
     * タイムラインスロット（クエスト）、実際の食事記録、運動記録を時刻順に統合
     */
    private fun buildUnifiedTimeline(
        timelineSlots: List<TimelineSlotInfo>,
        meals: List<Meal>,
        workouts: List<Workout>,
        directive: Directive?,
        customQuest: CustomQuest? = null,
        currentTimeMinutes: Int,
        trainingTimeMinutes: Int?
    ): List<UnifiedTimelineItem> {
        val items = mutableListOf<UnifiedTimelineItem>()

        // カスタムクエストがある場合はそちらを優先表示
        android.util.Log.d("DashboardVM", "buildUnifiedTimeline: customQuest=${customQuest != null}, slots=${customQuest?.slots?.keys}, directive=${directive != null}")
        if (customQuest != null) {
            val customItems = buildCustomQuestTimelineItems(
                customQuest, currentTimeMinutes, meals, workouts,
                timelineSlots = timelineSlots,
                trainingTimeMinutes = trainingTimeMinutes
            )
            items.addAll(customItems)
        } else if (directive != null && directive.message.isNotBlank()) {
            // Directiveがある場合のみタイムラインを構築（未生成時は空）
            val directiveItems = parseDirectiveToTimelineItems(directive, currentTimeMinutes, meals, workouts)
            items.addAll(directiveItems)
        }

        // 実際の食事記録を時刻で挿入（常に追加）
        meals.forEach { meal ->
            val mealTime = timestampToMinutes(meal.timestamp)
            // 同じ時刻のクエストアイテムがあれば、そのステータスを更新
            val existingItem = items.find {
                it.type == TimelineItemType.MEAL &&
                kotlin.math.abs(it.timeMinutes - mealTime) < 30 &&
                it.linkedMeal == null
            }
            if (existingItem != null) {
                // 既存のクエストアイテムを完了済みに更新
                val index = items.indexOf(existingItem)
                items[index] = existingItem.copy(
                    status = TimelineItemStatus.COMPLETED,
                    linkedMeal = meal,
                    subtitle = "${meal.totalCalories}kcal | P${meal.totalProtein.toInt()}g"
                )
            } else {
                // 新しい食事記録を追加
                items.add(UnifiedTimelineItem(
                    id = "meal_${meal.id}",
                    type = TimelineItemType.MEAL,
                    timeMinutes = mealTime,
                    timeString = minutesToTimeString(mealTime),
                    title = meal.name ?: "食事",
                    subtitle = "${meal.totalCalories}kcal | P${meal.totalProtein.toInt()}g",
                    status = TimelineItemStatus.COMPLETED,
                    linkedMeal = meal
                ))
            }
        }

        // 実際の運動記録を時刻で挿入
        workouts.forEach { workout ->
            val workoutTime = timestampToMinutes(workout.timestamp)
            // 同じ時刻の運動クエストがあれば更新
            val existingItem = items.find {
                it.type == TimelineItemType.WORKOUT &&
                kotlin.math.abs(it.timeMinutes - workoutTime) < 30 &&
                it.linkedWorkout == null
            }
            if (existingItem != null) {
                val index = items.indexOf(existingItem)
                items[index] = existingItem.copy(
                    status = TimelineItemStatus.COMPLETED,
                    linkedWorkout = workout,
                    subtitle = "${workout.totalCaloriesBurned}kcal"
                )
            } else if (trainingTimeMinutes == null ||
                kotlin.math.abs(workoutTime - trainingTimeMinutes) > 30) {
                items.add(UnifiedTimelineItem(
                    id = "workout_${workout.id}",
                    type = TimelineItemType.WORKOUT,
                    timeMinutes = workoutTime,
                    timeString = minutesToTimeString(workoutTime),
                    title = workout.name ?: "運動",
                    subtitle = "${workout.totalCaloriesBurned}kcal",
                    status = TimelineItemStatus.COMPLETED,
                    linkedWorkout = workout
                ))
            }
        }

        // 時刻順にソート + 重複排除
        return items
            .distinctBy { it.id }
            .sortedBy { it.timeMinutes }
    }

    /**
     * カスタムクエストからタイムラインアイテムを生成
     * スロットキー: meal_1, meal_2, ... meal_N, workout
     * 時刻はcalculateTimelineInfoで計算済みのtimelineSlotsを使用
     */
    private fun buildCustomQuestTimelineItems(
        customQuest: CustomQuest,
        currentTimeMinutes: Int,
        meals: List<Meal>,
        workouts: List<Workout>,
        timelineSlots: List<TimelineSlotInfo>,
        trainingTimeMinutes: Int? = null
    ): List<UnifiedTimelineItem> {
        val items = mutableListOf<UnifiedTimelineItem>()

        // meal_N キーを数字順にソート、workoutは最後
        val mealKeys = customQuest.slots.keys
            .filter { it.startsWith("meal_") }
            .sortedBy { it.removePrefix("meal_").toIntOrNull() ?: 0 }
        val hasWorkout = customQuest.slots.containsKey("workout")
        val orderedKeys = mealKeys + (if (hasWorkout) listOf("workout") else emptyList())

        // timelineSlotsからスロット番号→時刻のマップを作成
        val slotTimeMap = timelineSlots.associate { it.slotNumber to it.timeMinutes }
        val timeMap = mutableMapOf<String, Int>()
        mealKeys.forEach { key ->
            val slotNum = key.removePrefix("meal_").toIntOrNull() ?: 0
            timeMap[key] = slotTimeMap[slotNum] ?: (7 * 60 + (slotNum - 1) * 180) // フォールバック: 7:00から3時間間隔
        }
        if (hasWorkout) {
            timeMap["workout"] = trainingTimeMinutes ?: (18 * 60)
        }

        orderedKeys.forEach { slotKey ->
            val slot = customQuest.slots[slotKey] ?: return@forEach
            val timeMinutes = timeMap[slotKey] ?: (12 * 60)
            val isSlotExecuted = customQuest.executedItems[slotKey]?.isNotEmpty() == true
            val status = if (isSlotExecuted) {
                TimelineItemStatus.COMPLETED
            } else if (timeMinutes < currentTimeMinutes) {
                TimelineItemStatus.CURRENT
            } else if (timeMinutes - currentTimeMinutes < 60) {
                TimelineItemStatus.CURRENT
            } else {
                TimelineItemStatus.UPCOMING
            }

            val subtitle = if (slot.type == CustomQuestSlotType.MEAL) {
                val lines = slot.items.map { "・${it.foodName} ${it.amount.toInt()}${it.unit}" }
                val macros = slot.totalMacros
                val macroLine = if (macros != null) {
                    "P${macros.protein.toInt()}g F${macros.fat.toInt()}g C${macros.carbs.toInt()}g"
                } else null
                (lines + listOfNotNull(macroLine)).joinToString("\n")
            } else {
                slot.items.joinToString("\n") { item ->
                    val parts = mutableListOf<String>()
                    item.sets?.let { if (it > 0) parts.add("${it}セット") }
                    item.reps?.let { if (it > 0) parts.add("${it}回/セット") }
                    // 1RM%指定がある場合: "1RM70-80%（84-96kg）" or "1RM70-80%"
                    val rmMin = item.rmPercentMin
                    val rmMax = item.rmPercentMax
                    val hasRmPercent = rmMin != null || rmMax != null
                    if (hasRmPercent) {
                        val percentStr = when {
                            rmMin != null && rmMax != null ->
                                "1RM${rmMin.toInt()}-${rmMax.toInt()}%"
                            rmMin != null ->
                                "1RM${rmMin.toInt()}%"
                            else ->
                                "1RM${rmMax!!.toInt()}%"
                        }
                        // RM記録があれば実際の重量を計算して表示
                        val rmRecord = rmRecordCache[item.foodName]
                        if (rmRecord != null) {
                            val minKg = rmMin?.let { (rmRecord.weight * it / 100f).toInt() }
                            val maxKg = rmMax?.let { (rmRecord.weight * it / 100f).toInt() }
                            val kgStr = when {
                                minKg != null && maxKg != null -> "（${minKg}-${maxKg}kg）"
                                minKg != null -> "（${minKg}kg）"
                                maxKg != null -> "（${maxKg}kg）"
                                else -> ""
                            }
                            parts.add("$percentStr$kgStr")
                        } else {
                            parts.add(percentStr)
                        }
                    } else {
                        item.weight?.let { if (it > 0) parts.add("${it.toInt()}kg") }
                    }
                    item.duration?.let { if (it > 0) parts.add("${it}分") }
                    item.distance?.let { if (it > 0) parts.add("${it}km") }
                    if (parts.isNotEmpty()) {
                        "・${item.foodName} ${parts.joinToString("×")}"
                    } else {
                        "・${item.foodName} ${item.amount.toInt()}${item.unit}"
                    }
                }
            }

            val type = if (slot.type == CustomQuestSlotType.WORKOUT) {
                TimelineItemType.WORKOUT
            } else {
                TimelineItemType.MEAL
            }

            items.add(UnifiedTimelineItem(
                id = "custom_${slotKey}",
                type = type,
                timeMinutes = timeMinutes,
                timeString = minutesToTimeString(timeMinutes),
                title = slot.title,
                subtitle = subtitle,
                status = status,
                isTrainingRelated = slot.type == CustomQuestSlotType.WORKOUT,
                isCustomQuest = true,
                customQuestSlotKey = slotKey,
                customQuestItems = slot.items
            ))
        }

        return items
    }

    /**
     * Directiveのmessageをパースしてタイムラインアイテムに変換
     */
    private fun parseDirectiveToTimelineItems(
        directive: Directive,
        currentTimeMinutes: Int,
        meals: List<Meal>,
        workouts: List<Workout>
    ): List<UnifiedTimelineItem> {
        val items = mutableListOf<UnifiedTimelineItem>()
        val lines = directive.message.split("\n").filter { it.isNotBlank() }

        // 食事パターン: 【食事N】HH:MM [ラベル] 内容
        val mealPattern = Regex("""【食事(\d+)】(\d{2}:\d{2})?\s*(\[[^\]]+\])?\s*(.*)""")
        // 運動パターン: 【運動】内容
        val workoutPattern = Regex("""【運動】(.*)""")
        // 睡眠パターン: 【睡眠】内容
        val sleepPattern = Regex("""【睡眠】(.*)""")

        var foundCurrentItem = false
        // 「・」で始まる行を直前の【運動】行に連結する前処理
        val mergedLines = mutableListOf<String>()
        for (line in lines) {
            if (line.trimStart().startsWith("・") && mergedLines.isNotEmpty()) {
                mergedLines[mergedLines.lastIndex] = mergedLines.last() + "\n" + line
            } else {
                mergedLines.add(line)
            }
        }

        mergedLines.forEach { line ->
            val mealMatch = mealPattern.find(line)
            val workoutMatch = workoutPattern.find(line)
            val sleepMatch = sleepPattern.find(line)

            when {
                mealMatch != null -> {
                    val slotNumber = mealMatch.groupValues[1].toIntOrNull() ?: 1
                    val timeStr = mealMatch.groupValues[2].takeIf { it.isNotBlank() }
                    val label = mealMatch.groupValues[3].takeIf { it.isNotBlank() }?.removeSurrounding("[", "]")
                    // contentから時刻パターンを削除（重複防止）
                    // マージされた「・」行も含めて全内容を取得
                    val fullContent = line.substringAfter("】").trim()
                    val rawContent = fullContent
                        .replace(Regex("^\\d{1,2}:\\d{2}\\s*"), "")  // 先頭の時刻を削除
                        .replace(Regex("\\[\\d{1,2}:\\d{2}\\]\\s*"), "")  // [HH:MM]形式を削除
                        .replace(Regex("^\\[[^\\]]+\\]\\s*"), "")  // [ラベル]を削除
                        .trim()
                    // カンマ区切り→箇条書き変換（既に・形式の場合はそのまま）
                    val content = if (rawContent.contains("・")) {
                        rawContent
                    } else if (rawContent.contains(", ")) {
                        rawContent.split(", ").joinToString("\n") { "・$it" }
                    } else {
                        rawContent
                    }

                    val defaultTime = 6 * 60 + slotNumber * 180
                    val timeMinutes = timeStr?.let { parseTimeToMinutes(it) ?: defaultTime } ?: defaultTime

                    // ステータス判定（executedItemsのみで判定、時刻ベースの自動マッチは無効）
                    val isCompleted = directive.executedItems.contains(slotNumber - 1)
                    val isNext = !isCompleted && !foundCurrentItem && timeMinutes >= currentTimeMinutes - 30

                    val status = when {
                        isCompleted -> TimelineItemStatus.COMPLETED
                        isNext -> {
                            foundCurrentItem = true
                            TimelineItemStatus.CURRENT
                        }
                        else -> TimelineItemStatus.UPCOMING
                    }

                    val title = if (label != null) "食事$slotNumber ($label)" else "食事$slotNumber"

                    items.add(UnifiedTimelineItem(
                        id = "directive_meal_$slotNumber",
                        type = TimelineItemType.MEAL,
                        timeMinutes = timeMinutes,
                        timeString = timeStr ?: minutesToTimeString(timeMinutes),
                        title = title,
                        subtitle = content,
                        status = status,
                        isTrainingRelated = label?.contains("トレ") == true,
                        actionItems = listOf(DirectiveActionItem.parse(slotNumber - 1, line))
                    ))
                }

                workoutMatch != null -> {
                    // マージされた「・」行も含めて全内容を取得
                    val content = line.substringAfter("【運動】").trim()
                    val trainingTime = _uiState.value.user?.profile?.trainingTime
                    val defaultWorkoutTime = 18 * 60
                    val timeMinutes = trainingTime?.let { parseTimeToMinutes(it) ?: defaultWorkoutTime } ?: defaultWorkoutTime

                    val isCompleted = workouts.isNotEmpty()
                    val isNext = !isCompleted && !foundCurrentItem && timeMinutes >= currentTimeMinutes - 30

                    val status = when {
                        isCompleted -> TimelineItemStatus.COMPLETED
                        isNext -> {
                            foundCurrentItem = true
                            TimelineItemStatus.CURRENT
                        }
                        else -> TimelineItemStatus.UPCOMING
                    }

                    items.add(UnifiedTimelineItem(
                        id = "directive_workout",
                        type = TimelineItemType.WORKOUT,
                        timeMinutes = timeMinutes,
                        timeString = trainingTime ?: minutesToTimeString(timeMinutes),
                        title = "トレーニング",
                        subtitle = content,
                        status = status,
                        isTrainingRelated = true,
                        linkedWorkout = workouts.firstOrNull()
                    ))
                }

                sleepMatch != null -> {
                    val content = sleepMatch.groupValues[1].trim()
                    val sleepTime = _uiState.value.user?.profile?.sleepTime
                    val defaultSleepTime = 23 * 60
                    val timeMinutes = sleepTime?.let { parseTimeToMinutes(it) ?: defaultSleepTime } ?: defaultSleepTime

                    items.add(UnifiedTimelineItem(
                        id = "directive_sleep",
                        type = TimelineItemType.CONDITION,
                        timeMinutes = timeMinutes,
                        timeString = sleepTime ?: minutesToTimeString(timeMinutes),
                        title = "睡眠",
                        subtitle = content,
                        status = if (timeMinutes < currentTimeMinutes) TimelineItemStatus.COMPLETED else TimelineItemStatus.UPCOMING
                    ))
                }
            }
        }

        return items
    }

    /**
     * スロット番号に対応する指示書アイテムを取得
     */
    private fun getDirectiveItemsForSlot(directive: Directive?, slotNumber: Int): List<DirectiveActionItem>? {
        if (directive == null) return null
        val actionItems = directive.getActionItems()
        // スロット番号に対応するアイテムを探す（【食事N】のNでマッチ）
        return actionItems.filter { item ->
            item.originalText.contains("【食事$slotNumber】") ||
            item.originalText.contains("【食事${slotNumber}】")
        }.takeIf { it.isNotEmpty() }
    }

    /**
     * タイムスタンプを分数（0:00からの分数）に変換
     */
    private fun timestampToMinutes(timestamp: Long): Int {
        val calendar = java.util.Calendar.getInstance()
        calendar.timeInMillis = timestamp
        return calendar.get(java.util.Calendar.HOUR_OF_DAY) * 60 +
               calendar.get(java.util.Calendar.MINUTE)
    }

    /**
     * 分数を時刻文字列に変換
     */
    private fun minutesToTimeString(minutes: Int): String {
        val hours = minutes / 60
        val mins = minutes % 60
        return "%02d:%02d".format(hours, mins)
    }

    /**
     * Micro+インジケーターを構築
     */
    private fun buildMicroIndicators(
        averageDiaas: Float,
        fattyAcidScore: Int,
        fiberScore: Int,
        vitaminScores: Map<String, Float>,
        mineralScores: Map<String, Float>
    ): List<MicroIndicator> {
        // DIAAS
        val diaasStatus = when {
            averageDiaas >= 1.0f -> IndicatorStatus.GOOD
            averageDiaas >= 0.75f -> IndicatorStatus.WARNING
            else -> IndicatorStatus.ALERT
        }

        // 脂肪酸（スコア5段階を3段階に変換）
        val fattyAcidStatus = when {
            fattyAcidScore >= 4 -> IndicatorStatus.GOOD
            fattyAcidScore >= 3 -> IndicatorStatus.WARNING
            else -> IndicatorStatus.ALERT
        }

        // 食物繊維
        val fiberStatus = when {
            fiberScore >= 4 -> IndicatorStatus.GOOD
            fiberScore >= 3 -> IndicatorStatus.WARNING
            else -> IndicatorStatus.ALERT
        }

        // ビタミン・ミネラル（平均充足率）
        val vitaminAvg = if (vitaminScores.isNotEmpty())
            vitaminScores.values.average().toFloat() else 0f
        val mineralAvg = if (mineralScores.isNotEmpty())
            mineralScores.values.average().toFloat() else 0f
        val vitMinAvg = (vitaminAvg + mineralAvg) / 2f

        val vitMinStatus = when {
            vitMinAvg >= 0.8f -> IndicatorStatus.GOOD
            vitMinAvg >= 0.5f -> IndicatorStatus.WARNING
            else -> IndicatorStatus.ALERT
        }

        return listOf(
            MicroIndicator(
                type = MicroIndicatorType.DIAAS,
                score = averageDiaas,
                status = diaasStatus,
                label = "%.2f".format(averageDiaas)
            ),
            MicroIndicator(
                type = MicroIndicatorType.FATTY_ACID,
                score = fattyAcidScore / 5f,
                status = fattyAcidStatus,
                label = when (fattyAcidStatus) {
                    IndicatorStatus.GOOD -> "✓"
                    IndicatorStatus.WARNING -> "!"
                    IndicatorStatus.ALERT -> "×"
                }
            ),
            MicroIndicator(
                type = MicroIndicatorType.FIBER,
                score = fiberScore / 5f,
                status = fiberStatus,
                label = when (fiberStatus) {
                    IndicatorStatus.GOOD -> "✓"
                    IndicatorStatus.WARNING -> "!"
                    IndicatorStatus.ALERT -> "×"
                }
            ),
            MicroIndicator(
                type = MicroIndicatorType.VITAMIN_MINERAL,
                score = vitMinAvg,
                status = vitMinStatus,
                label = "${(vitMinAvg * 100).toInt()}%"
            )
        )
    }
}

/**
 * 栄養素目標
 */
private data class NutritionTargets(
    val calories: Int,
    val protein: Float,
    val carbs: Float,
    val fat: Float
)

/**
 * タイムライン計算結果
 */
private data class TimelineInfo(
    val slots: List<TimelineSlotInfo> = emptyList(),
    val nextMealSlot: TimelineSlotInfo? = null,
    val timeUntilNextMeal: Int = 0,
    val currentTimeMinutes: Int = 0,
    val trainingTimeMinutes: Int? = null,
    val hasTimelineConfig: Boolean = false
)
