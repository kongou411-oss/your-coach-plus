package com.yourcoach.plus.shared.ui.screens.meal

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.core.model.rememberScreenModel
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.yourcoach.plus.shared.camera.NativeCameraPreview
import com.yourcoach.plus.shared.camera.startCameraPreview
import com.yourcoach.plus.shared.camera.stopCameraPreview
import com.yourcoach.plus.shared.data.database.FoodItem
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.BadgeRepository
import com.yourcoach.plus.shared.domain.repository.CustomFoodRepository
import com.yourcoach.plus.shared.domain.repository.MealRepository
import com.yourcoach.plus.shared.domain.repository.UserRepository
import com.yourcoach.plus.shared.domain.service.GeminiService
import com.yourcoach.plus.shared.ui.screens.dashboard.DashboardScreen
import com.yourcoach.plus.shared.ui.theme.*
import com.yourcoach.plus.shared.util.DateUtil
import org.koin.compose.koinInject
import org.koin.compose.getKoin

/**
 * 写真解析画面（Android AiFoodRecognitionScreen と完全一致）
 */
data class AiFoodRecognitionScreen(
    val selectedDate: String = DateUtil.todayString()
) : Screen {

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    override fun Content() {
        val authRepository: AuthRepository = koinInject()
        val mealRepository: MealRepository = koinInject()
        val userRepository: UserRepository = koinInject()
        val customFoodRepository: CustomFoodRepository = koinInject()
        val badgeRepository: BadgeRepository = koinInject()
        val koin = getKoin()
        val geminiService: GeminiService? = remember { koin.getOrNull<GeminiService>() }

        val navigator = LocalNavigator.currentOrThrow
        val snackbarHostState = remember { SnackbarHostState() }

        if (geminiService == null) {
            // GeminiService未登録
            Scaffold(
                topBar = {
                    TopAppBar(
                        title = { Text("写真解析") },
                        navigationIcon = {
                            IconButton(onClick = { navigator.pop() }) {
                                Icon(Icons.AutoMirrored.Filled.ArrowBack, "戻る")
                            }
                        },
                        colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent)
                    )
                }
            ) { padding ->
                Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                    Text("AI認識機能が利用できません", style = MaterialTheme.typography.bodyLarge)
                }
            }
            return
        }

        val screenModel = rememberScreenModel {
            AiFoodRecognitionScreenModel(
                geminiService, mealRepository, authRepository,
                userRepository, customFoodRepository, badgeRepository, selectedDate
            )
        }
        val uiState by screenModel.uiState.collectAsState()

        // カメラプレビュー開始/停止
        DisposableEffect(Unit) {
            startCameraPreview()
            onDispose {
                stopCameraPreview()
            }
        }

        // エラー表示
        LaunchedEffect(uiState.error) {
            uiState.error?.let { error ->
                snackbarHostState.showSnackbar(error)
                screenModel.clearError()
            }
        }

        Scaffold(
            snackbarHost = { SnackbarHost(snackbarHostState) },
            topBar = {
                TopAppBar(
                    title = { Text("写真解析") },
                    navigationIcon = {
                        IconButton(onClick = { navigator.pop() }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, "戻る")
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent)
                )
            }
        ) { paddingValues ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
            ) {
                when {
                    uiState.isPremiumRequired -> {
                        PremiumRequiredContent(onNavigateBack = { navigator.pop() })
                    }
                    uiState.capturedImageBase64 == null -> {
                        // Android版CameraX画面と同等：ライブプレビュー + 撮影/ギャラリーボタン
                        LiveCameraContent(
                            onCapture = { screenModel.captureFromPreview() },
                            onPickGallery = { screenModel.pickFromGallery() }
                        )
                    }
                    else -> {
                        // 撮影済み画像と分析結果
                        ImageAnalysisContent(
                            imageBase64 = uiState.capturedImageBase64!!,
                            isAnalyzing = uiState.isAnalyzing,
                            isSaving = uiState.isSaving,
                            recognizedFoods = uiState.recognizedFoods,
                            analysisComplete = uiState.analysisComplete,
                            selectedMealNumber = uiState.selectedMealNumber,
                            mealsPerDay = uiState.mealsPerDay,
                            onAnalyze = { screenModel.analyzeImage() },
                            onRetake = {
                                screenModel.retakePhoto()
                                startCameraPreview()
                            },
                            onMealNumberSelected = { screenModel.setMealNumber(it) },
                            onAmountChanged = { name, amount -> screenModel.updateFoodAmount(name, amount) },
                            onRemoveFood = { name -> screenModel.removeFood(name) },
                            onSearchCandidates = { query -> screenModel.searchFoodCandidates(query) },
                            onReplaceFood = { originalName, newFood, amount ->
                                screenModel.replaceFood(originalName, newFood, amount)
                            },
                            onSave = {
                                screenModel.saveMeal {
                                    // ダッシュボードのレコードタブを表示
                                    DashboardScreen.pendingTabIndex.value = 1
                                    navigator.pop()  // AiFoodRecognitionScreen → AddMealScreen
                                    navigator.pop()  // AddMealScreen → Dashboard (レコードタブ)
                                }
                            }
                        )
                    }
                }
            }
        }
    }
}

// ========================================
// ライブカメラプレビュー（Android CameraX相当）
// ========================================

@Composable
private fun LiveCameraContent(
    onCapture: () -> Unit,
    onPickGallery: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        // ライブカメラプレビュー（AVFoundation）
        NativeCameraPreview(
            modifier = Modifier.fillMaxSize()
        )

        // ガイドオーバーレイ（Android版と同じ）
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            contentAlignment = Alignment.Center
        ) {
            Canvas(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(4f / 3f)
            ) {
                drawRoundRect(
                    color = Color.White.copy(alpha = 0.5f),
                    style = Stroke(width = 2.dp.toPx()),
                    cornerRadius = CornerRadius(16.dp.toPx())
                )
            }
        }

        // 撮影ヒント（Android版と同じ）
        Text(
            text = "食品を枠内に収めて撮影",
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(top = 32.dp)
                .background(Color.Black.copy(alpha = 0.5f), RoundedCornerShape(8.dp))
                .padding(horizontal = 16.dp, vertical = 8.dp),
            color = Color.White,
            style = MaterialTheme.typography.bodyMedium
        )

        // 下部ボタンエリア（Android版と同じ配置）
        Row(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 48.dp)
                .fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // ギャラリーボタン
            IconButton(
                onClick = onPickGallery,
                modifier = Modifier
                    .size(56.dp)
                    .background(Color.White.copy(alpha = 0.8f), CircleShape)
            ) {
                Icon(
                    imageVector = Icons.Default.PhotoLibrary,
                    contentDescription = "ギャラリーから選択",
                    tint = Primary,
                    modifier = Modifier.size(28.dp)
                )
            }

            // 撮影ボタン
            IconButton(
                onClick = onCapture,
                modifier = Modifier
                    .size(72.dp)
                    .background(Color.White, CircleShape)
            ) {
                Box(
                    modifier = Modifier
                        .size(62.dp)
                        .background(Color.White, CircleShape)
                        .padding(3.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Primary, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.CameraAlt,
                            contentDescription = "カメラで撮影",
                            tint = Color.White,
                            modifier = Modifier.size(32.dp)
                        )
                    }
                }
            }
        }
    }
}

// ========================================
// プレミアム会員限定コンテンツ
// ========================================

@Composable
private fun PremiumRequiredContent(onNavigateBack: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Default.Lock,
            contentDescription = null,
            modifier = Modifier.size(80.dp),
            tint = Color(0xFFFFD700)
        )
        Spacer(modifier = Modifier.height(24.dp))
        Text(
            text = "プレミアム会員限定",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "写真解析機能はプレミアム会員限定です\n設定からプレミアムプランにアップグレードしてください",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(32.dp))
        Button(
            onClick = onNavigateBack,
            shape = RoundedCornerShape(12.dp)
        ) {
            Text("戻る")
        }
    }
}

// ========================================
// 撮影/選択画面（iOSはCameraHelperブリッジ経由）
// ========================================

@Composable
private fun CaptureContent(onCapture: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Default.CameraAlt,
            contentDescription = null,
            modifier = Modifier.size(80.dp),
            tint = Primary
        )
        Spacer(modifier = Modifier.height(24.dp))
        Text(
            text = "食品を撮影してAIで認識",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "カメラで撮影またはフォトライブラリから\n画像を選択してください",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(32.dp))
        Button(
            onClick = onCapture,
            modifier = Modifier.fillMaxWidth(0.7f).height(56.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Primary)
        ) {
            Icon(Icons.Default.CameraAlt, null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("撮影 / 画像を選択", style = MaterialTheme.typography.titleMedium)
        }
    }
}

// ========================================
// 画像分析コンテンツ
// ========================================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ImageAnalysisContent(
    imageBase64: String,
    isAnalyzing: Boolean,
    isSaving: Boolean,
    recognizedFoods: List<RecognizedFood>,
    analysisComplete: Boolean,
    selectedMealNumber: Int,
    mealsPerDay: Int,
    onAnalyze: () -> Unit,
    onRetake: () -> Unit,
    onMealNumberSelected: (Int) -> Unit,
    onAmountChanged: (String, Float) -> Unit,
    onRemoveFood: (String) -> Unit,
    onSearchCandidates: (String) -> List<FoodItem>,
    onReplaceFood: (String, FoodItem, Float) -> Unit,
    onSave: () -> Unit
) {
    // 差し替えダイアログの状態
    var showReplaceDialog by remember { mutableStateOf(false) }
    var selectedFoodForReplace by remember { mutableStateOf<RecognizedFood?>(null) }
    var searchQuery by remember { mutableStateOf("") }
    var searchResults by remember { mutableStateOf<List<FoodItem>>(emptyList()) }

    // カスタム食品登録通知ダイアログ
    var showCustomFoodNoticeDialog by remember { mutableStateOf(false) }
    val unregisteredFoods = recognizedFoods.filter { !it.isFromDatabase }

    // カスタム食品登録通知ダイアログ
    if (showCustomFoodNoticeDialog) {
        AlertDialog(
            onDismissRequest = { showCustomFoodNoticeDialog = false },
            title = { Text("カスタム食品として登録", fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    Text(
                        "以下の食品はデータベースに未登録のため、カスタム食品として保存されます。",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    unregisteredFoods.forEach { food ->
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Add, null, tint = AccentGreen, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(food.name, style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        "次回以降、手動入力時に再利用できます。",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        showCustomFoodNoticeDialog = false
                        onSave()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = AccentGreen)
                ) {
                    Text("登録して記録")
                }
            },
            dismissButton = {
                TextButton(onClick = { showCustomFoodNoticeDialog = false }) {
                    Text("キャンセル")
                }
            }
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
    ) {
        // 撮影した画像
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(4f / 3f)
                .background(Color.Black)
        ) {
            // Base64からImageBitmapに変換して表示
            val imageBitmap = remember(imageBase64) {
                // commonMainではSkia直接参照不可。プラットフォーム実装で表示する。
                null
            }

            if (imageBitmap != null) {
                androidx.compose.foundation.Image(
                    bitmap = imageBitmap,
                    contentDescription = "撮影した食品",
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Fit
                )
            } else {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Icon(
                        Icons.Default.Image,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = Color.White.copy(alpha = 0.5f)
                    )
                }
            }

            // 分析中オーバーレイ
            if (isAnalyzing) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Black.copy(alpha = 0.6f)),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        CircularProgressIndicator(color = Color.White)
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "AIが食品を分析中...",
                            color = Color.White,
                            style = MaterialTheme.typography.bodyLarge
                        )
                    }
                }
            }
        }

        // アクションボタン（分析前）
        if (!analysisComplete && !isAnalyzing) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedButton(
                    onClick = onRetake,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.Refresh, null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("撮り直す")
                }
                Button(
                    onClick = onAnalyze,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Primary)
                ) {
                    Icon(Icons.Default.AutoAwesome, null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("AIで分析")
                }
            }
        }

        // 認識結果
        if (recognizedFoods.isNotEmpty()) {
            // 食事番号選択
            Text(
                text = "何食目？",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                val maxDisplay = maxOf(mealsPerDay, selectedMealNumber) + 1
                (1..maxDisplay).forEach { number ->
                    FilterChip(
                        selected = selectedMealNumber == number,
                        onClick = { onMealNumberSelected(number) },
                        label = { Text("食事$number") },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Primary,
                            selectedLabelColor = Color.White
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "認識結果（タップで量を調整）",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )

            recognizedFoods.forEach { food ->
                RecognizedFoodCard(
                    food = food,
                    onAmountChanged = { newAmount -> onAmountChanged(food.name, newAmount) },
                    onRemove = { onRemoveFood(food.name) },
                    onReplace = {
                        selectedFoodForReplace = food
                        searchQuery = food.name.take(3)
                        searchResults = onSearchCandidates(searchQuery)
                        showReplaceDialog = true
                    }
                )
            }

            // 合計
            val totalCalories = recognizedFoods.sumOf { it.calories }
            val totalProtein = recognizedFoods.sumOf { it.protein.toDouble() }.toFloat()
            val totalCarbs = recognizedFoods.sumOf { it.carbs.toDouble() }.toFloat()
            val totalFat = recognizedFoods.sumOf { it.fat.toDouble() }.toFloat()
            val dbMatchCount = recognizedFoods.count { it.isFromDatabase }
            val aiEstimateCount = recognizedFoods.size - dbMatchCount

            Card(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                colors = CardDefaults.cardColors(containerColor = Primary.copy(alpha = 0.1f))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "合計",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        NutrientChip("${totalCalories}kcal", "カロリー", Primary)
                        NutrientChip("${totalProtein.toInt()}g", "P", ScoreProtein)
                        NutrientChip("${totalFat.toInt()}g", "F", ScoreFat)
                        NutrientChip("${totalCarbs.toInt()}g", "C", ScoreCarbs)
                    }
                }
            }

            // データベースマッチ情報
            Card(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                )
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        text = "栄養データ取得元",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.size(8.dp).background(AccentGreen, CircleShape))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "八訂DB: ${dbMatchCount}件",
                                style = MaterialTheme.typography.bodySmall,
                                color = AccentGreen
                            )
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                Modifier.size(8.dp)
                                    .background(MaterialTheme.colorScheme.onSurfaceVariant, CircleShape)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "AI推定: ${aiEstimateCount}件",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // 保存ボタン
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedButton(
                    onClick = onRetake,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp),
                    enabled = !isSaving
                ) {
                    Text("撮り直す")
                }
                Button(
                    onClick = {
                        if (unregisteredFoods.isNotEmpty()) {
                            showCustomFoodNoticeDialog = true
                        } else {
                            onSave()
                        }
                    },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = AccentGreen),
                    enabled = !isSaving
                ) {
                    if (isSaving) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Icon(Icons.Default.Check, null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("記録する")
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }

    // 差し替えダイアログ
    if (showReplaceDialog && selectedFoodForReplace != null) {
        AlertDialog(
            onDismissRequest = {
                showReplaceDialog = false
                selectedFoodForReplace = null
                searchQuery = ""
                searchResults = emptyList()
            },
            title = { Text("食品を差し替え") },
            text = {
                Column {
                    Text(
                        text = "現在: ${selectedFoodForReplace?.name}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { query ->
                            searchQuery = query
                            searchResults = if (query.isNotEmpty()) {
                                onSearchCandidates(query)
                            } else {
                                emptyList()
                            }
                        },
                        label = { Text("食品名で検索（1文字から）") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    if (searchResults.isNotEmpty()) {
                        Text(
                            text = "候補 (${searchResults.size}件)",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Column(
                            modifier = Modifier
                                .heightIn(max = 200.dp)
                                .verticalScroll(rememberScrollState())
                        ) {
                            searchResults.forEach { candidate ->
                                Card(
                                    onClick = {
                                        selectedFoodForReplace?.let { food ->
                                            onReplaceFood(food.name, candidate, food.amount)
                                        }
                                        showReplaceDialog = false
                                        selectedFoodForReplace = null
                                        searchQuery = ""
                                        searchResults = emptyList()
                                    },
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp),
                                    colors = CardDefaults.cardColors(
                                        containerColor = MaterialTheme.colorScheme.surfaceVariant
                                    )
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(8.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = candidate.name,
                                                style = MaterialTheme.typography.bodyMedium,
                                                fontWeight = FontWeight.Medium
                                            )
                                            Text(
                                                text = candidate.category,
                                                style = MaterialTheme.typography.labelSmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                        }
                                        Text(
                                            text = "${candidate.calories.toInt()}kcal/100g",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = Primary
                                        )
                                    }
                                }
                            }
                        }
                    } else if (searchQuery.length >= 2) {
                        Text(
                            text = "候補が見つかりません",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    showReplaceDialog = false
                    selectedFoodForReplace = null
                    searchQuery = ""
                    searchResults = emptyList()
                }) {
                    Text("閉じる")
                }
            }
        )
    }
}

// ========================================
// 認識された食品カード
// ========================================

@Composable
private fun RecognizedFoodCard(
    food: RecognizedFood,
    onAmountChanged: (Float) -> Unit,
    onRemove: () -> Unit,
    onReplace: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = food.name,
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Medium
                    )
                    Text(
                        text = if (food.isFromDatabase) "八訂DB" else "AI推定",
                        style = MaterialTheme.typography.labelSmall,
                        color = if (food.isFromDatabase) AccentGreen
                        else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "${food.calories}kcal",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = Primary
                    )
                    Row {
                        Text("P${food.protein.toInt()}", style = MaterialTheme.typography.labelSmall, color = ScoreProtein)
                        Text(" F${food.fat.toInt()}", style = MaterialTheme.typography.labelSmall, color = ScoreFat)
                        Text(" C${food.carbs.toInt()}", style = MaterialTheme.typography.labelSmall, color = ScoreCarbs)
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // 量の増減ボタンと削除・差し替えボタン
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                // 差し替えボタン
                TextButton(
                    onClick = onReplace,
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Icon(
                        Icons.Default.SwapHoriz, "差し替え",
                        modifier = Modifier.size(16.dp), tint = Primary
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("差替", style = MaterialTheme.typography.labelSmall, color = Primary)
                }

                // 量の増減ボタン
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(
                        onClick = {
                            val newAmount = (food.amount - 10f).coerceAtLeast(10f)
                            onAmountChanged(newAmount)
                        },
                        modifier = Modifier.size(32.dp).background(MaterialTheme.colorScheme.surfaceVariant, CircleShape)
                    ) {
                        Icon(Icons.Default.Remove, "-10g", modifier = Modifier.size(16.dp))
                    }
                    Text(
                        text = "${food.amount.toInt()}g",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.width(50.dp).padding(horizontal = 4.dp),
                        textAlign = TextAlign.Center
                    )
                    IconButton(
                        onClick = {
                            val newAmount = food.amount + 10f
                            onAmountChanged(newAmount)
                        },
                        modifier = Modifier.size(32.dp).background(Primary.copy(alpha = 0.2f), CircleShape)
                    ) {
                        Icon(Icons.Default.Add, "+10g", modifier = Modifier.size(16.dp), tint = Primary)
                    }
                }

                // 削除ボタン
                IconButton(onClick = onRemove, modifier = Modifier.size(32.dp)) {
                    Icon(
                        Icons.Default.Close, "削除",
                        modifier = Modifier.size(18.dp),
                        tint = MaterialTheme.colorScheme.error
                    )
                }
            }
        }
    }
}

// ========================================
// 栄養素チップ
// ========================================

@Composable
private fun NutrientChip(value: String, label: String, color: Color = Primary) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = value,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = color
        )
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
