package com.yourcoach.plus.shared.domain.repository

import com.yourcoach.plus.shared.domain.model.Directive
import kotlinx.coroutines.flow.Flow

/**
 * 指示書リポジトリインターフェース
 */
interface DirectiveRepository {
    /**
     * 指示書を保存
     */
    suspend fun saveDirective(directive: Directive): Result<String>

    /**
     * 特定日の指示書を取得
     */
    suspend fun getDirective(userId: String, date: String): Result<Directive?>

    /**
     * 特定日の指示書をリアルタイム監視
     */
    fun observeDirective(userId: String, date: String): Flow<Directive?>

    /**
     * 指示書を更新
     */
    suspend fun updateDirective(directive: Directive): Result<Unit>

    /**
     * 指示書を完了にする
     */
    suspend fun completeDirective(userId: String, date: String): Result<Unit>

    /**
     * 指示書を削除
     */
    suspend fun deleteDirective(userId: String, date: String): Result<Unit>

    /**
     * 最近の指示書一覧を取得（完了状況確認用）
     */
    suspend fun getRecentDirectives(userId: String, days: Int = 7): Result<List<Directive>>

    /**
     * 完了したアイテムのindexリストを更新
     */
    suspend fun updateExecutedItems(userId: String, date: String, executedItems: List<Int>): Result<Unit>
}
