package com.yourcoach.plus.shared.util

import dev.gitlive.firebase.Firebase
import dev.gitlive.firebase.functions.functions
import kotlinx.coroutines.withTimeout

/**
 * Android: GitLive SDKを使用（タイムアウトはKotlin coroutineで制御）
 */
@Suppress("UNCHECKED_CAST")
actual suspend fun invokeCloudFunction(
    region: String,
    functionName: String,
    data: Map<String, Any>,
    timeoutSeconds: Long
): Map<String, Any?> {
    val functions = Firebase.functions(region)
    val result = withTimeout(timeoutSeconds * 1000) {
        functions.httpsCallable(functionName).invoke(data)
    }
    return result.data() as? Map<String, Any?> ?: emptyMap()
}
