package com.yourcoach.plus.shared.ui.screens.settings

import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
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
    val trainingTime: String = "18:00",
    val trainingAfterMeal: Int? = null,
    val trainingDuration: Int = 120,
    val saveSuccess: Boolean = false,
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
                            trainingTime = p?.trainingTime ?: "18:00",
                            trainingAfterMeal = p?.trainingAfterMeal,
                            trainingDuration = p?.trainingDuration ?: 120
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
    fun clearError() { _uiState.update { it.copy(error = null) } }

    fun saveSettings() {
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
                trainingDuration = s.trainingDuration
            )

            userRepository.updateProfile(userId, updatedProfile)
                .onSuccess {
                    _uiState.update { it.copy(isSaving = false, saveSuccess = true) }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(isSaving = false, error = "保存に失敗しました: ${e.message}") }
                }
        }
    }
}
