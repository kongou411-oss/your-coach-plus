package com.yourcoach.plus.shared.util

import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.systemBars
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.Dp

/**
 * Android実装: システムウィンドウインセットを使用
 */
@Composable
actual fun getSafeAreaInsets(): SafeAreaInsets {
    val systemBarsInsets = WindowInsets.systemBars.asPaddingValues()
    return SafeAreaInsets(
        top = systemBarsInsets.calculateTopPadding(),
        bottom = systemBarsInsets.calculateBottomPadding(),
        left = Dp(0f), // LTR/RTLで変わる可能性があるが、通常は0
        right = Dp(0f)
    )
}
