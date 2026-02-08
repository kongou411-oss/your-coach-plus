import Foundation
import FirebaseMessaging
import FirebaseAuth
import FirebaseFirestore
import UIKit
import UserNotifications

/// FCM Bridge for Kotlin Multiplatform
/// Handles push notification registration and token management
@objc public class FCMBridge: NSObject {

    @objc public static let shared = FCMBridge()

    private override init() {
        super.init()
    }

    // MARK: - Token Management

    /// Get current FCM token
    @objc public func getToken(completion: @escaping (String?, Error?) -> Void) {
        Messaging.messaging().token { token, error in
            completion(token, error)
        }
    }

    /// Save FCM token to Firestore
    @objc public func saveTokenToFirestore() {
        guard let userId = Auth.auth().currentUser?.uid else {
            return
        }

        Messaging.messaging().token { [weak self] token, error in
            if let error = error {
                print("FCMBridge: Error fetching FCM token: \(error)")
                return
            }

            guard let token = token else {
                return
            }

            self?.saveToken(token, forUserId: userId)
        }
    }

    private func saveToken(_ token: String, forUserId userId: String) {
        let db = Firestore.firestore()
        db.collection("users").document(userId).updateData([
            "fcmTokens": FieldValue.arrayUnion([token])
        ]) { error in
            if let error = error {
                print("FCMBridge: Failed to save FCM token: \(error)")
            }
        }
    }

    // MARK: - Notification Permission

    /// Request notification permission
    @objc public func requestNotificationPermission(completion: @escaping (Bool, Error?) -> Void) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            DispatchQueue.main.async {
                if granted {
                    UIApplication.shared.registerForRemoteNotifications()
                }
                completion(granted, error)
            }
        }
    }

    /// Check notification permission status
    @objc public func checkNotificationPermission(completion: @escaping (Bool) -> Void) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            DispatchQueue.main.async {
                completion(settings.authorizationStatus == .authorized)
            }
        }
    }

    // MARK: - Token Refresh Handling

    /// Called when FCM token is refreshed
    func handleTokenRefresh(_ token: String) {
        guard let userId = Auth.auth().currentUser?.uid else {
            return
        }

        saveToken(token, forUserId: userId)
    }

    // MARK: - Remove Token

    /// Remove FCM token from Firestore (call on logout)
    @objc public func removeTokenFromFirestore() {
        guard let userId = Auth.auth().currentUser?.uid else {
            return
        }

        Messaging.messaging().token { token, error in
            guard let token = token else { return }

            let db = Firestore.firestore()
            db.collection("users").document(userId).updateData([
                "fcmTokens": FieldValue.arrayRemove([token])
            ]) { error in
                if let error = error {
                    print("FCMBridge: Failed to remove FCM token: \(error)")
                }
            }
        }
    }

    /// Delete FCM token completely (for account deletion)
    @objc public func deleteToken(completion: @escaping (Error?) -> Void) {
        Messaging.messaging().deleteToken { error in
            completion(error)
        }
    }
}

// MARK: - MessagingDelegate
extension FCMBridge: MessagingDelegate {
    public func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken else { return }
        print("FCMBridge: FCM Token received: \(token)")
        handleTokenRefresh(token)

        // Post notification for Kotlin to observe
        NotificationCenter.default.post(
            name: NSNotification.Name("FCMTokenRefreshed"),
            object: nil,
            userInfo: ["token": token]
        )
    }
}
