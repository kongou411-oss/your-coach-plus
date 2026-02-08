package com.yourcoach.plus.shared.ui.screens.settings

import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
import com.yourcoach.plus.shared.domain.model.MealTemplate
import com.yourcoach.plus.shared.domain.model.WorkoutTemplate
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.MealRepository
import com.yourcoach.plus.shared.domain.repository.WorkoutRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.launch

data class TemplateSettingsUiState(
    val isLoading: Boolean = true,
    val mealTemplates: List<MealTemplate> = emptyList(),
    val workoutTemplates: List<WorkoutTemplate> = emptyList(),
    val selectedTabIndex: Int = 0,
    val actionMessage: String? = null,
    val error: String? = null
)

class TemplateSettingsScreenModel(
    private val authRepository: AuthRepository,
    private val mealRepository: MealRepository,
    private val workoutRepository: WorkoutRepository
) : ScreenModel {

    private val _uiState = MutableStateFlow(TemplateSettingsUiState())
    val uiState: StateFlow<TemplateSettingsUiState> = _uiState.asStateFlow()

    private val exceptionHandler = CoroutineExceptionHandler { _, throwable ->
        println("TemplateSettingsScreenModel: ${throwable.message}")
        _uiState.update { it.copy(isLoading = false, error = "エラーが発生しました") }
    }

    init {
        loadTemplates()
    }

    private fun loadTemplates() {
        screenModelScope.launch(exceptionHandler) {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            _uiState.update { it.copy(isLoading = true) }

            val mealResult = mealRepository.getMealTemplates(userId)
            val workoutResult = workoutRepository.getWorkoutTemplates(userId)

            _uiState.update {
                it.copy(
                    isLoading = false,
                    mealTemplates = mealResult.getOrDefault(emptyList()),
                    workoutTemplates = workoutResult.getOrDefault(emptyList())
                )
            }
        }
    }

    fun selectTab(index: Int) {
        _uiState.update { it.copy(selectedTabIndex = index) }
    }

    fun deleteMealTemplate(templateId: String) {
        screenModelScope.launch(exceptionHandler) {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            val name = _uiState.value.mealTemplates.find { it.id == templateId }?.name ?: ""
            mealRepository.deleteMealTemplate(userId, templateId)
                .onSuccess {
                    _uiState.update { it.copy(actionMessage = "「$name」を削除しました") }
                    loadTemplates()
                }
                .onFailure { e ->
                    _uiState.update { it.copy(error = "削除に失敗しました: ${e.message}") }
                }
        }
    }

    fun deleteWorkoutTemplate(templateId: String) {
        screenModelScope.launch(exceptionHandler) {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            val name = _uiState.value.workoutTemplates.find { it.id == templateId }?.name ?: ""
            workoutRepository.deleteWorkoutTemplate(userId, templateId)
                .onSuccess {
                    _uiState.update { it.copy(actionMessage = "「$name」を削除しました") }
                    loadTemplates()
                }
                .onFailure { e ->
                    _uiState.update { it.copy(error = "削除に失敗しました: ${e.message}") }
                }
        }
    }

    fun clearActionMessage() { _uiState.update { it.copy(actionMessage = null) } }
    fun clearError() { _uiState.update { it.copy(error = null) } }
}
