package com.yourcoach.plus.shared.util

import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalUriHandler

/**
 * URLを外部ブラウザで開くユーティリティ
 * Compose Multiplatformの LocalUriHandler を使用
 */
@Composable
fun rememberOpenUrl(): (String) -> Unit {
    val uriHandler = LocalUriHandler.current
    return { url -> uriHandler.openUri(url) }
}
