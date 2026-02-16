package com.yourcoach.plus.shared.ui.screens.workout

import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
import com.yourcoach.plus.shared.domain.model.*
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.BadgeRepository
import com.yourcoach.plus.shared.domain.repository.WorkoutRepository
import kotlinx.coroutines.NonCancellable
import com.yourcoach.plus.shared.util.DateUtil
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.launch
import kotlinx.datetime.Clock

/**
 * ワークアウトレコーダーUI状態
 */
data class WorkoutRecorderUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val isSaving: Boolean = false,
    val savedSuccessfully: Boolean = false,

    // 現在編集中の種目
    val exerciseName: String = "",
    val exerciseCategory: ExerciseCategory = ExerciseCategory.CHEST,

    // Smart Pre-fill: 前回の記録
    val previousRecord: ExerciseRecord? = null,
    val suggestedMainWeight: Float = 0f,

    // セットリスト
    val sets: List<ExerciseSet> = emptyList(),
    val currentSetIndex: Int = 0,

    // ウォームアップ設定
    val warmupEnabled: Boolean = true,
    val warmupSets: List<ExerciseSet> = emptyList(),

    // 完了した種目リスト
    val completedExercises: List<Exercise> = emptyList(),

    // 入力フォーム
    val inputWeight: String = "",
    val inputReps: String = "",
    val selectedRpe: Int? = null,
    val selectedSetType: SetType = SetType.MAIN
)

/**
 * セッション統計
 */
data class SessionStats(
    val totalSets: Int,
    val warmupSets: Int,
    val mainSets: Int,
    val dropSets: Int,
    val failureSets: Int,
    val totalVolume: Float,
    val averageRpe: Double?,
    val estimatedCalories: Int
)

class WorkoutRecorderScreenModel(
    private val authRepository: AuthRepository,
    private val workoutRepository: WorkoutRepository,
    private val badgeRepository: BadgeRepository
) : ScreenModel {

    private val _uiState = MutableStateFlow(WorkoutRecorderUiState())
    val uiState: StateFlow<WorkoutRecorderUiState> = _uiState.asStateFlow()

    private val exceptionHandler = CoroutineExceptionHandler { _, throwable ->
        println("WorkoutRecorderScreenModel: ${throwable.message}")
        _uiState.update { it.copy(isLoading = false, error = "エラーが発生しました") }
    }

    /**
     * 種目を開始（Smart Pre-fill）
     */
    fun startExercise(name: String, category: ExerciseCategory) {
        _uiState.update {
            it.copy(
                exerciseName = name,
                exerciseCategory = category,
                sets = emptyList(),
                currentSetIndex = 0,
                warmupSets = emptyList()
            )
        }
        loadPreviousRecord(name)
    }

    /**
     * 前回の記録を取得してSmart Pre-fillを適用
     */
    private fun loadPreviousRecord(exerciseName: String) {
        val uid = authRepository.getCurrentUserId() ?: return

        screenModelScope.launch(exceptionHandler) {
            workoutRepository.getLastExerciseRecord(uid, exerciseName)
                .onSuccess { record ->
                    val targetWeight = record?.let {
                        ExerciseRecord.calculateTargetWeight(
                            it.weight ?: 0f,
                            determineProgressionMode(it.daysSinceRecord)
                        )
                    } ?: 0f

                    _uiState.update { state ->
                        state.copy(
                            previousRecord = record,
                            suggestedMainWeight = targetWeight,
                            inputWeight = if (targetWeight > 0) targetWeight.toString() else ""
                        )
                    }

                    if (_uiState.value.warmupEnabled && targetWeight > 0) {
                        generateWarmupSets(targetWeight)
                    }
                }
        }
    }

    private fun determineProgressionMode(daysSinceRecord: Int): ProgressionMode {
        return when {
            daysSinceRecord > 14 -> ProgressionMode.REHAB
            daysSinceRecord > 7 -> ProgressionMode.MAINTAIN
            else -> ProgressionMode.GROWTH
        }
    }

    fun generateWarmupSets(mainWeight: Float) {
        val warmups = ExerciseSet.generateWarmupSets(mainWeight)
        _uiState.update { state ->
            state.copy(
                warmupSets = warmups,
                sets = warmups + state.sets.filter { it.type != SetType.WARMUP }
            )
        }
    }

    fun toggleWarmup(enabled: Boolean) {
        _uiState.update { state ->
            if (enabled && state.suggestedMainWeight > 0) {
                val warmups = ExerciseSet.generateWarmupSets(state.suggestedMainWeight)
                state.copy(
                    warmupEnabled = true,
                    warmupSets = warmups,
                    sets = warmups + state.sets.filter { it.type != SetType.WARMUP }
                )
            } else {
                state.copy(
                    warmupEnabled = false,
                    warmupSets = emptyList(),
                    sets = state.sets.filter { it.type != SetType.WARMUP }
                )
            }
        }
    }

    fun updateWeight(weight: String) { _uiState.update { it.copy(inputWeight = weight) } }
    fun updateReps(reps: String) { _uiState.update { it.copy(inputReps = reps) } }
    fun updateRpe(rpe: Int?) { _uiState.update { it.copy(selectedRpe = rpe) } }
    fun updateSetType(type: SetType) { _uiState.update { it.copy(selectedSetType = type) } }

    fun addSet() {
        val state = _uiState.value
        val weight = state.inputWeight.toFloatOrNull() ?: return
        val reps = state.inputReps.toIntOrNull() ?: return

        val newSet = ExerciseSet(
            setNumber = state.sets.size + 1,
            type = state.selectedSetType,
            weight = weight,
            reps = reps,
            rpe = if (state.selectedSetType != SetType.WARMUP) state.selectedRpe else null,
            isCompleted = true,
            completedAt = Clock.System.now().toEpochMilliseconds()
        )

        _uiState.update {
            it.copy(
                sets = it.sets + newSet,
                currentSetIndex = it.sets.size,
                selectedRpe = null
            )
        }
    }

    fun completeWarmupSet(index: Int) {
        _uiState.update { state ->
            val updatedSets = state.sets.mapIndexed { i, set ->
                if (i == index && set.type == SetType.WARMUP) {
                    set.copy(isCompleted = true, completedAt = Clock.System.now().toEpochMilliseconds())
                } else set
            }
            state.copy(sets = updatedSets, currentSetIndex = index + 1)
        }
    }

    fun removeSet(index: Int) {
        _uiState.update { state ->
            val newSets = state.sets.toMutableList().apply { removeAt(index) }
                .mapIndexed { i, set -> set.copy(setNumber = i + 1) }
            state.copy(sets = newSets)
        }
    }

    fun updateSet(index: Int, weight: Float, reps: Int, rpe: Int?) {
        _uiState.update { state ->
            val updatedSets = state.sets.mapIndexed { i, set ->
                if (i == index) set.copy(weight = weight, reps = reps, rpe = rpe) else set
            }
            state.copy(sets = updatedSets)
        }
    }

    fun finishCurrentExercise() {
        val state = _uiState.value
        if (state.sets.isEmpty()) return

        val exercise = Exercise(
            name = state.exerciseName,
            category = state.exerciseCategory,
            sets = state.sets.size,
            reps = state.sets.filter { it.type != SetType.WARMUP }.map { it.reps }.average().toInt(),
            weight = state.sets.filter { it.type.isCountedIn1RM }.maxOfOrNull { it.weight },
            caloriesBurned = calculateCalories(state.sets),
            warmupSets = state.sets.count { it.type == SetType.WARMUP },
            mainSets = state.sets.count { it.type != SetType.WARMUP },
            totalVolume = state.sets.sumOf { it.volume.toDouble() }.toInt(),
            setDetails = state.sets
        )

        _uiState.update {
            it.copy(
                completedExercises = it.completedExercises + exercise,
                exerciseName = "",
                sets = emptyList(),
                warmupSets = emptyList(),
                previousRecord = null,
                suggestedMainWeight = 0f,
                inputWeight = "",
                inputReps = "",
                selectedRpe = null,
                currentSetIndex = 0
            )
        }
    }

    private fun calculateCalories(sets: List<ExerciseSet>): Int {
        val baseCalories = sets.size * 5
        val volumeCalories = (sets.sumOf { it.volume.toDouble() } / 100).toInt()
        return baseCalories + volumeCalories
    }

    fun saveWorkout(onSuccess: () -> Unit = {}) {
        val uid = authRepository.getCurrentUserId()
        if (uid == null) {
            _uiState.update { it.copy(error = "ログインが必要です") }
            return
        }

        val state = _uiState.value
        if (state.completedExercises.isEmpty()) {
            _uiState.update { it.copy(error = "種目を追加してください") }
            return
        }

        screenModelScope.launch(exceptionHandler) {
            _uiState.update { it.copy(isSaving = true) }

            val now = Clock.System.now().toEpochMilliseconds()
            val workout = Workout(
                id = "workout_${Clock.System.now().toEpochMilliseconds()}",
                userId = uid,
                type = WorkoutType.STRENGTH,
                exercises = state.completedExercises,
                totalDuration = estimateDuration(state.completedExercises),
                totalCaloriesBurned = state.completedExercises.sumOf { it.caloriesBurned },
                intensity = estimateIntensity(state.completedExercises),
                timestamp = now,
                createdAt = now
            )

            workoutRepository.addWorkout(workout)
                .onSuccess {
                    _uiState.update { it.copy(isSaving = false, savedSuccessfully = true) }
                    checkBadges()
                    onSuccess()
                }
                .onFailure { e ->
                    _uiState.update { it.copy(isSaving = false, error = e.message ?: "保存に失敗しました") }
                }
        }
    }

    private fun estimateDuration(exercises: List<Exercise>): Int {
        val baseDuration = exercises.size * 8
        val setDuration = exercises.sumOf { it.sets ?: 0 } * 2
        return baseDuration + setDuration
    }

    private fun estimateIntensity(exercises: List<Exercise>): WorkoutIntensity {
        val allRpes = exercises.flatMap { it.setDetails }.mapNotNull { it.rpe }
        if (allRpes.isEmpty()) return WorkoutIntensity.MODERATE
        val avgRpe = allRpes.average()
        return when {
            avgRpe >= 9.5 -> WorkoutIntensity.VERY_HIGH
            avgRpe >= 8.5 -> WorkoutIntensity.HIGH
            avgRpe >= 7.5 -> WorkoutIntensity.MODERATE
            else -> WorkoutIntensity.LOW
        }
    }

    fun getSessionStats(): SessionStats {
        val state = _uiState.value
        val allSets = state.completedExercises.flatMap { it.setDetails } + state.sets
        return SessionStats(
            totalSets = allSets.size,
            warmupSets = allSets.count { it.type == SetType.WARMUP },
            mainSets = allSets.count { it.type == SetType.MAIN },
            dropSets = allSets.count { it.type == SetType.DROP },
            failureSets = allSets.count { it.type == SetType.FAILURE },
            totalVolume = allSets.filter { it.type.isCountedInVolume }
                .sumOf { it.volume.toDouble() }.toFloat(),
            averageRpe = allSets.mapNotNull { it.rpe }.average().takeIf { !it.isNaN() },
            estimatedCalories = state.completedExercises.sumOf { it.caloriesBurned }
        )
    }

    fun clearError() { _uiState.update { it.copy(error = null) } }

    private fun checkBadges() {
        screenModelScope.launch(NonCancellable) {
            try {
                badgeRepository.checkAndAwardBadges()
            } catch (_: Exception) { }
        }
    }
}
