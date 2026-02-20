package com.yourcoach.plus.shared.ui.screens.settings

import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
import com.yourcoach.plus.shared.domain.model.CustomFood
import com.yourcoach.plus.shared.domain.model.CustomQuest
import com.yourcoach.plus.shared.domain.model.CustomQuestSlot
import com.yourcoach.plus.shared.domain.model.User
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.CustomFoodRepository
import com.yourcoach.plus.shared.domain.repository.CustomQuestRepository
import com.yourcoach.plus.shared.domain.repository.UserRepository
import com.yourcoach.plus.shared.domain.service.GeminiService
import com.yourcoach.plus.shared.util.DateUtil
import com.yourcoach.plus.shared.util.invokeCloudFunction
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.floatOrNull
import kotlinx.serialization.json.intOrNull

/**
 * Settings screen UI state
 */
data class SettingsUiState(
    val isLoading: Boolean = false,
    val selectedTabIndex: Int = 0,
    val user: User? = null,
    val isPremium: Boolean = false,
    val notificationsEnabled: Boolean = true,
    val appVersion: String = "2.1.4",
    val error: String? = null,
    val isDeletingAccount: Boolean = false,
    val needsReauthentication: Boolean = false,
    val pendingDeleteUserId: String? = null,
    val isAddingCredits: Boolean = false,
    val creditsAddedMessage: String? = null,
    // Profile photo
    val isUploadingPhoto: Boolean = false,
    // Custom food management
    val customFoods: List<CustomFood> = emptyList(),
    val isLoadingCustomFoods: Boolean = false,
    val customFoodActionMessage: String? = null,
    // AI nutrition analysis
    val freeCredits: Int = 0,
    val paidCredits: Int = 0,
    val isAnalyzingNutrition: Boolean = false,
    val analyzingFoodId: String? = null,
    // Organization (B2B2C)
    val organizationName: String? = null,
    val isValidatingOrganization: Boolean = false,
    val organizationMessage: String? = null,
    // Custom quest slots
    val customQuestSlots: Map<String, CustomQuestSlot> = emptyMap(),
    val customQuestDate: String? = null
)

/**
 * Settings item
 */
enum class SettingsItem(val title: String, val emoji: String) {
    PROFILE("Profile Settings", "person"),
    GOALS("Goal Settings", "target"),
    NOTIFICATIONS("Notification Settings", "bell"),
    BADGES("Achievements", "trophy"),
    PREMIUM("Premium", "star"),
    DATA_EXPORT("Data Export", "chart"),
    HELP("Help", "question"),
    FEEDBACK("Feedback", "message"),
    TERMS("Terms of Service", "document"),
    PRIVACY("Privacy Policy", "lock"),
    ABOUT("About", "info"),
    LOGOUT("Logout", "logout")
}

/**
 * Settings screen ScreenModel (Voyager)
 */
class SettingsScreenModel(
    private val authRepository: AuthRepository,
    private val userRepository: UserRepository,
    private val customFoodRepository: CustomFoodRepository,
    private val customQuestRepository: CustomQuestRepository? = null,
    private val geminiService: GeminiService? = null
) : ScreenModel {

    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    private val exceptionHandler = CoroutineExceptionHandler { _, throwable ->
        println("SettingsScreenModel: Coroutine exception: ${throwable.message}")
        _uiState.update { it.copy(isLoading = false, error = "エラーが発生しました") }
    }

    init {
        loadUserInfo()
        loadCustomFoods()
        loadCustomQuestSlots()
    }

    fun updateSelectedTab(index: Int) {
        _uiState.update { it.copy(selectedTabIndex = index) }
    }

    /**
     * Load user info
     */
    fun loadUserInfo() {
        screenModelScope.launch(exceptionHandler) {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val userId = authRepository.getCurrentUserId()
                if (userId != null) {
                    val result = userRepository.getUser(userId)
                    result.onSuccess { user ->
                        // displayNameが未設定の場合、Auth情報から補完
                        val enrichedUser = if (user != null && user.displayName.isNullOrBlank()) {
                            val authUser = authRepository.getCurrentUser()
                            val authDisplayName = authUser?.displayName?.takeIf { it.isNotBlank() }
                                ?: authUser?.email?.takeIf { it.isNotBlank() }?.substringBefore("@")
                            if (authDisplayName != null) {
                                user.copy(displayName = authDisplayName)
                            } else {
                                user
                            }
                        } else {
                            user
                        }

                        _uiState.update {
                            it.copy(
                                user = enrichedUser,
                                isPremium = enrichedUser?.isEffectivePremium ?: false,
                                freeCredits = enrichedUser?.freeCredits ?: 0,
                                paidCredits = enrichedUser?.paidCredits ?: 0,
                                organizationName = enrichedUser?.organizationName ?: enrichedUser?.b2b2cOrgName,
                                isLoading = false
                            )
                        }
                    }.onFailure { error ->
                        _uiState.update {
                            it.copy(
                                error = error.message,
                                isLoading = false
                            )
                        }
                    }
                } else {
                    _uiState.update { it.copy(isLoading = false) }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        error = e.message ?: "Failed to load user info",
                        isLoading = false
                    )
                }
            }
        }
    }

    /**
     * Toggle notification settings
     */
    fun toggleNotifications(enabled: Boolean) {
        _uiState.update { it.copy(notificationsEnabled = enabled) }
    }

    /**
     * サインアウト（結果を直接返す。UI側でナビゲーション処理）
     */
    suspend fun signOutAndReturn(): Result<Unit> {
        return try {
            authRepository.signOut()
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * アカウント削除（結果を直接返す。UI側でナビゲーション処理）
     * CF側でStripeサブスク解約・Firestoreデータ削除・Firebase Auth削除を一括実行
     */
    suspend fun deleteAccountAndReturn(): Result<Unit> {
        _uiState.update { it.copy(isDeletingAccount = true) }
        return try {
            val userId = authRepository.getCurrentUserId()
            if (userId == null) {
                _uiState.update { it.copy(isDeletingAccount = false) }
                return Result.failure(Exception("ログイン状態を確認できません"))
            }

            invokeCloudFunction(
                region = "asia-northeast2",
                functionName = "deleteAccount",
                data = emptyMap()
            )
            authRepository.signOut()

            _uiState.update { it.copy(isDeletingAccount = false) }
            Result.success(Unit)
        } catch (e: Exception) {
            _uiState.update { it.copy(isDeletingAccount = false) }
            Result.failure(Exception("アカウント削除に失敗しました: ${e.message}"))
        }
    }

    /**
     * Clear error
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    /**
     * Clear credits added message
     */
    fun clearCreditsAddedMessage() {
        _uiState.update { it.copy(creditsAddedMessage = null) }
    }

    // ========== Custom Food Management ==========

    /**
     * Load custom foods
     */
    fun loadCustomFoods() {
        screenModelScope.launch(exceptionHandler) {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            _uiState.update { it.copy(isLoadingCustomFoods = true) }

            customFoodRepository.getCustomFoods(userId)
                .onSuccess { foods ->
                    _uiState.update {
                        it.copy(
                            customFoods = foods,
                            isLoadingCustomFoods = false
                        )
                    }
                }
                .onFailure { e ->
                    _uiState.update {
                        it.copy(
                            isLoadingCustomFoods = false,
                            error = e.message ?: "Failed to load custom foods"
                        )
                    }
                }
        }
    }

    /**
     * Load custom quest slots for today
     */
    fun loadCustomQuestSlots() {
        val repo = customQuestRepository ?: return
        screenModelScope.launch(exceptionHandler) {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            val today = DateUtil.todayString()

            repo.getCustomQuest(userId, today)
                .onSuccess { quest ->
                    _uiState.update {
                        it.copy(
                            customQuestSlots = quest?.slots ?: emptyMap(),
                            customQuestDate = if (quest != null) today else null
                        )
                    }
                }
                .onFailure { e ->
                    println("SettingsScreenModel: loadCustomQuestSlots error: ${e.message}")
                }
        }
    }

    /**
     * Update custom food
     */
    fun updateCustomFood(
        foodId: String,
        name: String,
        calories: Int,
        protein: Float,
        carbs: Float,
        fat: Float,
        fiber: Float = 0f
    ) {
        screenModelScope.launch(exceptionHandler) {
            val userId = authRepository.getCurrentUserId() ?: return@launch

            customFoodRepository.updateCustomFood(userId, foodId, mapOf(
                "name" to name,
                "calories" to calories,
                "protein" to protein,
                "carbs" to carbs,
                "fat" to fat,
                "fiber" to fiber
            )).onSuccess {
                _uiState.update {
                    it.copy(customFoodActionMessage = "Updated \"$name\"")
                }
                loadCustomFoods()
            }.onFailure { e ->
                _uiState.update {
                    it.copy(error = "Update failed: ${e.message}")
                }
            }
        }
    }

    /**
     * Delete custom food
     */
    fun deleteCustomFood(foodId: String) {
        screenModelScope.launch(exceptionHandler) {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            val food = _uiState.value.customFoods.find { it.id == foodId }

            customFoodRepository.deleteCustomFood(userId, foodId)
                .onSuccess {
                    _uiState.update {
                        it.copy(customFoodActionMessage = "Deleted \"${food?.name ?: "food"}\"")
                    }
                    loadCustomFoods()
                }
                .onFailure { e ->
                    _uiState.update {
                        it.copy(error = e.message ?: "Deletion failed")
                    }
                }
        }
    }

    /**
     * Clear custom food action message
     */
    fun clearCustomFoodActionMessage() {
        _uiState.update { it.copy(customFoodActionMessage = null) }
    }

    // ========== Credits ==========

    /**
     * Get total credits
     */
    fun getTotalCredits(): Int {
        val state = _uiState.value
        return if (state.isPremium) state.freeCredits + state.paidCredits else state.freeCredits
    }

    /**
     * デバッグ用: 無料クレジット100追加
     */
    fun addFreeCredits() {
        screenModelScope.launch(exceptionHandler) {
            _uiState.update { it.copy(isAddingCredits = true) }
            try {
                val response = invokeCloudFunction(
                    region = "asia-northeast1",
                    functionName = "debugAddCredits",
                    data = mapOf("amount" to 100)
                )
                val newTotal = (response["newTotal"] as? Number)?.toInt() ?: 0
                val message = response["message"] as? String ?: "クレジットを追加しました"

                _uiState.update {
                    it.copy(
                        isAddingCredits = false,
                        creditsAddedMessage = "$message（合計: $newTotal）"
                    )
                }
                loadUserInfo()
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isAddingCredits = false,
                        error = "クレジットの追加に失敗しました: ${e.message}"
                    )
                }
            }
        }
    }

    // ========== Organization ==========

    /**
     * Clear organization message
     */
    fun clearOrganizationMessage() {
        _uiState.update { it.copy(organizationMessage = null) }
    }

    /**
     * Validate organization name and apply corporate plan
     */
    fun validateOrganization(organizationName: String) {
        if (organizationName.isBlank()) {
            _uiState.update { it.copy(organizationMessage = "所属名を入力してください") }
            return
        }

        screenModelScope.launch(exceptionHandler) {
            _uiState.update { it.copy(isValidatingOrganization = true, organizationMessage = null) }
            try {
                val response = invokeCloudFunction(
                    region = "asia-northeast2",
                    functionName = "validateOrganizationName",
                    data = mapOf("organizationName" to organizationName.trim())
                )
                val success = response["success"] as? Boolean ?: false
                val message = response["message"] as? String ?: "所属を登録しました"
                val orgName = response["organizationName"] as? String

                _uiState.update {
                    it.copy(
                        isValidatingOrganization = false,
                        organizationName = if (success) orgName else it.organizationName,
                        organizationMessage = message
                    )
                }

                if (success) {
                    loadUserInfo()
                }
            } catch (e: Exception) {
                val errorMessage = when {
                    e.message?.contains("not-found") == true -> "この所属名は登録されていません"
                    e.message?.contains("permission-denied") == true -> "この所属は現在無効です"
                    e.message?.contains("resource-exhausted") == true -> "この所属の登録上限に達しています"
                    e.message?.contains("already-exists") == true -> "既に別の所属に登録されています"
                    else -> e.message ?: "所属の検証に失敗しました"
                }
                _uiState.update {
                    it.copy(
                        isValidatingOrganization = false,
                        organizationMessage = errorMessage
                    )
                }
            }
        }
    }

    /**
     * Leave organization
     */
    fun leaveOrganization() {
        screenModelScope.launch(exceptionHandler) {
            _uiState.update { it.copy(isValidatingOrganization = true, organizationMessage = null) }
            try {
                val response = invokeCloudFunction(
                    region = "asia-northeast2",
                    functionName = "leaveOrganization",
                    data = emptyMap()
                )
                val message = response["message"] as? String ?: "所属を解除しました"

                _uiState.update {
                    it.copy(
                        isValidatingOrganization = false,
                        organizationName = null,
                        organizationMessage = message
                    )
                }

                loadUserInfo()
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isValidatingOrganization = false,
                        organizationMessage = e.message ?: "所属の解除に失敗しました"
                    )
                }
            }
        }
    }

    // ========== AI栄養解析 ==========

    /**
     * カスタム食品のミクロ栄養素をAIで解析（1クレジット消費）
     */
    fun analyzeCustomFoodNutrition(foodId: String) {
        val food = _uiState.value.customFoods.find { it.id == foodId } ?: return
        val userId = authRepository.getCurrentUserId() ?: return
        val service = geminiService ?: run {
            _uiState.update { it.copy(error = "AI解析サービスが利用できません") }
            return
        }

        // クレジット残高チェック
        if (getTotalCredits() < 1) {
            _uiState.update { it.copy(error = "クレジットが不足しています") }
            return
        }

        screenModelScope.launch(exceptionHandler) {
            _uiState.update { it.copy(isAnalyzingNutrition = true, analyzingFoodId = foodId) }

            try {
                // 専用プロンプトでミクロ栄養素を推定（クレジット消費込み）
                val prompt = buildNutritionAnalysisPrompt(food)
                val response = service.sendMessageWithCredit(
                    userId = userId,
                    message = prompt,
                    conversationHistory = emptyList(),
                    userProfile = null,
                    model = "gemini-2.5-flash"
                )
                if (response.success && response.text != null) {
                    val nutrients = parseNutritionResponse(response.text!!)

                    if (nutrients != null) {
                        customFoodRepository.updateCustomFood(userId, foodId, nutrients)

                        _uiState.update {
                            it.copy(
                                isAnalyzingNutrition = false,
                                analyzingFoodId = null,
                                customFoodActionMessage = "「${food.name}」の栄養素を解析しました"
                            )
                        }

                        // データを再読み込み
                        loadCustomFoods()
                        loadUserInfo()
                    } else {
                        _uiState.update {
                            it.copy(
                                isAnalyzingNutrition = false,
                                analyzingFoodId = null,
                                error = "栄養素の解析に失敗しました"
                            )
                        }
                    }
                } else {
                    _uiState.update {
                        it.copy(
                            isAnalyzingNutrition = false,
                            analyzingFoodId = null,
                            error = response.error ?: "AI解析に失敗しました"
                        )
                    }
                }
            } catch (e: Exception) {
                println("SettingsScreenModel: analyzeCustomFoodNutrition error: ${e.message}")
                _uiState.update {
                    it.copy(
                        isAnalyzingNutrition = false,
                        analyzingFoodId = null,
                        error = e.message ?: "解析に失敗しました"
                    )
                }
            }
        }
    }

    /**
     * ミクロ栄養素解析用の専用プロンプト
     */
    private fun buildNutritionAnalysisPrompt(food: CustomFood): String {
        return """あなたは栄養学の専門家です。以下の食品の100gあたりのミクロ栄養素を推定してください。

食品名: ${food.name}
既知のマクロ栄養素（100gあたり）:
- カロリー: ${food.calories}kcal
- タンパク質: ${food.protein}g
- 脂質: ${food.fat}g
- 炭水化物: ${food.carbs}g

以下の栄養素を推定し、JSON形式で出力してください。
正確な値が不明でも、食品の特性から妥当な推定値を入力してください。
0は栄養素が本当に含まれない場合のみ使用してください。

出力形式（JSONのみ、説明文不要）:
{
  "fiber": 数値,
  "solubleFiber": 数値,
  "insolubleFiber": 数値,
  "sugar": 数値,
  "gi": 数値(0-100),
  "diaas": 数値(0-1.5),
  "saturatedFat": 数値,
  "monounsaturatedFat": 数値,
  "polyunsaturatedFat": 数値,
  "vitaminA": 数値(μgRAE),
  "vitaminB1": 数値(mg),
  "vitaminB2": 数値(mg),
  "vitaminB6": 数値(mg),
  "vitaminB12": 数値(μg),
  "vitaminC": 数値(mg),
  "vitaminD": 数値(μg),
  "vitaminE": 数値(mg),
  "vitaminK": 数値(μg),
  "niacin": 数値(mgNE),
  "pantothenicAcid": 数値(mg),
  "biotin": 数値(μg),
  "folicAcid": 数値(μg),
  "sodium": 数値(mg),
  "potassium": 数値(mg),
  "calcium": 数値(mg),
  "magnesium": 数値(mg),
  "phosphorus": 数値(mg),
  "iron": 数値(mg),
  "zinc": 数値(mg),
  "copper": 数値(mg),
  "manganese": 数値(mg),
  "iodine": 数値(μg),
  "selenium": 数値(μg),
  "chromium": 数値(μg),
  "molybdenum": 数値(μg)
}"""
    }

    /**
     * AI応答から栄養素データをパース
     */
    private fun parseNutritionResponse(responseText: String): Map<String, Any>? {
        return try {
            val jsonString = extractJson(responseText)
            val jsonElement = Json.parseToJsonElement(jsonString)
            val json = jsonElement.jsonObject

            fun floatVal(key: String): Float =
                json[key]?.jsonPrimitive?.floatOrNull ?: 0f

            fun intVal(key: String): Int =
                json[key]?.jsonPrimitive?.intOrNull ?: 0

            mapOf(
                "fiber" to floatVal("fiber"),
                "solubleFiber" to floatVal("solubleFiber"),
                "insolubleFiber" to floatVal("insolubleFiber"),
                "sugar" to floatVal("sugar"),
                "gi" to floatVal("gi").toInt(),
                "diaas" to floatVal("diaas"),
                "saturatedFat" to floatVal("saturatedFat"),
                "monounsaturatedFat" to floatVal("monounsaturatedFat"),
                "polyunsaturatedFat" to floatVal("polyunsaturatedFat"),
                "vitaminA" to floatVal("vitaminA"),
                "vitaminB1" to floatVal("vitaminB1"),
                "vitaminB2" to floatVal("vitaminB2"),
                "vitaminB6" to floatVal("vitaminB6"),
                "vitaminB12" to floatVal("vitaminB12"),
                "vitaminC" to floatVal("vitaminC"),
                "vitaminD" to floatVal("vitaminD"),
                "vitaminE" to floatVal("vitaminE"),
                "vitaminK" to floatVal("vitaminK"),
                "niacin" to floatVal("niacin"),
                "pantothenicAcid" to floatVal("pantothenicAcid"),
                "biotin" to floatVal("biotin"),
                "folicAcid" to floatVal("folicAcid"),
                "sodium" to floatVal("sodium"),
                "potassium" to floatVal("potassium"),
                "calcium" to floatVal("calcium"),
                "magnesium" to floatVal("magnesium"),
                "phosphorus" to floatVal("phosphorus"),
                "iron" to floatVal("iron"),
                "zinc" to floatVal("zinc"),
                "copper" to floatVal("copper"),
                "manganese" to floatVal("manganese"),
                "iodine" to floatVal("iodine"),
                "selenium" to floatVal("selenium"),
                "chromium" to floatVal("chromium"),
                "molybdenum" to floatVal("molybdenum"),
                "isAiAnalyzed" to true,
                "analyzedAt" to DateUtil.currentTimestamp()
            )
        } catch (e: Exception) {
            println("SettingsScreenModel: parseNutritionResponse error: ${e.message}")
            null
        }
    }

    /**
     * JSONを抽出
     */
    private fun extractJson(text: String): String {
        val jsonBlockPattern = Regex("```json\\s*([\\s\\S]*?)\\s*```")
        jsonBlockPattern.find(text)?.let { return it.groupValues[1].trim() }

        val codeBlockPattern = Regex("```\\s*([\\s\\S]*?)\\s*```")
        codeBlockPattern.find(text)?.let { return it.groupValues[1].trim() }

        val jsonStart = text.indexOf('{')
        val jsonEnd = text.lastIndexOf('}')
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
            return text.substring(jsonStart, jsonEnd + 1)
        }
        return text
    }
}
