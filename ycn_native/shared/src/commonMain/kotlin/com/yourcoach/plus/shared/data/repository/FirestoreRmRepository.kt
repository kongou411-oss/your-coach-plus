package com.yourcoach.plus.shared.data.repository

import com.yourcoach.plus.shared.domain.model.RmRecord
import com.yourcoach.plus.shared.domain.repository.RmRepository
import com.yourcoach.plus.shared.util.AppError
import dev.gitlive.firebase.Firebase
import dev.gitlive.firebase.firestore.Direction
import dev.gitlive.firebase.firestore.DocumentSnapshot
import dev.gitlive.firebase.firestore.FirebaseFirestore
import dev.gitlive.firebase.firestore.Timestamp
import dev.gitlive.firebase.firestore.firestore

/**
 * Firestore RM記録リポジトリ実装 (GitLive KMP版)
 * Collection: users/{userId}/rm_records/{recordId}
 */
class FirestoreRmRepository : RmRepository {

    private val firestore: FirebaseFirestore by lazy {
        try {
            Firebase.firestore
        } catch (e: Throwable) {
            println("FirestoreRmRepository: Firebase.firestore initialization failed: ${e.message}")
            throw e
        }
    }

    private fun rmRecordsCollection(userId: String) =
        firestore.collection("users").document(userId).collection("rm_records")

    override suspend fun addRmRecord(userId: String, record: RmRecord): Result<Unit> {
        return try {
            val data = hashMapOf(
                "exerciseName" to record.exerciseName,
                "category" to record.category,
                "weight" to record.weight,
                "reps" to record.reps,
                "timestamp" to record.timestamp,
                "createdAt" to record.createdAt
            )
            rmRecordsCollection(userId).add(data)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("RM記録の保存に失敗しました", e))
        }
    }

    override suspend fun getRmHistory(
        userId: String,
        exerciseName: String,
        limit: Int
    ): Result<List<RmRecord>> {
        return try {
            val snapshot = rmRecordsCollection(userId)
                .where { "exerciseName" equalTo exerciseName }
                .orderBy("timestamp", Direction.DESCENDING)
                .limit(limit)
                .get()
            val records = snapshot.documents.mapNotNull { doc ->
                try {
                    doc.toRmRecord()
                } catch (e: Exception) {
                    println("FirestoreRmRepository: Failed to parse RM record: ${e.message}")
                    null
                }
            }
            Result.success(records)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("RM履歴の取得に失敗しました", e))
        }
    }

    override suspend fun getRmExerciseNames(userId: String): Result<List<String>> {
        return try {
            val snapshot = rmRecordsCollection(userId)
                .orderBy("timestamp", Direction.DESCENDING)
                .get()
            val names = snapshot.documents.mapNotNull { doc ->
                try {
                    doc.get<String?>("exerciseName")
                } catch (e: Exception) {
                    null
                }
            }.distinct()
            Result.success(names)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("RM種目リストの取得に失敗しました", e))
        }
    }

    override suspend fun getLatestRmByExercise(userId: String): Result<Map<String, RmRecord>> {
        return try {
            val snapshot = rmRecordsCollection(userId)
                .orderBy("timestamp", Direction.DESCENDING)
                .get()
            val latestByExercise = mutableMapOf<String, RmRecord>()
            snapshot.documents.forEach { doc ->
                try {
                    val record = doc.toRmRecord()
                    // 種目名ごとに最新の1件のみ保持（timestampの降順で取得しているので最初のものが最新）
                    if (!latestByExercise.containsKey(record.exerciseName)) {
                        latestByExercise[record.exerciseName] = record
                    }
                } catch (e: Exception) {
                    println("FirestoreRmRepository: Failed to parse RM record: ${e.message}")
                }
            }
            Result.success(latestByExercise)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("最新RM記録の取得に失敗しました", e))
        }
    }

    override suspend fun getAllRmRecords(userId: String, limit: Int): Result<List<RmRecord>> {
        return try {
            val snapshot = rmRecordsCollection(userId)
                .orderBy("timestamp", Direction.DESCENDING)
                .limit(limit)
                .get()
            val records = snapshot.documents.mapNotNull { doc ->
                try {
                    doc.toRmRecord()
                } catch (e: Exception) {
                    println("FirestoreRmRepository: Failed to parse RM record: ${e.message}")
                    null
                }
            }
            Result.success(records)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("全RM記録の取得に失敗しました", e))
        }
    }

    override suspend fun deleteRmRecord(userId: String, recordId: String): Result<Unit> {
        return try {
            rmRecordsCollection(userId).document(recordId).delete()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("RM記録の削除に失敗しました", e))
        }
    }

    // ========== Mapping Functions ==========

    private fun DocumentSnapshot.toRmRecord(): RmRecord {
        return RmRecord(
            id = id,
            exerciseName = get<String?>("exerciseName") ?: "",
            category = get<String?>("category") ?: "",
            weight = get<Double?>("weight")?.toFloat() ?: 0f,
            reps = get<Int?>("reps") ?: 0,
            timestamp = getTimestampAsLong("timestamp"),
            createdAt = getTimestampAsLong("createdAt")
        )
    }

    private fun DocumentSnapshot.getTimestampAsLong(field: String): Long {
        return try {
            val ts = get<Timestamp?>(field)
            ts?.let { it.seconds * 1000 + it.nanoseconds / 1_000_000 } ?: 0L
        } catch (e: Exception) {
            try {
                get<Long?>(field) ?: 0L
            } catch (e2: Exception) {
                try {
                    get<Double?>(field)?.toLong() ?: 0L
                } catch (e3: Exception) {
                    0L
                }
            }
        }
    }
}
