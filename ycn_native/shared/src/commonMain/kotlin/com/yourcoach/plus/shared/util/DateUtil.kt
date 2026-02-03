package com.yourcoach.plus.shared.util

import kotlinx.datetime.*

/**
 * 日付ユーティリティ
 */
object DateUtil {
    private val jstTimeZone = TimeZone.of("Asia/Tokyo")

    /**
     * 現在の日時を取得（JST）
     */
    fun nowJst(): LocalDateTime {
        return Clock.System.now().toLocalDateTime(jstTimeZone)
    }

    /**
     * 今日の日付を取得（YYYY-MM-DD形式）
     */
    fun todayString(): String {
        return nowJst().date.toString()
    }

    /**
     * 今日の日付を取得
     */
    fun today(): LocalDate {
        return nowJst().date
    }

    /**
     * タイムスタンプを日付文字列に変換
     */
    fun timestampToDateString(timestamp: Long): String {
        val instant = Instant.fromEpochMilliseconds(timestamp)
        return instant.toLocalDateTime(jstTimeZone).date.toString()
    }

    /**
     * タイムスタンプを時刻文字列に変換（HH:mm形式）
     */
    fun timestampToTimeString(timestamp: Long): String {
        val instant = Instant.fromEpochMilliseconds(timestamp)
        val dateTime = instant.toLocalDateTime(jstTimeZone)
        return "${dateTime.hour.toString().padStart(2, '0')}:${dateTime.minute.toString().padStart(2, '0')}"
    }

    /**
     * 日付文字列を表示用にフォーマット
     */
    fun formatDateForDisplay(dateString: String): String {
        val date = LocalDate.parse(dateString)
        val weekDay = when (date.dayOfWeek) {
            DayOfWeek.MONDAY -> "月"
            DayOfWeek.TUESDAY -> "火"
            DayOfWeek.WEDNESDAY -> "水"
            DayOfWeek.THURSDAY -> "木"
            DayOfWeek.FRIDAY -> "金"
            DayOfWeek.SATURDAY -> "土"
            DayOfWeek.SUNDAY -> "日"
            else -> ""
        }
        return "${date.monthNumber}月${date.dayOfMonth}日（$weekDay）"
    }

    /**
     * 週の開始日を取得（月曜日）
     */
    fun getWeekStartDate(date: LocalDate = today()): LocalDate {
        val daysFromMonday = date.dayOfWeek.ordinal
        return date.minus(daysFromMonday, DateTimeUnit.DAY)
    }

    /**
     * 月の開始日を取得
     */
    fun getMonthStartDate(date: LocalDate = today()): LocalDate {
        return LocalDate(date.year, date.monthNumber, 1)
    }

    /**
     * 現在のタイムスタンプを取得
     */
    fun currentTimestamp(): Long {
        return Clock.System.now().toEpochMilliseconds()
    }

    /**
     * 日付の差を計算（日数）
     */
    fun daysBetween(start: LocalDate, end: LocalDate): Int {
        return (end.toEpochDays() - start.toEpochDays()).toInt()
    }

    /**
     * 日付が今日かどうかを判定
     */
    fun isToday(dateString: String): Boolean {
        return dateString == todayString()
    }

    /**
     * 日付が昨日かどうかを判定
     */
    fun isYesterday(dateString: String): Boolean {
        val yesterday = today().minus(1, DateTimeUnit.DAY).toString()
        return dateString == yesterday
    }

    /**
     * 前日の日付を取得
     */
    fun previousDay(dateString: String): String {
        val date = LocalDate.parse(dateString)
        return date.minus(1, DateTimeUnit.DAY).toString()
    }

    /**
     * 翌日の日付を取得
     */
    fun nextDay(dateString: String): String {
        val date = LocalDate.parse(dateString)
        return date.plus(1, DateTimeUnit.DAY).toString()
    }

    /**
     * 日付を比較（date1 < date2 なら true）
     */
    fun isBefore(date1: String, date2: String): Boolean {
        val d1 = LocalDate.parse(date1)
        val d2 = LocalDate.parse(date2)
        return d1 < d2
    }

    /**
     * 日付文字列をタイムスタンプ（ミリ秒）に変換
     * @param dateString YYYY-MM-DD形式
     * @return タイムスタンプ（その日の0時0分0秒 JST）
     */
    fun dateStringToTimestamp(dateString: String): Long {
        return try {
            val date = LocalDate.parse(dateString)
            val dateTime = date.atTime(0, 0, 0)
            dateTime.toInstant(jstTimeZone).toEpochMilliseconds()
        } catch (e: Exception) {
            Clock.System.now().toEpochMilliseconds()
        }
    }

    /**
     * 日付文字列をLocalDateに変換
     */
    fun parseLocalDate(dateString: String): LocalDate? {
        return try {
            LocalDate.parse(dateString)
        } catch (e: Exception) {
            null
        }
    }
}
