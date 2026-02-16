package com.yourcoach.plus.shared.ui.screens.pgbase

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.LockOpen
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.koin.koinScreenModel
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.yourcoach.plus.shared.ui.theme.AccentOrange
import com.yourcoach.plus.shared.ui.theme.Primary
import com.yourcoach.plus.shared.ui.theme.Secondary
import kotlinx.coroutines.launch

/**
 * PGBASE（教科書）画面
 */
class PgBaseScreen : Screen {

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    override fun Content() {
        val screenModel = koinScreenModel<PgBaseScreenModel>()
        val uiState by screenModel.uiState.collectAsState()
        val navigator = LocalNavigator.currentOrThrow
        val snackbarHostState = remember { SnackbarHostState() }
        val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        val scope = rememberCoroutineScope()

        // エラー表示
        LaunchedEffect(uiState.error) {
            uiState.error?.let { error ->
                snackbarHostState.showSnackbar(error)
                screenModel.clearError()
            }
        }

        Scaffold(
            snackbarHost = { SnackbarHost(snackbarHostState) }
        ) { paddingValues ->
            PullToRefreshBox(
                isRefreshing = uiState.isLoading,
                onRefresh = screenModel::loadArticles,
                modifier = Modifier
                    .fillMaxSize()
                    // MainScreenがBottomNavを管理するため、topのみ適用
                    .padding(top = paddingValues.calculateTopPadding())
            ) {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 16.dp)
                ) {
                    // ヘッダー
                    item {
                        PgBaseHeader(
                            completedCount = uiState.completedCount,
                            totalCount = uiState.totalCount
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                    }

                    // 記事リスト
                    items(uiState.articles, key = { it.article.id }) { articleWithProgress ->
                        ArticleCard(
                            articleWithProgress = articleWithProgress,
                            onClick = { screenModel.selectArticle(articleWithProgress.article.id) }
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                    }

                    // ボトムナビ用余白
                    item {
                        Spacer(modifier = Modifier.height(80.dp))
                    }
                }
            }
        }

        // 記事詳細BottomSheet
        if (uiState.isArticleDetailVisible && uiState.selectedArticle != null) {
            ArticleDetailSheet(
                article = uiState.selectedArticle!!,
                sheetState = sheetState,
                isCompleted = screenModel.isSelectedArticleCompleted(),
                isPurchased = screenModel.isSelectedArticlePurchased(),
                isLoading = uiState.isActionLoading,
                userCredits = uiState.userCredits,
                onDismiss = {
                    scope.launch {
                        sheetState.hide()
                        screenModel.closeArticleDetail()
                    }
                },
                onMarkCompleted = {
                    uiState.selectedArticle?.let { article ->
                        screenModel.markArticleCompleted(article.id)
                    }
                },
                onPurchase = {
                    uiState.selectedArticle?.let { article ->
                        screenModel.purchaseArticle(article.id)
                    }
                },
                onNavigateToSubscription = {
                    scope.launch {
                        sheetState.hide()
                        screenModel.closeArticleDetail()
                    }
                    screenModel.getCurrentUserId()?.let { userId ->
                        navigator.push(
                            com.yourcoach.plus.shared.ui.screens.subscription.SubscriptionScreen(userId)
                        )
                    }
                }
            )
        }
    }
}

/**
 * PGBASEヘッダー
 */
@Composable
private fun PgBaseHeader(
    completedCount: Int,
    totalCount: Int
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = Secondary.copy(alpha = 0.1f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.MenuBook,
                    contentDescription = null,
                    tint = Secondary,
                    modifier = Modifier.size(32.dp)
                )
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = "PGBASE",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "あなた専用の栄養・トレーニング教科書",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 進捗バー
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "学習進捗",
                    style = MaterialTheme.typography.labelMedium
                )
                Text(
                    text = "$completedCount / $totalCount 完了",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Medium,
                    color = Secondary
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            LinearProgressIndicator(
                progress = { if (totalCount > 0) completedCount.toFloat() / totalCount else 0f },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .clip(RoundedCornerShape(4.dp)),
                color = Secondary,
                trackColor = Secondary.copy(alpha = 0.2f)
            )
        }
    }
}

/**
 * 記事カード
 */
@Composable
private fun ArticleCard(
    articleWithProgress: PgBaseArticleWithProgress,
    onClick: () -> Unit
) {
    val article = articleWithProgress.article

    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // カテゴリアイコン
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .background(Secondary.copy(alpha = 0.1f), RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = article.category.emoji,
                    style = MaterialTheme.typography.titleLarge
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            // コンテンツ
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = article.title,
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )
                    if (articleWithProgress.isCompleted) {
                        Spacer(modifier = Modifier.width(8.dp))
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = "完了",
                            modifier = Modifier.size(16.dp),
                            tint = Primary
                        )
                    }
                    if (article.isPremium) {
                        Spacer(modifier = Modifier.width(8.dp))
                        if (articleWithProgress.isPurchased) {
                            Icon(
                                imageVector = Icons.Filled.LockOpen,
                                contentDescription = "購入済み",
                                modifier = Modifier.size(16.dp),
                                tint = Primary
                            )
                        } else {
                            Icon(
                                imageVector = Icons.Default.Lock,
                                contentDescription = "プレミアム",
                                modifier = Modifier.size(16.dp),
                                tint = AccentOrange
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = article.summary,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )

                Spacer(modifier = Modifier.height(8.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Schedule,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "${article.readingTime}分",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = article.category.displayName,
                        style = MaterialTheme.typography.labelSmall,
                        color = Secondary
                    )
                }
            }
        }
    }
}
