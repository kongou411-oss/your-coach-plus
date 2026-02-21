package com.yourcoach.plus.shared.ui.screens.auth

import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
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
import com.yourcoach.plus.shared.ui.components.BrandIcons
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
import com.yourcoach.plus.shared.ui.components.TermsConsentDialog
import com.yourcoach.plus.shared.ui.screens.main.MainScreen
import com.yourcoach.plus.shared.ui.screens.settings.LegalPageType
import com.yourcoach.plus.shared.ui.screens.settings.LegalWebViewScreen
import com.yourcoach.plus.shared.ui.theme.Primary

/**
 * ログイン/新規登録 統合画面
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

        // ナビゲーションイベント（状態ベース・1回消費）
        LaunchedEffect(uiState.navTarget) {
            when (val target = uiState.navTarget) {
                is AuthNavTarget.Onboarding -> {
                    println("LoginScreen: Navigating to ProfileSetupScreen (userId=${target.userId})")
                    screenModel.consumeNavTarget()
                    navigator.replace(ProfileSetupScreen(target.userId))
                }
                is AuthNavTarget.Main -> {
                    println("LoginScreen: Navigating to MainScreen")
                    screenModel.consumeNavTarget()
                    navigator.replace(MainScreen())
                }
                null -> {}
            }
        }

        // エラー表示
        LaunchedEffect(uiState.error) {
            uiState.error?.let { error ->
                snackbarHostState.showSnackbar(error)
                screenModel.clearError()
            }
        }

        // 規約同意ダイアログ
        if (uiState.showTermsDialog) {
            TermsConsentDialog(
                onAccept = { screenModel.acceptTermsAndCreateUser() },
                onDecline = { screenModel.declineTerms() },
                onTermsClick = { navigator.push(LegalWebViewScreen(LegalPageType.TERMS)) },
                onPrivacyClick = { navigator.push(LegalWebViewScreen(LegalPageType.PRIVACY)) }
            )
        }

        Scaffold(
            snackbarHost = { SnackbarHost(snackbarHostState) }
        ) { paddingValues ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .clickable(
                        indication = null,
                        interactionSource = remember { MutableInteractionSource() }
                    ) { focusManager.clearFocus() }
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
                    text = "ログイン / 新規登録",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(modifier = Modifier.height(48.dp))

                // メールアドレス
                OutlinedTextField(
                    value = uiState.email,
                    onValueChange = screenModel::updateEmail,
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("メールアドレス") },
                    leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
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
                    leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                    trailingIcon = {
                        IconButton(onClick = { passwordVisible = !passwordVisible }) {
                            Icon(
                                imageVector = if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                contentDescription = null
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
                            screenModel.authenticateWithEmail()
                        }
                    ),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Primary,
                        focusedLabelColor = Primary
                    )
                )

                TextButton(
                    onClick = { navigator.push(ForgotPasswordScreen()) },
                    modifier = Modifier.align(Alignment.End)
                ) {
                    Text(text = "パスワードをお忘れですか？", color = Primary)
                }

                Spacer(modifier = Modifier.height(24.dp))

                // メインボタン
                Button(
                    onClick = { screenModel.authenticateWithEmail() },
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
                            text = "ログイン / 新規登録",
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
                    HorizontalDivider(modifier = Modifier.weight(1f), color = MaterialTheme.colorScheme.outline)
                    Text(
                        text = "または",
                        modifier = Modifier.padding(horizontal = 16.dp),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    HorizontalDivider(modifier = Modifier.weight(1f), color = MaterialTheme.colorScheme.outline)
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Google
                GoogleSignInButtonHandler(
                    onSignInResult = { result ->
                        result.fold(
                            onSuccess = { idToken ->
                                screenModel.signInWithGoogleToken(idToken)
                            },
                            onFailure = { error ->
                                if (error !is com.yourcoach.plus.shared.util.AppError.Cancelled) {
                                    screenModel.setError(error.message ?: "Googleログインに失敗しました")
                                }
                            }
                        )
                    },
                    enabled = !uiState.isLoading
                ) { onClick ->
                    OutlinedButton(
                        onClick = onClick,
                        modifier = Modifier.fillMaxWidth().height(56.dp),
                        enabled = !uiState.isLoading,
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Image(
                            imageVector = BrandIcons.Google,
                            contentDescription = "Google",
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = "Googleで続ける",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }

                // Apple (iOS only)
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
                                    )
                                },
                                onFailure = { error ->
                                    if (error !is com.yourcoach.plus.shared.util.AppError.Cancelled) {
                                        screenModel.setError(error.message ?: "Appleログインに失敗しました")
                                    }
                                }
                            )
                        },
                        enabled = !uiState.isLoading
                    ) { onClick ->
                        Button(
                            onClick = onClick,
                            modifier = Modifier.fillMaxWidth().height(56.dp),
                            enabled = !uiState.isLoading,
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color.Black,
                                contentColor = Color.White
                            )
                        ) {
                            Icon(
                                imageVector = BrandIcons.Apple,
                                contentDescription = null,
                                modifier = Modifier.size(20.dp),
                                tint = Color.White
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Appleで続ける",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }
            }
        }
    }
}
