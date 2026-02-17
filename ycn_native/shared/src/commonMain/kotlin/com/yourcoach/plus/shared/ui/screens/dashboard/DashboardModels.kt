package com.yourcoach.plus.shared.ui.screens.dashboard

import com.yourcoach.plus.shared.domain.model.CustomQuestItem
import com.yourcoach.plus.shared.domain.model.DirectiveActionItem
import com.yourcoach.plus.shared.domain.model.Meal
import com.yourcoach.plus.shared.domain.model.Workout

/**
 * 統合タイムラインアイテム（Pro Cockpit用）
 * 食事スロット（クエスト）、実際の食事記録、運動記録を統合
 */
data class UnifiedTimelineItem(
    val id: String,
    val type: TimelineItemType,
    val timeMinutes: Int,              // 0:00からの分数
    val timeString: String,            // "17:30"
    val title: String,                 // "食事1" or "背中トレ"
    val subtitle: String?,             // "鶏むね肉（皮なし）+ 白米"
    val status: TimelineItemStatus,    // COMPLETED, CURRENT, UPCOMING
    val isTrainingRelated: Boolean = false,
    val actionItems: List<DirectiveActionItem>? = null, // クエストの場合
    val linkedMeal: Meal? = null,      // 実際の食事記録（記録済みの場合）
    val linkedWorkout: Workout? = null, // 実際の運動記録（記録済みの場合）
    val slotInfo: TimelineSlotInfo? = null, // 元のスロット情報
    val directiveItemIndex: Int? = null, // 指示書アイテムのインデックス（完了トグル用）
    val isCustomQuest: Boolean = false,     // カスタムクエスト（ゴールド枠表示用）
    val customQuestSlotKey: String? = null, // カスタムクエストのスロットキー
    val customQuestItems: List<CustomQuestItem>? = null // カスタムクエストのアイテム
) {
    val isRecorded: Boolean get() = linkedMeal != null || linkedWorkout != null
    val isQuest: Boolean get() = (slotInfo != null || isCustomQuest) && !isRecorded
}

enum class TimelineItemType { MEAL, WORKOUT, CONDITION }
enum class TimelineItemStatus { COMPLETED, CURRENT, UPCOMING }

/**
 * Micro+インジケーター（Pro Cockpit HUDヘッダー用）
 */
data class MicroIndicator(
    val type: MicroIndicatorType,
    val score: Float,                  // 0.0 - 1.0
    val status: IndicatorStatus,       // GOOD, WARNING, ALERT
    val label: String                  // "0.98", "⚠️" など
)

enum class MicroIndicatorType { DIAAS, FATTY_ACID, FIBER, VITAMIN_MINERAL }
enum class IndicatorStatus { GOOD, WARNING, ALERT }

/**
 * タイムラインスロット情報（計算済み時刻付き）
 */
data class TimelineSlotInfo(
    val slotNumber: Int,
    val displayName: String,
    val timeMinutes: Int,  // 0:00からの分数
    val timeString: String,  // "07:30"形式
    val isTrainingRelated: Boolean,  // トレ前後か
    val isCompleted: Boolean = false,  // 該当食事が記録済みか
    val relativeTimeLabel: String? = null,  // "起床+30分"などの表示用
    val foodExamples: List<String> = emptyList()  // コスト帯に応じた食品例
)

/**
 * お祝い情報
 */
data class CelebrationInfo(
    val type: CelebrationInfoType,
    val level: Int? = null,
    val credits: Int? = null,
    val badgeId: String? = null,
    val badgeName: String? = null
)

enum class CelebrationInfoType {
    LEVEL_UP,
    BADGE_EARNED
}

/**
 * 運動クエスト完了シート用の種目データ
 * 統一カロリー計算式: (volume × 0.05) + (duration × 3)
 */
data class WorkoutCompletionExercise(
    val name: String,
    val category: String,
    val sets: Int,
    val reps: Int,
    val weight: Float?,
    val isWeightEstimated: Boolean = false,
    val rmPercentMin: Float? = null,
    val rmPercentMax: Float? = null
) {
    val duration: Int get() = sets * 5
    val volume: Float get() = sets * reps * (weight ?: 0f)
    val calories: Int get() {
        return if (weight != null && weight > 0f) {
            // MetCalorieCalculator準拠: volumeBonus(0.02) + base(3kcal/分)
            ((volume * 0.02f) + (duration * 3f)).toInt().coerceAtLeast(0)
        } else {
            // 重量不明時: 筋トレMETベース概算 (~4kcal/分)
            (duration * 4).coerceAtLeast(0)
        }
    }
}

/**
 * GL評価
 */
enum class GlRating {
    LOW,              // 低GL (優秀)
    MEDIUM,           // 中GL (適正)
    HIGH_RECOMMENDED, // 高GL推奨 (運動後)
    HIGH              // 高GL (分割推奨)
}

/**
 * GL評価を取得（PFC混食による血糖上昇緩和を考慮）
 * タンパク質・脂質・食物繊維が同一食事内にあると血糖上昇が緩やかになる
 */
fun getGlRating(gl: Float, limit: Float, isPostWorkout: Boolean,
                protein: Float = 0f, fat: Float = 0f, fiber: Float = 0f): GlRating {
    // PFC補正: 混食による血糖上昇緩和
    val proteinReduction = kotlin.math.min(10f, (protein / 20f) * 10f)
    val fatReduction = kotlin.math.min(5f, (fat / 10f) * 5f)
    val fiberReduction = kotlin.math.min(10f, (fiber / 10f) * 10f)
    val totalReduction = proteinReduction + fatReduction + fiberReduction
    val adjustedGL = gl * (1f - totalReduction / 100f)

    val lowThreshold = limit * 0.5f
    val mediumThreshold = limit * 0.8f

    return when {
        adjustedGL <= lowThreshold -> GlRating.LOW
        adjustedGL <= mediumThreshold -> GlRating.MEDIUM
        isPostWorkout -> GlRating.HIGH_RECOMMENDED
        else -> GlRating.HIGH
    }
}
