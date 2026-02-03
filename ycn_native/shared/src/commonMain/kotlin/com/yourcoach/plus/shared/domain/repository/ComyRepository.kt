package com.yourcoach.plus.shared.domain.repository

import com.yourcoach.plus.shared.domain.model.ComyCategory
import com.yourcoach.plus.shared.domain.model.ComyComment
import com.yourcoach.plus.shared.domain.model.ComyPost
import kotlinx.coroutines.flow.Flow

/**
 * COMYリポジトリインターフェース
 */
interface ComyRepository {

    // ===== 投稿 =====

    /**
     * 投稿を取得（ページネーション対応）
     */
    suspend fun getPosts(
        category: ComyCategory? = null,
        limit: Int = 20,
        lastVisiblePostId: String? = null
    ): Result<List<ComyPost>>

    /**
     * 特定の投稿を取得
     */
    suspend fun getPost(postId: String): Result<ComyPost?>

    /**
     * 投稿をリアルタイム監視
     */
    fun observePosts(category: ComyCategory? = null, limit: Int = 20): Flow<List<ComyPost>>

    /**
     * 投稿を作成
     */
    suspend fun createPost(post: ComyPost): Result<String>

    /**
     * 投稿を削除
     */
    suspend fun deletePost(postId: String): Result<Unit>

    // ===== いいね =====

    /**
     * いいねをトグル（トランザクション使用）
     * @return 新しいいいね状態（true = いいね済み）
     */
    suspend fun toggleLike(userId: String, postId: String): Result<Boolean>

    /**
     * いいね済み投稿IDのセットを取得
     */
    suspend fun getLikedPostIds(userId: String): Result<Set<String>>

    /**
     * いいね済み投稿IDをリアルタイム監視
     */
    fun observeLikedPostIds(userId: String): Flow<Set<String>>

    // ===== コメント =====

    /**
     * コメントを取得
     */
    suspend fun getComments(postId: String): Result<List<ComyComment>>

    /**
     * コメントをリアルタイム監視
     */
    fun observeComments(postId: String): Flow<List<ComyComment>>

    /**
     * コメントを追加
     */
    suspend fun addComment(comment: ComyComment): Result<String>

    /**
     * コメントを削除
     */
    suspend fun deleteComment(postId: String, commentId: String): Result<Unit>
}
