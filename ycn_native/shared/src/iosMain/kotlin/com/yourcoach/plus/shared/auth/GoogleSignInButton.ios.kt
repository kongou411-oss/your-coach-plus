package com.yourcoach.plus.shared.auth

import androidx.compose.runtime.Composable
import com.yourcoach.plus.shared.util.AppError

/**
 * Google Sign-In ボタンハンドラー (iOS実装)
 * TODO: Google Sign-In SDK for iOSを統合後に実装
 */
@Composable
actual fun GoogleSignInButtonHandler(
    onSignInResult: (Result<String>) -> Unit,
    enabled: Boolean,
    content: @Composable (onClick: () -> Unit) -> Unit
) {
    content {
        if (enabled) {
            // iOS版は現在未実装
            onSignInResult(
                Result.failure(
                    AppError.NotImplemented("iOS版のGoogle Sign-Inは現在準備中です。メールアドレスでログインしてください。")
                )
            )
        }
    }
}
