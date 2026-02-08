package com.yourcoach.plus.shared.notification

/**
 * プッシュ通知ヘルパー (expect宣言)
 * プラットフォーム固有の実装を提供
 */
expect class PushNotificationHelper() {
    /**
     * プッシュ通知の許可をリクエスト
     */
    suspend fun requestPermission(): Result<Boolean>

    /**
     * 通知許可状態を確認
     */
    suspend fun isPermissionGranted(): Boolean

    /**
     * FCMトークンを取得
     */
    suspend fun getToken(): Result<String>

    /**
     * FCMトークンをFirestoreに保存
     */
    fun saveTokenToFirestore()

    /**
     * FCMトークンをFirestoreから削除 (ログアウト時)
     */
    fun removeTokenFromFirestore()
}
