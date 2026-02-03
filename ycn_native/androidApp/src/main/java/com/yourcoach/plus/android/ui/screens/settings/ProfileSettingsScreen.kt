package com.yourcoach.plus.android.ui.screens.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.yourcoach.plus.android.ui.theme.*
import com.yourcoach.plus.shared.domain.model.ActivityLevel
import com.yourcoach.plus.shared.domain.model.FitnessGoal
import com.yourcoach.plus.shared.domain.model.Gender
import com.yourcoach.plus.shared.domain.model.UserProfile
import com.yourcoach.plus.shared.domain.repository.UserRepository
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.launch
import org.koin.compose.koinInject

/**
 * プロフィール設定画面
 * オンボーディングで設定した項目を編集可能
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileSettingsScreen(
    userId: String,  // 後方互換性のため残す（使用しない）
    initialProfile: UserProfile?,  // 後方互換性のため残す（使用しない）
    onNavigateBack: () -> Unit
) {
    val userRepository: UserRepository = koinInject()
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    // Firebase Authから現在のユーザーIDを取得
    val currentUserId = FirebaseAuth.getInstance().currentUser?.uid ?: ""

    // ローディング状態
    var isLoading by remember { mutableStateOf(true) }
    var loadedProfile by remember { mutableStateOf<UserProfile?>(null) }

    // Firestoreからプロフィールを読み込む
    LaunchedEffect(currentUserId) {
        if (currentUserId.isNotEmpty()) {
            userRepository.getUser(currentUserId)
                .onSuccess { user ->
                    loadedProfile = user?.profile
                    isLoading = false
                }
                .onFailure {
                    isLoading = false
                }
        } else {
            isLoading = false
        }
    }

    // State（loadedProfileから初期化）
    var nickname by remember(loadedProfile) { mutableStateOf(loadedProfile?.nickname ?: "") }
    var age by remember(loadedProfile) { mutableStateOf(loadedProfile?.age?.toString() ?: "") }
    var gender by remember(loadedProfile) { mutableStateOf(loadedProfile?.gender ?: Gender.MALE) }
    var height by remember(loadedProfile) { mutableStateOf(loadedProfile?.height?.toString() ?: "") }
    var weight by remember(loadedProfile) { mutableStateOf(loadedProfile?.weight?.toString() ?: "") }
    var bodyFatPercentage by remember(loadedProfile) { mutableStateOf(loadedProfile?.bodyFatPercentage?.toString() ?: "") }
    var targetWeight by remember(loadedProfile) { mutableStateOf(loadedProfile?.targetWeight?.toString() ?: "") }
    var activityLevel by remember(loadedProfile) { mutableStateOf(loadedProfile?.activityLevel ?: ActivityLevel.MODERATE) }
    var goal by remember(loadedProfile) { mutableStateOf(loadedProfile?.goal ?: FitnessGoal.MAINTAIN) }
    var mealsPerDay by remember(loadedProfile) { mutableIntStateOf(loadedProfile?.mealsPerDay ?: 5) }
    var proteinRatio by remember(loadedProfile) { mutableIntStateOf(loadedProfile?.proteinRatioPercent ?: 30) }
    var fatRatio by remember(loadedProfile) { mutableIntStateOf(loadedProfile?.fatRatioPercent ?: 25) }
    var carbRatio by remember(loadedProfile) { mutableIntStateOf(loadedProfile?.carbRatioPercent ?: 45) }
    var calorieAdjustment by remember(loadedProfile) { mutableIntStateOf(loadedProfile?.calorieAdjustment ?: 0) }
    // タンパク質係数（LBM × coefficient = 目標P）
    var proteinCoefficient by remember(loadedProfile) { mutableFloatStateOf(loadedProfile?.proteinCoefficient ?: 2.3f) }
    // 食費設定
    var budgetTier by remember(loadedProfile) { mutableIntStateOf(loadedProfile?.budgetTier ?: 2) }
    var isSaving by remember { mutableStateOf(false) }

    // 計算値
    // 体脂肪率がある場合はKatch-McArdle式、なければMifflin-St Jeor式を使用
    val bmr = remember(weight, height, age, gender, bodyFatPercentage) {
        val w = weight.toFloatOrNull() ?: return@remember null
        val bf = bodyFatPercentage.toFloatOrNull()

        // 体脂肪率がある場合はKatch-McArdle式（より精度が高い）
        if (bf != null && bf > 0 && bf < 100) {
            val lbm = w * (1 - bf / 100)  // 除脂肪体重
            370 + 21.6f * lbm
        } else {
            // 体脂肪率がない場合はMifflin-St Jeor式
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
            val multiplier = when (activityLevel) {
                ActivityLevel.SEDENTARY -> 1.2f
                ActivityLevel.LIGHT -> 1.375f
                ActivityLevel.MODERATE -> 1.55f
                ActivityLevel.ACTIVE -> 1.725f
                ActivityLevel.VERY_ACTIVE -> 1.9f
            }
            b * multiplier
        }
    }

    // 目的が変更されたらカロリー調整値をデフォルトに設定
    var previousGoal by remember { mutableStateOf<FitnessGoal?>(null) }
    var isInitialLoad by remember { mutableStateOf(true) }

    LaunchedEffect(goal) {
        val defaultAdjustment = when (goal) {
            FitnessGoal.LOSE_WEIGHT -> -300      // 減量: -300kcal/日
            FitnessGoal.MAINTAIN -> 0            // 維持・リコンプ: ±0
            FitnessGoal.GAIN_MUSCLE -> 300       // 増量: +300kcal/日
            null -> 0
        }

        // 初回ロード時はFirestoreの値を維持、ユーザーが目的を変更した場合はデフォルトを設定
        if (!isInitialLoad && previousGoal != null && previousGoal != goal) {
            calorieAdjustment = defaultAdjustment
        }
        previousGoal = goal
        isInitialLoad = false
    }

    // タンパク質係数変更時にPFC比率を自動計算（LBMベース）
    var previousCoefficient by remember { mutableStateOf<Float?>(null) }
    LaunchedEffect(proteinCoefficient, weight, bodyFatPercentage, tdee, calorieAdjustment) {
        // 係数が変更された場合のみPFC比率を更新
        if (previousCoefficient != null && previousCoefficient != proteinCoefficient) {
            val w = weight.toFloatOrNull()
            val bf = bodyFatPercentage.toFloatOrNull()
            val currentTdee = tdee

            if (w != null && bf != null && bf > 0 && bf < 100 && currentTdee != null) {
                val lbm = w * (1 - bf / 100)
                val targetProteinG = lbm * proteinCoefficient
                val targetCal = (currentTdee + calorieAdjustment).toInt()

                // タンパク質比率を計算（カロリーベース）
                val proteinCal = targetProteinG * 4
                val newProteinRatio = ((proteinCal / targetCal) * 100).toInt().coerceIn(10, 50)

                // 脂質は25%固定、炭水化物は残り
                val newFatRatio = 25
                val newCarbRatio = (100 - newProteinRatio - newFatRatio).coerceIn(20, 65)

                proteinRatio = newProteinRatio
                fatRatio = newFatRatio
                carbRatio = newCarbRatio
            }
        }
        previousCoefficient = proteinCoefficient
    }

    val targetCalories = remember(tdee, calorieAdjustment) {
        tdee?.let { (it + calorieAdjustment).toInt() }
    }

    fun saveProfile() {
        // "official" ニックネームは official@your-coach-plus.com のみ許可
        val currentEmail = FirebaseAuth.getInstance().currentUser?.email
        if (nickname.lowercase() == "official" && currentEmail != "official@your-coach-plus.com") {
            scope.launch {
                snackbarHostState.showSnackbar("「official」は予約されたニックネームです")
            }
            return
        }

        scope.launch {
            isSaving = true
            try {
                // PFC比率からグラム数を計算
                // タンパク質: 4kcal/g, 脂質: 9kcal/g, 炭水化物: 4kcal/g
                val calcTargetProtein = targetCalories?.let { cal ->
                    (cal * proteinRatio / 100f / 4f)
                }
                val calcTargetFat = targetCalories?.let { cal ->
                    (cal * fatRatio / 100f / 9f)
                }
                val calcTargetCarbs = targetCalories?.let { cal ->
                    (cal * carbRatio / 100f / 4f)
                }

                val profile = UserProfile(
                    nickname = nickname.takeIf { it.isNotBlank() },
                    gender = gender,
                    birthYear = null,
                    age = age.toIntOrNull(),
                    height = height.toFloatOrNull(),
                    weight = weight.toFloatOrNull(),
                    bodyFatPercentage = bodyFatPercentage.toFloatOrNull(),
                    targetWeight = targetWeight.toFloatOrNull(),
                    activityLevel = activityLevel,
                    goal = goal,
                    proteinCoefficient = proteinCoefficient,  // LBM × coefficient
                    targetCalories = targetCalories,
                    targetProtein = calcTargetProtein,
                    targetFat = calcTargetFat,
                    targetCarbs = calcTargetCarbs,
                    proteinRatioPercent = proteinRatio,
                    fatRatioPercent = fatRatio,
                    carbRatioPercent = carbRatio,
                    mealsPerDay = mealsPerDay,
                    calorieAdjustment = calorieAdjustment,
                    // 食費設定
                    budgetTier = budgetTier,
                    onboardingCompleted = true
                )
                userRepository.updateProfile(currentUserId, profile)
                snackbarHostState.showSnackbar("プロフィールを保存しました")
                onNavigateBack()
            } catch (e: Exception) {
                snackbarHostState.showSnackbar("保存に失敗しました: ${e.message}")
            } finally {
                isSaving = false
            }
        }
    }

    // ローディング中
    if (isLoading) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator()
        }
        return
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text("プロフィール設定") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "戻る")
                    }
                },
                actions = {
                    TextButton(
                        onClick = { saveProfile() },
                        enabled = !isSaving
                    ) {
                        if (isSaving) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                strokeWidth = 2.dp
                            )
                        } else {
                            Text("保存", color = Primary)
                        }
                    }
                }
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 基本情報
            item {
                SectionCard(title = "基本情報") {
                    OutlinedTextField(
                        value = nickname,
                        onValueChange = { nickname = it },
                        label = { Text("ニックネーム") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp)
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = age,
                        onValueChange = { age = it },
                        label = { Text("年齢") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
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
                        Gender.entries.forEach { g ->
                            FilterChip(
                                onClick = { gender = g },
                                label = {
                                    Text(
                                        when (g) {
                                            Gender.MALE -> "男性"
                                            Gender.FEMALE -> "女性"
                                            Gender.OTHER -> "その他"
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
                SectionCard(title = "体組成") {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        OutlinedTextField(
                            value = height,
                            onValueChange = { height = it },
                            label = { Text("身長") },
                            modifier = Modifier.weight(1f),
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            shape = RoundedCornerShape(12.dp),
                            suffix = { Text("cm") }
                        )
                        OutlinedTextField(
                            value = weight,
                            onValueChange = { weight = it },
                            label = { Text("体重") },
                            modifier = Modifier.weight(1f),
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            shape = RoundedCornerShape(12.dp),
                            suffix = { Text("kg") }
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        OutlinedTextField(
                            value = bodyFatPercentage,
                            onValueChange = { bodyFatPercentage = it },
                            label = { Text("体脂肪率") },
                            modifier = Modifier.weight(1f),
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            shape = RoundedCornerShape(12.dp),
                            suffix = { Text("%") }
                        )
                        OutlinedTextField(
                            value = targetWeight,
                            onValueChange = { targetWeight = it },
                            label = { Text("目標体重") },
                            modifier = Modifier.weight(1f),
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            shape = RoundedCornerShape(12.dp),
                            suffix = { Text("kg") }
                        )
                    }

                    // BMR/TDEE表示
                    if (bmr != null && tdee != null) {
                        Spacer(modifier = Modifier.height(16.dp))
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(
                                containerColor = Primary.copy(alpha = 0.1f)
                            ),
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
                                    Text(
                                        "BMR (kcal)",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(
                                        "${tdee.toInt()}",
                                        style = MaterialTheme.typography.titleLarge,
                                        fontWeight = FontWeight.Bold,
                                        color = Secondary
                                    )
                                    Text(
                                        "TDEE (kcal)",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // 目標・活動レベル
            item {
                SectionCard(title = "目標・活動レベル") {
                    Text(
                        text = "フィットネス目標",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        // 3つの目標オプション: ダイエット、メンテナンス・リコンプ、バルクアップ
                        FilterChip(
                            onClick = { goal = FitnessGoal.LOSE_WEIGHT },
                            label = { Text("ダイエット") },
                            selected = goal == FitnessGoal.LOSE_WEIGHT,
                            modifier = Modifier.fillMaxWidth()
                        )
                        FilterChip(
                            onClick = { goal = FitnessGoal.MAINTAIN },
                            label = { Text("メンテナンス・リコンプ") },
                            selected = goal == FitnessGoal.MAINTAIN,
                            modifier = Modifier.fillMaxWidth()
                        )
                        FilterChip(
                            onClick = { goal = FitnessGoal.GAIN_MUSCLE },
                            label = { Text("バルクアップ") },
                            selected = goal == FitnessGoal.GAIN_MUSCLE,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // タンパク質係数（LBM × coefficient）
                    val w = weight.toFloatOrNull()
                    val bf = bodyFatPercentage.toFloatOrNull()
                    val lbm = if (w != null && bf != null && bf > 0 && bf < 100) w * (1 - bf / 100) else null

                    Text(
                        text = "タンパク質係数: ×${String.format("%.1f", proteinCoefficient)}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Slider(
                        value = proteinCoefficient,
                        onValueChange = { proteinCoefficient = (it * 10).toInt() / 10f },  // 0.1刻み
                        valueRange = 2.0f..3.0f,
                        steps = 9,  // 2.0, 2.1, 2.2, ... 3.0
                        modifier = Modifier.fillMaxWidth()
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("×2.0", style = MaterialTheme.typography.labelSmall)
                        Text("×2.5", style = MaterialTheme.typography.labelSmall)
                        Text("×3.0", style = MaterialTheme.typography.labelSmall)
                    }
                    // LBM計算結果の表示
                    if (lbm != null) {
                        val targetP = (lbm * proteinCoefficient).toInt()
                        Text(
                            text = "LBM ${lbm.toInt()}kg × ${String.format("%.1f", proteinCoefficient)} = 目標P ${targetP}g",
                            style = MaterialTheme.typography.labelSmall,
                            color = Primary,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    } else {
                        Text(
                            text = "体脂肪率を入力するとLBMから目標Pを計算します",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 4.dp)
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
                                onClick = { mealsPerDay = count },
                                label = { Text("$count") },
                                selected = mealsPerDay == count,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        text = "活動レベル",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        ActivityLevel.entries.forEach { level ->
                            FilterChip(
                                onClick = { activityLevel = level },
                                label = {
                                    Text(
                                        when (level) {
                                            ActivityLevel.SEDENTARY -> "ほとんど運動しない"
                                            ActivityLevel.LIGHT -> "週1-2回の軽い運動"
                                            ActivityLevel.MODERATE -> "週3-4回の運動"
                                            ActivityLevel.ACTIVE -> "週5-6回の運動"
                                            ActivityLevel.VERY_ACTIVE -> "毎日激しい運動"
                                        }
                                    )
                                },
                                selected = activityLevel == level,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // カロリー調整
                    Text(
                        text = "カロリー調整: ${if (calorieAdjustment >= 0) "+" else ""}${calorieAdjustment} kcal",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Slider(
                        value = calorieAdjustment.toFloat(),
                        onValueChange = { calorieAdjustment = it.toInt() },
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
                            colors = CardDefaults.cardColors(
                                containerColor = AccentOrange.copy(alpha = 0.1f)
                            ),
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
                                Text(
                                    "目標カロリー (kcal/日)",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
            }

            // PFCバランス
            item {
                SectionCard(title = "PFCバランス") {
                    // P (タンパク質)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "P",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = ScoreProtein,
                            modifier = Modifier.width(24.dp)
                        )
                        Slider(
                            value = proteinRatio.toFloat(),
                            onValueChange = {
                                val newP = it.toInt()
                                val diff = newP - proteinRatio
                                proteinRatio = newP
                                // 残りを F と C で調整
                                if (carbRatio - diff / 2 >= 0) {
                                    carbRatio -= diff / 2
                                    fatRatio -= diff - diff / 2
                                }
                            },
                            valueRange = 10f..50f,
                            modifier = Modifier.weight(1f)
                        )
                        Text(
                            "$proteinRatio%",
                            style = MaterialTheme.typography.bodyMedium,
                            modifier = Modifier.width(48.dp)
                        )
                    }

                    // F (脂質)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "F",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = ScoreFat,
                            modifier = Modifier.width(24.dp)
                        )
                        Slider(
                            value = fatRatio.toFloat(),
                            onValueChange = {
                                val newF = it.toInt()
                                val diff = newF - fatRatio
                                fatRatio = newF
                                if (carbRatio - diff >= 0) {
                                    carbRatio -= diff
                                }
                            },
                            valueRange = 10f..50f,
                            modifier = Modifier.weight(1f)
                        )
                        Text(
                            "$fatRatio%",
                            style = MaterialTheme.typography.bodyMedium,
                            modifier = Modifier.width(48.dp)
                        )
                    }

                    // C (炭水化物)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "C",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = ScoreCarbs,
                            modifier = Modifier.width(24.dp)
                        )
                        Slider(
                            value = carbRatio.toFloat(),
                            onValueChange = {
                                val newC = it.toInt()
                                val diff = newC - carbRatio
                                carbRatio = newC
                                if (proteinRatio - diff >= 0) {
                                    proteinRatio -= diff
                                }
                            },
                            valueRange = 10f..60f,
                            modifier = Modifier.weight(1f)
                        )
                        Text(
                            "$carbRatio%",
                            style = MaterialTheme.typography.bodyMedium,
                            modifier = Modifier.width(48.dp)
                        )
                    }

                    // 合計表示
                    val total = proteinRatio + fatRatio + carbRatio
                    Text(
                        text = "合計: $total% ${if (total != 100) "(100%に調整してください)" else "✓"}",
                        style = MaterialTheme.typography.labelSmall,
                        color = if (total == 100) Color.Green else Color.Red,
                        modifier = Modifier.padding(top = 8.dp)
                    )

                    // 目標グラム数表示
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
                                Text(
                                    "${proteinGrams}g",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = ScoreProtein
                                )
                                Text("タンパク質", style = MaterialTheme.typography.labelSmall)
                            }
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    "${fatGrams}g",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = ScoreFat
                                )
                                Text("脂質", style = MaterialTheme.typography.labelSmall)
                            }
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    "${carbGrams}g",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = ScoreCarbs
                                )
                                Text("炭水化物", style = MaterialTheme.typography.labelSmall)
                            }
                        }
                    }
                }
            }

            // 食費設定
            item {
                SectionCard(title = "食費設定") {
                    // 食費予算
                    Text(
                        text = "食費予算",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        listOf(
                            1 to "節約",
                            2 to "標準"
                        ).forEach { (tier, label) ->
                            FilterChip(
                                onClick = { budgetTier = tier },
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
}

@Composable
private fun SectionCard(
    title: String,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 12.dp)
            )
            content()
        }
    }
}
