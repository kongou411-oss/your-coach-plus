package com.yourcoach.plus.shared.ui.screens.settings

import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.koin.koinScreenModel
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.yourcoach.plus.shared.domain.model.ActivityLevel
import com.yourcoach.plus.shared.domain.model.FitnessGoal
import com.yourcoach.plus.shared.domain.model.Gender
import com.yourcoach.plus.shared.ui.theme.*
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Info

class ProfileEditScreen : Screen {

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    override fun Content() {
        val screenModel = koinScreenModel<ProfileEditScreenModel>()
        val uiState by screenModel.uiState.collectAsState()
        val navigator = LocalNavigator.currentOrThrow
        val snackbarHostState = remember { SnackbarHostState() }
        val focusManager = LocalFocusManager.current

        LaunchedEffect(uiState.saveSuccess) {
            if (uiState.saveSuccess) {
                snackbarHostState.showSnackbar("プロフィールを保存しました")
                navigator.pop()
            }
        }

        LaunchedEffect(uiState.error) {
            uiState.error?.let {
                snackbarHostState.showSnackbar(it)
                screenModel.clearError()
            }
        }

        if (uiState.isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            return
        }

        val bmr = screenModel.calculateBmr()
        val tdee = screenModel.calculateTdee()
        val targetCalories = screenModel.calculateTargetCalories()

        Scaffold(
            snackbarHost = { SnackbarHost(snackbarHostState) },
            topBar = {
                TopAppBar(
                    title = { Text("プロフィール設定") },
                    navigationIcon = {
                        IconButton(onClick = { navigator.pop() }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, "戻る")
                        }
                    },
                    actions = {
                        TextButton(
                            onClick = { screenModel.saveProfile() },
                            enabled = !uiState.isSaving
                        ) {
                            if (uiState.isSaving) {
                                CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
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
                    .padding(16.dp)
                    .pointerInput(Unit) {
                        detectTapGestures(onTap = { focusManager.clearFocus() })
                    },
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // 基本情報
                item {
                    ProfileSectionCard(title = "基本情報") {
                        OutlinedTextField(
                            value = uiState.nickname,
                            onValueChange = { screenModel.updateNickname(it) },
                            label = { Text("ニックネーム") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        OutlinedTextField(
                            value = uiState.age,
                            onValueChange = { screenModel.updateAge(it) },
                            label = { Text("年齢") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Done),
                            keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() }),
                            shape = RoundedCornerShape(12.dp),
                            suffix = { Text("歳") }
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text("性別", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Gender.entries.forEach { g ->
                                FilterChip(
                                    onClick = { screenModel.updateGender(g) },
                                    label = {
                                        Text(when (g) {
                                            Gender.MALE -> "男性"
                                            Gender.FEMALE -> "女性"
                                            Gender.OTHER -> "その他"
                                        })
                                    },
                                    selected = uiState.gender == g,
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }
                    }
                }

                // 体組成
                item {
                    ProfileSectionCard(title = "体組成") {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            OutlinedTextField(
                                value = uiState.height,
                                onValueChange = { screenModel.updateHeight(it) },
                                label = { Text("身長") },
                                modifier = Modifier.weight(1f),
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal, imeAction = ImeAction.Done),
                                keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() }),
                                shape = RoundedCornerShape(12.dp),
                                suffix = { Text("cm") }
                            )
                            OutlinedTextField(
                                value = uiState.weight,
                                onValueChange = { screenModel.updateWeight(it) },
                                label = { Text("体重") },
                                modifier = Modifier.weight(1f),
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal, imeAction = ImeAction.Done),
                                keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() }),
                                shape = RoundedCornerShape(12.dp),
                                suffix = { Text("kg") }
                            )
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            OutlinedTextField(
                                value = uiState.bodyFatPercentage,
                                onValueChange = { screenModel.updateBodyFatPercentage(it) },
                                label = { Text("体脂肪率") },
                                modifier = Modifier.weight(1f),
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal, imeAction = ImeAction.Done),
                                keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() }),
                                shape = RoundedCornerShape(12.dp),
                                suffix = { Text("%") }
                            )
                        }

                        if (bmr != null && tdee != null) {
                            Spacer(modifier = Modifier.height(16.dp))
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = Primary.copy(alpha = 0.1f)),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                                    horizontalArrangement = Arrangement.SpaceEvenly
                                ) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text("${bmr.toInt()}", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Primary)
                                        Text("BMR (kcal)", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text("${tdee.toInt()}", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Secondary)
                                        Text("TDEE (kcal)", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }
                            }
                        }
                    }
                }

                // 目標・活動レベル
                item {
                    ProfileSectionCard(title = "目標・活動レベル") {
                        Text("フィットネス目標", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            FilterChip(onClick = { screenModel.updateGoal(FitnessGoal.LOSE_WEIGHT) }, label = { Text("ダイエット") }, selected = uiState.goal == FitnessGoal.LOSE_WEIGHT, modifier = Modifier.fillMaxWidth())
                            FilterChip(onClick = { screenModel.updateGoal(FitnessGoal.MAINTAIN) }, label = { Text("メンテナンス・リコンプ") }, selected = uiState.goal == FitnessGoal.MAINTAIN, modifier = Modifier.fillMaxWidth())
                            FilterChip(onClick = { screenModel.updateGoal(FitnessGoal.GAIN_MUSCLE) }, label = { Text("バルクアップ") }, selected = uiState.goal == FitnessGoal.GAIN_MUSCLE, modifier = Modifier.fillMaxWidth())
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text("1日の食事回数", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            (2..8).forEach { count ->
                                FilterChip(
                                    onClick = { screenModel.updateMealsPerDay(count) },
                                    label = { Text("$count") },
                                    selected = uiState.mealsPerDay == count,
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        Text("日常活動（運動以外）", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            ActivityLevel.entries.forEach { level ->
                                FilterChip(
                                    onClick = { screenModel.updateActivityLevel(level) },
                                    label = { Text(level.displayName) },
                                    selected = uiState.activityLevel == level,
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        Text(
                            "カロリー調整: ${if (uiState.calorieAdjustment >= 0) "+" else ""}${uiState.calorieAdjustment} kcal",
                            style = MaterialTheme.typography.bodyMedium
                        )
                        Slider(
                            value = uiState.calorieAdjustment.toFloat(),
                            onValueChange = { screenModel.updateCalorieAdjustment(it.toInt()) },
                            valueRange = -500f..500f,
                            steps = 19,
                            modifier = Modifier.fillMaxWidth()
                        )
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
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
                                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Text("$cal", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = AccentOrange)
                                    Text("目標カロリー (kcal/日)", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }
                }

                // PFCバランス
                item {
                    ProfileSectionCard(title = "PFCバランス") {
                        PfcSlider("P", ScoreProtein, uiState.proteinRatio, 10f..50f) { screenModel.updateProteinRatio(it) }
                        PfcSlider("F", ScoreFat, uiState.fatRatio, 10f..50f) { screenModel.updateFatRatio(it) }
                        PfcSlider("C", ScoreCarbs, uiState.carbRatio, 10f..60f) { screenModel.updateCarbRatio(it) }

                        val total = uiState.proteinRatio + uiState.fatRatio + uiState.carbRatio
                        Text(
                            "合計: $total% ${if (total != 100) "(100%に調整してください)" else ""}",
                            style = MaterialTheme.typography.labelSmall,
                            color = if (total == 100) Color(0xFF4CAF50) else Color.Red,
                            modifier = Modifier.padding(top = 8.dp)
                        )

                        targetCalories?.let { cal ->
                            Spacer(modifier = Modifier.height(12.dp))
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                                val pGrams = (cal * uiState.proteinRatio / 100 / 4)
                                val fGrams = (cal * uiState.fatRatio / 100 / 9)
                                val cGrams = (cal * uiState.carbRatio / 100 / 4)
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("${pGrams}g", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = ScoreProtein)
                                    Text("タンパク質", style = MaterialTheme.typography.labelSmall)
                                }
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("${fGrams}g", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = ScoreFat)
                                    Text("脂質", style = MaterialTheme.typography.labelSmall)
                                }
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("${cGrams}g", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = ScoreCarbs)
                                    Text("炭水化物", style = MaterialTheme.typography.labelSmall)
                                }
                            }
                        }
                    }
                }

                // 食費設定
                item {
                    ProfileSectionCard(title = "食費設定") {
                        Text("食費予算", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf(1 to "節約", 2 to "標準").forEach { (tier, label) ->
                                FilterChip(
                                    onClick = { screenModel.updateBudgetTier(tier) },
                                    label = { Text(label) },
                                    selected = uiState.budgetTier == tier,
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }
                        Text(
                            when (uiState.budgetTier) {
                                1 -> "鶏むね肉中心（コスパ重視）"
                                else -> "部位に合わせた食材（牛赤身, サバ, 鮭など）"
                            },
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    }
                }

                // 理想体型
                item {
                    ProfileSectionCard(title = "理想体型") {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            OutlinedTextField(
                                value = uiState.idealWeight,
                                onValueChange = { screenModel.updateIdealWeight(it) },
                                label = { Text("理想体重") },
                                modifier = Modifier.weight(1f),
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal, imeAction = ImeAction.Done),
                                keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() }),
                                shape = RoundedCornerShape(12.dp),
                                suffix = { Text("kg") }
                            )
                            OutlinedTextField(
                                value = uiState.idealBodyFatPercentage,
                                onValueChange = { screenModel.updateIdealBodyFatPercentage(it) },
                                label = { Text("理想体脂肪率") },
                                modifier = Modifier.weight(1f),
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal, imeAction = ImeAction.Done),
                                keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() }),
                                shape = RoundedCornerShape(12.dp),
                                suffix = { Text("%") }
                            )
                        }
                    }
                }

                // 食材好み
                item {
                    ProfileSectionCard(title = "食材好み") {
                        TagInputField(
                            label = "優先タンパク源",
                            items = uiState.preferredProteinSources,
                            suggestions = listOf("鶏むね肉", "鮭", "牛赤身", "卵", "ホエイプロテイン", "ささみ", "マグロ", "タラ"),
                            onAdd = { screenModel.addPreferredProteinSource(it) },
                            onRemove = { screenModel.removePreferredProteinSource(it) },
                            focusManager = focusManager
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        TagInputField(
                            label = "優先炭水化物源",
                            items = uiState.preferredCarbSources,
                            suggestions = listOf("白米", "玄米", "オートミール", "さつまいも", "もち", "バナナ"),
                            onAdd = { screenModel.addPreferredCarbSource(it) },
                            onRemove = { screenModel.removePreferredCarbSource(it) },
                            focusManager = focusManager
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        TagInputField(
                            label = "優先脂質源",
                            items = uiState.preferredFatSources,
                            suggestions = listOf("オリーブオイル", "アボカド", "MCTオイル", "ナッツ", "アーモンド", "くるみ"),
                            onAdd = { screenModel.addPreferredFatSource(it) },
                            onRemove = { screenModel.removePreferredFatSource(it) },
                            focusManager = focusManager
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        TagInputField(
                            label = "避けたい食材",
                            items = uiState.avoidFoods,
                            suggestions = emptyList(),
                            onAdd = { screenModel.addAvoidFood(it) },
                            onRemove = { screenModel.removeAvoidFood(it) },
                            focusManager = focusManager
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        TagInputField(
                            label = "アレルギー",
                            items = uiState.allergies,
                            suggestions = listOf("卵", "乳", "小麦", "そば", "えび", "かに", "落花生", "大豆"),
                            onAdd = { screenModel.addAllergy(it) },
                            onRemove = { screenModel.removeAllergy(it) },
                            focusManager = focusManager
                        )
                    }
                }

                // 学習データ
                item {
                    ProfileSectionCard(title = "学習データ") {
                        OutlinedTextField(
                            value = uiState.favoriteFoods,
                            onValueChange = { screenModel.updateFavoriteFoods(it) },
                            label = { Text("よく食べる食材") },
                            supportingText = { Text("カンマ区切り") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        OutlinedTextField(
                            value = uiState.ngFoods,
                            onValueChange = { screenModel.updateNgFoods(it) },
                            label = { Text("NG食材") },
                            supportingText = { Text("カンマ区切り") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp)
                        )
                    }
                }

                item { Spacer(modifier = Modifier.height(80.dp)) }
            }
        }
    }
}

@Composable
private fun PfcSlider(label: String, color: Color, value: Int, range: ClosedFloatingPointRange<Float>, onValueChange: (Int) -> Unit) {
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(label, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = color, modifier = Modifier.width(24.dp))
        Slider(value = value.toFloat(), onValueChange = { onValueChange(it.toInt()) }, valueRange = range, modifier = Modifier.weight(1f))
        Text("$value%", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.width(48.dp))
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun TagInputField(
    label: String,
    items: List<String>,
    suggestions: List<String>,
    onAdd: (String) -> Unit,
    onRemove: (String) -> Unit,
    focusManager: androidx.compose.ui.focus.FocusManager
) {
    var inputText by remember { mutableStateOf("") }

    Column {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(modifier = Modifier.height(4.dp))

        // 選択済みチップ
        if (items.isNotEmpty()) {
            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                items.forEach { item ->
                    InputChip(
                        onClick = { onRemove(item) },
                        label = { Text(item, style = MaterialTheme.typography.labelSmall) },
                        selected = true,
                        trailingIcon = {
                            Icon(Icons.Default.Close, contentDescription = "削除", modifier = Modifier.size(16.dp))
                        }
                    )
                }
            }
            Spacer(modifier = Modifier.height(4.dp))
        }

        // 候補チップ
        val remainingSuggestions = suggestions.filter { it !in items }
        if (remainingSuggestions.isNotEmpty()) {
            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                remainingSuggestions.forEach { suggestion ->
                    SuggestionChip(
                        onClick = { onAdd(suggestion) },
                        label = { Text(suggestion, style = MaterialTheme.typography.labelSmall) }
                    )
                }
            }
            Spacer(modifier = Modifier.height(4.dp))
        }

        // カスタム入力
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = inputText,
                onValueChange = { inputText = it },
                placeholder = { Text("追加...", style = MaterialTheme.typography.labelSmall) },
                modifier = Modifier.weight(1f),
                singleLine = true,
                textStyle = MaterialTheme.typography.bodySmall,
                shape = RoundedCornerShape(12.dp),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                keyboardActions = KeyboardActions(onDone = {
                    if (inputText.isNotBlank()) {
                        onAdd(inputText)
                        inputText = ""
                    }
                    focusManager.clearFocus()
                })
            )
            IconButton(
                onClick = {
                    if (inputText.isNotBlank()) {
                        onAdd(inputText)
                        inputText = ""
                    }
                }
            ) {
                Icon(Icons.Default.Add, contentDescription = "追加")
            }
        }
    }
}

@Composable
private fun ProfileSectionCard(title: String, content: @Composable ColumnScope.() -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.padding(bottom = 12.dp))
            content()
        }
    }
}
