import Foundation
import StoreKit

/// StoreKit 2 Bridge for Kotlin Multiplatform
/// Provides in-app purchase functionality for iOS
@objc public class StoreKit2Bridge: NSObject {

    @objc public static let shared = StoreKit2Bridge()

    // Product IDs matching App Store Connect configuration
    private let subscriptionProductIds = [
        "premium_subscription"
    ]

    private let creditProductIds = [
        "credits_50",
        "credits_150",
        "credits_300"
    ]

    private var products: [Product] = []
    private var updateListenerTask: Task<Void, Error>? = nil

    private override init() {
        super.init()
        startTransactionListener()
    }

    deinit {
        updateListenerTask?.cancel()
    }

    // MARK: - Transaction Listener

    private func startTransactionListener() {
        updateListenerTask = Task.detached {
            for await result in Transaction.updates {
                do {
                    let transaction = try self.checkVerified(result)
                    await transaction.finish()
                    // Notify app about the transaction
                    await self.handleTransaction(transaction)
                } catch {
                    print("StoreKit2Bridge: Transaction verification failed: \(error)")
                }
            }
        }
    }

    private func handleTransaction(_ transaction: Transaction) async {
        // Post notification for Kotlin to observe
        DispatchQueue.main.async {
            NotificationCenter.default.post(
                name: NSNotification.Name("StoreKit2TransactionUpdate"),
                object: nil,
                userInfo: [
                    "productId": transaction.productID,
                    "transactionId": String(transaction.id)
                ]
            )
        }
    }

    // MARK: - Load Products

    @objc public func loadProducts(completion: @escaping ([[String: Any]]?, String?) -> Void) {
        Task {
            do {
                let allProductIds = subscriptionProductIds + creditProductIds
                let storeProducts = try await Product.products(for: allProductIds)
                self.products = storeProducts

                let productInfos = storeProducts.map { product -> [String: Any] in
                    var info: [String: Any] = [
                        "productId": product.id,
                        "name": product.displayName,
                        "description": product.description,
                        "price": product.displayPrice,
                        "priceMicros": Int64(truncating: product.price as NSNumber) * 1_000_000,
                        "currencyCode": product.priceFormatStyle.currencyCode,
                        "type": product.type == .autoRenewable ? "SUBSCRIPTION" : "INAPP"
                    ]

                    if let subscription = product.subscription {
                        info["billingPeriod"] = self.formatSubscriptionPeriod(subscription.subscriptionPeriod)
                    }

                    return info
                }

                DispatchQueue.main.async {
                    completion(productInfos, nil)
                }
            } catch {
                DispatchQueue.main.async {
                    completion(nil, error.localizedDescription)
                }
            }
        }
    }

    // MARK: - Purchase

    @objc public func purchase(
        productId: String,
        completion: @escaping ([String: Any]?, String?) -> Void
    ) {
        Task {
            guard let product = products.first(where: { $0.id == productId }) else {
                DispatchQueue.main.async {
                    completion(nil, "Product not found: \(productId)")
                }
                return
            }

            do {
                let result = try await product.purchase()

                switch result {
                case .success(let verification):
                    let transaction = try checkVerified(verification)
                    await transaction.finish()

                    let orderId = String(transaction.originalID)

                    let purchaseResult: [String: Any] = [
                        "success": true,
                        "purchaseToken": String(transaction.id),
                        "orderId": orderId,
                        "productId": transaction.productID
                    ]

                    DispatchQueue.main.async {
                        completion(purchaseResult, nil)
                    }

                case .userCancelled:
                    let cancelResult: [String: Any] = [
                        "success": false,
                        "errorCode": -1,
                        "errorMessage": "User cancelled"
                    ]
                    DispatchQueue.main.async {
                        completion(cancelResult, nil)
                    }

                case .pending:
                    let pendingResult: [String: Any] = [
                        "success": false,
                        "errorCode": -2,
                        "errorMessage": "Purchase pending"
                    ]
                    DispatchQueue.main.async {
                        completion(pendingResult, nil)
                    }

                @unknown default:
                    DispatchQueue.main.async {
                        completion(nil, "Unknown purchase result")
                    }
                }
            } catch {
                DispatchQueue.main.async {
                    completion(nil, error.localizedDescription)
                }
            }
        }
    }

    // MARK: - Subscription Status

    @objc public func getSubscriptionStatus(completion: @escaping ([String: Any]?, String?) -> Void) {
        Task {
            var activeSubscription: Transaction? = nil

            // Check for active subscriptions
            for await result in Transaction.currentEntitlements {
                do {
                    let transaction = try checkVerified(result)
                    if subscriptionProductIds.contains(transaction.productID) {
                        activeSubscription = transaction
                        break
                    }
                } catch {
                    continue
                }
            }

            if let subscription = activeSubscription {
                let status: [String: Any] = [
                    "isActive": true,
                    "productId": subscription.productID,
                    "purchaseToken": String(subscription.id),
                    "expiryTimeMillis": Int64(subscription.expirationDate?.timeIntervalSince1970 ?? 0) * 1000,
                    "autoRenewing": subscription.revocationDate == nil
                ]
                DispatchQueue.main.async {
                    completion(status, nil)
                }
            } else {
                let status: [String: Any] = [
                    "isActive": false
                ]
                DispatchQueue.main.async {
                    completion(status, nil)
                }
            }
        }
    }

    // MARK: - Purchase History

    @objc public func getPurchaseHistory(completion: @escaping ([[String: Any]]?, String?) -> Void) {
        Task {
            var history: [[String: Any]] = []

            for await result in Transaction.all {
                do {
                    let transaction = try checkVerified(result)
                    let item: [String: Any] = [
                        "productId": transaction.productID,
                        "purchaseToken": String(transaction.id),
                        "purchaseTime": Int64(transaction.purchaseDate.timeIntervalSince1970) * 1000,
                        "quantity": transaction.purchasedQuantity
                    ]
                    history.append(item)
                } catch {
                    continue
                }
            }

            DispatchQueue.main.async {
                completion(history, nil)
            }
        }
    }

    // MARK: - Restore Purchases

    @objc public func restorePurchases(completion: @escaping (Bool, String?) -> Void) {
        Task {
            do {
                try await AppStore.sync()
                DispatchQueue.main.async {
                    completion(true, nil)
                }
            } catch {
                DispatchQueue.main.async {
                    completion(false, error.localizedDescription)
                }
            }
        }
    }

    // MARK: - Helpers

    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified:
            throw StoreKitError.failedVerification
        case .verified(let safe):
            return safe
        }
    }

    private func formatSubscriptionPeriod(_ period: Product.SubscriptionPeriod) -> String {
        switch period.unit {
        case .day:
            return "P\(period.value)D"
        case .week:
            return "P\(period.value)W"
        case .month:
            return "P\(period.value)M"
        case .year:
            return "P\(period.value)Y"
        @unknown default:
            return "P1M"
        }
    }
}

// MARK: - Errors

enum StoreKitError: Error {
    case failedVerification
}
