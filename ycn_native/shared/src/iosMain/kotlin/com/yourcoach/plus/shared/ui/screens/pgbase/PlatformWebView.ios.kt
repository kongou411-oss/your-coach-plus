package com.yourcoach.plus.shared.ui.screens.pgbase

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.UIKitInteropInteractionMode
import androidx.compose.ui.viewinterop.UIKitInteropProperties
import androidx.compose.ui.viewinterop.UIKitView
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.cValue
import platform.CoreGraphics.CGRect
import platform.Foundation.NSError
import platform.Foundation.NSURL
import platform.Foundation.NSURLRequest
import platform.WebKit.WKNavigation
import platform.WebKit.WKNavigationDelegateProtocol
import platform.WebKit.WKWebView
import platform.WebKit.WKWebViewConfiguration
import platform.darwin.NSObject

@OptIn(ExperimentalForeignApi::class, androidx.compose.ui.ExperimentalComposeUiApi::class)
@Composable
actual fun PlatformWebView(
    url: String,
    modifier: Modifier,
    onLoaded: () -> Unit
) {
    UIKitView(
        factory = {
            val config = WKWebViewConfiguration().apply {
                allowsInlineMediaPlayback = true
            }
            val webView = WKWebView(frame = cValue<CGRect>(), configuration = config).apply {
                // スクロール有効化
                scrollView.scrollEnabled = true
                scrollView.bounces = true
                // 透過背景（ダークモード対応）
                opaque = false
            }
            webView.navigationDelegate = object : NSObject(), WKNavigationDelegateProtocol {
                override fun webView(
                    webView: WKWebView,
                    didFinishNavigation: WKNavigation?
                ) {
                    onLoaded()
                }

                override fun webView(
                    webView: WKWebView,
                    didFailNavigation: WKNavigation?,
                    withError: NSError
                ) {
                    println("PlatformWebView: didFailNavigation: ${withError.localizedDescription}")
                    onLoaded()
                }

                override fun webView(
                    webView: WKWebView,
                    didFailProvisionalNavigation: WKNavigation?,
                    withError: NSError
                ) {
                    println("PlatformWebView: didFailProvisionalNavigation: ${withError.localizedDescription}")
                    onLoaded()
                }
            }
            val nsUrl = NSURL(string = url)
            val request = NSURLRequest(uRL = nsUrl)
            webView.loadRequest(request)
            webView
        },
        modifier = modifier,
        properties = UIKitInteropProperties(
            interactionMode = UIKitInteropInteractionMode.NonCooperative
        )
    )
}
