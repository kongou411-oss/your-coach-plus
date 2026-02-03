package com.yourcoach.plus.shared.domain.repository

import com.yourcoach.plus.shared.domain.model.ExerciseRecord
import com.yourcoach.plus.shared.domain.model.Workout
import com.yourcoach.plus.shared.domain.model.WorkoutTemplate
import kotlinx.coroutines.flow.Flow

/**
 * 運動リポジトリインターフェース
 */
interface WorkoutRepository {
    /**
     * 運動を記録
     */
    suspend fun addWorkout(workout: Workout): Result<String>

    /**
     * 運動を更新
     */
    suspend fun updateWorkout(workout: Workout): Result<Unit>

    /**
     * 運動を削除
     */
    suspend fun deleteWorkout(userId: String, workoutId: String): Result<Unit>

    /**
     * 特定の運動を取得
     */
    suspend fun getWorkout(userId: String, workoutId: String): Result<Workout?>

    /**
     * 特定日の運動を取得
     */
    suspend fun getWorkoutsForDate(userId: String, date: String): Result<List<Workout>>

    /**
     * 日付範囲の運動を取得
     */
    suspend fun getWorkoutsInRange(
        userId: String,
        startDate: String,
        endDate: String
    ): Result<List<Workout>>

    /**
     * 特定日の運動をリアルタイム監視
     */
    fun observeWorkoutsForDate(userId: String, date: String): Flow<List<Workout>>

    /**
     * 運動テンプレートを保存
     */
    suspend fun saveWorkoutTemplate(template: WorkoutTemplate): Result<String>

    /**
     * 運動テンプレートを取得
     */
    suspend fun getWorkoutTemplates(userId: String): Result<List<WorkoutTemplate>>

    /**
     * 運動テンプレートを削除
     */
    suspend fun deleteWorkoutTemplate(userId: String, templateId: String): Result<Unit>

    /**
     * テンプレート使用回数を更新
     */
    suspend fun incrementTemplateUsage(userId: String, templateId: String): Result<Unit>

    /**
     * 週間運動サマリーを取得
     */
    suspend fun getWeeklySummary(userId: String, weekStartDate: String): Result<WorkoutWeeklySummary>

    // ===== クエスト生成用（前回記録検索） =====

    /**
     * 特定種目の最新記録を取得
     * @param exerciseName 種目名（例: "ベンチプレス"）
     * @return ExerciseRecord（記録がない場合はnull）
     */
    suspend fun getLastExerciseRecord(
        userId: String,
        exerciseName: String
    ): Result<ExerciseRecord?>

    /**
     * 複数種目の最新記録を一括取得
     * @param exerciseNames 種目名リスト
     * @return Map<種目名, ExerciseRecord>
     */
    suspend fun getLastExerciseRecords(
        userId: String,
        exerciseNames: List<String>
    ): Result<Map<String, ExerciseRecord>>

    /**
     * 特定種目の記録履歴を取得（グラフ用）
     * @param limit 取得件数
     */
    suspend fun getExerciseHistory(
        userId: String,
        exerciseName: String,
        limit: Int = 10
    ): Result<List<ExerciseRecord>>
}

/**
 * 週間運動サマリー
 */
data class WorkoutWeeklySummary(
    val totalWorkouts: Int,
    val totalDuration: Int,
    val totalCaloriesBurned: Int,
    val workoutsByType: Map<String, Int>,
    val averageIntensity: Float
)
