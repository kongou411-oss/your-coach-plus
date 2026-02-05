package com.yourcoach.plus.android.ui.screens.auth

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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.yourcoach.plus.android.ui.theme.*
import com.yourcoach.plus.shared.domain.model.ActivityLevel
import com.yourcoach.plus.shared.domain.model.FitnessGoal
import com.yourcoach.plus.shared.domain.model.Gender
import com.yourcoach.plus.shared.domain.model.UserProfile
import com.yourcoach.plus.shared.domain.repository.UserRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import org.koin.androidx.compose.koinViewModel

/**
 * プロフィール設定の状態
 */
data class ProfileSetupState(
    val currentStep: Int = 0,
    val totalSteps: Int = 4,
    // Step 0: 基本情報
    val nickname: String = "",
    val age: String = "25",
    val gender: Gender = Gender.MALE,
    val style: String = "一般",
    // Step 1: 体組成
    val height: String = "170",
    val weight: String = "70",
    val bodyFatPercentage: String = "15",
    val targetWeight: String = "70",
    // Step 2: 目標・活動レベル
    val activityLevel: ActivityLevel = ActivityLevel.DESK_WORK,
    val goal: FitnessGoal = FitnessGoal.MAINTAIN,
    val calorieAdjustment: Int = 0,
    val mealsPerDay: Int = 5,
    // Step 3: PFCバランス
    val proteinRatio: Int = 30,
    val fatRatio: Int = 25,
    val carbRatio: Int = 45,
    // Step 4: 理想目標
    val idealWeight: String = "70",
    val idealBodyFatPercentage: String = "15",
    // UI状態
    val isLoading: Boolean = false,
    val error: String? = null,
    val validationError: String? = null
)

/**
 * プロフィール設定ViewModel
 */
class ProfileSetupViewModel(
    private val userRepository: UserRepository
) : ViewModel() {
    private val _state = MutableStateFlow(ProfileSetupState())
    val state: StateFlow<ProfileSetupState> = _state.asStateFlow()

    fun updateNickname(value: String) = _state.update { it.copy(nickname = value, validationError = null) }
    fun updateAge(value: String) = _state.update { it.copy(age = value, validationError = null) }
    fun updateGender(value: Gender) {
        val defaults = when (value) {
            Gender.MALE -> Triple("170", "70", "15")
            Gender.FEMALE -> Triple("158", "55", "25")
            Gender.OTHER -> Triple("165", "62", "20")
        }
        _state.update {
            it.copy(
                gender = value,
                height = defaults.first,
                weight = defaults.second,
                bodyFatPercentage = defaults.third,
                targetWeight = defaults.second,
                idealWeight = defaults.second,
                idealBodyFatPercentage = defaults.third,
                validationError = null
            )
        }
    }
    fun updateStyle(value: String) = _state.update { it.copy(style = value, validationError = null) }
    fun updateHeight(value: String) = _state.update { it.copy(height = value, validationError = null) }
    fun updateWeight(value: String) = _state.update { it.copy(weight = value, validationError = null) }
    fun updateBodyFatPercentage(value: String) = _state.update { it.copy(bodyFatPercentage = value, validationError = null) }
    fun updateTargetWeight(value: String) = _state.update { it.copy(targetWeight = value, validationError = null) }
    fun updateActivityLevel(value: ActivityLevel) = _state.update { it.copy(activityLevel = value, validationError = null) }
    fun updateMealsPerDay(value: Int) = _state.update { it.copy(mealsPerDay = value) }
    fun updateGoal(value: FitnessGoal) {
        val adjustment = when (value) {
            FitnessGoal.LOSE_WEIGHT -> -300
            FitnessGoal.GAIN_MUSCLE -> 300
            else -> 0
        }
        _state.update { it.copy(goal = value, calorieAdjustment = adjustment, validationError = null) }
    }
    fun updateCalorieAdjustment(value: Int) = _state.update { it.copy(calorieAdjustment = value) }
    fun updateProteinRatio(value: Int) {
        val remaining = 100 - value - _state.value.fatRatio
        _state.update { it.copy(proteinRatio = value, carbRatio = remaining.coerceIn(15, 60)) }
    }
    fun updateFatRatio(value: Int) {
        val remaining = 100 - _state.value.proteinRatio - value
        _state.update { it.copy(fatRatio = value, carbRatio = remaining.coerceIn(15, 60)) }
    }
    fun updateIdealWeight(value: String) = _state.update { it.copy(idealWeight = value, validationError = null) }
    fun updateIdealBodyFatPercentage(value: String) = _state.update { it.copy(idealBodyFatPercentage = value, validationError = null) }

    fun nextStep(): Boolean {
        if (!validateCurrentStep()) return false
        if (_state.value.currentStep < _state.value.totalSteps - 1) {
            _state.update { it.copy(currentStep = it.currentStep + 1) }
        }
        return true
    }

    fun previousStep() {
        if (_state.value.currentStep > 0) {
            _state.update { it.copy(currentStep = it.currentStep - 1, validationError = null) }
        }
    }

    private fun validateCurrentStep(): Boolean {
        val s = _state.value
        when (s.currentStep) {
            0 -> {
                if (s.nickname.isBlank()) {
                    _state.update { it.copy(validationError = "ニックネームを入力してください") }
                    return false
                }
                val age = s.age.toIntOrNull()
                if (age == null || age < 10 || age > 120) {
                    _state.update { it.copy(validationError = "年齢は10〜120歳で入力してください") }
                    return false
                }
            }
            1 -> {
                val height = s.height.toFloatOrNull()
                if (height == null || height < 100 || height > 250) {
                    _state.update { it.copy(validationError = "身長は100〜250cmで入力してください") }
                    return false
                }
                val weight = s.weight.toFloatOrNull()
                if (weight == null || weight < 30 || weight > 300) {
                    _state.update { it.copy(validationError = "体重は30〜300kgで入力してください") }
                    return false
                }
                val bf = s.bodyFatPercentage.toFloatOrNull()
                if (bf == null || bf < 3 || bf > 50) {
                    _state.update { it.copy(validationError = "体脂肪率は3〜50%で入力してください") }
                    return false
                }
            }
        }
        return true
    }

    fun saveProfile(userId: String, onComplete: () -> Unit) {
        if (!validateCurrentStep()) return

        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val s = _state.value

                // 一時的なプロファイルを作成してTDEE計算
                val tempProfile = UserProfile(
                    age = s.age.toIntOrNull() ?: 25,
                    gender = s.gender,
                    height = s.height.toFloatOrNull() ?: 170f,
                    weight = s.weight.toFloatOrNull() ?: 70f,
                    activityLevel = s.activityLevel
                )
                val tdee = tempProfile.calculateTDEE()
                val targetCalories = tdee?.let { (it + s.calorieAdjustment).toInt() }

                // PFC比率からグラム数を計算
                // タンパク質: 4kcal/g, 脂質: 9kcal/g, 炭水化物: 4kcal/g
                val calcTargetProtein = targetCalories?.let { cal ->
                    (cal * s.proteinRatio / 100f / 4f)
                }
                val calcTargetFat = targetCalories?.let { cal ->
                    (cal * s.fatRatio / 100f / 9f)
                }
                val calcTargetCarbs = targetCalories?.let { cal ->
                    (cal * s.carbRatio / 100f / 4f)
                }

                val profile = UserProfile(
                    nickname = s.nickname,
                    age = s.age.toIntOrNull() ?: 25,
                    gender = s.gender,
                    style = s.style,
                    height = s.height.toFloatOrNull() ?: 170f,
                    weight = s.weight.toFloatOrNull() ?: 70f,
                    bodyFatPercentage = s.bodyFatPercentage.toFloatOrNull() ?: 15f,
                    targetWeight = s.targetWeight.toFloatOrNull(),
                    activityLevel = s.activityLevel,
                    goal = s.goal,
                    targetCalories = targetCalories,
                    targetProtein = calcTargetProtein,
                    targetFat = calcTargetFat,
                    targetCarbs = calcTargetCarbs,
                    calorieAdjustment = s.calorieAdjustment,
                    mealsPerDay = s.mealsPerDay,
                    proteinRatioPercent = s.proteinRatio,
                    fatRatioPercent = s.fatRatio,
                    carbRatioPercent = s.carbRatio,
                    idealWeight = s.idealWeight.toFloatOrNull(),
                    idealBodyFatPercentage = s.idealBodyFatPercentage.toFloatOrNull(),
                    onboardingCompleted = true
                )
                userRepository.updateProfile(userId, profile)
                    .onSuccess {
                        _state.update { it.copy(isLoading = false) }
                        onComplete()
                    }
                    .onFailure { e ->
                        _state.update { it.copy(isLoading = false, error = e.message ?: "プロフィールの保存に失敗しました") }
                    }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = e.message ?: "プロフィールの保存に失敗しました") }
            }
        }
    }

    fun clearError() = _state.update { it.copy(error = null, validationError = null) }
}

/**
 * プロフィール設定画面
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileSetupScreen(
    userId: String,
    viewModel: ProfileSetupViewModel = koinViewModel(),
    onComplete: () -> Unit
) {
    val state by viewModel.state.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(state.error) {
        state.error?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearError()
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text("プロフィール設定") },
                navigationIcon = {
                    if (state.currentStep > 0) {
                        IconButton(onClick = { viewModel.previousStep() }) {
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
                        0 -> Step0BasicInfo(state, viewModel)
                        1 -> Step1BodyComposition(state, viewModel)
                        2 -> Step2GoalsActivity(state, viewModel)
                        3 -> Step3IdealGoals(state, viewModel)
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
                        onClick = { viewModel.previousStep() },
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
                            viewModel.saveProfile(userId, onComplete)
                        } else {
                            viewModel.nextStep()
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
private fun Step0BasicInfo(state: ProfileSetupState, viewModel: ProfileSetupViewModel) {
    Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
        Text("基本情報を入力", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Text("あなたに最適なアドバイスを提供するために必要な情報です", color = MaterialTheme.colorScheme.onSurfaceVariant)

        OutlinedTextField(
            value = state.nickname,
            onValueChange = viewModel::updateNickname,
            label = { Text("ニックネーム") },
            placeholder = { Text("アプリ内での表示名") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp)
        )

        OutlinedTextField(
            value = state.age,
            onValueChange = viewModel::updateAge,
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
                    onClick = { viewModel.updateGender(gender) },
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
                        .clickable { viewModel.updateStyle(style) }
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
private fun Step1BodyComposition(state: ProfileSetupState, viewModel: ProfileSetupViewModel) {
    Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
        Text("現在の体組成", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Text("正確な栄養目標を計算するために必要です", color = MaterialTheme.colorScheme.onSurfaceVariant)

        OutlinedTextField(
            value = state.height,
            onValueChange = viewModel::updateHeight,
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
                onValueChange = viewModel::updateWeight,
                label = { Text("現在体重") },
                suffix = { Text("kg") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                singleLine = true,
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(12.dp)
            )

            OutlinedTextField(
                value = state.targetWeight,
                onValueChange = viewModel::updateTargetWeight,
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
            onValueChange = viewModel::updateBodyFatPercentage,
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
                    Text("${String.format("%.1f", lbm)} kg", fontWeight = FontWeight.Bold, color = Primary)
                }
            }
        }
    }
}

// Step 2: 目標・活動レベル
@Composable
private fun Step2GoalsActivity(state: ProfileSetupState, viewModel: ProfileSetupViewModel) {
    Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
        Text("目標と活動レベル", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)

        Text("日常活動（運動以外）", fontWeight = FontWeight.Medium)
        Text("※運動日はルーティン設定に応じて自動で追加されます", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            ActivityLevel.entries.forEach { level ->
                SelectableCard(
                    selected = state.activityLevel == level,
                    onClick = { viewModel.updateActivityLevel(level) },
                    label = level.displayName
                )
            }
        }

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
                    onClick = { viewModel.updateGoal(goal) },
                    label = info.first,
                    subtitle = info.second
                )
            }
        }

        // 1日の食事回数
        Spacer(modifier = Modifier.height(8.dp))
        Text("1日の食事回数", fontWeight = FontWeight.Medium)
        Text("GL管理と栄養配分に使用されます", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            (2..8).forEach { count ->
                FilterChip(
                    onClick = { viewModel.updateMealsPerDay(count) },
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
        Text("タンパク質・脂質・炭水化物の比率", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)

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
            onValueChange = { viewModel.updateProteinRatio(it.toInt()) },
            valueRange = 15f..50f,
            colors = SliderDefaults.colors(thumbColor = ScoreProtein, activeTrackColor = ScoreProtein)
        )

        Text("脂質: ${state.fatRatio}%", style = MaterialTheme.typography.labelMedium)
        Slider(
            value = state.fatRatio.toFloat(),
            onValueChange = { viewModel.updateFatRatio(it.toInt()) },
            valueRange = 15f..40f,
            colors = SliderDefaults.colors(thumbColor = ScoreFat, activeTrackColor = ScoreFat)
        )
    }
}

// Step 3: 理想目標
@Composable
private fun Step3IdealGoals(state: ProfileSetupState, viewModel: ProfileSetupViewModel) {
    Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
        Text("理想の目標", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Text("達成したい理想の体型を設定しましょう", color = MaterialTheme.colorScheme.onSurfaceVariant)

        OutlinedTextField(
            value = state.idealWeight,
            onValueChange = viewModel::updateIdealWeight,
            label = { Text("理想の体重") },
            suffix = { Text("kg") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp)
        )

        OutlinedTextField(
            value = state.idealBodyFatPercentage,
            onValueChange = viewModel::updateIdealBodyFatPercentage,
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
                                "${if (diff >= 0) "+" else ""}${String.format("%.1f", diff)} kg",
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Column {
                            Text("体脂肪率変化", style = MaterialTheme.typography.labelSmall)
                            val diff = idealBf - currentBf
                            Text(
                                "${if (diff >= 0) "+" else ""}${String.format("%.1f", diff)} %",
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Column {
                            Text("理想LBM", style = MaterialTheme.typography.labelSmall)
                            val idealLbm = idealWeight * (1 - idealBf / 100)
                            Text("${String.format("%.1f", idealLbm)} kg", fontWeight = FontWeight.Bold)
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
