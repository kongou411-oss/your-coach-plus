package com.yourcoach.plus.shared.ui.screens.badges

import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
import com.yourcoach.plus.shared.domain.model.Badge
import com.yourcoach.plus.shared.domain.model.BadgeCategory
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.BadgeDefinitions
import com.yourcoach.plus.shared.domain.repository.BadgeProgress
import com.yourcoach.plus.shared.domain.repository.BadgeRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.launch

/**
 * バッジ画面のUI状態
 */
data class BadgesUiState(
    val isLoading: Boolean = true,
    val earnedBadges: List<Badge> = emptyList(),
    val allBadges: List<Badge> = emptyList(),
    val badgeProgress: Map<String, BadgeProgress> = emptyMap(),
    val selectedCategory: BadgeCategory? = null,
    val error: String? = null
) {
    val earnedCount: Int get() = earnedBadges.size
    val totalCount: Int get() = allBadges.size

    val filteredBadges: List<Badge>
        get() {
            val badges = if (selectedCategory == null) {
                allBadges
            } else {
                allBadges.filter { it.category == selectedCategory }
            }
            return badges.map { badge ->
                earnedBadges.find { it.id == badge.id } ?: badge
            }
        }

    fun getEarnedCountByCategory(category: BadgeCategory): Int =
        earnedBadges.count { it.category == category }

    fun getTotalCountByCategory(category: BadgeCategory): Int =
        allBadges.count { it.category == category }
}

/**
 * バッジ画面のScreenModel (Voyager)
 */
class BadgesScreenModel(
    private val badgeRepository: BadgeRepository,
    private val authRepository: AuthRepository
) : ScreenModel {

    private val _uiState = MutableStateFlow(BadgesUiState())
    val uiState: StateFlow<BadgesUiState> = _uiState.asStateFlow()

    private val exceptionHandler = CoroutineExceptionHandler { _, throwable ->
        println("BadgesScreenModel: ${throwable.message}")
        _uiState.update { it.copy(isLoading = false, error = "エラーが発生しました") }
    }

    init {
        loadBadges()
    }

    private fun loadBadges() {
        screenModelScope.launch(exceptionHandler) {
            _uiState.update { it.copy(isLoading = true) }

            val allBadges = BadgeDefinitions.ALL_BADGES

            val uid = authRepository.getCurrentUserId()
            if (uid != null) {
                badgeRepository.getUserBadges(uid)
                    .onSuccess { earnedBadges ->
                        _uiState.update {
                            it.copy(
                                allBadges = allBadges,
                                earnedBadges = earnedBadges,
                                isLoading = false
                            )
                        }
                    }
                    .onFailure { error ->
                        _uiState.update {
                            it.copy(
                                allBadges = allBadges,
                                error = error.message,
                                isLoading = false
                            )
                        }
                    }

                badgeRepository.getBadgeProgress(uid)
                    .onSuccess { progress ->
                        _uiState.update { it.copy(badgeProgress = progress) }
                    }
            } else {
                _uiState.update {
                    it.copy(
                        allBadges = allBadges,
                        isLoading = false
                    )
                }
            }
        }
    }

    fun selectCategory(category: BadgeCategory?) {
        _uiState.update { it.copy(selectedCategory = category) }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    fun refresh() {
        loadBadges()
    }
}
