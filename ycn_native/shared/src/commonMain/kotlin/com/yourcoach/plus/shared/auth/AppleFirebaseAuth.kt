package com.yourcoach.plus.shared.auth

/**
 * Apple Sign-In Firebase認証ヘルパー
 * iOSではネイティブSDKを直接呼び出し、AndroidではNotImplementedを返す
 */
expect suspend fun signInToFirebaseWithApple(
    idToken: String,
    rawNonce: String,
    fullName: String?
): Result<String> // Returns user uid on success
