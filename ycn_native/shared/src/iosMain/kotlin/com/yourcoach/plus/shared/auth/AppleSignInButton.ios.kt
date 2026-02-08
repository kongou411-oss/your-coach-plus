package com.yourcoach.plus.shared.auth

import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import kotlinx.coroutines.launch

/**
 * Apple Sign-In ボタンハンドラー (iOS実装)
 */
@Composable
actual fun AppleSignInButtonHandler(
    onSignInResult: (Result<AppleSignInResult>) -> Unit,
    enabled: Boolean,
    content: @Composable (onClick: () -> Unit) -> Unit
) {
    val scope = rememberCoroutineScope()

    content {
        if (enabled) {
            scope.launch {
                val helper = AppleSignInHelper()
                val result = helper.signIn()
                onSignInResult(result)
            }
        }
    }
}
