package com.yourcoach.plus.android

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.google.firebase.FirebaseApp
import com.yourcoach.plus.android.di.appModule
import com.yourcoach.plus.shared.di.platformModule
import com.yourcoach.plus.shared.di.sharedModule
import org.koin.android.ext.koin.androidContext
import org.koin.android.ext.koin.androidLogger
import org.koin.core.context.startKoin
import org.koin.core.logger.Level

class YourCoachApp : Application() {

    override fun onCreate() {
        super.onCreate()

        // Initialize Firebase
        FirebaseApp.initializeApp(this)

        // Initialize Koin DI
        startKoin {
            androidLogger(Level.ERROR)
            androidContext(this@YourCoachApp)
            modules(
                sharedModule,
                platformModule(),
                appModule
            )
        }

        // Create notification channels
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(NotificationManager::class.java)

            // Default channel
            val defaultChannel = NotificationChannel(
                "default_channel",
                "お知らせ",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "アプリからの通知"
            }

            // Meal reminder channel
            val mealChannel = NotificationChannel(
                "meal_reminder",
                "食事リマインダー",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "食事記録のリマインダー"
            }

            // Workout reminder channel
            val workoutChannel = NotificationChannel(
                "workout_reminder",
                "運動リマインダー",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "運動記録のリマインダー"
            }

            // Analysis channel
            val analysisChannel = NotificationChannel(
                "analysis",
                "AI分析",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "AI分析の通知"
            }

            // Streak channel
            val streakChannel = NotificationChannel(
                "streak",
                "ストリーク",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "ストリーク継続の通知"
            }

            notificationManager.createNotificationChannels(
                listOf(
                    defaultChannel,
                    mealChannel,
                    workoutChannel,
                    analysisChannel,
                    streakChannel
                )
            )
        }
    }
}
