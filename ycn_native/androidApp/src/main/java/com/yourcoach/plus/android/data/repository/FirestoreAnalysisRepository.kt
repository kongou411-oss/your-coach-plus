package com.yourcoach.plus.android.data.repository

import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.yourcoach.plus.shared.domain.repository.AnalysisReport
import com.yourcoach.plus.shared.domain.repository.AnalysisRepository
import com.yourcoach.plus.shared.domain.repository.ConversationEntry
import com.yourcoach.plus.shared.domain.repository.ReportType
import com.yourcoach.plus.shared.domain.repository.UserCreditInfo
import com.yourcoach.plus.shared.util.AppError
import kotlinx.coroutines.tasks.await

/**
 * Firestore実装の分析リポジトリ
 */
class FirestoreAnalysisRepository : AnalysisRepository {

    private val firestore = FirebaseFirestore.getInstance()

    override suspend fun saveReport(userId: String, report: AnalysisReport): Result<String> {
        return try {
            val data = reportToMap(report)
            val docRef = firestore
                .collection("users")
                .document(userId)
                .collection("analysisReports")
                .document()

            docRef.set(data).await()
            Result.success(docRef.id)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("レポートの保存に失敗しました", e))
        }
    }

    override suspend fun getReport(userId: String, reportId: String): Result<AnalysisReport?> {
        return try {
            val doc = firestore
                .collection("users")
                .document(userId)
                .collection("analysisReports")
                .document(reportId)
                .get()
                .await()

            if (doc.exists()) {
                Result.success(mapToReport(doc.id, doc.data ?: emptyMap()))
            } else {
                Result.success(null)
            }
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("レポートの取得に失敗しました", e))
        }
    }

    override suspend fun getReports(userId: String, limit: Int): Result<List<AnalysisReport>> {
        return try {
            val snapshot = firestore
                .collection("users")
                .document(userId)
                .collection("analysisReports")
                .orderBy("createdAt", Query.Direction.DESCENDING)
                .limit(limit.toLong())
                .get()
                .await()

            val reports = snapshot.documents.mapNotNull { doc ->
                mapToReport(doc.id, doc.data ?: emptyMap())
            }
            Result.success(reports)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("レポート一覧の取得に失敗しました", e))
        }
    }

    override suspend fun updateReport(
        userId: String,
        reportId: String,
        updates: Map<String, Any>
    ): Result<Unit> {
        return try {
            val updateData = updates.toMutableMap()
            updateData["updatedAt"] = System.currentTimeMillis()

            firestore
                .collection("users")
                .document(userId)
                .collection("analysisReports")
                .document(reportId)
                .update(updateData)
                .await()

            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("レポートの更新に失敗しました", e))
        }
    }

    override suspend fun deleteReport(userId: String, reportId: String): Result<Unit> {
        return try {
            firestore
                .collection("users")
                .document(userId)
                .collection("analysisReports")
                .document(reportId)
                .delete()
                .await()

            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("レポートの削除に失敗しました", e))
        }
    }

    override suspend fun getCreditInfo(userId: String): Result<UserCreditInfo> {
        return try {
            val doc = firestore
                .collection("users")
                .document(userId)
                .get()
                .await()

            val data = doc.data ?: emptyMap<String, Any>()

            // ユーザードキュメントからクレジット情報を取得（ダッシュボードと同じデータソース）
            val freeCredits = (data["freeCredits"] as? Number)?.toInt()
                ?: (data["credits"] as? Number)?.toInt()  // 旧フィールドフォールバック
                ?: 0
            val paidCredits = (data["paidCredits"] as? Number)?.toInt() ?: 0

            // 経験値情報（別途取得）
            val level = (data["level"] as? Number)?.toInt() ?: 1
            val xp = (data["experience"] as? Number)?.toInt() ?: 0

            // Premium判定
            val subscriptionStatus = data["subscriptionStatus"] as? String
            val tier = if (subscriptionStatus == "active") "premium" else "free"

            Result.success(
                UserCreditInfo(
                    totalCredits = freeCredits + paidCredits,
                    freeCredits = freeCredits,
                    paidCredits = paidCredits,
                    tier = tier,
                    level = level,
                    xp = xp
                )
            )
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("クレジット情報の取得に失敗しました", e))
        }
    }

    override suspend fun consumeCredit(userId: String, amount: Int): Result<Int> {
        return try {
            val expRef = firestore
                .collection("users")
                .document(userId)
                .collection("experience")
                .document("current")

            firestore.runTransaction { transaction ->
                val snapshot = transaction.get(expRef)
                val freeCredits = (snapshot.getLong("freeCredits") ?: 0).toInt()
                val paidCredits = (snapshot.getLong("paidCredits") ?: 0).toInt()
                val totalCredits = freeCredits + paidCredits

                if (totalCredits < amount) {
                    throw AppError.InsufficientCredits()
                }

                // 無料クレジットを優先消費
                val newFreeCredits: Int
                val newPaidCredits: Int

                if (freeCredits >= amount) {
                    newFreeCredits = freeCredits - amount
                    newPaidCredits = paidCredits
                } else {
                    newFreeCredits = 0
                    newPaidCredits = paidCredits - (amount - freeCredits)
                }

                transaction.update(expRef, mapOf(
                    "freeCredits" to newFreeCredits,
                    "paidCredits" to newPaidCredits
                ))

                newFreeCredits + newPaidCredits
            }.await()

            // 残りクレジットを取得して返す
            val updatedInfo = getCreditInfo(userId)
            updatedInfo.map { it.totalCredits }
        } catch (e: AppError.InsufficientCredits) {
            Result.failure(e)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("クレジットの消費に失敗しました", e))
        }
    }

    /**
     * レポートをMapに変換
     */
    private fun reportToMap(report: AnalysisReport): Map<String, Any> {
        return mapOf(
            "title" to report.title,
            "content" to report.content,
            "conversationHistory" to report.conversationHistory.map { entry ->
                mapOf(
                    "type" to entry.type,
                    "content" to entry.content,
                    "timestamp" to entry.timestamp
                )
            },
            "periodStart" to report.periodStart,
            "periodEnd" to report.periodEnd,
            "reportType" to report.reportType.name,
            "createdAt" to report.createdAt,
            "updatedAt" to report.updatedAt
        )
    }

    /**
     * MapをレポートVに変換
     */
    @Suppress("UNCHECKED_CAST")
    private fun mapToReport(id: String, data: Map<String, Any?>): AnalysisReport {
        val conversationHistory = (data["conversationHistory"] as? List<Map<String, Any?>>)
            ?.map { entry ->
                ConversationEntry(
                    type = entry["type"] as? String ?: "user",
                    content = entry["content"] as? String ?: "",
                    timestamp = (entry["timestamp"] as? Number)?.toLong() ?: System.currentTimeMillis()
                )
            } ?: emptyList()

        return AnalysisReport(
            id = id,
            title = data["title"] as? String ?: "",
            content = data["content"] as? String ?: "",
            conversationHistory = conversationHistory,
            periodStart = data["periodStart"] as? String ?: "",
            periodEnd = data["periodEnd"] as? String ?: "",
            reportType = try {
                ReportType.valueOf(data["reportType"] as? String ?: "DAILY")
            } catch (e: Exception) {
                ReportType.DAILY
            },
            createdAt = (data["createdAt"] as? Number)?.toLong() ?: System.currentTimeMillis(),
            updatedAt = (data["updatedAt"] as? Number)?.toLong() ?: System.currentTimeMillis()
        )
    }
}
