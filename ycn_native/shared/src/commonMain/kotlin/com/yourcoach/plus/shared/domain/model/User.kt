package com.yourcoach.plus.shared.domain.model

import kotlin.math.roundToInt
import kotlinx.serialization.Serializable

@Serializable
data class User(
    val uid: String,
    val email: String,
    val displayName: String? = null,
    val photoUrl: String? = null,
    val isPremium: Boolean = false,
    // クレジットシステム
    val freeCredits: Int = 14,      // 無料クレジット（初期配布: 14回）
    val paidCredits: Int = 0,       // 有料クレジット（購入分）
    val profile: UserProfile? = null,
    val createdAt: Long = 0,
    val lastLoginAt: Long = 0,
    val lastLoginBonusDate: String? = null,  // ログインボーナス日付 (yyyy-MM-dd)
    // 法人プラン（所属）
    val b2b2cOrgId: String? = null,
    val b2b2cOrgName: String? = null,
    val organizationName: String? = null,  // 新システム: 所属名
    val role: String? = null,               // ロール: "trainer" = カスタムクエスト管理者
    // フォロー機能
    val followerCount: Int = 0,
    val followingCount: Int = 0
) {
    // 所属による Premium 判定
    val hasCorporatePremium: Boolean get() = !organizationName.isNullOrEmpty() || !b2b2cOrgId.isNullOrEmpty()
    // 合計クレジット
    val totalCredits: Int get() = freeCredits + paidCredits
}

@Serializable
data class UserProfile(
    val nickname: String? = null,
    val gender: Gender? = null,
    val birthYear: Int? = null,
    val age: Int? = null,
    val height: Float? = null,
    val weight: Float? = null,
    val bodyFatPercentage: Float? = null,
    val targetWeight: Float? = null,
    val activityLevel: ActivityLevel? = null,
    val goal: FitnessGoal? = null,
    // 旧style（後方互換性のため残す、使用しない）
    val style: String? = null,
    // 理想の体型
    val idealWeight: Float? = null,
    val idealBodyFatPercentage: Float? = null,
    // 栄養目標
    val targetCalories: Int? = null,
    val targetProtein: Float? = null,
    val targetFat: Float? = null,
    val targetCarbs: Float? = null,
    // PFCバランス（%）
    val proteinRatioPercent: Int = 35,
    val fatRatioPercent: Int = 15,
    val carbRatioPercent: Int = 50,
    // 想定食事回数（GL計算に使用）
    val mealsPerDay: Int = 5,
    // タイムライン設定（ルーティンのアンカー）
    val wakeUpTime: String? = null,             // 起床時刻 (例: "07:00")
    val sleepTime: String? = null,              // 就寝時刻 (例: "23:00")
    val trainingTime: String? = null,           // トレーニング時刻 (例: "18:00")
    val trainingAfterMeal: Int? = null,         // 何食目の後にトレーニングするか (例: 3)
    val trainingDuration: Int = 120,            // トレーニング所要時間（分）デフォルト2時間
    val trainingStyle: TrainingStyle = TrainingStyle.PUMP,  // トレーニングスタイル（パワー/パンプ）
    // トレ前後のPFC設定
    val preWorkoutProtein: Int = 20,            // トレ前 タンパク質(g)
    val preWorkoutFat: Int = 1,                 // トレ前 脂質(g) - 消化を遅らせないため最小限
    val preWorkoutCarbs: Int = 25,              // トレ前 炭水化物(g)
    val postWorkoutProtein: Int = 20,           // トレ後 タンパク質(g)
    val postWorkoutFat: Int = 1,                // トレ後 脂質(g)
    val postWorkoutCarbs: Int = 25,             // トレ後 炭水化物(g)
    // カロリー調整値
    val calorieAdjustment: Int = 0,
    // 食材設定
    val preferredCarbSources: List<String> = emptyList(),      // 優先炭水化物源
    val preferredProteinSources: List<String> = emptyList(),   // 優先タンパク源
    val preferredFatSources: List<String> = emptyList(),       // 優先脂質源
    val avoidFoods: List<String> = emptyList(),                          // 避けたい食材
    val dietaryPreferences: List<String> = emptyList(),
    val allergies: List<String> = emptyList(),
    // 自動学習用の設定
    val favoriteFoods: String? = null,                                   // よく食べる食材（カンマ区切り）
    val ngFoods: String? = null,                                         // NG食材（カンマ区切り）
    val budgetTier: Int = 2,                                             // 食費予算: 1=節約, 2=標準, 3=ゆとり
    // 食事・運動スロット設定（固定/AI/ルーティン連動）
    val mealSlotConfig: MealSlotConfig? = null,                          // 食事スロット設定
    val workoutSlotConfig: WorkoutSlotConfig? = null,                    // 運動スロット設定
    val routineTemplateConfig: RoutineTemplateConfig? = null,            // ルーティン別テンプレート設定
    // アクティビティ追跡
    val activeDays: List<String> = emptyList(),
    val streak: Int = 0,
    val longestStreak: Int = 0,
    val registrationDate: String? = null,
    // オンボーディング完了フラグ
    val onboardingCompleted: Boolean = false,
    // 経験値システム
    val experience: Int = 0
) {
    companion object {
        const val MAX_LEVEL = 999
        const val XP_PER_ACTION = 10  // 各アクションで獲得するXP
    }
    /**
     * LBM（除脂肪体重）を計算
     */
    fun calculateLBM(): Float? {
        val w = weight ?: return null
        val bf = bodyFatPercentage ?: return null
        return w * (1 - bf / 100)
    }

    /**
     * BMRを計算（Mifflin-St Jeor式）
     */
    fun calculateBMR(): Float? {
        val h = height ?: return null
        val w = weight ?: return null
        val a = age ?: return null
        val g = gender ?: return null

        return when (g) {
            Gender.MALE -> 10 * w + 6.25f * h - 5 * a + 5
            Gender.FEMALE -> 10 * w + 6.25f * h - 5 * a - 161
            Gender.OTHER -> 10 * w + 6.25f * h - 5 * a - 78 // 平均値
        }
    }

    /**
     * TDEEを計算（日常活動のみ、運動は別途加算）
     */
    fun calculateTDEE(): Float? {
        val bmr = calculateBMR() ?: return null
        val multiplier = activityLevel?.multiplier ?: ActivityLevel.DESK_WORK.multiplier
        return bmr * multiplier
    }

    /**
     * 現在のレベルを計算
     * 累進式: Lv1→2=100XP, Lv2→3=150XP, Lv3→4=200XP... (+50XP毎)
     * 累計XP = 25 * (level - 1) * (level + 2)
     */
    fun calculateLevel(): Int {
        var level = 1
        while (level < MAX_LEVEL && getRequiredExpForLevel(level + 1) <= experience) {
            level++
        }
        return level
    }

    /**
     * 次のレベルまでの進捗を計算
     */
    fun calculateExpProgress(): ExpProgress {
        val level = calculateLevel()
        val currentLevelRequired = getRequiredExpForLevel(level)
        val nextLevelRequired = getRequiredExpForLevel(level + 1)
        val expCurrent = experience - currentLevelRequired
        val expRequired = nextLevelRequired - currentLevelRequired
        val progress = if (expRequired > 0) (expCurrent.toFloat() / expRequired * 100).toInt().coerceIn(0, 100) else 100
        return ExpProgress(level, expCurrent, expRequired, progress)
    }

    /**
     * 指定レベルに到達するために必要な累計XP
     * 累進式: Lv2=100, Lv3=250, Lv4=450...
     * 公式: 25 * (level - 1) * (level + 2)
     */
    private fun getRequiredExpForLevel(level: Int): Int {
        if (level <= 1) return 0
        return 25 * (level - 1) * (level + 2)
    }

    /**
     * XP加算後の新しいレベルを計算
     */
    fun calculateLevelAfterXp(additionalXp: Int): Int {
        val newExperience = experience + additionalXp
        var level = 1
        while (level < MAX_LEVEL && getRequiredExpForLevel(level + 1) <= newExperience) {
            level++
        }
        return level
    }
}

/**
 * 経験値進捗データ
 */
data class ExpProgress(
    val level: Int,
    val expCurrent: Int,
    val expRequired: Int,
    val progressPercent: Int
)

@Serializable
enum class Gender {
    MALE, FEMALE, OTHER
}

/**
 * 日常活動レベル（運動を除く）
 */
@Serializable
enum class ActivityLevel(val multiplier: Float, val displayName: String) {
    DESK_WORK(1.2f, "デスクワーク"),      // 座り仕事中心
    STANDING_WORK(1.4f, "立ち仕事"),      // 接客・軽作業など
    PHYSICAL_LABOR(1.6f, "肉体労働");     // 建設・運搬など

    companion object {
        // 旧値からの変換（後方互換性）
        fun fromLegacy(legacy: String?): ActivityLevel = when (legacy) {
            "SEDENTARY", "LIGHT" -> DESK_WORK
            "MODERATE" -> STANDING_WORK
            "ACTIVE", "VERY_ACTIVE" -> PHYSICAL_LABOR
            else -> DESK_WORK
        }
    }
}

/**
 * トレーニング加算カロリー（3Tier制）
 *
 * 「消費カロリーの正確な計算」ではなく「リカバリーに必要なエネルギー予算の確保」という設計思想。
 * 部位に基づきシステムが自動でTierを判定し、ユーザーの認知コストをゼロにする。
 *
 * 計算式: TierBase × (userLBM / 60)
 */
object TrainingCalorieBonus {
    // Class別の加算定数（LBM 60kg基準）
    private const val CLASS_SSS = 400   // 大筋群・高神経系疲労（脚、全身、下半身）
    private const val CLASS_S = 250     // 標準的な筋肥大トレ（胸、背中、肩、複合系）
    private const val CLASS_A = 100     // 小筋群・回復コスト低（腕、腹筋）

    private const val REFERENCE_LBM = 60f

    /**
     * splitTypeとLBMから加算値を取得
     * システムが部位→Classを自動判定（ユーザー入力不要）
     * Class SSS > S > A
     */
    fun fromSplitType(splitType: String?, isRestDay: Boolean, lbm: Float = REFERENCE_LBM): Int {
        if (isRestDay) return 0
        val classBonus = when (splitType) {
            // Class SSS: 大筋群、高エネルギー消費、高EPOC
            "脚", "全身", "下半身" -> CLASS_SSS
            // Class S: 標準的な筋肥大トレーニング
            "胸", "背中", "肩", "上半身",
            "プッシュ", "プル",
            "胸・三頭", "背中・二頭", "肩・腕" -> CLASS_S
            // Class A: 小筋群、回復コスト低
            "腕", "腹筋・体幹" -> CLASS_A
            // カスタム分割: Class Sをデフォルト（安全な中間値）
            else -> CLASS_S
        }
        return (classBonus * (lbm / REFERENCE_LBM)).roundToInt()
    }
}

@Serializable
enum class FitnessGoal {
    LOSE_WEIGHT,    // 減量（カロリー deficit）
    MAINTAIN,       // 維持・リコンプ（カロリー ±0）
    GAIN_MUSCLE     // 増量（カロリー surplus）
}

/**
 * トレーニングスタイル
 * レップ数に影響
 */
@Serializable
enum class TrainingStyle(val repsPerSet: Int, val displayName: String) {
    POWER(5, "パワー"),      // 高重量・低レップ（5回/セット）
    PUMP(10, "パンプ")       // 中重量・高レップ（10回/セット）
}
