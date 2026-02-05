package com.yourcoach.plus.android.ui.screens.subscription

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.yourcoach.plus.shared.domain.repository.*
import com.yourcoach.plus.shared.domain.service.SubscriptionPlan
import org.koin.androidx.compose.koinViewModel

/**
 * サブスクリプション画面
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SubscriptionScreen(
    userId: String,
    registrationDate: String?,
    subscriptionStatus: String?,
    onNavigateBack: () -> Unit,
    onNavigateToTerms: () -> Unit = {},
    onNavigateToPrivacy: () -> Unit = {},
    viewModel: SubscriptionViewModel = koinViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    // 初期化
    LaunchedEffect(userId) {
        viewModel.initialize(userId, registrationDate, subscriptionStatus)
    }

    // 購入成功時の処理
    LaunchedEffect(uiState.purchaseSuccess) {
        if (uiState.purchaseSuccess) {
            // 成功メッセージを表示後、画面を閉じる
            kotlinx.coroutines.delay(2000)
            viewModel.resetPurchaseSuccess()
            onNavigateBack()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("プレミアムプラン") },
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
                    PremiumHeaderCard(
                        isPremium = uiState.isPremium
                    )
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

                    // サブスクリプション商品
                    val subscriptionProducts = uiState.products.filter {
                        it.type == ProductType.SUBSCRIPTION
                    }
                    items(subscriptionProducts) { product ->
                        SubscriptionProductCard(
                            product = product,
                            isLoading = uiState.isPurchasing,
                            onPurchase = {
                                viewModel.purchaseSubscription(product.productId) {
                                    context as android.app.Activity
                                }
                            }
                        )
                    }
                }

                // クレジットパック（全ユーザーに表示）
                if (uiState.connectionState == BillingConnectionState.CONNECTED) {
                    item {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "クレジット追加購入",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    // クレジット購入の説明カード
                    item {
                        CreditInfoCard()
                    }

                    val creditProducts = uiState.products.filter {
                        it.type == ProductType.INAPP
                    }.sortedByDescending { product ->
                        // 300 → 150 → 50 の順
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
                                viewModel.purchaseCredits(product.productId) {
                                    context as android.app.Activity
                                }
                            }
                        )
                    }

                    // 非Premiumユーザーへのサブスク促進
                    if (!uiState.isPremium) {
                        item {
                            PremiumPromotionCard()
                        }
                    }
                }

                // 既にPremiumの場合
                if (uiState.isPremium && uiState.subscriptionStatus != null) {
                    item {
                        CurrentSubscriptionCard(
                            status = uiState.subscriptionStatus!!
                        )
                    }
                }

                // フッター
                item {
                    SubscriptionFooter(
                        onNavigateToTerms = onNavigateToTerms,
                        onNavigateToPrivacy = onNavigateToPrivacy
                    )
                }
            }

            // ローディング
            if (uiState.isLoading) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Black.copy(alpha = 0.3f)),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }

            // 購入中
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

            // 購入成功
            AnimatedVisibility(
                visible = uiState.purchaseSuccess,
                enter = fadeIn() + scaleIn(),
                exit = fadeOut() + scaleOut()
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Black.copy(alpha = 0.5f)),
                    contentAlignment = Alignment.Center
                ) {
                    Card(
                        modifier = Modifier.padding(32.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.primaryContainer
                        )
                    ) {
                        Column(
                            modifier = Modifier.padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = null,
                                modifier = Modifier.size(64.dp),
                                tint = MaterialTheme.colorScheme.primary
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = "購入完了！",
                                style = MaterialTheme.typography.headlineSmall,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "ありがとうございます",
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                    }
                }
            }
        }
    }

    // エラーダイアログ
    uiState.error?.let { error ->
        AlertDialog(
            onDismissRequest = { viewModel.clearError() },
            title = { Text("エラー") },
            text = { Text(error) },
            confirmButton = {
                TextButton(onClick = { viewModel.clearError() }) {
                    Text("OK")
                }
            }
        )
    }
}

/**
 * プレミアムヘッダーカード
 */
@Composable
private fun PremiumHeaderCard(
    isPremium: Boolean
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isPremium)
                MaterialTheme.colorScheme.primaryContainer
            else
                MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // アイコン
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(CircleShape)
                    .background(
                        if (isPremium)
                            Brush.linearGradient(
                                colors = listOf(
                                    Color(0xFFFFD700),
                                    Color(0xFFFFA500)
                                )
                            )
                        else
                            Brush.linearGradient(
                                colors = listOf(
                                    MaterialTheme.colorScheme.primary,
                                    MaterialTheme.colorScheme.secondary
                                )
                            )
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = if (isPremium) Icons.Default.Star else Icons.Default.WorkspacePremium,
                    contentDescription = null,
                    modifier = Modifier.size(48.dp),
                    tint = Color.White
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // ステータス
            if (isPremium) {
                Text(
                    text = "プレミアム会員",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
                Text(
                    text = "すべての機能をご利用いただけます",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            } else {
                Text(
                    text = "無料プラン",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "プレミアムにアップグレードして\nすべての機能を解放しましょう",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}

/**
 * 機能一覧カード
 */
@Composable
private fun FeaturesCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp)
        ) {
            Text(
                text = "プレミアム特典",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(16.dp))

            val features = listOf(
                Triple(Icons.Default.Explore, "クエスト機能", "ボディメイクをナビ化で迷わない"),
                Triple(Icons.Default.CameraAlt, "写真解析", "写真から栄養素を自動計算"),
                Triple(Icons.Default.Analytics, "毎月100回の分析クレジット", "AI栄養分析・アドバイス"),
                Triple(Icons.Default.AllInclusive, "無制限の記録と履歴", "食事・運動を無制限に記録"),
                Triple(Icons.Default.MenuBook, "PG BASE 教科書", "専門知識が学べる"),
                Triple(Icons.Default.People, "COMY", "仲間と刺激し合う"),
                Triple(Icons.Default.Bookmark, "無制限のテンプレート保存", "お気に入りの食事を保存"),
                Triple(Icons.Default.HeadsetMic, "優先サポート", "お問い合わせ優先対応")
            )

            features.forEach { (icon, title, description) ->
                FeatureItem(
                    icon = icon,
                    title = title,
                    description = description
                )
                if (features.last() != Triple(icon, title, description)) {
                    Spacer(modifier = Modifier.height(12.dp))
                }
            }
        }
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
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primaryContainer),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(24.dp),
                tint = MaterialTheme.colorScheme.primary
            )
        }

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

/**
 * 接続状態カード
 */
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
            when (state) {
                BillingConnectionState.CONNECTING -> {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        strokeWidth = 2.dp
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text("Google Playに接続中...")
                }
                BillingConnectionState.ERROR -> {
                    Icon(
                        imageVector = Icons.Default.Error,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.error
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = "Google Playへの接続に失敗しました",
                        color = MaterialTheme.colorScheme.error
                    )
                }
                else -> {
                    Icon(
                        imageVector = Icons.Default.CloudOff,
                        contentDescription = null
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text("接続されていません")
                }
            }
        }
    }
}

/**
 * サブスクリプション商品カード（月額プラン）
 */
@Composable
private fun SubscriptionProductCard(
    product: ProductInfo,
    isLoading: Boolean,
    onPurchase: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .border(
                width = 2.dp,
                color = Color(0xFFFFF59A), // Premium yellow
                shape = RoundedCornerShape(16.dp)
            ),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFFFFF59A).copy(alpha = 0.1f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Premium アイコン
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.linearGradient(
                                colors = listOf(Color(0xFFFFD700), Color(0xFFFFA500))
                            )
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Star,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(28.dp)
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column {
                    Text(
                        text = "Premium会員",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "ただの筋トレじゃない。これは、あなたを主人公にする物語だ。",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 価格表示
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.Bottom
            ) {
                Text(
                    text = product.price.ifEmpty { "¥940" },
                    style = MaterialTheme.typography.displaySmall,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFFD4A017) // Gold color
                )
                Text(
                    text = "/月",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Text(
                text = "1日あたり約31円",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.fillMaxWidth(),
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(20.dp))

            Button(
                onClick = onPurchase,
                modifier = Modifier.fillMaxWidth(),
                enabled = !isLoading,
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFFFFF59A),
                    contentColor = Color.Black
                )
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp,
                        color = Color.Black
                    )
                } else {
                    Icon(
                        imageVector = Icons.Default.Star,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Premium会員に登録する",
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(vertical = 4.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "いつでもキャンセル可能です",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.fillMaxWidth(),
                textAlign = TextAlign.Center
            )
        }
    }
}

/**
 * クレジット商品カード
 */
@Composable
private fun CreditProductCard(
    product: ProductInfo,
    isLoading: Boolean,
    onPurchase: () -> Unit
) {
    val creditCount = when {
        product.productId.contains("300") -> 300
        product.productId.contains("150") -> 150
        product.productId.contains("50") -> 50
        else -> 0
    }

    // バッジとお得度
    val badge = when (creditCount) {
        150 -> "人気"
        300 -> "お得"
        else -> null
    }

    // 1回あたりの価格を計算（価格情報から）
    val pricePerCredit = when (creditCount) {
        50 -> "¥8"
        150 -> "¥6.7"
        300 -> "¥6"
        else -> null
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .border(
                width = 1.dp,
                color = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f),
                shape = RoundedCornerShape(12.dp)
            ),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            // バッジ（上部に表示）
            badge?.let {
                val badgeColor = if (creditCount == 300) {
                    Brush.linearGradient(listOf(Color(0xFFFF8C00), Color(0xFFFF4500)))
                } else {
                    Brush.linearGradient(listOf(Color(0xFFFF6B6B), Color(0xFFEE5A24)))
                }

                Box(
                    modifier = Modifier
                        .padding(start = 12.dp, top = 8.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(badgeColor)
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = if (badge != null) 8.dp else 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    // クレジットアイコン
                    Box(
                        modifier = Modifier
                            .size(52.dp)
                            .clip(CircleShape)
                            .background(
                                Brush.linearGradient(
                                    colors = listOf(Color(0xFFFFF59A), Color(0xFFFFD700))
                                )
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "$creditCount",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF8B7300)
                        )
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Column {
                        Text(
                            text = "${creditCount}回パック",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "AI分析${creditCount}回分",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        // 1回あたりの価格
                        if (creditCount >= 150 && pricePerCredit != null) {
                            Text(
                                text = "1回あたり $pricePerCredit",
                                style = MaterialTheme.typography.labelSmall,
                                color = Color(0xFF2E7D32), // Green
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }

                // 価格と購入ボタン
                Column(
                    horizontalAlignment = Alignment.End
                ) {
                    Text(
                        text = product.price.ifEmpty {
                            when (creditCount) {
                                50 -> "¥400"
                                150 -> "¥1,000"
                                300 -> "¥1,800"
                                else -> ""
                            }
                        },
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFFD4A017) // Gold
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    Button(
                        onClick = onPurchase,
                        enabled = !isLoading,
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFFFFF59A),
                            contentColor = Color.Black
                        ),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                strokeWidth = 2.dp,
                                color = Color.Black
                            )
                        } else {
                            Text(
                                text = "購入",
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                        }
                    }
                }
            }
        }
    }
}

/**
 * クレジット購入説明カード
 */
@Composable
private fun CreditInfoCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.Top
        ) {
            Icon(
                imageVector = Icons.Default.Info,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(20.dp)
            )

            Spacer(modifier = Modifier.width(12.dp))

            Column {
                Text(
                    text = "クレジットについて",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "分析、クエスト生成、写真解析、教科書購入に消費します。\n購入したクレジットに有効期限はありません。",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

/**
 * Premium促進カード
 */
@Composable
private fun PremiumPromotionCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFFFFF59A).copy(alpha = 0.15f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Star,
                contentDescription = null,
                tint = Color(0xFFD4A017),
                modifier = Modifier.size(24.dp)
            )

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Premium会員がお得！",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "月額¥940で毎月100回分のクレジット+全機能が使い放題",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

/**
 * 現在のサブスクリプションカード
 */
@Composable
private fun CurrentSubscriptionCard(status: SubscriptionStatus) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "現在のプラン",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = status.productId?.let {
                    if (it.contains("yearly")) "年間プレミアム" else "月額プレミアム"
                } ?: "プレミアム",
                style = MaterialTheme.typography.bodyLarge
            )

            if (status.autoRenewing) {
                Text(
                    text = "自動更新: ON",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "サブスクリプションの管理はGoogle Playストアから行えます",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/**
 * フッター
 */
@Composable
private fun SubscriptionFooter(
    onNavigateToTerms: () -> Unit,
    onNavigateToPrivacy: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "サブスクリプションはいつでもキャンセルできます",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(8.dp))

        Row(
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "利用規約",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.primary,
                textDecoration = TextDecoration.Underline,
                modifier = Modifier.clickable { onNavigateToTerms() }
            )
            Text(
                text = "プライバシーポリシー",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.primary,
                textDecoration = TextDecoration.Underline,
                modifier = Modifier.clickable { onNavigateToPrivacy() }
            )
        }
    }
}
