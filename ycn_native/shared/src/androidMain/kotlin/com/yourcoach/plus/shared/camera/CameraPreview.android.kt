package com.yourcoach.plus.shared.camera

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.yourcoach.plus.shared.util.AppError

/**
 * Android版はandroidApp内のCameraX実装を使用するため、
 * shared側はスタブ実装。
 */
@Composable
actual fun NativeCameraPreview(modifier: Modifier) {
    // Androidでは使用しない
}

actual fun startCameraPreview() {
    // Androidでは使用しない
}

actual fun stopCameraPreview() {
    // Androidでは使用しない
}

actual suspend fun capturePhotoFromPreview(): Result<CameraResult> {
    return Result.failure(AppError.NotImplemented("Androidでは使用しません"))
}
