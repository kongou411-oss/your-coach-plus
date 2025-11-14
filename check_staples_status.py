# -*- coding: utf-8 -*-
"""
主食カテゴリの更新状況を確認
"""

import re
import sys
import io

# UTF-8出力を強制
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/foodDatabase.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 主食セクションを抽出
staples_start = content.find('"主食": {')
staples_end = content.find('"野菜類": {', staples_start)
staples_section = content[staples_start:staples_end]

# 食品名を抽出
pattern = r'"([^"]+)":\s*\{'
items = re.findall(pattern, staples_section)
items = [item for item in items if item != '主食']

print(f'主食カテゴリ: 全{len(items)}件')
print()

# ビタミン・ミネラルデータの有無を確認
updated = []
not_updated = []

for item in items:
    item_pattern = rf'"{re.escape(item)}":\s*\{{[^}}]+\}}'
    match = re.search(item_pattern, staples_section)
    if match:
        item_data = match.group(0)
        if 'vitaminA' in item_data:
            updated.append(item)
        else:
            not_updated.append(item)

print(f'【更新済み】{len(updated)}件:')
for i, item in enumerate(updated, 1):
    print(f'{i}. {item}')

print()
print(f'【未更新】{len(not_updated)}件:')
for i, item in enumerate(not_updated, 1):
    print(f'{i}. {item}')
