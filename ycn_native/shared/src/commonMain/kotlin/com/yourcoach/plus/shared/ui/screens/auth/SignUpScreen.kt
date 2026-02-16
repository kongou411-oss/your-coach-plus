package com.yourcoach.plus.shared.ui.screens.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.koin.koinScreenModel
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.yourcoach.plus.shared.auth.AppleSignInButtonHandler
import com.yourcoach.plus.shared.auth.GoogleSignInButtonHandler
import com.yourcoach.plus.shared.auth.isAppleSignInAvailable
import com.yourcoach.plus.shared.ui.screens.main.MainScreen
import com.yourcoach.plus.shared.ui.screens.settings.LegalPageType
import com.yourcoach.plus.shared.ui.screens.settings.LegalWebViewScreen
import com.yourcoach.plus.shared.ui.theme.Primary

/**
 * 新規登録画面 (Compose Multiplatform)
 */
class SignUpScreen : Screen {

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    override fun Content() {
        val screenModel = koinScreenModel<AuthScreenModel>()
        val uiState by screenModel.uiState.collectAsState()
        val navigator = LocalNavigator.currentOrThrow
        val focusManager = LocalFocusManager.current
        val snackbarHostState = remember { SnackbarHostState() }
        var passwordVisible by remember { mutableStateOf(false) }
        var confirmPasswordVisible by remember { mutableStateOf(false) }
        var agreedToTerms by remember { mutableStateOf(false) }

        LaunchedEffect(uiState.error) {
            uiState.error?.let { error ->
                snackbarHostState.showSnackbar(error)
                screenModel.clearError()
            }
        }

        Scaffold(
            snackbarHost = { SnackbarHost(snackbarHostState) },
            topBar = {
                TopAppBar(
                    title = { Text("新規登録") },
                    navigationIcon = {
                        IconButton(onClick = { navigator.pop() }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, "戻る")
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = Color.Transparent
                    )
                )
            }
        ) { paddingValues ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .verticalScroll(rememberScrollState())
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // ロゴ
                Box(
                    modifier = Modifier
                        .size(80.dp)
                        .background(Primary, RoundedCornerShape(20.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "YC+",
                        style = MaterialTheme.typography.headlineMedium,
                        color = Color.White,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                Text(
                    text = "アカウントを作成",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold
                )

                Text(
                    text = "健康管理を始めましょう",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(modifier = Modifier.height(32.dp))

                // メールアドレス
                OutlinedTextField(
                    value = uiState.email,
                    onValueChange = screenModel::updateEmail,
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("メールアドレス") },
                    leadingIcon = { Icon(Icons.Default.Email, null) },
                    isError = uiState.emailError != null,
                    supportingText = uiState.emailError?.let { { Text(it) } },
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Email,
                        imeAction = ImeAction.Next
                    ),
                    keyboardActions = KeyboardActions(
                        onNext = { focusManager.moveFocus(FocusDirection.Down) }
                    ),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Primary,
                        focusedLabelColor = Primary
                    )
                )

                Spacer(modifier = Modifier.height(16.dp))

                // パスワード
                OutlinedTextField(
                    value = uiState.password,
                    onValueChange = screenModel::updatePassword,
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("パスワード") },
                    leadingIcon = { Icon(Icons.Default.Lock, null) },
                    trailingIcon = {
                        IconButton(onClick = { passwordVisible = !passwordVisible }) {
                            Icon(
                                if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                null
                            )
                        }
                    },
                    visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    isError = uiState.passwordError != null,
                    supportingText = { Text("6文字以上で入力してください") },
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Password,
                        imeAction = ImeAction.Next
                    ),
                    keyboardActions = KeyboardActions(
                        onNext = { focusManager.moveFocus(FocusDirection.Down) }
                    ),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Primary,
                        focusedLabelColor = Primary
                    )
                )

                Spacer(modifier = Modifier.height(16.dp))

                // パスワード確認
                OutlinedTextField(
                    value = uiState.confirmPassword,
                    onValueChange = screenModel::updateConfirmPassword,
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("パスワード（確認）") },
                    leadingIcon = { Icon(Icons.Default.Lock, null) },
                    trailingIcon = {
                        IconButton(onClick = { confirmPasswordVisible = !confirmPasswordVisible }) {
                            Icon(
                                if (confirmPasswordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                null
                            )
                        }
                    },
                    visualTransformation = if (confirmPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    isError = uiState.passwordError != null,
                    supportingText = uiState.passwordError?.let { { Text(it) } },
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Password,
                        imeAction = ImeAction.Done
                    ),
                    keyboardActions = KeyboardActions(
                        onDone = {
                            focusManager.clearFocus()
                            if (agreedToTerms) {
                                screenModel.signUpWithEmail {
                                    val state = screenModel.uiState.value
                                    handleSignUpSuccess(navigator, state.userId, state.needsOnboarding)
                                }
                            }
                        }
                    ),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Primary,
                        focusedLabelColor = Primary
                    )
                )

                Spacer(modifier = Modifier.height(24.dp))

                // 利用規約同意
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Checkbox(
                        checked = agreedToTerms,
                        onCheckedChange = { agreedToTerms = it },
                        colors = CheckboxDefaults.colors(checkedColor = Primary)
                    )
                    Text(
                        text = "利用規約",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary,
                        textDecoration = androidx.compose.ui.text.style.TextDecoration.Underline,
                        modifier = Modifier.clickable {
                            navigator.push(LegalWebViewScreen(LegalPageType.TERMS))
                        }
                    )
                    Text(
                        text = "と",
                        style = MaterialTheme.typography.bodySmall
                    )
                    Text(
                        text = "プライバシーポリシー",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary,
                        textDecoration = androidx.compose.ui.text.style.TextDecoration.Underline,
                        modifier = Modifier.clickable {
                            navigator.push(LegalWebViewScreen(LegalPageType.PRIVACY))
                        }
                    )
                    Text(
                        text = "に同意",
                        style = MaterialTheme.typography.bodySmall
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                // サインアップボタン
                Button(
                    onClick = {
                        screenModel.signUpWithEmail {
                            val state = screenModel.uiState.value
                            handleSignUpSuccess(navigator, state.userId, state.needsOnboarding)
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    enabled = !uiState.isLoading && agreedToTerms,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Primary)
                ) {
                    if (uiState.isLoading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(24.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text(
                            text = "アカウントを作成",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // 区切り線
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    HorizontalDivider(modifier = Modifier.weight(1f))
                    Text(
                        text = "または",
                        modifier = Modifier.padding(horizontal = 16.dp),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    HorizontalDivider(modifier = Modifier.weight(1f))
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Google登録ボタン
                GoogleSignInButtonHandler(
                    onSignInResult = { result ->
                        result.fold(
                            onSuccess = { idToken ->
                                screenModel.signInWithGoogleToken(idToken) {
                                    val state = screenModel.uiState.value
                                    handleSignUpSuccess(navigator, state.userId, state.needsOnboarding)
                                }
                            },
                            onFailure = { error ->
                                // キャンセル以外のエラーを日本語で表示
                                if (error !is com.yourcoach.plus.shared.util.AppError.Cancelled) {
                                    val message = when {
                                        error.message?.contains("初期化されていません") == true ->
                                            "Google Sign-Inの初期化に失敗しました"
                                        error.message?.contains("ViewController") == true ->
                                            "画面の読み込みに失敗しました。再度お試しください"
                                        else -> error.message ?: "Googleで登録に失敗しました"
                                    }
                                    screenModel.setError(message)
                                }
                            }
                        )
                    },
                    enabled = !uiState.isLoading
                ) { onClick ->
                    OutlinedButton(
                        onClick = onClick,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp),
                        enabled = !uiState.isLoading,
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(24.dp)
                                .background(
                                    color = MaterialTheme.colorScheme.surface,
                                    shape = RoundedCornerShape(4.dp)
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "G",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF4285F4)
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = "Googleで登録",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }

                // Apple Sign-In (iOS only)
                if (isAppleSignInAvailable()) {
                    Spacer(modifier = Modifier.height(12.dp))

                    AppleSignInButtonHandler(
                        onSignInResult = { result ->
                            result.fold(
                                onSuccess = { appleResult ->
                                    screenModel.signInWithAppleToken(
                                        idToken = appleResult.idToken,
                                        nonce = appleResult.nonce,
                                        fullName = appleResult.fullName
                                    ) {
                                        val state = screenModel.uiState.value
                                        handleSignUpSuccess(navigator, state.userId, state.needsOnboarding)
                                    }
                                },
                                onFailure = { error ->
                                    // キャンセル以外のエラーを日本語で表示
                                    if (error !is com.yourcoach.plus.shared.util.AppError.Cancelled) {
                                        val message = when {
                                            error.message?.contains("初期化されていません") == true ->
                                                "Apple Sign-Inの初期化に失敗しました"
                                            error.message?.contains("ViewController") == true ->
                                                "画面の読み込みに失敗しました。再度お試しください"
                                            else -> error.message ?: "Appleで登録に失敗しました"
                                        }
                                        screenModel.setError(message)
                                    }
                                }
                            )
                        },
                        enabled = !uiState.isLoading
                    ) { onClick ->
                        Button(
                            onClick = onClick,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(56.dp),
                            enabled = !uiState.isLoading,
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color.Black,
                                contentColor = Color.White
                            )
                        ) {
                            Text(
                                text = " Appleで登録",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // ログインへ
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "既にアカウントをお持ちの方は",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    TextButton(onClick = { navigator.pop() }) {
                        Text(
                            text = "ログイン",
                            fontWeight = FontWeight.Bold,
                            color = Primary
                        )
                    }
                }
            }
        }
    }

    private fun handleSignUpSuccess(
        navigator: cafe.adriel.voyager.navigator.Navigator,
        userId: String?,
        needsOnboarding: Boolean
    ) {
        if (needsOnboarding && userId != null) {
            navigator.replace(ProfileSetupScreen(userId))
        } else {
            navigator.replace(MainScreen())
        }
    }
}
