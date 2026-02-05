package com.yourcoach.plus.shared.ui.screens.auth

import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
import com.yourcoach.plus.shared.domain.model.ActivityLevel
import com.yourcoach.plus.shared.domain.model.FitnessGoal
import com.yourcoach.plus.shared.domain.model.Gender
import com.yourcoach.plus.shared.domain.model.UserProfile
import com.yourcoach.plus.shared.domain.repository.UserRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * プロフィール設定の状態
 */
data class ProfileSetupState(
    val currentStep: Int = 0,
    val totalSteps: Int = 4,
    // Step 0: 基本情報
    val nickname: String = "",
    val age: String = "25",
    val gender: Gender = Gender.MALE,
    val style: String = "一般",
    // Step 1: 体組成
    val height: String = "170",
    val weight: String = "70",
    val bodyFatPercentage: String = "15",
    val targetWeight: String = "70",
    // Step 2: 目標・活動レベル
    val activityLevel: ActivityLevel = ActivityLevel.DESK_WORK,
    val goal: FitnessGoal = FitnessGoal.MAINTAIN,
    val calorieAdjustment: Int = 0,
    val mealsPerDay: Int = 5,
    // PFCバランス
    val proteinRatio: Int = 30,
    val fatRatio: Int = 25,
    val carbRatio: Int = 45,
    // Step 3: 理想目標
    val idealWeight: String = "70",
    val idealBodyFatPercentage: String = "15",
    // UI状態
    val isLoading: Boolean = false,
    val error: String? = null,
    val validationError: String? = null
)

/**
 * プロフィール設定ScreenModel (Voyager)
 */
class ProfileSetupScreenModel(
    private val userRepository: UserRepository
) : ScreenModel {

    private val _state = MutableStateFlow(ProfileSetupState())
    val state: StateFlow<ProfileSetupState> = _state.asStateFlow()

    fun updateNickname(value: String) = _state.update { it.copy(nickname = value, validationError = null) }
    fun updateAge(value: String) = _state.update { it.copy(age = value, validationError = null) }

    fun updateGender(value: Gender) {
        val defaults = when (value) {
            Gender.MALE -> Triple("170", "70", "15")
            Gender.FEMALE -> Triple("158", "55", "25")
            Gender.OTHER -> Triple("165", "62", "20")
        }
        _state.update {
            it.copy(
                gender = value,
                height = defaults.first,
                weight = defaults.second,
                bodyFatPercentage = defaults.third,
                targetWeight = defaults.second,
                idealWeight = defaults.second,
                idealBodyFatPercentage = defaults.third,
                validationError = null
            )
        }
    }

    fun updateStyle(value: String) = _state.update { it.copy(style = value, validationError = null) }
    fun updateHeight(value: String) = _state.update { it.copy(height = value, validationError = null) }
    fun updateWeight(value: String) = _state.update { it.copy(weight = value, validationError = null) }
    fun updateBodyFatPercentage(value: String) = _state.update { it.copy(bodyFatPercentage = value, validationError = null) }
    fun updateTargetWeight(value: String) = _state.update { it.copy(targetWeight = value, validationError = null) }
    fun updateActivityLevel(value: ActivityLevel) = _state.update { it.copy(activityLevel = value, validationError = null) }
    fun updateMealsPerDay(value: Int) = _state.update { it.copy(mealsPerDay = value) }

    fun updateGoal(value: FitnessGoal) {
        val adjustment = when (value) {
            FitnessGoal.LOSE_WEIGHT -> -300
            FitnessGoal.GAIN_MUSCLE -> 300
            else -> 0
        }
        _state.update { it.copy(goal = value, calorieAdjustment = adjustment, validationError = null) }
    }

    fun updateCalorieAdjustment(value: Int) = _state.update { it.copy(calorieAdjustment = value) }

    fun updateProteinRatio(value: Int) {
        val remaining = 100 - value - _state.value.fatRatio
        _state.update { it.copy(proteinRatio = value, carbRatio = remaining.coerceIn(15, 60)) }
    }

    fun updateFatRatio(value: Int) {
        val remaining = 100 - _state.value.proteinRatio - value
        _state.update { it.copy(fatRatio = value, carbRatio = remaining.coerceIn(15, 60)) }
    }

    fun updateIdealWeight(value: String) = _state.update { it.copy(idealWeight = value, validationError = null) }
    fun updateIdealBodyFatPercentage(value: String) = _state.update { it.copy(idealBodyFatPercentage = value, validationError = null) }

    fun nextStep(): Boolean {
        if (!validateCurrentStep()) return false
        if (_state.value.currentStep < _state.value.totalSteps - 1) {
            _state.update { it.copy(currentStep = it.currentStep + 1) }
        }
        return true
    }

    fun previousStep() {
        if (_state.value.currentStep > 0) {
            _state.update { it.copy(currentStep = it.currentStep - 1, validationError = null) }
        }
    }

    private fun validateCurrentStep(): Boolean {
        val s = _state.value
        when (s.currentStep) {
            0 -> {
                if (s.nickname.isBlank()) {
                    _state.update { it.copy(validationError = "ニックネームを入力してください") }
                    return false
                }
                val age = s.age.toIntOrNull()
                if (age == null || age < 10 || age > 120) {
                    _state.update { it.copy(validationError = "年齢は10〜120歳で入力してください") }
                    return false
                }
            }
            1 -> {
                val height = s.height.toFloatOrNull()
                if (height == null || height < 100 || height > 250) {
                    _state.update { it.copy(validationError = "身長は100〜250cmで入力してください") }
                    return false
                }
                val weight = s.weight.toFloatOrNull()
                if (weight == null || weight < 30 || weight > 300) {
                    _state.update { it.copy(validationError = "体重は30〜300kgで入力してください") }
                    return false
                }
                val bf = s.bodyFatPercentage.toFloatOrNull()
                if (bf == null || bf < 3 || bf > 50) {
                    _state.update { it.copy(validationError = "体脂肪率は3〜50%で入力してください") }
                    return false
                }
            }
        }
        return true
    }

    fun saveProfile(userId: String, onComplete: () -> Unit) {
        if (!validateCurrentStep()) return

        screenModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val s = _state.value

                // 一時的なプロファイルを作成してTDEE計算
                val tempProfile = UserProfile(
                    age = s.age.toIntOrNull() ?: 25,
                    gender = s.gender,
                    height = s.height.toFloatOrNull() ?: 170f,
                    weight = s.weight.toFloatOrNull() ?: 70f,
                    activityLevel = s.activityLevel
                )
                val tdee = tempProfile.calculateTDEE()
                val targetCalories = tdee?.let { (it + s.calorieAdjustment).toInt() }

                // PFC比率からグラム数を計算
                val calcTargetProtein = targetCalories?.let { cal ->
                    (cal * s.proteinRatio / 100f / 4f)
                }
                val calcTargetFat = targetCalories?.let { cal ->
                    (cal * s.fatRatio / 100f / 9f)
                }
                val calcTargetCarbs = targetCalories?.let { cal ->
                    (cal * s.carbRatio / 100f / 4f)
                }

                val profile = UserProfile(
                    nickname = s.nickname,
                    age = s.age.toIntOrNull() ?: 25,
                    gender = s.gender,
                    style = s.style,
                    height = s.height.toFloatOrNull() ?: 170f,
                    weight = s.weight.toFloatOrNull() ?: 70f,
                    bodyFatPercentage = s.bodyFatPercentage.toFloatOrNull() ?: 15f,
                    targetWeight = s.targetWeight.toFloatOrNull(),
                    activityLevel = s.activityLevel,
                    goal = s.goal,
                    targetCalories = targetCalories,
                    targetProtein = calcTargetProtein,
                    targetFat = calcTargetFat,
                    targetCarbs = calcTargetCarbs,
                    calorieAdjustment = s.calorieAdjustment,
                    mealsPerDay = s.mealsPerDay,
                    proteinRatioPercent = s.proteinRatio,
                    fatRatioPercent = s.fatRatio,
                    carbRatioPercent = s.carbRatio,
                    idealWeight = s.idealWeight.toFloatOrNull(),
                    idealBodyFatPercentage = s.idealBodyFatPercentage.toFloatOrNull(),
                    onboardingCompleted = true
                )

                userRepository.updateProfile(userId, profile)
                    .onSuccess {
                        _state.update { it.copy(isLoading = false) }
                        onComplete()
                    }
                    .onFailure { e ->
                        _state.update { it.copy(isLoading = false, error = e.message ?: "プロフィールの保存に失敗しました") }
                    }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = e.message ?: "プロフィールの保存に失敗しました") }
            }
        }
    }

    fun clearError() = _state.update { it.copy(error = null, validationError = null) }
}
