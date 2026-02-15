package com.yourcoach.plus.shared.ui.screens.auth

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.painterResource
import com.yourcoach.plus.shared.generated.resources.Res
import com.yourcoach.plus.shared.generated.resources.icon_512
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.koin.koinScreenModel
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.yourcoach.plus.shared.auth.AppleSignInButtonHandler
import com.yourcoach.plus.shared.auth.GoogleSignInButtonHandler
import com.yourcoach.plus.shared.auth.isAppleSignInAvailable
import com.yourcoach.plus.shared.ui.screens.main.MainScreen
import com.yourcoach.plus.shared.ui.theme.Primary

/**
 * ログイン画面 (Compose Multiplatform)
 */
class LoginScreen : Screen {

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    override fun Content() {
        val screenModel = koinScreenModel<AuthScreenModel>()
        val uiState by screenModel.uiState.collectAsState()
        val navigator = LocalNavigator.currentOrThrow
        val focusManager = LocalFocusManager.current
        val snackbarHostState = remember { SnackbarHostState() }
        var passwordVisible by remember { mutableStateOf(false) }

        // エラー表示
        LaunchedEffect(uiState.error) {
            uiState.error?.let { error ->
                snackbarHostState.showSnackbar(error)
                screenModel.clearError()
            }
        }

        Scaffold(
            snackbarHost = { SnackbarHost(snackbarHostState) }
        ) { paddingValues ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .verticalScroll(rememberScrollState())
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Spacer(modifier = Modifier.height(48.dp))

                // ロゴ
                Image(
                    painter = painterResource(Res.drawable.icon_512),
                    contentDescription = "Your Coach+",
                    modifier = Modifier
                        .size(100.dp)
                        .clip(RoundedCornerShape(24.dp))
                )

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = buildAnnotatedString {
                        withStyle(SpanStyle(color = MaterialTheme.colorScheme.onBackground)) {
                            append("Your Coach")
                        }
                        withStyle(SpanStyle(color = Color(0xFF4A9EFF))) {
                            append("+")
                        }
                    },
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold
                )

                Text(
                    text = "あなたの健康をサポート",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(modifier = Modifier.height(48.dp))

                // メールアドレス入力
                OutlinedTextField(
                    value = uiState.email,
                    onValueChange = screenModel::updateEmail,
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("メールアドレス") },
                    leadingIcon = {
                        Icon(Icons.Default.Email, contentDescription = null)
                    },
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

                // パスワード入力
                OutlinedTextField(
                    value = uiState.password,
                    onValueChange = screenModel::updatePassword,
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("パスワード") },
                    leadingIcon = {
                        Icon(Icons.Default.Lock, contentDescription = null)
                    },
                    trailingIcon = {
                        IconButton(onClick = { passwordVisible = !passwordVisible }) {
                            Icon(
                                imageVector = if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                contentDescription = if (passwordVisible) "パスワードを隠す" else "パスワードを表示"
                            )
                        }
                    },
                    visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    isError = uiState.passwordError != null,
                    supportingText = uiState.passwordError?.let { { Text(it) } },
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Password,
                        imeAction = ImeAction.Done
                    ),
                    keyboardActions = KeyboardActions(
                        onDone = {
                            focusManager.clearFocus()
                            screenModel.signInWithEmail {
                                val state = screenModel.uiState.value
                                handleLoginSuccess(navigator, state.userId, state.needsOnboarding)
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

                // パスワードを忘れた
                TextButton(
                    onClick = { navigator.push(ForgotPasswordScreen()) },
                    modifier = Modifier.align(Alignment.End)
                ) {
                    Text(
                        text = "パスワードをお忘れですか？",
                        color = Primary
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                // ログインボタン
                Button(
                    onClick = {
                        screenModel.signInWithEmail {
                            val state = screenModel.uiState.value
                            handleLoginSuccess(navigator, state.userId, state.needsOnboarding)
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    enabled = !uiState.isLoading,
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
                            text = "ログイン",
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
                    HorizontalDivider(
                        modifier = Modifier.weight(1f),
                        color = MaterialTheme.colorScheme.outline
                    )
                    Text(
                        text = "または",
                        modifier = Modifier.padding(horizontal = 16.dp),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    HorizontalDivider(
                        modifier = Modifier.weight(1f),
                        color = MaterialTheme.colorScheme.outline
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Googleログインボタン
                GoogleSignInButtonHandler(
                    onSignInResult = { result ->
                        result.fold(
                            onSuccess = { idToken ->
                                screenModel.signInWithGoogleToken(idToken) {
                                    val state = screenModel.uiState.value
                                    handleLoginSuccess(navigator, state.userId, state.needsOnboarding)
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
                                        else -> error.message ?: "Googleログインに失敗しました"
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
                            text = "Googleでログイン",
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
                                        handleLoginSuccess(navigator, state.userId, state.needsOnboarding)
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
                                            else -> error.message ?: "Appleログインに失敗しました"
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
                                text = " Appleでログイン",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.weight(1f))

                // サインアップへのリンク
                Row(
                    modifier = Modifier.padding(vertical = 16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "アカウントをお持ちでない方は",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    TextButton(onClick = { navigator.push(SignUpScreen()) }) {
                        Text(
                            text = "新規登録",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold,
                            color = Primary
                        )
                    }
                }
            }
        }
    }

    private fun handleLoginSuccess(
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
