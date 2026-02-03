package com.yourcoach.plus.android.data.repository

import com.google.firebase.firestore.FirebaseFirestore
import com.yourcoach.plus.shared.domain.model.Condition
import com.yourcoach.plus.shared.domain.repository.ConditionRepository
import com.yourcoach.plus.shared.util.AppError
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

/**
 * Firestore コンディションリポジトリ実装
 */
class FirestoreConditionRepository : ConditionRepository {

    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()

    private fun conditionsCollection(userId: String) =
        firestore.collection("users").document(userId).collection("conditions")

    /**
     * コンディションを記録・更新
     */
    override suspend fun saveCondition(condition: Condition): Result<Unit> {
        return try {
            val data = mapOf(
                "userId" to condition.userId,
                "date" to condition.date,
                "sleepHours" to condition.sleepHours,
                "sleepQuality" to condition.sleepQuality,
                "digestion" to condition.digestion,
                "focus" to condition.focus,
                "stress" to condition.stress,
                "isPredicted" to condition.isPredicted,
                "updatedAt" to System.currentTimeMillis()
            )
            conditionsCollection(condition.userId)
                .document(condition.date)
                .set(data)
                .await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("コンディションの保存に失敗しました", e))
        }
    }

    /**
     * 特定日のコンディションを取得
     */
    override suspend fun getCondition(userId: String, date: String): Result<Condition?> {
        return try {
            val doc = conditionsCollection(userId).document(date).get().await()
            if (doc.exists()) {
                Result.success(mapToCondition(doc.data!!, userId, date))
            } else {
                Result.success(null)
            }
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("コンディションの取得に失敗しました", e))
        }
    }

    /**
     * 特定日のコンディションをリアルタイム監視
     */
    override fun observeCondition(userId: String, date: String): Flow<Condition?> = callbackFlow {
        val listener = conditionsCollection(userId)
            .document(date)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }
                val condition = snapshot?.data?.let { mapToCondition(it, userId, date) }
                trySend(condition)
            }
        awaitClose { listener.remove() }
    }

    /**
     * 日付範囲のコンディションを取得
     */
    override suspend fun getConditionsInRange(
        userId: String,
        startDate: String,
        endDate: String
    ): Result<List<Condition>> {
        return try {
            val docs = conditionsCollection(userId)
                .whereGreaterThanOrEqualTo("date", startDate)
                .whereLessThanOrEqualTo("date", endDate)
                .get()
                .await()

            val conditions = docs.documents.mapNotNull { doc ->
                doc.data?.let { mapToCondition(it, userId, doc.id) }
            }
            Result.success(conditions)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("コンディションの取得に失敗しました", e))
        }
    }

    /**
     * コンディションを削除
     */
    override suspend fun deleteCondition(userId: String, date: String): Result<Unit> {
        return try {
            conditionsCollection(userId).document(date).delete().await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("コンディションの削除に失敗しました", e))
        }
    }

    /**
     * Firestoreデータをモデルに変換
     */
    private fun mapToCondition(data: Map<String, Any>, userId: String, date: String): Condition {
        return Condition(
            userId = userId,
            date = date,
            sleepHours = (data["sleepHours"] as? Number)?.toInt(),
            sleepQuality = (data["sleepQuality"] as? Number)?.toInt(),
            digestion = (data["digestion"] as? Number)?.toInt(),
            focus = (data["focus"] as? Number)?.toInt(),
            stress = (data["stress"] as? Number)?.toInt(),
            isPredicted = data["isPredicted"] as? Boolean ?: false,
            updatedAt = (data["updatedAt"] as? Number)?.toLong() ?: 0L
        )
    }
}
