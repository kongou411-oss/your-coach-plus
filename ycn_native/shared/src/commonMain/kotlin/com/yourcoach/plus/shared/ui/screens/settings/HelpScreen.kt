package com.yourcoach.plus.shared.ui.screens.settings

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
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.yourcoach.plus.shared.ui.theme.AccentOrange

class HelpScreen : Screen {

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    override fun Content() {
        val navigator = LocalNavigator.currentOrThrow

        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("ヘルプ") },
                    navigationIcon = {
                        IconButton(onClick = { navigator.pop() }) {
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
                item {
                    HelpSection(title = "アプリの使い方", icon = Icons.Default.School) {
                        HelpUsageGuideContent()
                    }
                }

                item {
                    HelpSection(title = "機能紹介", icon = Icons.Default.Apps) {
                        HelpFeaturesContent()
                    }
                }

                item { Spacer(modifier = Modifier.height(32.dp)) }
            }
        }
    }
}

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
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column {
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
                    Icon(icon, contentDescription = null, tint = AccentOrange, modifier = Modifier.size(24.dp))
                }
                Spacer(modifier = Modifier.width(12.dp))
                Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                Icon(
                    if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            AnimatedVisibility(visible = isExpanded, enter = expandVertically(), exit = shrinkVertically()) {
                Column(modifier = Modifier.padding(start = 16.dp, end = 16.dp, bottom = 16.dp)) {
                    HorizontalDivider(modifier = Modifier.padding(bottom = 16.dp))
                    content()
                }
            }
        }
    }
}

@Composable
private fun HelpUsageGuideContent() {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        HelpUsageLevelCard(
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
        HelpUsageLevelCard(
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

@Composable
private fun HelpUsageLevelCard(level: String, levelColor: Color, description: String, steps: List<String>) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = levelColor.copy(alpha = 0.1f))
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(levelColor).padding(horizontal = 12.dp, vertical = 4.dp)
                ) {
                    Text(level, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = Color.White)
                }
                Spacer(modifier = Modifier.width(8.dp))
                Text(description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Spacer(modifier = Modifier.height(12.dp))
            steps.forEachIndexed { index, step ->
                Row(modifier = Modifier.padding(vertical = 4.dp), verticalAlignment = Alignment.Top) {
                    Box(
                        modifier = Modifier.size(24.dp).clip(CircleShape).background(levelColor),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("${index + 1}", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(step, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 2.dp))
                }
            }
        }
    }
}

@Composable
private fun HelpFeaturesContent() {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        HelpFeatureItem(Icons.Default.AutoAwesome, "クエスト（明日の指示書）", "AIが翌日の食事・運動プランを自動生成。迷わずボディメイクを実行できます。")
        HelpFeatureItem(Icons.Default.Restaurant, "食事記録", "写真から自動で栄養素を計算。手入力も可能です。")
        HelpFeatureItem(Icons.Default.FitnessCenter, "運動記録", "トレーニング内容を記録。セット数・重量・レップ数を管理できます。")
        HelpFeatureItem(Icons.Default.Analytics, "AI分析", "記録データをAIが分析し、改善点やアドバイスを提供します。")
        HelpFeatureItem(Icons.Default.History, "履歴", "過去の記録を振り返り、進捗を確認できます。")
        HelpFeatureItem(Icons.Default.MenuBook, "PG BASE", "ボディメイクの専門知識を学べる教科書コンテンツです。")
    }
}

@Composable
private fun HelpFeatureItem(icon: ImageVector, title: String, description: String) {
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
        Icon(icon, contentDescription = null, tint = AccentOrange, modifier = Modifier.size(24.dp))
        Spacer(modifier = Modifier.width(12.dp))
        Column {
            Text(title, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium)
            Text(description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
