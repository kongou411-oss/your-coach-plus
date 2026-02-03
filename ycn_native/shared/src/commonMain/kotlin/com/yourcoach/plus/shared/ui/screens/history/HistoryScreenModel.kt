package com.yourcoach.plus.shared.ui.screens.history

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
import com.yourcoach.plus.shared.domain.repository.WorkoutRepository
import com.yourcoach.plus.shared.util.DateUtil
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
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
    val conditionData: List<GraphDataPoint> = emptyList()
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
    CONDITION
}

/**
 * History screen ScreenModel (Voyager)
 */
class HistoryScreenModel(
    private val authRepository: AuthRepository,
    private val userRepository: UserRepository,
    private val mealRepository: MealRepository,
    private val workoutRepository: WorkoutRepository,
    private val conditionRepository: ConditionRepository? = null
) : ScreenModel {

    private val _uiState = MutableStateFlow(HistoryUiState())
    val uiState: StateFlow<HistoryUiState> = _uiState.asStateFlow()

    private val userId: String?
        get() = authRepository.getCurrentUserId()

    init {
        loadData()
    }

    /**
     * Load data
     */
    fun loadData() {
        screenModelScope.launch {
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
     * Load graph data (past 7 days)
     */
    private suspend fun loadGraphData() {
        val uid = userId ?: return
        val today = Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault()).date
        val dates = (0..6).map { today.minus(DatePeriod(days = it)) }.reversed()
        val startDate = dates.first().toString()
        val endDate = today.toString()

        // Get meal data (7 days)
        val mealsResult = mealRepository.getMealsInRange(uid, startDate, endDate)
        val allMeals = mealsResult.getOrNull() ?: emptyList()

        // Get workout data (7 days)
        val workoutsResult = workoutRepository.getWorkoutsInRange(uid, startDate, endDate)
        val allWorkouts = workoutsResult.getOrNull() ?: emptyList()

        // Get condition data (7 days)
        val conditionsResult = conditionRepository?.getConditionsInRange(uid, startDate, endDate)
        val allConditions = conditionsResult?.getOrNull() ?: emptyList()

        // Get user profile (weight, body fat percentage, goal)
        val userResult = userRepository.getUser(uid)
        val user = userResult.getOrNull()
        val profile = user?.profile
        val currentWeight = profile?.weight
        val bodyFatPercentage = profile?.bodyFatPercentage
        val fitnessGoal = profile?.goal ?: FitnessGoal.MAINTAIN

        // LBM calculation: weight x (1 - body fat percentage/100)
        val currentLbm = if (currentWeight != null && currentWeight > 0f && bodyFatPercentage != null && bodyFatPercentage > 0f) {
            currentWeight * (1f - bodyFatPercentage / 100f)
        } else {
            null
        }

        // Aggregate data by day
        val timeZone = TimeZone.currentSystemDefault()
        val caloriesData = mutableListOf<GraphDataPoint>()
        val nutritionProteins = mutableListOf<Float>()
        val nutritionCarbs = mutableListOf<Float>()
        val nutritionFats = mutableListOf<Float>()
        val exerciseData = mutableListOf<GraphDataPoint>()
        val weightData = mutableListOf<GraphDataPoint>()
        val lbmData = mutableListOf<GraphDataPoint>()
        val conditionData = mutableListOf<GraphDataPoint>()

        dates.forEach { date ->
            val startOfDay = date.atStartOfDayIn(timeZone).toEpochMilliseconds()
            val endOfDay = date.plus(DatePeriod(days = 1)).atStartOfDayIn(timeZone).toEpochMilliseconds()

            // Extract meals for the day
            val dayMeals = allMeals.filter { it.timestamp in startOfDay until endOfDay }
            val totalCalories = dayMeals.sumOf { it.totalCalories }
            val totalProtein = dayMeals.sumOf { it.totalProtein.toDouble() }.toFloat()
            val totalCarbs = dayMeals.sumOf { it.totalCarbs.toDouble() }.toFloat()
            val totalFat = dayMeals.sumOf { it.totalFat.toDouble() }.toFloat()

            caloriesData.add(GraphDataPoint(date, totalCalories.toFloat(), "${date.dayOfMonth}"))
            nutritionProteins.add(totalProtein)
            nutritionCarbs.add(totalCarbs)
            nutritionFats.add(totalFat)

            // Extract workouts for the day
            val dayWorkouts = allWorkouts.filter { it.timestamp in startOfDay until endOfDay }
            val totalBurned = dayWorkouts.sumOf { it.totalCaloriesBurned }
            exerciseData.add(GraphDataPoint(date, totalBurned.toFloat(), "${date.dayOfMonth}"))

            // Weight/LBM apply current value to all days (no history feature)
            if (currentWeight != null && currentWeight > 0f) {
                weightData.add(GraphDataPoint(date, currentWeight, "${date.dayOfMonth}"))
            }
            if (currentLbm != null) {
                lbmData.add(GraphDataPoint(date, currentLbm, "${date.dayOfMonth}"))
            }

            // Condition score for the day
            val dateStr = date.toString()
            val condition = allConditions.find { it.date == dateStr }
            val conditionScore = condition?.calculateScore()?.toFloat() ?: 0f
            conditionData.add(GraphDataPoint(date, conditionScore, "${date.dayOfMonth}"))
        }

        val nutritionData = NutritionGraphData(
            dates = dates,
            proteins = nutritionProteins,
            carbs = nutritionCarbs,
            fats = nutritionFats
        )

        _uiState.update {
            it.copy(
                fitnessGoal = fitnessGoal,
                lbmData = lbmData,
                weightData = weightData,
                caloriesData = caloriesData,
                nutritionData = nutritionData,
                exerciseData = exerciseData,
                conditionData = conditionData
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
        screenModelScope.launch {
            loadSelectedDateData()
        }
    }

    /**
     * Change month
     */
    fun changeMonth(yearMonth: YearMonth) {
        if (yearMonth == _uiState.value.currentYearMonth) return

        _uiState.update { it.copy(currentYearMonth = yearMonth) }
        screenModelScope.launch {
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
    }

    /**
     * Clear error
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
