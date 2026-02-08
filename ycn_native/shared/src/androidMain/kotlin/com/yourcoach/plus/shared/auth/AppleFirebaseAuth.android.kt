package com.yourcoach.plus.shared.auth

import com.yourcoach.plus.shared.util.AppError

/**
 * Apple Sign-In Firebase認証 (Android実装)
 * AndroidではApple Sign-Inは利用不可
 */
actual suspend fun signInToFirebaseWithApple(
    idToken: String,
    rawNonce: String,
    fullName: String?
): Result<String> {
    return Result.failure(AppError.NotImplemented("Apple Sign-InはAndroidでは利用できません"))
}
