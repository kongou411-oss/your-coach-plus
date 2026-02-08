import Foundation
import AuthenticationServices
import CryptoKit
import UIKit
import FirebaseAuth

@objc public class AppleSignInResult: NSObject {
    @objc public let idToken: String
    @objc public let nonce: String
    @objc public let fullName: String?
    @objc public let email: String?

    init(idToken: String, nonce: String, fullName: String?, email: String?) {
        self.idToken = idToken
        self.nonce = nonce
        self.fullName = fullName
        self.email = email
    }
}

@objc public class AppleSignInBridge: NSObject {
    @objc public static let shared = AppleSignInBridge()

    private var currentNonce: String?
    private var completion: ((AppleSignInResult?, Error?) -> Void)?

    private override init() {
        super.init()
    }

    @objc public func signIn(
        presentingViewController: UIViewController,
        completion: @escaping (AppleSignInResult?, Error?) -> Void
    ) {
        self.completion = completion

        let nonce: String
        do {
            nonce = try randomNonceString()
        } catch {
            completion(nil, error)
            return
        }
        currentNonce = nonce

        let appleIDProvider = ASAuthorizationAppleIDProvider()
        let request = appleIDProvider.createRequest()
        request.requestedScopes = [.fullName, .email]
        request.nonce = sha256(nonce)

        let authorizationController = ASAuthorizationController(authorizationRequests: [request])
        authorizationController.delegate = self
        authorizationController.presentationContextProvider = self
        authorizationController.performRequests()
    }

    private func randomNonceString(length: Int = 32) throws -> String {
        precondition(length > 0)
        var randomBytes = [UInt8](repeating: 0, count: length)
        let errorCode = SecRandomCopyBytes(kSecRandomDefault, randomBytes.count, &randomBytes)
        if errorCode != errSecSuccess {
            throw NSError(
                domain: "AppleSignInBridge",
                code: Int(errorCode),
                userInfo: [NSLocalizedDescriptionKey: "Unable to generate nonce. SecRandomCopyBytes failed with OSStatus \(errorCode)"]
            )
        }

        let charset: [Character] = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        let nonce = randomBytes.map { byte in
            charset[Int(byte) % charset.count]
        }

        return String(nonce)
    }

    private func sha256(_ input: String) -> String {
        let inputData = Data(input.utf8)
        let hashedData = SHA256.hash(data: inputData)
        let hashString = hashedData.compactMap {
            String(format: "%02x", $0)
        }.joined()

        return hashString
    }
}

extension AppleSignInBridge: ASAuthorizationControllerDelegate {
    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential else {
            completion?(nil, NSError(
                domain: "AppleSignInBridge",
                code: -1,
                userInfo: [NSLocalizedDescriptionKey: "Invalid credential type"]
            ))
            return
        }

        guard let nonce = currentNonce else {
            completion?(nil, NSError(
                domain: "AppleSignInBridge",
                code: -2,
                userInfo: [NSLocalizedDescriptionKey: "No nonce available"]
            ))
            return
        }

        guard let appleIDToken = appleIDCredential.identityToken,
              let idTokenString = String(data: appleIDToken, encoding: .utf8) else {
            completion?(nil, NSError(
                domain: "AppleSignInBridge",
                code: -3,
                userInfo: [NSLocalizedDescriptionKey: "Failed to get ID token"]
            ))
            return
        }

        var fullName: String? = nil
        if let givenName = appleIDCredential.fullName?.givenName,
           let familyName = appleIDCredential.fullName?.familyName {
            fullName = "\(givenName) \(familyName)"
        } else if let givenName = appleIDCredential.fullName?.givenName {
            fullName = givenName
        } else if let familyName = appleIDCredential.fullName?.familyName {
            fullName = familyName
        }

        let result = AppleSignInResult(
            idToken: idTokenString,
            nonce: nonce,
            fullName: fullName,
            email: appleIDCredential.email
        )

        completion?(result, nil)
        currentNonce = nil
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        completion?(nil, error)
        currentNonce = nil
    }
}

extension AppleSignInBridge: ASAuthorizationControllerPresentationContextProviding {
    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        for scene in UIApplication.shared.connectedScenes {
            if let windowScene = scene as? UIWindowScene {
                if let keyWindow = windowScene.windows.first(where: { $0.isKeyWindow }) {
                    return keyWindow
                }
                if let firstWindow = windowScene.windows.first {
                    return firstWindow
                }
            }
        }
        return UIWindow()
    }
}

// MARK: - Firebase Direct Authentication
extension AppleSignInBridge {
    /// Sign in to Firebase directly with Apple credentials (uses correct appleCredential method)
    @objc public func signInToFirebase(
        idToken: String,
        rawNonce: String,
        fullName: String?,
        completion: @escaping (String?, Error?) -> Void
    ) {
        // Create Apple credential using the correct method
        let credential = OAuthProvider.appleCredential(
            withIDToken: idToken,
            rawNonce: rawNonce,
            fullName: parseFullName(fullName)
        )

        // Sign in to Firebase
        Auth.auth().signIn(with: credential) { authResult, error in
            if let error = error {
                completion(nil, error)
            } else if let user = authResult?.user {
                completion(user.uid, nil)
            } else {
                completion(nil, NSError(
                    domain: "AppleSignInBridge",
                    code: -10,
                    userInfo: [NSLocalizedDescriptionKey: "No user returned from Firebase"]
                ))
            }
        }
    }

    private func parseFullName(_ fullName: String?) -> PersonNameComponents? {
        guard let fullName = fullName, !fullName.isEmpty else {
            return nil
        }
        let parts = fullName.split(separator: " ")
        var components = PersonNameComponents()
        if parts.count >= 1 {
            components.givenName = String(parts[0])
        }
        if parts.count >= 2 {
            components.familyName = String(parts[1])
        }
        return components
    }
}
