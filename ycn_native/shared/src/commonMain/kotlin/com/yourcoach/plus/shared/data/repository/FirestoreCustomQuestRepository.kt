package com.yourcoach.plus.shared.data.repository

import com.yourcoach.plus.shared.domain.model.CustomQuest
import com.yourcoach.plus.shared.domain.model.CustomQuestItem
import com.yourcoach.plus.shared.domain.model.CustomQuestMacros
import com.yourcoach.plus.shared.domain.model.CustomQuestSlot
import com.yourcoach.plus.shared.domain.model.CustomQuestSlotType
import com.yourcoach.plus.shared.domain.repository.CustomQuestRepository
import com.yourcoach.plus.shared.util.AppError
import dev.gitlive.firebase.Firebase
import dev.gitlive.firebase.firestore.DocumentSnapshot
import dev.gitlive.firebase.firestore.FirebaseFirestore
import dev.gitlive.firebase.firestore.Timestamp
import dev.gitlive.firebase.firestore.firestore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.Serializable

/**
 * Firestore ドキュメント構造用DTO
 * GitLive SDK の get<T>() で @Serializable 型としてデシリアライズ
 */
@Serializable
private data class CustomQuestDoc(
    val date: String? = null,
    val assignedBy: String? = null,
    val isCustom: Boolean? = null,
    val slots: Map<String, CustomQuestSlot> = emptyMap(),
    val executedItems: Map<String, List<Int>> = emptyMap()
)

/**
 * Firestore カスタムクエストリポジトリ実装 (GitLive KMP版)
 * Collection: users/{userId}/custom_quests/{date}
 */
class FirestoreCustomQuestRepository : CustomQuestRepository {

    private val firestore: FirebaseFirestore by lazy {
        try {
            Firebase.firestore
        } catch (e: Throwable) {
            println("FirestoreCustomQuestRepository: Firebase.firestore initialization failed: ${e.message}")
            throw e
        }
    }

    private fun customQuestsCollection(userId: String) =
        firestore.collection("users").document(userId).collection("custom_quests")

    override fun observeCustomQuest(userId: String, date: String): Flow<CustomQuest?> {
        return customQuestsCollection(userId)
            .document(date)
            .snapshots
            .map { doc ->
                if (doc.exists) {
                    try {
                        doc.toCustomQuest()
                    } catch (e: Throwable) {
                        println("CQ_DEBUG: observe parse failed: ${e::class.simpleName}: ${e.message}")
                        null
                    }
                } else {
                    null
                }
            }
    }

    override suspend fun getCustomQuest(userId: String, date: String): Result<CustomQuest?> {
        return try {
            println("CQ_DEBUG: getCustomQuest userId=$userId, date=$date")
            val doc = customQuestsCollection(userId).document(date).get()
            println("CQ_DEBUG: date doc exists=${doc.exists}")
            if (doc.exists) {
                val quest = doc.toCustomQuest()
                println("CQ_DEBUG: parsed OK, slots=${quest.slots.keys}, executedItems=${quest.executedItems.keys}")
                return Result.success(quest)
            }
            val defaultDoc = customQuestsCollection(userId).document("_default").get()
            println("CQ_DEBUG: _default doc exists=${defaultDoc.exists}")
            if (defaultDoc.exists) {
                val quest = defaultDoc.toCustomQuest().copy(date = date)
                println("CQ_DEBUG: parsed _default OK, slots=${quest.slots.keys}")
                Result.success(quest)
            } else {
                println("CQ_DEBUG: no custom quest found")
                Result.success(null)
            }
        } catch (e: Throwable) {
            println("CQ_DEBUG: EXCEPTION: ${e::class.simpleName}: ${e.message}")
            e.printStackTrace()
            Result.failure(AppError.DatabaseError("カスタムクエストの取得に失敗: ${e.message}", e as? Exception ?: Exception(e)))
        }
    }

    override suspend fun updateExecutedItems(
        userId: String,
        date: String,
        executedSlotKey: String,
        executedItemIndices: List<Int>
    ): Result<Unit> {
        return try {
            customQuestsCollection(userId)
                .document(date)
                .update(mapOf("executedItems.$executedSlotKey" to executedItemIndices))
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("カスタムクエストの実行状況更新に失敗しました", e))
        }
    }

    // ========== Mapping ==========

    private fun DocumentSnapshot.toCustomQuest(): CustomQuest {
        println("CQ_DEBUG: toCustomQuest START, id=$id")

        // 方法1: @Serializable DTO で一括デシリアライズ
        val questDoc = try {
            val doc = data(CustomQuestDoc.serializer())
            println("CQ_DEBUG: typed deserialize OK, slots=${doc.slots.keys}")
            doc
        } catch (e: Throwable) {
            println("CQ_DEBUG: typed deserialize FAILED: ${e::class.simpleName}: ${e.message}")
            null
        }

        if (questDoc != null) {
            return CustomQuest(
                date = questDoc.date ?: id,
                assignedBy = questDoc.assignedBy ?: "",
                isCustom = questDoc.isCustom ?: true,
                slots = questDoc.slots,
                executedItems = questDoc.executedItems,
                createdAt = getTimestampAsLong("createdAt")
            )
        }

        // 方法2: フォールバック（個別フィールド読み取り）
        println("CQ_DEBUG: falling back to field-by-field parsing")
        val slots = try {
            get<Map<String, CustomQuestSlot>?>("slots") ?: emptyMap()
        } catch (e: Throwable) {
            println("CQ_DEBUG: slots typed get FAILED: ${e::class.simpleName}: ${e.message}")
            emptyMap()
        }

        val executedItems = try {
            get<Map<String, List<Int>>?>("executedItems") ?: emptyMap()
        } catch (e: Throwable) {
            println("CQ_DEBUG: executedItems typed get FAILED: ${e.message}")
            emptyMap()
        }

        return CustomQuest(
            date = get<String?>("date") ?: id,
            assignedBy = get<String?>("assignedBy") ?: "",
            isCustom = get<Boolean?>("isCustom") ?: true,
            slots = slots,
            executedItems = executedItems,
            createdAt = getTimestampAsLong("createdAt")
        )
    }

    private fun DocumentSnapshot.getTimestampAsLong(field: String): Long {
        return try {
            val ts = get<Timestamp?>(field)
            ts?.let { it.seconds * 1000 + it.nanoseconds / 1_000_000 } ?: 0L
        } catch (e: Throwable) {
            try {
                get<Long?>(field) ?: 0L
            } catch (e2: Throwable) {
                0L
            }
        }
    }
}
