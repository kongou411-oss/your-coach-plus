package com.yourcoach.plus.shared.ui.screens.auth

import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
import com.yourcoach.plus.shared.auth.signInToFirebaseWithApple
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.UserRepository
import com.yourcoach.plus.shared.util.AppError
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * ナビゲーション先（1回だけ消費される）
 */
sealed class AuthNavTarget {
    data class Onboarding(val userId: String) : AuthNavTarget()
    object Main : AuthNavTarget()
}

/**
 * 認証画面の状態
 */
data class AuthUiState(
    val email: String = "",
    val password: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
    val emailError: String? = null,
    val passwordError: String? = null,
    val passwordResetSent: Boolean = false,
    // 規約同意ダイアログ
    val showTermsDialog: Boolean = false,
    // ナビゲーションイベント（1回消費）
    val navTarget: AuthNavTarget? = null
)

/**
 * 認証ScreenModel (Voyager)
 * ログイン・新規登録を1画面で統合処理
 */
class AuthScreenModel(
    private val authRepository: AuthRepository,
    private val userRepository: UserRepository
) : ScreenModel {

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    private val exceptionHandler = CoroutineExceptionHandler { _, throwable ->
        println("AuthScreenModel: Coroutine exception: ${throwable.message}")
        throwable.printStackTrace()
        _uiState.update { it.copy(isLoading = false, error = "エラーが発生しました: ${throwable.message}") }
    }

    // 保留中の新規ユーザー情報（規約同意ダイアログ用）
    private var pendingNewUserUid: String? = null
    private var pendingNewUserEmail: String = ""
    private var pendingNewUserDisplayName: String? = null
    private var pendingEmailSignUp: Boolean = false

    fun updateEmail(email: String) {
        _uiState.update { it.copy(email = email, emailError = null, error = null) }
    }

    fun updatePassword(password: String) {
        _uiState.update { it.copy(password = password, passwordError = null, error = null) }
    }

    /**
     * ナビゲーションイベントを消費
     */
    fun consumeNavTarget() {
        _uiState.update { it.copy(navTarget = null) }
    }

    /**
     * 認証成功時の共通処理 → ナビゲーションイベントを発火
     */
    private fun navigateAfterAuth(userId: String, needsOnboarding: Boolean) {
        val target = if (needsOnboarding) {
            AuthNavTarget.Onboarding(userId)
        } else {
            AuthNavTarget.Main
        }
        _uiState.update { it.copy(isLoading = false, navTarget = target) }
    }

    // ─── メール認証（統合） ───

    /**
     * メール/パスワードで認証
     * signIn試行 → 未登録なら規約同意ダイアログ → signUp
     */
    fun authenticateWithEmail() {
        if (!validateInput()) return

        screenModelScope.launch(exceptionHandler) {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val result = authRepository.signInWithEmail(
                _uiState.value.email,
                _uiState.value.password
            )

            result.fold(
                onSuccess = { user ->
                    val existingUser = userRepository.getUser(user.uid).getOrNull()
                    val needsOnboarding = existingUser?.profile?.onboardingCompleted != true
                    navigateAfterAuth(user.uid, needsOnboarding)
                },
                onFailure = { error ->
                    if (error is AppError.InvalidCredentials) {
                        // 未登録 → 規約同意ダイアログ
                        pendingEmailSignUp = true
                        _uiState.update { it.copy(isLoading = false, showTermsDialog = true) }
                    } else {
                        val message = when (error) {
                            is AppError.NetworkError -> "ネットワークエラーが発生しました"
                            is AppError.AccountDisabled -> "このアカウントは無効化されています"
                            else -> error.message ?: "ログインに失敗しました"
                        }
                        _uiState.update { it.copy(isLoading = false, error = message) }
                    }
                }
            )
        }
    }

    // ─── Google認証 ───

    fun signInWithGoogleToken(idToken: String) {
        screenModelScope.launch(exceptionHandler) {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val authResult = authRepository.signInWithGoogle(idToken)

            authResult.fold(
                onSuccess = { user ->
                    val getUserResult = userRepository.getUser(user.uid)
                    val existingUser = getUserResult.getOrNull()
                    // getUser失敗（ネットワークエラー等）も新規ユーザーとして扱う
                    // → 規約同意ダイアログを表示してcreateUserを確実に実行
                    val isNew = existingUser == null

                    if (isNew) {
                        println("AuthScreenModel: Google new user detected (uid=${user.uid}, getUserResult.isSuccess=${getUserResult.isSuccess})")
                        pendingNewUserUid = user.uid
                        pendingNewUserEmail = user.email
                        pendingNewUserDisplayName = user.displayName
                        _uiState.update { it.copy(isLoading = false, showTermsDialog = true) }
                        return@fold
                    }

                    val needsOnboarding = existingUser?.profile?.onboardingCompleted != true
                    navigateAfterAuth(user.uid, needsOnboarding)
                },
                onFailure = { error ->
                    val message = when (error) {
                        is AppError.Cancelled -> null
                        is AppError.NetworkError -> "ネットワークエラーが発生しました"
                        else -> error.message ?: "Googleログインに失敗しました"
                    }
                    _uiState.update { it.copy(isLoading = false, error = message) }
                }
            )
        }
    }

    // ─── Apple認証 ───

    fun signInWithAppleToken(idToken: String, nonce: String, fullName: String? = null) {
        screenModelScope.launch(exceptionHandler) {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val directAuthResult = signInToFirebaseWithApple(idToken, nonce, fullName)

            directAuthResult.fold(
                onSuccess = { uid ->
                    val getUserResult = userRepository.getUser(uid)
                    val existingUser = getUserResult.getOrNull()
                    // getUser失敗（ネットワークエラー等）も新規ユーザーとして扱う
                    val isNew = existingUser == null

                    if (isNew) {
                        println("AuthScreenModel: Apple new user detected (uid=$uid, getUserResult.isSuccess=${getUserResult.isSuccess})")
                        pendingNewUserUid = uid
                        pendingNewUserEmail = ""
                        pendingNewUserDisplayName = fullName
                        _uiState.update { it.copy(isLoading = false, showTermsDialog = true) }
                        return@fold
                    }

                    val needsOnboarding = existingUser?.profile?.onboardingCompleted != true
                    navigateAfterAuth(uid, needsOnboarding)
                },
                onFailure = { error ->
                    val message = when (error) {
                        is AppError.Cancelled -> null
                        is AppError.NetworkError -> "ネットワークエラーが発生しました"
                        else -> error.message ?: "Appleログインに失敗しました"
                    }
                    _uiState.update { it.copy(isLoading = false, error = message) }
                }
            )
        }
    }

    // ─── 規約同意ダイアログ ───

    fun acceptTermsAndCreateUser() {
        screenModelScope.launch(exceptionHandler) {
            _uiState.update { it.copy(isLoading = true, showTermsDialog = false) }
            println("AuthScreenModel: acceptTermsAndCreateUser called (pendingEmailSignUp=$pendingEmailSignUp, pendingUid=$pendingNewUserUid)")

            if (pendingEmailSignUp) {
                // メール新規登録
                val result = authRepository.signUpWithEmail(
                    _uiState.value.email,
                    _uiState.value.password
                )
                result.fold(
                    onSuccess = { user ->
                        println("AuthScreenModel: Email signUp success (uid=${user.uid})")
                        val createResult = userRepository.createUser(user.uid, user.email, user.displayName)
                        println("AuthScreenModel: createUser result: success=${createResult.isSuccess}")
                        clearPendingState()
                        navigateAfterAuth(user.uid, needsOnboarding = true)
                    },
                    onFailure = { error ->
                        println("AuthScreenModel: Email signUp failed: ${error.message}")
                        val message = when (error) {
                            is AppError.ValidationError -> error.message ?: "入力内容に問題があります"
                            is AppError.NetworkError -> "ネットワークエラーが発生しました"
                            else -> error.message ?: "アカウント作成に失敗しました"
                        }
                        clearPendingState()
                        _uiState.update { it.copy(isLoading = false, error = message) }
                    }
                )
            } else {
                // Google/Apple新規登録
                val uid = pendingNewUserUid
                if (uid == null) {
                    println("AuthScreenModel: ERROR pendingNewUserUid is null!")
                    clearPendingState()
                    _uiState.update { it.copy(isLoading = false, error = "エラーが発生しました") }
                    return@launch
                }

                println("AuthScreenModel: Creating user doc (uid=$uid, email=$pendingNewUserEmail)")
                val createResult = userRepository.createUser(uid, pendingNewUserEmail, pendingNewUserDisplayName)
                if (createResult.isFailure) {
                    println("AuthScreenModel: createUser FAILED: ${createResult.exceptionOrNull()?.message}")
                    try { authRepository.signOut() } catch (_: Exception) {}
                    clearPendingState()
                    _uiState.update { it.copy(isLoading = false, error = "アカウント作成に失敗しました") }
                    return@launch
                }

                println("AuthScreenModel: createUser SUCCESS, navigating to onboarding")
                clearPendingState()
                navigateAfterAuth(uid, needsOnboarding = true)
            }
        }
    }

    fun declineTerms() {
        screenModelScope.launch(exceptionHandler) {
            _uiState.update { it.copy(showTermsDialog = false, isLoading = true) }
            if (!pendingEmailSignUp) {
                try { authRepository.signOut() } catch (_: Exception) {}
            }
            clearPendingState()
            _uiState.update { it.copy(isLoading = false) }
        }
    }

    private fun clearPendingState() {
        pendingNewUserUid = null
        pendingNewUserEmail = ""
        pendingNewUserDisplayName = null
        pendingEmailSignUp = false
    }

    // ─── その他 ───

    fun sendPasswordResetEmail(onSuccess: () -> Unit) {
        val email = _uiState.value.email
        if (!isValidEmail(email)) {
            _uiState.update { it.copy(emailError = "正しいメールアドレスを入力してください") }
            return
        }
        screenModelScope.launch(exceptionHandler) {
            _uiState.update { it.copy(isLoading = true, error = null) }
            val result = authRepository.sendPasswordResetEmail(email)
            result.fold(
                onSuccess = {
                    _uiState.update { it.copy(isLoading = false, passwordResetSent = true) }
                    onSuccess()
                },
                onFailure = { error ->
                    _uiState.update { it.copy(isLoading = false, error = error.message ?: "メール送信に失敗しました") }
                }
            )
        }
    }

    fun clearError() { _uiState.update { it.copy(error = null) } }
    fun setError(message: String?) { _uiState.update { it.copy(error = message, isLoading = false) } }
    fun resetPasswordResetSent() { _uiState.update { it.copy(passwordResetSent = false) } }

    private fun validateInput(): Boolean {
        var isValid = true
        val state = _uiState.value
        if (!isValidEmail(state.email)) {
            _uiState.update { it.copy(emailError = "正しいメールアドレスを入力してください") }
            isValid = false
        }
        if (state.password.length < 6) {
            _uiState.update { it.copy(passwordError = "パスワードは6文字以上で入力してください") }
            isValid = false
        }
        return isValid
    }

    private fun isValidEmail(email: String): Boolean {
        val emailRegex = Regex("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")
        return emailRegex.matches(email)
    }
}
