# -*- coding: utf-8 -*-
import re

# servingSizeとservingUnitの正しいマッピング
correct_mappings = {
    # 卵類
    '鶏卵 SS（40g）': (40, 'g'),
    '鶏卵 S（46g）': (46, 'g'),
    '鶏卵 MS（50g）': (50, 'g'),
    '鶏卵 M（58g）': (58, 'g'),
    '鶏卵 L（64g）': (64, 'g'),
    '鶏卵 LL（70g）': (70, 'g'),
    'ゆで卵 M（58g）': (58, 'g'),
    '温泉卵 M（58g）': (58, 'g'),
    '目玉焼き M（卵58g+油3g）': (61, 'g'),
    '卵焼き（卵1個分+調味料）': (70, 'g'),
    'うずら卵（1個10g）': (10, 'g'),
    'うずら卵 水煮（1個12g）': (12, 'g'),

    # プロテイン
    'ホエイプロテイン': (30, 'g'),
    'カゼインプロテイン': (30, 'g'),
    'ソイプロテイン': (30, 'g'),

    # アミノ酸
    'BCAA': (5, 'g'),
    'EAA': (5, 'g'),
    'グルタミン': (5, 'g'),
    'クレアチン': (5, 'g'),

    # その他サプリ
    'マルトデキストリン': (30, 'g'),

    # ドリンク
    'モンスターエナジー パイプラインパンチ': (355, 'ml'),
    'ブラックコーヒー': (100, 'ml'),
    '緑茶（せん茶）': (100, 'ml'),
}

# foodDatabase.jsを読み込み
with open('foodDatabase.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 各アイテムのservingSizeとservingUnitを修正
for name, (size, unit) in correct_mappings.items():
    # パターン: "アイテム名": { ... "servingSize": X, "servingUnit": "Y" ...
    pattern = rf'("{re.escape(name)}":[^}}]*)"servingSize":\s*\d+,\s*"servingUnit":\s*"[^"]*"'

    replacement = rf'\1"servingSize": {size}, "servingUnit": "{unit}"'

    content = re.sub(pattern, replacement, content)

# 結果を保存
with open('foodDatabase.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("完了: servingSizeとservingUnitを正しい値に修正しました")
