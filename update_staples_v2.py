# -*- coding: utf-8 -*-
"""
主食のビタミン・ミネラルデータを追加するスクリプト（既存データ完全保持版）
"""

import re
import json

# 取得済みデータの読み込み
with open('staples_vitamins_minerals.json', 'r', encoding='utf-8') as f:
    vitamins_data = json.load(f)

# foodDatabase.jsの読み込み
with open('src/foodDatabase.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 主食セクションを抽出
staples_start = content.find('"主食": {')
staples_end = content.find('"野菜類": {', staples_start)

before_staples = content[:staples_start]
after_staples = content[staples_end:]
staples_section = content[staples_start:staples_end]

# 各食品のデータを更新
for food_name, nutrients in vitamins_data.items():
    # 食品エントリを検索（1行形式）
    pattern = rf'"{re.escape(food_name)}"\s*:\s*\{{\s*"calories"[^}}]+\}}'
    match = re.search(pattern, staples_section)

    if not match:
        print(f"[WARN] {food_name} が見つかりません")
        continue

    existing_entry = match.group(0)

    # 既存のJSON形式のデータをパース（簡易的）
    # { "calories": 342, "protein": 6.1, ... } の形式

    # JSONとして解釈できる形式に変換
    json_str = existing_entry.split(':', 1)[1].strip()  # "食品名": の後の部分

    # JavaScriptオブジェクトからPython辞書へ変換
    # "key": value の形式を保持

    # 既存データを保持しつつ、ビタミン・ミネラルを追加
    # 改行して複数行形式に変更

    # 既存エントリから各フィールドを抽出
    fields = {}
    field_pattern = r'"?(\w+)"?\s*:\s*([^,}]+)'
    for field_match in re.finditer(field_pattern, json_str):
        key = field_match.group(1)
        value = field_match.group(2).strip()
        fields[key] = value

    # 新しいエントリを構築
    new_entry = f'"{food_name}": {{\n'

    # 既存フィールドを追加
    for key, value in fields.items():
        new_entry += f'            {key}: {value},\n'

    # ビタミン・ミネラルを追加
    new_entry += f'            // ビタミン（八訂成分表より）\n'
    new_entry += f'            vitaminA: {nutrients["vitaminA"]},\n'
    new_entry += f'            vitaminD: {nutrients["vitaminD"]},\n'
    new_entry += f'            vitaminE: {nutrients["vitaminE"]},\n'
    new_entry += f'            vitaminK: {nutrients["vitaminK"]},\n'
    new_entry += f'            vitaminB1: {nutrients["vitaminB1"]},\n'
    new_entry += f'            vitaminB2: {nutrients["vitaminB2"]},\n'
    new_entry += f'            vitaminB6: {nutrients["vitaminB6"]},\n'
    new_entry += f'            vitaminB12: {nutrients["vitaminB12"]},\n'
    new_entry += f'            niacin: {nutrients["niacin"]},\n'
    new_entry += f'            folate: {nutrients["folate"]},\n'
    new_entry += f'            pantothenicAcid: {nutrients["pantothenicAcid"]},\n'
    new_entry += f'            biotin: {nutrients["biotin"]},\n'
    new_entry += f'            vitaminC: {nutrients["vitaminC"]},\n'
    new_entry += f'            // ミネラル（八訂成分表より）\n'
    new_entry += f'            sodium: {nutrients["sodium"]},\n'
    new_entry += f'            potassium: {nutrients["potassium"]},\n'
    new_entry += f'            calcium: {nutrients["calcium"]},\n'
    new_entry += f'            magnesium: {nutrients["magnesium"]},\n'
    new_entry += f'            phosphorus: {nutrients["phosphorus"]},\n'
    new_entry += f'            iron: {nutrients["iron"]},\n'
    new_entry += f'            zinc: {nutrients["zinc"]},\n'
    new_entry += f'            copper: {nutrients["copper"]},\n'
    new_entry += f'            manganese: {nutrients["manganese"]},\n'
    new_entry += f'            iodine: {nutrients["iodine"]},\n'
    new_entry += f'            selenium: {nutrients["selenium"]},\n'
    new_entry += f'            chromium: {nutrients["chromium"]},\n'
    new_entry += f'            molybdenum: {nutrients["molybdenum"]}\n'
    new_entry += '        }'

    # 置換
    staples_section = staples_section.replace(existing_entry, new_entry)
    print(f"[OK] {food_name} のデータを更新")

# 保存
updated_content = before_staples + staples_section + after_staples

with open('src/foodDatabase.js', 'w', encoding='utf-8') as f:
    f.write(updated_content)

print(f"\n主食のビタミン・ミネラルデータ更新完了!")
print(f"更新件数: {len(vitamins_data)}件")
