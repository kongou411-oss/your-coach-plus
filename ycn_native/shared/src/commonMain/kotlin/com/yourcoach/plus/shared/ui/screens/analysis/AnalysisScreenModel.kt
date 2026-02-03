package com.yourcoach.plus.shared.ui.screens.analysis

import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
import com.yourcoach.plus.shared.domain.model.*
import com.yourcoach.plus.shared.domain.repository.*
import com.yourcoach.plus.shared.domain.service.GeminiService
import com.yourcoach.plus.shared.util.DateUtil
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Analysis tab
 */
enum class AnalysisTab {
    ANALYSIS,  // Analysis tab
    HISTORY    // History tab
}

/**
 * Analysis screen UI state
 */
data class AnalysisUiState(
    val isLoading: Boolean = false,
    val isAnalyzing: Boolean = false,
    val aiAnalysis: String? = null,
    val conversationHistory: List<ConversationEntry> = emptyList(),
    val savedReports: List<AnalysisReport> = emptyList(),
    val selectedReport: AnalysisReport? = null,
    val creditInfo: UserCreditInfo? = null,
    val userQuestion: String = "",
    val isQaLoading: Boolean = false,
    val activeTab: AnalysisTab = AnalysisTab.ANALYSIS,
    val error: String? = null,
    // Analysis data
    val score: DailyScore? = null,
    val meals: List<Meal> = emptyList(),
    val workouts: List<Workout> = emptyList(),
    val userProfile: UserProfile? = null,
    val condition: Condition? = null,
    val isRestDay: Boolean = false
) {
    val totalCredits: Int get() = creditInfo?.totalCredits ?: 0
}

/**
 * Analysis screen ScreenModel (Voyager)
 */
class AnalysisScreenModel(
    private val authRepository: AuthRepository,
    private val userRepository: UserRepository,
    private val mealRepository: MealRepository,
    private val workoutRepository: WorkoutRepository,
    private val conditionRepository: ConditionRepository? = null,
    private val scoreRepository: ScoreRepository? = null,
    private val geminiService: GeminiService? = null,
    private val analysisRepository: AnalysisRepository? = null
) : ScreenModel {

    private val _uiState = MutableStateFlow(AnalysisUiState())
    val uiState: StateFlow<AnalysisUiState> = _uiState.asStateFlow()

    init {
        loadAllData()
    }

    /**
     * Load all data
     */
    private fun loadAllData() {
        screenModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            val userId = authRepository.getCurrentUserId()
            if (userId == null) {
                _uiState.update { it.copy(isLoading = false, error = "Not logged in") }
                return@launch
            }

            val today = DateUtil.todayString()

            // Load credit info
            loadCreditInfo(userId)

            // Load user profile
            userRepository.getUser(userId)
                .onSuccess { user ->
                    _uiState.update { it.copy(userProfile = user?.profile) }
                }

            // Load meals
            mealRepository.getMealsForDate(userId, today)
                .onSuccess { meals ->
                    _uiState.update { it.copy(meals = meals) }
                }

            // Load workouts
            workoutRepository.getWorkoutsForDate(userId, today)
                .onSuccess { workouts ->
                    _uiState.update { it.copy(workouts = workouts) }
                }

            // Load score
            scoreRepository?.getScoreForDate(userId, today)
                ?.onSuccess { score ->
                    _uiState.update { it.copy(score = score) }
                }

            // Load condition
            conditionRepository?.getCondition(userId, today)
                ?.onSuccess { condition ->
                    _uiState.update { it.copy(condition = condition) }
                }

            // Load rest day status
            scoreRepository?.getRestDayStatus(userId, today)
                ?.onSuccess { isRestDay ->
                    _uiState.update { it.copy(isRestDay = isRestDay) }
                }

            _uiState.update { it.copy(isLoading = false) }
        }
    }

    /**
     * Load credit info
     */
    private fun loadCreditInfo(userId: String) {
        screenModelScope.launch {
            analysisRepository?.getCreditInfo(userId)
                ?.onSuccess { info ->
                    _uiState.update { it.copy(creditInfo = info) }
                }
                ?.onFailure { e ->
                    _uiState.update { it.copy(error = "Failed to load credit info") }
                }
        }
    }

    /**
     * Generate AI analysis
     */
    fun generateAnalysis() {
        val userId = authRepository.getCurrentUserId() ?: return
        val state = _uiState.value
        val creditInfo = state.creditInfo

        // Credit check
        if (creditInfo == null || creditInfo.totalCredits <= 0) {
            _uiState.update { it.copy(error = "Insufficient credits for analysis") }
            return
        }

        screenModelScope.launch {
            _uiState.update { it.copy(isAnalyzing = true, aiAnalysis = null, error = null) }

            try {
                val profile = state.userProfile
                val targetCalories = profile?.targetCalories ?: 2000
                val targetProtein = profile?.targetProtein ?: 120f
                val targetFat = profile?.targetFat ?: 60f
                val targetCarbs = profile?.targetCarbs ?: 250f

                // Calculate score if not available
                val effectiveScore = state.score ?: calculateScoreFromMeals(
                    userId = userId,
                    meals = state.meals,
                    workouts = state.workouts,
                    targetCalories = targetCalories,
                    targetProtein = targetProtein,
                    targetFat = targetFat,
                    targetCarbs = targetCarbs
                )

                // Build analysis prompt
                val prompt = buildAnalysisPrompt(
                    profile = profile,
                    score = effectiveScore,
                    meals = state.meals,
                    workouts = state.workouts,
                    isRestDay = state.isRestDay
                )

                // Call Gemini service
                val response = geminiService?.sendMessageWithCredit(
                    userId = userId,
                    message = prompt,
                    conversationHistory = emptyList(),
                    userProfile = profile
                )

                if (response?.success == true && response.text != null) {
                    _uiState.update {
                        it.copy(
                            aiAnalysis = response.text,
                            isAnalyzing = false,
                            creditInfo = it.creditInfo?.copy(
                                totalCredits = response.remainingCredits ?: it.creditInfo.totalCredits
                            )
                        )
                    }

                    // Auto-save report
                    autoSaveReport(userId, response.text)
                } else {
                    _uiState.update {
                        it.copy(
                            error = response?.error ?: "Analysis failed",
                            isAnalyzing = false
                        )
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        error = e.message ?: "Analysis failed",
                        isAnalyzing = false
                    )
                }
            }
        }
    }

    /**
     * Calculate score from meals
     */
    private fun calculateScoreFromMeals(
        userId: String,
        meals: List<Meal>,
        workouts: List<Workout>,
        targetCalories: Int,
        targetProtein: Float,
        targetFat: Float,
        targetCarbs: Float
    ): DailyScore {
        val totalCalories = meals.sumOf { it.totalCalories }.toFloat()
        val totalProtein = meals.sumOf { it.totalProtein.toDouble() }.toFloat()
        val totalFat = meals.sumOf { it.totalFat.toDouble() }.toFloat()
        val totalCarbs = meals.sumOf { it.totalCarbs.toDouble() }.toFloat()

        fun calcScore(actual: Float, target: Float): Int {
            if (target <= 0) return 100
            val ratio = actual / target
            return when {
                ratio in 0.9f..1.1f -> 100
                ratio in 0.8f..1.2f -> 80
                ratio in 0.7f..1.3f -> 60
                else -> 40
            }
        }

        return DailyScore(
            userId = userId,
            date = DateUtil.todayString(),
            foodScore = ((calcScore(totalProtein, targetProtein) + calcScore(totalFat, targetFat) + calcScore(totalCarbs, targetCarbs)) / 3),
            exerciseScore = if (workouts.isNotEmpty()) 80 else 0,
            calorieScore = calcScore(totalCalories, targetCalories.toFloat()),
            proteinScore = calcScore(totalProtein, targetProtein),
            fatScore = calcScore(totalFat, targetFat),
            carbsScore = calcScore(totalCarbs, targetCarbs),
            totalCalories = totalCalories,
            totalProtein = totalProtein,
            totalFat = totalFat,
            totalCarbs = totalCarbs
        )
    }

    /**
     * Build analysis prompt
     */
    private fun buildAnalysisPrompt(
        profile: UserProfile?,
        score: DailyScore,
        meals: List<Meal>,
        workouts: List<Workout>,
        isRestDay: Boolean
    ): String {
        return buildString {
            appendLine("Please analyze today's nutrition and fitness data and provide feedback.")
            appendLine()
            appendLine("=== User Profile ===")
            appendLine("Goal: ${profile?.goal?.name ?: "MAINTAIN"}")
            appendLine("Target Calories: ${profile?.targetCalories ?: 2000}")
            appendLine("Target Protein: ${profile?.targetProtein ?: 120}g")
            appendLine("Target Fat: ${profile?.targetFat ?: 60}g")
            appendLine("Target Carbs: ${profile?.targetCarbs ?: 250}g")
            appendLine()
            appendLine("=== Today's Results ===")
            appendLine("Calories: ${score.totalCalories.toInt()} kcal")
            appendLine("Protein: ${score.totalProtein.toInt()}g")
            appendLine("Fat: ${score.totalFat.toInt()}g")
            appendLine("Carbs: ${score.totalCarbs.toInt()}g")
            appendLine()
            appendLine("=== Meals ===")
            meals.forEach { meal ->
                appendLine("- ${meal.name ?: meal.type.name}: ${meal.totalCalories}kcal")
            }
            appendLine()
            appendLine("=== Workouts ===")
            if (isRestDay) {
                appendLine("Rest day")
            } else if (workouts.isEmpty()) {
                appendLine("No workouts recorded")
            } else {
                workouts.forEach { workout ->
                    appendLine("- ${workout.name ?: workout.type.name}: ${workout.totalDuration}min, ${workout.totalCaloriesBurned}kcal burned")
                }
            }
            appendLine()
            appendLine("Please provide:")
            appendLine("1. Overall evaluation (grade: S/A/B/C/D)")
            appendLine("2. Good points (2-3 items)")
            appendLine("3. Areas for improvement (2-3 items with suggestions)")
            appendLine("4. Advice for tomorrow")
        }
    }

    /**
     * Auto-save report
     */
    private fun autoSaveReport(userId: String, analysisText: String) {
        screenModelScope.launch {
            try {
                val today = DateUtil.todayString()
                val report = AnalysisReport(
                    title = "$today Analysis",
                    content = analysisText,
                    conversationHistory = emptyList(),
                    periodStart = today,
                    periodEnd = today,
                    reportType = ReportType.DAILY
                )

                analysisRepository?.saveReport(userId, report)
                    ?.onSuccess { reportId ->
                        val savedReport = report.copy(id = reportId)
                        _uiState.update { it.copy(selectedReport = savedReport) }
                        loadSavedReports()
                    }
            } catch (e: Exception) {
                // Log error but don't show to user
            }
        }
    }

    /**
     * Send question
     */
    fun sendQuestion(question: String) {
        val userId = authRepository.getCurrentUserId() ?: return
        val state = _uiState.value

        if (question.isBlank()) return

        // Credit check
        if (state.creditInfo == null || state.creditInfo.totalCredits <= 0) {
            _uiState.update { it.copy(error = "Insufficient credits") }
            return
        }

        screenModelScope.launch {
            // Add user's question to history
            val newHistory = state.conversationHistory + ConversationEntry(
                type = "user",
                content = question
            )
            _uiState.update {
                it.copy(
                    conversationHistory = newHistory,
                    userQuestion = "",
                    isQaLoading = true
                )
            }

            try {
                val contextPrompt = buildString {
                    appendLine("Please answer the following question about the analysis report.")
                    appendLine()
                    state.aiAnalysis?.let {
                        appendLine("=== Analysis Report ===")
                        appendLine(it)
                        appendLine()
                    }
                    appendLine("=== User's Question ===")
                    appendLine(question)
                }

                val response = geminiService?.sendMessageWithCredit(
                    userId = userId,
                    message = contextPrompt,
                    conversationHistory = emptyList(),
                    userProfile = state.userProfile
                )

                if (response?.success == true && response.text != null) {
                    val updatedHistory = newHistory + ConversationEntry(
                        type = "ai",
                        content = response.text
                    )
                    _uiState.update {
                        it.copy(
                            conversationHistory = updatedHistory,
                            isQaLoading = false,
                            creditInfo = it.creditInfo?.copy(
                                totalCredits = response.remainingCredits ?: it.creditInfo.totalCredits
                            )
                        )
                    }
                } else {
                    _uiState.update {
                        it.copy(
                            error = response?.error ?: "Failed to get response",
                            isQaLoading = false
                        )
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        error = e.message ?: "Failed to send question",
                        isQaLoading = false
                    )
                }
            }
        }
    }

    /**
     * Update question text
     */
    fun updateQuestion(question: String) {
        _uiState.update { it.copy(userQuestion = question) }
    }

    /**
     * Save report
     */
    fun saveReport(title: String) {
        val userId = authRepository.getCurrentUserId() ?: return
        val state = _uiState.value
        val aiAnalysis = state.aiAnalysis ?: return

        screenModelScope.launch {
            val today = DateUtil.todayString()
            val report = AnalysisReport(
                title = title,
                content = aiAnalysis,
                conversationHistory = state.conversationHistory,
                periodStart = today,
                periodEnd = today,
                reportType = ReportType.DAILY
            )

            analysisRepository?.saveReport(userId, report)
                ?.onSuccess {
                    loadSavedReports()
                    _uiState.update { it.copy(activeTab = AnalysisTab.HISTORY) }
                }
                ?.onFailure { error ->
                    _uiState.update { it.copy(error = error.message) }
                }
        }
    }

    /**
     * Load saved reports
     */
    fun loadSavedReports() {
        val userId = authRepository.getCurrentUserId() ?: return
        screenModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            analysisRepository?.getReports(userId)
                ?.onSuccess { reports ->
                    _uiState.update {
                        it.copy(
                            savedReports = reports,
                            isLoading = false
                        )
                    }
                }
                ?.onFailure { error ->
                    _uiState.update {
                        it.copy(
                            error = error.message,
                            isLoading = false
                        )
                    }
                }
        }
    }

    /**
     * Select report
     */
    fun selectReport(report: AnalysisReport?) {
        _uiState.update {
            it.copy(
                selectedReport = report,
                aiAnalysis = report?.content,
                conversationHistory = report?.conversationHistory ?: emptyList()
            )
        }
    }

    /**
     * Delete report
     */
    fun deleteReport(reportId: String) {
        val userId = authRepository.getCurrentUserId() ?: return
        screenModelScope.launch {
            analysisRepository?.deleteReport(userId, reportId)
                ?.onSuccess {
                    loadSavedReports()
                    if (_uiState.value.selectedReport?.id == reportId) {
                        _uiState.update { it.copy(selectedReport = null) }
                    }
                }
                ?.onFailure { error ->
                    _uiState.update { it.copy(error = error.message) }
                }
        }
    }

    /**
     * Switch tab
     */
    fun switchTab(tab: AnalysisTab) {
        _uiState.update { it.copy(activeTab = tab) }
        if (tab == AnalysisTab.HISTORY && _uiState.value.savedReports.isEmpty()) {
            loadSavedReports()
        }
    }

    /**
     * Clear analysis
     */
    fun clearAnalysis() {
        _uiState.update {
            it.copy(
                aiAnalysis = null,
                conversationHistory = emptyList(),
                selectedReport = null
            )
        }
    }

    /**
     * Clear error
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
