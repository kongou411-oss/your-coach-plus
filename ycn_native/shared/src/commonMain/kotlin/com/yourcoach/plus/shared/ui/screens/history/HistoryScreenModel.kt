package com.yourcoach.plus.shared.ui.screens.history

import kotlin.math.roundToInt
import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
import com.yourcoach.plus.shared.domain.model.Condition
import com.yourcoach.plus.shared.domain.model.FitnessGoal
import com.yourcoach.plus.shared.domain.model.Meal
import com.yourcoach.plus.shared.domain.model.Workout
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.ConditionRepository
import com.yourcoach.plus.shared.domain.repository.MealRepository
import com.yourcoach.plus.shared.domain.repository.UserRepository
import com.yourcoach.plus.shared.domain.repository.RmRepository
import com.yourcoach.plus.shared.domain.repository.WorkoutRepository
import com.yourcoach.plus.shared.util.DateUtil
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.launch
import kotlinx.datetime.*

/**
 * Graph data point
 */
data class GraphDataPoint(
    val date: LocalDate,
    val value: Float,
    val label: String = ""
)

/**
 * Nutrition graph data (PFC)
 */
data class NutritionGraphData(
    val dates: List<LocalDate>,
    val proteins: List<Float>,
    val carbs: List<Float>,
    val fats: List<Float>
)

/**
 * History screen UI state
 */
data class HistoryUiState(
    val isLoading: Boolean = false,
    val selectedDate: LocalDate = Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault()).date,
    val currentYearMonth: YearMonth = YearMonth(
        Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault()).year,
        Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault()).monthNumber
    ),
    val meals: List<Meal> = emptyList(),
    val workouts: List<Workout> = emptyList(),
    val recordedDates: Set<LocalDate> = emptySet(),
    val selectedTab: HistoryTab = HistoryTab.CALENDAR,
    val graphType: GraphType = GraphType.LBM,
    val error: String? = null,
    // User settings
    val fitnessGoal: FitnessGoal = FitnessGoal.MAINTAIN,
    // Graph data
    val lbmData: List<GraphDataPoint> = emptyList(),
    val weightData: List<GraphDataPoint> = emptyList(),
    val caloriesData: List<GraphDataPoint> = emptyList(),
    val nutritionData: NutritionGraphData = NutritionGraphData(emptyList(), emptyList(), emptyList(), emptyList()),
    val exerciseData: List<GraphDataPoint> = emptyList(),
    val conditionData: List<GraphDataPoint> = emptyList(),
    // RM data
    val rmData: List<GraphDataPoint> = emptyList(),
    val rmExerciseNames: List<String> = emptyList(),
    val selectedRmExercise: String? = null,
    // Target values
    val targetWeight: Float? = null,
    val targetCalories: Int? = null,
    val targetLbm: Float? = null,
    // Graph period
    val graphPeriod: GraphPeriod = GraphPeriod.WEEK
)

/**
 * Year-Month data class for KMP
 */
data class YearMonth(
    val year: Int,
    val month: Int
) {
    fun atDay(day: Int): LocalDate = LocalDate(year, month, day)

    fun atEndOfMonth(): LocalDate {
        val daysInMonth = when (month) {
            1, 3, 5, 7, 8, 10, 12 -> 31
            4, 6, 9, 11 -> 30
            2 -> if (isLeapYear(year)) 29 else 28
            else -> 30
        }
        return LocalDate(year, month, daysInMonth)
    }

    fun lengthOfMonth(): Int {
        return when (month) {
            1, 3, 5, 7, 8, 10, 12 -> 31
            4, 6, 9, 11 -> 30
            2 -> if (isLeapYear(year)) 29 else 28
            else -> 30
        }
    }

    fun minusMonths(months: Int): YearMonth {
        var newMonth = month - months
        var newYear = year
        while (newMonth < 1) {
            newMonth += 12
            newYear -= 1
        }
        return YearMonth(newYear, newMonth)
    }

    fun plusMonths(months: Int): YearMonth {
        var newMonth = month + months
        var newYear = year
        while (newMonth > 12) {
            newMonth -= 12
            newYear += 1
        }
        return YearMonth(newYear, newMonth)
    }

    fun isAfter(other: YearMonth): Boolean {
        return year > other.year || (year == other.year && month > other.month)
    }

    companion object {
        fun now(): YearMonth {
            val now = Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault())
            return YearMonth(now.year, now.monthNumber)
        }

        private fun isLeapYear(year: Int): Boolean {
            return (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)
        }
    }
}

enum class HistoryTab {
    CALENDAR,
    GRAPH
}

enum class GraphType {
    LBM,
    WEIGHT,
    CALORIES,
    NUTRITION,
    EXERCISE,
    CONDITION,
    RM
}

enum class GraphPeriod(val days: Int, val label: String) {
    WEEK(7, "7日"),
    MONTH(30, "1ヶ月"),
    THREE_MONTHS(90, "3ヶ月"),
    SIX_MONTHS(180, "6ヶ月"),
    YEAR(365, "1年");

    val titleSuffix: String get() = when (this) {
        WEEK -> "過去7日間"; MONTH -> "過去1ヶ月"
        THREE_MONTHS -> "過去3ヶ月"; SIX_MONTHS -> "過去6ヶ月"; YEAR -> "過去1年"
    }
    val needsAggregation: Boolean get() = this == THREE_MONTHS || this == SIX_MONTHS || this == YEAR
    val rmLimit: Int get() = when (this) {
        WEEK -> 30; MONTH -> 60; THREE_MONTHS -> 100; SIX_MONTHS -> 200; YEAR -> 365
    }
}

/**
 * History screen ScreenModel (Voyager)
 */
class HistoryScreenModel(
    private val authRepository: AuthRepository,
    private val userRepository: UserRepository,
    private val mealRepository: MealRepository,
    private val workoutRepository: WorkoutRepository,
    private val conditionRepository: ConditionRepository? = null,
    private val rmRepository: RmRepository? = null
) : ScreenModel {

    private val _uiState = MutableStateFlow(HistoryUiState())
    val uiState: StateFlow<HistoryUiState> = _uiState.asStateFlow()

    private val exceptionHandler = CoroutineExceptionHandler { _, throwable ->
        println("HistoryScreenModel: Coroutine exception: ${throwable.message}")
        _uiState.update { it.copy(isLoading = false, error = "エラーが発生しました") }
    }

    private val userId: String?
        get() = authRepository.getCurrentUserId()

    init {
        loadData()
    }

    /**
     * Load data
     */
    fun loadData() {
        screenModelScope.launch(exceptionHandler) {
            _uiState.update { it.copy(isLoading = true) }
            try {
                loadSelectedDateData()
                loadRecordedDates()
                loadGraphData()
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message ?: "Failed to load data") }
            } finally {
                _uiState.update { it.copy(isLoading = false) }
            }
        }
    }

    /**
     * Generate date bucket points based on period
     * WEEK/MONTH → daily, THREE_MONTHS/SIX_MONTHS → weekly, YEAR → monthly
     */
    private fun generateDatePoints(startDate: LocalDate, endDate: LocalDate, period: GraphPeriod): List<LocalDate> {
        return when (period) {
            GraphPeriod.WEEK, GraphPeriod.MONTH -> {
                val days = mutableListOf<LocalDate>()
                var d = startDate
                while (d <= endDate) {
                    days.add(d)
                    d = d.plus(DatePeriod(days = 1))
                }
                days
            }
            GraphPeriod.THREE_MONTHS, GraphPeriod.SIX_MONTHS -> {
                // Weekly buckets (each Monday or start date)
                val weeks = mutableListOf<LocalDate>()
                var d = startDate
                while (d <= endDate) {
                    weeks.add(d)
                    d = d.plus(DatePeriod(days = 7))
                }
                weeks
            }
            GraphPeriod.YEAR -> {
                // Monthly buckets (1st of each month)
                val months = mutableListOf<LocalDate>()
                var ym = YearMonth(startDate.year, startDate.monthNumber)
                val endYm = YearMonth(endDate.year, endDate.monthNumber)
                while (!ym.isAfter(endYm)) {
                    months.add(ym.atDay(1))
                    ym = ym.plusMonths(1)
                }
                months
            }
        }
    }

    /**
     * Get the bucket end date for a given bucket start date
     */
    private fun bucketEndDate(bucketStart: LocalDate, period: GraphPeriod, overallEnd: LocalDate): LocalDate {
        val end = when (period) {
            GraphPeriod.WEEK, GraphPeriod.MONTH -> bucketStart
            GraphPeriod.THREE_MONTHS, GraphPeriod.SIX_MONTHS -> bucketStart.plus(DatePeriod(days = 6))
            GraphPeriod.YEAR -> {
                val ym = YearMonth(bucketStart.year, bucketStart.monthNumber)
                ym.atEndOfMonth()
            }
        }
        return if (end > overallEnd) overallEnd else end
    }

    /**
     * Format X axis label based on period
     */
    private fun formatXAxisLabel(date: LocalDate, period: GraphPeriod): String {
        return when (period) {
            GraphPeriod.WEEK -> "${date.dayOfMonth}"
            GraphPeriod.MONTH -> "${date.monthNumber}/${date.dayOfMonth}"
            GraphPeriod.THREE_MONTHS, GraphPeriod.SIX_MONTHS -> "${date.monthNumber}/${date.dayOfMonth}"
            GraphPeriod.YEAR -> "${date.monthNumber}月"
        }
    }

    /**
     * Aggregate daily GraphDataPoints into buckets by averaging
     */
    private fun aggregateData(
        dailyData: List<GraphDataPoint>,
        buckets: List<LocalDate>,
        period: GraphPeriod,
        overallEnd: LocalDate
    ): List<GraphDataPoint> {
        return buckets.map { bucketStart ->
            val bucketEnd = bucketEndDate(bucketStart, period, overallEnd)
            val points = dailyData.filter { it.date in bucketStart..bucketEnd && it.value != 0f }
            val avg = if (points.isNotEmpty()) points.map { it.value }.average().toFloat() else 0f
            GraphDataPoint(
                date = bucketStart,
                value = avg,
                label = formatXAxisLabel(bucketStart, period)
            )
        }
    }

    /**
     * Aggregate nutrition data into buckets
     */
    private fun aggregateNutritionData(
        dailyDates: List<LocalDate>,
        dailyProteins: List<Float>,
        dailyCarbs: List<Float>,
        dailyFats: List<Float>,
        buckets: List<LocalDate>,
        period: GraphPeriod,
        overallEnd: LocalDate
    ): NutritionGraphData {
        val aggDates = mutableListOf<LocalDate>()
        val aggP = mutableListOf<Float>()
        val aggC = mutableListOf<Float>()
        val aggF = mutableListOf<Float>()

        buckets.forEach { bucketStart ->
            val bucketEnd = bucketEndDate(bucketStart, period, overallEnd)
            val indices = dailyDates.indices.filter { dailyDates[it] in bucketStart..bucketEnd }
            val nonZeroIndices = indices.filter {
                dailyProteins.getOrElse(it) { 0f } != 0f ||
                dailyCarbs.getOrElse(it) { 0f } != 0f ||
                dailyFats.getOrElse(it) { 0f } != 0f
            }
            val count = if (nonZeroIndices.isNotEmpty()) nonZeroIndices.size else 1
            aggDates.add(bucketStart)
            aggP.add(if (nonZeroIndices.isNotEmpty()) nonZeroIndices.sumOf { dailyProteins.getOrElse(it) { 0f }.toDouble() }.toFloat() / count else 0f)
            aggC.add(if (nonZeroIndices.isNotEmpty()) nonZeroIndices.sumOf { dailyCarbs.getOrElse(it) { 0f }.toDouble() }.toFloat() / count else 0f)
            aggF.add(if (nonZeroIndices.isNotEmpty()) nonZeroIndices.sumOf { dailyFats.getOrElse(it) { 0f }.toDouble() }.toFloat() / count else 0f)
        }

        return NutritionGraphData(dates = aggDates, proteins = aggP, carbs = aggC, fats = aggF)
    }

    /**
     * Load graph data (period-aware)
     */
    private suspend fun loadGraphData() {
        val uid = userId ?: return
        val period = _uiState.value.graphPeriod
        val today = Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault()).date
        val startDate = today.minus(DatePeriod(days = period.days - 1))
        val dates = generateDatePoints(startDate, today, GraphPeriod.WEEK.takeIf { period == GraphPeriod.WEEK } ?: GraphPeriod.MONTH.takeIf { period == GraphPeriod.MONTH } ?: period)
        // Always fetch daily data first
        val dailyDates = run {
            val days = mutableListOf<LocalDate>()
            var d = startDate
            while (d <= today) {
                days.add(d)
                d = d.plus(DatePeriod(days = 1))
            }
            days
        }
        val startDateStr = startDate.toString()
        val endDateStr = today.toString()

        // Get meal data
        val mealsResult = mealRepository.getMealsInRange(uid, startDateStr, endDateStr)
        val allMeals = mealsResult.getOrNull() ?: emptyList()

        // Get workout data
        val workoutsResult = workoutRepository.getWorkoutsInRange(uid, startDateStr, endDateStr)
        val allWorkouts = workoutsResult.getOrNull() ?: emptyList()

        // Get condition data
        val conditionsResult = conditionRepository?.getConditionsInRange(uid, startDateStr, endDateStr)
        val allConditions = conditionsResult?.getOrNull() ?: emptyList()

        // Get user profile
        val userResult = userRepository.getUser(uid)
        val user = userResult.getOrNull()
        val profile = user?.profile
        val currentWeight = profile?.weight
        val bodyFatPercentage = profile?.bodyFatPercentage
        val fitnessGoal = profile?.goal ?: FitnessGoal.MAINTAIN
        val targetWeight = profile?.targetWeight
        val targetCalories = profile?.targetCalories
        val targetLbm = if (targetWeight != null && targetWeight > 0f && bodyFatPercentage != null && bodyFatPercentage > 0f) {
            targetWeight * (1f - bodyFatPercentage / 100f)
        } else null

        val currentLbm = if (currentWeight != null && currentWeight > 0f && bodyFatPercentage != null && bodyFatPercentage > 0f) {
            currentWeight * (1f - bodyFatPercentage / 100f)
        } else null

        // Build daily data
        val timeZone = TimeZone.currentSystemDefault()
        val dailyCalories = mutableListOf<GraphDataPoint>()
        val dailyProteins = mutableListOf<Float>()
        val dailyCarbs = mutableListOf<Float>()
        val dailyFats = mutableListOf<Float>()
        val dailyExercise = mutableListOf<GraphDataPoint>()
        val dailyWeight = mutableListOf<GraphDataPoint>()
        val dailyLbm = mutableListOf<GraphDataPoint>()
        val dailyCondition = mutableListOf<GraphDataPoint>()

        dailyDates.forEach { date ->
            val startOfDay = date.atStartOfDayIn(timeZone).toEpochMilliseconds()
            val endOfDay = date.plus(DatePeriod(days = 1)).atStartOfDayIn(timeZone).toEpochMilliseconds()

            val dayMeals = allMeals.filter { it.timestamp in startOfDay until endOfDay }
            val totalCalories = dayMeals.sumOf { it.totalCalories }
            val totalProtein = dayMeals.sumOf { it.totalProtein.roundToInt() }.toFloat()
            val totalCarbs = dayMeals.sumOf { it.totalCarbs.roundToInt() }.toFloat()
            val totalFat = dayMeals.sumOf { it.totalFat.roundToInt() }.toFloat()

            val label = formatXAxisLabel(date, period)
            dailyCalories.add(GraphDataPoint(date, totalCalories.toFloat(), label))
            dailyProteins.add(totalProtein)
            dailyCarbs.add(totalCarbs)
            dailyFats.add(totalFat)

            val dayWorkouts = allWorkouts.filter { it.timestamp in startOfDay until endOfDay }
            val totalBurned = dayWorkouts.sumOf { it.totalCaloriesBurned }
            dailyExercise.add(GraphDataPoint(date, totalBurned.toFloat(), label))

            if (currentWeight != null && currentWeight > 0f) {
                dailyWeight.add(GraphDataPoint(date, currentWeight, label))
            }
            if (currentLbm != null) {
                dailyLbm.add(GraphDataPoint(date, currentLbm, label))
            }

            val dateStr = date.toString()
            val condition = allConditions.find { it.date == dateStr }
            val conditionScore = condition?.calculateScore()?.toFloat() ?: 0f
            dailyCondition.add(GraphDataPoint(date, conditionScore, label))
        }

        // Aggregate if needed
        val buckets = generateDatePoints(startDate, today, period)
        val caloriesData: List<GraphDataPoint>
        val exerciseData: List<GraphDataPoint>
        val weightData: List<GraphDataPoint>
        val lbmData: List<GraphDataPoint>
        val conditionData: List<GraphDataPoint>
        val nutritionData: NutritionGraphData

        if (period.needsAggregation) {
            caloriesData = aggregateData(dailyCalories, buckets, period, today)
            exerciseData = aggregateData(dailyExercise, buckets, period, today)
            weightData = aggregateData(dailyWeight, buckets, period, today)
            lbmData = aggregateData(dailyLbm, buckets, period, today)
            conditionData = aggregateData(dailyCondition, buckets, period, today)
            nutritionData = aggregateNutritionData(dailyDates, dailyProteins, dailyCarbs, dailyFats, buckets, period, today)
        } else {
            caloriesData = dailyCalories
            exerciseData = dailyExercise
            weightData = dailyWeight
            lbmData = dailyLbm
            conditionData = dailyCondition
            nutritionData = NutritionGraphData(
                dates = dailyDates,
                proteins = dailyProteins,
                carbs = dailyCarbs,
                fats = dailyFats
            )
        }

        _uiState.update {
            it.copy(
                fitnessGoal = fitnessGoal,
                lbmData = lbmData,
                weightData = weightData,
                caloriesData = caloriesData,
                nutritionData = nutritionData,
                exerciseData = exerciseData,
                conditionData = conditionData,
                targetWeight = targetWeight,
                targetCalories = targetCalories,
                targetLbm = targetLbm
            )
        }
    }

    /**
     * Load selected date data
     */
    private suspend fun loadSelectedDateData() {
        val uid = userId ?: return
        val date = _uiState.value.selectedDate
        val dateStr = date.toString()

        // Get meal data
        val mealsResult = mealRepository.getMealsForDate(uid, dateStr)
        val meals = mealsResult.getOrNull() ?: emptyList()

        // Get workout data
        val workoutsResult = workoutRepository.getWorkoutsForDate(uid, dateStr)
        val workouts = workoutsResult.getOrNull() ?: emptyList()

        _uiState.update {
            it.copy(
                meals = meals,
                workouts = workouts
            )
        }
    }

    /**
     * Load recorded dates (current month)
     */
    private suspend fun loadRecordedDates() {
        val uid = userId ?: return
        val currentMonth = _uiState.value.currentYearMonth
        val startDate = currentMonth.atDay(1).toString()
        val endDate = currentMonth.atEndOfMonth().toString()

        // Get meal and workout data
        val mealsResult = mealRepository.getMealsInRange(uid, startDate, endDate)
        val workoutsResult = workoutRepository.getWorkoutsInRange(uid, startDate, endDate)

        val recordedDates = mutableSetOf<LocalDate>()
        val timeZone = TimeZone.currentSystemDefault()

        // Add dates with meals
        mealsResult.getOrNull()?.forEach { meal ->
            val instant = Instant.fromEpochMilliseconds(meal.timestamp)
            val date = instant.toLocalDateTime(timeZone).date
            recordedDates.add(date)
        }

        // Add dates with workouts
        workoutsResult.getOrNull()?.forEach { workout ->
            val instant = Instant.fromEpochMilliseconds(workout.timestamp)
            val date = instant.toLocalDateTime(timeZone).date
            recordedDates.add(date)
        }

        _uiState.update {
            it.copy(recordedDates = recordedDates)
        }
    }

    /**
     * Select date
     */
    fun selectDate(date: LocalDate) {
        if (date == _uiState.value.selectedDate) return

        _uiState.update { it.copy(selectedDate = date) }
        screenModelScope.launch(exceptionHandler) {
            loadSelectedDateData()
        }
    }

    /**
     * Change month
     */
    fun changeMonth(yearMonth: YearMonth) {
        if (yearMonth == _uiState.value.currentYearMonth) return

        _uiState.update { it.copy(currentYearMonth = yearMonth) }
        screenModelScope.launch(exceptionHandler) {
            loadRecordedDates()
        }
    }

    /**
     * Go to previous month
     */
    fun goToPreviousMonth() {
        changeMonth(_uiState.value.currentYearMonth.minusMonths(1))
    }

    /**
     * Go to next month
     */
    fun goToNextMonth() {
        val nextMonth = _uiState.value.currentYearMonth.plusMonths(1)
        if (!nextMonth.isAfter(YearMonth.now())) {
            changeMonth(nextMonth)
        }
    }

    /**
     * Select tab
     */
    fun selectTab(tab: HistoryTab) {
        _uiState.update { it.copy(selectedTab = tab) }
    }

    /**
     * Select graph type
     */
    fun selectGraphType(type: GraphType) {
        _uiState.update { it.copy(graphType = type) }
        if (type == GraphType.RM) {
            loadRmExerciseNames()
        }
    }

    /**
     * Select graph period
     */
    fun selectGraphPeriod(period: GraphPeriod) {
        if (period == _uiState.value.graphPeriod) return
        _uiState.update { it.copy(graphPeriod = period) }
        screenModelScope.launch(exceptionHandler) {
            loadGraphData()
            // Reload RM if currently showing RM
            if (_uiState.value.graphType == GraphType.RM) {
                val uid = userId ?: return@launch
                val exercise = _uiState.value.selectedRmExercise ?: return@launch
                loadRmHistory(uid, exercise)
            }
        }
    }

    /**
     * Load RM exercise names
     */
    private fun loadRmExerciseNames() {
        val uid = userId ?: return
        screenModelScope.launch(exceptionHandler) {
            rmRepository?.getRmExerciseNames(uid)?.onSuccess { names ->
                _uiState.update { state ->
                    state.copy(
                        rmExerciseNames = names,
                        selectedRmExercise = state.selectedRmExercise ?: names.firstOrNull()
                    )
                }
                // Auto-load first exercise data
                val selected = _uiState.value.selectedRmExercise
                if (selected != null) {
                    loadRmHistory(uid, selected)
                }
            }
        }
    }

    /**
     * Select RM exercise
     */
    fun selectRmExercise(name: String) {
        _uiState.update { it.copy(selectedRmExercise = name) }
        val uid = userId ?: return
        screenModelScope.launch(exceptionHandler) {
            loadRmHistory(uid, name)
        }
    }

    /**
     * Load RM history for selected exercise (period-aware)
     */
    private suspend fun loadRmHistory(uid: String, exerciseName: String) {
        val period = _uiState.value.graphPeriod
        val today = Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault()).date
        val startDate = today.minus(DatePeriod(days = period.days - 1))

        rmRepository?.getRmHistory(uid, exerciseName)?.onSuccess { records ->
            val timeZone = TimeZone.currentSystemDefault()
            val dailyRmData = records
                .sortedBy { it.timestamp }
                .takeLast(period.rmLimit)
                .map { record ->
                    val instant = Instant.fromEpochMilliseconds(record.timestamp)
                    val date = instant.toLocalDateTime(timeZone).date
                    GraphDataPoint(
                        date = date,
                        value = record.weight,
                        label = "${record.reps}回 ${record.weight.toInt()}kg"
                    )
                }
                .filter { it.date >= startDate }

            val rmData = if (period.needsAggregation) {
                val buckets = generateDatePoints(startDate, today, period)
                aggregateData(dailyRmData, buckets, period, today)
            } else {
                dailyRmData
            }
            _uiState.update { it.copy(rmData = rmData) }
        }
    }

    /**
     * Clear error
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
