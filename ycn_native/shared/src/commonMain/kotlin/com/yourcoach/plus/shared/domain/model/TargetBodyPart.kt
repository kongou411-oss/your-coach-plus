package com.yourcoach.plus.shared.domain.model

import kotlinx.serialization.Serializable

/**
 * トレーニング部位ID（Enum）
 *
 * 【設計思想】
 * - 文字列リテラルを排除し、型安全な部位管理を実現
 * - Cloud Function / Android / iOS で共通のIDを使用
 * - FoodRoleとの連携で自動的に最適な食材を選択
 *
 * 【FoodRole連携】
 * - LEGS, BACK → TANK（牛赤身肉）: 高強度日
 * - OFF, REST → MEDIC（魚）: 回復日
 * - CHEST, SHOULDERS, ARMS, ABS, CARDIO → INFANTRY（鶏むね肉）: 通常日
 */
@Serializable
enum class TargetBodyPart(
    val id: String,
    val displayNameJa: String,
    val isHighIntensity: Boolean = false,  // 高強度日（TANK食材推奨）
    val isRecoveryDay: Boolean = false     // 回復日（MEDIC食材推奨）
) {
    // 高強度日（TANK: 牛赤身肉推奨）
    LEGS("legs", "脚", isHighIntensity = true),
    BACK("back", "背中", isHighIntensity = true),
    LOWER_BODY("lower_body", "下半身", isHighIntensity = true),
    PULL("pull", "プル", isHighIntensity = true),  // 背中メイン
    BACK_BICEPS("back_biceps", "背中・二頭", isHighIntensity = true),

    // 回復日（MEDIC: 魚推奨）
    OFF("off", "オフ", isRecoveryDay = true),
    REST("rest", "休み", isRecoveryDay = true),

    // 通常日（INFANTRY: 鶏むね肉）
    CHEST("chest", "胸"),
    SHOULDERS("shoulders", "肩"),
    ARMS("arms", "腕"),
    ABS("abs", "腹筋"),
    ABS_CORE("abs_core", "腹筋・体幹"),
    CARDIO("cardio", "有酸素"),
    UPPER_BODY("upper_body", "上半身"),
    FULL_BODY("full_body", "全身"),
    PUSH("push", "プッシュ"),  // 胸・肩・三頭
    CHEST_TRICEPS("chest_triceps", "胸・三頭"),
    SHOULDERS_ARMS("shoulders_arms", "肩・腕");

    companion object {
        /**
         * IDから取得
         */
        fun fromId(id: String?): TargetBodyPart? {
            if (id == null) return null
            return entries.find { it.id == id.lowercase() }
        }

        /**
         * 日本語表示名から取得
         */
        fun fromDisplayName(displayName: String?): TargetBodyPart? {
            if (displayName == null) return null
            return entries.find { it.displayNameJa == displayName }
        }

        /**
         * IDまたは日本語表示名から取得（フレキシブル）
         */
        fun fromAny(value: String?): TargetBodyPart? {
            if (value == null) return null
            return fromId(value) ?: fromDisplayName(value)
        }

        /**
         * 高強度日の部位リスト
         */
        val highIntensityParts: List<TargetBodyPart>
            get() = entries.filter { it.isHighIntensity }

        /**
         * 回復日の部位リスト
         */
        val recoveryParts: List<TargetBodyPart>
            get() = entries.filter { it.isRecoveryDay }
    }
}
