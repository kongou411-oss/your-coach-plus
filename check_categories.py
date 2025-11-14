# -*- coding: utf-8 -*-
import re

categories = [
    ("肉類", 3, 29),
    ("魚介類", 29, 71),
    ("卵類", 71, 95),
    ("主食", 95, 118),
    ("野菜類", 118, 170),
    ("乳製品", 170, 182),
    ("豆類・ナッツ", 182, 196),
    ("果物類", 196, 208),
    ("サプリメント", 208, 244),
    ("ドリンク", 244, 273),
    ("調味料", 273, 316),
    ("和菓子", 316, 400)
]

with open('src/foodDatabase.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("foodDatabase.js カテゴリ別アイテム数")
print()
print("更新済み:")
print("  主食: 34件")
print("  野菜類: 41件")
print()
print("未更新:")

for cat_name, start, end in categories:
    if cat_name in ["主食", "野菜類"]:
        continue
    
    count = 0
    has_vitamins = 0
    
    for i in range(start-1, min(end, len(lines))):
        line = lines[i]
        if re.search(r'"\w+.*":\s*{\s*"calories"', line):
            count += 1
            if 'vitaminA' in line:
                has_vitamins += 1
    
    if has_vitamins > 0:
        print(f"  {cat_name}: {count}件 ({has_vitamins}件ビタミンあり)")
    else:
        print(f"  {cat_name}: {count}件")
