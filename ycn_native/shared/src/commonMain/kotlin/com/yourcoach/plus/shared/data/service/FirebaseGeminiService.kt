package com.yourcoach.plus.shared.data.service

import com.yourcoach.plus.shared.domain.model.UserProfile
import com.yourcoach.plus.shared.domain.service.ConversationMessage
import com.yourcoach.plus.shared.domain.service.GeminiResponse
import com.yourcoach.plus.shared.domain.service.GeminiService
import com.yourcoach.plus.shared.util.invokeCloudFunction
import kotlin.math.round

/**
 * Firebase Cloud Functions経由のGemini API実装
 * invokeCloudFunction経由でネイティブFirebase SDKを使用（Kotlin/Native対応）
 */
class FirebaseGeminiService : GeminiService {

    private val REGION = "asia-northeast2"
    private val FUNCTION_NAME = "callGemini"

    // タイムアウト設定（秒）
    private val ANALYSIS_TIMEOUT_SEC = 120L  // AI分析用（120秒）
    private val IMAGE_TIMEOUT_SEC = 60L      // 画像認識用（60秒）

    override suspend fun sendMessage(
        message: String,
        conversationHistory: List<ConversationMessage>,
        userProfile: UserProfile?,
        model: String
    ): GeminiResponse {
        return try {
            val contents = buildContents(message, conversationHistory, userProfile)

            val data = mapOf<String, Any>(
                "contents" to contents,
                "model" to model
            )

            val result = invokeCloudFunction(
                region = REGION,
                functionName = FUNCTION_NAME,
                data = data,
                timeoutSeconds = ANALYSIS_TIMEOUT_SEC
            )

            parseResponse(result)
        } catch (e: kotlinx.coroutines.TimeoutCancellationException) {
            GeminiResponse(
                success = false,
                error = "AI分析がタイムアウトしました。再度お試しください。"
            )
        } catch (e: Exception) {
            GeminiResponse(
                success = false,
                error = e.message ?: "AI通信エラーが発生しました"
            )
        }
    }

    override suspend fun sendMessageWithCredit(
        userId: String,
        message: String,
        conversationHistory: List<ConversationMessage>,
        userProfile: UserProfile?,
        model: String
    ): GeminiResponse {
        return try {
            val contents = buildContents(message, conversationHistory, userProfile)

            val data = mapOf<String, Any>(
                "contents" to contents,
                "model" to model,
                "userId" to userId,
                "consumeCredit" to true
            )

            val result = invokeCloudFunction(
                region = REGION,
                functionName = FUNCTION_NAME,
                data = data,
                timeoutSeconds = ANALYSIS_TIMEOUT_SEC
            )

            parseResponse(result)
        } catch (e: kotlinx.coroutines.TimeoutCancellationException) {
            GeminiResponse(
                success = false,
                error = "AI分析がタイムアウトしました。再度お試しください。"
            )
        } catch (e: Exception) {
            GeminiResponse(
                success = false,
                error = e.message ?: "AI通信エラーが発生しました"
            )
        }
    }

    override suspend fun analyzeImage(
        imageBase64: String,
        mimeType: String,
        prompt: String,
        model: String
    ): GeminiResponse {
        return try {
            // プレーンなMapで構築（Kotlin/Native対応 - @Serializable不要）
            val data = mapOf<String, Any>(
                "contents" to listOf(
                    mapOf(
                        "role" to "user",
                        "parts" to listOf(
                            mapOf("text" to prompt),
                            mapOf("inline_data" to mapOf(
                                "mime_type" to mimeType,
                                "data" to imageBase64
                            ))
                        )
                    )
                ),
                "model" to model,
                "generationConfig" to mapOf(
                    "temperature" to 0.4,
                    "topK" to 32,
                    "topP" to 1.0,
                    "maxOutputTokens" to 8192
                )
            )

            val result = invokeCloudFunction(
                region = REGION,
                functionName = FUNCTION_NAME,
                data = data,
                timeoutSeconds = IMAGE_TIMEOUT_SEC
            )

            parseResponse(result)
        } catch (e: kotlinx.coroutines.TimeoutCancellationException) {
            GeminiResponse(
                success = false,
                error = "画像分析がタイムアウトしました。再度お試しください。"
            )
        } catch (e: Exception) {
            GeminiResponse(
                success = false,
                error = e.message ?: "画像分析エラーが発生しました"
            )
        }
    }

    /**
     * Gemini API用のcontentsを構築
     */
    private fun buildContents(
        message: String,
        conversationHistory: List<ConversationMessage>,
        userProfile: UserProfile?
    ): List<Map<String, Any>> {
        val contents = mutableListOf<Map<String, Any>>()

        // 会話履歴がない場合はシステムプロンプト + ユーザーメッセージ
        if (conversationHistory.isEmpty()) {
            val systemPrompt = buildSystemPrompt(userProfile)
            contents.add(
                mapOf(
                    "role" to "user",
                    "parts" to listOf(mapOf("text" to "$systemPrompt\n\n$message"))
                )
            )
        } else {
            // 会話履歴がある場合
            conversationHistory.forEach { msg ->
                contents.add(
                    mapOf(
                        "role" to msg.role,
                        "parts" to listOf(mapOf("text" to msg.content))
                    )
                )
            }
            // 新しいメッセージを追加
            contents.add(
                mapOf(
                    "role" to "user",
                    "parts" to listOf(mapOf("text" to message))
                )
            )
        }

        return contents
    }

    /**
     * システムプロンプトを構築（ミニマリスト・理論値構成）
     */
    private fun buildSystemPrompt(userProfile: UserProfile?): String {
        val profileContext = userProfile?.let { profile ->
            buildString {
                appendLine("【ユーザー情報】")
                profile.weight?.let { weight ->
                    appendLine("- 体重: ${weight}kg")
                    profile.bodyFatPercentage?.let { bf ->
                        appendLine("- 体脂肪率: ${bf}%")
                        val lbm = weight * (1 - bf / 100)
                        val lbmRounded = round(lbm * 10) / 10
                        appendLine("- LBM: ${lbmRounded}kg")
                    }
                }
                profile.goal?.let {
                    val goalText = when (it.name) {
                        "LOSE_WEIGHT" -> "減量"
                        "MAINTAIN" -> "維持・リコンプ"
                        "GAIN_MUSCLE" -> "増量"
                        else -> it.name
                    }
                    appendLine("- 目標: $goalText")
                }
            }
        } ?: "（プロフィール未設定）"

        // 目標に応じた炭水化物
        val carbType = when (userProfile?.goal?.name) {
            "LOSE_WEIGHT" -> "玄米"
            else -> "白米"
        }

        return """
あなたはボディメイク専門のAIアシスタントです。

【基本原則】
1. LBM（除脂肪体重）至上主義: BMIは使用しない
2. 理論値のみ提示: 最適解だけを示し、妥協案は出さない
3. ミニマリズム: 食材数を最小限に抑え、在庫管理を簡素化

【固定メンバー（The Fab 4）】
- タンパク質: 鶏むね肉、全卵
- 炭水化物: $carbType（ミールプレップ推奨）、切り餅（トレ前後・緊急用）
- 野菜: ブロッコリー（冷凍可）

【ミールプレップ前提】
- 米は週2回まとめて炊き、タッパーで冷蔵保存
- 冷や飯はレジスタントスターチ化でGI低下
- 朝はレンチンだけで完結

【トレ前後】
- 切り餅（1個=50g=炭水化物25g）+ ホエイプロテイン
- 純粋ブドウ糖で筋グリコーゲン直行

【置き換えはユーザー判断】
アプリは理論値のみ提示。嗜好や状況による置き換え（パン、麺、外食等）はユーザーが自己判断で記録する。

$profileContext

簡潔に回答してください。
""".trimIndent()
    }

    /**
     * Cloud Functionのレスポンスを解析
     */
    @Suppress("UNCHECKED_CAST")
    private fun parseResponse(data: Map<String, Any?>): GeminiResponse {
        if (data.isEmpty()) {
            return GeminiResponse(success = false, error = "空のレスポンス")
        }

        // エラーチェック
        val error = data["error"] as? String
        if (error != null) {
            return GeminiResponse(success = false, error = error)
        }

        // Geminiレスポンスを解析
        val geminiResponse = data["response"] as? Map<String, Any?>
        val remainingCredits = (data["remainingCredits"] as? Number)?.toInt()

        if (geminiResponse != null) {
            val candidates = geminiResponse["candidates"] as? List<Map<String, Any?>>
            if (!candidates.isNullOrEmpty()) {
                val candidate = candidates[0]
                val content = candidate["content"] as? Map<String, Any?>
                val parts = content?.get("parts") as? List<Map<String, Any?>>
                val text = parts?.firstOrNull()?.get("text") as? String

                if (text != null) {
                    return GeminiResponse(
                        success = true,
                        text = text,
                        remainingCredits = remainingCredits
                    )
                }
            }
        }

        return GeminiResponse(success = false, error = "レスポンスの解析に失敗しました")
    }
}
