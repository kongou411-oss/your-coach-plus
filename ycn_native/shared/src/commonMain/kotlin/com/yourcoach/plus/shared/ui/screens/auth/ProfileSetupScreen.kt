package com.yourcoach.plus.shared.ui.screens.auth

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.koin.koinScreenModel
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.yourcoach.plus.shared.domain.model.ActivityLevel
import com.yourcoach.plus.shared.domain.model.FitnessGoal
import com.yourcoach.plus.shared.domain.model.Gender
import com.yourcoach.plus.shared.ui.screens.dashboard.DashboardScreen
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
 */
data class ProfileSetupScreen(val userId: String) : Screen {

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    override fun Content() {
        val screenModel = koinScreenModel<ProfileSetupScreenModel>()
        val state by screenModel.state.collectAsState()
        val navigator = LocalNavigator.currentOrThrow
        val snackbarHostState = remember { SnackbarHostState() }

        LaunchedEffect(state.error) {
            state.error?.let {
                snackbarHostState.showSnackbar(it)
                screenModel.clearError()
            }
        }

        Scaffold(
            snackbarHost = { SnackbarHost(snackbarHostState) },
            topBar = {
                TopAppBar(
                    title = { Text("プロフィール設定") },
                    navigationIcon = {
                        if (state.currentStep > 0) {
                            IconButton(onClick = { screenModel.previousStep() }) {
                                Icon(Icons.AutoMirrored.Filled.ArrowBack, "戻る")
                            }
                        }
                    }
                )
            }
        ) { paddingValues ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
            ) {
                // プログレスインジケーター
                LinearProgressIndicator(
                    progress = { (state.currentStep + 1).toFloat() / state.totalSteps },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(4.dp),
                    color = Primary
                )

                // ステップインジケーター
                StepIndicator(
                    currentStep = state.currentStep,
                    totalSteps = state.totalSteps,
                    modifier = Modifier.padding(16.dp)
                )

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
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp)
                ) {
                    AnimatedContent(
                        targetState = state.currentStep,
                        transitionSpec = {
                            if (targetState > initialState) {
                                slideInHorizontally { it } + fadeIn() togetherWith
                                    slideOutHorizontally { -it } + fadeOut()
                            } else {
                                slideInHorizontally { -it } + fadeIn() togetherWith
                                    slideOutHorizontally { it } + fadeOut()
                            }
                        },
                        label = "step"
                    ) { step ->
                        when (step) {
                            0 -> Step0BasicInfo(state, screenModel)
                            1 -> Step1BodyComposition(state, screenModel)
                            2 -> Step2GoalsActivity(state, screenModel)
                            3 -> Step3IdealGoals(state, screenModel)
                        }
                    }
                }

                // ボタン
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    if (state.currentStep > 0) {
                        OutlinedButton(
                            onClick = { screenModel.previousStep() },
                            modifier = Modifier
                                .weight(1f)
                                .height(56.dp),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("戻る")
                        }
                    }

                    Button(
                        onClick = {
                            if (state.currentStep == state.totalSteps - 1) {
                                screenModel.saveProfile(userId) {
                                    navigator.replace(DashboardScreen())
                                }
                            } else {
                                screenModel.nextStep()
                            }
                        },
                        modifier = Modifier
                            .weight(if (state.currentStep > 0) 1f else 2f)
                            .height(56.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Primary),
                        enabled = !state.isLoading
                    ) {
                        if (state.isLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(24.dp),
                                color = Color.White,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Text(
                                if (state.currentStep == state.totalSteps - 1) "完了" else "次へ",
                                fontWeight = FontWeight.Bold
                            )
                            if (state.currentStep < state.totalSteps - 1) {
                                Spacer(modifier = Modifier.width(8.dp))
                                Icon(Icons.AutoMirrored.Filled.ArrowForward, null)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StepIndicator(currentStep: Int, totalSteps: Int, modifier: Modifier = Modifier) {
    val stepNames = listOf("基本情報", "体組成", "目標", "理想")
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceEvenly
    ) {
        stepNames.forEachIndexed { index, name ->
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Box(
                    modifier = Modifier
                        .size(32.dp)
                        .background(
                            if (index <= currentStep) Primary else Primary.copy(alpha = 0.2f),
                            CircleShape
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    if (index < currentStep) {
                        Icon(Icons.Default.Check, null, tint = Color.White, modifier = Modifier.size(18.dp))
                    } else {
                        Text(
                            "${index + 1}",
                            color = if (index <= currentStep) Color.White else Primary,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    name,
                    style = MaterialTheme.typography.labelSmall,
                    color = if (index <= currentStep) Primary else MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

// Step 0: 基本情報
@Composable
private fun Step0BasicInfo(state: ProfileSetupState, screenModel: ProfileSetupScreenModel) {
    Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
        Text("基本情報を入力", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Text("あなたに最適なアドバイスを提供するために必要な情報です", color = MaterialTheme.colorScheme.onSurfaceVariant)

        OutlinedTextField(
            value = state.nickname,
            onValueChange = screenModel::updateNickname,
            label = { Text("ニックネーム") },
            placeholder = { Text("アプリ内での表示名") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp)
        )

        OutlinedTextField(
            value = state.age,
            onValueChange = screenModel::updateAge,
            label = { Text("年齢") },
            suffix = { Text("歳") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp)
        )

        Text("性別", fontWeight = FontWeight.Medium)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Gender.entries.forEach { gender ->
                val label = when (gender) {
                    Gender.MALE -> "男性"
                    Gender.FEMALE -> "女性"
                    Gender.OTHER -> "その他"
                }
                FilterChip(
                    selected = state.gender == gender,
                    onClick = { screenModel.updateGender(gender) },
                    label = { Text(label) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = Primary,
                        selectedLabelColor = Color.White
                    )
                )
            }
        }

        Text("トレーニングスタイル", fontWeight = FontWeight.Medium)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            listOf("一般" to "健康的な生活を目指す方", "ボディメイカー" to "本格的に体を鍛える方").forEach { (style, desc) ->
                Card(
                    modifier = Modifier
                        .weight(1f)
                        .clickable { screenModel.updateStyle(style) }
                        .then(
                            if (state.style == style) Modifier.border(2.dp, Primary, RoundedCornerShape(12.dp))
                            else Modifier
                        ),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (state.style == style) Primary.copy(alpha = 0.1f) else MaterialTheme.colorScheme.surface
                    )
                ) {
                    Column(
                        modifier = Modifier.padding(12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(style, fontWeight = FontWeight.Bold, color = if (state.style == style) Primary else MaterialTheme.colorScheme.onSurface)
                        Text(desc, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
                    }
                }
            }
        }
    }
}

// Step 1: 体組成
@Composable
private fun Step1BodyComposition(state: ProfileSetupState, screenModel: ProfileSetupScreenModel) {
    Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
        Text("現在の体組成", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Text("正確な栄養目標を計算するために必要です", color = MaterialTheme.colorScheme.onSurfaceVariant)

        OutlinedTextField(
            value = state.height,
            onValueChange = screenModel::updateHeight,
            label = { Text("身長") },
            suffix = { Text("cm") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp)
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            OutlinedTextField(
                value = state.weight,
                onValueChange = screenModel::updateWeight,
                label = { Text("現在体重") },
                suffix = { Text("kg") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                singleLine = true,
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(12.dp)
            )

            OutlinedTextField(
                value = state.targetWeight,
                onValueChange = screenModel::updateTargetWeight,
                label = { Text("目標体重") },
                suffix = { Text("kg") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                singleLine = true,
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(12.dp)
            )
        }

        OutlinedTextField(
            value = state.bodyFatPercentage,
            onValueChange = screenModel::updateBodyFatPercentage,
            label = { Text("体脂肪率") },
            suffix = { Text("%") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp)
        )

        // LBM計算表示
        val weight = state.weight.toFloatOrNull() ?: 0f
        val bf = state.bodyFatPercentage.toFloatOrNull() ?: 0f
        if (weight > 0 && bf > 0) {
            val lbm = weight * (1 - bf / 100)
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Primary.copy(alpha = 0.1f))
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text("除脂肪体重（LBM）", style = MaterialTheme.typography.labelMedium)
                        Text("筋肉・骨・内臓の重さ", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Text("${formatOneDecimal(lbm)} kg", fontWeight = FontWeight.Bold, color = Primary)
                }
            }
        }
    }
}

// Step 2: 目標・活動レベル
@Composable
private fun Step2GoalsActivity(state: ProfileSetupState, screenModel: ProfileSetupScreenModel) {
    Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
        Text("目標と活動レベル", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)

        Text("活動レベル", fontWeight = FontWeight.Medium)
        val activityLevels = listOf(
            ActivityLevel.DESK_WORK to "デスクワーク",
            ActivityLevel.STANDING_WORK to "立ち仕事",
            ActivityLevel.PHYSICAL_LABOR to "肉体労働"
        )
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            activityLevels.forEach { (level, _) ->
                SelectableCard(
                    selected = state.activityLevel == level,
                    onClick = { screenModel.updateActivityLevel(level) },
                    label = level.displayName
                )
            }
        }
        Text(
            text = "※ 運動の消費カロリーはルーティンから自動加算",
            style = MaterialTheme.typography.labelSmall,
            color = Color.Gray
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text("目的", fontWeight = FontWeight.Medium)
        val goals = listOf(
            FitnessGoal.LOSE_WEIGHT to Pair("ダイエット", "-300 kcal/日"),
            FitnessGoal.MAINTAIN to Pair("健康維持", "±0 kcal/日"),
            FitnessGoal.GAIN_MUSCLE to Pair("バルクアップ", "+300 kcal/日")
        )
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            goals.forEach { (goal, info) ->
                SelectableCard(
                    selected = state.goal == goal,
                    onClick = { screenModel.updateGoal(goal) },
                    label = info.first,
                    subtitle = info.second
                )
            }
        }

        // 1日の食事回数
        Spacer(modifier = Modifier.height(8.dp))
        Text("1日の食事回数", fontWeight = FontWeight.Medium)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            (2..8).forEach { count ->
                FilterChip(
                    onClick = { screenModel.updateMealsPerDay(count) },
                    label = { Text("$count") },
                    selected = state.mealsPerDay == count,
                    modifier = Modifier.weight(1f),
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = Primary,
                        selectedLabelColor = Color.White
                    )
                )
            }
        }

        // PFCバランス
        Spacer(modifier = Modifier.height(8.dp))
        Text("PFCバランス", fontWeight = FontWeight.Medium)

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            PfcIndicator("P", state.proteinRatio, ScoreProtein)
            PfcIndicator("F", state.fatRatio, ScoreFat)
            PfcIndicator("C", state.carbRatio, ScoreCarbs)
        }

        Text("タンパク質: ${state.proteinRatio}%", style = MaterialTheme.typography.labelMedium)
        Slider(
            value = state.proteinRatio.toFloat(),
            onValueChange = { screenModel.updateProteinRatio(it.toInt()) },
            valueRange = 15f..50f,
            colors = SliderDefaults.colors(thumbColor = ScoreProtein, activeTrackColor = ScoreProtein)
        )

        Text("脂質: ${state.fatRatio}%", style = MaterialTheme.typography.labelMedium)
        Slider(
            value = state.fatRatio.toFloat(),
            onValueChange = { screenModel.updateFatRatio(it.toInt()) },
            valueRange = 15f..40f,
            colors = SliderDefaults.colors(thumbColor = ScoreFat, activeTrackColor = ScoreFat)
        )
    }
}

// Step 3: 理想目標
@Composable
private fun Step3IdealGoals(state: ProfileSetupState, screenModel: ProfileSetupScreenModel) {
    Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
        Text("理想の目標", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Text("達成したい理想の体型を設定しましょう", color = MaterialTheme.colorScheme.onSurfaceVariant)

        OutlinedTextField(
            value = state.idealWeight,
            onValueChange = screenModel::updateIdealWeight,
            label = { Text("理想の体重") },
            suffix = { Text("kg") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp)
        )

        OutlinedTextField(
            value = state.idealBodyFatPercentage,
            onValueChange = screenModel::updateIdealBodyFatPercentage,
            label = { Text("理想の体脂肪率") },
            suffix = { Text("%") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp)
        )

        // 現在 vs 理想の比較
        val currentWeight = state.weight.toFloatOrNull() ?: 0f
        val currentBf = state.bodyFatPercentage.toFloatOrNull() ?: 0f
        val idealWeight = state.idealWeight.toFloatOrNull() ?: 0f
        val idealBf = state.idealBodyFatPercentage.toFloatOrNull() ?: 0f

        if (currentWeight > 0 && idealWeight > 0) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = AccentGreen.copy(alpha = 0.1f))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("目標達成に向けて", fontWeight = FontWeight.Bold, color = AccentGreen)
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text("体重変化", style = MaterialTheme.typography.labelSmall)
                            val diff = idealWeight - currentWeight
                            Text(
                                "${if (diff >= 0) "+" else ""}${formatOneDecimal(diff)} kg",
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Column {
                            Text("体脂肪率変化", style = MaterialTheme.typography.labelSmall)
                            val diff = idealBf - currentBf
                            Text(
                                "${if (diff >= 0) "+" else ""}${formatOneDecimal(diff)} %",
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Column {
                            Text("理想LBM", style = MaterialTheme.typography.labelSmall)
                            val idealLbm = idealWeight * (1 - idealBf / 100)
                            Text("${formatOneDecimal(idealLbm)} kg", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // 準備完了メッセージ
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Primary.copy(alpha = 0.1f))
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(Icons.Default.Celebration, null, tint = Primary, modifier = Modifier.size(48.dp))
                Spacer(modifier = Modifier.height(8.dp))
                Text("準備完了！", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleLarge)
                Text(
                    "「完了」を押すとダッシュボードが開きます",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}

@Composable
private fun SelectableCard(
    selected: Boolean,
    onClick: () -> Unit,
    label: String,
    subtitle: String? = null
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .then(
                if (selected) Modifier.border(2.dp, Primary, RoundedCornerShape(12.dp))
                else Modifier
            ),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (selected) Primary.copy(alpha = 0.1f) else MaterialTheme.colorScheme.surface
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(label, fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal)
                if (subtitle != null) {
                    Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            if (selected) {
                Icon(Icons.Default.CheckCircle, null, tint = Primary)
            }
        }
    }
}

@Composable
private fun PfcIndicator(label: String, value: Int, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            modifier = Modifier
                .size(60.dp)
                .background(color.copy(alpha = 0.2f), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Text("$value%", fontWeight = FontWeight.Bold, color = color)
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(label, fontWeight = FontWeight.Bold, color = color)
    }
}
