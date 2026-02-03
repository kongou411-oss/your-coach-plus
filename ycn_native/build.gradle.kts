plugins {
    // Android
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.android.library) apply false

    // Kotlin
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.multiplatform) apply false
    alias(libs.plugins.kotlin.serialization) apply false
    alias(libs.plugins.kotlin.compose) apply false

    // Compose Multiplatform
    alias(libs.plugins.compose.multiplatform) apply false

    // Google Services
    alias(libs.plugins.google.services) apply false
    alias(libs.plugins.firebase.crashlytics) apply false

    // KSP
    alias(libs.plugins.ksp) apply false
}

allprojects {
    group = "com.yourcoach.plus"
    version = "1.0.0"
}

tasks.register("clean", Delete::class) {
    delete(rootProject.layout.buildDirectory)
}
