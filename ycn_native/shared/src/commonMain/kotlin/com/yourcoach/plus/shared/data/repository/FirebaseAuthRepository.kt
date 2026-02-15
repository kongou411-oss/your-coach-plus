package com.yourcoach.plus.shared.data.repository

import com.yourcoach.plus.shared.domain.model.User
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.util.AppError
import dev.gitlive.firebase.Firebase
import dev.gitlive.firebase.auth.FirebaseAuth
import dev.gitlive.firebase.auth.FirebaseUser
import dev.gitlive.firebase.auth.GoogleAuthProvider
import dev.gitlive.firebase.auth.OAuthProvider
import dev.gitlive.firebase.auth.auth
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * Firebase Authentication リポジトリ実装 (GitLive KMP版)
 */
class FirebaseAuthRepository : AuthRepository {

    // iOS対応: lazy初期化でFirebaseアクセスを遅延
    private val auth: FirebaseAuth by lazy {
        try {
            Firebase.auth
        } catch (e: Throwable) {
            println("FirebaseAuthRepository: Firebase.auth initialization failed: ${e.message}")
            throw e
        }
    }

    /**
     * 現在のユーザーを監視
     */
    override val currentUser: Flow<User?> = auth.authStateChanged.map { firebaseUser ->
        firebaseUser?.toUser()
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
            val result = auth.signInWithEmailAndPassword(email, password)
            val firebaseUser = result.user
                ?: return Result.failure(AppError.AuthenticationError("ユーザー情報を取得できませんでした"))

            Result.success(firebaseUser.toUser())
        } catch (e: Exception) {
            Result.failure(mapFirebaseAuthError(e))
        }
    }

    /**
     * Googleでサインイン
     */
    override suspend fun signInWithGoogle(idToken: String): Result<User> {
        return try {
            val credential = GoogleAuthProvider.credential(idToken, null)
            val result = auth.signInWithCredential(credential)
            val firebaseUser = result.user
                ?: return Result.failure(AppError.AuthenticationError("ユーザー情報を取得できませんでした"))

            Result.success(firebaseUser.toUser())
        } catch (e: Exception) {
            Result.failure(mapFirebaseAuthError(e))
        }
    }

    /**
     * Appleでサインイン
     */
    override suspend fun signInWithApple(idToken: String, nonce: String): Result<User> {
        return try {
            val credential = OAuthProvider.credential("apple.com", idToken, nonce)
            val result = auth.signInWithCredential(credential)
            val firebaseUser = result.user
                ?: return Result.failure(AppError.AuthenticationError("ユーザー情報を取得できませんでした"))

            Result.success(firebaseUser.toUser())
        } catch (e: Exception) {
            Result.failure(mapFirebaseAuthError(e))
        }
    }

    /**
     * メールとパスワードでアカウント作成
     */
    override suspend fun signUpWithEmail(email: String, password: String): Result<User> {
        return try {
            val result = auth.createUserWithEmailAndPassword(email, password)
            val firebaseUser = result.user
                ?: return Result.failure(AppError.AuthenticationError("ユーザー作成に失敗しました"))

            Result.success(firebaseUser.toUser())
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
            auth.sendPasswordResetEmail(email)
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
            auth.currentUser?.sendEmailVerification()
                ?: return Result.failure(AppError.AuthenticationError("ログインしていません"))
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(mapFirebaseAuthError(e))
        }
    }

    /**
     * 現在のユーザーを取得（同期）
     * iOS対応: Firebase初期化前のアクセスを防御
     */
    override fun getCurrentUser(): User? {
        return try {
            auth.currentUser?.toUser()
        } catch (e: Throwable) {
            println("FirebaseAuthRepository: getCurrentUser error: ${e.message}")
            null
        }
    }

    /**
     * 現在のユーザーIDを取得
     * iOS対応: Firebase初期化前のアクセスを防御
     */
    override fun getCurrentUserId(): String? {
        return try {
            auth.currentUser?.uid
        } catch (e: Throwable) {
            println("FirebaseAuthRepository: getCurrentUserId error: ${e.message}")
            null
        }
    }

    /**
     * メール認証済みか確認
     * iOS対応: Firebase初期化前のアクセスを防御
     */
    override fun isEmailVerified(): Boolean {
        return try {
            auth.currentUser?.isEmailVerified ?: false
        } catch (e: Throwable) {
            println("FirebaseAuthRepository: isEmailVerified error: ${e.message}")
            false
        }
    }

    /**
     * アカウント削除
     */
    override suspend fun deleteAccount(): Result<Unit> {
        return try {
            val user = auth.currentUser
                ?: return Result.failure(AppError.AuthenticationError("ログインしていません"))

            user.delete()
            Result.success(Unit)
        } catch (e: Exception) {
            val message = e.message ?: ""
            if (message.contains("REQUIRES_RECENT_LOGIN") ||
                message.contains("requires-recent-login")) {
                Result.failure(AppError.RecentLoginRequired())
            } else {
                Result.failure(mapFirebaseAuthError(e))
            }
        }
    }

    /**
     * Googleで再認証してアカウント削除
     */
    override suspend fun reauthenticateWithGoogleAndDelete(idToken: String): Result<Unit> {
        return try {
            val currentUser = auth.currentUser
                ?: return Result.failure(AppError.AuthenticationError("ログインしていません"))

            val credential = GoogleAuthProvider.credential(idToken, null)
            currentUser.reauthenticate(credential)

            // 再認証成功後に削除
            val userAfterReauth = auth.currentUser
                ?: return Result.failure(AppError.AuthenticationError("再認証後にログイン状態が失われました"))

            userAfterReauth.delete()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(mapFirebaseAuthError(e))
        }
    }

    /**
     * FirebaseUserをUserに変換
     */
    private fun FirebaseUser.toUser(): User {
        return User(
            uid = uid,
            email = email ?: "",
            displayName = displayName,
            photoUrl = photoURL
        )
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
            // Apple Sign-In関連エラー
            message.contains("Unable to parse") || message.contains("17004") ->
                AppError.AuthenticationError("認証トークンの処理に失敗しました。再度お試しください")
            message.contains("INVALID_CREDENTIAL") || message.contains("17020") ->
                AppError.AuthenticationError("認証情報が無効です。再度ログインしてください")
            message.contains("CREDENTIAL_ALREADY_IN_USE") ->
                AppError.AuthenticationError("このアカウントは既に別のユーザーに紐づけられています")
            message.contains("OPERATION_NOT_ALLOWED") || message.contains("17006") ->
                AppError.AuthenticationError("この認証方法は現在利用できません")
            message.contains("MISSING_OR_INVALID_NONCE") || message.contains("17058") ->
                AppError.AuthenticationError("認証セッションが無効です。再度お試しください")
            else -> AppError.AuthenticationError(e.message ?: "認証エラーが発生しました")
        }
    }
}
