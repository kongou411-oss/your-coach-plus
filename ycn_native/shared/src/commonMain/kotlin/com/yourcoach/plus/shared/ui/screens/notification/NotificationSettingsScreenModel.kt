package com.yourcoach.plus.shared.ui.screens.notification

import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.datetime.Clock

/**
 * Notification item (common for meal/workout/analysis/custom)
 */
data class NotificationItem(
    val id: String = Clock.System.now().toEpochMilliseconds().toString(),
    val time: String = "12:00",
    val title: String = "",
    val body: String = ""
)

/**
 * Notification tab types
 */
enum class NotificationTab(val label: String) {
    MEAL("Meal"),
    WORKOUT("Workout"),
    ANALYSIS("Analysis"),
    CUSTOM("Custom")
}

/**
 * Notification settings screen UI state
 */
data class NotificationSettingsUiState(
    val isLoading: Boolean = true,
    val hasNotificationPermission: Boolean = false,
    val selectedTab: NotificationTab = NotificationTab.MEAL,

    // Notification lists for each tab
    val mealNotifications: List<NotificationItem> = emptyList(),
    val workoutNotifications: List<NotificationItem> = emptyList(),
    val analysisNotifications: List<NotificationItem> = emptyList(),
    val customNotifications: List<NotificationItem> = emptyList(),

    // New notification input values
    val newTime: String = "12:00",
    val newTitle: String = "",
    val newBody: String = "",

    val isSaving: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null
)

/**
 * Notification settings repository interface (to be implemented per platform)
 */
interface NotificationSettingsRepository {
    suspend fun loadSettings(userId: String): Result<Map<NotificationTab, List<NotificationItem>>>
    suspend fun saveSettings(userId: String, tab: NotificationTab, items: List<NotificationItem>): Result<Unit>
    suspend fun scheduleNotification(userId: String, item: NotificationItem, type: String): Result<Unit>
    fun registerFcmToken()
    fun checkNotificationPermission(): Boolean
}

/**
 * Notification settings screen ScreenModel (Voyager)
 */
class NotificationSettingsScreenModel(
    private val authRepository: AuthRepository,
    private val notificationRepository: NotificationSettingsRepository? = null
) : ScreenModel {

    private val _uiState = MutableStateFlow(NotificationSettingsUiState())
    val uiState: StateFlow<NotificationSettingsUiState> = _uiState.asStateFlow()

    private val userId: String?
        get() = authRepository.getCurrentUserId()

    init {
        loadSettings()
    }

    /**
     * Check notification permission
     */
    fun checkNotificationPermission() {
        val hasPermission = notificationRepository?.checkNotificationPermission() ?: false
        _uiState.update { it.copy(hasNotificationPermission = hasPermission) }
    }

    /**
     * Register FCM token
     */
    fun registerFcmToken() {
        notificationRepository?.registerFcmToken()
    }

    /**
     * Select tab
     */
    fun selectTab(tab: NotificationTab) {
        // Set default values when switching tabs
        val (defaultTitle, defaultBody) = when (tab) {
            NotificationTab.MEAL -> "Time to eat" to "Don't forget to log your meal!"
            NotificationTab.WORKOUT -> "Time to workout" to "Let's start today's training!"
            NotificationTab.ANALYSIS -> "Time for reflection" to "Check today's nutrition with AI analysis"
            NotificationTab.CUSTOM -> "" to ""
        }

        _uiState.update {
            it.copy(
                selectedTab = tab,
                newTitle = defaultTitle,
                newBody = defaultBody,
                newTime = when (tab) {
                    NotificationTab.MEAL -> "12:00"
                    NotificationTab.WORKOUT -> "18:00"
                    NotificationTab.ANALYSIS -> "21:00"
                    NotificationTab.CUSTOM -> "12:00"
                }
            )
        }
    }

    /**
     * Update new time
     */
    fun updateNewTime(time: String) {
        _uiState.update { it.copy(newTime = time) }
    }

    /**
     * Update new title
     */
    fun updateNewTitle(title: String) {
        _uiState.update { it.copy(newTitle = title) }
    }

    /**
     * Update new body
     */
    fun updateNewBody(body: String) {
        _uiState.update { it.copy(newBody = body) }
    }

    /**
     * Load settings
     */
    private fun loadSettings() {
        screenModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            try {
                val uid = userId
                if (uid != null && notificationRepository != null) {
                    notificationRepository.loadSettings(uid)
                        .onSuccess { settings ->
                            _uiState.update {
                                it.copy(
                                    mealNotifications = settings[NotificationTab.MEAL] ?: emptyList(),
                                    workoutNotifications = settings[NotificationTab.WORKOUT] ?: emptyList(),
                                    analysisNotifications = settings[NotificationTab.ANALYSIS] ?: emptyList(),
                                    customNotifications = settings[NotificationTab.CUSTOM] ?: emptyList(),
                                    isLoading = false
                                )
                            }
                        }
                        .onFailure { e ->
                            _uiState.update {
                                it.copy(
                                    error = e.message,
                                    isLoading = false
                                )
                            }
                        }

                    // Set default values
                    selectTab(NotificationTab.MEAL)
                } else {
                    _uiState.update { it.copy(isLoading = false) }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        error = e.message,
                        isLoading = false
                    )
                }
            }
        }
    }

    /**
     * Add notification
     */
    fun addNotification() {
        val state = _uiState.value

        if (state.newTitle.isBlank()) {
            _uiState.update { it.copy(error = "Please enter a title") }
            return
        }
        if (state.newBody.isBlank()) {
            _uiState.update { it.copy(error = "Please enter a message") }
            return
        }

        screenModelScope.launch {
            _uiState.update { it.copy(isSaving = true) }

            try {
                val uid = userId ?: throw Exception("Not logged in")

                val newItem = NotificationItem(
                    id = Clock.System.now().toEpochMilliseconds().toString(),
                    time = state.newTime,
                    title = state.newTitle,
                    body = state.newBody
                )

                // Schedule notification via Cloud Function
                notificationRepository?.scheduleNotification(uid, newItem, state.selectedTab.name.lowercase())

                // Update local state
                val updatedList = when (state.selectedTab) {
                    NotificationTab.MEAL -> state.mealNotifications + newItem
                    NotificationTab.WORKOUT -> state.workoutNotifications + newItem
                    NotificationTab.ANALYSIS -> state.analysisNotifications + newItem
                    NotificationTab.CUSTOM -> state.customNotifications + newItem
                }

                // Save to Firestore
                notificationRepository?.saveSettings(uid, state.selectedTab, updatedList)

                // Update UI state
                _uiState.update {
                    when (state.selectedTab) {
                        NotificationTab.MEAL -> it.copy(
                            mealNotifications = updatedList,
                            isSaving = false,
                            successMessage = "Notification set for ${state.newTime}"
                        )
                        NotificationTab.WORKOUT -> it.copy(
                            workoutNotifications = updatedList,
                            isSaving = false,
                            successMessage = "Notification set for ${state.newTime}"
                        )
                        NotificationTab.ANALYSIS -> it.copy(
                            analysisNotifications = updatedList,
                            isSaving = false,
                            successMessage = "Notification set for ${state.newTime}"
                        )
                        NotificationTab.CUSTOM -> it.copy(
                            customNotifications = updatedList,
                            isSaving = false,
                            successMessage = "Notification set for ${state.newTime}"
                        )
                    }
                }

                // Reset to default values
                selectTab(state.selectedTab)

            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        error = "Failed to set notification: ${e.message}",
                        isSaving = false
                    )
                }
            }
        }
    }

    /**
     * Remove notification
     */
    fun removeNotification(item: NotificationItem) {
        val state = _uiState.value

        screenModelScope.launch {
            _uiState.update { it.copy(isSaving = true) }

            try {
                val uid = userId ?: throw Exception("Not logged in")

                // Update local state
                val updatedList = when (state.selectedTab) {
                    NotificationTab.MEAL -> state.mealNotifications.filter { it.id != item.id }
                    NotificationTab.WORKOUT -> state.workoutNotifications.filter { it.id != item.id }
                    NotificationTab.ANALYSIS -> state.analysisNotifications.filter { it.id != item.id }
                    NotificationTab.CUSTOM -> state.customNotifications.filter { it.id != item.id }
                }

                // Save to Firestore
                notificationRepository?.saveSettings(uid, state.selectedTab, updatedList)

                // Update UI state
                _uiState.update {
                    when (state.selectedTab) {
                        NotificationTab.MEAL -> it.copy(
                            mealNotifications = updatedList,
                            isSaving = false,
                            successMessage = "Notification removed"
                        )
                        NotificationTab.WORKOUT -> it.copy(
                            workoutNotifications = updatedList,
                            isSaving = false,
                            successMessage = "Notification removed"
                        )
                        NotificationTab.ANALYSIS -> it.copy(
                            analysisNotifications = updatedList,
                            isSaving = false,
                            successMessage = "Notification removed"
                        )
                        NotificationTab.CUSTOM -> it.copy(
                            customNotifications = updatedList,
                            isSaving = false,
                            successMessage = "Notification removed"
                        )
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        error = "Failed to remove notification: ${e.message}",
                        isSaving = false
                    )
                }
            }
        }
    }

    /**
     * Clear error
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    /**
     * Clear success message
     */
    fun clearSuccessMessage() {
        _uiState.update { it.copy(successMessage = null) }
    }
}
