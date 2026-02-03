package com.yourcoach.plus.shared.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.yourcoach.plus.shared.domain.model.Meal
import com.yourcoach.plus.shared.domain.model.MealType
import com.yourcoach.plus.shared.ui.screens.dashboard.GlRating
import com.yourcoach.plus.shared.ui.screens.dashboard.getGlRating
import com.yourcoach.plus.shared.ui.theme.*

/**
 * 食事リストセクション
 */
@Composable
fun MealListSection(
    meals: List<Meal>,
    glLimit: Float,
    onAddMealClick: () -> Unit,
    onEditMeal: (Meal) -> Unit,
    onDeleteMeal: (Meal) -> Unit,
    onSaveAsTemplate: (Meal) -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // ヘッダー
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Restaurant,
                        contentDescription = null,
                        tint = Primary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "今日の食事",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
                TextButton(onClick = onAddMealClick) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("追加")
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            if (meals.isEmpty()) {
                // 食事記録がない場合
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "まだ食事の記録がありません",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        TextButton(onClick = onAddMealClick) {
                            Text("食事を記録する")
                        }
                    }
                }
            } else {
                // 食事リスト
                meals.forEachIndexed { index, meal ->
                    MealCard(
                        meal = meal,
                        glLimitPerMeal = glLimit / 3f,
                        onEdit = { onEditMeal(meal) },
                        onDelete = { onDeleteMeal(meal) },
                        onSaveAsTemplate = { onSaveAsTemplate(meal) }
                    )
                    if (index < meals.size - 1) {
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                }
            }
        }
    }
}

/**
 * 食事カード（完全移植版）
 */
@Composable
private fun MealCard(
    meal: Meal,
    glLimitPerMeal: Float,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onSaveAsTemplate: () -> Unit
) {
    var expanded by remember { mutableStateOf(false) }

    // 入力元に応じたボーダー色
    val borderColor = when {
        meal.isPredicted -> Color(0xFF0EA5E9) // スカイブルー
        meal.isRoutine -> Color(0xFFF59E0B)   // アンバー
        meal.isTemplate -> Color(0xFF8B5CF6)  // パープル
        else -> Color.Transparent
    }

    // GL評価
    val glRating = getGlRating(meal.totalGL, glLimitPerMeal, meal.isPostWorkout)

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .then(
                if (borderColor != Color.Transparent) {
                    Modifier.border(2.dp, borderColor, RoundedCornerShape(12.dp))
                } else Modifier
            ),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp)
        ) {
            // 入力元タグ（予測、ルーティン、テンプレート）
            if (meal.isPredicted || meal.isRoutine || meal.isTemplate) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    if (meal.isPredicted) {
                        SourceTag(
                            text = "予測",
                            color = Color(0xFF0EA5E9),
                            icon = Icons.Default.Psychology
                        )
                    }
                    if (meal.isRoutine) {
                        SourceTag(
                            text = "ルーティン",
                            color = Color(0xFFF59E0B),
                            icon = Icons.Default.Repeat
                        )
                    }
                    if (meal.isTemplate) {
                        SourceTag(
                            text = "テンプレート",
                            color = Color(0xFF8B5CF6),
                            icon = Icons.Default.ContentCopy
                        )
                    }
                }
                Spacer(modifier = Modifier.height(4.dp))
            }

            // GLタグ + 運動後タグ
            if (meal.isPostWorkout || meal.totalGL > 0) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    if (meal.isPostWorkout) {
                        SourceTag(
                            text = "運動後",
                            color = Color(0xFFEA580C),
                            icon = Icons.Default.FitnessCenter
                        )
                    }
                    if (meal.totalGL > 0) {
                        GlTag(gl = meal.totalGL, rating = glRating)
                    }
                }
                Spacer(modifier = Modifier.height(4.dp))
            }

            // 食事名とカロリー
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { expanded = !expanded },
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    // 食事タイプアイコン
                    Icon(
                        imageVector = if (meal.type == MealType.SUPPLEMENT)
                            Icons.Default.Medication else Icons.Default.Restaurant,
                        contentDescription = null,
                        tint = Primary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Icon(
                        imageVector = if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = meal.name ?: when (meal.type) {
                            MealType.BREAKFAST -> "朝食"
                            MealType.LUNCH -> "昼食"
                            MealType.DINNER -> "夕食"
                            MealType.SNACK -> "間食"
                            MealType.SUPPLEMENT -> "サプリ"
                        },
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "${meal.totalCalories}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = Primary
                    )
                    Text(
                        text = "kcal",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // 展開時のアイテムリスト
            AnimatedVisibility(visible = expanded) {
                Column(modifier = Modifier.padding(start = 24.dp, top = 8.dp)) {
                    meal.items.forEach { item ->
                        Text(
                            text = "${item.name} ${item.amount.toInt()}${item.unit}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            // 非展開時は3件まで表示
            if (!expanded && meal.items.isNotEmpty()) {
                Spacer(modifier = Modifier.height(4.dp))
                meal.items.take(3).forEach { item ->
                    Text(
                        text = "・${item.name} (${item.amount.toInt()}${item.unit})",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1
                    )
                }
                if (meal.items.size > 3) {
                    Text(
                        text = "  +${meal.items.size - 3}件",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
                    )
                }
            }

            // メモ表示
            meal.note?.takeIf { it.isNotBlank() }?.let { note ->
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = note,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // PFC表示
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                PfcBadge(label = "P", value = meal.totalProtein.toInt(), color = ScoreProtein)
                Text(" / ", color = MaterialTheme.colorScheme.onSurfaceVariant)
                PfcBadge(label = "F", value = meal.totalFat.toInt(), color = ScoreFat)
                Text(" / ", color = MaterialTheme.colorScheme.onSurfaceVariant)
                PfcBadge(label = "C", value = meal.totalCarbs.toInt(), color = ScoreCarbs)
            }

            Spacer(modifier = Modifier.height(8.dp))

            // アクションボタン
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // テンプレート保存ボタン
                IconButton(onClick = onSaveAsTemplate, modifier = Modifier.size(32.dp)) {
                    Icon(
                        imageVector = Icons.Default.BookmarkAdd,
                        contentDescription = "テンプレート保存",
                        tint = Color(0xFF8B5CF6),
                        modifier = Modifier.size(18.dp)
                    )
                }
                // 編集ボタン
                IconButton(onClick = onEdit, modifier = Modifier.size(32.dp)) {
                    Icon(
                        imageVector = Icons.Default.Edit,
                        contentDescription = "編集",
                        tint = Primary,
                        modifier = Modifier.size(18.dp)
                    )
                }
                // 削除ボタン
                IconButton(onClick = onDelete, modifier = Modifier.size(32.dp)) {
                    Icon(
                        imageVector = Icons.Default.Delete,
                        contentDescription = "削除",
                        tint = Color(0xFFEF4444),
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }
    }
}

/**
 * 入力元タグ
 */
@Composable
private fun SourceTag(
    text: String,
    color: Color,
    icon: ImageVector
) {
    Row(
        modifier = Modifier
            .background(color, RoundedCornerShape(12.dp))
            .padding(horizontal = 6.dp, vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = Color.White,
            modifier = Modifier.size(10.dp)
        )
        Spacer(modifier = Modifier.width(2.dp))
        Text(
            text = text,
            style = MaterialTheme.typography.labelSmall,
            color = Color.White,
            fontSize = 10.sp
        )
    }
}

/**
 * GLタグ
 */
@Composable
private fun GlTag(gl: Float, rating: GlRating) {
    val (bgColor, label) = when (rating) {
        GlRating.LOW -> Color(0xFF22C55E) to "(優秀)"
        GlRating.MEDIUM -> Color(0xFF3B82F6) to "(適正)"
        GlRating.HIGH_RECOMMENDED -> Color(0xFFF59E0B) to "(推奨)"
        GlRating.HIGH -> Color(0xFFEF4444) to "(分割推奨)"
    }

    Row(
        modifier = Modifier
            .background(bgColor, RoundedCornerShape(12.dp))
            .padding(horizontal = 6.dp, vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "GL ${gl.toInt()} $label",
            style = MaterialTheme.typography.labelSmall,
            color = Color.White,
            fontSize = 10.sp
        )
    }
}

/**
 * PFCバッジ
 */
@Composable
private fun PfcBadge(
    label: String,
    value: Int,
    color: Color
) {
    Row(
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
            color = color
        )
        Spacer(modifier = Modifier.width(2.dp))
        Text(
            text = "${value}g",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}
