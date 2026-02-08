package com.yourcoach.plus.shared.camera

import com.yourcoach.plus.shared.util.AppError

/**
 * カメラヘルパー (Android実装)
 * 注: Androidでは既存のAiFoodRecognitionScreenが独自のカメラ実装を持つため、
 * この実装は簡易スタブとなっている。
 * 完全な統合が必要な場合は、AiFoodRecognitionScreenのロジックをここに移行する。
 */
actual object CameraHelper {

    /**
     * カメラまたはフォトライブラリから画像を取得
     * AndroidではActivity経由でのカメラアクセスが必要なため、
     * この共通ヘルパーでは対応していない。
     */
    actual suspend fun captureImage(): Result<CameraResult> {
        return Result.failure(
            AppError.NotImplemented("Androidでは画面コンポーネント経由でカメラにアクセスしてください")
        )
    }

    /**
     * フォトライブラリから画像を選択
     */
    actual suspend fun pickImage(): Result<CameraResult> {
        return Result.failure(
            AppError.NotImplemented("Androidでは画面コンポーネント経由で画像を選択してください")
        )
    }

    /**
     * カメラで撮影
     */
    actual suspend fun takePhoto(): Result<CameraResult> {
        return Result.failure(
            AppError.NotImplemented("Androidでは画面コンポーネント経由でカメラにアクセスしてください")
        )
    }

    /**
     * カメラ権限をチェック
     * AndroidではContextが必要なため、このヘルパーでは判定できない
     */
    actual suspend fun checkCameraPermission(): Boolean {
        // Androidでは権限チェックにContextが必要なため、
        // 画面レベルで処理する必要がある
        return false
    }
}
