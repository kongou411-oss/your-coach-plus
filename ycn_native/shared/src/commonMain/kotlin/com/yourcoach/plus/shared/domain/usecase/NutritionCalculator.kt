package com.yourcoach.plus.shared.domain.usecase

import com.yourcoach.plus.shared.domain.model.DetailedNutrition
import com.yourcoach.plus.shared.domain.model.FitnessGoal
import com.yourcoach.plus.shared.domain.model.Meal
import kotlin.math.min

/**
 * 詳細栄養素計算ユースケース
 * GL管理、脂肪酸バランス、食物繊維、ビタミン・ミネラル充足率を計算
 */
object NutritionCalculator {

    /**
     * 詳細栄養素を計算
     *
     * @param meals 食事リスト
     * @param isBodymaker ボディメイカーモードか
     * @param lbm 除脂肪体重 (kg)
     * @param mealsPerDay 1日の想定食事回数
     * @param goal フィットネス目標（食物繊維目標値の調整用）
     * @return 詳細栄養素データ
     */
    fun calculate(
        meals: List<Meal>,
        isBodymaker: Boolean,
        lbm: Float = 56f,
        mealsPerDay: Int = 5,
        goal: FitnessGoal? = null
    ): DetailedNutrition {
        // 食物繊維目標値（LBMベース + 目標別調整）
        val baseFiber = lbm * 0.4f  // ベース: LBMの40%
        val fiberTarget = when (goal) {
            FitnessGoal.LOSE_WEIGHT -> baseFiber * 1.25f   // 減量: +25%（満腹感UP）
            FitnessGoal.GAIN_MUSCLE -> baseFiber * 0.9f    // バルク: -10%（消化促進）
            FitnessGoal.MAINTAIN -> baseFiber              // 維持: そのまま
            else -> baseFiber
        }
        // GL上限（LBMベース）- 筋肉量が多いほどグリコーゲン貯蔵能力が高い
        val glCoefficient = if (isBodymaker) 3f else 2f
        val glLimit = (lbm * glCoefficient).coerceAtLeast(80f)

        // 1食あたりの絶対GL上限（体脂肪蓄積リスクの警告値）
        val mealAbsoluteGLLimit = if (isBodymaker) 70f else 40f

        if (meals.isEmpty()) {
            return DetailedNutrition(
                glLimit = glLimit,
                glLabel = "未記録",
                mealsPerDay = mealsPerDay,
                mealGLLimit = glLimit / mealsPerDay,
                mealAbsoluteGLLimit = mealAbsoluteGLLimit,
                fiberTarget = fiberTarget
            )
        }

        // 集計変数
        var totalProtein = 0f
        var weightedDiaas = 0f
        var saturatedFat = 0f
        var mediumChainFat = 0f
        var monounsaturatedFat = 0f
        var polyunsaturatedFat = 0f
        var totalGL = 0f
        var highGICarbs = 0f
        var lowGICarbs = 0f
        var totalFiber = 0f
        var totalSolubleFiber = 0f
        var totalInsolubleFiber = 0f
        var totalCarbs = 0f
        val vitamins = mutableMapOf<String, Float>()
        val minerals = mutableMapOf<String, Float>()

        // ビタミン目標値（13種類）
        val vitaminMultiplier = if (isBodymaker) 3f else 1f
        val vitaminTargets = mapOf(
            "vitaminA" to 900f * vitaminMultiplier,
            "vitaminD" to 20f * vitaminMultiplier,
            "vitaminE" to 6.5f * vitaminMultiplier,
            "vitaminK" to 150f * vitaminMultiplier,
            "vitaminB1" to 1.4f * vitaminMultiplier,
            "vitaminB2" to 1.6f * vitaminMultiplier,
            "niacin" to 15f * vitaminMultiplier,
            "pantothenicAcid" to 5f * vitaminMultiplier,
            "vitaminB6" to 1.4f * vitaminMultiplier,
            "biotin" to 50f * vitaminMultiplier,
            "folicAcid" to 240f * vitaminMultiplier,
            "vitaminB12" to 2.4f * vitaminMultiplier,
            "vitaminC" to 100f * vitaminMultiplier
        )

        // ミネラル目標値（13種類）
        val sodiumTarget = if (isBodymaker) 10000f else 3000f
        val mineralTargets = mapOf(
            "calcium" to 800f * vitaminMultiplier,
            "iron" to 7.5f * vitaminMultiplier,
            "magnesium" to 370f * vitaminMultiplier,
            "phosphorus" to 1000f * vitaminMultiplier,
            "potassium" to 3000f * vitaminMultiplier,
            "sodium" to sodiumTarget,
            "zinc" to 11f * vitaminMultiplier,
            "copper" to 0.9f * vitaminMultiplier,
            "manganese" to 4f * vitaminMultiplier,
            "selenium" to 30f * vitaminMultiplier,
            "iodine" to 130f * vitaminMultiplier,
            "chromium" to 35f * vitaminMultiplier,
            "molybdenum" to 30f * vitaminMultiplier
        )

        // 食事データを集計
        meals.forEach { meal ->
            meal.items.forEach { item ->
                val protein = item.protein
                totalProtein += protein

                // DIAAS（タンパク質量で重み付け）
                if (item.diaas > 0 && protein > 0) {
                    weightedDiaas += item.diaas * protein
                }

                // 脂肪酸
                saturatedFat += item.saturatedFat
                mediumChainFat += item.mediumChainFat
                monounsaturatedFat += item.monounsaturatedFat
                polyunsaturatedFat += item.polyunsaturatedFat

                // 糖質・食物繊維
                totalCarbs += item.carbs
                totalFiber += item.fiber
                totalSolubleFiber += item.solubleFiber
                totalInsolubleFiber += item.insolubleFiber

                // GL値計算
                val carbs = item.carbs
                if (item.gi > 0 && carbs > 0) {
                    totalGL += (item.gi * carbs) / 100f
                    if (item.gi >= 66) {
                        highGICarbs += carbs
                    } else {
                        lowGICarbs += carbs
                    }
                } else if (carbs > 0) {
                    lowGICarbs += carbs
                }

                // ビタミン
                item.vitamins.forEach { (key, value) ->
                    vitamins[key] = (vitamins[key] ?: 0f) + value
                }

                // ミネラル
                item.minerals.forEach { (key, value) ->
                    minerals[key] = (minerals[key] ?: 0f) + value
                }
            }
        }

        // 平均DIAAS
        val averageDiaas = if (totalProtein > 0) weightedDiaas / totalProtein else 0f

        // 脂肪酸スコア計算
        val totalFat = saturatedFat + mediumChainFat + monounsaturatedFat + polyunsaturatedFat
        val (fattyAcidScore, fattyAcidRating, fattyAcidLabel) = calculateFattyAcidScore(
            totalFat, saturatedFat, monounsaturatedFat
        )

        // 食物繊維スコア計算（目標値ベース）
        val carbFiberRatio = if (totalFiber > 0) totalCarbs / totalFiber else 0f
        val (fiberScore, fiberRating, fiberLabel) = calculateFiberScore(totalFiber, fiberTarget)

        // ビタミン充足率
        val vitaminScores = vitaminTargets.mapValues { (key, target) ->
            val actual = vitamins[key] ?: 0f
            if (target > 0) actual / target else 0f
        }

        // ミネラル充足率
        val mineralScores = mineralTargets.mapValues { (key, target) ->
            val actual = minerals[key] ?: 0f
            if (target > 0) actual / target else 0f
        }

        // GLスコア計算
        val glRatio = if (glLimit > 0) totalGL / glLimit else 0f
        val (glScore, glLabel) = when {
            glRatio <= 0.6f -> 5 to "優秀"
            glRatio <= 0.8f -> 4 to "良好"
            glRatio <= 1.0f -> 3 to "普通"
            glRatio <= 1.25f -> 2 to "やや超過"
            else -> 1 to "要改善"
        }

        // GI値内訳
        val totalGICarbs = highGICarbs + lowGICarbs
        val highGIPercent = if (totalGICarbs > 0) (highGICarbs / totalGICarbs) * 100f else 0f
        val lowGIPercent = if (totalGICarbs > 0) (lowGICarbs / totalGICarbs) * 100f else 0f

        // GL補正要因
        val glModifiers = mutableListOf<Pair<String, Float>>()
        val proteinReduction = min(10f, (totalProtein / 20f) * 10f)
        if (proteinReduction > 0) {
            glModifiers.add("タンパク質(${totalProtein.toInt()}g)" to -proteinReduction)
        }
        val fatReduction = min(5f, (totalFat / 10f) * 5f)
        if (fatReduction > 0) {
            glModifiers.add("脂質(${totalFat.toInt()}g)" to -fatReduction)
        }
        val fiberReduction = min(10f, (totalFiber / 10f) * 10f)
        if (fiberReduction > 0) {
            glModifiers.add("食物繊維(${totalFiber.toInt()}g)" to -fiberReduction)
        }

        // 補正後GL値
        val totalReduction = proteinReduction + fatReduction + fiberReduction
        val adjustedGL = totalGL * (1f - totalReduction / 100f)

        // 血糖管理評価
        val (bloodSugarRating, bloodSugarLabel) = when {
            adjustedGL < glLimit * 0.5f -> "A+" to "優秀"
            adjustedGL < glLimit * 0.7f -> "A" to "良好"
            adjustedGL < glLimit * 0.85f -> "B" to "普通"
            adjustedGL < glLimit -> "C" to "やや高め"
            else -> "D" to "要改善"
        }

        // 1食あたりのGL上限
        val mealGLLimit = glLimit / mealsPerDay

        return DetailedNutrition(
            averageDiaas = averageDiaas,
            saturatedFat = saturatedFat,
            mediumChainFat = mediumChainFat,
            monounsaturatedFat = monounsaturatedFat,
            polyunsaturatedFat = polyunsaturatedFat,
            fattyAcidScore = fattyAcidScore,
            fattyAcidRating = fattyAcidRating,
            fattyAcidLabel = fattyAcidLabel,
            vitaminScores = vitaminScores,
            mineralScores = mineralScores,
            totalGL = totalGL,
            glLimit = glLimit,
            glScore = glScore,
            glLabel = glLabel,
            adjustedGL = adjustedGL,
            bloodSugarRating = bloodSugarRating,
            bloodSugarLabel = bloodSugarLabel,
            highGIPercent = highGIPercent,
            lowGIPercent = lowGIPercent,
            glModifiers = glModifiers,
            mealsPerDay = mealsPerDay,
            mealGLLimit = mealGLLimit,
            mealAbsoluteGLLimit = mealAbsoluteGLLimit,
            totalFiber = totalFiber,
            totalSolubleFiber = totalSolubleFiber,
            totalInsolubleFiber = totalInsolubleFiber,
            fiberTarget = fiberTarget,
            carbFiberRatio = carbFiberRatio,
            fiberScore = fiberScore,
            fiberRating = fiberRating,
            fiberLabel = fiberLabel
        )
    }

    private fun calculateFattyAcidScore(
        totalFat: Float,
        saturatedFat: Float,
        monounsaturatedFat: Float
    ): Triple<Int, String, String> {
        if (totalFat <= 0) return Triple(0, "-", "-")

        val saturatedPercent = (saturatedFat / totalFat) * 100
        val monounsaturatedPercent = (monounsaturatedFat / totalFat) * 100

        return when {
            (saturatedPercent >= 40 || saturatedPercent < 20 ||
                    monounsaturatedPercent >= 50 || monounsaturatedPercent < 30) ->
                Triple(2, "★★☆☆☆", "要改善")
            (saturatedPercent >= 35 || saturatedPercent < 25 ||
                    monounsaturatedPercent >= 45 || monounsaturatedPercent < 35) ->
                Triple(4, "★★★★☆", "良好")
            else -> Triple(5, "★★★★★", "優秀")
        }
    }

    /**
     * 食物繊維スコア計算（目標値ベース）
     * @param totalFiber 実際の摂取量
     * @param fiberTarget 目標値（LBM×0.4×目標係数）
     */
    private fun calculateFiberScore(
        totalFiber: Float,
        fiberTarget: Float
    ): Triple<Int, String, String> {
        if (fiberTarget <= 0) return Triple(0, "-", "-")

        val ratio = totalFiber / fiberTarget
        return when {
            ratio >= 1.0f -> Triple(5, "★★★★★", "優秀")      // 100%以上達成
            ratio >= 0.8f -> Triple(4, "★★★★☆", "良好")      // 80%以上
            ratio >= 0.6f -> Triple(3, "★★★☆☆", "普通")      // 60%以上
            ratio >= 0.4f -> Triple(2, "★★☆☆☆", "不足")      // 40%以上
            else -> Triple(1, "★☆☆☆☆", "要改善")             // 40%未満
        }
    }
}
