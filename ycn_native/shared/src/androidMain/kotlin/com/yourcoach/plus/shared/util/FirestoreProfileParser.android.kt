package com.yourcoach.plus.shared.util

import dev.gitlive.firebase.firestore.DocumentSnapshot

/**
 * Android implementation - uses standard serialization
 */
@Suppress("UNCHECKED_CAST")
actual fun DocumentSnapshot.getProfileMap(): Map<String, Any?>? {
    return try {
        get<Map<String, Any?>?>("profile")
    } catch (e: Throwable) {
        null
    }
}
