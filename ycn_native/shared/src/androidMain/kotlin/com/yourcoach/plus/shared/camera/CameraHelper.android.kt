package com.yourcoach.plus.shared.camera

import android.content.Context
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Base64
import com.yourcoach.plus.shared.util.AppError
import kotlinx.coroutines.suspendCancellableCoroutine
import java.io.ByteArrayOutputStream
import kotlin.coroutines.resume

/**
 * カメラヘルパー (Android実装)
 * ギャラリー選択はcontinuation-basedパターンで実装。
 * PlatformCameraSetupコンポーザブルでlauncherを登録し、ここから呼び出す。
 */
actual object CameraHelper {

    // ギャラリーピッカーのlauncher（PlatformCameraSetupから登録される）
    internal var galleryPickerLauncher: (() -> Unit)? = null
    internal var galleryResultContinuation: kotlinx.coroutines.CancellableContinuation<Result<CameraResult>>? = null
    internal var currentContext: Context? = null

    actual suspend fun captureImage(): Result<CameraResult> {
        return capturePhotoFromPreview()
    }

    /**
     * フォトライブラリから画像を選択
     * PlatformCameraSetupで登録されたActivityResultLauncherを使用
     */
    actual suspend fun pickImage(): Result<CameraResult> {
        val launcher = galleryPickerLauncher
            ?: return Result.failure(AppError.NotImplemented("ギャラリーピッカーが初期化されていません"))

        return suspendCancellableCoroutine { continuation ->
            galleryResultContinuation = continuation
            continuation.invokeOnCancellation {
                galleryResultContinuation = null
            }
            launcher()
        }
    }

    actual suspend fun takePhoto(): Result<CameraResult> {
        return capturePhotoFromPreview()
    }

    actual suspend fun checkCameraPermission(): Boolean {
        val ctx = currentContext ?: return false
        return androidx.core.content.ContextCompat.checkSelfPermission(
            ctx,
            android.Manifest.permission.CAMERA
        ) == android.content.pm.PackageManager.PERMISSION_GRANTED
    }

    /**
     * PlatformCameraSetupのActivityResultLauncherから呼ばれるコールバック
     */
    internal fun onImagePicked(uri: Uri?, context: Context) {
        val continuation = galleryResultContinuation
        galleryResultContinuation = null

        if (continuation == null || !continuation.isActive) return

        if (uri == null) {
            continuation.resume(Result.failure(AppError.Cancelled("画像選択がキャンセルされました")))
            return
        }

        try {
            val inputStream = context.contentResolver.openInputStream(uri)
                ?: throw Exception("画像を読み込めません")
            val bytes = inputStream.use { it.readBytes() }
            val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
            val outputStream = ByteArrayOutputStream()
            bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 85, outputStream)
            val base64 = Base64.encodeToString(outputStream.toByteArray(), Base64.NO_WRAP)
            continuation.resume(Result.success(CameraResult(base64, "image/jpeg")))
        } catch (e: Exception) {
            continuation.resume(Result.failure(e))
        }
    }
}
