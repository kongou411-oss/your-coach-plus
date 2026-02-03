package com.yourcoach.plus.shared.domain.usecase

/**
 * 運動クエスト生成ロジック
 *
 * 30分あたり1種目5セット換算で目標を算出
 */
object WorkoutQuestGenerator {

    // 1種目あたりの所要時間（分）
    private const val MINUTES_PER_EXERCISE = 30

    // 1種目あたりのセット数
    private const val SETS_PER_EXERCISE = 5

    /**
     * トレーニング時間から運動クエスト目標を生成
     *
     * @param trainingDurationMinutes トレーニング所要時間（分）
     * @return 運動クエスト目標
     */
    fun generateTarget(trainingDurationMinutes: Int): WorkoutQuestTarget {
        val exerciseCount = calculateExerciseCount(trainingDurationMinutes)
        val totalSets = exerciseCount * SETS_PER_EXERCISE

        return WorkoutQuestTarget(
            exerciseCount = exerciseCount,
            setsPerExercise = SETS_PER_EXERCISE,
            totalSets = totalSets,
            trainingDurationMinutes = trainingDurationMinutes
        )
    }

    /**
     * トレーニング時間から種目数を算出
     * 30分 = 1種目、60分 = 2種目、90分 = 3種目...
     */
    fun calculateExerciseCount(trainingDurationMinutes: Int): Int {
        return (trainingDurationMinutes / MINUTES_PER_EXERCISE).coerceAtLeast(1)
    }

    /**
     * 種目数から必要なトレーニング時間を逆算
     */
    fun calculateRequiredDuration(exerciseCount: Int): Int {
        return exerciseCount * MINUTES_PER_EXERCISE
    }
}

/**
 * 運動クエストのターゲット
 */
data class WorkoutQuestTarget(
    val exerciseCount: Int,           // 種目数
    val setsPerExercise: Int,         // 1種目あたりのセット数
    val totalSets: Int,               // 総セット数
    val trainingDurationMinutes: Int  // トレーニング時間（分）
) {
    /**
     * 目標表示テキスト
     * 例: "4種目 × 5セット"
     */
    fun getTargetText(): String {
        return "${exerciseCount}種目 × ${setsPerExercise}セット"
    }

    /**
     * 詳細表示テキスト
     * 例: "合計20セット（120分）"
     */
    fun getDetailText(): String {
        return "合計${totalSets}セット（${trainingDurationMinutes}分）"
    }
}
