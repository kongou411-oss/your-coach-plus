package com.yourcoach.plus.shared.auth

/**
 * Apple Sign-Inが利用可能かどうかを返す
 * AndroidでもFirebase OAuthProvider Webフローで利用可能
 */
actual fun isAppleSignInAvailable(): Boolean = true
