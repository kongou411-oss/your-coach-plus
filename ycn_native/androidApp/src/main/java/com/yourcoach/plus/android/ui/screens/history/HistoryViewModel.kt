package com.yourcoach.plus.android.ui.screens.history

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.yourcoach.plus.shared.domain.model.Condition
import com.yourcoach.plus.shared.domain.model.FitnessGoal
import com.yourcoach.plus.shared.domain.model.Meal
import com.yourcoach.plus.shared.domain.model.RmRecord
import com.yourcoach.plus.shared.domain.model.Workout
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.ConditionRepository
import com.yourcoach.plus.shared.domain.repository.MealRepository
import com.yourcoach.plus.shared.domain.repository.RmRepository
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
    val conditionData: List<GraphDataPoint> = emptyList(),    // コンディションスコア
    // RM data
    val rmData: List<GraphDataPoint> = emptyList(),
    val rmExerciseNames: List<String> = emptyList(),
    val selectedRmExercise: String? = null,
    // グラフ期間
    val graphPeriod: GraphPeriod = GraphPeriod.WEEK,
    // カレンダー用RM記録
    val rmRecordsForDate: List<RmRecord> = emptyList()
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
    CONDITION,  // コンディションスコア
    RM          // RM記録
}

enum class GraphPeriod(val days: Int, val label: String) {
    WEEK(7, "7日"),
    MONTH(30, "1か月"),
    THREE_MONTHS(90, "3か月"),
    SIX_MONTHS(180, "6か月"),
    YEAR(365, "1年");

    val titleSuffix: String get() = when (this) {
        WEEK -> "過去7日間"; MONTH -> "過去1ヶ月"
        THREE_MONTHS -> "過去3ヶ月"; SIX_MONTHS -> "過去6ヶ月"; YEAR -> "過去1年"
    }
    val needsAggregation: Boolean get() = this == THREE_MONTHS || this == SIX_MONTHS || this == YEAR
}

/**
 * 履歴画面のViewModel
 */
class HistoryViewModel(
    private val authRepository: AuthRepository,
    private val userRepository: UserRepository,
    private val mealRepository: MealRepository,
    private val workoutRepository: WorkoutRepository,
    private val conditionRepository: ConditionRepository,
    private val rmRepository: RmRepository
) : ViewModel() {

    companion object {
        private const val TAG = "HistoryViewModel"
    }

    private val _uiState = MutableStateFlow(HistoryUiState())
    val uiState: StateFlow<HistoryUiState> = _uiState.asStateFlow()

    private val userId: String?
        get() = authRepository.getCurrentUserId()

    // RM記録キャッシュ（全期間）
    private var allRmRecords: List<RmRecord> = emptyList()

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
                loadAllRmRecords()
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
     * グラフデータを読み込み（期間対応）
     */
    private suspend fun loadGraphData() {
        val uid = userId ?: return
        val period = _uiState.value.graphPeriod
        val today = LocalDate.now()
        val startDate = today.minusDays((period.days - 1).toLong())

        // 日次データ用の全日付リスト
        val dailyDates = run {
            val days = mutableListOf<LocalDate>()
            var d = startDate
            while (!d.isAfter(today)) {
                days.add(d)
                d = d.plusDays(1)
            }
            days
        }
        val startDateStr = startDate.format(DateTimeFormatter.ISO_LOCAL_DATE)
        val endDateStr = today.format(DateTimeFormatter.ISO_LOCAL_DATE)

        // 食事データを取得
        val mealsResult = mealRepository.getMealsInRange(uid, startDateStr, endDateStr)
        val allMeals = mealsResult.getOrNull() ?: emptyList()

        // 運動データを取得
        val workoutsResult = workoutRepository.getWorkoutsInRange(uid, startDateStr, endDateStr)
        val allWorkouts = workoutsResult.getOrNull() ?: emptyList()

        // コンディションデータを取得
        val conditionsResult = conditionRepository.getConditionsInRange(uid, startDateStr, endDateStr)
        val allConditions = conditionsResult.getOrNull() ?: emptyList()

        // ユーザープロフィールを取得
        val userResult = userRepository.getUser(uid)
        val user = userResult.getOrNull()
        val profile = user?.profile
        val currentWeight = profile?.weight
        val bodyFatPercentage = profile?.bodyFatPercentage
        val fitnessGoal = profile?.goal ?: FitnessGoal.MAINTAIN

        val currentLbm = if (currentWeight != null && currentWeight > 0f && bodyFatPercentage != null && bodyFatPercentage > 0f) {
            currentWeight * (1f - bodyFatPercentage / 100f)
        } else null

        // 日別にデータを集計
        val zone = ZoneId.of("Asia/Tokyo")
        val dailyCalories = mutableListOf<GraphDataPoint>()
        val dailyProteins = mutableListOf<Float>()
        val dailyCarbs = mutableListOf<Float>()
        val dailyFats = mutableListOf<Float>()
        val dailyExercise = mutableListOf<GraphDataPoint>()
        val dailyWeight = mutableListOf<GraphDataPoint>()
        val dailyLbm = mutableListOf<GraphDataPoint>()
        val dailyCondition = mutableListOf<GraphDataPoint>()

        dailyDates.forEach { date ->
            val startOfDay = date.atStartOfDay(zone).toInstant().toEpochMilli()
            val endOfDay = date.plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli()
            val label = formatXAxisLabel(date, period)

            val dayMeals = allMeals.filter { it.timestamp in startOfDay until endOfDay }
            val totalCalories = dayMeals.sumOf { it.totalCalories }
            val totalProtein = dayMeals.sumOf { it.totalProtein.toDouble() }.toFloat()
            val totalCarbs = dayMeals.sumOf { it.totalCarbs.toDouble() }.toFloat()
            val totalFat = dayMeals.sumOf { it.totalFat.toDouble() }.toFloat()

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

            val dateStr = date.format(DateTimeFormatter.ISO_LOCAL_DATE)
            val condition = allConditions.find { it.date == dateStr }
            val conditionScore = condition?.calculateScore()?.toFloat() ?: 0f
            dailyCondition.add(GraphDataPoint(date, conditionScore, label))
        }

        // 集約
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

        // 選択日のRM記録をキャッシュからフィルタ
        val zone = ZoneId.of("Asia/Tokyo")
        val rmRecordsForDate = allRmRecords.filter { record ->
            val recordDate = java.time.Instant.ofEpochMilli(record.timestamp)
                .atZone(zone)
                .toLocalDate()
            recordDate == date
        }

        Log.d(TAG, "loadSelectedDateData: date=$dateStr, meals=${meals.size}, workouts=${workouts.size}, rm=${rmRecordsForDate.size}")

        _uiState.update {
            it.copy(
                meals = meals,
                workouts = workouts,
                rmRecordsForDate = rmRecordsForDate
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
        val today = LocalDate.now()

        // 食事のある日付を追加
        mealsResult.getOrNull()?.forEach { meal ->
            val date = java.time.Instant.ofEpochMilli(meal.timestamp)
                .atZone(zone)
                .toLocalDate()
            if (!date.isAfter(today)) recordedDates.add(date)
        }

        // 運動のある日付を追加
        workoutsResult.getOrNull()?.forEach { workout ->
            val date = java.time.Instant.ofEpochMilli(workout.timestamp)
                .atZone(zone)
                .toLocalDate()
            if (!date.isAfter(today)) recordedDates.add(date)
        }

        // RM記録のある日付を追加
        val monthStart = currentMonth.atDay(1)
        allRmRecords.forEach { record ->
            val date = java.time.Instant.ofEpochMilli(record.timestamp)
                .atZone(zone)
                .toLocalDate()
            if (!date.isBefore(monthStart) && !date.isAfter(today)) {
                recordedDates.add(date)
            }
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
        if (type == GraphType.RM) {
            loadRmExerciseNames()
        }
    }

    /**
     * RM種目名一覧を読み込み（キャッシュから）
     */
    private fun loadRmExerciseNames() {
        val uid = userId ?: return
        viewModelScope.launch {
            try {
                // キャッシュが空なら再読み込み
                if (allRmRecords.isEmpty()) {
                    loadAllRmRecords()
                }
                val names = allRmRecords.map { it.exerciseName }.distinct()
                _uiState.update { state ->
                    state.copy(
                        rmExerciseNames = names,
                        selectedRmExercise = state.selectedRmExercise ?: names.firstOrNull()
                    )
                }
                val selected = _uiState.value.selectedRmExercise
                if (selected != null) {
                    loadRmHistory(uid, selected)
                }
            } catch (e: Exception) {
                Log.e(TAG, "loadRmExerciseNames error", e)
            }
        }
    }

    /**
     * RM種目を選択
     */
    fun selectRmExercise(name: String) {
        _uiState.update { it.copy(selectedRmExercise = name) }
        val uid = userId ?: return
        viewModelScope.launch {
            try {
                loadRmHistory(uid, name)
            } catch (e: Exception) {
                Log.e(TAG, "selectRmExercise error", e)
            }
        }
    }

    /**
     * RM履歴を読み込み（キャッシュから期間対応）
     * RM記録は散発的なため集約せず、実際の記録日をそのまま表示
     */
    private suspend fun loadRmHistory(uid: String, exerciseName: String) {
        val period = _uiState.value.graphPeriod
        val today = LocalDate.now()
        val startDate = today.minusDays((period.days - 1).toLong())
        val zone = ZoneId.of("Asia/Tokyo")

        // キャッシュが空なら再読み込み
        if (allRmRecords.isEmpty()) {
            loadAllRmRecords()
        }

        // キャッシュからフィルタ（複合インデックス不要）
        val records = allRmRecords.filter { it.exerciseName == exerciseName }
        val rmData = records
            .sortedBy { it.timestamp }
            .map { record ->
                val date = java.time.Instant.ofEpochMilli(record.timestamp).atZone(zone).toLocalDate()
                GraphDataPoint(
                    date = date,
                    value = record.weight,
                    label = formatXAxisLabel(date, period)
                )
            }
            .filter { !it.date.isBefore(startDate) && !it.date.isAfter(today) }

        _uiState.update { it.copy(rmData = rmData) }
    }

    /**
     * グラフ期間を切り替え
     */
    fun selectGraphPeriod(period: GraphPeriod) {
        if (period == _uiState.value.graphPeriod) return
        _uiState.update { it.copy(graphPeriod = period) }
        viewModelScope.launch {
            try {
                loadGraphData()
                if (_uiState.value.graphType == GraphType.RM) {
                    val uid = userId ?: return@launch
                    val exercise = _uiState.value.selectedRmExercise ?: return@launch
                    loadRmHistory(uid, exercise)
                }
            } catch (e: Exception) {
                Log.e(TAG, "selectGraphPeriod error", e)
            }
        }
    }

    /**
     * 期間に応じたバケット日付リスト生成
     */
    private fun generateDatePoints(startDate: LocalDate, endDate: LocalDate, period: GraphPeriod): List<LocalDate> {
        return when (period) {
            GraphPeriod.WEEK, GraphPeriod.MONTH -> {
                val days = mutableListOf<LocalDate>()
                var d = startDate
                while (!d.isAfter(endDate)) {
                    days.add(d)
                    d = d.plusDays(1)
                }
                days
            }
            GraphPeriod.THREE_MONTHS, GraphPeriod.SIX_MONTHS -> {
                val weeks = mutableListOf<LocalDate>()
                var d = startDate
                while (!d.isAfter(endDate)) {
                    weeks.add(d)
                    d = d.plusDays(7)
                }
                weeks
            }
            GraphPeriod.YEAR -> {
                val months = mutableListOf<LocalDate>()
                var ym = YearMonth.from(startDate)
                val endYm = YearMonth.from(endDate)
                while (!ym.isAfter(endYm)) {
                    months.add(ym.atDay(1))
                    ym = ym.plusMonths(1)
                }
                months
            }
        }
    }

    /**
     * バケット終了日を取得
     */
    private fun bucketEndDate(bucketStart: LocalDate, period: GraphPeriod, overallEnd: LocalDate): LocalDate {
        val end = when (period) {
            GraphPeriod.WEEK, GraphPeriod.MONTH -> bucketStart
            GraphPeriod.THREE_MONTHS, GraphPeriod.SIX_MONTHS -> bucketStart.plusDays(6)
            GraphPeriod.YEAR -> YearMonth.from(bucketStart).atEndOfMonth()
        }
        return if (end.isAfter(overallEnd)) overallEnd else end
    }

    /**
     * X軸ラベルフォーマット
     */
    private fun formatXAxisLabel(date: LocalDate, period: GraphPeriod): String {
        return when (period) {
            GraphPeriod.WEEK -> "${date.dayOfMonth}"
            GraphPeriod.MONTH -> "${date.monthValue}/${date.dayOfMonth}"
            GraphPeriod.THREE_MONTHS, GraphPeriod.SIX_MONTHS -> "${date.monthValue}/${date.dayOfMonth}"
            GraphPeriod.YEAR -> "${date.monthValue}月"
        }
    }

    /**
     * データをバケットごとに平均集約
     */
    private fun aggregateData(
        dailyData: List<GraphDataPoint>,
        buckets: List<LocalDate>,
        period: GraphPeriod,
        overallEnd: LocalDate
    ): List<GraphDataPoint> {
        return buckets.map { bucketStart ->
            val bucketEnd = bucketEndDate(bucketStart, period, overallEnd)
            val points = dailyData.filter { !it.date.isBefore(bucketStart) && !it.date.isAfter(bucketEnd) && it.value != 0f }
            val avg = if (points.isNotEmpty()) points.map { it.value }.average().toFloat() else 0f
            GraphDataPoint(
                date = bucketStart,
                value = avg,
                label = formatXAxisLabel(bucketStart, period)
            )
        }
    }

    /**
     * 栄養素データの集約
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
            val indices = dailyDates.indices.filter {
                !dailyDates[it].isBefore(bucketStart) && !dailyDates[it].isAfter(bucketEnd)
            }
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
     * 全RM記録を読み込み（キャッシュ用）
     */
    private suspend fun loadAllRmRecords() {
        val uid = userId ?: return
        rmRepository.getAllRmRecords(uid).onSuccess { records ->
            allRmRecords = records
        }
    }

    /**
     * エラーをクリア
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
