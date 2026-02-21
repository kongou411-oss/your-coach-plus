package com.yourcoach.plus.shared.ui.screens.auth

import androidx.compose.animation.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.DirectionsRun
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import kotlinx.coroutines.launch
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import org.jetbrains.compose.resources.painterResource
import com.yourcoach.plus.shared.generated.resources.Res
import com.yourcoach.plus.shared.generated.resources.icon_512
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.koin.koinScreenModel
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.yourcoach.plus.shared.domain.model.*
import com.yourcoach.plus.shared.ui.components.ClockTimePickerDialog
import com.yourcoach.plus.shared.ui.screens.main.MainScreen
import com.yourcoach.plus.shared.ui.theme.*
import kotlin.math.round

/**
 * 小数点1桁にフォーマット（KMP対応）
 */
private fun formatOneDecimal(value: Float): String {
    val rounded = round(value * 10) / 10.0
    return if (rounded == rounded.toLong().toDouble()) {
        "${rounded.toLong()}.0"
    } else {
        rounded.toString()
    }
}

/**
 * プロフィール設定画面 (Compose Multiplatform)
 * Android版OnboardingScreenと同等の機能
 * 5ステップ: イントロ → プロフィール → ルーティン → RM教育 → 食事スロット
 */
data class ProfileSetupScreen(val userId: String) : Screen {

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    override fun Content() {
        val screenModel = koinScreenModel<ProfileSetupScreenModel>()
        val state by screenModel.state.collectAsState()
        val navigator = LocalNavigator.currentOrThrow
        val snackbarHostState = remember { SnackbarHostState() }

        // 初回表示時にニックネームを初期化（遅延実行で安全に）
        LaunchedEffect(Unit) {
            // 少し遅延を入れてFirebase初期化を待つ
            kotlinx.coroutines.delay(100)
            screenModel.initializeNickname()
        }

        LaunchedEffect(state.error) {
            state.error?.let {
                snackbarHostState.showSnackbar(it)
                screenModel.clearError()
            }
        }

        Scaffold(
            snackbarHost = { SnackbarHost(snackbarHostState) }
        ) { paddingValues ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
            ) {
                // ヘッダー（ステップ1以降）
                if (state.currentStep > 0) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(onClick = { screenModel.previousStep() }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, "戻る")
                        }
                        Spacer(modifier = Modifier.weight(1f))
                        Text(
                            text = when (state.currentStep) {
                                1 -> "プロフィール設定"
                                2 -> "ルーティン設定"
                                3 -> "RM記録"
                                4 -> "クエスト連動設定"
                                else -> ""
                            },
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.weight(1f))
                        Text(
                            text = "${state.currentStep} / ${state.totalSteps - 1}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    LinearProgressIndicator(
                        progress = { state.currentStep.toFloat() / (state.totalSteps - 1) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp),
                        color = Primary,
                        trackColor = Primary.copy(alpha = 0.2f)
                    )
                } else {
                    // イントロ画面のスキップボタン
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        contentAlignment = Alignment.CenterEnd
                    ) {
                        TextButton(onClick = {
                            screenModel.skipOnboarding(userId) {
                                navigator.replace(MainScreen())
                            }
                        }) {
                            Text("スキップ", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }

                // バリデーションエラー
                AnimatedVisibility(visible = state.validationError != null) {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Warning, null, tint = MaterialTheme.colorScheme.error)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(state.validationError ?: "", color = MaterialTheme.colorScheme.error)
                        }
                    }
                }

                // コンテンツ
                AnimatedContent(
                    targetState = state.currentStep,
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    transitionSpec = {
                        if (targetState > initialState) {
                            slideInHorizontally { it } + fadeIn() togetherWith
                                    slideOutHorizontally { -it } + fadeOut()
                        } else {
                            slideInHorizontally { -it } + fadeIn() togetherWith
                                    slideOutHorizontally { it } + fadeOut()
                        }
                    },
                    label = "onboarding_content"
                ) { step ->
                    when (step) {
                        0 -> IntroStep()
                        1 -> ProfileStep(state, screenModel)
                        2 -> RoutineStep(state, screenModel)
                        3 -> RmEducationStep(state, screenModel)
                        4 -> MealSlotStep(state, screenModel, snackbarHostState)
                    }
                }

                // ボタン
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    if (state.currentStep > 0 && state.currentStep < state.totalSteps - 1) {
                        OutlinedButton(
                            onClick = { screenModel.previousStep() },
                            modifier = Modifier
                                .weight(1f)
                                .height(56.dp),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("戻る")
                        }
                    }

                    // ステップ1のバリデーション
                    val isStep1Valid = state.currentStep != 1 || (
                            state.height.toFloatOrNull() != null &&
                            state.weight.toFloatOrNull() != null &&
                            state.bodyFatPercentage.toFloatOrNull() != null
                    )

                    Button(
                        onClick = {
                            if (state.currentStep == state.totalSteps - 1) {
                                screenModel.saveAllAndComplete(userId) {
                                    navigator.replace(MainScreen())
                                }
                            } else {
                                screenModel.nextStep()
                            }
                        },
                        modifier = Modifier
                            .weight(if (state.currentStep > 0 && state.currentStep < state.totalSteps - 1) 1f else 2f)
                            .height(56.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Primary),
                        enabled = !state.isLoading && isStep1Valid
                    ) {
                        if (state.isLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(24.dp),
                                color = Color.White,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Text(
                                text = when (state.currentStep) {
                                    0 -> "設定を始める"
                                    state.totalSteps - 1 -> "完了"
                                    else -> "次へ"
                                },
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    }
}

// ========== ステップ0: イントロ ==========
@Composable
private fun IntroStep() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // ロゴアイコン
        Image(
            painter = painterResource(Res.drawable.icon_512),
            contentDescription = "Your Coach+",
            modifier = Modifier
                .size(120.dp)
                .clip(CircleShape)
        )

        Spacer(modifier = Modifier.height(32.dp))

        Text(
            text = buildAnnotatedString {
                append("Your Coach")
                withStyle(SpanStyle(color = Color(0xFF4A9EFF))) {
                    append("+")
                }
                append(" へようこそ")
            },
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "あなたに最適なカラダ管理のために\nプロフィールを設定しましょう",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(32.dp))

        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            FeatureItem(Icons.Default.Restaurant, "写真解析で簡単記録")
            FeatureItem(Icons.AutoMirrored.Filled.DirectionsRun, "運動をトラッキング")
            FeatureItem(Icons.Default.Psychology, "AIがパーソナライズ分析")
            FeatureItem(Icons.Default.LocalFireDepartment, "クエスト実行で迷わず継続")
        }
    }
}

@Composable
private fun FeatureItem(icon: ImageVector, text: String) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth()
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = Primary,
            modifier = Modifier.size(24.dp)
        )
        Spacer(modifier = Modifier.width(12.dp))
        Text(
            text = text,
            style = MaterialTheme.typography.bodyMedium
        )
    }
}

// ========== ステップ1: プロフィール設定 ==========
@Composable
private fun ProfileStep(state: ProfileSetupState, screenModel: ProfileSetupScreenModel) {
    val focusManager = LocalFocusManager.current

    // キーボードを閉じるためのBox（LazyColumnの外側）
    Box(
        modifier = Modifier
            .fillMaxSize()
            .clickable(
                indication = null,
                interactionSource = remember { MutableInteractionSource() }
            ) { focusManager.clearFocus() }
    ) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
                .imePadding(),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
        // 基本情報
        item {
            SectionCard(title = "基本情報", icon = Icons.Default.Person) {
                OutlinedTextField(
                    value = state.nickname,
                    onValueChange = screenModel::updateNickname,
                    label = { Text("ニックネーム") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() })
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = state.age,
                    onValueChange = screenModel::updateAge,
                    label = { Text("年齢") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() }),
                    shape = RoundedCornerShape(12.dp),
                    suffix = { Text("歳") }
                )

                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = "性別",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf(Gender.MALE, Gender.FEMALE).forEach { g ->
                        FilterChip(
                            onClick = { screenModel.updateGender(g) },
                            label = {
                                Text(
                                    when (g) {
                                        Gender.MALE -> "男性"
                                        Gender.FEMALE -> "女性"
                                        else -> ""
                                    }
                                )
                            },
                            selected = state.gender == g,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }
        }

        // 体組成
        item {
            SectionCard(title = "体組成", icon = Icons.Default.MonitorWeight) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedTextField(
                        value = state.height,
                        onValueChange = screenModel::updateHeight,
                        label = { Text("身長 *") },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal, imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() }),
                        shape = RoundedCornerShape(12.dp),
                        suffix = { Text("cm") },
                        isError = state.height.isBlank(),
                        supportingText = if (state.height.isBlank()) {
                            { Text("必須", color = MaterialTheme.colorScheme.error) }
                        } else null
                    )
                    OutlinedTextField(
                        value = state.weight,
                        onValueChange = screenModel::updateWeight,
                        label = { Text("体重 *") },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal, imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() }),
                        shape = RoundedCornerShape(12.dp),
                        suffix = { Text("kg") },
                        isError = state.weight.isBlank(),
                        supportingText = if (state.weight.isBlank()) {
                            { Text("必須", color = MaterialTheme.colorScheme.error) }
                        } else null
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedTextField(
                        value = state.bodyFatPercentage,
                        onValueChange = screenModel::updateBodyFatPercentage,
                        label = { Text("体脂肪率 *") },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal, imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() }),
                        shape = RoundedCornerShape(12.dp),
                        suffix = { Text("%") },
                        isError = state.bodyFatPercentage.isBlank(),
                        supportingText = if (state.bodyFatPercentage.isBlank()) {
                            { Text("必須", color = MaterialTheme.colorScheme.error) }
                        } else null
                    )
                }

                // 体脂肪率の目安ガイド
                Spacer(modifier = Modifier.height(8.dp))
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(
                            text = "体脂肪率の目安",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text("男性", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                                Text("10-14%: アスリート", style = MaterialTheme.typography.labelSmall)
                                Text("15-19%: フィットネス", style = MaterialTheme.typography.labelSmall)
                                Text("20-24%: 標準", style = MaterialTheme.typography.labelSmall)
                                Text("25%+: 軽肥満〜", style = MaterialTheme.typography.labelSmall)
                            }
                            Column {
                                Text("女性", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                                Text("14-20%: アスリート", style = MaterialTheme.typography.labelSmall)
                                Text("21-24%: フィットネス", style = MaterialTheme.typography.labelSmall)
                                Text("25-31%: 標準", style = MaterialTheme.typography.labelSmall)
                                Text("32%+: 軽肥満〜", style = MaterialTheme.typography.labelSmall)
                            }
                        }
                    }
                }

                // BMR/TDEE表示
                if (state.bmr != null && state.tdee != null) {
                    Spacer(modifier = Modifier.height(16.dp))
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Primary.copy(alpha = 0.1f)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            horizontalArrangement = Arrangement.SpaceEvenly
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    "${state.bmr!!.toInt()}",
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                    color = Primary
                                )
                                Text("BMR (kcal)", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    "${state.tdee!!.toInt()}",
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                    color = Secondary
                                )
                                Text("TDEE (kcal)", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            }
        }

        // 目標・活動レベル
        item {
            SectionCard(title = "目標・活動レベル", icon = Icons.Default.Flag) {
                Text(
                    text = "フィットネス目標",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(
                        onClick = { screenModel.updateGoal(FitnessGoal.LOSE_WEIGHT) },
                        label = { Text("ダイエット") },
                        selected = state.goal == FitnessGoal.LOSE_WEIGHT,
                        modifier = Modifier.fillMaxWidth()
                    )
                    FilterChip(
                        onClick = { screenModel.updateGoal(FitnessGoal.MAINTAIN) },
                        label = { Text("メンテナンス・リコンプ") },
                        selected = state.goal == FitnessGoal.MAINTAIN,
                        modifier = Modifier.fillMaxWidth()
                    )
                    FilterChip(
                        onClick = { screenModel.updateGoal(FitnessGoal.GAIN_MUSCLE) },
                        label = { Text("バルクアップ") },
                        selected = state.goal == FitnessGoal.GAIN_MUSCLE,
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // 食事回数
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        text = "1日の食事回数",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    var showMealInfo by remember { mutableStateOf(false) }
                    IconButton(
                        onClick = { showMealInfo = !showMealInfo },
                        modifier = Modifier.size(20.dp)
                    ) {
                        Icon(
                            Icons.Default.Info,
                            contentDescription = "食事回数の説明",
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    if (showMealInfo) {
                        AlertDialog(
                            onDismissRequest = { showMealInfo = false },
                            confirmButton = {
                                TextButton(onClick = { showMealInfo = false }) { Text("OK") }
                            },
                            title = { Text("総食事回数について") },
                            text = {
                                Text("トレーニング前後のプロテインシェイクも1食としてカウントします。\n\n例: 朝食・昼食・トレ前プロテイン・トレ後プロテイン・夕食 = 5食")
                            }
                        )
                    }
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    (2..8).forEach { count ->
                        FilterChip(
                            onClick = { screenModel.updateMealsPerDay(count) },
                            label = { Text("$count") },
                            selected = state.mealsPerDay == count,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
                Text(
                    "※ トレーニング前後のプロテインや間食も1食に含みます",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(start = 4.dp, top = 4.dp)
                )

                Spacer(modifier = Modifier.height(16.dp))

                // 日常活動レベル
                Text(
                    text = "日常活動（運動以外）",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    ActivityLevel.entries.forEach { level ->
                        FilterChip(
                            onClick = { screenModel.updateActivityLevel(level) },
                            label = { Text(level.displayName) },
                            selected = state.activityLevel == level,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
                Text(
                    text = "※ 運動の消費カロリーはルーティンから自動加算されます",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp)
                )

                Spacer(modifier = Modifier.height(16.dp))

                // カロリー調整
                Text(
                    text = "カロリー調整: ${if (state.calorieAdjustment >= 0) "+" else ""}${state.calorieAdjustment} kcal",
                    style = MaterialTheme.typography.bodyMedium
                )
                Slider(
                    value = state.calorieAdjustment.toFloat(),
                    onValueChange = { screenModel.updateCalorieAdjustment(it.toInt()) },
                    valueRange = -500f..500f,
                    steps = 19,
                    modifier = Modifier.fillMaxWidth()
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("-500", style = MaterialTheme.typography.labelSmall)
                    Text("0", style = MaterialTheme.typography.labelSmall)
                    Text("+500", style = MaterialTheme.typography.labelSmall)
                }

                state.targetCalories?.let { cal ->
                    Spacer(modifier = Modifier.height(12.dp))
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = AccentOrange.copy(alpha = 0.1f)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                "$cal",
                                style = MaterialTheme.typography.headlineMedium,
                                fontWeight = FontWeight.Bold,
                                color = AccentOrange
                            )
                            Text("目標カロリー (kcal/日)", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }

        // PFCバランス
        item {
            SectionCard(title = "PFCバランス", icon = Icons.Default.PieChart) {
                // P
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("P", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = ScoreProtein, modifier = Modifier.width(24.dp))
                    Slider(
                        value = state.proteinRatio.toFloat(),
                        onValueChange = { screenModel.updateProteinRatio(it.toInt()) },
                        valueRange = 10f..50f,
                        modifier = Modifier.weight(1f)
                    )
                    Text("${state.proteinRatio}%", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.width(48.dp))
                }

                // F
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("F", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = ScoreFat, modifier = Modifier.width(24.dp))
                    Slider(
                        value = state.fatRatio.toFloat(),
                        onValueChange = { screenModel.updateFatRatio(it.toInt()) },
                        valueRange = 10f..50f,
                        modifier = Modifier.weight(1f)
                    )
                    Text("${state.fatRatio}%", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.width(48.dp))
                }

                // C
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("C", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = ScoreCarbs, modifier = Modifier.width(24.dp))
                    Slider(
                        value = state.carbRatio.toFloat(),
                        onValueChange = { screenModel.updateCarbRatio(it.toInt()) },
                        valueRange = 10f..60f,
                        modifier = Modifier.weight(1f)
                    )
                    Text("${state.carbRatio}%", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.width(48.dp))
                }

                val total = state.proteinRatio + state.fatRatio + state.carbRatio
                Text(
                    text = "合計: $total% ${if (total != 100) "(100%に調整してください)" else "✓"}",
                    style = MaterialTheme.typography.labelSmall,
                    color = if (total == 100) Color.Green else Color.Red,
                    modifier = Modifier.padding(top = 8.dp)
                )

                state.targetCalories?.let { cal ->
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        val proteinGrams = (cal * state.proteinRatio / 100 / 4)
                        val fatGrams = (cal * state.fatRatio / 100 / 9)
                        val carbGrams = (cal * state.carbRatio / 100 / 4)

                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("${proteinGrams}g", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = ScoreProtein)
                            Text("タンパク質", style = MaterialTheme.typography.labelSmall)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("${fatGrams}g", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = ScoreFat)
                            Text("脂質", style = MaterialTheme.typography.labelSmall)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("${carbGrams}g", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = ScoreCarbs)
                            Text("炭水化物", style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }
            }
        }

        // 食費設定
        item {
            SectionCard(title = "食費設定", icon = Icons.Default.Payments) {
                Text(
                    text = "食費予算",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf(1 to "節約", 2 to "標準").forEach { (tier, label) ->
                        FilterChip(
                            onClick = { screenModel.updateBudgetTier(tier) },
                            label = { Text(label) },
                            selected = state.budgetTier == tier,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
                Text(
                    text = when (state.budgetTier) {
                        1 -> "鶏むね肉中心（コスパ重視）"
                        else -> "部位に合わせた食材（牛赤身, サバ, 鮭など）"
                    },
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }
        }

        item { Spacer(modifier = Modifier.height(80.dp)) }
        }
    }
}

// ========== ステップ2: ルーティン設定 ==========
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RoutineStep(state: ProfileSetupState, screenModel: ProfileSetupScreenModel) {
    val splitTypes = listOf(
        "胸", "背中", "肩", "腕", "脚", "腹筋・体幹",
        "上半身", "下半身", "全身",
        "プッシュ", "プル",
        "胸・三頭", "背中・二頭", "肩・腕"
    )

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // ヘルプカード
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Primary.copy(alpha = 0.1f))
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Info, contentDescription = null, tint = Primary, modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "部位別ルーティンで、迷わず継続できる仕組みへ\nまずはデフォルトで",
                        style = MaterialTheme.typography.bodySmall,
                        color = Primary
                    )
                }
            }
        }

        // Day一覧
        itemsIndexed(state.routineDays) { index, day ->
            var expanded by remember { mutableStateOf(false) }
            var showCustomInput by remember { mutableStateOf(false) }
            var customType by remember { mutableStateOf("") }

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (day.isRestDay) ScoreSleep.copy(alpha = 0.1f) else MaterialTheme.colorScheme.surface
                )
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            // 並び替えボタン
                            Column {
                                IconButton(
                                    onClick = { screenModel.moveRoutineDayUp(index) },
                                    enabled = index > 0,
                                    modifier = Modifier.size(24.dp)
                                ) {
                                    Icon(
                                        Icons.Default.KeyboardArrowUp,
                                        contentDescription = "上へ",
                                        tint = if (index > 0) Primary else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.3f)
                                    )
                                }
                                IconButton(
                                    onClick = { screenModel.moveRoutineDayDown(index) },
                                    enabled = index < state.routineDays.size - 1,
                                    modifier = Modifier.size(24.dp)
                                ) {
                                    Icon(
                                        Icons.Default.KeyboardArrowDown,
                                        contentDescription = "下へ",
                                        tint = if (index < state.routineDays.size - 1) Primary else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.3f)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.width(8.dp))

                            Text(
                                text = "Day ${day.dayNumber}",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = if (day.isRestDay) ScoreSleep else Primary
                            )
                            Spacer(modifier = Modifier.width(12.dp))

                            // 休養日チェックボックス
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .clickable { screenModel.updateRoutineDayRestDay(day.dayNumber, !day.isRestDay) }
                                    .padding(4.dp)
                            ) {
                                Checkbox(
                                    checked = day.isRestDay,
                                    onCheckedChange = null,
                                    colors = CheckboxDefaults.colors(checkedColor = ScoreSleep)
                                )
                                Text(
                                    text = "休養日",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = if (day.isRestDay) ScoreSleep else MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }

                        // 削除ボタン
                        if (state.routineDays.size > 2 && day.dayNumber > 2) {
                            IconButton(onClick = { screenModel.removeRoutineDay(day.dayNumber) }) {
                                Icon(Icons.Default.Delete, contentDescription = "削除", tint = MaterialTheme.colorScheme.error)
                            }
                        }
                    }

                    // 分類選択（休養日でない場合）
                    if (!day.isRestDay) {
                        Spacer(modifier = Modifier.height(12.dp))
                        ExposedDropdownMenuBox(
                            expanded = expanded,
                            onExpandedChange = { expanded = it }
                        ) {
                            OutlinedTextField(
                                value = day.splitType.ifEmpty { "分類を選択" },
                                onValueChange = {},
                                readOnly = true,
                                label = { Text("分類") },
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .menuAnchor(),
                                colors = OutlinedTextFieldDefaults.colors()
                            )

                            ExposedDropdownMenu(
                                expanded = expanded,
                                onDismissRequest = { expanded = false },
                                modifier = Modifier.background(MaterialTheme.colorScheme.surfaceContainer)
                            ) {
                                splitTypes.forEach { type ->
                                    DropdownMenuItem(
                                        text = { Text(type, color = MaterialTheme.colorScheme.onSurface) },
                                        onClick = {
                                            screenModel.updateRoutineDaySplitType(day.dayNumber, type)
                                            expanded = false
                                        }
                                    )
                                }
                                HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
                                DropdownMenuItem(
                                    text = {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(Icons.Default.Add, null, modifier = Modifier.size(18.dp), tint = Primary)
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Text("カスタム追加...", color = Primary)
                                        }
                                    },
                                    onClick = { expanded = false; showCustomInput = true }
                                )
                            }
                        }
                    }
                }
            }

            if (showCustomInput) {
                AlertDialog(
                    onDismissRequest = { showCustomInput = false },
                    title = { Text("カスタム分類") },
                    text = {
                        OutlinedTextField(
                            value = customType, onValueChange = { customType = it },
                            label = { Text("分類名") }, placeholder = { Text("例: 胸・肩") },
                            singleLine = true, modifier = Modifier.fillMaxWidth()
                        )
                    },
                    confirmButton = {
                        TextButton(
                            onClick = {
                                if (customType.isNotBlank()) {
                                    screenModel.updateRoutineDaySplitType(day.dayNumber, customType.trim())
                                    customType = ""
                                    showCustomInput = false
                                }
                            },
                            enabled = customType.isNotBlank()
                        ) { Text("追加") }
                    },
                    dismissButton = {
                        TextButton(onClick = { customType = ""; showCustomInput = false }) { Text("キャンセル") }
                    }
                )
            }
        }

        // Day追加ボタン
        if (state.routineDays.size < 10) {
            item {
                OutlinedButton(
                    onClick = { screenModel.addRoutineDay() },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Day追加")
                }
            }
        }

        item { Spacer(modifier = Modifier.height(80.dp)) }
    }
}

// ========== ステップ3: RM教育 ==========
@Composable
private fun RmEducationStep(
    state: ProfileSetupState,
    screenModel: ProfileSetupScreenModel
) {
    val focusManager = LocalFocusManager.current

    Box(
        modifier = Modifier
            .fillMaxSize()
            .clickable(
                indication = null,
                interactionSource = remember { MutableInteractionSource() }
            ) { focusManager.clearFocus() }
    ) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 24.dp)
            .imePadding(),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item { Spacer(modifier = Modifier.height(8.dp)) }

        // 説明カード
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
                ),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.FitnessCenter,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            "RMとは？",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Text(
                        "1RM（1レペティションマキシマム）とは、1回だけギリギリ持ち上げられる最大重量です。\n\n" +
                        "例えばベンチプレスで1回がギリギリ100kgなら、あなたの1RMは100kgです。\n\n" +
                        "記録しておくと、トレーナーが「1RM70%」のように強度を指定でき、" +
                        "あなたに最適なトレーニング重量が自動計算されます。",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
                    )
                }
            }
        }

        // RM入力セクション
        item {
            Text(
                "主要種目の1RM記録（任意）",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
            )
            Text(
                "わからない場合はスキップできます",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
            )
        }

        // 各種目の入力（1RM: 重量のみ）
        itemsIndexed(state.rmEntries) { index, entry ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                )
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        entry.exerciseName,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                    OutlinedTextField(
                        value = entry.weight,
                        onValueChange = {
                            screenModel.updateRmEntryWeight(index, it)
                            screenModel.updateRmEntryReps(index, "1")
                        },
                        label = { Text("1RM 重量(kg)") },
                        placeholder = { Text("例: 100") },
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Decimal,
                            imeAction = ImeAction.Done
                        ),
                        keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() }),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    // 入力済みの場合、1RMラベル表示
                    val weight = entry.weight.toFloatOrNull()
                    if (weight != null && weight > 0f) {
                        Text(
                            "1RM = ${weight.toInt()}kg",
                            style = MaterialTheme.typography.bodySmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }
        }

        item { Spacer(modifier = Modifier.height(80.dp)) }
    }
    } // Box
}

// ========== ステップ4: クエスト連動設定 ==========
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MealSlotStep(
    state: ProfileSetupState,
    screenModel: ProfileSetupScreenModel,
    snackbarHostState: SnackbarHostState
) {
    val scope = rememberCoroutineScope()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // タイムライン設定
        item {
            SectionCard(title = "タイムライン設定", icon = Icons.Default.Schedule) {
                Text(
                    text = "起床・就寝・トレーニング時刻を設定すると、食事の推奨タイミングが自動生成されます",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(modifier = Modifier.height(12.dp))

                // 起床時刻
                TimePickerRow(
                    label = "起床",
                    time = state.wakeUpTime,
                    onTimeChange = { screenModel.updateWakeUpTime(it) }
                )

                // 就寝時刻
                TimePickerRow(
                    label = "就寝",
                    time = state.sleepTime,
                    onTimeChange = { screenModel.updateSleepTime(it) }
                )

                // トレーニング時刻
                TimePickerRow(
                    label = "トレーニング",
                    time = state.trainingTime ?: "未設定",
                    onTimeChange = { screenModel.updateTrainingTime(it.takeIf { t -> t != "未設定" }) },
                    canClear = state.trainingTime != null,
                    onClear = { screenModel.updateTrainingTime(null) }
                )

                if (state.trainingTime != null) {
                    Spacer(modifier = Modifier.height(12.dp))

                    // トレ前の食事番号
                    Text(
                        text = "トレーニング前の食事番号は？",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Row(
                        modifier = Modifier.horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        (1..state.mealsPerDay).forEach { mealNum ->
                            FilterChip(
                                selected = state.trainingAfterMeal == mealNum,
                                onClick = {
                                    screenModel.updateTrainingAfterMeal(if (state.trainingAfterMeal == mealNum) null else mealNum)
                                },
                                label = { Text("$mealNum") }
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // トレーニング所要時間
                    Text(
                        text = "トレーニング時間",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Row(
                        modifier = Modifier.horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        listOf(60 to "1h", 90 to "1.5h", 120 to "2h", 150 to "2.5h", 180 to "3h").forEach { (minutes, label) ->
                            FilterChip(
                                selected = state.trainingDuration == minutes,
                                onClick = { screenModel.updateTrainingDuration(minutes) },
                                label = { Text(label) }
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // トレーニングスタイル
                    Text(
                        text = "トレーニングスタイル",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        TrainingStyle.entries.forEach { style ->
                            FilterChip(
                                selected = state.trainingStyle == style,
                                onClick = { screenModel.updateTrainingStyle(style) },
                                label = {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text(style.displayName)
                                        Text(
                                            text = "${style.repsPerSet}回/セット",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // タイムライン自動生成ボタン
                Button(
                    onClick = {
                        screenModel.generateTimeline()
                        scope.launch {
                            snackbarHostState.showSnackbar("タイムラインを生成しました")
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Primary)
                ) {
                    Icon(Icons.Default.AutoAwesome, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("タイムラインを自動生成")
                }
            }
        }

        item { Spacer(modifier = Modifier.height(80.dp)) }
    }
}

// ========== 共通コンポーネント ==========

@Composable
private fun SectionCard(
    title: String,
    icon: ImageVector,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(bottom = 12.dp)
            ) {
                Icon(icon, contentDescription = null, tint = Primary, modifier = Modifier.size(24.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }
            content()
        }
    }
}

@Composable
private fun TimePickerRow(
    label: String,
    time: String,
    onTimeChange: (String) -> Unit,
    canClear: Boolean = false,
    onClear: (() -> Unit)? = null
) {
    var showTimePicker by remember { mutableStateOf(false) }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .clickable { showTimePicker = true }
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(text = label, style = MaterialTheme.typography.bodyMedium)
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = time,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Bold,
                color = Primary
            )
            if (canClear && onClear != null) {
                IconButton(
                    onClick = onClear,
                    modifier = Modifier.size(24.dp)
                ) {
                    Icon(Icons.Default.Close, contentDescription = "クリア", modifier = Modifier.size(16.dp))
                }
            }
        }
    }

    if (showTimePicker) {
        val initialTime = if (time == "未設定") "18:00" else time
        val hours = initialTime.substringBefore(":").toIntOrNull() ?: 18
        val minutes = initialTime.substringAfter(":").toIntOrNull() ?: 0
        ClockTimePickerDialog(
            label = label,
            initialHour = hours,
            initialMinute = minutes,
            onConfirm = { newTime ->
                onTimeChange(newTime)
                showTimePicker = false
            },
            onDismiss = { showTimePicker = false }
        )
    }
}

// 旧メソッドの後方互換性（updateStyleはもう使わないがコンパイルエラー回避）
private fun ProfileSetupScreenModel.updateStyle(style: String) {
    // no-op
}

private fun ProfileSetupScreenModel.updateIdealWeight(value: String) {
    // no-op - 新UIでは使用しない
}

private fun ProfileSetupScreenModel.updateIdealBodyFatPercentage(value: String) {
    // no-op - 新UIでは使用しない
}

// LazyColumn items拡張（KMP対応）
private fun <T> androidx.compose.foundation.lazy.LazyListScope.items(
    count: Int,
    itemContent: @Composable (index: Int) -> Unit
) {
    items(count) { index ->
        itemContent(index)
    }
}
