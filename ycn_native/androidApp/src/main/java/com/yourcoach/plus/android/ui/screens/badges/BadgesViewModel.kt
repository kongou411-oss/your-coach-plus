package com.yourcoach.plus.android.ui.screens.badges

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.ktx.auth
import com.google.firebase.ktx.Firebase
import com.yourcoach.plus.shared.domain.model.Badge
import com.yourcoach.plus.shared.domain.model.BadgeCategory
import com.yourcoach.plus.shared.domain.repository.BadgeDefinitions
import com.yourcoach.plus.shared.domain.repository.BadgeProgress
import com.yourcoach.plus.shared.domain.repository.BadgeRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
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
    /**
     * 獲得済みバッジ数
     */
    val earnedCount: Int get() = earnedBadges.size

    /**
     * 総バッジ数
     */
    val totalCount: Int get() = allBadges.size

    /**
     * カテゴリでフィルタリングされたバッジ一覧
     */
    val filteredBadges: List<Badge>
        get() {
            val badges = if (selectedCategory == null) {
                allBadges
            } else {
                allBadges.filter { it.category == selectedCategory }
            }

            // 獲得済みバッジの情報をマージ
            return badges.map { badge ->
                earnedBadges.find { it.id == badge.id } ?: badge
            }
        }

    /**
     * カテゴリごとの獲得数
     */
    fun getEarnedCountByCategory(category: BadgeCategory): Int =
        earnedBadges.count { it.category == category }

    /**
     * カテゴリごとの総数
     */
    fun getTotalCountByCategory(category: BadgeCategory): Int =
        allBadges.count { it.category == category }
}

/**
 * バッジ画面のViewModel
 */
class BadgesViewModel(
    private val badgeRepository: BadgeRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(BadgesUiState())
    val uiState: StateFlow<BadgesUiState> = _uiState.asStateFlow()

    private val userId: String?
        get() = Firebase.auth.currentUser?.uid

    init {
        loadBadges()
    }

    /**
     * バッジを読み込み
     */
    private fun loadBadges() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            // すべてのバッジ定義を取得
            val allBadges = BadgeDefinitions.ALL_BADGES

            // ユーザーの獲得済みバッジを取得
            val uid = userId
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

                // バッジ進捗を取得
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

    /**
     * カテゴリを選択
     */
    fun selectCategory(category: BadgeCategory?) {
        _uiState.update { it.copy(selectedCategory = category) }
    }

    /**
     * エラーをクリア
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    /**
     * リフレッシュ
     */
    fun refresh() {
        loadBadges()
    }
}
