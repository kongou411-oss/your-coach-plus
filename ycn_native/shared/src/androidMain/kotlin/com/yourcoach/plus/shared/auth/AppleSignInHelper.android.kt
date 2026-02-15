package com.yourcoach.plus.shared.auth

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.OAuthProvider
import kotlinx.coroutines.tasks.await

/**
 * Apple Sign-In ヘルパー (Android実装)
 * Firebase OAuthProvider Webフローを使用
 */
actual class AppleSignInHelper actual constructor() {

    /**
     * Appleでサインイン
     * Firebase OAuthProviderのWebフローでApple認証を実行し、
     * IDトークンとnonceを返す
     */
    actual suspend fun signIn(): Result<AppleSignInResult> {
        return try {
            val provider = OAuthProvider.newBuilder("apple.com")
                .setScopes(listOf("email", "name"))
                .build()

            val auth = FirebaseAuth.getInstance()

            // Pending result がある場合はそれを使用
            val pendingResult = auth.pendingAuthResult
            val authResult = if (pendingResult != null) {
                pendingResult.await()
            } else {
                // 新規サインインフロー（Web UIが表示される）
                // Note: これはActivity contextが必要だが、Firebase SDKが自動的に解決する
                auth.startActivityForSignInWithProvider(
                    getCurrentActivity(),
                    provider
                ).await()
            }

            val user = authResult.user
                ?: return Result.failure(Exception("ユーザー情報を取得できませんでした"))

            // Firebase側で認証済みのため、tokenは不要（直接signIn済み）
            // AuthScreenModelのAndroidパスで使用される
            val credential = authResult.credential
            val idToken = credential?.let {
                (it as? com.google.firebase.auth.OAuthCredential)?.idToken
            } ?: ""

            Result.success(
                AppleSignInResult(
                    idToken = idToken,
                    nonce = "", // Firebase OAuthProviderがnonceを管理
                    fullName = user.displayName,
                    email = user.email
                )
            )
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

/**
 * 現在のActivityを取得するヘルパー
 */
private fun getCurrentActivity(): android.app.Activity {
    // ActivityThread経由で現在のActivityを取得
    val activityThread = Class.forName("android.app.ActivityThread")
    val currentActivityThread = activityThread.getMethod("currentActivityThread").invoke(null)
    val activitiesField = activityThread.getDeclaredField("mActivities")
    activitiesField.isAccessible = true
    @Suppress("UNCHECKED_CAST")
    val activities = activitiesField.get(currentActivityThread) as android.util.ArrayMap<Any, Any>
    for (activityRecord in activities.values) {
        val activityRecordClass = activityRecord.javaClass
        val pausedField = activityRecordClass.getDeclaredField("paused")
        pausedField.isAccessible = true
        if (!pausedField.getBoolean(activityRecord)) {
            val activityField = activityRecordClass.getDeclaredField("activity")
            activityField.isAccessible = true
            return activityField.get(activityRecord) as android.app.Activity
        }
    }
    throw IllegalStateException("No current activity found")
}
