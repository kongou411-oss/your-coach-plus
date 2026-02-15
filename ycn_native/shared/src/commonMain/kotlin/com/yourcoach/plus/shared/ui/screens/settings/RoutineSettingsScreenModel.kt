package com.yourcoach.plus.shared.ui.screens.settings

import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
import com.yourcoach.plus.shared.domain.model.MealTemplate
import com.yourcoach.plus.shared.domain.model.RoutineDay
import com.yourcoach.plus.shared.domain.model.RoutineMealTemplate
import com.yourcoach.plus.shared.domain.model.RoutinePattern
import com.yourcoach.plus.shared.domain.model.RoutineWorkoutTemplate
import com.yourcoach.plus.shared.domain.model.SplitTypes
import com.yourcoach.plus.shared.domain.model.WorkoutTemplate
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.MealRepository
import com.yourcoach.plus.shared.domain.repository.RoutineRepository
import com.yourcoach.plus.shared.domain.repository.WorkoutRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.launch
import kotlinx.datetime.Clock

data class RoutineSettingsUiState(
    val isLoading: Boolean = true,
    val isSaving: Boolean = false,
    val pattern: RoutinePattern? = null,
    val days: List<RoutineDay> = emptyList(),
    val mealTemplates: List<MealTemplate> = emptyList(),
    val workoutTemplates: List<WorkoutTemplate> = emptyList(),
    val saveSuccess: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null
)

val DEFAULT_ROUTINE_DAYS = listOf(
    RoutineDay(id = "1", dayNumber = 1, name = "Day 1", splitType = "胸", isRestDay = false),
    RoutineDay(id = "2", dayNumber = 2, name = "Day 2", splitType = "背中", isRestDay = false),
    RoutineDay(id = "3", dayNumber = 3, name = "Day 3", splitType = "休み", isRestDay = true),
    RoutineDay(id = "4", dayNumber = 4, name = "Day 4", splitType = "肩", isRestDay = false),
    RoutineDay(id = "5", dayNumber = 5, name = "Day 5", splitType = "腕", isRestDay = false),
    RoutineDay(id = "6", dayNumber = 6, name = "Day 6", splitType = "脚", isRestDay = false),
    RoutineDay(id = "7", dayNumber = 7, name = "Day 7", splitType = "休み", isRestDay = true)
)

class RoutineSettingsScreenModel(
    private val authRepository: AuthRepository,
    private val routineRepository: RoutineRepository,
    private val mealRepository: MealRepository,
    private val workoutRepository: WorkoutRepository
) : ScreenModel {

    private val _uiState = MutableStateFlow(RoutineSettingsUiState())
    val uiState: StateFlow<RoutineSettingsUiState> = _uiState.asStateFlow()

    private val exceptionHandler = CoroutineExceptionHandler { _, throwable ->
        println("RoutineSettingsScreenModel: ${throwable.message}")
        _uiState.update { it.copy(isLoading = false, error = "エラーが発生しました") }
    }

    private var patternCreatedAt: Long = 0

    init {
        loadData()
    }

    private fun loadData() {
        screenModelScope.launch(exceptionHandler) {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            _uiState.update { it.copy(isLoading = true) }

            routineRepository.getActivePattern(userId)
                .onSuccess { pattern ->
                    if (pattern != null) {
                        patternCreatedAt = pattern.createdAt
                        _uiState.update {
                            it.copy(
                                pattern = pattern,
                                days = pattern.days
                            )
                        }
                    } else {
                        _uiState.update { it.copy(days = DEFAULT_ROUTINE_DAYS) }
                    }
                }
                .onFailure {
                    _uiState.update { it.copy(days = DEFAULT_ROUTINE_DAYS) }
                }

            mealRepository.getMealTemplates(userId)
                .onSuccess { templates ->
                    _uiState.update { it.copy(mealTemplates = templates) }
                }

            workoutRepository.getWorkoutTemplates(userId)
                .onSuccess { templates ->
                    _uiState.update { it.copy(workoutTemplates = templates) }
                }

            _uiState.update { it.copy(isLoading = false) }
        }
    }

    fun updateDay(dayNumber: Int, updates: RoutineDay.() -> RoutineDay) {
        val currentDays = _uiState.value.days.toMutableList()
        val index = currentDays.indexOfFirst { it.dayNumber == dayNumber }
        if (index != -1) {
            currentDays[index] = currentDays[index].updates()
            _uiState.update { it.copy(days = currentDays) }
            autoSave(currentDays)
        }
    }

    fun updateDaySplitType(dayNumber: Int, splitType: String) {
        updateDay(dayNumber) {
            copy(splitType = splitType, isRestDay = splitType == "休み")
        }
    }

    fun toggleRestDay(dayNumber: Int) {
        updateDay(dayNumber) {
            val newIsRest = !isRestDay
            copy(
                isRestDay = newIsRest,
                splitType = if (newIsRest) "休み" else ""
            )
        }
    }

    fun addDay() {
        val currentDays = _uiState.value.days
        if (currentDays.size >= 10) {
            _uiState.update { it.copy(error = "最大10日まで設定できます") }
            return
        }
        val nextDayNumber = currentDays.size + 1
        val newDay = RoutineDay(
            id = nextDayNumber.toString(),
            dayNumber = nextDayNumber,
            name = "Day $nextDayNumber",
            splitType = "",
            isRestDay = false
        )
        val updatedDays = currentDays + newDay
        _uiState.update { it.copy(days = updatedDays) }
        autoSave(updatedDays)
    }

    fun removeDay(dayNumber: Int) {
        val currentDays = _uiState.value.days
        if (currentDays.size <= 2) {
            _uiState.update { it.copy(error = "最小2日は必要です") }
            return
        }
        val updatedDays = currentDays
            .filter { it.dayNumber != dayNumber }
            .mapIndexed { index, day ->
                day.copy(
                    id = (index + 1).toString(),
                    dayNumber = index + 1,
                    name = "Day ${index + 1}"
                )
            }
        _uiState.update { it.copy(days = updatedDays) }
        autoSave(updatedDays)
    }

    fun moveDay(fromIndex: Int, toIndex: Int) {
        val currentDays = _uiState.value.days.toMutableList()
        if (fromIndex < 0 || fromIndex >= currentDays.size ||
            toIndex < 0 || toIndex >= currentDays.size) return

        val day = currentDays.removeAt(fromIndex)
        currentDays.add(toIndex, day)

        val updatedDays = currentDays.mapIndexed { index, d ->
            d.copy(
                id = (index + 1).toString(),
                dayNumber = index + 1,
                name = "Day ${index + 1}"
            )
        }
        _uiState.update { it.copy(days = updatedDays) }
        autoSave(updatedDays)
    }

    fun addMealTemplateToDay(dayNumber: Int, templateId: String) {
        val template = _uiState.value.mealTemplates.find { it.id == templateId } ?: return
        updateDay(dayNumber) {
            val newMeal = RoutineMealTemplate(
                id = Clock.System.now().toEpochMilliseconds().toString(),
                templateId = templateId,
                templateName = template.name,
                totalCalories = template.totalCalories,
                totalProtein = template.totalProtein,
                totalCarbs = template.totalCarbs,
                totalFat = template.totalFat
            )
            copy(meals = meals + newMeal)
        }
    }

    fun removeMealTemplateFromDay(dayNumber: Int, index: Int) {
        updateDay(dayNumber) {
            copy(meals = meals.filterIndexed { i, _ -> i != index })
        }
    }

    fun addWorkoutTemplateToDay(dayNumber: Int, templateId: String) {
        val template = _uiState.value.workoutTemplates.find { it.id == templateId } ?: return
        updateDay(dayNumber) {
            val newWorkout = RoutineWorkoutTemplate(
                id = Clock.System.now().toEpochMilliseconds().toString(),
                templateId = templateId,
                templateName = template.name,
                estimatedDuration = template.estimatedDuration,
                estimatedCaloriesBurned = template.estimatedCalories
            )
            copy(workouts = workouts + newWorkout)
        }
    }

    fun removeWorkoutTemplateFromDay(dayNumber: Int, index: Int) {
        updateDay(dayNumber) {
            copy(workouts = workouts.filterIndexed { i, _ -> i != index })
        }
    }

    fun resetToDefault() {
        _uiState.update { it.copy(days = DEFAULT_ROUTINE_DAYS, successMessage = "デフォルトルーティンに戻しました") }
        autoSave(DEFAULT_ROUTINE_DAYS)
    }

    fun clearError() { _uiState.update { it.copy(error = null) } }
    fun clearSuccessMessage() { _uiState.update { it.copy(successMessage = null) } }

    private fun autoSave(days: List<RoutineDay>) {
        screenModelScope.launch(exceptionHandler) {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            val now = Clock.System.now().toEpochMilliseconds()
            val createdAt = if (patternCreatedAt > 0) patternCreatedAt else now

            val pattern = (_uiState.value.pattern ?: RoutinePattern(userId = userId, name = "マイルーティン", isActive = true))
                .copy(
                    days = days,
                    name = "${days.size}日間分割",
                    description = days.map { if (it.isRestDay) "休" else it.splitType.take(1).ifEmpty { "?" } }.joinToString("→"),
                    createdAt = createdAt,
                    updatedAt = now
                )

            routineRepository.savePattern(userId, pattern)
                .onSuccess { patternId ->
                    if (_uiState.value.pattern == null) {
                        _uiState.update { it.copy(pattern = pattern.copy(id = patternId)) }
                    }
                }
        }
    }
}
