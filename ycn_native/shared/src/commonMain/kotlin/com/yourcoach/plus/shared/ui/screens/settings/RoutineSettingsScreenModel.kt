package com.yourcoach.plus.shared.ui.screens.settings

import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
import com.yourcoach.plus.shared.domain.model.RoutineDay
import com.yourcoach.plus.shared.domain.model.RoutinePattern
import com.yourcoach.plus.shared.domain.model.SplitTypes
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.RoutineRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.launch

data class RoutineSettingsUiState(
    val isLoading: Boolean = true,
    val isSaving: Boolean = false,
    val pattern: RoutinePattern? = null,
    val days: List<RoutineDay> = emptyList(),
    val saveSuccess: Boolean = false,
    val error: String? = null
)

class RoutineSettingsScreenModel(
    private val authRepository: AuthRepository,
    private val routineRepository: RoutineRepository
) : ScreenModel {

    private val _uiState = MutableStateFlow(RoutineSettingsUiState())
    val uiState: StateFlow<RoutineSettingsUiState> = _uiState.asStateFlow()

    private val exceptionHandler = CoroutineExceptionHandler { _, throwable ->
        println("RoutineSettingsScreenModel: ${throwable.message}")
        _uiState.update { it.copy(isLoading = false, error = "エラーが発生しました") }
    }

    init {
        loadActivePattern()
    }

    private fun loadActivePattern() {
        screenModelScope.launch(exceptionHandler) {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            routineRepository.getActivePattern(userId)
                .onSuccess { pattern ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            pattern = pattern,
                            days = pattern?.days ?: createDefaultDays()
                        )
                    }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(isLoading = false, error = e.message) }
                }
        }
    }

    private fun createDefaultDays(): List<RoutineDay> {
        return (1..7).map { day ->
            RoutineDay(
                id = "day_$day",
                dayNumber = day,
                name = "Day $day",
                splitType = if (day == 7) SplitTypes.REST else "",
                isRestDay = day == 7
            )
        }
    }

    fun updateDaySplitType(dayNumber: Int, splitType: String) {
        val updated = _uiState.value.days.map { day ->
            if (day.dayNumber == dayNumber) {
                day.copy(
                    splitType = splitType,
                    isRestDay = splitType == SplitTypes.REST,
                    name = if (splitType == SplitTypes.REST) "休養日" else "${splitType}の日"
                )
            } else day
        }
        _uiState.update { it.copy(days = updated) }
    }

    fun toggleRestDay(dayNumber: Int) {
        val updated = _uiState.value.days.map { day ->
            if (day.dayNumber == dayNumber) {
                val newIsRest = !day.isRestDay
                day.copy(
                    isRestDay = newIsRest,
                    splitType = if (newIsRest) SplitTypes.REST else "",
                    name = if (newIsRest) "休養日" else "Day ${day.dayNumber}"
                )
            } else day
        }
        _uiState.update { it.copy(days = updated) }
    }

    fun clearError() { _uiState.update { it.copy(error = null) } }

    fun savePattern() {
        screenModelScope.launch(exceptionHandler) {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            _uiState.update { it.copy(isSaving = true) }

            val current = _uiState.value.pattern
            val patternToSave = (current ?: RoutinePattern(userId = userId, name = "マイルーティン", isActive = true))
                .copy(
                    days = _uiState.value.days,
                    updatedAt = kotlinx.datetime.Clock.System.now().toEpochMilliseconds()
                )

            routineRepository.savePattern(userId, patternToSave)
                .onSuccess {
                    _uiState.update { it.copy(isSaving = false, saveSuccess = true) }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(isSaving = false, error = "保存に失敗しました: ${e.message}") }
                }
        }
    }
}
