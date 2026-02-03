package com.yourcoach.plus.android.ui.screens.meal

import android.Manifest
import android.content.Context
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Base64
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.yourcoach.plus.android.ui.theme.Primary
import com.yourcoach.plus.android.ui.theme.AccentGreen
import com.yourcoach.plus.android.ui.theme.ScoreProtein
import com.yourcoach.plus.android.ui.theme.ScoreCarbs
import com.yourcoach.plus.android.ui.theme.ScoreFat
import com.yourcoach.plus.shared.domain.model.CustomFood
import com.yourcoach.plus.shared.domain.model.Meal
import com.yourcoach.plus.shared.domain.model.MealItem
import com.yourcoach.plus.shared.domain.model.MealType
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.CustomFoodRepository
import com.yourcoach.plus.shared.domain.repository.MealRepository
import com.yourcoach.plus.shared.domain.service.GeminiService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import org.koin.androidx.compose.koinViewModel
import com.yourcoach.plus.shared.data.database.FoodDatabase
import com.yourcoach.plus.shared.data.database.FoodItem
import java.io.ByteArrayOutputStream
import java.io.File
import java.text.SimpleDateFormat
import java.util.*
import android.os.Parcelable
import java.util.concurrent.Executor
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine
import kotlinx.parcelize.Parcelize

/**
 * 認識された食品
 */
@Parcelize
data class RecognizedFood(
    val name: String,
    val calories: Int,
    val protein: Float,
    val carbs: Float,
    val fat: Float,
    val confidence: Float, // 信頼度 0.0-1.0
    val servingSize: String = "1人前",
    val amount: Float = 100f, // グラム数
    // 食物繊維
    val fiber: Float = 0f,
    val solubleFiber: Float = 0f,   // 水溶性食物繊維
    val insolubleFiber: Float = 0f, // 不溶性食物繊維
    // 糖質
    val sugar: Float = 0f,
    // 脂肪酸
    val saturatedFat: Float = 0f,
    val mediumChainFat: Float = 0f, // 中鎖脂肪酸 (MCT)
    val monounsaturatedFat: Float = 0f,
    val polyunsaturatedFat: Float = 0f,
    // 品質指標
    val gi: Int = 0,
    val diaas: Float = 0f,
    // ビタミン13種
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
    val pantothenicAcid: Float = 0f, // パントテン酸
    val biotin: Float = 0f,          // ビオチン
    val folicAcid: Float = 0f,
    // ミネラル13種
    val sodium: Float = 0f,
    val potassium: Float = 0f,
    val calcium: Float = 0f,
    val magnesium: Float = 0f,
    val phosphorus: Float = 0f,
    val iron: Float = 0f,
    val zinc: Float = 0f,
    val copper: Float = 0f,
    val manganese: Float = 0f,
    val iodine: Float = 0f,      // ヨウ素
    val selenium: Float = 0f,    // セレン
    val chromium: Float = 0f,    // クロム
    val molybdenum: Float = 0f,  // モリブデン
    val category: String? = null,
    val isFromDatabase: Boolean = false // 食品DBからの取得かどうか
) : Parcelable

/**
 * 写真解析画面の状態
 */
data class AiFoodRecognitionUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val capturedImageUri: Uri? = null,
    val recognizedFoods: List<RecognizedFood> = emptyList(),
    val isAnalyzing: Boolean = false,
    val analysisComplete: Boolean = false,
    val hasCameraPermission: Boolean = false,
    val isSaving: Boolean = false,
    val saveComplete: Boolean = false,
    val selectedMealNumber: Int = 1, // 1食目、2食目...
    val mealsPerDay: Int = 5,        // 設定の食事回数
    val recordedMealsToday: Int = 0  // 今日の記録済み食事数
)

/**
 * 写真解析ViewModel
 */
class AiFoodRecognitionViewModel(
    private val geminiService: GeminiService,
    private val mealRepository: MealRepository,
    private val authRepository: AuthRepository,
    private val userRepository: com.yourcoach.plus.shared.domain.repository.UserRepository,
    private val customFoodRepository: CustomFoodRepository,
    private val badgeRepository: com.yourcoach.plus.shared.domain.repository.BadgeRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow(AiFoodRecognitionUiState())
    val uiState: StateFlow<AiFoodRecognitionUiState> = _uiState.asStateFlow()

    private var currentContext: Context? = null

    // 100gあたりの基準データを保持（量の増減計算用）
    private val baseFoodsData = mutableMapOf<String, FoodItem?>()

    // ユーザーのカスタム食品（検索用）
    private var userCustomFoods: List<CustomFood> = emptyList()

    init {
        // 食事設定を自動取得
        loadMealSettings()
        // カスタム食品を読み込み
        loadCustomFoods()
    }

    /**
     * カスタム食品を読み込み
     */
    private fun loadCustomFoods() {
        viewModelScope.launch {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            customFoodRepository.getCustomFoods(userId)
                .onSuccess { foods ->
                    userCustomFoods = foods
                }
        }
    }

    /**
     * CustomFoodをFoodItemに変換（検索・差し替え用）
     */
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

    private fun loadMealSettings() {
        viewModelScope.launch {
            val userId = authRepository.getCurrentUserId() ?: return@launch

            // ユーザー設定から食事回数を取得
            val userResult = userRepository.getUser(userId)
            val mealsPerDay = userResult.getOrNull()?.profile?.mealsPerDay ?: 5

            // 今日の記録済み食事数を取得
            val today = java.time.LocalDate.now().toString()
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
     * 類義語マッピング（AIが認識した名前 → データベース内の正式名称）
     */
    private val synonymMap = mapOf(
        // ご飯・米系（炊飯直後を最優先）
        "ご飯" to listOf("白米（炊飯直後）", "白米"),
        "ごはん" to listOf("白米（炊飯直後）", "白米"),
        "ライス" to listOf("白米（炊飯直後）", "白米"),
        "米" to listOf("白米（炊飯直後）", "白米"),
        "白米" to listOf("白米（炊飯直後）"),
        "白米（炊飯後）" to listOf("白米（炊飯直後）"),
        "白米（炊飯直後）" to listOf("白米（炊飯直後）"),
        "玄米" to listOf("玄米（炊飯後）"),
        // 鶏肉系
        "鶏肉" to listOf("鶏むね肉（皮なし生）", "鶏もも肉（皮なし生）"),
        "チキン" to listOf("鶏むね肉（皮なし生）", "鶏もも肉（皮なし生）"),
        "とり肉" to listOf("鶏むね肉（皮なし生）", "鶏もも肉（皮なし生）"),
        "鶏むね肉" to listOf("鶏むね肉（皮なし生）"),
        "鶏もも肉" to listOf("鶏もも肉（皮なし生）"),
        // 卵系
        "卵" to listOf("鶏卵 M（全卵）", "全卵（生）"),
        "たまご" to listOf("鶏卵 M（全卵）", "全卵（生）"),
        "鶏卵" to listOf("鶏卵 M（全卵）", "全卵（生）"),
        // 豚肉系
        "豚肉" to listOf("豚ロース（赤肉生）", "豚ヒレ（赤肉生）"),
        "豚ロース" to listOf("豚ロース（赤肉生）"),
        "豚ヒレ" to listOf("豚ヒレ（赤肉生）"),
        // 牛肉系
        "牛肉" to listOf("牛もも肉（赤肉生）"),
        "牛もも肉" to listOf("牛もも肉（赤肉生）"),
        // 魚系
        "サーモン" to listOf("鮭（生）", "鮭"),
        "鮭" to listOf("鮭（生）"),
        // 野菜系
        "ブロッコリー" to listOf("ブロッコリー（生）", "ブロッコリー"),
        "トマト" to listOf("トマト（生）", "トマト"),
        "玉ねぎ" to listOf("玉ねぎ（生）", "玉ねぎ"),
        "にんじん" to listOf("にんじん（生）", "にんじん"),
        "キャベツ" to listOf("キャベツ（生）", "キャベツ"),
        "ほうれん草" to listOf("ほうれん草（生）", "ほうれん草")
    )

    fun setContext(context: Context) {
        currentContext = context
    }

    fun setCameraPermission(granted: Boolean) {
        _uiState.update { it.copy(hasCameraPermission = granted) }
    }

    fun onImageCaptured(uri: Uri) {
        _uiState.update {
            it.copy(
                capturedImageUri = uri,
                recognizedFoods = emptyList(),
                analysisComplete = false
            )
        }
    }

    fun analyzeImage() {
        val imageUri = _uiState.value.capturedImageUri ?: return
        val context = currentContext ?: return

        viewModelScope.launch {
            _uiState.update { it.copy(isAnalyzing = true, error = null) }

            try {
                // 画像をBase64に変換
                val (base64Image, mimeType) = withContext(Dispatchers.IO) {
                    convertImageToBase64(context, imageUri)
                }

                // 食品認識プロンプト
                val promptText = """ヘルスケアアプリ用の食材解析AI。写真から食材を認識しJSON形式で出力。

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

                // Gemini API呼び出し（gemini-2.5-flash）
                val response = geminiService.analyzeImage(
                    imageBase64 = base64Image,
                    mimeType = mimeType,
                    prompt = promptText,
                    model = "gemini-2.5-flash"
                )

                val responseText = response.text
                if (response.success && responseText != null) {
                    // JSONレスポンスをパース
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

    /**
     * 画像をBase64に変換
     */
    private fun convertImageToBase64(context: Context, uri: Uri): Pair<String, String> {
        val inputStream = context.contentResolver.openInputStream(uri)
            ?: throw Exception("画像を読み込めません")

        val bytes = inputStream.use { it.readBytes() }

        // 画像を圧縮（必要に応じて）
        val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
        val outputStream = ByteArrayOutputStream()
        bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 85, outputStream)
        val compressedBytes = outputStream.toByteArray()

        val base64 = Base64.encodeToString(compressedBytes, Base64.NO_WRAP)
        return Pair(base64, "image/jpeg")
    }

    /**
     * AI応答からRecognizedFoodリストをパース
     * 食品データベースと照合して、見つかった場合はDBの栄養データを使用
     */
    private fun parseRecognitionResponse(jsonText: String): List<RecognizedFood> {
        return try {
            // JSON部分を抽出（```json ... ``` で囲まれている場合に対応）
            val jsonString = extractJson(jsonText)
            val json = JSONObject(jsonString)
            val foodsArray = json.optJSONArray("foods") ?: return emptyList()

            val result = mutableListOf<RecognizedFood>()
            baseFoodsData.clear() // 基準データをクリア

            for (i in 0 until foodsArray.length()) {
                val foodJson = foodsArray.getJSONObject(i)
                val nutritionJson = foodJson.optJSONObject("nutritionPer100g")

                val aiName = foodJson.optString("name", "不明")
                    .replace("(", "（").replace(")", "）") // 括弧を全角に統一
                val amount = foodJson.optDouble("amount", 100.0).toFloat()
                val confidence = foodJson.optDouble("confidence", 0.8).toFloat()

                // 食品データベースから検索（類義語も考慮）
                val dbFood = findFoodInDatabase(aiName)

                if (dbFood != null) {
                    // 基準データを保存（量の増減計算用）
                    baseFoodsData[dbFood.name] = dbFood

                    // データベースに見つかった場合、DBの栄養データを使用
                    val ratio = amount / 100f
                    result.add(
                        RecognizedFood(
                            name = dbFood.name,
                            calories = (dbFood.calories * ratio).toInt(),
                            protein = dbFood.protein * ratio,
                            carbs = dbFood.carbs * ratio,
                            fat = dbFood.fat * ratio,
                            confidence = confidence,
                            servingSize = "${amount.toInt()}g",
                            amount = amount,
                            // 食物繊維
                            fiber = dbFood.fiber * ratio,
                            solubleFiber = dbFood.solubleFiber * ratio,
                            insolubleFiber = dbFood.insolubleFiber * ratio,
                            // 糖質
                            sugar = dbFood.sugar * ratio,
                            // 脂肪酸
                            saturatedFat = dbFood.saturatedFat * ratio,
                            mediumChainFat = 0f, // FoodItemにはないため0
                            monounsaturatedFat = dbFood.monounsaturatedFat * ratio,
                            polyunsaturatedFat = dbFood.polyunsaturatedFat * ratio,
                            // 品質指標
                            gi = dbFood.gi ?: 0,
                            diaas = dbFood.diaas,
                            // ビタミン13種
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
                            // ミネラル13種
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
                    )
                } else {
                    // データベースに見つからない場合、AIの栄養データを使用
                    baseFoodsData[aiName] = null // 基準データなし

                    val caloriesPer100g = nutritionJson?.optDouble("calories", 0.0)?.toFloat() ?: 0f
                    val proteinPer100g = nutritionJson?.optDouble("protein", 0.0)?.toFloat() ?: 0f
                    val carbsPer100g = nutritionJson?.optDouble("carbs", 0.0)?.toFloat() ?: 0f
                    val fatPer100g = nutritionJson?.optDouble("fat", 0.0)?.toFloat() ?: 0f

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
            }
            result
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    /**
     * 食品データベースから食品を検索（類義語とスコアリングを使用）
     */
    private fun findFoodInDatabase(name: String): FoodItem? {
        // 検索名リストを生成（元の名前 + 類義語）
        val searchNames = mutableListOf(name)
        synonymMap[name]?.let { searchNames.addAll(it) }

        // 全食品からスコアリングで検索
        val allFoods = FoodDatabase.allFoods
        var bestMatch: FoodItem? = null
        var bestScore = 0

        for (food in allFoods) {
            var score = 0
            for (searchName in searchNames) {
                when {
                    // 完全一致（最高優先度）
                    food.name == searchName -> score = maxOf(score, 100)
                    // 前方一致
                    food.name.startsWith(searchName) -> score = maxOf(score, 80)
                    // 食品名が検索名を含む
                    food.name.contains(searchName) -> score = maxOf(score, 60)
                    // 検索名が食品名を含む
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

    /**
     * テキストからJSON部分を抽出
     */
    private fun extractJson(text: String): String {
        // ```json ... ``` 形式の場合
        val jsonBlockPattern = Regex("```json\\s*([\\s\\S]*?)\\s*```")
        val jsonBlockMatch = jsonBlockPattern.find(text)
        if (jsonBlockMatch != null) {
            return jsonBlockMatch.groupValues[1].trim()
        }

        // ``` ... ``` 形式の場合
        val codeBlockPattern = Regex("```\\s*([\\s\\S]*?)\\s*```")
        val codeBlockMatch = codeBlockPattern.find(text)
        if (codeBlockMatch != null) {
            return codeBlockMatch.groupValues[1].trim()
        }

        // { で始まる部分を探す
        val jsonStart = text.indexOf('{')
        val jsonEnd = text.lastIndexOf('}')
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
            return text.substring(jsonStart, jsonEnd + 1)
        }

        return text
    }

    fun retakePhoto() {
        _uiState.update {
            it.copy(
                capturedImageUri = null,
                recognizedFoods = emptyList(),
                analysisComplete = false
            )
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    /**
     * 食品を削除
     */
    fun removeFood(foodName: String) {
        _uiState.update { state ->
            state.copy(
                recognizedFoods = state.recognizedFoods.filter { it.name != foodName }
            )
        }
        baseFoodsData.remove(foodName)
    }

    /**
     * 食品を候補で差し替え
     */
    fun replaceFood(originalName: String, newFood: FoodItem, originalAmount: Float) {
        val ratio = originalAmount / 100f
        baseFoodsData.remove(originalName)
        baseFoodsData[newFood.name] = newFood

        _uiState.update { state ->
            val updatedFoods = state.recognizedFoods.map { food ->
                if (food.name == originalName) {
                    RecognizedFood(
                        name = newFood.name,
                        calories = (newFood.calories * ratio).toInt(),
                        protein = newFood.protein * ratio,
                        carbs = newFood.carbs * ratio,
                        fat = newFood.fat * ratio,
                        confidence = 1.0f, // 手動選択なので信頼度100%
                        servingSize = "${originalAmount.toInt()}g",
                        amount = originalAmount,
                        fiber = newFood.fiber * ratio,
                        solubleFiber = newFood.solubleFiber * ratio,
                        insolubleFiber = newFood.insolubleFiber * ratio,
                        sugar = newFood.sugar * ratio,
                        saturatedFat = newFood.saturatedFat * ratio,
                        mediumChainFat = 0f,
                        monounsaturatedFat = newFood.monounsaturatedFat * ratio,
                        polyunsaturatedFat = newFood.polyunsaturatedFat * ratio,
                        gi = newFood.gi ?: 0,
                        diaas = newFood.diaas,
                        vitaminA = newFood.vitaminA * ratio,
                        vitaminB1 = newFood.vitaminB1 * ratio,
                        vitaminB2 = newFood.vitaminB2 * ratio,
                        vitaminB6 = newFood.vitaminB6 * ratio,
                        vitaminB12 = newFood.vitaminB12 * ratio,
                        vitaminC = newFood.vitaminC * ratio,
                        vitaminD = newFood.vitaminD * ratio,
                        vitaminE = newFood.vitaminE * ratio,
                        vitaminK = newFood.vitaminK * ratio,
                        niacin = newFood.niacin * ratio,
                        pantothenicAcid = newFood.pantothenicAcid * ratio,
                        biotin = newFood.biotin * ratio,
                        folicAcid = newFood.folicAcid * ratio,
                        sodium = newFood.sodium * ratio,
                        potassium = newFood.potassium * ratio,
                        calcium = newFood.calcium * ratio,
                        magnesium = newFood.magnesium * ratio,
                        phosphorus = newFood.phosphorus * ratio,
                        iron = newFood.iron * ratio,
                        zinc = newFood.zinc * ratio,
                        copper = newFood.copper * ratio,
                        manganese = newFood.manganese * ratio,
                        iodine = newFood.iodine * ratio,
                        selenium = newFood.selenium * ratio,
                        chromium = newFood.chromium * ratio,
                        molybdenum = newFood.molybdenum * ratio,
                        category = newFood.category,
                        isFromDatabase = true
                    )
                } else {
                    food
                }
            }
            state.copy(recognizedFoods = updatedFoods)
        }
    }

    /**
     * 食品名で候補を検索（1文字以上でヒット、ニュアンスマッチ対応）
     * カスタム食品も含めて検索
     */
    fun searchFoodCandidates(query: String): List<FoodItem> {
        if (query.isEmpty()) return emptyList()
        val normalizedQuery = query.trim().lowercase()

        // DBの食品をスコアリング
        val dbResults = FoodDatabase.allFoods.map { food ->
            val normalizedName = food.name.lowercase()
            val score = calculateSearchScore(normalizedName, normalizedQuery)
            Pair(food, score)
        }

        // カスタム食品をFoodItemに変換してスコアリング（優先度+10でカスタム食品を上位に）
        val customResults = userCustomFoods.map { customFood ->
            val foodItem = customFoodToFoodItem(customFood)
            val normalizedName = customFood.name.lowercase()
            val score = calculateSearchScore(normalizedName, normalizedQuery)
            // カスタム食品は同スコアならDB食品より優先
            Pair(foodItem, if (score > 0) score + 10 else 0)
        }

        // 結合してソート
        return (dbResults + customResults)
            .filter { it.second > 0 }
            .sortedByDescending { it.second }
            .take(30)
            .map { it.first }
    }

    /**
     * 検索スコアを計算（高いほど関連性が高い）
     */
    private fun calculateSearchScore(foodName: String, query: String): Int {
        var score = 0

        // 完全一致（最高優先度）
        if (foodName == query) score += 100

        // 前方一致
        if (foodName.startsWith(query)) score += 80

        // 部分一致（クエリが食品名に含まれる）
        if (foodName.contains(query)) score += 60

        // 食品名がクエリに含まれる
        if (query.contains(foodName)) score += 40

        // 各文字が順番に含まれているか（ニュアンスマッチ）
        if (score == 0) {
            var queryIndex = 0
            for (char in foodName) {
                if (queryIndex < query.length && char == query[queryIndex]) {
                    queryIndex++
                }
            }
            if (queryIndex == query.length) score += 20
        }

        // 1文字でも一致すればヒット（最低優先度）
        if (score == 0) {
            val matchCount = query.count { foodName.contains(it) }
            if (matchCount > 0) {
                score += matchCount * 5
            }
        }

        return score
    }

    fun setMealNumber(number: Int) {
        _uiState.update { it.copy(selectedMealNumber = number) }
    }

    /**
     * 食品の量を更新（増減）
     */
    fun updateFoodAmount(foodName: String, newAmount: Float) {
        val baseFood = baseFoodsData[foodName]
        val ratio = newAmount / 100f

        _uiState.update { state ->
            val updatedFoods = state.recognizedFoods.map { food ->
                if (food.name == foodName) {
                    if (baseFood != null) {
                        // データベースの基準データから再計算
                        food.copy(
                            amount = newAmount,
                            servingSize = "${newAmount.toInt()}g",
                            calories = (baseFood.calories * ratio).toInt(),
                            protein = baseFood.protein * ratio,
                            carbs = baseFood.carbs * ratio,
                            fat = baseFood.fat * ratio,
                            // 食物繊維
                            fiber = baseFood.fiber * ratio,
                            solubleFiber = baseFood.solubleFiber * ratio,
                            insolubleFiber = baseFood.insolubleFiber * ratio,
                            // 糖質
                            sugar = baseFood.sugar * ratio,
                            // 脂肪酸
                            saturatedFat = baseFood.saturatedFat * ratio,
                            mediumChainFat = 0f, // FoodItemにはmediumChainFatがないため0
                            monounsaturatedFat = baseFood.monounsaturatedFat * ratio,
                            polyunsaturatedFat = baseFood.polyunsaturatedFat * ratio,
                            // ビタミン13種
                            vitaminA = baseFood.vitaminA * ratio,
                            vitaminB1 = baseFood.vitaminB1 * ratio,
                            vitaminB2 = baseFood.vitaminB2 * ratio,
                            vitaminB6 = baseFood.vitaminB6 * ratio,
                            vitaminB12 = baseFood.vitaminB12 * ratio,
                            vitaminC = baseFood.vitaminC * ratio,
                            vitaminD = baseFood.vitaminD * ratio,
                            vitaminE = baseFood.vitaminE * ratio,
                            vitaminK = baseFood.vitaminK * ratio,
                            niacin = baseFood.niacin * ratio,
                            pantothenicAcid = baseFood.pantothenicAcid * ratio,
                            biotin = baseFood.biotin * ratio,
                            folicAcid = baseFood.folicAcid * ratio,
                            // ミネラル13種
                            sodium = baseFood.sodium * ratio,
                            potassium = baseFood.potassium * ratio,
                            calcium = baseFood.calcium * ratio,
                            magnesium = baseFood.magnesium * ratio,
                            phosphorus = baseFood.phosphorus * ratio,
                            iron = baseFood.iron * ratio,
                            zinc = baseFood.zinc * ratio,
                            copper = baseFood.copper * ratio,
                            manganese = baseFood.manganese * ratio,
                            iodine = baseFood.iodine * ratio,
                            selenium = baseFood.selenium * ratio,
                            chromium = baseFood.chromium * ratio,
                            molybdenum = baseFood.molybdenum * ratio
                        )
                    } else {
                        // 基準データがない場合は比率で再計算
                        val currentRatio = newAmount / food.amount
                        food.copy(
                            amount = newAmount,
                            servingSize = "${newAmount.toInt()}g",
                            calories = (food.calories * currentRatio).toInt(),
                            protein = food.protein * currentRatio,
                            carbs = food.carbs * currentRatio,
                            fat = food.fat * currentRatio,
                            // 食物繊維
                            fiber = food.fiber * currentRatio,
                            solubleFiber = food.solubleFiber * currentRatio,
                            insolubleFiber = food.insolubleFiber * currentRatio,
                            // 糖質
                            sugar = food.sugar * currentRatio,
                            // 脂肪酸
                            saturatedFat = food.saturatedFat * currentRatio,
                            mediumChainFat = food.mediumChainFat * currentRatio,
                            monounsaturatedFat = food.monounsaturatedFat * currentRatio,
                            polyunsaturatedFat = food.polyunsaturatedFat * currentRatio,
                            // ビタミン13種
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
                            // ミネラル13種
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
        val userId = authRepository.getCurrentUserId() ?: return
        val foods = _uiState.value.recognizedFoods
        if (foods.isEmpty()) return

        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, error = null) }

            try {
                // MealItemリストを作成（すべての栄養素を含む）
                val mealItems = foods.map { food ->
                    MealItem(
                        name = food.name,
                        amount = food.amount,
                        unit = "g",
                        calories = MealItem.calculateCalories(food.protein, food.fat, food.carbs),
                        protein = food.protein,
                        carbs = food.carbs,
                        fat = food.fat,
                        // 食物繊維
                        fiber = food.fiber,
                        solubleFiber = food.solubleFiber,
                        insolubleFiber = food.insolubleFiber,
                        // 糖質
                        sugar = food.sugar,
                        // 脂肪酸
                        saturatedFat = food.saturatedFat,
                        mediumChainFat = food.mediumChainFat,
                        monounsaturatedFat = food.monounsaturatedFat,
                        polyunsaturatedFat = food.polyunsaturatedFat,
                        // 品質指標
                        diaas = food.diaas,
                        gi = food.gi,
                        // ビタミン13種
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
                        // ミネラル13種
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

                // 合計値を計算
                val totalCalories = foods.sumOf { it.calories }
                val totalProtein = foods.sumOf { it.protein.toDouble() }.toFloat()
                val totalCarbs = foods.sumOf { it.carbs.toDouble() }.toFloat()
                val totalFat = foods.sumOf { it.fat.toDouble() }.toFloat()
                val totalFiber = foods.sumOf { it.fiber.toDouble() }.toFloat()

                // GL計算（GI × 炭水化物g / 100）
                val totalGL = foods.sumOf { (it.gi * it.carbs / 100f).toDouble() }.toFloat()

                val now = System.currentTimeMillis()
                // 食事番号からMealTypeに変換
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
                    time = java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault()).format(java.util.Date()),
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
                    timestamp = now,
                    createdAt = now
                )

                val result = mealRepository.addMeal(meal)
                if (result.isSuccess) {
                    // DB未登録の食品をカスタム食品として自動保存
                    saveCustomFoodsFromRecognition(userId, foods)
                    // バッジ統計更新＆チェック
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

    /**
     * DB未登録の食品をカスタム食品として自動保存
     * 同名の食品が既に存在する場合は使用回数をインクリメント
     */
    private fun saveCustomFoodsFromRecognition(userId: String, foods: List<RecognizedFood>) {
        viewModelScope.launch {
            foods.filter { !it.isFromDatabase }.forEach { food ->
                try {
                    // 100gあたりの栄養素を計算（現在の量から逆算）
                    val ratio = 100f / food.amount.coerceAtLeast(1f)
                    val caloriesPer100g = (food.calories * ratio).toInt()
                    val proteinPer100g = food.protein * ratio
                    val carbsPer100g = food.carbs * ratio
                    val fatPer100g = food.fat * ratio
                    val fiberPer100g = food.fiber * ratio

                    // 食品名から括弧部分を除去
                    val cleanName = food.name.split("（").first().trim()

                    // 同名のカスタム食品が既に存在するか確認
                    val existing = customFoodRepository.getCustomFoodByName(userId, cleanName).getOrNull()

                    if (existing != null) {
                        // 既存の場合は使用回数をインクリメント
                        customFoodRepository.incrementUsage(userId, existing.id)
                    } else {
                        // 新規作成
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
                            createdAt = System.currentTimeMillis()
                        )
                        customFoodRepository.saveCustomFood(customFood)
                    }
                } catch (e: Exception) {
                    // カスタム食品保存エラーは無視（メインの食事保存は成功しているため）
                    android.util.Log.w("AiFoodRecognition", "Failed to save custom food: ${food.name}", e)
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
            android.util.Log.d("AiFoodRecognitionVM", "updateBadgeStats: meal_recorded")
            badgeRepository.updateBadgeStats("meal_recorded")
            // checkAndAwardBadgesはDashboardViewModelで呼ぶ（モーダル表示のため）
        }
    }
}

/**
 * 写真解析画面
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AiFoodRecognitionScreen(
    viewModel: AiFoodRecognitionViewModel = koinViewModel(),
    onNavigateBack: () -> Unit,
    onFoodsConfirmed: (List<RecognizedFood>) -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val snackbarHostState = remember { SnackbarHostState() }

    // ContextをViewModelに設定
    LaunchedEffect(Unit) {
        viewModel.setContext(context)
    }

    // カメラ権限リクエスト
    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        viewModel.setCameraPermission(isGranted)
        if (!isGranted) {
            Toast.makeText(context, "カメラの権限が必要です", Toast.LENGTH_SHORT).show()
        }
    }

    // 初回起動時に権限チェック
    LaunchedEffect(Unit) {
        val permission = Manifest.permission.CAMERA
        val granted = ContextCompat.checkSelfPermission(context, permission) ==
            android.content.pm.PackageManager.PERMISSION_GRANTED
        if (granted) {
            viewModel.setCameraPermission(true)
        } else {
            permissionLauncher.launch(permission)
        }
    }

    // エラー表示
    LaunchedEffect(uiState.error) {
        uiState.error?.let { error ->
            snackbarHostState.showSnackbar(error)
            viewModel.clearError()
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text("写真解析") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "戻る")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.Transparent
                )
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when {
                !uiState.hasCameraPermission -> {
                    // 権限がない場合
                    PermissionDeniedContent(
                        onRequestPermission = {
                            permissionLauncher.launch(Manifest.permission.CAMERA)
                        }
                    )
                }
                uiState.capturedImageUri == null -> {
                    // カメラプレビュー
                    CameraPreviewContent(
                        onImageCaptured = { uri ->
                            viewModel.onImageCaptured(uri)
                        }
                    )
                }
                else -> {
                    // 撮影済み画像と分析結果
                    ImageAnalysisContent(
                        imageUri = uiState.capturedImageUri!!,
                        isAnalyzing = uiState.isAnalyzing,
                        isSaving = uiState.isSaving,
                        recognizedFoods = uiState.recognizedFoods,
                        analysisComplete = uiState.analysisComplete,
                        selectedMealNumber = uiState.selectedMealNumber,
                        mealsPerDay = uiState.mealsPerDay,
                        onAnalyze = { viewModel.analyzeImage() },
                        onRetake = { viewModel.retakePhoto() },
                        onMealNumberSelected = { viewModel.setMealNumber(it) },
                        onAmountChanged = { name, amount -> viewModel.updateFoodAmount(name, amount) },
                        onRemoveFood = { name -> viewModel.removeFood(name) },
                        onSearchCandidates = { query -> viewModel.searchFoodCandidates(query) },
                        onReplaceFood = { originalName, newFood, amount -> viewModel.replaceFood(originalName, newFood, amount) },
                        onSave = { viewModel.saveMeal(onNavigateBack) }
                    )
                }
            }
        }
    }
}

/**
 * 権限拒否時のコンテンツ
 */
@Composable
private fun PermissionDeniedContent(
    onRequestPermission: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Default.CameraAlt,
            contentDescription = null,
            modifier = Modifier.size(80.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "カメラの権限が必要です",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "食品を撮影してAIで認識するには\nカメラへのアクセスを許可してください",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(32.dp))

        Button(
            onClick = onRequestPermission,
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Primary)
        ) {
            Text("権限を許可する")
        }
    }
}

/**
 * カメラプレビューコンテンツ
 */
@Composable
private fun CameraPreviewContent(
    onImageCaptured: (Uri) -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    var imageCapture: ImageCapture? by remember { mutableStateOf(null) }
    var isCapturing by remember { mutableStateOf(false) }

    // ギャラリーから画像を選択するランチャー
    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let { onImageCaptured(it) }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        // カメラプレビュー
        AndroidView(
            factory = { ctx ->
                val previewView = PreviewView(ctx)
                val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)

                cameraProviderFuture.addListener({
                    val cameraProvider = cameraProviderFuture.get()

                    val preview = Preview.Builder().build().also {
                        it.setSurfaceProvider(previewView.surfaceProvider)
                    }

                    imageCapture = ImageCapture.Builder()
                        .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                        .build()

                    val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

                    try {
                        cameraProvider.unbindAll()
                        cameraProvider.bindToLifecycle(
                            lifecycleOwner,
                            cameraSelector,
                            preview,
                            imageCapture
                        )
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }, ContextCompat.getMainExecutor(ctx))

                previewView
            },
            modifier = Modifier.fillMaxSize()
        )

        // ガイドオーバーレイ
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            contentAlignment = Alignment.Center
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(4f / 3f)
                    .border(2.dp, Color.White.copy(alpha = 0.5f), RoundedCornerShape(16.dp))
            )
        }

        // 撮影ヒント
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

        // 下部ボタンエリア
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
                onClick = { galleryLauncher.launch("image/*") },
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
                onClick = {
                    if (!isCapturing) {
                        isCapturing = true
                        takePhoto(
                            context = context,
                            imageCapture = imageCapture,
                            onImageCaptured = { uri ->
                                isCapturing = false
                                onImageCaptured(uri)
                            },
                            onError = {
                                isCapturing = false
                            }
                        )
                    }
                },
                modifier = Modifier
                    .size(72.dp)
                    .background(Color.White, CircleShape)
                    .border(4.dp, Primary, CircleShape)
            ) {
                if (isCapturing) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(32.dp),
                        color = Primary,
                        strokeWidth = 3.dp
                    )
                } else {
                    Icon(
                        imageVector = Icons.Default.CameraAlt,
                        contentDescription = "撮影",
                        tint = Primary,
                        modifier = Modifier.size(32.dp)
                    )
                }
            }

            // スペーサー（左右対称にするため）
            Spacer(modifier = Modifier.size(56.dp))
        }
    }
}

/**
 * 画像分析コンテンツ
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ImageAnalysisContent(
    imageUri: Uri,
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

    // カスタム食品登録通知ダイアログの状態
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
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.Add,
                                contentDescription = null,
                                tint = AccentGreen,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                food.name,
                                style = MaterialTheme.typography.bodyMedium
                            )
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
            AsyncImage(
                model = imageUri,
                contentDescription = "撮影した食品",
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Fit
            )

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
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
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
                // 設定回数と選択中の番号の大きい方+1まで表示（無制限に追加可能）
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
                        searchQuery = food.name.take(3) // 最初の3文字で検索開始
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
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = Primary.copy(alpha = 0.1f)
                )
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
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
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
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .background(AccentGreen, CircleShape)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "八訂DB: ${dbMatchCount}件",
                                style = MaterialTheme.typography.bodySmall,
                                color = AccentGreen
                            )
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
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
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
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

                    // 検索フィールド
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

                    // 検索結果
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
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 2.dp),
                                    colors = CardDefaults.cardColors(
                                        containerColor = MaterialTheme.colorScheme.surfaceVariant
                                    )
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(8.dp),
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

/**
 * 認識された食品カード（量の増減ボタン付き）
 */
@Composable
private fun RecognizedFoodCard(
    food: RecognizedFood,
    onAmountChanged: (Float) -> Unit,
    onRemove: () -> Unit,
    onReplace: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp)
        ) {
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
                    // データベースマッチ表示
                    Text(
                        text = if (food.isFromDatabase) "八訂DB" else "AI推定",
                        style = MaterialTheme.typography.labelSmall,
                        color = if (food.isFromDatabase) AccentGreen else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "${food.calories}kcal",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = Primary
                    )
                    // PFCを色分け表示
                    Row {
                        Text(
                            text = "P${food.protein.toInt()}",
                            style = MaterialTheme.typography.labelSmall,
                            color = ScoreProtein
                        )
                        Text(
                            text = " F${food.fat.toInt()}",
                            style = MaterialTheme.typography.labelSmall,
                            color = ScoreFat
                        )
                        Text(
                            text = " C${food.carbs.toInt()}",
                            style = MaterialTheme.typography.labelSmall,
                            color = ScoreCarbs
                        )
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
                        imageVector = Icons.Default.SwapHoriz,
                        contentDescription = "差し替え",
                        modifier = Modifier.size(16.dp),
                        tint = Primary
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "差替",
                        style = MaterialTheme.typography.labelSmall,
                        color = Primary
                    )
                }

                // 量の増減ボタン
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // -10g ボタン
                    IconButton(
                        onClick = {
                            val newAmount = (food.amount - 10f).coerceAtLeast(10f)
                            onAmountChanged(newAmount)
                        },
                        modifier = Modifier
                            .size(32.dp)
                            .background(MaterialTheme.colorScheme.surfaceVariant, CircleShape)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Remove,
                            contentDescription = "-10g",
                            modifier = Modifier.size(16.dp)
                        )
                    }

                    // 現在の量表示
                    Text(
                        text = "${food.amount.toInt()}g",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier
                            .width(50.dp)
                            .padding(horizontal = 4.dp),
                        textAlign = TextAlign.Center
                    )

                    // +10g ボタン
                    IconButton(
                        onClick = {
                            val newAmount = food.amount + 10f
                            onAmountChanged(newAmount)
                        },
                        modifier = Modifier
                            .size(32.dp)
                            .background(Primary.copy(alpha = 0.2f), CircleShape)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Add,
                            contentDescription = "+10g",
                            modifier = Modifier.size(16.dp),
                            tint = Primary
                        )
                    }
                }

                // 削除ボタン
                IconButton(
                    onClick = onRemove,
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "削除",
                        modifier = Modifier.size(18.dp),
                        tint = MaterialTheme.colorScheme.error
                    )
                }
            }
        }
    }
}

/**
 * 栄養素チップ
 */
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

/**
 * 写真を撮影
 */
private fun takePhoto(
    context: Context,
    imageCapture: ImageCapture?,
    onImageCaptured: (Uri) -> Unit,
    onError: () -> Unit
) {
    val imageCapture = imageCapture ?: return

    val photoFile = File(
        context.cacheDir,
        SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault())
            .format(System.currentTimeMillis()) + ".jpg"
    )

    val outputOptions = ImageCapture.OutputFileOptions.Builder(photoFile).build()

    imageCapture.takePicture(
        outputOptions,
        ContextCompat.getMainExecutor(context),
        object : ImageCapture.OnImageSavedCallback {
            override fun onImageSaved(outputFileResults: ImageCapture.OutputFileResults) {
                onImageCaptured(Uri.fromFile(photoFile))
            }

            override fun onError(exception: ImageCaptureException) {
                exception.printStackTrace()
                onError()
            }
        }
    )
}
