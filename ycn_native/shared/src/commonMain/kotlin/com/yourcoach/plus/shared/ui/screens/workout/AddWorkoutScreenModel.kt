package com.yourcoach.plus.shared.ui.screens.workout

import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
import com.yourcoach.plus.shared.domain.model.*
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.WorkoutRepository
import com.yourcoach.plus.shared.util.DateUtil
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * 運動追加画面の状態
 */
data class AddWorkoutUiState(
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val error: String? = null,
    val saveSuccess: Boolean = false,
    val selectedDate: String = DateUtil.todayString(),
    // 運動情報
    val workoutName: String = "",
    val workoutType: WorkoutType = WorkoutType.STRENGTH,
    val intensity: WorkoutIntensity = WorkoutIntensity.MODERATE,
    val exercises: List<ExerciseInput> = listOf(ExerciseInput()),
    val totalDuration: String = "60",
    val note: String = ""
)

/**
 * エクササイズ入力用データクラス
 */
data class ExerciseInput(
    val name: String = "",
    val category: ExerciseCategory = ExerciseCategory.CHEST,
    val sets: String = "3",
    val reps: String = "10",
    val weight: String = "",
    val duration: String = "",
    val caloriesBurned: String = "0"
) {
    fun toExercise(): Exercise? {
        if (name.isBlank()) return null
        return Exercise(
            name = name,
            category = category,
            sets = sets.toIntOrNull(),
            reps = reps.toIntOrNull(),
            weight = weight.toFloatOrNull(),
            duration = duration.toIntOrNull(),
            caloriesBurned = caloriesBurned.toIntOrNull() ?: 0,
            mainSets = sets.toIntOrNull() ?: 0,
            totalVolume = calculateVolume()
        )
    }

    private fun calculateVolume(): Int {
        val w = weight.toFloatOrNull() ?: return 0
        val s = sets.toIntOrNull() ?: return 0
        val r = reps.toIntOrNull() ?: return 0
        return (w * s * r).toInt()
    }
}

/**
 * 運動追加画面のScreenModel
 */
class AddWorkoutScreenModel(
    private val authRepository: AuthRepository,
    private val workoutRepository: WorkoutRepository,
    private val initialDate: String
) : ScreenModel {

    private val _uiState = MutableStateFlow(AddWorkoutUiState(selectedDate = initialDate))
    val uiState: StateFlow<AddWorkoutUiState> = _uiState.asStateFlow()

    /**
     * 運動名を更新
     */
    fun updateWorkoutName(name: String) {
        _uiState.update { it.copy(workoutName = name) }
    }

    /**
     * 運動タイプを更新
     */
    fun updateWorkoutType(type: WorkoutType) {
        _uiState.update { it.copy(workoutType = type) }
    }

    /**
     * 強度を更新
     */
    fun updateIntensity(intensity: WorkoutIntensity) {
        _uiState.update { it.copy(intensity = intensity) }
    }

    /**
     * 合計時間を更新
     */
    fun updateTotalDuration(duration: String) {
        _uiState.update { it.copy(totalDuration = duration) }
    }

    /**
     * メモを更新
     */
    fun updateNote(note: String) {
        _uiState.update { it.copy(note = note) }
    }

    /**
     * エクササイズを更新
     */
    fun updateExercise(index: Int, exercise: ExerciseInput) {
        _uiState.update { state ->
            val newExercises = state.exercises.toMutableList()
            if (index < newExercises.size) {
                newExercises[index] = exercise
            }
            state.copy(exercises = newExercises)
        }
    }

    /**
     * エクササイズを追加
     */
    fun addExercise() {
        _uiState.update { state ->
            state.copy(exercises = state.exercises + ExerciseInput())
        }
    }

    /**
     * エクササイズを削除
     */
    fun removeExercise(index: Int) {
        _uiState.update { state ->
            if (state.exercises.size > 1) {
                val newExercises = state.exercises.toMutableList()
                newExercises.removeAt(index)
                state.copy(exercises = newExercises)
            } else {
                state
            }
        }
    }

    /**
     * 運動を保存
     */
    fun saveWorkout() {
        val state = _uiState.value
        val exercises = state.exercises.mapNotNull { it.toExercise() }

        if (exercises.isEmpty()) {
            _uiState.update { it.copy(error = "エクササイズを1つ以上追加してください") }
            return
        }

        _uiState.update { it.copy(isSaving = true, error = null) }

        screenModelScope.launch {
            try {
                val userId = authRepository.getCurrentUserId()
                if (userId == null) {
                    _uiState.update { it.copy(isSaving = false, error = "ログインしていません") }
                    return@launch
                }

                val totalDuration = state.totalDuration.toIntOrNull() ?: 60
                val totalCaloriesBurned = exercises.sumOf { it.caloriesBurned }

                val workout = Workout(
                    id = "",
                    userId = userId,
                    name = state.workoutName.ifBlank { null },
                    type = state.workoutType,
                    exercises = exercises,
                    totalDuration = totalDuration,
                    totalCaloriesBurned = totalCaloriesBurned,
                    intensity = state.intensity,
                    note = state.note.ifBlank { null },
                    timestamp = DateUtil.dateStringToTimestamp(state.selectedDate),
                    createdAt = DateUtil.currentTimestamp()
                )

                val result = workoutRepository.addWorkout(workout)
                result.fold(
                    onSuccess = {
                        _uiState.update { it.copy(isSaving = false, saveSuccess = true) }
                    },
                    onFailure = { e ->
                        _uiState.update { it.copy(isSaving = false, error = e.message) }
                    }
                )
            } catch (e: Exception) {
                _uiState.update { it.copy(isSaving = false, error = e.message) }
            }
        }
    }

    /**
     * エラーをクリア
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
