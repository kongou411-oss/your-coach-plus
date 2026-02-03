package com.yourcoach.plus.android.ui.screens.settings

import android.util.Log
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.google.firebase.auth.ktx.auth
import com.google.firebase.functions.ktx.functions
import com.google.firebase.ktx.Firebase
import com.yourcoach.plus.android.ui.theme.Primary
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

/**
 * フィードバック画面
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeedbackScreen(
    onNavigateBack: () -> Unit
) {
    var feedbackText by remember { mutableStateOf("") }
    var isSending by remember { mutableStateOf(false) }
    var showSuccessDialog by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    // エラー表示
    LaunchedEffect(errorMessage) {
        errorMessage?.let {
            snackbarHostState.showSnackbar(it)
            errorMessage = null
        }
    }

    // 送信成功ダイアログ
    if (showSuccessDialog) {
        AlertDialog(
            onDismissRequest = {
                showSuccessDialog = false
                onNavigateBack()
            },
            title = { Text("送信完了") },
            text = { Text("フィードバックを送信しました。\nご協力ありがとうございます！") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showSuccessDialog = false
                        onNavigateBack()
                    }
                ) {
                    Text("OK")
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("フィードバック") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "戻る")
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            // 説明テキスト
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = Primary.copy(alpha = 0.1f)
                ),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp)
                ) {
                    Text(
                        text = "ご意見・ご要望をお聞かせください",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = Primary
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "いただいたフィードバックは、アプリの改善に活用させていただきます。",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // フィードバック入力欄
            OutlinedTextField(
                value = feedbackText,
                onValueChange = { feedbackText = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp),
                placeholder = {
                    Text("バグ報告、機能リクエスト、使いづらい点など、何でもお気軽にお書きください。")
                },
                enabled = !isSending,
                shape = RoundedCornerShape(12.dp)
            )

            Spacer(modifier = Modifier.height(8.dp))

            // 文字数カウント
            Text(
                text = "${feedbackText.length} 文字",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.align(Alignment.End)
            )

            Spacer(modifier = Modifier.height(24.dp))

            // 送信ボタン
            Button(
                onClick = {
                    scope.launch {
                        sendFeedback(
                            feedbackText = feedbackText,
                            onSending = { isSending = it },
                            onSuccess = { showSuccessDialog = true },
                            onError = { errorMessage = it }
                        )
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                enabled = feedbackText.isNotBlank() && !isSending,
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Primary)
            ) {
                if (isSending) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = MaterialTheme.colorScheme.onPrimary,
                        strokeWidth = 2.dp
                    )
                } else {
                    Icon(
                        Icons.AutoMirrored.Filled.Send,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("フィードバックを送信")
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 注意事項
            Text(
                text = "※ 個人情報は含めないでください",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/**
 * フィードバックを送信
 */
private suspend fun sendFeedback(
    feedbackText: String,
    onSending: (Boolean) -> Unit,
    onSuccess: () -> Unit,
    onError: (String) -> Unit
) {
    onSending(true)

    try {
        val userId = Firebase.auth.currentUser?.uid
        val userEmail = Firebase.auth.currentUser?.email

        if (userId == null) {
            onError("ログインが必要です")
            onSending(false)
            return
        }

        Log.d("Feedback", "Sending feedback: ${feedbackText.take(50)}...")

        val functions = Firebase.functions("asia-northeast2")
        val data = hashMapOf(
            "feedback" to feedbackText,
            "userId" to userId,
            "userEmail" to (userEmail ?: ""),
            "timestamp" to System.currentTimeMillis()
        )

        val result = functions
            .getHttpsCallable("sendFeedback")
            .call(data)
            .await()

        Log.d("Feedback", "Feedback sent successfully: ${result.data}")
        onSuccess()

    } catch (e: Exception) {
        Log.e("Feedback", "Failed to send feedback", e)
        onError("送信に失敗しました: ${e.message}")
    } finally {
        onSending(false)
    }
}
