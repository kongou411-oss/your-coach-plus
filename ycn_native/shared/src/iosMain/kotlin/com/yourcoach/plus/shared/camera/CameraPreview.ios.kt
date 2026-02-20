package com.yourcoach.plus.shared.camera

import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.toComposeImageBitmap
import androidx.compose.ui.interop.UIKitView
import com.yourcoach.plus.shared.util.AppError
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.addressOf
import kotlinx.cinterop.usePinned
import kotlinx.coroutines.suspendCancellableCoroutine
import org.jetbrains.skia.Image
import platform.Foundation.NSData
import platform.Foundation.NSDataBase64DecodingIgnoreUnknownCharacters
import platform.Foundation.create
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
 * Skia Image経由でComposeのImageBitmapに変換
 */
actual fun decodeBase64ToImageBitmap(base64: String): ImageBitmap? {
    return try {
        val nsData = NSData.create(
            base64EncodedString = base64,
            options = NSDataBase64DecodingIgnoreUnknownCharacters
        ) ?: return null
        val bytes = nsData.toByteArray()
        val skiaImage = Image.makeFromEncoded(bytes)
        skiaImage.toComposeImageBitmap()
    } catch (e: Exception) {
        null
    }
}

@OptIn(ExperimentalForeignApi::class)
private fun NSData.toByteArray(): ByteArray {
    val size = this.length.toInt()
    if (size == 0) return ByteArray(0)
    val bytes = ByteArray(size)
    bytes.usePinned { pinned ->
        platform.posix.memcpy(pinned.addressOf(0), this.bytes, this.length)
    }
    return bytes
}
