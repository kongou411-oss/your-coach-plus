package com.yourcoach.plus.shared.data.repository

import com.yourcoach.plus.shared.domain.model.ComyCategory
import com.yourcoach.plus.shared.domain.model.ComyComment
import com.yourcoach.plus.shared.domain.model.ComyPost
import com.yourcoach.plus.shared.domain.repository.ComyRepository
import com.yourcoach.plus.shared.util.AppError
import com.yourcoach.plus.shared.util.DateUtil
import dev.gitlive.firebase.Firebase
import dev.gitlive.firebase.firestore.Direction
import dev.gitlive.firebase.firestore.FieldValue
import dev.gitlive.firebase.firestore.FirebaseFirestore
import dev.gitlive.firebase.firestore.firestore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * Firestore COMYリポジトリ実装 (GitLive KMP版)
 */
class FirestoreComyRepository : ComyRepository {

    private val firestore: FirebaseFirestore by lazy {
        try {
            Firebase.firestore
        } catch (e: Throwable) {
            println("FirestoreComyRepository: Firebase.firestore initialization failed: ${e.message}")
            throw e
        }
    }

    private val postsCollection = firestore.collection("comy_posts")

    private fun commentsCollection(postId: String) =
        postsCollection.document(postId).collection("comments")

    private fun userLikesCollection(userId: String) =
        firestore.collection("users").document(userId).collection("comy_likes")

    override suspend fun getPosts(
        category: ComyCategory?,
        limit: Int,
        lastVisiblePostId: String?
    ): Result<List<ComyPost>> {
        return try {
            var query = postsCollection.orderBy("createdAt", Direction.DESCENDING)

            if (category != null) {
                query = query.where { "category" equalTo category.name }
            }

            query = query.limit(limit)

            // ページネーション対応（lastVisiblePostIdが指定されている場合）
            if (lastVisiblePostId != null) {
                val lastDoc = postsCollection.document(lastVisiblePostId).get()
                if (lastDoc.exists) {
                    query = query.startAfter(lastDoc)
                }
            }

            val snapshot = query.get()
            val posts = snapshot.documents.mapNotNull { doc ->
                try {
                    doc.toPost()
                } catch (e: Exception) {
                    null
                }
            }
            Result.success(posts)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("投稿の取得に失敗しました", e))
        }
    }

    override suspend fun getPost(postId: String): Result<ComyPost?> {
        return try {
            val doc = postsCollection.document(postId).get()
            if (doc.exists) {
                Result.success(doc.toPost())
            } else {
                Result.success(null)
            }
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("投稿の取得に失敗しました", e))
        }
    }

    override fun observePosts(category: ComyCategory?, limit: Int): Flow<List<ComyPost>> {
        var query = postsCollection.orderBy("createdAt", Direction.DESCENDING)

        if (category != null) {
            query = query.where { "category" equalTo category.name }
        }

        return query.limit(limit).snapshots.map { snapshot ->
            snapshot.documents.mapNotNull { doc ->
                try {
                    doc.toPost()
                } catch (e: Exception) {
                    null
                }
            }
        }
    }

    override suspend fun createPost(post: ComyPost): Result<String> {
        return try {
            val docRef = postsCollection.document
            val postWithId = post.copy(id = docRef.id, createdAt = DateUtil.currentTimestamp())
            docRef.set(postToMap(postWithId))
            Result.success(docRef.id)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("投稿の作成に失敗しました", e))
        }
    }

    override suspend fun deletePost(postId: String): Result<Unit> {
        return try {
            postsCollection.document(postId).delete()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("投稿の削除に失敗しました", e))
        }
    }

    override suspend fun toggleLike(userId: String, postId: String): Result<Boolean> {
        return try {
            val likeDoc = userLikesCollection(userId).document(postId).get()
            val isCurrentlyLiked = likeDoc.exists

            if (isCurrentlyLiked) {
                // いいね解除
                userLikesCollection(userId).document(postId).delete()
                postsCollection.document(postId).update(
                    mapOf("likeCount" to FieldValue.increment(-1))
                )
                Result.success(false)
            } else {
                // いいね追加
                userLikesCollection(userId).document(postId).set(
                    mapOf(
                        "postId" to postId,
                        "likedAt" to DateUtil.currentTimestamp()
                    )
                )
                postsCollection.document(postId).update(
                    mapOf("likeCount" to FieldValue.increment(1))
                )
                Result.success(true)
            }
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("いいねの更新に失敗しました", e))
        }
    }

    override suspend fun getLikedPostIds(userId: String): Result<Set<String>> {
        return try {
            val snapshot = userLikesCollection(userId).get()
            val ids = snapshot.documents.map { it.id }.toSet()
            Result.success(ids)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("いいね一覧の取得に失敗しました", e))
        }
    }

    override fun observeLikedPostIds(userId: String): Flow<Set<String>> {
        return userLikesCollection(userId).snapshots.map { snapshot ->
            snapshot.documents.map { it.id }.toSet()
        }
    }

    override suspend fun getComments(postId: String): Result<List<ComyComment>> {
        return try {
            val snapshot = commentsCollection(postId)
                .orderBy("createdAt", Direction.ASCENDING)
                .get()

            val comments = snapshot.documents.mapNotNull { doc ->
                try {
                    doc.toComment(postId)
                } catch (e: Exception) {
                    null
                }
            }
            Result.success(comments)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("コメントの取得に失敗しました", e))
        }
    }

    override fun observeComments(postId: String): Flow<List<ComyComment>> {
        return commentsCollection(postId)
            .orderBy("createdAt", Direction.ASCENDING)
            .snapshots
            .map { snapshot ->
                snapshot.documents.mapNotNull { doc ->
                    try {
                        doc.toComment(postId)
                    } catch (e: Exception) {
                        null
                    }
                }
            }
    }

    override suspend fun addComment(comment: ComyComment): Result<String> {
        return try {
            val docRef = commentsCollection(comment.postId).document
            val commentWithId = comment.copy(id = docRef.id, createdAt = DateUtil.currentTimestamp())
            docRef.set(commentToMap(commentWithId))

            // コメント数をインクリメント
            postsCollection.document(comment.postId).update(
                mapOf("commentCount" to FieldValue.increment(1))
            )

            Result.success(docRef.id)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("コメントの追加に失敗しました", e))
        }
    }

    override suspend fun deleteComment(postId: String, commentId: String): Result<Unit> {
        return try {
            commentsCollection(postId).document(commentId).delete()

            // コメント数をデクリメント
            postsCollection.document(postId).update(
                mapOf("commentCount" to FieldValue.increment(-1))
            )

            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("コメントの削除に失敗しました", e))
        }
    }

    // ===== フォロー =====

    private val followsCollection = firestore.collection("follows")

    private fun userBlocksCollection(userId: String) =
        firestore.collection("users").document(userId).collection("blocks")

    override suspend fun followUser(currentUserId: String, targetUserId: String): Result<Unit> {
        return try {
            val docId = "${currentUserId}_${targetUserId}"
            followsCollection.document(docId).set(
                mapOf(
                    "followerId" to currentUserId,
                    "followingId" to targetUserId,
                    "createdAt" to DateUtil.currentTimestamp()
                )
            )
            // followingCount を更新
            firestore.collection("users").document(currentUserId).update(
                mapOf("followingCount" to FieldValue.increment(1))
            )
            // followerCount を更新
            firestore.collection("users").document(targetUserId).update(
                mapOf("followerCount" to FieldValue.increment(1))
            )
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("フォローに失敗しました", e))
        }
    }

    override suspend fun unfollowUser(currentUserId: String, targetUserId: String): Result<Unit> {
        return try {
            val docId = "${currentUserId}_${targetUserId}"
            followsCollection.document(docId).delete()
            // followingCount を更新
            firestore.collection("users").document(currentUserId).update(
                mapOf("followingCount" to FieldValue.increment(-1))
            )
            // followerCount を更新
            firestore.collection("users").document(targetUserId).update(
                mapOf("followerCount" to FieldValue.increment(-1))
            )
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("フォロー解除に失敗しました", e))
        }
    }

    override suspend fun getFollowingUserIds(userId: String): Result<Set<String>> {
        return try {
            val snapshot = followsCollection
                .where { "followerId" equalTo userId }
                .get()
            val ids = snapshot.documents.mapNotNull { doc ->
                doc.get<String?>("followingId")
            }.toSet()
            Result.success(ids)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("フォロー情報の取得に失敗しました", e))
        }
    }

    override fun observeFollowingUserIds(userId: String): Flow<Set<String>> {
        return followsCollection
            .where { "followerId" equalTo userId }
            .snapshots
            .map { snapshot ->
                snapshot.documents.mapNotNull { doc ->
                    doc.get<String?>("followingId")
                }.toSet()
            }
    }

    // ===== ブロック =====

    override suspend fun blockUser(currentUserId: String, targetUserId: String): Result<Unit> {
        return try {
            userBlocksCollection(currentUserId).document(targetUserId).set(
                mapOf(
                    "blockedUserId" to targetUserId,
                    "createdAt" to DateUtil.currentTimestamp()
                )
            )
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("ブロックに失敗しました", e))
        }
    }

    override suspend fun unblockUser(currentUserId: String, targetUserId: String): Result<Unit> {
        return try {
            userBlocksCollection(currentUserId).document(targetUserId).delete()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("ブロック解除に失敗しました", e))
        }
    }

    override fun observeBlockedUserIds(userId: String): Flow<Set<String>> {
        return userBlocksCollection(userId).snapshots.map { snapshot ->
            snapshot.documents.map { it.id }.toSet()
        }
    }

    // ========== Mapping Functions ==========

    private fun postToMap(post: ComyPost): Map<String, Any?> = mapOf(
        "id" to post.id,
        "userId" to post.userId,
        "authorName" to post.authorName,
        "authorPhotoUrl" to post.authorPhotoUrl,
        "authorLevel" to post.authorLevel,
        "title" to post.title,
        "content" to post.content,
        "category" to post.category.name,
        "imageUrl" to post.imageUrl,
        "likeCount" to post.likeCount,
        "commentCount" to post.commentCount,
        "createdAt" to post.createdAt
    )

    private fun commentToMap(comment: ComyComment): Map<String, Any?> = mapOf(
        "id" to comment.id,
        "postId" to comment.postId,
        "userId" to comment.userId,
        "authorName" to comment.authorName,
        "authorPhotoUrl" to comment.authorPhotoUrl,
        "content" to comment.content,
        "createdAt" to comment.createdAt
    )

    private fun dev.gitlive.firebase.firestore.DocumentSnapshot.toPost(): ComyPost {
        val categoryStr = get<String?>("category") ?: "QUESTION"
        val category = try {
            ComyCategory.valueOf(categoryStr)
        } catch (e: Exception) {
            ComyCategory.QUESTION
        }

        return ComyPost(
            id = id,
            userId = get<String?>("userId") ?: "",
            authorName = get<String?>("authorName") ?: "",
            authorPhotoUrl = get<String?>("authorPhotoUrl"),
            authorLevel = get<Long?>("authorLevel")?.toInt() ?: 1,
            title = get<String?>("title") ?: "",
            content = get<String?>("content") ?: "",
            category = category,
            imageUrl = get<String?>("imageUrl"),
            likeCount = get<Long?>("likeCount")?.toInt() ?: 0,
            commentCount = get<Long?>("commentCount")?.toInt() ?: 0,
            createdAt = get<Long?>("createdAt") ?: 0
        )
    }

    private fun dev.gitlive.firebase.firestore.DocumentSnapshot.toComment(postId: String): ComyComment {
        return ComyComment(
            id = id,
            postId = postId,
            userId = get<String?>("userId") ?: "",
            authorName = get<String?>("authorName") ?: "",
            authorPhotoUrl = get<String?>("authorPhotoUrl"),
            content = get<String?>("content") ?: "",
            createdAt = get<Long?>("createdAt") ?: 0
        )
    }
}
