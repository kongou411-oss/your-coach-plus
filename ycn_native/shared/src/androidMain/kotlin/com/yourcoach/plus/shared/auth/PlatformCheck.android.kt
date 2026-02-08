package com.yourcoach.plus.shared.auth

/**
 * Apple Sign-Inが利用可能かどうかを返す
 * Androidでは常にfalse
 */
actual fun isAppleSignInAvailable(): Boolean = false
