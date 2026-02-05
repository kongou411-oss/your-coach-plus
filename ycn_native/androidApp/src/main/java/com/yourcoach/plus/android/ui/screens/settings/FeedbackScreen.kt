package com.yourcoach.plus.android.ui.screens.settings

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.google.firebase.auth.ktx.auth
import com.google.firebase.functions.ktx.functions
import com.google.firebase.ktx.Firebase
import com.yourcoach.plus.android.ui.theme.AccentOrange
import com.yourcoach.plus.android.ui.theme.Primary
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

/**
 * フィードバックタイプ
 */
enum class FeedbackType(
    val label: String,
    val icon: ImageVector,
    val placeholder: String,
    val color: Color
) {
    FEATURE_REQUEST(
        label = "機能リクエスト・要望",
        icon = Icons.Default.Lightbulb,
        placeholder = "こんな機能がほしい、こうなったら便利、など何でもお書きください。",
        color = Color(0xFF4CAF50)
    ),
    BUG_REPORT(
        label = "バグ・不具合報告",
        icon = Icons.Default.BugReport,
        placeholder = "どの画面で、どんな操作をしたときに、何が起きたかを教えてください。",
        color = Color(0xFFEF5350)
    )
}

/**
 * フィードバック画面
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeedbackScreen(
    onNavigateBack: () -> Unit
) {
    var selectedType by remember { mutableStateOf<FeedbackType?>(null) }
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

            // フィードバックタイプ選択
            Text(
                text = "種類を選択",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                FeedbackType.entries.forEach { type ->
                    FeedbackTypeCard(
                        type = type,
                        isSelected = selectedType == type,
                        onClick = { selectedType = type },
                        modifier = Modifier.weight(1f)
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
                    Text(
                        selectedType?.placeholder
                            ?: "上から種類を選択してください"
                    )
                },
                enabled = !isSending && selectedType != null,
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
                            feedbackType = selectedType!!,
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
                enabled = selectedType != null && feedbackText.isNotBlank() && !isSending,
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = AccentOrange)
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
                    Text("送信", fontWeight = FontWeight.Bold)
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
 * フィードバックタイプ選択カード
 */
@Composable
private fun FeedbackTypeCard(
    type: FeedbackType,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val borderColor = if (isSelected) type.color else MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)
    val backgroundColor = if (isSelected) type.color.copy(alpha = 0.1f) else MaterialTheme.colorScheme.surface

    Card(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .border(
                width = if (isSelected) 2.dp else 1.dp,
                color = borderColor,
                shape = RoundedCornerShape(12.dp)
            )
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = backgroundColor),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = type.icon,
                contentDescription = null,
                tint = if (isSelected) type.color else MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(32.dp)
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = type.label,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                color = if (isSelected) type.color else MaterialTheme.colorScheme.onSurface
            )
        }
    }
}

/**
 * フィードバックを送信
 */
private suspend fun sendFeedback(
    feedbackType: FeedbackType,
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

        val typeLabel = when (feedbackType) {
            FeedbackType.FEATURE_REQUEST -> "feature_request"
            FeedbackType.BUG_REPORT -> "bug_report"
        }

        Log.d("Feedback", "Sending feedback [$typeLabel]: ${feedbackText.take(50)}...")

        val functions = Firebase.functions("asia-northeast2")
        val data = hashMapOf(
            "type" to typeLabel,
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
