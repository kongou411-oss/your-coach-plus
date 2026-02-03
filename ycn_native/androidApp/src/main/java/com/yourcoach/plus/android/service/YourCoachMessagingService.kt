package com.yourcoach.plus.android.service

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.auth.ktx.auth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.ktx.firestore
import com.google.firebase.ktx.Firebase
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.yourcoach.plus.android.MainActivity
import com.yourcoach.plus.android.R

/**
 * Firebase Cloud Messaging サービス
 * プッシュ通知の受信とトークン更新を処理
 */
class YourCoachMessagingService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "YourCoachFCM"
    }

    /**
     * FCMトークンが更新された時に呼ばれる
     */
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "New FCM token: $token")

        // TODO: トークンをサーバー（Firestore）に保存
        // サーバーにトークンを送信して、ユーザーのFCMトークン配列に追加
        sendTokenToServer(token)
    }

    /**
     * メッセージを受信した時に呼ばれる
     */
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        Log.d(TAG, "Message received from: ${remoteMessage.from}")

        // 通知ペイロードがある場合
        remoteMessage.notification?.let { notification ->
            Log.d(TAG, "Notification title: ${notification.title}")
            Log.d(TAG, "Notification body: ${notification.body}")

            showNotification(
                title = notification.title ?: "Your Coach+",
                body = notification.body ?: "",
                channelId = notification.channelId ?: "default_channel"
            )
        }

        // データペイロードがある場合
        if (remoteMessage.data.isNotEmpty()) {
            Log.d(TAG, "Data payload: ${remoteMessage.data}")
            handleDataPayload(remoteMessage.data)
        }
    }

    /**
     * FCMトークンをサーバーに送信
     */
    private fun sendTokenToServer(token: String) {
        val userId = Firebase.auth.currentUser?.uid
        if (userId == null) {
            Log.d(TAG, "User not logged in, skipping token save")
            return
        }

        Firebase.firestore
            .collection("users")
            .document(userId)
            .update("fcmTokens", FieldValue.arrayUnion(token))
            .addOnSuccessListener {
                Log.d(TAG, "FCM token saved successfully")
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "Failed to save FCM token: ${e.message}")
            }
    }

    /**
     * データペイロードを処理
     */
    private fun handleDataPayload(data: Map<String, String>) {
        val type = data["type"]
        when (type) {
            "meal_reminder" -> handleMealReminder(data)
            "workout_reminder" -> handleWorkoutReminder(data)
            "analysis_ready" -> handleAnalysisReady(data)
            "streak_warning" -> handleStreakWarning(data)
            else -> Log.d(TAG, "Unknown notification type: $type")
        }
    }

    /**
     * 食事リマインダーを処理
     */
    private fun handleMealReminder(data: Map<String, String>) {
        showNotification(
            title = data["title"] ?: "食事を記録しましょう",
            body = data["body"] ?: "今日の食事を忘れずに記録してください",
            channelId = "meal_reminder"
        )
    }

    /**
     * 運動リマインダーを処理
     */
    private fun handleWorkoutReminder(data: Map<String, String>) {
        showNotification(
            title = data["title"] ?: "運動を記録しましょう",
            body = data["body"] ?: "今日の運動を記録してください",
            channelId = "workout_reminder"
        )
    }

    /**
     * AI分析完了通知を処理
     */
    private fun handleAnalysisReady(data: Map<String, String>) {
        showNotification(
            title = data["title"] ?: "AI分析が完了しました",
            body = data["body"] ?: "今日のアドバイスを確認しましょう",
            channelId = "analysis"
        )
    }

    /**
     * ストリーク警告を処理
     */
    private fun handleStreakWarning(data: Map<String, String>) {
        val streak = data["streak"] ?: "0"
        showNotification(
            title = data["title"] ?: "ストリークを守りましょう！",
            body = data["body"] ?: "${streak}日連続記録が途切れそうです",
            channelId = "streak"
        )
    }

    /**
     * 通知を表示
     */
    private fun showNotification(title: String, body: String, channelId: String) {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info) // TODO: カスタムアイコンに置き換え
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        val notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
    }
}
