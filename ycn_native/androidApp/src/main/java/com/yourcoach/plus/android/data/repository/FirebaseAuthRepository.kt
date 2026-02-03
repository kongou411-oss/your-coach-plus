package com.yourcoach.plus.android.data.repository

import android.util.Log
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthRecentLoginRequiredException
import com.google.firebase.auth.GoogleAuthProvider
import com.yourcoach.plus.shared.domain.model.User
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.util.AppError
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.tasks.await

/**
 * Firebase Authentication リポジトリ実装
 */
class FirebaseAuthRepository : AuthRepository {

    private val auth: FirebaseAuth = FirebaseAuth.getInstance()

    /**
     * 現在のユーザーを監視
     */
    override val currentUser: Flow<User?> = callbackFlow {
        val listener = FirebaseAuth.AuthStateListener { firebaseAuth ->
            val firebaseUser = firebaseAuth.currentUser
            val user = firebaseUser?.let {
                User(
                    uid = it.uid,
                    email = it.email ?: "",
                    displayName = it.displayName,
                    photoUrl = it.photoUrl?.toString()
                )
            }
            trySend(user)
        }
        auth.addAuthStateListener(listener)
        awaitClose { auth.removeAuthStateListener(listener) }
    }

    /**
     * ログイン状態を監視
     */
    override val isLoggedIn: Flow<Boolean> = currentUser.map { it != null }

    /**
     * メールとパスワードでサインイン
     */
    override suspend fun signInWithEmail(email: String, password: String): Result<User> {
        return try {
            val result = auth.signInWithEmailAndPassword(email, password).await()
            val firebaseUser = result.user
                ?: return Result.failure(AppError.AuthenticationError("ユーザー情報を取得できませんでした"))

            val user = User(
                uid = firebaseUser.uid,
                email = firebaseUser.email ?: "",
                displayName = firebaseUser.displayName,
                photoUrl = firebaseUser.photoUrl?.toString()
            )
            Result.success(user)
        } catch (e: Exception) {
            Result.failure(mapFirebaseAuthError(e))
        }
    }

    /**
     * Googleでサインイン
     */
    override suspend fun signInWithGoogle(idToken: String): Result<User> {
        return try {
            val credential = GoogleAuthProvider.getCredential(idToken, null)
            val result = auth.signInWithCredential(credential).await()
            val firebaseUser = result.user
                ?: return Result.failure(AppError.AuthenticationError("ユーザー情報を取得できませんでした"))

            val user = User(
                uid = firebaseUser.uid,
                email = firebaseUser.email ?: "",
                displayName = firebaseUser.displayName,
                photoUrl = firebaseUser.photoUrl?.toString()
            )
            Result.success(user)
        } catch (e: Exception) {
            Result.failure(mapFirebaseAuthError(e))
        }
    }

    /**
     * メールとパスワードでアカウント作成
     */
    override suspend fun signUpWithEmail(email: String, password: String): Result<User> {
        return try {
            val result = auth.createUserWithEmailAndPassword(email, password).await()
            val firebaseUser = result.user
                ?: return Result.failure(AppError.AuthenticationError("ユーザー作成に失敗しました"))

            val user = User(
                uid = firebaseUser.uid,
                email = firebaseUser.email ?: "",
                displayName = firebaseUser.displayName,
                photoUrl = firebaseUser.photoUrl?.toString()
            )
            Result.success(user)
        } catch (e: Exception) {
            Result.failure(mapFirebaseAuthError(e))
        }
    }

    /**
     * サインアウト
     */
    override suspend fun signOut(): Result<Unit> {
        return try {
            auth.signOut()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.Unknown(e.message ?: "サインアウトに失敗しました", e))
        }
    }

    /**
     * パスワードリセットメール送信
     */
    override suspend fun sendPasswordResetEmail(email: String): Result<Unit> {
        return try {
            auth.sendPasswordResetEmail(email).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(mapFirebaseAuthError(e))
        }
    }

    /**
     * メール認証メール送信
     */
    override suspend fun sendEmailVerification(): Result<Unit> {
        return try {
            auth.currentUser?.sendEmailVerification()?.await()
                ?: return Result.failure(AppError.AuthenticationError("ログインしていません"))
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(mapFirebaseAuthError(e))
        }
    }

    /**
     * 現在のユーザーを取得（同期）
     */
    override fun getCurrentUser(): User? {
        return auth.currentUser?.let {
            User(
                uid = it.uid,
                email = it.email ?: "",
                displayName = it.displayName,
                photoUrl = it.photoUrl?.toString()
            )
        }
    }

    /**
     * 現在のユーザーIDを取得
     */
    override fun getCurrentUserId(): String? {
        val uid = auth.currentUser?.uid
        Log.d("FirebaseAuthRepo", "getCurrentUserId: currentUser=${auth.currentUser}, uid=$uid")
        return uid
    }

    /**
     * メール認証済みか確認
     */
    override fun isEmailVerified(): Boolean {
        return auth.currentUser?.isEmailVerified ?: false
    }

    /**
     * アカウント削除
     */
    override suspend fun deleteAccount(): Result<Unit> {
        Log.d("FirebaseAuthRepo", "deleteAccount called")
        Log.d("FirebaseAuthRepo", "auth instance: $auth")
        Log.d("FirebaseAuthRepo", "auth.currentUser: ${auth.currentUser}")
        Log.d("FirebaseAuthRepo", "auth.currentUser?.uid: ${auth.currentUser?.uid}")

        return try {
            val user = auth.currentUser
            if (user == null) {
                Log.e("FirebaseAuthRepo", "currentUser is NULL in deleteAccount!")
                return Result.failure(AppError.AuthenticationError("ログインしていません"))
            }

            Log.d("FirebaseAuthRepo", "Calling user.delete()...")
            user.delete().await()
            Log.d("FirebaseAuthRepo", "user.delete() SUCCESS")
            Result.success(Unit)
        } catch (e: FirebaseAuthRecentLoginRequiredException) {
            Log.d("FirebaseAuthRepo", "FirebaseAuthRecentLoginRequiredException caught")
            Result.failure(AppError.RecentLoginRequired())
        } catch (e: Exception) {
            Log.e("FirebaseAuthRepo", "Exception in deleteAccount: ${e.message}", e)
            if (e.message?.contains("REQUIRES_RECENT_LOGIN") == true ||
                e.message?.contains("requires-recent-login") == true) {
                Log.d("FirebaseAuthRepo", "Detected REQUIRES_RECENT_LOGIN in message")
                Result.failure(AppError.RecentLoginRequired())
            } else {
                Result.failure(mapFirebaseAuthError(e))
            }
        }
    }

    /**
     * Googleで再認証してアカウント削除
     */
    suspend fun reauthenticateWithGoogleAndDelete(idToken: String): Result<Unit> {
        Log.d("FirebaseAuthRepo", "reauthenticateWithGoogleAndDelete called")
        Log.d("FirebaseAuthRepo", "idToken length: ${idToken.length}")
        Log.d("FirebaseAuthRepo", "currentUser before reauth: ${auth.currentUser?.uid}")
        Log.d("FirebaseAuthRepo", "currentUser email: ${auth.currentUser?.email}")

        return try {
            val currentUser = auth.currentUser
            if (currentUser == null) {
                Log.e("FirebaseAuthRepo", "currentUser is NULL before reauthenticate!")
                return Result.failure(AppError.AuthenticationError("ログインしていません（currentUser is null）"))
            }

            Log.d("FirebaseAuthRepo", "Creating Google credential...")
            val credential = GoogleAuthProvider.getCredential(idToken, null)

            Log.d("FirebaseAuthRepo", "Calling reauthenticate...")
            currentUser.reauthenticate(credential).await()
            Log.d("FirebaseAuthRepo", "Reauthenticate SUCCESS")

            Log.d("FirebaseAuthRepo", "currentUser after reauth: ${auth.currentUser?.uid}")

            // 再認証成功後に削除
            val userAfterReauth = auth.currentUser
            if (userAfterReauth == null) {
                Log.e("FirebaseAuthRepo", "currentUser is NULL after reauthenticate!")
                return Result.failure(AppError.AuthenticationError("再認証後にログイン状態が失われました"))
            }

            Log.d("FirebaseAuthRepo", "Calling delete...")
            userAfterReauth.delete().await()
            Log.d("FirebaseAuthRepo", "Delete SUCCESS")

            Result.success(Unit)
        } catch (e: Exception) {
            Log.e("FirebaseAuthRepo", "Error in reauthenticateWithGoogleAndDelete", e)
            Log.e("FirebaseAuthRepo", "Error message: ${e.message}")
            Result.failure(mapFirebaseAuthError(e))
        }
    }

    /**
     * Firebaseエラーをアプリエラーにマッピング
     */
    private fun mapFirebaseAuthError(e: Exception): AppError {
        val message = e.message ?: ""
        return when {
            message.contains("INVALID_EMAIL") -> AppError.ValidationError("メールアドレスの形式が正しくありません")
            message.contains("WRONG_PASSWORD") || message.contains("INVALID_LOGIN_CREDENTIALS") ->
                AppError.InvalidCredentials()
            message.contains("USER_NOT_FOUND") -> AppError.InvalidCredentials("アカウントが見つかりません")
            message.contains("USER_DISABLED") -> AppError.AccountDisabled()
            message.contains("EMAIL_ALREADY_IN_USE") -> AppError.ValidationError("このメールアドレスは既に使用されています")
            message.contains("WEAK_PASSWORD") -> AppError.ValidationError("パスワードが弱すぎます")
            message.contains("NETWORK") -> AppError.NetworkError("ネットワークエラーが発生しました", e)
            message.contains("TOO_MANY_REQUESTS") -> AppError.AuthenticationError("試行回数が多すぎます。しばらく待ってから再試行してください")
            else -> AppError.AuthenticationError(e.message ?: "認証エラーが発生しました")
        }
    }
}
