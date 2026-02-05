package com.yourcoach.plus.android.ui.screens.settings

import android.app.Activity
import android.net.Uri
import android.util.Log
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Help
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.yourcoach.plus.android.auth.GoogleAuthHelper
import com.yourcoach.plus.android.ui.theme.AccentGreen
import com.yourcoach.plus.android.ui.theme.AccentOrange
import com.yourcoach.plus.android.ui.theme.Primary
import com.yourcoach.plus.android.ui.theme.ScoreCalories
import com.yourcoach.plus.android.ui.theme.ScoreProtein
import com.yourcoach.plus.android.ui.theme.ScoreCarbs
import com.yourcoach.plus.android.ui.theme.ScoreFat
import com.yourcoach.plus.shared.domain.model.CustomFood
import kotlinx.coroutines.launch
import org.koin.androidx.compose.koinViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.compose.ui.platform.LocalLifecycleOwner

/**
 * 設定タブの定義
 */
enum class SettingsTab(
    val label: String,
    val icon: ImageVector
) {
    BASIC("基本", Icons.Default.Person),
    FEATURES("機能", Icons.Default.Tune),
    DATA("データ", Icons.Default.Storage),
    OTHER("その他", Icons.Default.MoreHoriz)
}

/**
 * 設定画面（タブ構造）
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    viewModel: SettingsViewModel = koinViewModel(),
    onNavigateToProfile: () -> Unit = {},
    onNavigateToNotifications: () -> Unit = {},
    onNavigateToBadges: () -> Unit = {},
    onNavigateToPremium: () -> Unit = {},
    onNavigateToRoutine: () -> Unit = {},
    onNavigateToTemplates: () -> Unit = {},
    onNavigateToMealSlots: () -> Unit = {},
    onNavigateToHelp: () -> Unit = {},
    onNavigateToTerms: () -> Unit = {},
    onNavigateToPrivacy: () -> Unit = {},
    onNavigateToFeedback: () -> Unit = {},
    onLoggedOut: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var showLogoutDialog by remember { mutableStateOf(false) }
    var showDeleteAccountDialog by remember { mutableStateOf(false) }
    var showReauthDialog by remember { mutableStateOf(false) }
    var isReauthenticating by remember { mutableStateOf(false) }

    val pagerState = rememberPagerState(pageCount = { SettingsTab.entries.size })
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val activity = context as? Activity
    val lifecycleOwner = LocalLifecycleOwner.current

    // 画面が再表示されたときにユーザー情報を再読み込み
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                viewModel.loadUserInfo()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    // ログアウト完了時
    LaunchedEffect(uiState.isLoggedOut) {
        if (uiState.isLoggedOut) {
            onLoggedOut()
        }
    }

    // アカウント削除完了時
    LaunchedEffect(uiState.isAccountDeleted) {
        if (uiState.isAccountDeleted) {
            onLoggedOut()
        }
    }

    // エラー表示
    LaunchedEffect(uiState.error) {
        uiState.error?.let { error ->
            snackbarHostState.showSnackbar(error)
            viewModel.clearError()
        }
    }

    // クレジット追加完了メッセージ
    LaunchedEffect(uiState.creditsAddedMessage) {
        uiState.creditsAddedMessage?.let { message ->
            snackbarHostState.showSnackbar(message)
            viewModel.clearCreditsAddedMessage()
        }
    }

    // カスタム食品アクションメッセージ
    LaunchedEffect(uiState.customFoodActionMessage) {
        uiState.customFoodActionMessage?.let { message ->
            snackbarHostState.showSnackbar(message)
            viewModel.clearCustomFoodActionMessage()
        }
    }

    // 再認証が必要な場合
    LaunchedEffect(uiState.needsReauthentication) {
        if (uiState.needsReauthentication) {
            showDeleteAccountDialog = false
            showReauthDialog = true
        }
    }

    // ログアウト確認ダイアログ
    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text("ログアウト") },
            text = { Text("ログアウトしてもよろしいですか？") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showLogoutDialog = false
                        viewModel.logout()
                    }
                ) {
                    Text("ログアウト", color = Color.Red)
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) {
                    Text("キャンセル")
                }
            }
        )
    }

    // アカウント削除確認ダイアログ
    if (showDeleteAccountDialog) {
        AlertDialog(
            onDismissRequest = {
                if (!uiState.isDeletingAccount) {
                    showDeleteAccountDialog = false
                }
            },
            title = { Text("アカウント削除") },
            text = {
                Column {
                    Text("本当にアカウントを削除しますか？")
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "この操作は取り消せません。すべてのデータ（食事記録、運動記録、分析履歴など）が完全に削除されます。",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error
                    )
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.deleteAccount()
                    },
                    enabled = !uiState.isDeletingAccount
                ) {
                    if (uiState.isDeletingAccount) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text("削除する", color = Color.Red)
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { showDeleteAccountDialog = false },
                    enabled = !uiState.isDeletingAccount
                ) {
                    Text("キャンセル")
                }
            }
        )
    }

    // 再認証ダイアログ
    if (showReauthDialog) {
        AlertDialog(
            onDismissRequest = {
                if (!isReauthenticating) {
                    showReauthDialog = false
                    viewModel.clearReauthenticationRequest()
                }
            },
            title = { Text("再認証が必要です") },
            text = {
                Column {
                    Text("セキュリティのため、アカウントを削除するには再度Googleでログインしてください。")
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "これはFirebaseのセキュリティ機能です。",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        Log.d("SettingsScreen", "Reauth button clicked, activity: $activity")
                        activity?.let { act ->
                            isReauthenticating = true
                            scope.launch {
                                Log.d("SettingsScreen", "Starting Google reauth...")
                                val googleAuthHelper = GoogleAuthHelper(act)
                                val result = googleAuthHelper.signInForReauthentication()
                                Log.d("SettingsScreen", "Google reauth result: ${result.isSuccess}")
                                result.onSuccess { idToken ->
                                    Log.d("SettingsScreen", "Got idToken, length: ${idToken.length}")
                                    showReauthDialog = false
                                    viewModel.reauthenticateAndDelete(idToken)
                                }.onFailure { error ->
                                    Log.e("SettingsScreen", "Google reauth failed: ${error.message}", error)
                                    isReauthenticating = false
                                    scope.launch {
                                        snackbarHostState.showSnackbar(error.message ?: "認証に失敗しました")
                                    }
                                }
                            }
                        } ?: run {
                            Log.e("SettingsScreen", "Activity is NULL!")
                        }
                    },
                    enabled = !isReauthenticating && activity != null,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary
                    )
                ) {
                    if (isReauthenticating) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            strokeWidth = 2.dp,
                            color = MaterialTheme.colorScheme.onPrimary
                        )
                    } else {
                        Text("Googleで再認証")
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        showReauthDialog = false
                        viewModel.clearReauthenticationRequest()
                    },
                    enabled = !isReauthenticating
                ) {
                    Text("キャンセル")
                }
            }
        )
    }

    // 画像選択ランチャー
    val imagePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let { viewModel.uploadProfilePhoto(it) }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // プロフィール・アカウントセクション（展開式）
            ProfileAccountSection(
                userName = uiState.user?.profile?.nickname
                    ?: uiState.user?.displayName
                    ?: uiState.user?.email?.substringBefore("@")
                    ?: "ゲスト",
                email = uiState.user?.email ?: "",
                userId = uiState.user?.uid ?: "",
                photoUrl = uiState.user?.photoUrl,
                isPremium = uiState.isPremium,
                isUploadingPhoto = uiState.isUploadingPhoto,
                organizationName = uiState.organizationName,
                isValidatingOrganization = uiState.isValidatingOrganization,
                organizationMessage = uiState.organizationMessage,
                onPhotoClick = { imagePickerLauncher.launch("image/*") },
                onLogout = { showLogoutDialog = true },
                onDeleteAccount = { showDeleteAccountDialog = true },
                onValidateOrganization = { name -> viewModel.validateOrganization(name) },
                onLeaveOrganization = { viewModel.leaveOrganization() },
                onClearOrganizationMessage = { viewModel.clearOrganizationMessage() },
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )

            // タブ
            TabRow(
                selectedTabIndex = pagerState.currentPage,
                containerColor = MaterialTheme.colorScheme.surface,
                contentColor = MaterialTheme.colorScheme.primary
            ) {
                SettingsTab.entries.forEachIndexed { index, tab ->
                    Tab(
                        selected = pagerState.currentPage == index,
                        onClick = {
                            scope.launch {
                                pagerState.animateScrollToPage(index)
                            }
                        },
                        text = {
                            Text(
                                text = tab.label,
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = if (pagerState.currentPage == index) FontWeight.Bold else FontWeight.Normal
                            )
                        },
                        icon = {
                            Icon(
                                imageVector = tab.icon,
                                contentDescription = tab.label,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    )
                }
            }

            // タブコンテンツ
            HorizontalPager(
                state = pagerState,
                modifier = Modifier.fillMaxSize()
            ) { page ->
                when (SettingsTab.entries[page]) {
                    SettingsTab.BASIC -> BasicSettingsTab(
                        onNavigateToProfile = onNavigateToProfile,
                        onNavigateToNotifications = onNavigateToNotifications,
                        onNavigateToBadges = onNavigateToBadges,
                        onNavigateToPremium = onNavigateToPremium,
                        isPremium = uiState.isPremium
                    )
                    SettingsTab.FEATURES -> FeaturesSettingsTab(
                        onNavigateToRoutine = onNavigateToRoutine,
                        onNavigateToTemplates = onNavigateToTemplates,
                        onNavigateToMealSlots = onNavigateToMealSlots
                    )
                    SettingsTab.DATA -> DataSettingsTab(
                        customFoods = uiState.customFoods,
                        isLoadingCustomFoods = uiState.isLoadingCustomFoods,
                        totalCredits = uiState.freeCredits + uiState.paidCredits,
                        isAnalyzingNutrition = uiState.isAnalyzingNutrition,
                        analyzingFoodId = uiState.analyzingFoodId,
                        onUpdateCustomFood = { id, name, cal, p, c, f, fiber ->
                            viewModel.updateCustomFood(id, name, cal, p, c, f, fiber)
                        },
                        onDeleteCustomFood = { viewModel.deleteCustomFood(it) },
                        onAnalyzeNutrition = { viewModel.analyzeCustomFoodNutrition(it) }
                    )
                    SettingsTab.OTHER -> OtherSettingsTab(
                        appVersion = uiState.appVersion,
                        onNavigateToHelp = onNavigateToHelp,
                        onNavigateToFeedback = onNavigateToFeedback,
                        onNavigateToTerms = onNavigateToTerms,
                        onNavigateToPrivacy = onNavigateToPrivacy
                    )
                }
            }
        }
    }
}

/**
 * 基本タブ
 */
@Composable
private fun BasicSettingsTab(
    onNavigateToProfile: () -> Unit,
    onNavigateToNotifications: () -> Unit,
    onNavigateToBadges: () -> Unit,
    onNavigateToPremium: () -> Unit,
    isPremium: Boolean
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            SettingsCard {
                SettingsRow(
                    icon = Icons.Default.Person,
                    title = "プロフィール設定",
                    subtitle = "身長・体重・目標などの編集",
                    onClick = onNavigateToProfile
                )
                HorizontalDivider(modifier = Modifier.padding(start = 56.dp))
                SettingsRow(
                    icon = Icons.Default.Notifications,
                    title = "通知設定",
                    subtitle = "リマインダー・通知の管理",
                    onClick = onNavigateToNotifications
                )
                HorizontalDivider(modifier = Modifier.padding(start = 56.dp))
                SettingsRow(
                    icon = Icons.Default.EmojiEvents,
                    title = "実績・バッジ",
                    subtitle = "獲得した実績を確認",
                    onClick = onNavigateToBadges
                )
                HorizontalDivider(modifier = Modifier.padding(start = 56.dp))
                SettingsRow(
                    icon = Icons.Default.Star,
                    title = "プレミアム",
                    subtitle = if (isPremium) "プレミアム会員" else "機能をアップグレード",
                    onClick = onNavigateToPremium,
                    badge = if (!isPremium) "アップグレード" else null,
                    badgeColor = AccentOrange
                )
            }
        }

        item { Spacer(modifier = Modifier.height(60.dp)) }
    }
}

/**
 * 機能タブ
 */
@Composable
private fun FeaturesSettingsTab(
    onNavigateToRoutine: () -> Unit,
    onNavigateToTemplates: () -> Unit,
    onNavigateToMealSlots: () -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // ルーティン・テンプレート設定セクション
        item {
            SectionHeader("ルーティン・テンプレート")
        }

        item {
            SettingsCard {
                SettingsRow(
                    icon = Icons.Default.Repeat,
                    title = "ルーティン設定",
                    subtitle = "曜日ごとの分割法を設定",
                    onClick = onNavigateToRoutine
                )
                HorizontalDivider(modifier = Modifier.padding(start = 56.dp))
                SettingsRow(
                    icon = Icons.Default.BookmarkAdd,
                    title = "テンプレート管理",
                    subtitle = "食事・運動テンプレートを編集",
                    onClick = onNavigateToTemplates
                )
                HorizontalDivider(modifier = Modifier.padding(start = 56.dp))
                SettingsRow(
                    icon = Icons.Default.Schedule,
                    title = "食事スロット設定",
                    subtitle = "固定/AI提案/ルーティン連動を設定",
                    onClick = onNavigateToMealSlots
                )
            }
        }

        item { Spacer(modifier = Modifier.height(60.dp)) }
    }
}

/**
 * データタブ
 */
@Composable
private fun DataSettingsTab(
    customFoods: List<CustomFood>,
    isLoadingCustomFoods: Boolean,
    totalCredits: Int,
    isAnalyzingNutrition: Boolean,
    analyzingFoodId: String?,
    onUpdateCustomFood: (String, String, Int, Float, Float, Float, Float) -> Unit,
    onDeleteCustomFood: (String) -> Unit,
    onAnalyzeNutrition: (String) -> Unit
) {
    var showCustomFoodsDialog by remember { mutableStateOf(false) }
    var editingFood by remember { mutableStateOf<CustomFood?>(null) }
    var deletingFood by remember { mutableStateOf<CustomFood?>(null) }

    // カスタム食品一覧ダイアログ
    if (showCustomFoodsDialog) {
        CustomFoodsListDialog(
            customFoods = customFoods,
            isLoading = isLoadingCustomFoods,
            onEdit = { food ->
                editingFood = food
                showCustomFoodsDialog = false
            },
            onDelete = { food ->
                deletingFood = food
            },
            onDismiss = { showCustomFoodsDialog = false }
        )
    }

    // 編集ダイアログ
    editingFood?.let { food ->
        CustomFoodEditDialog(
            food = food,
            totalCredits = totalCredits,
            isAnalyzing = isAnalyzingNutrition && analyzingFoodId == food.id,
            onSave = { name, cal, p, c, f, fiber ->
                onUpdateCustomFood(food.id, name, cal, p, c, f, fiber)
                editingFood = null
            },
            onAnalyze = {
                onAnalyzeNutrition(food.id)
            },
            onDismiss = { editingFood = null }
        )
    }

    // 削除確認ダイアログ
    deletingFood?.let { food ->
        AlertDialog(
            onDismissRequest = { deletingFood = null },
            title = { Text("削除確認") },
            text = { Text("「${food.name}」を削除しますか？") },
            confirmButton = {
                TextButton(
                    onClick = {
                        onDeleteCustomFood(food.id)
                        deletingFood = null
                    }
                ) {
                    Text("削除", color = Color.Red)
                }
            },
            dismissButton = {
                TextButton(onClick = { deletingFood = null }) {
                    Text("キャンセル")
                }
            }
        )
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            SectionHeader("カスタム食品")
        }

        item {
            SettingsCard {
                SettingsRow(
                    icon = Icons.Default.Restaurant,
                    title = "カスタム食品を管理",
                    subtitle = if (customFoods.isEmpty()) "登録なし" else "${customFoods.size}件登録済み",
                    onClick = { showCustomFoodsDialog = true }
                )
            }
        }

        item { Spacer(modifier = Modifier.height(60.dp)) }
    }
}

/**
 * カスタム食品一覧ダイアログ
 */
@Composable
private fun CustomFoodsListDialog(
    customFoods: List<CustomFood>,
    isLoading: Boolean,
    onEdit: (CustomFood) -> Unit,
    onDelete: (CustomFood) -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text("カスタム食品", fontWeight = FontWeight.Bold)
        },
        text = {
            if (isLoading) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            } else if (customFoods.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(140.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            imageVector = Icons.Default.Restaurant,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "カスタム食品はありません",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            "AI写真解析でDB未登録の食品を",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            "記録すると自動で保存されます",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 400.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(customFoods.size) { index ->
                        val food = customFoods[index]
                        CustomFoodItem(
                            food = food,
                            onEdit = { onEdit(food) },
                            onDelete = { onDelete(food) }
                        )
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("閉じる")
            }
        }
    )
}

/**
 * カスタム食品アイテム
 */
@Composable
private fun CustomFoodItem(
    food: CustomFood,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = food.name,
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.weight(1f, fill = false),
                        maxLines = 1
                    )
                    if (food.isAiAnalyzed) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = "ミクロ取得済み",
                            tint = AccentGreen,
                            modifier = Modifier.size(14.dp)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(2.dp))
                // PFC+カロリーを1行で色分け表示
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = "${food.calories}kcal",
                        style = MaterialTheme.typography.bodySmall,
                        color = ScoreCalories
                    )
                    Text(
                        text = "P${food.protein.toInt()}",
                        style = MaterialTheme.typography.bodySmall,
                        color = ScoreProtein
                    )
                    Text(
                        text = "F${food.fat.toInt()}",
                        style = MaterialTheme.typography.bodySmall,
                        color = ScoreFat
                    )
                    Text(
                        text = "C${food.carbs.toInt()}",
                        style = MaterialTheme.typography.bodySmall,
                        color = ScoreCarbs
                    )
                }
                if (food.usageCount > 0) {
                    Text(
                        text = "使用${food.usageCount}回",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Row {
                IconButton(
                    onClick = onEdit,
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Edit,
                        contentDescription = "編集",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp)
                    )
                }
                IconButton(
                    onClick = onDelete,
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Delete,
                        contentDescription = "削除",
                        tint = Color.Red,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}

/**
 * カスタム食品編集ダイアログ
 */
@Composable
private fun CustomFoodEditDialog(
    food: CustomFood,
    totalCredits: Int,
    isAnalyzing: Boolean,
    onSave: (String, Int, Float, Float, Float, Float) -> Unit,
    onAnalyze: () -> Unit,
    onDismiss: () -> Unit
) {
    var name by remember { mutableStateOf(food.name) }
    var calories by remember { mutableStateOf(food.calories.toString()) }
    var protein by remember { mutableStateOf(food.protein.toString()) }
    var carbs by remember { mutableStateOf(food.carbs.toString()) }
    var fat by remember { mutableStateOf(food.fat.toString()) }
    var fiber by remember { mutableStateOf(food.fiber.toString()) }
    var showMicroNutrients by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = { if (!isAnalyzing) onDismiss() },
        title = { Text("カスタム食品を編集", fontWeight = FontWeight.Bold) },
        text = {
            Column(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.verticalScroll(rememberScrollState())
            ) {
                Text(
                    "100gあたりの栄養素",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("食品名") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = calories,
                    onValueChange = { calories = it.filter { c -> c.isDigit() } },
                    label = { Text("カロリー (kcal)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = protein,
                        onValueChange = { protein = it.filter { c -> c.isDigit() || c == '.' } },
                        label = { Text("P (g)") },
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = fat,
                        onValueChange = { fat = it.filter { c -> c.isDigit() || c == '.' } },
                        label = { Text("F (g)") },
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = carbs,
                        onValueChange = { carbs = it.filter { c -> c.isDigit() || c == '.' } },
                        label = { Text("C (g)") },
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                }

                OutlinedTextField(
                    value = fiber,
                    onValueChange = { fiber = it.filter { c -> c.isDigit() || c == '.' } },
                    label = { Text("食物繊維 (g)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

                // ミクロ栄養素セクション
                Text(
                    "ミクロ栄養素（ビタミン・ミネラル）",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                if (food.isAiAnalyzed) {
                    // 解析済み表示
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = AccentGreen.copy(alpha = 0.1f)
                        )
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = AccentGreen,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Column {
                                Text(
                                    "AI解析済み",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Medium,
                                    color = AccentGreen
                                )
                                Text(
                                    "ビタミン13種・ミネラル13種を取得済み",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }

                    // ミクロ栄養素の詳細表示トグル
                    TextButton(
                        onClick = { showMicroNutrients = !showMicroNutrients },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(if (showMicroNutrients) "詳細を閉じる" else "詳細を表示")
                        Icon(
                            if (showMicroNutrients) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                            contentDescription = null
                        )
                    }

                    if (showMicroNutrients) {
                        MicroNutrientsDisplay(food)
                    }
                } else {
                    // 未解析 - AI解析ボタン
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                        )
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                "ミクロ栄養素: 未取得",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.height(8.dp))

                            Button(
                                onClick = onAnalyze,
                                enabled = !isAnalyzing && totalCredits >= 1,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = AccentOrange
                                )
                            ) {
                                if (isAnalyzing) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(16.dp),
                                        color = Color.White,
                                        strokeWidth = 2.dp
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("解析中...")
                                } else {
                                    Icon(
                                        Icons.Default.AutoAwesome,
                                        contentDescription = null,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("ミクロ取得 (1クレジット)")
                                }
                            }

                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                "残りクレジット: $totalCredits",
                                style = MaterialTheme.typography.labelSmall,
                                color = if (totalCredits >= 1) MaterialTheme.colorScheme.onSurfaceVariant else Color.Red
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    onSave(
                        name,
                        calories.toIntOrNull() ?: 0,
                        protein.toFloatOrNull() ?: 0f,
                        carbs.toFloatOrNull() ?: 0f,
                        fat.toFloatOrNull() ?: 0f,
                        fiber.toFloatOrNull() ?: 0f
                    )
                },
                enabled = name.isNotBlank() && !isAnalyzing
            ) {
                Text("保存")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !isAnalyzing) {
                Text("キャンセル")
            }
        }
    )
}

/**
 * ミクロ栄養素の詳細表示
 */
@Composable
private fun MicroNutrientsDisplay(food: CustomFood) {
    Column(
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // 品質指標
        Text(
            "品質指標",
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold
        )
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                NutrientRow("GI値", "${food.gi}")
                NutrientRow("DIAAS", "${String.format("%.2f", food.diaas)}")
            }
            Column(modifier = Modifier.weight(1f)) {
                NutrientRow("糖質", "${String.format("%.1f", food.sugar)}g")
            }
        }

        Spacer(modifier = Modifier.height(4.dp))

        // 食物繊維詳細
        Text(
            "食物繊維",
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold
        )
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                NutrientRow("総量", "${String.format("%.1f", food.fiber)}g")
                NutrientRow("水溶性", "${String.format("%.1f", food.solubleFiber)}g")
            }
            Column(modifier = Modifier.weight(1f)) {
                NutrientRow("不溶性", "${String.format("%.1f", food.insolubleFiber)}g")
            }
        }

        Spacer(modifier = Modifier.height(4.dp))

        // 脂肪酸
        Text(
            "脂肪酸",
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold
        )
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                NutrientRow("飽和", "${String.format("%.1f", food.saturatedFat)}g")
                NutrientRow("一価不飽和", "${String.format("%.1f", food.monounsaturatedFat)}g")
            }
            Column(modifier = Modifier.weight(1f)) {
                NutrientRow("多価不飽和", "${String.format("%.1f", food.polyunsaturatedFat)}g")
            }
        }

        Spacer(modifier = Modifier.height(4.dp))

        // ビタミン
        Text(
            "ビタミン",
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold
        )
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                NutrientRow("A", "${food.vitaminA.toInt()}μg")
                NutrientRow("B1", "${String.format("%.2f", food.vitaminB1)}mg")
                NutrientRow("B2", "${String.format("%.2f", food.vitaminB2)}mg")
                NutrientRow("B6", "${String.format("%.2f", food.vitaminB6)}mg")
                NutrientRow("B12", "${String.format("%.1f", food.vitaminB12)}μg")
                NutrientRow("C", "${food.vitaminC.toInt()}mg")
                NutrientRow("D", "${String.format("%.1f", food.vitaminD)}μg")
            }
            Column(modifier = Modifier.weight(1f)) {
                NutrientRow("E", "${String.format("%.1f", food.vitaminE)}mg")
                NutrientRow("K", "${food.vitaminK.toInt()}μg")
                NutrientRow("ナイアシン", "${String.format("%.1f", food.niacin)}mg")
                NutrientRow("パントテン酸", "${String.format("%.2f", food.pantothenicAcid)}mg")
                NutrientRow("ビオチン", "${String.format("%.1f", food.biotin)}μg")
                NutrientRow("葉酸", "${food.folicAcid.toInt()}μg")
            }
        }

        Spacer(modifier = Modifier.height(4.dp))

        // ミネラル
        Text(
            "ミネラル",
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold
        )
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                NutrientRow("ナトリウム", "${food.sodium.toInt()}mg")
                NutrientRow("カリウム", "${food.potassium.toInt()}mg")
                NutrientRow("カルシウム", "${food.calcium.toInt()}mg")
                NutrientRow("マグネシウム", "${food.magnesium.toInt()}mg")
                NutrientRow("リン", "${food.phosphorus.toInt()}mg")
                NutrientRow("鉄", "${String.format("%.1f", food.iron)}mg")
                NutrientRow("亜鉛", "${String.format("%.1f", food.zinc)}mg")
            }
            Column(modifier = Modifier.weight(1f)) {
                NutrientRow("銅", "${String.format("%.2f", food.copper)}mg")
                NutrientRow("マンガン", "${String.format("%.2f", food.manganese)}mg")
                NutrientRow("ヨウ素", "${food.iodine.toInt()}μg")
                NutrientRow("セレン", "${food.selenium.toInt()}μg")
                NutrientRow("クロム", "${food.chromium.toInt()}μg")
                NutrientRow("モリブデン", "${food.molybdenum.toInt()}μg")
            }
        }
    }
}

@Composable
private fun NutrientRow(name: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 1.dp, horizontal = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            name,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            value,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Medium
        )
    }
}

/**
 * その他タブ
 */
@Composable
private fun OtherSettingsTab(
    appVersion: String,
    onNavigateToHelp: () -> Unit,
    onNavigateToFeedback: () -> Unit,
    onNavigateToTerms: () -> Unit,
    onNavigateToPrivacy: () -> Unit
) {
    val context = LocalContext.current

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            SectionHeader("サポート")
        }

        item {
            SettingsCard {
                SettingsRow(
                    icon = Icons.AutoMirrored.Filled.Help,
                    title = "ヘルプ",
                    subtitle = "使い方ガイド",
                    onClick = onNavigateToHelp
                )
                HorizontalDivider(modifier = Modifier.padding(start = 56.dp))
                SettingsRow(
                    icon = Icons.Default.Feedback,
                    title = "フィードバック",
                    subtitle = "ご意見・ご要望をお聞かせください",
                    onClick = onNavigateToFeedback
                )
            }
        }

        item {
            SectionHeader("法的情報")
        }

        item {
            SettingsCard {
                SettingsRow(
                    icon = Icons.Default.Description,
                    title = "利用規約",
                    onClick = onNavigateToTerms
                )
                HorizontalDivider(modifier = Modifier.padding(start = 56.dp))
                SettingsRow(
                    icon = Icons.Default.Lock,
                    title = "プライバシーポリシー",
                    onClick = onNavigateToPrivacy
                )
                HorizontalDivider(modifier = Modifier.padding(start = 56.dp))
                SettingsRow(
                    icon = Icons.Default.Info,
                    title = "アプリについて",
                    subtitle = "バージョン $appVersion",
                    onClick = {
                        val intent = android.content.Intent(
                            android.content.Intent.ACTION_VIEW,
                            Uri.parse("https://your-coach-plus.web.app/home.html")
                        )
                        context.startActivity(intent)
                    }
                )
            }
        }

        item { Spacer(modifier = Modifier.height(60.dp)) }
    }
}

/**
 * プロフィール・アカウントセクション（展開式）
 */
@Composable
private fun ProfileAccountSection(
    userName: String,
    email: String,
    userId: String,
    photoUrl: String?,
    isPremium: Boolean,
    isUploadingPhoto: Boolean,
    organizationName: String?,
    isValidatingOrganization: Boolean,
    organizationMessage: String?,
    onPhotoClick: () -> Unit,
    onLogout: () -> Unit,
    onDeleteAccount: () -> Unit,
    onValidateOrganization: (String) -> Unit,
    onLeaveOrganization: () -> Unit,
    onClearOrganizationMessage: () -> Unit,
    modifier: Modifier = Modifier
) {
    var isExpanded by remember { mutableStateOf(false) }
    val clipboardManager = LocalClipboardManager.current
    var showCopiedMessage by remember { mutableStateOf(false) }
    var organizationInput by remember { mutableStateOf("") }
    var showLeaveConfirmDialog by remember { mutableStateOf(false) }

    // コピー完了メッセージを自動で消す
    LaunchedEffect(showCopiedMessage) {
        if (showCopiedMessage) {
            kotlinx.coroutines.delay(2000)
            showCopiedMessage = false
        }
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column {
            // ヘッダー部分（タップで展開/折りたたみ）
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { isExpanded = !isExpanded }
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // プロフィール画像（タップで変更可能）
                Box(
                    modifier = Modifier.size(64.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Box(
                        modifier = Modifier
                            .size(56.dp)
                            .clip(CircleShape)
                            .background(Primary.copy(alpha = 0.2f))
                            .border(2.dp, Primary.copy(alpha = 0.3f), CircleShape)
                            .clickable(onClick = onPhotoClick),
                        contentAlignment = Alignment.Center
                    ) {
                        if (isUploadingPhoto) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(24.dp),
                                strokeWidth = 2.dp,
                                color = Primary
                            )
                        } else if (photoUrl != null) {
                            AsyncImage(
                                model = photoUrl,
                                contentDescription = "プロフィール画像",
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )
                        } else {
                            Icon(
                                imageVector = Icons.Default.Person,
                                contentDescription = null,
                                tint = Primary,
                                modifier = Modifier.size(28.dp)
                            )
                        }
                    }
                    // カメラアイコン（右下に配置）
                    if (!isUploadingPhoto) {
                        Box(
                            modifier = Modifier
                                .align(Alignment.BottomEnd)
                                .offset(x = (-2).dp, y = (-2).dp)
                                .size(20.dp)
                                .background(Primary, CircleShape)
                                .border(1.5.dp, MaterialTheme.colorScheme.surface, CircleShape)
                                .clickable(onClick = onPhotoClick),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.CameraAlt,
                                contentDescription = "画像を変更",
                                tint = Color.White,
                                modifier = Modifier.size(11.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = userName,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        if (isPremium) {
                            Spacer(modifier = Modifier.width(8.dp))
                            Icon(
                                imageVector = Icons.Default.Star,
                                contentDescription = "プレミアム",
                                tint = AccentOrange,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                    if (email.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = email,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = if (isExpanded) "タップで閉じる" else "アカウント設定",
                        style = MaterialTheme.typography.labelSmall,
                        color = Primary
                    )
                }

                Icon(
                    imageVector = if (isExpanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            // 展開部分
            androidx.compose.animation.AnimatedVisibility(visible = isExpanded) {
                Column {
                    HorizontalDivider()

                    // ユーザーID
                    if (userId.isNotEmpty()) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    clipboardManager.setText(AnnotatedString(userId))
                                    showCopiedMessage = true
                                }
                                .padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Badge,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.width(16.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "ユーザーID",
                                    style = MaterialTheme.typography.bodyMedium
                                )
                                Text(
                                    text = "${userId.take(8)}...",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            Icon(
                                imageVector = Icons.Default.ContentCopy,
                                contentDescription = "コピー",
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(20.dp)
                            )
                            if (showCopiedMessage) {
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "コピー完了",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = AccentGreen
                                )
                            }
                        }
                        HorizontalDivider(modifier = Modifier.padding(start = 56.dp))
                    }

                    // 所属（法人プラン）
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Business,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.width(16.dp))
                            Text(
                                text = "所属",
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        if (organizationName != null) {
                            // 既に所属している場合
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(start = 40.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = organizationName,
                                        style = MaterialTheme.typography.bodyLarge,
                                        fontWeight = FontWeight.Medium,
                                        color = Primary
                                    )
                                    Text(
                                        text = "法人プラン適用中",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = AccentGreen
                                    )
                                }
                                TextButton(
                                    onClick = { showLeaveConfirmDialog = true }
                                ) {
                                    Text("解除", color = Color(0xFFEF5350))
                                }
                            }
                        } else {
                            // 所属未登録の場合
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(start = 40.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                OutlinedTextField(
                                    value = organizationInput,
                                    onValueChange = { organizationInput = it },
                                    placeholder = { Text("所属名を入力", style = MaterialTheme.typography.bodySmall) },
                                    modifier = Modifier.weight(1f),
                                    singleLine = true,
                                    textStyle = MaterialTheme.typography.bodyMedium,
                                    enabled = !isValidatingOrganization
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Button(
                                    onClick = {
                                        onValidateOrganization(organizationInput)
                                    },
                                    enabled = organizationInput.isNotBlank() && !isValidatingOrganization,
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
                                ) {
                                    if (isValidatingOrganization) {
                                        CircularProgressIndicator(
                                            modifier = Modifier.size(16.dp),
                                            strokeWidth = 2.dp,
                                            color = MaterialTheme.colorScheme.onPrimary
                                        )
                                    } else {
                                        Text("登録", style = MaterialTheme.typography.bodySmall)
                                    }
                                }
                            }
                        }

                        // メッセージ表示
                        organizationMessage?.let { message ->
                            val isSuccess = message.contains("登録しました") || message.contains("解除しました") || message.contains("登録済み")
                            Text(
                                text = message,
                                style = MaterialTheme.typography.bodySmall,
                                color = if (isSuccess) AccentGreen else Color(0xFFEF5350),
                                modifier = Modifier.padding(start = 40.dp, top = 8.dp)
                            )
                            LaunchedEffect(message) {
                                kotlinx.coroutines.delay(3000)
                                onClearOrganizationMessage()
                            }
                        }
                    }

                    HorizontalDivider(modifier = Modifier.padding(start = 56.dp))

                    // ログアウト
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable(onClick = onLogout)
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.Logout,
                            contentDescription = null,
                            tint = Color(0xFFEF5350),
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(16.dp))
                        Text(
                            text = "ログアウト",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(0xFFEF5350)
                        )
                    }

                    HorizontalDivider(modifier = Modifier.padding(start = 56.dp))

                    // アカウント削除
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable(onClick = onDeleteAccount)
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.DeleteForever,
                            contentDescription = null,
                            tint = Color(0xFFEF5350),
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(16.dp))
                        Column {
                            Text(
                                text = "アカウント削除",
                                style = MaterialTheme.typography.bodyMedium,
                                color = Color(0xFFEF5350)
                            )
                            Text(
                                text = "すべてのデータが削除されます",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }
    }

    // 所属解除確認ダイアログ
    if (showLeaveConfirmDialog) {
        AlertDialog(
            onDismissRequest = { showLeaveConfirmDialog = false },
            title = { Text("所属を解除") },
            text = {
                Text("${organizationName ?: ""}の所属を解除しますか？\nPremium機能が利用できなくなります。")
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showLeaveConfirmDialog = false
                        onLeaveOrganization()
                    }
                ) {
                    Text("解除", color = Color(0xFFEF5350))
                }
            },
            dismissButton = {
                TextButton(onClick = { showLeaveConfirmDialog = false }) {
                    Text("キャンセル")
                }
            }
        )
    }
}

/**
 * セクションヘッダー
 */
@Composable
private fun SectionHeader(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.labelLarge,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        fontWeight = FontWeight.Medium,
        modifier = Modifier.padding(start = 4.dp, top = 8.dp)
    )
}

/**
 * 設定カード
 */
@Composable
private fun SettingsCard(
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(content = content)
    }
}

/**
 * 設定行（アイコン付き）
 */
@Composable
private fun SettingsRow(
    icon: ImageVector,
    title: String,
    subtitle: String? = null,
    onClick: () -> Unit,
    badge: String? = null,
    badgeColor: Color = AccentOrange,
    isDestructive: Boolean = false
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.weight(1f)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = if (isDestructive) Color.Red else MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column {
                Text(
                    text = title,
                    style = MaterialTheme.typography.bodyLarge,
                    color = if (isDestructive) Color.Red else MaterialTheme.colorScheme.onSurface
                )
                if (subtitle != null) {
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        Row(verticalAlignment = Alignment.CenterVertically) {
            if (badge != null) {
                Box(
                    modifier = Modifier
                        .background(badgeColor.copy(alpha = 0.1f), RoundedCornerShape(4.dp))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = badge,
                        style = MaterialTheme.typography.labelSmall,
                        color = badgeColor,
                        fontWeight = FontWeight.Medium
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
            }
            if (!isDestructive) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

/**
 * 設定行（スイッチ付き）
 */
@Composable
private fun SettingsRowWithSwitch(
    icon: ImageVector,
    title: String,
    subtitle: String? = null,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onCheckedChange(!checked) }
            .padding(16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.weight(1f)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column {
                Text(
                    text = title,
                    style = MaterialTheme.typography.bodyLarge
                )
                if (subtitle != null) {
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(
                checkedThumbColor = MaterialTheme.colorScheme.primary,
                checkedTrackColor = MaterialTheme.colorScheme.primaryContainer
            )
        )
    }
}
