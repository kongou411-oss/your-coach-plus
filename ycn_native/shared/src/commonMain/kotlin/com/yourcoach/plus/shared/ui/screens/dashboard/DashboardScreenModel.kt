package com.yourcoach.plus.shared.ui.screens.dashboard

import kotlin.math.roundToInt
import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
import com.yourcoach.plus.shared.data.database.BodymakingFoodDatabase
import com.yourcoach.plus.shared.data.database.FoodDatabase
import com.yourcoach.plus.shared.data.database.FoodItem
import com.yourcoach.plus.shared.domain.model.*
import com.yourcoach.plus.shared.domain.repository.*
import com.yourcoach.plus.shared.domain.usecase.NutritionCalculator
import com.yourcoach.plus.shared.domain.usecase.WorkoutQuestGenerator
import com.yourcoach.plus.shared.util.DateUtil
import com.yourcoach.plus.shared.util.MetCalorieCalculator
import com.yourcoach.plus.shared.util.invokeCloudFunction
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.datetime.Clock
import kotlinx.datetime.Instant
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime

/**
 * ダッシュボード画面の状態（Android版と同等の完全版）
 */
data class DashboardUiState(
    val isLoading: Boolean = true,
    val error: String? = null,
    val successMessage: String? = null,
    val date: String = DateUtil.todayString(),
    val dateDisplay: String = DateUtil.formatDateForDisplay(DateUtil.todayString()),
    val isToday: Boolean = true,
    val user: User? = null,
    val meals: List<Meal> = emptyList(),
    val workouts: List<Workout> = emptyList(),

    // 栄養サマリー
    val totalCalories: Int = 0,
    val targetCalories: Int = 2500,
    val totalProtein: Float = 0f,
    val targetProtein: Float = 180f,
    val totalFat: Float = 0f,
    val targetFat: Float = 80f,
    val totalCarbs: Float = 0f,
    val targetCarbs: Float = 300f,

    // 運動サマリー
    val totalWorkoutDuration: Int = 0,
    val totalCaloriesBurned: Int = 0,
    val workoutCount: Int = 0,

    // 詳細栄養素
    val averageDiaas: Float = 0f,
    val saturatedFat: Float = 0f,
    val mediumChainFat: Float = 0f,
    val monounsaturatedFat: Float = 0f,
    val polyunsaturatedFat: Float = 0f,
    val fattyAcidScore: Int = 0,
    val fattyAcidRating: String = "-",
    val fattyAcidLabel: String = "-",
    val vitaminScores: Map<String, Float> = emptyMap(),
    val mineralScores: Map<String, Float> = emptyMap(),

    // GL管理・血糖管理
    val totalGL: Float = 0f,
    val glLimit: Float = 120f,
    val glScore: Int = 0,
    val glLabel: String = "-",
    val adjustedGL: Float = 0f,
    val bloodSugarRating: String = "-",
    val bloodSugarLabel: String = "-",
    val highGIPercent: Float = 0f,
    val lowGIPercent: Float = 0f,
    val glModifiers: List<Pair<String, Float>> = emptyList(),
    val mealsPerDay: Int = 5,
    val mealGLLimit: Float = 24f,
    val mealAbsoluteGLLimit: Float = 40f,

    // 食物繊維
    val totalFiber: Float = 0f,
    val totalSolubleFiber: Float = 0f,
    val totalInsolubleFiber: Float = 0f,
    val fiberTarget: Float = 25f,
    val carbFiberRatio: Float = 0f,
    val fiberScore: Int = 0,
    val fiberRating: String = "-",
    val fiberLabel: String = "-",

    // コンディション
    val condition: Condition? = null,

    // スコア・ストリーク
    val score: DailyScore? = null,
    val streakInfo: StreakInfo = StreakInfo(),

    // ルーティン
    val todayRoutine: RoutineDay? = null,
    val isManualRestDay: Boolean = false,
    val isExecutingRoutine: Boolean = false,
    val routineSuccessMessage: String? = null,

    // タイムライン
    val unifiedTimeline: List<UnifiedTimelineItem> = emptyList(),
    val microIndicators: List<MicroIndicator> = emptyList(),
    val currentTimeMinutes: Int = 0,
    val timelineSlots: List<TimelineSlotInfo> = emptyList(),
    val nextMealSlot: TimelineSlotInfo? = null,
    val timeUntilNextMeal: Int = 0,
    val trainingTimeMinutes: Int? = null,
    val hasTimelineConfig: Boolean = false,
    val showMicroDetailSheet: Boolean = false,

    // ダイアログ状態
    val editingMeal: Meal? = null,
    val showMealEditDialog: Boolean = false,
    val editingWorkout: Workout? = null,
    val showWorkoutEditDialog: Boolean = false,

    // クエスト（指示書）
    val directive: Directive? = null,
    val customQuest: CustomQuest? = null,
    val isGeneratingQuest: Boolean = false,
    val isExecutingDirectiveItem: Boolean = false,
    val questGenerationError: String? = null,
    val showDirectiveEditDialog: Boolean = false,
    val showQuestSettingsDialog: Boolean = false,
    val questDetailItem: UnifiedTimelineItem? = null, // クエスト項目詳細表示用
    val executedDirectiveItems: Set<Int> = emptySet(),
    val editedDirectiveTexts: Map<Int, String> = emptyMap(),

    // ピンポイントカロリー調整
    val calorieOverride: CalorieOverride? = null,
    val showCalorieOverrideDialog: Boolean = false,

    // RM記録
    val latestRmRecords: Map<String, RmRecord> = emptyMap(),
    val editingRmRecord: RmRecord? = null,
    val showRmEditDialog: Boolean = false,
    val showRmAddDialog: Boolean = false,

    // 運動クエスト完了シート
    val showWorkoutCompletionSheet: Boolean = false,
    val workoutCompletionItem: UnifiedTimelineItem? = null,
    val workoutCompletionExercises: List<WorkoutCompletionExercise> = emptyList(),

    // お祝いモーダル
    val celebrationQueue: List<CelebrationInfo> = emptyList(),
    val currentCelebration: CelebrationInfo? = null
)

/**
 * ダッシュボード画面のScreenModel (Voyager)
 * Android版DashboardViewModelの機能をKMPに移植
 */
class DashboardScreenModel(
    private val authRepository: AuthRepository,
    private val userRepository: UserRepository,
    private val mealRepository: MealRepository,
    private val workoutRepository: WorkoutRepository,
    private val conditionRepository: ConditionRepository? = null,
    private val routineRepository: RoutineRepository? = null,
    private val scoreRepository: ScoreRepository? = null,
    private val directiveRepository: DirectiveRepository? = null,
    private val customQuestRepository: CustomQuestRepository? = null,
    private val badgeRepository: BadgeRepository? = null,
    private val rmRepository: RmRepository? = null
) : ScreenModel {

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    // iOS対応: コルーチン例外ハンドラー（NULLクラッシュ防止）
    private val exceptionHandler = CoroutineExceptionHandler { _, throwable ->
        println("DashboardScreenModel: Coroutine exception: ${throwable.message}")
        _uiState.update { it.copy(isLoading = false, error = "エラーが発生しました") }
    }

    // RM記録キャッシュ（種目名→最新RM記録）
    private var rmRecordCache: Map<String, RmRecord> = emptyMap()

    // ログインボーナス重複呼び出し防止
    private var loginBonusChecked = false

    // 所属名チェック重複呼び出し防止
    private var organizationChecked = false

    init {
        observeUser()
        updateCurrentTime()
    }

    /**
     * 現在時刻を更新
     */
    private fun updateCurrentTime() {
        val now = Clock.System.now()
        val localDateTime = now.toLocalDateTime(TimeZone.currentSystemDefault())
        val minutes = localDateTime.hour * 60 + localDateTime.minute
        _uiState.update { it.copy(currentTimeMinutes = minutes) }
    }

    /**
     * ユーザー情報を監視
     * collectLatest + filterNotNull により、Auth状態が一時的にnilになった後
     * 回復した際にFirestoreリスナーを自動再確立する
     */
    private fun observeUser() {
        screenModelScope.launch(exceptionHandler) {
            authRepository.currentUser
                .filterNotNull()
                .collectLatest { authUser ->
                    // データ読み込み（Auth回復時にも再実行して壊れたデータをリロード）
                    loadDataForDate(_uiState.value.date)

                    // ログインボーナスは一度だけ（Cloud Functionは冪等だが呼び出しコスト削減）
                    if (!loginBonusChecked) {
                        loginBonusChecked = true
                        checkLoginBonus()
                    }

                    // 所属名の有効性チェック（一度だけ）
                    if (!organizationChecked) {
                        organizationChecked = true
                        checkOrganizationStatus()
                    }

                    // Firestoreリスナーを開始
                    // collectLatestにより、Auth状態変化→回復時に自動キャンセル＆再確立
                    try {
                        userRepository.observeUser(authUser.uid).collect { user ->
                            val targets = calculateTargets(
                                user,
                                _uiState.value.todayRoutine,
                                _uiState.value.isManualRestDay
                            )
                            _uiState.update { state ->
                                state.copy(
                                    user = user,
                                    targetCalories = targets.calories,
                                    targetProtein = targets.protein,
                                    targetFat = targets.fat,
                                    targetCarbs = targets.carbs
                                )
                            }
                        }
                    } catch (e: Throwable) {
                        println("DashboardScreenModel: observeUser Firestore error: ${e::class.simpleName}: ${e.message}")
                        // Auth回復時にcollectLatestが自動で再起動するためリトライ不要
                    }
                }
        }
    }

    /**
     * 指定日のデータを読み込む（Android版loadDashboardDataと同等の完全版）
     */
    fun loadDataForDate(date: String) {
        _uiState.update { it.copy(isLoading = true, error = null) }

        screenModelScope.launch(exceptionHandler) {
            try {
                loadDataForDateInternal(date)
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

    private suspend fun loadDataForDateInternal(date: String) {
            val userId = authRepository.getCurrentUserId()
            if (userId == null) {
                _uiState.update { it.copy(isLoading = false, error = "ログインしていません") }
                return
            }

                // データを並列取得（Android版と同等の全データ取得）
                coroutineScope {
                    val userDeferred = async {
                        userRepository.getUser(userId).getOrNull()
                    }
                    val mealsDeferred = async {
                        mealRepository.getMealsForDate(userId, date).getOrDefault(emptyList())
                    }
                    val workoutsDeferred = async {
                        workoutRepository.getWorkoutsForDate(userId, date).getOrDefault(emptyList())
                    }
                    val conditionDeferred = async {
                        conditionRepository?.getCondition(userId, date)?.getOrNull()
                    }
                    val routineDeferred = async {
                        routineRepository?.getRoutineForDate(userId, date)?.getOrNull()
                    }
                    val directiveDeferred = async {
                        directiveRepository?.getDirective(userId, date)?.getOrNull()
                    }
                    val customQuestDeferred = async {
                        customQuestRepository?.getCustomQuest(userId, date)?.getOrNull()
                    }
                    val scoreDeferred = async {
                        scoreRepository?.getScoreForDate(userId, date)?.getOrNull()
                    }
                    val streakDeferred = async {
                        scoreRepository?.getStreakInfo(userId)?.getOrDefault(StreakInfo()) ?: StreakInfo()
                    }
                    val calorieOverrideDeferred = async {
                        scoreRepository?.getCalorieOverride(userId, date)?.getOrNull()
                    }
                    val restDayDeferred = async {
                        scoreRepository?.getRestDayStatus(userId, date)?.getOrDefault(false) ?: false
                    }

                    val user = userDeferred.await()
                    val meals = mealsDeferred.await()
                    val workouts = workoutsDeferred.await()
                    val condition = conditionDeferred.await()
                    val todayRoutine = routineDeferred.await()
                    val directive = directiveDeferred.await()
                    val customQuest = customQuestDeferred.await()
                    val score = scoreDeferred.await()
                    val streakInfo = streakDeferred.await()
                    val calorieOverride = calorieOverrideDeferred.await()
                    val isManualRestDay = restDayDeferred.await()

                    // RM記録を読み込み
                    rmRepository?.getLatestRmByExercise(userId)?.onSuccess { records ->
                        rmRecordCache = records
                        _uiState.update { it.copy(latestRmRecords = records) }
                    }

                    // TDEEと目標PFCを計算
                    val (targetCalories, targetProtein, targetCarbs, targetFat) = calculateTargets(user, todayRoutine, isManualRestDay)

                    // 栄養素を計算
                    val totalCalories = meals.sumOf { it.totalCalories }
                    val totalProtein = meals.sumOf { it.totalProtein.roundToInt() }.toFloat()
                    val totalFat = meals.sumOf { it.totalFat.roundToInt() }.toFloat()
                    val totalCarbs = meals.sumOf { it.totalCarbs.roundToInt() }.toFloat()
                    val totalFiber = meals.sumOf { it.totalFiber.toDouble() }.toFloat()
                    val totalGL = meals.sumOf { it.totalGL.toDouble() }.toFloat()

                    // 詳細栄養素を計算
                    val detailedNutrition = calculateDetailedNutrition(meals)

                    // Microインジケーターを生成
                    val microIndicators = buildMicroIndicators(
                        averageDiaas = detailedNutrition.averageDiaas,
                        fattyAcidScore = detailedNutrition.fattyAcidScore,
                        fiberScore = detailedNutrition.fiberScore,
                        vitaminScores = detailedNutrition.vitaminScores,
                        mineralScores = detailedNutrition.mineralScores
                    )

                    // 統合タイムラインを構築
                    val unifiedTimeline = buildUnifiedTimeline(
                        meals = meals,
                        workouts = workouts,
                        currentTimeMinutes = _uiState.value.currentTimeMinutes,
                        directive = directive
                    )

                    _uiState.update { state ->
                        state.copy(
                            isLoading = false,
                            date = date,
                            dateDisplay = DateUtil.formatDateForDisplay(date),
                            isToday = DateUtil.isToday(date),
                            user = user,
                            meals = meals,
                            workouts = workouts,
                            condition = condition,
                            todayRoutine = todayRoutine,
                            score = score,
                            streakInfo = streakInfo,
                            customQuest = customQuest,
                            calorieOverride = calorieOverride,
                            isManualRestDay = isManualRestDay,
                            targetCalories = targetCalories,
                            targetProtein = targetProtein.toFloat(),
                            targetCarbs = targetCarbs.toFloat(),
                            targetFat = targetFat.toFloat(),
                            totalCalories = totalCalories,
                            totalProtein = totalProtein,
                            totalFat = totalFat,
                            totalCarbs = totalCarbs,
                            totalWorkoutDuration = workouts.sumOf { it.totalDuration },
                            totalCaloriesBurned = workouts.sumOf { it.totalCaloriesBurned },
                            workoutCount = workouts.size,
                            executedDirectiveItems = directive?.executedItems?.toSet() ?: emptySet(),
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
                            fiberTarget = detailedNutrition.fiberTarget,
                            carbFiberRatio = detailedNutrition.carbFiberRatio,
                            fiberScore = detailedNutrition.fiberScore,
                            fiberRating = detailedNutrition.fiberRating,
                            fiberLabel = detailedNutrition.fiberLabel,
                            microIndicators = microIndicators,
                            unifiedTimeline = unifiedTimeline,
                            directive = directive
                        )
                    }

                    // 今日のクエストが未生成なら自動生成チェック
                    // ※ coroutineScope内で実行（下のobserve collectは永遠に完了しないため、外に置くと到達不能）
                    checkAndAutoGenerateQuest()

                    // リアルタイム監視を開始
                    launch {
                        mealRepository.observeMealsForDate(userId, date).collect { meals ->
                            updateNutritionFromMeals(meals)
                        }
                    }

                    launch {
                        workoutRepository.observeWorkoutsForDate(userId, date).collect { workouts ->
                            updateWorkoutSummary(workouts)
                        }
                    }
                }
    }

    /**
     * 詳細栄養素を計算（NutritionCalculator使用）
     */
    private fun calculateDetailedNutrition(meals: List<Meal>): DetailedNutrition {
        val profile = _uiState.value.user?.profile
        val isBodymaker = true  // 全ユーザー共通でボディメイカーモード
        val weight = profile?.weight ?: 70f
        val bodyFatPercentage = profile?.bodyFatPercentage ?: 20f
        val lbm = weight * (1 - bodyFatPercentage / 100f)
        val mealsPerDay = profile?.mealsPerDay ?: 5

        return NutritionCalculator.calculate(
            meals = meals,
            isBodymaker = isBodymaker,
            lbm = lbm,
            mealsPerDay = mealsPerDay,
            goal = profile?.goal
        )
    }

    /**
     * Microインジケーターを構築
     */
    private fun buildMicroIndicators(
        averageDiaas: Float,
        fattyAcidScore: Int,
        fiberScore: Int,
        vitaminScores: Map<String, Float>,
        mineralScores: Map<String, Float>
    ): List<MicroIndicator> {
        val indicators = mutableListOf<MicroIndicator>()

        // DIAAS
        val diaasStatus = when {
            averageDiaas >= 1.0f -> IndicatorStatus.GOOD
            averageDiaas >= 0.75f -> IndicatorStatus.WARNING
            else -> IndicatorStatus.ALERT
        }
        indicators.add(MicroIndicator(
            type = MicroIndicatorType.DIAAS,
            score = averageDiaas,
            status = diaasStatus,
            label = ((averageDiaas * 100).toInt() / 100.0).toString()
        ))

        // 脂肪酸
        val faStatus = when {
            fattyAcidScore >= 4 -> IndicatorStatus.GOOD
            fattyAcidScore >= 3 -> IndicatorStatus.WARNING
            else -> IndicatorStatus.ALERT
        }
        indicators.add(MicroIndicator(
            type = MicroIndicatorType.FATTY_ACID,
            score = fattyAcidScore / 5f,
            status = faStatus,
            label = "$fattyAcidScore/5"
        ))

        // 食物繊維
        val fiberStatus = when {
            fiberScore >= 4 -> IndicatorStatus.GOOD
            fiberScore >= 3 -> IndicatorStatus.WARNING
            else -> IndicatorStatus.ALERT
        }
        indicators.add(MicroIndicator(
            type = MicroIndicatorType.FIBER,
            score = fiberScore / 5f,
            status = fiberStatus,
            label = "$fiberScore/5"
        ))

        // ビタミン・ミネラル
        val avgVitamin = if (vitaminScores.isNotEmpty()) vitaminScores.values.average().toFloat() else 0f
        val avgMineral = if (mineralScores.isNotEmpty()) mineralScores.values.average().toFloat() else 0f
        val avgVM = (avgVitamin + avgMineral) / 2
        val vmStatus = when {
            avgVM >= 0.8f -> IndicatorStatus.GOOD
            avgVM >= 0.5f -> IndicatorStatus.WARNING
            else -> IndicatorStatus.ALERT
        }
        indicators.add(MicroIndicator(
            type = MicroIndicatorType.VITAMIN_MINERAL,
            score = avgVM,
            status = vmStatus,
            label = "${(avgVM * 100).toInt()}%"
        ))

        return indicators
    }

    /**
     * 統合タイムラインを構築（Android版 buildUnifiedTimeline + parseDirectiveToTimelineItems 相当）
     * ユーザー設定（起床/就寝/トレーニング時間、食事回数）を反映
     */
    private fun buildUnifiedTimeline(
        meals: List<Meal>,
        workouts: List<Workout>,
        currentTimeMinutes: Int,
        directive: Directive? = null
    ): List<UnifiedTimelineItem> {
        val items = mutableListOf<UnifiedTimelineItem>()
        val profile = _uiState.value.user?.profile
        val todayRoutine = _uiState.value.todayRoutine
        val isRestDay = _uiState.value.isManualRestDay || (todayRoutine?.isRestDay == true)

        // ユーザー設定から時刻を取得
        val wakeUpMinutes = profile?.wakeUpTime?.let { parseTimeStringToMinutes(it) }
        val sleepMinutes = profile?.sleepTime?.let { parseTimeStringToMinutes(it) }
        val trainingTimeStr = profile?.trainingTime ?: "17:00"
        val trainingMinutes = if (isRestDay) null else parseTimeStringToMinutes(trainingTimeStr)
        val mealsPerDay = profile?.mealsPerDay ?: 5
        val trainingAfterMeal = if (isRestDay || trainingMinutes == null) null else (profile?.trainingAfterMeal ?: 3)

        // Directiveがある場合のみタイムラインを構築（未生成時は空）
        if (directive != null && directive.message.isNotBlank()) {
            val directiveItems = parseDirectiveToTimelineItems(
                directive = directive,
                currentTimeMinutes = currentTimeMinutes,
                meals = meals,
                workouts = workouts,
                trainingMinutes = trainingMinutes,
                sleepMinutes = sleepMinutes
            )
            items.addAll(directiveItems)
        }

        // 実際の食事記録をマージ（時刻±30分で既存スロットとマッチ）
        meals.forEach { meal ->
            val mealTime = extractTimeFromTimestamp(meal.timestamp)
            val existingItem = items.find {
                it.type == TimelineItemType.MEAL &&
                    kotlin.math.abs(it.timeMinutes - mealTime) < 30 &&
                    it.linkedMeal == null
            }
            if (existingItem != null) {
                val index = items.indexOf(existingItem)
                items[index] = existingItem.copy(
                    status = TimelineItemStatus.COMPLETED,
                    linkedMeal = meal,
                    subtitle = "${meal.totalCalories}kcal | P${meal.totalProtein.roundToInt()} F${meal.totalFat.roundToInt()} C${meal.totalCarbs.roundToInt()}"
                )
            } else {
                items.add(UnifiedTimelineItem(
                    id = "meal_${meal.id}",
                    type = TimelineItemType.MEAL,
                    timeMinutes = mealTime,
                    timeString = formatTimeMinutes(mealTime),
                    title = meal.name ?: getMealTypeName(meal.type),
                    subtitle = "${meal.totalCalories}kcal | P${meal.totalProtein.roundToInt()} F${meal.totalFat.roundToInt()} C${meal.totalCarbs.roundToInt()}",
                    status = TimelineItemStatus.COMPLETED,
                    linkedMeal = meal
                ))
            }
        }

        // 実際の運動記録をマージ
        workouts.forEach { workout ->
            val workoutTime = extractTimeFromTimestamp(workout.timestamp)
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
            } else if (trainingMinutes == null || kotlin.math.abs(workoutTime - trainingMinutes) > 30) {
                items.add(UnifiedTimelineItem(
                    id = "workout_${workout.id}",
                    type = TimelineItemType.WORKOUT,
                    timeMinutes = workoutTime,
                    timeString = formatTimeMinutes(workoutTime),
                    title = workout.name ?: getWorkoutTypeName(workout.type),
                    subtitle = "${workout.totalCaloriesBurned}kcal",
                    status = TimelineItemStatus.COMPLETED,
                    linkedWorkout = workout
                ))
            }
        }

        // 時刻順にソート + 重複排除
        return items.distinctBy { it.id }.sortedBy { it.timeMinutes }
    }

    /**
     * Directive（指示書）テキストからタイムラインアイテムをパース
     * Android版 parseDirectiveToTimelineItems 相当
     */
    private fun parseDirectiveToTimelineItems(
        directive: Directive,
        currentTimeMinutes: Int,
        meals: List<Meal>,
        workouts: List<Workout>,
        trainingMinutes: Int?,
        sleepMinutes: Int?
    ): List<UnifiedTimelineItem> {
        val items = mutableListOf<UnifiedTimelineItem>()
        // getMessageLines()と同じ処理で、executedItemsのインデックスと整合させる
        val lines = directive.getMessageLines()

        val mealPattern = Regex("""【食事(\d+)】(\d{2}:\d{2})?\s*(\[[^\]]+\])?\s*(.*)""")
        val workoutPattern = Regex("""【運動】(.*)""")
        val sleepPattern = Regex("""【睡眠】(.*)""")

        var foundCurrentItem = false

        // 運動種目行（・で始まる）を事前に【運動】行に紐づけ
        val workoutExerciseLines = mutableListOf<String>()
        var foundWorkoutLine = false
        for (l in lines) {
            if (workoutPattern.containsMatchIn(l)) {
                foundWorkoutLine = true
            } else if (foundWorkoutLine && l.trimStart().startsWith("\u30FB")) {
                // ・で始まる行を収集（プレフィックス保持）
                workoutExerciseLines.add(l.trimStart())
            } else if (foundWorkoutLine && !l.trimStart().startsWith("\u30FB")) {
                foundWorkoutLine = false
            }
        }

        lines.forEachIndexed { lineIndex, line ->
            val mealMatch = mealPattern.find(line)
            val workoutMatch = workoutPattern.find(line)
            val sleepMatch = sleepPattern.find(line)

            when {
                mealMatch != null -> {
                    val slotNumber = mealMatch.groupValues[1].toIntOrNull() ?: 1
                    val timeStr = mealMatch.groupValues[2].takeIf { it.isNotBlank() }
                    val label = mealMatch.groupValues[3].takeIf { it.isNotBlank() }?.removeSurrounding("[", "]")
                    val content = mealMatch.groupValues[4].trim()
                        .replace(Regex("""^\d{1,2}:\d{2}\s*"""), "")
                        .replace(Regex("""\[\d{1,2}:\d{2}\]\s*"""), "")
                        .trim()

                    val defaultTime = 6 * 60 + slotNumber * 180
                    val timeMinutes = timeStr?.let { parseTimeStringToMinutes(it) ?: defaultTime } ?: defaultTime

                    // Android版と一致: executedItemsはslotNumber-1（0-indexed）で管理
                    val itemIndex = slotNumber - 1
                    val isCompleted = directive.executedItems.contains(itemIndex)
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
                    val isTrainingRelated = label?.contains("トレ") == true

                    items.add(UnifiedTimelineItem(
                        id = "directive_meal_$slotNumber",
                        type = TimelineItemType.MEAL,
                        timeMinutes = timeMinutes,
                        timeString = timeStr ?: MealSlot.minutesToTimeString(timeMinutes),
                        title = title,
                        subtitle = content.ifEmpty { null },
                        status = status,
                        isTrainingRelated = isTrainingRelated,
                        directiveItemIndex = itemIndex,
                        slotInfo = TimelineSlotInfo(
                            slotNumber = slotNumber,
                            displayName = title,
                            timeMinutes = timeMinutes,
                            timeString = timeStr ?: MealSlot.minutesToTimeString(timeMinutes),
                            isTrainingRelated = isTrainingRelated,
                            isCompleted = isCompleted
                        )
                    ))
                }

                workoutMatch != null -> {
                    val content = workoutMatch.groupValues[1].trim()
                    val defaultWorkoutTime = 18 * 60
                    val timeMinutes = trainingMinutes ?: defaultWorkoutTime

                    // 運動の完了: workouts存在 or executedItemsに含まれる
                    val isCompleted = workouts.isNotEmpty() || directive.executedItems.contains(lineIndex)
                    val isNext = !isCompleted && !foundCurrentItem && timeMinutes >= currentTimeMinutes - 30
                    val status = when {
                        isCompleted -> TimelineItemStatus.COMPLETED
                        isNext -> {
                            foundCurrentItem = true
                            TimelineItemStatus.CURRENT
                        }
                        else -> TimelineItemStatus.UPCOMING
                    }

                    // 運動サマリー + 種目詳細を結合
                    val fullContent = if (workoutExerciseLines.isNotEmpty()) {
                        (listOf(content) + workoutExerciseLines).filter { it.isNotEmpty() }.joinToString("\n")
                    } else {
                        content
                    }

                    items.add(UnifiedTimelineItem(
                        id = "directive_workout",
                        type = TimelineItemType.WORKOUT,
                        timeMinutes = timeMinutes,
                        timeString = MealSlot.minutesToTimeString(timeMinutes),
                        title = "トレーニング",
                        subtitle = fullContent.ifEmpty { null },
                        status = status,
                        isTrainingRelated = true,
                        directiveItemIndex = lineIndex,
                        linkedWorkout = workouts.firstOrNull()
                    ))
                }

                sleepMatch != null -> {
                    val content = sleepMatch.groupValues[1].trim()
                    val defaultSleepTime = 23 * 60
                    val timeMinutes = sleepMinutes ?: defaultSleepTime

                    // 睡眠の完了: executedItemsに含まれる or 時刻ベース
                    val isCompleted = directive.executedItems.contains(lineIndex) || timeMinutes < currentTimeMinutes
                    items.add(UnifiedTimelineItem(
                        id = "directive_sleep",
                        type = TimelineItemType.CONDITION,
                        timeMinutes = timeMinutes,
                        timeString = MealSlot.minutesToTimeString(timeMinutes),
                        title = "睡眠",
                        subtitle = content.ifEmpty { null },
                        status = if (isCompleted) TimelineItemStatus.COMPLETED else TimelineItemStatus.UPCOMING,
                        directiveItemIndex = lineIndex
                    ))
                }
            }
        }

        return items
    }

    private fun parseTimeStringToMinutes(time: String): Int? {
        val parts = time.split(":")
        if (parts.size != 2) return null
        val hours = parts[0].toIntOrNull() ?: return null
        val minutes = parts[1].toIntOrNull() ?: return null
        return hours * 60 + minutes
    }

    private fun extractTimeFromTimestamp(timestamp: Long): Int {
        val instant = Instant.fromEpochMilliseconds(timestamp)
        val localDateTime = instant.toLocalDateTime(TimeZone.currentSystemDefault())
        return localDateTime.hour * 60 + localDateTime.minute
    }

    private fun formatTimeMinutes(minutes: Int): String {
        val hours = minutes / 60
        val mins = minutes % 60
        return "${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}"
    }

    private fun getMealTypeName(type: MealType): String = when (type) {
        MealType.BREAKFAST -> "朝食"
        MealType.LUNCH -> "昼食"
        MealType.DINNER -> "夕食"
        MealType.SNACK -> "間食"
        MealType.SUPPLEMENT -> "サプリ"
    }

    private fun getWorkoutTypeName(type: WorkoutType): String = when (type) {
        WorkoutType.STRENGTH -> "筋トレ"
        WorkoutType.CARDIO -> "有酸素"
        WorkoutType.FLEXIBILITY -> "柔軟"
        WorkoutType.SPORTS -> "スポーツ"
        WorkoutType.DAILY_ACTIVITY -> "日常活動"
    }

    /**
     * 食事データから栄養サマリーを更新
     */
    private fun updateNutritionFromMeals(meals: List<Meal>) {
        val detailedNutrition = calculateDetailedNutrition(meals)
        val microIndicators = buildMicroIndicators(
            averageDiaas = detailedNutrition.averageDiaas,
            fattyAcidScore = detailedNutrition.fattyAcidScore,
            fiberScore = detailedNutrition.fiberScore,
            vitaminScores = detailedNutrition.vitaminScores,
            mineralScores = detailedNutrition.mineralScores
        )

        _uiState.update { state ->
            state.copy(
                meals = meals,
                totalCalories = meals.sumOf { it.totalCalories },
                totalProtein = meals.sumOf { it.totalProtein.roundToInt() }.toFloat(),
                totalFat = meals.sumOf { it.totalFat.roundToInt() }.toFloat(),
                totalCarbs = meals.sumOf { it.totalCarbs.roundToInt() }.toFloat(),
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
                fiberTarget = detailedNutrition.fiberTarget,
                carbFiberRatio = detailedNutrition.carbFiberRatio,
                fiberScore = detailedNutrition.fiberScore,
                fiberRating = detailedNutrition.fiberRating,
                fiberLabel = detailedNutrition.fiberLabel,
                microIndicators = microIndicators,
                unifiedTimeline = buildUnifiedTimeline(
                    meals = meals,
                    workouts = state.workouts,
                    currentTimeMinutes = state.currentTimeMinutes,
                    directive = state.directive
                )
            )
        }
    }

    /**
     * 運動データからサマリーを更新
     */
    private fun updateWorkoutSummary(workouts: List<Workout>) {
        _uiState.update { state ->
            state.copy(
                workouts = workouts,
                workoutCount = workouts.size,
                totalWorkoutDuration = workouts.sumOf { it.totalDuration },
                totalCaloriesBurned = workouts.sumOf { it.totalCaloriesBurned },
                unifiedTimeline = buildUnifiedTimeline(
                    meals = state.meals,
                    workouts = workouts,
                    currentTimeMinutes = state.currentTimeMinutes,
                    directive = state.directive
                )
            )
        }
    }

    // ========== 日付操作 ==========

    fun goToPreviousDay() {
        val previousDate = DateUtil.previousDay(_uiState.value.date)
        loadDataForDate(previousDate)
    }

    fun goToNextDay() {
        val nextDate = DateUtil.nextDay(_uiState.value.date)
        loadDataForDate(nextDate)
    }

    fun goToToday() {
        loadDataForDate(DateUtil.todayString())
    }

    // ========== コンディション ==========

    fun updateCondition(updatedCondition: Condition) {
        screenModelScope.launch(exceptionHandler) {
            conditionRepository?.saveCondition(updatedCondition)
                ?.onSuccess {
                    _uiState.update { it.copy(condition = updatedCondition) }
                }
                ?.onFailure { e ->
                    _uiState.update { it.copy(error = e.message) }
                }
        }
    }

    // ========== 食事操作 ==========

    fun showMealEditDialog(meal: Meal) {
        _uiState.update { it.copy(editingMeal = meal, showMealEditDialog = true) }
    }

    fun hideMealEditDialog() {
        _uiState.update { it.copy(editingMeal = null, showMealEditDialog = false) }
    }

    fun deleteMeal(meal: Meal) {
        screenModelScope.launch(exceptionHandler) {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            mealRepository.deleteMeal(userId, meal.id)
                .onSuccess {
                    _uiState.update { state ->
                        state.copy(
                            meals = state.meals.filter { it.id != meal.id },
                            successMessage = "食事を削除しました"
                        )
                    }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(error = e.message) }
                }
        }
    }

    fun saveMealAsTemplate(meal: Meal) {
        screenModelScope.launch(exceptionHandler) {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            val template = MealTemplate(
                id = "",
                userId = userId,
                name = meal.name ?: getMealTypeName(meal.type),
                items = meal.items,
                totalCalories = meal.totalCalories,
                totalProtein = meal.totalProtein,
                totalCarbs = meal.totalCarbs,
                totalFat = meal.totalFat,
                createdAt = Clock.System.now().toEpochMilliseconds()
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

    // ========== 運動操作 ==========

    fun showWorkoutEditDialog(workout: Workout) {
        _uiState.update { it.copy(editingWorkout = workout, showWorkoutEditDialog = true) }
    }

    fun hideWorkoutEditDialog() {
        _uiState.update { it.copy(editingWorkout = null, showWorkoutEditDialog = false) }
    }

    fun deleteWorkout(workout: Workout) {
        screenModelScope.launch(exceptionHandler) {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            workoutRepository.deleteWorkout(userId, workout.id)
                .onSuccess {
                    _uiState.update { state ->
                        state.copy(
                            workouts = state.workouts.filter { it.id != workout.id },
                            successMessage = "運動を削除しました"
                        )
                    }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(error = e.message) }
                }
        }
    }

    fun saveWorkoutAsTemplate(workout: Workout) {
        screenModelScope.launch(exceptionHandler) {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            val template = WorkoutTemplate(
                id = "",
                userId = userId,
                name = workout.name ?: getWorkoutTypeName(workout.type),
                type = workout.type,
                exercises = workout.exercises,
                estimatedDuration = workout.totalDuration,
                estimatedCalories = workout.totalCaloriesBurned,
                createdAt = Clock.System.now().toEpochMilliseconds()
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

    // ========== ルーティン ==========

    fun executeRoutineWorkouts() {
        screenModelScope.launch(exceptionHandler) {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            val todayRoutine = _uiState.value.todayRoutine ?: return@launch

            _uiState.update { it.copy(isExecutingRoutine = true) }

            routineRepository?.executeRoutineWorkouts(userId, _uiState.value.date, todayRoutine)
                ?.onSuccess { count ->
                    _uiState.update {
                        it.copy(
                            isExecutingRoutine = false,
                            successMessage = "${count}件の運動を記録しました"
                        )
                    }
                    loadDataForDate(_uiState.value.date)
                }
                ?.onFailure { e ->
                    _uiState.update {
                        it.copy(
                            isExecutingRoutine = false,
                            error = e.message
                        )
                    }
                }
        }
    }

    fun toggleRestDay(isRestDay: Boolean) {
        _uiState.update { it.copy(isManualRestDay = isRestDay) }
        // Firestoreへの保存
        screenModelScope.launch(exceptionHandler) {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            scoreRepository?.updateRestDayStatus(userId, _uiState.value.date, isRestDay)
        }
    }

    // ========== クエスト（指示書）操作 ==========

    /**
     * 指示書アイテムを実行（Android版executeDirectiveItemと同等）
     * 食事の場合: 食品を自動記録してマクロ/ミクロに反映
     * 運動の場合: 運動を自動記録
     * コンディションの場合: 完了マークのみ
     */
    fun executeDirectiveItem(item: DirectiveActionItem) {
        val timeMinutes = extractTimeFromDirective(item.originalText) ?: (12 * 60)
        executeDirectiveItemWithTime(item, timeMinutes)
    }

    /**
     * 時刻指定でDirectiveを実行
     */
    fun executeDirectiveItemWithTime(item: DirectiveActionItem, timeMinutes: Int) {
        val userId = authRepository.getCurrentUserId() ?: return

        screenModelScope.launch(exceptionHandler) {
            _uiState.update { it.copy(isExecutingDirectiveItem = true) }

            when (item.actionType) {
                DirectiveActionType.MEAL -> {
                    executeMealDirectiveWithTime(userId, item, timeMinutes)
                }
                DirectiveActionType.EXERCISE -> {
                    executeExerciseDirectiveWithTime(userId, item, timeMinutes)
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
     * 指示書アイテムのチェック解除（undo）
     * executedItemsから除去してFirestore更新のみ（Meal/Workout削除なし）
     */
    fun undoDirectiveItem(itemIndex: Int) {
        val directive = _uiState.value.directive ?: return
        val userId = authRepository.getCurrentUserId() ?: return

        screenModelScope.launch(exceptionHandler) {
            _uiState.update { it.copy(isExecutingDirectiveItem = true) }

            val currentExecuted = directive.executedItems.toMutableList()
            currentExecuted.remove(itemIndex)

            directiveRepository?.updateExecutedItems(userId, directive.date, currentExecuted)
                ?.onSuccess {
                    val mealPattern = Regex("""【食事(\d+)】""")
                    val totalMealSlots = directive.getMessageLines().count { mealPattern.containsMatchIn(it) }
                    val updatedDirective = directive.copy(
                        executedItems = currentExecuted,
                        completed = currentExecuted.size >= totalMealSlots
                    )
                    _uiState.update { state ->
                        state.copy(
                            directive = updatedDirective,
                            isExecutingDirectiveItem = false,
                            unifiedTimeline = buildUnifiedTimeline(
                                meals = state.meals,
                                workouts = state.workouts,
                                currentTimeMinutes = state.currentTimeMinutes,
                                directive = updatedDirective
                            )
                        )
                    }
                }
                ?.onFailure { e ->
                    _uiState.update {
                        it.copy(
                            isExecutingDirectiveItem = false,
                            error = e.message
                        )
                    }
                }
        }
    }

    /**
     * 後方互換: toggleDirectiveItem（チェック/チェック解除を自動判定）
     */
    fun toggleDirectiveItem(itemIndex: Int) {
        val directive = _uiState.value.directive ?: return
        if (directive.executedItems.contains(itemIndex)) {
            undoDirectiveItem(itemIndex)
        } else {
            val actionItems = directive.getActionItems()
            val item = actionItems.getOrNull(itemIndex) ?: return
            executeDirectiveItem(item)
        }
    }

    /**
     * 食事指示を実行（時刻指定版）
     * 1行に複数の食品がある場合は全て記録してMealを作成
     */
    private suspend fun executeMealDirectiveWithTime(userId: String, item: DirectiveActionItem, timeMinutes: Int) {
        val foodEntries = parseMultipleFoods(item.originalText)

        if (foodEntries.isEmpty()) {
            // フォールバック: 従来の単一食品処理
            val itemName = item.itemName ?: return
            val amount = item.amount ?: 100f
            val unit = item.unit ?: "g"
            val cleanedName = cleanFoodName(itemName)
            val foodData = searchFoodFlexible(cleanedName) ?: searchFoodFlexible(itemName)
            val mealItem = createMealItemFromFood(foodData, itemName, amount, unit)
            saveSingleFoodMealWithTime(userId, item, mealItem, foodData?.name ?: itemName, timeMinutes)
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
            createdAt = Clock.System.now().toEpochMilliseconds()
        )

        mealRepository.addMeal(meal)
            .onSuccess {
                markDirectiveItemExecuted(item)
                loadDataForDate(_uiState.value.date)
            }
            .onFailure { e ->
                _uiState.update { it.copy(error = "食事の記録に失敗しました: ${e.message}") }
            }
    }

    /**
     * 食事指示を実行（バッチ用：loadDataForDateを呼ばない）
     */
    private suspend fun executeMealDirectiveBatch(userId: String, item: DirectiveActionItem) {
        val timeMinutes = extractTimeFromDirective(item.originalText) ?: (12 * 60)
        val foodEntries = parseMultipleFoods(item.originalText)

        if (foodEntries.isEmpty()) {
            // フォールバック: 従来の単一食品処理
            val itemName = item.itemName ?: return
            val amount = item.amount ?: 100f
            val unit = item.unit ?: "g"
            val cleanedName = cleanFoodName(itemName)
            val foodData = searchFoodFlexible(cleanedName) ?: searchFoodFlexible(itemName)
            val mealItem = createMealItemFromFood(foodData, itemName, amount, unit)
            saveSingleFoodMealBatch(userId, item, mealItem, foodData?.name ?: itemName, timeMinutes)
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

        val selectedDate = _uiState.value.date
        val baseTimestamp = DateUtil.dateStringToTimestamp(selectedDate)
        val targetTimestamp = baseTimestamp + (timeMinutes * 60 * 1000L)

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
            createdAt = Clock.System.now().toEpochMilliseconds()
        )

        mealRepository.addMeal(meal)
            .onSuccess {
                markDirectiveItemExecuted(item)
            }
            .onFailure { e ->
                _uiState.update { it.copy(error = "食事の記録に失敗しました: ${e.message}") }
            }
    }

    /**
     * 単一食品の食事を保存してリロード（時刻指定版）
     */
    private suspend fun saveSingleFoodMealWithTime(
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
            createdAt = Clock.System.now().toEpochMilliseconds()
        )

        mealRepository.addMeal(meal)
            .onSuccess {
                markDirectiveItemExecuted(item)
                loadDataForDate(_uiState.value.date)
            }
            .onFailure { e ->
                _uiState.update { it.copy(error = "食事の記録に失敗しました: ${e.message}") }
            }
    }

    /**
     * 単一食品の食事を保存（バッチ用：loadDataForDateを呼ばない）
     */
    private suspend fun saveSingleFoodMealBatch(
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
            createdAt = Clock.System.now().toEpochMilliseconds()
        )

        mealRepository.addMeal(meal)
            .onSuccess {
                markDirectiveItemExecuted(item)
            }
            .onFailure { e ->
                _uiState.update { it.copy(error = "食事の記録に失敗しました: ${e.message}") }
            }
    }

    /**
     * 運動指示を実行（時刻指定版）
     */
    private suspend fun executeExerciseDirectiveWithTime(userId: String, item: DirectiveActionItem, timeMinutes: Int) {
        val exerciseName = item.itemName ?: return
        val amount = item.amount?.toInt() ?: 10
        val unit = item.unit ?: "回"

        val sets = if (unit == "セット") amount else 3
        val reps = if (unit == "回") amount else 10
        val splitType = _uiState.value.todayRoutine?.splitType
        val category = MetCalorieCalculator.inferExerciseCategory(exerciseName, splitType)
        val bodyWeight = _uiState.value.user?.profile?.weight ?: 70f
        val duration = MetCalorieCalculator.estimateStrengthDuration(category, sets, reps)
        val workoutType = MetCalorieCalculator.inferWorkoutType(category)

        // クエスト完了時はTrainingCalorieBonusベース（予測加算と一致させる）
        val profile = _uiState.value.user?.profile
        val lbm = bodyWeight * (1 - (profile?.bodyFatPercentage ?: 20f) / 100f)
        val calories = TrainingCalorieBonus.fromSplitType(splitType, false, lbm)

        val exercise = Exercise(
            name = exerciseName,
            category = category,
            sets = sets,
            reps = reps,
            caloriesBurned = calories
        )

        val selectedDate = _uiState.value.date
        val baseTimestamp = DateUtil.dateStringToTimestamp(selectedDate)
        val targetTimestamp = baseTimestamp + (timeMinutes * 60 * 1000L)

        val workout = Workout(
            id = "",
            userId = userId,
            name = "指示書: $exerciseName",
            type = workoutType,
            exercises = listOf(exercise),
            totalDuration = duration,
            totalCaloriesBurned = calories,
            intensity = WorkoutIntensity.MODERATE,
            timestamp = targetTimestamp,
            createdAt = Clock.System.now().toEpochMilliseconds()
        )

        workoutRepository.addWorkout(workout)
            .onSuccess {
                markDirectiveItemExecuted(item)
                loadDataForDate(_uiState.value.date)
            }
            .onFailure { e ->
                _uiState.update { it.copy(error = "運動の記録に失敗しました: ${e.message}") }
            }
    }

    /**
     * 運動指示を実行（バッチ用：loadDataForDateを呼ばない）
     */
    private suspend fun executeExerciseDirectiveBatch(userId: String, item: DirectiveActionItem) {
        val exerciseName = item.itemName ?: return
        val amount = item.amount?.toInt() ?: 10
        val unit = item.unit ?: "回"

        val sets = if (unit == "セット") amount else 3
        val reps = if (unit == "回") amount else 10
        val splitType = _uiState.value.todayRoutine?.splitType
        val category = MetCalorieCalculator.inferExerciseCategory(exerciseName, splitType)
        val bodyWeight = _uiState.value.user?.profile?.weight ?: 70f
        val duration = MetCalorieCalculator.estimateStrengthDuration(category, sets, reps)
        val workoutType = MetCalorieCalculator.inferWorkoutType(category)

        // クエスト完了時はTrainingCalorieBonusベース（予測加算と一致させる）
        val profile = _uiState.value.user?.profile
        val lbm = bodyWeight * (1 - (profile?.bodyFatPercentage ?: 20f) / 100f)
        val calories = TrainingCalorieBonus.fromSplitType(splitType, false, lbm)

        val exercise = Exercise(
            name = exerciseName,
            category = category,
            sets = sets,
            reps = reps,
            caloriesBurned = calories
        )

        val selectedDate = _uiState.value.date
        val targetTimestamp = DateUtil.dateStringToTimestamp(selectedDate) + 12 * 60 * 60 * 1000

        val workout = Workout(
            id = "",
            userId = userId,
            name = "指示書: $exerciseName",
            type = workoutType,
            exercises = listOf(exercise),
            totalDuration = duration,
            totalCaloriesBurned = calories,
            intensity = WorkoutIntensity.MODERATE,
            timestamp = targetTimestamp,
            createdAt = Clock.System.now().toEpochMilliseconds()
        )

        workoutRepository.addWorkout(workout)
            .onSuccess { markDirectiveItemExecuted(item) }
            .onFailure { e ->
                _uiState.update { it.copy(error = "運動の記録に失敗しました: ${e.message}") }
            }
    }

    /**
     * 指示書アイテムを実行済みとしてマーク + Firestore永続化
     * 注: バッチ処理時は_uiState.valueから最新のdirectiveを読み取る
     */
    private suspend fun markDirectiveItemExecuted(item: DirectiveActionItem) {
        // 最新のdirectiveを取得（バッチ処理で複数回呼ばれる場合に最新状態を参照）
        val currentDirective = _uiState.value.directive ?: return
        val userId = authRepository.getCurrentUserId() ?: return
        val alreadyCompleted = currentDirective.executedItems.contains(item.index)

        val newExecuted = currentDirective.executedItems + item.index
        val mealPattern = Regex("""【食事(\d+)】""")
        val totalMealSlots = currentDirective.getMessageLines().count { mealPattern.containsMatchIn(it) }

        directiveRepository?.updateExecutedItems(userId, currentDirective.date, newExecuted)
            ?.onSuccess {
                val updatedDirective = currentDirective.copy(
                    executedItems = newExecuted,
                    completed = newExecuted.size >= totalMealSlots
                )
                _uiState.update { state ->
                    state.copy(
                        directive = updatedDirective,
                        unifiedTimeline = buildUnifiedTimeline(
                            meals = state.meals,
                            workouts = state.workouts,
                            currentTimeMinutes = state.currentTimeMinutes,
                            directive = updatedDirective
                        )
                    )
                }
            }

        // 新規完了の場合のみ経験値付与
        if (!alreadyCompleted) {
            grantExperience("クエスト達成")
        }
    }

    /**
     * 全クエストアイテムを一括完了（Android版completeAllDirectiveItemsと同等）
     * 各アイテムを順次処理してMeal/Workoutを自動作成
     */
    fun completeAllDirectiveItems() {
        val directive = _uiState.value.directive ?: return
        val userId = authRepository.getCurrentUserId() ?: return
        val actionItems = directive.getActionItems()
        val executableItems = actionItems.filter { it.actionType != DirectiveActionType.ADVICE }
        val uncompletedItems = executableItems.filter { !directive.executedItems.contains(it.index) }

        if (uncompletedItems.isEmpty()) return

        screenModelScope.launch(exceptionHandler) {
            _uiState.update { it.copy(isExecutingDirectiveItem = true) }

            // 各アイテムを順次処理（loadDataForDateは最後に1回だけ呼ぶ）
            for (item in uncompletedItems) {
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
            loadDataForDate(_uiState.value.date)
            _uiState.update { it.copy(isExecutingDirectiveItem = false) }
        }
    }

    // ========== クエスト: ヘルパー関数 ==========

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
     * 指示書テキストから複数の食品を抽出
     * 例: "【食事1】鶏むね肉100g, 白米130g, アボカド60g"
     *   -> [(鶏むね肉, 100, g), (白米, 130, g), (アボカド, 60, g)]
     */
    private fun parseMultipleFoods(text: String): List<Triple<String, Float, String>> {
        // 【ラベル】を除去
        var cleanText = text.replace(Regex("^-?\\s*【[^】]+】\\s*"), "").trim()
        // [トレ前][トレ後]などのタグも除去
        cleanText = cleanText.replace(Regex("\\[[^\\]]+\\]\\s*"), "").trim()
        // PFCターゲット部分を除去
        cleanText = cleanText.replace(Regex("P\\d+g\\s*[・/\\s]*F\\d+g\\s*[・/\\s]*C\\d+g\\s*"), "").trim()
        // (A), (B), (C) の選択肢表示を除去
        cleanText = cleanText.replace(Regex("\\([ABC]\\)\\s*"), "").trim()

        val results = mutableListOf<Triple<String, Float, String>>()

        // カンマまたは「、」で分割
        val parts = cleanText.split(Regex("[,、]"))

        for (part in parts) {
            val trimmedPart = part.trim()
            if (trimmedPart.isEmpty()) continue

            // 食品名と量を抽出
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
            val eggSize = when {
                lowerName.contains("ll") -> 70f
                lowerName.contains("l") -> 64f
                lowerName.contains("m") -> 58f
                lowerName.contains("s") -> 52f
                else -> 64f
            }
            val count = kotlin.math.round(amount / eggSize).toFloat()
            if (count >= 1) {
                return Pair(count, "個")
            }
        }
        return Pair(amount, unit)
    }

    /**
     * 食品名と単位から実際のグラム数を計算
     */
    private fun calculateActualGrams(foodName: String, amount: Float, unit: String): Float {
        return when (unit.lowercase()) {
            "g" -> amount
            "kg" -> amount * 1000f
            "ml" -> amount
            "l" -> amount * 1000f
            else -> {
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
            // 卵類
            (lowerName.contains("ll") || lowerName.contains("LL")) && (lowerName.contains("卵") || lowerName.contains("たまご")) -> 70f
            (lowerName.contains("l") || lowerName.contains("L")) && (lowerName.contains("卵") || lowerName.contains("たまご") || lowerName.contains("全卵")) -> 64f
            (lowerName.contains("m") || lowerName.contains("M")) && (lowerName.contains("卵") || lowerName.contains("たまご")) -> 58f
            (lowerName.contains("s") || lowerName.contains("S")) && (lowerName.contains("卵") || lowerName.contains("たまご")) -> 52f
            lowerName.contains("卵") || lowerName.contains("たまご") || lowerName.contains("全卵") -> 64f

            // 果物
            lowerName.contains("バナナ") -> 100f
            lowerName.contains("りんご") || lowerName.contains("リンゴ") -> 250f
            lowerName.contains("みかん") -> 80f
            lowerName.contains("オレンジ") -> 150f
            lowerName.contains("キウイ") -> 80f

            // もち・パン
            lowerName.contains("もち") || lowerName.contains("餅") -> 50f
            lowerName.contains("パン") && unit == "枚" -> 60f
            lowerName.contains("おにぎり") -> 100f

            // 豆腐
            lowerName.contains("豆腐") && unit == "丁" -> 300f

            // プロテイン（スクープ）
            lowerName.contains("プロテイン") && unit == "杯" -> 30f

            // 飲料（杯）
            unit == "杯" -> 200f

            // 切れ（魚など）
            unit == "切れ" -> 80f

            // デフォルト
            else -> 100f
        }
    }

    /**
     * 食品名をクレンジング（ラベルや修飾語を除去）
     */
    private fun cleanFoodName(name: String): String {
        return name
            .replace(Regex("\\[.+?\\]\\s*"), "")
            .replace(Regex("【.+?】\\s*"), "")
            .replace("を", "")
            .replace("追加", "")
            .replace("食べる", "")
            .replace("摂る", "")
            .trim()
    }

    /**
     * 柔軟な食品検索（BodymakingFoodDatabase優先、7段階マッチング）
     */
    private fun searchFoodFlexible(query: String): FoodItem? {
        if (query.isBlank()) return null

        val normalizedQuery = normalizeForSearch(query)

        // 1. BodymakingFoodDatabaseからID検索
        BodymakingFoodDatabase.getById(query)?.let { bmFood ->
            BodymakingFoodDatabase.toFoodItem(bmFood)?.let { return it }
        }

        // 2. BodymakingFood表示名で正規化マッチング
        BodymakingFoodDatabase.allFoods
            .find {
                val normalizedDisplay = normalizeForSearch(it.displayName)
                normalizedDisplay.contains(normalizedQuery) || normalizedQuery.contains(normalizedDisplay)
            }
            ?.let { bmFood ->
                BodymakingFoodDatabase.toFoodItem(bmFood)?.let { return it }
            }

        // 3. FoodDatabase完全一致検索
        FoodDatabase.getFoodByName(query)?.let { return it }

        // 4. FoodDatabase正規化マッチング
        FoodDatabase.allFoods
            .find {
                val normalizedName = normalizeForSearch(it.name)
                normalizedName.contains(normalizedQuery) || normalizedQuery.contains(normalizedName)
            }
            ?.let { return it }

        // 5. 通常の部分一致検索
        FoodDatabase.searchFoods(query).firstOrNull()?.let { return it }

        // 6. 基本名での検索（括弧内を除去）
        val baseName = query.replace(Regex("[（()）]"), "").replace(Regex("\\s+"), "").trim()
        if (baseName != normalizedQuery && baseName.isNotBlank()) {
            FoodDatabase.searchFoods(baseName).firstOrNull()?.let { return it }
        }

        // 7. 短い名前での検索（最初の2-3文字）
        if (normalizedQuery.length >= 2) {
            val shortName = normalizedQuery.take(3)
            BodymakingFoodDatabase.allFoods
                .filter { normalizeForSearch(it.displayName).contains(shortName) }
                .firstOrNull()?.let { bmFood ->
                    BodymakingFoodDatabase.toFoodItem(bmFood)?.let { return it }
                }
            FoodDatabase.allFoods
                .filter { normalizeForSearch(it.name).contains(shortName) }
                .minByOrNull { it.name.length }
                ?.let { return it }
        }

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
     * 食品データからMealItemを作成（量スケーリング対応）
     */
    private fun createMealItemFromFood(
        foodData: FoodItem?,
        fallbackName: String,
        amount: Float,
        unit: String
    ): MealItem {
        val actualGrams = calculateActualGrams(fallbackName, amount, unit)
        val ratio = actualGrams / 100f

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
            val lowerName = fallbackName.lowercase()
            val estimates = when {
                lowerName.contains("米") || lowerName.contains("ごはん") ||
                lowerName.contains("麺") || lowerName.contains("パン") ||
                lowerName.contains("餅") || lowerName.contains("もち") ||
                lowerName.contains("うどん") || lowerName.contains("そば") -> {
                    listOf(1.5f, 0.025f, 0.35f, 0.005f, 0.5f)
                }
                lowerName.contains("肉") || lowerName.contains("チキン") ||
                lowerName.contains("魚") || lowerName.contains("サーモン") ||
                lowerName.contains("鮭") || lowerName.contains("サバ") -> {
                    listOf(1.5f, 0.20f, 0f, 0.05f, 1.0f)
                }
                lowerName.contains("卵") || lowerName.contains("たまご") -> {
                    listOf(1.5f, 0.12f, 0.005f, 0.10f, 1.1f)
                }
                lowerName.contains("ブロッコリー") || lowerName.contains("野菜") ||
                lowerName.contains("サラダ") -> {
                    listOf(0.3f, 0.03f, 0.05f, 0.005f, 0.8f)
                }
                lowerName.contains("プロテイン") || lowerName.contains("ホエイ") -> {
                    listOf(3.8f, 0.75f, 0.05f, 0.03f, 1.0f)
                }
                else -> listOf(1.2f, 0.08f, 0.15f, 0.05f, 0.7f)
            }
            val estP = estimates[1]
            val estC = estimates[2]
            val estF = estimates[3]
            val estDiaas = estimates[4]
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

    // ========== AI同意 ==========

    /** AIデータ共有の同意状態を取得 */
    fun hasAiConsent(): Boolean = _uiState.value.user?.aiDataConsent == true

    /** AIデータ共有同意を保存してFirestoreに反映 */
    fun saveAiConsent() {
        val userId = authRepository.getCurrentUserId() ?: return
        screenModelScope.launch(exceptionHandler) {
            userRepository.saveAiDataConsent(userId)
            // ローカル状態も即時更新
            _uiState.update { state ->
                state.copy(user = state.user?.copy(aiDataConsent = true))
            }
        }
    }

    // ========== クエスト生成 ==========

    /**
     * 明日のクエストを生成
     * Cloud Function generateQuestを呼び出し、Directiveとして保存
     */
    fun generateQuest() {
        generateQuestForDate(
            targetDate = DateUtil.nextDay(DateUtil.todayString()),
            silent = false
        )
    }

    /**
     * 指定日のクエストを生成
     * @param targetDate 対象日（YYYY-MM-DD）
     * @param silent trueの場合はエラーをUIに表示しない（自動生成用）
     */
    private fun generateQuestForDate(targetDate: String, silent: Boolean = false) {
        val userId = authRepository.getCurrentUserId() ?: run {
            if (!silent) _uiState.update { it.copy(questGenerationError = "ログインが必要です") }
            return
        }
        val user = _uiState.value.user ?: run {
            if (!silent) _uiState.update { it.copy(questGenerationError = "ユーザー情報を読み込み中です。しばらくお待ちください") }
            return
        }

        // クレジット残高チェック
        if (user.availableCredits < 1) {
            if (!silent) _uiState.update { it.copy(questGenerationError = "クレジットが不足しています") }
            return
        }

        screenModelScope.launch(exceptionHandler) {
            _uiState.update { it.copy(isGeneratingQuest = true, questGenerationError = null) }

            try {
                // プロフィール情報を収集
                val profile = user.profile
                val goal = profile?.goal?.name ?: "MAINTAIN"
                val budgetTier = profile?.budgetTier ?: 2
                val mealsPerDay = profile?.mealsPerDay ?: 5

                // 対象日のルーティンを取得
                val routine = routineRepository?.getRoutineForDate(userId, targetDate)?.getOrNull()
                val rawSplitType = routine?.splitType ?: "off"
                val splitType = convertSplitTypeToEnglish(rawSplitType)

                // 目標PFC（対象日のルーティンに基づいて再計算）
                val targets = calculateTargets(user, routine, isManualRestDay = false)

                // 体組成（LBM計算用）
                val weight = profile?.weight ?: 70f
                val bodyFatPercentage = profile?.bodyFatPercentage ?: 20f
                val lbm = weight * (1 - bodyFatPercentage / 100f)

                // 食物繊維目標値（LBMベース + 目標別調整）
                val baseFiber = lbm * 0.4f
                val fiberTarget = when (profile?.goal) {
                    FitnessGoal.LOSE_WEIGHT -> baseFiber * 1.25f
                    FitnessGoal.GAIN_MUSCLE -> baseFiber * 0.9f
                    else -> baseFiber
                }

                // タイムスケジュール
                val wakeUpTime = profile?.wakeUpTime ?: "06:00"
                val sleepTime = profile?.sleepTime ?: "23:00"
                val trainingDuration = profile?.trainingDuration ?: 120

                // null値をフィルタリング + 数値型をDoubleに統一（iOS Kotlin/Native↔Swift bridging対策）
                val data = mutableMapOf<String, Any>(
                    "goal" to goal,
                    "budgetTier" to budgetTier.toDouble(),
                    "mealsPerDay" to mealsPerDay.toDouble(),
                    "splitType" to splitType,
                    "targetDate" to targetDate,
                    "targetProtein" to targets.protein.toDouble(),
                    "targetCarbs" to targets.carbs.toDouble(),
                    "targetFat" to targets.fat.toDouble(),
                    "targetCalories" to targets.calories.toDouble(),
                    "fiberTarget" to fiberTarget.toDouble(),
                    "wakeUpTime" to wakeUpTime,
                    "sleepTime" to sleepTime,
                    "trainingDuration" to trainingDuration.toDouble(),
                    "weight" to weight.toDouble(),
                    "bodyFatPercentage" to bodyFatPercentage.toDouble()
                )
                // nullable値は存在する場合のみ追加
                profile?.trainingAfterMeal?.let { data["trainingAfterMeal"] = it.toDouble() }
                profile?.trainingTime?.let { data["trainingTime"] = it }

                val result = invokeCloudFunction(
                    region = "asia-northeast2",
                    functionName = "generateQuest",
                    data = data,
                    timeoutSeconds = 180
                )

                _uiState.update { it.copy(isGeneratingQuest = false) }

                // 経験値はCloud Function側で付与済み（Firestore権限の関係でクライアント側では不可）

                // 対象日に切り替えて即時反映
                loadDataForDate(targetDate)
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isGeneratingQuest = false,
                        questGenerationError = if (silent) null else "クエスト生成エラー: ${e.message}"
                    )
                }
                if (silent) {
                    println("DashboardScreenModel: 自動クエスト生成エラー: ${e.message}")
                }
            }
        }
    }

    /**
     * 今日のクエストが未生成の場合に自動生成をチェック
     */
    private fun checkAndAutoGenerateQuest() {
        val state = _uiState.value

        // ガード条件
        if (!state.isToday) return
        if (state.directive != null || state.customQuest != null) return
        if (state.isGeneratingQuest) return

        val user = state.user ?: return
        val profile = user.profile ?: return
        if (!profile.questAutoGenEnabled) return
        if (user.availableCredits < 1) return

        println("DashboardScreenModel: 自動クエスト生成を開始")
        generateQuestForDate(
            targetDate = DateUtil.todayString(),
            silent = true
        )
    }

    /**
     * ユーザープロフィールから目標PFCを計算
     */
    private fun calculateTargets(
        user: User?,
        todayRoutine: RoutineDay? = null,
        isManualRestDay: Boolean = false
    ): NutritionTargets {
        val profile = user?.profile

        if (profile == null || profile.weight == null) {
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
            ?: ActivityLevel.DESK_WORK.multiplier

        // TDEE計算（日常活動のみ）
        val tdee = bmr * activityMultiplier

        // 目標に応じたカロリー調整
        val goalAdjustment = when (profile.goal) {
            FitnessGoal.LOSE_WEIGHT -> -300f
            FitnessGoal.GAIN_MUSCLE -> 300f
            FitnessGoal.MAINTAIN -> 0f
            else -> 0f
        }

        // カスタムカロリー調整がプロフィールにある場合は優先
        val calorieAdjustment = if (profile.calorieAdjustment != 0) {
            profile.calorieAdjustment.toFloat()
        } else {
            goalAdjustment
        }

        // トレ日加算（LBMスケーリング）
        val isRestDay = isManualRestDay || (todayRoutine?.isRestDay == true)
        val trainingBonus = TrainingCalorieBonus.fromSplitType(
            todayRoutine?.splitType,
            isRestDay,
            lbm.toFloat()
        )

        val adjustedCalories = tdee + calorieAdjustment + trainingBonus

        // PFC比率から計算（デフォルト P30/F25/C45）
        val proteinRatio = profile.proteinRatioPercent / 100f
        val fatRatio = profile.fatRatioPercent / 100f
        val carbRatio = profile.carbRatioPercent / 100f

        val targetProtein = (adjustedCalories * proteinRatio / 4f).toFloat()
        val targetFat = (adjustedCalories * fatRatio / 9f).toFloat()
        val targetCarbs = (adjustedCalories * carbRatio / 4f).toFloat()

        return NutritionTargets(
            adjustedCalories.roundToInt(),
            targetProtein,
            targetCarbs,
            targetFat
        )
    }

    /**
     * 経験値を付与
     */
    private fun grantExperience(reason: String) {
        val userId = authRepository.getCurrentUserId() ?: return
        screenModelScope.launch(exceptionHandler) {
            userRepository.addExperience(userId, 10)
                .onSuccess { (newExp, leveledUp) ->
                    if (leveledUp) {
                        // レベルアップのお祝いを表示
                        val newLevel = _uiState.value.user?.profile?.calculateLevel()?.plus(1) ?: 2
                        queueCelebration(CelebrationInfo(
                            type = CelebrationInfoType.LEVEL_UP,
                            level = newLevel,
                            credits = 1
                        ))
                        // ユーザーデータを再読み込み
                        loadDataForDate(_uiState.value.date)
                    }
                }
                .onFailure { e ->
                    println("DashboardScreenModel: 経験値付与エラー: $reason: ${e.message}")
                }
        }
    }

    /**
     * お祝いをキューに追加
     */
    private fun queueCelebration(info: CelebrationInfo) {
        _uiState.update { state ->
            if (state.currentCelebration == null) {
                state.copy(currentCelebration = info)
            } else {
                state.copy(celebrationQueue = state.celebrationQueue + info)
            }
        }
    }

    /**
     * お祝いを閉じる（次のキューがあれば表示）
     */
    fun dismissCelebration() {
        _uiState.update { state ->
            val queue = state.celebrationQueue
            if (queue.isNotEmpty()) {
                state.copy(
                    currentCelebration = queue.first(),
                    celebrationQueue = queue.drop(1)
                )
            } else {
                state.copy(currentCelebration = null)
            }
        }
    }

    fun clearQuestGenerationError() {
        _uiState.update { it.copy(questGenerationError = null) }
    }

    // ========== ユーティリティ ==========

    private fun convertSplitTypeToEnglish(rawSplitType: String): String = when (rawSplitType) {
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

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    fun clearSuccessMessage() {
        _uiState.update { it.copy(successMessage = null) }
    }

    fun refresh() {
        updateCurrentTime()
        loadDataForDate(_uiState.value.date)
    }

    // タイムラインアイテムのクリック
    fun onTimelineItemClick(item: UnifiedTimelineItem) {
        if (item.linkedMeal != null) {
            showMealEditDialog(item.linkedMeal)
        } else if (item.linkedWorkout != null) {
            showWorkoutEditDialog(item.linkedWorkout)
        } else if (item.actionItems?.isNotEmpty() == true || item.subtitle != null) {
            // 未記録のクエスト/タイムライン項目 → 詳細表示
            _uiState.update { it.copy(questDetailItem = item) }
        }
    }

    fun dismissQuestDetail() {
        _uiState.update { it.copy(questDetailItem = null) }
    }

    fun onTimelineRecordClick(item: UnifiedTimelineItem) {
        // タイムラインからの記録は外部ナビゲーションで処理
    }

    // ========== 食事・運動 更新 ==========

    fun updateMeal(updatedMeal: Meal) {
        screenModelScope.launch(exceptionHandler) {
            mealRepository.updateMeal(updatedMeal)
                .onSuccess {
                    _uiState.update { state ->
                        state.copy(
                            showMealEditDialog = false,
                            editingMeal = null,
                            successMessage = "食事を更新しました"
                        )
                    }
                    loadDataForDate(_uiState.value.date)
                }
                .onFailure { e ->
                    _uiState.update { it.copy(error = e.message) }
                }
        }
    }

    fun updateWorkout(updatedWorkout: Workout) {
        screenModelScope.launch(exceptionHandler) {
            workoutRepository.updateWorkout(updatedWorkout)
                .onSuccess {
                    _uiState.update { state ->
                        state.copy(
                            showWorkoutEditDialog = false,
                            editingWorkout = null,
                            successMessage = "運動を更新しました"
                        )
                    }
                    loadDataForDate(_uiState.value.date)
                }
                .onFailure { e ->
                    _uiState.update { it.copy(error = e.message) }
                }
        }
    }

    // ========== RM記録 CRUD ==========

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

    fun addRmRecord(exerciseName: String, category: String, weight: Float, reps: Int) {
        val userId = authRepository.getCurrentUserId() ?: return
        screenModelScope.launch(exceptionHandler) {
            val record = RmRecord(
                exerciseName = exerciseName,
                category = category,
                weight = weight,
                reps = reps,
                timestamp = Clock.System.now().toEpochMilliseconds(),
                createdAt = Clock.System.now().toEpochMilliseconds()
            )
            rmRepository?.addRmRecord(userId, record)
                ?.onSuccess {
                    rmRecordCache = rmRecordCache.toMutableMap().apply { put(exerciseName, record) }
                    _uiState.update { it.copy(
                        latestRmRecords = rmRecordCache,
                        showRmAddDialog = false,
                        successMessage = "${exerciseName}のRM記録を追加しました"
                    ) }
                }
                ?.onFailure { e ->
                    _uiState.update { it.copy(error = e.message ?: "RM記録の追加に失敗しました") }
                }
        }
    }

    fun updateRmRecord(exerciseName: String, category: String, weight: Float, reps: Int) {
        val userId = authRepository.getCurrentUserId() ?: return
        screenModelScope.launch(exceptionHandler) {
            val record = RmRecord(
                exerciseName = exerciseName,
                category = category,
                weight = weight,
                reps = reps,
                timestamp = Clock.System.now().toEpochMilliseconds(),
                createdAt = Clock.System.now().toEpochMilliseconds()
            )
            rmRepository?.addRmRecord(userId, record)
                ?.onSuccess {
                    rmRecordCache = rmRecordCache.toMutableMap().apply { put(exerciseName, record) }
                    _uiState.update { it.copy(
                        latestRmRecords = rmRecordCache,
                        editingRmRecord = null,
                        showRmEditDialog = false,
                        successMessage = "${exerciseName}のRM記録を更新しました"
                    ) }
                }
                ?.onFailure { e ->
                    _uiState.update { it.copy(error = e.message ?: "RM記録の更新に失敗しました") }
                }
        }
    }

    fun deleteRmRecord(record: RmRecord) {
        val userId = authRepository.getCurrentUserId() ?: return
        if (record.id.isEmpty()) return
        screenModelScope.launch(exceptionHandler) {
            rmRepository?.deleteRmRecord(userId, record.id)
                ?.onSuccess {
                    rmRecordCache = rmRecordCache.toMutableMap().apply { remove(record.exerciseName) }
                    _uiState.update { it.copy(
                        latestRmRecords = rmRecordCache,
                        editingRmRecord = null,
                        showRmEditDialog = false
                    ) }
                }
                ?.onFailure { e ->
                    _uiState.update { it.copy(error = e.message ?: "RM記録の削除に失敗しました") }
                }
        }
    }

    // ========== カロリーオーバーライド ==========

    fun showCalorieOverrideDialog() {
        _uiState.update { it.copy(showCalorieOverrideDialog = true) }
    }

    fun hideCalorieOverrideDialog() {
        _uiState.update { it.copy(showCalorieOverrideDialog = false) }
    }

    fun applyCalorieOverride(override: CalorieOverride) {
        val userId = authRepository.getCurrentUserId() ?: return
        screenModelScope.launch(exceptionHandler) {
            val date = _uiState.value.date
            scoreRepository?.applyCalorieOverride(userId, date, override)
                ?.onSuccess {
                    _uiState.update { state ->
                        state.copy(
                            calorieOverride = override,
                            showCalorieOverrideDialog = false
                        )
                    }
                    recalculateTargetsWithOverride(override)
                }
                ?.onFailure { e ->
                    _uiState.update { it.copy(error = e.message) }
                }
        }
    }

    fun clearCalorieOverride() {
        val userId = authRepository.getCurrentUserId() ?: return
        screenModelScope.launch(exceptionHandler) {
            val date = _uiState.value.date
            scoreRepository?.clearCalorieOverride(userId, date)
                ?.onSuccess {
                    _uiState.update { it.copy(calorieOverride = null) }
                    val state = _uiState.value
                    val user = state.user
                    val (targetCalories, targetProtein, targetCarbs, targetFat) = calculateTargets(user, state.todayRoutine, state.isManualRestDay)
                    _uiState.update { s ->
                        s.copy(
                            targetCalories = targetCalories,
                            targetProtein = targetProtein,
                            targetCarbs = targetCarbs,
                            targetFat = targetFat
                        )
                    }
                }
                ?.onFailure { e ->
                    _uiState.update { it.copy(error = e.message) }
                }
        }
    }

    private fun recalculateTargetsWithOverride(override: CalorieOverride) {
        val state = _uiState.value
        val user = state.user
        val (baseCalories, _, _, _) = calculateTargets(user, state.todayRoutine, state.isManualRestDay)

        val adjustedCalories = baseCalories + override.calorieAdjustment

        val pfcRatio = override.pfcOverride
        val targetProtein: Float
        val targetFat: Float
        val targetCarbs: Float

        if (pfcRatio != null) {
            targetProtein = (adjustedCalories * pfcRatio.protein / 100f / 4f)
            targetFat = (adjustedCalories * pfcRatio.fat / 100f / 9f)
            targetCarbs = (adjustedCalories * pfcRatio.carbs / 100f / 4f)
        } else {
            targetProtein = (adjustedCalories * 0.30f / 4f)
            targetFat = (adjustedCalories * 0.25f / 9f)
            targetCarbs = (adjustedCalories * 0.45f / 4f)
        }

        _uiState.update { s ->
            s.copy(
                targetCalories = adjustedCalories,
                targetProtein = targetProtein,
                targetCarbs = targetCarbs,
                targetFat = targetFat
            )
        }
    }

    // ========== 指示書（Directive）編集 ==========

    fun showDirectiveEditDialog() {
        _uiState.update { it.copy(showDirectiveEditDialog = true) }
    }

    fun hideDirectiveEditDialog() {
        _uiState.update { it.copy(showDirectiveEditDialog = false) }
    }

    fun updateDirective(newMessage: String) {
        screenModelScope.launch(exceptionHandler) {
            val currentDirective = _uiState.value.directive ?: return@launch
            val updatedDirective = currentDirective.copy(message = newMessage)
            directiveRepository?.updateDirective(updatedDirective)
                ?.onSuccess {
                    _uiState.update { it.copy(directive = updatedDirective, showDirectiveEditDialog = false) }
                }
                ?.onFailure { e ->
                    _uiState.update { it.copy(error = e.message) }
                }
        }
    }

    // ========== Microディテールシート ==========

    fun toggleMicroDetailSheet(show: Boolean) {
        _uiState.update { it.copy(showMicroDetailSheet = show) }
    }

    // ========== カスタムクエスト ==========

    private suspend fun markCustomQuestSlotCompleted(slotKey: String) {
        val userId = authRepository.getCurrentUserId() ?: return
        val selectedDate = _uiState.value.date
        val customQuest = _uiState.value.customQuest ?: return
        val docDate = if (customQuest.date == "_default") "_default" else selectedDate

        val itemIndices = customQuest.slots[slotKey]?.items?.indices?.toList() ?: listOf(0)
        customQuestRepository?.updateExecutedItems(userId, docDate, slotKey, itemIndices)
            ?.onSuccess {
                println("DashboardScreenModel: CustomQuest slot $slotKey marked completed")
            }
            ?.onFailure { e ->
                println("DashboardScreenModel: Failed to mark custom quest slot: ${e.message}")
            }
    }

    private suspend fun undoCustomQuestSlot(slotKey: String) {
        val userId = authRepository.getCurrentUserId() ?: return
        val selectedDate = _uiState.value.date
        val customQuest = _uiState.value.customQuest ?: return
        val docDate = if (customQuest.date == "_default") "_default" else selectedDate

        customQuestRepository?.updateExecutedItems(userId, docDate, slotKey, emptyList())
    }

    // ========== 運動クエスト完了シート ==========

    fun showWorkoutCompletionSheet(item: UnifiedTimelineItem) {
        val exercises = mutableListOf<WorkoutCompletionExercise>()

        if (item.isCustomQuest && item.customQuestItems != null) {
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
            // デフォルトテンプレートから種目を生成
            val rawSplitType = _uiState.value.todayRoutine?.splitType ?: ""
            val splitType = convertSplitTypeToEnglish(rawSplitType)
            val trainingStyle = _uiState.value.user?.profile?.trainingStyle?.name ?: "POWER"
            val duration = _uiState.value.user?.profile?.trainingDuration ?: 120

            val generated = WorkoutQuestGenerator.generateExercisesFromTemplate(
                splitType = splitType,
                trainingStyle = trainingStyle,
                durationMinutes = duration
            )

            for (ex in generated) {
                exercises.add(WorkoutCompletionExercise(
                    name = ex.name,
                    category = "",
                    sets = ex.sets,
                    reps = ex.reps,
                    weight = null
                ))
            }

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

    fun updateWorkoutCompletionExercises(exercises: List<WorkoutCompletionExercise>) {
        _uiState.update { it.copy(workoutCompletionExercises = exercises) }
    }

    fun dismissWorkoutCompletionSheet() {
        _uiState.update { it.copy(
            showWorkoutCompletionSheet = false,
            workoutCompletionItem = null,
            workoutCompletionExercises = emptyList()
        ) }
    }

    fun confirmWorkoutCompletion() {
        val userId = authRepository.getCurrentUserId() ?: return
        val item = _uiState.value.workoutCompletionItem ?: return
        val exercises = _uiState.value.workoutCompletionExercises

        screenModelScope.launch(exceptionHandler) {
            _uiState.update { it.copy(isExecutingDirectiveItem = true) }
            try {
                val selectedDate = _uiState.value.date
                val baseTimestamp = DateUtil.dateStringToTimestamp(selectedDate)
                val targetTimestamp = baseTimestamp + (item.timeMinutes * 60 * 1000L)

                val exerciseModels = exercises.map { ex ->
                    Exercise(
                        name = ex.name,
                        category = MetCalorieCalculator.inferExerciseCategory(ex.name, _uiState.value.todayRoutine?.splitType),
                        sets = ex.sets,
                        reps = ex.reps,
                        weight = ex.weight,
                        duration = ex.duration,
                        caloriesBurned = ex.calories
                    )
                }

                val totalDuration = exercises.sumOf { it.duration }
                val totalCalories = exercises.sumOf { it.calories }

                // テンプレ名を生成（例: "背中トレーニング（パワー）"）
                val workoutName = if (item.id.startsWith("directive_")) {
                    val rawSplit = _uiState.value.todayRoutine?.splitType ?: ""
                    val style = _uiState.value.user?.profile?.trainingStyle?.name ?: "POWER"
                    val styleLabel = if (style == "POWER") "パワー" else "パンプ"
                    "${rawSplit}トレーニング（$styleLabel）"
                } else {
                    item.title
                }

                val workout = Workout(
                    id = "",
                    userId = userId,
                    name = workoutName,
                    type = WorkoutType.STRENGTH,
                    exercises = exerciseModels,
                    totalDuration = totalDuration,
                    totalCaloriesBurned = totalCalories,
                    intensity = WorkoutIntensity.MODERATE,
                    note = if (item.isCustomQuest) "カスタムクエスト" else null,
                    timestamp = targetTimestamp,
                    createdAt = Clock.System.now().toEpochMilliseconds()
                )

                workoutRepository.addWorkout(workout)
                    .onSuccess {
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
                        loadDataForDate(_uiState.value.date)
                    }
                    .onFailure { e ->
                        _uiState.update { it.copy(error = "記録に失敗しました: ${e.message}") }
                    }
            } finally {
                _uiState.update { it.copy(isExecutingDirectiveItem = false) }
            }
        }
    }

    /**
     * UnifiedTimelineItemからDirective完了マークを設定
     */
    private suspend fun markDirectiveItemCompleted(item: UnifiedTimelineItem) {
        val userId = authRepository.getCurrentUserId() ?: return
        val directive = _uiState.value.directive ?: return

        val index = when {
            item.id.startsWith("directive_meal_") -> {
                item.id.removePrefix("directive_meal_").toIntOrNull()?.minus(1) ?: return
            }
            item.id == "directive_workout" -> {
                directive.message.lines().filter { it.startsWith("【食事") }.size
            }
            item.id == "directive_sleep" -> {
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

        val mealPattern = Regex("""【食事(\d+)】""")
        val totalMealSlots = directive.getMessageLines().count { mealPattern.containsMatchIn(it) }

        directiveRepository?.updateExecutedItems(userId, directive.date, updatedExecutedItems)
            ?.onSuccess {
                val updatedDirective = directive.copy(
                    executedItems = updatedExecutedItems,
                    completed = updatedExecutedItems.size >= totalMealSlots
                )
                _uiState.update { state ->
                    state.copy(
                        directive = updatedDirective,
                        unifiedTimeline = buildUnifiedTimeline(
                            meals = state.meals,
                            workouts = state.workouts,
                            currentTimeMinutes = state.currentTimeMinutes,
                            directive = updatedDirective
                        )
                    )
                }
            }

        grantExperience("クエスト達成")
    }

    // ========== バッジ・ログインボーナス ==========

    /**
     * 所属名の有効性をサーバー側で検証（契約期限切れ等を即時反映）
     */
    private fun checkOrganizationStatus() {
        screenModelScope.launch(exceptionHandler) {
            try {
                val result = invokeCloudFunction(
                    region = "asia-northeast2",
                    functionName = "checkOrganizationStatus",
                    data = emptyMap()
                )
                val valid = result["valid"] as? Boolean ?: true
                val removed = result["removed"] as? Boolean ?: false
                if (!valid && removed) {
                    println("DashboardScreenModel: 所属名が無効のため解除されました")
                }
            } catch (e: Exception) {
                // エラー時は無視（Premium維持）
                println("DashboardScreenModel: 所属チェックエラー: ${e.message}")
            }
        }
    }

    private fun checkLoginBonus() {
        val userId = authRepository.getCurrentUserId() ?: return
        screenModelScope.launch(exceptionHandler) {
            userRepository.checkAndGrantLoginBonus(userId)
                .onSuccess { granted ->
                    if (granted) {
                        println("DashboardScreenModel: ログインボーナス付与: +10XP")
                    }
                    checkBadges()
                }
                .onFailure { e ->
                    println("DashboardScreenModel: ログインボーナス確認エラー: ${e.message}")
                }
        }
    }

    private fun checkBadges() {
        screenModelScope.launch(exceptionHandler) {
            badgeRepository?.checkAndAwardBadges()
                ?.onSuccess { awardedBadges ->
                    if (awardedBadges.isNotEmpty()) {
                        println("DashboardScreenModel: 新規バッジ獲得: $awardedBadges")
                        awardedBadges.forEach { badgeId ->
                            queueCelebration(CelebrationInfo(
                                type = CelebrationInfoType.BADGE_EARNED,
                                badgeId = badgeId,
                                badgeName = getBadgeName(badgeId)
                            ))
                        }
                    }
                }
                ?.onFailure { e ->
                    println("DashboardScreenModel: バッジチェックエラー: ${e.message}")
                }
        }
    }

    private fun updateBadgeStats(action: String, data: Map<String, Any>? = null) {
        screenModelScope.launch(exceptionHandler) {
            badgeRepository?.updateBadgeStats(action, data)
                ?.onSuccess {
                    checkBadges()
                }
                ?.onFailure { e ->
                    println("DashboardScreenModel: updateBadgeStats失敗: ${e.message}")
                }
        }
    }

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
}

/**
 * 栄養目標データ
 */
private data class NutritionTargets(
    val calories: Int,
    val protein: Float,
    val carbs: Float,
    val fat: Float
)
