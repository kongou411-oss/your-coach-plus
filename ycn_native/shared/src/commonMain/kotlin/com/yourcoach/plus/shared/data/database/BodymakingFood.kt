package com.yourcoach.plus.shared.data.database

import kotlinx.serialization.Serializable

/**
 * ボディメイク向け食材マスタ（理論値構成）
 *
 * 【設計思想】
 * - 理論値のみ提示: 最適解だけを示し、妥協案は出さない
 * - ルーティン連動: トレーニング部位に応じて食材を自動切替
 * - ミールプレップ前提: 週2回の炊飯、冷蔵保存、レンチン運用
 *
 * 【食材ロール】
 * ■ Infantry（歩兵・常備軍）- 週5-6日
 *   - 鶏むね肉: 安価・高タンパク・低脂質
 *   - 全卵: 完全栄養食
 *   - 白米/玄米: 日本人の腸に最適
 *
 * ■ Tank（重戦車）- 高強度日（脚・背中）
 *   - 牛赤身肉: クレアチン・亜鉛・鉄分
 *
 * ■ Medic（衛生兵）- オフ日・回復日
 *   - サバ缶/魚: オメガ3・抗炎症
 *
 * ■ Artillery（砲兵）- トレ前後
 *   - 切り餅: 純粋ブドウ糖
 *   - ホエイプロテイン: 消化ショートカット
 *   - 岩塩3g: パンプ・痙攣防止
 *
 * 【コスト設定】
 * - Lv.1 ミニマリスト: 鶏・卵中心、サプリで補完
 * - Lv.2 アスリート: 牛・魚を戦略的に組み込み
 */
@Serializable
data class BodymakingFood(
    val id: String,                    // 一意ID
    val displayName: String,           // 表示名
    val dbSearchKey: String,           // FoodDatabase検索キー
    val category: BodymakingCategory,  // カテゴリ
    val role: FoodRole = FoodRole.INFANTRY,  // 役割（常備/戦略）
    val costTier: Int = 1,             // コスト帯（1=ミニマリスト可, 2=アスリート推奨）
    val defaultAmount: Int = 100,      // デフォルト量(g)
    val note: String? = null,          // 備考
    val tags: List<String> = emptyList()
)

/**
 * 食材の役割
 */
@Serializable
enum class FoodRole {
    INFANTRY,    // 歩兵（常備軍）: 鶏・卵・米 - 週5-6日
    TANK,        // 重戦車: 牛 - 高強度日（脚・背中）
    MEDIC,       // 衛生兵: 魚 - オフ日・回復日
    ARTILLERY    // 砲兵: トレ前後（餅・プロテイン・塩）
}

/**
 * 食材ID定数
 * コード内で文字列リテラルを使わず、この定数を参照する
 */
object FoodId {
    // Infantry（常備軍）
    const val CHICKEN_BREAST = "chicken_breast"
    const val EGG_WHOLE = "egg_whole"
    const val WHITE_RICE = "white_rice"
    const val BROWN_RICE = "brown_rice"
    const val BROCCOLI = "broccoli"

    // Tank（重戦車）
    const val BEEF_LEAN = "beef_lean"

    // Medic（衛生兵）
    const val SABA = "saba"  // サバ（焼き）- 缶詰ではなく切り身
    const val SALMON = "salmon"

    // Artillery（砲兵）
    const val MOCHI = "mochi"
    const val WHEY_PROTEIN = "whey_protein"
    const val PINK_SALT = "pink_salt"

    // Supplements（代替サプリ）
    const val CREATINE = "creatine"
    const val FISH_OIL = "fish_oil"
}

/**
 * 食品カテゴリ
 */
@Serializable
enum class BodymakingCategory {
    PROTEIN,      // タンパク質源
    CARB,         // 炭水化物源
    VEGETABLE,    // 野菜
    SUPPLEMENT    // サプリメント
}

/**
 * ボディメイク食材データベース（ミニマリスト版）
 */
object BodymakingFoodDatabase {

    val allFoods: List<BodymakingFood> = listOf(
        // ===== INFANTRY（歩兵・常備軍）: 週5-6日 =====
        BodymakingFood(
            id = FoodId.CHICKEN_BREAST,
            displayName = "鶏むね肉（皮なし）",
            dbSearchKey = "鶏むね肉（皮なし生）",
            category = BodymakingCategory.PROTEIN,
            role = FoodRole.INFANTRY,
            costTier = 1,
            defaultAmount = 150,
            note = "皮なし"
        ),
        BodymakingFood(
            id = FoodId.EGG_WHOLE,
            displayName = "全卵（Lサイズ）",
            dbSearchKey = "鶏卵 L（64g）",
            category = BodymakingCategory.PROTEIN,
            role = FoodRole.INFANTRY,
            costTier = 1,
            defaultAmount = 64,
            note = "Lサイズ1個64g"
        ),
        BodymakingFood(
            id = FoodId.WHITE_RICE,
            displayName = "白米",
            dbSearchKey = "白米（冷やご飯・再加熱）",
            category = BodymakingCategory.CARB,
            role = FoodRole.INFANTRY,
            costTier = 1,
            defaultAmount = 150,
            note = "ミールプレップ推奨（冷や飯でRS化）",
            tags = listOf("bulk", "maintain")
        ),
        BodymakingFood(
            id = FoodId.BROWN_RICE,
            displayName = "玄米",
            dbSearchKey = "玄米（炊飯後）",
            category = BodymakingCategory.CARB,
            role = FoodRole.INFANTRY,
            costTier = 1,
            defaultAmount = 150,
            note = "ミールプレップ推奨（満腹感・低GI）",
            tags = listOf("cut")
        ),
        BodymakingFood(
            id = FoodId.BROCCOLI,
            displayName = "ブロッコリー",
            dbSearchKey = "ブロッコリー",
            category = BodymakingCategory.VEGETABLE,
            role = FoodRole.INFANTRY,
            costTier = 1,
            defaultAmount = 100,
            note = "冷凍可"
        ),

        // ===== TANK（重戦車）: 高強度日（脚・背中） =====
        BodymakingFood(
            id = FoodId.BEEF_LEAN,
            displayName = "牛赤身肉",
            dbSearchKey = "牛もも",
            category = BodymakingCategory.PROTEIN,
            role = FoodRole.TANK,
            costTier = 2,
            defaultAmount = 200,
            note = "クレアチン・亜鉛・鉄分",
            tags = listOf("high_intensity", "leg", "back")
        ),

        // ===== MEDIC（衛生兵）: オフ日・回復日 =====
        BodymakingFood(
            id = FoodId.SABA,
            displayName = "サバ（焼き）",
            dbSearchKey = "サバ（焼き）",
            category = BodymakingCategory.PROTEIN,
            role = FoodRole.MEDIC,
            costTier = 2,
            defaultAmount = 100,
            note = "オメガ3・EPA/DHA（肩の日推奨）",
            tags = listOf("shoulders", "omega3", "epa_dha")
        ),
        BodymakingFood(
            id = FoodId.SALMON,
            displayName = "鮭",
            dbSearchKey = "鮭",
            category = BodymakingCategory.PROTEIN,
            role = FoodRole.MEDIC,
            costTier = 2,
            defaultAmount = 100,
            note = "オメガ3・抗炎症",
            tags = listOf("off_day", "recovery", "omega3")
        ),

        // ===== ARTILLERY（砲兵）: トレ前後 =====
        BodymakingFood(
            id = FoodId.MOCHI,
            displayName = "切り餅",
            dbSearchKey = "餅",
            category = BodymakingCategory.CARB,
            role = FoodRole.ARTILLERY,
            costTier = 1,
            defaultAmount = 50,
            note = "1個=50g=炭水化物25g（純粋ブドウ糖）",
            tags = listOf("post_workout", "pre_workout")
        ),
        BodymakingFood(
            id = FoodId.WHEY_PROTEIN,
            displayName = "ホエイプロテイン",
            dbSearchKey = "ホエイプロテイン",
            category = BodymakingCategory.SUPPLEMENT,
            role = FoodRole.ARTILLERY,
            costTier = 1,
            defaultAmount = 30,
            note = "トレ後の消化ショートカット",
            tags = listOf("post_workout")
        ),
        BodymakingFood(
            id = FoodId.PINK_SALT,
            displayName = "岩塩",
            dbSearchKey = "ピンクソルト（ヒマラヤ岩塩）",
            category = BodymakingCategory.SUPPLEMENT,
            role = FoodRole.ARTILLERY,
            costTier = 1,
            defaultAmount = 3,
            note = "パンプアップ・痙攣防止（トレ前必須）",
            tags = listOf("pre_workout", "electrolyte")
        ),

        // ===== Low Cost代替サプリ =====
        BodymakingFood(
            id = FoodId.CREATINE,
            displayName = "クレアチン",
            dbSearchKey = "クレアチン",
            category = BodymakingCategory.SUPPLEMENT,
            role = FoodRole.INFANTRY,
            costTier = 1,
            defaultAmount = 5,
            note = "牛肉代替（Low Costモード用）",
            tags = listOf("substitute_beef")
        ),
        BodymakingFood(
            id = FoodId.FISH_OIL,
            displayName = "フィッシュオイル",
            dbSearchKey = "魚油",
            category = BodymakingCategory.SUPPLEMENT,
            role = FoodRole.INFANTRY,
            costTier = 1,
            defaultAmount = 2,
            note = "魚代替（Low Costモード用）",
            tags = listOf("substitute_fish", "omega3")
        )
    )

    /**
     * IDで食品を検索
     */
    fun getById(id: String): BodymakingFood? = allFoods.find { it.id == id }

    /**
     * カテゴリでフィルタ
     */
    fun getByCategory(category: BodymakingCategory): List<BodymakingFood> =
        allFoods.filter { it.category == category }

    /**
     * コスト帯でフィルタ
     * @param maxCostTier 1=ミニマリスト, 2=アスリート
     */
    fun getByCostTier(maxCostTier: Int): List<BodymakingFood> =
        allFoods.filter { it.costTier <= maxCostTier }

    /**
     * 目標に応じた炭水化物を取得
     * - 減量: 玄米（満腹感・低GI）
     * - 維持: 白米（デフォルト）
     * - 増量: 白米（消化促進）
     */
    fun getCarbForGoal(goal: com.yourcoach.plus.shared.domain.model.FitnessGoal?): BodymakingFood {
        return when (goal) {
            com.yourcoach.plus.shared.domain.model.FitnessGoal.LOSE_WEIGHT -> getById(FoodId.BROWN_RICE)!!
            com.yourcoach.plus.shared.domain.model.FitnessGoal.MAINTAIN -> getById(FoodId.WHITE_RICE)!!
            com.yourcoach.plus.shared.domain.model.FitnessGoal.GAIN_MUSCLE -> getById(FoodId.WHITE_RICE)!!
            null -> getById(FoodId.WHITE_RICE)!!
        }
    }

    /**
     * トレ前の食材を取得（塩含む）
     */
    fun getPreWorkoutFoods(): List<BodymakingFood> {
        return listOfNotNull(
            getById(FoodId.MOCHI),
            getById(FoodId.PINK_SALT)  // 岩塩3g（パンプ・痙攣防止）
        )
    }

    /**
     * トレ後の最適食材を取得
     * 戦略: 餅（純粋ブドウ糖）+ ホエイプロテイン
     */
    fun getPostWorkoutFoods(): List<BodymakingFood> {
        return listOfNotNull(
            getById(FoodId.MOCHI),
            getById(FoodId.WHEY_PROTEIN)
        )
    }

    /**
     * トレーニング部位に応じたタンパク質を取得
     * @param bodyPart トレーニング部位（leg, back, chest, shoulder, arm, off）
     * @param costTier コスト設定（1=ミニマリスト, 2=アスリート）
     */
    /**
     * トレーニング部位とコスト帯に応じたタンパク質源を取得
     *
     * 【戦略】
     * - 脚・背中・胸: costTier>=2 → 牛赤身肉, costTier=1 → 鶏むね肉
     * - 肩: costTier>=2 → サバ（焼き）, costTier=1 → 鶏むね肉
     * - 腕: costTier>=2 → 鮭（1食目推奨）, costTier=1 → 鶏むね肉
     * - オフ・休み・腹筋・有酸素: 鶏むね肉
     *
     * @param bodyPart TargetBodyPart Enum（推奨）または文字列（後方互換）
     * @param costTier ユーザーの予算帯（1=ローコスト, 2=アスリート）
     */
    fun getProteinForTraining(bodyPart: String?, costTier: Int = 2): BodymakingFood {
        // TargetBodyPart Enumに変換（IDまたは日本語表示名から）
        val part = com.yourcoach.plus.shared.domain.model.TargetBodyPart.fromAny(bodyPart)

        // ローコスト（Tier 1）→ 全て鶏むね肉
        if (costTier <= 1) {
            return getById(FoodId.CHICKEN_BREAST)!!
        }

        // Tier 2以上: 部位別に最適なタンパク質源
        return when (part?.id) {
            // 高強度日（脚・背中系） → 牛赤身肉
            "legs", "back", "lower_body", "pull", "back_biceps" -> getById(FoodId.BEEF_LEAN)!!
            // 胸系・全身・上半身 → 牛赤身肉
            "chest", "full_body", "upper_body", "push", "chest_triceps" -> getById(FoodId.BEEF_LEAN)!!
            // 肩系 → サバ（焼き）
            "shoulders", "shoulders_arms" -> getById(FoodId.SABA)!!
            // 腕 → 鮭
            "arms" -> getById(FoodId.SALMON)!!
            // オフ・休み・腹筋・有酸素・その他 → 鶏むね肉
            else -> getById(FoodId.CHICKEN_BREAST)!!
        }
    }

    /**
     * TargetBodyPart Enumを直接受け取るオーバーロード（型安全版）
     */
    fun getProteinForTraining(bodyPart: com.yourcoach.plus.shared.domain.model.TargetBodyPart?, costTier: Int = 2): BodymakingFood {
        return getProteinForTraining(bodyPart?.id, costTier)
    }

    /**
     * Low Costモード用の代替サプリを取得
     * @param originalFoodId 元の食材ID（beef_lean, salmon等）
     */
    fun getSubstituteSupplement(originalFoodId: String): BodymakingFood? {
        return when (originalFoodId) {
            FoodId.BEEF_LEAN -> getById(FoodId.CREATINE)      // 牛 → クレアチン
            FoodId.SALMON -> getById(FoodId.FISH_OIL)         // 魚 → フィッシュオイル
            else -> null
        }
    }

    /**
     * 基本構成（Infantry）を取得
     */
    fun getCoreFoods(goal: com.yourcoach.plus.shared.domain.model.FitnessGoal?): List<BodymakingFood> {
        return listOfNotNull(
            getById(FoodId.CHICKEN_BREAST),
            getById(FoodId.EGG_WHOLE),
            getCarbForGoal(goal),
            getById(FoodId.BROCCOLI)
        )
    }

    /**
     * 完全な1日の食材構成を取得
     * @param goal フィットネス目標
     * @param bodyPart 今日のトレーニング部位
     * @param costTier コスト設定
     * @param hasTraining トレーニングがある日か
     */
    fun getDailyFoods(
        goal: com.yourcoach.plus.shared.domain.model.FitnessGoal?,
        bodyPart: String?,
        costTier: Int = 2,
        hasTraining: Boolean = false
    ): DailyFoodPlan {
        val protein = getProteinForTraining(bodyPart, costTier)
        val carb = getCarbForGoal(goal)
        val preWorkout = if (hasTraining) getPreWorkoutFoods() else emptyList()
        val postWorkout = if (hasTraining) getPostWorkoutFoods() else emptyList()

        // Low Costモードで牛・魚の場合、代替サプリを追加
        val supplements = mutableListOf<BodymakingFood>()
        if (costTier == 1 && protein.role == FoodRole.TANK) {
            getSubstituteSupplement(FoodId.BEEF_LEAN)?.let { supplements.add(it) }
        }

        return DailyFoodPlan(
            mainProtein = protein,
            mainCarb = carb,
            vegetable = getById(FoodId.BROCCOLI)!!,
            egg = getById(FoodId.EGG_WHOLE)!!,
            preWorkout = preWorkout,
            postWorkout = postWorkout,
            supplements = supplements
        )
    }

    /**
     * BodymakingFoodからFoodDatabaseの食品を検索
     */
    fun toFoodItem(bodymakingFood: BodymakingFood): FoodItem? {
        FoodDatabase.getFoodByName(bodymakingFood.dbSearchKey)?.let { return it }
        FoodDatabase.searchFoods(bodymakingFood.dbSearchKey).firstOrNull()?.let { return it }
        return null
    }
}

/**
 * 1日の食材プラン
 */
data class DailyFoodPlan(
    val mainProtein: BodymakingFood,      // メインタンパク質（鶏/牛/魚）
    val mainCarb: BodymakingFood,         // メイン炭水化物（白米/玄米）
    val vegetable: BodymakingFood,        // 野菜（ブロッコリー）
    val egg: BodymakingFood,              // 卵
    val preWorkout: List<BodymakingFood>, // トレ前（餅+塩）
    val postWorkout: List<BodymakingFood>,// トレ後（餅+プロテイン）
    val supplements: List<BodymakingFood> // 代替サプリ（クレアチン等）
)
