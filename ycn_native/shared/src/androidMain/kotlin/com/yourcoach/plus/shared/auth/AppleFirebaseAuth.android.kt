package com.yourcoach.plus.shared.auth

import com.google.firebase.auth.FirebaseAuth

/**
 * Apple Sign-In Firebase認証 (Android実装)
 * AndroidではOAuthProvider Webフローで既にFirebase認証済みのため、
 * 現在のユーザーUIDを返すだけ
 */
actual suspend fun signInToFirebaseWithApple(
    idToken: String,
    rawNonce: String,
    fullName: String?
): Result<String> {
    val currentUser = FirebaseAuth.getInstance().currentUser
    return if (currentUser != null) {
        Result.success(currentUser.uid)
    } else {
        Result.failure(Exception("Firebase認証が完了していません"))
    }
}
