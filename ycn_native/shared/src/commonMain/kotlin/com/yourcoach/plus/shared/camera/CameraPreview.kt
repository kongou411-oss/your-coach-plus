package com.yourcoach.plus.shared.camera

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ImageBitmap

/**
 * ライブカメラプレビュー（expect/actual）
 * iOS: AVFoundation + UIKitView
 * Android: CameraX PreviewView
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

/**
 * プラットフォーム固有のカメラセットアップ
 * Android: ActivityResultLauncher（ギャラリーピッカー・権限リクエスト）の登録
 * iOS: no-op
 */
@Composable
expect fun PlatformCameraSetup()

/**
 * Base64文字列からImageBitmapに変換
 * Android: BitmapFactory + asImageBitmap
 * iOS: null (別の表示方法を使用)
 */
expect fun decodeBase64ToImageBitmap(base64: String): ImageBitmap?
