package com.yourcoach.plus.shared.domain.service

import com.yourcoach.plus.shared.domain.model.UserProfile

/**
 * Premium機能の判定とアクセス制御を行うサービス
 */
object PremiumService {

    /** 無料トライアル日数 */
    const val FREE_TRIAL_DAYS = 7

    /**
     * Premium判定（7日以内の無料トライアル or サブスク有効）
     * @param subscriptionStatus サブスクリプションステータス
     * @param usageDays 利用日数（登録日からの経過日数）
     * @param b2b2cOrgId B2B2C組織ID（あれば）
     * @param giftCodeActive ギフトコード有効フラグ
     * @return Premium利用可能かどうか
     */
    fun isPremiumUser(
        subscriptionStatus: String?,
        usageDays: Int,
        b2b2cOrgId: String? = null,
        giftCodeActive: Boolean = false
    ): Boolean {
        // 7日以内の無料トライアル期間
        if (usageDays <= FREE_TRIAL_DAYS) {
            return true
        }

        // サブスクリプションステータスが 'active' の場合
        if (subscriptionStatus == "active") {
            return true
        }

        // B2B2C組織に所属している場合
        if (!b2b2cOrgId.isNullOrEmpty()) {
            return true
        }

        // ギフトコードが有効な場合
        if (giftCodeActive) {
            return true
        }

        return false
    }

    /**
     * 無料トライアルのステータスをチェック
     * @param registrationDate 登録日（YYYY-MM-DD形式）
     * @return トライアルステータス
     */
    fun checkFreeTrialStatus(registrationDate: String?): FreeTrialStatus {
        if (registrationDate == null) {
            return FreeTrialStatus(
                isActive = false,
                daysRemaining = 0,
                isInTrial = false
            )
        }

        val regDate = parseDate(registrationDate) ?: return FreeTrialStatus(
            isActive = false,
            daysRemaining = 0,
            isInTrial = false
        )

        val now = currentTimeMillis()
        val trialEndMillis = regDate + (FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000L)
        val isActive = now < trialEndMillis
        val daysRemaining = if (isActive) {
            ((trialEndMillis - now) / (24 * 60 * 60 * 1000L)).toInt() + 1
        } else {
            0
        }

        return FreeTrialStatus(
            isActive = isActive,
            daysRemaining = daysRemaining,
            isInTrial = isActive
        )
    }

    /**
     * 分析アクセス可否チェック
     * @param totalCredits 合計クレジット（free + paid）
     * @param isPremium Premium状態
     * @param isTrialActive 無料トライアル中か
     * @return アクセス可否と理由
     */
    fun canAccessAnalysis(
        totalCredits: Int,
        isPremium: Boolean,
        isTrialActive: Boolean
    ): AnalysisAccessResult {
        // Premiumユーザーまたはトライアル中はクレジットがあればアクセス可能
        if (isPremium || isTrialActive) {
            return if (totalCredits > 0) {
                AnalysisAccessResult(allowed = true, reason = null)
            } else {
                AnalysisAccessResult(allowed = false, reason = "クレジットが不足しています")
            }
        }

        // 無料ユーザー（トライアル終了後）
        return AnalysisAccessResult(
            allowed = false,
            reason = "プレミアムプランに登録してください"
        )
    }

    /**
     * 日付文字列をミリ秒に変換（簡易実装）
     */
    private fun parseDate(dateString: String): Long? {
        return try {
            // YYYY-MM-DD形式を想定
            val parts = dateString.split("-")
            if (parts.size != 3) return null

            val year = parts[0].toInt()
            val month = parts[1].toInt()
            val day = parts[2].toInt()

            // 簡易的な日数計算（精度は低いが目的には十分）
            val daysFromEpoch = (year - 1970) * 365L +
                (year - 1969) / 4 - // うるう年の補正
                (year - 1901) / 100 +
                (year - 1601) / 400 +
                (month - 1) * 30 + // 月の近似
                day

            daysFromEpoch * 24 * 60 * 60 * 1000L
        } catch (e: Exception) {
            null
        }
    }

    /**
     * 現在時刻をミリ秒で取得
     */
    private fun currentTimeMillis(): Long = System.currentTimeMillis()
}

/**
 * 無料トライアルステータス
 */
data class FreeTrialStatus(
    val isActive: Boolean,
    val daysRemaining: Int,
    val isInTrial: Boolean
)

/**
 * 分析アクセス結果
 */
data class AnalysisAccessResult(
    val allowed: Boolean,
    val reason: String?
)

/**
 * サブスクリプション情報
 */
data class SubscriptionInfo(
    val status: String = "free", // "free", "active", "cancelled", "expired"
    val plan: SubscriptionPlan = SubscriptionPlan.FREE,
    val startDate: String? = null,
    val endDate: String? = null,
    val autoRenew: Boolean = false,
    val giftCodeActive: Boolean = false,
    val b2b2cOrgId: String? = null
)

/**
 * サブスクリプションプラン
 */
enum class SubscriptionPlan(
    val displayName: String,
    val monthlyPrice: Int, // 円
    val yearlyPrice: Int,  // 円
    val monthlyCredits: Int,
    val features: List<String>
) {
    FREE(
        displayName = "無料プラン",
        monthlyPrice = 0,
        yearlyPrice = 0,
        monthlyCredits = 0,
        features = listOf(
            "食事・運動記録",
            "基本スコア表示",
            "7日間無料トライアル"
        )
    ),
    PREMIUM(
        displayName = "プレミアム",
        monthlyPrice = 980,
        yearlyPrice = 9800,
        monthlyCredits = 30,
        features = listOf(
            "全機能無制限",
            "AI分析（月30回）",
            "詳細レポート",
            "広告非表示",
            "優先サポート"
        )
    )
}
