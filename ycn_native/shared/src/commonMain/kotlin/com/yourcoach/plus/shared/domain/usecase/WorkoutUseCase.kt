package com.yourcoach.plus.shared.domain.usecase

import com.yourcoach.plus.shared.domain.model.Workout
import com.yourcoach.plus.shared.domain.repository.WorkoutRepository

/**
 * 運動記録ユースケース
 * 運動のCRUD操作を提供
 */
class WorkoutUseCase(
    private val workoutRepository: WorkoutRepository
) {
    /**
     * 運動を追加
     */
    suspend fun addWorkout(workout: Workout): Result<String> {
        return workoutRepository.addWorkout(workout)
    }

    /**
     * 運動を更新
     */
    suspend fun updateWorkout(workout: Workout): Result<Unit> {
        return workoutRepository.updateWorkout(workout)
    }

    /**
     * 運動を削除
     */
    suspend fun deleteWorkout(userId: String, workoutId: String): Result<Unit> {
        return workoutRepository.deleteWorkout(userId, workoutId)
    }

    /**
     * 特定日の運動を取得
     */
    suspend fun getWorkoutsForDate(userId: String, date: String): Result<List<Workout>> {
        return workoutRepository.getWorkoutsForDate(userId, date)
    }

    /**
     * 運動統計を計算
     */
    fun calculateStats(workouts: List<Workout>): WorkoutStats {
        var totalDuration = 0
        var totalCalories = 0
        var totalSets = 0

        workouts.forEach { workout ->
            totalDuration += workout.totalDuration
            totalCalories += workout.totalCaloriesBurned
            workout.exercises.forEach { exercise ->
                totalSets += exercise.sets ?: 1
            }
        }

        return WorkoutStats(
            totalDuration = totalDuration,
            totalCalories = totalCalories,
            totalSets = totalSets
        )
    }
}

/**
 * 運動統計
 */
data class WorkoutStats(
    val totalDuration: Int,
    val totalCalories: Int,
    val totalSets: Int
)
