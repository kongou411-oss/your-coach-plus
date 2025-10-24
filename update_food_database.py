# -*- coding: utf-8 -*-
import re
import json

# foodDatabase.jsを読み込み
with open('foodDatabase.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 各食品アイテムを処理する関数
def process_item(name, data_str):
    """
    各食品アイテムにservingSizeとservingUnitを設定し、
    栄養素を再計算する
    """

    # servingSizeとservingUnitを抽出・設定する基準
    serving_rules = {
        # 卵類: アイテム名からg数を抽出（例: 「鶏卵 M（58g）」→ 58g）
        r'鶏卵 SS（40g）': (40, 'g'),
        r'鶏卵 S（46g）': (46, 'g'),
        r'鶏卵 MS（50g）': (50, 'g'),
        r'鶏卵 M（58g）': (58, 'g'),
        r'鶏卵 L（64g）': (64, 'g'),
        r'鶏卵 LL（70g）': (70, 'g'),
        r'ゆで卵 M（58g）': (58, 'g'),
        r'温泉卵 M（58g）': (58, 'g'),
        r'目玉焼き M（卵58g\+油3g）': (61, 'g'),  # 卵58g+油3g
        r'卵焼き（卵1個分\+調味料）': (70, 'g'),  # 大体の目安
        r'うずら卵（1個10g）': (10, 'g'),
        r'うずら卵 水煮（1個12g）': (12, 'g'),

        # プロテイン: 30g (粉末)
        r'ホエイプロテイン': (30, 'g'),
        r'カゼインプロテイン': (30, 'g'),
        r'ソイプロテイン': (30, 'g'),

        # アミノ酸: 5g
        r'BCAA': (5, 'g'),
        r'EAA': (5, 'g'),
        r'グルタミン': (5, 'g'),
        r'クレアチン': (5, 'g'),

        # マルトデキストリン: 30g
        r'マルトデキストリン': (30, 'g'),

        # マルチビタミン等: 1粒、2粒、3粒、5粒
        r'NatureMade マルチビタミン': (1, '粒'),
        r'NatureMade スーパーマルチビタミン&ミネラル': (1, '粒'),
        r'NatureMade ビタミンC 500mg': (2, '粒'),
        r'NatureMade ビタミンD 1000IU': (1, '粒'),
        r'NatureMade ビタミンE 400IU': (1, '粒'),
        r'NatureMade ビタミンB群': (2, '粒'),
        r'NatureMade 葉酸': (1, '粒'),
        r'NatureMade カルシウム 200mg': (2, '粒'),
        r'NatureMade カルシウム・マグネシウム・亜鉛': (3, '粒'),
        r'NatureMade 鉄': (1, '粒'),
        r'NatureMade 亜鉛': (1, '粒'),
        r'NatureMade フィッシュオイル（EPA・DHA）': (1, '粒'),
        r'NatureMade DHA': (1, '粒'),
        r'NatureMade ルテイン': (1, '粒'),
        r'NatureMade アスタキサンチン': (1, '粒'),
        r'NatureMade コエンザイムQ10': (1, '粒'),
        r'NatureMade L-カルニチン': (5, '粒'),

        # ドリンク
        r'モンスターエナジー パイプラインパンチ': (355, 'ml'),
        r'ブラックコーヒー': (100, 'ml'),
        r'緑茶（せん茶）': (100, 'ml'),
    }

    # マッチするルールを探す
    serving_size = None
    serving_unit = None

    for pattern, (size, unit) in serving_rules.items():
        if re.search(pattern, name):
            serving_size = size
            serving_unit = unit
            break

    # servingSizeとservingUnitが見つからない場合、デフォルト値を設定
    if serving_size is None:
        # デフォルトは100g
        serving_size = 100
        serving_unit = 'g'

    # データ文字列からunitフィールドを抽出
    unit_match = re.search(r'"unit":\s*"([^"]+)"', data_str)
    current_unit = unit_match.group(1) if unit_match else 'g'

    # servingSizeとservingUnitを追加
    # "unit": "..." の後に追加
    if re.search(r'"servingSize":', data_str):
        # 既に存在する場合は更新
        data_str = re.sub(
            r'"servingSize":\s*\d+',
            f'"servingSize": {serving_size}',
            data_str
        )
        data_str = re.sub(
            r'"servingUnit":\s*"[^"]*"',
            f'"servingUnit": "{serving_unit}"',
            data_str
        )
    else:
        # 新規追加: "unit": "..." の後に挿入
        data_str = re.sub(
            r'("unit":\s*"[^"]*")',
            rf'\1, "servingSize": {serving_size}, "servingUnit": "{serving_unit}"',
            data_str
        )

    return data_str

# foodDatabase内の全アイテムを処理
# 正規表現で "アイテム名": { ... } を抽出
pattern = r'"([^"]+)":\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}'

def replacer(match):
    name = match.group(1)
    data = match.group(2)

    # カテゴリ名（肉類、魚介類など）はスキップ
    if '肉類' in data or '魚介類' in data or '卵類' in data or 'サプリメント' in data:
        return match.group(0)

    # 食品アイテムのみ処理
    if '"calories":' in data or '"protein":' in data:
        processed_data = process_item(name, data)
        return f'"{name}": {{{processed_data}}}'

    return match.group(0)

# すべてのアイテムを処理
new_content = re.sub(pattern, replacer, content, flags=re.DOTALL)

# 結果を保存
with open('foodDatabase_updated.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("完了: foodDatabase_updated.js に保存しました")
