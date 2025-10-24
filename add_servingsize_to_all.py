# -*- coding: utf-8 -*-
import re

# foodDatabase.jsを読み込み
with open('foodDatabase.js', 'r', encoding='utf-8') as f:
    content = f.read()

# servingSizeを持たないアイテムに追加する
def add_servingsize(match):
    item_name = match.group(1)
    item_data_str = match.group(2)

    # すでにservingSizeがある場合はスキップ
    if '"servingSize":' in item_data_str:
        return match.group(0)

    # カテゴリ定義の行はスキップ
    if '"肉類"' in item_data_str or '"魚介類"' in item_data_str or '"卵類"' in item_data_str or '"サプリメント"' in item_data_str:
        return match.group(0)

    # 栄養素データがない場合はスキップ
    if '"calories":' not in item_data_str and '"protein":' not in item_data_str:
        return match.group(0)

    # unitを抽出
    unit_match = re.search(r'"unit":\s*"([^"]+)"', item_data_str)
    if not unit_match:
        return match.group(0)

    unit = unit_match.group(1)

    # デフォルトは100g/100ml
    serving_size = 100
    serving_unit = 'g'

    # mlの場合
    if 'ml' in unit.lower():
        serving_unit = 'ml'

    # "unit": "..." の後にservingSizeとservingUnitを追加
    new_item_data = re.sub(
        r'("unit":\s*"[^"]*")',
        r'\1, "servingSize": ' + str(serving_size) + ', "servingUnit": "' + serving_unit + '"',
        item_data_str
    )

    return f'"{item_name}": {{{new_item_data}}}'

# 全アイテムを処理
pattern = r'"([^"]+)":\s*\{([^}]+)\}'

new_content = re.sub(pattern, add_servingsize, content, flags=re.DOTALL)

# 結果を保存
with open('foodDatabase.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("完了: すべてのアイテムにservingSizeを追加しました")
