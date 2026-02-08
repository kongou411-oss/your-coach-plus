package com.yourcoach.plus.shared.ui.screens.subscription

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.koin.koinScreenModel
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.yourcoach.plus.shared.domain.repository.*
import com.yourcoach.plus.shared.ui.theme.Primary

/**
 * サブスクリプション画面 (Compose Multiplatform)
 */
data class SubscriptionScreen(
    val userId: String,
    val registrationDate: String? = null,
    val subscriptionStatus: String? = null
) : Screen {

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    override fun Content() {
        val screenModel = koinScreenModel<SubscriptionScreenModel>()
        val uiState by screenModel.uiState.collectAsState()
        val navigator = LocalNavigator.currentOrThrow
        val snackbarHostState = remember { SnackbarHostState() }

        // 初期化
        LaunchedEffect(userId) {
            screenModel.initialize(userId, registrationDate, subscriptionStatus)
        }

        // エラー表示
        LaunchedEffect(uiState.error) {
            uiState.error?.let { error ->
                snackbarHostState.showSnackbar(error)
                screenModel.clearError()
            }
        }

        // 購入成功時の処理
        LaunchedEffect(uiState.purchaseSuccess) {
            if (uiState.purchaseSuccess) {
                snackbarHostState.showSnackbar("購入が完了しました")
                kotlinx.coroutines.delay(2000)
                screenModel.resetPurchaseSuccess()
                navigator.pop()
            }
        }

        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("プレミアムプラン") },
                    navigationIcon = {
                        IconButton(onClick = { navigator.pop() }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "戻る")
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.surface
                    )
                )
            },
            snackbarHost = { SnackbarHost(snackbarHostState) }
        ) { paddingValues ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
            ) {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // ヘッダーカード
                    item {
                        PremiumHeaderCard(isPremium = uiState.isPremium)
                    }

                    // 機能一覧
                    item {
                        FeaturesCard()
                    }

                    // 接続状態の表示
                    if (uiState.connectionState != BillingConnectionState.CONNECTED) {
                        item {
                            ConnectionStatusCard(state = uiState.connectionState)
                        }
                    }

                    // サブスクリプションプラン
                    if (uiState.connectionState == BillingConnectionState.CONNECTED && !uiState.isPremium) {
                        item {
                            Text(
                                text = "プランを選択",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        val subscriptionProducts = uiState.products.filter {
                            it.type == ProductType.SUBSCRIPTION
                        }
                        items(subscriptionProducts) { product ->
                            SubscriptionProductCard(
                                product = product,
                                isLoading = uiState.isPurchasing,
                                onPurchase = {
                                    screenModel.purchaseSubscription(product.productId) {
                                        // Activity provider - プラットフォーム固有
                                        Any()
                                    }
                                }
                            )
                        }
                    }

                    // クレジットパック
                    if (uiState.connectionState == BillingConnectionState.CONNECTED) {
                        item {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "クレジット追加購入",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        item {
                            CreditInfoCard()
                        }

                        val creditProducts = uiState.products.filter {
                            it.type == ProductType.INAPP
                        }.sortedByDescending { product ->
                            when {
                                product.productId.contains("300") -> 300
                                product.productId.contains("150") -> 150
                                product.productId.contains("50") -> 50
                                else -> 0
                            }
                        }
                        items(creditProducts) { product ->
                            CreditProductCard(
                                product = product,
                                isLoading = uiState.isPurchasing,
                                onPurchase = {
                                    screenModel.purchaseCredits(product.productId) {
                                        Any()
                                    }
                                }
                            )
                        }

                        if (!uiState.isPremium) {
                            item {
                                PremiumPromotionCard()
                            }
                        }
                    }

                    // 既にPremiumの場合
                    if (uiState.isPremium && uiState.subscriptionStatus != null) {
                        item {
                            CurrentSubscriptionCard(status = uiState.subscriptionStatus!!)
                        }
                    }

                    // フッター
                    item {
                        SubscriptionFooter()
                    }
                }

                // ローディングオーバーレイ
                if (uiState.isPurchasing) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(alpha = 0.5f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Card(
                            modifier = Modifier.padding(32.dp),
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            Column(
                                modifier = Modifier.padding(24.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                CircularProgressIndicator()
                                Spacer(modifier = Modifier.height(16.dp))
                                Text("購入処理中...")
                            }
                        }
                    }
                }
            }
        }
    }
}

// ========== コンポーネント ==========

@Composable
private fun PremiumHeaderCard(isPremium: Boolean) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isPremium) Primary else MaterialTheme.colorScheme.primaryContainer
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = Icons.Default.Star,
                contentDescription = null,
                modifier = Modifier.size(48.dp),
                tint = if (isPremium) Color.White else MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = if (isPremium) "Premium会員" else "Your Coach+ Premium",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = if (isPremium) Color.White else MaterialTheme.colorScheme.onPrimaryContainer
            )
            Text(
                text = if (isPremium) "すべての機能がご利用いただけます" else "すべての機能を解放",
                style = MaterialTheme.typography.bodyMedium,
                color = if (isPremium) Color.White.copy(alpha = 0.9f) else MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f)
            )
        }
    }
}

@Composable
private fun FeaturesCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "Premium機能",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            FeatureItem(
                icon = Icons.Default.Analytics,
                title = "AI分析",
                description = "毎日のAIコーチングとアドバイス"
            )
            FeatureItem(
                icon = Icons.Default.CameraAlt,
                title = "画像認識",
                description = "写真から自動で食事を記録"
            )
            FeatureItem(
                icon = Icons.Default.TrendingUp,
                title = "詳細レポート",
                description = "週次・月次の詳細分析レポート"
            )
            FeatureItem(
                icon = Icons.Default.Block,
                title = "広告なし",
                description = "広告表示なしで快適に利用"
            )
        }
    }
}

@Composable
private fun FeatureItem(
    icon: ImageVector,
    title: String,
    description: String
) {
    Row(
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(24.dp),
            tint = Primary
        )
        Spacer(modifier = Modifier.width(12.dp))
        Column {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyMedium,
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

@Composable
private fun ConnectionStatusCard(state: BillingConnectionState) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = when (state) {
                BillingConnectionState.CONNECTING -> MaterialTheme.colorScheme.secondaryContainer
                BillingConnectionState.ERROR -> MaterialTheme.colorScheme.errorContainer
                else -> MaterialTheme.colorScheme.surfaceVariant
            }
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (state == BillingConnectionState.CONNECTING) {
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    strokeWidth = 2.dp
                )
            } else {
                Icon(
                    imageVector = if (state == BillingConnectionState.ERROR)
                        Icons.Default.ErrorOutline else Icons.Default.CloudOff,
                    contentDescription = null,
                    modifier = Modifier.size(24.dp)
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = when (state) {
                    BillingConnectionState.CONNECTING -> "ストアに接続中..."
                    BillingConnectionState.ERROR -> "ストアへの接続に失敗しました"
                    else -> "ストアに接続されていません"
                },
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}

@Composable
private fun SubscriptionProductCard(
    product: ProductInfo,
    isLoading: Boolean,
    onPurchase: () -> Unit
) {
    val isYearly = product.billingPeriod?.contains("Y") == true

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(enabled = !isLoading) { onPurchase() },
        shape = RoundedCornerShape(12.dp),
        border = if (isYearly) CardDefaults.outlinedCardBorder() else null
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                if (isYearly) {
                    Surface(
                        color = Primary,
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = "お得",
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                            style = MaterialTheme.typography.labelSmall,
                            color = Color.White
                        )
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                }
                Text(
                    text = product.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = product.description,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = product.price,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = Primary
                )
                Text(
                    text = if (isYearly) "/年" else "/月",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
private fun CreditInfoCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.secondaryContainer
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Info,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                    tint = MaterialTheme.colorScheme.onSecondaryContainer
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "クレジットについて",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSecondaryContainer
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "クレジットはAI分析機能で使用します。1回の分析で1クレジットを消費します。",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSecondaryContainer.copy(alpha = 0.9f)
            )
        }
    }
}

@Composable
private fun CreditProductCard(
    product: ProductInfo,
    isLoading: Boolean,
    onPurchase: () -> Unit
) {
    val credits = when {
        product.productId.contains("300") -> 300
        product.productId.contains("150") -> 150
        product.productId.contains("50") -> 50
        else -> 0
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(enabled = !isLoading) { onPurchase() },
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "${credits}クレジット",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "AI分析${credits}回分",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Text(
                text = product.price,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = Primary
            )
        }
    }
}

@Composable
private fun PremiumPromotionCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.tertiaryContainer
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = "Premiumでもっとお得に！",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onTertiaryContainer
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Premium会員は毎月100クレジットが付与されます",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onTertiaryContainer.copy(alpha = 0.9f)
            )
        }
    }
}

@Composable
private fun CurrentSubscriptionCard(status: SubscriptionStatus) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = null,
                    modifier = Modifier.size(24.dp),
                    tint = Primary
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "現在のプラン",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = status.productId ?: "Premium",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onPrimaryContainer
            )
            if (status.autoRenewing) {
                Text(
                    text = "自動更新：有効",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f)
                )
            }
        }
    }
}

@Composable
private fun SubscriptionFooter() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "購入後の払い戻しについては、各ストアのポリシーに従います",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )
    }
}
