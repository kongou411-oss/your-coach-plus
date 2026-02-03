package com.yourcoach.plus.shared.domain.repository

import com.yourcoach.plus.shared.domain.model.PgBaseArticle
import com.yourcoach.plus.shared.domain.model.PgBaseCategory
import com.yourcoach.plus.shared.domain.model.UserArticleProgress
import kotlinx.coroutines.flow.Flow

/**
 * PGBASEリポジトリインターフェース
 */
interface PgBaseRepository {

    // ===== 記事取得 =====

    /**
     * すべての記事を取得
     */
    suspend fun getArticles(): Result<List<PgBaseArticle>>

    /**
     * 特定の記事を取得
     */
    suspend fun getArticle(articleId: String): Result<PgBaseArticle?>

    /**
     * カテゴリで記事をフィルタリング
     */
    suspend fun getArticlesByCategory(category: PgBaseCategory): Result<List<PgBaseArticle>>

    /**
     * 記事をリアルタイム監視
     */
    fun observeArticles(): Flow<List<PgBaseArticle>>

    // ===== ユーザー進捗 =====

    /**
     * ユーザーの全進捗を取得
     */
    suspend fun getUserProgress(userId: String): Result<List<UserArticleProgress>>

    /**
     * 記事を読了としてマーク
     */
    suspend fun markArticleCompleted(userId: String, articleId: String): Result<Unit>

    /**
     * 読了済み記事IDのセットを取得
     */
    suspend fun getCompletedArticleIds(userId: String): Result<Set<String>>

    /**
     * 読了済み記事IDをリアルタイム監視
     */
    fun observeCompletedArticleIds(userId: String): Flow<Set<String>>

    // ===== プレミアム記事 =====

    /**
     * プレミアム記事を購入（50クレジット消費）
     */
    suspend fun purchaseArticle(userId: String, articleId: String): Result<Unit>

    /**
     * 購入済み記事IDのセットを取得
     */
    suspend fun getPurchasedArticleIds(userId: String): Result<Set<String>>

    /**
     * 購入済み記事IDをリアルタイム監視
     */
    fun observePurchasedArticleIds(userId: String): Flow<Set<String>>

    /**
     * 記事にアクセスできるかどうかを確認
     * - 無料記事: 常にtrue
     * - プレミアム記事: 購入済みならtrue
     */
    suspend fun canAccessArticle(userId: String, articleId: String, isPremium: Boolean): Boolean
}
