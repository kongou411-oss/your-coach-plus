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
    val proteinRatio: Int = 35,
    val fatRatio: Int = 15,
    val carbRatio: Int = 50,
    val calorieAdjustment: Int = 0,
    val budgetTier: Int = 2,
    // 理想体型
    val idealWeight: String = "",
    val idealBodyFatPercentage: String = "",
    // 食材好み
    val preferredProteinSources: List<String> = emptyList(),
    val preferredCarbSources: List<String> = emptyList(),
    val preferredFatSources: List<String> = emptyList(),
    val avoidFoods: List<String> = emptyList(),
    val allergies: List<String> = emptyList(),
    // 学習データ
    val favoriteFoods: String = "",
    val ngFoods: String = "",
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
                            proteinRatio = p?.proteinRatioPercent ?: 35,
                            fatRatio = p?.fatRatioPercent ?: 15,
                            carbRatio = p?.carbRatioPercent ?: 50,
                            calorieAdjustment = p?.calorieAdjustment ?: 0,
                            budgetTier = p?.budgetTier ?: 2,
                            idealWeight = p?.idealWeight?.toString() ?: "",
                            idealBodyFatPercentage = p?.idealBodyFatPercentage?.toString() ?: "",
                            preferredProteinSources = p?.preferredProteinSources ?: emptyList(),
                            preferredCarbSources = p?.preferredCarbSources ?: emptyList(),
                            preferredFatSources = p?.preferredFatSources ?: emptyList(),
                            avoidFoods = p?.avoidFoods ?: emptyList(),
                            allergies = p?.allergies ?: emptyList(),
                            favoriteFoods = p?.favoriteFoods ?: "",
                            ngFoods = p?.ngFoods ?: ""
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
    fun updateIdealWeight(value: String) { _uiState.update { it.copy(idealWeight = value) } }
    fun updateIdealBodyFatPercentage(value: String) { _uiState.update { it.copy(idealBodyFatPercentage = value) } }
    fun updateFavoriteFoods(value: String) { _uiState.update { it.copy(favoriteFoods = value) } }
    fun updateNgFoods(value: String) { _uiState.update { it.copy(ngFoods = value) } }

    fun addPreferredProteinSource(item: String) { if (item.isNotBlank()) _uiState.update { it.copy(preferredProteinSources = it.preferredProteinSources + item.trim()) } }
    fun removePreferredProteinSource(item: String) { _uiState.update { it.copy(preferredProteinSources = it.preferredProteinSources - item) } }
    fun addPreferredCarbSource(item: String) { if (item.isNotBlank()) _uiState.update { it.copy(preferredCarbSources = it.preferredCarbSources + item.trim()) } }
    fun removePreferredCarbSource(item: String) { _uiState.update { it.copy(preferredCarbSources = it.preferredCarbSources - item) } }
    fun addPreferredFatSource(item: String) { if (item.isNotBlank()) _uiState.update { it.copy(preferredFatSources = it.preferredFatSources + item.trim()) } }
    fun removePreferredFatSource(item: String) { _uiState.update { it.copy(preferredFatSources = it.preferredFatSources - item) } }
    fun addAvoidFood(item: String) { if (item.isNotBlank()) _uiState.update { it.copy(avoidFoods = it.avoidFoods + item.trim()) } }
    fun removeAvoidFood(item: String) { _uiState.update { it.copy(avoidFoods = it.avoidFoods - item) } }
    fun addAllergy(item: String) { if (item.isNotBlank()) _uiState.update { it.copy(allergies = it.allergies + item.trim()) } }
    fun removeAllergy(item: String) { _uiState.update { it.copy(allergies = it.allergies - item) } }

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
                idealWeight = s.idealWeight.toFloatOrNull(),
                idealBodyFatPercentage = s.idealBodyFatPercentage.toFloatOrNull(),
                targetCalories = targetCal,
                targetProtein = calcTargetProtein,
                targetFat = calcTargetFat,
                targetCarbs = calcTargetCarbs,
                proteinRatioPercent = s.proteinRatio,
                fatRatioPercent = s.fatRatio,
                carbRatioPercent = s.carbRatio,
                mealsPerDay = s.mealsPerDay,
                calorieAdjustment = s.calorieAdjustment,
                preferredProteinSources = s.preferredProteinSources,
                preferredCarbSources = s.preferredCarbSources,
                preferredFatSources = s.preferredFatSources,
                avoidFoods = s.avoidFoods,
                allergies = s.allergies,
                favoriteFoods = s.favoriteFoods.takeIf { it.isNotBlank() },
                ngFoods = s.ngFoods.takeIf { it.isNotBlank() },
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
