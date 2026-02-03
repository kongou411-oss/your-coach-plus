package com.yourcoach.plus.shared.di

import com.yourcoach.plus.shared.data.repository.FirebaseAuthRepository
import com.yourcoach.plus.shared.data.repository.FirestoreMealRepository
import com.yourcoach.plus.shared.data.repository.FirestoreUserRepository
import com.yourcoach.plus.shared.data.repository.FirestoreWorkoutRepository
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.MealRepository
import com.yourcoach.plus.shared.domain.repository.UserRepository
import com.yourcoach.plus.shared.domain.repository.WorkoutRepository
import com.yourcoach.plus.shared.ui.screens.auth.AuthScreenModel
import com.yourcoach.plus.shared.ui.screens.auth.ProfileSetupScreenModel
import com.yourcoach.plus.shared.ui.screens.dashboard.DashboardScreenModel
import org.koin.core.module.Module
import org.koin.dsl.module

/**
 * 共通DIモジュール
 * リポジトリとユースケースの登録
 */
val sharedModule = module {
    // Repositories
    single<AuthRepository> { FirebaseAuthRepository() }
    single<UserRepository> { FirestoreUserRepository() }
    single<MealRepository> { FirestoreMealRepository() }
    single<WorkoutRepository> { FirestoreWorkoutRepository() }

    // ScreenModels (Voyager)
    // Auth
    factory { AuthScreenModel(get(), get()) }
    factory { ProfileSetupScreenModel(get()) }
    // Dashboard
    factory { DashboardScreenModel(get(), get(), get(), get()) }

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
