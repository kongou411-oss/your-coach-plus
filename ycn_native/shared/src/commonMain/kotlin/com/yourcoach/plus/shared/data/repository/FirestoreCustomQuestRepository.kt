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
                    } catch (e: Exception) {
                        println("FirestoreCustomQuestRepository: Failed to parse custom quest: ${e.message}")
                        null
                    }
                } else {
                    null
                }
            }
    }

    override suspend fun getCustomQuest(userId: String, date: String): Result<CustomQuest?> {
        return try {
            val doc = customQuestsCollection(userId).document(date).get()
            if (doc.exists) {
                Result.success(doc.toCustomQuest())
            } else {
                Result.success(null)
            }
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("カスタムクエストの取得に失敗しました", e))
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

    // ========== Mapping Functions ==========

    @Suppress("UNCHECKED_CAST")
    private fun DocumentSnapshot.toCustomQuest(): CustomQuest {
        val slotsRaw = get<Map<String, Any?>?>("slots") ?: emptyMap()
        val slots = slotsRaw.mapNotNull { (key, value) ->
            try {
                val slotMap = value as? Map<String, Any?> ?: return@mapNotNull null
                key to parseSlot(slotMap)
            } catch (e: Exception) {
                null
            }
        }.toMap()

        val createdAt = getTimestampAsLong("createdAt")

        return CustomQuest(
            date = get<String?>("date") ?: id,
            assignedBy = get<String?>("assignedBy") ?: "",
            isCustom = get<Boolean?>("isCustom") ?: true,
            slots = slots,
            createdAt = createdAt
        )
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseSlot(map: Map<String, Any?>): CustomQuestSlot {
        val typeStr = map["type"] as? String ?: "MEAL"
        val type = try {
            CustomQuestSlotType.valueOf(typeStr)
        } catch (e: Exception) {
            CustomQuestSlotType.MEAL
        }

        val itemsList = (map["items"] as? List<Map<String, Any?>>)?.map { itemMap ->
            @Suppress("UNCHECKED_CAST")
            val vitaminsMap = (itemMap["vitamins"] as? Map<String, Any?>)?.mapValues { (_, v) -> (v as? Number)?.toFloat() ?: 0f } ?: emptyMap()
            @Suppress("UNCHECKED_CAST")
            val mineralsMap = (itemMap["minerals"] as? Map<String, Any?>)?.mapValues { (_, v) -> (v as? Number)?.toFloat() ?: 0f } ?: emptyMap()
            CustomQuestItem(
                foodName = itemMap["foodName"] as? String ?: "",
                amount = (itemMap["amount"] as? Number)?.toFloat() ?: 0f,
                unit = itemMap["unit"] as? String ?: "g",
                calories = (itemMap["calories"] as? Number)?.toFloat() ?: 0f,
                protein = (itemMap["protein"] as? Number)?.toFloat() ?: 0f,
                fat = (itemMap["fat"] as? Number)?.toFloat() ?: 0f,
                carbs = (itemMap["carbs"] as? Number)?.toFloat() ?: 0f,
                fiber = (itemMap["fiber"] as? Number)?.toFloat() ?: 0f,
                solubleFiber = (itemMap["solubleFiber"] as? Number)?.toFloat() ?: 0f,
                insolubleFiber = (itemMap["insolubleFiber"] as? Number)?.toFloat() ?: 0f,
                sugar = (itemMap["sugar"] as? Number)?.toFloat() ?: 0f,
                saturatedFat = (itemMap["saturatedFat"] as? Number)?.toFloat() ?: 0f,
                monounsaturatedFat = (itemMap["monounsaturatedFat"] as? Number)?.toFloat() ?: 0f,
                polyunsaturatedFat = (itemMap["polyunsaturatedFat"] as? Number)?.toFloat() ?: 0f,
                diaas = (itemMap["diaas"] as? Number)?.toFloat() ?: 0f,
                gi = (itemMap["gi"] as? Number)?.toInt() ?: 0,
                vitamins = vitaminsMap,
                minerals = mineralsMap
            )
        } ?: emptyList()

        val macrosMap = map["totalMacros"] as? Map<String, Any?>
        val totalMacros = macrosMap?.let {
            @Suppress("UNCHECKED_CAST")
            val macroVitamins = (it["vitamins"] as? Map<String, Any?>)?.mapValues { (_, v) -> (v as? Number)?.toFloat() ?: 0f } ?: emptyMap()
            @Suppress("UNCHECKED_CAST")
            val macroMinerals = (it["minerals"] as? Map<String, Any?>)?.mapValues { (_, v) -> (v as? Number)?.toFloat() ?: 0f } ?: emptyMap()
            CustomQuestMacros(
                protein = (it["protein"] as? Number)?.toFloat() ?: 0f,
                fat = (it["fat"] as? Number)?.toFloat() ?: 0f,
                carbs = (it["carbs"] as? Number)?.toFloat() ?: 0f,
                calories = (it["calories"] as? Number)?.toFloat() ?: 0f,
                fiber = (it["fiber"] as? Number)?.toFloat() ?: 0f,
                vitamins = macroVitamins,
                minerals = macroMinerals
            )
        }

        return CustomQuestSlot(
            templateId = map["templateId"] as? String,
            title = map["title"] as? String ?: "",
            type = type,
            items = itemsList,
            totalMacros = totalMacros
        )
    }

    private fun DocumentSnapshot.getTimestampAsLong(field: String): Long {
        return try {
            val ts = get<Timestamp?>(field)
            ts?.let { it.seconds * 1000 + it.nanoseconds / 1_000_000 } ?: 0L
        } catch (e: Exception) {
            try {
                get<Long?>(field) ?: 0L
            } catch (e2: Exception) {
                0L
            }
        }
    }
}
