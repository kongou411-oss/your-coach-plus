package com.yourcoach.plus.shared.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

/**
 * Your Coach+ シェイプ定義
 * Duolingo風の丸みを帯びたコーナー
 */
val YourCoachShapes = Shapes(
    // 小さいコンポーネント（チップ、小さいボタン）
    extraSmall = RoundedCornerShape(4.dp),

    // 小さめのコンポーネント（テキストフィールド、小さいカード）
    small = RoundedCornerShape(8.dp),

    // 中くらいのコンポーネント（カード、ダイアログ）
    medium = RoundedCornerShape(12.dp),

    // 大きめのコンポーネント（大きいカード、モーダル）
    large = RoundedCornerShape(16.dp),

    // 大きいコンポーネント（ボトムシート、フルスクリーンダイアログ）
    extraLarge = RoundedCornerShape(24.dp)
)

// カスタムシェイプ
val CircleShape = RoundedCornerShape(50)
val PillShape = RoundedCornerShape(50)
val TopRoundedShape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
val BottomRoundedShape = RoundedCornerShape(bottomStart = 24.dp, bottomEnd = 24.dp)
