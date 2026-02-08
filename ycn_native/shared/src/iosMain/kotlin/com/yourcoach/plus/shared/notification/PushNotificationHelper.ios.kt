package com.yourcoach.plus.shared.notification

import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/**
 * グローバルなFCMハンドラー
 * Swift側から設定される
 */
var fcmRequestPermissionHandler: (((Boolean, String?) -> Unit) -> Unit)? = null
var fcmCheckPermissionHandler: (((Boolean) -> Unit) -> Unit)? = null
var fcmGetTokenHandler: (((String?, String?) -> Unit) -> Unit)? = null
var fcmSaveTokenHandler: (() -> Unit)? = null
var fcmRemoveTokenHandler: (() -> Unit)? = null

/**
 * プッシュ通知ヘルパー (iOS実装)
 */
actual class PushNotificationHelper actual constructor() {

    /**
     * プッシュ通知の許可をリクエスト
     */
    actual suspend fun requestPermission(): Result<Boolean> = suspendCancellableCoroutine { continuation ->
        val handler = fcmRequestPermissionHandler
        if (handler == null) {
            continuation.resume(Result.failure(Exception("FCM not initialized")))
            return@suspendCancellableCoroutine
        }

        handler { granted, errorMessage ->
            if (errorMessage != null) {
                continuation.resume(Result.failure(Exception(errorMessage)))
            } else {
                continuation.resume(Result.success(granted))
            }
        }
    }

    /**
     * 通知許可状態を確認
     */
    actual suspend fun isPermissionGranted(): Boolean = suspendCancellableCoroutine { continuation ->
        val handler = fcmCheckPermissionHandler
        if (handler == null) {
            continuation.resume(false)
            return@suspendCancellableCoroutine
        }

        handler { granted ->
            continuation.resume(granted)
        }
    }

    /**
     * FCMトークンを取得
     */
    actual suspend fun getToken(): Result<String> = suspendCancellableCoroutine { continuation ->
        val handler = fcmGetTokenHandler
        if (handler == null) {
            continuation.resume(Result.failure(Exception("FCM not initialized")))
            return@suspendCancellableCoroutine
        }

        handler { token, errorMessage ->
            when {
                token != null -> {
                    continuation.resume(Result.success(token))
                }
                errorMessage != null -> {
                    continuation.resume(Result.failure(Exception(errorMessage)))
                }
                else -> {
                    continuation.resume(Result.failure(Exception("Failed to get FCM token")))
                }
            }
        }
    }

    /**
     * FCMトークンをFirestoreに保存
     */
    actual fun saveTokenToFirestore() {
        fcmSaveTokenHandler?.invoke()
    }

    /**
     * FCMトークンをFirestoreから削除 (ログアウト時)
     */
    actual fun removeTokenFromFirestore() {
        fcmRemoveTokenHandler?.invoke()
    }
}
