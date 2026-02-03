package com.yourcoach.plus.shared.domain.model

import kotlinx.serialization.Serializable

/**
 * コンディション記録データ
 * 5項目（睡眠時間、睡眠の質、腸内環境、集中力、ストレス）を1-5スケールで記録
 */
@Serializable
data class Condition(
    val userId: String,
    val date: String,  // YYYY-MM-DD

    // コンディション項目（1-5スケール）
    val sleepHours: Int? = null,      // 睡眠時間: 1=5h以下, 2=6h, 3=7h, 4=8h, 5=9h以上
    val sleepQuality: Int? = null,    // 睡眠の質: 1=最悪, 2=悪, 3=普通, 4=良, 5=最高
    val digestion: Int? = null,       // 腸内環境: 1=不調, 2=やや悪, 3=普通, 4=良好, 5=最高
    val focus: Int? = null,           // 集中力: 1=最低, 2=低, 3=普通, 4=高, 5=最高
    val stress: Int? = null,          // ストレス: 1=極大, 2=高, 3=普通, 4=低, 5=なし

    // メタデータ
    val isPredicted: Boolean = false, // AI予測による自動入力か
    val updatedAt: Long = 0
) {
    /**
     * すべての項目が入力済みか
     */
    val isComplete: Boolean
        get() = sleepHours != null &&
                sleepQuality != null &&
                digestion != null &&
                focus != null &&
                stress != null

    /**
     * コンディションスコアを計算（平均×20で100点満点化）
     */
    fun calculateScore(): Int {
        if (!isComplete) return 0
        val sum = (sleepHours ?: 0) + (sleepQuality ?: 0) + (digestion ?: 0) + (focus ?: 0) + (stress ?: 0)
        return ((sum.toFloat() / 5f) * 20f).toInt()
    }

    /**
     * 各項目の100点スコアを計算
     */
    fun toScoreBreakdown(): ConditionScoreBreakdown = ConditionScoreBreakdown(
        sleepHoursScore = ((sleepHours ?: 0) / 5f * 100f).toInt(),
        sleepQualityScore = ((sleepQuality ?: 0) / 5f * 100f).toInt(),
        digestionScore = ((digestion ?: 0) / 5f * 100f).toInt(),
        focusScore = ((focus ?: 0) / 5f * 100f).toInt(),
        stressScore = ((stress ?: 0) / 5f * 100f).toInt(),
        totalScore = calculateScore()
    )
}

/**
 * コンディションスコアの内訳
 */
@Serializable
data class ConditionScoreBreakdown(
    val sleepHoursScore: Int,
    val sleepQualityScore: Int,
    val digestionScore: Int,
    val focusScore: Int,
    val stressScore: Int,
    val totalScore: Int
)

/**
 * コンディション項目のラベル定義
 */
object ConditionLabels {
    val sleepHoursLabels = listOf("5h↓", "6h", "7h", "8h", "9h↑")
    val sleepQualityLabels = listOf("最悪", "悪", "普通", "良", "最高")
    val digestionLabels = listOf("不調", "やや悪", "普通", "良好", "最高")
    val focusLabels = listOf("最低", "低", "普通", "高", "最高")
    val stressLabels = listOf("極大", "高", "普通", "低", "なし")

    fun getSleepHoursLabel(value: Int?): String = value?.let { sleepHoursLabels.getOrNull(it - 1) } ?: "-"
    fun getSleepQualityLabel(value: Int?): String = value?.let { sleepQualityLabels.getOrNull(it - 1) } ?: "-"
    fun getDigestionLabel(value: Int?): String = value?.let { digestionLabels.getOrNull(it - 1) } ?: "-"
    fun getFocusLabel(value: Int?): String = value?.let { focusLabels.getOrNull(it - 1) } ?: "-"
    fun getStressLabel(value: Int?): String = value?.let { stressLabels.getOrNull(it - 1) } ?: "-"
}
