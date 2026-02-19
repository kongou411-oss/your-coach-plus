package com.yourcoach.plus.shared.domain.model

/**
 * AI分析レポートの構造化データ
 * Gemini JSON出力をパースした結果
 */
data class AnalysisResult(
    val internalAnalysis: InternalAnalysis,
    val userFacingSummary: UserFacingSummary,
    val goodPoints: List<String>,
    val improvementPoints: List<ImprovementPoint>,
    val questBridge: QuestBridge
)

/**
 * 内部評価（ユーザーには非表示）
 */
data class InternalAnalysis(
    val grade: String,
    val gradeAdjustmentReason: String,
    val bonusXpEligible: Boolean,
    val bonusReason: String?
)

/**
 * ユーザー向け総括
 */
data class UserFacingSummary(
    val readinessMessage: String,
    val mindsetReframing: String
)

/**
 * 改善ポイント
 */
data class ImprovementPoint(
    val point: String,
    val suggestion: String
)

/**
 * 明日のクエストへの橋渡し
 */
data class QuestBridge(
    val message: String,
    val closingCheer: String
)
