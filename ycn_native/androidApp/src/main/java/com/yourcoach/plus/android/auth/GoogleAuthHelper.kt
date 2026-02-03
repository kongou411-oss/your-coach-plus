package com.yourcoach.plus.android.auth

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.yourcoach.plus.shared.util.AppError
import java.security.MessageDigest
import java.util.UUID

/**
 * Google認証ヘルパークラス
 * Credential Manager APIを使用してGoogleログインを実装
 */
class GoogleAuthHelper(
    private val context: Context
) {
    private val credentialManager = CredentialManager.create(context)

    companion object {
        // Firebase Console > Authentication > Sign-in method > Google > Web client ID
        private const val WEB_CLIENT_ID = "654534642431-654ak0n4ptob8r2qiu93keo6u1ics1qs.apps.googleusercontent.com"
    }

    /**
     * Googleでサインイン
     * @return GoogleIdToken (Firebase Authに渡す用)
     */
    suspend fun signIn(): Result<String> {
        return signInInternal(filterByAuthorizedAccounts = false)
    }

    /**
     * 再認証用のGoogleサインイン（既存アカウントのみ）
     * @return GoogleIdToken (Firebase Authの再認証に渡す用)
     */
    suspend fun signInForReauthentication(): Result<String> {
        return signInInternal(filterByAuthorizedAccounts = true)
    }

    /**
     * 内部サインイン処理
     */
    private suspend fun signInInternal(filterByAuthorizedAccounts: Boolean): Result<String> {
        return try {
            // Nonceを生成（リプレイ攻撃対策）
            val nonce = generateNonce()

            // Google ID Token Optionを作成
            val googleIdOption = GetGoogleIdOption.Builder()
                .setFilterByAuthorizedAccounts(filterByAuthorizedAccounts)
                .setServerClientId(WEB_CLIENT_ID)
                .setAutoSelectEnabled(filterByAuthorizedAccounts) // 再認証時は自動選択
                .setNonce(nonce)
                .build()

            // Credential Requestを作成
            val request = GetCredentialRequest.Builder()
                .addCredentialOption(googleIdOption)
                .build()

            // Credentialを取得
            val response = credentialManager.getCredential(
                request = request,
                context = context as android.app.Activity
            )

            // レスポンスからID Tokenを抽出
            handleSignInResponse(response)
        } catch (e: GetCredentialCancellationException) {
            Result.failure(AppError.AuthenticationError("ログインがキャンセルされました"))
        } catch (e: NoCredentialException) {
            Result.failure(AppError.AuthenticationError("利用可能なGoogleアカウントがありません"))
        } catch (e: GetCredentialException) {
            Result.failure(AppError.AuthenticationError("Googleログインに失敗しました: ${e.message}"))
        } catch (e: Exception) {
            Result.failure(AppError.Unknown("予期しないエラーが発生しました: ${e.message}", e))
        }
    }

    /**
     * サインインレスポンスを処理
     */
    private fun handleSignInResponse(response: GetCredentialResponse): Result<String> {
        val credential = response.credential

        return when (credential) {
            is CustomCredential -> {
                if (credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                    try {
                        val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
                        val idToken = googleIdTokenCredential.idToken
                        Result.success(idToken)
                    } catch (e: Exception) {
                        Result.failure(AppError.AuthenticationError("認証情報の解析に失敗しました"))
                    }
                } else {
                    Result.failure(AppError.AuthenticationError("未対応の認証タイプです"))
                }
            }
            else -> {
                Result.failure(AppError.AuthenticationError("未対応の認証情報です"))
            }
        }
    }

    /**
     * Nonceを生成（セキュリティ用）
     */
    private fun generateNonce(): String {
        val rawNonce = UUID.randomUUID().toString()
        val bytes = rawNonce.toByteArray()
        val md = MessageDigest.getInstance("SHA-256")
        val digest = md.digest(bytes)
        return digest.fold("") { str, it -> str + "%02x".format(it) }
    }
}
