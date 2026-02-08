package com.yourcoach.plus.shared.ui.screens.badges

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
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
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.koin.koinScreenModel
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.yourcoach.plus.shared.domain.model.Badge
import com.yourcoach.plus.shared.domain.model.BadgeCategory
import com.yourcoach.plus.shared.domain.repository.BadgeProgress
import com.yourcoach.plus.shared.ui.theme.Primary
import kotlinx.datetime.Instant
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime

/**
 * バッジ/実績画面 (Compose Multiplatform)
 */
class BadgesScreen : Screen {

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    override fun Content() {
        val screenModel = koinScreenModel<BadgesScreenModel>()
        val uiState by screenModel.uiState.collectAsState()
        val navigator = LocalNavigator.currentOrThrow

        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("実績") },
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
            if (uiState.isLoading) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    item {
                        BadgeSummaryCard(
                            earnedCount = uiState.earnedCount,
                            totalCount = uiState.totalCount
                        )
                    }

                    item {
                        CategoryFilter(
                            selectedCategory = uiState.selectedCategory,
                            onCategorySelected = { screenModel.selectCategory(it) },
                            uiState = uiState
                        )
                    }

                    items(uiState.filteredBadges) { badge ->
                        val progress = uiState.badgeProgress[badge.id]
                        BadgeCard(
                            badge = badge,
                            progress = progress
                        )
                    }

                    if (uiState.filteredBadges.isEmpty()) {
                        item {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(32.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "バッジがありません",
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
            }
        }

        uiState.error?.let { error ->
            AlertDialog(
                onDismissRequest = { screenModel.clearError() },
                title = { Text("エラー") },
                text = { Text(error) },
                confirmButton = {
                    TextButton(onClick = { screenModel.clearError() }) {
                        Text("OK")
                    }
                }
            )
        }
    }
}

@Composable
private fun BadgeSummaryCard(
    earnedCount: Int,
    totalCount: Int
) {
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
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(CircleShape)
                    .background(
                        Brush.linearGradient(
                            colors = listOf(
                                Color(0xFFFFD700),
                                Color(0xFFFFA500)
                            )
                        )
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.EmojiEvents,
                    contentDescription = null,
                    modifier = Modifier.size(48.dp),
                    tint = Color.White
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "$earnedCount / $totalCount",
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )

            Text(
                text = "バッジ獲得",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onPrimaryContainer
            )

            Spacer(modifier = Modifier.height(12.dp))

            LinearProgressIndicator(
                progress = { if (totalCount > 0) earnedCount.toFloat() / totalCount else 0f },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .clip(RoundedCornerShape(4.dp)),
            )
        }
    }
}

@Composable
private fun CategoryFilter(
    selectedCategory: BadgeCategory?,
    onCategorySelected: (BadgeCategory?) -> Unit,
    uiState: BadgesUiState
) {
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        item {
            FilterChip(
                selected = selectedCategory == null,
                onClick = { onCategorySelected(null) },
                label = {
                    Text("すべて (${uiState.earnedCount}/${uiState.totalCount})")
                }
            )
        }

        items(BadgeCategory.entries) { category ->
            val earned = uiState.getEarnedCountByCategory(category)
            val total = uiState.getTotalCountByCategory(category)

            FilterChip(
                selected = selectedCategory == category,
                onClick = { onCategorySelected(category) },
                label = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            imageVector = getCategoryIcon(category),
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                        Text("${getCategoryName(category)} ($earned/$total)")
                    }
                }
            )
        }
    }
}

@Composable
private fun BadgeCard(
    badge: Badge,
    progress: BadgeProgress?
) {
    val isEarned = badge.isEarned

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .alpha(if (isEarned) 1f else 0.6f),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isEarned)
                MaterialTheme.colorScheme.surfaceVariant
            else
                MaterialTheme.colorScheme.surface
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(CircleShape)
                    .background(
                        if (isEarned)
                            Brush.linearGradient(
                                colors = listOf(
                                    getCategoryColor(badge.category),
                                    getCategoryColor(badge.category).copy(alpha = 0.7f)
                                )
                            )
                        else
                            Brush.linearGradient(
                                colors = listOf(
                                    Color.Gray.copy(alpha = 0.3f),
                                    Color.Gray.copy(alpha = 0.2f)
                                )
                            )
                    )
                    .then(
                        if (isEarned)
                            Modifier.border(
                                width = 2.dp,
                                color = getCategoryColor(badge.category),
                                shape = CircleShape
                            )
                        else
                            Modifier
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = if (isEarned)
                        getCategoryIcon(badge.category)
                    else
                        Icons.Default.Lock,
                    contentDescription = null,
                    modifier = Modifier.size(28.dp),
                    tint = if (isEarned) Color.White else Color.Gray
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column(
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    text = badge.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                Text(
                    text = badge.description,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                if (isEarned && badge.earnedAt != null) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "獲得日: ${formatDate(badge.earnedAt!!)}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                } else if (progress != null && progress.targetValue > 0) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Column {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "進捗",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = "${progress.currentValue}/${progress.targetValue}",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        LinearProgressIndicator(
                            progress = { progress.percentage / 100f },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(4.dp)
                                .clip(RoundedCornerShape(2.dp)),
                        )
                    }
                }
            }

            if (isEarned) {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = "獲得済み",
                    tint = getCategoryColor(badge.category),
                    modifier = Modifier.size(24.dp)
                )
            }
        }
    }
}

private fun getCategoryIcon(category: BadgeCategory): ImageVector = when (category) {
    BadgeCategory.STREAK -> Icons.Default.Whatshot
    BadgeCategory.NUTRITION -> Icons.Default.Restaurant
    BadgeCategory.EXERCISE -> Icons.Default.FitnessCenter
    BadgeCategory.MILESTONE -> Icons.Default.Flag
    BadgeCategory.ACHIEVEMENT -> Icons.Default.Star
    BadgeCategory.SPECIAL -> Icons.Default.Diamond
}

private fun getCategoryName(category: BadgeCategory): String = when (category) {
    BadgeCategory.STREAK -> "連続"
    BadgeCategory.NUTRITION -> "栄養"
    BadgeCategory.EXERCISE -> "運動"
    BadgeCategory.MILESTONE -> "達成"
    BadgeCategory.ACHIEVEMENT -> "実績"
    BadgeCategory.SPECIAL -> "特別"
}

private fun getCategoryColor(category: BadgeCategory): Color = when (category) {
    BadgeCategory.STREAK -> Color(0xFFFF6B35)
    BadgeCategory.NUTRITION -> Color(0xFF4CAF50)
    BadgeCategory.EXERCISE -> Color(0xFF2196F3)
    BadgeCategory.MILESTONE -> Color(0xFF9C27B0)
    BadgeCategory.ACHIEVEMENT -> Color(0xFFFFD700)
    BadgeCategory.SPECIAL -> Color(0xFFE91E63)
}

private fun formatDate(timestamp: Long): String {
    return try {
        val instant = Instant.fromEpochMilliseconds(timestamp)
        val localDateTime = instant.toLocalDateTime(TimeZone.currentSystemDefault())
        "${localDateTime.year}/${localDateTime.monthNumber.toString().padStart(2, '0')}/${localDateTime.dayOfMonth.toString().padStart(2, '0')}"
    } catch (e: Exception) {
        ""
    }
}
