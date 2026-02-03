package com.yourcoach.plus.shared.domain.model

import kotlinx.serialization.Serializable

/**
 * 食事の調達スタイル（Kitchen/Store 2択）
 * トレ後プロテインはtrainingAfterMeal設定時に自動挿入されるため、選択肢には含めない
 */
@Serializable
enum class FoodChoice(val displayName: String, val description: String) {
    KITCHEN("自炊", "鶏むね肉+白米など。スーパーで食材を買って調理"),
    STORE("中食・外食", "サラダチキン+おにぎりなど。コンビニ・惣菜・外食")
}

/**
 * 食事スロット設定
 * 食事1、食事2...のように食事回数に基づく
 */
@Serializable
data class MealSlot(
    val slotNumber: Int,                  // 食事番号（1, 2, 3...）
    val mode: SlotMode = SlotMode.AI,
    val templateId: String? = null,       // 固定モード時のテンプレートID
    val templateName: String? = null,     // 表示用テンプレート名
    val routineLinked: Boolean = false,   // ルーティン（トレーニング部位）と連動するか
    // タイムライン設定
    val relativeTime: String? = null,     // 相対時刻（例: "wake+30", "training-120", "sleep-120"）
    val absoluteTime: String? = null,     // 絶対時刻（例: "12:00"）- relativeTimeより優先度低
    val defaultFoodChoice: FoodChoice = FoodChoice.KITCHEN  // デフォルトのA/B/C択
) {
    /**
     * 表示名を取得（食事1、食事2...）
     */
    fun getDisplayName(): String = "食事$slotNumber"

    /**
     * 相対時刻から実際の時刻を計算
     * @param wakeUpMinutes 起床時刻（0:00からの分数）
     * @param trainingMinutes トレーニング時刻（0:00からの分数）
     * @param sleepMinutes 就寝時刻（0:00からの分数）
     * @return 実際の時刻（0:00からの分数）、計算不可の場合null
     */
    fun calculateActualTime(wakeUpMinutes: Int, trainingMinutes: Int?, sleepMinutes: Int): Int? {
        return calculateActualTimeWithPrevious(wakeUpMinutes, trainingMinutes, sleepMinutes, emptyMap())
    }

    /**
     * 相対時刻から実際の時刻を計算（前のスロットの時刻を参照可能）
     * @param wakeUpMinutes 起床時刻（0:00からの分数）
     * @param trainingMinutes トレーニング時刻（0:00からの分数）
     * @param sleepMinutes 就寝時刻（0:00からの分数）
     * @param previousSlotTimes 前のスロットの計算済み時刻 (slotNumber -> minutes)
     * @return 実際の時刻（0:00からの分数）、計算不可の場合null
     */
    fun calculateActualTimeWithPrevious(
        wakeUpMinutes: Int,
        trainingMinutes: Int?,
        sleepMinutes: Int,
        previousSlotTimes: Map<Int, Int>
    ): Int? {
        val relative = relativeTime ?: return absoluteTime?.let { parseTimeToMinutes(it) }

        return when {
            relative.startsWith("wake") -> {
                val offset = parseOffset(relative.removePrefix("wake"))
                wakeUpMinutes + offset
            }
            relative.startsWith("training") -> {
                val training = trainingMinutes ?: return null
                val offset = parseOffset(relative.removePrefix("training"))
                training + offset
            }
            relative.startsWith("sleep") -> {
                val offset = parseOffset(relative.removePrefix("sleep"))
                sleepMinutes + offset
            }
            relative.startsWith("meal") -> {
                // meal1+240 のような前の食事からの相対指定
                val mealPattern = Regex("""meal(\d+)([+-]\d+)?""")
                val match = mealPattern.matchEntire(relative) ?: return null
                val prevSlotNumber = match.groupValues[1].toIntOrNull() ?: return null
                val offset = match.groupValues[2].let { parseOffset(it) }
                val prevTime = previousSlotTimes[prevSlotNumber] ?: return null
                prevTime + offset
            }
            else -> null
        }
    }

    private fun parseOffset(offsetStr: String): Int {
        if (offsetStr.isBlank()) return 0
        val sign = if (offsetStr.startsWith("-")) -1 else 1
        val value = offsetStr.removePrefix("+").removePrefix("-").toIntOrNull() ?: 0
        return sign * value
    }

    private fun parseTimeToMinutes(time: String): Int? {
        val parts = time.split(":")
        if (parts.size != 2) return null
        val hours = parts[0].toIntOrNull() ?: return null
        val minutes = parts[1].toIntOrNull() ?: return null
        return hours * 60 + minutes
    }

    /**
     * 分数を時刻文字列に変換
     */
    companion object {
        fun minutesToTimeString(minutes: Int): String {
            val normalizedMinutes = ((minutes % 1440) + 1440) % 1440 // 0-1439に正規化
            val h = normalizedMinutes / 60
            val m = normalizedMinutes % 60
            return "${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}"
        }
    }
}

/**
 * スロットモード
 */
@Serializable
enum class SlotMode(val displayName: String) {
    FIXED("固定"),           // テンプレートを使用
    AI("AI提案"),            // AIが生成
    ROUTINE_LINKED("ルーティン連動")  // トレーニング部位に応じて変更
}

/**
 * ユーザーの食事スロット設定全体
 */
@Serializable
data class MealSlotConfig(
    val slots: List<MealSlot> = emptyList(),
    val mealsPerDay: Int = 5              // 1日の食事回数
) {
    /**
     * 全スロットの実際の時刻を計算
     * meal相対時刻を解決するため、順番に計算する
     */
    fun calculateAllSlotTimes(
        wakeUpMinutes: Int,
        trainingMinutes: Int?,
        sleepMinutes: Int
    ): Map<Int, Int> {
        val result = mutableMapOf<Int, Int>()

        for (slot in slots.sortedBy { it.slotNumber }) {
            val time = slot.calculateActualTimeWithPrevious(
                wakeUpMinutes = wakeUpMinutes,
                trainingMinutes = trainingMinutes,
                sleepMinutes = sleepMinutes,
                previousSlotTimes = result
            )
            if (time != null) {
                result[slot.slotNumber] = time
            }
        }

        return result
    }

    companion object {
        /**
         * 食事回数に基づいてデフォルトスロットを生成
         */
        fun createDefault(mealsPerDay: Int): MealSlotConfig {
            val slots = (1..mealsPerDay).map { num ->
                MealSlot(slotNumber = num, mode = SlotMode.AI)
            }
            return MealSlotConfig(slots = slots, mealsPerDay = mealsPerDay)
        }

        /**
         * タイムライン型ルーティンを生成
         * @param mealsPerDay 食事回数
         * @param trainingAfterMeal 何食目の後にトレーニングするか（null=トレーニングなし）
         */
        fun createTimelineRoutine(mealsPerDay: Int, trainingAfterMeal: Int?): MealSlotConfig {
            val slots = (1..mealsPerDay).map { num ->
                // 全スロットKITCHENがデフォルト（トレ後プロテインはAI分析で自動挿入）
                val relativeTime = when {
                    // 食事1: 起床時刻
                    num == 1 -> "wake+0"

                    // トレ前食事: トレ2時間前
                    trainingAfterMeal != null && num == trainingAfterMeal -> "training-120"

                    // トレ後食事: トレ直後
                    trainingAfterMeal != null && num == trainingAfterMeal + 1 -> "training+0"

                    // トレ後1時間後の食事
                    trainingAfterMeal != null && num == trainingAfterMeal + 2 -> "meal${num - 1}+60"

                    // その他: 前の食事から3時間後
                    else -> "meal${num - 1}+180"
                }
                val foodChoice = FoodChoice.KITCHEN

                MealSlot(
                    slotNumber = num,
                    mode = SlotMode.AI,
                    relativeTime = relativeTime,
                    defaultFoodChoice = foodChoice
                )
            }
            return MealSlotConfig(slots = slots, mealsPerDay = mealsPerDay)
        }
    }

    /**
     * 固定スロットのみ取得
     */
    fun getFixedSlots(): List<MealSlot> = slots.filter { it.mode == SlotMode.FIXED }

    /**
     * AI生成スロットのみ取得
     */
    fun getAiSlots(): List<MealSlot> = slots.filter { it.mode == SlotMode.AI }

    /**
     * ルーティン連動スロットのみ取得
     */
    fun getRoutineLinkedSlots(): List<MealSlot> = slots.filter { it.mode == SlotMode.ROUTINE_LINKED }

    /**
     * 特定番号のスロットを取得
     */
    fun getSlot(slotNumber: Int): MealSlot? = slots.find { it.slotNumber == slotNumber }

    /**
     * スロットを更新
     */
    fun updateSlot(slotNumber: Int, mode: SlotMode, templateId: String? = null, templateName: String? = null): MealSlotConfig {
        val newSlots = slots.map { slot ->
            if (slot.slotNumber == slotNumber) {
                slot.copy(
                    mode = mode,
                    templateId = if (mode == SlotMode.FIXED) templateId else null,
                    templateName = if (mode == SlotMode.FIXED) templateName else null,
                    routineLinked = mode == SlotMode.ROUTINE_LINKED
                )
            } else {
                slot
            }
        }
        return copy(slots = newSlots)
    }

    /**
     * 食事回数を変更
     */
    fun updateMealsPerDay(newCount: Int): MealSlotConfig {
        if (newCount == mealsPerDay) return this

        val newSlots = (1..newCount).map { num ->
            // 既存のスロット設定を保持
            slots.find { it.slotNumber == num } ?: MealSlot(slotNumber = num, mode = SlotMode.AI)
        }
        return copy(slots = newSlots, mealsPerDay = newCount)
    }
}

/**
 * 運動スロット設定
 */
@Serializable
data class WorkoutSlot(
    val mode: SlotMode = SlotMode.AI,
    val templateId: String? = null,       // 固定モード時のテンプレートID
    val templateName: String? = null,     // 表示用テンプレート名
    val routineLinked: Boolean = false    // ルーティン（トレーニング部位）と連動するか
)

/**
 * 運動スロット設定全体
 */
@Serializable
data class WorkoutSlotConfig(
    val slot: WorkoutSlot = WorkoutSlot(mode = SlotMode.AI)
) {
    /**
     * スロットを更新
     */
    fun updateSlot(mode: SlotMode, templateId: String? = null, templateName: String? = null): WorkoutSlotConfig {
        return copy(
            slot = slot.copy(
                mode = mode,
                templateId = if (mode == SlotMode.FIXED) templateId else null,
                templateName = if (mode == SlotMode.FIXED) templateName else null,
                routineLinked = mode == SlotMode.ROUTINE_LINKED
            )
        )
    }
}

/**
 * ルーティン別テンプレート設定
 * 例: 「胸の日」→「食事3: バナナ+プロテイン」「運動: 胸トレテンプレート」
 */
@Serializable
data class RoutineTemplateMapping(
    val routineId: String,           // ルーティンID（胸の日、背中の日など）
    val routineName: String,         // 表示名
    val slotNumber: Int,             // 食事スロット番号（0=運動）
    val templateId: String,          // 使用するテンプレートID
    val templateName: String         // 表示用テンプレート名
) {
    companion object {
        const val WORKOUT_SLOT = 0   // 運動スロットを示す特別な番号
    }
}

/**
 * ルーティン別テンプレート設定全体
 */
@Serializable
data class RoutineTemplateConfig(
    val mappings: List<RoutineTemplateMapping> = emptyList()
) {
    /**
     * 特定ルーティン・スロット番号のテンプレートIDを取得
     */
    fun getTemplateId(routineId: String, slotNumber: Int): String? =
        mappings.find { it.routineId == routineId && it.slotNumber == slotNumber }?.templateId

    /**
     * 特定ルーティンの運動テンプレートIDを取得
     */
    fun getWorkoutTemplateId(routineId: String): String? =
        getTemplateId(routineId, RoutineTemplateMapping.WORKOUT_SLOT)

    /**
     * 特定ルーティンのマッピングを取得
     */
    fun getMappingsForRoutine(routineId: String): List<RoutineTemplateMapping> =
        mappings.filter { it.routineId == routineId }

    /**
     * 特定ルーティンの食事マッピングを取得（運動以外）
     */
    fun getMealMappingsForRoutine(routineId: String): List<RoutineTemplateMapping> =
        mappings.filter { it.routineId == routineId && it.slotNumber != RoutineTemplateMapping.WORKOUT_SLOT }

    /**
     * 特定ルーティンの運動マッピングを取得
     */
    fun getWorkoutMappingForRoutine(routineId: String): RoutineTemplateMapping? =
        mappings.find { it.routineId == routineId && it.slotNumber == RoutineTemplateMapping.WORKOUT_SLOT }

    /**
     * マッピングを追加・更新
     */
    fun setMapping(
        routineId: String,
        routineName: String,
        slotNumber: Int,
        templateId: String,
        templateName: String
    ): RoutineTemplateConfig {
        val existing = mappings.find { it.routineId == routineId && it.slotNumber == slotNumber }
        val newMappings = if (existing != null) {
            mappings.map {
                if (it.routineId == routineId && it.slotNumber == slotNumber) {
                    it.copy(templateId = templateId, templateName = templateName)
                } else it
            }
        } else {
            mappings + RoutineTemplateMapping(routineId, routineName, slotNumber, templateId, templateName)
        }
        return copy(mappings = newMappings)
    }

    /**
     * マッピングを削除
     */
    fun removeMapping(routineId: String, slotNumber: Int): RoutineTemplateConfig {
        return copy(mappings = mappings.filter { !(it.routineId == routineId && it.slotNumber == slotNumber) })
    }
}

// 後方互換性のためのエイリアス（旧MealTiming使用箇所があれば）
@Serializable
enum class MealTiming(val displayName: String, val order: Int) {
    MEAL_1("食事1", 1),
    MEAL_2("食事2", 2),
    MEAL_3("食事3", 3),
    MEAL_4("食事4", 4),
    MEAL_5("食事5", 5),
    MEAL_6("食事6", 6),
    MEAL_7("食事7", 7),
    MEAL_8("食事8", 8),
    MEAL_9("食事9", 9),
    MEAL_10("食事10", 10)
}
