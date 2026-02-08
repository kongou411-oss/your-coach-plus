package com.yourcoach.plus.shared.domain.repository

import com.yourcoach.plus.shared.domain.model.User
import kotlinx.coroutines.flow.Flow

/**
 * 認証リポジトリインターフェース
 */
interface AuthRepository {
    /**
     * 現在のユーザーを監視
     */
    val currentUser: Flow<User?>

    /**
     * ログイン状態を監視
     */
    val isLoggedIn: Flow<Boolean>

    /**
     * メールとパスワードでサインイン
     */
    suspend fun signInWithEmail(email: String, password: String): Result<User>

    /**
     * Googleでサインイン
     */
    suspend fun signInWithGoogle(idToken: String): Result<User>

    /**
     * Appleでサインイン
     */
    suspend fun signInWithApple(idToken: String, nonce: String): Result<User>

    /**
     * メールとパスワードでアカウント作成
     */
    suspend fun signUpWithEmail(email: String, password: String): Result<User>

    /**
     * サインアウト
     */
    suspend fun signOut(): Result<Unit>

    /**
     * パスワードリセットメール送信
     */
    suspend fun sendPasswordResetEmail(email: String): Result<Unit>

    /**
     * メール認証メール送信
     */
    suspend fun sendEmailVerification(): Result<Unit>

    /**
     * 現在のユーザーを取得（同期）
     */
    fun getCurrentUser(): User?

    /**
     * 現在のユーザーIDを取得
     */
    fun getCurrentUserId(): String?

    /**
     * メール認証済みか確認
     */
    fun isEmailVerified(): Boolean

    /**
     * アカウント削除
     */
    suspend fun deleteAccount(): Result<Unit>
}
