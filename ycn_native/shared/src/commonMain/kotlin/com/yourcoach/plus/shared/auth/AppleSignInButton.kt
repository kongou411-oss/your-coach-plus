package com.yourcoach.plus.shared.auth

import androidx.compose.runtime.Composable

/**
 * Apple Sign-In ボタン（expect/actual パターン）
 * iOSでのみ動作、Androidでは何も表示しない
 *
 * @param onSignInResult サインイン結果のコールバック
 *                       成功時: Result.success(AppleSignInResult)
 *                       失敗時: Result.failure(error)
 * @param enabled ボタンが有効かどうか
 */
@Composable
expect fun AppleSignInButtonHandler(
    onSignInResult: (Result<AppleSignInResult>) -> Unit,
    enabled: Boolean = true,
    content: @Composable (onClick: () -> Unit) -> Unit
)
