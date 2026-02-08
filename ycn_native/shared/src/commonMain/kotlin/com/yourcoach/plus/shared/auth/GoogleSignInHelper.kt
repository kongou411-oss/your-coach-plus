package com.yourcoach.plus.shared.auth

/**
 * Google Sign-In ヘルパー（expect/actual パターン）
 * プラットフォーム固有の実装が必要
 */
expect class GoogleSignInHelper() {
    /**
     * Googleでサインイン
     * @return Google ID Token (Firebase Authに渡す用)
     */
    suspend fun signIn(): Result<String>
}
