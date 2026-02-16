package com.yourcoach.plus.shared.ui.screens.pgbase

import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
import com.yourcoach.plus.shared.domain.model.PgBaseArticle
import com.yourcoach.plus.shared.domain.model.PgBaseCategory
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.PgBaseRepository
import com.yourcoach.plus.shared.domain.repository.UserRepository
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * リスト表示用の記事データ（進捗情報を含む）
 */
data class PgBaseArticleWithProgress(
    val article: PgBaseArticle,
    val isCompleted: Boolean = false,
    val isPurchased: Boolean = false
)

/**
 * PGBASE画面のUI状態
 */
data class PgBaseUiState(
    val isLoading: Boolean = false,
    val selectedCategory: PgBaseCategory? = null,
    val articles: List<PgBaseArticleWithProgress> = emptyList(),
    val completedCount: Int = 0,
    val totalCount: Int = 0,
    val error: String? = null,
    // 記事詳細用
    val selectedArticle: PgBaseArticle? = null,
    val isArticleDetailVisible: Boolean = false,
    val isActionLoading: Boolean = false,
    val userCredits: Int = 0
)

/**
 * PGBASE画面のScreenModel
 */
class PgBaseScreenModel(
    private val pgBaseRepository: PgBaseRepository,
    private val authRepository: AuthRepository,
    private val userRepository: UserRepository
) : ScreenModel {

    private val _uiState = MutableStateFlow(PgBaseUiState())
    val uiState: StateFlow<PgBaseUiState> = _uiState.asStateFlow()

    private val exceptionHandler = CoroutineExceptionHandler { _, _ ->
        _uiState.update { it.copy(isLoading = false, error = "エラーが発生しました") }
    }

    // キャッシュ
    private var allArticles: List<PgBaseArticle> = emptyList()
    private var completedArticleIds: Set<String> = emptySet()
    private var purchasedArticleIds: Set<String> = emptySet()

    init {
        observeData()
    }

    /**
     * データをリアルタイム監視
     * observeArticles()がFirestoreスナップショットリスナーとして初回データも即座に配信するため、
     * 別途loadArticles()を呼ぶ必要はない
     */
    private fun observeData() {
        val userId = authRepository.getCurrentUserId() ?: return

        _uiState.update { it.copy(isLoading = true) }

        screenModelScope.launch(exceptionHandler) {
            // ユーザー情報を監視（クレジット）
            userRepository.observeUser(userId).collectLatest { user ->
                _uiState.update {
                    it.copy(userCredits = (user?.freeCredits ?: 0) + (user?.paidCredits ?: 0))
                }
            }
        }

        screenModelScope.launch(exceptionHandler) {
            // 記事と進捗を2クエリで監視（3→2に最適化）
            combine(
                pgBaseRepository.observeArticles(),
                pgBaseRepository.observeUserProgressIds(userId)
            ) { articles, (completedIds, purchasedIds) ->
                Triple(articles, completedIds, purchasedIds)
            }.collectLatest { (articles, completedIds, purchasedIds) ->
                allArticles = articles
                completedArticleIds = completedIds
                purchasedArticleIds = purchasedIds
                updateArticleList()
                _uiState.update { it.copy(isLoading = false) }
            }
        }
    }

    /**
     * 記事を再読み込み（Pull-to-Refresh用）
     */
    fun loadArticles() {
        screenModelScope.launch(exceptionHandler) {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val userId = authRepository.getCurrentUserId()

                val articlesResult = pgBaseRepository.getArticles()
                if (articlesResult.isFailure) {
                    _uiState.update {
                        it.copy(
                            error = articlesResult.exceptionOrNull()?.message ?: "記事の読み込みに失敗しました",
                            isLoading = false
                        )
                    }
                    return@launch
                }

                allArticles = articlesResult.getOrDefault(emptyList())

                if (userId != null) {
                    completedArticleIds = pgBaseRepository.getCompletedArticleIds(userId).getOrDefault(emptySet())
                    purchasedArticleIds = pgBaseRepository.getPurchasedArticleIds(userId).getOrDefault(emptySet())
                }

                updateArticleList()
                _uiState.update { it.copy(isLoading = false) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        error = e.message ?: "記事の読み込みに失敗しました",
                        isLoading = false
                    )
                }
            }
        }
    }

    /**
     * 記事リストを更新（カテゴリフィルタリング適用）
     */
    private fun updateArticleList() {
        val selectedCategory = _uiState.value.selectedCategory
        val filteredArticles = if (selectedCategory != null) {
            allArticles.filter { it.category == selectedCategory }
        } else {
            allArticles
        }

        val articlesWithProgress = filteredArticles.map { article ->
            PgBaseArticleWithProgress(
                article = article,
                isCompleted = article.id in completedArticleIds,
                isPurchased = article.id in purchasedArticleIds
            )
        }

        _uiState.update {
            it.copy(
                articles = articlesWithProgress,
                completedCount = articlesWithProgress.count { a -> a.isCompleted },
                totalCount = articlesWithProgress.size
            )
        }
    }

    /**
     * カテゴリを選択
     */
    fun selectCategory(category: PgBaseCategory?) {
        _uiState.update { it.copy(selectedCategory = category) }
        updateArticleList()
    }

    /**
     * 記事を選択して詳細を表示
     */
    fun selectArticle(articleId: String) {
        val article = allArticles.find { it.id == articleId }
        _uiState.update {
            it.copy(
                selectedArticle = article,
                isArticleDetailVisible = article != null
            )
        }
    }

    /**
     * 記事詳細を閉じる
     */
    fun closeArticleDetail() {
        _uiState.update {
            it.copy(
                selectedArticle = null,
                isArticleDetailVisible = false
            )
        }
    }

    /**
     * 記事を読了としてマーク
     */
    fun markArticleCompleted(articleId: String) {
        val userId = authRepository.getCurrentUserId() ?: return

        screenModelScope.launch(exceptionHandler) {
            _uiState.update { it.copy(isActionLoading = true) }
            try {
                val result = pgBaseRepository.markArticleCompleted(userId, articleId)
                if (result.isFailure) {
                    _uiState.update {
                        it.copy(
                            error = result.exceptionOrNull()?.message ?: "読了の記録に失敗しました",
                            isActionLoading = false
                        )
                    }
                    return@launch
                }

                // ローカルキャッシュを更新
                completedArticleIds = completedArticleIds + articleId
                updateArticleList()

                _uiState.update { it.copy(isActionLoading = false) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        error = e.message ?: "読了の記録に失敗しました",
                        isActionLoading = false
                    )
                }
            }
        }
    }

    /**
     * プレミアム記事を購入
     */
    fun purchaseArticle(articleId: String) {
        val userId = authRepository.getCurrentUserId() ?: return

        screenModelScope.launch(exceptionHandler) {
            _uiState.update { it.copy(isActionLoading = true) }
            try {
                val result = pgBaseRepository.purchaseArticle(userId, articleId)
                if (result.isFailure) {
                    _uiState.update {
                        it.copy(
                            error = result.exceptionOrNull()?.message ?: "記事の購入に失敗しました",
                            isActionLoading = false
                        )
                    }
                    return@launch
                }

                // ローカルキャッシュを更新
                purchasedArticleIds = purchasedArticleIds + articleId
                updateArticleList()

                _uiState.update { it.copy(isActionLoading = false) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        error = e.message ?: "記事の購入に失敗しました",
                        isActionLoading = false
                    )
                }
            }
        }
    }

    /**
     * 選択中の記事が読了済みかどうか
     */
    fun isSelectedArticleCompleted(): Boolean {
        val articleId = _uiState.value.selectedArticle?.id ?: return false
        return articleId in completedArticleIds
    }

    /**
     * 選択中の記事が購入済みかどうか
     */
    fun isSelectedArticlePurchased(): Boolean {
        val articleId = _uiState.value.selectedArticle?.id ?: return false
        return articleId in purchasedArticleIds
    }

    /**
     * 現在のユーザーIDを取得
     */
    fun getCurrentUserId(): String? = authRepository.getCurrentUserId()

    /**
     * エラーをクリア
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
