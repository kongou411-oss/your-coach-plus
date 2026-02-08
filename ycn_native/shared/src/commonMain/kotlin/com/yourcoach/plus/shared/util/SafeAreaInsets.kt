package com.yourcoach.plus.shared.util

import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.Dp

/**
 * プラットフォーム固有のSafeAreaインセット値を提供
 *
 * iOS: ノッチ、Dynamic Island、ホームインジケータの余白を取得
 * Android: システムのステータスバー/ナビゲーションバーの高さを取得
 */
data class SafeAreaInsets(
    val top: Dp,
    val bottom: Dp,
    val left: Dp,
    val right: Dp
)

/**
 * 現在のプラットフォームのSafeAreaインセットを取得
 * iOS: UIWindowのsafeAreaInsetsから取得
 * Android: WindowInsets APIから取得
 */
@Composable
expect fun getSafeAreaInsets(): SafeAreaInsets

/**
 * SafeAreaのトップ（ステータスバー/ノッチ）の高さを取得
 */
@Composable
fun getSafeAreaTopPadding(): Dp = getSafeAreaInsets().top

/**
 * SafeAreaのボトム（ホームインジケータ等）の高さを取得
 */
@Composable
fun getSafeAreaBottomPadding(): Dp = getSafeAreaInsets().bottom
