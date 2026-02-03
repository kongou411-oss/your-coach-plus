package com.yourcoach.plus.shared.domain.model

import kotlinx.serialization.Serializable

/**
 * 運動セット（Exercise Set）
 *
 * 【設計思想】
 * - SetTypeによるウォームアップ/メインの明確な分離
 * - RPEはメインセットのみ（ウォームアップは追い込まないため不要）
 * - Smart Ramp-upによる自動ウォームアップ生成をサポート
 *
 * 【分析での扱い】
 * - 総負荷量（Volume）: MAIN + DROP + FAILUREのみ
 * - 推定1RM: MAIN + FAILUREのみ
 * - WARMUPは集計対象外
 */
@Serializable
data class ExerciseSet(
    val setNumber: Int,
    val type: SetType,
    val weight: Float,           // kg
    val reps: Int,
    val rpe: Int? = null,        // 7-10（メインセットのみ）
    val isCompleted: Boolean = false,
    val completedAt: Long? = null // 完了時のタイムスタンプ
) {
    /**
     * このセットの負荷量（Volume）を計算
     * WARMUPは0を返す
     */
    val volume: Float
        get() = if (type.isCountedInVolume) weight * reps else 0f

    /**
     * 推定1RMの計算対象かどうか
     */
    val isValidFor1RM: Boolean
        get() = type.isCountedIn1RM && reps in 1..12

    /**
     * Epley式による推定1RM
     * 1RM = weight × (1 + reps / 30)
     * 12rep以下のみ有効
     */
    val estimated1RM: Float?
        get() = if (isValidFor1RM && reps > 0) {
            weight * (1 + reps / 30f)
        } else null

    /**
     * RPEに基づく実効強度（%1RM推定）
     * RPE 10 = 100%, RPE 9 = 97%, RPE 8 = 94%, RPE 7 = 91%
     */
    val effectiveIntensity: Float?
        get() = rpe?.let { 0.91f + (it - 7) * 0.03f }

    companion object {
        /**
         * Smart Ramp-up: メイン重量からウォームアップセットを自動生成
         *
         * @param mainWeight メインセットの重量（kg）
         * @param startSetNumber 開始セット番号
         * @return ウォームアップセットのリスト（40%, 60%, 80%）
         */
        fun generateWarmupSets(mainWeight: Float, startSetNumber: Int = 1): List<ExerciseSet> {
            return listOf(
                ExerciseSet(
                    setNumber = startSetNumber,
                    type = SetType.WARMUP,
                    weight = (mainWeight * 0.4f).roundToNearestPlate(),
                    reps = 10
                ),
                ExerciseSet(
                    setNumber = startSetNumber + 1,
                    type = SetType.WARMUP,
                    weight = (mainWeight * 0.6f).roundToNearestPlate(),
                    reps = 5
                ),
                ExerciseSet(
                    setNumber = startSetNumber + 2,
                    type = SetType.WARMUP,
                    weight = (mainWeight * 0.8f).roundToNearestPlate(),
                    reps = 3
                )
            )
        }

        /**
         * 2.5kg刻みに丸める（ジムのプレート単位）
         */
        private fun Float.roundToNearestPlate(): Float {
            return (this / 2.5f).toInt() * 2.5f
        }
    }
}

/**
 * RPE（Rate of Perceived Exertion）の説明
 *
 * 【設計思想】
 * - enumにせず、Int（7-10）で管理
 * - UI表示用のラベルはここで定義
 */
object RpeDescriptions {
    val descriptions = mapOf(
        7 to "あと3回できた",
        8 to "あと2回できた",
        9 to "あと1回できた",
        10 to "限界（これ以上無理）"
    )

    val shortLabels = mapOf(
        7 to "余裕あり",
        8 to "ちょうど良い",
        9 to "キツい",
        10 to "限界"
    )

    fun getDescription(rpe: Int): String = descriptions[rpe] ?: ""
    fun getShortLabel(rpe: Int): String = shortLabels[rpe] ?: ""

    /**
     * RPEが有効な範囲かチェック
     */
    fun isValid(rpe: Int): Boolean = rpe in 7..10
}
