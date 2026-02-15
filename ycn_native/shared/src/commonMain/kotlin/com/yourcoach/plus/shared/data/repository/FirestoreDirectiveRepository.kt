package com.yourcoach.plus.shared.data.repository

import com.yourcoach.plus.shared.domain.model.Directive
import com.yourcoach.plus.shared.domain.model.DirectiveType
import com.yourcoach.plus.shared.domain.repository.DirectiveRepository
import com.yourcoach.plus.shared.util.AppError
import com.yourcoach.plus.shared.util.DateUtil
import dev.gitlive.firebase.Firebase
import dev.gitlive.firebase.firestore.Direction
import dev.gitlive.firebase.firestore.DocumentSnapshot
import dev.gitlive.firebase.firestore.FirebaseFirestore
import dev.gitlive.firebase.firestore.Timestamp
import dev.gitlive.firebase.firestore.firestore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * Firestore 指示書リポジトリ実装 (GitLive KMP版)
 */
class FirestoreDirectiveRepository : DirectiveRepository {

    private val firestore: FirebaseFirestore by lazy {
        try {
            Firebase.firestore
        } catch (e: Throwable) {
            println("FirestoreDirectiveRepository: Firebase.firestore initialization failed: ${e.message}")
            throw e
        }
    }

    private fun directivesCollection(userId: String) =
        firestore.collection("users").document(userId).collection("directives")

    override suspend fun saveDirective(directive: Directive): Result<String> {
        return try {
            // 日付をドキュメントIDとして使用
            val docId = directive.date
            val directiveWithId = directive.copy(id = docId)
            directivesCollection(directive.userId)
                .document(docId)
                .set(directiveToMap(directiveWithId))
            Result.success(docId)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("指示書の保存に失敗しました", e))
        }
    }

    override suspend fun getDirective(userId: String, date: String): Result<Directive?> {
        return try {
            val doc = directivesCollection(userId).document(date).get()
            if (doc.exists) {
                Result.success(doc.toDirective())
            } else {
                Result.success(null)
            }
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("指示書の取得に失敗しました", e))
        }
    }

    override fun observeDirective(userId: String, date: String): Flow<Directive?> {
        return directivesCollection(userId)
            .document(date)
            .snapshots
            .map { doc ->
                if (doc.exists) {
                    try {
                        doc.toDirective()
                    } catch (e: Exception) {
                        null
                    }
                } else {
                    null
                }
            }
    }

    override suspend fun updateDirective(directive: Directive): Result<Unit> {
        return try {
            val data = mapOf(
                "message" to directive.message,
                "type" to directive.type.name.lowercase(),
                "completed" to directive.completed
            )
            directivesCollection(directive.userId)
                .document(directive.date)
                .update(data)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("指示書の更新に失敗しました", e))
        }
    }

    override suspend fun completeDirective(userId: String, date: String): Result<Unit> {
        return try {
            directivesCollection(userId)
                .document(date)
                .update(mapOf("completed" to true))
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("指示書の完了に失敗しました", e))
        }
    }

    override suspend fun deleteDirective(userId: String, date: String): Result<Unit> {
        return try {
            directivesCollection(userId).document(date).delete()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("指示書の削除に失敗しました", e))
        }
    }

    override suspend fun getRecentDirectives(userId: String, days: Int): Result<List<Directive>> {
        return try {
            val today = DateUtil.todayString()
            val startDate = DateUtil.addDays(today, -days)

            val snapshot = directivesCollection(userId)
                .where { "date" greaterThanOrEqualTo startDate }
                .orderBy("date", Direction.DESCENDING)
                .get()

            val directives = snapshot.documents.mapNotNull { doc ->
                try {
                    doc.toDirective()
                } catch (e: Exception) {
                    null
                }
            }
            Result.success(directives)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("指示書の取得に失敗しました", e))
        }
    }

    override suspend fun updateExecutedItems(
        userId: String,
        date: String,
        executedItems: List<Int>
    ): Result<Unit> {
        return try {
            directivesCollection(userId)
                .document(date)
                .update(mapOf("executedItems" to executedItems))
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("実行済みアイテムの更新に失敗しました", e))
        }
    }

    // ========== Mapping Functions ==========

    private fun directiveToMap(directive: Directive): Map<String, Any?> = mapOf(
        "userId" to directive.userId,
        "date" to directive.date,
        "message" to directive.message,
        "type" to directive.type.name.lowercase(),
        "completed" to directive.completed,
        "deadline" to directive.deadline,
        "createdAt" to if (directive.createdAt > 0) directive.createdAt else DateUtil.currentTimestamp(),
        "executedItems" to directive.executedItems
    )

    @Suppress("UNCHECKED_CAST")
    private fun DocumentSnapshot.toDirective(): Directive {
        val typeStr = get<String?>("type") ?: "meal"
        val type = try {
            DirectiveType.valueOf(typeStr.uppercase())
        } catch (e: Exception) {
            DirectiveType.MEAL
        }

        // executedItemsの取得（List<Long>をList<Int>に変換）
        val executedItems = try {
            val list = get<List<Long>?>("executedItems")
            list?.map { it.toInt() } ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }

        // createdAtの取得（Timestamp→Long変換、serverTimestamp()対応）
        val createdAt = getTimestampAsLong("createdAt")

        return Directive(
            id = id,
            userId = get<String?>("userId") ?: "",
            date = get<String?>("date") ?: "",
            message = get<String?>("message") ?: "",
            type = type,
            completed = get<Boolean?>("completed") ?: false,
            deadline = get<String?>("deadline"),
            createdAt = createdAt,
            executedItems = executedItems
        )
    }

    /**
     * Firestore Timestamp or Long を Long に変換
     * Cloud Function の serverTimestamp() は Timestamp 型で保存されるため
     */
    private fun DocumentSnapshot.getTimestampAsLong(field: String): Long {
        return try {
            val ts = get<Timestamp?>(field)
            ts?.let { it.seconds * 1000 + it.nanoseconds / 1_000_000 } ?: 0L
        } catch (e: Exception) {
            try {
                get<Long?>(field) ?: 0L
            } catch (e2: Exception) {
                0L
            }
        }
    }
}
