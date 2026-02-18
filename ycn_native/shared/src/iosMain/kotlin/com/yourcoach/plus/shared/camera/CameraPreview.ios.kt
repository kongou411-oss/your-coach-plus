package com.yourcoach.plus.shared.camera

import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.interop.UIKitView
import com.yourcoach.plus.shared.util.AppError
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

@OptIn(ExperimentalForeignApi::class)
@Composable
actual fun NativeCameraPreview(modifier: Modifier) {
    val previewView = remember { cameraGetPreviewViewHandler?.invoke() }

    if (previewView != null) {
        UIKitView(
            factory = { previewView },
            modifier = modifier,
            onResize = { _, _ ->
                cameraUpdatePreviewFrameHandler?.invoke()
            }
        )
    }
}

actual fun startCameraPreview() {
    cameraStartPreviewHandler?.invoke()
}

actual fun stopCameraPreview() {
    cameraStopPreviewHandler?.invoke()
}

actual suspend fun capturePhotoFromPreview(): Result<CameraResult> = suspendCancellableCoroutine { continuation ->
    val handler = cameraCaptureFromPreviewHandler
    if (handler == null) {
        continuation.resume(Result.failure(AppError.NotImplemented("カメラプレビューが初期化されていません")))
        return@suspendCancellableCoroutine
    }

    handler { base64, mimeType, error ->
        when {
            base64 != null && mimeType != null -> {
                continuation.resume(Result.success(CameraResult(base64, mimeType)))
            }
            error != null -> {
                continuation.resume(Result.failure(AppError.Unknown(error)))
            }
            else -> {
                continuation.resume(Result.failure(AppError.Unknown("撮影に失敗しました")))
            }
        }
    }
}

/**
 * iOS版: カメラセットアップは Swift 側で行うため no-op
 */
@Composable
actual fun PlatformCameraSetup() {
    // iOS ではSwift側のCameraBridgeで初期化済み
}

/**
 * iOS版: Base64→ImageBitmap変換
 * iOSではSkiaが使えるため将来対応可能。現状はnull。
 */
actual fun decodeBase64ToImageBitmap(base64: String): androidx.compose.ui.graphics.ImageBitmap? {
    return null
}
