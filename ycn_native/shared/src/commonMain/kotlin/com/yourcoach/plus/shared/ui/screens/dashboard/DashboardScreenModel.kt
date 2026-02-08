package com.yourcoach.plus.shared.ui.screens.dashboard

import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
import com.yourcoach.plus.shared.data.database.BodymakingFoodDatabase
import com.yourcoach.plus.shared.data.database.FoodDatabase
import com.yourcoach.plus.shared.data.database.FoodItem
import com.yourcoach.plus.shared.domain.model.*
import com.yourcoach.plus.shared.domain.repository.*
import com.yourcoach.plus.shared.domain.usecase.NutritionCalculator
import com.yourcoach.plus.shared.util.DateUtil
import com.yourcoach.plus.shared.util.invokeCloudFunction
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout
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

    // ルーティン
    val todayRoutine: RoutineDay? = null,
    val isManualRestDay: Boolean = false,
    val isExecutingRoutine: Boolean = false,

    // タイムライン
    val unifiedTimeline: List<UnifiedTimelineItem> = emptyList(),
    val microIndicators: List<MicroIndicator> = emptyList(),
    val currentTimeMinutes: Int = 0,

    // ダイアログ状態
    val editingMeal: Meal? = null,
    val showMealEditDialog: Boolean = false,
    val editingWorkout: Workout? = null,
    val showWorkoutEditDialog: Boolean = false,

    // クエスト（指示書）
    val directive: Directive? = null,
    val isGeneratingQuest: Boolean = false,
    val isExecutingDirectiveItem: Boolean = false,
    val questGenerationError: String? = null,

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
    private val directiveRepository: DirectiveRepository? = null
) : ScreenModel {

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    // iOS対応: コルーチン例外ハンドラー（NULLクラッシュ防止）
    private val exceptionHandler = CoroutineExceptionHandler { _, throwable ->
        println("DashboardScreenModel: Coroutine exception: ${throwable.message}")
        _uiState.update { it.copy(isLoading = false, error = "エラーが発生しました") }
    }

    init {
        observeUser()
        loadDataForDate(_uiState.value.date)
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
     */
    private fun observeUser() {
        screenModelScope.launch(exceptionHandler) {
            try {
                authRepository.currentUser.collect { authUser ->
                    if (authUser != null) {
                        try {
                            userRepository.observeUser(authUser.uid).collect { user ->
                                _uiState.update { state ->
                                    val profile = user?.profile
                                    state.copy(
                                        user = user,
                                        targetCalories = profile?.targetCalories ?: 2500,
                                        targetProtein = profile?.targetProtein ?: 180f,
                                        targetFat = profile?.targetFat ?: 80f,
                                        targetCarbs = profile?.targetCarbs ?: 300f
                                    )
                                }
                            }
                        } catch (e: Throwable) {
                            println("DashboardScreenModel: observeUser inner error: ${e::class.simpleName}: ${e.message}")
                        }
                    }
                }
            } catch (e: Throwable) {
                println("DashboardScreenModel: observeUser error: ${e::class.simpleName}: ${e.message}")
            }
        }
    }

    /**
     * 指定日のデータを読み込む
     */
    fun loadDataForDate(date: String) {
        _uiState.update { it.copy(isLoading = true, error = null) }

        screenModelScope.launch(exceptionHandler) {
            try {
                val userId = authRepository.getCurrentUserId()
                if (userId == null) {
                    _uiState.update { it.copy(isLoading = false, error = "ログインしていません") }
                    return@launch
                }

                // データを並列取得
                coroutineScope {
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

                    val meals = mealsDeferred.await()
                    val workouts = workoutsDeferred.await()
                    val condition = conditionDeferred.await()
                    val todayRoutine = routineDeferred.await()
                    val directive = directiveDeferred.await()

                    // 栄養素を計算
                    val totalCalories = meals.sumOf { it.totalCalories }
                    val totalProtein = meals.sumOf { it.totalProtein.toDouble() }.toFloat()
                    val totalFat = meals.sumOf { it.totalFat.toDouble() }.toFloat()
                    val totalCarbs = meals.sumOf { it.totalCarbs.toDouble() }.toFloat()
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
                            meals = meals,
                            workouts = workouts,
                            condition = condition,
                            todayRoutine = todayRoutine,
                            totalCalories = totalCalories,
                            totalProtein = totalProtein,
                            totalFat = totalFat,
                            totalCarbs = totalCarbs,
                            totalWorkoutDuration = workouts.sumOf { it.totalDuration },
                            totalCaloriesBurned = workouts.sumOf { it.totalCaloriesBurned },
                            workoutCount = workouts.size,
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
                }

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

        if (directive != null && directive.message.isNotBlank()) {
            // Directiveがある場合: テキストからパース（Android版 parseDirectiveToTimelineItems 相当）
            val directiveItems = parseDirectiveToTimelineItems(
                directive = directive,
                currentTimeMinutes = currentTimeMinutes,
                meals = meals,
                workouts = workouts,
                trainingMinutes = trainingMinutes,
                sleepMinutes = sleepMinutes
            )
            items.addAll(directiveItems)
        } else if (wakeUpMinutes != null && sleepMinutes != null) {
            // Directiveがない場合: ユーザー設定からデフォルトタイムラインを生成
            val mealSlotConfig = MealSlotConfig.createTimelineRoutine(
                mealsPerDay = mealsPerDay,
                trainingAfterMeal = trainingAfterMeal
            )
            val allSlotTimes = mealSlotConfig.calculateAllSlotTimes(wakeUpMinutes, trainingMinutes, sleepMinutes)
            val recordedMealCount = meals.size

            mealSlotConfig.slots.forEach { slot ->
                val actualTime = allSlotTimes[slot.slotNumber] ?: return@forEach
                val isTrainingRelated = trainingAfterMeal != null &&
                    (slot.slotNumber == trainingAfterMeal || slot.slotNumber == trainingAfterMeal + 1)
                val isCompleted = slot.slotNumber <= recordedMealCount
                val isNext = !isCompleted && items.none { it.status == TimelineItemStatus.CURRENT } &&
                    actualTime >= currentTimeMinutes - 30
                val status = when {
                    isCompleted -> TimelineItemStatus.COMPLETED
                    isNext -> TimelineItemStatus.CURRENT
                    else -> TimelineItemStatus.UPCOMING
                }

                items.add(UnifiedTimelineItem(
                    id = "slot_${slot.slotNumber}",
                    type = TimelineItemType.MEAL,
                    timeMinutes = actualTime,
                    timeString = MealSlot.minutesToTimeString(actualTime),
                    title = slot.getDisplayName(),
                    subtitle = null,
                    status = status,
                    isTrainingRelated = isTrainingRelated,
                    slotInfo = TimelineSlotInfo(
                        slotNumber = slot.slotNumber,
                        displayName = slot.getDisplayName(),
                        timeMinutes = actualTime,
                        timeString = MealSlot.minutesToTimeString(actualTime),
                        foodChoice = slot.defaultFoodChoice,
                        isTrainingRelated = isTrainingRelated,
                        isCompleted = isCompleted
                    )
                ))
            }

            // トレーニングをタイムラインに挿入
            if (trainingMinutes != null) {
                val workoutStatus = when {
                    workouts.isNotEmpty() -> TimelineItemStatus.COMPLETED
                    trainingMinutes <= currentTimeMinutes -> TimelineItemStatus.CURRENT
                    else -> TimelineItemStatus.UPCOMING
                }
                items.add(UnifiedTimelineItem(
                    id = "workout_routine",
                    type = TimelineItemType.WORKOUT,
                    timeMinutes = trainingMinutes,
                    timeString = MealSlot.minutesToTimeString(trainingMinutes),
                    title = "${todayRoutine?.splitType ?: ""}トレ",
                    subtitle = null,
                    status = workoutStatus,
                    isTrainingRelated = true,
                    linkedWorkout = workouts.firstOrNull()
                ))
            }
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
                    subtitle = "${meal.totalCalories}kcal | P${meal.totalProtein.toInt()}g"
                )
            } else {
                items.add(UnifiedTimelineItem(
                    id = "meal_${meal.id}",
                    type = TimelineItemType.MEAL,
                    timeMinutes = mealTime,
                    timeString = formatTimeMinutes(mealTime),
                    title = meal.name ?: getMealTypeName(meal.type),
                    subtitle = "${meal.totalCalories}kcal | P${meal.totalProtein.toInt()}g",
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
                            foodChoice = FoodChoice.KITCHEN,
                            isTrainingRelated = isTrainingRelated,
                            isCompleted = isCompleted
                        )
                    ))
                }

                workoutMatch != null -> {
                    val content = workoutMatch.groupValues[1].trim()
                    val defaultWorkoutTime = 18 * 60
                    val timeMinutes = trainingMinutes ?: defaultWorkoutTime

                    // Android版と一致: 運動の完了はworkouts.isNotEmpty()で判定（executedItemsは使わない）
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
                        timeString = MealSlot.minutesToTimeString(timeMinutes),
                        title = "トレーニング",
                        subtitle = content.ifEmpty { null },
                        status = status,
                        isTrainingRelated = true,
                        linkedWorkout = workouts.firstOrNull()
                    ))
                }

                sleepMatch != null -> {
                    val content = sleepMatch.groupValues[1].trim()
                    val defaultSleepTime = 23 * 60
                    val timeMinutes = sleepMinutes ?: defaultSleepTime

                    // Android版と一致: 睡眠の完了は時刻ベースで判定（executedItemsは使わない）
                    items.add(UnifiedTimelineItem(
                        id = "directive_sleep",
                        type = TimelineItemType.CONDITION,
                        timeMinutes = timeMinutes,
                        timeString = MealSlot.minutesToTimeString(timeMinutes),
                        title = "睡眠",
                        subtitle = content.ifEmpty { null },
                        status = if (timeMinutes < currentTimeMinutes) TimelineItemStatus.COMPLETED else TimelineItemStatus.UPCOMING
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
                totalProtein = meals.sumOf { it.totalProtein.toDouble() }.toFloat(),
                totalFat = meals.sumOf { it.totalFat.toDouble() }.toFloat(),
                totalCarbs = meals.sumOf { it.totalCarbs.toDouble() }.toFloat(),
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

        val exercise = Exercise(
            name = exerciseName,
            category = ExerciseCategory.OTHER,
            sets = if (unit == "セット") amount else 3,
            reps = if (unit == "回") amount else 10,
            caloriesBurned = 50
        )

        val selectedDate = _uiState.value.date
        val baseTimestamp = DateUtil.dateStringToTimestamp(selectedDate)
        val targetTimestamp = baseTimestamp + (timeMinutes * 60 * 1000L)

        val workout = Workout(
            id = "",
            userId = userId,
            name = "指示書: $exerciseName",
            type = WorkoutType.STRENGTH,
            exercises = listOf(exercise),
            totalDuration = 10,
            totalCaloriesBurned = 50,
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

        val exercise = Exercise(
            name = exerciseName,
            category = ExerciseCategory.OTHER,
            sets = if (unit == "セット") amount else 3,
            reps = if (unit == "回") amount else 10,
            caloriesBurned = 50
        )

        val selectedDate = _uiState.value.date
        val targetTimestamp = DateUtil.dateStringToTimestamp(selectedDate) + 12 * 60 * 60 * 1000

        val workout = Workout(
            id = "",
            userId = userId,
            name = "指示書: $exerciseName",
            type = WorkoutType.STRENGTH,
            exercises = listOf(exercise),
            totalDuration = 10,
            totalCaloriesBurned = 50,
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

    // ========== クエスト生成 ==========

    /**
     * 明日のクエストを生成
     * Cloud Function generateQuestを呼び出し、Directiveとして保存
     */
    fun generateQuest() {
        val userId = authRepository.getCurrentUserId() ?: run {
            _uiState.update { it.copy(questGenerationError = "ログインが必要です") }
            return
        }
        val user = _uiState.value.user ?: run {
            _uiState.update { it.copy(questGenerationError = "ユーザー情報を読み込み中です。しばらくお待ちください") }
            return
        }

        // プレミアム会員チェック
        if (user.isPremium != true && !user.hasCorporatePremium) {
            _uiState.update { it.copy(questGenerationError = "クエスト生成はプレミアム会員限定機能です") }
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
                val targetDate = DateUtil.nextDay(DateUtil.todayString())

                // 翌日のルーティンを取得
                val tomorrowRoutine = routineRepository?.getRoutineForDate(userId, targetDate)?.getOrNull()
                val rawSplitType = tomorrowRoutine?.splitType ?: "off"

                // splitTypeは日本語→英語変換
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

                // 目標PFC（明日のルーティンに基づいて再計算）
                val tomorrowTargets = calculateTargets(user, tomorrowRoutine, isManualRestDay = false)

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

                // null値をフィルタリング（iOS GitLive SDKのシリアライズ対策）
                val data = mutableMapOf<String, Any>(
                    "goal" to goal,
                    "budgetTier" to budgetTier,
                    "mealsPerDay" to mealsPerDay,
                    "splitType" to splitType,
                    "targetDate" to targetDate,
                    "targetProtein" to tomorrowTargets.protein,
                    "targetCarbs" to tomorrowTargets.carbs,
                    "targetFat" to tomorrowTargets.fat,
                    "targetCalories" to tomorrowTargets.calories,
                    "fiberTarget" to fiberTarget,
                    "wakeUpTime" to wakeUpTime,
                    "sleepTime" to sleepTime,
                    "trainingDuration" to trainingDuration,
                    "weight" to weight,
                    "bodyFatPercentage" to bodyFatPercentage
                )
                // nullable値は存在する場合のみ追加
                profile?.trainingAfterMeal?.let { data["trainingAfterMeal"] = it }
                profile?.trainingTime?.let { data["trainingTime"] = it }

                val result = invokeCloudFunction(
                    region = "asia-northeast2",
                    functionName = "generateQuest",
                    data = data,
                    timeoutSeconds = 180
                )

                _uiState.update { it.copy(isGeneratingQuest = false) }

                // 経験値はCloud Function側で付与済み（Firestore権限の関係でクライアント側では不可）

                // 翌日に切り替えて即時反映
                loadDataForDate(targetDate)
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isGeneratingQuest = false,
                        questGenerationError = "クエスト生成エラー: ${e.message}"
                    )
                }
            }
        }
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
        val tdee = (bmr * activityMultiplier).toFloat()

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

        // トレ日加算
        val isRestDay = isManualRestDay || (todayRoutine?.isRestDay == true)
        val trainingBonus = TrainingCalorieBonus.fromSplitType(
            todayRoutine?.splitType,
            isRestDay
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
        item.linkedMeal?.let { showMealEditDialog(it) }
        item.linkedWorkout?.let { showWorkoutEditDialog(it) }
    }

    fun onTimelineRecordClick(item: UnifiedTimelineItem) {
        // タイムラインからの記録は外部ナビゲーションで処理
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
