package com.yourcoach.plus.shared.auth

import android.app.Activity
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
 * Google Sign-In コンテキスト (Android)
 */
actual class GoogleSignInContext(val activity: Activity)

/**
 * Google Sign-In ヘルパー (Android実装)
 * Credential Manager APIを使用
 */
actual class GoogleSignInHelper(
    private val context: GoogleSignInContext
) {
    private val credentialManager = CredentialManager.create(context.activity)

    companion object {
        // Firebase Console > Authentication > Sign-in method > Google > Web client ID
        private const val WEB_CLIENT_ID = "654534642431-654ak0n4ptob8r2qiu93keo6u1ics1qs.apps.googleusercontent.com"
    }

    /**
     * Googleでサインイン
     * @return Google ID Token
     */
    actual suspend fun signIn(): Result<String> {
        return try {
            // Nonceを生成（リプレイ攻撃対策）
            val nonce = generateNonce()

            // Google ID Token Optionを作成
            val googleIdOption = GetGoogleIdOption.Builder()
                .setFilterByAuthorizedAccounts(false)
                .setServerClientId(WEB_CLIENT_ID)
                .setAutoSelectEnabled(false)
                .setNonce(nonce)
                .build()

            // Credential Requestを作成
            val request = GetCredentialRequest.Builder()
                .addCredentialOption(googleIdOption)
                .build()

            // Credentialを取得
            val response = credentialManager.getCredential(
                request = request,
                context = context.activity
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
