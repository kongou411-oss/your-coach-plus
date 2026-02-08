package com.yourcoach.plus.shared.ui.screens.pgbase

import android.annotation.SuppressLint
import android.view.MotionEvent
import android.view.ViewGroup
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView

@SuppressLint("SetJavaScriptEnabled")
@Composable
actual fun PlatformWebView(
    url: String,
    modifier: Modifier,
    onLoaded: () -> Unit
) {
    AndroidView(
        factory = { context ->
            WebView(context).apply {
                layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )
                webViewClient = object : WebViewClient() {
                    override fun onPageFinished(view: WebView?, url: String?) {
                        onLoaded()
                    }
                }
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.loadWithOverviewMode = true
                settings.useWideViewPort = true
                isVerticalScrollBarEnabled = true
                isHorizontalScrollBarEnabled = false
                isNestedScrollingEnabled = true
                // BottomSheetのスクロールを奪わないようにする（全祖先ビューに伝播）
                setOnTouchListener { v, event ->
                    when (event.action) {
                        MotionEvent.ACTION_DOWN, MotionEvent.ACTION_MOVE -> {
                            var parent = v.parent
                            while (parent != null) {
                                parent.requestDisallowInterceptTouchEvent(true)
                                parent = parent.parent
                            }
                        }
                        MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                            var parent = v.parent
                            while (parent != null) {
                                parent.requestDisallowInterceptTouchEvent(false)
                                parent = parent.parent
                            }
                        }
                    }
                    false
                }
                // ダークモード対応（Android Q以降）
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                    settings.forceDark = android.webkit.WebSettings.FORCE_DARK_AUTO
                }
                loadUrl(url)
            }
        },
        modifier = modifier
    )
}
