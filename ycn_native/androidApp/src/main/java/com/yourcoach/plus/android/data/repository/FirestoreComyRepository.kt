package com.yourcoach.plus.android.data.repository

import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.yourcoach.plus.shared.domain.model.ComyCategory
import com.yourcoach.plus.shared.domain.model.ComyComment
import com.yourcoach.plus.shared.domain.model.ComyPost
import com.yourcoach.plus.shared.domain.repository.ComyRepository
import com.yourcoach.plus.shared.util.AppError
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

/**
 * Firestore COMY リポジトリ実装
 */
class FirestoreComyRepository : ComyRepository {

    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()

    // グローバルな投稿コレクション
    private val postsCollection = firestore.collection("comy_posts")

    // ユーザーごとのいいねコレクション
    private fun userLikesCollection(userId: String) =
        firestore.collection("users").document(userId).collection("comy_likes")

    // 投稿ごとのコメントコレクション
    private fun commentsCollection(postId: String) =
        postsCollection.document(postId).collection("comments")

    // ===== 投稿 =====

    /**
     * 投稿を取得（ページネーション対応）
     */
    override suspend fun getPosts(
        category: ComyCategory?,
        limit: Int,
        lastVisiblePostId: String?
    ): Result<List<ComyPost>> {
        return try {
            var query: Query = postsCollection
                .orderBy("createdAt", Query.Direction.DESCENDING)

            // カテゴリフィルター
            if (category != null) {
                query = query.whereEqualTo("category", category.name.lowercase())
            }

            // ページネーション
            if (lastVisiblePostId != null) {
                val lastDoc = postsCollection.document(lastVisiblePostId).get().await()
                if (lastDoc.exists()) {
                    query = query.startAfter(lastDoc)
                }
            }

            val docs = query.limit(limit.toLong()).get().await()
            val posts = docs.documents.mapNotNull { doc ->
                doc.data?.let { mapToPost(it, doc.id) }
            }
            Result.success(posts)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("投稿の取得に失敗しました", e))
        }
    }

    /**
     * 特定の投稿を取得
     */
    override suspend fun getPost(postId: String): Result<ComyPost?> {
        return try {
            val doc = postsCollection.document(postId).get().await()
            if (doc.exists()) {
                Result.success(doc.data?.let { mapToPost(it, doc.id) })
            } else {
                Result.success(null)
            }
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("投稿の取得に失敗しました", e))
        }
    }

    /**
     * 投稿をリアルタイム監視
     */
    override fun observePosts(category: ComyCategory?, limit: Int): Flow<List<ComyPost>> = callbackFlow {
        var query: Query = postsCollection
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .limit(limit.toLong())

        if (category != null) {
            query = query.whereEqualTo("category", category.name.lowercase())
        }

        val listener = query.addSnapshotListener { snapshot, error ->
            if (error != null) {
                // エラー時は空のリストを返す（クラッシュ防止）
                android.util.Log.e("FirestoreComy", "observePosts error", error)
                trySend(emptyList())
                return@addSnapshotListener
            }

            val posts = snapshot?.documents?.mapNotNull { doc ->
                doc.data?.let { mapToPost(it, doc.id) }
            } ?: emptyList()

            trySend(posts)
        }
        awaitClose { listener.remove() }
    }

    /**
     * 投稿を作成
     */
    override suspend fun createPost(post: ComyPost): Result<String> {
        return try {
            val now = System.currentTimeMillis()
            val data = mutableMapOf<String, Any?>(
                "userId" to post.userId,
                "authorName" to post.authorName,
                "authorPhotoUrl" to post.authorPhotoUrl,
                "authorLevel" to post.authorLevel,
                "title" to post.title,
                "content" to post.content,
                "category" to post.category.name.lowercase(),
                "likeCount" to 0,
                "commentCount" to 0,
                "createdAt" to now
            )

            // 画像URLがある場合は追加
            if (!post.imageUrl.isNullOrEmpty()) {
                data["imageUrl"] = post.imageUrl
            }

            val docRef = postsCollection.add(data).await()
            Result.success(docRef.id)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("投稿の作成に失敗しました", e))
        }
    }

    /**
     * 投稿を削除
     */
    override suspend fun deletePost(postId: String): Result<Unit> {
        return try {
            // コメントも削除
            val comments = commentsCollection(postId).get().await()
            for (comment in comments.documents) {
                comment.reference.delete().await()
            }

            postsCollection.document(postId).delete().await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("投稿の削除に失敗しました", e))
        }
    }

    // ===== いいね =====

    /**
     * いいねをトグル（トランザクション使用）
     */
    override suspend fun toggleLike(userId: String, postId: String): Result<Boolean> {
        return try {
            val result = firestore.runTransaction { transaction ->
                val likeRef = userLikesCollection(userId).document(postId)
                val postRef = postsCollection.document(postId)
                val likeDoc = transaction.get(likeRef)

                if (likeDoc.exists()) {
                    // いいねを解除
                    transaction.delete(likeRef)
                    transaction.update(postRef, "likeCount", FieldValue.increment(-1))
                    false
                } else {
                    // いいねを追加
                    val likeData = mapOf(
                        "postId" to postId,
                        "likedAt" to System.currentTimeMillis()
                    )
                    transaction.set(likeRef, likeData)
                    transaction.update(postRef, "likeCount", FieldValue.increment(1))
                    true
                }
            }.await()

            Result.success(result)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("いいねの更新に失敗しました", e))
        }
    }

    /**
     * いいね済み投稿IDのセットを取得
     */
    override suspend fun getLikedPostIds(userId: String): Result<Set<String>> {
        return try {
            val docs = userLikesCollection(userId).get().await()
            val ids = docs.documents.mapNotNull { it.id }.toSet()
            Result.success(ids)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("いいね情報の取得に失敗しました", e))
        }
    }

    /**
     * いいね済み投稿IDをリアルタイム監視
     */
    override fun observeLikedPostIds(userId: String): Flow<Set<String>> = callbackFlow {
        val listener = userLikesCollection(userId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    // エラー時は空のセットを返す（クラッシュ防止）
                    android.util.Log.e("FirestoreComy", "observeLikedPostIds error", error)
                    trySend(emptySet())
                    return@addSnapshotListener
                }

                val ids = snapshot?.documents?.mapNotNull { it.id }?.toSet() ?: emptySet()
                trySend(ids)
            }
        awaitClose { listener.remove() }
    }

    // ===== コメント =====

    /**
     * コメントを取得
     */
    override suspend fun getComments(postId: String): Result<List<ComyComment>> {
        return try {
            val docs = commentsCollection(postId)
                .orderBy("createdAt", Query.Direction.ASCENDING)
                .get()
                .await()

            val comments = docs.documents.mapNotNull { doc ->
                doc.data?.let { mapToComment(it, doc.id, postId) }
            }
            Result.success(comments)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("コメントの取得に失敗しました", e))
        }
    }

    /**
     * コメントをリアルタイム監視
     */
    override fun observeComments(postId: String): Flow<List<ComyComment>> = callbackFlow {
        val listener = commentsCollection(postId)
            .orderBy("createdAt", Query.Direction.ASCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    // エラー時は空のリストを返す（クラッシュ防止）
                    android.util.Log.e("FirestoreComy", "observeComments error", error)
                    trySend(emptyList())
                    return@addSnapshotListener
                }

                val comments = snapshot?.documents?.mapNotNull { doc ->
                    doc.data?.let { mapToComment(it, doc.id, postId) }
                } ?: emptyList()

                trySend(comments)
            }
        awaitClose { listener.remove() }
    }

    /**
     * コメントを追加
     */
    override suspend fun addComment(comment: ComyComment): Result<String> {
        return try {
            val now = System.currentTimeMillis()
            val data = mapOf(
                "userId" to comment.userId,
                "authorName" to comment.authorName,
                "authorPhotoUrl" to comment.authorPhotoUrl,
                "content" to comment.content,
                "createdAt" to now
            )

            // トランザクションでコメント追加とカウント更新
            val result = firestore.runTransaction { transaction ->
                val postRef = postsCollection.document(comment.postId)
                val commentRef = commentsCollection(comment.postId).document()

                transaction.set(commentRef, data)
                transaction.update(postRef, "commentCount", FieldValue.increment(1))

                commentRef.id
            }.await()

            Result.success(result)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("コメントの追加に失敗しました", e))
        }
    }

    /**
     * コメントを削除
     */
    override suspend fun deleteComment(postId: String, commentId: String): Result<Unit> {
        return try {
            firestore.runTransaction { transaction ->
                val postRef = postsCollection.document(postId)
                val commentRef = commentsCollection(postId).document(commentId)

                transaction.delete(commentRef)
                transaction.update(postRef, "commentCount", FieldValue.increment(-1))
            }.await()

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
            val data = mapOf(
                "followerId" to currentUserId,
                "followingId" to targetUserId,
                "createdAt" to System.currentTimeMillis()
            )
            firestore.runTransaction { transaction ->
                val followRef = followsCollection.document(docId)
                val currentUserRef = firestore.collection("users").document(currentUserId)
                val targetUserRef = firestore.collection("users").document(targetUserId)

                transaction.set(followRef, data)
                transaction.update(currentUserRef, "followingCount", FieldValue.increment(1))
                transaction.update(targetUserRef, "followerCount", FieldValue.increment(1))
            }.await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(com.yourcoach.plus.shared.util.AppError.DatabaseError("フォローに失敗しました", e))
        }
    }

    override suspend fun unfollowUser(currentUserId: String, targetUserId: String): Result<Unit> {
        return try {
            val docId = "${currentUserId}_${targetUserId}"
            firestore.runTransaction { transaction ->
                val followRef = followsCollection.document(docId)
                val currentUserRef = firestore.collection("users").document(currentUserId)
                val targetUserRef = firestore.collection("users").document(targetUserId)

                transaction.delete(followRef)
                transaction.update(currentUserRef, "followingCount", FieldValue.increment(-1))
                transaction.update(targetUserRef, "followerCount", FieldValue.increment(-1))
            }.await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(com.yourcoach.plus.shared.util.AppError.DatabaseError("フォロー解除に失敗しました", e))
        }
    }

    override suspend fun getFollowingUserIds(userId: String): Result<Set<String>> {
        return try {
            val docs = followsCollection
                .whereEqualTo("followerId", userId)
                .get()
                .await()
            val ids = docs.documents.mapNotNull { it.getString("followingId") }.toSet()
            Result.success(ids)
        } catch (e: Exception) {
            Result.failure(com.yourcoach.plus.shared.util.AppError.DatabaseError("フォロー情報の取得に失敗しました", e))
        }
    }

    override fun observeFollowingUserIds(userId: String): Flow<Set<String>> = callbackFlow {
        val listener = followsCollection
            .whereEqualTo("followerId", userId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    android.util.Log.e("FirestoreComy", "observeFollowingUserIds error", error)
                    trySend(emptySet())
                    return@addSnapshotListener
                }
                val ids = snapshot?.documents?.mapNotNull { it.getString("followingId") }?.toSet() ?: emptySet()
                trySend(ids)
            }
        awaitClose { listener.remove() }
    }

    // ===== ブロック =====

    override suspend fun blockUser(currentUserId: String, targetUserId: String): Result<Unit> {
        return try {
            val data = mapOf(
                "blockedUserId" to targetUserId,
                "createdAt" to System.currentTimeMillis()
            )
            userBlocksCollection(currentUserId).document(targetUserId).set(data).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(com.yourcoach.plus.shared.util.AppError.DatabaseError("ブロックに失敗しました", e))
        }
    }

    override suspend fun unblockUser(currentUserId: String, targetUserId: String): Result<Unit> {
        return try {
            userBlocksCollection(currentUserId).document(targetUserId).delete().await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(com.yourcoach.plus.shared.util.AppError.DatabaseError("ブロック解除に失敗しました", e))
        }
    }

    override fun observeBlockedUserIds(userId: String): Flow<Set<String>> = callbackFlow {
        val listener = userBlocksCollection(userId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    android.util.Log.e("FirestoreComy", "observeBlockedUserIds error", error)
                    trySend(emptySet())
                    return@addSnapshotListener
                }
                val ids = snapshot?.documents?.mapNotNull { it.id }?.toSet() ?: emptySet()
                trySend(ids)
            }
        awaitClose { listener.remove() }
    }

    // ===== ヘルパー関数 =====

    /**
     * Firestoreデータを投稿モデルに変換
     */
    private fun mapToPost(data: Map<String, Any>, id: String): ComyPost {
        val categoryString = data["category"] as? String ?: "question"
        val category = try {
            ComyCategory.valueOf(categoryString.uppercase())
        } catch (e: Exception) {
            ComyCategory.QUESTION
        }

        return ComyPost(
            id = id,
            userId = data["userId"] as? String ?: "",
            authorName = data["authorName"] as? String ?: "",
            authorPhotoUrl = data["authorPhotoUrl"] as? String,
            authorLevel = (data["authorLevel"] as? Number)?.toInt() ?: 1,
            title = data["title"] as? String ?: "",
            content = data["content"] as? String ?: "",
            category = category,
            imageUrl = data["imageUrl"] as? String,
            likeCount = (data["likeCount"] as? Number)?.toInt() ?: 0,
            commentCount = (data["commentCount"] as? Number)?.toInt() ?: 0,
            createdAt = (data["createdAt"] as? Number)?.toLong() ?: 0L
        )
    }

    /**
     * Firestoreデータをコメントモデルに変換
     */
    private fun mapToComment(data: Map<String, Any>, id: String, postId: String): ComyComment {
        return ComyComment(
            id = id,
            postId = postId,
            userId = data["userId"] as? String ?: "",
            authorName = data["authorName"] as? String ?: "",
            authorPhotoUrl = data["authorPhotoUrl"] as? String,
            content = data["content"] as? String ?: "",
            createdAt = (data["createdAt"] as? Number)?.toLong() ?: 0L
        )
    }
}
