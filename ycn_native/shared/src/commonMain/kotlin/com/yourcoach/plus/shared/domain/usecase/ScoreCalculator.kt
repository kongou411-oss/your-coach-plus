package com.yourcoach.plus.shared.domain.usecase

import com.yourcoach.plus.shared.domain.model.*
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.round

/**
 * スコア計算ユースケース
 * 元のservices.js calculateScores関数を移植
 */
object ScoreCalculator {

    /**
     * ボディメイカー判定
     */
    private fun isBodymakerStyle(style: String?): Boolean {
        return style == "ボディメイカー"
    }

    /**
     * ビタミン目標値 (日本人の食事摂取基準)
     */
    private val vitaminTargets = mapOf(
        "vitaminA" to 800.0,      // μg/日
        "vitaminB1" to 1.4,       // mg/日
        "vitaminB2" to 1.6,       // mg/日
        "vitaminB6" to 1.4,       // mg/日
        "vitaminB12" to 2.4,      // μg/日
        "vitaminC" to 100.0,      // mg/日
        "vitaminD" to 8.5,        // μg/日
        "vitaminE" to 6.0,        // mg/日
        "vitaminK" to 150.0       // μg/日
    )

    /**
     * ミネラル目標値 (日本人の食事摂取基準)
     * ナトリウムはスタイル別に別途評価
     */
    private val mineralTargets = mapOf(
        "calcium" to 800.0,       // mg/日
        "iron" to 10.0,           // mg/日
        "magnesium" to 340.0,     // mg/日
        "zinc" to 10.0,           // mg/日
        "potassium" to 2500.0     // mg/日
    )

    /**
     * ナトリウム目標値（スタイル別）
     * 一般: 推奨3g、上限5g
     * ボディメイカー: 推奨10g、上限15g（発汗による損失を考慮）
     */
    private data class SodiumTarget(
        val recommended: Double,  // 推奨値 (mg)
        val upperLimit: Double    // 上限値 (mg)
    )
    private val sodiumTargetGeneral = SodiumTarget(3000.0, 5000.0)
    private val sodiumTargetBodymaker = SodiumTarget(10000.0, 15000.0)

    /**
     * 総合スコアを計算
     */
    fun calculateScores(
        profile: UserProfile,
        meals: List<Meal>,
        workouts: List<Workout>,
        conditions: ConditionData?,
        target: NutritionTarget,
        isRestDay: Boolean = false
    ): CalculatedScores {
        val isBodymaker = isBodymakerStyle(profile.style)

        // 食事スコア計算（GL制限はスタイルで変わる）
        val foodScore = calculateFoodScore(meals, target, isBodymaker)

        // 運動スコア計算
        val exerciseScore = calculateExerciseScore(workouts, isBodymaker, isRestDay)

        // コンディションスコア計算
        val conditionScore = calculateConditionScore(conditions)

        return CalculatedScores(
            food = foodScore,
            exercise = exerciseScore,
            condition = conditionScore,
            totalScore = calculateTotalScore(foodScore, exerciseScore, conditionScore)
        )
    }

    /**
     * 食事スコアを計算 (10項目の詳細スコア)
     */
    private fun calculateFoodScore(meals: List<Meal>, target: NutritionTarget, isBodymaker: Boolean): FoodScore {
        val hasMealRecords = meals.isNotEmpty()

        // 栄養素集計
        val nutrition = aggregateNutrition(meals)

        // ① カロリースコア (10%)
        val calorieDeviation = if (target.calories > 0)
            abs(nutrition.totalCalories - target.calories) / target.calories else 0.0
        val calorieScore = if (hasMealRecords) max(0.0, 100 - (calorieDeviation * 200)) else 0.0

        // ② タンパク質スコア (20%)
        val proteinDeviation = if (target.protein > 0)
            abs(nutrition.totalProtein - target.protein) / target.protein else 0.0
        val proteinScore = if (hasMealRecords) max(0.0, 100 - (proteinDeviation * 150)) else 0.0

        // ③ 脂質スコア (20%)
        val fatDeviation = if (target.fat > 0)
            abs(nutrition.totalFat - target.fat) / target.fat else 0.0
        val fatScore = if (hasMealRecords) max(0.0, 100 - (fatDeviation * 200)) else 0.0

        // ④ 炭水化物スコア (20%)
        val carbsDeviation = if (target.carbs > 0)
            abs(nutrition.totalCarbs - target.carbs) / target.carbs else 0.0
        val carbsScore = if (hasMealRecords) max(0.0, 100 - (carbsDeviation * 200)) else 0.0

        // ⑤ DIAASスコア (5%)
        val diaaScore = calculateDiaaScore(nutrition.avgDIAAS, hasMealRecords)

        // ⑥ 脂肪酸バランススコア (5%)
        val fattyAcidScore = calculateFattyAcidScore(nutrition, hasMealRecords)

        // ⑦ 血糖管理スコア (5%) - GL制限はスタイルで変わる
        val glScore = calculateGlScore(nutrition.totalGL, hasMealRecords, isBodymaker)

        // ⑧ 食物繊維スコア (5%)
        val fiberScore = calculateFiberScore(nutrition.totalFiber, nutrition.totalCarbs, hasMealRecords)

        // ⑨ ビタミンスコア (5%)
        val vitaminScore = calculateVitaminScore(nutrition.vitamins, hasMealRecords)

        // ⑩ ミネラルスコア (5%)
        val mineralScore = calculateMineralScore(nutrition.minerals, hasMealRecords, isBodymaker)

        // 最終食事スコア (重み付け合計)
        val totalFoodScore = round(
            calorieScore * 0.10 +
            proteinScore * 0.20 +
            fatScore * 0.20 +
            carbsScore * 0.20 +
            diaaScore * 0.05 +
            fattyAcidScore * 0.05 +
            glScore * 0.05 +
            fiberScore * 0.05 +
            vitaminScore * 0.05 +
            mineralScore * 0.05
        ).toInt()

        return FoodScore(
            score = totalFoodScore,
            calorie = round(calorieScore).toInt(),
            protein = round(proteinScore).toInt(),
            fat = round(fatScore).toInt(),
            carbs = round(carbsScore).toInt(),
            diaas = round(diaaScore).toInt(),
            fattyAcid = round(fattyAcidScore).toInt(),
            gl = round(glScore).toInt(),
            fiber = round(fiberScore).toInt(),
            vitamin = round(vitaminScore).toInt(),
            mineral = round(mineralScore).toInt(),
            nutrition = nutrition
        )
    }

    /**
     * 栄養素を集計
     */
    private fun aggregateNutrition(meals: List<Meal>): AggregatedNutrition {
        var totalCalories = 0.0
        var totalProtein = 0.0
        var totalFat = 0.0
        var totalCarbs = 0.0
        var totalFiber = 0.0
        var totalSugar = 0.0
        var totalSaturatedFat = 0.0
        var totalMonounsaturatedFat = 0.0
        var totalPolyunsaturatedFat = 0.0
        var weightedDIAAS = 0.0
        var totalGL = 0.0

        val vitamins = mutableMapOf<String, Double>()
        val minerals = mutableMapOf<String, Double>()

        // 初期化
        vitaminTargets.keys.forEach { vitamins[it] = 0.0 }
        mineralTargets.keys.forEach { minerals[it] = 0.0 }

        meals.forEach { meal ->
            totalCalories += meal.totalCalories

            meal.items.forEach { item ->
                // MealItemの値は既に実際の量に対してスケール済み
                // （AddMealScreen等でratioを適用済み）
                // よってここではratioを再適用しない

                val protein = item.protein.toDouble()
                val fat = item.fat.toDouble()
                val carbs = item.carbs.toDouble()
                val fiber = item.fiber.toDouble()
                val sugar = item.sugar.toDouble()

                totalProtein += protein
                totalFat += fat
                totalCarbs += carbs
                totalFiber += fiber
                totalSugar += sugar

                // 脂肪酸（値は既にスケール済み）
                totalSaturatedFat += item.saturatedFat.toDouble()
                totalMonounsaturatedFat += item.monounsaturatedFat.toDouble()
                totalPolyunsaturatedFat += item.polyunsaturatedFat.toDouble()

                // DIAAS (タンパク質量で重み付け)
                if (item.diaas > 0 && protein > 0) {
                    weightedDIAAS += item.diaas.toDouble() * protein
                }

                // GL値 (GI × 炭水化物g / 100)
                if (item.gi > 0 && carbs > 0) {
                    totalGL += (item.gi.toDouble() * carbs) / 100.0
                }

                // ビタミン
                item.vitamins.forEach { (key, value) ->
                    vitamins[key] = (vitamins[key] ?: 0.0) + value.toDouble()
                }

                // ミネラル
                item.minerals.forEach { (key, value) ->
                    minerals[key] = (minerals[key] ?: 0.0) + value.toDouble()
                }
            }
        }

        val avgDIAAS = if (totalProtein > 0) weightedDIAAS / totalProtein else 0.0

        return AggregatedNutrition(
            totalCalories = totalCalories,
            totalProtein = totalProtein,
            totalFat = totalFat,
            totalCarbs = totalCarbs,
            totalFiber = totalFiber,
            totalSugar = totalSugar,
            totalSaturatedFat = totalSaturatedFat,
            totalMonounsaturatedFat = totalMonounsaturatedFat,
            totalPolyunsaturatedFat = totalPolyunsaturatedFat,
            avgDIAAS = avgDIAAS,
            totalGL = totalGL,
            vitamins = vitamins,
            minerals = minerals
        )
    }

    /**
     * DIAASスコア計算
     */
    private fun calculateDiaaScore(avgDIAAS: Double, hasMealRecords: Boolean): Double {
        if (!hasMealRecords) return 0.0
        return when {
            avgDIAAS >= 1.00 -> 100.0
            avgDIAAS >= 0.90 -> 80.0
            avgDIAAS >= 0.75 -> 60.0
            avgDIAAS >= 0.50 -> 40.0
            else -> 20.0
        }
    }

    /**
     * 脂肪酸バランススコア計算
     */
    private fun calculateFattyAcidScore(nutrition: AggregatedNutrition, hasMealRecords: Boolean): Double {
        if (!hasMealRecords) return 0.0
        if (nutrition.totalFat <= 0) return 50.0

        val satRatio = nutrition.totalSaturatedFat / nutrition.totalFat
        val monoRatio = nutrition.totalMonounsaturatedFat / nutrition.totalFat
        val polyRatio = nutrition.totalPolyunsaturatedFat / nutrition.totalFat

        // 飽和脂肪酸スコア (理想: 30-35%)
        val satScore = when {
            satRatio in 0.30..0.35 -> 100.0
            satRatio in 0.25..0.30 -> 80.0
            satRatio in 0.20..0.25 -> 60.0
            satRatio in 0.35..0.40 -> 80.0
            satRatio in 0.40..0.50 -> 60.0
            else -> 40.0
        }

        // 一価不飽和脂肪酸スコア (理想: 35-45%)
        val monoScore = when {
            monoRatio in 0.35..0.45 -> 100.0
            monoRatio in 0.30..0.35 -> 80.0
            monoRatio in 0.25..0.30 -> 60.0
            monoRatio in 0.45..0.50 -> 80.0
            else -> 40.0
        }

        // 多価不飽和脂肪酸スコア (理想: 20-30%)
        val polyScore = when {
            polyRatio in 0.20..0.30 -> 100.0
            polyRatio in 0.15..0.20 -> 80.0
            polyRatio in 0.10..0.15 -> 60.0
            polyRatio in 0.30..0.35 -> 80.0
            else -> 40.0
        }

        return satScore * 0.4 + monoScore * 0.3 + polyScore * 0.3
    }

    /**
     * 血糖管理スコア (GL) 計算
     * GL制限: ボディメイカー70、一般40（1食あたり）
     */
    private fun calculateGlScore(totalGL: Double, hasMealRecords: Boolean, isBodymaker: Boolean): Double {
        if (!hasMealRecords) return 0.0
        if (totalGL <= 0) return 50.0

        // スタイルに応じたGL基準（1日3食想定で3倍）
        val glLimit = if (isBodymaker) 70.0 * 3 else 40.0 * 3  // 210 or 120

        return when {
            totalGL <= glLimit * 0.6 -> 100.0       // 基準の60%以下で満点
            totalGL <= glLimit * 0.8 -> 90.0       // 基準の80%以下
            totalGL <= glLimit -> 75.0              // 基準以下
            totalGL <= glLimit * 1.25 -> 60.0      // 基準の125%以下
            totalGL <= glLimit * 1.5 -> 40.0       // 基準の150%以下
            else -> max(0.0, 40 - (totalGL - glLimit * 1.5) / 10)
        }
    }

    /**
     * 食物繊維スコア計算
     */
    private fun calculateFiberScore(totalFiber: Double, totalCarbs: Double, hasMealRecords: Boolean): Double {
        if (!hasMealRecords) return 0.0

        // 食物繊維量スコア (理想: 20-30g)
        val fiberAmountScore = when {
            totalFiber in 20.0..30.0 -> 100.0
            totalFiber in 15.0..20.0 -> 80.0
            totalFiber in 10.0..15.0 -> 60.0
            totalFiber in 5.0..10.0 -> 40.0
            totalFiber < 5 -> 20.0
            totalFiber in 30.0..35.0 -> 90.0
            else -> max(60.0, 90 - (totalFiber - 35) * 5)
        }

        // 糖質:食物繊維比 (理想: 10:1以下)
        val carbFiberRatioScore = if (totalFiber > 0) {
            val ratio = totalCarbs / totalFiber
            when {
                ratio <= 10 -> 100.0
                ratio <= 15 -> 80.0
                ratio <= 20 -> 60.0
                else -> max(0.0, 60 - (ratio - 20) * 3)
            }
        } else 50.0

        return fiberAmountScore * 0.6 + carbFiberRatioScore * 0.4
    }

    /**
     * ビタミンスコア計算
     */
    private fun calculateVitaminScore(vitamins: Map<String, Double>, hasMealRecords: Boolean): Double {
        if (!hasMealRecords) return 0.0

        val scores = vitaminTargets.map { (key, target) ->
            val actual = vitamins[key] ?: 0.0
            val rate = if (target > 0) actual / target else 0.0

            when {
                rate in 0.7..1.5 -> 100.0
                rate in 0.5..0.7 -> 70.0
                rate in 0.3..0.5 -> 50.0
                rate in 1.5..2.0 -> 80.0
                rate in 2.0..3.0 -> 60.0
                else -> 30.0
            }
        }

        return if (scores.isNotEmpty()) scores.average() else 50.0
    }

    /**
     * ミネラルスコア計算
     * ナトリウムはスタイル別に評価（ボディメイカーは発汗による損失を考慮）
     */
    private fun calculateMineralScore(minerals: Map<String, Double>, hasMealRecords: Boolean, isBodymaker: Boolean): Double {
        if (!hasMealRecords) return 0.0

        // 一般ミネラルのスコア（ナトリウム以外）
        val mineralScores = mineralTargets.map { (key, target) ->
            val actual = minerals[key] ?: 0.0
            val rate = if (target > 0) actual / target else 0.0

            when {
                rate in 0.8..1.5 -> 100.0
                rate in 0.6..0.8 -> 75.0
                rate in 0.4..0.6 -> 50.0
                rate in 1.5..2.0 -> 80.0
                else -> 30.0
            }
        }

        // ナトリウムスコア（スタイル別）
        val sodiumTarget = if (isBodymaker) sodiumTargetBodymaker else sodiumTargetGeneral
        val actualSodium = minerals["sodium"] ?: 0.0
        val sodiumScore = when {
            // 推奨値の±20%以内で満点
            actualSodium in (sodiumTarget.recommended * 0.8)..(sodiumTarget.recommended * 1.2) -> 100.0
            // 推奨値の±40%以内
            actualSodium in (sodiumTarget.recommended * 0.6)..(sodiumTarget.recommended * 1.4) -> 85.0
            // 上限以下
            actualSodium <= sodiumTarget.upperLimit -> 70.0
            // 上限の120%以下
            actualSodium <= sodiumTarget.upperLimit * 1.2 -> 50.0
            // 上限の150%以下
            actualSodium <= sodiumTarget.upperLimit * 1.5 -> 30.0
            // それ以上
            else -> max(0.0, 30 - (actualSodium - sodiumTarget.upperLimit * 1.5) / 1000 * 10)
        }

        // 全ミネラル + ナトリウムの平均
        val allScores = mineralScores + sodiumScore
        return if (allScores.isNotEmpty()) allScores.average() else 50.0
    }

    /**
     * 運動スコアを計算
     * 基準: ボディメイカー90分/20セット、一般60分/12セットで満点
     */
    private fun calculateExerciseScore(
        workouts: List<Workout>,
        isBodymaker: Boolean,
        isRestDay: Boolean
    ): ExerciseScore {
        // 運動時間とセット数を集計
        var totalDuration = 0
        var totalSets = 0
        workouts.forEach { workout ->
            totalDuration += workout.totalDuration
            // セット数を集計（筋トレはセット数、有酸素15分=1セット、ストレッチ10分=1セット）
            workout.exercises.forEach { exercise ->
                totalSets += when (exercise.category) {
                    // 筋トレ系
                    ExerciseCategory.CHEST,
                    ExerciseCategory.BACK,
                    ExerciseCategory.SHOULDERS,
                    ExerciseCategory.ARMS,
                    ExerciseCategory.CORE,
                    ExerciseCategory.LEGS -> exercise.sets ?: 1

                    // 有酸素系（15分=1セット換算）
                    ExerciseCategory.RUNNING,
                    ExerciseCategory.WALKING,
                    ExerciseCategory.CYCLING,
                    ExerciseCategory.SWIMMING,
                    ExerciseCategory.HIIT -> ((exercise.duration ?: 15) / 15).coerceAtLeast(1)

                    // ストレッチ系（10分=1セット換算）
                    ExerciseCategory.YOGA,
                    ExerciseCategory.STRETCHING -> ((exercise.duration ?: 10) / 10).coerceAtLeast(1)

                    // その他
                    else -> exercise.sets ?: 1
                }
            }
        }

        var durationScore: Double
        var setsScore: Double

        // 休養日の場合は100点
        if (isRestDay) {
            durationScore = 100.0
            setsScore = 100.0
        } else if (isBodymaker) {
            // ボディメイカー基準: 90分以上で満点
            val durationTarget = 90
            durationScore = when {
                totalDuration == 0 -> 0.0
                totalDuration >= durationTarget -> 100.0
                else -> (totalDuration.toDouble() / durationTarget) * 100
            }

            // ボディメイカー基準: 20セット以上で満点
            val setsTarget = 20
            setsScore = when {
                totalSets == 0 -> 0.0
                totalSets >= setsTarget -> 100.0
                else -> (totalSets.toDouble() / setsTarget) * 100
            }
        } else {
            // 一般基準: 60分以上で満点
            val durationTarget = 60
            durationScore = when {
                totalDuration == 0 -> 0.0
                totalDuration >= durationTarget -> 100.0
                else -> (totalDuration.toDouble() / durationTarget) * 100
            }

            // 一般基準: 12セット以上で満点
            val setsTarget = 12
            setsScore = when {
                totalSets == 0 -> 0.0
                totalSets >= setsTarget -> 100.0
                else -> (totalSets.toDouble() / setsTarget) * 100
            }
        }

        // 総時間30%、総セット数70%
        val totalScore = round(durationScore * 0.30 + setsScore * 0.70).toInt()

        return ExerciseScore(
            score = totalScore,
            duration = round(durationScore).toInt(),
            setsScore = round(setsScore).toInt(),
            totalMinutes = totalDuration,
            totalSets = totalSets
        )
    }

    /**
     * コンディションスコアを計算
     */
    private fun calculateConditionScore(conditions: ConditionData?): ConditionScore {
        if (conditions == null) {
            return ConditionScore(
                score = 0,
                sleep = 0, quality = 0, digestion = 0, focus = 0, stress = 0
            )
        }

        // 各項目1-5点 → 平均 → 20倍して100点満点
        val totalScore = round(
            (conditions.sleepHours + conditions.sleepQuality +
             conditions.digestion + conditions.focus + conditions.stress).toDouble() / 5 * 20
        ).toInt()

        return ConditionScore(
            score = totalScore,
            sleep = round((conditions.sleepHours.toDouble() / 5) * 100).toInt(),
            quality = round((conditions.sleepQuality.toDouble() / 5) * 100).toInt(),
            digestion = round((conditions.digestion.toDouble() / 5) * 100).toInt(),
            focus = round((conditions.focus.toDouble() / 5) * 100).toInt(),
            stress = round((conditions.stress.toDouble() / 5) * 100).toInt()
        )
    }

    /**
     * 総合スコアを計算 (食事60%、運動30%、コンディション10%)
     */
    private fun calculateTotalScore(
        food: FoodScore,
        exercise: ExerciseScore,
        condition: ConditionScore
    ): Int {
        return round(
            food.score * 0.60 +
            exercise.score * 0.30 +
            condition.score * 0.10
        ).toInt()
    }
}

// ===== データクラス =====

/**
 * 栄養目標値
 */
data class NutritionTarget(
    val calories: Double = 2000.0,
    val protein: Double = 60.0,
    val fat: Double = 55.0,
    val carbs: Double = 250.0
)

/**
 * コンディションデータ
 */
data class ConditionData(
    val sleepHours: Int = 0,      // 1-5
    val sleepQuality: Int = 0,    // 1-5
    val digestion: Int = 0,       // 1-5
    val focus: Int = 0,           // 1-5
    val stress: Int = 0           // 1-5
)

/**
 * 集計された栄養素データ
 */
data class AggregatedNutrition(
    val totalCalories: Double,
    val totalProtein: Double,
    val totalFat: Double,
    val totalCarbs: Double,
    val totalFiber: Double,
    val totalSugar: Double,
    val totalSaturatedFat: Double,
    val totalMonounsaturatedFat: Double,
    val totalPolyunsaturatedFat: Double,
    val avgDIAAS: Double,
    val totalGL: Double,
    val vitamins: Map<String, Double>,
    val minerals: Map<String, Double>
)

/**
 * 食事スコア詳細
 */
data class FoodScore(
    val score: Int,
    val calorie: Int,
    val protein: Int,
    val fat: Int,
    val carbs: Int,
    val diaas: Int,
    val fattyAcid: Int,
    val gl: Int,
    val fiber: Int,
    val vitamin: Int,
    val mineral: Int,
    val nutrition: AggregatedNutrition
)

/**
 * 運動スコア詳細
 */
data class ExerciseScore(
    val score: Int,
    val duration: Int,        // 時間スコア (30%)
    val setsScore: Int,       // セット数スコア (70%)
    val totalMinutes: Int,    // 総運動時間
    val totalSets: Int        // 総セット数
)

/**
 * コンディションスコア詳細
 */
data class ConditionScore(
    val score: Int,
    val sleep: Int,
    val quality: Int,
    val digestion: Int,
    val focus: Int,
    val stress: Int
)

/**
 * 計算されたスコア全体
 */
data class CalculatedScores(
    val food: FoodScore,
    val exercise: ExerciseScore,
    val condition: ConditionScore,
    val totalScore: Int
)
