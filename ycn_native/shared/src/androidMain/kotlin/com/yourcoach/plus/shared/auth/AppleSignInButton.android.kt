package com.yourcoach.plus.shared.auth

import androidx.compose.runtime.*
import kotlinx.coroutines.launch

/**
 * Apple Sign-In ボタンハンドラー (Android実装)
 * Firebase OAuthProvider Webフローを使用
 */
@Composable
actual fun AppleSignInButtonHandler(
    onSignInResult: (Result<AppleSignInResult>) -> Unit,
    enabled: Boolean,
    content: @Composable (onClick: () -> Unit) -> Unit
) {
    val scope = rememberCoroutineScope()
    val helper = remember { AppleSignInHelper() }

    content {
        if (enabled) {
            scope.launch {
                val result = helper.signIn()
                onSignInResult(result)
            }
        }
    }
}
