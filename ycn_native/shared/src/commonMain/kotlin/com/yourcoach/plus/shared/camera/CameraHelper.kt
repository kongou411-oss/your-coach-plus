package com.yourcoach.plus.shared.camera

/**
 * カメラ/フォトピッカー機能のexpect宣言
 * プラットフォームごとに実装を提供
 */
expect object CameraHelper {
    /**
     * カメラまたはフォトライブラリから画像を取得
     * @return CameraResult (base64ImageData, mimeType) または失敗
     */
    suspend fun captureImage(): Result<CameraResult>

    /**
     * フォトライブラリから画像を選択
     */
    suspend fun pickImage(): Result<CameraResult>

    /**
     * カメラで撮影
     */
    suspend fun takePhoto(): Result<CameraResult>

    /**
     * カメラ権限をチェック
     */
    suspend fun checkCameraPermission(): Boolean
}

/**
 * カメラ結果
 */
data class CameraResult(
    val base64ImageData: String,
    val mimeType: String
)
