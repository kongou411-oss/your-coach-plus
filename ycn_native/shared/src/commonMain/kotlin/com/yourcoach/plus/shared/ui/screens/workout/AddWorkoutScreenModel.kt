package com.yourcoach.plus.shared.ui.screens.workout

import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
import com.yourcoach.plus.shared.domain.model.*
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.BadgeRepository
import com.yourcoach.plus.shared.domain.repository.CustomExerciseRepository
import com.yourcoach.plus.shared.domain.repository.UserRepository
import com.yourcoach.plus.shared.domain.repository.WorkoutRepository
import kotlinx.coroutines.NonCancellable
import com.yourcoach.plus.shared.util.DateUtil
import com.yourcoach.plus.shared.util.MetCalorieCalculator
import com.yourcoach.plus.shared.util.invokeCloudFunction
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * 運動追加画面の状態 (Android WorkoutUiState と完全一致)
 */
data class AddWorkoutUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val workoutType: WorkoutType = WorkoutType.STRENGTH,
    val exercises: List<Exercise> = emptyList(),
    val intensity: WorkoutIntensity = WorkoutIntensity.MODERATE,
    val note: String = "",
    val templates: List<WorkoutTemplate> = emptyList(),
    val defaultTemplates: List<WorkoutTemplate> = emptyList(),
    val showTemplates: Boolean = false,
    val showDefaultTemplates: Boolean = false,
    val isSaving: Boolean = false,
    val saveSuccess: Boolean = false,
    val editingTemplateId: String? = null,
    val editingTemplateName: String = "",
    // 合計値
    val totalDuration: Int = 0,
    val totalCaloriesBurned: Int = 0,
    // カスタム運動
    val customExercises: List<CustomExercise> = emptyList(),
    // 日付
    val selectedDate: String = DateUtil.todayString(),
    // ユーザー体重（カロリー計算用）
    val userBodyWeight: Float = 70f
)

/**
 * 運動追加画面のScreenModel (Android WorkoutViewModel と完全一致)
 */
class AddWorkoutScreenModel(
    private val authRepository: AuthRepository,
    private val workoutRepository: WorkoutRepository,
    private val customExerciseRepository: CustomExerciseRepository,
    private val userRepository: UserRepository,
    private val badgeRepository: BadgeRepository,
    private val initialDate: String
) : ScreenModel {

    private val _uiState = MutableStateFlow(AddWorkoutUiState(selectedDate = initialDate))
    val uiState: StateFlow<AddWorkoutUiState> = _uiState.asStateFlow()

    private val exceptionHandler = CoroutineExceptionHandler { _, throwable ->
        println("AddWorkoutScreenModel: ${throwable.message}")
        _uiState.update { it.copy(isLoading = false, error = "エラーが発生しました") }
    }

    // キャッシュされたuserId
    private var cachedUserId: String? = null

    // ユーザー体重（METデフォルト値計算用）
    private var userBodyWeight: Float = 70f

    init {
        loadTemplates()
        loadCustomExercises()
        loadUserWeight()
    }

    /**
     * ユーザー体重をロード（MET計算用）
     */
    private fun loadUserWeight() {
        screenModelScope.launch(exceptionHandler) {
            val uid = authRepository.getCurrentUserId() ?: return@launch
            userRepository.getUser(uid)
                .onSuccess { user ->
                    val w = user?.profile?.weight ?: 70f
                    userBodyWeight = w
                    _uiState.update { it.copy(userBodyWeight = w) }
                }
        }
    }

    private fun loadTemplates() {
        screenModelScope.launch(exceptionHandler) {
            val uid = authRepository.getCurrentUserId() ?: return@launch
            cachedUserId = uid
            val userTemplates = workoutRepository.getWorkoutTemplates(uid).getOrDefault(emptyList())
            _uiState.update { it.copy(templates = userTemplates) }

            // デフォルトテンプレートをバックグラウンドで取得
            loadDefaultWorkoutTemplates()
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun loadDefaultWorkoutTemplates() {
        screenModelScope.launch {
            try {
                val result = invokeCloudFunction(
                    region = "asia-northeast2",
                    functionName = "getQuestTemplates",
                    data = emptyMap()
                )
                val templatesList = (result["templates"] as? List<*>)
                    ?.mapNotNull { it as? Map<String, Any?> } ?: emptyList()

                val defaults = templatesList.filter { (it["type"] as? String) == "WORKOUT" }.map { t ->
                    val templateId = t["templateId"] as? String ?: ""
                    val title = t["title"] as? String ?: ""
                    val items = (t["items"] as? List<Map<String, Any?>>)?.map { item ->
                        Exercise(
                            name = item["foodName"] as? String ?: "",
                            category = ExerciseCategory.CHEST,
                            sets = (item["sets"] as? Number)?.toInt(),
                            reps = (item["reps"] as? Number)?.toInt(),
                            weight = (item["weight"] as? Number)?.toFloat(),
                            caloriesBurned = 0
                        )
                    } ?: emptyList()
                    WorkoutTemplate(
                        id = "default_$templateId",
                        userId = "default",
                        name = title,
                        type = WorkoutType.STRENGTH,
                        exercises = items,
                        estimatedDuration = 0,
                        estimatedCalories = 0,
                        createdAt = 0
                    )
                }
                _uiState.update { it.copy(defaultTemplates = defaults) }
            } catch (_: Exception) { }
        }
    }

    fun toggleDefaultTemplates() {
        _uiState.update { it.copy(showDefaultTemplates = !it.showDefaultTemplates) }
    }

    /**
     * カスタム運動を読み込む
     */
    private fun loadCustomExercises() {
        screenModelScope.launch(exceptionHandler) {
            val uid = authRepository.getCurrentUserId() ?: return@launch
            cachedUserId = uid
            customExerciseRepository.getCustomExercises(uid)
                .onSuccess { exercises ->
                    _uiState.update { it.copy(customExercises = exercises) }
                }
        }
    }

    /**
     * カスタム運動を保存
     */
    fun saveCustomExercise(
        name: String,
        category: ExerciseCategory,
        defaultSets: Int? = null,
        defaultReps: Int? = null,
        defaultWeight: Float? = null,
        defaultDuration: Int? = null
    ) {
        val uid = cachedUserId ?: return

        screenModelScope.launch(exceptionHandler) {
            // 既に同名のカスタム運動が存在するかチェック
            val existing = customExerciseRepository.getCustomExerciseByName(uid, name).getOrNull()
            if (existing != null) {
                // 既存の場合は使用回数を増やす
                customExerciseRepository.incrementUsage(uid, existing.id)
            } else {
                // 新規作成
                val customExercise = CustomExercise(
                    id = "",
                    userId = uid,
                    name = name,
                    category = category,
                    defaultSets = defaultSets,
                    defaultReps = defaultReps,
                    defaultWeight = defaultWeight,
                    defaultDuration = defaultDuration,
                    createdAt = DateUtil.currentTimestamp()
                )
                customExerciseRepository.saveCustomExercise(customExercise)
            }
            // 再読み込み
            loadCustomExercises()
        }
    }

    /**
     * 運動を検索（カスタム運動のみ - 内蔵DBはAddWorkoutScreenで直接使用）
     */
    fun searchCustomExercises(query: String): List<CustomExercise> {
        return _uiState.value.customExercises
            .filter { it.name.contains(query, ignoreCase = true) }
    }

    /**
     * カスタム運動リストを取得
     */
    fun getCustomExercises(): List<CustomExercise> {
        return _uiState.value.customExercises
    }

    fun setWorkoutType(type: WorkoutType) {
        _uiState.update { it.copy(workoutType = type) }
    }

    fun setIntensity(intensity: WorkoutIntensity) {
        _uiState.update { it.copy(intensity = intensity) }
    }

    fun addExercise(exercise: Exercise) {
        // カロリーが0の場合、MET計算でデフォルト値を設定
        val effectiveExercise = if (exercise.caloriesBurned == 0) {
            val duration = exercise.duration
                ?: MetCalorieCalculator.estimateStrengthDuration(
                    exercise.category, exercise.sets ?: 3, exercise.reps ?: 10
                )
            val calories = MetCalorieCalculator.calculateCalories(
                exercise.category, userBodyWeight, duration, _uiState.value.intensity,
                liftedWeight = exercise.weight, reps = exercise.reps, sets = exercise.sets
            )
            exercise.copy(caloriesBurned = calories)
        } else exercise

        _uiState.update { state ->
            val newExercises = state.exercises + effectiveExercise
            state.copy(
                exercises = newExercises,
                totalDuration = newExercises.sumOf { it.duration ?: 0 },
                totalCaloriesBurned = newExercises.sumOf { it.caloriesBurned }
            )
        }
    }

    fun removeExercise(index: Int) {
        _uiState.update { state ->
            val newExercises = state.exercises.toMutableList().apply { removeAt(index) }
            state.copy(
                exercises = newExercises,
                totalDuration = newExercises.sumOf { it.duration ?: 0 },
                totalCaloriesBurned = newExercises.sumOf { it.caloriesBurned }
            )
        }
    }

    fun updateExercise(index: Int, exercise: Exercise) {
        _uiState.update { state ->
            val newExercises = state.exercises.toMutableList().apply { set(index, exercise) }
            state.copy(
                exercises = newExercises,
                totalDuration = newExercises.sumOf { it.duration ?: 0 },
                totalCaloriesBurned = newExercises.sumOf { it.caloriesBurned }
            )
        }
    }

    fun updateNote(note: String) {
        _uiState.update { it.copy(note = note) }
    }

    fun toggleTemplates() {
        _uiState.update { it.copy(showTemplates = !it.showTemplates) }
    }

    fun applyTemplate(template: WorkoutTemplate) {
        _uiState.update { state ->
            state.copy(
                workoutType = template.type,
                exercises = template.exercises,
                totalDuration = template.estimatedDuration,
                totalCaloriesBurned = template.estimatedCalories,
                showTemplates = false
            )
        }
    }

    fun startEditingTemplate(template: WorkoutTemplate) {
        applyTemplate(template)
        _uiState.update { it.copy(editingTemplateId = template.id, editingTemplateName = template.name) }
    }

    fun loadAndEditTemplate(templateId: String) {
        screenModelScope.launch(exceptionHandler) {
            val userId = cachedUserId ?: authRepository.getCurrentUserId() ?: return@launch
            println("WORKOUT_EDIT: loadAndEditTemplate id=$templateId userId=$userId")
            workoutRepository.getWorkoutTemplates(userId).onSuccess { templates ->
                println("WORKOUT_EDIT: got ${templates.size} templates")
                val template = templates.find { it.id == templateId }
                println("WORKOUT_EDIT: found template=${template?.name} exercises=${template?.exercises?.size}")
                if (template != null) {
                    startEditingTemplate(template)
                    println("WORKOUT_EDIT: after apply, exercises=${_uiState.value.exercises.size}")
                }
            }
        }
    }

    fun saveWorkout() {
        val state = _uiState.value

        if (state.exercises.isEmpty()) {
            _uiState.update { it.copy(error = "運動を追加してください") }
            return
        }

        screenModelScope.launch(exceptionHandler) {
            _uiState.update { it.copy(isSaving = true) }

            try {
                val uid = authRepository.getCurrentUserId()
                if (uid == null) {
                    _uiState.update { it.copy(isSaving = false, error = "ログインが必要です") }
                    return@launch
                }

                val workout = Workout(
                    id = "",
                    userId = uid,
                    type = state.workoutType,
                    exercises = state.exercises,
                    totalDuration = state.totalDuration,
                    totalCaloriesBurned = state.totalCaloriesBurned,
                    intensity = state.intensity,
                    note = state.note.takeIf { it.isNotBlank() },
                    timestamp = DateUtil.currentTimestamp(),
                    createdAt = DateUtil.currentTimestamp()
                )

                workoutRepository.addWorkout(workout)
                    .onSuccess {
                        _uiState.update { it.copy(isSaving = false, saveSuccess = true) }
                        checkBadges()
                    }
                    .onFailure { e ->
                        _uiState.update {
                            it.copy(
                                isSaving = false,
                                error = e.message ?: "保存に失敗しました"
                            )
                        }
                    }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        error = e.message ?: "保存に失敗しました"
                    )
                }
            }
        }
    }

    fun saveAsTemplate(name: String) {
        val uid = cachedUserId ?: return

        screenModelScope.launch(exceptionHandler) {
            val state = _uiState.value
            val editingId = state.editingTemplateId

            if (editingId != null) {
                // 既存テンプレートを上書き更新
                val template = WorkoutTemplate(
                    id = editingId,
                    userId = uid,
                    name = name,
                    type = state.workoutType,
                    exercises = state.exercises,
                    estimatedDuration = state.totalDuration,
                    estimatedCalories = state.totalCaloriesBurned,
                    createdAt = DateUtil.currentTimestamp()
                )
                workoutRepository.updateWorkoutTemplate(template)
                    .onSuccess {
                        loadTemplates()
                    }
            } else {
                // 新規テンプレート作成
                val template = WorkoutTemplate(
                    id = "",
                    userId = uid,
                    name = name,
                    type = state.workoutType,
                    exercises = state.exercises,
                    estimatedDuration = state.totalDuration,
                    estimatedCalories = state.totalCaloriesBurned,
                    createdAt = DateUtil.currentTimestamp()
                )
                workoutRepository.saveWorkoutTemplate(template)
                    .onSuccess {
                        loadTemplates()
                    }
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    private fun checkBadges() {
        screenModelScope.launch(NonCancellable) {
            try {
                badgeRepository.checkAndAwardBadges()
            } catch (_: Exception) { }
        }
    }
}
