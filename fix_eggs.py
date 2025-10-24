# -*- coding: utf-8 -*-
import re

# 卵類のservingSizeマッピング
egg_mappings = {
    '鶏卵 S（46g）': 46,
    '鶏卵 MS（50g）': 50,
    '鶏卵 M（58g）': 58,
    '鶏卵 L（64g）': 64,
    '鶏卵 LL（70g）': 70,
    'ゆで卵 M（58g）': 58,
    '温泉卵 M（58g）': 58,
    '目玉焼き M（卵58g+油3g）': 61,
    '卵焼き（卵1個分+調味料）': 70,
    'うずら卵（1個10g）': 10,
    'うずら卵 水煮（1個12g）': 12,
}

# foodDatabase.jsを読み込み
with open('foodDatabase.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 各卵アイテムにservingSizeとservingUnitを追加
for egg_name, size in egg_mappings.items():
    # エスケープして正規表現パターンを作成
    escaped_name = re.escape(egg_name)

    # パターン: "アイテム名": { ... "unit": "1個", "category": ...
    pattern = rf'("{escaped_name}":\s*\{{[^}}]*"unit":\s*"1個")(,\s*"category")'

    replacement = rf'\1, "servingSize": {size}, "servingUnit": "g"\2'

    content = re.sub(pattern, replacement, content)

# 結果を保存
with open('foodDatabase.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("完了: 卵類にservingSizeとservingUnitを追加しました")
