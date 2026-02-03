package com.yourcoach.plus.android.ui.screens.settings

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.yourcoach.plus.android.data.repository.FirebaseAuthRepository
import com.yourcoach.plus.android.data.repository.FirestoreUserRepository
import com.yourcoach.plus.shared.domain.model.CustomFood
import com.yourcoach.plus.shared.domain.model.User
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.CustomFoodRepository
import com.yourcoach.plus.shared.domain.repository.UserRepository
import com.yourcoach.plus.shared.domain.service.GeminiService
import com.yourcoach.plus.android.data.service.FirebaseStorageService
import android.net.Uri
import kotlinx.coroutines.tasks.await
import org.json.JSONObject
import com.yourcoach.plus.shared.util.AppError
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * 設定画面のUI状態
 */
data class SettingsUiState(
    val isLoading: Boolean = false,
    val user: User? = null,
    val isPremium: Boolean = false,
    val notificationsEnabled: Boolean = true,
    val appVersion: String = "1.0.0",
    val error: String? = null,
    val isLoggedOut: Boolean = false,
    val isAccountDeleted: Boolean = false,
    val isDeletingAccount: Boolean = false,
    val needsReauthentication: Boolean = false,
    val pendingDeleteUserId: String? = null,
    val isAddingCredits: Boolean = false,
    val creditsAddedMessage: String? = null,
    // プロフィール画像
    val isUploadingPhoto: Boolean = false,
    // カスタム食品管理
    val customFoods: List<CustomFood> = emptyList(),
    val isLoadingCustomFoods: Boolean = false,
    val customFoodActionMessage: String? = null,
    // AI栄養解析
    val freeCredits: Int = 0,
    val paidCredits: Int = 0,
    val isAnalyzingNutrition: Boolean = false,
    val analyzingFoodId: String? = null,
    // 所属（法人プラン）
    val organizationName: String? = null,
    val isValidatingOrganization: Boolean = false,
    val organizationMessage: String? = null
)

/**
 * 設定項目
 */
enum class SettingsItem(val title: String, val emoji: String) {
    PROFILE("プロフィール設定", "👤"),
    GOALS("目標設定", "🎯"),
    NOTIFICATIONS("通知設定", "🔔"),
    BADGES("実績・バッジ", "🏆"),
    PREMIUM("プレミアム", "⭐"),
    DATA_EXPORT("データエクスポート", "📊"),
    HELP("ヘルプ", "❓"),
    FEEDBACK("フィードバック", "💬"),
    TERMS("利用規約", "📄"),
    PRIVACY("プライバシーポリシー", "🔒"),
    ABOUT("アプリについて", "ℹ️"),
    LOGOUT("ログアウト", "🚪")
}

/**
 * 設定画面のViewModel
 */
class SettingsViewModel(
    private val authRepository: AuthRepository,
    private val userRepository: UserRepository,
    private val customFoodRepository: CustomFoodRepository,
    private val geminiService: GeminiService,
    private val storageService: FirebaseStorageService
) : ViewModel() {

    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    init {
        loadUserInfo()
        loadCustomFoods()
    }

    /**
     * ユーザー情報を読み込み
     */
    fun loadUserInfo() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val userId = authRepository.getCurrentUserId()
                Log.d("SettingsVM", "loadUserInfo: userId = $userId")
                if (userId != null) {
                    val result = userRepository.getUser(userId)
                    result.onSuccess { user ->
                        _uiState.update {
                            it.copy(
                                user = user,
                                isPremium = user?.isPremium ?: false,
                                freeCredits = user?.freeCredits ?: 0,
                                paidCredits = user?.paidCredits ?: 0,
                                organizationName = user?.b2b2cOrgName,
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
                        error = e.message ?: "ユーザー情報の読み込みに失敗しました",
                        isLoading = false
                    )
                }
            }
        }
    }

    /**
     * 通知設定をトグル
     */
    fun toggleNotifications(enabled: Boolean) {
        _uiState.update { it.copy(notificationsEnabled = enabled) }
        // TODO: 通知設定をFirestoreに保存
    }

    /**
     * プロフィール画像をアップロード
     */
    fun uploadProfilePhoto(uri: Uri) {
        val userId = authRepository.getCurrentUserId() ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(isUploadingPhoto = true) }
            try {
                // 画像をアップロード
                storageService.uploadProfileImage(uri, userId)
                    .onSuccess { photoUrl ->
                        // FirestoreのphotoUrlを更新
                        userRepository.updatePhotoUrl(userId, photoUrl)
                            .onSuccess {
                                // ローカルのuserも更新
                                _uiState.update { state ->
                                    state.copy(
                                        isUploadingPhoto = false,
                                        user = state.user?.copy(photoUrl = photoUrl)
                                    )
                                }
                            }
                            .onFailure { e ->
                                _uiState.update { it.copy(isUploadingPhoto = false, error = e.message) }
                            }
                    }
                    .onFailure { e ->
                        _uiState.update { it.copy(isUploadingPhoto = false, error = e.message) }
                    }
            } catch (e: Exception) {
                _uiState.update { it.copy(isUploadingPhoto = false, error = e.message) }
            }
        }
    }

    /**
     * ログアウト
     */
    fun logout() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                authRepository.signOut()
                _uiState.update { it.copy(isLoggedOut = true, isLoading = false) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        error = e.message ?: "ログアウトに失敗しました",
                        isLoading = false
                    )
                }
            }
        }
    }

    /**
     * アカウント削除
     */
    fun deleteAccount() {
        Log.d("SettingsVM", "deleteAccount() called")
        viewModelScope.launch {
            _uiState.update { it.copy(isDeletingAccount = true, needsReauthentication = false) }
            try {
                val userId = authRepository.getCurrentUserId()
                Log.d("SettingsVM", "deleteAccount: userId = $userId")

                if (userId != null) {
                    // 1. まずFirebase Authアカウント削除を試みる
                    Log.d("SettingsVM", "Attempting to delete Firebase Auth account...")
                    val deleteAuthResult = authRepository.deleteAccount()
                    Log.d("SettingsVM", "deleteAuthResult: ${deleteAuthResult.isSuccess}")

                    if (deleteAuthResult.isFailure) {
                        val error = deleteAuthResult.exceptionOrNull()
                        Log.d("SettingsVM", "Delete failed, error type: ${error?.javaClass?.simpleName}")
                        Log.d("SettingsVM", "Is RecentLoginRequired: ${error is AppError.RecentLoginRequired}")

                        if (error is AppError.RecentLoginRequired) {
                            // 再認証が必要 - userIdを保存
                            Log.d("SettingsVM", "Setting needsReauthentication=true, pendingDeleteUserId=$userId")
                            _uiState.update {
                                it.copy(
                                    isDeletingAccount = false,
                                    needsReauthentication = true,
                                    pendingDeleteUserId = userId
                                )
                            }
                            return@launch
                        }
                        throw error ?: Exception("アカウント削除に失敗しました")
                    }

                    // 2. アカウント削除成功後、Firestoreのユーザーデータを削除
                    Log.d("SettingsVM", "Deleting Firestore data...")
                    userRepository.deleteUserData(userId)

                    _uiState.update {
                        it.copy(
                            isDeletingAccount = false,
                            isAccountDeleted = true,
                            pendingDeleteUserId = null
                        )
                    }
                    Log.d("SettingsVM", "Account deleted successfully!")
                } else {
                    Log.e("SettingsVM", "userId is NULL in deleteAccount!")
                    _uiState.update {
                        it.copy(
                            isDeletingAccount = false,
                            error = "ログイン状態を確認できません"
                        )
                    }
                }
            } catch (e: Exception) {
                Log.e("SettingsVM", "Exception in deleteAccount", e)
                _uiState.update {
                    it.copy(
                        isDeletingAccount = false,
                        pendingDeleteUserId = null,
                        error = e.message ?: "アカウント削除に失敗しました"
                    )
                }
            }
        }
    }

    /**
     * Googleで再認証してアカウント削除
     */
    fun reauthenticateAndDelete(idToken: String) {
        Log.d("SettingsVM", "reauthenticateAndDelete called")
        Log.d("SettingsVM", "idToken length: ${idToken.length}")
        Log.d("SettingsVM", "pendingDeleteUserId: ${_uiState.value.pendingDeleteUserId}")

        viewModelScope.launch {
            _uiState.update { it.copy(isDeletingAccount = true, needsReauthentication = false) }
            try {
                // 保存されたuserIdを使用（または現在のuserIdを取得）
                val currentUserId = authRepository.getCurrentUserId()
                Log.d("SettingsVM", "currentUserId from authRepo: $currentUserId")

                val userId = _uiState.value.pendingDeleteUserId ?: currentUserId
                Log.d("SettingsVM", "Using userId: $userId")

                if (userId == null) {
                    Log.e("SettingsVM", "userId is NULL!")
                    _uiState.update {
                        it.copy(
                            isDeletingAccount = false,
                            pendingDeleteUserId = null,
                            error = "ログイン状態を確認できません"
                        )
                    }
                    return@launch
                }

                // FirebaseAuthRepositoryをキャストして再認証メソッドを呼び出す
                val firebaseAuthRepo = authRepository as? FirebaseAuthRepository
                if (firebaseAuthRepo == null) {
                    Log.e("SettingsVM", "Failed to cast authRepository to FirebaseAuthRepository")
                    throw Exception("認証リポジトリが不正です")
                }

                Log.d("SettingsVM", "Calling reauthenticateWithGoogleAndDelete...")
                // 再認証してアカウント削除
                val result = firebaseAuthRepo.reauthenticateWithGoogleAndDelete(idToken)
                Log.d("SettingsVM", "reauthenticateWithGoogleAndDelete result: ${result.isSuccess}")

                if (result.isFailure) {
                    val error = result.exceptionOrNull()
                    Log.e("SettingsVM", "reauthenticateWithGoogleAndDelete failed: ${error?.message}")
                    throw error ?: Exception("アカウント削除に失敗しました")
                }

                Log.d("SettingsVM", "Deleting user data from Firestore...")
                // Firestoreのユーザーデータを削除
                userRepository.deleteUserData(userId)
                Log.d("SettingsVM", "User data deleted")

                _uiState.update {
                    it.copy(
                        isDeletingAccount = false,
                        isAccountDeleted = true,
                        pendingDeleteUserId = null
                    )
                }
                Log.d("SettingsVM", "Account deletion complete!")
            } catch (e: Exception) {
                Log.e("SettingsVM", "Error in reauthenticateAndDelete", e)
                _uiState.update {
                    it.copy(
                        isDeletingAccount = false,
                        pendingDeleteUserId = null,
                        error = e.message ?: "アカウント削除に失敗しました"
                    )
                }
            }
        }
    }

    /**
     * 再認証要求をクリア
     */
    fun clearReauthenticationRequest() {
        _uiState.update { it.copy(needsReauthentication = false) }
    }

    /**
     * エラーをクリア
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    /**
     * クレジット追加メッセージをクリア
     */
    fun clearCreditsAddedMessage() {
        _uiState.update { it.copy(creditsAddedMessage = null) }
    }

    /**
     * 無料クレジットを100追加（デバッグ用）
     * Cloud Function経由で追加（セキュリティルールを回避）
     */
    fun addFreeCredits() {
        viewModelScope.launch {
            _uiState.update { it.copy(isAddingCredits = true) }
            try {
                val functions = com.google.firebase.functions.FirebaseFunctions
                    .getInstance("asia-northeast1")

                val data = hashMapOf("amount" to 100)

                functions
                    .getHttpsCallable("debugAddCredits")
                    .call(data)
                    .addOnSuccessListener { result ->
                        val response = result.data as? Map<*, *>
                        val newTotal = (response?.get("newTotal") as? Number)?.toInt() ?: 0
                        val message = response?.get("message") as? String ?: "クレジットを追加しました"

                        _uiState.update {
                            it.copy(
                                isAddingCredits = false,
                                creditsAddedMessage = "$message（合計: $newTotal）"
                            )
                        }
                        // ユーザー情報を再読み込みして反映
                        loadUserInfo()
                    }
                    .addOnFailureListener { e ->
                        _uiState.update {
                            it.copy(
                                isAddingCredits = false,
                                error = "クレジットの追加に失敗しました: ${e.message}"
                            )
                        }
                    }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isAddingCredits = false,
                        error = e.message ?: "クレジット追加に失敗しました"
                    )
                }
            }
        }
    }

    // ========== 所属（法人プラン）管理 ==========

    /**
     * 所属名を検証して法人プランを適用
     */
    fun validateOrganization(organizationName: String) {
        if (organizationName.isBlank()) {
            _uiState.update { it.copy(organizationMessage = "所属名を入力してください") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isValidatingOrganization = true, organizationMessage = null) }
            try {
                val functions = com.google.firebase.functions.FirebaseFunctions
                    .getInstance("asia-northeast2")

                val data = hashMapOf("organizationName" to organizationName.trim())

                functions
                    .getHttpsCallable("validateOrganizationName")
                    .call(data)
                    .addOnSuccessListener { result ->
                        val response = result.data as? Map<*, *>
                        val success = response?.get("success") as? Boolean ?: false
                        val message = response?.get("message") as? String ?: "所属を登録しました"
                        val orgName = response?.get("organizationName") as? String

                        _uiState.update {
                            it.copy(
                                isValidatingOrganization = false,
                                organizationName = if (success) orgName else it.organizationName,
                                organizationMessage = message
                            )
                        }
                        // ユーザー情報を再読み込みして反映
                        if (success) {
                            loadUserInfo()
                        }
                    }
                    .addOnFailureListener { e ->
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
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isValidatingOrganization = false,
                        organizationMessage = e.message ?: "所属の検証に失敗しました"
                    )
                }
            }
        }
    }

    /**
     * 所属を解除
     */
    fun leaveOrganization() {
        viewModelScope.launch {
            _uiState.update { it.copy(isValidatingOrganization = true, organizationMessage = null) }
            try {
                val functions = com.google.firebase.functions.FirebaseFunctions
                    .getInstance("asia-northeast2")

                functions
                    .getHttpsCallable("leaveOrganization")
                    .call()
                    .addOnSuccessListener { result ->
                        val response = result.data as? Map<*, *>
                        val message = response?.get("message") as? String ?: "所属を解除しました"

                        _uiState.update {
                            it.copy(
                                isValidatingOrganization = false,
                                organizationName = null,
                                organizationMessage = message
                            )
                        }
                        // ユーザー情報を再読み込みして反映
                        loadUserInfo()
                    }
                    .addOnFailureListener { e ->
                        _uiState.update {
                            it.copy(
                                isValidatingOrganization = false,
                                organizationMessage = e.message ?: "所属の解除に失敗しました"
                            )
                        }
                    }
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

    /**
     * 所属メッセージをクリア
     */
    fun clearOrganizationMessage() {
        _uiState.update { it.copy(organizationMessage = null) }
    }

    // ========== カスタム食品管理 ==========

    /**
     * カスタム食品一覧を読み込み
     */
    fun loadCustomFoods() {
        viewModelScope.launch {
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
                            error = e.message ?: "カスタム食品の読み込みに失敗しました"
                        )
                    }
                }
        }
    }

    /**
     * カスタム食品を更新
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
        viewModelScope.launch {
            val userId = authRepository.getCurrentUserId() ?: return@launch

            // 既存の食品を取得して更新
            val existingFood = _uiState.value.customFoods.find { it.id == foodId } ?: return@launch
            val updatedFood = existingFood.copy(
                name = name,
                calories = calories,
                protein = protein,
                carbs = carbs,
                fat = fat,
                fiber = fiber
            )

            // Firestoreを直接更新
            try {
                val firestore = com.google.firebase.firestore.FirebaseFirestore.getInstance()
                firestore.collection("users")
                    .document(userId)
                    .collection("customFoods")
                    .document(foodId)
                    .update(
                        mapOf(
                            "name" to name,
                            "calories" to calories,
                            "protein" to protein,
                            "carbs" to carbs,
                            "fat" to fat,
                            "fiber" to fiber
                        )
                    )
                    .addOnSuccessListener {
                        _uiState.update {
                            it.copy(customFoodActionMessage = "「$name」を更新しました")
                        }
                        loadCustomFoods()
                    }
                    .addOnFailureListener { e ->
                        _uiState.update {
                            it.copy(error = "更新に失敗しました: ${e.message}")
                        }
                    }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(error = "更新に失敗しました: ${e.message}")
                }
            }
        }
    }

    /**
     * カスタム食品を削除
     */
    fun deleteCustomFood(foodId: String) {
        viewModelScope.launch {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            val food = _uiState.value.customFoods.find { it.id == foodId }

            customFoodRepository.deleteCustomFood(userId, foodId)
                .onSuccess {
                    _uiState.update {
                        it.copy(customFoodActionMessage = "「${food?.name ?: "食品"}」を削除しました")
                    }
                    loadCustomFoods()
                }
                .onFailure { e ->
                    _uiState.update {
                        it.copy(error = e.message ?: "削除に失敗しました")
                    }
                }
        }
    }

    /**
     * カスタム食品アクションメッセージをクリア
     */
    fun clearCustomFoodActionMessage() {
        _uiState.update { it.copy(customFoodActionMessage = null) }
    }

    // ========== AI栄養解析 ==========

    /**
     * クレジット残高を取得
     */
    fun getTotalCredits(): Int {
        return _uiState.value.freeCredits + _uiState.value.paidCredits
    }

    /**
     * カスタム食品のミクロ栄養素をAIで解析（1クレジット消費）
     */
    fun analyzeCustomFoodNutrition(foodId: String) {
        val food = _uiState.value.customFoods.find { it.id == foodId } ?: return
        val userId = authRepository.getCurrentUserId() ?: return

        // クレジット残高チェック
        if (getTotalCredits() < 1) {
            _uiState.update { it.copy(error = "クレジットが不足しています") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isAnalyzingNutrition = true, analyzingFoodId = foodId) }

            try {
                // 専用プロンプトでミクロ栄養素を推定（クレジット消費込み）
                val prompt = buildNutritionAnalysisPrompt(food)
                Log.d("SettingsVM", "Analyzing nutrition for: ${food.name}, userId: $userId")
                Log.d("SettingsVM", "Calling sendMessageWithCredit...")
                val response = geminiService.sendMessageWithCredit(
                    userId = userId,
                    message = prompt,
                    conversationHistory = emptyList(),
                    userProfile = null,
                    model = "gemini-2.5-flash"
                )
                Log.d("SettingsVM", "Response: success=${response.success}, error=${response.error}, textLength=${response.text?.length}")

                if (response.success && response.text != null) {
                    Log.d("SettingsVM", "Parsing nutrition response...")
                    val nutrients = parseNutritionResponse(response.text!!)
                    Log.d("SettingsVM", "Parsed nutrients: ${nutrients != null}")

                    if (nutrients != null) {
                        // Firestoreに保存
                        Log.d("SettingsVM", "Saving analyzed nutrients to Firestore...")
                        saveAnalyzedNutrients(userId, foodId, nutrients)

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
                        Log.e("SettingsVM", "Failed to parse nutrients")
                        _uiState.update {
                            it.copy(
                                isAnalyzingNutrition = false,
                                analyzingFoodId = null,
                                error = "栄養素の解析に失敗しました"
                            )
                        }
                    }
                } else {
                    Log.e("SettingsVM", "API call failed: ${response.error}")
                    _uiState.update {
                        it.copy(
                            isAnalyzingNutrition = false,
                            analyzingFoodId = null,
                            error = response.error ?: "AI解析に失敗しました"
                        )
                    }
                }
            } catch (e: Exception) {
                Log.e("SettingsVM", "analyzeCustomFoodNutrition error", e)
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
不明な場合は0を入力してください。

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
            Log.d("SettingsVM", "Raw AI response: $responseText")
            // JSON部分を抽出
            val jsonString = extractJson(responseText)
            Log.d("SettingsVM", "Extracted JSON: $jsonString")
            val json = JSONObject(jsonString)

            mapOf(
                "fiber" to json.optDouble("fiber", 0.0).toFloat(),
                "solubleFiber" to json.optDouble("solubleFiber", 0.0).toFloat(),
                "insolubleFiber" to json.optDouble("insolubleFiber", 0.0).toFloat(),
                "sugar" to json.optDouble("sugar", 0.0).toFloat(),
                "gi" to json.optInt("gi", 0),
                "diaas" to json.optDouble("diaas", 0.0).toFloat(),
                "saturatedFat" to json.optDouble("saturatedFat", 0.0).toFloat(),
                "monounsaturatedFat" to json.optDouble("monounsaturatedFat", 0.0).toFloat(),
                "polyunsaturatedFat" to json.optDouble("polyunsaturatedFat", 0.0).toFloat(),
                "vitaminA" to json.optDouble("vitaminA", 0.0).toFloat(),
                "vitaminB1" to json.optDouble("vitaminB1", 0.0).toFloat(),
                "vitaminB2" to json.optDouble("vitaminB2", 0.0).toFloat(),
                "vitaminB6" to json.optDouble("vitaminB6", 0.0).toFloat(),
                "vitaminB12" to json.optDouble("vitaminB12", 0.0).toFloat(),
                "vitaminC" to json.optDouble("vitaminC", 0.0).toFloat(),
                "vitaminD" to json.optDouble("vitaminD", 0.0).toFloat(),
                "vitaminE" to json.optDouble("vitaminE", 0.0).toFloat(),
                "vitaminK" to json.optDouble("vitaminK", 0.0).toFloat(),
                "niacin" to json.optDouble("niacin", 0.0).toFloat(),
                "pantothenicAcid" to json.optDouble("pantothenicAcid", 0.0).toFloat(),
                "biotin" to json.optDouble("biotin", 0.0).toFloat(),
                "folicAcid" to json.optDouble("folicAcid", 0.0).toFloat(),
                "sodium" to json.optDouble("sodium", 0.0).toFloat(),
                "potassium" to json.optDouble("potassium", 0.0).toFloat(),
                "calcium" to json.optDouble("calcium", 0.0).toFloat(),
                "magnesium" to json.optDouble("magnesium", 0.0).toFloat(),
                "phosphorus" to json.optDouble("phosphorus", 0.0).toFloat(),
                "iron" to json.optDouble("iron", 0.0).toFloat(),
                "zinc" to json.optDouble("zinc", 0.0).toFloat(),
                "copper" to json.optDouble("copper", 0.0).toFloat(),
                "manganese" to json.optDouble("manganese", 0.0).toFloat(),
                "iodine" to json.optDouble("iodine", 0.0).toFloat(),
                "selenium" to json.optDouble("selenium", 0.0).toFloat(),
                "chromium" to json.optDouble("chromium", 0.0).toFloat(),
                "molybdenum" to json.optDouble("molybdenum", 0.0).toFloat(),
                "isAiAnalyzed" to true,
                "analyzedAt" to System.currentTimeMillis()
            )
        } catch (e: Exception) {
            Log.e("SettingsVM", "parseNutritionResponse error", e)
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

    /**
     * 解析した栄養素をFirestoreに保存
     */
    private fun saveAnalyzedNutrients(userId: String, foodId: String, nutrients: Map<String, Any>) {
        val firestore = com.google.firebase.firestore.FirebaseFirestore.getInstance()
        firestore.collection("users")
            .document(userId)
            .collection("customFoods")
            .document(foodId)
            .update(nutrients)
            .addOnFailureListener { e ->
                Log.e("SettingsVM", "saveAnalyzedNutrients error", e)
            }
    }
}
