package com.yourcoach.plus.android.di

import com.yourcoach.plus.android.data.billing.GooglePlayBillingRepository
import com.yourcoach.plus.android.data.service.FirebaseStorageService
import com.yourcoach.plus.shared.domain.repository.BillingRepository
import com.yourcoach.plus.shared.domain.usecase.MealUseCase
import com.yourcoach.plus.shared.domain.usecase.WorkoutUseCase
import org.koin.android.ext.koin.androidContext
import org.koin.dsl.module

/**
 * Android アプリ固有のDIモジュール
 * リポジトリ・ScreenModelはSharedModule (sharedModule) で登録済み
 * GeminiService・StorageServiceはPlatformModule (platformModule) で登録済み
 * ここではAndroid固有のサービス・UseCaseのみ登録
 */
val appModule = module {
    // Android-only Services
    single { FirebaseStorageService(androidContext()) }

    // Android-only Repositories
    single<BillingRepository> { GooglePlayBillingRepository(androidContext()) }

    // UseCases
    single { MealUseCase(get()) }
    single { WorkoutUseCase(get()) }
}
