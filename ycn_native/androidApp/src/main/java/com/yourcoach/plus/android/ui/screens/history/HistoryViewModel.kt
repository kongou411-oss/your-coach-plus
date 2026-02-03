package com.yourcoach.plus.android.ui.screens.history

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.yourcoach.plus.shared.domain.model.Condition
import com.yourcoach.plus.shared.domain.model.FitnessGoal
import com.yourcoach.plus.shared.domain.model.Meal
import com.yourcoach.plus.shared.domain.model.Workout
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.ConditionRepository
import com.yourcoach.plus.shared.domain.repository.MealRepository
import com.yourcoach.plus.shared.domain.repository.UserRepository
import com.yourcoach.plus.shared.domain.repository.WorkoutRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/**
 * グラフ用データポイント
 */
data class GraphDataPoint(
    val date: LocalDate,
    val value: Float,
    val label: String = ""
)

/**
 * 栄養素グラフ用データ（PFC）
 */
data class NutritionGraphData(
    val dates: List<LocalDate>,
    val proteins: List<Float>,
    val carbs: List<Float>,
    val fats: List<Float>
)

/**
 * 履歴画面のUI状態
 */
data class HistoryUiState(
    val isLoading: Boolean = false,
    val selectedDate: LocalDate = LocalDate.now(),
    val currentMonth: YearMonth = YearMonth.now(),
    val meals: List<Meal> = emptyList(),
    val workouts: List<Workout> = emptyList(),
    val recordedDates: Set<LocalDate> = emptySet(),
    val selectedTab: HistoryTab = HistoryTab.CALENDAR,
    val graphType: GraphType = GraphType.LBM,
    val error: String? = null,
    // ユーザー設定
    val fitnessGoal: FitnessGoal = FitnessGoal.MAINTAIN,
    // グラフデータ
    val lbmData: List<GraphDataPoint> = emptyList(),        // LBM（除脂肪体重）
    val weightData: List<GraphDataPoint> = emptyList(),      // 体重（参考用）
    val caloriesData: List<GraphDataPoint> = emptyList(),
    val nutritionData: NutritionGraphData = NutritionGraphData(emptyList(), emptyList(), emptyList(), emptyList()),
    val exerciseData: List<GraphDataPoint> = emptyList(),
    val conditionData: List<GraphDataPoint> = emptyList()    // コンディションスコア
)

enum class HistoryTab {
    CALENDAR,   // カレンダービュー
    GRAPH       // グラフビュー
}

enum class GraphType {
    LBM,        // LBM（除脂肪体重）- 推奨
    WEIGHT,     // 体重
    CALORIES,   // カロリー
    NUTRITION,  // 栄養素（PFC）
    EXERCISE,   // 運動
    CONDITION   // コンディションスコア
}

/**
 * 履歴画面のViewModel
 */
class HistoryViewModel(
    private val authRepository: AuthRepository,
    private val userRepository: UserRepository,
    private val mealRepository: MealRepository,
    private val workoutRepository: WorkoutRepository,
    private val conditionRepository: ConditionRepository
) : ViewModel() {

    companion object {
        private const val TAG = "HistoryViewModel"
    }

    private val _uiState = MutableStateFlow(HistoryUiState())
    val uiState: StateFlow<HistoryUiState> = _uiState.asStateFlow()

    private val userId: String?
        get() = authRepository.getCurrentUserId()

    init {
        loadData()
    }

    /**
     * データを読み込み
     */
    fun loadData() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                loadSelectedDateData()
                loadRecordedDates()
                loadGraphData()
            } catch (e: Exception) {
                Log.e(TAG, "loadData error", e)
                _uiState.update { it.copy(error = e.message ?: "データの読み込みに失敗しました") }
            } finally {
                _uiState.update { it.copy(isLoading = false) }
            }
        }
    }

    /**
     * グラフデータを読み込み（過去7日間）
     */
    private suspend fun loadGraphData() {
        val uid = userId ?: return
        val today = LocalDate.now()
        val dates = (0..6).map { today.minusDays(it.toLong()) }.reversed()
        val startDate = dates.first().format(DateTimeFormatter.ISO_LOCAL_DATE)
        val endDate = today.format(DateTimeFormatter.ISO_LOCAL_DATE)

        // 食事データを取得（7日分）
        val mealsResult = mealRepository.getMealsInRange(uid, startDate, endDate)
        val allMeals = mealsResult.getOrNull() ?: emptyList()

        // 運動データを取得（7日分）
        val workoutsResult = workoutRepository.getWorkoutsInRange(uid, startDate, endDate)
        val allWorkouts = workoutsResult.getOrNull() ?: emptyList()

        // コンディションデータを取得（7日分）
        val conditionsResult = conditionRepository.getConditionsInRange(uid, startDate, endDate)
        val allConditions = conditionsResult.getOrNull() ?: emptyList()

        // ユーザープロフィールを取得（体重、体脂肪率、目標）
        val userResult = userRepository.getUser(uid)
        val user = userResult.getOrNull()
        val profile = user?.profile
        val currentWeight = profile?.weight
        val bodyFatPercentage = profile?.bodyFatPercentage
        val fitnessGoal = profile?.goal ?: FitnessGoal.MAINTAIN

        // LBM計算: 体重 × (1 - 体脂肪率/100)
        val currentLbm = if (currentWeight != null && currentWeight > 0f && bodyFatPercentage != null && bodyFatPercentage > 0f) {
            currentWeight * (1f - bodyFatPercentage / 100f)
        } else {
            null
        }

        // 日別にデータを集計
        val zone = ZoneId.of("Asia/Tokyo")
        val caloriesData = mutableListOf<GraphDataPoint>()
        val nutritionProteins = mutableListOf<Float>()
        val nutritionCarbs = mutableListOf<Float>()
        val nutritionFats = mutableListOf<Float>()
        val exerciseData = mutableListOf<GraphDataPoint>()
        val weightData = mutableListOf<GraphDataPoint>()
        val lbmData = mutableListOf<GraphDataPoint>()
        val conditionData = mutableListOf<GraphDataPoint>()

        dates.forEach { date ->
            val startOfDay = date.atStartOfDay(zone).toInstant().toEpochMilli()
            val endOfDay = date.plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli()

            // その日の食事を抽出
            val dayMeals = allMeals.filter { it.timestamp in startOfDay until endOfDay }
            val totalCalories = dayMeals.sumOf { it.totalCalories }
            val totalProtein = dayMeals.sumOf { it.totalProtein.toDouble() }.toFloat()
            val totalCarbs = dayMeals.sumOf { it.totalCarbs.toDouble() }.toFloat()
            val totalFat = dayMeals.sumOf { it.totalFat.toDouble() }.toFloat()

            caloriesData.add(GraphDataPoint(date, totalCalories.toFloat(), "${date.dayOfMonth}日"))
            nutritionProteins.add(totalProtein)
            nutritionCarbs.add(totalCarbs)
            nutritionFats.add(totalFat)

            // その日の運動を抽出
            val dayWorkouts = allWorkouts.filter { it.timestamp in startOfDay until endOfDay }
            val totalBurned = dayWorkouts.sumOf { it.totalCaloriesBurned }
            exerciseData.add(GraphDataPoint(date, totalBurned.toFloat(), "${date.dayOfMonth}日"))

            // 体重・LBMは現在の値を全日に適用（履歴機能がないため）
            if (currentWeight != null && currentWeight > 0f) {
                weightData.add(GraphDataPoint(date, currentWeight, "${date.dayOfMonth}日"))
            }
            if (currentLbm != null) {
                lbmData.add(GraphDataPoint(date, currentLbm, "${date.dayOfMonth}日"))
            }

            // その日のコンディションスコア
            val dateStr = date.format(DateTimeFormatter.ISO_LOCAL_DATE)
            val condition = allConditions.find { it.date == dateStr }
            val conditionScore = condition?.calculateScore()?.toFloat() ?: 0f
            conditionData.add(GraphDataPoint(date, conditionScore, "${date.dayOfMonth}日"))
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
     * 選択日のデータを読み込み
     */
    private suspend fun loadSelectedDateData() {
        val uid = userId ?: return
        val date = _uiState.value.selectedDate
        val dateStr = date.format(DateTimeFormatter.ISO_LOCAL_DATE)

        // 食事データを取得
        val mealsResult = mealRepository.getMealsForDate(uid, dateStr)
        val meals = mealsResult.getOrNull() ?: emptyList()

        // 運動データを取得
        val workoutsResult = workoutRepository.getWorkoutsForDate(uid, dateStr)
        val workouts = workoutsResult.getOrNull() ?: emptyList()

        Log.d(TAG, "loadSelectedDateData: date=$dateStr, meals=${meals.size}, workouts=${workouts.size}")

        _uiState.update {
            it.copy(
                meals = meals,
                workouts = workouts
            )
        }
    }

    /**
     * 記録がある日付を読み込み（現在の月）
     */
    private suspend fun loadRecordedDates() {
        val uid = userId ?: return
        val currentMonth = _uiState.value.currentMonth
        val startDate = currentMonth.atDay(1).format(DateTimeFormatter.ISO_LOCAL_DATE)
        val endDate = currentMonth.atEndOfMonth().format(DateTimeFormatter.ISO_LOCAL_DATE)

        // 食事と運動のデータを取得
        val mealsResult = mealRepository.getMealsInRange(uid, startDate, endDate)
        val workoutsResult = workoutRepository.getWorkoutsInRange(uid, startDate, endDate)

        val recordedDates = mutableSetOf<LocalDate>()
        val zone = ZoneId.of("Asia/Tokyo")

        // 食事のある日付を追加
        mealsResult.getOrNull()?.forEach { meal ->
            val date = java.time.Instant.ofEpochMilli(meal.timestamp)
                .atZone(zone)
                .toLocalDate()
            recordedDates.add(date)
        }

        // 運動のある日付を追加
        workoutsResult.getOrNull()?.forEach { workout ->
            val date = java.time.Instant.ofEpochMilli(workout.timestamp)
                .atZone(zone)
                .toLocalDate()
            recordedDates.add(date)
        }

        Log.d(TAG, "loadRecordedDates: month=$currentMonth, dates=${recordedDates.size}")

        _uiState.update {
            it.copy(recordedDates = recordedDates)
        }
    }

    /**
     * 日付を選択
     */
    fun selectDate(date: LocalDate) {
        if (date == _uiState.value.selectedDate) return

        _uiState.update { it.copy(selectedDate = date) }
        viewModelScope.launch {
            loadSelectedDateData()
        }
    }

    /**
     * 月を変更
     */
    fun changeMonth(yearMonth: YearMonth) {
        if (yearMonth == _uiState.value.currentMonth) return

        _uiState.update { it.copy(currentMonth = yearMonth) }
        viewModelScope.launch {
            loadRecordedDates()
        }
    }

    /**
     * 前月へ
     */
    fun goToPreviousMonth() {
        changeMonth(_uiState.value.currentMonth.minusMonths(1))
    }

    /**
     * 次月へ
     */
    fun goToNextMonth() {
        val nextMonth = _uiState.value.currentMonth.plusMonths(1)
        if (!nextMonth.isAfter(YearMonth.now())) {
            changeMonth(nextMonth)
        }
    }

    /**
     * タブを切り替え
     */
    fun selectTab(tab: HistoryTab) {
        _uiState.update { it.copy(selectedTab = tab) }
    }

    /**
     * グラフタイプを切り替え
     */
    fun selectGraphType(type: GraphType) {
        _uiState.update { it.copy(graphType = type) }
    }

    /**
     * エラーをクリア
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
