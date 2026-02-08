package com.yourcoach.plus.shared.data.repository

import com.yourcoach.plus.shared.domain.model.PgBaseArticle
import com.yourcoach.plus.shared.domain.model.PgBaseCategory
import com.yourcoach.plus.shared.domain.model.UserArticleProgress
import com.yourcoach.plus.shared.domain.repository.PgBaseRepository
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
 * Firestore PGBASEリポジトリ実装 (GitLive KMP版)
 */
class FirestorePgBaseRepository : PgBaseRepository {

    private val firestore: FirebaseFirestore by lazy { Firebase.firestore }

    private val articlesCollection by lazy {
        firestore.collection("pgbase_articles")
    }

    private fun userProgressCollection(userId: String) =
        firestore.collection("users").document(userId).collection("pgbase_progress")

    override suspend fun getArticles(): Result<List<PgBaseArticle>> {
        return try {
            val snapshot = articlesCollection
                .orderBy("order", Direction.ASCENDING)
                .get()

            val articles = snapshot.documents.mapNotNull { doc ->
                try {
                    doc.toArticle()
                } catch (e: Exception) {
                    null
                }
            }
            Result.success(articles)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("記事の取得に失敗しました", e))
        }
    }

    override suspend fun getArticle(articleId: String): Result<PgBaseArticle?> {
        return try {
            val doc = articlesCollection.document(articleId).get()
            if (doc.exists) {
                Result.success(doc.toArticle())
            } else {
                Result.success(null)
            }
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("記事の取得に失敗しました", e))
        }
    }

    override suspend fun getArticlesByCategory(category: PgBaseCategory): Result<List<PgBaseArticle>> {
        return try {
            val snapshot = articlesCollection
                .where { "category" equalTo category.name }
                .orderBy("order", Direction.ASCENDING)
                .get()

            val articles = snapshot.documents.mapNotNull { doc ->
                try {
                    doc.toArticle()
                } catch (e: Exception) {
                    null
                }
            }
            Result.success(articles)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("記事の取得に失敗しました", e))
        }
    }

    override fun observeArticles(): Flow<List<PgBaseArticle>> {
        return articlesCollection
            .orderBy("order", Direction.ASCENDING)
            .snapshots
            .map { snapshot ->
                snapshot.documents.mapNotNull { doc ->
                    try {
                        doc.toArticle()
                    } catch (e: Exception) {
                        null
                    }
                }
            }
    }

    override suspend fun getUserProgress(userId: String): Result<List<UserArticleProgress>> {
        return try {
            val snapshot = userProgressCollection(userId).get()
            val progress = snapshot.documents.mapNotNull { doc ->
                try {
                    doc.toUserProgress()
                } catch (e: Exception) {
                    null
                }
            }
            Result.success(progress)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("進捗の取得に失敗しました", e))
        }
    }

    override suspend fun markArticleCompleted(userId: String, articleId: String): Result<Unit> {
        return try {
            userProgressCollection(userId).document(articleId).set(
                mapOf(
                    "articleId" to articleId,
                    "isCompleted" to true,
                    "completedAt" to DateUtil.currentTimestamp()
                )
            )
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("読了マークに失敗しました", e))
        }
    }

    override suspend fun getCompletedArticleIds(userId: String): Result<Set<String>> {
        return try {
            val snapshot = userProgressCollection(userId)
                .where { "isCompleted" equalTo true }
                .get()

            val ids = snapshot.documents.map { it.id }.toSet()
            Result.success(ids)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("読了記事の取得に失敗しました", e))
        }
    }

    override fun observeCompletedArticleIds(userId: String): Flow<Set<String>> {
        return userProgressCollection(userId)
            .where { "isCompleted" equalTo true }
            .snapshots
            .map { snapshot ->
                snapshot.documents.map { it.id }.toSet()
            }
    }

    override suspend fun purchaseArticle(userId: String, articleId: String): Result<Unit> {
        return try {
            // クレジット消費はCloud Functions側で行う想定
            userProgressCollection(userId).document(articleId).update(
                mapOf(
                    "isPurchased" to true,
                    "purchasedAt" to DateUtil.currentTimestamp()
                )
            )
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("記事の購入に失敗しました", e))
        }
    }

    override suspend fun getPurchasedArticleIds(userId: String): Result<Set<String>> {
        return try {
            val snapshot = userProgressCollection(userId)
                .where { "isPurchased" equalTo true }
                .get()

            val ids = snapshot.documents.map { it.id }.toSet()
            Result.success(ids)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("購入記事の取得に失敗しました", e))
        }
    }

    override fun observePurchasedArticleIds(userId: String): Flow<Set<String>> {
        return userProgressCollection(userId)
            .where { "isPurchased" equalTo true }
            .snapshots
            .map { snapshot ->
                snapshot.documents.map { it.id }.toSet()
            }
    }

    override fun observeUserProgressIds(userId: String): Flow<Pair<Set<String>, Set<String>>> {
        return userProgressCollection(userId)
            .snapshots
            .map { snapshot ->
                val completedIds = mutableSetOf<String>()
                val purchasedIds = mutableSetOf<String>()
                snapshot.documents.forEach { doc ->
                    val isCompleted = try { doc.get<Boolean?>("isCompleted") ?: false } catch (_: Exception) { false }
                    val isPurchased = try { doc.get<Boolean?>("isPurchased") ?: false } catch (_: Exception) { false }
                    if (isCompleted) completedIds.add(doc.id)
                    if (isPurchased) purchasedIds.add(doc.id)
                }
                Pair(completedIds.toSet(), purchasedIds.toSet())
            }
    }

    override suspend fun canAccessArticle(userId: String, articleId: String, isPremium: Boolean): Boolean {
        // プレミアム会員は全記事アクセス可能
        if (isPremium) return true

        // 記事を取得
        val articleResult = getArticle(articleId)
        val article = articleResult.getOrNull() ?: return false

        // 無料記事はアクセス可能
        if (!article.isPremium) return true

        // プレミアム記事は購入済みならアクセス可能
        val purchasedResult = getPurchasedArticleIds(userId)
        val purchasedIds = purchasedResult.getOrNull() ?: emptySet()
        return purchasedIds.contains(articleId)
    }

    // ========== Mapping Functions ==========

    /**
     * Firestoreフィールドをミリ秒Longとして取得
     * Timestamp型を先に試行（iOS: FIRTimestamp, Firestoreネイティブ形式）
     * Long型にフォールバック（Android: ミリ秒Long保存の場合）
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

    /**
     * Firestoreフィールドをnullable ミリ秒Longとして取得
     */
    private fun DocumentSnapshot.getTimestampAsLongOrNull(field: String): Long? {
        return try {
            val ts = get<Timestamp?>(field)
            ts?.let { it.seconds * 1000 + it.nanoseconds / 1_000_000 }
        } catch (e: Exception) {
            try {
                get<Long?>(field)
            } catch (e2: Exception) {
                null
            }
        }
    }

    /**
     * FirestoreフィールドをIntとして安全に取得（Long/Double対応）
     */
    private fun DocumentSnapshot.getIntSafe(field: String, default: Int): Int {
        return try {
            get<Long?>(field)?.toInt() ?: default
        } catch (e: Exception) {
            try {
                get<Double?>(field)?.toInt() ?: default
            } catch (e2: Exception) {
                default
            }
        }
    }

    private fun DocumentSnapshot.toArticle(): PgBaseArticle {
        val categoryStr = get<String?>("category") ?: "NUTRITION"
        val category = try {
            PgBaseCategory.valueOf(categoryStr)
        } catch (e: Exception) {
            try {
                PgBaseCategory.valueOf(categoryStr.uppercase())
            } catch (e2: Exception) {
                PgBaseCategory.NUTRITION
            }
        }

        return PgBaseArticle(
            id = id,
            title = get<String?>("title") ?: "",
            summary = get<String?>("summary") ?: "",
            content = get<String?>("content") ?: "",
            contentUrl = get<String?>("contentUrl") ?: "",
            category = category,
            readingTime = getIntSafe("readingTime", 5),
            isPremium = get<Boolean?>("isPremium") ?: false,
            order = getIntSafe("order", 0),
            createdAt = getTimestampAsLong("createdAt"),
            updatedAt = getTimestampAsLong("updatedAt")
        )
    }

    private fun DocumentSnapshot.toUserProgress(): UserArticleProgress {
        return UserArticleProgress(
            articleId = id,
            isCompleted = get<Boolean?>("isCompleted") ?: false,
            completedAt = getTimestampAsLongOrNull("completedAt"),
            isPurchased = get<Boolean?>("isPurchased") ?: false,
            purchasedAt = getTimestampAsLongOrNull("purchasedAt")
        )
    }
}
