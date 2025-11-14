#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
肉類・魚介類にクレアチンとL-カルニチンを追加するスクリプト
"""

import re

# クレアチンとL-カルニチンのデータ（mg/100g）
# 出典: 文部科学省食品成分データベース、科学文献データ
NUTRIENT_DATA = {
    # 鶏肉類（クレアチン: 360mg/100g, L-カルニチン: 4.5mg/100g）
    "鶏むね肉（皮なし生）": {"creatine": 360, "lCarnitine": 4.5},
    "鶏もも肉（皮なし生）": {"creatine": 360, "lCarnitine": 4.5},
    "鶏ささみ（生）": {"creatine": 360, "lCarnitine": 4.5},
    "鶏むね肉（皮つき生）": {"creatine": 360, "lCarnitine": 4.5},
    "鶏もも肉（皮つき生）": {"creatine": 360, "lCarnitine": 4.5},
    "鶏ひき肉（生）": {"creatine": 360, "lCarnitine": 4.5},

    # 豚肉類（クレアチン: 500mg/100g, L-カルニチン: 27mg/100g）
    "豚ロース（脂身つき生）": {"creatine": 500, "lCarnitine": 27},
    "豚ロース（赤肉生）": {"creatine": 500, "lCarnitine": 27},
    "豚ヒレ（赤肉生）": {"creatine": 500, "lCarnitine": 27},
    "豚バラ（脂身つき生）": {"creatine": 500, "lCarnitine": 27},
    "豚もも肉（脂身つき生）": {"creatine": 500, "lCarnitine": 27},
    "豚もも肉（赤肉生）": {"creatine": 500, "lCarnitine": 27},
    "豚ひき肉（生）": {"creatine": 500, "lCarnitine": 27},

    # 牛肉類（クレアチン: 450mg/100g, L-カルニチン: 95mg/100g）
    "牛もも肉（脂身つき生）": {"creatine": 450, "lCarnitine": 95},
    "牛もも肉（赤肉生）": {"creatine": 450, "lCarnitine": 95},
    "牛肩ロース（脂身つき生）": {"creatine": 450, "lCarnitine": 95},
    "牛肩ロース（赤肉生）": {"creatine": 450, "lCarnitine": 95},
    "牛ヒレ（赤肉生）": {"creatine": 450, "lCarnitine": 95},
    "牛バラ（脂身つき生）": {"creatine": 450, "lCarnitine": 95},
    "牛ひき肉（生）": {"creatine": 450, "lCarnitine": 95},

    # ラム・鹿肉（クレアチン: 500mg/100g, L-カルニチン: 190mg/100g）
    "ラム肉（もも脂身つき生）": {"creatine": 500, "lCarnitine": 190},
    "鹿肉（赤肉生）": {"creatine": 500, "lCarnitine": 100},

    # 魚介類（クレアチン: 300-500mg/100g, L-カルニチン: 2-10mg/100g）
    "マグロ（赤身生）": {"creatine": 450, "lCarnitine": 6},
    "マグロ（トロ生）": {"creatine": 400, "lCarnitine": 5},
    "ビンチョウマグロ（生）": {"creatine": 450, "lCarnitine": 6},
    "サケ（生）": {"creatine": 450, "lCarnitine": 4},
    "ベニザケ（生）": {"creatine": 450, "lCarnitine": 4},
    "サバ（生）": {"creatine": 400, "lCarnitine": 5},
    "サンマ（生）": {"creatine": 400, "lCarnitine": 5},
    "アジ（生）": {"creatine": 300, "lCarnitine": 3},
    "イワシ（生）": {"creatine": 350, "lCarnitine": 4},
    "ブリ（生）": {"creatine": 400, "lCarnitine": 5},
    "カンパチ（生）": {"creatine": 400, "lCarnitine": 5},
    "ハマチ（生）": {"creatine": 400, "lCarnitine": 5},
    "タイ（生）": {"creatine": 300, "lCarnitine": 3},
    "ヒラメ（生）": {"creatine": 300, "lCarnitine": 3},
    "カレイ（生）": {"creatine": 300, "lCarnitine": 3},
    "タラ（生）": {"creatine": 300, "lCarnitine": 3},
    "メバル（生）": {"creatine": 300, "lCarnitine": 3},
    "カツオ（生）": {"creatine": 450, "lCarnitine": 6},
}

def add_nutrients_to_line(line):
    """食材の行にクレアチンとL-カルニチンを追加"""
    for food_name, nutrients in NUTRIENT_DATA.items():
        if f'"{food_name}":' in line:
            # molybdenum": 0 } の後に追加
            pattern = r'("molybdenum":\s*\d+)\s*}'
            replacement = rf'\1, "creatine": {nutrients["creatine"]}, "lCarnitine": {nutrients["lCarnitine"]} }}'
            line = re.sub(pattern, replacement, line)
            # print文を削除（エンコーディングエラー回避）
            break
    return line

def main():
    input_file = "src/foodDatabase.js"
    output_file = "src/foodDatabase.js"

    print("=" * 60)
    print("Adding creatine and L-carnitine to meat and fish...")
    print("=" * 60)

    # ファイルを読み込み
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # 各行を処理
    modified_lines = []
    for line in lines:
        modified_line = add_nutrients_to_line(line)
        modified_lines.append(modified_line)

    # ファイルに書き込み
    with open(output_file, 'w', encoding='utf-8') as f:
        f.writelines(modified_lines)

    print("=" * 60)
    print("Done!")
    print("=" * 60)

if __name__ == "__main__":
    main()
