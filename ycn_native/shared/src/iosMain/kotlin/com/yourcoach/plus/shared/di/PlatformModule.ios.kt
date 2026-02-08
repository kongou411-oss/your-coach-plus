package com.yourcoach.plus.shared.di

import com.yourcoach.plus.shared.billing.StoreKit2BillingRepository
import com.yourcoach.plus.shared.data.service.FirebaseGeminiService
import com.yourcoach.plus.shared.data.service.FirebaseStorageService
import com.yourcoach.plus.shared.domain.repository.BillingRepository
import com.yourcoach.plus.shared.domain.service.GeminiService
import com.yourcoach.plus.shared.domain.service.StorageService
import org.koin.core.module.Module
import org.koin.dsl.module

/**
 * iOS固有のDIモジュール
 */
actual fun platformModule(): Module = module {
    // iOS固有の依存関係
    // single<HttpClientEngine> { Darwin.create() }

    // iOS Billing (StoreKit 2)
    single<BillingRepository> { StoreKit2BillingRepository() }

    // GeminiService (GitLive Firebase SDK版)
    single<GeminiService> { FirebaseGeminiService() }

    // StorageService (GitLive Firebase SDK版)
    single<StorageService> { FirebaseStorageService() }
}
