package com.yourcoach.plus.shared.auth

import com.yourcoach.plus.shared.util.AppError
import kotlinx.coroutines.suspendCancellableCoroutine
import platform.UIKit.UIViewController
import kotlin.coroutines.resume

/**
 * Google Sign-In コンテキスト (iOS)
 */
class GoogleSignInContext(
    val viewController: UIViewController
)

/**
 * グローバルなGoogle Sign-In関数ポインタ
 * Swift側から設定される
 */
var googleSignInHandler: ((UIViewController, (String?, String?) -> Unit) -> Unit)? = null

/**
 * グローバルなViewController取得関数
 * Swift側から設定される
 */
var googleCurrentViewControllerProvider: (() -> UIViewController?)? = null

/**
 * Google Sign-In ヘルパー (iOS実装)
 * Swift側で設定されたハンドラーを使用してネイティブSDKを呼び出す
 */
actual class GoogleSignInHelper actual constructor() {
    /**
     * Googleでサインイン
     * @return Google ID Token (Firebase Authに渡す用)
     */
    actual suspend fun signIn(): Result<String> = suspendCancellableCoroutine { continuation ->
        val handler = googleSignInHandler
        if (handler == null) {
            continuation.resume(
                Result.failure(AppError.NotImplemented("Google Sign-Inが初期化されていません"))
            )
            return@suspendCancellableCoroutine
        }

        val viewController = googleCurrentViewControllerProvider?.invoke()
        if (viewController == null) {
            continuation.resume(
                Result.failure(AppError.NotImplemented("ViewControllerが取得できません"))
            )
            return@suspendCancellableCoroutine
        }

        handler(viewController) { idToken, errorMessage ->
            when {
                idToken != null -> {
                    continuation.resume(Result.success(idToken))
                }
                errorMessage != null -> {
                    if (errorMessage.contains("cancel", ignoreCase = true)) {
                        continuation.resume(Result.failure(AppError.Cancelled("Sign-in cancelled")))
                    } else {
                        continuation.resume(Result.failure(AppError.AuthenticationError(errorMessage)))
                    }
                }
                else -> {
                    continuation.resume(
                        Result.failure(AppError.AuthenticationError("Failed to get ID token"))
                    )
                }
            }
        }
    }
}
