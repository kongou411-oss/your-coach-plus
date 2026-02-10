package com.yourcoach.plus.shared.domain.model

import kotlinx.serialization.Serializable

/**
 * 日次スコアシステム
 * 元のservices.js calculateScores関数に対応
 */
@Serializable
data class DailyScore(
    val userId: String,
    val date: String,  // YYYY-MM-DD format

    // === 食事スコア (10項目) ===
    val foodScore: Int = 0,          // 総合食事スコア
    val calorieScore: Int = 0,       // カロリー (10%)
    val proteinScore: Int = 0,       // タンパク質 (20%)
    val fatScore: Int = 0,           // 脂質 (20%)
    val carbsScore: Int = 0,         // 炭水化物 (20%)
    val diaasScore: Int = 0,         // DIAAS (5%)
    val fattyAcidScore: Int = 0,     // 脂肪酸バランス (5%)
    val glScore: Int = 0,            // 血糖管理 (5%)
    val fiberScore: Int = 0,         // 食物繊維 (5%)
    val vitaminScore: Int = 0,       // ビタミン (5%)
    val mineralScore: Int = 0,       // ミネラル (5%)

    // === 運動スコア ===
    val exerciseScore: Int = 0,      // 総合運動スコア
    val durationScore: Int = 0,      // 時間スコア
    val exerciseCountScore: Int = 0, // 種目数スコア
    val totalMinutes: Int = 0,       // 運動時間 (分)
    val exerciseCount: Int = 0,      // 運動種目数
    val totalCaloriesBurned: Int = 0, // 運動消費カロリー (MET計算)

    // === コンディションスコア ===
    val conditionScore: Int = 0,     // 総合コンディションスコア
    val sleepScore: Int = 0,         // 睡眠時間
    val sleepQualityScore: Int = 0,  // 睡眠品質
    val digestionScore: Int = 0,     // 消化
    val focusScore: Int = 0,         // 集中力
    val stressScore: Int = 0,        // ストレス

    // === 実際の摂取量 ===
    val totalCalories: Float = 0f,
    val totalProtein: Float = 0f,
    val totalFat: Float = 0f,
    val totalCarbs: Float = 0f,
    val totalFiber: Float = 0f,
    val avgDIAAS: Float = 0f,
    val totalGL: Float = 0f,

    // 総合スコア (食事60% + 運動30% + コンディション10%)
    val totalScore: Int = 0,

    // ゲーミフィケーション
    val xpEarned: Int = 0,
    val streak: Int = 0,
    val badges: List<String> = emptyList(),

    // ピンポイントカロリー調整
    val calorieOverride: CalorieOverride? = null,

    // メタデータ
    val updatedAt: Long = 0
) {
    /**
     * 食事スコアをリストとして取得 (レーダーチャート用)
     * 元プロジェクト準拠: 10項目
     */
    fun toFoodScoreList(): List<ScoreAxis> = listOf(
        ScoreAxis("カロリー", calorieScore, ScoreAxisType.CALORIES),
        ScoreAxis("タンパク質", proteinScore, ScoreAxisType.PROTEIN),
        ScoreAxis("脂質", fatScore, ScoreAxisType.FAT),
        ScoreAxis("炭水化物", carbsScore, ScoreAxisType.CARBS),
        ScoreAxis("DIAAS", diaasScore, ScoreAxisType.DIAAS),
        ScoreAxis("脂肪酸", fattyAcidScore, ScoreAxisType.FATTY_ACID),
        ScoreAxis("GL", glScore, ScoreAxisType.GL),
        ScoreAxis("食物繊維", fiberScore, ScoreAxisType.FIBER),
        ScoreAxis("ビタミン", vitaminScore, ScoreAxisType.VITAMIN),
        ScoreAxis("ミネラル", mineralScore, ScoreAxisType.MINERAL)
    )

    /**
     * スコアのカテゴリを判定
     */
    fun getScoreCategory(): ScoreCategory = when {
        totalScore >= 90 -> ScoreCategory.EXCELLENT
        totalScore >= 70 -> ScoreCategory.GOOD
        totalScore >= 50 -> ScoreCategory.AVERAGE
        totalScore >= 30 -> ScoreCategory.NEEDS_IMPROVEMENT
        else -> ScoreCategory.POOR
    }
}

@Serializable
data class ScoreAxis(
    val name: String,
    val score: Int,
    val type: ScoreAxisType
)

@Serializable
enum class ScoreAxisType {
    CALORIES,     // カロリー
    PROTEIN,      // タンパク質
    CARBS,        // 炭水化物
    FAT,          // 脂質
    FIBER,        // 食物繊維
    DIAAS,        // タンパク質品質
    FATTY_ACID,   // 脂肪酸バランス
    GL,           // 血糖管理
    VITAMIN,      // ビタミン
    MINERAL,      // ミネラル
    EXERCISE,     // 運動
    CONDITION     // コンディション
}

@Serializable
enum class ScoreCategory {
    EXCELLENT,          // 90+
    GOOD,               // 70-89
    AVERAGE,            // 50-69
    NEEDS_IMPROVEMENT,  // 30-49
    POOR                // 0-29
}

/**
 * ゲーミフィケーション: ストリーク情報
 */
@Serializable
data class StreakInfo(
    val currentStreak: Int = 0,
    val longestStreak: Int = 0,
    val lastActiveDate: String? = null,
    val streakFreezeAvailable: Int = 0,
    val streakFreezeUsedToday: Boolean = false
)

/**
 * ゲーミフィケーション: バッジ/実績
 */
@Serializable
data class Badge(
    val id: String,
    val name: String,
    val description: String,
    val iconUrl: String,
    val category: BadgeCategory,
    val earnedAt: Long? = null,
    val isEarned: Boolean = false
)

@Serializable
enum class BadgeCategory {
    STREAK,         // 連続記録
    NUTRITION,      // 栄養
    EXERCISE,       // 運動
    MILESTONE,      // マイルストーン
    ACHIEVEMENT,    // 実績
    SPECIAL         // 特別
}

/**
 * ピンポイントカロリー調整
 * 特定の日だけカロリー・PFC目標を変更する機能
 */
@Serializable
data class CalorieOverride(
    val templateName: String,            // プリセット名（チートデー、リフィード等）
    val calorieAdjustment: Int = 0,      // カロリー調整値 (+500, -300等)
    val pfcOverride: PfcRatio? = null,   // PFC比率オーバーライド
    val appliedAt: Long = 0              // 適用日時
)

/**
 * PFC比率（パーセント）
 */
@Serializable
data class PfcRatio(
    val protein: Int = 30,   // タンパク質 %
    val fat: Int = 25,       // 脂質 %
    val carbs: Int = 45      // 炭水化物 %
) {
    init {
        require(protein + fat + carbs == 100) { "PFC比率の合計は100%である必要があります" }
    }
}
