package com.yourcoach.plus.shared.data.repository

import com.yourcoach.plus.shared.domain.repository.AnalysisReport
import com.yourcoach.plus.shared.domain.repository.AnalysisRepository
import com.yourcoach.plus.shared.domain.repository.ConversationEntry
import com.yourcoach.plus.shared.domain.repository.ReportType
import com.yourcoach.plus.shared.domain.repository.UserCreditInfo
import com.yourcoach.plus.shared.util.AppError
import com.yourcoach.plus.shared.util.DateUtil
import dev.gitlive.firebase.Firebase
import dev.gitlive.firebase.firestore.Direction
import dev.gitlive.firebase.firestore.FieldValue
import dev.gitlive.firebase.firestore.FirebaseFirestore
import dev.gitlive.firebase.firestore.firestore

/**
 * Firestore 分析リポジトリ実装 (GitLive KMP版)
 */
class FirestoreAnalysisRepository : AnalysisRepository {

    private val firestore: FirebaseFirestore by lazy {
        try {
            Firebase.firestore
        } catch (e: Throwable) {
            println("FirestoreAnalysisRepository: Firebase.firestore initialization failed: ${e.message}")
            throw e
        }
    }

    private fun reportsCollection(userId: String) =
        firestore.collection("users").document(userId).collection("analysisReports")

    private fun userDocument(userId: String) =
        firestore.collection("users").document(userId)

    override suspend fun saveReport(userId: String, report: AnalysisReport): Result<String> {
        return try {
            val docRef = reportsCollection(userId).document
            val reportWithId = report.copy(id = docRef.id)
            docRef.set(reportToMap(reportWithId))
            Result.success(docRef.id)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("レポートの保存に失敗しました", e))
        }
    }

    override suspend fun getReport(userId: String, reportId: String): Result<AnalysisReport?> {
        return try {
            val doc = reportsCollection(userId).document(reportId).get()
            if (doc.exists) {
                Result.success(doc.toReport())
            } else {
                Result.success(null)
            }
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("レポートの取得に失敗しました", e))
        }
    }

    override suspend fun getReports(userId: String, limit: Int): Result<List<AnalysisReport>> {
        return try {
            val snapshot = reportsCollection(userId)
                .orderBy("createdAt", Direction.DESCENDING)
                .limit(limit)
                .get()

            val reports = snapshot.documents.mapNotNull { doc ->
                try {
                    doc.toReport()
                } catch (e: Exception) {
                    null
                }
            }
            Result.success(reports)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("レポートの取得に失敗しました", e))
        }
    }

    override suspend fun updateReport(userId: String, reportId: String, updates: Map<String, Any>): Result<Unit> {
        return try {
            val updatesWithTimestamp = updates.toMutableMap()
            updatesWithTimestamp["updatedAt"] = DateUtil.currentTimestamp()
            reportsCollection(userId).document(reportId).update(updatesWithTimestamp)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("レポートの更新に失敗しました", e))
        }
    }

    override suspend fun deleteReport(userId: String, reportId: String): Result<Unit> {
        return try {
            reportsCollection(userId).document(reportId).delete()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("レポートの削除に失敗しました", e))
        }
    }

    override suspend fun getCreditInfo(userId: String): Result<UserCreditInfo> {
        return try {
            val doc = userDocument(userId).get()
            if (doc.exists) {
                val freeCredits = doc.get<Long?>("freeCredits")?.toInt() ?: 0
                val paidCredits = doc.get<Long?>("paidCredits")?.toInt() ?: 0
                val isPremium = doc.get<Boolean?>("isPremium") ?: false
                val level = doc.get<Long?>("level")?.toInt() ?: 1
                val xp = doc.get<Long?>("experience")?.toInt() ?: 0

                Result.success(
                    UserCreditInfo(
                        totalCredits = freeCredits + paidCredits,
                        freeCredits = freeCredits,
                        paidCredits = paidCredits,
                        tier = if (isPremium) "premium" else "free",
                        level = level,
                        xp = xp
                    )
                )
            } else {
                Result.success(UserCreditInfo())
            }
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("クレジット情報の取得に失敗しました", e))
        }
    }

    override suspend fun consumeCredit(userId: String, amount: Int): Result<Int> {
        return try {
            // 現在のクレジットを取得
            val creditResult = getCreditInfo(userId)
            val creditInfo = creditResult.getOrNull()
                ?: return Result.failure(AppError.DatabaseError("クレジット情報の取得に失敗しました"))

            if (creditInfo.totalCredits < amount) {
                return Result.failure(AppError.InsufficientCredits("クレジットが不足しています"))
            }

            // まず無料クレジットから消費、足りなければ有料クレジットから消費
            val freeToConsume = minOf(amount, creditInfo.freeCredits)
            val paidToConsume = amount - freeToConsume

            val updates = mutableMapOf<String, Any>()
            if (freeToConsume > 0) {
                updates["freeCredits"] = FieldValue.increment(-freeToConsume)
            }
            if (paidToConsume > 0) {
                updates["paidCredits"] = FieldValue.increment(-paidToConsume)
            }

            userDocument(userId).update(updates)

            val newTotal = creditInfo.totalCredits - amount
            Result.success(newTotal)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("クレジットの消費に失敗しました", e))
        }
    }

    // ========== Mapping Functions ==========

    @Suppress("UNCHECKED_CAST")
    private fun reportToMap(report: AnalysisReport): Map<String, Any?> = mapOf(
        "id" to report.id,
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

    @Suppress("UNCHECKED_CAST")
    private fun dev.gitlive.firebase.firestore.DocumentSnapshot.toReport(): AnalysisReport {
        val reportTypeStr = get<String?>("reportType") ?: "DAILY"
        val reportType = try {
            ReportType.valueOf(reportTypeStr)
        } catch (e: Exception) {
            ReportType.DAILY
        }

        // 会話履歴のパース（iOSでMap<String, Any?>がうまく動かない可能性があるためtry-catch）
        val conversationHistory = try {
            val historyList = get<List<Map<String, Any?>>?>("conversationHistory") ?: emptyList()
            historyList.map { entry ->
                ConversationEntry(
                    type = entry["type"] as? String ?: "ai",
                    content = entry["content"] as? String ?: "",
                    timestamp = (entry["timestamp"] as? Number)?.toLong() ?: 0
                )
            }
        } catch (e: Exception) {
            emptyList()
        }

        return AnalysisReport(
            id = id,
            title = get<String?>("title") ?: "",
            content = get<String?>("content") ?: "",
            conversationHistory = conversationHistory,
            periodStart = get<String?>("periodStart") ?: "",
            periodEnd = get<String?>("periodEnd") ?: "",
            reportType = reportType,
            createdAt = get<Long?>("createdAt") ?: 0,
            updatedAt = get<Long?>("updatedAt") ?: 0
        )
    }
}
