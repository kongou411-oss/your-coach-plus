package com.yourcoach.plus.shared.domain.repository

import com.yourcoach.plus.shared.domain.model.Badge
import com.yourcoach.plus.shared.domain.model.BadgeCategory
import kotlinx.coroutines.flow.Flow

/**
 * バッジ/実績リポジトリインターフェース
 */
interface BadgeRepository {
    /**
     * ユーザーのバッジ一覧を取得
     */
    suspend fun getUserBadges(userId: String): Result<List<Badge>>

    /**
     * バッジをリアルタイムで監視
     */
    fun observeUserBadges(userId: String): Flow<List<Badge>>

    /**
     * 利用可能なすべてのバッジを取得
     */
    suspend fun getAllBadges(): Result<List<Badge>>

    /**
     * バッジを付与
     */
    suspend fun awardBadge(userId: String, badgeId: String): Result<Badge>

    /**
     * バッジ進捗を取得
     */
    suspend fun getBadgeProgress(userId: String): Result<Map<String, BadgeProgress>>

    /**
     * 統計を更新（バッジ判定用）
     * @param action アクション種別: meal_recorded, workout_recorded, analysis_completed, etc.
     * @param data 追加データ（score, duration, hour等）
     */
    suspend fun updateBadgeStats(action: String, data: Map<String, Any>? = null): Result<Unit>

    /**
     * バッジ達成チェック＆自動付与
     * @return 新たに獲得したバッジIDのリスト
     */
    suspend fun checkAndAwardBadges(): Result<List<String>>
}

/**
 * バッジ進捗
 */
data class BadgeProgress(
    val badgeId: String,
    val currentValue: Int,
    val targetValue: Int,
    val percentage: Float = (currentValue.toFloat() / targetValue * 100).coerceIn(0f, 100f)
)

/**
 * バッジ定義
 */
object BadgeDefinitions {
    val ALL_BADGES = listOf(
        // ストリーク系
        Badge(
            id = "streak_3",
            name = "3日連続",
            description = "3日連続で記録を達成",
            iconUrl = "",
            category = BadgeCategory.STREAK
        ),
        Badge(
            id = "streak_7",
            name = "1週間連続",
            description = "7日連続で記録を達成",
            iconUrl = "",
            category = BadgeCategory.STREAK
        ),
        Badge(
            id = "streak_14",
            name = "2週間連続",
            description = "14日連続で記録を達成",
            iconUrl = "",
            category = BadgeCategory.STREAK
        ),
        Badge(
            id = "streak_30",
            name = "1ヶ月連続",
            description = "30日連続で記録を達成",
            iconUrl = "",
            category = BadgeCategory.STREAK
        ),
        Badge(
            id = "streak_100",
            name = "100日連続",
            description = "100日連続で記録を達成",
            iconUrl = "",
            category = BadgeCategory.STREAK
        ),

        // 栄養系
        Badge(
            id = "nutrition_perfect_day",
            name = "パーフェクトデイ",
            description = "食事スコア90点以上を達成",
            iconUrl = "",
            category = BadgeCategory.NUTRITION
        ),
        Badge(
            id = "nutrition_protein_master",
            name = "プロテインマスター",
            description = "タンパク質目標を7日連続達成",
            iconUrl = "",
            category = BadgeCategory.NUTRITION
        ),
        Badge(
            id = "nutrition_balanced",
            name = "バランス上手",
            description = "全栄養素のスコアが70点以上",
            iconUrl = "",
            category = BadgeCategory.NUTRITION
        ),

        // 運動系
        Badge(
            id = "exercise_first",
            name = "はじめの一歩",
            description = "初めての運動を記録",
            iconUrl = "",
            category = BadgeCategory.EXERCISE
        ),
        Badge(
            id = "exercise_60min",
            name = "60分達成",
            description = "1日に60分以上の運動を達成",
            iconUrl = "",
            category = BadgeCategory.EXERCISE
        ),
        Badge(
            id = "exercise_variety",
            name = "多彩なトレーニング",
            description = "5種類以上の運動を1日で実施",
            iconUrl = "",
            category = BadgeCategory.EXERCISE
        ),

        // マイルストーン系
        Badge(
            id = "milestone_first_meal",
            name = "最初の一食",
            description = "初めての食事を記録",
            iconUrl = "",
            category = BadgeCategory.MILESTONE
        ),
        Badge(
            id = "milestone_10_meals",
            name = "10食達成",
            description = "累計10食の記録を達成",
            iconUrl = "",
            category = BadgeCategory.MILESTONE
        ),
        Badge(
            id = "milestone_100_meals",
            name = "100食達成",
            description = "累計100食の記録を達成",
            iconUrl = "",
            category = BadgeCategory.MILESTONE
        ),
        Badge(
            id = "milestone_first_analysis",
            name = "初めてのAI分析",
            description = "初めてAI分析を実行",
            iconUrl = "",
            category = BadgeCategory.MILESTONE
        ),

        // 特別系
        Badge(
            id = "special_early_bird",
            name = "早起き鳥",
            description = "朝7時前に朝食を記録",
            iconUrl = "",
            category = BadgeCategory.SPECIAL
        ),
        Badge(
            id = "special_weekend_warrior",
            name = "週末戦士",
            description = "週末に運動を記録",
            iconUrl = "",
            category = BadgeCategory.SPECIAL
        ),
        Badge(
            id = "special_score_100",
            name = "パーフェクトスコア",
            description = "総合スコア100点を達成",
            iconUrl = "",
            category = BadgeCategory.SPECIAL
        )
    )

    fun getBadgeById(id: String): Badge? = ALL_BADGES.find { it.id == id }

    fun getBadgesByCategory(category: BadgeCategory): List<Badge> =
        ALL_BADGES.filter { it.category == category }
}
