package com.yourcoach.plus.shared.domain.model

import kotlinx.serialization.Serializable

/**
 * COMY投稿カテゴリ
 */
@Serializable
enum class ComyCategory(val displayName: String, val emoji: String) {
    QUESTION("質問", "❓"),
    TIPS("コツ・ノウハウ", "💡"),
    PROGRESS("経過報告", "📈"),
    RECIPE("レシピ", "🍳"),
    MOTIVATION("モチベーション", "🔥")
}

/**
 * COMY投稿
 */
@Serializable
data class ComyPost(
    val id: String = "",
    val userId: String = "",
    val authorName: String = "",
    val authorPhotoUrl: String? = null,
    val title: String = "",
    val content: String = "",
    val category: ComyCategory = ComyCategory.QUESTION,
    val authorLevel: Int = 1,
    val imageUrl: String? = null,  // 添付画像URL
    val likeCount: Int = 0,
    val commentCount: Int = 0,
    val createdAt: Long = 0
)

/**
 * COMYコメント
 */
@Serializable
data class ComyComment(
    val id: String = "",
    val postId: String = "",
    val userId: String = "",
    val authorName: String = "",
    val authorPhotoUrl: String? = null,
    val content: String = "",
    val createdAt: Long = 0
)

/**
 * COMYいいね
 */
@Serializable
data class ComyLike(
    val oderId: String = "",    // ユーザーID
    val postId: String = "",
    val likedAt: Long = 0
)

/**
 * フォロー関係
 */
@Serializable
data class Follow(
    val followerId: String = "",
    val followingId: String = "",
    val createdAt: Long = 0
)

/**
 * ブロック関係
 */
@Serializable
data class Block(
    val blockedUserId: String = "",
    val createdAt: Long = 0
)
