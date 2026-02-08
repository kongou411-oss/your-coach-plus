package com.yourcoach.plus.shared.notification

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.firebase.auth.ktx.auth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.ktx.firestore
import com.google.firebase.ktx.Firebase
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/**
 * プッシュ通知ヘルパー (Android実装)
 */
actual class PushNotificationHelper actual constructor() {

    companion object {
        var applicationContext: Context? = null
        var currentActivity: Activity? = null
    }

    /**
     * プッシュ通知の許可をリクエスト
     */
    actual suspend fun requestPermission(): Result<Boolean> {
        // Android 13 (API 33) 以上では POST_NOTIFICATIONS 権限が必要
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val activity = currentActivity
            val context = applicationContext ?: activity
            if (context == null) {
                return Result.failure(Exception("Context not available"))
            }

            val granted = ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED

            if (granted) {
                return Result.success(true)
            }

            if (activity != null) {
                ActivityCompat.requestPermissions(
                    activity,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    1001
                )
                // 権限リクエストは非同期なので、trueを返す
                // 実際の結果はonRequestPermissionsResultで処理される
                return Result.success(true)
            }

            return Result.failure(Exception("Activity not available"))
        }

        // Android 12以下では権限不要
        return Result.success(true)
    }

    /**
     * 通知許可状態を確認
     */
    actual suspend fun isPermissionGranted(): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val context = applicationContext ?: currentActivity ?: return false
            return ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        }
        return true
    }

    /**
     * FCMトークンを取得
     */
    actual suspend fun getToken(): Result<String> = suspendCancellableCoroutine { continuation ->
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (task.isSuccessful) {
                val token = task.result
                if (token != null) {
                    continuation.resume(Result.success(token))
                } else {
                    continuation.resume(Result.failure(Exception("Token is null")))
                }
            } else {
                continuation.resume(
                    Result.failure(task.exception ?: Exception("Failed to get FCM token"))
                )
            }
        }
    }

    /**
     * FCMトークンをFirestoreに保存
     */
    actual fun saveTokenToFirestore() {
        val userId = Firebase.auth.currentUser?.uid ?: return

        FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
            Firebase.firestore
                .collection("users")
                .document(userId)
                .update("fcmTokens", FieldValue.arrayUnion(token))
                .addOnSuccessListener {
                    println("PushNotificationHelper: FCM token saved")
                }
                .addOnFailureListener { e ->
                    println("PushNotificationHelper: Failed to save FCM token: ${e.message}")
                }
        }
    }

    /**
     * FCMトークンをFirestoreから削除 (ログアウト時)
     */
    actual fun removeTokenFromFirestore() {
        val userId = Firebase.auth.currentUser?.uid ?: return

        FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
            Firebase.firestore
                .collection("users")
                .document(userId)
                .update("fcmTokens", FieldValue.arrayRemove(token))
                .addOnSuccessListener {
                    println("PushNotificationHelper: FCM token removed")
                }
                .addOnFailureListener { e ->
                    println("PushNotificationHelper: Failed to remove FCM token: ${e.message}")
                }
        }
    }
}
