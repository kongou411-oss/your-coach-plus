import SwiftUI
import FirebaseCore
import FirebaseFirestore
import FirebaseAuth
import FirebaseMessaging
import GoogleSignIn
import UserNotifications
import shared

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        // Firebase初期化
        FirebaseApp.configure()

        // Firestore・Authを早期初期化（Auth→Firestoreのトークン伝播を確実にする）
        let _ = Firestore.firestore()
        let _ = Auth.auth()

        // FCM設定
        Messaging.messaging().delegate = FCMBridge.shared
        UNUserNotificationCenter.current().delegate = self

        // APNsトークンを早期に取得（通知許可済みの場合にFCMトークン生成に必要）
        application.registerForRemoteNotifications()

        // Koin初期化
        MainViewControllerKt.doInitKoin()
        return true
    }

    // APNsトークン受信
    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
    }

    // APNsトークン取得失敗
    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("Failed to register for remote notifications: \(error)")
    }
}

// MARK: - UNUserNotificationCenterDelegate
extension AppDelegate: UNUserNotificationCenterDelegate {
    // フォアグラウンドで通知を受信した時
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        let userInfo = notification.request.content.userInfo
        print("Received notification in foreground: \(userInfo)")

        // フォアグラウンドでもバナー、サウンド、バッジを表示
        completionHandler([.banner, .sound, .badge])
    }

    // 通知をタップした時
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        let userInfo = response.notification.request.content.userInfo
        print("User tapped notification: \(userInfo)")

        // 通知タイプに応じた処理
        if let type = userInfo["type"] as? String {
            handleNotificationTap(type: type, userInfo: userInfo)
        }

        completionHandler()
    }

    private func handleNotificationTap(type: String, userInfo: [AnyHashable: Any]) {
        // Post notification for Kotlin to handle navigation
        NotificationCenter.default.post(
            name: NSNotification.Name("NotificationTapped"),
            object: nil,
            userInfo: [
                "type": type,
                "data": userInfo
            ]
        )
    }
}

@main
struct iOSApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate

    var body: some Scene {
        WindowGroup {
            ContentView()
                .onOpenURL { url in
                    GIDSignIn.sharedInstance.handle(url)
                }
        }
    }
}
