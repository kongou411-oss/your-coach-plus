package com.yourcoach.plus.android.data.billing

import android.app.Activity
import android.content.Context
import com.android.billingclient.api.*
import com.yourcoach.plus.shared.domain.repository.*
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/**
 * Google Play Billing 実装
 */
class GooglePlayBillingRepository(
    private val context: Context
) : BillingRepository, PurchasesUpdatedListener {

    companion object {
        // 商品ID（Google Play Console / App Store Connectの設定と一致させる）
        const val PRODUCT_PREMIUM_MONTHLY = "yourcoach_premium_monthly"
        // クレジットパック
        const val PRODUCT_CREDITS_50 = "yourcoach_credits_50"
        const val PRODUCT_CREDITS_150 = "yourcoach_credits_150"
        const val PRODUCT_CREDITS_300 = "yourcoach_credits_300"
    }

    private val _connectionState = MutableStateFlow(BillingConnectionState.DISCONNECTED)
    override val connectionState: Flow<BillingConnectionState> = _connectionState.asStateFlow()

    private var billingClient: BillingClient? = null
    private var pendingPurchaseCallback: ((Result<PurchaseResult>) -> Unit)? = null

    init {
        initBillingClient()
    }

    private fun initBillingClient() {
        billingClient = BillingClient.newBuilder(context)
            .setListener(this)
            .enablePendingPurchases()
            .build()
    }

    override fun startConnection() {
        _connectionState.value = BillingConnectionState.CONNECTING

        billingClient?.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(billingResult: BillingResult) {
                if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    _connectionState.value = BillingConnectionState.CONNECTED
                } else {
                    _connectionState.value = BillingConnectionState.ERROR
                }
            }

            override fun onBillingServiceDisconnected() {
                _connectionState.value = BillingConnectionState.DISCONNECTED
                // 自動再接続
                startConnection()
            }
        })
    }

    override fun endConnection() {
        billingClient?.endConnection()
        _connectionState.value = BillingConnectionState.DISCONNECTED
    }

    override suspend fun getProducts(): Result<List<ProductInfo>> {
        ensureConnected()

        val subscriptionProducts = queryProducts(
            listOf(PRODUCT_PREMIUM_MONTHLY),
            BillingClient.ProductType.SUBS
        )

        val inAppProducts = queryProducts(
            listOf(PRODUCT_CREDITS_50, PRODUCT_CREDITS_150, PRODUCT_CREDITS_300),
            BillingClient.ProductType.INAPP
        )

        val allProducts = subscriptionProducts + inAppProducts
        return Result.success(allProducts)
    }

    private suspend fun queryProducts(
        productIds: List<String>,
        productType: String
    ): List<ProductInfo> = suspendCancellableCoroutine { cont ->
        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(
                productIds.map { productId ->
                    QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(productId)
                        .setProductType(productType)
                        .build()
                }
            )
            .build()

        billingClient?.queryProductDetailsAsync(params) { billingResult, productDetailsList ->
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                val products = productDetailsList.map { details ->
                    val pricingInfo = if (productType == BillingClient.ProductType.SUBS) {
                        details.subscriptionOfferDetails?.firstOrNull()?.pricingPhases?.pricingPhaseList?.firstOrNull()
                    } else {
                        null
                    }

                    val oneTimePurchaseInfo = details.oneTimePurchaseOfferDetails

                    ProductInfo(
                        productId = details.productId,
                        name = details.name,
                        description = details.description,
                        price = pricingInfo?.formattedPrice ?: oneTimePurchaseInfo?.formattedPrice ?: "",
                        priceMicros = pricingInfo?.priceAmountMicros ?: oneTimePurchaseInfo?.priceAmountMicros ?: 0,
                        currencyCode = pricingInfo?.priceCurrencyCode ?: oneTimePurchaseInfo?.priceCurrencyCode ?: "JPY",
                        type = if (productType == BillingClient.ProductType.SUBS) ProductType.SUBSCRIPTION else ProductType.INAPP,
                        billingPeriod = pricingInfo?.billingPeriod
                    )
                }
                cont.resume(products)
            } else {
                cont.resume(emptyList())
            }
        }
    }

    override suspend fun purchaseSubscription(
        productId: String,
        activityProvider: () -> Any
    ): Result<PurchaseResult> = suspendCancellableCoroutine { cont ->
        pendingPurchaseCallback = { result -> cont.resume(result) }

        launchBillingFlow(
            productId = productId,
            productType = BillingClient.ProductType.SUBS,
            activity = activityProvider() as Activity
        )
    }

    override suspend fun purchaseCredits(
        productId: String,
        activityProvider: () -> Any
    ): Result<PurchaseResult> = suspendCancellableCoroutine { cont ->
        pendingPurchaseCallback = { result -> cont.resume(result) }

        launchBillingFlow(
            productId = productId,
            productType = BillingClient.ProductType.INAPP,
            activity = activityProvider() as Activity
        )
    }

    private fun launchBillingFlow(
        productId: String,
        productType: String,
        activity: Activity
    ) {
        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(
                listOf(
                    QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(productId)
                        .setProductType(productType)
                        .build()
                )
            )
            .build()

        billingClient?.queryProductDetailsAsync(params) { billingResult, productDetailsList ->
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK && productDetailsList.isNotEmpty()) {
                val productDetails = productDetailsList[0]

                val flowParams = BillingFlowParams.newBuilder()
                    .setProductDetailsParamsList(
                        listOf(
                            BillingFlowParams.ProductDetailsParams.newBuilder()
                                .setProductDetails(productDetails)
                                .apply {
                                    // サブスクリプションの場合はオファートークンが必要
                                    if (productType == BillingClient.ProductType.SUBS) {
                                        productDetails.subscriptionOfferDetails?.firstOrNull()?.offerToken?.let {
                                            setOfferToken(it)
                                        }
                                    }
                                }
                                .build()
                        )
                    )
                    .build()

                billingClient?.launchBillingFlow(activity, flowParams)
            } else {
                pendingPurchaseCallback?.invoke(
                    Result.failure(Exception("商品情報の取得に失敗しました"))
                )
                pendingPurchaseCallback = null
            }
        }
    }

    override fun onPurchasesUpdated(
        billingResult: BillingResult,
        purchases: MutableList<Purchase>?
    ) {
        when (billingResult.responseCode) {
            BillingClient.BillingResponseCode.OK -> {
                purchases?.firstOrNull()?.let { purchase ->
                    pendingPurchaseCallback?.invoke(
                        Result.success(
                            PurchaseResult(
                                success = true,
                                purchaseToken = purchase.purchaseToken,
                                orderId = purchase.orderId
                            )
                        )
                    )
                } ?: run {
                    pendingPurchaseCallback?.invoke(
                        Result.failure(Exception("購入情報が見つかりません"))
                    )
                }
            }
            BillingClient.BillingResponseCode.USER_CANCELED -> {
                pendingPurchaseCallback?.invoke(
                    Result.success(
                        PurchaseResult(
                            success = false,
                            errorCode = billingResult.responseCode,
                            errorMessage = "購入がキャンセルされました"
                        )
                    )
                )
            }
            else -> {
                pendingPurchaseCallback?.invoke(
                    Result.failure(
                        Exception("購入エラー: ${billingResult.debugMessage}")
                    )
                )
            }
        }
        pendingPurchaseCallback = null
    }

    override suspend fun acknowledgePurchase(purchaseToken: String): Result<Unit> =
        suspendCancellableCoroutine { cont ->
            val params = AcknowledgePurchaseParams.newBuilder()
                .setPurchaseToken(purchaseToken)
                .build()

            billingClient?.acknowledgePurchase(params) { billingResult ->
                if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    cont.resume(Result.success(Unit))
                } else {
                    cont.resume(Result.failure(Exception("購入確認に失敗しました: ${billingResult.debugMessage}")))
                }
            }
        }

    override suspend fun getSubscriptionStatus(): Result<SubscriptionStatus> =
        suspendCancellableCoroutine { cont ->
            ensureConnectedSync()

            billingClient?.queryPurchasesAsync(
                QueryPurchasesParams.newBuilder()
                    .setProductType(BillingClient.ProductType.SUBS)
                    .build()
            ) { billingResult, purchases ->
                if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    val activePurchase = purchases.firstOrNull { purchase ->
                        purchase.purchaseState == Purchase.PurchaseState.PURCHASED
                    }

                    cont.resume(
                        Result.success(
                            SubscriptionStatus(
                                isActive = activePurchase != null,
                                productId = activePurchase?.products?.firstOrNull(),
                                purchaseToken = activePurchase?.purchaseToken,
                                autoRenewing = activePurchase?.isAutoRenewing ?: false
                            )
                        )
                    )
                } else {
                    cont.resume(
                        Result.failure(Exception("サブスクリプション状態の取得に失敗しました"))
                    )
                }
            }
        }

    override suspend fun getPurchaseHistory(): Result<List<PurchaseHistoryItem>> =
        suspendCancellableCoroutine { cont ->
            ensureConnectedSync()

            billingClient?.queryPurchaseHistoryAsync(
                QueryPurchaseHistoryParams.newBuilder()
                    .setProductType(BillingClient.ProductType.INAPP)
                    .build()
            ) { billingResult, historyRecords ->
                if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    val items = historyRecords?.map { record ->
                        PurchaseHistoryItem(
                            productId = record.products.firstOrNull() ?: "",
                            purchaseToken = record.purchaseToken,
                            purchaseTime = record.purchaseTime,
                            quantity = record.quantity
                        )
                    } ?: emptyList()

                    cont.resume(Result.success(items))
                } else {
                    cont.resume(Result.failure(Exception("購入履歴の取得に失敗しました")))
                }
            }
        }

    override suspend fun restorePurchases(): Result<Unit> {
        ensureConnected()
        // Google Playでは購入状態を再取得することで復元とする
        return getSubscriptionStatus().map { }
    }

    private suspend fun ensureConnected() {
        if (_connectionState.value != BillingConnectionState.CONNECTED) {
            startConnection()
            // 接続完了を待つ（最大5秒）
            repeat(50) {
                if (_connectionState.value == BillingConnectionState.CONNECTED) return
                kotlinx.coroutines.delay(100)
            }
        }
    }

    private fun ensureConnectedSync() {
        if (_connectionState.value != BillingConnectionState.CONNECTED) {
            startConnection()
        }
    }
}
