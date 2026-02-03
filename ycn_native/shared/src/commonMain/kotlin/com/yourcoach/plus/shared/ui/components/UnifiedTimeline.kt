package com.yourcoach.plus.shared.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.yourcoach.plus.shared.ui.screens.dashboard.*
import com.yourcoach.plus.shared.ui.theme.*

/**
 * Pro Cockpit UI - Zone 2: The Stream（統合タイムライン）
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

    val backgroundColor = when {
        isCurrent -> Primary.copy(alpha = 0.1f)
        isCompleted -> MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
        else -> MaterialTheme.colorScheme.surface
    }

    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable {
                if (isCompleted) isExpanded = !isExpanded
                else onClick()
            },
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = backgroundColor),
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
                Column(modifier = Modifier.weight(1f)) {
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
    val timeString = "${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}"

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
