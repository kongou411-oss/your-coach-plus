package com.yourcoach.plus.shared.di

import org.koin.core.module.Module
import org.koin.dsl.module

/**
 * 共通DIモジュール
 * リポジトリとユースケースの登録
 */
val sharedModule = module {
    // ユースケースはここに登録
    // single { GetUserUseCase(get()) }
    // single { RecordMealUseCase(get()) }
    // single { RecordWorkoutUseCase(get()) }
    // single { CalculateScoreUseCase(get(), get(), get()) }
}

/**
 * プラットフォーム固有のモジュール
 * Android/iOSで別実装を提供
 */
expect fun platformModule(): Module
