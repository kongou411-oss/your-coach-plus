package com.yourcoach.plus.android.ui.screens.pgbase

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.SheetState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.yourcoach.plus.android.ui.theme.AccentOrange
import com.yourcoach.plus.android.ui.theme.Primary
import com.yourcoach.plus.android.ui.theme.Secondary
import com.yourcoach.plus.shared.domain.model.PgBaseArticle

/**
 * 記事詳細BottomSheet
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ArticleDetailSheet(
    article: PgBaseArticle,
    sheetState: SheetState,
    isCompleted: Boolean,
    isPurchased: Boolean,
    isLoading: Boolean,
    userCredits: Int,
    onDismiss: () -> Unit,
    onMarkCompleted: () -> Unit,
    onPurchase: () -> Unit
) {
    val canAccess = !article.isPremium || isPurchased

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = MaterialTheme.colorScheme.surface
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp)
        ) {
            // ヘッダー
            ArticleDetailHeader(
                article = article,
                isCompleted = isCompleted,
                isPurchased = isPurchased
            )

            Spacer(modifier = Modifier.height(16.dp))
            HorizontalDivider()
            Spacer(modifier = Modifier.height(16.dp))

            // 本文エリア
            if (canAccess) {
                // 本文表示
                ArticleContent(
                    content = article.content,
                    modifier = Modifier.weight(1f, fill = false)
                )

                Spacer(modifier = Modifier.height(24.dp))

                // 読了ボタン
                if (!isCompleted) {
                    Button(
                        onClick = onMarkCompleted,
                        enabled = !isLoading,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Secondary
                        ),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                color = Color.White,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = null,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("読了としてマーク")
                        }
                    }
                } else {
                    // 読了済み表示
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(
                                Primary.copy(alpha = 0.1f),
                                RoundedCornerShape(12.dp)
                            )
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = Primary,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "読了済み",
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.Medium,
                            color = Primary
                        )
                    }
                }
            } else {
                // プレミアム記事 - 購入UI
                PremiumPurchaseSection(
                    article = article,
                    userCredits = userCredits,
                    isLoading = isLoading,
                    onPurchase = onPurchase
                )
            }
        }
    }
}

/**
 * 記事詳細ヘッダー
 */
@Composable
private fun ArticleDetailHeader(
    article: PgBaseArticle,
    isCompleted: Boolean,
    isPurchased: Boolean
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        // カテゴリと状態
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // カテゴリタグ
            Box(
                modifier = Modifier
                    .background(
                        Secondary.copy(alpha = 0.1f),
                        RoundedCornerShape(4.dp)
                    )
                    .padding(horizontal = 8.dp, vertical = 4.dp)
            ) {
                Text(
                    text = "${article.category.emoji} ${article.category.displayName}",
                    style = MaterialTheme.typography.labelMedium,
                    color = Secondary
                )
            }

            // 状態アイコン
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (article.isPremium && !isPurchased) {
                    Icon(
                        imageVector = Icons.Default.Lock,
                        contentDescription = "プレミアム",
                        tint = AccentOrange,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                }
                if (isCompleted) {
                    Icon(
                        imageVector = Icons.Default.CheckCircle,
                        contentDescription = "読了済み",
                        tint = Primary,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // タイトル
        Text(
            text = article.title,
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(8.dp))

        // サマリー
        Text(
            text = article.summary,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(8.dp))

        // 読了時間
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                imageVector = Icons.Default.Schedule,
                contentDescription = null,
                modifier = Modifier.size(16.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = "約${article.readingTime}分",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/**
 * 記事本文
 */
@Composable
private fun ArticleContent(
    content: String,
    modifier: Modifier = Modifier
) {
    val scrollState = rememberScrollState()

    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(scrollState)
    ) {
        // シンプルなMarkdown風表示
        // TODO: 本格的なMarkdownライブラリを導入する場合は後で置き換え
        content.split("\n\n").forEach { paragraph ->
            when {
                paragraph.startsWith("# ") -> {
                    Text(
                        text = paragraph.removePrefix("# "),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(vertical = 8.dp)
                    )
                }
                paragraph.startsWith("## ") -> {
                    Text(
                        text = paragraph.removePrefix("## "),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(vertical = 6.dp)
                    )
                }
                paragraph.startsWith("### ") -> {
                    Text(
                        text = paragraph.removePrefix("### "),
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.padding(vertical = 4.dp)
                    )
                }
                paragraph.startsWith("- ") || paragraph.startsWith("* ") -> {
                    // リスト項目
                    paragraph.lines().forEach { line ->
                        if (line.startsWith("- ") || line.startsWith("* ")) {
                            Row(modifier = Modifier.padding(vertical = 2.dp)) {
                                Text(
                                    text = "•",
                                    style = MaterialTheme.typography.bodyMedium,
                                    modifier = Modifier.width(16.dp)
                                )
                                Text(
                                    text = line.removePrefix("- ").removePrefix("* "),
                                    style = MaterialTheme.typography.bodyMedium
                                )
                            }
                        }
                    }
                }
                else -> {
                    Text(
                        text = paragraph,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(vertical = 4.dp)
                    )
                }
            }
        }
    }
}

/**
 * プレミアム購入セクション
 */
@Composable
private fun PremiumPurchaseSection(
    article: PgBaseArticle,
    userCredits: Int,
    isLoading: Boolean,
    onPurchase: () -> Unit
) {
    val purchaseCost = 50
    val canAfford = userCredits >= purchaseCost

    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // ロックアイコン
        Box(
            modifier = Modifier
                .size(80.dp)
                .background(
                    AccentOrange.copy(alpha = 0.1f),
                    RoundedCornerShape(40.dp)
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.Lock,
                contentDescription = null,
                tint = AccentOrange,
                modifier = Modifier.size(40.dp)
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "プレミアム記事",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "この記事を読むには${purchaseCost}クレジットが必要です",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(16.dp))

        // 現在のクレジット表示
        Row(
            modifier = Modifier
                .background(
                    MaterialTheme.colorScheme.surfaceVariant,
                    RoundedCornerShape(8.dp)
                )
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "保有クレジット:",
                style = MaterialTheme.typography.bodyMedium
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "$userCredits",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = if (canAfford) Primary else Color.Red
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        // 購入ボタン
        if (canAfford) {
            Button(
                onClick = onPurchase,
                enabled = !isLoading,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(
                    containerColor = AccentOrange
                ),
                shape = RoundedCornerShape(12.dp)
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = Color.White,
                        strokeWidth = 2.dp
                    )
                } else {
                    Text("${purchaseCost}クレジットで購入")
                }
            }
        } else {
            OutlinedButton(
                onClick = { /* TODO: クレジット購入画面へ遷移 */ },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("クレジットが不足しています")
            }
        }
    }
}
