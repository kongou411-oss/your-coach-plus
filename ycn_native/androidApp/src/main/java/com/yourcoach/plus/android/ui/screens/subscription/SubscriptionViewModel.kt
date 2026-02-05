package com.yourcoach.plus.android.ui.screens.subscription

import android.app.Activity
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.functions.FirebaseFunctions
import com.yourcoach.plus.android.data.billing.GooglePlayBillingRepository
import com.yourcoach.plus.shared.domain.repository.*
import com.yourcoach.plus.shared.domain.service.FreeTrialStatus
import com.yourcoach.plus.shared.domain.service.PremiumService
import com.yourcoach.plus.shared.domain.service.SubscriptionPlan
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * サブスクリプション画面のUI状態
 */
data class SubscriptionUiState(
    val isLoading: Boolean = true,
    val isPremium: Boolean = false,
    val currentPlan: SubscriptionPlan = SubscriptionPlan.FREE,
    val freeTrialStatus: FreeTrialStatus = FreeTrialStatus(false, 0, false),
    val products: List<ProductInfo> = emptyList(),
    val subscriptionStatus: SubscriptionStatus? = null,
    val isPurchasing: Boolean = false,
    val purchaseSuccess: Boolean = false,
    val error: String? = null,
    val connectionState: BillingConnectionState = BillingConnectionState.DISCONNECTED
)

/**
 * サブスクリプション画面のViewModel
 */
class SubscriptionViewModel(
    private val billingRepository: BillingRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(SubscriptionUiState())
    val uiState: StateFlow<SubscriptionUiState> = _uiState.asStateFlow()

    private var userId: String? = null
    private var registrationDate: String? = null

    init {
        // 課金接続状態を監視
        viewModelScope.launch {
            billingRepository.connectionState.collect { state ->
                _uiState.update { it.copy(connectionState = state) }

                if (state == BillingConnectionState.CONNECTED) {
                    loadProducts()
                    checkSubscriptionStatus()
                }
            }
        }

        // 接続開始
        billingRepository.startConnection()
    }

    /**
     * 初期化
     */
    fun initialize(
        userId: String,
        registrationDate: String?,
        subscriptionStatus: String?
    ) {
        this.userId = userId
        this.registrationDate = registrationDate

        // 無料トライアルステータスをチェック
        val trialStatus = PremiumService.checkFreeTrialStatus(registrationDate)

        // GitLive Firebase SDKのバグ回避: Native Firebase SDKでorganizationNameを取得
        viewModelScope.launch {
            var organizationName: String? = null
            try {
                organizationName = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
                    val task = com.google.firebase.firestore.FirebaseFirestore.getInstance()
                        .collection("users")
                        .document(userId)
                        .get()
                    val doc = com.google.android.gms.tasks.Tasks.await(task)
                    doc.getString("organizationName")
                }
            } catch (e: Exception) {
                Log.e("SubscriptionVM", "Native Firebase check failed: ${e.message}")
            }

            // Premium判定
            val usageDays = if (trialStatus.isInTrial) trialStatus.daysRemaining else 8 // トライアル外なら8日以上
            val isPremium = PremiumService.isPremiumUser(
                subscriptionStatus = subscriptionStatus,
                usageDays = usageDays,
                organizationName = organizationName
            )

            _uiState.update {
                it.copy(
                    freeTrialStatus = trialStatus,
                    isPremium = isPremium,
                    currentPlan = if (isPremium) SubscriptionPlan.PREMIUM else SubscriptionPlan.FREE
                )
            }
        }
    }

    /**
     * 商品一覧を読み込み
     */
    private fun loadProducts() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            billingRepository.getProducts()
                .onSuccess { products ->
                    _uiState.update {
                        it.copy(
                            products = products,
                            isLoading = false
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            error = error.message,
                            isLoading = false
                        )
                    }
                }
        }
    }

    /**
     * サブスクリプション状態を確認
     */
    private fun checkSubscriptionStatus() {
        viewModelScope.launch {
            billingRepository.getSubscriptionStatus()
                .onSuccess { status ->
                    _uiState.update {
                        it.copy(
                            subscriptionStatus = status,
                            isPremium = status.isActive,
                            currentPlan = if (status.isActive) SubscriptionPlan.PREMIUM else SubscriptionPlan.FREE
                        )
                    }
                }
                .onFailure { error ->
                    // エラーは無視（ログのみ）
                    println("Subscription status check failed: ${error.message}")
                }
        }
    }

    /**
     * サブスクリプションを購入
     */
    fun purchaseSubscription(productId: String, activityProvider: () -> Activity) {
        viewModelScope.launch {
            _uiState.update { it.copy(isPurchasing = true, error = null) }

            billingRepository.purchaseSubscription(productId) { activityProvider() }
                .onSuccess { result ->
                    if (result.success) {
                        // 購入確認
                        result.purchaseToken?.let { token ->
                            billingRepository.acknowledgePurchase(token)
                        }

                        // Firebase Functionsで購入を検証し、Premium状態を更新
                        try {
                            verifyPurchaseWithServer(
                                productId = productId,
                                transactionId = result.orderId ?: "",
                                type = "subscription",
                                credits = 100 // Premium契約で100クレジット
                            )

                            _uiState.update {
                                it.copy(
                                    isPurchasing = false,
                                    purchaseSuccess = true,
                                    isPremium = true,
                                    currentPlan = SubscriptionPlan.PREMIUM
                                )
                            }
                        } catch (e: Exception) {
                            Log.e("SubscriptionVM", "Failed to verify purchase", e)
                            // 検証失敗してもローカルでは成功扱い（後でサーバー側で確認）
                            _uiState.update {
                                it.copy(
                                    isPurchasing = false,
                                    purchaseSuccess = true,
                                    isPremium = true,
                                    currentPlan = SubscriptionPlan.PREMIUM
                                )
                            }
                        }
                    } else {
                        _uiState.update {
                            it.copy(
                                isPurchasing = false,
                                error = result.errorMessage
                            )
                        }
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isPurchasing = false,
                            error = error.message
                        )
                    }
                }
        }
    }

    /**
     * クレジットパックを購入
     */
    fun purchaseCredits(productId: String, activityProvider: () -> Activity) {
        viewModelScope.launch {
            _uiState.update { it.copy(isPurchasing = true, error = null) }

            billingRepository.purchaseCredits(productId) { activityProvider() }
                .onSuccess { result ->
                    if (result.success) {
                        // 購入確認（consumable商品はconsume()を使用）
                        result.purchaseToken?.let { token ->
                            billingRepository.acknowledgePurchase(token)
                        }

                        // クレジット数を判定
                        val credits = when {
                            productId.contains("50") -> 50
                            productId.contains("150") -> 150
                            productId.contains("300") -> 300
                            else -> 0
                        }

                        // Firebase Functionsで購入を検証し、クレジットを追加
                        try {
                            verifyPurchaseWithServer(
                                productId = productId,
                                transactionId = result.orderId ?: "",
                                type = "consumable",
                                credits = credits
                            )

                            _uiState.update {
                                it.copy(
                                    isPurchasing = false,
                                    purchaseSuccess = true
                                )
                            }
                        } catch (e: Exception) {
                            Log.e("SubscriptionVM", "Failed to verify credit purchase", e)
                            _uiState.update {
                                it.copy(
                                    isPurchasing = false,
                                    error = "購入処理中にエラーが発生しました: ${e.message}"
                                )
                            }
                        }
                    } else {
                        _uiState.update {
                            it.copy(
                                isPurchasing = false,
                                error = result.errorMessage
                            )
                        }
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isPurchasing = false,
                            error = error.message
                        )
                    }
                }
        }
    }

    /**
     * Firebase Functionsで購入を検証
     */
    private suspend fun verifyPurchaseWithServer(
        productId: String,
        transactionId: String,
        type: String,
        credits: Int
    ) {
        val functions = FirebaseFunctions.getInstance("asia-northeast2")
        val updatePremiumStatus = functions.getHttpsCallable("updatePremiumStatusFromReceipt")

        val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        val receiptData = hashMapOf(
            "productId" to productId,
            "transactionId" to transactionId,
            "purchaseDate" to dateFormat.format(Date()),
            "type" to type,
            "credits" to credits
        )

        val requestData = hashMapOf(
            "userId" to userId,
            "receipt" to receiptData,
            "platform" to "android"
        )

        Log.d("SubscriptionVM", "Verifying purchase: $requestData")
        val result = updatePremiumStatus.call(requestData).await()
        Log.d("SubscriptionVM", "Server response: ${result.data}")
    }

    /**
     * 購入成功フラグをリセット
     */
    fun resetPurchaseSuccess() {
        _uiState.update { it.copy(purchaseSuccess = false) }
    }

    /**
     * エラーをクリア
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    override fun onCleared() {
        super.onCleared()
        billingRepository.endConnection()
    }
}
