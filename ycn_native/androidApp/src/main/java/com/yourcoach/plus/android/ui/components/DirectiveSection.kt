package com.yourcoach.plus.android.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Celebration
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.Bedtime
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.CheckCircleOutline
import androidx.compose.material.icons.outlined.Circle
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.material3.FilterChip
import androidx.compose.material3.IconButton
import com.yourcoach.plus.shared.domain.model.Directive
import com.yourcoach.plus.shared.domain.model.DirectiveActionItem
import com.yourcoach.plus.shared.domain.model.DirectiveActionType
import com.yourcoach.plus.android.ui.theme.Primary

/**
 * 指示書表示セクション（ワンタップ・クエスト方式）
 * チェックボックスをタップすると自動的に食事/運動が記録される
 */
@Composable
fun DirectiveSection(
    directive: Directive?,
    onComplete: () -> Unit,
    onEdit: () -> Unit,
    onExecuteItem: (DirectiveActionItem) -> Unit = {},
    onExecuteItemWithEdit: (DirectiveActionItem, String) -> Unit = { _, _ -> }, // 編集後の実行
    onUndoItem: (DirectiveActionItem) -> Unit = {}, // 完了取り消し
    onCompleteAll: () -> Unit = {}, // 全て完了
    executedItems: Set<Int> = emptySet(),
    editedTexts: Map<Int, String> = emptyMap(), // アイテムごとの編集済みテキスト
    isExecuting: Boolean = false,
    modifier: Modifier = Modifier
) {
    // 編集ダイアログの状態
    var editingItem by remember { mutableStateOf<DirectiveActionItem?>(null) }
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            if (directive != null) {
                val actionItems = directive.getActionItems()
                val executableItems = actionItems.filter { it.actionType != DirectiveActionType.ADVICE }
                val completedCount = executedItems.size
                val totalCount = executableItems.size
                val allCompleted = totalCount > 0 && completedCount >= totalCount

                // ヘッダー（クエスト風）
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    // アイコン（完了時は星）
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .background(
                                if (allCompleted || directive.completed)
                                    Brush.linearGradient(listOf(Color(0xFFFFD700), Color(0xFFFFA500)))
                                else
                                    Brush.linearGradient(listOf(Primary, Primary.copy(alpha = 0.7f)))
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = if (allCompleted || directive.completed) Icons.Default.Star else Icons.Default.Flag,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = "今日のクエスト",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        if (totalCount > 0) {
                            Text(
                                text = "$completedCount / $totalCount 完了",
                                style = MaterialTheme.typography.bodySmall,
                                color = if (allCompleted) Color(0xFF22C55E) else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    Spacer(modifier = Modifier.weight(1f))

                    // 完了済みバッジ
                    if (directive.completed || allCompleted) {
                        Surface(
                            color = Color(0xFF22C55E).copy(alpha = 0.1f),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    tint = Color(0xFF22C55E),
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "完了",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Color(0xFF22C55E),
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // 全完了時のお祝いメッセージ
                AnimatedVisibility(
                    visible = allCompleted && !directive.completed,
                    enter = fadeIn() + scaleIn(),
                    exit = fadeOut()
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(
                                Brush.horizontalGradient(
                                    listOf(
                                        Color(0xFFFFD700).copy(alpha = 0.15f),
                                        Color(0xFFFFA500).copy(alpha = 0.15f)
                                    )
                                ),
                                RoundedCornerShape(12.dp)
                            )
                            .padding(16.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Celebration,
                                contentDescription = null,
                                tint = Color(0xFFFFD700),
                                modifier = Modifier.size(28.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(
                                    text = "クエストコンプリート!",
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFFB8860B)
                                )
                                Text(
                                    text = "今日の目標を達成しました",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color(0xFFB8860B).copy(alpha = 0.8f)
                                )
                            }
                        }
                    }
                }

                if (allCompleted && !directive.completed) {
                    Spacer(modifier = Modifier.height(12.dp))
                }

                // クエストリスト（チェックボックス形式）
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(
                            width = 2.dp,
                            color = if (directive.completed || allCompleted) Color(0xFF22C55E) else Primary,
                            shape = RoundedCornerShape(12.dp)
                        )
                        .background(
                            color = if (directive.completed || allCompleted)
                                Color(0xFF22C55E).copy(alpha = 0.05f)
                            else
                                Color.Transparent,
                            shape = RoundedCornerShape(12.dp)
                        )
                        .padding(12.dp)
                ) {
                    Column(
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        actionItems.forEach { item ->
                            val isItemExecuted = executedItems.contains(item.index)
                            val displayText = editedTexts[item.index] ?: item.originalText

                            QuestItemRow(
                                item = item,
                                displayText = displayText,
                                isEdited = editedTexts.containsKey(item.index),
                                isExecuted = isItemExecuted,
                                isExecuting = isExecuting,
                                onToggle = {
                                    if (item.actionType != DirectiveActionType.ADVICE) {
                                        if (isItemExecuted) {
                                            // 完了済み → 取り消し
                                            onUndoItem(item)
                                        } else {
                                            // 完了
                                            onExecuteItem(item)
                                        }
                                    }
                                },
                                onEditClick = {
                                    if (!isItemExecuted && item.actionType != DirectiveActionType.ADVICE) {
                                        editingItem = item
                                    }
                                }
                            )
                        }
                    }
                }

                // クエストアイテム編集ダイアログ
                editingItem?.let { item ->
                    QuestItemEditDialog(
                        item = item,
                        currentText = editedTexts[item.index] ?: item.originalText,
                        onDismiss = { editingItem = null },
                        onSave = { editedText ->
                            onExecuteItemWithEdit(item, editedText)
                            editingItem = null
                        }
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                // アクションボタン
                if (!directive.completed) {
                    Column(
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // メインボタン行
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedButton(
                                onClick = onEdit,
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Edit,
                                    contentDescription = null,
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("編集")
                            }

                            Button(
                                onClick = onComplete,
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (allCompleted) Color(0xFFFFD700) else Color(0xFF22C55E)
                                )
                            ) {
                                Icon(
                                    imageVector = if (allCompleted) Icons.Default.Star else Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(if (allCompleted) "クリア!" else "完了")
                            }
                        }

                        // 全て完了ボタン（未完了のアイテムがある場合のみ表示）
                        val uncompletedCount = executableItems.count { !executedItems.contains(it.index) }
                        if (uncompletedCount > 0 && !allCompleted) {
                            OutlinedButton(
                                onClick = onCompleteAll,
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.outlinedButtonColors(
                                    contentColor = Color(0xFF22C55E)
                                )
                            ) {
                                Icon(
                                    imageVector = Icons.Default.CheckCircleOutline,
                                    contentDescription = null,
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("全て完了 ($uncompletedCount 件)")
                            }
                        }
                    }
                }
            } else {
                // 指示書がない場合
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            modifier = Modifier
                                .size(56.dp)
                                .clip(CircleShape)
                                .background(Primary.copy(alpha = 0.1f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Flag,
                                contentDescription = null,
                                tint = Primary.copy(alpha = 0.5f),
                                modifier = Modifier.size(28.dp)
                            )
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = "今日のクエストがありません",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "AI分析を実行するとクエストが生成されます",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
                        )
                    }
                }
            }
        }
    }
}

/**
 * 指示書編集ダイアログ
 */
@Composable
fun DirectiveEditDialog(
    directive: Directive,
    onDismiss: () -> Unit,
    onSave: (String) -> Unit,
    onDelete: () -> Unit
) {
    var editedMessage by remember { mutableStateOf(directive.message) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("指示書を編集") },
        text = {
            Column {
                OutlinedTextField(
                    value = editedMessage,
                    onValueChange = { editedMessage = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("目標") },
                    placeholder = { Text("例: 鶏むね肉150g追加") },
                    minLines = 3,
                    maxLines = 5
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onSave(editedMessage.trim()) },
                enabled = editedMessage.isNotBlank()
            ) {
                Text("更新")
            }
        },
        dismissButton = {
            Row {
                TextButton(onClick = onDelete) {
                    Text("削除", color = MaterialTheme.colorScheme.error)
                }
                Spacer(modifier = Modifier.width(8.dp))
                TextButton(onClick = onDismiss) {
                    Text("キャンセル")
                }
            }
        }
    )
}

/**
 * クエストアイテム微調整ダイアログ
 * 「白米130g」→「白米100g」のような微調整に使用
 */
@Composable
fun QuestItemEditDialog(
    item: DirectiveActionItem,
    currentText: String,
    onDismiss: () -> Unit,
    onSave: (String) -> Unit
) {
    var editedText by remember { mutableStateOf(currentText) }

    // カテゴリごとの色（ダッシュボードと統一）
    val categoryColor = when (item.actionType) {
        DirectiveActionType.MEAL -> Primary                // 青（食事）
        DirectiveActionType.EXERCISE -> Color(0xFFFF9600)  // オレンジ（運動）= AccentOrange
        DirectiveActionType.CONDITION -> Color(0xFF9C27B0) // 紫（コンディション）
        DirectiveActionType.ADVICE -> Color.Gray
    }

    val categoryLabel = when (item.actionType) {
        DirectiveActionType.MEAL -> "食事"
        DirectiveActionType.EXERCISE -> "運動"
        DirectiveActionType.CONDITION -> "コンディション"
        DirectiveActionType.ADVICE -> "アドバイス"
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    color = categoryColor.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Text(
                        text = categoryLabel,
                        style = MaterialTheme.typography.labelSmall,
                        color = categoryColor,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                Text("内容を調整")
            }
        },
        text = {
            Column {
                Text(
                    text = "量や内容を微調整して記録できます",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(12.dp))

                // 元のテキスト表示
                Text(
                    text = "元の内容:",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = item.originalText,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                    textDecoration = if (editedText != item.originalText) TextDecoration.LineThrough else TextDecoration.None
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = editedText,
                    onValueChange = { editedText = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("調整後の内容") },
                    placeholder = { Text("例: 白米100g（8割）") },
                    singleLine = true
                )

                // クイック調整ボタン（量の微調整用）
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    listOf("8割", "半分", "少量").forEach { label ->
                        FilterChip(
                            onClick = {
                                editedText = "${item.originalText}（$label）"
                            },
                            label = { Text(label, style = MaterialTheme.typography.labelSmall) },
                            selected = false,
                            modifier = Modifier.height(28.dp)
                        )
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onSave(editedText.trim()) },
                enabled = editedText.isNotBlank(),
                colors = ButtonDefaults.buttonColors(containerColor = categoryColor)
            ) {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text("完了")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("キャンセル")
            }
        }
    )
}

/**
 * クエストアイテム行（チェックボックス形式）
 * タップするだけで自動的に食事/運動が記録される
 */
@Composable
private fun QuestItemRow(
    item: DirectiveActionItem,
    displayText: String = item.originalText,
    isEdited: Boolean = false,
    isExecuted: Boolean,
    isExecuting: Boolean,
    onToggle: () -> Unit,
    onEditClick: () -> Unit = {}
) {
    val isExecutable = item.actionType != DirectiveActionType.ADVICE

    // カテゴリごとの色（ダッシュボードと統一）
    val categoryColor = when (item.actionType) {
        DirectiveActionType.MEAL -> Primary                // 青（食事）
        DirectiveActionType.EXERCISE -> Color(0xFFFF9600)  // オレンジ（運動）= AccentOrange
        DirectiveActionType.CONDITION -> Color(0xFF9C27B0) // 紫（コンディション）
        DirectiveActionType.ADVICE -> Color.Gray
    }

    // カテゴリごとのアイコン
    val categoryIcon = when (item.actionType) {
        DirectiveActionType.MEAL -> Icons.Default.Restaurant
        DirectiveActionType.EXERCISE -> Icons.Default.FitnessCenter
        DirectiveActionType.CONDITION -> Icons.Default.Bedtime
        DirectiveActionType.ADVICE -> Icons.Default.Flag
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .clickable(enabled = isExecutable && !isExecuting) { onToggle() } // 完了済みでも再タップで取り消し可能
            .background(
                if (isExecuted) Color(0xFF22C55E).copy(alpha = 0.08f)
                else if (isExecutable) categoryColor.copy(alpha = 0.05f)
                else Color.Transparent
            )
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // チェックボックス（実行可能なアイテムのみ）
        if (isExecutable) {
            Box(
                modifier = Modifier
                    .size(24.dp)
                    .clip(CircleShape)
                    .background(
                        if (isExecuted) Color(0xFF22C55E)
                        else categoryColor.copy(alpha = 0.1f)
                    )
                    .border(
                        width = 2.dp,
                        color = if (isExecuted) Color(0xFF22C55E) else categoryColor,
                        shape = CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                if (isExecuting) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(14.dp),
                        strokeWidth = 2.dp,
                        color = categoryColor
                    )
                } else if (isExecuted) {
                    Icon(
                        imageVector = Icons.Default.CheckCircle,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp),
                        tint = Color.White
                    )
                }
            }
        } else {
            // アドバイスはアイコンのみ
            Icon(
                imageVector = categoryIcon,
                contentDescription = null,
                modifier = Modifier.size(20.dp),
                tint = categoryColor.copy(alpha = 0.6f)
            )
        }

        Spacer(modifier = Modifier.width(12.dp))

        // カテゴリアイコン（チェックボックスの右隣）
        if (isExecutable) {
            Icon(
                imageVector = categoryIcon,
                contentDescription = null,
                modifier = Modifier.size(18.dp),
                tint = if (isExecuted) Color(0xFF22C55E) else categoryColor
            )
            Spacer(modifier = Modifier.width(8.dp))
        }

        // テキスト
        Column(
            modifier = Modifier.weight(1f)
        ) {
            Text(
                text = displayText,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                color = if (isExecuted)
                    MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                else
                    MaterialTheme.colorScheme.onSurface,
                textDecoration = if (isExecuted) TextDecoration.LineThrough else TextDecoration.None
            )

            // 編集済み表示
            if (isEdited && isExecuted) {
                Text(
                    text = "（調整済み）",
                    style = MaterialTheme.typography.labelSmall,
                    color = Color(0xFFFF9800).copy(alpha = 0.8f)
                )
            } else if (isExecutable && !isExecuted) {
                // 実行可能な場合のヒント
                Text(
                    text = when (item.actionType) {
                        DirectiveActionType.MEAL -> "タップで完了 / 編集で調整"
                        DirectiveActionType.EXERCISE -> "タップで完了 / 編集で調整"
                        DirectiveActionType.CONDITION -> "タップで完了"
                        else -> ""
                    },
                    style = MaterialTheme.typography.labelSmall,
                    color = categoryColor.copy(alpha = 0.7f)
                )
            }
        }

        // 編集ボタン（未完了かつ実行可能な場合のみ）
        if (isExecutable && !isExecuted && !isExecuting) {
            IconButton(
                onClick = onEditClick,
                modifier = Modifier.size(32.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Edit,
                    contentDescription = "編集",
                    modifier = Modifier.size(18.dp),
                    tint = categoryColor.copy(alpha = 0.7f)
                )
            }
        }

        // 完了時のバッジ
        if (isExecuted) {
            Surface(
                color = Color(0xFF22C55E).copy(alpha = 0.1f),
                shape = RoundedCornerShape(4.dp)
            ) {
                Text(
                    text = "完了",
                    style = MaterialTheme.typography.labelSmall,
                    color = Color(0xFF22C55E),
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                )
            }
        }
    }
}
