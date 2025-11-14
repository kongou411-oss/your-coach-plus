#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
果物10件のビタミン・ミネラルデータを一括更新するスクリプト
野菜・主食の更新スクリプトと完全に同じロジックを使用
"""

import re
import json

# 果物10件のビタミン・ミネラルデータ
with open('fruits_vitamins_minerals.json', 'r', encoding='utf-8') as f:
    FRUITS_DATA = json.load(f)

def update_fruits_data(file_path):
    """果物のビタミン・ミネラルデータを更新"""

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    for fruit_name, nutrients in FRUITS_DATA.items():
        # 食品エントリを検索（1行形式）
        pattern = rf'(\s*"{re.escape(fruit_name)}":\s*\{{[^}}]+\}}),?'

        match = re.search(pattern, content)
        if not match:
            print(f"[WARN] {fruit_name} が見つかりませんでした")
            continue

        old_line = match.group(1)

        # 既存のデータをパース
        try:
            # JavaScriptオブジェクトをJSON形式に変換
            json_str = old_line.replace(f'"{fruit_name}":', '').strip()
            if json_str.endswith(','):
                json_str = json_str[:-1]  # 末尾のカンマを削除

            # シングルクォートをダブルクォートに変換
            json_str = json_str.replace("'", '"')

            existing_data = json.loads(json_str)
        except json.JSONDecodeError as e:
            print(f"[WARN] {fruit_name} のパースに失敗: {e}")
            existing_data = {}

        # 新しいデータを作成（既存データ + 新規栄養素）
        # 順序: 基本情報 → ビタミン → ミネラル → その他
        new_data = {}

        # 基本情報を保持
        for key in ['calories', 'protein', 'fat', 'carbs', 'sugar', 'fiber', 'solubleFiber', 'insolubleFiber',
                    'unit', 'servingSize', 'servingUnit', 'category', 'cost']:
            if key in existing_data:
                new_data[key] = existing_data[key]

        # ビタミンを追加（キー名を統一: folate）
        vitamin_mapping = {
            'vitaminA': 'vitaminA',
            'vitaminD': 'vitaminD',
            'vitaminE': 'vitaminE',
            'vitaminK': 'vitaminK',
            'vitaminB1': 'vitaminB1',
            'vitaminB2': 'vitaminB2',
            'niacin': 'niacin',
            'vitaminB6': 'vitaminB6',
            'vitaminB12': 'vitaminB12',
            'folate': 'folate',  # JSONでは"folate"
            'pantothenicAcid': 'pantothenicAcid',
            'biotin': 'biotin',
            'vitaminC': 'vitaminC'
        }

        for json_key, db_key in vitamin_mapping.items():
            new_data[db_key] = nutrients.get(json_key, 0)

        # ミネラルを追加
        for key in ['sodium', 'potassium', 'calcium', 'magnesium', 'phosphorus', 'iron', 'zinc',
                    'copper', 'manganese', 'iodine', 'selenium', 'chromium', 'molybdenum']:
            new_data[key] = nutrients[key]

        # その他の情報を保持
        for key in ['aminoAcidScore', 'pdcaas', 'diaas', 'gi']:
            if key in existing_data:
                new_data[key] = existing_data[key]

        # 新しい行を作成（1行形式）
        fields = []
        for key, value in new_data.items():
            if isinstance(value, str):
                fields.append(f'"{key}": "{value}"')
            else:
                fields.append(f'"{key}": {value}')

        new_line = f'"{fruit_name}": {{ {", ".join(fields)} }}'

        # 置換
        content = content.replace(old_line, new_line)
        print(f"[OK] {fruit_name} を更新しました")

    # ファイルに書き込み
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"\n[OK] 完了: {len(FRUITS_DATA)}件の果物を更新しました")


if __name__ == '__main__':
    file_path = r'C:\Users\yourc\yourcoach_new\src\foodDatabase.js'

    # 更新を実行
    update_fruits_data(file_path)
