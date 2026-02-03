package com.yourcoach.plus.shared.domain.service

import com.yourcoach.plus.shared.domain.model.UserProfile
import kotlinx.datetime.Clock

/**
 * Gemini API サービスインターフェース
 * Cloud Function (callGemini) 経由でVertex AIにアクセス
 */
interface GeminiService {
    /**
     * メッセージを送信してAI応答を取得
     * @param message ユーザーメッセージまたはプロンプト
     * @param conversationHistory 過去の会話履歴
     * @param userProfile ユーザープロフィール（コンテキスト用）
     * @param model 使用するモデル名（デフォルト: gemini-2.5-pro）
     * @return AI応答結果
     */
    suspend fun sendMessage(
        message: String,
        conversationHistory: List<ConversationMessage> = emptyList(),
        userProfile: UserProfile? = null,
        model: String = "gemini-2.5-pro"
    ): GeminiResponse

    /**
     * クレジットを消費してメッセージを送信（デイリー分析用）
     * @param userId ユーザーID
     * @param message メッセージ
     * @param conversationHistory 会話履歴
     * @param userProfile ユーザープロフィール
     * @param model モデル名（デフォルト: gemini-2.5-pro）
     * @return AI応答結果
     */
    suspend fun sendMessageWithCredit(
        userId: String,
        message: String,
        conversationHistory: List<ConversationMessage> = emptyList(),
        userProfile: UserProfile? = null,
        model: String = "gemini-2.5-pro"
    ): GeminiResponse

    /**
     * 画像付きメッセージを送信（食品認識用）
     * @param imageBase64 Base64エンコードされた画像データ
     * @param mimeType 画像のMIMEタイプ（例: "image/jpeg"）
     * @param prompt 画像分析用のプロンプト
     * @param model 使用するモデル名（デフォルト: gemini-2.5-flash）
     * @return AI応答結果
     */
    suspend fun analyzeImage(
        imageBase64: String,
        mimeType: String = "image/jpeg",
        prompt: String,
        model: String = "gemini-2.5-flash"
    ): GeminiResponse
}

/**
 * 会話メッセージ
 */
data class ConversationMessage(
    val role: String, // "user" or "model"
    val content: String,
    val timestamp: Long = Clock.System.now().toEpochMilliseconds()
)

/**
 * Gemini API レスポンス
 */
data class GeminiResponse(
    val success: Boolean,
    val text: String? = null,
    val error: String? = null,
    val remainingCredits: Int? = null
)

/**
 * クレジット情報
 */
data class CreditInfo(
    val totalCredits: Int,
    val freeCredits: Int,
    val paidCredits: Int,
    val tier: String // "free" or "premium"
) {
    val isAllowed: Boolean get() = totalCredits > 0
}

/**
 * AI食品認識結果
 */
data class RecognizedFoodResult(
    val name: String,
    val amount: Float,           // グラム数
    val confidence: Float,       // 信頼度 0.0-1.0
    val itemType: String,        // food, drink, supplement
    val cookingState: String,    // 調理状態
    val nutritionPer100g: NutritionPer100g
)

/**
 * 100gあたりの栄養素
 */
data class NutritionPer100g(
    val calories: Float,
    val protein: Float,
    val fat: Float,
    val carbs: Float,
    val fiber: Float = 0f
)

/**
 * 食品認識APIレスポンス
 */
data class FoodRecognitionResponse(
    val success: Boolean,
    val foods: List<RecognizedFoodResult> = emptyList(),
    val hasPackageInfo: Boolean = false,
    val error: String? = null
)
