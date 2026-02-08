package com.yourcoach.plus.shared.auth

/**
 * Apple Sign-In 結果
 * @param idToken Firebase Authに渡すIDトークン
 * @param nonce Firebase Authに渡すraw nonce
 * @param fullName ユーザーのフルネーム (初回サインイン時のみ)
 * @param email ユーザーのメールアドレス (初回サインイン時のみ)
 */
data class AppleSignInResult(
    val idToken: String,
    val nonce: String,
    val fullName: String? = null,
    val email: String? = null
)

/**
 * Apple Sign-In ヘルパー（expect/actual パターン）
 * iOSでのみ実装、Androidでは非対応
 */
expect class AppleSignInHelper() {
    /**
     * Appleでサインイン
     * @return Apple Sign-In結果 (IDトークン + nonce)
     */
    suspend fun signIn(): Result<AppleSignInResult>
}
