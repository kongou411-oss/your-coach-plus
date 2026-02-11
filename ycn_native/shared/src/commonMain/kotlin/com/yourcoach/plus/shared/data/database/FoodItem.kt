package com.yourcoach.plus.shared.data.database

import kotlinx.serialization.Serializable

/**
 * 食品データ（日本食品標準成分表 八訂準拠）
 * 100gあたりの栄養素
 */
@Serializable
data class FoodItem(
    val name: String,
    val category: String,
    val subcategory: String? = null,

    // 基本栄養素
    val calories: Float,          // kcal
    val protein: Float,           // g
    val fat: Float,               // g
    val carbs: Float,             // g
    val fiber: Float = 0f,        // g（総食物繊維）
    val solubleFiber: Float = 0f, // g（水溶性食物繊維）
    val insolubleFiber: Float = 0f, // g（不溶性食物繊維）
    val sugar: Float = 0f,        // g（糖質）

    // GI値（グリセミック指数）
    val gi: Int? = null,          // GI値（0-100）

    // タンパク質品質
    val aminoAcidScore: Int = 100,
    val pdcaas: Float = 1.0f,
    val diaas: Float = 1.0f,
    val dit: Float = 0f,          // 食事誘発性熱産生

    // 脂肪酸
    val saturatedFat: Float = 0f,
    val monounsaturatedFat: Float = 0f,
    val polyunsaturatedFat: Float = 0f,

    // ビタミン
    val vitaminA: Float = 0f,     // μgRAE
    val vitaminB1: Float = 0f,    // mg
    val vitaminB2: Float = 0f,    // mg
    val vitaminB6: Float = 0f,    // mg
    val vitaminB12: Float = 0f,   // μg
    val vitaminC: Float = 0f,     // mg
    val vitaminD: Float = 0f,     // μg
    val vitaminE: Float = 0f,     // mg
    val vitaminK: Float = 0f,     // μg
    val niacin: Float = 0f,       // mg
    val pantothenicAcid: Float = 0f, // mg
    val biotin: Float = 0f,       // μg
    val folicAcid: Float = 0f,    // μg

    // ミネラル（全13種類）
    val sodium: Float = 0f,       // mg
    val potassium: Float = 0f,    // mg
    val calcium: Float = 0f,      // mg
    val magnesium: Float = 0f,    // mg
    val phosphorus: Float = 0f,   // mg
    val iron: Float = 0f,         // mg
    val zinc: Float = 0f,         // mg
    val copper: Float = 0f,       // mg
    val manganese: Float = 0f,    // mg
    val iodine: Float = 0f,       // μg
    val selenium: Float = 0f,     // μg
    val chromium: Float = 0f,     // μg
    val molybdenum: Float = 0f,   // μg

    // その他
    val creatine: Float = 0f,     // mg
    val lCarnitine: Float = 0f,   // mg
    val caffeine: Float = 0f,     // mg（カフェイン）
    val cost: Int = 1,            // コスト指標（1-3）
    val unit: String = "g",       // 単位
    val servingSizes: Map<String, Float> = emptyMap()  // 単位→グラム換算 (例: "個" to 58f)
) {
    /**
     * 指定された量と単位をグラムに換算
     * "g"の場合はそのまま、それ以外はservingSizesで変換
     */
    fun toGrams(amount: Float, selectedUnit: String): Float {
        if (selectedUnit == "g") return amount
        val gramsPerUnit = servingSizes[selectedUnit] ?: return amount
        return amount * gramsPerUnit
    }

    /**
     * 使用可能な単位リスト（"g" + servingSizesのキー）
     */
    fun getAvailableUnits(): List<String> {
        if (servingSizes.isEmpty()) return listOf("g")
        return listOf("g") + servingSizes.keys.toList()
    }

    /**
     * デフォルト単位を取得（servingSizesがあればその最初のキー、なければ"g"）
     */
    fun getDefaultUnit(): String {
        return if (servingSizes.isNotEmpty()) servingSizes.keys.first() else "g"
    }

    /**
     * デフォルト量を取得（"g"なら100、それ以外なら1）
     */
    fun getDefaultAmount(selectedUnit: String): Float {
        return if (selectedUnit == "g") 100f else 1f
    }
}

/**
 * 食品カテゴリ
 */
enum class FoodCategory(val displayName: String) {
    MEAT("肉類"),
    FISH("魚介類"),
    EGG("卵類"),
    DAIRY("乳製品"),
    BEAN("豆類"),
    VEGETABLE("野菜類"),
    FRUIT("果物類"),
    GRAIN("穀類"),
    NUT("ナッツ・種実類"),
    OIL("油脂類"),
    SEASONING("調味料"),
    BEVERAGE("飲料"),
    SWEET("菓子類"),
    PREPARED("調理済み食品"),
    OTHER("その他")
}
