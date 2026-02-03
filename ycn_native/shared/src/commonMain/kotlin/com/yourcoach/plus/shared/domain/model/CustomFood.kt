package com.yourcoach.plus.shared.domain.model

import kotlinx.serialization.Serializable

/**
 * カスタム食品（ユーザーが手動入力した食品）
 */
@Serializable
data class CustomFood(
    val id: String,
    val userId: String,
    val name: String,
    val calories: Int,           // 100gあたり
    val protein: Float,          // 100gあたり
    val carbs: Float,            // 100gあたり
    val fat: Float,              // 100gあたり
    val fiber: Float = 0f,
    val solubleFiber: Float = 0f,    // 水溶性食物繊維
    val insolubleFiber: Float = 0f,  // 不溶性食物繊維
    val sugar: Float = 0f,
    val gi: Int = 0,
    val diaas: Float = 0f,
    // 脂肪酸詳細
    val saturatedFat: Float = 0f,
    val monounsaturatedFat: Float = 0f,
    val polyunsaturatedFat: Float = 0f,
    // ビタミン13種（100gあたり）
    val vitaminA: Float = 0f,        // μgRAE
    val vitaminB1: Float = 0f,       // mg
    val vitaminB2: Float = 0f,       // mg
    val vitaminB6: Float = 0f,       // mg
    val vitaminB12: Float = 0f,      // μg
    val vitaminC: Float = 0f,        // mg
    val vitaminD: Float = 0f,        // μg
    val vitaminE: Float = 0f,        // mg
    val vitaminK: Float = 0f,        // μg
    val niacin: Float = 0f,          // mgNE
    val pantothenicAcid: Float = 0f, // mg
    val biotin: Float = 0f,          // μg
    val folicAcid: Float = 0f,       // μg
    // ミネラル13種（100gあたり）
    val sodium: Float = 0f,          // mg
    val potassium: Float = 0f,       // mg
    val calcium: Float = 0f,         // mg
    val magnesium: Float = 0f,       // mg
    val phosphorus: Float = 0f,      // mg
    val iron: Float = 0f,            // mg
    val zinc: Float = 0f,            // mg
    val copper: Float = 0f,          // mg
    val manganese: Float = 0f,       // mg
    val iodine: Float = 0f,          // μg
    val selenium: Float = 0f,        // μg
    val chromium: Float = 0f,        // μg
    val molybdenum: Float = 0f,      // μg
    // AI解析済みフラグ
    val isAiAnalyzed: Boolean = false,
    val analyzedAt: Long? = null,
    // 使用回数
    val usageCount: Int = 0,
    val lastUsedAt: Long? = null,
    val createdAt: Long
)

/**
 * カスタム運動種目（ユーザーが手動入力した種目）
 */
@Serializable
data class CustomExercise(
    val id: String,
    val userId: String,
    val name: String,
    val category: ExerciseCategory,
    val defaultDuration: Int? = null,     // デフォルト時間（分）
    val defaultSets: Int? = null,         // デフォルトセット数
    val defaultReps: Int? = null,         // デフォルト回数
    val defaultWeight: Float? = null,     // デフォルト重量
    val caloriesPerMinute: Float = 5f,    // 1分あたりの消費カロリー目安
    // 使用回数
    val usageCount: Int = 0,
    val lastUsedAt: Long? = null,
    val createdAt: Long
)
