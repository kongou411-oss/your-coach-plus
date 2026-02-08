package com.yourcoach.plus.android.ui.screens.comy

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.yourcoach.plus.android.data.service.FirebaseStorageService
import com.yourcoach.plus.shared.domain.model.ComyCategory
import com.yourcoach.plus.shared.domain.model.ComyComment
import com.yourcoach.plus.shared.domain.model.ComyPost
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.ComyRepository
import com.yourcoach.plus.shared.domain.repository.UserRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * リスト表示用の投稿データ（いいね状態を含む）
 */
data class ComyPostWithLike(
    val post: ComyPost,
    val isLiked: Boolean = false
)

/**
 * COMY画面のUI状態
 */
data class ComyUiState(
    val isLoading: Boolean = false,
    val selectedCategory: ComyCategory? = null,
    val posts: List<ComyPostWithLike> = emptyList(),
    val error: String? = null,
    // 投稿詳細用
    val selectedPost: ComyPost? = null,
    val selectedPostComments: List<ComyComment> = emptyList(),
    val isPostDetailVisible: Boolean = false,
    // 投稿作成用
    val isCreatePostVisible: Boolean = false,
    // アクション状態
    val isActionLoading: Boolean = false,
    // 現在のユーザー情報
    val currentUserName: String = "",
    val currentUserPhotoUrl: String? = null,
    val currentUserId: String = ""
)

/**
 * COMY画面のViewModel
 */
class ComyViewModel(
    private val comyRepository: ComyRepository,
    private val authRepository: AuthRepository,
    private val userRepository: UserRepository,
    private val storageService: FirebaseStorageService
) : ViewModel() {

    private val _uiState = MutableStateFlow(ComyUiState())
    val uiState: StateFlow<ComyUiState> = _uiState.asStateFlow()

    // キャッシュ
    private var allPosts: List<ComyPost> = emptyList()
    private var likedPostIds: Set<String> = emptySet()

    init {
        _uiState.update { it.copy(currentUserId = authRepository.getCurrentUserId() ?: "") }
        observeData()
        loadPosts()
        loadCurrentUser()
    }

    /**
     * 現在のユーザー情報を取得
     */
    private fun loadCurrentUser() {
        val userId = authRepository.getCurrentUserId() ?: return
        _uiState.update { it.copy(currentUserId = userId) }
        viewModelScope.launch {
            userRepository.observeUser(userId).collectLatest { user ->
                _uiState.update {
                    it.copy(
                        currentUserName = user?.profile?.nickname
                            ?: user?.displayName
                            ?: user?.email?.substringBefore("@")
                            ?: "ユーザー",
                        currentUserPhotoUrl = user?.photoUrl
                    )
                }
            }
        }
    }

    /**
     * データをリアルタイム監視
     */
    private fun observeData() {
        val userId = authRepository.getCurrentUserId() ?: return
        _uiState.update { it.copy(currentUserId = userId) }

        viewModelScope.launch {
            // 投稿といいね状態を組み合わせて監視
            combine(
                comyRepository.observePosts(limit = 50),
                comyRepository.observeLikedPostIds(userId)
            ) { posts, likedIds ->
                Pair(posts, likedIds)
            }.collectLatest { (posts, likedIds) ->
                allPosts = posts
                likedPostIds = likedIds
                updatePostList()
            }
        }
    }

    /**
     * 投稿を読み込み
     */
    fun loadPosts() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val userId = authRepository.getCurrentUserId()

                // 投稿を取得
                val postsResult = comyRepository.getPosts(
                    category = _uiState.value.selectedCategory,
                    limit = 50
                )
                if (postsResult.isFailure) {
                    _uiState.update {
                        it.copy(
                            error = postsResult.exceptionOrNull()?.message ?: "投稿の読み込みに失敗しました",
                            isLoading = false
                        )
                    }
                    return@launch
                }

                allPosts = postsResult.getOrDefault(emptyList())

                // ユーザーがログインしている場合はいいね情報も取得
                if (userId != null) {
                    likedPostIds = comyRepository.getLikedPostIds(userId).getOrDefault(emptySet())
                }

                updatePostList()
                _uiState.update { it.copy(isLoading = false) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        error = e.message ?: "投稿の読み込みに失敗しました",
                        isLoading = false
                    )
                }
            }
        }
    }

    /**
     * 投稿リストを更新（カテゴリフィルタリング適用）
     */
    private fun updatePostList() {
        val selectedCategory = _uiState.value.selectedCategory
        val filteredPosts = if (selectedCategory != null) {
            allPosts.filter { it.category == selectedCategory }
        } else {
            allPosts
        }

        val postsWithLike = filteredPosts.map { post ->
            ComyPostWithLike(
                post = post,
                isLiked = post.id in likedPostIds
            )
        }

        _uiState.update { it.copy(posts = postsWithLike) }
    }

    /**
     * カテゴリを選択
     */
    fun selectCategory(category: ComyCategory?) {
        _uiState.update { it.copy(selectedCategory = category) }
        updatePostList()
    }

    /**
     * 投稿を選択して詳細を表示
     */
    fun selectPost(postId: String) {
        val post = allPosts.find { it.id == postId }
        _uiState.update {
            it.copy(
                selectedPost = post,
                isPostDetailVisible = post != null,
                selectedPostComments = emptyList()
            )
        }

        // コメントを読み込み
        if (post != null) {
            loadComments(postId)
            observeComments(postId)
        }
    }

    /**
     * コメントを読み込み
     */
    private fun loadComments(postId: String) {
        viewModelScope.launch {
            val result = comyRepository.getComments(postId)
            if (result.isSuccess) {
                _uiState.update {
                    it.copy(selectedPostComments = result.getOrDefault(emptyList()))
                }
            }
        }
    }

    /**
     * コメントをリアルタイム監視
     */
    private fun observeComments(postId: String) {
        viewModelScope.launch {
            comyRepository.observeComments(postId).collectLatest { comments ->
                _uiState.update { it.copy(selectedPostComments = comments) }
            }
        }
    }

    /**
     * 投稿詳細を閉じる
     */
    fun closePostDetail() {
        _uiState.update {
            it.copy(
                selectedPost = null,
                isPostDetailVisible = false,
                selectedPostComments = emptyList()
            )
        }
    }

    /**
     * 投稿作成画面を表示
     */
    fun showCreatePost() {
        _uiState.update { it.copy(isCreatePostVisible = true) }
    }

    /**
     * 投稿作成画面を閉じる
     */
    fun closeCreatePost() {
        _uiState.update { it.copy(isCreatePostVisible = false) }
    }

    /**
     * 投稿を作成
     */
    fun createPost(title: String, content: String, category: ComyCategory, imageUri: Uri? = null) {
        val userId = authRepository.getCurrentUserId() ?: return
        val userName = _uiState.value.currentUserName
        val userPhotoUrl = _uiState.value.currentUserPhotoUrl

        viewModelScope.launch {
            _uiState.update { it.copy(isActionLoading = true) }
            try {
                // 画像がある場合はアップロード
                var imageUrl: String? = null
                if (imageUri != null) {
                    val uploadResult = storageService.uploadComyImage(imageUri, userId)
                    if (uploadResult.isFailure) {
                        _uiState.update {
                            it.copy(
                                error = uploadResult.exceptionOrNull()?.message ?: "画像のアップロードに失敗しました",
                                isActionLoading = false
                            )
                        }
                        return@launch
                    }
                    imageUrl = uploadResult.getOrNull()
                }

                val post = ComyPost(
                    userId = userId,
                    authorName = userName,
                    authorPhotoUrl = userPhotoUrl,
                    title = title,
                    content = content,
                    category = category,
                    imageUrl = imageUrl,
                    createdAt = System.currentTimeMillis()
                )

                val result = comyRepository.createPost(post)
                if (result.isFailure) {
                    _uiState.update {
                        it.copy(
                            error = result.exceptionOrNull()?.message ?: "投稿の作成に失敗しました",
                            isActionLoading = false
                        )
                    }
                    return@launch
                }

                // 成功時は投稿作成画面を閉じる
                _uiState.update {
                    it.copy(
                        isCreatePostVisible = false,
                        isActionLoading = false
                    )
                }

                // 投稿リストを更新
                loadPosts()
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        error = e.message ?: "投稿の作成に失敗しました",
                        isActionLoading = false
                    )
                }
            }
        }
    }

    /**
     * いいねをトグル
     */
    fun toggleLike(postId: String) {
        val userId = authRepository.getCurrentUserId() ?: return

        viewModelScope.launch {
            try {
                val result = comyRepository.toggleLike(userId, postId)
                if (result.isSuccess) {
                    val isLiked = result.getOrDefault(false)
                    // ローカルキャッシュを更新
                    likedPostIds = if (isLiked) {
                        likedPostIds + postId
                    } else {
                        likedPostIds - postId
                    }
                    updatePostList()

                    // 選択中の投稿のいいねカウントを更新
                    _uiState.value.selectedPost?.let { selectedPost ->
                        if (selectedPost.id == postId) {
                            val newLikeCount = if (isLiked) {
                                selectedPost.likeCount + 1
                            } else {
                                maxOf(0, selectedPost.likeCount - 1)
                            }
                            _uiState.update {
                                it.copy(selectedPost = selectedPost.copy(likeCount = newLikeCount))
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(error = e.message ?: "いいねの更新に失敗しました")
                }
            }
        }
    }

    /**
     * コメントを追加
     */
    fun addComment(content: String) {
        val userId = authRepository.getCurrentUserId() ?: return
        val postId = _uiState.value.selectedPost?.id ?: return
        val userName = _uiState.value.currentUserName
        val userPhotoUrl = _uiState.value.currentUserPhotoUrl

        viewModelScope.launch {
            _uiState.update { it.copy(isActionLoading = true) }
            try {
                val comment = ComyComment(
                    postId = postId,
                    userId = userId,
                    authorName = userName,
                    authorPhotoUrl = userPhotoUrl,
                    content = content,
                    createdAt = System.currentTimeMillis()
                )

                val result = comyRepository.addComment(comment)
                if (result.isFailure) {
                    _uiState.update {
                        it.copy(
                            error = result.exceptionOrNull()?.message ?: "コメントの追加に失敗しました",
                            isActionLoading = false
                        )
                    }
                    return@launch
                }

                // 選択中の投稿のコメントカウントを更新
                _uiState.value.selectedPost?.let { selectedPost ->
                    _uiState.update {
                        it.copy(
                            selectedPost = selectedPost.copy(commentCount = selectedPost.commentCount + 1),
                            isActionLoading = false
                        )
                    }
                }

                // 投稿リストも更新
                loadPosts()
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        error = e.message ?: "コメントの追加に失敗しました",
                        isActionLoading = false
                    )
                }
            }
        }
    }

    /**
     * 投稿を削除（自分の投稿のみ）
     */
    fun deletePost(postId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isActionLoading = true) }
            try {
                val result = comyRepository.deletePost(postId)
                if (result.isFailure) {
                    _uiState.update {
                        it.copy(
                            error = result.exceptionOrNull()?.message ?: "投稿の削除に失敗しました",
                            isActionLoading = false
                        )
                    }
                    return@launch
                }

                _uiState.update {
                    it.copy(
                        isPostDetailVisible = false,
                        selectedPost = null,
                        isActionLoading = false
                    )
                }
                loadPosts()
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        error = e.message ?: "投稿の削除に失敗しました",
                        isActionLoading = false
                    )
                }
            }
        }
    }

    /**
     * 選択中の投稿がいいね済みかどうか
     */
    fun isSelectedPostLiked(): Boolean {
        val postId = _uiState.value.selectedPost?.id ?: return false
        return postId in likedPostIds
    }

    /**
     * エラーをクリア
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
