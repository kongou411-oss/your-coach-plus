package com.yourcoach.plus.shared.ui.screens.auth

import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
import com.yourcoach.plus.shared.domain.model.*
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.RmRepository
import com.yourcoach.plus.shared.domain.repository.RoutineRepository
import com.yourcoach.plus.shared.domain.repository.UserRepository
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * デフォルトのルーティン日数（7日間・休養日2日含む）
 * Android版と同じ: Day 3, Day 7 が休養日
 */
val DEFAULT_ROUTINE_DAYS = listOf(
    RoutineDay(id = "1", dayNumber = 1, name = "Day 1", splitType = "胸", isRestDay = false),
    RoutineDay(id = "2", dayNumber = 2, name = "Day 2", splitType = "背中", isRestDay = false),
    RoutineDay(id = "3", dayNumber = 3, name = "Day 3", splitType = "休み", isRestDay = true),
    RoutineDay(id = "4", dayNumber = 4, name = "Day 4", splitType = "肩", isRestDay = false),
    RoutineDay(id = "5", dayNumber = 5, name = "Day 5", splitType = "腕", isRestDay = false),
    RoutineDay(id = "6", dayNumber = 6, name = "Day 6", splitType = "脚", isRestDay = false),
    RoutineDay(id = "7", dayNumber = 7, name = "Day 7", splitType = "休み", isRestDay = true)
)

/**
 * プロフィール設定の状態
 */
/**
 * オンボーディングRM入力エントリ
 */
data class RmInputEntry(
    val exerciseName: String,
    val reps: String = "",   // 回数（文字列: ユーザー入力）
    val weight: String = ""  // 重量kg（文字列: ユーザー入力）
)

data class ProfileSetupState(
    // ステップ管理
    val currentStep: Int = 0,
    val totalSteps: Int = 5, // 0:イントロ, 1:プロフィール, 2:ルーティン, 3:RM教育, 4:食事スロット

    // ========== プロフィールデータ ==========
    val nickname: String = "",
    val age: String = "",
    val gender: Gender = Gender.MALE,
    val height: String = "",
    val weight: String = "",
    val bodyFatPercentage: String = "",
    val activityLevel: ActivityLevel = ActivityLevel.DESK_WORK,
    val goal: FitnessGoal = FitnessGoal.MAINTAIN,
    val mealsPerDay: Int = 5,
    val proteinRatio: Int = 30,
    val fatRatio: Int = 25,
    val carbRatio: Int = 45,
    val calorieAdjustment: Int = 0,
    val budgetTier: Int = 2, // 1=節約, 2=標準

    // ========== ルーティンデータ ==========
    val routineDays: List<RoutineDay> = DEFAULT_ROUTINE_DAYS,

    // ========== RM入力データ ==========
    val rmEntries: List<RmInputEntry> = listOf(
        RmInputEntry("バーベルベンチプレス"),
        RmInputEntry("バーベルスクワット"),
        RmInputEntry("デッドリフト")
    ),

    // ========== 食事スロットデータ ==========
    val wakeUpTime: String = "07:00",
    val sleepTime: String = "23:00",
    val trainingTime: String? = "17:00",
    val trainingAfterMeal: Int? = 3,
    val trainingDuration: Int = 120,
    val trainingStyle: TrainingStyle = TrainingStyle.PUMP,
    val mealSlotConfig: MealSlotConfig = MealSlotConfig.createDefault(5),

    // ========== 計算値 ==========
    val bmr: Float? = null,
    val tdee: Float? = null,
    val targetCalories: Int? = null,

    // ========== UI状態 ==========
    val isLoading: Boolean = false,
    val error: String? = null,
    val validationError: String? = null
)

/**
 * プロフィール設定ScreenModel (Voyager)
 * Android版OnboardingScreenと同等の機能を提供
 */
class ProfileSetupScreenModel(
    private val userRepository: UserRepository,
    private val routineRepository: RoutineRepository,
    private val authRepository: AuthRepository,
    private val rmRepository: RmRepository? = null
) : ScreenModel {

    private val _state = MutableStateFlow(ProfileSetupState())
    val state: StateFlow<ProfileSetupState> = _state.asStateFlow()

    // iOS対応: コルーチン例外ハンドラー（NULLクラッシュ防止）
    private val exceptionHandler = CoroutineExceptionHandler { _, throwable ->
        println("ProfileSetupScreenModel: Coroutine exception: ${throwable.message}")
        _state.update { it.copy(isLoading = false, error = "エラーが発生しました") }
    }

    /**
     * 初期化は遅延実行（画面表示後にLaunchedEffectで呼ぶ）
     * iOS対応: Firebase呼び出しを完全にキャッチ
     */
    fun initializeNickname() {
        if (_state.value.nickname.isNotEmpty()) return // 既に設定済み

        // iOSでのクラッシュ防止: 例外ハンドラー付きで非同期実行
        screenModelScope.launch(exceptionHandler) {
            try {
                val currentUser = authRepository.getCurrentUser()
                val initialNickname = currentUser?.email?.substringBefore("@") ?: ""
                if (initialNickname.isNotEmpty()) {
                    _state.update { it.copy(nickname = initialNickname) }
                }
            } catch (e: Throwable) {
                // 初期化エラーは無視（ニックネームは空のまま）
                println("ProfileSetupScreenModel: initializeNickname error: ${e.message}")
            }
        }
    }

    // ========== プロフィール更新 ==========
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
                height = if (it.height.isBlank()) defaults.first else it.height,
                weight = if (it.weight.isBlank()) defaults.second else it.weight,
                bodyFatPercentage = if (it.bodyFatPercentage.isBlank()) defaults.third else it.bodyFatPercentage,
                validationError = null
            )
        }
        recalculateTDEE()
    }

    fun updateHeight(value: String) {
        _state.update { it.copy(height = value, validationError = null) }
        recalculateTDEE()
    }

    fun updateWeight(value: String) {
        _state.update { it.copy(weight = value, validationError = null) }
        recalculateTDEE()
    }

    fun updateBodyFatPercentage(value: String) {
        _state.update { it.copy(bodyFatPercentage = value, validationError = null) }
        recalculateTDEE()
    }

    fun updateActivityLevel(value: ActivityLevel) {
        _state.update { it.copy(activityLevel = value, validationError = null) }
        recalculateTDEE()
    }

    fun updateGoal(value: FitnessGoal) {
        val adjustment = when (value) {
            FitnessGoal.LOSE_WEIGHT -> -300
            FitnessGoal.GAIN_MUSCLE -> 300
            else -> 0
        }
        _state.update { it.copy(goal = value, calorieAdjustment = adjustment, validationError = null) }
        recalculateTDEE()
    }

    fun updateMealsPerDay(value: Int) {
        _state.update {
            it.copy(
                mealsPerDay = value,
                mealSlotConfig = MealSlotConfig.createDefault(value)
            )
        }
    }

    fun updateCalorieAdjustment(value: Int) {
        _state.update { it.copy(calorieAdjustment = value) }
        recalculateTDEE()
    }

    fun updateProteinRatio(value: Int) {
        val s = _state.value
        val diff = value - s.proteinRatio
        val newCarbRatio = (s.carbRatio - diff / 2).coerceIn(10, 60)
        val newFatRatio = (s.fatRatio - diff + diff / 2).coerceIn(10, 50)
        _state.update { it.copy(proteinRatio = value, fatRatio = newFatRatio, carbRatio = newCarbRatio) }
    }

    fun updateFatRatio(value: Int) {
        val s = _state.value
        val diff = value - s.fatRatio
        val newCarbRatio = (s.carbRatio - diff).coerceIn(10, 60)
        _state.update { it.copy(fatRatio = value, carbRatio = newCarbRatio) }
    }

    fun updateCarbRatio(value: Int) {
        val s = _state.value
        val diff = value - s.carbRatio
        val newProteinRatio = (s.proteinRatio - diff).coerceIn(10, 50)
        _state.update { it.copy(carbRatio = value, proteinRatio = newProteinRatio) }
    }

    fun updateBudgetTier(value: Int) = _state.update { it.copy(budgetTier = value) }

    // ========== ルーティン更新 ==========
    fun updateRoutineDays(days: List<RoutineDay>) = _state.update { it.copy(routineDays = days) }

    fun addRoutineDay() {
        val s = _state.value
        if (s.routineDays.size < 10) {
            val nextDayNumber = s.routineDays.size + 1
            val newDay = RoutineDay(
                id = nextDayNumber.toString(),
                dayNumber = nextDayNumber,
                name = "Day $nextDayNumber",
                splitType = "",
                isRestDay = false
            )
            _state.update { it.copy(routineDays = it.routineDays + newDay) }
        }
    }

    fun removeRoutineDay(dayNumber: Int) {
        val s = _state.value
        if (s.routineDays.size > 2 && dayNumber > 2) {
            val newDays = s.routineDays
                .filter { it.dayNumber != dayNumber }
                .mapIndexed { i, d -> d.copy(id = (i + 1).toString(), dayNumber = i + 1, name = "Day ${i + 1}") }
            _state.update { it.copy(routineDays = newDays) }
        }
    }

    fun moveRoutineDayUp(index: Int) {
        val s = _state.value
        if (index > 0) {
            val newDays = s.routineDays.toMutableList()
            val temp = newDays.removeAt(index)
            newDays.add(index - 1, temp)
            _state.update {
                it.copy(routineDays = newDays.mapIndexed { i, d ->
                    d.copy(id = (i + 1).toString(), dayNumber = i + 1, name = "Day ${i + 1}")
                })
            }
        }
    }

    fun moveRoutineDayDown(index: Int) {
        val s = _state.value
        if (index < s.routineDays.size - 1) {
            val newDays = s.routineDays.toMutableList()
            val temp = newDays.removeAt(index)
            newDays.add(index + 1, temp)
            _state.update {
                it.copy(routineDays = newDays.mapIndexed { i, d ->
                    d.copy(id = (i + 1).toString(), dayNumber = i + 1, name = "Day ${i + 1}")
                })
            }
        }
    }

    fun updateRoutineDaySplitType(dayNumber: Int, splitType: String) {
        _state.update { s ->
            s.copy(routineDays = s.routineDays.map {
                if (it.dayNumber == dayNumber) it.copy(splitType = splitType, isRestDay = false) else it
            })
        }
    }

    fun updateRoutineDayRestDay(dayNumber: Int, isRestDay: Boolean) {
        _state.update { s ->
            s.copy(routineDays = s.routineDays.map {
                if (it.dayNumber == dayNumber) it.copy(isRestDay = isRestDay, splitType = if (isRestDay) "休み" else it.splitType) else it
            })
        }
    }

    // ========== RM入力更新 ==========
    fun updateRmEntryReps(index: Int, reps: String) {
        _state.update { s ->
            s.copy(rmEntries = s.rmEntries.toMutableList().apply {
                this[index] = this[index].copy(reps = reps)
            })
        }
    }

    fun updateRmEntryWeight(index: Int, weight: String) {
        _state.update { s ->
            s.copy(rmEntries = s.rmEntries.toMutableList().apply {
                this[index] = this[index].copy(weight = weight)
            })
        }
    }

    // ========== 食事スロット更新 ==========
    fun updateWakeUpTime(value: String) = _state.update { it.copy(wakeUpTime = value) }
    fun updateSleepTime(value: String) = _state.update { it.copy(sleepTime = value) }
    fun updateTrainingTime(value: String?) = _state.update { it.copy(trainingTime = value) }
    fun updateTrainingAfterMeal(value: Int?) = _state.update { it.copy(trainingAfterMeal = value) }
    fun updateTrainingDuration(value: Int) = _state.update { it.copy(trainingDuration = value) }
    fun updateTrainingStyle(value: TrainingStyle) = _state.update { it.copy(trainingStyle = value) }
    fun updateMealSlotConfig(value: MealSlotConfig) = _state.update { it.copy(mealSlotConfig = value) }

    fun generateTimeline() {
        val s = _state.value
        val newConfig = MealSlotConfig.createTimelineRoutine(
            mealsPerDay = s.mealsPerDay,
            trainingAfterMeal = s.trainingAfterMeal
        )
        _state.update { it.copy(mealSlotConfig = newConfig) }
    }

    // ========== TDEE計算 ==========
    private fun recalculateTDEE() {
        val s = _state.value
        val w = s.weight.toFloatOrNull() ?: return
        val h = s.height.toFloatOrNull() ?: return
        val bf = s.bodyFatPercentage.toFloatOrNull()
        val a = s.age.toIntOrNull()

        // Katch-McArdle式（体脂肪率がある場合）は年齢不要
        // Mifflin-St Jeor式は年齢が必要
        val bmr = if (bf != null && bf > 0 && bf < 100) {
            // Katch-McArdle式: LBMベース
            val lbm = w * (1 - bf / 100)
            370 + 21.6f * lbm
        } else if (a != null) {
            // Mifflin-St Jeor式: 年齢が必要
            when (s.gender) {
                Gender.MALE -> 10 * w + 6.25f * h - 5 * a + 5
                Gender.FEMALE -> 10 * w + 6.25f * h - 5 * a - 161
                Gender.OTHER -> 10 * w + 6.25f * h - 5 * a - 78
            }
        } else {
            // 年齢も体脂肪率もない場合は計算できない
            return
        }

        val tdee = bmr * s.activityLevel.multiplier
        val targetCalories = (tdee + s.calorieAdjustment).toInt()

        _state.update { it.copy(bmr = bmr, tdee = tdee, targetCalories = targetCalories) }
    }

    // ========== ステップナビゲーション ==========
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
            1 -> { // プロフィールステップ
                val height = s.height.toFloatOrNull()
                if (height == null || height < 100 || height > 250) {
                    _state.update { it.copy(validationError = "身長を入力してください") }
                    return false
                }
                val weight = s.weight.toFloatOrNull()
                if (weight == null || weight < 30 || weight > 300) {
                    _state.update { it.copy(validationError = "体重を入力してください") }
                    return false
                }
                val bf = s.bodyFatPercentage.toFloatOrNull()
                if (bf == null || bf < 3 || bf > 50) {
                    _state.update { it.copy(validationError = "体脂肪率を入力してください") }
                    return false
                }
            }
        }
        return true
    }

    // ========== 保存処理 ==========
    fun saveAllAndComplete(userId: String, onComplete: () -> Unit) {
        // "official" ニックネームは official@your-coach-plus.com のみ許可
        val s = _state.value
        val currentEmail = authRepository.getCurrentUser()?.email
        if (s.nickname.lowercase() == "official" && currentEmail != "official@your-coach-plus.com") {
            _state.update { it.copy(error = "「official」は予約されたニックネームです") }
            return
        }

        screenModelScope.launch(exceptionHandler) {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                // PFC計算
                val calcTargetProtein = s.targetCalories?.let { cal -> (cal * s.proteinRatio / 100f / 4f) }
                val calcTargetFat = s.targetCalories?.let { cal -> (cal * s.fatRatio / 100f / 9f) }
                val calcTargetCarbs = s.targetCalories?.let { cal -> (cal * s.carbRatio / 100f / 4f) }

                // プロフィール保存
                val profile = UserProfile(
                    nickname = s.nickname.takeIf { it.isNotBlank() },
                    gender = s.gender,
                    age = s.age.toIntOrNull(),
                    height = s.height.toFloatOrNull(),
                    weight = s.weight.toFloatOrNull(),
                    bodyFatPercentage = s.bodyFatPercentage.toFloatOrNull(),
                    activityLevel = s.activityLevel,
                    goal = s.goal,
                    targetCalories = s.targetCalories,
                    targetProtein = calcTargetProtein,
                    targetFat = calcTargetFat,
                    targetCarbs = calcTargetCarbs,
                    proteinRatioPercent = s.proteinRatio,
                    fatRatioPercent = s.fatRatio,
                    carbRatioPercent = s.carbRatio,
                    mealsPerDay = s.mealsPerDay,
                    calorieAdjustment = s.calorieAdjustment,
                    budgetTier = s.budgetTier,
                    wakeUpTime = s.wakeUpTime,
                    sleepTime = s.sleepTime,
                    trainingTime = s.trainingTime,
                    trainingAfterMeal = s.trainingAfterMeal,
                    trainingDuration = s.trainingDuration,
                    trainingStyle = s.trainingStyle,
                    mealSlotConfig = s.mealSlotConfig,
                    onboardingCompleted = true
                )

                // プロフィール保存（エラーをキャッチ）
                try {
                    userRepository.updateProfile(userId, profile)
                } catch (profileError: Throwable) {
                    println("Profile save error: ${profileError.message}")
                    throw Exception("プロフィール保存エラー: ${profileError.message ?: "不明なエラー"}")
                }

                // ルーティン保存（エラーをキャッチ）
                try {
                    val now = kotlinx.datetime.Clock.System.now().toEpochMilliseconds()
                    val pattern = RoutinePattern(
                        userId = userId,
                        name = "${s.routineDays.size}日間分割",
                        description = s.routineDays.map { if (it.isRestDay) "休" else it.splitType.take(1).ifEmpty { "?" } }.joinToString("→"),
                        days = s.routineDays,
                        isActive = true,
                        createdAt = now,
                        updatedAt = now
                    )
                    routineRepository.savePattern(userId, pattern).getOrThrow()
                } catch (routineError: Throwable) {
                    println("Routine save error: ${routineError.message}")
                    // ルーティン保存失敗でもプロフィールは保存済みなので続行
                }

                // RM記録保存（入力がある場合のみ）
                try {
                    val now = kotlinx.datetime.Clock.System.now().toEpochMilliseconds()
                    s.rmEntries.forEach { entry ->
                        val reps = entry.reps.toIntOrNull()
                        val weight = entry.weight.toFloatOrNull()
                        if (reps != null && reps > 0 && weight != null && weight > 0f) {
                            val record = RmRecord(
                                exerciseName = entry.exerciseName,
                                category = "",
                                weight = weight,
                                reps = reps,
                                timestamp = now,
                                createdAt = now
                            )
                            rmRepository?.addRmRecord(userId, record)
                        }
                    }
                } catch (rmError: Throwable) {
                    println("RM save error: ${rmError.message}")
                    // RM保存失敗でも続行
                }

                _state.update { it.copy(isLoading = false) }
                onComplete()
            } catch (e: Throwable) {
                val errorMessage = when {
                    e.message == null -> "ネットワークエラーが発生しました"
                    e.message?.contains("network", ignoreCase = true) == true ||
                    e.message?.contains("connection", ignoreCase = true) == true ||
                    e.message?.contains("internet", ignoreCase = true) == true ->
                        "ネットワーク接続を確認してください"
                    e.message?.contains("permission", ignoreCase = true) == true ->
                        "権限エラーが発生しました。再ログインしてください"
                    else -> "保存に失敗しました: ${e.message}"
                }
                _state.update { it.copy(isLoading = false, error = errorMessage) }
            }
        }
    }

    fun skipOnboarding(userId: String, onComplete: () -> Unit) {
        screenModelScope.launch(exceptionHandler) {
            try {
                val profile = UserProfile(onboardingCompleted = true)
                userRepository.updateProfile(userId, profile)
                onComplete()
            } catch (_: Exception) {
                onComplete()
            }
        }
    }

    fun clearError() = _state.update { it.copy(error = null, validationError = null) }

    // 後方互換性のため
    @Deprecated("Use saveAllAndComplete instead", ReplaceWith("saveAllAndComplete(userId, onComplete)"))
    fun saveProfile(userId: String, onComplete: () -> Unit) = saveAllAndComplete(userId, onComplete)
}
