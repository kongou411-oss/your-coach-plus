package com.yourcoach.plus.shared.util

import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeout
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * Swift側から設定されるCloud Functionハンドラー
 * (region, functionName, data, completion: (result?, error?) -> Unit) -> Unit
 */
var cloudFunctionHandler: ((String, String, Map<String, Any>, (Any?, String?) -> Unit) -> Unit)? = null

/**
 * iOS: Swift側のハンドラー経由でネイティブFirebase SDKを使用
 * ネイティブSDKでtimeoutIntervalを180秒に設定可能
 */
@Suppress("UNCHECKED_CAST")
actual suspend fun invokeCloudFunction(
    region: String,
    functionName: String,
    data: Map<String, Any>,
    timeoutSeconds: Long
): Map<String, Any?> {
    val handler = cloudFunctionHandler
        ?: throw IllegalStateException("Cloud Function handler not initialized. Call setupCloudFunctionHandlers() first.")

    return withTimeout(timeoutSeconds * 1000) {
        suspendCancellableCoroutine { continuation ->
            handler(region, functionName, data) { result, error ->
                if (error != null) {
                    continuation.resumeWithException(Exception(error))
                } else {
                    val map = result as? Map<String, Any?> ?: emptyMap()
                    continuation.resume(map)
                }
            }
        }
    }
}
