package com.yourcoach.plus.shared.auth

import androidx.compose.runtime.Composable

/**
 * Google Sign-In ボタン（expect/actual パターン）
 * プラットフォーム固有の実装で Google Sign-In UI を表示
 *
 * @param onSignInResult サインイン結果のコールバック
 *                       成功時: Result.success(idToken)
 *                       失敗時: Result.failure(error)
 * @param enabled ボタンが有効かどうか
 */
@Composable
expect fun GoogleSignInButtonHandler(
    onSignInResult: (Result<String>) -> Unit,
    enabled: Boolean = true,
    content: @Composable (onClick: () -> Unit) -> Unit
)
