package com.yourcoach.plus.shared.auth

import com.yourcoach.plus.shared.util.AppError

/**
 * Apple Sign-In ヘルパー (Android実装)
 * Androidでは非対応のためエラーを返す
 */
actual class AppleSignInHelper actual constructor() {
    /**
     * Appleでサインイン
     * Androidでは非対応
     */
    actual suspend fun signIn(): Result<AppleSignInResult> {
        return Result.failure(
            AppError.NotImplemented("Apple Sign-InはiOSでのみ利用可能です")
        )
    }
}
