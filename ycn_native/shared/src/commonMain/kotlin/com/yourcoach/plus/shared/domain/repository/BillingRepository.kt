package com.yourcoach.plus.shared.domain.repository

import kotlinx.coroutines.flow.Flow

/**
 * 課金リポジトリインターフェース
 */
interface BillingRepository {
    /**
     * 課金接続状態を監視
     */
    val connectionState: Flow<BillingConnectionState>

    /**
     * 利用可能な商品を取得
     */
    suspend fun getProducts(): Result<List<ProductInfo>>

    /**
     * サブスクリプションを購入
     * @param productId 商品ID
     * @param activityProvider Activity提供関数（Android用）
     */
    suspend fun purchaseSubscription(productId: String, activityProvider: () -> Any): Result<PurchaseResult>

    /**
     * クレジットパックを購入
     * @param productId 商品ID
     * @param activityProvider Activity提供関数
     */
    suspend fun purchaseCredits(productId: String, activityProvider: () -> Any): Result<PurchaseResult>

    /**
     * 購入を確認（acknowledge）
     */
    suspend fun acknowledgePurchase(purchaseToken: String): Result<Unit>

    /**
     * 現在のサブスクリプション状態を取得
     */
    suspend fun getSubscriptionStatus(): Result<SubscriptionStatus>

    /**
     * 購入履歴を取得
     */
    suspend fun getPurchaseHistory(): Result<List<PurchaseHistoryItem>>

    /**
     * 購入を復元（iOS: AppStore.sync / Android: 購入状態再取得）
     */
    suspend fun restorePurchases(): Result<Unit>

    /**
     * 接続を開始
     */
    fun startConnection()

    /**
     * 接続を終了
     */
    fun endConnection()
}

/**
 * 課金接続状態
 */
enum class BillingConnectionState {
    DISCONNECTED,
    CONNECTING,
    CONNECTED,
    ERROR
}

/**
 * 商品情報
 */
data class ProductInfo(
    val productId: String,
    val name: String,
    val description: String,
    val price: String,          // 表示用価格（"¥980"など）
    val priceMicros: Long,      // マイクロ単位の価格
    val currencyCode: String,
    val type: ProductType,
    val billingPeriod: String?  // サブスクリプションの場合: "P1M", "P1Y"など
)

/**
 * 商品タイプ
 */
enum class ProductType {
    SUBSCRIPTION,   // サブスクリプション
    INAPP          // 消耗品（クレジットパックなど）
}

/**
 * 購入結果
 */
data class PurchaseResult(
    val success: Boolean,
    val purchaseToken: String? = null,
    val orderId: String? = null,
    val errorCode: Int? = null,
    val errorMessage: String? = null
)

/**
 * サブスクリプション状態
 */
data class SubscriptionStatus(
    val isActive: Boolean,
    val productId: String? = null,
    val purchaseToken: String? = null,
    val expiryTimeMillis: Long? = null,
    val autoRenewing: Boolean = false
)

/**
 * 購入履歴アイテム
 */
data class PurchaseHistoryItem(
    val productId: String,
    val purchaseToken: String,
    val purchaseTime: Long,
    val quantity: Int
)
