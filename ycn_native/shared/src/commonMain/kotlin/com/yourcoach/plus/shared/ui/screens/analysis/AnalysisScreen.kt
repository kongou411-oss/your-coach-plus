package com.yourcoach.plus.shared.ui.screens.analysis

import kotlin.math.roundToInt
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.koin.koinScreenModel
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.yourcoach.plus.shared.domain.model.AnalysisResult
import com.yourcoach.plus.shared.domain.model.DailyScore
import com.yourcoach.plus.shared.domain.model.FitnessGoal
import com.yourcoach.plus.shared.domain.model.ImprovementPoint
import com.yourcoach.plus.shared.domain.model.Meal
import com.yourcoach.plus.shared.domain.model.QuestBridge
import com.yourcoach.plus.shared.domain.model.UserFacingSummary
import com.yourcoach.plus.shared.domain.model.TrainingCalorieBonus
import com.yourcoach.plus.shared.domain.model.UserProfile
import com.yourcoach.plus.shared.domain.repository.AnalysisReport
import com.yourcoach.plus.shared.domain.repository.ConversationEntry
import com.yourcoach.plus.shared.domain.repository.UserCreditInfo
import com.yourcoach.plus.shared.ui.theme.*

/**
 * AI分析画面 (Compose Multiplatform)
 */
class AnalysisScreen : Screen {

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    override fun Content() {
        val screenModel = koinScreenModel<AnalysisScreenModel>()
        val uiState by screenModel.uiState.collectAsState()
        val navigator = LocalNavigator.currentOrThrow
        val snackbarHostState = remember { SnackbarHostState() }
        var showAiConsentDialog by remember { mutableStateOf(false) }
        var pendingAiAction by remember { mutableStateOf<(() -> Unit)?>(null) }

        // AI同意ダイアログ
        if (showAiConsentDialog) {
            com.yourcoach.plus.shared.ui.components.AiConsentDialog(
                onConsent = {
                    showAiConsentDialog = false
                    screenModel.saveAiConsent()
                    pendingAiAction?.invoke()
                    pendingAiAction = null
                },
                onDecline = {
                    showAiConsentDialog = false
                    pendingAiAction = null
                }
            )
        }

        // AI操作の同意チェックラッパー
        fun requireAiConsent(action: () -> Unit) {
            if (uiState.aiDataConsent) {
                action()
            } else {
                pendingAiAction = action
                showAiConsentDialog = true
            }
        }

        // Error display
        LaunchedEffect(uiState.error) {
            uiState.error?.let { error ->
                snackbarHostState.showSnackbar(error)
                screenModel.clearError()
            }
        }

        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("AI分析") },
                    navigationIcon = {
                        IconButton(onClick = { navigator.pop() }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "戻る")
                        }
                    },
                    actions = {
                        // Credit display
                        uiState.creditInfo?.let { credit ->
                            Row(
                                modifier = Modifier
                                    .padding(end = 16.dp)
                                    .background(
                                        color = Primary.copy(alpha = 0.1f),
                                        shape = RoundedCornerShape(8.dp)
                                    )
                                    .padding(horizontal = 12.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Cr:",  // クレジット略称
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                // Free credits (blue)
                                Text(
                                    text = "${credit.freeCredits}",
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = if (credit.freeCredits > 0) Primary else Color.Gray
                                )
                                Text(
                                    text = "/",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(horizontal = 2.dp)
                                )
                                // Paid credits (orange)
                                Text(
                                    text = "${credit.paidCredits}",
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = if (credit.paidCredits > 0) AccentOrange else Color.Gray
                                )
                            }
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
            ) {
                // Tab UI
                TabRow(
                    selectedTabIndex = if (uiState.activeTab == AnalysisTab.ANALYSIS) 0 else 1
                ) {
                    Tab(
                        selected = uiState.activeTab == AnalysisTab.ANALYSIS,
                        onClick = { screenModel.switchTab(AnalysisTab.ANALYSIS) },
                        text = { Text("分析") }
                    )
                    Tab(
                        selected = uiState.activeTab == AnalysisTab.HISTORY,
                        onClick = { screenModel.switchTab(AnalysisTab.HISTORY) },
                        text = { Text("履歴") }
                    )
                }

                when (uiState.activeTab) {
                    AnalysisTab.ANALYSIS -> {
                        AnalysisContent(
                            uiState = uiState,
                            onGenerateAnalysis = { requireAiConsent { screenModel.generateAnalysis() } },
                            onSendQuestion = { requireAiConsent { screenModel.sendQuestion() } },
                            onUpdateQuestion = screenModel::updateQuestion,
                            onClearAnalysis = screenModel::clearAnalysis
                        )
                    }
                    AnalysisTab.HISTORY -> {
                        HistoryContent(
                            reports = uiState.savedReports,
                            selectedReport = uiState.selectedReport,
                            isLoading = uiState.isLoading,
                            onSelectReport = screenModel::selectReport,
                            onDeleteReport = screenModel::deleteReport
                        )
                    }
                }
            }
        }

    }
}

@Composable
private fun AnalysisContent(
    uiState: AnalysisUiState,
    onGenerateAnalysis: () -> Unit,
    onSendQuestion: (String) -> Unit,
    onUpdateQuestion: (String) -> Unit,
    onClearAnalysis: () -> Unit
) {
    val listState = rememberLazyListState()
    val conversationSize = uiState.conversationHistory.size
    val isQaLoading = uiState.isQaLoading

    // Auto-scroll to bottom when conversation updates or Q&A loading starts
    LaunchedEffect(conversationSize, isQaLoading) {
        if (conversationSize > 0 || isQaLoading) {
            val totalItems = listState.layoutInfo.totalItemsCount
            if (totalItems > 0) {
                listState.animateScrollToItem(totalItems - 1)
            }
        }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        // Analysis result display area
        LazyColumn(
            state = listState,
            modifier = Modifier
                .weight(1f)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Loading data
            if (uiState.isLoading) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surface
                        )
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            CircularProgressIndicator(color = Primary)
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = "データ読み込み中...",
                                style = MaterialTheme.typography.bodyLarge
                            )
                        }
                    }
                }
            }

            // Generate analysis button (when no analysis, after data load)
            if (!uiState.isLoading && uiState.aiAnalysis == null && !uiState.isAnalyzing) {
                item {
                    GenerateAnalysisCard(
                        creditInfo = uiState.creditInfo,
                        hasMeals = uiState.meals.isNotEmpty(),
                        hasWorkouts = uiState.workouts.isNotEmpty(),
                        hasCondition = uiState.condition != null,
                        isRestDay = uiState.isRestDay,
                        onGenerate = onGenerateAnalysis
                    )
                }
            }

            // Analyzing indicator
            if (uiState.isAnalyzing) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = Primary.copy(alpha = 0.1f)
                        )
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            CircularProgressIndicator(color = Primary)
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = "AIが分析中...",
                                style = MaterialTheme.typography.bodyLarge
                            )
                        }
                    }
                }
            }

            // Analysis result
            uiState.aiAnalysis?.let { analysis ->
                // Settings confirmation section (collapsible)
                item {
                    ProfileSettingsSection(
                        uiState = uiState
                    )
                }

                item {
                    Spacer(modifier = Modifier.height(8.dp))
                }

                val parsed = uiState.parsedAnalysis
                if (parsed != null) {
                    // セクション別カード型レポート
                    item { SummarySection(summary = parsed.userFacingSummary) }
                    if (parsed.goodPoints.isNotEmpty()) {
                        item { GoodPointsSection(points = parsed.goodPoints) }
                    }
                    if (parsed.improvementPoints.isNotEmpty()) {
                        item { ImprovementPointsSection(points = parsed.improvementPoints) }
                    }
                    item { QuestBridgeSection(bridge = parsed.questBridge) }
                } else {
                    // フォールバック: プレーンテキスト表示
                    item {
                        AnalysisResultCard(
                            analysis = analysis,
                            onClear = onClearAnalysis
                        )
                    }
                }

                // Conversation history
                items(uiState.conversationHistory) { entry ->
                    ConversationBubble(entry = entry)
                }

                // Q&A loading
                if (uiState.isQaLoading) {
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.Start
                        ) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(24.dp),
                                strokeWidth = 2.dp
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("回答を生成中...")
                        }
                    }
                }
            }
        }

        // Question input area (only when analysis exists)
        if (uiState.aiAnalysis != null) {
            QuestionInputBar(
                question = uiState.userQuestion,
                onQuestionChange = onUpdateQuestion,
                onSend = { onSendQuestion(uiState.userQuestion) },
                enabled = !uiState.isQaLoading && (uiState.creditInfo?.availableCredits ?: 0) > 0
            )
        }
    }
}

@Composable
private fun GenerateAnalysisCard(
    creditInfo: UserCreditInfo?,
    hasMeals: Boolean,
    hasWorkouts: Boolean,
    hasCondition: Boolean,
    isRestDay: Boolean = false,
    onGenerate: () -> Unit
) {
    // On rest days, workout record is not required
    val effectiveHasWorkouts = hasWorkouts || isRestDay
    val hasAllData = hasMeals && effectiveHasWorkouts && hasCondition
    val missingData = mutableListOf<String>()
    if (!hasMeals) missingData.add("食事")
    if (!effectiveHasWorkouts) missingData.add("運動")
    if (!hasCondition) missingData.add("コンディション")

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                Icons.Default.AutoAwesome,
                contentDescription = null,
                modifier = Modifier.size(48.dp),
                tint = Primary
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "AI分析",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "今日の食事・運動記録をAIが分析し\n改善点とアドバイスを提供します",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )

            // Missing data warning (recommendation message)
            if (!hasAllData) {
                Spacer(modifier = Modifier.height(12.dp))
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = Color(0xFFFFF3E0)  // Light orange
                    ),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.Info,
                            contentDescription = null,
                            tint = Color(0xFFFF9800),
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Column {
                            Text(
                                text = "すべての記録を完了してからの分析がおすすめです",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFFE65100)
                            )
                            Text(
                                text = "未記録: ${missingData.joinToString("、")}",
                                style = MaterialTheme.typography.labelSmall,
                                color = Color(0xFFFF9800)
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
            // Credit balance display
            creditInfo?.let { credit ->
                Row(
                    modifier = Modifier
                        .background(
                            color = Primary.copy(alpha = 0.1f),
                            shape = RoundedCornerShape(8.dp)
                        )
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = "クレジット残高:",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    // Free credits (blue)
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "${credit.freeCredits}",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = if (credit.freeCredits > 0) Primary else Color.Gray
                        )
                        Text(
                            text = "無料",
                            style = MaterialTheme.typography.labelSmall,
                            color = Primary
                        )
                    }
                    Text(
                        text = "+",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(horizontal = 8.dp)
                    )
                    // Paid credits (orange)
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "${credit.paidCredits}",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = if (credit.paidCredits > 0) AccentOrange else Color.Gray
                        )
                        Text(
                            text = "有料",
                            style = MaterialTheme.typography.labelSmall,
                            color = AccentOrange
                        )
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            Button(
                onClick = onGenerate,
                enabled = (creditInfo?.availableCredits ?: 0) > 0,
                colors = ButtonDefaults.buttonColors(containerColor = Primary),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
            ) {
                Icon(Icons.Default.PlayArrow, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("分析を生成（1クレジット）")
            }
            if ((creditInfo?.availableCredits ?: 0) <= 0) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "クレジットが不足しています",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "設定からクレジットを購入できます",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
private fun AnalysisResultCard(
    analysis: String,
    onClear: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "分析結果",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                IconButton(onClick = onClear) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = "閉じる",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = analysis,
                style = MaterialTheme.typography.bodyMedium,
                lineHeight = MaterialTheme.typography.bodyMedium.lineHeight * 1.5
            )
        }
    }
}

/**
 * 総括セクション（Primary背景）
 */
@Composable
private fun SummarySection(summary: UserFacingSummary) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = Primary.copy(alpha = 0.1f)
        ),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.AutoAwesome,
                    contentDescription = null,
                    tint = Primary,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "今日の総括",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = Primary
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = summary.readinessMessage,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Medium,
                lineHeight = MaterialTheme.typography.bodyLarge.lineHeight * 1.4
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = summary.mindsetReframing,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                lineHeight = MaterialTheme.typography.bodyMedium.lineHeight * 1.3
            )
        }
    }
}

/**
 * 良かった点セクション（AccentGreen）
 */
@Composable
private fun GoodPointsSection(points: List<String>) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.CheckCircle,
                    contentDescription = null,
                    tint = AccentGreen,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "良かった点",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = AccentGreen
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            points.forEach { point ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp)
                ) {
                    Icon(
                        Icons.Default.Check,
                        contentDescription = null,
                        tint = AccentGreen,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = point,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.weight(1f),
                        lineHeight = MaterialTheme.typography.bodyMedium.lineHeight * 1.3
                    )
                }
            }
        }
    }
}

/**
 * 伸びしろセクション（AccentOrange）
 */
@Composable
private fun ImprovementPointsSection(points: List<ImprovementPoint>) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                @Suppress("DEPRECATION")
                Icon(
                    Icons.Default.TrendingUp,
                    contentDescription = null,
                    tint = AccentOrange,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "伸びしろ",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = AccentOrange
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            points.forEachIndexed { index, item ->
                if (index > 0) {
                    Spacer(modifier = Modifier.height(8.dp))
                }
                Column(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.Top
                    ) {
                        @Suppress("DEPRECATION")
                        Icon(
                            Icons.Default.ArrowRight,
                            contentDescription = null,
                            tint = AccentOrange,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = item.point,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.weight(1f),
                            lineHeight = MaterialTheme.typography.bodyMedium.lineHeight * 1.3
                        )
                    }
                    if (item.suggestion.isNotBlank()) {
                        Text(
                            text = item.suggestion,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(start = 22.dp, top = 2.dp),
                            lineHeight = MaterialTheme.typography.bodySmall.lineHeight * 1.3
                        )
                    }
                }
            }
        }
    }
}

/**
 * 明日へのクエスト橋渡しセクション（Tertiary背景）
 */
@Composable
private fun QuestBridgeSection(bridge: QuestBridge) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = TertiaryContainer
        ),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                @Suppress("DEPRECATION")
                Icon(
                    Icons.Default.ArrowForward,
                    contentDescription = null,
                    tint = TertiaryDark,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "明日へ",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = TertiaryDark
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = bridge.message,
                style = MaterialTheme.typography.bodyMedium,
                color = OnTertiaryContainer,
                lineHeight = MaterialTheme.typography.bodyMedium.lineHeight * 1.3
            )
            if (bridge.closingCheer.isNotBlank()) {
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = bridge.closingCheer,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = Primary,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
    }
}

@Composable
private fun ConversationBubble(entry: ConversationEntry) {
    val isUser = entry.type == "user"
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
    ) {
        Card(
            modifier = Modifier.widthIn(max = 320.dp),
            colors = CardDefaults.cardColors(
                containerColor = if (isUser) Primary else MaterialTheme.colorScheme.surface
            ),
            shape = RoundedCornerShape(
                topStart = 16.dp,
                topEnd = 16.dp,
                bottomStart = if (isUser) 16.dp else 4.dp,
                bottomEnd = if (isUser) 4.dp else 16.dp
            ),
            elevation = CardDefaults.cardElevation(defaultElevation = if (isUser) 0.dp else 2.dp)
        ) {
            Text(
                text = entry.content,
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                color = if (isUser) Color.White else MaterialTheme.colorScheme.onSurface,
                style = MaterialTheme.typography.bodyMedium,
                lineHeight = MaterialTheme.typography.bodyMedium.lineHeight * 1.4
            )
        }
    }
}

@Composable
private fun QuestionInputBar(
    question: String,
    onQuestionChange: (String) -> Unit,
    onSend: () -> Unit,
    enabled: Boolean
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shadowElevation = 8.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = question,
                onValueChange = onQuestionChange,
                modifier = Modifier.weight(1f),
                placeholder = { Text("質問を入力...") },
                singleLine = true,
                enabled = enabled,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                keyboardActions = KeyboardActions(onSend = { if (question.isNotBlank()) onSend() }),
                shape = RoundedCornerShape(24.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            IconButton(
                onClick = onSend,
                enabled = enabled && question.isNotBlank()
            ) {
                Icon(
                    Icons.AutoMirrored.Filled.Send,
                    contentDescription = "送信",
                    tint = if (enabled && question.isNotBlank()) Primary else Color.Gray
                )
            }
        }
    }
}

@Composable
private fun HistoryContent(
    reports: List<AnalysisReport>,
    selectedReport: AnalysisReport?,
    isLoading: Boolean,
    onSelectReport: (AnalysisReport?) -> Unit,
    onDeleteReport: (String) -> Unit
) {
    if (isLoading) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator()
        }
    } else if (reports.isEmpty()) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                    Icons.Default.History,
                    contentDescription = null,
                    modifier = Modifier.size(48.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "保存されたレポートはありません",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    } else {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(reports) { report ->
                ReportCard(
                    report = report,
                    isSelected = selectedReport?.id == report.id,
                    onClick = { onSelectReport(if (selectedReport?.id == report.id) null else report) },
                    onDelete = { onDeleteReport(report.id) }
                )
            }
        }
    }
}

@Composable
private fun ReportCard(
    report: AnalysisReport,
    isSelected: Boolean,
    onClick: () -> Unit,
    onDelete: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) Primary.copy(alpha = 0.1f) else MaterialTheme.colorScheme.surface
        ),
        border = if (isSelected) BorderStroke(2.dp, Primary) else null
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = report.title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                IconButton(onClick = onDelete) {
                    Icon(
                        Icons.Default.Delete,
                        contentDescription = "削除",
                        tint = MaterialTheme.colorScheme.error
                    )
                }
            }
            Text(
                text = report.periodStart,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            if (isSelected) {
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = report.content,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }
    }
}

/**
 * プロフィール設定確認セクション（折りたたみ式）
 */
@Composable
private fun ProfileSettingsSection(
    uiState: AnalysisUiState
) {
    val userProfile = uiState.userProfile
    val score = uiState.score
    val meals = uiState.meals
    var isExpanded by remember { mutableStateOf(false) }

    // class加算を含む動的ターゲット計算
    val weight = userProfile?.weight ?: 70f
    val bodyFat = userProfile?.bodyFatPercentage ?: 20f
    val lbm = weight * (1 - bodyFat / 100f)
    val trainingBonus = TrainingCalorieBonus.fromSplitType(
        uiState.todaySplitType, uiState.isRestDay, lbm
    )
    val baseCalories = userProfile?.targetCalories ?: 2000
    val targetCalories = baseCalories + trainingBonus
    val pRatio = (userProfile?.proteinRatioPercent ?: 30) / 100f
    val fRatio = (userProfile?.fatRatioPercent ?: 25) / 100f
    val cRatio = (userProfile?.carbRatioPercent ?: 45) / 100f
    val targetP = (targetCalories * pRatio / 4f).roundToInt()
    val targetF = (targetCalories * fRatio / 9f).roundToInt()
    val targetC = (targetCalories * cRatio / 4f).roundToInt()

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { isExpanded = !isExpanded }
                .padding(12.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.Settings,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp),
                        tint = Primary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "分析に使用した設定",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Medium
                    )
                }
                Icon(
                    if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                    contentDescription = if (isExpanded) "閉じる" else "開く",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            // Collapsible content
            AnimatedVisibility(
                visible = isExpanded,
                enter = expandVertically(),
                exit = shrinkVertically()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Goal（プロフィール設定画面と統一）
                    val goalText = when (userProfile?.goal) {
                        FitnessGoal.LOSE_WEIGHT -> "ダイエット"
                        FitnessGoal.MAINTAIN -> "メンテナンス・リコンプ"
                        FitnessGoal.GAIN_MUSCLE -> "バルクアップ"
                        null -> "未設定"
                    }
                    SettingRow("目標", goalText)

                    // Target macros（class加算済み）
                    HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
                    Text(
                        text = if (trainingBonus > 0) "目標マクロ（トレ加算+${trainingBonus}kcal込み）"
                               else "目標マクロ",
                        style = MaterialTheme.typography.labelMedium,
                        color = Primary,
                        fontWeight = FontWeight.Bold
                    )
                    SettingRow("カロリー", "${targetCalories} kcal")
                    SettingRow("タンパク質", "${targetP} g")
                    SettingRow("脂質", "${targetF} g")
                    SettingRow("炭水化物", "${targetC} g")

                    // Actual results (from score or meal data)
                    HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
                    Text(
                        text = "本日の実績",
                        style = MaterialTheme.typography.labelMedium,
                        color = Color(0xFF22C55E),
                        fontWeight = FontWeight.Bold
                    )
                    val actualCal = score?.totalCalories ?: meals.sumOf { it.totalCalories }.toFloat()
                    val actualP = score?.totalProtein ?: meals.sumOf { it.totalProtein.roundToInt() }.toFloat()
                    val actualF = score?.totalFat ?: meals.sumOf { it.totalFat.roundToInt() }.toFloat()
                    val actualC = score?.totalCarbs ?: meals.sumOf { it.totalCarbs.roundToInt() }.toFloat()
                    SettingRow("カロリー", "${actualCal.roundToInt()} kcal")
                    SettingRow("タンパク質", "${actualP.roundToInt()} g")
                    SettingRow("脂質", "${actualF.roundToInt()} g")
                    SettingRow("炭水化物", "${actualC.roundToInt()} g")

                    // Meal settings
                    HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
                    Text(
                        text = "食事設定",
                        style = MaterialTheme.typography.labelMedium,
                        color = Primary,
                        fontWeight = FontWeight.Bold
                    )
                    SettingRow("食事回数", "${userProfile?.mealsPerDay ?: 3}回")
                    userProfile?.trainingAfterMeal?.let { meal ->
                        SettingRow("トレーニング", "食事${meal}の後")
                    }

                    // Pre/Post workout PFC
                    if (userProfile?.trainingAfterMeal != null) {
                        HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
                        Text(
                            text = "トレ前後PFC",
                            style = MaterialTheme.typography.labelMedium,
                            color = Color(0xFFFF9600),
                            fontWeight = FontWeight.Bold
                        )
                        SettingRow(
                            "トレ前",
                            "P${userProfile.preWorkoutProtein}g F${userProfile.preWorkoutFat}g C${userProfile.preWorkoutCarbs}g"
                        )
                        SettingRow(
                            "トレ後",
                            "P${userProfile.postWorkoutProtein}g F${userProfile.postWorkoutFat}g C${userProfile.postWorkoutCarbs}g"
                        )
                    }

                    // Budget & Cooking
                    HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
                    Text(
                        text = "AI学習設定",
                        style = MaterialTheme.typography.labelMedium,
                        color = Primary,
                        fontWeight = FontWeight.Bold
                    )
                    val budgetText = when (userProfile?.budgetTier) {
                        1 -> "節約"
                        2 -> "標準"
                        3 -> "ゆとり"
                        else -> "標準"
                    }
                    SettingRow("食費予算", budgetText)
                    userProfile?.favoriteFoods?.takeIf { it.isNotBlank() }?.let {
                        SettingRow("好きな食べ物", it)
                    }
                    userProfile?.ngFoods?.takeIf { it.isNotBlank() }?.let {
                        SettingRow("NG食材", it)
                    }
                }
            }
        }
    }
}

@Composable
private fun SettingRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodySmall,
            fontWeight = FontWeight.Medium
        )
    }
}
