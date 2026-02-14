package com.yourcoach.plus.shared.ui.screens.comy

import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
import com.yourcoach.plus.shared.domain.model.ComyCategory
import com.yourcoach.plus.shared.domain.model.ComyComment
import com.yourcoach.plus.shared.domain.model.ComyPost
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.ComyRepository
import com.yourcoach.plus.shared.domain.repository.UserRepository
import com.yourcoach.plus.shared.domain.service.StorageService
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.datetime.Clock

/**
 * フィードモード
 */
enum class ComyFeedMode {
    ALL,        // すべて
    FOLLOWING   // フォロー中
}

/**
 * リスト表示用の投稿データ（いいね状態を含む）
 */
data class ComyPostWithLike(
    val post: ComyPost,
    val isLiked: Boolean = false,
    val isFollowingAuthor: Boolean = false
)

/**
 * COMY画面のUI状態
 */
data class ComyUiState(
    val isLoading: Boolean = false,
    val selectedCategory: ComyCategory? = null,
    val feedMode: ComyFeedMode = ComyFeedMode.ALL,
    val posts: List<ComyPostWithLike> = emptyList(),
    val error: String? = null,
    // 投稿詳細用
    val selectedPost: ComyPost? = null,
    val selectedPostComments: List<ComyComment> = emptyList(),
    val isPostDetailVisible: Boolean = false,
    // 投稿作成用
    val isCreatePostVisible: Boolean = false,
    // マイページ用
    val isMyPageVisible: Boolean = false,
    val myFollowerCount: Int = 0,
    val myFollowingCount: Int = 0,
    // アクション状態
    val isActionLoading: Boolean = false,
    // 現在のユーザー情報
    val currentUserName: String = "",
    val currentUserPhotoUrl: String? = null,
    val currentUserId: String = "",
    val currentUserLevel: Int = 1
)

/**
 * COMY画面のScreenModel
 */
class ComyScreenModel(
    private val comyRepository: ComyRepository,
    private val authRepository: AuthRepository,
    private val userRepository: UserRepository,
    private val storageService: StorageService
) : ScreenModel {

    private val _uiState = MutableStateFlow(ComyUiState())
    val uiState: StateFlow<ComyUiState> = _uiState.asStateFlow()

    private val exceptionHandler = CoroutineExceptionHandler { _, throwable ->
        println("ComyScreenModel: Coroutine exception: ${throwable.message}")
        _uiState.update { it.copy(isLoading = false, error = "エラーが発生しました") }
    }

    // キャッシュ
    private var allPosts: List<ComyPost> = emptyList()
    private var likedPostIds: Set<String> = emptySet()
    private var followingUserIds: Set<String> = emptySet()
    private var blockedUserIds: Set<String> = emptySet()

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
        screenModelScope.launch(exceptionHandler) {
            userRepository.observeUser(userId).collectLatest { user ->
                _uiState.update {
                    it.copy(
                        currentUserName = user?.profile?.nickname
                            ?: user?.displayName
                            ?: user?.email?.substringBefore("@")
                            ?: "ユーザー",
                        currentUserPhotoUrl = user?.photoUrl,
                        currentUserLevel = user?.profile?.calculateLevel() ?: 1,
                        myFollowerCount = user?.followerCount ?: 0,
                        myFollowingCount = user?.followingCount ?: 0
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

        screenModelScope.launch(exceptionHandler) {
            // 投稿・いいね・フォロー・ブロックを組み合わせて監視
            combine(
                comyRepository.observePosts(limit = 50),
                comyRepository.observeLikedPostIds(userId),
                comyRepository.observeFollowingUserIds(userId),
                comyRepository.observeBlockedUserIds(userId)
            ) { posts, likedIds, followingIds, blockedIds ->
                CombinedData(posts, likedIds, followingIds, blockedIds)
            }.collectLatest { data ->
                allPosts = data.posts
                likedPostIds = data.likedIds
                followingUserIds = data.followingIds
                blockedUserIds = data.blockedIds
                updatePostList()
            }
        }
    }

    private data class CombinedData(
        val posts: List<ComyPost>,
        val likedIds: Set<String>,
        val followingIds: Set<String>,
        val blockedIds: Set<String>
    )

    /**
     * 投稿を読み込み
     */
    fun loadPosts() {
        screenModelScope.launch(exceptionHandler) {
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
        val feedMode = _uiState.value.feedMode

        // 1. ブロックユーザー除外（常時）
        var filteredPosts = allPosts.filter { it.userId !in blockedUserIds }

        // 2. フォロー中フィルター（FOLLOWINGモード時）
        if (feedMode == ComyFeedMode.FOLLOWING) {
            filteredPosts = filteredPosts.filter { it.userId in followingUserIds }
        }

        // 3. カテゴリフィルター
        if (selectedCategory != null) {
            filteredPosts = filteredPosts.filter { it.category == selectedCategory }
        }

        // 4. いいね + フォロー状態マッピング
        val postsWithLike = filteredPosts.map { post ->
            ComyPostWithLike(
                post = post,
                isLiked = post.id in likedPostIds,
                isFollowingAuthor = post.userId in followingUserIds
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
        screenModelScope.launch(exceptionHandler) {
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
        screenModelScope.launch(exceptionHandler) {
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
    fun createPost(title: String, content: String, category: ComyCategory, imageBase64: String? = null, imageMimeType: String? = null) {
        val userId = authRepository.getCurrentUserId() ?: return
        val userName = _uiState.value.currentUserName
        val userPhotoUrl = _uiState.value.currentUserPhotoUrl
        val userLevel = _uiState.value.currentUserLevel

        screenModelScope.launch(exceptionHandler) {
            _uiState.update { it.copy(isActionLoading = true) }
            try {
                // 画像がある場合はアップロード
                var imageUrl: String? = null
                if (imageBase64 != null) {
                    val uploadResult = storageService.uploadComyImage(
                        imageBase64 = imageBase64,
                        userId = userId,
                        mimeType = imageMimeType ?: "image/jpeg"
                    )
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
                    authorLevel = userLevel,
                    title = title,
                    content = content,
                    category = category,
                    imageUrl = imageUrl,
                    createdAt = Clock.System.now().toEpochMilliseconds()
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

        screenModelScope.launch(exceptionHandler) {
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

        screenModelScope.launch(exceptionHandler) {
            _uiState.update { it.copy(isActionLoading = true) }
            try {
                val comment = ComyComment(
                    postId = postId,
                    userId = userId,
                    authorName = userName,
                    authorPhotoUrl = userPhotoUrl,
                    content = content,
                    createdAt = Clock.System.now().toEpochMilliseconds()
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
        screenModelScope.launch(exceptionHandler) {
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

    // ===== フィードモード =====

    /**
     * フィードモードを切り替え
     */
    fun setFeedMode(mode: ComyFeedMode) {
        _uiState.update { it.copy(feedMode = mode) }
        updatePostList()
    }

    // ===== フォロー =====

    /**
     * フォロー/フォロー解除をトグル
     */
    fun toggleFollow(targetUserId: String) {
        val userId = authRepository.getCurrentUserId() ?: return
        if (targetUserId == userId) return // 自分はフォローしない

        screenModelScope.launch(exceptionHandler) {
            try {
                val isFollowing = targetUserId in followingUserIds
                if (isFollowing) {
                    comyRepository.unfollowUser(userId, targetUserId)
                    followingUserIds = followingUserIds - targetUserId
                } else {
                    comyRepository.followUser(userId, targetUserId)
                    followingUserIds = followingUserIds + targetUserId
                }
                updatePostList()
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message ?: "フォロー操作に失敗しました") }
            }
        }
    }

    // ===== ブロック =====

    /**
     * ユーザーをブロック
     */
    fun blockUser(targetUserId: String) {
        val userId = authRepository.getCurrentUserId() ?: return
        if (targetUserId == userId) return

        screenModelScope.launch(exceptionHandler) {
            try {
                comyRepository.blockUser(userId, targetUserId)
                blockedUserIds = blockedUserIds + targetUserId
                // ブロックしたらフォローも解除
                if (targetUserId in followingUserIds) {
                    comyRepository.unfollowUser(userId, targetUserId)
                    followingUserIds = followingUserIds - targetUserId
                }
                updatePostList()
                // 詳細画面を閉じる
                _uiState.update {
                    it.copy(
                        isPostDetailVisible = false,
                        selectedPost = null
                    )
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message ?: "ブロックに失敗しました") }
            }
        }
    }

    // ===== マイページ =====

    fun showMyPage() {
        _uiState.update { it.copy(isMyPageVisible = true) }
    }

    fun closeMyPage() {
        _uiState.update { it.copy(isMyPageVisible = false) }
    }

    /**
     * 自分の投稿一覧を取得
     */
    fun getMyPosts(): List<ComyPostWithLike> {
        val userId = _uiState.value.currentUserId
        return allPosts
            .filter { it.userId == userId }
            .map { post ->
                ComyPostWithLike(
                    post = post,
                    isLiked = post.id in likedPostIds,
                    isFollowingAuthor = false
                )
            }
    }

    /**
     * エラーをクリア
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
