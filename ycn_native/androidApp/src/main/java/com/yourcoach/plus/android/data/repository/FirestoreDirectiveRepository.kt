package com.yourcoach.plus.android.data.repository

import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.yourcoach.plus.shared.domain.model.Directive
import com.yourcoach.plus.shared.domain.model.DirectiveType
import com.yourcoach.plus.shared.domain.repository.DirectiveRepository
import com.yourcoach.plus.shared.util.AppError
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import java.time.LocalDate
import java.time.format.DateTimeFormatter

/**
 * Firestore 指示書リポジトリ実装
 */
class FirestoreDirectiveRepository : DirectiveRepository {

    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()

    private fun directivesCollection(userId: String) =
        firestore.collection("users").document(userId).collection("directives")

    /**
     * 指示書を保存
     */
    override suspend fun saveDirective(directive: Directive): Result<String> {
        return try {
            val docRef = directivesCollection(directive.userId).document(directive.date)
            val data = mapOf(
                "userId" to directive.userId,
                "date" to directive.date,
                "message" to directive.message,
                "type" to directive.type.name.lowercase(),
                "completed" to directive.completed,
                "deadline" to directive.deadline,
                "createdAt" to (directive.createdAt.takeIf { it > 0 } ?: System.currentTimeMillis()),
                "executedItems" to directive.executedItems
            )
            docRef.set(data).await()
            Result.success(directive.date)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("指示書の保存に失敗しました", e))
        }
    }

    /**
     * 特定日の指示書を取得
     */
    override suspend fun getDirective(userId: String, date: String): Result<Directive?> {
        return try {
            val doc = directivesCollection(userId).document(date).get().await()
            if (doc.exists()) {
                Result.success(mapToDirective(doc.data!!, doc.id))
            } else {
                Result.success(null)
            }
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("指示書の取得に失敗しました", e))
        }
    }

    /**
     * 特定日の指示書をリアルタイム監視
     */
    override fun observeDirective(userId: String, date: String): Flow<Directive?> = callbackFlow {
        val listener = directivesCollection(userId)
            .document(date)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }
                val directive = snapshot?.data?.let { mapToDirective(it, date) }
                trySend(directive)
            }
        awaitClose { listener.remove() }
    }

    /**
     * 指示書を更新
     */
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
                .await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("指示書の更新に失敗しました", e))
        }
    }

    /**
     * 指示書を完了にする
     */
    override suspend fun completeDirective(userId: String, date: String): Result<Unit> {
        return try {
            directivesCollection(userId)
                .document(date)
                .update("completed", true)
                .await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("指示書の完了処理に失敗しました", e))
        }
    }

    /**
     * 指示書を削除
     */
    override suspend fun deleteDirective(userId: String, date: String): Result<Unit> {
        return try {
            directivesCollection(userId).document(date).delete().await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("指示書の削除に失敗しました", e))
        }
    }

    /**
     * 最近の指示書一覧を取得
     */
    override suspend fun getRecentDirectives(userId: String, days: Int): Result<List<Directive>> {
        return try {
            val startDate = LocalDate.now().minusDays(days.toLong())
                .format(DateTimeFormatter.ISO_LOCAL_DATE)

            val docs = directivesCollection(userId)
                .whereGreaterThanOrEqualTo("date", startDate)
                .orderBy("date", Query.Direction.DESCENDING)
                .get()
                .await()

            val directives = docs.documents.mapNotNull { doc ->
                doc.data?.let { mapToDirective(it, doc.id) }
            }
            Result.success(directives)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("指示書の取得に失敗しました", e))
        }
    }

    /**
     * 完了したアイテムのindexリストを更新
     */
    override suspend fun updateExecutedItems(userId: String, date: String, executedItems: List<Int>): Result<Unit> {
        return try {
            directivesCollection(userId)
                .document(date)
                .update("executedItems", executedItems)
                .await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("完了状態の更新に失敗しました", e))
        }
    }

    /**
     * Firestoreデータをモデルに変換
     */
    @Suppress("UNCHECKED_CAST")
    private fun mapToDirective(data: Map<String, Any>, id: String): Directive {
        val typeString = data["type"] as? String ?: "meal"
        val type = try {
            DirectiveType.valueOf(typeString.uppercase())
        } catch (e: Exception) {
            DirectiveType.MEAL
        }

        // executedItemsを読み込み（List<Long>として保存されている場合があるのでIntに変換）
        val executedItems = (data["executedItems"] as? List<*>)
            ?.mapNotNull { (it as? Number)?.toInt() }
            ?: emptyList()

        return Directive(
            id = id,
            userId = data["userId"] as? String ?: "",
            date = data["date"] as? String ?: id,
            message = data["message"] as? String ?: "",
            type = type,
            completed = data["completed"] as? Boolean ?: false,
            deadline = data["deadline"] as? String,
            createdAt = (data["createdAt"] as? Number)?.toLong() ?: 0L,
            executedItems = executedItems
        )
    }
}
