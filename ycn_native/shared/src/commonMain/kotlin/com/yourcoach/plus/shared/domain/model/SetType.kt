package com.yourcoach.plus.shared.domain.model

import kotlinx.serialization.Serializable

/**
 * セット種別（Set Type）
 *
 * 【設計思想】
 * - アップとメインを明確に区別し、分析の精度を向上
 * - WARMUP: 準備運動（集計対象外）
 * - MAIN: 本番セット（MAX更新判定対象）
 * - DROP: ドロップセット（追い込み用、集計対象）
 * - FAILURE: 限界セット（アセンディング等で使用）
 *
 * 【分析での扱い】
 * - 総負荷量（Volume）計算: MAINとDROPのみ
 * - 推定1RM計算: MAINのみ
 * - 記録更新判定: MAINのみ
 */
@Serializable
enum class SetType(
    val id: String,
    val displayLabel: String,
    val shortLabel: String,
    val isCountedInVolume: Boolean,  // 総負荷量に含めるか
    val isCountedIn1RM: Boolean      // 1RM計算に含めるか
) {
    WARMUP(
        id = "warmup",
        displayLabel = "ウォームアップ",
        shortLabel = "W",
        isCountedInVolume = false,
        isCountedIn1RM = false
    ),
    MAIN(
        id = "main",
        displayLabel = "メインセット",
        shortLabel = "M",
        isCountedInVolume = true,
        isCountedIn1RM = true
    ),
    DROP(
        id = "drop",
        displayLabel = "ドロップセット",
        shortLabel = "D",
        isCountedInVolume = true,
        isCountedIn1RM = false
    ),
    FAILURE(
        id = "failure",
        displayLabel = "限界セット",
        shortLabel = "F",
        isCountedInVolume = true,
        isCountedIn1RM = true
    );

    companion object {
        fun fromId(id: String?): SetType? {
            if (id == null) return null
            return entries.find { it.id == id }
        }
    }
}
