package com.yourcoach.plus.shared.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class Meal(
    val id: String,
    val userId: String,
    val name: String? = null,           // 食事名（朝食のオムレツ等）
    val type: MealType,
    val time: String? = null,           // 記録時刻 "HH:mm"形式
    val items: List<MealItem>,
    val totalCalories: Int,
    val totalProtein: Float,
    val totalCarbs: Float,
    val totalFat: Float,
    val totalFiber: Float,
    val totalGL: Float = 0f,            // 合計GL値
    val imageUrl: String? = null,
    val note: String? = null,
    // 入力元タグ
    val isPredicted: Boolean = false,   // AI予測で作成
    val isTemplate: Boolean = false,    // テンプレートから作成
    val isRoutine: Boolean = false,     // ルーティンから作成
    val routineName: String? = null,    // ルーティン名（Day 1等）
    val isPostWorkout: Boolean = false, // 運動後の食事
    val timestamp: Long,
    val createdAt: Long
)

/**
 * 食品アイテム（完全な栄養データ対応）
 */
@Serializable
data class MealItem(
    val name: String,
    val amount: Float,
    val unit: String,
    val calories: Int,
    val protein: Float,
    val carbs: Float,
    val fat: Float,
    val fiber: Float = 0f,
    val solubleFiber: Float = 0f,    // 水溶性食物繊維
    val insolubleFiber: Float = 0f,  // 不溶性食物繊維
    val sugar: Float = 0f,
    // 脂肪酸詳細
    val saturatedFat: Float = 0f,
    val mediumChainFat: Float = 0f,       // 中鎖脂肪酸 (MCT)
    val monounsaturatedFat: Float = 0f,
    val polyunsaturatedFat: Float = 0f,
    // 品質指標
    val diaas: Float = 0f,           // タンパク質品質 (0.0-1.0+)
    val gi: Int = 0,                  // グリセミック指数 (0-100)
    // ビタミン (μgまたはmg)
    val vitamins: Map<String, Float> = emptyMap(),
    // ミネラル (mg)
    val minerals: Map<String, Float> = emptyMap(),
    // メタデータ
    val isAiRecognized: Boolean = false,
    val category: String? = null
) {
    companion object {
        /**
         * アトウォーター係数でカロリーを計算
         * P×4 + F×9 + C×4
         */
        fun calculateCalories(protein: Float, fat: Float, carbs: Float): Int {
            return (protein * 4 + fat * 9 + carbs * 4).toInt()
        }
    }
}

@Serializable
enum class MealType {
    BREAKFAST,   // 朝食
    LUNCH,       // 昼食
    DINNER,      // 夕食
    SNACK,       // 間食
    SUPPLEMENT   // サプリメント
}

@Serializable
data class MealTemplate(
    val id: String,
    val userId: String,
    val name: String,
    val items: List<MealItem>,
    val totalCalories: Int,
    val totalProtein: Float,
    val totalCarbs: Float,
    val totalFat: Float,
    val usageCount: Int = 0,
    val lastUsedAt: Long? = null,
    val createdAt: Long
)
