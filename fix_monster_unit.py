# -*- coding: utf-8 -*-
import re

# foodDatabase.jsを読み込み
with open('foodDatabase.js', 'r', encoding='utf-8') as f:
    content = f.read()

# モンスターエナジーの単位をmlからgに変更
pattern = r'("モンスターエナジー パイプラインパンチ":[^}]*)"servingSize":\s*355,\s*"servingUnit":\s*"ml"'
replacement = r'\1"servingSize": 355, "servingUnit": "g"'

content = re.sub(pattern, replacement, content)

# 結果を保存
with open('foodDatabase.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("完了: モンスターエナジーの単位をgに変更しました")
