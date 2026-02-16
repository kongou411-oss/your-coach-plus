package com.yourcoach.plus.shared.di

import com.yourcoach.plus.shared.data.service.FirebaseGeminiService
import com.yourcoach.plus.shared.data.service.FirebaseStorageService
import com.yourcoach.plus.shared.domain.service.GeminiService
import com.yourcoach.plus.shared.domain.service.StorageService
import org.koin.core.module.Module
import org.koin.dsl.module

/**
 * Android固有のDIモジュール
 */
actual fun platformModule(): Module = module {
    // GeminiService (GitLive Firebase SDK版)
    single<GeminiService> { FirebaseGeminiService() }

    // StorageService (GitLive Firebase SDK版)
    single<StorageService> { FirebaseStorageService() }
}
