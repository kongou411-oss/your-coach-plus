import re
import json

# Read the foodDatabase.js file
with open('src/foodDatabase.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract the foodDatabase object
# Find the start of the foodDatabase object
start_pattern = r'export\s+const\s+foodDatabase\s*=\s*{'
match = re.search(start_pattern, content)
if not match:
    print("Could not find foodDatabase export")
    exit(1)

# Extract the entire object (this is a simplified approach)
# We'll look for items with carbs > 0 and gi undefined/null/0

# Pattern to match food items
item_pattern = r'\{\s*name:\s*["\']([^"\']+)["\']\s*,\s*calories:\s*[\d.]+\s*,\s*protein:\s*[\d.]+\s*,\s*fat:\s*[\d.]+\s*,\s*carbs:\s*([\d.]+)[^}]*?(?:gi:\s*([\d.]+|undefined|null))?\s*[,}]'

# Find all matches
matches = re.finditer(item_pattern, content, re.DOTALL)

# Also need to extract categories
category_pattern = r'["\']([^"\']+)["\']\s*:\s*\['
categories = {}
current_pos = 0

for cat_match in re.finditer(category_pattern, content):
    cat_name = cat_match.group(1)
    cat_start = cat_match.end()
    # Find the closing bracket for this category
    bracket_count = 1
    pos = cat_start
    while bracket_count > 0 and pos < len(content):
        if content[pos] == '[':
            bracket_count += 1
        elif content[pos] == ']':
            bracket_count -= 1
        pos += 1
    categories[cat_name] = content[cat_start:pos-1]

# Now analyze each category
high_carb_no_gi = []
mid_carb_no_gi = []
low_carb_no_gi = []

for cat_name, cat_content in categories.items():
    # Find all items in this category
    for item_match in re.finditer(r'\{\s*name:\s*["\']([^"\']+)["\'][^}]*carbs:\s*([\d.]+)[^}]*?(?:gi:\s*([\d.]+))?\s*[,}]', cat_content, re.DOTALL):
        item_name = item_match.group(1)
        carbs = float(item_match.group(2))
        gi_str = item_match.group(3) if item_match.lastindex >= 3 else None

        # Check if GI is missing or 0
        gi_missing = gi_str is None or gi_str == '' or float(gi_str) == 0 if gi_str and gi_str.replace('.','').isdigit() else True

        if carbs > 0 and gi_missing:
            item_info = {
                'name': item_name,
                'category': cat_name,
                'carbs': carbs,
                'gi': gi_str if gi_str else 'undefined'
            }

            if carbs >= 10:
                high_carb_no_gi.append(item_info)
            elif carbs >= 5:
                mid_carb_no_gi.append(item_info)
            else:
                low_carb_no_gi.append(item_info)

# Sort by carbs descending
high_carb_no_gi.sort(key=lambda x: x['carbs'], reverse=True)
mid_carb_no_gi.sort(key=lambda x: x['carbs'], reverse=True)
low_carb_no_gi.sort(key=lambda x: x['carbs'], reverse=True)

# Output results
print("## GL計算が0になるアイテム一覧\n")

print(f"### 高糖質（carbs ≥ 10g）なのにGI未定義 ({len(high_carb_no_gi)}件)\n")
for i, item in enumerate(high_carb_no_gi, 1):
    print(f"{i}. {item['name']}: {item['category']}")
    print(f"   - carbs: {item['carbs']}g")
    print(f"   - gi: {item['gi']}")
    estimated_gi = 70  # Default estimate
    print(f"   - 想定GL（GI=70の場合）: {item['carbs'] * estimated_gi / 100:.1f}\n")

print(f"\n### 中糖質（5g ≤ carbs < 10g）でGI未定義 ({len(mid_carb_no_gi)}件)\n")
for i, item in enumerate(mid_carb_no_gi, 1):
    print(f"{i}. {item['name']}: {item['category']}")
    print(f"   - carbs: {item['carbs']}g")
    print(f"   - gi: {item['gi']}")
    estimated_gi = 70
    print(f"   - 想定GL（GI=70の場合）: {item['carbs'] * estimated_gi / 100:.1f}\n")

print(f"\n### 低糖質（carbs < 5g）でGI未定義 ({len(low_carb_no_gi)}件)\n")
for i, item in enumerate(low_carb_no_gi, 1):
    print(f"{i}. {item['name']}: {item['category']}")
    print(f"   - carbs: {item['carbs']}g")
    print(f"   - gi: {item['gi']}\n")

print("\n## 総計")
print(f"- GI未定義アイテム総数: {len(high_carb_no_gi) + len(mid_carb_no_gi) + len(low_carb_no_gi)}件")
print(f"- 高糖質でGI未定義: {len(high_carb_no_gi)}件")
print(f"- 中糖質でGI未定義: {len(mid_carb_no_gi)}件")
print(f"- 低糖質でGI未定義: {len(low_carb_no_gi)}件")
