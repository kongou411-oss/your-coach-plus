package com.yourcoach.plus.shared.auth

/**
 * Apple Sign-Inが利用可能かどうかを返す
 * iOSでは常にtrue
 */
actual fun isAppleSignInAvailable(): Boolean = true
