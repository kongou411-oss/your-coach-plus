package com.yourcoach.plus.shared.ui.screens.auth

import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.UserRepository
import com.yourcoach.plus.shared.util.AppError
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * 認証画面の状態
 */
data class AuthUiState(
    val email: String = "",
    val password: String = "",
    val confirmPassword: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
    val isLoggedIn: Boolean = false,
    val emailError: String? = null,
    val passwordError: String? = null,
    val isNewUser: Boolean = false,
    val userId: String? = null,
    val needsOnboarding: Boolean = false,
    val passwordResetSent: Boolean = false
)

/**
 * 認証ScreenModel (Voyager)
 */
class AuthScreenModel(
    private val authRepository: AuthRepository,
    private val userRepository: UserRepository
) : ScreenModel {

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    init {
        checkCurrentUser()
    }

    /**
     * 現在のログイン状態をチェック
     */
    private fun checkCurrentUser() {
        val currentUser = authRepository.getCurrentUser()
        if (currentUser != null) {
            _uiState.update { it.copy(isLoggedIn = true, userId = currentUser.uid) }
        }
    }

    /**
     * メールアドレスを更新
     */
    fun updateEmail(email: String) {
        _uiState.update {
            it.copy(
                email = email,
                emailError = null,
                error = null
            )
        }
    }

    /**
     * パスワードを更新
     */
    fun updatePassword(password: String) {
        _uiState.update {
            it.copy(
                password = password,
                passwordError = null,
                error = null
            )
        }
    }

    /**
     * 確認用パスワードを更新
     */
    fun updateConfirmPassword(confirmPassword: String) {
        _uiState.update { it.copy(confirmPassword = confirmPassword) }
    }

    /**
     * メール/パスワードでログイン
     */
    fun signInWithEmail(onSuccess: () -> Unit) {
        if (!validateInput()) return

        screenModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val result = authRepository.signInWithEmail(
                _uiState.value.email,
                _uiState.value.password
            )

            result.fold(
                onSuccess = { user ->
                    // ユーザー情報を取得してオンボーディング状態をチェック
                    val existingUser = userRepository.getUser(user.uid).getOrNull()
                    val needsOnboarding = existingUser?.profile?.onboardingCompleted != true

                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isLoggedIn = true,
                            isNewUser = false,
                            userId = user.uid,
                            needsOnboarding = needsOnboarding
                        )
                    }
                    onSuccess()
                },
                onFailure = { error ->
                    val message = when (error) {
                        is AppError.InvalidCredentials -> "メールアドレスまたはパスワードが正しくありません"
                        is AppError.NetworkError -> "ネットワークエラーが発生しました"
                        is AppError.AccountDisabled -> "このアカウントは無効化されています"
                        else -> error.message ?: "ログインに失敗しました"
                    }
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = message
                        )
                    }
                }
            )
        }
    }

    /**
     * Googleでログイン（IDトークンを受け取る）
     */
    fun signInWithGoogleToken(idToken: String, onSuccess: () -> Unit) {
        screenModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val authResult = authRepository.signInWithGoogle(idToken)

            authResult.fold(
                onSuccess = { user ->
                    // 既存ユーザーかチェック
                    val existingUser = userRepository.getUser(user.uid).getOrNull()
                    val isNew = existingUser == null

                    // 新規ユーザーの場合、Firestoreにドキュメント作成
                    if (isNew) {
                        userRepository.createUser(
                            userId = user.uid,
                            email = user.email,
                            displayName = user.displayName
                        )
                    }

                    val needsOnboarding = existingUser?.profile?.onboardingCompleted != true

                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isLoggedIn = true,
                            isNewUser = isNew,
                            userId = user.uid,
                            needsOnboarding = needsOnboarding
                        )
                    }
                    onSuccess()
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = error.message ?: "Googleログインに失敗しました"
                        )
                    }
                }
            )
        }
    }

    /**
     * メール/パスワードでサインアップ
     */
    fun signUpWithEmail(onSuccess: () -> Unit) {
        if (!validateInput(isSignUp = true)) return

        screenModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val result = authRepository.signUpWithEmail(
                _uiState.value.email,
                _uiState.value.password
            )

            result.fold(
                onSuccess = { user ->
                    // Firestoreにユーザードキュメントを作成
                    userRepository.createUser(
                        userId = user.uid,
                        email = user.email,
                        displayName = user.displayName
                    )

                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isLoggedIn = true,
                            isNewUser = true,
                            userId = user.uid,
                            needsOnboarding = true
                        )
                    }
                    onSuccess()
                },
                onFailure = { error ->
                    val message = when (error) {
                        is AppError.ValidationError -> error.message ?: "入力内容に問題があります"
                        is AppError.NetworkError -> "ネットワークエラーが発生しました"
                        else -> error.message ?: "アカウント作成に失敗しました"
                    }
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = message
                        )
                    }
                }
            )
        }
    }

    /**
     * パスワードリセットメールを送信
     */
    fun sendPasswordResetEmail(onSuccess: () -> Unit) {
        val email = _uiState.value.email
        if (!isValidEmail(email)) {
            _uiState.update { it.copy(emailError = "正しいメールアドレスを入力してください") }
            return
        }

        screenModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val result = authRepository.sendPasswordResetEmail(email)

            result.fold(
                onSuccess = {
                    _uiState.update { it.copy(isLoading = false, passwordResetSent = true) }
                    onSuccess()
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = error.message ?: "メール送信に失敗しました"
                        )
                    }
                }
            )
        }
    }

    /**
     * エラーをクリア
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    /**
     * 状態をリセット
     */
    fun resetState() {
        _uiState.update { AuthUiState() }
    }

    /**
     * パスワードリセット送信状態をリセット
     */
    fun resetPasswordResetSent() {
        _uiState.update { it.copy(passwordResetSent = false) }
    }

    /**
     * 入力バリデーション
     */
    private fun validateInput(isSignUp: Boolean = false): Boolean {
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

        if (isSignUp && state.password != state.confirmPassword) {
            _uiState.update { it.copy(passwordError = "パスワードが一致しません") }
            isValid = false
        }

        return isValid
    }

    /**
     * メールアドレスの形式チェック (KMP対応)
     */
    private fun isValidEmail(email: String): Boolean {
        val emailRegex = Regex("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")
        return emailRegex.matches(email)
    }
}
