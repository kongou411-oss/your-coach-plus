package com.yourcoach.plus.shared.domain.repository

import com.yourcoach.plus.shared.domain.model.RoutineDay
import com.yourcoach.plus.shared.domain.model.RoutinePattern
import kotlinx.coroutines.flow.Flow

/**
 * ルーティンリポジトリインターフェース
 */
interface RoutineRepository {

    // ========== パターン管理 ==========

    /**
     * ユーザーのすべてのルーティンパターンを取得
     */
    suspend fun getPatterns(userId: String): Result<List<RoutinePattern>>

    /**
     * ルーティンパターンをリアルタイム監視
     */
    fun observePatterns(userId: String): Flow<List<RoutinePattern>>

    /**
     * アクティブなパターンを取得
     */
    suspend fun getActivePattern(userId: String): Result<RoutinePattern?>

    /**
     * アクティブなパターンをリアルタイム監視
     */
    fun observeActivePattern(userId: String): Flow<RoutinePattern?>

    /**
     * パターンを保存（新規作成または更新）
     */
    suspend fun savePattern(userId: String, pattern: RoutinePattern): Result<String>

    /**
     * パターンを削除
     */
    suspend fun deletePattern(userId: String, patternId: String): Result<Unit>

    /**
     * パターンをアクティブに設定
     */
    suspend fun setActivePattern(userId: String, patternId: String): Result<Unit>

    // ========== 今日のルーティン ==========

    /**
     * 指定日のルーティンを取得（アクティブパターンから）
     * @param date YYYY-MM-DD形式
     */
    suspend fun getRoutineForDate(userId: String, date: String): Result<RoutineDay?>

    /**
     * 今日のルーティンをリアルタイム監視
     */
    fun observeTodayRoutine(userId: String): Flow<RoutineDay?>

    /**
     * 指定日が休養日かどうか
     */
    suspend fun isRestDay(userId: String, date: String): Result<Boolean>

    // ========== ルーティン実行 ==========

    /**
     * ルーティンをワンタップ実行（食事・運動を一括記録）
     * @return 記録されたアイテム数
     */
    suspend fun executeRoutine(
        userId: String,
        date: String,
        routineDay: RoutineDay
    ): Result<Int>

    /**
     * ルーティンの一部（食事のみ）を実行
     */
    suspend fun executeRoutineMeals(
        userId: String,
        date: String,
        routineDay: RoutineDay
    ): Result<Int>

    /**
     * ルーティンの一部（運動のみ）を実行
     */
    suspend fun executeRoutineWorkouts(
        userId: String,
        date: String,
        routineDay: RoutineDay
    ): Result<Int>

    // ========== プリセット ==========

    /**
     * システム提供のプリセットパターンを取得
     */
    suspend fun getPresetPatterns(): Result<List<RoutinePattern>>

    /**
     * プリセットをユーザーのパターンとしてコピー
     */
    suspend fun copyPresetToUser(
        userId: String,
        presetId: String,
        customName: String? = null
    ): Result<String>
}
