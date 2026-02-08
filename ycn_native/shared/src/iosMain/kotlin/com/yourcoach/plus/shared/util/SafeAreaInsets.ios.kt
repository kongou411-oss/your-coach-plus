package com.yourcoach.plus.shared.util

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.unit.dp
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.useContents
import kotlinx.coroutines.delay
import platform.UIKit.UIApplication
import platform.UIKit.UIWindow
import platform.UIKit.UIWindowScene

/**
 * iOS実装: UIKitのsafeAreaInsetsを使用してノッチ/Dynamic Islandの余白を取得
 * connectedScenes API（iOS 13+）を使用し、ウィンドウ未取得時はリトライ
 */
@OptIn(ExperimentalForeignApi::class)
@Composable
actual fun getSafeAreaInsets(): SafeAreaInsets {
    var insets by remember {
        mutableStateOf(
            SafeAreaInsets(top = 0.dp, bottom = 0.dp, left = 0.dp, right = 0.dp)
        )
    }

    LaunchedEffect(Unit) {
        // ウィンドウが利用可能になるまで最大リトライ（合計1秒）
        repeat(10) {
            val result = getInsetsFromWindow()
            if (result != null) {
                insets = result
                return@LaunchedEffect
            }
            delay(100)
        }
    }

    return insets
}

@OptIn(ExperimentalForeignApi::class)
private fun getInsetsFromWindow(): SafeAreaInsets? {
    // connectedScenes → UIWindowScene → windows からキーウィンドウを取得
    var window: UIWindow? = null

    for (scene in UIApplication.sharedApplication.connectedScenes) {
        val windowScene = scene as? UIWindowScene ?: continue
        // キーウィンドウを探す
        for (w in windowScene.windows) {
            val uiWindow = w as? UIWindow ?: continue
            if (uiWindow.isKeyWindow()) {
                window = uiWindow
                break
            }
        }
        // キーウィンドウがない場合は最初のウィンドウを使用
        if (window == null) {
            window = windowScene.windows.firstOrNull() as? UIWindow
        }
        if (window != null) break
    }

    val safeInsets = window?.safeAreaInsets ?: return null

    return safeInsets.useContents {
        if (top == 0.0 && bottom == 0.0) {
            // ウィンドウがまだレイアウトされていない
            null
        } else {
            SafeAreaInsets(
                top = top.toFloat().dp,
                bottom = bottom.toFloat().dp,
                left = left.toFloat().dp,
                right = right.toFloat().dp
            )
        }
    }
}
