package com.yourcoach.plus.shared.domain.repository

import kotlinx.datetime.Clock
import kotlinx.serialization.Serializable

/**
 * 分析リポジトリインターフェース
 */
interface AnalysisRepository {
    /**
     * 分析レポートを保存
     */
    suspend fun saveReport(userId: String, report: AnalysisReport): Result<String>

    /**
     * 分析レポートを取得
     */
    suspend fun getReport(userId: String, reportId: String): Result<AnalysisReport?>

    /**
     * ユーザーの全分析レポートを取得
     */
    suspend fun getReports(userId: String, limit: Int = 50): Result<List<AnalysisReport>>

    /**
     * レポートを更新
     */
    suspend fun updateReport(userId: String, reportId: String, updates: Map<String, Any>): Result<Unit>

    /**
     * レポートを削除
     */
    suspend fun deleteReport(userId: String, reportId: String): Result<Unit>

    /**
     * ユーザーのクレジット情報を取得
     */
    suspend fun getCreditInfo(userId: String): Result<UserCreditInfo>

    /**
     * クレジットを消費
     */
    suspend fun consumeCredit(userId: String, amount: Int): Result<Int>
}

/**
 * 分析レポート
 */
data class AnalysisReport(
    val id: String = "",
    val title: String,
    val content: String,
    val conversationHistory: List<ConversationEntry> = emptyList(),
    val periodStart: String, // YYYY-MM-DD
    val periodEnd: String,   // YYYY-MM-DD
    val reportType: ReportType = ReportType.DAILY,
    val createdAt: Long = Clock.System.now().toEpochMilliseconds(),
    val updatedAt: Long = Clock.System.now().toEpochMilliseconds()
)

/**
 * 会話エントリ
 */
data class ConversationEntry(
    val type: String, // "user" or "ai"
    val content: String,
    val timestamp: Long = Clock.System.now().toEpochMilliseconds()
)

/**
 * レポートタイプ
 */
enum class ReportType {
    DAILY,      // 日次レポート
    WEEKLY,     // 週次レポート
    MONTHLY,    // 月次レポート
    CUSTOM      // カスタム期間
}

/**
 * ユーザークレジット情報
 */
data class UserCreditInfo(
    val totalCredits: Int = 0,
    val freeCredits: Int = 0,
    val paidCredits: Int = 0,
    val tier: String = "free", // "free" or "premium"
    val level: Int = 1,
    val xp: Int = 0
) {
    val isPremiumTier: Boolean get() = tier == "premium"
    // 非プレミアムはfreeCreditsのみ利用可能
    val availableCredits: Int get() = if (isPremiumTier) totalCredits else freeCredits
    val isAllowed: Boolean get() = availableCredits > 0
}
