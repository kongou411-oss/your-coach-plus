package com.yourcoach.plus.shared.ui.screens.settings

import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
import com.yourcoach.plus.shared.domain.model.*
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.UserRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.launch

data class ProfileEditUiState(
    val isLoading: Boolean = true,
    val isSaving: Boolean = false,
    val nickname: String = "",
    val age: String = "",
    val gender: Gender = Gender.MALE,
    val height: String = "",
    val weight: String = "",
    val bodyFatPercentage: String = "",
    val targetWeight: String = "",
    val activityLevel: ActivityLevel = ActivityLevel.DESK_WORK,
    val goal: FitnessGoal = FitnessGoal.MAINTAIN,
    val mealsPerDay: Int = 5,
    val proteinRatio: Int = 30,
    val fatRatio: Int = 25,
    val carbRatio: Int = 45,
    val calorieAdjustment: Int = 0,
    val budgetTier: Int = 2,
    val saveSuccess: Boolean = false,
    val error: String? = null
)

class ProfileEditScreenModel(
    private val authRepository: AuthRepository,
    private val userRepository: UserRepository
) : ScreenModel {

    private val _uiState = MutableStateFlow(ProfileEditUiState())
    val uiState: StateFlow<ProfileEditUiState> = _uiState.asStateFlow()

    private val exceptionHandler = CoroutineExceptionHandler { _, throwable ->
        println("ProfileEditScreenModel: ${throwable.message}")
        _uiState.update { it.copy(isLoading = false, error = "エラーが発生しました") }
    }

    init {
        loadProfile()
    }

    private fun loadProfile() {
        screenModelScope.launch(exceptionHandler) {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            userRepository.getUser(userId)
                .onSuccess { user ->
                    val p = user?.profile
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            nickname = p?.nickname ?: "",
                            age = p?.age?.toString() ?: "",
                            gender = p?.gender ?: Gender.MALE,
                            height = p?.height?.toString() ?: "",
                            weight = p?.weight?.toString() ?: "",
                            bodyFatPercentage = p?.bodyFatPercentage?.toString() ?: "",
                            targetWeight = p?.targetWeight?.toString() ?: "",
                            activityLevel = p?.activityLevel ?: ActivityLevel.DESK_WORK,
                            goal = p?.goal ?: FitnessGoal.MAINTAIN,
                            mealsPerDay = p?.mealsPerDay ?: 5,
                            proteinRatio = p?.proteinRatioPercent ?: 30,
                            fatRatio = p?.fatRatioPercent ?: 25,
                            carbRatio = p?.carbRatioPercent ?: 45,
                            calorieAdjustment = p?.calorieAdjustment ?: 0,
                            budgetTier = p?.budgetTier ?: 2
                        )
                    }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(isLoading = false, error = e.message) }
                }
        }
    }

    fun updateNickname(value: String) { _uiState.update { it.copy(nickname = value) } }
    fun updateAge(value: String) { _uiState.update { it.copy(age = value) } }
    fun updateGender(value: Gender) { _uiState.update { it.copy(gender = value) } }
    fun updateHeight(value: String) { _uiState.update { it.copy(height = value) } }
    fun updateWeight(value: String) { _uiState.update { it.copy(weight = value) } }
    fun updateBodyFatPercentage(value: String) { _uiState.update { it.copy(bodyFatPercentage = value) } }
    fun updateTargetWeight(value: String) { _uiState.update { it.copy(targetWeight = value) } }
    fun updateActivityLevel(value: ActivityLevel) { _uiState.update { it.copy(activityLevel = value) } }
    fun updateGoal(value: FitnessGoal) {
        val previousGoal = _uiState.value.goal
        if (previousGoal != value) {
            // Android版と一致: 目標変更時にカロリー調整をデフォルト値にリセット
            val defaultAdjustment = when (value) {
                FitnessGoal.LOSE_WEIGHT -> -300   // 減量: -300kcal/日
                FitnessGoal.MAINTAIN -> 0          // 維持・リコンプ: ±0
                FitnessGoal.GAIN_MUSCLE -> 300     // 増量: +300kcal/日
            }
            _uiState.update { it.copy(goal = value, calorieAdjustment = defaultAdjustment) }
        } else {
            _uiState.update { it.copy(goal = value) }
        }
    }
    fun updateMealsPerDay(value: Int) { _uiState.update { it.copy(mealsPerDay = value) } }
    fun updateCalorieAdjustment(value: Int) { _uiState.update { it.copy(calorieAdjustment = value) } }
    fun updateBudgetTier(value: Int) { _uiState.update { it.copy(budgetTier = value) } }

    fun updateProteinRatio(newP: Int) {
        val s = _uiState.value
        val diff = newP - s.proteinRatio
        val newC = (s.carbRatio - diff / 2).coerceIn(10, 60)
        val newF = (s.fatRatio - (diff - diff / 2)).coerceIn(10, 50)
        _uiState.update { it.copy(proteinRatio = newP, carbRatio = newC, fatRatio = newF) }
    }

    fun updateFatRatio(newF: Int) {
        val s = _uiState.value
        val diff = newF - s.fatRatio
        val newC = (s.carbRatio - diff).coerceIn(10, 60)
        _uiState.update { it.copy(fatRatio = newF, carbRatio = newC) }
    }

    fun updateCarbRatio(newC: Int) {
        val s = _uiState.value
        val diff = newC - s.carbRatio
        val newP = (s.proteinRatio - diff).coerceIn(10, 50)
        _uiState.update { it.copy(carbRatio = newC, proteinRatio = newP) }
    }

    fun clearError() { _uiState.update { it.copy(error = null) } }

    fun calculateBmr(): Float? {
        val s = _uiState.value
        val w = s.weight.toFloatOrNull() ?: return null
        val bf = s.bodyFatPercentage.toFloatOrNull()
        if (bf != null && bf > 0 && bf < 100) {
            val lbm = w * (1 - bf / 100)
            return 370 + 21.6f * lbm
        }
        val h = s.height.toFloatOrNull() ?: return null
        val a = s.age.toIntOrNull() ?: return null
        return when (s.gender) {
            Gender.MALE -> 10 * w + 6.25f * h - 5 * a + 5
            Gender.FEMALE -> 10 * w + 6.25f * h - 5 * a - 161
            Gender.OTHER -> 10 * w + 6.25f * h - 5 * a - 78
        }
    }

    fun calculateTdee(): Float? {
        val bmr = calculateBmr() ?: return null
        return bmr * _uiState.value.activityLevel.multiplier
    }

    fun calculateTargetCalories(): Int? {
        val tdee = calculateTdee() ?: return null
        return (tdee + _uiState.value.calorieAdjustment).toInt()
    }

    fun saveProfile() {
        screenModelScope.launch(exceptionHandler) {
            val userId = authRepository.getCurrentUserId() ?: return@launch

            // Android版と一致: "official"ニックネームは公式アカウントのみ許可
            val currentEmail = authRepository.getCurrentUser()?.email
            if (_uiState.value.nickname.lowercase() == "official" && currentEmail != "official@your-coach-plus.com") {
                _uiState.update { it.copy(error = "「official」は予約されたニックネームです") }
                return@launch
            }

            _uiState.update { it.copy(isSaving = true) }

            val s = _uiState.value
            val targetCal = calculateTargetCalories()
            val calcTargetProtein = targetCal?.let { it * s.proteinRatio / 100f / 4f }
            val calcTargetFat = targetCal?.let { it * s.fatRatio / 100f / 9f }
            val calcTargetCarbs = targetCal?.let { it * s.carbRatio / 100f / 4f }

            val profile = UserProfile(
                nickname = s.nickname.takeIf { it.isNotBlank() },
                gender = s.gender,
                age = s.age.toIntOrNull(),
                height = s.height.toFloatOrNull(),
                weight = s.weight.toFloatOrNull(),
                bodyFatPercentage = s.bodyFatPercentage.toFloatOrNull(),
                targetWeight = s.targetWeight.toFloatOrNull(),
                activityLevel = s.activityLevel,
                goal = s.goal,
                targetCalories = targetCal,
                targetProtein = calcTargetProtein,
                targetFat = calcTargetFat,
                targetCarbs = calcTargetCarbs,
                proteinRatioPercent = s.proteinRatio,
                fatRatioPercent = s.fatRatio,
                carbRatioPercent = s.carbRatio,
                mealsPerDay = s.mealsPerDay,
                calorieAdjustment = s.calorieAdjustment,
                budgetTier = s.budgetTier,
                onboardingCompleted = true
            )

            userRepository.updateProfile(userId, profile)
                .onSuccess {
                    _uiState.update { it.copy(isSaving = false, saveSuccess = true) }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(isSaving = false, error = "保存に失敗しました: ${e.message}") }
                }
        }
    }
}
