package com.yourcoach.plus.shared.auth

import com.yourcoach.plus.shared.util.AppError
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/**
 * Apple Sign-In Firebase認証 (iOS実装)
 * ネイティブFirebase iOS SDKの OAuthProvider.appleCredential を使用
 */
actual suspend fun signInToFirebaseWithApple(
    idToken: String,
    rawNonce: String,
    fullName: String?
): Result<String> = suspendCancellableCoroutine { continuation ->
    val handler = appleFirebaseAuthHandler
    if (handler == null) {
        continuation.resume(
            Result.failure(AppError.NotImplemented("Apple Firebase認証が初期化されていません"))
        )
        return@suspendCancellableCoroutine
    }

    handler(idToken, rawNonce, fullName) { uid, errorMessage ->
        when {
            uid != null -> {
                continuation.resume(Result.success(uid))
            }
            errorMessage != null -> {
                val error = when {
                    errorMessage.contains("cancel", ignoreCase = true) ||
                    errorMessage.contains("1001", ignoreCase = true) ->
                        AppError.Cancelled("認証がキャンセルされました")
                    errorMessage.contains("17004") || errorMessage.contains("parse") ->
                        AppError.AuthenticationError("認証トークンの処理に失敗しました")
                    errorMessage.contains("network", ignoreCase = true) ->
                        AppError.NetworkError("ネットワークエラーが発生しました")
                    else ->
                        AppError.AuthenticationError(errorMessage)
                }
                continuation.resume(Result.failure(error))
            }
            else -> {
                continuation.resume(
                    Result.failure(AppError.AuthenticationError("Firebase認証に失敗しました"))
                )
            }
        }
    }
}
