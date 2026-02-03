package com.yourcoach.plus.shared.auth

import com.yourcoach.plus.shared.util.AppError
import platform.UIKit.UIViewController

/**
 * Google Sign-In コンテキスト (iOS)
 */
actual class GoogleSignInContext(val viewController: UIViewController)

/**
 * Google Sign-In ヘルパー (iOS実装)
 * TODO: Google Sign-In SDK for iOSを使用して実装
 */
actual class GoogleSignInHelper(
    private val context: GoogleSignInContext
) {
    /**
     * Googleでサインイン
     * @return Google ID Token
     *
     * TODO: Google Sign-In SDK for iOSを使用して実装
     * 現在は未実装のためエラーを返す
     */
    actual suspend fun signIn(): Result<String> {
        // TODO: Google Sign-In SDK for iOSの実装
        // 1. GIDSignIn.sharedInstance.signIn(withPresenting: viewController)
        // 2. IDトークンを取得して返す
        return Result.failure(
            AppError.NotImplemented("iOS版のGoogle Sign-Inは現在準備中です。メールアドレスでログインしてください。")
        )
    }
}
