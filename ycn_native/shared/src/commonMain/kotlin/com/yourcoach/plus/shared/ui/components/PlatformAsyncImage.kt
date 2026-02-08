package com.yourcoach.plus.shared.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale

/**
 * プラットフォーム固有の非同期画像読み込み
 * Android: Coil AsyncImage
 * iOS: UIKitView + URLSession画像読み込み
 */
@Composable
expect fun PlatformAsyncImage(
    url: String,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    contentScale: ContentScale = ContentScale.Crop
)
