package com.yourcoach.plus.shared.ui.screens.settings

import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
import com.yourcoach.plus.shared.domain.model.CustomFood
import com.yourcoach.plus.shared.domain.model.User
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.CustomFoodRepository
import com.yourcoach.plus.shared.domain.repository.UserRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Settings screen UI state
 */
data class SettingsUiState(
    val isLoading: Boolean = false,
    val user: User? = null,
    val isPremium: Boolean = false,
    val notificationsEnabled: Boolean = true,
    val appVersion: String = "1.0.0",
    val error: String? = null,
    val isLoggedOut: Boolean = false,
    val isAccountDeleted: Boolean = false,
    val isDeletingAccount: Boolean = false,
    val needsReauthentication: Boolean = false,
    val pendingDeleteUserId: String? = null,
    val isAddingCredits: Boolean = false,
    val creditsAddedMessage: String? = null,
    // Profile photo
    val isUploadingPhoto: Boolean = false,
    // Custom food management
    val customFoods: List<CustomFood> = emptyList(),
    val isLoadingCustomFoods: Boolean = false,
    val customFoodActionMessage: String? = null,
    // AI nutrition analysis
    val freeCredits: Int = 0,
    val paidCredits: Int = 0,
    val isAnalyzingNutrition: Boolean = false,
    val analyzingFoodId: String? = null,
    // Organization (B2B2C)
    val organizationName: String? = null,
    val isValidatingOrganization: Boolean = false,
    val organizationMessage: String? = null
)

/**
 * Settings item
 */
enum class SettingsItem(val title: String, val emoji: String) {
    PROFILE("Profile Settings", "person"),
    GOALS("Goal Settings", "target"),
    NOTIFICATIONS("Notification Settings", "bell"),
    BADGES("Achievements", "trophy"),
    PREMIUM("Premium", "star"),
    DATA_EXPORT("Data Export", "chart"),
    HELP("Help", "question"),
    FEEDBACK("Feedback", "message"),
    TERMS("Terms of Service", "document"),
    PRIVACY("Privacy Policy", "lock"),
    ABOUT("About", "info"),
    LOGOUT("Logout", "logout")
}

/**
 * Settings screen ScreenModel (Voyager)
 */
class SettingsScreenModel(
    private val authRepository: AuthRepository,
    private val userRepository: UserRepository,
    private val customFoodRepository: CustomFoodRepository? = null
) : ScreenModel {

    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    init {
        loadUserInfo()
        loadCustomFoods()
    }

    /**
     * Load user info
     */
    fun loadUserInfo() {
        screenModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val userId = authRepository.getCurrentUserId()
                if (userId != null) {
                    val result = userRepository.getUser(userId)
                    result.onSuccess { user ->
                        _uiState.update {
                            it.copy(
                                user = user,
                                isPremium = user?.isPremium ?: false,
                                freeCredits = user?.freeCredits ?: 0,
                                paidCredits = user?.paidCredits ?: 0,
                                organizationName = user?.b2b2cOrgName,
                                isLoading = false
                            )
                        }
                    }.onFailure { error ->
                        _uiState.update {
                            it.copy(
                                error = error.message,
                                isLoading = false
                            )
                        }
                    }
                } else {
                    _uiState.update { it.copy(isLoading = false) }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        error = e.message ?: "Failed to load user info",
                        isLoading = false
                    )
                }
            }
        }
    }

    /**
     * Toggle notification settings
     */
    fun toggleNotifications(enabled: Boolean) {
        _uiState.update { it.copy(notificationsEnabled = enabled) }
    }

    /**
     * Logout
     */
    fun logout() {
        screenModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                authRepository.signOut()
                _uiState.update { it.copy(isLoggedOut = true, isLoading = false) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        error = e.message ?: "Logout failed",
                        isLoading = false
                    )
                }
            }
        }
    }

    /**
     * Delete account
     */
    fun deleteAccount() {
        screenModelScope.launch {
            _uiState.update { it.copy(isDeletingAccount = true, needsReauthentication = false) }
            try {
                val userId = authRepository.getCurrentUserId()
                if (userId != null) {
                    val deleteAuthResult = authRepository.deleteAccount()
                    if (deleteAuthResult.isFailure) {
                        val error = deleteAuthResult.exceptionOrNull()
                        // Check for re-authentication required
                        _uiState.update {
                            it.copy(
                                isDeletingAccount = false,
                                needsReauthentication = true,
                                pendingDeleteUserId = userId
                            )
                        }
                        return@launch
                    }

                    // Delete Firestore data
                    userRepository.deleteUserData(userId)

                    _uiState.update {
                        it.copy(
                            isDeletingAccount = false,
                            isAccountDeleted = true,
                            pendingDeleteUserId = null
                        )
                    }
                } else {
                    _uiState.update {
                        it.copy(
                            isDeletingAccount = false,
                            error = "Could not verify login status"
                        )
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isDeletingAccount = false,
                        pendingDeleteUserId = null,
                        error = e.message ?: "Account deletion failed"
                    )
                }
            }
        }
    }

    /**
     * Clear re-authentication request
     */
    fun clearReauthenticationRequest() {
        _uiState.update { it.copy(needsReauthentication = false) }
    }

    /**
     * Clear error
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    /**
     * Clear credits added message
     */
    fun clearCreditsAddedMessage() {
        _uiState.update { it.copy(creditsAddedMessage = null) }
    }

    // ========== Custom Food Management ==========

    /**
     * Load custom foods
     */
    fun loadCustomFoods() {
        screenModelScope.launch {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            _uiState.update { it.copy(isLoadingCustomFoods = true) }

            customFoodRepository?.getCustomFoods(userId)
                ?.onSuccess { foods ->
                    _uiState.update {
                        it.copy(
                            customFoods = foods,
                            isLoadingCustomFoods = false
                        )
                    }
                }
                ?.onFailure { e ->
                    _uiState.update {
                        it.copy(
                            isLoadingCustomFoods = false,
                            error = e.message ?: "Failed to load custom foods"
                        )
                    }
                }
        }
    }

    /**
     * Update custom food
     */
    fun updateCustomFood(
        foodId: String,
        name: String,
        calories: Int,
        protein: Float,
        carbs: Float,
        fat: Float,
        fiber: Float = 0f
    ) {
        screenModelScope.launch {
            val userId = authRepository.getCurrentUserId() ?: return@launch

            customFoodRepository?.updateCustomFood(userId, foodId, mapOf(
                "name" to name,
                "calories" to calories,
                "protein" to protein,
                "carbs" to carbs,
                "fat" to fat,
                "fiber" to fiber
            ))?.onSuccess {
                _uiState.update {
                    it.copy(customFoodActionMessage = "Updated \"$name\"")
                }
                loadCustomFoods()
            }?.onFailure { e ->
                _uiState.update {
                    it.copy(error = "Update failed: ${e.message}")
                }
            }
        }
    }

    /**
     * Delete custom food
     */
    fun deleteCustomFood(foodId: String) {
        screenModelScope.launch {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            val food = _uiState.value.customFoods.find { it.id == foodId }

            customFoodRepository?.deleteCustomFood(userId, foodId)
                ?.onSuccess {
                    _uiState.update {
                        it.copy(customFoodActionMessage = "Deleted \"${food?.name ?: "food"}\"")
                    }
                    loadCustomFoods()
                }
                ?.onFailure { e ->
                    _uiState.update {
                        it.copy(error = e.message ?: "Deletion failed")
                    }
                }
        }
    }

    /**
     * Clear custom food action message
     */
    fun clearCustomFoodActionMessage() {
        _uiState.update { it.copy(customFoodActionMessage = null) }
    }

    // ========== Credits ==========

    /**
     * Get total credits
     */
    fun getTotalCredits(): Int {
        return _uiState.value.freeCredits + _uiState.value.paidCredits
    }

    // ========== Organization ==========

    /**
     * Clear organization message
     */
    fun clearOrganizationMessage() {
        _uiState.update { it.copy(organizationMessage = null) }
    }
}
