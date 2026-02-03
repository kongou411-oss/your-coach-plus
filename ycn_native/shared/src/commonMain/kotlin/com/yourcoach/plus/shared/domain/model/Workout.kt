package com.yourcoach.plus.shared.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class Workout(
    val id: String,
    val userId: String,
    val name: String? = null,            // ワークアウト名
    val type: WorkoutType,
    val exercises: List<Exercise>,
    val totalDuration: Int,  // minutes
    val totalCaloriesBurned: Int,
    val intensity: WorkoutIntensity,
    val note: String? = null,
    // ルーティン関連
    val isRoutine: Boolean = false,      // ルーティンから作成
    val routineName: String? = null,     // ルーティン名（Day 1等）
    val isTemplate: Boolean = false,     // テンプレートから作成
    val timestamp: Long,
    val createdAt: Long
)

@Serializable
data class Exercise(
    val name: String,
    val category: ExerciseCategory,
    val sets: Int? = null,
    val reps: Int? = null,
    val weight: Float? = null,
    val duration: Int? = null,  // minutes
    val distance: Float? = null,  // km
    val caloriesBurned: Int,
    // セット詳細（アップ/メイン区別）
    val warmupSets: Int = 0,      // アップセット数
    val mainSets: Int = 0,        // メインセット数
    val totalVolume: Int = 0,     // 総体積（kg×reps）
    // セット単位の詳細記録（WorkoutRecorder用）
    val setDetails: List<ExerciseSet> = emptyList()
) {
    /**
     * セット詳細から集計値を再計算
     */
    fun recalculateFromSets(): Exercise {
        if (setDetails.isEmpty()) return this

        val warmup = setDetails.count { it.type == SetType.WARMUP }
        val main = setDetails.count { it.type != SetType.WARMUP }
        val volume = setDetails.sumOf { it.volume.toDouble() }.toInt()
        val maxWeight = setDetails.filter { it.type.isCountedIn1RM }.maxOfOrNull { it.weight }
        val avgReps = setDetails.filter { it.type != SetType.WARMUP }.map { it.reps }.average().toInt()

        return copy(
            warmupSets = warmup,
            mainSets = main,
            totalVolume = volume,
            sets = setDetails.size,
            weight = maxWeight,
            reps = avgReps
        )
    }
}

@Serializable
enum class WorkoutType {
    STRENGTH,       // 筋トレ
    CARDIO,         // 有酸素運動
    FLEXIBILITY,    // ストレッチ・ヨガ
    SPORTS,         // スポーツ
    DAILY_ACTIVITY  // 日常活動
}

@Serializable
enum class ExerciseCategory {
    // 筋トレ
    CHEST,          // 胸
    BACK,           // 背中
    SHOULDERS,      // 肩
    ARMS,           // 腕
    CORE,           // 体幹
    LEGS,           // 脚

    // 有酸素
    RUNNING,        // ランニング
    WALKING,        // ウォーキング
    CYCLING,        // サイクリング
    SWIMMING,       // 水泳
    HIIT,           // HIIT

    // その他
    YOGA,           // ヨガ
    STRETCHING,     // ストレッチ
    SPORTS,         // スポーツ
    OTHER           // その他
}

@Serializable
enum class WorkoutIntensity {
    LOW,
    MODERATE,
    HIGH,
    VERY_HIGH
}

@Serializable
data class WorkoutTemplate(
    val id: String,
    val userId: String,
    val name: String,
    val type: WorkoutType,
    val exercises: List<Exercise>,
    val estimatedDuration: Int,
    val estimatedCalories: Int,
    val usageCount: Int = 0,
    val lastUsedAt: Long? = null,
    val createdAt: Long
)

/**
 * 種目別の前回記録（クエスト生成用）
 */
@Serializable
data class ExerciseRecord(
    val exerciseName: String,
    val category: ExerciseCategory,
    val weight: Float?,               // 使用重量(kg)
    val reps: Int?,                   // 回数
    val sets: Int?,                   // セット数
    val mainSets: Int,                // メインセット数
    val totalVolume: Int,             // 総体積(kg×reps)
    val estimatedOneRepMax: Float,    // 推定1RM
    val recordDate: Long,             // 記録日時
    val daysSinceRecord: Int          // 記録からの経過日数
) {
    companion object {
        /**
         * 推定1RM計算（Brzycki式）
         * E1RM = weight × (36 / (37 - reps))
         * repsが10以下で精度が高い
         */
        fun calculateE1RM(weight: Float?, reps: Int?): Float {
            if (weight == null || weight <= 0f || reps == null || reps <= 0) return 0f
            if (reps >= 37) return weight // 37回以上は計算不可
            return weight * (36f / (37f - reps))
        }

        /**
         * 目標重量を計算（漸進性過負荷）
         * @param mode GROWTH(+2.5kg), PERCENT(+5%), REHAB(-20%)
         */
        fun calculateTargetWeight(
            previousWeight: Float,
            mode: ProgressionMode
        ): Float {
            return when (mode) {
                ProgressionMode.GROWTH -> previousWeight + 2.5f
                ProgressionMode.PERCENT_UP -> previousWeight * 1.05f
                ProgressionMode.REHAB -> previousWeight * 0.8f
                ProgressionMode.MAINTAIN -> previousWeight
            }
        }
    }
}

/**
 * 漸進性過負荷のモード
 */
@Serializable
enum class ProgressionMode {
    GROWTH,      // +2.5kg（通常）
    PERCENT_UP,  // +5%（高重量種目）
    REHAB,       // -20%（久しぶり）
    MAINTAIN     // 維持
}
