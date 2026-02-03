package com.yourcoach.plus.shared.domain.model

import kotlinx.serialization.Serializable

/**
 * ルーティンパターン
 * 複数のルーティン（Normal/Light/Hard等）を管理
 * 例: 「胸の日」に対して、Normal（フルコース）、Light（時短）、Hard（追い込み）を持てる
 */
@Serializable
data class RoutinePattern(
    val id: String = "",
    val userId: String = "",
    val name: String = "",                    // "パターンA", "ノーマル", "ライト"等
    val description: String = "",             // パターンの説明
    val days: List<RoutineDay> = emptyList(), // 7日分のルーティン
    val isActive: Boolean = false,            // 現在アクティブなパターン
    val isPreset: Boolean = false,            // プリセット（システム提供）かどうか
    val presetCategory: String? = null,       // "beginner", "intermediate", "advanced"
    val createdAt: Long = 0,
    val updatedAt: Long = 0
)

/**
 * ルーティンの1日分
 * Day 1（胸の日）、Day 2（背中の日）等
 */
@Serializable
data class RoutineDay(
    val id: String = "",
    val dayNumber: Int = 0,                   // 1-7（週の何日目か）
    val name: String = "",                    // "Day 1", "胸の日"等
    val splitType: String = "",               // "胸", "背中", "肩", "腕", "脚", "休み"
    val isRestDay: Boolean = false,           // 休養日かどうか
    val meals: List<RoutineMealTemplate> = emptyList(),      // 紐付けられた食事テンプレート
    val workouts: List<RoutineWorkoutTemplate> = emptyList() // 紐付けられた運動テンプレート
)

/**
 * ルーティンに紐付ける食事テンプレート
 */
@Serializable
data class RoutineMealTemplate(
    val id: String = "",
    val templateId: String = "",              // MealTemplateのID
    val templateName: String = "",            // 表示用名称
    val mealType: String = "",                // "breakfast", "lunch", "dinner", "snack"
    val items: List<RoutineMealItem> = emptyList(), // 食品リスト
    val totalCalories: Int = 0,
    val totalProtein: Float = 0f,
    val totalCarbs: Float = 0f,
    val totalFat: Float = 0f
)

/**
 * ルーティン食事テンプレートの食品
 */
@Serializable
data class RoutineMealItem(
    val id: String = "",
    val name: String = "",
    val amount: Float = 0f,
    val unit: String = "g",
    val calories: Int = 0,
    val protein: Float = 0f,
    val carbs: Float = 0f,
    val fat: Float = 0f,
    // 詳細栄養素（オプション）
    val fiber: Float = 0f,
    val sugar: Float = 0f,
    val sodium: Float = 0f,
    val saturatedFat: Float = 0f,
    val cholesterol: Float = 0f
)

/**
 * ルーティンに紐付ける運動テンプレート
 */
@Serializable
data class RoutineWorkoutTemplate(
    val id: String = "",
    val templateId: String = "",              // WorkoutTemplateのID
    val templateName: String = "",            // 表示用名称
    val exercises: List<RoutineExercise> = emptyList(),
    val estimatedDuration: Int = 0,           // 推定所要時間（分）
    val estimatedCaloriesBurned: Int = 0      // 推定消費カロリー
)

/**
 * ルーティン運動テンプレートの種目
 */
@Serializable
data class RoutineExercise(
    val id: String = "",
    val name: String = "",                    // "ベンチプレス", "スクワット"等
    val category: String = "",                // "chest", "back", "shoulder"等
    val sets: Int = 0,
    val reps: Int = 0,
    val weight: Float = 0f,                   // kg
    val duration: Int = 0,                    // 有酸素の場合の時間（分）
    val restSeconds: Int = 60,                // セット間休憩（秒）
    val notes: String = ""                    // メモ
)

/**
 * 分割法の種類
 */
object SplitTypes {
    const val CHEST = "胸"
    const val BACK = "背中"
    const val SHOULDER = "肩"
    const val ARM = "腕"
    const val LEG = "脚"
    const val REST = "休み"
    const val FULL_BODY = "全身"
    const val UPPER = "上半身"
    const val LOWER = "下半身"
    const val PUSH = "プッシュ"
    const val PULL = "プル"

    val ALL = listOf(CHEST, BACK, SHOULDER, ARM, LEG, REST, FULL_BODY, UPPER, LOWER, PUSH, PULL)
    val TRAINING_DAYS = listOf(CHEST, BACK, SHOULDER, ARM, LEG, FULL_BODY, UPPER, LOWER, PUSH, PULL)
}

/**
 * パターンの種類（ユーザーが選べるバリエーション）
 */
object PatternTypes {
    const val NORMAL = "ノーマル"       // いつものフルコース
    const val LIGHT = "ライト"          // 時短・軽めメニュー
    const val HARD = "ハード"           // 追い込みメニュー
    const val TRAVEL = "出張・旅行"     // 外出先用
    const val HOME = "自宅"             // 自宅トレーニング用

    val ALL = listOf(NORMAL, LIGHT, HARD, TRAVEL, HOME)
}
