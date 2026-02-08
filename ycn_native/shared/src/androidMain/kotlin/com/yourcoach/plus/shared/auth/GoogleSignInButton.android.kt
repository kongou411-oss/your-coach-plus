package com.yourcoach.plus.shared.auth

import android.app.Activity
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.launch

/**
 * Google Sign-In ボタンハンドラー (Android実装)
 */
@Composable
actual fun GoogleSignInButtonHandler(
    onSignInResult: (Result<String>) -> Unit,
    enabled: Boolean,
    content: @Composable (onClick: () -> Unit) -> Unit
) {
    val context = LocalContext.current
    val activity = context as? Activity
    val scope = rememberCoroutineScope()

    content {
        if (enabled && activity != null) {
            scope.launch {
                // グローバルプロバイダーを設定
                googleCurrentActivityProvider = { activity }
                val googleSignInHelper = GoogleSignInHelper()
                val result = googleSignInHelper.signIn()
                onSignInResult(result)
            }
        }
    }
}
