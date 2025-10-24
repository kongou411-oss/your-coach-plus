# -*- coding: utf-8 -*-
import re
import json

# foodDatabase.jsを読み込み
with open('foodDatabase.js', 'r', encoding='utf-8') as f:
    content = f.read()

# servingSizeを持つアイテムを100g基準に変換する
def convert_item_to_100g_base(match):
    item_name = match.group(1)
    item_data_str = match.group(2)

    # servingSizeとservingUnitを抽出
    serving_size_match = re.search(r'"servingSize":\s*(\d+)', item_data_str)
    serving_unit_match = re.search(r'"servingUnit":\s*"([^"]+)"', item_data_str)

    if not serving_size_match or not serving_unit_match:
        return match.group(0)  # servingSizeがない場合はそのまま

    serving_size = int(serving_size_match.group(1))
    serving_unit = serving_unit_match.group(1)

    # 100が基準の場合は変換不要
    if serving_size == 100:
        return match.group(0)

    # 栄養素を抽出して変換
    nutrients = ['calories', 'protein', 'fat', 'carbs', 'sugar', 'fiber', 'solubleFiber', 'insolubleFiber',
                 'vitaminA', 'vitaminB1', 'vitaminB2', 'vitaminB6', 'vitaminB12', 'vitaminC', 'vitaminD',
                 'vitaminE', 'vitaminK', 'niacin', 'pantothenicAcid', 'biotin', 'folicAcid',
                 'sodium', 'potassium', 'calcium', 'magnesium', 'phosphorus', 'iron', 'zinc',
                 'copper', 'manganese', 'iodine', 'selenium', 'chromium', 'molybdenum',
                 'caffeine', 'catechin', 'tannin', 'polyphenol', 'chlorogenicAcid',
                 'creatine', 'lArginine', 'lCarnitine', 'EPA', 'DHA', 'coQ10',
                 'lutein', 'astaxanthin', 'betaCarotene']

    # 変換比率: 100g / servingSize
    ratio = 100.0 / serving_size

    new_item_data = item_data_str

    # 各栄養素を変換
    for nutrient in nutrients:
        pattern = rf'"{nutrient}":\s*([\d.]+)'
        def replace_nutrient(m):
            old_value = float(m.group(1))
            new_value = old_value * ratio
            # 小数点以下の桁数を調整（元の値に応じて）
            if new_value >= 10:
                new_value = round(new_value, 1)
            elif new_value >= 1:
                new_value = round(new_value, 2)
            else:
                new_value = round(new_value, 3)
            return f'"{nutrient}": {new_value}'

        new_item_data = re.sub(pattern, replace_nutrient, new_item_data)

    # servingSizeを100に、servingUnitはそのまま
    new_item_data = re.sub(r'"servingSize":\s*\d+', '"servingSize": 100', new_item_data)

    return f'"{item_name}": {{{new_item_data}}}'

# 全アイテムを処理（servingSizeを持つもののみ）
pattern = r'"([^"]+)":\s*\{([^}]+(?:"servingSize"[^}]+))\}'

new_content = re.sub(pattern, convert_item_to_100g_base, content, flags=re.DOTALL)

# 結果を保存
with open('foodDatabase.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("完了: 全アイテムを100g/100ml基準に変換しました")
