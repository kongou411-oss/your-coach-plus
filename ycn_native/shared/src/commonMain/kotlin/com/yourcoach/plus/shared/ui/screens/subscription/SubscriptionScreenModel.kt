package com.yourcoach.plus.shared.ui.screens.subscription

import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
import com.yourcoach.plus.shared.domain.repository.*
import com.yourcoach.plus.shared.domain.service.FreeTrialStatus
import com.yourcoach.plus.shared.domain.service.PremiumService
import com.yourcoach.plus.shared.domain.service.SubscriptionPlan
import dev.gitlive.firebase.Firebase
import dev.gitlive.firebase.functions.functions
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.datetime.Clock
import kotlinx.serialization.Serializable

/**
 * サブスクリプション画面のUI状態
 */
data class SubscriptionUiState(
    val isLoading: Boolean = true,
    val isPremium: Boolean = false,
    val isOrganizationPremium: Boolean = false,
    val organizationName: String? = null,
    val currentPlan: SubscriptionPlan = SubscriptionPlan.FREE,
    val freeTrialStatus: FreeTrialStatus = FreeTrialStatus(false, 0, false),
    val products: List<ProductInfo> = emptyList(),
    val subscriptionStatus: SubscriptionStatus? = null,
    val isPurchasing: Boolean = false,
    val isRestoring: Boolean = false,
    val purchaseSuccess: Boolean = false,
    val error: String? = null,
    val connectionState: BillingConnectionState = BillingConnectionState.DISCONNECTED
)

/**
 * サブスクリプション画面のScreenModel (Voyager)
 */
class SubscriptionScreenModel(
    private val billingRepository: BillingRepository,
    private val userRepository: UserRepository,
    private val authRepository: AuthRepository
) : ScreenModel {

    private val _uiState = MutableStateFlow(SubscriptionUiState())
    val uiState: StateFlow<SubscriptionUiState> = _uiState.asStateFlow()

    private var userId: String? = null
    private var registrationDate: String? = null

    private val exceptionHandler = CoroutineExceptionHandler { _, throwable ->
        println("SubscriptionScreenModel: Coroutine exception: ${throwable.message}")
        _uiState.update { it.copy(isLoading = false, error = "エラーが発生しました") }
    }

    init {
        // 課金接続状態を監視
        screenModelScope.launch(exceptionHandler) {
            billingRepository.connectionState.collect { state ->
                _uiState.update { it.copy(connectionState = state) }

                if (state == BillingConnectionState.CONNECTED) {
                    loadProducts()
                    checkSubscriptionStatus()
                }
            }
        }

        // 接続開始
        try {
            billingRepository.startConnection()
        } catch (e: Throwable) {
            println("SubscriptionScreenModel: startConnection failed: ${e.message}")
        }
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

        screenModelScope.launch(exceptionHandler) {
            var organizationName: String? = null
            try {
                val result = userRepository.getUser(userId)
                result.onSuccess { user ->
                    organizationName = user?.organizationName ?: user?.b2b2cOrgName
                }
            } catch (e: Exception) {
                println("SubscriptionScreenModel: Failed to get user: ${e.message}")
            }

            // 所属プレミアム判定
            val isOrgPremium = !organizationName.isNullOrBlank()

            // Premium判定
            val usageDays = if (trialStatus.isInTrial) trialStatus.daysRemaining else 8
            val isPremium = isOrgPremium || PremiumService.isPremiumUser(
                subscriptionStatus = subscriptionStatus,
                usageDays = usageDays,
                organizationName = organizationName
            )

            _uiState.update {
                it.copy(
                    freeTrialStatus = trialStatus,
                    isPremium = isPremium,
                    isOrganizationPremium = isOrgPremium,
                    organizationName = organizationName,
                    currentPlan = if (isPremium) SubscriptionPlan.PREMIUM else SubscriptionPlan.FREE
                )
            }
        }
    }

    /**
     * 商品一覧を読み込み
     */
    private fun loadProducts() {
        screenModelScope.launch(exceptionHandler) {
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
        screenModelScope.launch(exceptionHandler) {
            billingRepository.getSubscriptionStatus()
                .onSuccess { status ->
                    _uiState.update {
                        // 所属プレミアムは上書きしない
                        val premium = it.isOrganizationPremium || status.isActive
                        it.copy(
                            subscriptionStatus = status,
                            isPremium = premium,
                            currentPlan = if (premium) SubscriptionPlan.PREMIUM else SubscriptionPlan.FREE
                        )
                    }
                }
                .onFailure { error ->
                    println("Subscription status check failed: ${error.message}")
                }
        }
    }

    /**
     * サブスクリプションを購入
     */
    fun purchaseSubscription(productId: String, activityProvider: () -> Any) {
        screenModelScope.launch(exceptionHandler) {
            _uiState.update { it.copy(isPurchasing = true, error = null) }

            billingRepository.purchaseSubscription(productId, activityProvider)
                .onSuccess { result ->
                    if (result.success) {
                        result.purchaseToken?.let { token ->
                            billingRepository.acknowledgePurchase(token)
                        }

                        // Firebase Functionsで購入を検証
                        try {
                            verifyPurchaseWithServer(
                                productId = productId,
                                transactionId = result.orderId ?: "",
                                type = "subscription",
                                credits = 100
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
                            _uiState.update {
                                it.copy(
                                    isPurchasing = false,
                                    purchaseSuccess = false,
                                    error = "購入は完了しましたが、サーバー検証に失敗しました。アプリを再起動してください。"
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
    fun purchaseCredits(productId: String, activityProvider: () -> Any) {
        screenModelScope.launch(exceptionHandler) {
            _uiState.update { it.copy(isPurchasing = true, error = null) }

            billingRepository.purchaseCredits(productId, activityProvider)
                .onSuccess { result ->
                    if (result.success) {
                        result.purchaseToken?.let { token ->
                            billingRepository.acknowledgePurchase(token)
                        }

                        val credits = when {
                            productId.contains("credits_50") || productId.contains("credits.50") -> 50
                            productId.contains("credits_150") || productId.contains("credits.150") -> 150
                            productId.contains("credits_300") || productId.contains("credits.300") -> 300
                            productId.contains("credits_100") || productId.contains("credits.100") -> 100
                            productId.contains("credits_200") || productId.contains("credits.200") -> 200
                            else -> 0
                        }

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

    @Serializable
    private data class ReceiptData(
        val productId: String,
        val transactionId: String,
        val purchaseDate: String,
        val type: String,
        val credits: Int
    )

    @Serializable
    private data class VerifyPurchaseRequest(
        val userId: String,
        val receipt: ReceiptData,
        val platform: String
    )

    /**
     * Firebase Functionsで購入を検証
     */
    private suspend fun verifyPurchaseWithServer(
        productId: String,
        transactionId: String,
        type: String,
        credits: Int
    ) {
        val functions = Firebase.functions("asia-northeast2")
        val currentTime = Clock.System.now().toString()

        val request = VerifyPurchaseRequest(
            userId = userId ?: "",
            receipt = ReceiptData(
                productId = productId,
                transactionId = transactionId,
                purchaseDate = currentTime,
                type = type,
                credits = credits
            ),
            platform = getPlatform()
        )

        functions.httpsCallable("updatePremiumStatusFromReceipt").invoke(request)
    }

    /**
     * 購入を復元
     */
    fun restorePurchases() {
        screenModelScope.launch(exceptionHandler) {
            _uiState.update { it.copy(isRestoring = true, error = null) }

            billingRepository.restorePurchases()
                .onSuccess {
                    // 復元後にサブスクリプション状態を再確認
                    checkSubscriptionStatus()
                    _uiState.update { it.copy(isRestoring = false) }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(isRestoring = false, error = error.message)
                    }
                }
        }
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

    override fun onDispose() {
        billingRepository.endConnection()
    }
}

/**
 * プラットフォーム取得 (expect/actual)
 */
expect fun getPlatform(): String
