package com.yourcoach.plus.shared.domain.model

import kotlinx.serialization.Serializable

/**
 * カスタムクエスト（トレーナー指定メニュー）
 * users/{uid}/custom_quests/{date} に保存
 */
@Serializable
data class CustomQuest(
    val date: String,                          // YYYY-MM-DD
    val assignedBy: String,                    // トレーナーUID
    val isCustom: Boolean = true,              // trueならAI生成をブロック
    val slots: Map<String, CustomQuestSlot>,   // "breakfast", "lunch", "dinner", "snack", "workout" など
    val createdAt: Long = 0
)

/**
 * カスタムクエストのスロット（食事タイミング or 運動）
 */
@Serializable
data class CustomQuestSlot(
    val templateId: String? = null,            // 元テンプレートID
    val title: String,                         // 表示名: "【減量】定番の朝食セット"
    val type: CustomQuestSlotType,             // MEAL or WORKOUT
    val items: List<CustomQuestItem>,          // 食品 or 運動アイテム
    val totalMacros: CustomQuestMacros? = null // PFC合計（食事の場合）
)

/**
 * カスタムクエスト内の個別アイテム
 */
@Serializable
data class CustomQuestItem(
    val foodName: String,                      // 食品名 or 運動名（FoodDatabase/ExerciseDatabaseの名前）
    val amount: Float,                         // 量
    val unit: String,                          // "g", "個", "回", "セット", "分" etc.
    val calories: Float = 0f,                  // kcal（自動計算済み）
    val protein: Float = 0f,                   // g
    val fat: Float = 0f,                       // g
    val carbs: Float = 0f,                     // g
    // 食物繊維
    val fiber: Float = 0f,                     // 総食物繊維 (g)
    val solubleFiber: Float = 0f,              // 水溶性食物繊維 (g)
    val insolubleFiber: Float = 0f,            // 不溶性食物繊維 (g)
    val sugar: Float = 0f,                     // 糖質 (g)
    // 脂肪酸
    val saturatedFat: Float = 0f,              // 飽和脂肪酸 (g)
    val monounsaturatedFat: Float = 0f,        // 一価不飽和脂肪酸 (g)
    val polyunsaturatedFat: Float = 0f,        // 多価不飽和脂肪酸 (g)
    // タンパク質品質・GI（スケーリング対象外）
    val diaas: Float = 0f,                     // DIAAS スコア
    val gi: Int = 0,                           // グリセミック指数
    // ビタミン・ミネラル
    val vitamins: Map<String, Float> = emptyMap(),
    val minerals: Map<String, Float> = emptyMap()
)

/**
 * PFC合計値
 */
@Serializable
data class CustomQuestMacros(
    val protein: Float = 0f,                   // P (g)
    val fat: Float = 0f,                       // F (g)
    val carbs: Float = 0f,                     // C (g)
    val calories: Float = 0f,                  // Cal (kcal)
    val fiber: Float = 0f,                     // 総食物繊維 (g)
    val vitamins: Map<String, Float> = emptyMap(),
    val minerals: Map<String, Float> = emptyMap()
)

/**
 * スロットタイプ
 */
@Serializable
enum class CustomQuestSlotType {
    MEAL,       // 食事
    WORKOUT     // 運動
}

/**
 * クエストテンプレート（マスタデータ）
 * quest_templates コレクションに保存
 */
@Serializable
data class QuestTemplate(
    val templateId: String = "",
    val ownerId: String,                       // 作成者トレーナーUID
    val title: String,                         // "【減量】定番の朝食セット"
    val type: CustomQuestSlotType,             // MEAL or WORKOUT
    val items: List<CustomQuestItem>,
    val totalMacros: CustomQuestMacros? = null,
    val isActive: Boolean = true,
    val createdAt: Long = 0
)
