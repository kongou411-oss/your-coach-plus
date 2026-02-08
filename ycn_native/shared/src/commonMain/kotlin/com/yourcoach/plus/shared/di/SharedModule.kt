package com.yourcoach.plus.shared.di

import com.yourcoach.plus.shared.data.repository.FirebaseAuthRepository
import com.yourcoach.plus.shared.data.repository.FirestoreAnalysisRepository
import com.yourcoach.plus.shared.data.repository.FirestoreBadgeRepository
import com.yourcoach.plus.shared.data.repository.FirestoreComyRepository
import com.yourcoach.plus.shared.data.repository.FirestoreConditionRepository
import com.yourcoach.plus.shared.data.repository.FirestoreCustomExerciseRepository
import com.yourcoach.plus.shared.data.repository.FirestoreCustomFoodRepository
import com.yourcoach.plus.shared.data.repository.FirestoreDirectiveRepository
import com.yourcoach.plus.shared.data.repository.FirestoreMealRepository
import com.yourcoach.plus.shared.data.repository.FirestorePgBaseRepository
import com.yourcoach.plus.shared.data.repository.FirestoreRoutineRepository
import com.yourcoach.plus.shared.data.repository.FirestoreScoreRepository
import com.yourcoach.plus.shared.data.repository.FirestoreUserRepository
import com.yourcoach.plus.shared.data.repository.FirestoreWorkoutRepository
import com.yourcoach.plus.shared.domain.repository.AnalysisRepository
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.BadgeRepository
import com.yourcoach.plus.shared.domain.repository.ComyRepository
import com.yourcoach.plus.shared.domain.repository.ConditionRepository
import com.yourcoach.plus.shared.domain.repository.CustomExerciseRepository
import com.yourcoach.plus.shared.domain.repository.CustomFoodRepository
import com.yourcoach.plus.shared.domain.repository.DirectiveRepository
import com.yourcoach.plus.shared.domain.repository.MealRepository
import com.yourcoach.plus.shared.domain.repository.PgBaseRepository
import com.yourcoach.plus.shared.domain.repository.RoutineRepository
import com.yourcoach.plus.shared.domain.repository.ScoreRepository
import com.yourcoach.plus.shared.domain.repository.UserRepository
import com.yourcoach.plus.shared.domain.repository.WorkoutRepository
import com.yourcoach.plus.shared.domain.service.GeminiService
import com.yourcoach.plus.shared.ui.screens.analysis.AnalysisScreenModel
import com.yourcoach.plus.shared.ui.screens.auth.AuthScreenModel
import com.yourcoach.plus.shared.ui.screens.auth.ProfileSetupScreenModel
import com.yourcoach.plus.shared.ui.screens.dashboard.DashboardScreenModel
import com.yourcoach.plus.shared.ui.screens.history.HistoryScreenModel
import com.yourcoach.plus.shared.ui.screens.settings.MealSlotSettingsScreenModel
import com.yourcoach.plus.shared.ui.screens.settings.ProfileEditScreenModel
import com.yourcoach.plus.shared.ui.screens.settings.RoutineSettingsScreenModel
import com.yourcoach.plus.shared.ui.screens.settings.SettingsScreenModel
import com.yourcoach.plus.shared.ui.screens.settings.TemplateSettingsScreenModel
import com.yourcoach.plus.shared.ui.screens.subscription.SubscriptionScreenModel
import com.yourcoach.plus.shared.ui.screens.badges.BadgesScreenModel
import com.yourcoach.plus.shared.ui.screens.pgbase.PgBaseScreenModel
import com.yourcoach.plus.shared.ui.screens.comy.ComyScreenModel
import com.yourcoach.plus.shared.ui.screens.notification.NotificationSettingsScreenModel
import com.yourcoach.plus.shared.ui.screens.notification.NotificationSettingsRepository
import com.yourcoach.plus.shared.data.repository.FirestoreNotificationSettingsRepository
import com.yourcoach.plus.shared.notification.PushNotificationHelper
import org.koin.core.module.Module
import org.koin.dsl.module

/**
 * 共通DIモジュール
 * リポジトリとユースケースの登録
 */
val sharedModule = module {
    // Core Repositories
    single<AuthRepository> { FirebaseAuthRepository() }
    single<UserRepository> { FirestoreUserRepository() }
    single<MealRepository> { FirestoreMealRepository() }
    single<WorkoutRepository> { FirestoreWorkoutRepository() }
    single<RoutineRepository> { FirestoreRoutineRepository() }

    // Additional Repositories
    single<CustomFoodRepository> { FirestoreCustomFoodRepository() }
    single<CustomExerciseRepository> { FirestoreCustomExerciseRepository() }
    single<ConditionRepository> { FirestoreConditionRepository() }
    single<DirectiveRepository> { FirestoreDirectiveRepository() }
    single<ScoreRepository> { FirestoreScoreRepository() }
    single<BadgeRepository> { FirestoreBadgeRepository() }
    single<PgBaseRepository> { FirestorePgBaseRepository() }
    single<ComyRepository> { FirestoreComyRepository() }
    single<AnalysisRepository> { FirestoreAnalysisRepository() }

    // ScreenModels (Voyager)
    // Auth
    factory { AuthScreenModel(get(), get()) }
    factory { ProfileSetupScreenModel(get(), get(), get()) }
    // Dashboard
    factory {
        DashboardScreenModel(
            authRepository = get(),
            userRepository = get(),
            mealRepository = get(),
            workoutRepository = get(),
            conditionRepository = get(),
            routineRepository = get(),
            scoreRepository = get(),
            directiveRepository = get()
        )
    }
    // History
    factory { HistoryScreenModel(get(), get(), get(), get()) }
    // Settings
    factory { SettingsScreenModel(get(), get(), get(), getOrNull<GeminiService>()) }
    factory { ProfileEditScreenModel(get(), get()) }
    factory { RoutineSettingsScreenModel(get(), get()) }
    factory { TemplateSettingsScreenModel(get(), get(), get()) }
    factory { MealSlotSettingsScreenModel(get(), get()) }
    // Notification
    single { PushNotificationHelper() }
    single<NotificationSettingsRepository> { FirestoreNotificationSettingsRepository() }
    factory { NotificationSettingsScreenModel(get(), get(), get()) }
    // Subscription
    factory { SubscriptionScreenModel(get(), get(), get()) }
    // Badges
    factory { BadgesScreenModel(get(), get()) }
    // PGBASE
    factory { PgBaseScreenModel(get(), get(), get()) }
    // COMY
    factory { ComyScreenModel(get(), get(), get(), get()) }
    // Analysis
    factory {
        AnalysisScreenModel(
            authRepository = get(),
            userRepository = get(),
            mealRepository = get(),
            workoutRepository = get(),
            conditionRepository = get(),
            scoreRepository = get(),
            geminiService = getOrNull<GeminiService>(),
            analysisRepository = get(),
            directiveRepository = get(),
            badgeRepository = get()
        )
    }

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
