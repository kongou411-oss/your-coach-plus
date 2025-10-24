# -*- coding: utf-8 -*-
import re

# サプリのservingSizeマッピング
supplement_mappings = {
    'ホエイプロテイン': (30, 'g'),
    'カゼインプロテイン': (30, 'g'),
    'ソイプロテイン': (30, 'g'),
    'BCAA': (5, 'g'),
    'EAA': (5, 'g'),
    'グルタミン': (5, 'g'),
    'マルトデキストリン': (30, 'g'),
    'クレアチン': (5, 'g'),
}

# foodDatabase.jsを読み込み
with open('foodDatabase.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 各サプリアイテムのservingSizeを修正
for name, (size, unit) in supplement_mappings.items():
    # パターン: "アイテム名": { ... "servingSize": 100, "servingUnit": "g" ...
    pattern = rf'("{re.escape(name)}":\s*\{{[^}}]*)"servingSize":\s*\d+,\s*"servingUnit":\s*"[^"]*"'

    replacement = rf'\1"servingSize": {size}, "servingUnit": "{unit}"'

    content = re.sub(pattern, replacement, content)

# 結果を保存
with open('foodDatabase.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("完了: サプリメントのservingSizeを修正しました")
