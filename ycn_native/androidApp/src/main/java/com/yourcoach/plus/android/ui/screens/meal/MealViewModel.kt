package com.yourcoach.plus.android.ui.screens.meal

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseAuth
import com.yourcoach.plus.shared.data.database.FoodDatabase
import com.yourcoach.plus.shared.domain.model.CustomFood
import com.yourcoach.plus.shared.domain.model.Meal
import com.yourcoach.plus.shared.domain.model.MealItem
import com.yourcoach.plus.shared.domain.model.MealTemplate
import com.yourcoach.plus.shared.domain.model.MealType
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.CustomFoodRepository
import com.yourcoach.plus.shared.domain.repository.MealRepository
import com.yourcoach.plus.shared.domain.repository.UserRepository
import com.yourcoach.plus.shared.util.DateUtil
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.UUID

data class MealUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val mealType: MealType = MealType.BREAKFAST,
    val mealName: String = "",              // 食事名
    val items: List<MealItem> = emptyList(),
    val note: String = "",
    val imageUrl: String? = null,
    val templates: List<MealTemplate> = emptyList(),
    val showTemplates: Boolean = false,
    val isSaving: Boolean = false,
    val savedSuccessfully: Boolean = false,
    val isSavingTemplate: Boolean = false,
    val templateSavedSuccessfully: Boolean = false,
    // 入力元フラグ
    val isFromTemplate: Boolean = false,
    val isFromRoutine: Boolean = false,
    val isFromPrediction: Boolean = false,
    val isPostWorkout: Boolean = false,
    // 合計値
    val totalCalories: Int = 0,
    val totalProtein: Float = 0f,
    val totalCarbs: Float = 0f,
    val totalFat: Float = 0f,
    val totalFiber: Float = 0f,
    val totalGL: Float = 0f,
    // 食事番号システム
    val selectedMealNumber: Int = 1,
    val mealsPerDay: Int = 5,
    val recordedMealsToday: Int = 0,
    // カスタム食品
    val customFoods: List<CustomFood> = emptyList()
)

class MealViewModel(
    private val mealRepository: MealRepository,
    private val authRepository: AuthRepository,
    private val userRepository: UserRepository,
    private val customFoodRepository: CustomFoodRepository,
    private val badgeRepository: com.yourcoach.plus.shared.domain.repository.BadgeRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(MealUiState())

    private val currentUserId: String?
        get() = FirebaseAuth.getInstance().currentUser?.uid
    val uiState: StateFlow<MealUiState> = _uiState.asStateFlow()

    init {
        loadMealSettings()
        loadCustomFoods()
        loadTemplates()
    }

    /**
     * 食事設定を読み込む（mealsPerDayと今日の記録数）
     */
    private fun loadMealSettings() {
        viewModelScope.launch {
            val userId = authRepository.getCurrentUserId() ?: return@launch

            // ユーザープロファイルから食事回数を取得
            val userResult = userRepository.getUser(userId)
            val mealsPerDay = userResult.getOrNull()?.profile?.mealsPerDay ?: 5

            // 今日の食事記録数を取得
            val today = java.time.LocalDate.now().toString()
            val mealsResult = mealRepository.getMealsForDate(userId, today)
            val recordedMeals = mealsResult.getOrNull()?.size ?: 0

            // 次の食事番号を自動設定（記録数+1、ただし設定上限まで）
            val nextMealNumber = (recordedMeals + 1).coerceIn(1, mealsPerDay)

            _uiState.update {
                it.copy(
                    mealsPerDay = mealsPerDay,
                    recordedMealsToday = recordedMeals,
                    selectedMealNumber = nextMealNumber
                )
            }
        }
    }

    /**
     * カスタム食品を読み込む
     */
    private fun loadCustomFoods() {
        viewModelScope.launch {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            customFoodRepository.getCustomFoods(userId)
                .onSuccess { foods ->
                    _uiState.update { it.copy(customFoods = foods) }
                }
        }
    }

    /**
     * カスタム食品を保存
     */
    fun saveCustomFood(
        name: String,
        calories: Int,
        protein: Float,
        carbs: Float,
        fat: Float,
        fiber: Float = 0f
    ) {
        val userId = currentUserId ?: return

        viewModelScope.launch {
            // 既に同名のカスタム食品が存在するかチェック
            val existing = customFoodRepository.getCustomFoodByName(userId, name).getOrNull()
            if (existing != null) {
                // 既存の場合は使用回数を増やす
                customFoodRepository.incrementUsage(userId, existing.id)
            } else {
                // 新規作成
                val customFood = CustomFood(
                    id = "",
                    userId = userId,
                    name = name,
                    calories = calories,
                    protein = protein,
                    carbs = carbs,
                    fat = fat,
                    fiber = fiber,
                    createdAt = System.currentTimeMillis()
                )
                customFoodRepository.saveCustomFood(customFood)
            }
            // 再読み込み
            loadCustomFoods()
        }
    }

    /**
     * 食品を検索（内蔵DB + カスタム食品）
     */
    fun searchFoods(query: String): List<SearchResultFood> {
        val userId = currentUserId ?: return emptyList()

        // 内蔵DBから検索
        val builtInFoods = FoodDatabase.searchFoods(query).map { food ->
            SearchResultFood(
                name = food.name,
                calories = food.calories.toInt(),
                protein = food.protein,
                carbs = food.carbs,
                fat = food.fat,
                fiber = food.fiber,
                gi = food.gi ?: 0,
                isCustom = false
            )
        }

        // カスタム食品から検索
        val customFoods = _uiState.value.customFoods
            .filter { it.name.contains(query, ignoreCase = true) }
            .map { food ->
                SearchResultFood(
                    name = food.name,
                    calories = food.calories,
                    protein = food.protein,
                    carbs = food.carbs,
                    fat = food.fat,
                    fiber = food.fiber,
                    gi = food.gi,
                    isCustom = true,
                    customFoodId = food.id
                )
            }

        // カスタム食品を先頭に、使用頻度順
        return customFoods + builtInFoods
    }

    /**
     * 食事番号を設定
     */
    fun setMealNumber(number: Int) {
        _uiState.update { it.copy(selectedMealNumber = number) }
    }

    fun setMealType(type: String) {
        val mealType = when (type.lowercase()) {
            "breakfast" -> MealType.BREAKFAST
            "lunch" -> MealType.LUNCH
            "dinner" -> MealType.DINNER
            "snack" -> MealType.SNACK
            else -> MealType.BREAKFAST
        }
        _uiState.update { it.copy(mealType = mealType) }
        loadTemplates()
    }

    private fun loadTemplates() {
        val userId = currentUserId ?: return

        viewModelScope.launch {
            mealRepository.getMealTemplates(userId)
                .onSuccess { templates ->
                    _uiState.update { it.copy(templates = templates) }
                }
        }
    }

    fun setMealName(name: String) {
        _uiState.update { it.copy(mealName = name) }
    }

    fun setPostWorkout(isPostWorkout: Boolean) {
        _uiState.update { it.copy(isPostWorkout = isPostWorkout) }
    }

    fun addItem(item: MealItem) {
        _uiState.update { state ->
            val newItems = state.items + item
            updateTotals(state, newItems)
        }
    }

    fun removeItem(index: Int) {
        _uiState.update { state ->
            val newItems = state.items.toMutableList().apply { removeAt(index) }
            updateTotals(state, newItems)
        }
    }

    fun updateItem(index: Int, item: MealItem) {
        _uiState.update { state ->
            val newItems = state.items.toMutableList().apply { set(index, item) }
            updateTotals(state, newItems)
        }
    }

    private fun updateTotals(state: MealUiState, items: List<MealItem>): MealUiState {
        // MealItemの値は既に実際の量に対してスケール済み
        // （AddMealScreen等でratioを適用済み）
        val totalGL = items.sumOf { item ->
            val carbs = item.carbs.toDouble()
            if (item.gi > 0 && carbs > 0) (item.gi * carbs / 100) else 0.0
        }.toFloat()

        return state.copy(
            items = items,
            totalCalories = items.sumOf { it.calories },
            totalProtein = items.sumOf { it.protein.toDouble() }.toFloat(),
            totalCarbs = items.sumOf { it.carbs.toDouble() }.toFloat(),
            totalFat = items.sumOf { it.fat.toDouble() }.toFloat(),
            totalFiber = items.sumOf { it.fiber.toDouble() }.toFloat(),
            totalGL = totalGL
        )
    }

    private fun isCountUnit(unit: String): Boolean {
        return listOf("本", "個", "杯", "枚", "錠", "粒", "切れ", "尾", "匹").any { unit.contains(it) }
    }

    /**
     * 食品アイテムの量を変更して栄養素を再計算
     */
    fun updateItemQuantity(index: Int, newAmount: Float) {
        _uiState.update { state ->
            val oldItem = state.items.getOrNull(index) ?: return@update state
            val oldAmount = oldItem.amount
            val ratio = newAmount / oldAmount

            val updatedItem = oldItem.copy(
                amount = newAmount,
                calories = (oldItem.calories * ratio).toInt(),
                protein = oldItem.protein * ratio,
                carbs = oldItem.carbs * ratio,
                fat = oldItem.fat * ratio,
                fiber = oldItem.fiber * ratio,
                sugar = oldItem.sugar * ratio,
                // 脂肪酸
                saturatedFat = oldItem.saturatedFat * ratio,
                monounsaturatedFat = oldItem.monounsaturatedFat * ratio,
                polyunsaturatedFat = oldItem.polyunsaturatedFat * ratio,
                // ビタミン・ミネラル（Map内の値も更新）
                vitamins = oldItem.vitamins.mapValues { it.value * ratio },
                minerals = oldItem.minerals.mapValues { it.value * ratio }
                // gi は品質指標なので量に比例しない
            )

            val newItems = state.items.toMutableList().apply { set(index, updatedItem) }
            updateTotals(state, newItems)
        }
    }

    fun updateNote(note: String) {
        _uiState.update { it.copy(note = note) }
    }

    fun setImageUrl(url: String?) {
        _uiState.update { it.copy(imageUrl = url) }
    }

    fun toggleTemplates() {
        _uiState.update { it.copy(showTemplates = !it.showTemplates) }
    }

    fun applyTemplate(template: MealTemplate) {
        _uiState.update { state ->
            // GL値を計算（MealItemの値は既にスケール済み）
            val totalGL = template.items.sumOf { item ->
                val carbs = item.carbs.toDouble()
                if (item.gi > 0 && carbs > 0) (item.gi * carbs / 100) else 0.0
            }.toFloat()

            state.copy(
                mealName = template.name,
                items = template.items,
                totalCalories = template.totalCalories,
                totalProtein = template.totalProtein,
                totalCarbs = template.totalCarbs,
                totalFat = template.totalFat,
                totalGL = totalGL,
                isFromTemplate = true,
                showTemplates = false
            )
        }
    }

    /**
     * AI認識された食品を追加
     */
    fun addRecognizedFoods(foods: List<RecognizedFood>) {
        _uiState.update { state ->
            val newItems = foods.map { food ->
                // RecognizedFoodをMealItemに変換
                val amount = food.servingSize.replace("g", "").toFloatOrNull() ?: 100f
                val ratio = amount / 100f
                // FoodDatabaseから詳細栄養データを取得
                val foodData = FoodDatabase.getFoodByName(food.name)
                val gi = foodData?.gi ?: 0
                val sugar = (foodData?.sugar ?: 0f) * ratio
                val fiber = (foodData?.fiber ?: 0f) * ratio
                val solubleFiber = (foodData?.solubleFiber ?: 0f) * ratio
                val insolubleFiber = (foodData?.insolubleFiber ?: 0f) * ratio
                val saturatedFat = (foodData?.saturatedFat ?: 0f) * ratio
                val monounsaturatedFat = (foodData?.monounsaturatedFat ?: 0f) * ratio
                val polyunsaturatedFat = (foodData?.polyunsaturatedFat ?: 0f) * ratio
                MealItem(
                    name = food.name,
                    amount = amount,
                    unit = "g",
                    calories = MealItem.calculateCalories(food.protein, food.fat, food.carbs),
                    protein = food.protein,
                    carbs = food.carbs,
                    fat = food.fat,
                    fiber = fiber,
                    solubleFiber = solubleFiber,
                    insolubleFiber = insolubleFiber,
                    sugar = sugar,
                    gi = gi,
                    saturatedFat = saturatedFat,
                    monounsaturatedFat = monounsaturatedFat,
                    polyunsaturatedFat = polyunsaturatedFat,
                    isAiRecognized = true
                )
            }
            val allItems = state.items + newItems
            updateTotals(state.copy(isFromPrediction = true), allItems)
        }
    }

    fun saveMeal(onSuccess: () -> Unit) {
        val state = _uiState.value
        val userId = currentUserId

        if (userId == null) {
            _uiState.update { it.copy(error = "ログインが必要です") }
            return
        }

        if (state.items.isEmpty()) {
            _uiState.update { it.copy(error = "食品を追加してください") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true) }

            try {
                // 食事名を生成（未入力の場合は食事番号から生成）
                val mealName = state.mealName.takeIf { it.isNotBlank() } ?: "食事${state.selectedMealNumber}"

                // 現在時刻を取得
                val now = java.util.Calendar.getInstance()
                val timeString = String.format("%02d:%02d", now.get(java.util.Calendar.HOUR_OF_DAY), now.get(java.util.Calendar.MINUTE))

                val meal = Meal(
                    id = UUID.randomUUID().toString(),
                    userId = userId,
                    name = mealName,
                    type = state.mealType,
                    time = timeString,
                    items = state.items,
                    totalCalories = state.totalCalories,
                    totalProtein = state.totalProtein,
                    totalCarbs = state.totalCarbs,
                    totalFat = state.totalFat,
                    totalFiber = state.totalFiber,
                    totalGL = state.totalGL,
                    imageUrl = state.imageUrl,
                    note = state.note.takeIf { it.isNotBlank() },
                    isPredicted = state.isFromPrediction,
                    isTemplate = state.isFromTemplate,
                    isRoutine = state.isFromRoutine,
                    isPostWorkout = state.isPostWorkout,
                    timestamp = DateUtil.currentTimestamp(),
                    createdAt = DateUtil.currentTimestamp()
                )

                mealRepository.addMeal(meal)
                    .onSuccess {
                        _uiState.update { it.copy(isSaving = false, savedSuccessfully = true) }
                        // バッジ統計更新＆チェック
                        checkBadges()
                        onSuccess()
                    }
                    .onFailure { e ->
                        _uiState.update {
                            it.copy(
                                isSaving = false,
                                error = e.message ?: "保存に失敗しました"
                            )
                        }
                    }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        error = e.message ?: "保存に失敗しました"
                    )
                }
            }
        }
    }

    /**
     * バッジ統計更新（カウンターのみ）
     * NonCancellableで実行し、画面遷移でもキャンセルされないようにする
     * バッジチェック＆付与はDashboardViewModelで行う
     */
    private fun checkBadges() {
        viewModelScope.launch(kotlinx.coroutines.NonCancellable) {
            badgeRepository.updateBadgeStats("meal_recorded")
            // checkAndAwardBadgesはDashboardViewModelで呼ぶ（モーダル表示のため）
        }
    }

    fun saveAsTemplate(name: String) {
        val userId = currentUserId ?: return

        // アイテムが空の場合はエラー
        if (_uiState.value.items.isEmpty()) {
            _uiState.update { it.copy(error = "食品を追加してからテンプレートを作成してください") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSavingTemplate = true, templateSavedSuccessfully = false) }

            val state = _uiState.value
            val template = MealTemplate(
                id = UUID.randomUUID().toString(),
                userId = userId,
                name = name,
                items = state.items,
                totalCalories = state.totalCalories,
                totalProtein = state.totalProtein,
                totalCarbs = state.totalCarbs,
                totalFat = state.totalFat,
                createdAt = DateUtil.currentTimestamp()
            )

            mealRepository.saveMealTemplate(template)
                .onSuccess {
                    _uiState.update {
                        it.copy(
                            isSavingTemplate = false,
                            templateSavedSuccessfully = true
                        )
                    }
                    // テンプレート一覧を再読み込み
                    loadTemplates()
                }
                .onFailure { e ->
                    _uiState.update {
                        it.copy(
                            isSavingTemplate = false,
                            error = "テンプレートの保存に失敗しました: ${e.message}"
                        )
                    }
                }
        }
    }

    fun clearTemplateSavedFlag() {
        _uiState.update { it.copy(templateSavedSuccessfully = false) }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}

/**
 * 検索結果の食品
 */
data class SearchResultFood(
    val name: String,
    val calories: Int,       // 100gあたり
    val protein: Float,      // 100gあたり
    val carbs: Float,        // 100gあたり
    val fat: Float,          // 100gあたり
    val fiber: Float = 0f,
    val gi: Int = 0,
    val isCustom: Boolean = false,
    val customFoodId: String? = null
)
