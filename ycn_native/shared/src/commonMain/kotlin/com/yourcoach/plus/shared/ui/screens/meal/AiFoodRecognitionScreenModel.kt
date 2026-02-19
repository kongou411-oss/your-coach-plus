package com.yourcoach.plus.shared.ui.screens.meal

import kotlin.math.roundToInt
import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
import com.yourcoach.plus.shared.camera.CameraHelper
import com.yourcoach.plus.shared.camera.capturePhotoFromPreview
import com.yourcoach.plus.shared.data.database.FoodDatabase
import com.yourcoach.plus.shared.data.database.FoodItem
import com.yourcoach.plus.shared.domain.model.CustomFood
import com.yourcoach.plus.shared.domain.model.Meal
import com.yourcoach.plus.shared.domain.model.MealItem
import com.yourcoach.plus.shared.domain.model.MealType
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.BadgeRepository
import com.yourcoach.plus.shared.domain.repository.CustomFoodRepository
import com.yourcoach.plus.shared.domain.repository.MealRepository
import com.yourcoach.plus.shared.domain.repository.UserRepository
import com.yourcoach.plus.shared.domain.service.GeminiService
import com.yourcoach.plus.shared.domain.service.NutritionPer100g
import com.yourcoach.plus.shared.domain.service.RecognizedFoodResult
import com.yourcoach.plus.shared.util.DateUtil
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.*

/**
 * 認識された食品（Android RecognizedFood と完全一致）
 */
data class RecognizedFood(
    val name: String,
    val calories: Int,
    val protein: Float,
    val carbs: Float,
    val fat: Float,
    val confidence: Float,
    val servingSize: String = "1人前",
    val amount: Float = 100f,
    val fiber: Float = 0f,
    val solubleFiber: Float = 0f,
    val insolubleFiber: Float = 0f,
    val sugar: Float = 0f,
    val saturatedFat: Float = 0f,
    val mediumChainFat: Float = 0f,
    val monounsaturatedFat: Float = 0f,
    val polyunsaturatedFat: Float = 0f,
    val gi: Int = 0,
    val diaas: Float = 0f,
    val vitaminA: Float = 0f,
    val vitaminB1: Float = 0f,
    val vitaminB2: Float = 0f,
    val vitaminB6: Float = 0f,
    val vitaminB12: Float = 0f,
    val vitaminC: Float = 0f,
    val vitaminD: Float = 0f,
    val vitaminE: Float = 0f,
    val vitaminK: Float = 0f,
    val niacin: Float = 0f,
    val pantothenicAcid: Float = 0f,
    val biotin: Float = 0f,
    val folicAcid: Float = 0f,
    val sodium: Float = 0f,
    val potassium: Float = 0f,
    val calcium: Float = 0f,
    val magnesium: Float = 0f,
    val phosphorus: Float = 0f,
    val iron: Float = 0f,
    val zinc: Float = 0f,
    val copper: Float = 0f,
    val manganese: Float = 0f,
    val iodine: Float = 0f,
    val selenium: Float = 0f,
    val chromium: Float = 0f,
    val molybdenum: Float = 0f,
    val category: String? = null,
    val isFromDatabase: Boolean = false
)

/**
 * 写真解析画面の状態（Android AiFoodRecognitionUiState と完全一致）
 */
data class AiFoodRecognitionUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val capturedImageBase64: String? = null,
    val capturedMimeType: String? = null,
    val recognizedFoods: List<RecognizedFood> = emptyList(),
    val isAnalyzing: Boolean = false,
    val analysisComplete: Boolean = false,
    val isSaving: Boolean = false,
    val saveComplete: Boolean = false,
    val selectedMealNumber: Int = 1,
    val mealsPerDay: Int = 5,
    val recordedMealsToday: Int = 0,
    val isPremiumRequired: Boolean = false,
    val selectedDate: String = DateUtil.todayString(),
    // AI同意
    val aiDataConsent: Boolean = false
)

/**
 * 写真解析画面のScreenModel（Android AiFoodRecognitionViewModel と完全一致）
 */
class AiFoodRecognitionScreenModel(
    private val geminiService: GeminiService,
    private val mealRepository: MealRepository,
    private val authRepository: AuthRepository,
    private val userRepository: UserRepository,
    private val customFoodRepository: CustomFoodRepository,
    private val badgeRepository: BadgeRepository,
    private val initialDate: String
) : ScreenModel {

    private val _uiState = MutableStateFlow(AiFoodRecognitionUiState(selectedDate = initialDate))
    val uiState: StateFlow<AiFoodRecognitionUiState> = _uiState.asStateFlow()

    private val exceptionHandler = CoroutineExceptionHandler { _, throwable ->
        println("AiFoodRecognitionScreenModel: ${throwable.message}")
        _uiState.update { it.copy(isLoading = false, isAnalyzing = false, error = "エラーが発生しました") }
    }

    // 100gあたりの基準データを保持（量の増減計算用）
    private val baseFoodsData = mutableMapOf<String, FoodItem?>()

    // ユーザーのカスタム食品
    private var userCustomFoods: List<CustomFood> = emptyList()

    private var cachedUserId: String? = null

    init {
        checkPremiumStatus()
        loadMealSettings()
        loadCustomFoods()
        loadAiConsent()
    }

    /** AIデータ共有同意を読み込み */
    private fun loadAiConsent() {
        val userId = authRepository.getCurrentUserId() ?: return
        screenModelScope.launch(exceptionHandler) {
            userRepository.getUser(userId).onSuccess { user ->
                _uiState.update { it.copy(aiDataConsent = user?.aiDataConsent ?: false) }
            }
        }
    }

    /** AIデータ共有同意を保存してFirestoreに反映 */
    fun saveAiConsent() {
        val userId = authRepository.getCurrentUserId() ?: return
        screenModelScope.launch(exceptionHandler) {
            userRepository.saveAiDataConsent(userId)
            _uiState.update { it.copy(aiDataConsent = true) }
        }
    }

    /**
     * 類義語マッピング（AIが認識した名前 → データベース内の正式名称）
     */
    private val synonymMap = mapOf(
        "ご飯" to listOf("白米（炊飯直後）", "白米"),
        "ごはん" to listOf("白米（炊飯直後）", "白米"),
        "ライス" to listOf("白米（炊飯直後）", "白米"),
        "米" to listOf("白米（炊飯直後）", "白米"),
        "白米" to listOf("白米（炊飯直後）"),
        "白米（炊飯後）" to listOf("白米（炊飯直後）"),
        "白米（炊飯直後）" to listOf("白米（炊飯直後）"),
        "玄米" to listOf("玄米（炊飯後）"),
        "鶏肉" to listOf("鶏むね肉（皮なし生）", "鶏もも肉（皮なし生）"),
        "チキン" to listOf("鶏むね肉（皮なし生）", "鶏もも肉（皮なし生）"),
        "とり肉" to listOf("鶏むね肉（皮なし生）", "鶏もも肉（皮なし生）"),
        "鶏むね肉" to listOf("鶏むね肉（皮なし生）"),
        "鶏もも肉" to listOf("鶏もも肉（皮なし生）"),
        "卵" to listOf("鶏卵 M（全卵）", "全卵（生）"),
        "たまご" to listOf("鶏卵 M（全卵）", "全卵（生）"),
        "鶏卵" to listOf("鶏卵 M（全卵）", "全卵（生）"),
        "豚肉" to listOf("豚ロース（赤肉生）", "豚ヒレ（赤肉生）"),
        "豚ロース" to listOf("豚ロース（赤肉生）"),
        "豚ヒレ" to listOf("豚ヒレ（赤肉生）"),
        "牛肉" to listOf("牛もも肉（赤肉生）"),
        "牛もも肉" to listOf("牛もも肉（赤肉生）"),
        "サーモン" to listOf("鮭（生）", "鮭"),
        "鮭" to listOf("鮭（生）"),
        "ブロッコリー" to listOf("ブロッコリー（生）", "ブロッコリー"),
        "トマト" to listOf("トマト（生）", "トマト"),
        "玉ねぎ" to listOf("玉ねぎ（生）", "玉ねぎ"),
        "にんじん" to listOf("にんじん（生）", "にんじん"),
        "キャベツ" to listOf("キャベツ（生）", "キャベツ"),
        "ほうれん草" to listOf("ほうれん草（生）", "ほうれん草")
    )

    private fun checkPremiumStatus() {
        screenModelScope.launch(exceptionHandler) {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            cachedUserId = userId
            userRepository.getUser(userId)
                .onSuccess { user ->
                    if (user != null && user.isPremium != true && user.hasCorporatePremium != true) {
                        _uiState.update { it.copy(isPremiumRequired = true) }
                    }
                }
        }
    }

    private fun loadCustomFoods() {
        screenModelScope.launch(exceptionHandler) {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            cachedUserId = userId
            customFoodRepository.getCustomFoods(userId)
                .onSuccess { foods ->
                    userCustomFoods = foods
                }
        }
    }

    private fun loadMealSettings() {
        screenModelScope.launch(exceptionHandler) {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            cachedUserId = userId

            val userResult = userRepository.getUser(userId)
            val mealsPerDay = userResult.getOrNull()?.profile?.mealsPerDay ?: 5

            val today = _uiState.value.selectedDate
            val mealsResult = mealRepository.getMealsForDate(userId, today)
            val recordedMeals = mealsResult.getOrNull()?.size ?: 0

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
     * ライブプレビューから写真撮影
     */
    fun captureFromPreview() {
        screenModelScope.launch(exceptionHandler) {
            try {
                val result = capturePhotoFromPreview()
                result.fold(
                    onSuccess = { cameraResult ->
                        _uiState.update {
                            it.copy(
                                capturedImageBase64 = cameraResult.base64ImageData,
                                capturedMimeType = cameraResult.mimeType,
                                recognizedFoods = emptyList(),
                                analysisComplete = false
                            )
                        }
                    },
                    onFailure = { e ->
                        _uiState.update { it.copy(error = "撮影に失敗しました: ${e.message}") }
                    }
                )
            } catch (e: Exception) {
                _uiState.update { it.copy(error = "カメラエラー: ${e.message}") }
            }
        }
    }

    /**
     * フォトライブラリから選択
     */
    fun pickFromGallery() {
        screenModelScope.launch(exceptionHandler) {
            try {
                val result = CameraHelper.pickImage()
                result.fold(
                    onSuccess = { cameraResult ->
                        _uiState.update {
                            it.copy(
                                capturedImageBase64 = cameraResult.base64ImageData,
                                capturedMimeType = cameraResult.mimeType,
                                recognizedFoods = emptyList(),
                                analysisComplete = false
                            )
                        }
                    },
                    onFailure = { e ->
                        if (!e.message.orEmpty().contains("キャンセル", ignoreCase = true) &&
                            !e.message.orEmpty().contains("cancel", ignoreCase = true)) {
                            _uiState.update { it.copy(error = "画像の取得に失敗しました: ${e.message}") }
                        }
                    }
                )
            } catch (e: Exception) {
                _uiState.update { it.copy(error = "ライブラリエラー: ${e.message}") }
            }
        }
    }

    /**
     * 撮り直し（画像リセット→プレビュー画面に戻る）
     */
    fun retakePhoto() {
        _uiState.update {
            it.copy(
                capturedImageBase64 = null,
                capturedMimeType = null,
                recognizedFoods = emptyList(),
                analysisComplete = false
            )
        }
    }

    /**
     * 画像をAIで分析
     */
    fun analyzeImage() {
        val imageBase64 = _uiState.value.capturedImageBase64 ?: return
        val mimeType = _uiState.value.capturedMimeType ?: "image/jpeg"

        screenModelScope.launch(exceptionHandler) {
            _uiState.update { it.copy(isAnalyzing = true, error = null) }

            try {
                val promptText = buildPrompt()
                val response = geminiService.analyzeImage(
                    imageBase64 = imageBase64,
                    mimeType = mimeType,
                    prompt = promptText,
                    model = "gemini-2.5-flash"
                )

                val responseText = response.text
                if (response.success && responseText != null) {
                    val recognizedFoods = parseRecognitionResponse(responseText)
                    _uiState.update {
                        it.copy(
                            isAnalyzing = false,
                            recognizedFoods = recognizedFoods,
                            analysisComplete = true
                        )
                    }
                } else {
                    _uiState.update {
                        it.copy(
                            isAnalyzing = false,
                            error = response.error ?: "食品の認識に失敗しました"
                        )
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isAnalyzing = false,
                        error = e.message ?: "画像の分析に失敗しました"
                    )
                }
            }
        }
    }

    private fun buildPrompt(): String {
        return """ヘルスケアアプリ用の食材解析AI。写真から食材を認識しJSON形式で出力。

優先度1: パッケージの栄養成分表示がある場合
- 内容量、栄養成分（100gあたりに換算）を読み取る
出力: {"hasPackageInfo": true, "packageWeight": 数値g, "nutritionPer": 数値g, "foods": [{"name": "商品名", "amount": 数値g, "confidence": 1.0, "source": "package", "cookingState": "加工済み", "nutritionPer100g": {"calories": 数値, "protein": 数値, "fat": 数値, "carbs": 数値}}]}

優先度2: 料理や生鮮食品の場合
- 料理名ではなく、使用食材を個別に分解して列挙
  例: 「オムライス」→「卵」「白米（炊飯直後）」「玉ねぎ」「鶏肉」「ケチャップ」
- 調理状態を必ず明記: 炊飯直後/生/茹で/焼き/炒め/揚げ/加工済み
- 重要: ご飯・白米は必ず「白米（炊飯直後）」と出力（精白米は生米のため使用禁止）
- 同じ食材は1つにまとめて合計量を記載
出力: {"hasPackageInfo": false, "foods": [{"name": "食材名", "amount": 推定g, "confidence": 0-1, "source": "visual_estimation", "cookingState": "調理状態", "nutritionPer100g": {"calories": 数値, "protein": 数値, "fat": 数値, "carbs": 数値}}]}

量の推定目安（1人前）:
- ご飯: 150-200g / 肉・魚: 80-150g / 卵: 58-64g / 野菜: 50-100g

食材名の標準化ルール（サイズ不明時）:
- 卵: 「鶏卵 M（58g）」（一般的なサイズ）
- 肉: 部位を明記「鶏むね肉」「豚ロース」「牛もも肉」
- 魚: 種類を明記「鮭」「さば」「まぐろ」

confidence判定基準:
- 1.0: パッケージ読取 / 0.8-0.9: 明確 / 0.6-0.7: 量不明瞭 / 0.3-0.5: 種類不明瞭

JSONのみ出力、説明文不要"""
    }

    private fun parseRecognitionResponse(jsonText: String): List<RecognizedFood> {
        return try {
            val jsonString = extractJson(jsonText)
            val json = Json { ignoreUnknownKeys = true }
            val rootElement = json.parseToJsonElement(jsonString)
            val foodsArray = rootElement.jsonObject["foods"]?.jsonArray ?: return emptyList()

            val result = mutableListOf<RecognizedFood>()
            baseFoodsData.clear()

            for (element in foodsArray) {
                try {
                    val obj = element.jsonObject
                    val nutritionObj = obj["nutritionPer100g"]?.jsonObject

                    val aiName = (obj["name"]?.jsonPrimitive?.content ?: "不明")
                        .replace("(", "（").replace(")", "）")
                    val amount = obj["amount"]?.jsonPrimitive?.floatOrNull ?: 100f
                    val confidence = obj["confidence"]?.jsonPrimitive?.floatOrNull ?: 0.8f

                    val dbFood = findFoodInDatabase(aiName)

                    if (dbFood != null) {
                        baseFoodsData[dbFood.name] = dbFood
                        val ratio = amount / 100f
                        result.add(createRecognizedFoodFromDb(dbFood, amount, ratio, confidence))
                    } else {
                        baseFoodsData[aiName] = null
                        val caloriesPer100g = nutritionObj?.get("calories")?.jsonPrimitive?.floatOrNull ?: 0f
                        val proteinPer100g = nutritionObj?.get("protein")?.jsonPrimitive?.floatOrNull ?: 0f
                        val carbsPer100g = nutritionObj?.get("carbs")?.jsonPrimitive?.floatOrNull ?: 0f
                        val fatPer100g = nutritionObj?.get("fat")?.jsonPrimitive?.floatOrNull ?: 0f

                        val ratio = amount / 100f
                        result.add(
                            RecognizedFood(
                                name = aiName,
                                calories = (caloriesPer100g * ratio).toInt(),
                                protein = proteinPer100g * ratio,
                                carbs = carbsPer100g * ratio,
                                fat = fatPer100g * ratio,
                                confidence = confidence,
                                servingSize = "${amount.toInt()}g",
                                amount = amount
                            )
                        )
                    }
                } catch (_: Exception) { /* skip invalid item */ }
            }
            result
        } catch (e: Exception) {
            emptyList()
        }
    }

    private fun createRecognizedFoodFromDb(
        dbFood: FoodItem,
        amount: Float,
        ratio: Float,
        confidence: Float
    ): RecognizedFood {
        return RecognizedFood(
            name = dbFood.name,
            calories = (dbFood.calories * ratio).toInt(),
            protein = dbFood.protein * ratio,
            carbs = dbFood.carbs * ratio,
            fat = dbFood.fat * ratio,
            confidence = confidence,
            servingSize = "${amount.toInt()}g",
            amount = amount,
            fiber = dbFood.fiber * ratio,
            solubleFiber = dbFood.solubleFiber * ratio,
            insolubleFiber = dbFood.insolubleFiber * ratio,
            sugar = dbFood.sugar * ratio,
            saturatedFat = dbFood.saturatedFat * ratio,
            mediumChainFat = 0f,
            monounsaturatedFat = dbFood.monounsaturatedFat * ratio,
            polyunsaturatedFat = dbFood.polyunsaturatedFat * ratio,
            gi = dbFood.gi ?: 0,
            diaas = dbFood.diaas,
            vitaminA = dbFood.vitaminA * ratio,
            vitaminB1 = dbFood.vitaminB1 * ratio,
            vitaminB2 = dbFood.vitaminB2 * ratio,
            vitaminB6 = dbFood.vitaminB6 * ratio,
            vitaminB12 = dbFood.vitaminB12 * ratio,
            vitaminC = dbFood.vitaminC * ratio,
            vitaminD = dbFood.vitaminD * ratio,
            vitaminE = dbFood.vitaminE * ratio,
            vitaminK = dbFood.vitaminK * ratio,
            niacin = dbFood.niacin * ratio,
            pantothenicAcid = dbFood.pantothenicAcid * ratio,
            biotin = dbFood.biotin * ratio,
            folicAcid = dbFood.folicAcid * ratio,
            sodium = dbFood.sodium * ratio,
            potassium = dbFood.potassium * ratio,
            calcium = dbFood.calcium * ratio,
            magnesium = dbFood.magnesium * ratio,
            phosphorus = dbFood.phosphorus * ratio,
            iron = dbFood.iron * ratio,
            zinc = dbFood.zinc * ratio,
            copper = dbFood.copper * ratio,
            manganese = dbFood.manganese * ratio,
            iodine = dbFood.iodine * ratio,
            selenium = dbFood.selenium * ratio,
            chromium = dbFood.chromium * ratio,
            molybdenum = dbFood.molybdenum * ratio,
            category = dbFood.category,
            isFromDatabase = true
        )
    }

    private fun findFoodInDatabase(name: String): FoodItem? {
        val searchNames = mutableListOf(name)
        synonymMap[name]?.let { searchNames.addAll(it) }

        val allFoods = FoodDatabase.allFoods
        var bestMatch: FoodItem? = null
        var bestScore = 0

        for (food in allFoods) {
            var score = 0
            for (searchName in searchNames) {
                when {
                    food.name == searchName -> score = maxOf(score, 100)
                    food.name.startsWith(searchName) -> score = maxOf(score, 80)
                    food.name.contains(searchName) -> score = maxOf(score, 60)
                    searchName.contains(food.name) -> score = maxOf(score, 40)
                }
            }
            if (score > bestScore) {
                bestScore = score
                bestMatch = food
            }
        }

        return if (bestScore >= 40) bestMatch else null
    }

    private fun extractJson(text: String): String {
        val jsonBlockPattern = Regex("```json\\s*([\\s\\S]*?)\\s*```")
        val jsonBlockMatch = jsonBlockPattern.find(text)
        if (jsonBlockMatch != null) return jsonBlockMatch.groupValues[1].trim()

        val codeBlockPattern = Regex("```\\s*([\\s\\S]*?)\\s*```")
        val codeBlockMatch = codeBlockPattern.find(text)
        if (codeBlockMatch != null) return codeBlockMatch.groupValues[1].trim()

        val jsonStart = text.indexOf('{')
        val jsonEnd = text.lastIndexOf('}')
        if (jsonStart >= 0 && jsonEnd > jsonStart) return text.substring(jsonStart, jsonEnd + 1)

        return text
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    fun removeFood(foodName: String) {
        _uiState.update { state ->
            state.copy(recognizedFoods = state.recognizedFoods.filter { it.name != foodName })
        }
        baseFoodsData.remove(foodName)
    }

    fun replaceFood(originalName: String, newFood: FoodItem, originalAmount: Float) {
        val ratio = originalAmount / 100f
        baseFoodsData.remove(originalName)
        baseFoodsData[newFood.name] = newFood

        _uiState.update { state ->
            val updatedFoods = state.recognizedFoods.map { food ->
                if (food.name == originalName) {
                    createRecognizedFoodFromDb(newFood, originalAmount, ratio, 1.0f)
                } else {
                    food
                }
            }
            state.copy(recognizedFoods = updatedFoods)
        }
    }

    fun searchFoodCandidates(query: String): List<FoodItem> {
        if (query.isEmpty()) return emptyList()
        val normalizedQuery = query.trim().lowercase()

        val dbResults = FoodDatabase.allFoods.map { food ->
            val normalizedName = food.name.lowercase()
            val score = calculateSearchScore(normalizedName, normalizedQuery)
            Pair(food, score)
        }

        val customResults = userCustomFoods.map { customFood ->
            val foodItem = customFoodToFoodItem(customFood)
            val normalizedName = customFood.name.lowercase()
            val score = calculateSearchScore(normalizedName, normalizedQuery)
            Pair(foodItem, if (score > 0) score + 10 else 0)
        }

        return (dbResults + customResults)
            .filter { it.second > 0 }
            .sortedByDescending { it.second }
            .take(30)
            .map { it.first }
    }

    private fun calculateSearchScore(foodName: String, query: String): Int {
        var score = 0
        if (foodName == query) score += 100
        if (foodName.startsWith(query)) score += 80
        if (foodName.contains(query)) score += 60
        if (query.contains(foodName)) score += 40

        if (score == 0) {
            var queryIndex = 0
            for (char in foodName) {
                if (queryIndex < query.length && char == query[queryIndex]) {
                    queryIndex++
                }
            }
            if (queryIndex == query.length) score += 20
        }

        if (score == 0) {
            val matchCount = query.count { foodName.contains(it) }
            if (matchCount > 0) score += matchCount * 5
        }

        return score
    }

    private fun customFoodToFoodItem(customFood: CustomFood): FoodItem {
        return FoodItem(
            name = "[カスタム] ${customFood.name}",
            category = "カスタム食品",
            calories = customFood.calories.toFloat(),
            protein = customFood.protein,
            fat = customFood.fat,
            carbs = customFood.carbs,
            fiber = customFood.fiber,
            solubleFiber = customFood.solubleFiber,
            insolubleFiber = customFood.insolubleFiber,
            sugar = customFood.sugar,
            gi = customFood.gi,
            diaas = customFood.diaas,
            saturatedFat = customFood.saturatedFat,
            monounsaturatedFat = customFood.monounsaturatedFat,
            polyunsaturatedFat = customFood.polyunsaturatedFat,
            vitaminA = customFood.vitaminA,
            vitaminB1 = customFood.vitaminB1,
            vitaminB2 = customFood.vitaminB2,
            vitaminB6 = customFood.vitaminB6,
            vitaminB12 = customFood.vitaminB12,
            vitaminC = customFood.vitaminC,
            vitaminD = customFood.vitaminD,
            vitaminE = customFood.vitaminE,
            vitaminK = customFood.vitaminK,
            niacin = customFood.niacin,
            pantothenicAcid = customFood.pantothenicAcid,
            biotin = customFood.biotin,
            folicAcid = customFood.folicAcid,
            sodium = customFood.sodium,
            potassium = customFood.potassium,
            calcium = customFood.calcium,
            magnesium = customFood.magnesium,
            phosphorus = customFood.phosphorus,
            iron = customFood.iron,
            zinc = customFood.zinc,
            copper = customFood.copper,
            manganese = customFood.manganese,
            iodine = customFood.iodine,
            selenium = customFood.selenium,
            chromium = customFood.chromium,
            molybdenum = customFood.molybdenum
        )
    }

    fun setMealNumber(number: Int) {
        _uiState.update { it.copy(selectedMealNumber = number) }
    }

    fun updateFoodAmount(foodName: String, newAmount: Float) {
        val baseFood = baseFoodsData[foodName]
        val ratio = newAmount / 100f

        _uiState.update { state ->
            val updatedFoods = state.recognizedFoods.map { food ->
                if (food.name == foodName) {
                    if (baseFood != null) {
                        createRecognizedFoodFromDb(baseFood, newAmount, ratio, food.confidence)
                    } else {
                        val currentRatio = newAmount / food.amount
                        food.copy(
                            amount = newAmount,
                            servingSize = "${newAmount.toInt()}g",
                            calories = (food.calories * currentRatio).toInt(),
                            protein = food.protein * currentRatio,
                            carbs = food.carbs * currentRatio,
                            fat = food.fat * currentRatio,
                            fiber = food.fiber * currentRatio,
                            solubleFiber = food.solubleFiber * currentRatio,
                            insolubleFiber = food.insolubleFiber * currentRatio,
                            sugar = food.sugar * currentRatio,
                            saturatedFat = food.saturatedFat * currentRatio,
                            mediumChainFat = food.mediumChainFat * currentRatio,
                            monounsaturatedFat = food.monounsaturatedFat * currentRatio,
                            polyunsaturatedFat = food.polyunsaturatedFat * currentRatio,
                            vitaminA = food.vitaminA * currentRatio,
                            vitaminB1 = food.vitaminB1 * currentRatio,
                            vitaminB2 = food.vitaminB2 * currentRatio,
                            vitaminB6 = food.vitaminB6 * currentRatio,
                            vitaminB12 = food.vitaminB12 * currentRatio,
                            vitaminC = food.vitaminC * currentRatio,
                            vitaminD = food.vitaminD * currentRatio,
                            vitaminE = food.vitaminE * currentRatio,
                            vitaminK = food.vitaminK * currentRatio,
                            niacin = food.niacin * currentRatio,
                            pantothenicAcid = food.pantothenicAcid * currentRatio,
                            biotin = food.biotin * currentRatio,
                            folicAcid = food.folicAcid * currentRatio,
                            sodium = food.sodium * currentRatio,
                            potassium = food.potassium * currentRatio,
                            calcium = food.calcium * currentRatio,
                            magnesium = food.magnesium * currentRatio,
                            phosphorus = food.phosphorus * currentRatio,
                            iron = food.iron * currentRatio,
                            zinc = food.zinc * currentRatio,
                            copper = food.copper * currentRatio,
                            manganese = food.manganese * currentRatio,
                            iodine = food.iodine * currentRatio,
                            selenium = food.selenium * currentRatio,
                            chromium = food.chromium * currentRatio,
                            molybdenum = food.molybdenum * currentRatio
                        )
                    }
                } else {
                    food
                }
            }
            state.copy(recognizedFoods = updatedFoods)
        }
    }

    /**
     * 食事を直接Firestoreに保存
     */
    fun saveMeal(onComplete: () -> Unit) {
        val userId = cachedUserId ?: return
        val foods = _uiState.value.recognizedFoods
        if (foods.isEmpty()) return

        screenModelScope.launch(exceptionHandler) {
            _uiState.update { it.copy(isSaving = true, error = null) }

            try {
                val mealItems = foods.map { food ->
                    MealItem(
                        name = food.name,
                        amount = food.amount,
                        unit = "g",
                        calories = MealItem.calculateCalories(food.protein, food.fat, food.carbs),
                        protein = food.protein,
                        carbs = food.carbs,
                        fat = food.fat,
                        fiber = food.fiber,
                        solubleFiber = food.solubleFiber,
                        insolubleFiber = food.insolubleFiber,
                        sugar = food.sugar,
                        saturatedFat = food.saturatedFat,
                        mediumChainFat = food.mediumChainFat,
                        monounsaturatedFat = food.monounsaturatedFat,
                        polyunsaturatedFat = food.polyunsaturatedFat,
                        diaas = food.diaas,
                        gi = food.gi,
                        vitamins = mapOf(
                            "vitaminA" to food.vitaminA,
                            "vitaminB1" to food.vitaminB1,
                            "vitaminB2" to food.vitaminB2,
                            "vitaminB6" to food.vitaminB6,
                            "vitaminB12" to food.vitaminB12,
                            "vitaminC" to food.vitaminC,
                            "vitaminD" to food.vitaminD,
                            "vitaminE" to food.vitaminE,
                            "vitaminK" to food.vitaminK,
                            "niacin" to food.niacin,
                            "pantothenicAcid" to food.pantothenicAcid,
                            "biotin" to food.biotin,
                            "folicAcid" to food.folicAcid
                        ).filterValues { it > 0f },
                        minerals = mapOf(
                            "sodium" to food.sodium,
                            "potassium" to food.potassium,
                            "calcium" to food.calcium,
                            "magnesium" to food.magnesium,
                            "phosphorus" to food.phosphorus,
                            "iron" to food.iron,
                            "zinc" to food.zinc,
                            "copper" to food.copper,
                            "manganese" to food.manganese,
                            "iodine" to food.iodine,
                            "selenium" to food.selenium,
                            "chromium" to food.chromium,
                            "molybdenum" to food.molybdenum
                        ).filterValues { it > 0f },
                        isAiRecognized = true,
                        category = food.category
                    )
                }

                val totalCalories = foods.sumOf { it.calories }
                val totalProtein = foods.sumOf { it.protein.roundToInt() }.toFloat()
                val totalCarbs = foods.sumOf { it.carbs.roundToInt() }.toFloat()
                val totalFat = foods.sumOf { it.fat.roundToInt() }.toFloat()
                val totalFiber = foods.sumOf { it.fiber.toDouble() }.toFloat()
                val totalGL = foods.sumOf { (it.gi * it.carbs / 100f).toDouble() }.toFloat()

                val now = DateUtil.currentTimestamp()
                val mealType = when (_uiState.value.selectedMealNumber) {
                    1 -> MealType.BREAKFAST
                    2 -> MealType.LUNCH
                    3 -> MealType.DINNER
                    else -> MealType.SNACK
                }
                val meal = Meal(
                    id = "",
                    userId = userId,
                    name = "食事${_uiState.value.selectedMealNumber}",
                    type = mealType,
                    time = DateUtil.timestampToTimeString(now),
                    items = mealItems,
                    totalCalories = totalCalories,
                    totalProtein = totalProtein,
                    totalCarbs = totalCarbs,
                    totalFat = totalFat,
                    totalFiber = totalFiber,
                    totalGL = totalGL,
                    imageUrl = null,
                    note = null,
                    isPredicted = false,
                    isTemplate = false,
                    isRoutine = false,
                    isPostWorkout = false,
                    timestamp = DateUtil.dateStringToTimestamp(_uiState.value.selectedDate),
                    createdAt = now
                )

                val result = mealRepository.addMeal(meal)
                if (result.isSuccess) {
                    saveCustomFoodsFromRecognition(userId, foods)
                    checkBadges()
                    _uiState.update { it.copy(isSaving = false, saveComplete = true) }
                    onComplete()
                } else {
                    _uiState.update {
                        it.copy(
                            isSaving = false,
                            error = result.exceptionOrNull()?.message ?: "保存に失敗しました"
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

    private fun saveCustomFoodsFromRecognition(userId: String, foods: List<RecognizedFood>) {
        screenModelScope.launch(exceptionHandler) {
            foods.filter { !it.isFromDatabase }.forEach { food ->
                try {
                    val ratio = 100f / food.amount.coerceAtLeast(1f)
                    val caloriesPer100g = (food.calories * ratio).toInt()
                    val proteinPer100g = food.protein * ratio
                    val carbsPer100g = food.carbs * ratio
                    val fatPer100g = food.fat * ratio
                    val fiberPer100g = food.fiber * ratio

                    val cleanName = food.name.split("（").first().trim()

                    val existing = customFoodRepository.getCustomFoodByName(userId, cleanName).getOrNull()

                    if (existing != null) {
                        // incrementUsage が失敗した場合（削除済みドキュメント等）は新規作成にフォールバック
                        val incrementResult = customFoodRepository.incrementUsage(userId, existing.id)
                        if (incrementResult.isFailure) {
                            val customFood = CustomFood(
                                id = "",
                                userId = userId,
                                name = cleanName,
                                calories = caloriesPer100g,
                                protein = proteinPer100g,
                                carbs = carbsPer100g,
                                fat = fatPer100g,
                                fiber = fiberPer100g,
                                gi = food.gi,
                                diaas = food.diaas,
                                createdAt = DateUtil.currentTimestamp()
                            )
                            customFoodRepository.saveCustomFood(customFood)
                        }
                    } else {
                        val customFood = CustomFood(
                            id = "",
                            userId = userId,
                            name = cleanName,
                            calories = caloriesPer100g,
                            protein = proteinPer100g,
                            carbs = carbsPer100g,
                            fat = fatPer100g,
                            fiber = fiberPer100g,
                            gi = food.gi,
                            diaas = food.diaas,
                            createdAt = DateUtil.currentTimestamp()
                        )
                        customFoodRepository.saveCustomFood(customFood)
                    }
                } catch (_: Exception) { /* ignore */ }
            }
        }
    }

    private fun checkBadges() {
        screenModelScope.launch(NonCancellable) {
            try {
                badgeRepository.checkAndAwardBadges()
            } catch (_: Exception) { }
        }
    }
}
