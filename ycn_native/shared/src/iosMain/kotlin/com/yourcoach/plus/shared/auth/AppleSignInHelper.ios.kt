package com.yourcoach.plus.shared.auth

import com.yourcoach.plus.shared.util.AppError
import kotlinx.coroutines.suspendCancellableCoroutine
import platform.UIKit.UIViewController
import kotlin.coroutines.resume

/**
 * Apple Sign-In コンテキスト (iOS)
 */
class AppleSignInContext(
    val viewController: UIViewController
)

/**
 * グローバルなApple Sign-In関数ポインタ
 * Swift側から設定される
 */
var appleSignInHandler: ((UIViewController, (String?, String?, String?, String?, String?) -> Unit) -> Unit)? = null

/**
 * Apple Sign-In ヘルパー (iOS実装)
 * Swift側で設定されたハンドラーを使用してネイティブSDKを呼び出す
 */
actual class AppleSignInHelper actual constructor() {
    /**
     * Appleでサインイン
     * @return Apple Sign-In結果 (IDトークン + nonce)
     */
    actual suspend fun signIn(): Result<AppleSignInResult> = suspendCancellableCoroutine { continuation ->
        val handler = appleSignInHandler
        if (handler == null) {
            continuation.resume(
                Result.failure(AppError.NotImplemented("Apple Sign-Inが初期化されていません"))
            )
            return@suspendCancellableCoroutine
        }

        val viewController = appleCurrentViewControllerProvider?.invoke()
        if (viewController == null) {
            continuation.resume(
                Result.failure(AppError.NotImplemented("ViewControllerが取得できません"))
            )
            return@suspendCancellableCoroutine
        }

        handler(viewController) { idToken, nonce, fullName, email, errorMessage ->
            when {
                idToken != null && nonce != null -> {
                    continuation.resume(
                        Result.success(
                            AppleSignInResult(
                                idToken = idToken,
                                nonce = nonce,
                                fullName = fullName,
                                email = email
                            )
                        )
                    )
                }
                errorMessage != null -> {
                    if (errorMessage.contains("cancel", ignoreCase = true) ||
                        errorMessage.contains("1001", ignoreCase = true)) {
                        continuation.resume(Result.failure(AppError.Cancelled("Sign-in cancelled")))
                    } else {
                        continuation.resume(Result.failure(AppError.AuthenticationError(errorMessage)))
                    }
                }
                else -> {
                    continuation.resume(
                        Result.failure(AppError.AuthenticationError("Failed to get Apple Sign-In result"))
                    )
                }
            }
        }
    }
}

/**
 * グローバルなViewController取得関数
 * Swift側から設定される
 */
var appleCurrentViewControllerProvider: (() -> UIViewController?)? = null

/**
 * Firebase直接認証ハンドラー
 * Swift側で設定される - AppleSignInBridge.signInToFirebase を呼び出す
 * パラメータ: (idToken, rawNonce, fullName, completion(uid, errorMessage))
 */
var appleFirebaseAuthHandler: ((String, String, String?, (String?, String?) -> Unit) -> Unit)? = null
