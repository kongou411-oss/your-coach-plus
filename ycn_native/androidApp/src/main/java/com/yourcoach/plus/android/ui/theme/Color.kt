package com.yourcoach.plus.android.ui.theme

import androidx.compose.ui.graphics.Color

/**
 * YourCoach+ カラーパレット
 * Sky Blue (#4A9EFF) をメインカラーに、明るく爽やかな配色
 */

// Primary - Sky Blue (Feature Color)
val Primary = Color(0xFF4A9EFF)           // sky-500
val PrimaryDark = Color(0xFF2B7FE0)       // sky-600
val PrimaryLight = Color(0xFF7BBAFF)      // sky-400
val PrimaryContainer = Color(0xFFD6E9FF)  // sky-100
val OnPrimary = Color.White
val OnPrimaryContainer = Color(0xFF001B3D)

// Secondary - Duolingo Blue
val Secondary = Color(0xFF1CB0F6)
val SecondaryDark = Color(0xFF1899D6)
val SecondaryLight = Color(0xFF58C8FF)
val SecondaryContainer = Color(0xFFCCE5FF)
val OnSecondary = Color.White
val OnSecondaryContainer = Color(0xFF001E2E)

// Tertiary - Purple accent
val Tertiary = Color(0xFFCE82FF)
val TertiaryDark = Color(0xFFAE52FF)
val TertiaryLight = Color(0xFFE5B8FF)
val TertiaryContainer = Color(0xFFF2E7FE)
val OnTertiary = Color.White
val OnTertiaryContainer = Color(0xFF2B0052)

// Accent Colors
val AccentOrange = Color(0xFFFF9600)
val AccentRed = Color(0xFFFF4B4B)
val AccentYellow = Color(0xFFFFC800)
val AccentPink = Color(0xFFFF86D0)
val AccentGreen = Color(0xFF58CC02) // Same as Primary for consistency

// Score Colors (for 10-axis chart) - 元プロジェクト準拠
val ScoreCalories = Color(0xFF4A9EFF)     // sky-500 - カロリー（青）
val ScoreProtein = Color(0xFFFF9600)      // オレンジ - タンパク質
val ScoreCarbs = Color(0xFF58CC02)        // 緑 - 炭水化物
val ScoreFat = Color(0xFFFFC800)          // 黄 - 脂質
val ScoreOver = Color(0xFFEF4444)         // 赤 - 目標超過時
val ScoreFiber = Color(0xFF58CC02)        // 緑 - 食物繊維
val ScoreDIAAS = Color(0xFF00BCD4)        // シアン - DIAAS
val ScoreFattyAcid = Color(0xFF8BC34A)    // ライム - 脂肪酸バランス
val ScoreGL = Color(0xFFE91E63)           // ピンク - GL
val ScoreVitamin = Color(0xFFFFEB3B)      // 明黄 - ビタミン
val ScoreMineral = Color(0xFF607D8B)      // グレーブルー - ミネラル
val ScoreExercise = Color(0xFFFF86D0)     // ピンク - 運動
val ScoreSleep = Color(0xFF9B59B6)        // 深紫 - 睡眠
val ScoreCondition = Color(0xFF3F51B5)    // インディゴ - コンディション
val ScoreWater = Color(0xFF1CB0F6)        // 青 - 水分（レガシー）

// Streak Colors
val StreakFlame = Color(0xFFFF9600)
val StreakFlameDark = Color(0xFFE67E00)

// XP Colors
val XpGold = Color(0xFFFFC800)
val XpGoldDark = Color(0xFFE5B200)

// Neutral Colors
val Background = Color(0xFFFFFFFF)
val Surface = Color(0xFFF7F7F7)
val SurfaceVariant = Color(0xFFE5E5E5)
val OnBackground = Color(0xFF3C3C3C)
val OnSurface = Color(0xFF3C3C3C)
val OnSurfaceVariant = Color(0xFF777777)

// Dark Theme Colors
val BackgroundDark = Color(0xFF1A1A1A)
val SurfaceDark = Color(0xFF2C2C2C)
val SurfaceVariantDark = Color(0xFF3C3C3C)
val OnBackgroundDark = Color(0xFFE5E5E5)
val OnSurfaceDark = Color(0xFFE5E5E5)
val OnSurfaceVariantDark = Color(0xFFAFAFAF)

// Error Colors
val Error = Color(0xFFFF4B4B)
val ErrorContainer = Color(0xFFFFDAD6)
val OnError = Color.White
val OnErrorContainer = Color(0xFF410002)

// Outline
val Outline = Color(0xFFE5E5E5)
val OutlineDark = Color(0xFF3C3C3C)
