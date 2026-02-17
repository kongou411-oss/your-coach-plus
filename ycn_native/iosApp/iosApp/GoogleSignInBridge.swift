import Foundation
import GoogleSignIn
import UIKit

@objc public class GoogleSignInBridge: NSObject {
    @objc public static let shared = GoogleSignInBridge()

    // iOS用CLIENT_ID（GoogleService-Info.plistから）
    private let iOSClientId = "654534642431-fhv6j555ug7otbo752rgafpt37e3kk04.apps.googleusercontent.com"
    // Web/Server用CLIENT_ID（Firebase Auth検証用）
    private let serverClientId = "654534642431-654ak0n4ptob8r2qiu93keo6u1ics1qs.apps.googleusercontent.com"

    private override init() {
        super.init()
    }

    @objc public func signIn(
        presentingViewController: UIViewController,
        completion: @escaping (String?, Error?) -> Void
    ) {
        let config = GIDConfiguration(clientID: iOSClientId, serverClientID: serverClientId)
        GIDSignIn.sharedInstance.configuration = config

        GIDSignIn.sharedInstance.signIn(withPresenting: presentingViewController) { signInResult, error in
            if let error = error {
                completion(nil, error)
                return
            }

            guard let result = signInResult else {
                completion(nil, NSError(
                    domain: "GoogleSignInBridge",
                    code: -1,
                    userInfo: [NSLocalizedDescriptionKey: "Sign-in result is nil"]
                ))
                return
            }

            guard let idToken = result.user.idToken?.tokenString else {
                completion(nil, NSError(
                    domain: "GoogleSignInBridge",
                    code: -2,
                    userInfo: [NSLocalizedDescriptionKey: "Failed to get ID token"]
                ))
                return
            }

            let accessToken = result.user.accessToken.tokenString
            // idTokenとaccessTokenを区切り文字で結合して返す
            completion("\(idToken):::\(accessToken)", nil)
        }
    }

    @objc public func signOut() {
        GIDSignIn.sharedInstance.signOut()
    }

    @objc public func restorePreviousSignIn(completion: @escaping (String?, Error?) -> Void) {
        GIDSignIn.sharedInstance.restorePreviousSignIn { user, error in
            if let error = error {
                completion(nil, error)
                return
            }

            guard let user = user else {
                completion(nil, NSError(
                    domain: "GoogleSignInBridge",
                    code: -3,
                    userInfo: [NSLocalizedDescriptionKey: "No previous sign-in found"]
                ))
                return
            }

            guard let idToken = user.idToken?.tokenString else {
                completion(nil, NSError(
                    domain: "GoogleSignInBridge",
                    code: -2,
                    userInfo: [NSLocalizedDescriptionKey: "Failed to get ID token"]
                ))
                return
            }

            completion(idToken, nil)
        }
    }
}
