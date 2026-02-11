package com.yourcoach.plus.shared.domain.repository

import com.yourcoach.plus.shared.domain.model.CustomQuest
import kotlinx.coroutines.flow.Flow

/**
 * カスタムクエストリポジトリインターフェース
 */
interface CustomQuestRepository {
    /**
     * 特定日のカスタムクエストをリアルタイム監視
     */
    fun observeCustomQuest(userId: String, date: String): Flow<CustomQuest?>

    /**
     * 特定日のカスタムクエストを取得
     */
    suspend fun getCustomQuest(userId: String, date: String): Result<CustomQuest?>

    /**
     * カスタムクエストの完了アイテムを更新
     */
    suspend fun updateExecutedItems(userId: String, date: String, executedSlotKey: String, executedItemIndices: List<Int>): Result<Unit>
}
