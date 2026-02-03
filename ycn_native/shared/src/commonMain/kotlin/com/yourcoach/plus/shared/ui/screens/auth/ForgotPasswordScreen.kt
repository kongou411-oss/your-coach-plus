package com.yourcoach.plus.shared.ui.screens.auth

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.MarkEmailRead
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.koin.koinScreenModel
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.yourcoach.plus.shared.ui.theme.Primary

/**
 * パスワードリセット画面 (Compose Multiplatform)
 */
class ForgotPasswordScreen : Screen {

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    override fun Content() {
        val screenModel = koinScreenModel<AuthScreenModel>()
        val uiState by screenModel.uiState.collectAsState()
        val navigator = LocalNavigator.currentOrThrow
        val focusManager = LocalFocusManager.current
        val snackbarHostState = remember { SnackbarHostState() }
        var emailSent by remember { mutableStateOf(false) }

        LaunchedEffect(uiState.error) {
            uiState.error?.let { error ->
                snackbarHostState.showSnackbar(error)
                screenModel.clearError()
            }
        }

        // パスワードリセット送信成功
        LaunchedEffect(uiState.passwordResetSent) {
            if (uiState.passwordResetSent) {
                emailSent = true
                screenModel.resetPasswordResetSent()
            }
        }

        Scaffold(
            snackbarHost = { SnackbarHost(snackbarHostState) },
            topBar = {
                TopAppBar(
                    title = { Text("パスワードリセット") },
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
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Spacer(modifier = Modifier.height(48.dp))

                if (emailSent) {
                    // 送信完了画面
                    Icon(
                        imageVector = Icons.Default.MarkEmailRead,
                        contentDescription = null,
                        modifier = Modifier.size(80.dp),
                        tint = Primary
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    Text(
                        text = "メールを送信しました",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        text = "パスワードリセット用のリンクを\n${uiState.email}\nに送信しました。\n\nメールに記載されたリンクから\nパスワードを再設定してください。",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(32.dp))

                    Button(
                        onClick = { navigator.pop() },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Primary)
                    ) {
                        Text(
                            text = "ログイン画面に戻る",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    TextButton(
                        onClick = { emailSent = false }
                    ) {
                        Text("別のメールアドレスで試す", color = Primary)
                    }
                } else {
                    // メール入力画面
                    Icon(
                        imageVector = Icons.Default.Email,
                        contentDescription = null,
                        modifier = Modifier.size(80.dp),
                        tint = Primary
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    Text(
                        text = "パスワードをお忘れですか？",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        text = "登録したメールアドレスを入力してください。\nパスワードリセット用のリンクを送信します。",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(32.dp))

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
                            imeAction = ImeAction.Done
                        ),
                        keyboardActions = KeyboardActions(
                            onDone = {
                                focusManager.clearFocus()
                                screenModel.sendPasswordResetEmail { }
                            }
                        ),
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp)
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    Button(
                        onClick = { screenModel.sendPasswordResetEmail { } },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp),
                        enabled = !uiState.isLoading && uiState.email.isNotBlank(),
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
                                text = "リセットリンクを送信",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    }
}
