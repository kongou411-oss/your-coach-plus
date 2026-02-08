package com.yourcoach.plus.shared.data.repository

import com.yourcoach.plus.shared.ui.screens.notification.NotificationItem
import com.yourcoach.plus.shared.ui.screens.notification.NotificationSettingsRepository
import com.yourcoach.plus.shared.ui.screens.notification.NotificationTab
import dev.gitlive.firebase.Firebase
import dev.gitlive.firebase.firestore.firestore
import dev.gitlive.firebase.functions.functions
import kotlinx.datetime.*
import kotlin.time.Duration.Companion.hours

/**
 * 通知設定リポジトリ (GitLive Firebase SDK)
 */
class FirestoreNotificationSettingsRepository : NotificationSettingsRepository {

    private val firestore = Firebase.firestore
    private val functions = Firebase.functions("asia-northeast2")

    override suspend fun loadSettings(userId: String): Result<Map<NotificationTab, List<NotificationItem>>> {
        return try {
            val doc = firestore
                .collection("users")
                .document(userId)
                .collection("settings")
                .document("notifications")
                .get()

            if (!doc.exists) {
                return Result.success(emptyMap())
            }

            val result = mutableMapOf<NotificationTab, List<NotificationItem>>()
            result[NotificationTab.MEAL] = loadFieldAsList(doc, "meal")
            result[NotificationTab.WORKOUT] = loadFieldAsList(doc, "workout")
            result[NotificationTab.ANALYSIS] = loadFieldAsList(doc, "analysis")
            result[NotificationTab.CUSTOM] = loadFieldAsList(doc, "custom")

            Result.success(result)
        } catch (e: Exception) {
            println("FirestoreNotificationSettingsRepository: loadSettings failed: ${e.message}")
            Result.failure(e)
        }
    }

    private fun loadFieldAsList(
        doc: dev.gitlive.firebase.firestore.DocumentSnapshot,
        field: String
    ): List<NotificationItem> {
        return try {
            val list: List<Map<String, String>> = doc.get(field)
            list.map { map ->
                NotificationItem(
                    id = map["id"] ?: Clock.System.now().toEpochMilliseconds().toString(),
                    time = map["time"] ?: "12:00",
                    title = map["title"] ?: "",
                    body = map["body"] ?: ""
                )
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    override suspend fun saveSettings(
        userId: String,
        tab: NotificationTab,
        items: List<NotificationItem>
    ): Result<Unit> {
        return try {
            val fieldName = when (tab) {
                NotificationTab.MEAL -> "meal"
                NotificationTab.WORKOUT -> "workout"
                NotificationTab.ANALYSIS -> "analysis"
                NotificationTab.CUSTOM -> "custom"
            }

            val listData = items.map { item ->
                hashMapOf(
                    "id" to item.id,
                    "time" to item.time,
                    "title" to item.title,
                    "body" to item.body
                )
            }

            firestore
                .collection("users")
                .document(userId)
                .collection("settings")
                .document("notifications")
                .set(hashMapOf(fieldName to listData), merge = true)

            Result.success(Unit)
        } catch (e: Exception) {
            println("FirestoreNotificationSettingsRepository: saveSettings failed: ${e.message}")
            Result.failure(e)
        }
    }

    override suspend fun scheduleNotification(
        userId: String,
        item: NotificationItem,
        type: String
    ): Result<Unit> {
        return try {
            val parts = item.time.split(":")
            val hour = parts[0].toInt()
            val minute = parts[1].toInt()

            val now = Clock.System.now()
            val tz = TimeZone.currentSystemDefault()
            val today = now.toLocalDateTime(tz)

            val targetDate = kotlinx.datetime.LocalDateTime(
                today.year, today.monthNumber, today.dayOfMonth,
                hour, minute, 0, 0
            )
            var targetInstant = targetDate.toInstant(tz)

            // 過去の時刻なら翌日に
            if (targetInstant < now) {
                targetInstant = targetInstant.plus(24.hours)
            }

            val targetTimeStr = targetInstant.toString()

            val data = hashMapOf(
                "targetTime" to targetTimeStr,
                "title" to item.title,
                "body" to item.body,
                "notificationType" to type,
                "userId" to userId,
                "scheduleTimeStr" to item.time
            )

            println("FirestoreNotificationSettingsRepository: scheduleNotification: $data")

            functions.httpsCallable("scheduleNotification").invoke(data)

            Result.success(Unit)
        } catch (e: Exception) {
            println("FirestoreNotificationSettingsRepository: scheduleNotification failed: ${e.message}")
            Result.failure(e)
        }
    }

    override fun registerFcmToken() {
        // PushNotificationHelper で処理済み
    }

    override fun checkNotificationPermission(): Boolean {
        // PushNotificationHelper で処理済み
        return true
    }
}
