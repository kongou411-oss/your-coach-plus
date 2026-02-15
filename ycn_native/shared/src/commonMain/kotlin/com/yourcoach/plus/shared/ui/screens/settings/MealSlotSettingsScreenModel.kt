package com.yourcoach.plus.shared.ui.screens.settings

import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
import com.yourcoach.plus.shared.domain.model.MealSlotConfig
import com.yourcoach.plus.shared.domain.model.TrainingStyle
import com.yourcoach.plus.shared.domain.model.UserProfile
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.UserRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.launch

data class MealSlotSettingsUiState(
    val isLoading: Boolean = true,
    val isSaving: Boolean = false,
    val mealsPerDay: Int = 5,
    val wakeUpTime: String = "07:00",
    val sleepTime: String = "23:00",
    val trainingTime: String = "17:00",
    val trainingAfterMeal: Int? = 3,
    val trainingDuration: Int = 120,
    val trainingStyle: TrainingStyle = TrainingStyle.PUMP,
    val saveSuccess: Boolean = false,
    val successMessage: String? = null,
    val error: String? = null
)

class MealSlotSettingsScreenModel(
    private val authRepository: AuthRepository,
    private val userRepository: UserRepository
) : ScreenModel {

    private val _uiState = MutableStateFlow(MealSlotSettingsUiState())
    val uiState: StateFlow<MealSlotSettingsUiState> = _uiState.asStateFlow()

    private val exceptionHandler = CoroutineExceptionHandler { _, throwable ->
        println("MealSlotSettingsScreenModel: ${throwable.message}")
        _uiState.update { it.copy(isLoading = false, error = "エラーが発生しました") }
    }

    private var currentProfile: UserProfile? = null

    init {
        loadSettings()
    }

    private fun loadSettings() {
        screenModelScope.launch(exceptionHandler) {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            userRepository.getUser(userId)
                .onSuccess { user ->
                    val p = user?.profile
                    currentProfile = p
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            mealsPerDay = p?.mealsPerDay ?: 5,
                            wakeUpTime = p?.wakeUpTime ?: "07:00",
                            sleepTime = p?.sleepTime ?: "23:00",
                            trainingTime = p?.trainingTime ?: "17:00",
                            trainingAfterMeal = p?.trainingAfterMeal,
                            trainingDuration = p?.trainingDuration ?: 120,
                            trainingStyle = p?.trainingStyle ?: TrainingStyle.PUMP
                        )
                    }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(isLoading = false, error = e.message) }
                }
        }
    }

    fun updateMealsPerDay(value: Int) { _uiState.update { it.copy(mealsPerDay = value) } }
    fun updateWakeUpTime(value: String) { _uiState.update { it.copy(wakeUpTime = value) } }
    fun updateSleepTime(value: String) { _uiState.update { it.copy(sleepTime = value) } }
    fun updateTrainingTime(value: String) { _uiState.update { it.copy(trainingTime = value) } }
    fun updateTrainingAfterMeal(value: Int?) { _uiState.update { it.copy(trainingAfterMeal = value) } }
    fun updateTrainingDuration(value: Int) { _uiState.update { it.copy(trainingDuration = value) } }
    fun updateTrainingStyle(style: TrainingStyle) { _uiState.update { it.copy(trainingStyle = style) } }
    fun clearError() { _uiState.update { it.copy(error = null) } }
    fun clearSuccessMessage() { _uiState.update { it.copy(successMessage = null) } }

    fun generateTimelineRoutine() {
        val state = _uiState.value
        val newConfig = MealSlotConfig.createTimelineRoutine(
            mealsPerDay = state.mealsPerDay,
            trainingAfterMeal = state.trainingAfterMeal
        )
        // Save the generated config along with timeline settings
        saveAllSettings(mealSlotConfig = newConfig)
        _uiState.update { it.copy(successMessage = "タイムラインを生成しました") }
    }

    fun resetToDefault() {
        _uiState.update {
            it.copy(
                mealsPerDay = 5,
                wakeUpTime = "07:00",
                sleepTime = "23:00",
                trainingTime = "17:00",
                trainingAfterMeal = 3,
                trainingDuration = 120,
                trainingStyle = TrainingStyle.PUMP,
                successMessage = "デフォルト設定に戻しました"
            )
        }
        saveSettings()
    }

    fun saveSettings() {
        saveAllSettings(mealSlotConfig = null)
    }

    private fun saveAllSettings(mealSlotConfig: MealSlotConfig?) {
        screenModelScope.launch(exceptionHandler) {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            _uiState.update { it.copy(isSaving = true) }

            val s = _uiState.value
            val updatedProfile = (currentProfile ?: UserProfile()).copy(
                mealsPerDay = s.mealsPerDay,
                wakeUpTime = s.wakeUpTime,
                sleepTime = s.sleepTime,
                trainingTime = s.trainingTime,
                trainingAfterMeal = s.trainingAfterMeal,
                trainingDuration = s.trainingDuration,
                trainingStyle = s.trainingStyle,
                mealSlotConfig = mealSlotConfig ?: currentProfile?.mealSlotConfig
            )

            userRepository.updateProfile(userId, updatedProfile)
                .onSuccess {
                    currentProfile = updatedProfile
                    _uiState.update { it.copy(isSaving = false, saveSuccess = true) }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(isSaving = false, error = "保存に失敗しました: ${e.message}") }
                }
        }
    }
}
