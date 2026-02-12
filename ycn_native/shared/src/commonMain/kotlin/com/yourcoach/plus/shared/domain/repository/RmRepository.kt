package com.yourcoach.plus.shared.domain.repository

import com.yourcoach.plus.shared.domain.model.RmRecord

/**
 * RM記録リポジトリインターフェース
 */
interface RmRepository {
    /** RM記録を保存 */
    suspend fun addRmRecord(userId: String, record: RmRecord): Result<Unit>

    /** 種目別RM履歴取得（新しい順） */
    suspend fun getRmHistory(userId: String, exerciseName: String, limit: Int = 30): Result<List<RmRecord>>

    /** RM記録のある種目名リスト取得 */
    suspend fun getRmExerciseNames(userId: String): Result<List<String>>

    /** 特定のRM記録を削除 */
    suspend fun deleteRmRecord(userId: String, recordId: String): Result<Unit>

    /** 種目ごとの最新RM記録を取得（クエスト表示用） */
    suspend fun getLatestRmByExercise(userId: String): Result<Map<String, RmRecord>>

    /** 全RM記録を取得（カレンダー表示用） */
    suspend fun getAllRmRecords(userId: String, limit: Int = 500): Result<List<RmRecord>>
}
