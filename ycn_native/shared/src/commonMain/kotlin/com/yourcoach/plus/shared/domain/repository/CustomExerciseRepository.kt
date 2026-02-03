package com.yourcoach.plus.shared.domain.repository

import com.yourcoach.plus.shared.domain.model.CustomExercise

/**
 * カスタム運動リポジトリインターフェース
 */
interface CustomExerciseRepository {
    /**
     * カスタム運動を保存
     */
    suspend fun saveCustomExercise(exercise: CustomExercise): Result<String>

    /**
     * カスタム運動を取得
     */
    suspend fun getCustomExercises(userId: String): Result<List<CustomExercise>>

    /**
     * カスタム運動を検索
     */
    suspend fun searchCustomExercises(userId: String, query: String): Result<List<CustomExercise>>

    /**
     * カスタム運動を削除
     */
    suspend fun deleteCustomExercise(userId: String, exerciseId: String): Result<Unit>

    /**
     * 使用回数をインクリメント
     */
    suspend fun incrementUsage(userId: String, exerciseId: String): Result<Unit>

    /**
     * 名前でカスタム運動を検索（完全一致）
     */
    suspend fun getCustomExerciseByName(userId: String, name: String): Result<CustomExercise?>
}
