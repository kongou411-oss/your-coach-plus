package com.yourcoach.plus.shared.domain.model

import com.yourcoach.plus.shared.data.database.BodymakingFoodDatabase
import com.yourcoach.plus.shared.data.database.FoodId
import kotlinx.serialization.Serializable

/**
 * 指示書データ
 * AI分析の結果から生成される翌日の具体的な行動目標
 */
@Serializable
data class Directive(
    val id: String = "",
    val userId: String,
    val date: String,              // 実行予定日 YYYY-MM-DD
    val message: String,           // 箇条書き形式（\nで区切り）
    val type: DirectiveType = DirectiveType.MEAL,  // meal, exercise, condition
    val completed: Boolean = false,
    val deadline: String? = null,  // ISO 8601 datetime
    val createdAt: Long = 0,
    val executedItems: List<Int> = emptyList()  // 完了したアイテムのindex（永続化用）
) {
    /**
     * メッセージを箇条書きリストに変換
     */
    fun getMessageLines(): List<String> {
        return message
            .split("\n")
            .map { it.trim() }
            .filter { it.isNotEmpty() }
            .map { if (it.startsWith("-")) it.substring(1).trim() else it }
    }

    /**
     * アクション可能なアイテムを抽出
     */
    fun getActionItems(): List<DirectiveActionItem> {
        return getMessageLines().mapIndexed { index, line ->
            DirectiveActionItem.parse(index, line)
        }
    }
}

/**
 * 指示書の実行可能アイテム
 */
@Serializable
data class DirectiveActionItem(
    val index: Int,
    val originalText: String,
    val actionType: DirectiveActionType,
    val itemName: String?,          // 食品名・運動名（表示用・後方互換性）
    val foodId: String? = null,     // BodymakingFood ID（ID参照用）
    val amount: Float?,             // 量
    val unit: String?,              // 単位（g, 回, 分 等）
    val isExecuted: Boolean = false
) {
    /**
     * 食品IDを取得（foodIdがあればそれを、なければitemNameからマッチング）
     */
    fun resolveFoodId(): String? {
        if (foodId != null) return foodId
        if (itemName == null || actionType != DirectiveActionType.MEAL) return null
        return matchFoodId(itemName)
    }

    companion object {
        /**
         * 食品名からBodymakingFood IDにマッチング
         */
        private fun matchFoodId(name: String): String? {
            // 完全一致
            BodymakingFoodDatabase.allFoods.find {
                it.displayName == name
            }?.let { return it.id }

            // 部分一致
            BodymakingFoodDatabase.allFoods.find {
                it.displayName.contains(name) || name.contains(it.displayName)
            }?.let { return it.id }

            // キーワードマッチング
            val keywordMap = mapOf(
                "鶏" to FoodId.CHICKEN_BREAST,
                "むね" to FoodId.CHICKEN_BREAST,
                "卵" to FoodId.EGG_WHOLE,
                "たまご" to FoodId.EGG_WHOLE,
                "白米" to FoodId.WHITE_RICE,
                "ごはん" to FoodId.WHITE_RICE,
                "ご飯" to FoodId.WHITE_RICE,
                "玄米" to FoodId.BROWN_RICE,
                "餅" to FoodId.MOCHI,
                "もち" to FoodId.MOCHI,
                "牛" to FoodId.BEEF_LEAN,
                "ビーフ" to FoodId.BEEF_LEAN,
                "サバ" to FoodId.SABA,
                "さば" to FoodId.SABA,
                "鮭" to FoodId.SALMON,
                "サーモン" to FoodId.SALMON,
                "ブロッコリー" to FoodId.BROCCOLI,
                "プロテイン" to FoodId.WHEY_PROTEIN,
                "ホエイ" to FoodId.WHEY_PROTEIN,
                "塩" to FoodId.PINK_SALT,
                "ソルト" to FoodId.PINK_SALT
            )

            for ((keyword, id) in keywordMap) {
                if (name.contains(keyword)) return id
            }

            return null
        }

        /**
         * テキストからアクションアイテムをパース（簡素化版）
         *
         * 新形式（food_id方式）では、AnalysisViewModelのextractAndSaveDirectiveFromJsonで
         * 既にfood_idが解決されて表示名に変換されているため、
         * このparse()は主にテキスト表示と後方互換性のために使用される。
         *
         * 例: "【食事1】P30g F10g C50g 鶏むね肉 150g + 白米 200g"
         * 例: "【運動】ベンチプレス 10回×3セット"
         * 例: "【睡眠】7時間確保"
         */
        fun parse(index: Int, text: String): DirectiveActionItem {
            // 【ラベル】プレフィックスを除去
            val cleanText = text.replace(Regex("^【[^】]+】\\s*"), "").trim()

            // ラベルからタイプを判定
            val actionType = when {
                text.contains("食事") -> DirectiveActionType.MEAL
                text.contains("運動") -> DirectiveActionType.EXERCISE
                text.contains("睡眠") || text.contains("コンディション") -> DirectiveActionType.CONDITION
                else -> DirectiveActionType.ADVICE
            }

            // 食事の場合: 表示名からfoodIdを逆引き（後方互換性）
            val foodId = if (actionType == DirectiveActionType.MEAL) {
                matchFoodId(cleanText)
            } else null

            // シンプルに量を抽出（最初に見つかった数値+単位）
            val amountMatch = Regex("(\\d+)\\s*(g|個|杯|回|セット|時間)").find(cleanText)

            return DirectiveActionItem(
                index = index,
                originalText = text,
                actionType = actionType,
                itemName = cleanText,
                foodId = foodId,
                amount = amountMatch?.groupValues?.get(1)?.toFloatOrNull(),
                unit = amountMatch?.groupValues?.get(2)
            )
        }
    }
}

/**
 * 指示書アクションタイプ
 */
@Serializable
enum class DirectiveActionType {
    MEAL,       // 食事記録
    EXERCISE,   // 運動記録
    CONDITION,  // コンディション記録
    ADVICE      // 一般的なアドバイス（実行不可）
}

/**
 * 指示書タイプ
 */
@Serializable
enum class DirectiveType {
    MEAL,       // 食事関連
    EXERCISE,   // 運動関連
    CONDITION   // コンディション関連
}

/**
 * 指示書の生成パラメータ
 */
data class DirectiveGenerationParams(
    val analysisResult: String,     // AI分析結果テキスト
    val userGoal: String,           // ユーザー目標
    val currentDate: String,        // 現在の日付
    val targetDate: String          // 指示書の実行日
)
