package com.yourcoach.plus.shared.domain.usecase

import kotlinx.datetime.*

/**
 * ストリーク計算ユースケース
 * 元のservices.js RetentionService.calculateStreakを移植
 */
object StreakCalculator {

    /**
     * 連続記録日数を計算
     *
     * @param activeDays アクティブだった日付のリスト (YYYY-MM-DD形式)
     * @return ストリーク日数
     */
    fun calculateStreak(activeDays: List<String>): Int {
        if (activeDays.isEmpty()) return 0

        val today = Clock.System.now()
            .toLocalDateTime(TimeZone.currentSystemDefault())
            .date
        val yesterday = today.minus(1, DateTimeUnit.DAY)

        val todayStr = today.toString()
        val yesterdayStr = yesterday.toString()

        // 今日または昨日がアクティブでなければストリークは0
        if (!activeDays.contains(todayStr) && !activeDays.contains(yesterdayStr)) {
            return 0
        }

        // 日付を降順にソート
        val sortedDays = activeDays
            .mapNotNull { runCatching { LocalDate.parse(it) }.getOrNull() }
            .sortedDescending()

        if (sortedDays.isEmpty()) return 0

        var streak = 0
        var checkDate = sortedDays.first()

        for (day in sortedDays) {
            val diff = checkDate.toEpochDays() - day.toEpochDays()

            if (diff <= 1) {
                streak++
                checkDate = day
            } else {
                break
            }
        }

        return streak
    }

    /**
     * アクティビティを記録し、更新されたストリーク情報を返す
     *
     * @param currentActiveDays 現在のアクティブ日リスト
     * @param currentStreak 現在のストリーク
     * @param longestStreak 最長ストリーク
     * @return 更新されたストリーク情報
     */
    fun recordActivity(
        currentActiveDays: List<String>,
        currentStreak: Int,
        longestStreak: Int
    ): StreakUpdateResult {
        val today = Clock.System.now()
            .toLocalDateTime(TimeZone.currentSystemDefault())
            .date
            .toString()

        // 今日がすでに含まれている場合は変更なし
        if (currentActiveDays.contains(today)) {
            return StreakUpdateResult(
                activeDays = currentActiveDays,
                streak = currentStreak,
                longestStreak = longestStreak,
                lastActiveDate = today,
                isNewActivity = false
            )
        }

        // 今日を追加
        val updatedActiveDays = currentActiveDays + today

        // 新しいストリークを計算
        val newStreak = calculateStreak(updatedActiveDays)
        val newLongestStreak = maxOf(longestStreak, newStreak)

        return StreakUpdateResult(
            activeDays = updatedActiveDays,
            streak = newStreak,
            longestStreak = newLongestStreak,
            lastActiveDate = today,
            isNewActivity = true
        )
    }

    /**
     * ストリークフリーズを使用できるかチェック
     *
     * @param activeDays アクティブ日リスト
     * @param freezeCount 残りフリーズ回数
     * @return フリーズ使用可能かどうか
     */
    fun canUseStreakFreeze(activeDays: List<String>, freezeCount: Int): Boolean {
        if (freezeCount <= 0) return false

        val today = Clock.System.now()
            .toLocalDateTime(TimeZone.currentSystemDefault())
            .date
        val yesterday = today.minus(1, DateTimeUnit.DAY)

        val todayStr = today.toString()
        val yesterdayStr = yesterday.toString()

        // 昨日がアクティブでなく、今日もまだアクティブでない場合にフリーズ使用可能
        return !activeDays.contains(yesterdayStr) && !activeDays.contains(todayStr)
    }

    /**
     * ストリークフリーズを適用
     *
     * @param activeDays 現在のアクティブ日リスト
     * @return 昨日を追加したアクティブ日リスト
     */
    fun applyStreakFreeze(activeDays: List<String>): List<String> {
        val yesterday = Clock.System.now()
            .toLocalDateTime(TimeZone.currentSystemDefault())
            .date
            .minus(1, DateTimeUnit.DAY)
            .toString()

        return if (activeDays.contains(yesterday)) {
            activeDays
        } else {
            activeDays + yesterday
        }
    }

    /**
     * リテンション統計を計算
     */
    fun calculateRetentionStats(
        registrationDate: String,
        activeDays: List<String>
    ): RetentionStats {
        val regDate = runCatching { LocalDate.parse(registrationDate) }.getOrNull()
            ?: return RetentionStats(0, false, false, false)

        val today = Clock.System.now()
            .toLocalDateTime(TimeZone.currentSystemDefault())
            .date

        val daysSinceReg = today.toEpochDays() - regDate.toEpochDays()

        // Day-1, Day-7, Day-30 リテンション判定
        val day1Retained = if (daysSinceReg >= 1) {
            val day1 = regDate.plus(1, DateTimeUnit.DAY).toString()
            activeDays.contains(day1)
        } else false

        val day7Retained = if (daysSinceReg >= 7) {
            // 7日目以降に1回でもアクティブならOK
            activeDays.any { dateStr ->
                runCatching {
                    val date = LocalDate.parse(dateStr)
                    val days = date.toEpochDays() - regDate.toEpochDays()
                    days >= 7
                }.getOrElse { false }
            }
        } else false

        val day30Retained = if (daysSinceReg >= 30) {
            // 30日目以降に1回でもアクティブならOK
            activeDays.any { dateStr ->
                runCatching {
                    val date = LocalDate.parse(dateStr)
                    val days = date.toEpochDays() - regDate.toEpochDays()
                    days >= 30
                }.getOrElse { false }
            }
        } else false

        return RetentionStats(
            daysSinceRegistration = daysSinceReg.toInt(),
            day1Retained = day1Retained,
            day7Retained = day7Retained,
            day30Retained = day30Retained
        )
    }
}

/**
 * ストリーク更新結果
 */
data class StreakUpdateResult(
    val activeDays: List<String>,
    val streak: Int,
    val longestStreak: Int,
    val lastActiveDate: String,
    val isNewActivity: Boolean
)

/**
 * リテンション統計
 */
data class RetentionStats(
    val daysSinceRegistration: Int,
    val day1Retained: Boolean,
    val day7Retained: Boolean,
    val day30Retained: Boolean
)
