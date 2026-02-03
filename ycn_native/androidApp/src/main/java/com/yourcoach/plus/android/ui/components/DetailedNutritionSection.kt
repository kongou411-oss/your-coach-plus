package com.yourcoach.plus.android.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.yourcoach.plus.android.ui.theme.Primary

/**
 * 詳細栄養素セクション（Premium専用）- 完全版
 * 元プロジェクト準拠: DIAAS, 脂肪酸バランス(MCT含), GL管理, 食物繊維スコア, 全13ビタミン, 全13ミネラル
 */
@Composable
fun DetailedNutritionSection(
    isPremium: Boolean,
    averageDiaas: Float,
    fattyAcidBalance: FattyAcidBalance,
    glData: GlData,
    fiberData: FiberData,
    vitaminScores: Map<String, Float>,
    mineralScores: Map<String, Float>,
    onUpgradeClick: () -> Unit,
    modifier: Modifier = Modifier,
    alwaysExpanded: Boolean = false  // BottomSheet等で直接表示する場合true
) {
    var isExpanded by remember { mutableStateOf(alwaysExpanded) }
    val showContent = alwaysExpanded || isExpanded

    // alwaysExpandedの場合はカードなしで直接コンテンツ表示
    if (alwaysExpanded) {
        Column(
            modifier = modifier
                .fillMaxWidth()
                .padding(horizontal = 0.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // タンパク質の質（DIAAS）
            DiaasSectionContent(averageDiaas = averageDiaas)

            HorizontalDivider()

            // 脂肪酸バランス（MCT含む4種類）
            FattyAcidSectionContent(balance = fattyAcidBalance)

            HorizontalDivider()

            // GL管理（炭水化物の質）
            GlSectionContent(glData = glData)

            HorizontalDivider()

            // 食物繊維スコア
            FiberSectionContent(fiberData = fiberData)

            HorizontalDivider()

            // ビタミン充足率（全13種類）
            VitaminSectionContent(scores = vitaminScores)

            HorizontalDivider()

            // ミネラル充足率（全13種類）
            MineralSectionContent(scores = mineralScores)
        }
        return
    }

    // 通常モード: カード内で折りたたみ表示
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            // ヘッダー（クリックで展開/折りたたみ）
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { if (isPremium) isExpanded = !isExpanded }
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "ミクロ+",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = Primary
                    )
                    if (!isPremium) {
                        Spacer(modifier = Modifier.width(8.dp))
                        Icon(
                            imageVector = Icons.Default.Lock,
                            contentDescription = null,
                            tint = Color(0xFFFFB300),
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
                if (isPremium) {
                    Icon(
                        imageVector = if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                        contentDescription = if (isExpanded) "折りたたむ" else "展開",
                        tint = Primary
                    )
                }
            }

            // Premium未加入時のロック表示
            if (!isPremium) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .padding(bottom = 16.dp)
                ) {
                    Text(
                        text = "ビタミン・ミネラル・脂肪酸などの詳細な栄養素分析はPremium会員専用機能です。",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Button(
                        onClick = onUpgradeClick,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFFB300))
                    ) {
                        Text("Premiumにアップグレード", color = Color.White)
                    }
                }
                return@Card
            }

            // 展開時のコンテンツ
            AnimatedVisibility(
                visible = isExpanded,
                enter = expandVertically(),
                exit = shrinkVertically()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .padding(bottom = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // タンパク質の質（DIAAS）
                    DiaasSectionContent(averageDiaas = averageDiaas)

                    HorizontalDivider()

                    // 脂肪酸バランス（MCT含む4種類）
                    FattyAcidSectionContent(balance = fattyAcidBalance)

                    HorizontalDivider()

                    // GL管理（炭水化物の質）
                    GlSectionContent(glData = glData)

                    HorizontalDivider()

                    // 食物繊維スコア
                    FiberSectionContent(fiberData = fiberData)

                    HorizontalDivider()

                    // ビタミン充足率（全13種類）
                    VitaminSectionContent(scores = vitaminScores)

                    HorizontalDivider()

                    // ミネラル充足率（全13種類）
                    MineralSectionContent(scores = mineralScores)
                }
            }
        }
    }
}

/**
 * DIAAS（タンパク質の質）セクション
 */
@Composable
private fun DiaasSectionContent(averageDiaas: Float) {
    val (label, color) = when {
        averageDiaas >= 1.0f -> "優秀" to Color(0xFF4CAF50)
        averageDiaas >= 0.75f -> "良好" to Primary
        averageDiaas >= 0.5f -> "普通" to Color(0xFFFFB300)
        else -> "要改善" to Color(0xFFE53935)
    }

    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "タンパク質の質（DIAAS）",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = String.format("%.2f", averageDiaas),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = color
                )
                Spacer(modifier = Modifier.width(8.dp))
                Surface(
                    color = color.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Text(
                        text = label,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = color
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // プログレスバー（目標1.0、最大表示1.2）
        val progress = (averageDiaas / 1.0f).coerceIn(0f, 1.2f)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(12.dp)
                .clip(RoundedCornerShape(6.dp))
                .background(Color.Gray.copy(alpha = 0.2f))
        ) {
            // 目標ライン（1.0の位置）
            Box(
                modifier = Modifier
                    .fillMaxWidth(progress.coerceAtMost(1f))
                    .fillMaxHeight()
                    .background(color, RoundedCornerShape(6.dp))
            )
            // 目標マーカー
            Box(
                modifier = Modifier
                    .fillMaxWidth(1f / 1.2f)  // 1.0の位置
                    .fillMaxHeight()
            ) {
                Box(
                    modifier = Modifier
                        .align(Alignment.CenterEnd)
                        .width(2.dp)
                        .fillMaxHeight()
                        .background(Color.Gray)
                )
            }
        }

        Spacer(modifier = Modifier.height(4.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = "0",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = "目標: 1.0",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/**
 * 脂肪酸バランスセクション（MCT含む4種類）
 */
@Composable
private fun FattyAcidSectionContent(balance: FattyAcidBalance) {
    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "脂肪酸バランス",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = balance.rating,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.width(8.dp))
                val labelColor = when {
                    balance.score >= 5 -> Color(0xFF4CAF50)
                    balance.score >= 4 -> Primary
                    else -> Color(0xFFE53935)
                }
                Surface(
                    color = labelColor.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Text(
                        text = balance.label,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = labelColor
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // バランスバー（4種類: 飽和・MCT・一価・多価）
        val total = balance.saturated + balance.mediumChain + balance.monounsaturated + balance.polyunsaturated
        if (total > 0) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(16.dp)
                    .clip(RoundedCornerShape(8.dp))
            ) {
                val saturatedPercent = balance.saturated / total
                val mctPercent = balance.mediumChain / total
                val monoPercent = balance.monounsaturated / total
                val polyPercent = balance.polyunsaturated / total

                if (saturatedPercent > 0) {
                    Box(
                        modifier = Modifier
                            .weight(saturatedPercent)
                            .fillMaxHeight()
                            .background(Color(0xFFE53935)),
                        contentAlignment = Alignment.Center
                    ) {
                        if (saturatedPercent >= 0.1f) {
                            Text(
                                text = "${(saturatedPercent * 100).toInt()}%",
                                style = MaterialTheme.typography.labelSmall,
                                fontSize = 9.sp,
                                color = Color.White
                            )
                        }
                    }
                }
                if (mctPercent > 0.01f) {
                    Box(
                        modifier = Modifier
                            .weight(mctPercent.coerceAtLeast(0.05f))
                            .fillMaxHeight()
                            .background(Color(0xFF9C27B0)),  // Purple for MCT
                        contentAlignment = Alignment.Center
                    ) {
                        if (mctPercent >= 0.05f) {
                            Text(
                                text = "${(mctPercent * 100).toInt()}%",
                                style = MaterialTheme.typography.labelSmall,
                                fontSize = 9.sp,
                                color = Color.White
                            )
                        }
                    }
                }
                if (monoPercent > 0) {
                    Box(
                        modifier = Modifier
                            .weight(monoPercent)
                            .fillMaxHeight()
                            .background(Color(0xFFFFB300)),
                        contentAlignment = Alignment.Center
                    ) {
                        if (monoPercent >= 0.1f) {
                            Text(
                                text = "${(monoPercent * 100).toInt()}%",
                                style = MaterialTheme.typography.labelSmall,
                                fontSize = 9.sp,
                                color = Color.White
                            )
                        }
                    }
                }
                if (polyPercent > 0) {
                    Box(
                        modifier = Modifier
                            .weight(polyPercent)
                            .fillMaxHeight()
                            .background(Primary),
                        contentAlignment = Alignment.Center
                    ) {
                        if (polyPercent >= 0.1f) {
                            Text(
                                text = "${(polyPercent * 100).toInt()}%",
                                style = MaterialTheme.typography.labelSmall,
                                fontSize = 9.sp,
                                color = Color.White
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // 凡例（4種類）
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                LegendItem(color = Color(0xFFE53935), label = "飽和")
                LegendItem(color = Color(0xFF9C27B0), label = "中鎖")
                LegendItem(color = Color(0xFFFFB300), label = "一価")
                LegendItem(color = Primary, label = "多価")
            }
        }

        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = "目標: 飽和30% / 中鎖5% / 一価40% / 多価25%",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun LegendItem(color: Color, label: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            modifier = Modifier
                .size(12.dp)
                .background(color, RoundedCornerShape(2.dp))
        )
        Spacer(modifier = Modifier.width(4.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

/**
 * GL管理セクション（炭水化物の質）
 */
@Composable
private fun GlSectionContent(glData: GlData) {
    // 血糖管理の評価色
    val bloodSugarColor = when (glData.bloodSugarRating) {
        "A+" -> Color(0xFF4CAF50)
        "A" -> Color(0xFF4CAF50)
        "B" -> Primary
        "C" -> Color(0xFFFFB300)
        else -> Color(0xFFE53935)
    }

    Column {
        // ヘッダー: 血糖管理
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "血糖管理",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = glData.bloodSugarRating,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = bloodSugarColor
                )
                Spacer(modifier = Modifier.width(8.dp))
                Surface(
                    color = bloodSugarColor.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Text(
                        text = glData.bloodSugarLabel,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = bloodSugarColor
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // GL補正要因
        if (glData.glModifiers.isNotEmpty()) {
            glData.glModifiers.forEach { (label, value) ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "✓ $label",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = "${value.toInt()}%",
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Medium,
                        color = Color(0xFF4CAF50)
                    )
                }
                Spacer(modifier = Modifier.height(2.dp))
            }
            Spacer(modifier = Modifier.height(8.dp))
        }

        // 実質GL値
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "実質GL値",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "${glData.adjustedGL.toInt()}",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF4CAF50)
                )
                Spacer(modifier = Modifier.width(4.dp))
                val glLevel = when {
                    glData.adjustedGL >= 20 -> "高"
                    glData.adjustedGL >= 11 -> "中"
                    else -> "低"
                }
                Text(
                    text = "(${glLevel}GL相当)",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // 1日の食事回数と1食あたりのGL上限
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = "1日の食事回数",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = "${glData.mealsPerDay}回",
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.Medium
            )
        }

        Spacer(modifier = Modifier.height(4.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = "1食あたりGL目標",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = "${glData.mealGLLimit.toInt()}",
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.Medium
            )
        }

        Spacer(modifier = Modifier.height(4.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = "1食あたり絶対上限",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "${glData.mealAbsoluteGLLimit.toInt()}",
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.Medium
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = "(運動直後は除外)",
                    style = MaterialTheme.typography.labelSmall,
                    color = Color(0xFF4CAF50)
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // GI値内訳
        Text(
            text = "GI値内訳",
            style = MaterialTheme.typography.bodySmall,
            fontWeight = FontWeight.Medium
        )

        Spacer(modifier = Modifier.height(8.dp))

        // GI 66以上
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = "GI 66以上",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = "${glData.highGIPercent.toInt()}%",
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.Medium,
                color = Color(0xFFE53935)
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(Color.Gray.copy(alpha = 0.2f))
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(glData.highGIPercent / 100f)
                    .fillMaxHeight()
                    .background(
                        brush = androidx.compose.ui.graphics.Brush.horizontalGradient(
                            colors = listOf(Color(0xFFEF5350), Color(0xFFE53935))
                        ),
                        shape = RoundedCornerShape(4.dp)
                    )
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        // GI 66未満
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = "GI 66未満",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = "${glData.lowGIPercent.toInt()}%",
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.Medium,
                color = Color(0xFF4CAF50)
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(Color.Gray.copy(alpha = 0.2f))
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(glData.lowGIPercent / 100f)
                    .fillMaxHeight()
                    .background(
                        brush = androidx.compose.ui.graphics.Brush.horizontalGradient(
                            colors = listOf(Color(0xFF66BB6A), Color(0xFF4CAF50))
                        ),
                        shape = RoundedCornerShape(4.dp)
                    )
            )
        }
    }
}

/**
 * 糖質・食物繊維バランスセクション（元プロジェクト準拠）
 */
@Composable
private fun FiberSectionContent(fiberData: FiberData) {
    // 目標値（ボディメイカーは1.5倍想定だが、ここでは標準値）
    val targetCarbs = fiberData.targetCarbs
    val targetFiber = fiberData.targetFiber

    // バランス計算（糖質 vs 食物繊維の比率）
    val total = fiberData.carbAmount + fiberData.fiberAmount
    val carbPercent = if (total > 0) (fiberData.carbAmount / total * 100).toInt() else 0
    val fiberPercent = if (total > 0) (fiberData.fiberAmount / total * 100).toInt() else 0

    // 評価色
    val labelColor = when {
        fiberData.score >= 5 -> Color(0xFF4CAF50)
        fiberData.score >= 4 -> Primary
        fiberData.score >= 3 -> Color(0xFFFFB300)
        else -> Color(0xFFE53935)
    }

    Column {
        // ヘッダー
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "糖質・食物繊維バランス",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = fiberData.rating,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.width(8.dp))
                Surface(
                    color = labelColor.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Text(
                        text = fiberData.label,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = labelColor
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // バランスバー（糖質 vs 食物繊維）
        Column {
            Text(
                text = "バランス",
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.Medium
            )
            Spacer(modifier = Modifier.height(4.dp))

            if (total > 0) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(24.dp)
                        .clip(RoundedCornerShape(4.dp))
                ) {
                    // 糖質（オレンジ）
                    Box(
                        modifier = Modifier
                            .weight(fiberData.carbAmount.coerceAtLeast(0.01f))
                            .fillMaxHeight()
                            .background(Color(0xFFFF9800)),
                        contentAlignment = Alignment.Center
                    ) {
                        if (carbPercent >= 10) {
                            Text(
                                text = "$carbPercent%",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                    }
                    // 食物繊維（緑）
                    if (fiberData.fiberAmount > 0) {
                        Box(
                            modifier = Modifier
                                .weight(fiberData.fiberAmount.coerceAtLeast(0.01f))
                                .fillMaxHeight()
                                .background(Color(0xFF4CAF50)),
                            contentAlignment = Alignment.Center
                        ) {
                            if (fiberPercent >= 5) {
                                Text(
                                    text = "$fiberPercent%",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }
                        }
                    }
                }
            } else {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(24.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .background(Color.Gray.copy(alpha = 0.2f))
                )
            }

            Spacer(modifier = Modifier.height(4.dp))

            // 凡例
            Row(
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(12.dp)
                            .background(Color(0xFFFF9800), RoundedCornerShape(2.dp))
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "糖質",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(12.dp)
                            .background(Color(0xFF4CAF50), RoundedCornerShape(2.dp))
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "食物繊維",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = "目標: 糖質${fiberData.carbAmount.toInt()}g / 食物繊維${fiberData.fiberAmount.toInt()}g",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        // 糖質プログレスバー
        NutrientProgressBar(
            label = "糖質",
            current = fiberData.carbAmount,
            target = targetCarbs,
            color = Color(0xFFFF9800)
        )

        Spacer(modifier = Modifier.height(8.dp))

        // 食物繊維プログレスバー
        NutrientProgressBar(
            label = "食物繊維",
            current = fiberData.fiberAmount,
            target = targetFiber,
            color = Color(0xFF4CAF50)
        )

        Spacer(modifier = Modifier.height(8.dp))

        // 水溶性食物繊維プログレスバー
        NutrientProgressBar(
            label = "水溶性",
            current = fiberData.solubleFiber,
            target = targetFiber * 0.33f,  // 理想比率 1:2 なので全体の1/3
            color = Color(0xFF81C784)
        )

        Spacer(modifier = Modifier.height(8.dp))

        // 不溶性食物繊維プログレスバー
        NutrientProgressBar(
            label = "不溶性",
            current = fiberData.insolubleFiber,
            target = targetFiber * 0.67f,  // 理想比率 1:2 なので全体の2/3
            color = Color(0xFF388E3C)
        )

        // 理想比率の説明
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "※理想比率: 水溶性 1 : 不溶性 2",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
        )
    }
}

/**
 * 栄養素プログレスバー
 */
@Composable
private fun NutrientProgressBar(
    label: String,
    current: Float,
    target: Float,
    color: Color
) {
    val progress = if (target > 0) (current / target).coerceIn(0f, 1.5f) else 0f
    val displayColor = when {
        progress >= 0.8f && progress <= 1.2f -> Color(0xFF4CAF50)
        progress >= 0.6f -> Primary
        progress < 0.4f -> Color(0xFFE53935)
        else -> color
    }

    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = String.format("%.1f / %.0fg", current, target),
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.Bold,
                color = displayColor
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(10.dp)
                .clip(RoundedCornerShape(5.dp))
                .background(Color.Gray.copy(alpha = 0.2f))
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(progress.coerceAtMost(1f))
                    .fillMaxHeight()
                    .background(displayColor, RoundedCornerShape(5.dp))
            )
        }
    }
}

/**
 * ビタミン充足率セクション（全13種類）
 */
@Composable
private fun VitaminSectionContent(scores: Map<String, Float>) {
    // 平均充足率を計算
    val vitaminLabels = listOf(
        "vitaminA" to "A",
        "vitaminD" to "D",
        "vitaminE" to "E",
        "vitaminK" to "K",
        "vitaminB1" to "B1",
        "vitaminB2" to "B2",
        "niacin" to "B3",
        "pantothenicAcid" to "B5",
        "vitaminB6" to "B6",
        "biotin" to "B7",
        "folicAcid" to "B9",
        "vitaminB12" to "B12",
        "vitaminC" to "C"
    )
    val avgRate = vitaminLabels.map { scores[it.first] ?: 0f }.average().toFloat()
    val avgColor = when {
        avgRate >= 0.8f -> Color(0xFF4CAF50)
        avgRate >= 0.6f -> Primary
        avgRate >= 0.4f -> Color(0xFFFFB300)
        else -> Color(0xFFE53935)
    }

    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "ビタミン充足率",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "平均 ${(avgRate * 100).toInt()}%",
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.Bold,
                color = avgColor
            )
        }

        Spacer(modifier = Modifier.height(4.dp))

        // 平均プログレスバー
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(Color.Gray.copy(alpha = 0.2f))
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(avgRate.coerceAtMost(1f))
                    .fillMaxHeight()
                    .background(avgColor, RoundedCornerShape(4.dp))
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        // 全13種類のビタミン（縦バー付き）
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            vitaminLabels.forEach { (key, label) ->
                val rate = scores[key] ?: 0f
                NutrientScoreItemWithBar(
                    label = label,
                    rate = rate
                )
            }
        }
    }
}

/**
 * ミネラル充足率セクション（全13種類）
 */
@Composable
private fun MineralSectionContent(scores: Map<String, Float>) {
    // 全13種類のミネラル
    val mineralLabels = listOf(
        "calcium" to "Ca",
        "iron" to "Fe",
        "magnesium" to "Mg",
        "phosphorus" to "P",
        "potassium" to "K",
        "sodium" to "Na",
        "zinc" to "Zn",
        "copper" to "Cu",
        "manganese" to "Mn",
        "selenium" to "Se",
        "iodine" to "I",
        "chromium" to "Cr",
        "molybdenum" to "Mo"
    )

    // 平均充足率を計算（ナトリウム除く）
    val avgRate = mineralLabels
        .filter { it.first != "sodium" }
        .map { scores[it.first] ?: 0f }
        .average().toFloat()
    val avgColor = when {
        avgRate >= 0.8f -> Color(0xFF4CAF50)
        avgRate >= 0.6f -> Primary
        avgRate >= 0.4f -> Color(0xFFFFB300)
        else -> Color(0xFFE53935)
    }

    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "ミネラル充足率",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "平均 ${(avgRate * 100).toInt()}%",
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.Bold,
                color = avgColor
            )
        }

        Spacer(modifier = Modifier.height(4.dp))

        // 平均プログレスバー
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(Color.Gray.copy(alpha = 0.2f))
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(avgRate.coerceAtMost(1f))
                    .fillMaxHeight()
                    .background(avgColor, RoundedCornerShape(4.dp))
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        // 全13種類のミネラル（縦バー付き）
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            mineralLabels.forEach { (key, label) ->
                val rate = scores[key] ?: 0f
                NutrientScoreItemWithBar(
                    label = label,
                    rate = rate,
                    isUpperLimit = key == "sodium"  // ナトリウムは上限評価
                )
            }
        }
    }
}

/**
 * 個別の栄養素スコア表示（縦バー付き）
 */
@Composable
private fun NutrientScoreItemWithBar(
    label: String,
    rate: Float,
    isUpperLimit: Boolean = false,
    modifier: Modifier = Modifier
) {
    val color = if (isUpperLimit) {
        // ナトリウムは上限評価（低いほど良い）
        when {
            rate <= 0.8f -> Color(0xFF4CAF50)
            rate <= 1.0f -> Primary
            rate <= 1.2f -> Color(0xFFFFB300)
            else -> Color(0xFFE53935)
        }
    } else {
        when {
            rate >= 0.8f -> Color(0xFF4CAF50)   // 充足
            rate >= 0.6f -> Primary              // やや不足
            rate >= 0.4f -> Color(0xFFFFB300)   // 不足
            else -> Color(0xFFE53935)            // 大幅不足
        }
    }

    val barHeight = 40.dp
    val progress = if (isUpperLimit) {
        // ナトリウム: 逆向き表示（上限に対する比率）
        rate.coerceIn(0f, 1.5f)
    } else {
        rate.coerceIn(0f, 1.2f)
    }

    Column(
        modifier = modifier.width(36.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // ラベル
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            fontSize = 10.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(4.dp))

        // 縦バー
        Box(
            modifier = Modifier
                .width(20.dp)
                .height(barHeight)
                .clip(RoundedCornerShape(4.dp))
                .background(Color.Gray.copy(alpha = 0.2f)),
            contentAlignment = Alignment.BottomCenter
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .fillMaxHeight(progress.coerceAtMost(1f))
                    .background(color, RoundedCornerShape(4.dp))
            )
            // 100%ライン
            if (!isUpperLimit) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(1.dp)
                        .align(Alignment.TopCenter)
                        .background(Color.Gray.copy(alpha = 0.5f))
                )
            }
        }

        Spacer(modifier = Modifier.height(2.dp))

        // パーセンテージ
        Text(
            text = "${(rate * 100).toInt()}%",
            style = MaterialTheme.typography.labelSmall,
            fontSize = 9.sp,
            fontWeight = FontWeight.Bold,
            color = color
        )
    }
}

/**
 * 脂肪酸バランスデータ（MCT含む4種類）
 */
data class FattyAcidBalance(
    val saturated: Float = 0f,       // 飽和脂肪酸
    val mediumChain: Float = 0f,     // 中鎖脂肪酸 (MCT)
    val monounsaturated: Float = 0f, // 一価不飽和脂肪酸
    val polyunsaturated: Float = 0f, // 多価不飽和脂肪酸
    val score: Int = 0,              // スコア (1-5)
    val rating: String = "-",        // 評価 (★★★★★等)
    val label: String = "-"          // ラベル (優秀/良好/普通/要改善)
)

/**
 * GL管理データ
 */
data class GlData(
    val current: Float = 0f,              // 現在のGL値
    val limit: Float = 120f,              // 動的GL上限（目標炭水化物 × 0.60）
    val score: Int = 0,                   // スコア (1-5)
    val label: String = "-",              // ラベル (優秀/良好/普通/やや超過/要改善)
    val adjustedGL: Float = 0f,           // 補正後GL値
    val bloodSugarRating: String = "-",   // 血糖管理評価 (A+, A, B, C, D)
    val bloodSugarLabel: String = "-",    // 血糖管理ラベル (優秀, 良好, 普通, やや高め, 要改善)
    val highGIPercent: Float = 0f,        // GI66以上の炭水化物の割合
    val lowGIPercent: Float = 0f,         // GI66未満の炭水化物の割合
    val glModifiers: List<Pair<String, Float>> = emptyList(),  // GL補正要因
    val mealsPerDay: Int = 5,             // 想定食事回数
    val mealGLLimit: Float = 24f,         // 1食あたりの動的GL上限
    val mealAbsoluteGLLimit: Float = 40f  // 1食あたりの絶対GL上限（ボディメイカー70/一般40）
)

/**
 * 食物繊維データ（元プロジェクト準拠）
 */
data class FiberData(
    val fiberAmount: Float = 0f,     // 食物繊維量 (g)
    val solubleFiber: Float = 0f,    // 水溶性食物繊維 (g)
    val insolubleFiber: Float = 0f,  // 不溶性食物繊維 (g)
    val carbAmount: Float = 0f,      // 糖質量 (g)
    val carbFiberRatio: Float = 0f,  // 糖質:繊維 比率
    val targetCarbs: Float = 244f,   // 糖質目標 (g) - ユーザー設定から取得
    val targetFiber: Float = 24f,    // 食物繊維目標 (g) - 糖質の約10%
    val score: Int = 0,              // スコア (1-5)
    val rating: String = "-",        // 評価 (★★★★★等)
    val label: String = "-"          // ラベル (優秀/良好/要改善)
)
