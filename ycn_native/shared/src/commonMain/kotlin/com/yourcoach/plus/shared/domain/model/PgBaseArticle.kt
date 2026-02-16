package com.yourcoach.plus.shared.domain.model

import kotlinx.serialization.Serializable

/**
 * PGBASE記事カテゴリ
 */
@Serializable
enum class PgBaseCategory(val displayName: String, val emoji: String) {
    PROTEIN("タンパク質", "🍖"),
    FAT("脂質", "🥑"),
    CARBS("炭水化物", "🍚"),
    VITAMINS("ビタミン・ミネラル", "💊"),
    TRAINING("トレーニング", "💪"),
    RECOVERY("回復・休養", "😴"),
    MINDSET("メンタル", "🧠")
}

/**
 * PGBASE記事
 */
@Serializable
data class PgBaseArticle(
    val id: String = "",
    val title: String = "",
    val summary: String = "",
    val content: String = "",           // 記事本文（Markdown）- 後方互換性のため残す
    val contentUrl: String = "",        // 記事HTML URL（優先）
    val category: PgBaseCategory = PgBaseCategory.PROTEIN,
    val readingTime: Int = 5,           // 読了予想時間（分）
    val isPremium: Boolean = false,     // プレミアム記事かどうか
    val order: Int = 0,                 // 表示順
    val createdAt: Long = 0,
    val updatedAt: Long = 0
)

/**
 * ユーザーの記事進捗
 */
@Serializable
data class UserArticleProgress(
    val oderId: String = "",            // ユーザーID
    val articleId: String = "",         // 記事ID
    val isCompleted: Boolean = false,   // 読了済みかどうか
    val completedAt: Long? = null,      // 読了日時
    val isPurchased: Boolean = false,   // プレミアム記事購入済み
    val purchasedAt: Long? = null       // 購入日時
)
