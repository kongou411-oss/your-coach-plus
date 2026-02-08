package com.yourcoach.plus.shared.util

import dev.gitlive.firebase.firestore.DocumentSnapshot

/**
 * Platform-specific profile map extraction from Firestore DocumentSnapshot.
 * On Kotlin/Native (iOS), Map<String, Any?> serialization doesn't work,
 * so we need platform-specific implementations.
 */
expect fun DocumentSnapshot.getProfileMap(): Map<String, Any?>?
