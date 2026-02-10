package com.yourcoach.plus.shared.ui.screens.dashboard

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
    val directiveItemIndex: Int? = null // 指示書アイテムのインデックス（完了トグル用）
) {
    val isRecorded: Boolean get() = linkedMeal != null || linkedWorkout != null
    val isQuest: Boolean get() = slotInfo != null && !isRecorded
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
 * GL評価
 */
enum class GlRating {
    LOW,              // 低GL (優秀)
    MEDIUM,           // 中GL (適正)
    HIGH_RECOMMENDED, // 高GL推奨 (運動後)
    HIGH              // 高GL (分割推奨)
}

/**
 * GL評価を取得
 */
fun getGlRating(gl: Float, limit: Float, isPostWorkout: Boolean): GlRating {
    val lowThreshold = limit * 0.5f
    val mediumThreshold = limit * 0.8f

    return when {
        gl <= lowThreshold -> GlRating.LOW
        gl <= mediumThreshold -> GlRating.MEDIUM
        isPostWorkout -> GlRating.HIGH_RECOMMENDED
        else -> GlRating.HIGH
    }
}
