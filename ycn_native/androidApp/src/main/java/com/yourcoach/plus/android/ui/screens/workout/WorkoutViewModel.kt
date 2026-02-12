package com.yourcoach.plus.android.ui.screens.workout

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseAuth
import com.yourcoach.plus.shared.domain.model.*
import com.yourcoach.plus.shared.domain.model.RmRecord
import com.yourcoach.plus.shared.domain.repository.CustomExerciseRepository
import com.yourcoach.plus.shared.domain.repository.RmRepository
import com.yourcoach.plus.shared.domain.repository.WorkoutRepository
import com.yourcoach.plus.shared.util.DateUtil
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.UUID

data class WorkoutUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val workoutType: WorkoutType = WorkoutType.STRENGTH,
    val exercises: List<Exercise> = emptyList(),
    val intensity: WorkoutIntensity = WorkoutIntensity.MODERATE,
    val note: String = "",
    val templates: List<WorkoutTemplate> = emptyList(),
    val showTemplates: Boolean = false,
    val isSaving: Boolean = false,
    val savedSuccessfully: Boolean = false,
    // 合計値
    val totalDuration: Int = 0,
    val totalCaloriesBurned: Int = 0,
    // カスタム運動
    val customExercises: List<CustomExercise> = emptyList(),
    // RM記録
    val rmRecords: List<RmRecord> = emptyList()
)

class WorkoutViewModel(
    private val workoutRepository: WorkoutRepository,
    private val customExerciseRepository: CustomExerciseRepository,
    private val rmRepository: RmRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(WorkoutUiState())
    val uiState: StateFlow<WorkoutUiState> = _uiState.asStateFlow()

    private val userId: String?
        get() = FirebaseAuth.getInstance().currentUser?.uid

    init {
        loadTemplates()
        loadCustomExercises()
    }

    private fun loadTemplates() {
        viewModelScope.launch {
            val uid = userId ?: return@launch
            workoutRepository.getWorkoutTemplates(uid)
                .onSuccess { templates ->
                    _uiState.update { it.copy(templates = templates) }
                }
        }
    }

    /**
     * カスタム運動を読み込む
     */
    private fun loadCustomExercises() {
        viewModelScope.launch {
            val uid = userId ?: return@launch
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
        val uid = userId ?: return

        viewModelScope.launch {
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
                    createdAt = System.currentTimeMillis()
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
     * 統合検索結果を取得
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
        _uiState.update { state ->
            val newExercises = state.exercises + exercise
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

    fun saveWorkout(onSuccess: () -> Unit) {
        val uid = userId
        if (uid == null) {
            _uiState.update { it.copy(error = "ログインが必要です") }
            return
        }

        val state = _uiState.value
        if (state.exercises.isEmpty()) {
            _uiState.update { it.copy(error = "運動を追加してください") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true) }

            try {
                val workout = Workout(
                    id = UUID.randomUUID().toString(),
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
                        _uiState.update { it.copy(isSaving = false, savedSuccessfully = true) }
                        onSuccess()
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
        val uid = userId ?: return

        viewModelScope.launch {
            val state = _uiState.value
            val template = WorkoutTemplate(
                id = UUID.randomUUID().toString(),
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
                    // テンプレート一覧を再読み込み
                    loadTemplates()
                }
        }
    }

    /**
     * RM記録を追加
     */
    fun addRmRecord(exerciseName: String, category: String, weight: Float, reps: Int) {
        val uid = userId ?: return
        viewModelScope.launch {
            val record = RmRecord(
                exerciseName = exerciseName,
                category = category,
                weight = weight,
                reps = reps,
                timestamp = DateUtil.currentTimestamp(),
                createdAt = DateUtil.currentTimestamp()
            )
            rmRepository.addRmRecord(uid, record)
                .onSuccess {
                    _uiState.update { state ->
                        state.copy(rmRecords = state.rmRecords + record)
                    }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(error = e.message ?: "RM記録の保存に失敗しました") }
                }
        }
    }

    /**
     * RM記録を削除（Firestore + UI）
     */
    fun removeRmRecord(index: Int) {
        val uid = userId ?: return
        val record = _uiState.value.rmRecords.getOrNull(index) ?: return
        // UIから即座に削除
        _uiState.update { state ->
            state.copy(rmRecords = state.rmRecords.toMutableList().apply { removeAt(index) })
        }
        // Firestoreからも削除（IDがある場合）
        if (record.id.isNotEmpty()) {
            viewModelScope.launch {
                rmRepository.deleteRmRecord(uid, record.id)
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
