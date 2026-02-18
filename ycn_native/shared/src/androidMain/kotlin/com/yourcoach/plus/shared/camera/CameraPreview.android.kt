package com.yourcoach.plus.shared.camera

import android.content.Context
import android.graphics.BitmapFactory
import android.util.Base64
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import kotlinx.coroutines.suspendCancellableCoroutine
import java.io.ByteArrayOutputStream
import java.io.File
import kotlin.coroutines.resume

/**
 * CameraX のグローバル状態を保持するシングルトン
 */
internal object AndroidCameraState {
    var imageCapture: ImageCapture? = null
    var cameraProvider: ProcessCameraProvider? = null
    var context: Context? = null
}

/**
 * CameraX PreviewViewを使用したライブカメラプレビュー
 */
@Composable
actual fun NativeCameraPreview(modifier: Modifier) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    DisposableEffect(Unit) {
        onDispose {
            AndroidCameraState.cameraProvider?.unbindAll()
            AndroidCameraState.imageCapture = null
            AndroidCameraState.cameraProvider = null
            AndroidCameraState.context = null
        }
    }

    AndroidView(
        factory = { ctx ->
            PreviewView(ctx).also { previewView ->
                val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                cameraProviderFuture.addListener({
                    try {
                        val provider = cameraProviderFuture.get()

                        val preview = Preview.Builder().build().also {
                            it.setSurfaceProvider(previewView.surfaceProvider)
                        }

                        val imageCapture = ImageCapture.Builder()
                            .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                            .build()

                        AndroidCameraState.imageCapture = imageCapture
                        AndroidCameraState.cameraProvider = provider
                        AndroidCameraState.context = ctx

                        provider.unbindAll()
                        provider.bindToLifecycle(
                            lifecycleOwner,
                            CameraSelector.DEFAULT_BACK_CAMERA,
                            preview,
                            imageCapture
                        )
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }, ContextCompat.getMainExecutor(ctx))
            }
        },
        modifier = modifier
    )
}

actual fun startCameraPreview() {
    // CameraX はライフサイクルに紐づくため自動開始
}

actual fun stopCameraPreview() {
    AndroidCameraState.cameraProvider?.unbindAll()
    AndroidCameraState.imageCapture = null
    AndroidCameraState.cameraProvider = null
    AndroidCameraState.context = null
}

/**
 * CameraX ImageCapture でプレビューから写真を撮影し、Base64に変換して返す
 */
actual suspend fun capturePhotoFromPreview(): Result<CameraResult> {
    val imageCapture = AndroidCameraState.imageCapture
        ?: return Result.failure(Exception("カメラが初期化されていません"))
    val context = AndroidCameraState.context
        ?: return Result.failure(Exception("コンテキストがありません"))

    return suspendCancellableCoroutine { continuation ->
        val file = File.createTempFile("capture_", ".jpg", context.cacheDir)
        val outputOptions = ImageCapture.OutputFileOptions.Builder(file).build()

        imageCapture.takePicture(
            outputOptions,
            ContextCompat.getMainExecutor(context),
            object : ImageCapture.OnImageSavedCallback {
                override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                    try {
                        val bytes = file.readBytes()
                        val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                        val outputStream = ByteArrayOutputStream()
                        bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 85, outputStream)
                        val base64 = Base64.encodeToString(outputStream.toByteArray(), Base64.NO_WRAP)
                        file.delete()
                        if (continuation.isActive) {
                            continuation.resume(Result.success(CameraResult(base64, "image/jpeg")))
                        }
                    } catch (e: Exception) {
                        file.delete()
                        if (continuation.isActive) {
                            continuation.resume(Result.failure(e))
                        }
                    }
                }

                override fun onError(exception: ImageCaptureException) {
                    file.delete()
                    if (continuation.isActive) {
                        continuation.resume(Result.failure(exception))
                    }
                }
            }
        )
    }
}

/**
 * Android固有のカメラセットアップ
 * ActivityResultLauncher（Photo Picker）を登録し、CameraHelperに接続する
 */
@Composable
actual fun PlatformCameraSetup() {
    val context = LocalContext.current

    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri ->
        CameraHelper.onImagePicked(uri, context)
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { _ ->
        // 権限結果は現状使用しない（CameraXはプレビュー表示時に自動要求）
    }

    LaunchedEffect(Unit) {
        CameraHelper.galleryPickerLauncher = {
            galleryLauncher.launch(
                PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
            )
        }
        CameraHelper.currentContext = context

        // カメラ権限をリクエスト
        permissionLauncher.launch(android.Manifest.permission.CAMERA)
    }

    DisposableEffect(Unit) {
        onDispose {
            CameraHelper.galleryPickerLauncher = null
            CameraHelper.galleryResultContinuation = null
            CameraHelper.currentContext = null
        }
    }
}

/**
 * Base64文字列からImageBitmapに変換（Android実装）
 */
actual fun decodeBase64ToImageBitmap(base64: String): ImageBitmap? {
    return try {
        val bytes = Base64.decode(base64, Base64.DEFAULT)
        val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
        bitmap?.asImageBitmap()
    } catch (e: Exception) {
        null
    }
}
