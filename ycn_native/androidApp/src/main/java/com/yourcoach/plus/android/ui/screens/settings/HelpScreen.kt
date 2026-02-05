package com.yourcoach.plus.android.ui.screens.settings

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
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
import com.yourcoach.plus.android.ui.theme.AccentOrange

/**
 * ヘルプ画面
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HelpScreen(
    onNavigateBack: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("ヘルプ") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "戻る")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // アプリの使い方
            item {
                HelpSection(
                    title = "アプリの使い方",
                    icon = Icons.Default.School
                ) {
                    UsageGuideContent()
                }
            }

            // 機能紹介
            item {
                HelpSection(
                    title = "機能紹介",
                    icon = Icons.Default.Apps
                ) {
                    FeaturesContent()
                }
            }

            item { Spacer(modifier = Modifier.height(32.dp)) }
        }
    }
}

/**
 * ヘルプセクション（展開式）
 */
@Composable
private fun HelpSection(
    title: String,
    icon: ImageVector,
    content: @Composable () -> Unit
) {
    var isExpanded by remember { mutableStateOf(true) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column {
            // ヘッダー
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { isExpanded = !isExpanded }
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(AccentOrange.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = AccentOrange,
                        modifier = Modifier.size(24.dp)
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f)
                )

                Icon(
                    imageVector = if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            // コンテンツ
            AnimatedVisibility(
                visible = isExpanded,
                enter = expandVertically(),
                exit = shrinkVertically()
            ) {
                Column(
                    modifier = Modifier.padding(
                        start = 16.dp,
                        end = 16.dp,
                        bottom = 16.dp
                    )
                ) {
                    HorizontalDivider(modifier = Modifier.padding(bottom = 16.dp))
                    content()
                }
            }
        }
    }
}

/**
 * アプリの使い方コンテンツ
 */
@Composable
private fun UsageGuideContent() {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        // 初心者向け
        UsageLevelCard(
            level = "初心者",
            levelColor = Color(0xFF4CAF50),
            description = "ボディメイクをこれから始める方",
            steps = listOf(
                "「明日の指示書」でクエストを生成",
                "翌日からクエストを順番に実行",
                "完了したらチェックを付ける",
                "毎日繰り返して習慣化"
            )
        )

        // 中級者向け
        UsageLevelCard(
            level = "中級者",
            levelColor = Color(0xFF2196F3),
            description = "自分でメニューを組める方",
            steps = listOf(
                "食事・運動をルーティン記録",
                "分析機能でPDCAを回す",
                "必要に応じてクエストを活用",
                "データを見ながら調整"
            )
        )
    }
}

/**
 * レベル別使い方カード
 */
@Composable
private fun UsageLevelCard(
    level: String,
    levelColor: Color,
    description: String,
    steps: List<String>
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = levelColor.copy(alpha = 0.1f)
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(levelColor)
                        .padding(horizontal = 12.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = level,
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = description,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            steps.forEachIndexed { index, step ->
                Row(
                    modifier = Modifier.padding(vertical = 4.dp),
                    verticalAlignment = Alignment.Top
                ) {
                    Box(
                        modifier = Modifier
                            .size(24.dp)
                            .clip(CircleShape)
                            .background(levelColor),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "${index + 1}",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = step,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }
            }
        }
    }
}

/**
 * 機能紹介コンテンツ
 */
@Composable
private fun FeaturesContent() {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        FeatureItem(
            icon = Icons.Default.AutoAwesome,
            title = "クエスト（明日の指示書）",
            description = "AIが翌日の食事・運動プランを自動生成。迷わずボディメイクを実行できます。"
        )
        FeatureItem(
            icon = Icons.Default.Restaurant,
            title = "食事記録",
            description = "写真から自動で栄養素を計算。手入力も可能です。"
        )
        FeatureItem(
            icon = Icons.Default.FitnessCenter,
            title = "運動記録",
            description = "トレーニング内容を記録。セット数・重量・レップ数を管理できます。"
        )
        FeatureItem(
            icon = Icons.Default.Analytics,
            title = "AI分析",
            description = "記録データをAIが分析し、改善点やアドバイスを提供します。"
        )
        FeatureItem(
            icon = Icons.Default.History,
            title = "履歴",
            description = "過去の記録を振り返り、進捗を確認できます。"
        )
        FeatureItem(
            icon = Icons.Default.MenuBook,
            title = "PG BASE",
            description = "ボディメイクの専門知識を学べる教科書コンテンツです。"
        )
    }
}

/**
 * 機能アイテム
 */
@Composable
private fun FeatureItem(
    icon: ImageVector,
    title: String,
    description: String
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.Top
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = AccentOrange,
            modifier = Modifier.size(24.dp)
        )
        Spacer(modifier = Modifier.width(12.dp))
        Column {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Medium
            )
            Text(
                text = description,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
