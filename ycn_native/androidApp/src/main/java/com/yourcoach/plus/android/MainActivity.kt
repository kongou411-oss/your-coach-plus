package com.yourcoach.plus.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import cafe.adriel.voyager.navigator.Navigator
import cafe.adriel.voyager.transitions.SlideTransition
import com.yourcoach.plus.android.ui.theme.YourCoachTheme
import com.yourcoach.plus.shared.notification.PushNotificationHelper
import com.yourcoach.plus.shared.ui.screens.splash.SplashScreen

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        // Splash screen (optional, requires dependency)
        // installSplashScreen()

        super.onCreate(savedInstanceState)

        // Provide activity reference for notification permission requests
        PushNotificationHelper.currentActivity = this

        // Enable edge-to-edge display
        enableEdgeToEdge()

        setContent {
            YourCoachTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    Navigator(screen = SplashScreen()) { navigator ->
                        SlideTransition(navigator)
                    }
                }
            }
        }
    }
}
