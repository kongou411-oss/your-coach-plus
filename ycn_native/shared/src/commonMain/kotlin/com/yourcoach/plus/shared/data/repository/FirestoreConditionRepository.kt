package com.yourcoach.plus.shared.data.repository

import com.yourcoach.plus.shared.domain.model.Condition
import com.yourcoach.plus.shared.domain.repository.ConditionRepository
import com.yourcoach.plus.shared.util.AppError
import com.yourcoach.plus.shared.util.DateUtil
import dev.gitlive.firebase.Firebase
import dev.gitlive.firebase.firestore.Direction
import dev.gitlive.firebase.firestore.FirebaseFirestore
import dev.gitlive.firebase.firestore.firestore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * Firestore 体調リポジトリ実装 (GitLive KMP版)
 */
class FirestoreConditionRepository : ConditionRepository {

    private val firestore: FirebaseFirestore by lazy {
        try {
            Firebase.firestore
        } catch (e: Throwable) {
            println("FirestoreConditionRepository: Firebase.firestore initialization failed: ${e.message}")
            throw e
        }
    }

    private fun conditionCollection(userId: String) =
        firestore.collection("users").document(userId).collection("conditions")

    override suspend fun saveCondition(condition: Condition): Result<Unit> {
        return try {
            val docRef = conditionCollection(condition.userId).document(condition.date)
            docRef.set(conditionToMap(condition))
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("体調の記録に失敗しました", e))
        }
    }

    override suspend fun getCondition(userId: String, date: String): Result<Condition?> {
        return try {
            val doc = conditionCollection(userId).document(date).get()
            if (doc.exists) {
                Result.success(doc.toCondition(userId, date))
            } else {
                Result.success(null)
            }
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("体調の取得に失敗しました", e))
        }
    }

    override suspend fun getConditionsInRange(
        userId: String,
        startDate: String,
        endDate: String
    ): Result<List<Condition>> {
        return try {
            val snapshot = conditionCollection(userId)
                .where { "date" greaterThanOrEqualTo startDate }
                .where { "date" lessThanOrEqualTo endDate }
                .orderBy("date", Direction.ASCENDING)
                .get()

            val conditions = snapshot.documents.mapNotNull { doc ->
                try {
                    doc.toCondition(userId, doc.id)
                } catch (e: Exception) {
                    null
                }
            }
            Result.success(conditions)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("体調の取得に失敗しました", e))
        }
    }

    override fun observeCondition(userId: String, date: String): Flow<Condition?> {
        return conditionCollection(userId)
            .document(date)
            .snapshots
            .map { doc ->
                if (doc.exists) {
                    try {
                        doc.toCondition(userId, date)
                    } catch (e: Exception) {
                        null
                    }
                } else {
                    null
                }
            }
    }

    override suspend fun deleteCondition(userId: String, date: String): Result<Unit> {
        return try {
            conditionCollection(userId).document(date).delete()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("体調の削除に失敗しました", e))
        }
    }

    private fun conditionToMap(condition: Condition): Map<String, Any?> = mapOf(
        "userId" to condition.userId,
        "date" to condition.date,
        "sleepHours" to condition.sleepHours,
        "sleepQuality" to condition.sleepQuality,
        "digestion" to condition.digestion,
        "focus" to condition.focus,
        "stress" to condition.stress,
        "isPredicted" to condition.isPredicted,
        "updatedAt" to DateUtil.currentTimestamp()
    )

    private fun dev.gitlive.firebase.firestore.DocumentSnapshot.toCondition(
        userId: String,
        date: String
    ): Condition {
        return Condition(
            userId = get<String?>("userId") ?: userId,
            date = get<String?>("date") ?: date,
            sleepHours = get<Long?>("sleepHours")?.toInt(),
            sleepQuality = get<Long?>("sleepQuality")?.toInt(),
            digestion = get<Long?>("digestion")?.toInt(),
            focus = get<Long?>("focus")?.toInt(),
            stress = get<Long?>("stress")?.toInt(),
            isPredicted = get<Boolean?>("isPredicted") ?: false,
            updatedAt = get<Long?>("updatedAt") ?: 0
        )
    }
}
