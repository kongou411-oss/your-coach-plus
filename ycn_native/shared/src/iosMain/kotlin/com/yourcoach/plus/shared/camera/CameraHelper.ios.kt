package com.yourcoach.plus.shared.camera

import com.yourcoach.plus.shared.util.AppError
import kotlinx.coroutines.suspendCancellableCoroutine
import platform.UIKit.UIViewController
import kotlin.coroutines.resume

/**
 * グローバルなカメラ/フォトピッカー関数ポインタ
 * Swift側から設定される
 */

// カメラまたはフォトライブラリを選択するアクションシート表示
var cameraShowImageSourceSelectionHandler: ((UIViewController, (String?, String?, String?) -> Unit) -> Unit)? = null

// フォトピッカー表示
var cameraShowPhotoPickerHandler: ((UIViewController, (String?, String?, String?) -> Unit) -> Unit)? = null

// カメラ表示
var cameraShowCameraHandler: ((UIViewController, (String?, String?, String?) -> Unit) -> Unit)? = null

// カメラ権限チェック
var cameraCheckPermissionHandler: (((Boolean) -> Unit) -> Unit)? = null

// 現在のViewController取得
var cameraCurrentViewControllerProvider: (() -> UIViewController?)? = null

// ライブカメラプレビュー用ハンドラー
var cameraGetPreviewViewHandler: (() -> platform.UIKit.UIView?)? = null
var cameraStartPreviewHandler: (() -> Unit)? = null
var cameraStopPreviewHandler: (() -> Unit)? = null
var cameraCaptureFromPreviewHandler: (((String?, String?, String?) -> Unit) -> Unit)? = null
var cameraUpdatePreviewFrameHandler: (() -> Unit)? = null

/**
 * カメラヘルパー (iOS実装)
 * Swift側で設定されたハンドラーを使用してカメラ/フォトピッカーを呼び出す
 */
actual object CameraHelper {

    /**
     * カメラまたはフォトライブラリから画像を取得
     */
    actual suspend fun captureImage(): Result<CameraResult> = suspendCancellableCoroutine { continuation ->
        val handler = cameraShowImageSourceSelectionHandler
        if (handler == null) {
            continuation.resume(
                Result.failure(AppError.NotImplemented("カメラ機能が初期化されていません"))
            )
            return@suspendCancellableCoroutine
        }

        val viewController = cameraCurrentViewControllerProvider?.invoke()
        if (viewController == null) {
            continuation.resume(
                Result.failure(AppError.NotImplemented("ViewControllerが取得できません"))
            )
            return@suspendCancellableCoroutine
        }

        handler(viewController) { base64Data, mimeType, errorMessage ->
            when {
                base64Data != null && mimeType != null -> {
                    continuation.resume(
                        Result.success(CameraResult(base64Data, mimeType))
                    )
                }
                errorMessage != null -> {
                    if (errorMessage.contains("キャンセル", ignoreCase = true) ||
                        errorMessage.contains("cancel", ignoreCase = true)) {
                        continuation.resume(Result.failure(AppError.Cancelled("画像選択がキャンセルされました")))
                    } else {
                        continuation.resume(Result.failure(AppError.Unknown(errorMessage)))
                    }
                }
                else -> {
                    continuation.resume(
                        Result.failure(AppError.Unknown("画像の取得に失敗しました"))
                    )
                }
            }
        }
    }

    /**
     * フォトライブラリから画像を選択
     */
    actual suspend fun pickImage(): Result<CameraResult> = suspendCancellableCoroutine { continuation ->
        val handler = cameraShowPhotoPickerHandler
        if (handler == null) {
            continuation.resume(
                Result.failure(AppError.NotImplemented("フォトピッカーが初期化されていません"))
            )
            return@suspendCancellableCoroutine
        }

        val viewController = cameraCurrentViewControllerProvider?.invoke()
        if (viewController == null) {
            continuation.resume(
                Result.failure(AppError.NotImplemented("ViewControllerが取得できません"))
            )
            return@suspendCancellableCoroutine
        }

        handler(viewController) { base64Data, mimeType, errorMessage ->
            when {
                base64Data != null && mimeType != null -> {
                    continuation.resume(
                        Result.success(CameraResult(base64Data, mimeType))
                    )
                }
                errorMessage != null -> {
                    if (errorMessage.contains("キャンセル", ignoreCase = true) ||
                        errorMessage.contains("cancel", ignoreCase = true)) {
                        continuation.resume(Result.failure(AppError.Cancelled("画像選択がキャンセルされました")))
                    } else {
                        continuation.resume(Result.failure(AppError.Unknown(errorMessage)))
                    }
                }
                else -> {
                    continuation.resume(
                        Result.failure(AppError.Unknown("画像の取得に失敗しました"))
                    )
                }
            }
        }
    }

    /**
     * カメラで撮影
     */
    actual suspend fun takePhoto(): Result<CameraResult> = suspendCancellableCoroutine { continuation ->
        val handler = cameraShowCameraHandler
        if (handler == null) {
            continuation.resume(
                Result.failure(AppError.NotImplemented("カメラが初期化されていません"))
            )
            return@suspendCancellableCoroutine
        }

        val viewController = cameraCurrentViewControllerProvider?.invoke()
        if (viewController == null) {
            continuation.resume(
                Result.failure(AppError.NotImplemented("ViewControllerが取得できません"))
            )
            return@suspendCancellableCoroutine
        }

        handler(viewController) { base64Data, mimeType, errorMessage ->
            when {
                base64Data != null && mimeType != null -> {
                    continuation.resume(
                        Result.success(CameraResult(base64Data, mimeType))
                    )
                }
                errorMessage != null -> {
                    if (errorMessage.contains("キャンセル", ignoreCase = true) ||
                        errorMessage.contains("cancel", ignoreCase = true)) {
                        continuation.resume(Result.failure(AppError.Cancelled("撮影がキャンセルされました")))
                    } else {
                        continuation.resume(Result.failure(AppError.Unknown(errorMessage)))
                    }
                }
                else -> {
                    continuation.resume(
                        Result.failure(AppError.Unknown("撮影に失敗しました"))
                    )
                }
            }
        }
    }

    /**
     * カメラ権限をチェック
     */
    actual suspend fun checkCameraPermission(): Boolean = suspendCancellableCoroutine { continuation ->
        val handler = cameraCheckPermissionHandler
        if (handler == null) {
            continuation.resume(false)
            return@suspendCancellableCoroutine
        }

        handler { granted ->
            continuation.resume(granted)
        }
    }
}
