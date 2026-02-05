package com.yourcoach.plus.android.data.repository

import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.yourcoach.plus.shared.domain.model.PgBaseArticle
import com.yourcoach.plus.shared.domain.model.PgBaseCategory
import com.yourcoach.plus.shared.domain.model.UserArticleProgress
import com.yourcoach.plus.shared.domain.repository.PgBaseRepository
import com.yourcoach.plus.shared.domain.repository.UserRepository
import com.yourcoach.plus.shared.util.AppError
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

/**
 * Firestore PGBASE リポジトリ実装
 */
class FirestorePgBaseRepository(
    private val userRepository: UserRepository
) : PgBaseRepository {

    companion object {
        const val PREMIUM_ARTICLE_COST = 50 // プレミアム記事購入に必要なクレジット
    }

    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()

    // グローバルな記事コレクション
    private val articlesCollection = firestore.collection("pgbase_articles")

    // ユーザーごとの進捗コレクション
    private fun userProgressCollection(userId: String) =
        firestore.collection("users").document(userId).collection("pgbase_progress")

    // ===== 記事取得 =====

    /**
     * すべての記事を取得
     */
    override suspend fun getArticles(): Result<List<PgBaseArticle>> {
        return try {
            android.util.Log.d("FirestorePgBase", "getArticles: fetching articles...")
            val docs = articlesCollection
                .orderBy("order", Query.Direction.ASCENDING)
                .get()
                .await()

            android.util.Log.d("FirestorePgBase", "getArticles: found ${docs.size()} documents")
            val articles = docs.documents.mapNotNull { doc ->
                android.util.Log.d("FirestorePgBase", "getArticles: doc ${doc.id} = ${doc.data}")
                doc.data?.let { mapToArticle(it, doc.id) }
            }
            android.util.Log.d("FirestorePgBase", "getArticles: mapped ${articles.size} articles")
            Result.success(articles)
        } catch (e: Exception) {
            android.util.Log.e("FirestorePgBase", "getArticles error", e)
            Result.failure(AppError.DatabaseError("記事の取得に失敗しました", e))
        }
    }

    /**
     * 特定の記事を取得
     */
    override suspend fun getArticle(articleId: String): Result<PgBaseArticle?> {
        return try {
            val doc = articlesCollection.document(articleId).get().await()
            if (doc.exists()) {
                Result.success(doc.data?.let { mapToArticle(it, doc.id) })
            } else {
                Result.success(null)
            }
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("記事の取得に失敗しました", e))
        }
    }

    /**
     * カテゴリで記事をフィルタリング
     */
    override suspend fun getArticlesByCategory(category: PgBaseCategory): Result<List<PgBaseArticle>> {
        return try {
            val docs = articlesCollection
                .whereEqualTo("category", category.name.lowercase())
                .orderBy("order", Query.Direction.ASCENDING)
                .get()
                .await()

            val articles = docs.documents.mapNotNull { doc ->
                doc.data?.let { mapToArticle(it, doc.id) }
            }
            Result.success(articles)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("記事の取得に失敗しました", e))
        }
    }

    /**
     * 記事をリアルタイム監視
     */
    override fun observeArticles(): Flow<List<PgBaseArticle>> = callbackFlow {
        val listener = articlesCollection
            .orderBy("order", Query.Direction.ASCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    // エラー時は空のリストを返す（クラッシュ防止）
                    android.util.Log.e("FirestorePgBase", "observeArticles error", error)
                    trySend(emptyList())
                    return@addSnapshotListener
                }

                val articles = snapshot?.documents?.mapNotNull { doc ->
                    doc.data?.let { mapToArticle(it, doc.id) }
                } ?: emptyList()

                trySend(articles)
            }
        awaitClose { listener.remove() }
    }

    // ===== ユーザー進捗 =====

    /**
     * ユーザーの全進捗を取得
     */
    override suspend fun getUserProgress(userId: String): Result<List<UserArticleProgress>> {
        return try {
            val docs = userProgressCollection(userId).get().await()
            val progressList = docs.documents.mapNotNull { doc ->
                doc.data?.let { mapToProgress(it, doc.id) }
            }
            Result.success(progressList)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("進捗の取得に失敗しました", e))
        }
    }

    /**
     * 記事を読了としてマーク
     */
    override suspend fun markArticleCompleted(userId: String, articleId: String): Result<Unit> {
        return try {
            val now = System.currentTimeMillis()
            val data = mapOf(
                "articleId" to articleId,
                "isCompleted" to true,
                "completedAt" to now
            )
            userProgressCollection(userId).document(articleId).set(data, com.google.firebase.firestore.SetOptions.merge()).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("読了の記録に失敗しました", e))
        }
    }

    /**
     * 読了済み記事IDのセットを取得
     */
    override suspend fun getCompletedArticleIds(userId: String): Result<Set<String>> {
        return try {
            val docs = userProgressCollection(userId)
                .whereEqualTo("isCompleted", true)
                .get()
                .await()

            val ids = docs.documents.mapNotNull { it.id }.toSet()
            Result.success(ids)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("進捗の取得に失敗しました", e))
        }
    }

    /**
     * 読了済み記事IDをリアルタイム監視
     */
    override fun observeCompletedArticleIds(userId: String): Flow<Set<String>> = callbackFlow {
        val listener = userProgressCollection(userId)
            .whereEqualTo("isCompleted", true)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    // エラー時は空のセットを返す（クラッシュ防止）
                    android.util.Log.e("FirestorePgBase", "observeCompletedArticleIds error", error)
                    trySend(emptySet())
                    return@addSnapshotListener
                }

                val ids = snapshot?.documents?.mapNotNull { it.id }?.toSet() ?: emptySet()
                trySend(ids)
            }
        awaitClose { listener.remove() }
    }

    // ===== プレミアム記事 =====

    /**
     * プレミアム記事を購入（50クレジット消費）
     */
    override suspend fun purchaseArticle(userId: String, articleId: String): Result<Unit> {
        return try {
            // クレジットを消費
            val useResult = userRepository.useCredits(userId, PREMIUM_ARTICLE_COST)
            if (useResult.isFailure) {
                return Result.failure(useResult.exceptionOrNull() ?: AppError.InsufficientCredits())
            }

            // 購入記録を保存
            val now = System.currentTimeMillis()
            val data = mapOf(
                "articleId" to articleId,
                "isPurchased" to true,
                "purchasedAt" to now
            )
            userProgressCollection(userId).document(articleId).set(data, com.google.firebase.firestore.SetOptions.merge()).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("記事の購入に失敗しました", e))
        }
    }

    /**
     * 購入済み記事IDのセットを取得
     */
    override suspend fun getPurchasedArticleIds(userId: String): Result<Set<String>> {
        return try {
            val docs = userProgressCollection(userId)
                .whereEqualTo("isPurchased", true)
                .get()
                .await()

            val ids = docs.documents.mapNotNull { it.id }.toSet()
            Result.success(ids)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("購入履歴の取得に失敗しました", e))
        }
    }

    /**
     * 購入済み記事IDをリアルタイム監視
     */
    override fun observePurchasedArticleIds(userId: String): Flow<Set<String>> = callbackFlow {
        val listener = userProgressCollection(userId)
            .whereEqualTo("isPurchased", true)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    // エラー時は空のセットを返す（クラッシュ防止）
                    android.util.Log.e("FirestorePgBase", "observePurchasedArticleIds error", error)
                    trySend(emptySet())
                    return@addSnapshotListener
                }

                val ids = snapshot?.documents?.mapNotNull { it.id }?.toSet() ?: emptySet()
                trySend(ids)
            }
        awaitClose { listener.remove() }
    }

    /**
     * 記事にアクセスできるかどうかを確認
     */
    override suspend fun canAccessArticle(userId: String, articleId: String, isPremium: Boolean): Boolean {
        // 無料記事は常にアクセス可能
        if (!isPremium) return true

        // プレミアム記事は購入済みならアクセス可能
        val purchasedIds = getPurchasedArticleIds(userId).getOrNull() ?: emptySet()
        return articleId in purchasedIds
    }

    // ===== ヘルパー関数 =====

    /**
     * Firestoreデータを記事モデルに変換
     */
    private fun mapToArticle(data: Map<String, Any>, id: String): PgBaseArticle {
        val categoryString = data["category"] as? String ?: "nutrition"
        val category = try {
            PgBaseCategory.valueOf(categoryString.uppercase())
        } catch (e: Exception) {
            PgBaseCategory.NUTRITION
        }

        return PgBaseArticle(
            id = id,
            title = data["title"] as? String ?: "",
            summary = data["summary"] as? String ?: "",
            content = data["content"] as? String ?: "",
            contentUrl = data["contentUrl"] as? String ?: "",
            category = category,
            readingTime = (data["readingTime"] as? Number)?.toInt() ?: 5,
            isPremium = data["isPremium"] as? Boolean ?: false,
            order = (data["order"] as? Number)?.toInt() ?: 0,
            createdAt = (data["createdAt"] as? Number)?.toLong() ?: 0L,
            updatedAt = (data["updatedAt"] as? Number)?.toLong() ?: 0L
        )
    }

    /**
     * Firestoreデータを進捗モデルに変換
     */
    private fun mapToProgress(data: Map<String, Any>, id: String): UserArticleProgress {
        return UserArticleProgress(
            oderId = "", // このフィールドはFirestoreには保存しない
            articleId = id,
            isCompleted = data["isCompleted"] as? Boolean ?: false,
            completedAt = (data["completedAt"] as? Number)?.toLong(),
            isPurchased = data["isPurchased"] as? Boolean ?: false,
            purchasedAt = (data["purchasedAt"] as? Number)?.toLong()
        )
    }
}
