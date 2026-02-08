package com.yourcoach.plus.shared.camera

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

/**
 * ライブカメラプレビュー（expect/actual）
 * iOS: AVFoundation + UIKitView
 * Android: スタブ（Android版は独自のCameraX実装を使用）
 */
@Composable
expect fun NativeCameraPreview(modifier: Modifier = Modifier)

/**
 * カメラプレビュー開始
 */
expect fun startCameraPreview()

/**
 * カメラプレビュー停止
 */
expect fun stopCameraPreview()

/**
 * プレビューから写真撮影
 */
expect suspend fun capturePhotoFromPreview(): Result<CameraResult>
