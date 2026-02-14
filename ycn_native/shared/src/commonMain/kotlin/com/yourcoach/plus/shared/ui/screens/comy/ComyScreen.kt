package com.yourcoach.plus.shared.ui.screens.comy

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.koin.koinScreenModel
import com.yourcoach.plus.shared.domain.model.ComyCategory
import com.yourcoach.plus.shared.ui.components.PlatformAsyncImage
import com.yourcoach.plus.shared.ui.theme.AccentOrange
import com.yourcoach.plus.shared.ui.theme.Primary
import kotlinx.coroutines.launch
import kotlinx.datetime.Clock
import kotlinx.datetime.Instant
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime

/**
 * COMY（コミュニティ）画面
 */
class ComyScreen : Screen {

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    override fun Content() {
        val screenModel = koinScreenModel<ComyScreenModel>()
        val uiState by screenModel.uiState.collectAsState()
        val snackbarHostState = remember { SnackbarHostState() }
        val detailSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        val createSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        val myPageSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        val scope = rememberCoroutineScope()
        var postIdToDelete by remember { mutableStateOf<String?>(null) }
        var isFabExpanded by remember { mutableStateOf(false) }
        var userIdToBlock by remember { mutableStateOf<String?>(null) }

        // エラー表示
        LaunchedEffect(uiState.error) {
            uiState.error?.let { error ->
                snackbarHostState.showSnackbar(error)
                screenModel.clearError()
            }
        }

        Scaffold(
            snackbarHost = { SnackbarHost(snackbarHostState) },
            floatingActionButton = {
                ExpandableFab(
                    isExpanded = isFabExpanded,
                    onToggle = { isFabExpanded = !isFabExpanded },
                    onCreatePost = {
                        isFabExpanded = false
                        screenModel.showCreatePost()
                    },
                    onMyPage = {
                        isFabExpanded = false
                        screenModel.showMyPage()
                    }
                )
            }
        ) { paddingValues ->
            PullToRefreshBox(
                isRefreshing = uiState.isLoading,
                onRefresh = screenModel::loadPosts,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
            ) {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp)
                ) {
                    // ヘッダー
                    item {
                        ComyHeader()
                        Spacer(modifier = Modifier.height(16.dp))
                    }

                    // フィードモードタブ
                    item {
                        FeedModeSelector(
                            currentMode = uiState.feedMode,
                            onModeSelected = screenModel::setFeedMode
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    // カテゴリフィルター
                    item {
                        CategoryFilter(
                            selectedCategory = uiState.selectedCategory,
                            onCategorySelected = screenModel::selectCategory
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                    }

                    // 投稿リスト
                    items(uiState.posts, key = { it.post.id }) { postWithLike ->
                        PostCard(
                            postWithLike = postWithLike,
                            currentUserId = uiState.currentUserId,
                            onClick = { screenModel.selectPost(postWithLike.post.id) },
                            onLikeClick = { screenModel.toggleLike(postWithLike.post.id) },
                            onFollowClick = { screenModel.toggleFollow(postWithLike.post.userId) },
                            onBlockClick = { userIdToBlock = postWithLike.post.userId },
                            onDeleteClick = { postIdToDelete = postWithLike.post.id }
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

        // 投稿詳細BottomSheet
        if (uiState.isPostDetailVisible && uiState.selectedPost != null) {
            PostDetailSheet(
                post = uiState.selectedPost!!,
                sheetState = detailSheetState,
                comments = uiState.selectedPostComments,
                isLiked = screenModel.isSelectedPostLiked(),
                isLoading = uiState.isActionLoading,
                isOwnPost = uiState.selectedPost!!.userId == uiState.currentUserId,
                isFollowingAuthor = uiState.posts.find { it.post.id == uiState.selectedPost?.id }?.isFollowingAuthor ?: false,
                onDismiss = {
                    scope.launch {
                        detailSheetState.hide()
                        screenModel.closePostDetail()
                    }
                },
                onLikeClick = {
                    uiState.selectedPost?.let { post ->
                        screenModel.toggleLike(post.id)
                    }
                },
                onAddComment = { content ->
                    screenModel.addComment(content)
                },
                onDeleteClick = {
                    postIdToDelete = uiState.selectedPost?.id
                },
                onFollowClick = {
                    uiState.selectedPost?.let { post ->
                        screenModel.toggleFollow(post.userId)
                    }
                },
                onBlockClick = {
                    userIdToBlock = uiState.selectedPost?.userId
                }
            )
        }

        // 投稿作成BottomSheet
        if (uiState.isCreatePostVisible) {
            CreatePostSheet(
                sheetState = createSheetState,
                isLoading = uiState.isActionLoading,
                onDismiss = {
                    scope.launch {
                        createSheetState.hide()
                        screenModel.closeCreatePost()
                    }
                },
                onCreatePost = { title, content, category, imageBase64, imageMimeType ->
                    screenModel.createPost(title, content, category, imageBase64, imageMimeType)
                }
            )
        }

        // マイページBottomSheet
        if (uiState.isMyPageVisible) {
            MyPageSheet(
                sheetState = myPageSheetState,
                userName = uiState.currentUserName,
                userPhotoUrl = uiState.currentUserPhotoUrl,
                followerCount = uiState.myFollowerCount,
                followingCount = uiState.myFollowingCount,
                myPosts = screenModel.getMyPosts(),
                onDismiss = {
                    scope.launch {
                        myPageSheetState.hide()
                        screenModel.closeMyPage()
                    }
                },
                onPostClick = { postId ->
                    screenModel.closeMyPage()
                    screenModel.selectPost(postId)
                },
                onLikeClick = { postId ->
                    screenModel.toggleLike(postId)
                }
            )
        }

        // 削除確認ダイアログ
        if (postIdToDelete != null) {
            AlertDialog(
                onDismissRequest = { postIdToDelete = null },
                title = { Text("投稿を削除") },
                text = { Text("この投稿を削除しますか？この操作は取り消せません。") },
                confirmButton = {
                    TextButton(onClick = {
                        screenModel.deletePost(postIdToDelete!!)
                        postIdToDelete = null
                    }) {
                        Text("削除", color = Color.Red)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { postIdToDelete = null }) {
                        Text("キャンセル")
                    }
                }
            )
        }

        // ブロック確認ダイアログ
        if (userIdToBlock != null) {
            AlertDialog(
                onDismissRequest = { userIdToBlock = null },
                title = { Text("ユーザーをブロック") },
                text = { Text("このユーザーをブロックしますか？\nブロックすると、このユーザーの投稿はフィードに表示されなくなります。") },
                confirmButton = {
                    TextButton(onClick = {
                        screenModel.blockUser(userIdToBlock!!)
                        userIdToBlock = null
                    }) {
                        Text("ブロック", color = Color.Red)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { userIdToBlock = null }) {
                        Text("キャンセル")
                    }
                }
            )
        }
    }
}

/**
 * COMYヘッダー
 */
@Composable
private fun ComyHeader() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = AccentOrange.copy(alpha = 0.1f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Forum,
                contentDescription = null,
                tint = AccentOrange,
                modifier = Modifier.size(32.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = "COMY",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "みんなで学び、励まし合うコミュニティ",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

/**
 * 展開式FAB
 */
@Composable
private fun ExpandableFab(
    isExpanded: Boolean,
    onToggle: () -> Unit,
    onCreatePost: () -> Unit,
    onMyPage: () -> Unit
) {
    val rotation by animateFloatAsState(targetValue = if (isExpanded) 45f else 0f, label = "fab_rotation")

    Column(
        horizontalAlignment = Alignment.End,
        modifier = Modifier.padding(bottom = 16.dp)
    ) {
        // 展開時のサブボタン
        if (isExpanded) {
            ExtendedFloatingActionButton(
                onClick = onMyPage,
                containerColor = Primary,
                modifier = Modifier.padding(bottom = 12.dp),
                icon = {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = null,
                        tint = Color.White
                    )
                },
                text = {
                    Text("マイページ", color = Color.White)
                }
            )
            ExtendedFloatingActionButton(
                onClick = onCreatePost,
                containerColor = AccentOrange,
                modifier = Modifier.padding(bottom = 12.dp),
                icon = {
                    Icon(
                        imageVector = Icons.Default.Edit,
                        contentDescription = null,
                        tint = Color.White
                    )
                },
                text = {
                    Text("投稿", color = Color.White)
                }
            )
        }

        // メインFAB
        FloatingActionButton(
            onClick = onToggle,
            containerColor = AccentOrange
        ) {
            Icon(
                imageVector = Icons.Default.Add,
                contentDescription = if (isExpanded) "閉じる" else "メニュー",
                tint = Color.White,
                modifier = Modifier.rotate(rotation)
            )
        }
    }
}

/**
 * フィードモードタブ
 */
@Composable
private fun FeedModeSelector(
    currentMode: ComyFeedMode,
    onModeSelected: (ComyFeedMode) -> Unit
) {
    val selectedIndex = if (currentMode == ComyFeedMode.ALL) 0 else 1

    TabRow(
        selectedTabIndex = selectedIndex,
        containerColor = Color.Transparent,
        contentColor = AccentOrange,
        divider = {}
    ) {
        Tab(
            selected = selectedIndex == 0,
            onClick = { onModeSelected(ComyFeedMode.ALL) },
            text = { Text("すべて") },
            selectedContentColor = AccentOrange,
            unselectedContentColor = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Tab(
            selected = selectedIndex == 1,
            onClick = { onModeSelected(ComyFeedMode.FOLLOWING) },
            text = { Text("フォロー中") },
            selectedContentColor = AccentOrange,
            unselectedContentColor = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

/**
 * カテゴリフィルター
 */
@Composable
private fun CategoryFilter(
    selectedCategory: ComyCategory?,
    onCategorySelected: (ComyCategory?) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // 全て
        FilterChip(
            selected = selectedCategory == null,
            onClick = { onCategorySelected(null) },
            label = { Text("すべて") },
            colors = FilterChipDefaults.filterChipColors(
                selectedContainerColor = AccentOrange.copy(alpha = 0.2f),
                selectedLabelColor = AccentOrange
            )
        )

        // カテゴリ
        ComyCategory.entries.forEach { category ->
            FilterChip(
                selected = selectedCategory == category,
                onClick = { onCategorySelected(category) },
                label = { Text("${category.emoji} ${category.displayName}") },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = AccentOrange.copy(alpha = 0.2f),
                    selectedLabelColor = AccentOrange
                )
            )
        }
    }
}

/**
 * 投稿カード
 */
@Composable
private fun PostCard(
    postWithLike: ComyPostWithLike,
    currentUserId: String,
    onClick: () -> Unit,
    onLikeClick: () -> Unit,
    onFollowClick: () -> Unit,
    onBlockClick: () -> Unit,
    onDeleteClick: () -> Unit
) {
    val post = postWithLike.post
    val isOwnPost = post.userId == currentUserId
    var showMenu by remember { mutableStateOf(false) }

    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // ヘッダー（著者情報）
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // アバター
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .background(Primary.copy(alpha = 0.2f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = null,
                        tint = Primary,
                        modifier = Modifier.size(20.dp)
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = post.authorName,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium
                        )
                        Spacer(modifier = Modifier.weight(1f))
                        Text(
                            text = formatRelativeTime(post.createdAt),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Text(
                        text = "Lv.${post.authorLevel}",
                        style = MaterialTheme.typography.labelSmall,
                        color = AccentOrange
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // フォロー・カテゴリ・メニュー行
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    // カテゴリタグ
                    Box(
                        modifier = Modifier
                            .background(
                                AccentOrange.copy(alpha = 0.1f),
                                RoundedCornerShape(4.dp)
                            )
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = "${post.category.emoji} ${post.category.displayName}",
                            style = MaterialTheme.typography.labelSmall,
                            color = AccentOrange
                        )
                    }

                    // フォローボタン（他人の投稿のみ）
                    if (!isOwnPost) {
                        Spacer(modifier = Modifier.width(8.dp))
                        TextButton(
                            onClick = onFollowClick,
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
                            modifier = Modifier.height(28.dp)
                        ) {
                            Text(
                                text = if (postWithLike.isFollowingAuthor) "フォロー中" else "フォロー",
                                style = MaterialTheme.typography.labelSmall,
                                color = if (postWithLike.isFollowingAuthor) MaterialTheme.colorScheme.onSurfaceVariant else AccentOrange
                            )
                        }
                    }
                }

                // メニュー（他人の投稿のみ）
                if (!isOwnPost) {
                    Box {
                        IconButton(
                            onClick = { showMenu = true },
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.MoreVert,
                                contentDescription = "メニュー",
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                        DropdownMenu(
                            expanded = showMenu,
                            onDismissRequest = { showMenu = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("ブロック", color = Color.Red) },
                                onClick = {
                                    showMenu = false
                                    onBlockClick()
                                },
                                leadingIcon = {
                                    Icon(
                                        Icons.Default.Block,
                                        contentDescription = null,
                                        tint = Color.Red
                                    )
                                }
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // タイトル
            Text(
                text = post.title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(8.dp))

            // 本文プレビュー
            Text(
                text = post.content,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis
            )

            // 画像プレビュー（ある場合）
            if (!post.imageUrl.isNullOrEmpty()) {
                Spacer(modifier = Modifier.height(12.dp))
                PlatformAsyncImage(
                    url = post.imageUrl!!,
                    contentDescription = "投稿画像",
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(160.dp)
                        .clip(RoundedCornerShape(8.dp)),
                    contentScale = ContentScale.Crop
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // アクション
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // いいね
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = onLikeClick,
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            imageVector = if (postWithLike.isLiked) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                            contentDescription = "いいね",
                            tint = if (postWithLike.isLiked) Color.Red else MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                    Text(
                        text = "${post.likeCount}",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                // コメント
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier.size(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.ChatBubbleOutline,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                    Text(
                        text = "${post.commentCount}",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                // 削除（自分の投稿のみ）
                if (isOwnPost) {
                    Spacer(modifier = Modifier.weight(1f))
                    IconButton(
                        onClick = onDeleteClick,
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Delete,
                            contentDescription = "削除",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }
        }
    }
}

/**
 * 相対時間をフォーマット（KMP対応）
 */
internal fun formatRelativeTime(timestamp: Long): String {
    val now = Clock.System.now().toEpochMilliseconds()
    val diff = now - timestamp

    return when {
        diff < 60 * 1000 -> "たった今"
        diff < 60 * 60 * 1000 -> "${diff / (60 * 1000)}分前"
        diff < 24 * 60 * 60 * 1000 -> "${diff / (60 * 60 * 1000)}時間前"
        diff < 7 * 24 * 60 * 60 * 1000 -> "${diff / (24 * 60 * 60 * 1000)}日前"
        else -> {
            val instant = Instant.fromEpochMilliseconds(timestamp)
            val localDate = instant.toLocalDateTime(TimeZone.currentSystemDefault())
            "${localDate.monthNumber}/${localDate.dayOfMonth}"
        }
    }
}
