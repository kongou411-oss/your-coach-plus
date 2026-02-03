package com.yourcoach.plus.shared.ui.screens.dashboard

import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
import com.yourcoach.plus.shared.domain.model.*
import com.yourcoach.plus.shared.domain.repository.*
import com.yourcoach.plus.shared.util.DateUtil
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

    // GL管理
    val totalGL: Float = 0f,
    val glLimit: Float = 120f,
    val glScore: Int = 0,
    val glLabel: String = "-",

    // 食物繊維
    val totalFiber: Float = 0f,
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

    // クエスト生成
    val isGeneratingQuest: Boolean = false,
    val isExecutingDirectiveItem: Boolean = false
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
    private val scoreRepository: ScoreRepository? = null
) : ScreenModel {

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

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
        screenModelScope.launch {
            authRepository.currentUser.collect { authUser ->
                if (authUser != null) {
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
                }
            }
        }
    }

    /**
     * 指定日のデータを読み込む
     */
    fun loadDataForDate(date: String) {
        _uiState.update { it.copy(isLoading = true, error = null) }

        screenModelScope.launch {
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

                    val meals = mealsDeferred.await()
                    val workouts = workoutsDeferred.await()
                    val condition = conditionDeferred.await()
                    val todayRoutine = routineDeferred.await()

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
                        currentTimeMinutes = _uiState.value.currentTimeMinutes
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
                            monounsaturatedFat = detailedNutrition.monounsaturatedFat,
                            polyunsaturatedFat = detailedNutrition.polyunsaturatedFat,
                            fattyAcidScore = detailedNutrition.fattyAcidScore,
                            fattyAcidRating = detailedNutrition.fattyAcidRating,
                            fattyAcidLabel = detailedNutrition.fattyAcidLabel,
                            vitaminScores = detailedNutrition.vitaminScores,
                            mineralScores = detailedNutrition.mineralScores,
                            totalGL = totalGL,
                            glLimit = detailedNutrition.glLimit,
                            glScore = detailedNutrition.glScore,
                            glLabel = detailedNutrition.glLabel,
                            totalFiber = totalFiber,
                            fiberScore = detailedNutrition.fiberScore,
                            fiberRating = detailedNutrition.fiberRating,
                            fiberLabel = detailedNutrition.fiberLabel,
                            microIndicators = microIndicators,
                            unifiedTimeline = unifiedTimeline
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
     * 詳細栄養素を計算
     */
    private fun calculateDetailedNutrition(meals: List<Meal>): DetailedNutrition {
        if (meals.isEmpty()) {
            return DetailedNutrition()
        }

        var totalProtein = 0f
        var weightedDiaas = 0f
        var saturatedFat = 0f
        var monounsaturatedFat = 0f
        var polyunsaturatedFat = 0f
        var totalGL = 0f
        var totalFiber = 0f
        var totalCarbs = 0f
        val vitamins = mutableMapOf<String, Float>()
        val minerals = mutableMapOf<String, Float>()

        meals.forEach { meal ->
            meal.items.forEach { item ->
                totalProtein += item.protein
                if (item.diaas > 0 && item.protein > 0) {
                    weightedDiaas += item.diaas * item.protein
                }
                saturatedFat += item.saturatedFat
                monounsaturatedFat += item.monounsaturatedFat
                polyunsaturatedFat += item.polyunsaturatedFat
                totalCarbs += item.carbs
                totalFiber += item.fiber
                if (item.gi > 0 && item.carbs > 0) {
                    totalGL += (item.gi * item.carbs) / 100f
                }
                item.vitamins.forEach { (key, value) ->
                    vitamins[key] = (vitamins[key] ?: 0f) + value
                }
                item.minerals.forEach { (key, value) ->
                    minerals[key] = (minerals[key] ?: 0f) + value
                }
            }
        }

        val averageDiaas = if (totalProtein > 0) weightedDiaas / totalProtein else 0f

        // 脂肪酸スコア
        val totalFat = saturatedFat + monounsaturatedFat + polyunsaturatedFat
        val (fattyAcidScore, fattyAcidRating, fattyAcidLabel) = if (totalFat > 0) {
            val saturatedPercent = (saturatedFat / totalFat) * 100
            val monounsaturatedPercent = (monounsaturatedFat / totalFat) * 100
            when {
                saturatedPercent >= 40 || monounsaturatedPercent < 30 -> Triple(2, "★★☆☆☆", "要改善")
                saturatedPercent >= 35 || monounsaturatedPercent < 35 -> Triple(4, "★★★★☆", "良好")
                else -> Triple(5, "★★★★★", "優秀")
            }
        } else Triple(0, "-", "-")

        // 食物繊維スコア
        val (fiberScore, fiberRating, fiberLabel) = if (totalCarbs + totalFiber > 0) {
            val fiberPercent = (totalFiber / (totalCarbs + totalFiber)) * 100
            when {
                fiberPercent < 5 -> Triple(2, "★★☆☆☆", "要改善")
                fiberPercent < 10 -> Triple(4, "★★★★☆", "良好")
                else -> Triple(5, "★★★★★", "優秀")
            }
        } else Triple(0, "-", "-")

        // GL
        val glLimit = 120f
        val glRatio = if (glLimit > 0) totalGL / glLimit else 0f
        val (glScore, glLabel) = when {
            glRatio <= 0.6f -> 5 to "優秀"
            glRatio <= 0.8f -> 4 to "良好"
            glRatio <= 1.0f -> 3 to "普通"
            else -> 2 to "要改善"
        }

        // ビタミン・ミネラル充足率
        val vitaminTargets = mapOf(
            "vitaminA" to 900f, "vitaminD" to 20f, "vitaminE" to 6.5f,
            "vitaminB1" to 1.4f, "vitaminB2" to 1.6f, "vitaminC" to 100f
        )
        val mineralTargets = mapOf(
            "calcium" to 800f, "iron" to 7.5f, "magnesium" to 370f,
            "zinc" to 11f, "potassium" to 3000f
        )

        val vitaminScores = vitaminTargets.mapValues { (key, target) ->
            val actual = vitamins[key] ?: 0f
            if (target > 0) actual / target else 0f
        }
        val mineralScores = mineralTargets.mapValues { (key, target) ->
            val actual = minerals[key] ?: 0f
            if (target > 0) actual / target else 0f
        }

        return DetailedNutrition(
            averageDiaas = averageDiaas,
            saturatedFat = saturatedFat,
            monounsaturatedFat = monounsaturatedFat,
            polyunsaturatedFat = polyunsaturatedFat,
            fattyAcidScore = fattyAcidScore,
            fattyAcidRating = fattyAcidRating,
            fattyAcidLabel = fattyAcidLabel,
            vitaminScores = vitaminScores,
            mineralScores = mineralScores,
            totalGL = totalGL,
            glLimit = glLimit,
            glScore = glScore,
            glLabel = glLabel,
            totalFiber = totalFiber,
            fiberScore = fiberScore,
            fiberRating = fiberRating,
            fiberLabel = fiberLabel
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
     * 統合タイムラインを構築
     */
    private fun buildUnifiedTimeline(
        meals: List<Meal>,
        workouts: List<Workout>,
        currentTimeMinutes: Int
    ): List<UnifiedTimelineItem> {
        val items = mutableListOf<UnifiedTimelineItem>()

        // 食事を追加
        meals.forEachIndexed { index, meal ->
            val mealTime = extractTimeFromTimestamp(meal.timestamp)
            val status = when {
                mealTime < currentTimeMinutes -> TimelineItemStatus.COMPLETED
                mealTime == currentTimeMinutes -> TimelineItemStatus.CURRENT
                else -> TimelineItemStatus.UPCOMING
            }
            items.add(UnifiedTimelineItem(
                id = "meal_${meal.id}",
                type = TimelineItemType.MEAL,
                timeMinutes = mealTime,
                timeString = formatTimeMinutes(mealTime),
                title = meal.name ?: getMealTypeName(meal.type),
                subtitle = "${meal.totalCalories}kcal - P${meal.totalProtein.toInt()}g F${meal.totalFat.toInt()}g C${meal.totalCarbs.toInt()}g",
                status = status,
                isTrainingRelated = meal.isPostWorkout,
                linkedMeal = meal
            ))
        }

        // 運動を追加
        workouts.forEach { workout ->
            val workoutTime = extractTimeFromTimestamp(workout.timestamp)
            val status = when {
                workoutTime < currentTimeMinutes -> TimelineItemStatus.COMPLETED
                workoutTime == currentTimeMinutes -> TimelineItemStatus.CURRENT
                else -> TimelineItemStatus.UPCOMING
            }
            items.add(UnifiedTimelineItem(
                id = "workout_${workout.id}",
                type = TimelineItemType.WORKOUT,
                timeMinutes = workoutTime,
                timeString = formatTimeMinutes(workoutTime),
                title = workout.name ?: getWorkoutTypeName(workout.type),
                subtitle = "${workout.totalDuration}分 - ${workout.totalCaloriesBurned}kcal消費",
                status = status,
                linkedWorkout = workout
            ))
        }

        // 時刻順にソート
        return items.sortedBy { it.timeMinutes }
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
                averageDiaas = detailedNutrition.averageDiaas,
                fattyAcidScore = detailedNutrition.fattyAcidScore,
                fiberScore = detailedNutrition.fiberScore,
                microIndicators = microIndicators,
                unifiedTimeline = buildUnifiedTimeline(
                    meals = meals,
                    workouts = state.workouts,
                    currentTimeMinutes = state.currentTimeMinutes
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
                    currentTimeMinutes = state.currentTimeMinutes
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
        screenModelScope.launch {
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
        screenModelScope.launch {
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
        screenModelScope.launch {
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
        screenModelScope.launch {
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
        screenModelScope.launch {
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
        screenModelScope.launch {
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
        screenModelScope.launch {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            scoreRepository?.updateRestDayStatus(userId, _uiState.value.date, isRestDay)
        }
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
 * 詳細栄養素データ
 */
private data class DetailedNutrition(
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
    val totalGL: Float = 0f,
    val glLimit: Float = 120f,
    val glScore: Int = 0,
    val glLabel: String = "-",
    val totalFiber: Float = 0f,
    val fiberScore: Int = 0,
    val fiberRating: String = "-",
    val fiberLabel: String = "-"
)
