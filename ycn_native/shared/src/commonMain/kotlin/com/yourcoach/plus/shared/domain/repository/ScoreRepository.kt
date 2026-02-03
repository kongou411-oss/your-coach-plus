package com.yourcoach.plus.shared.domain.repository

import com.yourcoach.plus.shared.domain.model.Badge
import com.yourcoach.plus.shared.domain.model.CalorieOverride
import com.yourcoach.plus.shared.domain.model.DailyScore
import com.yourcoach.plus.shared.domain.model.StreakInfo
import kotlinx.coroutines.flow.Flow

/**
 * スコアリポジトリインターフェース
 */
interface ScoreRepository {
    /**
     * 本日のスコアを取得
     */
    suspend fun getTodayScore(userId: String): Result<DailyScore?>

    /**
     * 特定日のスコアを取得
     */
    suspend fun getScoreForDate(userId: String, date: String): Result<DailyScore?>

    /**
     * 日付範囲のスコアを取得
     */
    suspend fun getScoresInRange(
        userId: String,
        startDate: String,
        endDate: String
    ): Result<List<DailyScore>>

    /**
     * 本日のスコアをリアルタイム監視
     */
    fun observeTodayScore(userId: String): Flow<DailyScore?>

    /**
     * スコアを更新
     */
    suspend fun updateScore(userId: String, score: DailyScore): Result<Unit>

    /**
     * スコアを再計算
     */
    suspend fun recalculateScore(userId: String, date: String): Result<DailyScore>

    /**
     * ストリーク情報を取得
     */
    suspend fun getStreakInfo(userId: String): Result<StreakInfo>

    /**
     * ストリーク情報をリアルタイム監視
     */
    fun observeStreakInfo(userId: String): Flow<StreakInfo>

    /**
     * ストリークフリーズを使用
     */
    suspend fun useStreakFreeze(userId: String): Result<Boolean>

    /**
     * バッジ一覧を取得
     */
    suspend fun getBadges(userId: String): Result<List<Badge>>

    /**
     * バッジを付与
     */
    suspend fun awardBadge(userId: String, badgeId: String): Result<Unit>

    /**
     * XPを追加
     */
    suspend fun addXp(userId: String, amount: Int, reason: String): Result<Int>

    /**
     * 週間サマリーを取得
     */
    suspend fun getWeeklySummary(userId: String, weekStartDate: String): Result<WeeklySummary>

    /**
     * ピンポイントカロリー調整を適用
     */
    suspend fun applyCalorieOverride(
        userId: String,
        date: String,
        override: CalorieOverride
    ): Result<Unit>

    /**
     * ピンポイントカロリー調整を解除
     */
    suspend fun clearCalorieOverride(userId: String, date: String): Result<Unit>

    /**
     * ピンポイントカロリー調整を取得
     */
    suspend fun getCalorieOverride(userId: String, date: String): Result<CalorieOverride?>

    /**
     * 休養日ステータスを更新
     */
    suspend fun updateRestDayStatus(userId: String, date: String, isRestDay: Boolean): Result<Unit>

    /**
     * 休養日ステータスを取得
     */
    suspend fun getRestDayStatus(userId: String, date: String): Result<Boolean>
}

/**
 * 週間サマリー
 */
data class WeeklySummary(
    val averageScore: Float,
    val totalXpEarned: Int,
    val activeDays: Int,
    val bestDay: String?,
    val worstDay: String?,
    val scoresByAxis: Map<String, Float>
)
