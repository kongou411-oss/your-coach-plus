import UIKit
import SwiftUI
import shared
import FirebaseFunctions

struct ComposeView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> UIViewController {
        let viewController = MainViewControllerKt.MainViewController()

        // グローバルにViewControllerを保持
        SignInBridgeManager.shared.composeViewController = viewController

        // Kotlin側にハンドラーを設定
        SignInBridgeManager.shared.setupHandlers()

        return viewController
    }

    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}
}

struct ContentView: View {
    var body: some View {
        ComposeView()
            .ignoresSafeArea(.all) // Compose handles all safe area insets (including notch, home indicator)
    }
}

/// Sign-Inブリッジのマネージャー
/// Kotlin側のグローバル関数とSwiftネイティブSDKを連携
class SignInBridgeManager {
    static let shared = SignInBridgeManager()

    weak var composeViewController: UIViewController?

    private init() {}

    func setupHandlers() {
        // Google Sign-In ハンドラー設定
        GoogleSignInHelper_iosKt.googleSignInHandler = { [weak self] viewController, completion in
            guard let self = self else {
                completion(nil, "SignInBridgeManager is deallocated")
                return
            }

            GoogleSignInBridge.shared.signIn(presentingViewController: viewController) { idToken, error in
                if let error = error {
                    completion(nil, error.localizedDescription)
                } else if let idToken = idToken {
                    completion(idToken, nil)
                } else {
                    completion(nil, "Failed to get ID token")
                }
            }
        }

        // Google Sign-In ViewController プロバイダー設定
        GoogleSignInHelper_iosKt.googleCurrentViewControllerProvider = { [weak self] in
            return self?.composeViewController
        }

        // Apple Sign-In ハンドラー設定
        AppleSignInHelper_iosKt.appleSignInHandler = { [weak self] viewController, completion in
            guard let self = self else {
                completion(nil, nil, nil, nil, "SignInBridgeManager is deallocated")
                return
            }

            AppleSignInBridge.shared.signIn(presentingViewController: viewController) { result, error in
                if let error = error {
                    completion(nil, nil, nil, nil, error.localizedDescription)
                } else if let result = result {
                    completion(result.idToken, result.nonce, result.fullName, result.email, nil)
                } else {
                    completion(nil, nil, nil, nil, "Failed to get Apple Sign-In result")
                }
            }
        }

        // Apple Sign-In ViewController プロバイダー設定
        AppleSignInHelper_iosKt.appleCurrentViewControllerProvider = { [weak self] in
            return self?.composeViewController
        }

        // Apple Firebase直接認証ハンドラー設定
        AppleSignInHelper_iosKt.appleFirebaseAuthHandler = { idToken, rawNonce, fullName, completion in
            AppleSignInBridge.shared.signInToFirebase(
                idToken: idToken,
                rawNonce: rawNonce,
                fullName: fullName
            ) { uid, error in
                if let error = error {
                    completion(nil, error.localizedDescription)
                } else if let uid = uid {
                    completion(uid, nil)
                } else {
                    completion(nil, "Firebase認証に失敗しました")
                }
            }
        }

        // FCM ハンドラー設定
        setupFCMHandlers()

        // カメラ ハンドラー設定
        setupCameraHandlers()

        // StoreKit2 ハンドラー設定
        setupStoreKit2Handlers()

        // Cloud Function ハンドラー設定（長時間実行用）
        setupCloudFunctionHandlers()
    }

    private func setupFCMHandlers() {
        // 通知許可リクエストハンドラー
        PushNotificationHelper_iosKt.fcmRequestPermissionHandler = { completion in
            FCMBridge.shared.requestNotificationPermission { granted, error in
                if let error = error {
                    _ = completion(KotlinBoolean(value: granted), error.localizedDescription)
                } else {
                    _ = completion(KotlinBoolean(value: granted), nil)
                }
            }
        }

        // 通知許可確認ハンドラー
        PushNotificationHelper_iosKt.fcmCheckPermissionHandler = { completion in
            FCMBridge.shared.checkNotificationPermission { granted in
                _ = completion(KotlinBoolean(value: granted))
            }
        }

        // FCMトークン取得ハンドラー
        PushNotificationHelper_iosKt.fcmGetTokenHandler = { completion in
            FCMBridge.shared.getToken { token, error in
                if let error = error {
                    _ = completion(nil, error.localizedDescription)
                } else if let token = token {
                    _ = completion(token, nil)
                } else {
                    _ = completion(nil, "Failed to get FCM token")
                }
            }
        }

        // FCMトークン保存ハンドラー
        PushNotificationHelper_iosKt.fcmSaveTokenHandler = {
            FCMBridge.shared.saveTokenToFirestore()
        }

        // FCMトークン削除ハンドラー
        PushNotificationHelper_iosKt.fcmRemoveTokenHandler = {
            FCMBridge.shared.removeTokenFromFirestore()
        }
    }

    private func setupCloudFunctionHandlers() {
        CloudFunctionHelper_iosKt.cloudFunctionHandler = { region, functionName, data, completion in
            // バックグラウンドタスクを登録してiOSによる強制終了を防ぐ
            var backgroundTaskID: UIBackgroundTaskIdentifier = .invalid
            backgroundTaskID = UIApplication.shared.beginBackgroundTask(withName: "CloudFunction-\(functionName)") {
                // 時間切れ時のクリーンアップ
                if backgroundTaskID != .invalid {
                    UIApplication.shared.endBackgroundTask(backgroundTaskID)
                    backgroundTaskID = .invalid
                }
            }

            let functions = Functions.functions(region: region)
            let callable = functions.httpsCallable(functionName)
            callable.timeoutInterval = 180 // 3分（クエスト生成・分析用）

            print("[CloudFunction] Calling \(functionName) with timeout=180s, bgTask=\(backgroundTaskID.rawValue)")

            callable.call(data) { result, error in
                // バックグラウンドタスクを終了
                if backgroundTaskID != .invalid {
                    UIApplication.shared.endBackgroundTask(backgroundTaskID)
                    backgroundTaskID = .invalid
                }

                if let error = error {
                    print("[CloudFunction] \(functionName) failed: \(error.localizedDescription)")
                    _ = completion(nil, error.localizedDescription)
                } else {
                    print("[CloudFunction] \(functionName) succeeded")
                    _ = completion(result?.data, nil)
                }
            }
        }
    }

    private func setupCameraHandlers() {
        // カメラまたはフォトライブラリ選択アクションシート
        CameraHelper_iosKt.cameraShowImageSourceSelectionHandler = { [weak self] viewController, completion in
            guard self != nil else {
                completion(nil, nil, "SignInBridgeManager is deallocated")
                return
            }

            CameraBridge.shared.showImageSourceSelection(presentingViewController: viewController) { base64, mimeType, error in
                completion(base64, mimeType, error)
            }
        }

        // フォトピッカー
        CameraHelper_iosKt.cameraShowPhotoPickerHandler = { [weak self] viewController, completion in
            guard self != nil else {
                completion(nil, nil, "SignInBridgeManager is deallocated")
                return
            }

            CameraBridge.shared.showPhotoPicker(presentingViewController: viewController) { base64, mimeType, error in
                completion(base64, mimeType, error)
            }
        }

        // カメラ
        CameraHelper_iosKt.cameraShowCameraHandler = { [weak self] viewController, completion in
            guard self != nil else {
                completion(nil, nil, "SignInBridgeManager is deallocated")
                return
            }

            CameraBridge.shared.showCamera(presentingViewController: viewController) { base64, mimeType, error in
                completion(base64, mimeType, error)
            }
        }

        // カメラ権限チェック
        CameraHelper_iosKt.cameraCheckPermissionHandler = { completion in
            CameraBridge.shared.checkCameraPermission { granted in
                _ = completion(KotlinBoolean(value: granted))
            }
        }

        // ViewController プロバイダー
        CameraHelper_iosKt.cameraCurrentViewControllerProvider = { [weak self] in
            return self?.composeViewController
        }

        // ライブカメラプレビュー用ハンドラー
        CameraHelper_iosKt.cameraGetPreviewViewHandler = {
            return CameraPreviewManager.shared.previewView
        }

        CameraHelper_iosKt.cameraStartPreviewHandler = {
            CameraPreviewManager.shared.startCamera()
        }

        CameraHelper_iosKt.cameraStopPreviewHandler = {
            CameraPreviewManager.shared.stopCamera()
        }

        CameraHelper_iosKt.cameraCaptureFromPreviewHandler = { completion in
            CameraPreviewManager.shared.capturePhoto { base64, mimeType, error in
                completion(base64, mimeType, error)
            }
        }

        CameraHelper_iosKt.cameraUpdatePreviewFrameHandler = {
            CameraPreviewManager.shared.updatePreviewFrame()
        }
    }

    private func setupStoreKit2Handlers() {
        // 商品一覧取得
        StoreKit2BillingRepositoryKt.storeKit2LoadProductsHandler = { completion in
            StoreKit2Bridge.shared.loadProducts { products, error in
                if let products = products {
                    // Convert [[String: Any]] to List<Map<String, Any?>>
                    let productList = products.map { dict -> [String: Any?] in
                        var result: [String: Any?] = [:]
                        for (key, value) in dict {
                            result[key] = value
                        }
                        return result
                    }
                    _ = completion(productList, error)
                } else {
                    _ = completion(nil, error)
                }
            }
        }

        // 購入
        StoreKit2BillingRepositoryKt.storeKit2PurchaseHandler = { productId, completion in
            StoreKit2Bridge.shared.purchase(productId: productId) { result, error in
                if let result = result {
                    var resultMap: [String: Any?] = [:]
                    for (key, value) in result {
                        resultMap[key] = value
                    }
                    _ = completion(resultMap, error)
                } else {
                    _ = completion(nil, error)
                }
            }
        }

        // サブスクリプション状態取得
        StoreKit2BillingRepositoryKt.storeKit2GetSubscriptionStatusHandler = { completion in
            StoreKit2Bridge.shared.getSubscriptionStatus { status, error in
                if let status = status {
                    var statusMap: [String: Any?] = [:]
                    for (key, value) in status {
                        statusMap[key] = value
                    }
                    _ = completion(statusMap, error)
                } else {
                    _ = completion(nil, error)
                }
            }
        }

        // 購入履歴取得
        StoreKit2BillingRepositoryKt.storeKit2GetPurchaseHistoryHandler = { completion in
            StoreKit2Bridge.shared.getPurchaseHistory { history, error in
                if let history = history {
                    let historyList = history.map { dict -> [String: Any?] in
                        var result: [String: Any?] = [:]
                        for (key, value) in dict {
                            result[key] = value
                        }
                        return result
                    }
                    _ = completion(historyList, error)
                } else {
                    _ = completion(nil, error)
                }
            }
        }

        // 購入復元
        StoreKit2BillingRepositoryKt.storeKit2RestorePurchasesHandler = { completion in
            StoreKit2Bridge.shared.restorePurchases { success, error in
                _ = completion(KotlinBoolean(value: success), error)
            }
        }
    }
}
