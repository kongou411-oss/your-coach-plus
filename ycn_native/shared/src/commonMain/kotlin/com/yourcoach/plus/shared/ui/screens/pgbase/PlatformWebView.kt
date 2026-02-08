package com.yourcoach.plus.shared.ui.screens.pgbase

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

/**
 * プラットフォーム固有のWebView
 * Android: AndroidView(WebView)
 * iOS: UIKitView(WKWebView)
 */
@Composable
expect fun PlatformWebView(
    url: String,
    modifier: Modifier = Modifier,
    onLoaded: () -> Unit = {}
)
