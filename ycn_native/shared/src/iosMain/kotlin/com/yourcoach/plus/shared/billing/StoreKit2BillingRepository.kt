package com.yourcoach.plus.shared.billing

import com.yourcoach.plus.shared.domain.repository.BillingConnectionState
import com.yourcoach.plus.shared.domain.repository.BillingRepository
import com.yourcoach.plus.shared.domain.repository.ProductInfo
import com.yourcoach.plus.shared.domain.repository.ProductType
import com.yourcoach.plus.shared.domain.repository.PurchaseHistoryItem
import com.yourcoach.plus.shared.domain.repository.PurchaseResult
import com.yourcoach.plus.shared.domain.repository.SubscriptionStatus
import com.yourcoach.plus.shared.util.AppError
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/**
 * グローバルなStoreKit2ハンドラー
 * Swift側から設定される
 */

// 商品一覧取得
var storeKit2LoadProductsHandler: (((List<Map<String, Any?>>?, String?) -> Unit) -> Unit)? = null

// 購入
var storeKit2PurchaseHandler: ((String, (Map<String, Any?>?, String?) -> Unit) -> Unit)? = null

// サブスクリプション状態取得
var storeKit2GetSubscriptionStatusHandler: (((Map<String, Any?>?, String?) -> Unit) -> Unit)? = null

// 購入履歴取得
var storeKit2GetPurchaseHistoryHandler: (((List<Map<String, Any?>>?, String?) -> Unit) -> Unit)? = null

// 購入復元
var storeKit2RestorePurchasesHandler: (((Boolean, String?) -> Unit) -> Unit)? = null

/**
 * iOS StoreKit 2 課金リポジトリ実装
 * Swift側のStoreKit2Bridgeを使用
 */
class StoreKit2BillingRepository : BillingRepository {

    private val _connectionState = MutableStateFlow(BillingConnectionState.DISCONNECTED)
    override val connectionState: Flow<BillingConnectionState> = _connectionState

    override fun startConnection() {
        _connectionState.value = BillingConnectionState.CONNECTED
        println("StoreKit2BillingRepository: Connection started (StoreKit 2 is always available)")
    }

    override fun endConnection() {
        _connectionState.value = BillingConnectionState.DISCONNECTED
    }

    override suspend fun getProducts(): Result<List<ProductInfo>> = suspendCancellableCoroutine { continuation ->
        val handler = storeKit2LoadProductsHandler
        if (handler == null) {
            continuation.resume(
                Result.failure(AppError.NotImplemented("StoreKit2が初期化されていません"))
            )
            return@suspendCancellableCoroutine
        }

        handler { productsList, errorMessage ->
            when {
                productsList != null -> {
                    val products = productsList.mapNotNull { productMap ->
                        try {
                            val productId = productMap["productId"] as? String ?: return@mapNotNull null
                            val name = productMap["name"] as? String ?: ""
                            val description = productMap["description"] as? String ?: ""
                            val price = productMap["price"] as? String ?: ""
                            val priceMicros = (productMap["priceMicros"] as? Number)?.toLong() ?: 0L
                            val currencyCode = productMap["currencyCode"] as? String ?: "JPY"
                            val typeStr = productMap["type"] as? String ?: "INAPP"
                            val billingPeriod = productMap["billingPeriod"] as? String

                            ProductInfo(
                                productId = productId,
                                name = name,
                                description = description,
                                price = price,
                                priceMicros = priceMicros,
                                currencyCode = currencyCode,
                                type = if (typeStr == "SUBSCRIPTION") ProductType.SUBSCRIPTION else ProductType.INAPP,
                                billingPeriod = billingPeriod
                            )
                        } catch (e: Exception) {
                            null
                        }
                    }
                    continuation.resume(Result.success(products))
                }
                errorMessage != null -> {
                    continuation.resume(Result.failure(AppError.BillingError(errorMessage)))
                }
                else -> {
                    continuation.resume(Result.failure(AppError.BillingError("商品情報の取得に失敗しました")))
                }
            }
        }
    }

    override suspend fun purchaseSubscription(
        productId: String,
        activityProvider: () -> Any
    ): Result<PurchaseResult> = purchase(productId)

    override suspend fun purchaseCredits(
        productId: String,
        activityProvider: () -> Any
    ): Result<PurchaseResult> = purchase(productId)

    private suspend fun purchase(productId: String): Result<PurchaseResult> = suspendCancellableCoroutine { continuation ->
        val handler = storeKit2PurchaseHandler
        if (handler == null) {
            continuation.resume(
                Result.failure(AppError.NotImplemented("StoreKit2が初期化されていません"))
            )
            return@suspendCancellableCoroutine
        }

        handler(productId) { resultMap, errorMessage ->
            when {
                resultMap != null -> {
                    val success = resultMap["success"] as? Boolean ?: false
                    if (success) {
                        val purchaseToken = resultMap["purchaseToken"] as? String ?: ""
                        val orderId = resultMap["orderId"] as? String ?: ""

                        continuation.resume(
                            Result.success(
                                PurchaseResult(
                                    success = true,
                                    purchaseToken = purchaseToken,
                                    orderId = orderId
                                )
                            )
                        )
                    } else {
                        val errorCode = (resultMap["errorCode"] as? Number)?.toInt() ?: 0
                        val message = resultMap["errorMessage"] as? String ?: "購入に失敗しました"

                        // ユーザーキャンセルの場合
                        if (errorCode == -1) {
                            continuation.resume(Result.failure(AppError.Cancelled("購入がキャンセルされました")))
                        } else {
                            continuation.resume(Result.failure(AppError.BillingError(message)))
                        }
                    }
                }
                errorMessage != null -> {
                    continuation.resume(Result.failure(AppError.BillingError(errorMessage)))
                }
                else -> {
                    continuation.resume(Result.failure(AppError.BillingError("購入に失敗しました")))
                }
            }
        }
    }

    override suspend fun acknowledgePurchase(purchaseToken: String): Result<Unit> {
        // StoreKit 2 automatically acknowledges purchases
        return Result.success(Unit)
    }

    override suspend fun getSubscriptionStatus(): Result<SubscriptionStatus> = suspendCancellableCoroutine { continuation ->
        val handler = storeKit2GetSubscriptionStatusHandler
        if (handler == null) {
            continuation.resume(
                Result.failure(AppError.NotImplemented("StoreKit2が初期化されていません"))
            )
            return@suspendCancellableCoroutine
        }

        handler { statusMap, errorMessage ->
            when {
                statusMap != null -> {
                    val isActive = statusMap["isActive"] as? Boolean ?: false
                    val productId = statusMap["productId"] as? String
                    val purchaseToken = statusMap["purchaseToken"] as? String
                    val expiryTimeMillis = (statusMap["expiryTimeMillis"] as? Number)?.toLong()
                    val autoRenewing = statusMap["autoRenewing"] as? Boolean ?: false

                    continuation.resume(
                        Result.success(
                            SubscriptionStatus(
                                isActive = isActive,
                                productId = productId,
                                purchaseToken = purchaseToken,
                                expiryTimeMillis = expiryTimeMillis,
                                autoRenewing = autoRenewing
                            )
                        )
                    )
                }
                errorMessage != null -> {
                    continuation.resume(Result.failure(AppError.BillingError(errorMessage)))
                }
                else -> {
                    // エラーでもnullでもない場合は非アクティブとして返す
                    continuation.resume(Result.success(SubscriptionStatus(isActive = false)))
                }
            }
        }
    }

    override suspend fun getPurchaseHistory(): Result<List<PurchaseHistoryItem>> = suspendCancellableCoroutine { continuation ->
        val handler = storeKit2GetPurchaseHistoryHandler
        if (handler == null) {
            continuation.resume(
                Result.failure(AppError.NotImplemented("StoreKit2が初期化されていません"))
            )
            return@suspendCancellableCoroutine
        }

        handler { historyList, errorMessage ->
            when {
                historyList != null -> {
                    val history = historyList.mapNotNull { itemMap ->
                        try {
                            val productId = itemMap["productId"] as? String ?: return@mapNotNull null
                            val purchaseToken = itemMap["purchaseToken"] as? String ?: ""
                            val purchaseTime = (itemMap["purchaseTime"] as? Number)?.toLong() ?: 0L
                            val quantity = (itemMap["quantity"] as? Number)?.toInt() ?: 1

                            PurchaseHistoryItem(
                                productId = productId,
                                purchaseToken = purchaseToken,
                                purchaseTime = purchaseTime,
                                quantity = quantity
                            )
                        } catch (e: Exception) {
                            null
                        }
                    }
                    continuation.resume(Result.success(history))
                }
                errorMessage != null -> {
                    continuation.resume(Result.failure(AppError.BillingError(errorMessage)))
                }
                else -> {
                    continuation.resume(Result.success(emptyList()))
                }
            }
        }
    }

    /**
     * 購入を復元
     */
    suspend fun restorePurchases(): Result<Unit> = suspendCancellableCoroutine { continuation ->
        val handler = storeKit2RestorePurchasesHandler
        if (handler == null) {
            continuation.resume(
                Result.failure(AppError.NotImplemented("StoreKit2が初期化されていません"))
            )
            return@suspendCancellableCoroutine
        }

        handler { success, errorMessage ->
            if (success) {
                continuation.resume(Result.success(Unit))
            } else {
                continuation.resume(
                    Result.failure(AppError.BillingError(errorMessage ?: "購入の復元に失敗しました"))
                )
            }
        }
    }
}
