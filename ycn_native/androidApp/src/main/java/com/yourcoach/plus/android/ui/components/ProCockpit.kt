package com.yourcoach.plus.android.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.yourcoach.plus.android.ui.screens.dashboard.*
import com.yourcoach.plus.android.ui.theme.*
import com.yourcoach.plus.shared.domain.model.Meal
import com.yourcoach.plus.shared.domain.model.RoutineDay
import com.yourcoach.plus.shared.domain.model.Workout

/**
 * =====================================================
 * Pro Cockpit UI - Zone 1: HUDヘッダー
 * =====================================================
 * 固定表示のコンパクトなヘッダー
 * - ルーティン（部位 + Day N）| カロリー
 * - PFCプログレスバー（3本・コンパクト）
 * - Micro+インジケーター（4つのバッジ）
 */
@Composable
fun HudHeader(
    routineDay: RoutineDay?,
    calories: Pair<Int, Int>,  // current to target
    protein: Pair<Float, Float>,  // current to target
    fat: Pair<Float, Float>,
    carbs: Pair<Float, Float>,
    microIndicators: List<MicroIndicator>,
    onMicroIndicatorClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // 最上段: ルーティン | スコア
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // ルーティン情報
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = if (routineDay != null) Icons.Default.FitnessCenter else Icons.Default.Hotel,
                        contentDescription = null,
                        tint = if (routineDay != null) Primary else MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (routineDay != null) {
                            "${routineDay.splitType} Day ${routineDay.dayNumber}"
                        } else {
                            "休養日"
                        },
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }

                // カロリー表示
                Surface(
                    color = ScoreCalories.copy(alpha = 0.15f),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "${calories.first}",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = ScoreCalories
                        )
                        Text(
                            text = "/${calories.second}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = "kcal",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // 中段: PFCプログレスバー
            PfcProgressBars(
                protein = protein,
                fat = fat,
                carbs = carbs
            )

            Spacer(modifier = Modifier.height(12.dp))

            // 下段: Micro+インジケーター
            MicroIndicatorRow(
                indicators = microIndicators,
                onClick = onMicroIndicatorClick
            )
        }
    }
}

/**
 * スコアに応じた色を返す
 */
private fun getScoreColor(score: Int): Color {
    return when {
        score >= 80 -> Color(0xFF4CAF50)  // Green
        score >= 60 -> Primary             // Blue
        score >= 40 -> Color(0xFFFFB300)   // Amber
        else -> Color(0xFFE53935)          // Red
    }
}

/**
 * PFCプログレスバー（コンパクト3本）
 */
@Composable
private fun PfcProgressBars(
    protein: Pair<Float, Float>,
    fat: Pair<Float, Float>,
    carbs: Pair<Float, Float>,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        PfcProgressBar(
            label = "P",
            current = protein.first,
            target = protein.second,
            color = ScoreProtein
        )
        PfcProgressBar(
            label = "F",
            current = fat.first,
            target = fat.second,
            color = ScoreFat
        )
        PfcProgressBar(
            label = "C",
            current = carbs.first,
            target = carbs.second,
            color = ScoreCarbs
        )
    }
}

/**
 * 単一のPFCプログレスバー
 */
@Composable
private fun PfcProgressBar(
    label: String,
    current: Float,
    target: Float,
    color: Color,
    modifier: Modifier = Modifier
) {
    val progress by animateFloatAsState(
        targetValue = if (target > 0) (current / target).coerceIn(0f, 1.5f) else 0f,
        label = "pfcProgress"
    )

    // 小数点以下切り捨てで差分計算、1g以上超過で警告
    val difference = current.toInt() - target.toInt()
    val isOver = difference >= 1
    val displayColor by animateColorAsState(
        targetValue = if (isOver) ScoreOver else color,
        label = "pfcColor"
    )

    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // ラベル
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.Bold,
            color = displayColor,
            modifier = Modifier.width(16.dp)
        )

        Spacer(modifier = Modifier.width(8.dp))

        // プログレスバー
        Box(
            modifier = Modifier
                .weight(1f)
                .height(8.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(displayColor.copy(alpha = 0.2f))
        ) {
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(progress.coerceAtMost(1f))
                    .clip(RoundedCornerShape(4.dp))
                    .background(displayColor)
            )
        }

        Spacer(modifier = Modifier.width(8.dp))

        // 数値
        Text(
            text = "${current.toInt()}/${target.toInt()}g",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.width(70.dp)
        )
    }
}

/**
 * Micro+インジケーター行
 */
@Composable
fun MicroIndicatorRow(
    indicators: List<MicroIndicator>,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .clickable { onClick() }
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            .padding(8.dp),
        horizontalArrangement = Arrangement.SpaceEvenly
    ) {
        indicators.forEach { indicator ->
            MicroIndicatorBadge(indicator = indicator)
        }
    }
}

/**
 * 単一のMicro+インジケーターバッジ
 */
@Composable
private fun MicroIndicatorBadge(
    indicator: MicroIndicator,
    modifier: Modifier = Modifier
) {
    val (bgColor, textColor) = when (indicator.status) {
        IndicatorStatus.GOOD -> Color(0xFF4CAF50).copy(alpha = 0.15f) to Color(0xFF4CAF50)
        IndicatorStatus.WARNING -> Color(0xFFFFB300).copy(alpha = 0.15f) to Color(0xFFFFB300)
        IndicatorStatus.ALERT -> Color(0xFFE53935).copy(alpha = 0.15f) to Color(0xFFE53935)
    }

    val label = when (indicator.type) {
        MicroIndicatorType.DIAAS -> "DIAAS"
        MicroIndicatorType.FATTY_ACID -> "脂肪酸"
        MicroIndicatorType.FIBER -> "繊維"
        MicroIndicatorType.VITAMIN_MINERAL -> "V/M"
    }

    Surface(
        color = bgColor,
        shape = RoundedCornerShape(4.dp),
        modifier = modifier
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                color = textColor,
                fontWeight = FontWeight.Medium
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = indicator.label,
                style = MaterialTheme.typography.labelSmall,
                color = textColor,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

/**
 * =====================================================
 * Pro Cockpit UI - Zone 2: The Stream（統合タイムライン）
 * =====================================================
 */
@Composable
fun UnifiedTimeline(
    items: List<UnifiedTimelineItem>,
    currentTimeMinutes: Int,
    onItemClick: (UnifiedTimelineItem) -> Unit,
    onRecordClick: (UnifiedTimelineItem) -> Unit,
    modifier: Modifier = Modifier
) {
    val listState = rememberLazyListState()

    // 現在のアイテムにスクロール
    LaunchedEffect(items) {
        val currentIndex = items.indexOfFirst { it.status == TimelineItemStatus.CURRENT }
        if (currentIndex >= 0) {
            listState.animateScrollToItem(
                index = maxOf(0, currentIndex - 1),
                scrollOffset = 0
            )
        }
    }

    LazyColumn(
        state = listState,
        modifier = modifier.fillMaxWidth(),
        contentPadding = PaddingValues(vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        items(items, key = { it.id }) { item ->
            TimelineItemCard(
                item = item,
                currentTimeMinutes = currentTimeMinutes,
                onClick = { onItemClick(item) },
                onRecordClick = { onRecordClick(item) }
            )
        }
    }
}

/**
 * タイムラインアイテムカード
 */
@Composable
fun TimelineItemCard(
    item: UnifiedTimelineItem,
    currentTimeMinutes: Int,
    onClick: () -> Unit,
    onRecordClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val isCompleted = item.status == TimelineItemStatus.COMPLETED
    val isCurrent = item.status == TimelineItemStatus.CURRENT
    val isUpcoming = item.status == TimelineItemStatus.UPCOMING

    // 完了済みは折りたたみ表示
    var isExpanded by remember { mutableStateOf(!isCompleted) }

    // カスタムクエスト（トレーナー指定）はゴールド枠
    val isCustom = item.isCustomQuest
    val goldColor = Color(0xFFFFD700)

    val backgroundColor = when {
        isCustom && isCurrent -> goldColor.copy(alpha = 0.12f)
        isCustom -> goldColor.copy(alpha = 0.05f)
        isCurrent -> Primary.copy(alpha = 0.1f)
        isCompleted -> MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
        else -> MaterialTheme.colorScheme.surface
    }

    val cardBorder = if (isCustom) BorderStroke(2.dp, goldColor) else null

    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable {
                if (isCompleted) isExpanded = !isExpanded
                else onClick()
            },
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = backgroundColor),
        border = cardBorder,
        elevation = CardDefaults.cardElevation(
            defaultElevation = if (isCurrent) 4.dp else 1.dp
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // 時刻
                Text(
                    text = item.timeString,
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                    color = if (isCompleted) MaterialTheme.colorScheme.onSurfaceVariant
                            else MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.width(48.dp)
                )

                // アイコン（タイプ別）
                val icon = when (item.type) {
                    TimelineItemType.WORKOUT -> Icons.Default.FitnessCenter
                    TimelineItemType.CONDITION -> Icons.Default.Bedtime  // 睡眠アイコン
                    TimelineItemType.MEAL -> if (item.isTrainingRelated) Icons.Default.FlashOn else Icons.Default.Restaurant
                }

                // タイプ別カラー: 食事=緑, 運動=オレンジ, 睡眠=紫
                val typeColor = when (item.type) {
                    TimelineItemType.MEAL -> Color(0xFF4CAF50)  // 緑
                    TimelineItemType.WORKOUT -> AccentOrange   // オレンジ
                    TimelineItemType.CONDITION -> Color(0xFF9C27B0)  // 紫
                }
                val iconColor = when {
                    isCompleted -> MaterialTheme.colorScheme.onSurfaceVariant
                    else -> typeColor
                }

                Box(
                    modifier = Modifier
                        .size(28.dp)
                        .clip(CircleShape)
                        .background(iconColor.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center
                ) {
                    if (isCompleted) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = Color(0xFF4CAF50),
                            modifier = Modifier.size(18.dp)
                        )
                    } else {
                        Icon(
                            imageVector = icon,
                            contentDescription = null,
                            tint = iconColor,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.width(12.dp))

                // タイトル
                var showDetailDialog by remember { mutableStateOf(false) }
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .clickable { showDetailDialog = true }
                ) {
                    Text(
                        text = item.title,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Medium,
                        color = if (isCompleted) MaterialTheme.colorScheme.onSurfaceVariant
                                else MaterialTheme.colorScheme.onSurface,
                        textDecoration = if (isCompleted) TextDecoration.LineThrough else TextDecoration.None,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )

                    // サブタイトル（展開時のみ、または現在/未来）
                    if (item.subtitle != null && (isExpanded || !isCompleted)) {
                        Text(
                            text = item.subtitle,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = if (isExpanded) 3 else 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                // 詳細全文ダイアログ
                if (showDetailDialog) {
                    AlertDialog(
                        onDismissRequest = { showDetailDialog = false },
                        confirmButton = {
                            TextButton(onClick = { showDetailDialog = false }) {
                                Text("閉じる")
                            }
                        },
                        title = { Text(item.title) },
                        text = {
                            if (item.subtitle != null) {
                                Text(
                                    text = item.subtitle,
                                    style = MaterialTheme.typography.bodyMedium
                                )
                            }
                        }
                    )
                }

                // 記録ボタン（未完了のアイテムすべてに表示）
                if (!isCompleted && !item.isRecorded) {
                    Spacer(modifier = Modifier.width(8.dp))

                    // ボタンの色をタイプ別に変更（食事=緑, 運動=オレンジ, 睡眠=紫）
                    val buttonColor = when (item.type) {
                        TimelineItemType.MEAL -> Color(0xFF4CAF50)  // 緑
                        TimelineItemType.WORKOUT -> AccentOrange   // オレンジ
                        TimelineItemType.CONDITION -> Color(0xFF9C27B0)  // 紫
                    }

                    Button(
                        onClick = onRecordClick,
                        colors = ButtonDefaults.buttonColors(containerColor = buttonColor),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                        modifier = Modifier.height(32.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = Color.White
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "完了",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                // 完了済みの折りたたみアイコン
                if (isCompleted) {
                    Icon(
                        imageVector = if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}

/**
 * 現在時刻ライン
 */
@Composable
fun CurrentTimeDivider(
    currentTimeMinutes: Int,
    modifier: Modifier = Modifier
) {
    val hours = currentTimeMinutes / 60
    val minutes = currentTimeMinutes % 60
    val timeString = "%02d:%02d".format(hours, minutes)

    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        HorizontalDivider(
            modifier = Modifier.weight(1f),
            color = Primary,
            thickness = 2.dp
        )

        Surface(
            color = Primary,
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.padding(horizontal = 8.dp)
        ) {
            Text(
                text = "現在 $timeString",
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
            )
        }

        HorizontalDivider(
            modifier = Modifier.weight(1f),
            color = Primary,
            thickness = 2.dp
        )
    }
}

/**
 * =====================================================
 * Pro Cockpit UI - Zone 3: Command Center（フッター）
 * =====================================================
 */
@Composable
fun CommandFooter(
    onAnalysisClick: () -> Unit,
    onGenerateQuestClick: () -> Unit,
    isGeneratingQuest: Boolean,
    hasCustomQuest: Boolean = false,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 8.dp,
        shadowElevation = 8.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            // 分析ボタン
            OutlinedButton(
                onClick = onAnalysisClick,
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Analytics,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Column {
                    Text(
                        text = "分析",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "夜に実行",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            // 明日の指示書ボタン（カスタムクエスト時は無効化）
            if (hasCustomQuest) {
                Button(
                    onClick = {},
                    enabled = false,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFFFFD700),
                        disabledContainerColor = Color(0xFFFFD700).copy(alpha = 0.6f)
                    )
                ) {
                    Icon(
                        imageVector = Icons.Default.Star,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp),
                        tint = Color.White
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text(
                            text = "トレーナープラン",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            text = "実行中",
                            style = MaterialTheme.typography.labelSmall,
                            color = Color.White.copy(alpha = 0.8f)
                        )
                    }
                }
            } else {
                Button(
                    onClick = onGenerateQuestClick,
                    enabled = !isGeneratingQuest,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = AccentOrange)
                ) {
                    if (isGeneratingQuest) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(18.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Icon(
                            imageVector = Icons.Default.AutoAwesome,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text(
                            text = "明日の指示書",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            text = "クエスト生成",
                            style = MaterialTheme.typography.labelSmall,
                            color = Color.White.copy(alpha = 0.8f)
                        )
                    }
                }
            }
        }
    }
}

/**
 * =====================================================
 * Micro+詳細BottomSheet
 * =====================================================
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MicroDetailSheet(
    averageDiaas: Float,
    fattyAcidBalance: FattyAcidBalance,
    glData: GlData,
    fiberData: FiberData,
    vitaminScores: Map<String, Float>,
    mineralScores: Map<String, Float>,
    onDismiss: () -> Unit
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.9f)  // 画面高さの90%まで
                .verticalScroll(rememberScrollState())  // スクロール追加
                .padding(horizontal = 16.dp)
                .padding(bottom = 32.dp)
        ) {
            Text(
                text = "ミクロ+ 詳細",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            // 既存のDetailedNutritionSectionの内容を再利用（BottomSheetでは常に展開）
            DetailedNutritionSection(
                isPremium = true,
                averageDiaas = averageDiaas,
                fattyAcidBalance = fattyAcidBalance,
                glData = glData,
                fiberData = fiberData,
                vitaminScores = vitaminScores,
                mineralScores = mineralScores,
                onUpgradeClick = {},
                alwaysExpanded = true  // BottomSheetでは折りたたみ不要
            )
        }
    }
}
