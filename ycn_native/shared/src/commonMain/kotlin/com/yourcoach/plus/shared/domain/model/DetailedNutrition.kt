package com.yourcoach.plus.shared.domain.model

/**
 * 詳細栄養素データ
 * GL管理、脂肪酸バランス、食物繊維、ビタミン・ミネラル充足率を含む
 */
data class DetailedNutrition(
    // DIAAS
    val averageDiaas: Float = 0f,

    // 脂肪酸
    val saturatedFat: Float = 0f,
    val mediumChainFat: Float = 0f,         // MCT (中鎖脂肪酸)
    val monounsaturatedFat: Float = 0f,
    val polyunsaturatedFat: Float = 0f,
    val fattyAcidScore: Int = 0,
    val fattyAcidRating: String = "-",
    val fattyAcidLabel: String = "-",

    // ビタミン・ミネラル充足率
    val vitaminScores: Map<String, Float> = emptyMap(),
    val mineralScores: Map<String, Float> = emptyMap(),

    // GL管理・血糖管理
    val totalGL: Float = 0f,
    val glLimit: Float = 120f,
    val glScore: Int = 0,
    val glLabel: String = "-",
    val adjustedGL: Float = 0f,
    val bloodSugarRating: String = "-",
    val bloodSugarLabel: String = "-",
    val highGIPercent: Float = 0f,
    val lowGIPercent: Float = 0f,
    val glModifiers: List<Pair<String, Float>> = emptyList(),
    val mealsPerDay: Int = 5,
    val mealGLLimit: Float = 24f,           // 1食あたりの動的GL上限
    val mealAbsoluteGLLimit: Float = 40f,   // 1食あたりの絶対GL上限

    // 食物繊維
    val totalFiber: Float = 0f,
    val totalSolubleFiber: Float = 0f,      // 水溶性食物繊維
    val totalInsolubleFiber: Float = 0f,    // 不溶性食物繊維
    val fiberTarget: Float = 25f,           // 目標食物繊維量（LBM×0.4×目標係数）
    val carbFiberRatio: Float = 0f,
    val fiberScore: Int = 0,
    val fiberRating: String = "-",
    val fiberLabel: String = "-"
)
