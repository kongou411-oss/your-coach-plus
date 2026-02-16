package com.yourcoach.plus.shared.ui.screens.meal

import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
import com.yourcoach.plus.shared.camera.CameraHelper
import com.yourcoach.plus.shared.data.database.FoodDatabase
import com.yourcoach.plus.shared.domain.model.CustomFood
import com.yourcoach.plus.shared.domain.model.Meal
import com.yourcoach.plus.shared.domain.model.MealItem
import com.yourcoach.plus.shared.domain.model.MealTemplate
import com.yourcoach.plus.shared.domain.model.MealType
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.BadgeRepository
import com.yourcoach.plus.shared.domain.repository.CustomFoodRepository
import com.yourcoach.plus.shared.domain.repository.MealRepository
import com.yourcoach.plus.shared.domain.repository.UserRepository
import com.yourcoach.plus.shared.domain.service.GeminiService
import com.yourcoach.plus.shared.domain.service.RecognizedFoodResult
import com.yourcoach.plus.shared.util.DateUtil
import com.yourcoach.plus.shared.util.invokeCloudFunction
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.json.*

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

/**
 * 食事追加画面の状態 (Android MealUiState と完全一致)
 */
data class AddMealUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val mealType: MealType = MealType.BREAKFAST,
    val mealName: String = "",
    val items: List<MealItem> = emptyList(),
    val note: String = "",
    val imageUrl: String? = null,
    val templates: List<MealTemplate> = emptyList(),
    val defaultTemplates: List<MealTemplate> = emptyList(),
    val showTemplates: Boolean = false,
    val showDefaultTemplates: Boolean = false,
    val isSaving: Boolean = false,
    val saveSuccess: Boolean = false,
    val isSavingTemplate: Boolean = false,
    val templateSavedSuccessfully: Boolean = false,
    val editingTemplateId: String? = null,
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
    val customFoods: List<CustomFood> = emptyList(),
    // AI認識
    val isAnalyzing: Boolean = false,
    val capturedImageBase64: String? = null,
    // 日付
    val selectedDate: String = DateUtil.todayString()
)

/**
 * 食事追加画面のScreenModel (Android MealViewModel と完全一致)
 */
class AddMealScreenModel(
    private val authRepository: AuthRepository,
    private val mealRepository: MealRepository,
    private val userRepository: UserRepository,
    private val customFoodRepository: CustomFoodRepository,
    private val badgeRepository: BadgeRepository,
    private val geminiService: GeminiService?,
    private val initialDate: String
) : ScreenModel {

    private val _uiState = MutableStateFlow(AddMealUiState(selectedDate = initialDate))
    val uiState: StateFlow<AddMealUiState> = _uiState.asStateFlow()

    private val exceptionHandler = CoroutineExceptionHandler { _, throwable ->
        println("AddMealScreenModel: ${throwable.message}")
        _uiState.update { it.copy(isLoading = false, error = "エラーが発生しました") }
    }

    // キャッシュされたuserId（searchFoodsなど同期関数用）
    private var cachedUserId: String? = null

    init {
        loadMealSettings()
        loadCustomFoods()
        loadTemplates()
    }

    /**
     * 食事設定を読み込む（mealsPerDayと今日の記録数）
     */
    private fun loadMealSettings() {
        screenModelScope.launch(exceptionHandler) {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            cachedUserId = userId

            // ユーザープロファイルから食事回数を取得
            val userResult = userRepository.getUser(userId)
            val mealsPerDay = userResult.getOrNull()?.profile?.mealsPerDay ?: 5

            // 今日の食事記録数を取得
            val today = DateUtil.todayString()
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
        screenModelScope.launch(exceptionHandler) {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            cachedUserId = userId
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
        val userId = cachedUserId ?: return

        screenModelScope.launch(exceptionHandler) {
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
                    createdAt = DateUtil.currentTimestamp()
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

    fun setMealType(type: MealType) {
        _uiState.update { it.copy(mealType = type) }
        loadTemplates()
    }

    private fun loadTemplates() {
        screenModelScope.launch(exceptionHandler) {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            cachedUserId = userId
            val userTemplates = mealRepository.getMealTemplates(userId).getOrDefault(emptyList())
            _uiState.update { it.copy(templates = userTemplates) }

            // デフォルトテンプレートをバックグラウンドで取得
            loadDefaultMealTemplates()
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun loadDefaultMealTemplates() {
        screenModelScope.launch {
            try {
                val result = invokeCloudFunction(
                    region = "asia-northeast2",
                    functionName = "getQuestTemplates",
                    data = emptyMap()
                )
                val templatesList = (result["templates"] as? List<*>)
                    ?.mapNotNull { it as? Map<String, Any?> } ?: emptyList()

                val defaults = templatesList.filter { (it["type"] as? String) == "MEAL" }.map { t ->
                    val templateId = t["templateId"] as? String ?: ""
                    val title = t["title"] as? String ?: ""
                    val items = (t["items"] as? List<Map<String, Any?>>)?.map { item ->
                        MealItem(
                            name = item["foodName"] as? String ?: "",
                            amount = (item["amount"] as? Number)?.toFloat() ?: 0f,
                            unit = item["unit"] as? String ?: "g",
                            calories = (item["calories"] as? Number)?.toInt() ?: 0,
                            protein = (item["protein"] as? Number)?.toFloat() ?: 0f,
                            carbs = (item["carbs"] as? Number)?.toFloat() ?: 0f,
                            fat = (item["fat"] as? Number)?.toFloat() ?: 0f,
                            fiber = (item["fiber"] as? Number)?.toFloat() ?: 0f
                        )
                    } ?: emptyList()
                    val macros = t["totalMacros"] as? Map<String, Any?>
                    MealTemplate(
                        id = "default_$templateId",
                        userId = "default",
                        name = title,
                        items = items,
                        totalCalories = (macros?.get("calories") as? Number)?.toInt() ?: items.sumOf { it.calories },
                        totalProtein = (macros?.get("protein") as? Number)?.toFloat() ?: items.map { it.protein }.sum(),
                        totalCarbs = (macros?.get("carbs") as? Number)?.toFloat() ?: items.map { it.carbs }.sum(),
                        totalFat = (macros?.get("fat") as? Number)?.toFloat() ?: items.map { it.fat }.sum(),
                        createdAt = 0
                    )
                }
                _uiState.update { it.copy(defaultTemplates = defaults) }
            } catch (_: Exception) { }
        }
    }

    fun toggleDefaultTemplates() {
        _uiState.update { it.copy(showDefaultTemplates = !it.showDefaultTemplates) }
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

    private fun updateTotals(state: AddMealUiState, items: List<MealItem>): AddMealUiState {
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
                saturatedFat = oldItem.saturatedFat * ratio,
                monounsaturatedFat = oldItem.monounsaturatedFat * ratio,
                polyunsaturatedFat = oldItem.polyunsaturatedFat * ratio,
                vitamins = oldItem.vitamins.mapValues { it.value * ratio },
                minerals = oldItem.minerals.mapValues { it.value * ratio }
            )

            val newItems = state.items.toMutableList().apply { set(index, updatedItem) }
            updateTotals(state, newItems)
        }
    }

    fun updateNote(note: String) {
        _uiState.update { it.copy(note = note) }
    }

    fun toggleTemplates() {
        _uiState.update { it.copy(showTemplates = !it.showTemplates) }
    }

    fun applyTemplate(template: MealTemplate) {
        _uiState.update { state ->
            // FoodDBから全栄養素（ミクロ含む）を取得してエンリッチ
            val enrichedItems = template.items.map { item -> enrichItemFromFoodDb(item) }

            val totalGL = enrichedItems.sumOf { item ->
                val carbs = item.carbs.toDouble()
                if (item.gi > 0 && carbs > 0) (item.gi * carbs / 100) else 0.0
            }.toFloat()

            state.copy(
                mealName = template.name,
                items = enrichedItems,
                totalCalories = enrichedItems.sumOf { it.calories },
                totalProtein = enrichedItems.sumOf { it.protein.toDouble() }.toFloat(),
                totalCarbs = enrichedItems.sumOf { it.carbs.toDouble() }.toFloat(),
                totalFat = enrichedItems.sumOf { it.fat.toDouble() }.toFloat(),
                totalFiber = enrichedItems.sumOf { it.fiber.toDouble() }.toFloat(),
                totalGL = totalGL,
                isFromTemplate = true,
                showTemplates = false
            )
        }
    }

    fun startEditingTemplate(template: MealTemplate) {
        applyTemplate(template)
        _uiState.update { it.copy(editingTemplateId = template.id) }
    }

    fun loadAndEditTemplate(templateId: String) {
        screenModelScope.launch(exceptionHandler) {
            val userId = cachedUserId ?: authRepository.getCurrentUserId() ?: return@launch
            mealRepository.getMealTemplates(userId).onSuccess { templates ->
                val template = templates.find { it.id == templateId }
                if (template != null) {
                    startEditingTemplate(template)
                }
            }
        }
    }

    /**
     * FoodDatabase から per-100g 栄養素を取得し、テンプレートの量でスケーリング
     */
    private fun enrichItemFromFoodDb(item: MealItem): MealItem {
        val foodData = FoodDatabase.getFoodByName(item.name) ?: return item
        // グラム換算（卵など unit="個" の場合 servingSizes で変換）
        val grams = foodData.toGrams(item.amount, item.unit)
        val ratio = grams / 100f

        return item.copy(
            calories = (foodData.calories * ratio).toInt(),
            protein = foodData.protein * ratio,
            carbs = foodData.carbs * ratio,
            fat = foodData.fat * ratio,
            fiber = foodData.fiber * ratio,
            solubleFiber = foodData.solubleFiber * ratio,
            insolubleFiber = foodData.insolubleFiber * ratio,
            sugar = foodData.sugar * ratio,
            gi = foodData.gi ?: 0,
            diaas = foodData.diaas,
            saturatedFat = foodData.saturatedFat * ratio,
            monounsaturatedFat = foodData.monounsaturatedFat * ratio,
            polyunsaturatedFat = foodData.polyunsaturatedFat * ratio,
            vitamins = mapOf(
                "A" to foodData.vitaminA * ratio,
                "B1" to foodData.vitaminB1 * ratio,
                "B2" to foodData.vitaminB2 * ratio,
                "B6" to foodData.vitaminB6 * ratio,
                "B12" to foodData.vitaminB12 * ratio,
                "C" to foodData.vitaminC * ratio,
                "D" to foodData.vitaminD * ratio,
                "E" to foodData.vitaminE * ratio,
                "K" to foodData.vitaminK * ratio,
                "niacin" to foodData.niacin * ratio,
                "pantothenicAcid" to foodData.pantothenicAcid * ratio,
                "biotin" to foodData.biotin * ratio,
                "folicAcid" to foodData.folicAcid * ratio
            ),
            minerals = mapOf(
                "sodium" to foodData.sodium * ratio,
                "potassium" to foodData.potassium * ratio,
                "calcium" to foodData.calcium * ratio,
                "magnesium" to foodData.magnesium * ratio,
                "phosphorus" to foodData.phosphorus * ratio,
                "iron" to foodData.iron * ratio,
                "zinc" to foodData.zinc * ratio,
                "copper" to foodData.copper * ratio,
                "manganese" to foodData.manganese * ratio,
                "iodine" to foodData.iodine * ratio,
                "selenium" to foodData.selenium * ratio,
                "chromium" to foodData.chromium * ratio,
                "molybdenum" to foodData.molybdenum * ratio
            )
        )
    }

    /**
     * AI認識された食品を追加
     */
    fun addRecognizedFoods(foods: List<RecognizedFoodResult>) {
        _uiState.update { state ->
            val newItems = foods.map { food ->
                val amount = food.amount
                val ratio = amount / 100f
                val foodData = FoodDatabase.getFoodByName(food.name)
                val gi = foodData?.gi ?: 0
                val sugar = (foodData?.sugar ?: 0f) * ratio
                val fiber = (foodData?.fiber ?: 0f) * ratio
                val solubleFiber = (foodData?.solubleFiber ?: 0f) * ratio
                val insolubleFiber = (foodData?.insolubleFiber ?: 0f) * ratio
                val saturatedFat = (foodData?.saturatedFat ?: 0f) * ratio
                val monounsaturatedFat = (foodData?.monounsaturatedFat ?: 0f) * ratio
                val polyunsaturatedFat = (foodData?.polyunsaturatedFat ?: 0f) * ratio
                val protein = food.nutritionPer100g.protein * ratio
                val fat = food.nutritionPer100g.fat * ratio
                val carbs = food.nutritionPer100g.carbs * ratio
                MealItem(
                    name = food.name,
                    amount = amount,
                    unit = "g",
                    calories = MealItem.calculateCalories(protein, fat, carbs),
                    protein = protein,
                    carbs = carbs,
                    fat = fat,
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

    fun saveMeal() {
        val state = _uiState.value

        if (state.items.isEmpty()) {
            _uiState.update { it.copy(error = "食品を追加してください") }
            return
        }

        screenModelScope.launch(exceptionHandler) {
            _uiState.update { it.copy(isSaving = true) }

            try {
                val userId = authRepository.getCurrentUserId()
                if (userId == null) {
                    _uiState.update { it.copy(isSaving = false, error = "ログインが必要です") }
                    return@launch
                }

                // 食事名を生成（未入力の場合は食事番号から生成）
                val mealName = state.mealName.takeIf { it.isNotBlank() } ?: "食事${state.selectedMealNumber}"

                // 現在時刻を取得
                val timeString = DateUtil.timestampToTimeString(DateUtil.currentTimestamp())

                val meal = Meal(
                    id = "",
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
                        _uiState.update { it.copy(isSaving = false, saveSuccess = true) }
                        checkBadges()
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
     * バッジチェック＆付与
     */
    private fun checkBadges() {
        screenModelScope.launch(NonCancellable) {
            try {
                badgeRepository.checkAndAwardBadges()
            } catch (_: Exception) { }
        }
    }

    fun saveAsTemplate(name: String) {
        val userId = cachedUserId ?: return

        if (_uiState.value.items.isEmpty()) {
            _uiState.update { it.copy(error = "食品を追加してからテンプレートを作成してください") }
            return
        }

        screenModelScope.launch(exceptionHandler) {
            _uiState.update { it.copy(isSavingTemplate = true, templateSavedSuccessfully = false) }

            val state = _uiState.value
            val editingId = state.editingTemplateId

            if (editingId != null) {
                // 既存テンプレートを上書き更新
                val template = MealTemplate(
                    id = editingId,
                    userId = userId,
                    name = name,
                    items = state.items,
                    totalCalories = state.totalCalories,
                    totalProtein = state.totalProtein,
                    totalCarbs = state.totalCarbs,
                    totalFat = state.totalFat,
                    createdAt = DateUtil.currentTimestamp()
                )
                mealRepository.updateMealTemplate(template)
                    .onSuccess {
                        _uiState.update {
                            it.copy(
                                isSavingTemplate = false,
                                templateSavedSuccessfully = true
                            )
                        }
                        loadTemplates()
                    }
                    .onFailure { e ->
                        _uiState.update {
                            it.copy(
                                isSavingTemplate = false,
                                error = "テンプレートの更新に失敗しました: ${e.message}"
                            )
                        }
                    }
            } else {
                // 新規テンプレート作成
                val template = MealTemplate(
                    id = "",
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
    }

    fun clearTemplateSavedFlag() {
        _uiState.update { it.copy(templateSavedSuccessfully = false) }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    // ========== AI食事認識 ==========

    /**
     * カメラで食事を撮影してAI認識
     */
    fun captureAndAnalyzeFood() {
        screenModelScope.launch(exceptionHandler) {
            try {
                val result = CameraHelper.captureImage()
                result.fold(
                    onSuccess = { cameraResult ->
                        _uiState.update { it.copy(capturedImageBase64 = cameraResult.base64ImageData) }
                        analyzeFood(cameraResult.base64ImageData, cameraResult.mimeType)
                    },
                    onFailure = { e ->
                        if (e.message != "キャンセルされました" && e.message != "Cancelled") {
                            _uiState.update { it.copy(error = "画像の取得に失敗しました: ${e.message}") }
                        }
                    }
                )
            } catch (e: Exception) {
                _uiState.update { it.copy(error = "カメラエラー: ${e.message}") }
            }
        }
    }

    /**
     * AI食事認識を実行
     */
    private suspend fun analyzeFood(imageBase64: String, mimeType: String) {
        if (geminiService == null) {
            _uiState.update { it.copy(error = "AI認識機能が利用できません") }
            return
        }

        _uiState.update { it.copy(isAnalyzing = true, error = null) }

        try {
            val prompt = buildFoodRecognitionPrompt()
            val response = geminiService.analyzeImage(
                imageBase64 = imageBase64,
                mimeType = mimeType,
                prompt = prompt,
                model = "gemini-2.5-flash"
            )

            if (response.success && response.text != null) {
                val foods = parseFoodRecognitionResponse(response.text)
                if (foods.isNotEmpty()) {
                    addRecognizedFoods(foods)
                    _uiState.update { it.copy(isAnalyzing = false) }
                } else {
                    _uiState.update { it.copy(isAnalyzing = false, error = "食品を認識できませんでした") }
                }
            } else {
                _uiState.update { it.copy(isAnalyzing = false, error = response.error ?: "AI認識に失敗しました") }
            }
        } catch (e: Exception) {
            _uiState.update { it.copy(isAnalyzing = false, error = "AI認識エラー: ${e.message}") }
        }
    }

    private fun buildFoodRecognitionPrompt(): String {
        return """
この画像に写っている食品を分析してください。

以下のJSON形式で応答してください：
```json
{
  "foods": [
    {
      "name": "食品名（日本語）",
      "amount": 推定グラム数（数値）,
      "confidence": 信頼度（0.0-1.0）,
      "itemType": "food|drink|supplement",
      "cookingState": "調理状態（生、焼き、煮など）",
      "nutritionPer100g": {
        "calories": カロリー（kcal）,
        "protein": タンパク質（g）,
        "fat": 脂質（g）,
        "carbs": 炭水化物（g）,
        "fiber": 食物繊維（g）
      }
    }
  ],
  "hasPackageInfo": false
}
```

注意事項：
- 各食品の量はできるだけ正確に推定してください
- 栄養素は100gあたりの値で記載してください
- 画像に食品がない場合は空の配列を返してください
- JSON以外のテキストは含めないでください
""".trimIndent()
    }

    private fun parseFoodRecognitionResponse(text: String): List<RecognizedFoodResult> {
        try {
            val jsonStart = text.indexOf("{")
            val jsonEnd = text.lastIndexOf("}") + 1
            if (jsonStart < 0 || jsonEnd <= jsonStart) return emptyList()

            val jsonText = text.substring(jsonStart, jsonEnd)
            val json = Json { ignoreUnknownKeys = true }
            val rootElement = json.parseToJsonElement(jsonText)
            val foodsArray = rootElement.jsonObject["foods"]?.jsonArray ?: return emptyList()

            return foodsArray.mapNotNull { element ->
                try {
                    val obj = element.jsonObject
                    val nutritionObj = obj["nutritionPer100g"]?.jsonObject ?: return@mapNotNull null

                    RecognizedFoodResult(
                        name = obj["name"]?.jsonPrimitive?.content ?: return@mapNotNull null,
                        amount = obj["amount"]?.jsonPrimitive?.floatOrNull ?: 100f,
                        confidence = obj["confidence"]?.jsonPrimitive?.floatOrNull ?: 0.5f,
                        itemType = obj["itemType"]?.jsonPrimitive?.contentOrNull ?: "food",
                        cookingState = obj["cookingState"]?.jsonPrimitive?.contentOrNull ?: "",
                        nutritionPer100g = com.yourcoach.plus.shared.domain.service.NutritionPer100g(
                            calories = nutritionObj["calories"]?.jsonPrimitive?.floatOrNull ?: 0f,
                            protein = nutritionObj["protein"]?.jsonPrimitive?.floatOrNull ?: 0f,
                            fat = nutritionObj["fat"]?.jsonPrimitive?.floatOrNull ?: 0f,
                            carbs = nutritionObj["carbs"]?.jsonPrimitive?.floatOrNull ?: 0f,
                            fiber = nutritionObj["fiber"]?.jsonPrimitive?.floatOrNull ?: 0f
                        )
                    )
                } catch (e: Exception) {
                    null
                }
            }
        } catch (e: Exception) {
            return emptyList()
        }
    }
}
