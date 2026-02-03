package com.yourcoach.plus.shared.domain.repository

import com.yourcoach.plus.shared.domain.model.CustomFood

/**
 * カスタム食品リポジトリインターフェース
 */
interface CustomFoodRepository {
    /**
     * カスタム食品を保存
     */
    suspend fun saveCustomFood(food: CustomFood): Result<String>

    /**
     * カスタム食品を取得
     */
    suspend fun getCustomFoods(userId: String): Result<List<CustomFood>>

    /**
     * カスタム食品を検索
     */
    suspend fun searchCustomFoods(userId: String, query: String): Result<List<CustomFood>>

    /**
     * カスタム食品を削除
     */
    suspend fun deleteCustomFood(userId: String, foodId: String): Result<Unit>

    /**
     * カスタム食品を更新
     */
    suspend fun updateCustomFood(userId: String, foodId: String, updates: Map<String, Any>): Result<Unit>

    /**
     * 使用回数をインクリメント
     */
    suspend fun incrementUsage(userId: String, foodId: String): Result<Unit>

    /**
     * 名前でカスタム食品を検索（完全一致）
     */
    suspend fun getCustomFoodByName(userId: String, name: String): Result<CustomFood?>
}
