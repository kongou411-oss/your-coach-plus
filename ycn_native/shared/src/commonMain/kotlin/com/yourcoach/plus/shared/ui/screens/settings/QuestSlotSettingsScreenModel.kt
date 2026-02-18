package com.yourcoach.plus.shared.ui.screens.settings

import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
import com.yourcoach.plus.shared.domain.model.RoutineDay
import com.yourcoach.plus.shared.domain.model.RoutineTemplateConfig
import com.yourcoach.plus.shared.domain.model.RoutineTemplateMapping
import com.yourcoach.plus.shared.domain.model.MealSlot
import com.yourcoach.plus.shared.domain.model.MealSlotConfig
import com.yourcoach.plus.shared.domain.model.WorkoutSlotConfig
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.MealRepository
import com.yourcoach.plus.shared.domain.repository.RoutineRepository
import com.yourcoach.plus.shared.domain.repository.UserRepository
import com.yourcoach.plus.shared.domain.repository.WorkoutRepository
import com.yourcoach.plus.shared.util.invokeCloudFunction
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * テンプレートサマリー（CF getQuestTemplates から取得）
 */
data class TemplateSummary(
    val templateId: String,
    val title: String,
    val type: String, // "MEAL" or "WORKOUT"
    val totalMacros: TemplateMacros? = null,
    val itemCount: Int = 0
)

data class TemplateMacros(
    val calories: Int = 0,
    val protein: Float = 0f,
    val fat: Float = 0f,
    val carbs: Float = 0f
)

data class QuestSlotSettingsUiState(
    val isLoading: Boolean = true,
    val isSaving: Boolean = false,
    val routineDays: List<RoutineDay> = emptyList(),
    val selectedRoutineIndex: Int = 0,
    val routineTemplateConfig: RoutineTemplateConfig = RoutineTemplateConfig(),
    val availableTemplates: List<TemplateSummary> = emptyList(),
    val isLoadingTemplates: Boolean = false,
    val questAutoGenEnabled: Boolean = true,
    val mealsPerDay: Int = 5,
    val showTemplatePicker: Boolean = false,
    val pickerTargetSlot: Int = -1, // -1=未選択, 0=運動, 1-N=食事
    val saveSuccess: Boolean = false,
    val error: String? = null,
    // タイムライン関連
    val wakeUpTime: String = "07:00",
    val sleepTime: String = "23:00",
    val trainingTime: String? = null,
    val trainingAfterMeal: Int? = null,
    val trainingDuration: Int = 120,
    val mealSlotConfig: MealSlotConfig = MealSlotConfig(),
    val calculatedSlotTimes: Map<Int, String> = emptyMap(), // slotNumber -> "HH:MM"
    val customTimeSlots: Set<Int> = emptySet(), // absoluteTimeが設定済みのスロット番号
    val showTimePickerForSlot: Int? = null // 時刻ピッカー表示中のスロット
)

class QuestSlotSettingsScreenModel(
    private val authRepository: AuthRepository,
    private val userRepository: UserRepository,
    private val routineRepository: RoutineRepository,
    private val mealRepository: MealRepository,
    private val workoutRepository: WorkoutRepository
) : ScreenModel {

    private val _uiState = MutableStateFlow(QuestSlotSettingsUiState())
    val uiState: StateFlow<QuestSlotSettingsUiState> = _uiState.asStateFlow()

    private val exceptionHandler = CoroutineExceptionHandler { _, _ ->
        _uiState.update { it.copy(isLoading = false, error = "エラーが発生しました") }
    }

    init {
        loadData()
    }

    private fun loadData() {
        screenModelScope.launch(exceptionHandler) {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            _uiState.update { it.copy(isLoading = true) }

            // ユーザープロフィール読み込み
            val user = userRepository.getUser(userId).getOrNull()
            val profile = user?.profile
            val config = profile?.routineTemplateConfig ?: RoutineTemplateConfig()

            // ルーティンパターン読み込み
            val pattern = routineRepository.getActivePattern(userId).getOrNull()
            val days = pattern?.days ?: emptyList()

            // タイムライン情報
            val wakeUp = profile?.wakeUpTime ?: "07:00"
            val sleep = profile?.sleepTime ?: "23:00"
            val training = profile?.trainingTime
            val trainingAfter = profile?.trainingAfterMeal
            val trainingDur = profile?.trainingDuration ?: 120
            val meals = profile?.mealsPerDay ?: 5

            // MealSlotConfig: 常にプロフィール設定値からタイムラインを再生成
            // 既存configのabsoluteTime（ユーザーカスタム時刻）は保持
            val freshConfig = MealSlotConfig.createTimelineRoutine(meals, trainingAfter, trainingDur)
            val existingConfig = profile?.mealSlotConfig
            val slotConfig = if (existingConfig != null && existingConfig.slots.isNotEmpty()) {
                // 既存のabsoluteTimeをマージ
                val mergedSlots = freshConfig.slots.map { newSlot ->
                    val existingSlot = existingConfig.getSlot(newSlot.slotNumber)
                    if (existingSlot?.absoluteTime != null) {
                        newSlot.copy(absoluteTime = existingSlot.absoluteTime)
                    } else {
                        newSlot
                    }
                }
                freshConfig.copy(slots = mergedSlots)
            } else {
                freshConfig
            }

            // absoluteTimeが設定されているスロットを記録
            val customSlots = slotConfig.slots
                .filter { it.absoluteTime != null }
                .map { it.slotNumber }
                .toSet()

            // 各スロットの表示時刻を計算
            val slotTimes = calculateSlotTimesMap(slotConfig, wakeUp, training, sleep)

            _uiState.update {
                it.copy(
                    isLoading = false,
                    routineDays = days,
                    routineTemplateConfig = config,
                    questAutoGenEnabled = profile?.questAutoGenEnabled ?: true,
                    mealsPerDay = meals,
                    wakeUpTime = wakeUp,
                    sleepTime = sleep,
                    trainingTime = training,
                    trainingAfterMeal = trainingAfter,
                    trainingDuration = trainingDur,
                    mealSlotConfig = slotConfig,
                    calculatedSlotTimes = slotTimes,
                    customTimeSlots = customSlots
                )
            }

            // テンプレート一覧を取得
            loadTemplates()
        }
    }

    private fun loadTemplates() {
        screenModelScope.launch(exceptionHandler) {
            _uiState.update { it.copy(isLoadingTemplates = true) }
            val userId = authRepository.getCurrentUserId()
            val allTemplates = mutableListOf<TemplateSummary>()

            // 1. CF からデフォルトテンプレート取得
            try {
                val result = invokeCloudFunction(
                    region = "asia-northeast2",
                    functionName = "getQuestTemplates",
                    data = emptyMap()
                )
                @Suppress("UNCHECKED_CAST")
                val templatesList = (result["templates"] as? List<*>)?.mapNotNull { it as? Map<String, Any?> } ?: emptyList()
                allTemplates.addAll(templatesList.map { t ->
                    val macrosMap = t["totalMacros"] as? Map<String, Any?>
                    TemplateSummary(
                        templateId = t["templateId"] as? String ?: "",
                        title = t["title"] as? String ?: "",
                        type = t["type"] as? String ?: "MEAL",
                        totalMacros = macrosMap?.let {
                            TemplateMacros(
                                calories = (it["calories"] as? Number)?.toInt() ?: 0,
                                protein = (it["protein"] as? Number)?.toFloat() ?: 0f,
                                fat = (it["fat"] as? Number)?.toFloat() ?: 0f,
                                carbs = (it["carbs"] as? Number)?.toFloat() ?: 0f
                            )
                        },
                        itemCount = (t["itemCount"] as? Number)?.toInt() ?: 0
                    )
                })
            } catch (_: Exception) { }

            // 2. ユーザーのマイテンプレート取得（リポジトリ経由）
            if (userId != null) {
                mealRepository.getMealTemplates(userId).onSuccess { mealTemplates ->
                    allTemplates.addAll(mealTemplates.map { t ->
                        TemplateSummary(
                            templateId = t.id,
                            title = t.name,
                            type = "MEAL",
                            totalMacros = TemplateMacros(
                                calories = t.totalCalories,
                                protein = t.totalProtein,
                                fat = t.totalFat,
                                carbs = t.totalCarbs
                            ),
                            itemCount = t.items.size
                        )
                    })
                }
                workoutRepository.getWorkoutTemplates(userId).onSuccess { workoutTemplates ->
                    allTemplates.addAll(workoutTemplates.map { t ->
                        TemplateSummary(
                            templateId = t.id,
                            title = t.name,
                            type = "WORKOUT",
                            totalMacros = null,
                            itemCount = t.exercises.size
                        )
                    })
                }
            }

            _uiState.update { it.copy(isLoadingTemplates = false, availableTemplates = allTemplates) }
        }
    }

    fun selectRoutineDay(index: Int) {
        _uiState.update { it.copy(selectedRoutineIndex = index) }
    }

    fun openTemplatePicker(slotNumber: Int) {
        _uiState.update { it.copy(showTemplatePicker = true, pickerTargetSlot = slotNumber) }
    }

    fun closeTemplatePicker() {
        _uiState.update { it.copy(showTemplatePicker = false, pickerTargetSlot = -1) }
    }

    fun assignTemplate(slotNumber: Int, template: TemplateSummary) {
        val state = _uiState.value
        val selectedDay = state.routineDays.getOrNull(state.selectedRoutineIndex) ?: return
        val routineId = selectedDay.splitType
        val routineName = selectedDay.name.ifBlank { "Day ${selectedDay.dayNumber}" }

        val newConfig = state.routineTemplateConfig.setMapping(
            routineId = routineId,
            routineName = routineName,
            slotNumber = slotNumber,
            templateId = template.templateId,
            templateName = template.title
        )
        _uiState.update {
            it.copy(
                routineTemplateConfig = newConfig,
                showTemplatePicker = false,
                pickerTargetSlot = -1
            )
        }
    }

    fun removeTemplate(slotNumber: Int) {
        val state = _uiState.value
        val selectedDay = state.routineDays.getOrNull(state.selectedRoutineIndex) ?: return
        val routineId = selectedDay.splitType
        val newConfig = state.routineTemplateConfig.removeMapping(routineId, slotNumber)
        _uiState.update { it.copy(routineTemplateConfig = newConfig) }
    }

    fun toggleAutoGen(enabled: Boolean) {
        _uiState.update { it.copy(questAutoGenEnabled = enabled) }
    }

    /**
     * 現在選択中のルーティン日のスロット設定を別のルーティン日にコピー
     */
    fun copyToRoutineDay(targetIndex: Int) {
        val state = _uiState.value
        val sourceDay = state.routineDays.getOrNull(state.selectedRoutineIndex) ?: return
        val targetDay = state.routineDays.getOrNull(targetIndex) ?: return
        val sourceId = sourceDay.splitType
        val targetId = targetDay.splitType
        val targetName = targetDay.name.ifBlank { "Day ${targetDay.dayNumber}" }

        if (sourceId == targetId) return

        val sourceMappings = state.routineTemplateConfig.getMappingsForRoutine(sourceId)
        var newConfig = state.routineTemplateConfig
        // 既存のターゲットマッピングを削除
        val existingTarget = newConfig.getMappingsForRoutine(targetId)
        for (m in existingTarget) {
            newConfig = newConfig.removeMapping(targetId, m.slotNumber)
        }
        // ソースからコピー
        for (m in sourceMappings) {
            newConfig = newConfig.setMapping(
                routineId = targetId,
                routineName = targetName,
                slotNumber = m.slotNumber,
                templateId = m.templateId,
                templateName = m.templateName
            )
        }
        _uiState.update { it.copy(routineTemplateConfig = newConfig) }
    }

    // === タイムライン関連メソッド ===

    fun openTimePickerForSlot(slotNumber: Int) {
        _uiState.update { it.copy(showTimePickerForSlot = slotNumber) }
    }

    fun closeTimePicker() {
        _uiState.update { it.copy(showTimePickerForSlot = null) }
    }

    fun updateSlotAbsoluteTime(slotNumber: Int, absoluteTime: String) {
        val state = _uiState.value
        val newSlots = state.mealSlotConfig.slots.map { slot ->
            if (slot.slotNumber == slotNumber) {
                slot.copy(absoluteTime = absoluteTime)
            } else slot
        }
        val newConfig = state.mealSlotConfig.copy(slots = newSlots)
        val newCustomSlots = state.customTimeSlots + slotNumber
        val newTimes = calculateSlotTimesMap(newConfig, state.wakeUpTime, state.trainingTime, state.sleepTime)

        _uiState.update {
            it.copy(
                mealSlotConfig = newConfig,
                calculatedSlotTimes = newTimes,
                customTimeSlots = newCustomSlots,
                showTimePickerForSlot = null
            )
        }
    }

    fun clearCustomTime(slotNumber: Int) {
        val state = _uiState.value
        val newSlots = state.mealSlotConfig.slots.map { slot ->
            if (slot.slotNumber == slotNumber) {
                slot.copy(absoluteTime = null)
            } else slot
        }
        val newConfig = state.mealSlotConfig.copy(slots = newSlots)
        val newCustomSlots = state.customTimeSlots - slotNumber
        val newTimes = calculateSlotTimesMap(newConfig, state.wakeUpTime, state.trainingTime, state.sleepTime)

        _uiState.update {
            it.copy(
                mealSlotConfig = newConfig,
                calculatedSlotTimes = newTimes,
                customTimeSlots = newCustomSlots
            )
        }
    }

    /**
     * MealSlotConfig から各スロットの表示時刻マップを計算
     */
    private fun calculateSlotTimesMap(
        config: MealSlotConfig,
        wakeUpTime: String,
        trainingTime: String?,
        sleepTime: String
    ): Map<Int, String> {
        val wakeMinutes = parseTimeToMinutes(wakeUpTime) ?: 420 // 07:00
        val trainingMinutes = trainingTime?.let { parseTimeToMinutes(it) }
        val sleepMinutes = parseTimeToMinutes(sleepTime) ?: 1380 // 23:00

        val minutesMap = config.calculateAllSlotTimes(wakeMinutes, trainingMinutes, sleepMinutes)
        return minutesMap.mapValues { (_, minutes) -> MealSlot.minutesToTimeString(minutes) }
    }

    private fun parseTimeToMinutes(time: String): Int? {
        val parts = time.split(":")
        if (parts.size != 2) return null
        val hours = parts[0].toIntOrNull() ?: return null
        val minutes = parts[1].toIntOrNull() ?: return null
        return hours * 60 + minutes
    }

    /**
     * トレーニング開始時刻を計算（表示用）
     */
    fun getTrainingStartTime(): String? {
        val state = _uiState.value
        if (state.trainingAfterMeal == null || state.trainingTime == null) return null
        // trainingTimeがプロフィール設定から来る
        return state.trainingTime
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    fun save() {
        screenModelScope.launch(exceptionHandler) {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            _uiState.update { it.copy(isSaving = true) }

            val state = _uiState.value
            userRepository.updateSlotConfig(
                userId = userId,
                mealSlotConfig = state.mealSlotConfig,
                workoutSlotConfig = WorkoutSlotConfig(),
                routineTemplateConfig = state.routineTemplateConfig,
                questAutoGenEnabled = state.questAutoGenEnabled
            ).onSuccess {
                _uiState.update { it.copy(isSaving = false, saveSuccess = true) }
            }.onFailure { e ->
                _uiState.update { it.copy(isSaving = false, error = "保存に失敗しました: ${e.message}") }
            }
        }
    }
}
