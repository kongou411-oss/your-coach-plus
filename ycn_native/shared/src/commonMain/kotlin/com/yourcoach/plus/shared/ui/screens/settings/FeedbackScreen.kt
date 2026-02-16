package com.yourcoach.plus.shared.ui.screens.settings

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
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.yourcoach.plus.shared.ui.theme.AccentOrange
import com.yourcoach.plus.shared.ui.theme.Primary
import dev.gitlive.firebase.Firebase
import dev.gitlive.firebase.auth.auth
import dev.gitlive.firebase.functions.functions
import kotlinx.coroutines.launch

private enum class FeedbackType(
    val label: String,
    val icon: ImageVector,
    val placeholder: String,
    val color: Color
) {
    FEATURE_REQUEST(
        label = "機能リクエスト",
        icon = Icons.Default.Lightbulb,
        placeholder = "こんな機能がほしい、こうなったら便利、など何でもお書きください。",
        color = Color(0xFF4CAF50)
    ),
    BUG_REPORT(
        label = "バグ・不具合報告",
        icon = Icons.Default.BugReport,
        placeholder = "どの画面で、どんな操作をしたときに、何が起きたかを教えてください。",
        color = Color(0xFFEF5350)
    ),
    INQUIRY(
        label = "問い合わせ",
        icon = Icons.Default.Email,
        placeholder = "ご質問やお問い合わせ内容をお書きください。",
        color = Color(0xFF2196F3)
    )
}

class FeedbackScreen : Screen {

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    override fun Content() {
        val navigator = LocalNavigator.currentOrThrow
        var selectedType by remember { mutableStateOf<FeedbackType?>(null) }
        var feedbackText by remember { mutableStateOf("") }
        var isSending by remember { mutableStateOf(false) }
        var showSuccessDialog by remember { mutableStateOf(false) }
        val scope = rememberCoroutineScope()
        val snackbarHostState = remember { SnackbarHostState() }

        if (showSuccessDialog) {
            AlertDialog(
                onDismissRequest = { showSuccessDialog = false; navigator.pop() },
                title = { Text("送信完了") },
                text = { Text("フィードバックを送信しました。\nご協力ありがとうございます！") },
                confirmButton = {
                    TextButton(onClick = { showSuccessDialog = false; navigator.pop() }) {
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
                        IconButton(onClick = { navigator.pop() }) {
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
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Primary.copy(alpha = 0.1f)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("ご意見・ご要望をお聞かせください", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Primary)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("いただいたフィードバックは、アプリの改善に活用させていただきます。", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                Text("種類を選択", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(12.dp))

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    FeedbackType.entries.forEach { type ->
                        FeedbackTypeCard(type = type, isSelected = selectedType == type, onClick = { selectedType = type }, modifier = Modifier.weight(1f))
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                OutlinedTextField(
                    value = feedbackText,
                    onValueChange = { feedbackText = it },
                    modifier = Modifier.fillMaxWidth().height(200.dp),
                    placeholder = { Text(selectedType?.placeholder ?: "上から種類を選択してください") },
                    enabled = !isSending && selectedType != null,
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(8.dp))
                Text("${feedbackText.length} 文字", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.align(Alignment.End))

                Spacer(modifier = Modifier.height(24.dp))

                Button(
                    onClick = {
                        scope.launch {
                            isSending = true
                            try {
                                val user = Firebase.auth.currentUser
                                val userId = user?.uid
                                val userEmail = user?.email

                                if (userId == null) {
                                    snackbarHostState.showSnackbar("ログインが必要です")
                                    isSending = false
                                    return@launch
                                }

                                val typeLabel = when (selectedType!!) {
                                    FeedbackType.FEATURE_REQUEST -> "feature_request"
                                    FeedbackType.BUG_REPORT -> "bug_report"
                                    FeedbackType.INQUIRY -> "inquiry"
                                }

                                val functions = Firebase.functions("asia-northeast2")
                                val data = hashMapOf(
                                    "type" to typeLabel,
                                    "feedback" to feedbackText,
                                    "userId" to userId,
                                    "userEmail" to (userEmail ?: ""),
                                    "timestamp" to kotlinx.datetime.Clock.System.now().toEpochMilliseconds()
                                )
                                functions.httpsCallable("sendFeedback").invoke(data)
                                showSuccessDialog = true
                            } catch (e: Exception) {
                                snackbarHostState.showSnackbar("送信に失敗しました: ${e.message}")
                            } finally {
                                isSending = false
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth().height(56.dp),
                    enabled = selectedType != null && feedbackText.isNotBlank() && !isSending,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = AccentOrange)
                ) {
                    if (isSending) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp), color = MaterialTheme.colorScheme.onPrimary, strokeWidth = 2.dp)
                    } else {
                        Icon(Icons.AutoMirrored.Filled.Send, contentDescription = null, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("送信", fontWeight = FontWeight.Bold)
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))
                Text("※ 個人情報は含めないでください", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

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
            .border(width = if (isSelected) 2.dp else 1.dp, color = borderColor, shape = RoundedCornerShape(12.dp))
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = backgroundColor),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(type.icon, contentDescription = null, tint = if (isSelected) type.color else MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(32.dp))
            Spacer(modifier = Modifier.height(8.dp))
            Text(type.label, style = MaterialTheme.typography.labelMedium, fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal, color = if (isSelected) type.color else MaterialTheme.colorScheme.onSurface)
        }
    }
}
