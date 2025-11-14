# -*- coding: utf-8 -*-
"""
主食32件のビタミン・ミネラルデータを更新するスクリプト
八訂成分表データを基に、foodDatabase.jsを更新
"""

import re
import json

# 取得済みデータの読み込み
with open('staples_vitamins_minerals.json', 'r', encoding='utf-8') as f:
    vitamins_data = json.load(f)

# foodDatabase.jsの読み込み
with open('src/foodDatabase.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 主食データを更新する関数
def update_staples_data(content, vitamins_data):
    # 主食セクションを抽出
    staples_start = content.find('"主食": {')
    staples_end = content.find('"野菜類": {', staples_start)

    before_staples = content[:staples_start]
    after_staples = content[staples_end:]
    staples_section = content[staples_start:staples_end]

    # 各食品のデータを更新
    for food_name, nutrients in vitamins_data.items():
        # 食品エントリを検索
        pattern = rf'"{re.escape(food_name)}"\s*:\s*\{{'
        match = re.search(pattern, staples_section)

        if not match:
            print(f"[WARN] {food_name} が見つかりません")
            continue

        # 既存の項目の終了位置を検索
        start_pos = match.end()
        brace_count = 1
        end_pos = start_pos

        for i, char in enumerate(staples_section[start_pos:], start=start_pos):
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
                if brace_count == 0:
                    end_pos = i
                    break

        # 既存エントリを取得
        existing_entry = staples_section[match.start():end_pos + 1]

        # 既存のcaloriesなどの基本データを保持
        calories_match = re.search(r'calories:\s*([0-9.]+)', existing_entry)
        protein_match = re.search(r'protein:\s*([0-9.]+)', existing_entry)
        fat_match = re.search(r'fat:\s*([0-9.]+)', existing_entry)
        carbs_match = re.search(r'carbs:\s*([0-9.]+)', existing_entry)

        # 新しいエントリを構築
        new_entry = f'"{food_name}": {{\n'

        if calories_match:
            new_entry += f'            calories: {calories_match.group(1)},\n'
        if protein_match:
            new_entry += f'            protein: {protein_match.group(1)},\n'
        if fat_match:
            new_entry += f'            fat: {fat_match.group(1)},\n'
        if carbs_match:
            new_entry += f'            carbs: {carbs_match.group(1)},\n'

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

    return before_staples + staples_section + after_staples

# データを更新
updated_content = update_staples_data(content, vitamins_data)

# 保存
with open('src/foodDatabase.js', 'w', encoding='utf-8') as f:
    f.write(updated_content)

print("\n主食のビタミン・ミネラルデータ更新完了!")
print(f"更新件数: {len(vitamins_data)}件")
