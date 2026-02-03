package com.yourcoach.plus.shared.data.database

import kotlinx.serialization.Serializable

/**
 * 運動/トレーニング種目データ
 */
@Serializable
data class ExerciseItem(
    val name: String,
    val category: String,              // 胸、背中、肩、脚など
    val subcategory: String,           // コンパウンド、アイソレーション
    val exerciseType: ExerciseType,    // 有酸素/無酸素
    val jointType: JointType,          // 関節タイプ

    val primaryMuscles: List<String>,  // 主動筋
    val secondaryMuscles: List<String> = emptyList(), // 補助筋
    val equipment: String,             // 器具
    val difficulty: String,            // 初級/中級/上級
    val movement: String,              // プッシュ/プル/その他

    val defaultDistance: Float = 0f,   // デフォルト移動距離(m)
    val defaultTutPerRep: Float = 3f,  // 1レップあたりのTUT(秒)
    val intervalMultiplier: Float = 1f, // インターバル係数

    val description: String = ""       // 説明
)

/**
 * 運動タイプ
 */
@Serializable
enum class ExerciseType(val displayName: String) {
    AEROBIC("有酸素"),
    ANAEROBIC("無酸素"),
    FLEXIBILITY("柔軟性"),
    BALANCE("バランス")
}

/**
 * 関節タイプ
 */
@Serializable
enum class JointType(val displayName: String) {
    MULTI_UPPER("多関節(上半身)"),
    MULTI_LOWER("多関節(下半身)"),
    SINGLE_UPPER("単関節(上半身)"),
    SINGLE_LOWER("単関節(下半身)"),
    CARDIO("有酸素"),
    CORE("体幹")
}

/**
 * 運動カテゴリ
 */
enum class ExerciseCategory(val displayName: String) {
    CHEST("胸"),
    BACK("背中"),
    SHOULDER("肩"),
    ARM("腕"),
    LEG("脚"),
    CORE("体幹"),
    CARDIO("有酸素"),
    STRETCH("ストレッチ"),
    SPORT("スポーツ"),
    DAILY("日常活動")
}
