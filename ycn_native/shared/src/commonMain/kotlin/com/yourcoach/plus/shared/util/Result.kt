package com.yourcoach.plus.shared.util

/**
 * 結果のユーティリティ拡張
 */

/**
 * Resultの成功値を取得（失敗時はnull）
 */
fun <T> Result<T>.getOrNull(): T? = getOrElse { null }

/**
 * Resultをマップ変換
 */
inline fun <T, R> Result<T>.mapSuccess(transform: (T) -> R): Result<R> {
    return fold(
        onSuccess = { Result.success(transform(it)) },
        onFailure = { Result.failure(it) }
    )
}

/**
 * 複数のResultを結合
 */
fun <T> List<Result<T>>.combine(): Result<List<T>> {
    val results = mutableListOf<T>()
    for (result in this) {
        result.fold(
            onSuccess = { results.add(it) },
            onFailure = { return Result.failure(it) }
        )
    }
    return Result.success(results)
}

/**
 * エラーメッセージを取得
 */
fun <T> Result<T>.errorMessage(): String? {
    return exceptionOrNull()?.message
}

/**
 * アプリケーション固有のエラークラス
 */
sealed class AppError(message: String, cause: Throwable? = null) : Exception(message, cause) {
    // キャンセル
    class Cancelled(message: String = "操作がキャンセルされました") : AppError(message)

    // 認証エラー
    class AuthenticationError(message: String = "認証に失敗しました") : AppError(message)
    class InvalidCredentials(message: String = "メールアドレスまたはパスワードが正しくありません") : AppError(message)
    class EmailNotVerified(message: String = "メールアドレスが確認されていません") : AppError(message)
    class AccountDisabled(message: String = "アカウントが無効化されています") : AppError(message)
    class RecentLoginRequired(message: String = "セキュリティのため再認証が必要です") : AppError(message)

    // ネットワークエラー
    class NetworkError(message: String = "ネットワークエラーが発生しました", cause: Throwable? = null) : AppError(message, cause)
    class ServerError(message: String = "サーバーエラーが発生しました", cause: Throwable? = null) : AppError(message, cause)
    class TimeoutError(message: String = "タイムアウトしました") : AppError(message)

    // データエラー
    class NotFound(message: String = "データが見つかりません") : AppError(message)
    class ValidationError(message: String = "入力内容に問題があります") : AppError(message)
    class PermissionDenied(message: String = "アクセス権限がありません") : AppError(message)

    // 課金エラー
    class InsufficientCredits(message: String = "クレジットが不足しています") : AppError(message)
    class PurchaseFailed(message: String = "購入に失敗しました", cause: Throwable? = null) : AppError(message, cause)
    class BillingError(message: String = "課金処理に失敗しました") : AppError(message)

    // データベースエラー
    class DatabaseError(message: String = "データベースエラーが発生しました", cause: Throwable? = null) : AppError(message, cause)

    // 未実装エラー
    class NotImplemented(message: String = "この機能は未実装です") : AppError(message)

    // 一般エラー
    class Unknown(message: String = "予期しないエラーが発生しました", cause: Throwable? = null) : AppError(message, cause)
}
