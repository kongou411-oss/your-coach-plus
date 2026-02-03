package com.yourcoach.plus.android.di

import com.yourcoach.plus.android.data.billing.GooglePlayBillingRepository
import com.yourcoach.plus.android.data.repository.FirebaseAuthRepository
import com.yourcoach.plus.android.data.repository.FirestoreBadgeRepository
import com.yourcoach.plus.android.data.repository.FirestoreAnalysisRepository
import com.yourcoach.plus.android.data.repository.FirestoreMealRepository
import com.yourcoach.plus.android.data.repository.FirestoreScoreRepository
import com.yourcoach.plus.android.data.repository.FirestoreUserRepository
import com.yourcoach.plus.android.data.repository.FirestoreWorkoutRepository
import com.yourcoach.plus.android.data.repository.FirestoreConditionRepository
import com.yourcoach.plus.android.data.repository.FirestoreDirectiveRepository
import com.yourcoach.plus.android.data.repository.FirestorePgBaseRepository
import com.yourcoach.plus.android.data.repository.FirestoreComyRepository
import com.yourcoach.plus.android.data.repository.FirestoreRoutineRepository
import com.yourcoach.plus.android.data.service.FirebaseStorageService
import com.yourcoach.plus.android.data.repository.FirestoreCustomFoodRepository
import com.yourcoach.plus.android.data.repository.FirestoreCustomExerciseRepository
import com.google.firebase.firestore.FirebaseFirestore
import com.yourcoach.plus.android.data.service.FirebaseGeminiService
import com.yourcoach.plus.android.ui.screens.analysis.AnalysisViewModel
import com.yourcoach.plus.android.ui.screens.auth.AuthViewModel
import com.yourcoach.plus.android.ui.screens.auth.ProfileSetupViewModel
import com.yourcoach.plus.android.ui.screens.comy.ComyViewModel
import com.yourcoach.plus.android.ui.screens.dashboard.DashboardViewModel
import com.yourcoach.plus.android.ui.screens.history.HistoryViewModel
import com.yourcoach.plus.android.ui.screens.meal.AiFoodRecognitionViewModel
import com.yourcoach.plus.android.ui.screens.meal.MealViewModel
import com.yourcoach.plus.android.ui.screens.pgbase.PgBaseViewModel
import com.yourcoach.plus.android.ui.screens.settings.SettingsViewModel
import com.yourcoach.plus.android.ui.screens.settings.RoutineSettingsViewModel
import com.yourcoach.plus.android.ui.screens.settings.TemplateSettingsViewModel
import com.yourcoach.plus.android.ui.screens.settings.MealSlotSettingsViewModel
import com.yourcoach.plus.android.ui.screens.subscription.SubscriptionViewModel
import com.yourcoach.plus.android.ui.screens.notification.NotificationSettingsViewModel
import com.yourcoach.plus.android.ui.screens.badges.BadgesViewModel
import com.yourcoach.plus.android.ui.screens.workout.WorkoutViewModel
import com.yourcoach.plus.android.ui.screens.workout.WorkoutRecorderViewModel
import com.yourcoach.plus.android.ui.screens.routine.RoutineViewModel
import com.yourcoach.plus.shared.domain.repository.AnalysisRepository
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.BadgeRepository
import com.yourcoach.plus.shared.domain.repository.BillingRepository
import com.yourcoach.plus.shared.domain.repository.MealRepository
import com.yourcoach.plus.shared.domain.repository.ScoreRepository
import com.yourcoach.plus.shared.domain.repository.UserRepository
import com.yourcoach.plus.shared.domain.repository.WorkoutRepository
import com.yourcoach.plus.shared.domain.repository.ConditionRepository
import com.yourcoach.plus.shared.domain.repository.DirectiveRepository
import com.yourcoach.plus.shared.domain.repository.PgBaseRepository
import com.yourcoach.plus.shared.domain.repository.ComyRepository
import com.yourcoach.plus.shared.domain.repository.RoutineRepository
import com.yourcoach.plus.shared.domain.repository.CustomFoodRepository
import com.yourcoach.plus.shared.domain.repository.CustomExerciseRepository
import com.yourcoach.plus.shared.domain.service.GeminiService
import org.koin.android.ext.koin.androidContext
import org.koin.androidx.viewmodel.dsl.viewModel
import org.koin.dsl.module

/**
 * Android アプリ固有のDIモジュール
 */
val appModule = module {
    // Services
    single<GeminiService> { FirebaseGeminiService() }
    single { FirebaseGeminiService() }
    single { FirebaseStorageService(androidContext()) }

    // Repositories
    single<AuthRepository> { FirebaseAuthRepository() }
    single<UserRepository> { FirestoreUserRepository() }
    single<MealRepository> { FirestoreMealRepository() }
    single<WorkoutRepository> { FirestoreWorkoutRepository() }
    single<ScoreRepository> { FirestoreScoreRepository() }
    single<AnalysisRepository> { FirestoreAnalysisRepository() }
    single { FirestoreAnalysisRepository() }
    single<BillingRepository> { GooglePlayBillingRepository(androidContext()) }
    single<BadgeRepository> { FirestoreBadgeRepository() }
    single<ConditionRepository> { FirestoreConditionRepository() }
    single<DirectiveRepository> { FirestoreDirectiveRepository() }
    single<RoutineRepository> { FirestoreRoutineRepository(FirebaseFirestore.getInstance(), get(), get()) }
    single<CustomFoodRepository> { FirestoreCustomFoodRepository() }
    single<CustomExerciseRepository> { FirestoreCustomExerciseRepository() }
    single<PgBaseRepository> { FirestorePgBaseRepository(get()) }
    single<ComyRepository> { FirestoreComyRepository() }

    // ViewModels
    viewModel { AuthViewModel(get(), get()) }
    viewModel { ProfileSetupViewModel(get()) }
    viewModel { DashboardViewModel(get(), get(), get(), get(), get(), get(), get(), get()) }
    viewModel { HistoryViewModel(get(), get(), get(), get(), get()) }
    viewModel { PgBaseViewModel(get(), get(), get()) }
    viewModel { ComyViewModel(get(), get(), get(), get()) }
    viewModel { SettingsViewModel(get(), get(), get(), get(), get()) }
    viewModel { AnalysisViewModel(get(), get()) }
    viewModel { MealViewModel(get(), get(), get(), get(), get()) }
    viewModel { WorkoutViewModel(get(), get()) }
    viewModel { WorkoutRecorderViewModel(get()) }
    viewModel { AiFoodRecognitionViewModel(get(), get(), get(), get(), get(), get()) }
    viewModel { SubscriptionViewModel(get()) }
    viewModel { NotificationSettingsViewModel() }
    viewModel { BadgesViewModel(get()) }
    viewModel { RoutineViewModel(get()) }
    viewModel { RoutineSettingsViewModel(get()) }
    viewModel { TemplateSettingsViewModel() }
    viewModel { MealSlotSettingsViewModel(routineRepository = get()) }
}
