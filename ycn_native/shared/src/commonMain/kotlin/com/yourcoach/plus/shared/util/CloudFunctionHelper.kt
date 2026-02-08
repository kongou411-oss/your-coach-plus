package com.yourcoach.plus.shared.util

/**
 * Cloud Functionの長時間実行用ヘルパー
 * iOS: ネイティブSDKでtimeoutInterval=180秒を設定
 * Android: GitLive SDKのデフォルト動作
 */
expect suspend fun invokeCloudFunction(
    region: String,
    functionName: String,
    data: Map<String, Any>,
    timeoutSeconds: Long = 180
): Map<String, Any?>
