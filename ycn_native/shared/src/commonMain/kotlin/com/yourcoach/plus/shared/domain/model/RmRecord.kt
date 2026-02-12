package com.yourcoach.plus.shared.domain.model

/**
 * RM記録（実測重量・回数をそのまま保存）
 * users/{uid}/rm_records/{recordId} に保存
 */
data class RmRecord(
    val id: String = "",
    val exerciseName: String,
    val category: String,
    val weight: Float,      // 実測重量 (kg)
    val reps: Int,          // 実測回数
    val timestamp: Long,
    val createdAt: Long
)
