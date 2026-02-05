package com.yourcoach.plus.android.ui.screens.auth

import androidx.compose.animation.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.horizontalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.DirectionsRun
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.yourcoach.plus.android.R
import com.yourcoach.plus.android.ui.theme.*
import com.yourcoach.plus.android.ui.screens.settings.RoutineSettingsViewModel
import com.yourcoach.plus.android.ui.screens.settings.MealSlotSettingsViewModel
import com.yourcoach.plus.android.ui.screens.settings.DEFAULT_ROUTINE_DAYS
import com.yourcoach.plus.shared.domain.model.*
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.UserRepository
import com.yourcoach.plus.shared.domain.repository.RoutineRepository
import kotlinx.coroutines.launch
import org.koin.compose.koinInject
import org.koin.androidx.compose.koinViewModel

/**
 * オンボーディング画面（一新版）
 * 4ステップ構成: イントロ → プロフィール → ルーティン → 食事スロット
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OnboardingScreen(
    userId: String,
    onComplete: () -> Unit
) {
    val authRepository: AuthRepository = koinInject()
    val userRepository: UserRepository = koinInject()
    val routineRepository: RoutineRepository = koinInject()
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    // 現在のステップ (0: イントロ, 1: プロフィール, 2: ルーティン, 3: 食事スロット)
    var currentStep by remember { mutableIntStateOf(0) }
    val totalSteps = 4

    // ========== プロフィールデータ ==========
    // メールアドレスの@前を初期値として自動入力（ユーザーは任意変更可能）
    val initialNickname = remember {
        authRepository.getCurrentUser()?.email?.substringBefore("@") ?: ""
    }
    var nickname by remember { mutableStateOf(initialNickname) }
    var age by remember { mutableStateOf("") }
    var gender by remember { mutableStateOf(Gender.MALE) }
    var height by remember { mutableStateOf("") }
    var weight by remember { mutableStateOf("") }
    var bodyFatPercentage by remember { mutableStateOf("") }
    var targetWeight by remember { mutableStateOf("") }
    var activityLevel by remember { mutableStateOf(ActivityLevel.DESK_WORK) }
    var goal by remember { mutableStateOf(FitnessGoal.MAINTAIN) }
    var mealsPerDay by remember { mutableIntStateOf(5) }
    var proteinRatio by remember { mutableIntStateOf(30) }
    var fatRatio by remember { mutableIntStateOf(25) }
    var carbRatio by remember { mutableIntStateOf(45) }
    var calorieAdjustment by remember { mutableIntStateOf(0) }
    var budgetTier by remember { mutableIntStateOf(2) }

    // ========== ルーティンデータ ==========
    var routineDays by remember { mutableStateOf(DEFAULT_ROUTINE_DAYS) }

    // ========== 食事スロットデータ ==========
    var wakeUpTime by remember { mutableStateOf("07:00") }
    var sleepTime by remember { mutableStateOf("23:00") }
    var trainingTime by remember { mutableStateOf<String?>("17:00") }
    var trainingAfterMeal by remember { mutableStateOf<Int?>(3) }
    var trainingDuration by remember { mutableIntStateOf(120) }
    var trainingStyle by remember { mutableStateOf(TrainingStyle.PUMP) }
    var mealSlotConfig by remember { mutableStateOf(MealSlotConfig.createDefault(mealsPerDay)) }

    var isSaving by remember { mutableStateOf(false) }

    // ========== 計算値 ==========
    val bmr = remember(weight, height, age, gender, bodyFatPercentage) {
        val w = weight.toFloatOrNull() ?: return@remember null
        val bf = bodyFatPercentage.toFloatOrNull()

        if (bf != null && bf > 0 && bf < 100) {
            val lbm = w * (1 - bf / 100)
            370 + 21.6f * lbm
        } else {
            val h = height.toFloatOrNull() ?: return@remember null
            val a = age.toIntOrNull() ?: return@remember null
            when (gender) {
                Gender.MALE -> 10 * w + 6.25f * h - 5 * a + 5
                Gender.FEMALE -> 10 * w + 6.25f * h - 5 * a - 161
                Gender.OTHER -> 10 * w + 6.25f * h - 5 * a - 78
            }
        }
    }

    val tdee = remember(bmr, activityLevel) {
        bmr?.let { b ->
            val multiplier = activityLevel.multiplier
            b * multiplier
        }
    }

    // 目的変更時のカロリー調整
    var previousGoal by remember { mutableStateOf<FitnessGoal?>(null) }
    LaunchedEffect(goal) {
        val defaultAdjustment = when (goal) {
            FitnessGoal.LOSE_WEIGHT -> -300
            FitnessGoal.MAINTAIN -> 0
            FitnessGoal.GAIN_MUSCLE -> 300
        }
        if (previousGoal != null && previousGoal != goal) {
            calorieAdjustment = defaultAdjustment
        } else if (previousGoal == null) {
            calorieAdjustment = defaultAdjustment
        }
        previousGoal = goal
    }

    val targetCalories = remember(tdee, calorieAdjustment) {
        tdee?.let { (it + calorieAdjustment).toInt() }
    }

    // mealsPerDay変更時にスロット設定を更新
    LaunchedEffect(mealsPerDay) {
        mealSlotConfig = MealSlotConfig.createDefault(mealsPerDay)
    }

    // ========== 保存処理 ==========
    fun saveAllAndComplete() {
        // "official" ニックネームは official@your-coach-plus.com のみ許可
        val currentEmail = authRepository.getCurrentUser()?.email
        if (nickname.lowercase() == "official" && currentEmail != "official@your-coach-plus.com") {
            scope.launch {
                snackbarHostState.showSnackbar("「official」は予約されたニックネームです")
            }
            return
        }

        scope.launch {
            isSaving = true
            try {
                // PFC計算
                val calcTargetProtein = targetCalories?.let { cal -> (cal * proteinRatio / 100f / 4f) }
                val calcTargetFat = targetCalories?.let { cal -> (cal * fatRatio / 100f / 9f) }
                val calcTargetCarbs = targetCalories?.let { cal -> (cal * carbRatio / 100f / 4f) }

                // プロフィール保存
                val profile = UserProfile(
                    nickname = nickname.takeIf { it.isNotBlank() },
                    gender = gender,
                    age = age.toIntOrNull(),
                    height = height.toFloatOrNull(),
                    weight = weight.toFloatOrNull(),
                    bodyFatPercentage = bodyFatPercentage.toFloatOrNull(),
                    targetWeight = targetWeight.toFloatOrNull(),
                    activityLevel = activityLevel,
                    goal = goal,
                    targetCalories = targetCalories,
                    targetProtein = calcTargetProtein,
                    targetFat = calcTargetFat,
                    targetCarbs = calcTargetCarbs,
                    proteinRatioPercent = proteinRatio,
                    fatRatioPercent = fatRatio,
                    carbRatioPercent = carbRatio,
                    mealsPerDay = mealsPerDay,
                    calorieAdjustment = calorieAdjustment,
                    budgetTier = budgetTier,
                    wakeUpTime = wakeUpTime,
                    sleepTime = sleepTime,
                    trainingTime = trainingTime,
                    trainingAfterMeal = trainingAfterMeal,
                    trainingDuration = trainingDuration,
                    trainingStyle = trainingStyle,
                    mealSlotConfig = mealSlotConfig,
                    onboardingCompleted = true
                )
                userRepository.updateProfile(userId, profile)

                // ルーティン保存
                val now = System.currentTimeMillis()
                val pattern = RoutinePattern(
                    userId = userId,
                    name = "${routineDays.size}日間分割",
                    description = routineDays.map { if (it.isRestDay) "休" else it.splitType.take(1).ifEmpty { "?" } }.joinToString("→"),
                    days = routineDays,
                    isActive = true,
                    createdAt = now,
                    updatedAt = now
                )
                routineRepository.savePattern(userId, pattern)

                onComplete()
            } catch (e: Exception) {
                snackbarHostState.showSnackbar("保存に失敗しました: ${e.message}")
                isSaving = false
            }
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
            if (currentStep > 0) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = { currentStep-- }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "戻る")
                    }
                    Spacer(modifier = Modifier.weight(1f))
                    Text(
                        text = when (currentStep) {
                            1 -> "プロフィール設定"
                            2 -> "ルーティン設定"
                            3 -> "食事スロット設定"
                            else -> ""
                        },
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.weight(1f))
                    Text(
                        text = "$currentStep / ${totalSteps - 1}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                LinearProgressIndicator(
                    progress = { currentStep.toFloat() / (totalSteps - 1) },
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
                        scope.launch {
                            try {
                                val profile = UserProfile(onboardingCompleted = true)
                                userRepository.updateProfile(userId, profile)
                                onComplete()
                            } catch (e: Exception) {
                                onComplete()
                            }
                        }
                    }) {
                        Text("スキップ", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }

            // コンテンツ
            AnimatedContent(
                targetState = currentStep,
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                transitionSpec = {
                    if (targetState > initialState) {
                        slideInHorizontally { width -> width } + fadeIn() togetherWith
                                slideOutHorizontally { width -> -width } + fadeOut()
                    } else {
                        slideInHorizontally { width -> -width } + fadeIn() togetherWith
                                slideOutHorizontally { width -> width } + fadeOut()
                    }
                },
                label = "onboarding_content"
            ) { step ->
                when (step) {
                    0 -> IntroStep()
                    1 -> ProfileStep(
                        nickname = nickname, onNicknameChange = { nickname = it },
                        age = age, onAgeChange = { age = it },
                        gender = gender, onGenderChange = { gender = it },
                        height = height, onHeightChange = { height = it },
                        weight = weight, onWeightChange = { weight = it },
                        bodyFatPercentage = bodyFatPercentage, onBodyFatPercentageChange = { bodyFatPercentage = it },
                        targetWeight = targetWeight, onTargetWeightChange = { targetWeight = it },
                        activityLevel = activityLevel, onActivityLevelChange = { activityLevel = it },
                        goal = goal, onGoalChange = { goal = it },
                        mealsPerDay = mealsPerDay, onMealsPerDayChange = { mealsPerDay = it },
                        proteinRatio = proteinRatio, onProteinRatioChange = { proteinRatio = it },
                        fatRatio = fatRatio, onFatRatioChange = { fatRatio = it },
                        carbRatio = carbRatio, onCarbRatioChange = { carbRatio = it },
                        calorieAdjustment = calorieAdjustment, onCalorieAdjustmentChange = { calorieAdjustment = it },
                        budgetTier = budgetTier, onBudgetTierChange = { budgetTier = it },
                        bmr = bmr, tdee = tdee, targetCalories = targetCalories
                    )
                    2 -> RoutineStep(
                        days = routineDays,
                        onDaysChange = { routineDays = it }
                    )
                    3 -> MealSlotStep(
                        mealsPerDay = mealsPerDay,
                        wakeUpTime = wakeUpTime, onWakeUpTimeChange = { wakeUpTime = it },
                        sleepTime = sleepTime, onSleepTimeChange = { sleepTime = it },
                        trainingTime = trainingTime, onTrainingTimeChange = { trainingTime = it },
                        trainingAfterMeal = trainingAfterMeal, onTrainingAfterMealChange = { trainingAfterMeal = it },
                        trainingDuration = trainingDuration, onTrainingDurationChange = { trainingDuration = it },
                        trainingStyle = trainingStyle, onTrainingStyleChange = { trainingStyle = it },
                        mealSlotConfig = mealSlotConfig, onMealSlotConfigChange = { mealSlotConfig = it },
                        onTimelineGenerated = {
                            scope.launch {
                                snackbarHostState.showSnackbar("タイムラインを生成しました")
                            }
                        }
                    )
                }
            }

            // ボタン
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                if (currentStep > 0 && currentStep < totalSteps - 1) {
                    OutlinedButton(
                        onClick = { currentStep-- },
                        modifier = Modifier
                            .weight(1f)
                            .height(56.dp),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("戻る")
                    }
                }

                // ステップ1のバリデーション（性別、身長、体重、体脂肪率必須）
                val isStep1Valid = currentStep != 1 || (
                    height.toFloatOrNull() != null &&
                    weight.toFloatOrNull() != null &&
                    bodyFatPercentage.toFloatOrNull() != null
                )

                Button(
                    onClick = {
                        if (currentStep == totalSteps - 1) {
                            saveAllAndComplete()
                        } else {
                            currentStep++
                        }
                    },
                    modifier = Modifier
                        .weight(if (currentStep > 0 && currentStep < totalSteps - 1) 1f else 2f)
                        .height(56.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Primary),
                    enabled = !isSaving && isStep1Valid
                ) {
                    if (isSaving) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(24.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text(
                            text = when (currentStep) {
                                0 -> "設定を始める"
                                totalSteps - 1 -> "完了"
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
        // ロゴ画像
        Image(
            painter = painterResource(id = R.drawable.app_logo),
            contentDescription = "Your Coach+ Logo",
            modifier = Modifier
                .size(120.dp)
                .clip(RoundedCornerShape(24.dp))
        )

        Spacer(modifier = Modifier.height(32.dp))

        Text(
            text = "Your Coach+ へようこそ",
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
private fun ProfileStep(
    nickname: String, onNicknameChange: (String) -> Unit,
    age: String, onAgeChange: (String) -> Unit,
    gender: Gender, onGenderChange: (Gender) -> Unit,
    height: String, onHeightChange: (String) -> Unit,
    weight: String, onWeightChange: (String) -> Unit,
    bodyFatPercentage: String, onBodyFatPercentageChange: (String) -> Unit,
    targetWeight: String, onTargetWeightChange: (String) -> Unit,
    activityLevel: ActivityLevel, onActivityLevelChange: (ActivityLevel) -> Unit,
    goal: FitnessGoal, onGoalChange: (FitnessGoal) -> Unit,
    mealsPerDay: Int, onMealsPerDayChange: (Int) -> Unit,
    proteinRatio: Int, onProteinRatioChange: (Int) -> Unit,
    fatRatio: Int, onFatRatioChange: (Int) -> Unit,
    carbRatio: Int, onCarbRatioChange: (Int) -> Unit,
    calorieAdjustment: Int, onCalorieAdjustmentChange: (Int) -> Unit,
    budgetTier: Int, onBudgetTierChange: (Int) -> Unit,
    bmr: Float?, tdee: Float?, targetCalories: Int?
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 基本情報
        item {
            SectionCard(title = "基本情報", icon = Icons.Default.Person) {
                OutlinedTextField(
                    value = nickname,
                    onValueChange = onNicknameChange,
                    label = { Text("ニックネーム") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = age,
                    onValueChange = onAgeChange,
                    label = { Text("年齢") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    shape = RoundedCornerShape(12.dp),
                    suffix = { Text("歳") }
                )

                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = "身体的性別",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // 男女の2択のみ
                    listOf(Gender.MALE, Gender.FEMALE).forEach { g ->
                        FilterChip(
                            onClick = { onGenderChange(g) },
                            label = {
                                Text(
                                    when (g) {
                                        Gender.MALE -> "男性"
                                        Gender.FEMALE -> "女性"
                                        else -> ""
                                    }
                                )
                            },
                            selected = gender == g,
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
                        value = height,
                        onValueChange = onHeightChange,
                        label = { Text("身長 *") },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        shape = RoundedCornerShape(12.dp),
                        suffix = { Text("cm") },
                        isError = height.isBlank(),
                        supportingText = if (height.isBlank()) {
                            { Text("必須", color = MaterialTheme.colorScheme.error) }
                        } else null
                    )
                    OutlinedTextField(
                        value = weight,
                        onValueChange = onWeightChange,
                        label = { Text("体重 *") },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        shape = RoundedCornerShape(12.dp),
                        suffix = { Text("kg") },
                        isError = weight.isBlank(),
                        supportingText = if (weight.isBlank()) {
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
                        value = bodyFatPercentage,
                        onValueChange = onBodyFatPercentageChange,
                        label = { Text("体脂肪率 *") },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        shape = RoundedCornerShape(12.dp),
                        suffix = { Text("%") },
                        isError = bodyFatPercentage.isBlank(),
                        supportingText = if (bodyFatPercentage.isBlank()) {
                            { Text("必須", color = MaterialTheme.colorScheme.error) }
                        } else null
                    )
                    OutlinedTextField(
                        value = targetWeight,
                        onValueChange = onTargetWeightChange,
                        label = { Text("目標体重") },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        shape = RoundedCornerShape(12.dp),
                        suffix = { Text("kg") }
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
                if (bmr != null && tdee != null) {
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
                                    "${bmr.toInt()}",
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                    color = Primary
                                )
                                Text("BMR (kcal)", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    "${tdee.toInt()}",
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
                        onClick = { onGoalChange(FitnessGoal.LOSE_WEIGHT) },
                        label = { Text("ダイエット") },
                        selected = goal == FitnessGoal.LOSE_WEIGHT,
                        modifier = Modifier.fillMaxWidth()
                    )
                    FilterChip(
                        onClick = { onGoalChange(FitnessGoal.MAINTAIN) },
                        label = { Text("メンテナンス・リコンプ") },
                        selected = goal == FitnessGoal.MAINTAIN,
                        modifier = Modifier.fillMaxWidth()
                    )
                    FilterChip(
                        onClick = { onGoalChange(FitnessGoal.GAIN_MUSCLE) },
                        label = { Text("バルクアップ") },
                        selected = goal == FitnessGoal.GAIN_MUSCLE,
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // 食事回数
                Text(
                    text = "1日の食事回数",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    (2..8).forEach { count ->
                        FilterChip(
                            onClick = { onMealsPerDayChange(count) },
                            label = { Text("$count") },
                            selected = mealsPerDay == count,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

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
                            onClick = { onActivityLevelChange(level) },
                            label = { Text(level.displayName) },
                            selected = activityLevel == level,
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
                    text = "カロリー調整: ${if (calorieAdjustment >= 0) "+" else ""}${calorieAdjustment} kcal",
                    style = MaterialTheme.typography.bodyMedium
                )
                Slider(
                    value = calorieAdjustment.toFloat(),
                    onValueChange = { onCalorieAdjustmentChange(it.toInt()) },
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

                targetCalories?.let { cal ->
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
                        value = proteinRatio.toFloat(),
                        onValueChange = {
                            val newP = it.toInt()
                            val diff = newP - proteinRatio
                            onProteinRatioChange(newP)
                            if (carbRatio - diff / 2 >= 0) {
                                onCarbRatioChange(carbRatio - diff / 2)
                                onFatRatioChange(fatRatio - diff + diff / 2)
                            }
                        },
                        valueRange = 10f..50f,
                        modifier = Modifier.weight(1f)
                    )
                    Text("$proteinRatio%", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.width(48.dp))
                }

                // F
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("F", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = ScoreFat, modifier = Modifier.width(24.dp))
                    Slider(
                        value = fatRatio.toFloat(),
                        onValueChange = {
                            val newF = it.toInt()
                            val diff = newF - fatRatio
                            onFatRatioChange(newF)
                            if (carbRatio - diff >= 0) {
                                onCarbRatioChange(carbRatio - diff)
                            }
                        },
                        valueRange = 10f..50f,
                        modifier = Modifier.weight(1f)
                    )
                    Text("$fatRatio%", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.width(48.dp))
                }

                // C
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("C", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = ScoreCarbs, modifier = Modifier.width(24.dp))
                    Slider(
                        value = carbRatio.toFloat(),
                        onValueChange = {
                            val newC = it.toInt()
                            val diff = newC - carbRatio
                            onCarbRatioChange(newC)
                            if (proteinRatio - diff >= 0) {
                                onProteinRatioChange(proteinRatio - diff)
                            }
                        },
                        valueRange = 10f..60f,
                        modifier = Modifier.weight(1f)
                    )
                    Text("$carbRatio%", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.width(48.dp))
                }

                val total = proteinRatio + fatRatio + carbRatio
                Text(
                    text = "合計: $total% ${if (total != 100) "(100%に調整してください)" else "✓"}",
                    style = MaterialTheme.typography.labelSmall,
                    color = if (total == 100) Color.Green else Color.Red,
                    modifier = Modifier.padding(top = 8.dp)
                )

                targetCalories?.let { cal ->
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        val proteinGrams = (cal * proteinRatio / 100 / 4).toInt()
                        val fatGrams = (cal * fatRatio / 100 / 9).toInt()
                        val carbGrams = (cal * carbRatio / 100 / 4).toInt()

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
                            onClick = { onBudgetTierChange(tier) },
                            label = { Text(label) },
                            selected = budgetTier == tier,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
                Text(
                    text = when (budgetTier) {
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

// ========== ステップ2: ルーティン設定 ==========
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RoutineStep(
    days: List<RoutineDay>,
    onDaysChange: (List<RoutineDay>) -> Unit
) {
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
        itemsIndexed(days) { index, day ->
            var expanded by remember { mutableStateOf(false) }

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
                                    onClick = {
                                        if (index > 0) {
                                            val newDays = days.toMutableList()
                                            val temp = newDays.removeAt(index)
                                            newDays.add(index - 1, temp)
                                            onDaysChange(newDays.mapIndexed { i, d ->
                                                d.copy(id = (i + 1).toString(), dayNumber = i + 1, name = "Day ${i + 1}")
                                            })
                                        }
                                    },
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
                                    onClick = {
                                        if (index < days.size - 1) {
                                            val newDays = days.toMutableList()
                                            val temp = newDays.removeAt(index)
                                            newDays.add(index + 1, temp)
                                            onDaysChange(newDays.mapIndexed { i, d ->
                                                d.copy(id = (i + 1).toString(), dayNumber = i + 1, name = "Day ${i + 1}")
                                            })
                                        }
                                    },
                                    enabled = index < days.size - 1,
                                    modifier = Modifier.size(24.dp)
                                ) {
                                    Icon(
                                        Icons.Default.KeyboardArrowDown,
                                        contentDescription = "下へ",
                                        tint = if (index < days.size - 1) Primary else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.3f)
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
                                    .clickable {
                                        val isRest = !day.isRestDay
                                        onDaysChange(days.map {
                                            if (it.dayNumber == day.dayNumber) it.copy(isRestDay = isRest, splitType = if (isRest) "休み" else it.splitType)
                                            else it
                                        })
                                    }
                                    .padding(4.dp)
                            ) {
                                Checkbox(
                                    checked = day.isRestDay,
                                    onCheckedChange = { isRest ->
                                        onDaysChange(days.map {
                                            if (it.dayNumber == day.dayNumber) it.copy(isRestDay = isRest, splitType = if (isRest) "休み" else it.splitType)
                                            else it
                                        })
                                    },
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
                        if (days.size > 2 && day.dayNumber > 2) {
                            IconButton(onClick = {
                                val newDays = days.filter { it.dayNumber != day.dayNumber }
                                    .mapIndexed { i, d -> d.copy(id = (i + 1).toString(), dayNumber = i + 1, name = "Day ${i + 1}") }
                                onDaysChange(newDays)
                            }) {
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
                                            onDaysChange(days.map {
                                                if (it.dayNumber == day.dayNumber) it.copy(splitType = type, isRestDay = false)
                                                else it
                                            })
                                            expanded = false
                                        }
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // Day追加ボタン
        if (days.size < 10) {
            item {
                OutlinedButton(
                    onClick = {
                        val nextDayNumber = days.size + 1
                        val newDay = RoutineDay(
                            id = nextDayNumber.toString(),
                            dayNumber = nextDayNumber,
                            name = "Day $nextDayNumber",
                            splitType = "",
                            isRestDay = false
                        )
                        onDaysChange(days + newDay)
                    },
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

// ========== ステップ3: 食事スロット設定 ==========
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MealSlotStep(
    mealsPerDay: Int,
    wakeUpTime: String, onWakeUpTimeChange: (String) -> Unit,
    sleepTime: String, onSleepTimeChange: (String) -> Unit,
    trainingTime: String?, onTrainingTimeChange: (String?) -> Unit,
    trainingAfterMeal: Int?, onTrainingAfterMealChange: (Int?) -> Unit,
    trainingDuration: Int, onTrainingDurationChange: (Int) -> Unit,
    trainingStyle: TrainingStyle, onTrainingStyleChange: (TrainingStyle) -> Unit,
    mealSlotConfig: MealSlotConfig, onMealSlotConfigChange: (MealSlotConfig) -> Unit,
    onTimelineGenerated: () -> Unit = {}
) {
    var showWakeTimePicker by remember { mutableStateOf(false) }
    var showSleepTimePicker by remember { mutableStateOf(false) }
    var showTrainingTimePicker by remember { mutableStateOf(false) }

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
                    time = wakeUpTime,
                    onClick = { showWakeTimePicker = true }
                )

                // 就寝時刻
                TimePickerRow(
                    label = "就寝",
                    time = sleepTime,
                    onClick = { showSleepTimePicker = true }
                )

                // トレーニング時刻
                TimePickerRow(
                    label = "トレーニング",
                    time = trainingTime ?: "未設定",
                    onClick = { showTrainingTimePicker = true },
                    onClear = if (trainingTime != null) {{ onTrainingTimeChange(null) }} else null
                )

                if (trainingTime != null) {
                    Spacer(modifier = Modifier.height(12.dp))

                    // トレ前の食事番号
                    Text(
                        text = "トレ前食事",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Row(
                        modifier = Modifier.horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        (1..mealsPerDay).forEach { mealNum ->
                            FilterChip(
                                selected = trainingAfterMeal == mealNum,
                                onClick = {
                                    onTrainingAfterMealChange(if (trainingAfterMeal == mealNum) null else mealNum)
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
                                selected = trainingDuration == minutes,
                                onClick = { onTrainingDurationChange(minutes) },
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
                                selected = trainingStyle == style,
                                onClick = { onTrainingStyleChange(style) },
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
                        val newConfig = MealSlotConfig.createTimelineRoutine(
                            mealsPerDay = mealsPerDay,
                            trainingAfterMeal = trainingAfterMeal
                        )
                        onMealSlotConfigChange(newConfig)
                        onTimelineGenerated()
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

        // 食事スロット一覧
        item {
            Text(
                text = "食事設定（${mealsPerDay}食）",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
        }

        items(mealSlotConfig.slots.sortedBy { it.slotNumber }.size) { index ->
            val slot = mealSlotConfig.slots.sortedBy { it.slotNumber }[index]
            MealSlotCard(
                slot = slot,
                onFoodChoiceChange = { choice ->
                    val updatedSlots = mealSlotConfig.slots.map {
                        if (it.slotNumber == slot.slotNumber) it.copy(defaultFoodChoice = choice) else it
                    }
                    onMealSlotConfigChange(mealSlotConfig.copy(slots = updatedSlots))
                }
            )
        }

        item { Spacer(modifier = Modifier.height(80.dp)) }
    }

    // TimePicker Dialogs
    if (showWakeTimePicker) {
        TimePickerDialog(
            initialTime = wakeUpTime,
            onDismiss = { showWakeTimePicker = false },
            onConfirm = { time ->
                onWakeUpTimeChange(time)
                showWakeTimePicker = false
            }
        )
    }

    if (showSleepTimePicker) {
        TimePickerDialog(
            initialTime = sleepTime,
            onDismiss = { showSleepTimePicker = false },
            onConfirm = { time ->
                onSleepTimeChange(time)
                showSleepTimePicker = false
            }
        )
    }

    if (showTrainingTimePicker) {
        TimePickerDialog(
            initialTime = trainingTime ?: "18:00",
            onDismiss = { showTrainingTimePicker = false },
            onConfirm = { time ->
                onTrainingTimeChange(time)
                showTrainingTimePicker = false
            }
        )
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
    onClick: () -> Unit,
    onClear: (() -> Unit)? = null
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
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
            if (onClear != null) {
                IconButton(
                    onClick = onClear,
                    modifier = Modifier.size(24.dp)
                ) {
                    Icon(Icons.Default.Close, contentDescription = "クリア", modifier = Modifier.size(16.dp))
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TimePickerDialog(
    initialTime: String,
    onDismiss: () -> Unit,
    onConfirm: (String) -> Unit
) {
    val parts = initialTime.split(":")
    val initialHour = parts.getOrNull(0)?.toIntOrNull() ?: 12
    val initialMinute = parts.getOrNull(1)?.toIntOrNull() ?: 0

    val timePickerState = rememberTimePickerState(
        initialHour = initialHour,
        initialMinute = initialMinute,
        is24Hour = true
    )

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("時刻を選択") },
        text = {
            Box(
                modifier = Modifier.fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                TimePicker(state = timePickerState)
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    val time = "%02d:%02d".format(timePickerState.hour, timePickerState.minute)
                    onConfirm(time)
                }
            ) {
                Text("OK")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("キャンセル")
            }
        }
    )
}

@Composable
private fun MealSlotCard(
    slot: MealSlot,
    onFoodChoiceChange: (FoodChoice) -> Unit
) {
    var showFoodChoiceMenu by remember { mutableStateOf(false) }
    val foodChoiceColor = when (slot.defaultFoodChoice) {
        FoodChoice.KITCHEN -> ScoreProtein
        FoodChoice.STORE -> ScoreGL
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Default.Restaurant,
                contentDescription = null,
                tint = ScoreCarbs,
                modifier = Modifier.size(24.dp)
            )

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = slot.getDisplayName(),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // 優先択（自炊/中食）
                    Box {
                        Surface(
                            color = foodChoiceColor.copy(alpha = 0.2f),
                            shape = RoundedCornerShape(4.dp),
                            modifier = Modifier.clickable { showFoodChoiceMenu = true }
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = when (slot.defaultFoodChoice) {
                                        FoodChoice.KITCHEN -> "自炊"
                                        FoodChoice.STORE -> "中食"
                                    },
                                    style = MaterialTheme.typography.labelSmall,
                                    color = foodChoiceColor,
                                    fontWeight = FontWeight.Bold
                                )
                                Icon(
                                    Icons.Default.ArrowDropDown,
                                    contentDescription = null,
                                    tint = foodChoiceColor,
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                        }
                        DropdownMenu(
                            expanded = showFoodChoiceMenu,
                            onDismissRequest = { showFoodChoiceMenu = false }
                        ) {
                            FoodChoice.entries.forEach { choice ->
                                DropdownMenuItem(
                                    text = {
                                        Text(
                                            text = choice.displayName,
                                            color = when (choice) {
                                                FoodChoice.KITCHEN -> ScoreProtein
                                                FoodChoice.STORE -> ScoreGL
                                            }
                                        )
                                    },
                                    onClick = {
                                        onFoodChoiceChange(choice)
                                        showFoodChoiceMenu = false
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

// 後方互換性のための旧シグネチャ（userId不要バージョン）
@Composable
fun OnboardingScreen(
    onComplete: () -> Unit
) {
    OnboardingScreenSimple(onComplete = onComplete)
}

/**
 * シンプル版オンボーディング（旧バージョン互換）
 */
@Composable
private fun OnboardingScreenSimple(
    onComplete: () -> Unit
) {
    Scaffold { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier
                    .size(120.dp)
                    .background(Primary.copy(alpha = 0.1f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.FitnessCenter,
                    contentDescription = null,
                    modifier = Modifier.size(60.dp),
                    tint = Primary
                )
            }
            Spacer(modifier = Modifier.height(32.dp))
            Text(
                text = "Your Coach+ へようこそ",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "あなたに最適な栄養管理を始めましょう",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.weight(1f))
            Button(
                onClick = onComplete,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Primary)
            ) {
                Text(
                    text = "始める",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}
