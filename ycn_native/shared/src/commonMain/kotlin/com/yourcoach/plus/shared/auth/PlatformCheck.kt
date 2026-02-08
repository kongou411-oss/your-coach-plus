package com.yourcoach.plus.shared.auth

/**
 * Apple Sign-Inが利用可能かどうかを返す
 * iOSの場合はtrue、Androidの場合はfalse
 */
expect fun isAppleSignInAvailable(): Boolean
