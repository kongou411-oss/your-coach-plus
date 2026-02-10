package com.yourcoach.plus.shared.util

import com.yourcoach.plus.shared.domain.model.ExerciseCategory
import com.yourcoach.plus.shared.domain.model.WorkoutIntensity
import com.yourcoach.plus.shared.domain.model.WorkoutType
import kotlin.math.max
import kotlin.math.roundToInt

/**
 * MET (Metabolic Equivalent of Task) ベースの消費カロリー計算
 * Compendium of Physical Activities準拠
 *
 * 公式: calories = MET × bodyWeight(kg) × duration(h) × intensityMultiplier
 */
object MetCalorieCalculator {

    // === MET値テーブル (Compendium of Physical Activities準拠) ===
    private val BASE_MET: Map<ExerciseCategory, Double> = mapOf(
        ExerciseCategory.CHEST to 5.0,
        ExerciseCategory.BACK to 5.0,
        ExerciseCategory.SHOULDERS to 5.0,
        ExerciseCategory.ARMS to 4.0,
        ExerciseCategory.CORE to 3.8,
        ExerciseCategory.LEGS to 6.0,
        ExerciseCategory.RUNNING to 9.8,
        ExerciseCategory.WALKING to 3.5,
        ExerciseCategory.CYCLING to 7.5,
        ExerciseCategory.SWIMMING to 7.0,
        ExerciseCategory.HIIT to 8.0,
        ExerciseCategory.YOGA to 3.0,
        ExerciseCategory.STRETCHING to 2.5,
        ExerciseCategory.SPORTS to 5.0,
        ExerciseCategory.OTHER to 4.0
    )

    // === 強度乗数 ===
    private val INTENSITY_MULTIPLIER: Map<WorkoutIntensity, Double> = mapOf(
        WorkoutIntensity.LOW to 0.8,
        WorkoutIntensity.MODERATE to 1.0,
        WorkoutIntensity.HIGH to 1.2,
        WorkoutIntensity.VERY_HIGH to 1.4
    )

    // === 部位別セット間レスト秒数 ===
    private val REST_SECONDS: Map<ExerciseCategory, Int> = mapOf(
        ExerciseCategory.LEGS to 120,
        ExerciseCategory.CHEST to 90,
        ExerciseCategory.BACK to 90,
        ExerciseCategory.SHOULDERS to 90,
        ExerciseCategory.ARMS to 60,
        ExerciseCategory.CORE to 60
    )

    /**
     * METベースで消費カロリーを計算
     *
     * @param category 運動カテゴリ
     * @param bodyWeightKg 体重(kg)
     * @param durationMinutes 運動時間(分)
     * @param intensity 運動強度
     * @return 消費カロリー(kcal)
     */
    fun calculateCalories(
        category: ExerciseCategory,
        bodyWeightKg: Float,
        durationMinutes: Int,
        intensity: WorkoutIntensity = WorkoutIntensity.MODERATE
    ): Int {
        val met = BASE_MET[category] ?: 4.0
        val multiplier = INTENSITY_MULTIPLIER[intensity] ?: 1.0
        val durationHours = durationMinutes / 60.0
        val calories = met * bodyWeightKg * durationHours * multiplier
        return max(1, calories.roundToInt())
    }

    /**
     * 筋トレの時間を推定（セット数・レップ数から）
     *
     * 1セットあたり = (reps × 4秒 + 部位別レスト秒) / 60分
     * 最低保証: sets × 1分
     *
     * @param category 運動カテゴリ
     * @param sets セット数
     * @param reps レップ数
     * @return 推定時間(分)
     */
    fun estimateStrengthDuration(
        category: ExerciseCategory,
        sets: Int,
        reps: Int
    ): Int {
        val restSeconds = REST_SECONDS[category] ?: 60
        val secondsPerSet = (reps * 4) + restSeconds
        val totalSeconds = sets * secondsPerSet
        val estimatedMinutes = (totalSeconds / 60.0).roundToInt()
        return max(sets * 1, estimatedMinutes)
    }

    /**
     * ワークアウト全体の消費カロリーを計算
     */
    data class WorkoutCalorieResult(
        val totalCalories: Int,
        val totalDuration: Int,
        val exerciseCalories: List<Int>
    )

    fun calculateWorkoutTotal(
        exercises: List<ExerciseCalcInput>,
        bodyWeightKg: Float,
        intensity: WorkoutIntensity = WorkoutIntensity.MODERATE
    ): WorkoutCalorieResult {
        var totalCalories = 0
        var totalDuration = 0
        val exerciseCalories = mutableListOf<Int>()

        for (ex in exercises) {
            val duration = ex.durationMinutes
                ?: estimateStrengthDuration(ex.category, ex.sets ?: 3, ex.reps ?: 10)
            val cal = calculateCalories(ex.category, bodyWeightKg, duration, intensity)
            totalCalories += cal
            totalDuration += duration
            exerciseCalories.add(cal)
        }

        return WorkoutCalorieResult(totalCalories, totalDuration, exerciseCalories)
    }

    /**
     * ExerciseCategoryからWorkoutTypeを推定
     */
    fun inferWorkoutType(category: ExerciseCategory): WorkoutType {
        return when (category) {
            ExerciseCategory.RUNNING, ExerciseCategory.WALKING,
            ExerciseCategory.CYCLING, ExerciseCategory.SWIMMING,
            ExerciseCategory.HIIT -> WorkoutType.CARDIO

            ExerciseCategory.YOGA, ExerciseCategory.STRETCHING -> WorkoutType.FLEXIBILITY

            ExerciseCategory.SPORTS -> WorkoutType.SPORTS

            else -> WorkoutType.STRENGTH
        }
    }

    /**
     * 種目名からExerciseCategoryを推定（日本語キーワードマッチ）
     *
     * @param exerciseName 種目名
     * @param splitType ルーティンのsplitType（フォールバック用）
     * @return 推定されたExerciseCategory
     */
    fun inferExerciseCategory(exerciseName: String, splitType: String? = null): ExerciseCategory {
        val name = exerciseName.lowercase()

        // 種目名キーワードマッチ（優先順位高い順）
        return when {
            // 胸
            name.contains("ベンチ") || name.contains("チェスト") || name.contains("フライ") ||
            name.contains("ディップ") || name.contains("プッシュアップ") || name.contains("腕立て") ||
            name.contains("bench") || name.contains("chest") -> ExerciseCategory.CHEST

            // 脚
            name.contains("スクワット") || name.contains("レッグ") || name.contains("デッドリフト") ||
            name.contains("ランジ") || name.contains("カーフ") || name.contains("ヒップ") ||
            name.contains("squat") || name.contains("leg") || name.contains("deadlift") -> ExerciseCategory.LEGS

            // 背中
            name.contains("ロウ") || name.contains("プル") || name.contains("ラット") ||
            name.contains("チンニング") || name.contains("懸垂") || name.contains("背中") ||
            name.contains("row") || name.contains("pull") || name.contains("lat") -> ExerciseCategory.BACK

            // 肩
            name.contains("ショルダー") || name.contains("プレス") || name.contains("レイズ") ||
            name.contains("サイド") || name.contains("フロント") || name.contains("リア") ||
            name.contains("shoulder") || name.contains("press") -> ExerciseCategory.SHOULDERS

            // 腕
            name.contains("カール") || name.contains("トライセプス") || name.contains("バイセプス") ||
            name.contains("アーム") || name.contains("二頭") || name.contains("三頭") ||
            name.contains("curl") || name.contains("tricep") -> ExerciseCategory.ARMS

            // 体幹
            name.contains("プランク") || name.contains("クランチ") || name.contains("シットアップ") ||
            name.contains("腹筋") || name.contains("体幹") || name.contains("アブ") ||
            name.contains("plank") || name.contains("crunch") || name.contains("abs") -> ExerciseCategory.CORE

            // 有酸素
            name.contains("ランニング") || name.contains("ジョギング") || name.contains("走") ||
            name.contains("running") || name.contains("jog") -> ExerciseCategory.RUNNING

            name.contains("ウォーキング") || name.contains("歩") || name.contains("散歩") ||
            name.contains("walking") || name.contains("walk") -> ExerciseCategory.WALKING

            name.contains("サイクル") || name.contains("バイク") || name.contains("自転車") ||
            name.contains("cycling") || name.contains("bike") -> ExerciseCategory.CYCLING

            name.contains("スイム") || name.contains("水泳") || name.contains("泳") ||
            name.contains("swim") -> ExerciseCategory.SWIMMING

            name.contains("hiit") || name.contains("バーピー") || name.contains("サーキット") ||
            name.contains("タバタ") -> ExerciseCategory.HIIT

            // ストレッチ・ヨガ
            name.contains("ヨガ") || name.contains("yoga") -> ExerciseCategory.YOGA
            name.contains("ストレッチ") || name.contains("stretch") -> ExerciseCategory.STRETCHING

            // スポーツ
            name.contains("サッカー") || name.contains("テニス") || name.contains("バスケ") ||
            name.contains("バレー") || name.contains("野球") -> ExerciseCategory.SPORTS

            // splitTypeフォールバック
            else -> inferFromSplitType(splitType)
        }
    }

    /**
     * splitType（ルーティンの部位）からExerciseCategoryを推定
     */
    private fun inferFromSplitType(splitType: String?): ExerciseCategory {
        if (splitType == null) return ExerciseCategory.OTHER
        val st = splitType.lowercase()
        return when {
            st.contains("胸") || st.contains("chest") -> ExerciseCategory.CHEST
            st.contains("背") || st.contains("back") -> ExerciseCategory.BACK
            st.contains("肩") || st.contains("shoulder") -> ExerciseCategory.SHOULDERS
            st.contains("腕") || st.contains("arm") -> ExerciseCategory.ARMS
            st.contains("脚") || st.contains("leg") || st.contains("下半身") -> ExerciseCategory.LEGS
            st.contains("腹") || st.contains("体幹") || st.contains("core") -> ExerciseCategory.CORE
            else -> ExerciseCategory.OTHER
        }
    }
}

/**
 * ワークアウト全体計算用の入力データ
 */
data class ExerciseCalcInput(
    val category: ExerciseCategory,
    val sets: Int? = null,
    val reps: Int? = null,
    val durationMinutes: Int? = null
)
