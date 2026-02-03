package com.yourcoach.plus.shared.domain.repository

import com.yourcoach.plus.shared.domain.model.Condition
import kotlinx.coroutines.flow.Flow

/**
 * コンディションリポジトリインターフェース
 */
interface ConditionRepository {
    /**
     * コンディションを記録・更新
     */
    suspend fun saveCondition(condition: Condition): Result<Unit>

    /**
     * 特定日のコンディションを取得
     */
    suspend fun getCondition(userId: String, date: String): Result<Condition?>

    /**
     * 特定日のコンディションをリアルタイム監視
     */
    fun observeCondition(userId: String, date: String): Flow<Condition?>

    /**
     * 日付範囲のコンディションを取得
     */
    suspend fun getConditionsInRange(
        userId: String,
        startDate: String,
        endDate: String
    ): Result<List<Condition>>

    /**
     * コンディションを削除
     */
    suspend fun deleteCondition(userId: String, date: String): Result<Unit>
}
