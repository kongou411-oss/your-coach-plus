package com.yourcoach.plus.shared.util

import com.google.firebase.functions.FirebaseFunctions
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeout
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * Android: ネイティブFirebase Functions SDKを直接使用
 * GitLive SDKのdata<Any?>()はkotlinx.serializationでAnyのシリアライザが
 * 見つからずエラーになるため、ネイティブSDKのgetData()を使用する
 */
@Suppress("UNCHECKED_CAST")
actual suspend fun invokeCloudFunction(
    region: String,
    functionName: String,
    data: Map<String, Any>,
    timeoutSeconds: Long
): Map<String, Any?> {
    val functions = FirebaseFunctions.getInstance(region)
    return withTimeout(timeoutSeconds * 1000) {
        suspendCancellableCoroutine { continuation ->
            functions.getHttpsCallable(functionName).call(data)
                .addOnSuccessListener { result ->
                    val raw = result.data
                    val map = raw as? Map<String, Any?> ?: emptyMap()
                    continuation.resume(map)
                }
                .addOnFailureListener { exception ->
                    continuation.resumeWithException(exception)
                }
        }
    }
}
