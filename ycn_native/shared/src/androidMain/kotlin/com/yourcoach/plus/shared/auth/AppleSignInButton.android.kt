package com.yourcoach.plus.shared.auth

import androidx.compose.runtime.Composable

/**
 * Apple Sign-In ボタンハンドラー (Android実装)
 * Androidでは何も表示しない（空の実装）
 */
@Composable
actual fun AppleSignInButtonHandler(
    onSignInResult: (Result<AppleSignInResult>) -> Unit,
    enabled: Boolean,
    content: @Composable (onClick: () -> Unit) -> Unit
) {
    // Androidでは何も表示しない
    // contentを呼び出さないことで、ボタン自体が非表示になる
}
