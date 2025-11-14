# ビタミン・ミネラルデータ更新プロトコル

## 📋 概要

foodDatabase.jsに食品のビタミン・ミネラルデータ（13種のビタミン + 13種のミネラル）を追加・編集する際の標準手順書。
構文エラーを防ぎ、確実にデータを統合するためのプロトコル。

---

## 🎯 対象データ

### ビタミン（13種）
- vitaminA（μg）
- vitaminD（μg）
- vitaminE（mg）
- vitaminK（μg）
- vitaminB1（mg）
- vitaminB2（mg）
- niacin（mg）
- vitaminB6（mg）
- vitaminB12（μg）
- folate（μg）※JSONでは"folate"、DBでも"folate"で統一
- pantothenicAcid（mg）
- biotin（μg）
- vitaminC（mg）

### ミネラル（13種）
- sodium（mg）
- potassium（mg）
- calcium（mg）
- magnesium（mg）
- phosphorus（mg）
- iron（mg）
- zinc（mg）
- copper（mg）
- manganese（mg）
- iodine（μg）
- selenium（μg）
- chromium（μg）
- molybdenum（μg）

---

## 🔍 STEP 1: データソースの特定

### 1-1. 八訂データベースで検索

**検索URL**: https://fooddb.mext.go.jp/

**検索方法**:
1. 食品名を日本語で入力（例：「ブロッコリー」「鶏むね肉」）
2. 検索結果から該当する食品を選択
3. ITEM_NO（例：`6_06223_7`）を確認
4. URLをコピー（例：`https://fooddb.mext.go.jp/details/details.pl?ITEM_NO=6_06223_7`）

### 1-2. データが八訂にない場合

以下の順で代替データソースを確認：

1. **USDA（米国農務省）**: https://fdc.nal.usda.gov/
2. **科学論文・分析データ**: Google Scholar等で検索
3. **製品の栄養成分表示**（市販品の場合）
4. **類似食品からの推定**（最終手段）

**重要**: データソースを必ず記録すること

---

## 📝 STEP 2: データ収集とJSON作成

### 2-1. WebFetchでデータ取得（八訂の場合）

```
WebFetch URL: https://fooddb.mext.go.jp/details/details.pl?ITEM_NO=X_XXXXX_X
Prompt: Extract all vitamin and mineral content per 100g. Return vitaminA, vitaminD, vitaminE, vitaminK, vitaminB1, vitaminB2, niacin, vitaminB6, vitaminB12, folate (not folicAcid), pantothenicAcid, biotin, vitaminC, sodium, potassium, calcium, magnesium, phosphorus, iron, zinc, copper, manganese, iodine, selenium, chromium, molybdenum. Use 0 for trace amounts or not detected.
```

### 2-2. JSONファイル作成

**ファイル名規則**: `{category}_vitamins_minerals.json`
- 例：`vegetables_vitamins_minerals.json`
- 例：`seasonings_vitamins_minerals.json`

**JSONフォーマット**（必ず厳守）:

```json
{
  "食品名1": {
    "vitaminA": 数値,
    "vitaminD": 数値,
    "vitaminE": 数値,
    "vitaminK": 数値,
    "vitaminB1": 数値,
    "vitaminB2": 数値,
    "niacin": 数値,
    "vitaminB6": 数値,
    "vitaminB12": 数値,
    "folate": 数値,
    "pantothenicAcid": 数値,
    "biotin": 数値,
    "vitaminC": 数値,
    "sodium": 数値,
    "potassium": 数値,
    "calcium": 数値,
    "magnesium": 数値,
    "phosphorus": 数値,
    "iron": 数値,
    "zinc": 数値,
    "copper": 数値,
    "manganese": 数値,
    "iodine": 数値,
    "selenium": 数値,
    "chromium": 数値,
    "molybdenum": 数値
  },
  "食品名2": {
    ...
  }
}
```

**注意事項**:
- ✅ 数値は小数点第1位まで（例：1.0、0.1）
- ✅ 微量またはTr（痕跡）は0にする
- ✅ 検出されず（-）は0にする
- ✅ 未測定（空欄）も0にする
- ❌ 文字列にしない（`"0"` ではなく `0`）

---

## 🐍 STEP 3: Pythonスクリプト作成

### 3-1. テンプレートスクリプト

**ファイル名**: `update_{category}.py`（例：`update_vegetables.py`）

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
{カテゴリ名}のビタミン・ミネラルデータを一括更新するスクリプト
"""

import re
import json

# JSONファイルを読み込み
with open('{category}_vitamins_minerals.json', 'r', encoding='utf-8') as f:
    ITEMS_DATA = json.load(f)

def update_items_data(file_path):
    """{カテゴリ名}のビタミン・ミネラルデータを更新"""

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    for item_name, nutrients in ITEMS_DATA.items():
        # 食品エントリを検索（1行形式）
        pattern = rf'(\s*"{re.escape(item_name)}":\s*\{{[^}}]+\}}),?'

        match = re.search(pattern, content)
        if not match:
            print(f"[WARN] {item_name} が見つかりませんでした")
            continue

        old_line = match.group(1)

        # 既存のデータをパース
        try:
            # JavaScriptオブジェクトをJSON形式に変換
            json_str = old_line.replace(f'"{item_name}":', '').strip()
            if json_str.endswith(','):
                json_str = json_str[:-1]  # 末尾のカンマを削除

            # シングルクォートをダブルクォートに変換
            json_str = json_str.replace("'", '"')

            existing_data = json.loads(json_str)
        except json.JSONDecodeError as e:
            print(f"[WARN] {item_name} のパースに失敗: {e}")
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

        # その他の情報を保持（脂肪酸、omega3、アミノ酸スコアなど）
        for key in ['saturatedFat', 'monounsaturatedFat', 'polyunsaturatedFat', 'omega3', 'aminoAcidScore']:
            if key in existing_data:
                new_data[key] = existing_data[key]

        # 新しい行を作成（1行形式）
        fields = []
        for key, value in new_data.items():
            if isinstance(value, str):
                fields.append(f'"{key}": "{value}"')
            else:
                fields.append(f'"{key}": {value}')

        new_line = f'"{item_name}": {{ {", ".join(fields)} }}'

        # 置換
        content = content.replace(old_line, new_line)
        print(f"[OK] {item_name} を更新しました")

    # ファイルに書き込み
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"\n[OK] 完了: {len(ITEMS_DATA)}件の{カテゴリ名}を更新しました")


if __name__ == '__main__':
    file_path = r'C:\Users\yourc\yourcoach_new\src\foodDatabase.js'

    # 更新を実行
    update_items_data(file_path)
```

### 3-2. スクリプト作成時の注意

- ✅ エンコーディングは必ず `utf-8` を指定
- ✅ ファイルパスは絶対パス（`r'C:\Users\yourc\yourcoach_new\src\foodDatabase.js'`）
- ✅ JSONファイル名は正確に記載
- ✅ カテゴリ名は日本語でわかりやすく

---

## ⚙️ STEP 4: スクリプト実行

### 4-1. 実行前の確認

```bash
# 1. JSONファイルが存在するか確認
dir {category}_vitamins_minerals.json

# 2. Pythonスクリプトが存在するか確認
dir update_{category}.py

# 3. foodDatabase.jsのバックアップ作成（推奨）
copy src\foodDatabase.js src\foodDatabase.js.backup
```

### 4-2. スクリプト実行

```bash
python update_{category}.py
```

### 4-3. 実行結果の確認

**期待される出力**:
```
[OK] 食品名1 を更新しました
[OK] 食品名2 を更新しました
[OK] 食品名3 を更新しました
...
[OK] 完了: N件のカテゴリ名を更新しました
```

**エラーが出た場合**:
```
[WARN] 食品名X が見つかりませんでした
```
→ foodDatabase.js内の食品名とJSONの食品名が完全一致しているか確認

---

## 🔍 STEP 5: 構文エラーチェック（必須）

### 5-1. 手動確認（重要）

**Pythonスクリプトは改行を正しく扱えない場合があるため、必ず手動で確認**

#### チェックポイント1: コメント行の改行

**❌ 間違い（構文エラー）**:
```javascript
// 塩類"食塩": { ... },
```

**✅ 正しい**:
```javascript
// 塩類
"食塩": { ... },
```

#### チェックポイント2: アイテム間のカンマ

**❌ 間違い（構文エラー）**:
```javascript
"食塩": { ... }"ピンクソルト（ヒマラヤ岩塩）": { ... },
```

**✅ 正しい**:
```javascript
"食塩": { ... },
"ピンクソルト（ヒマラヤ岩塩）": { ... },
```

#### チェックポイント3: セクション最後のアイテム

**❌ 間違い（次のセクションと結合）**:
```javascript
"黒糖": { ... },"はちみつ": { ... },
```

**✅ 正しい**:
```javascript
"黒糖": { ... },
"はちみつ": { ... },
```

### 5-2. 構文エラー修正スクリプト（推奨）

更新後、以下のパターンを検索して手動で改行を追加：

**検索パターン**:
```
// [コメント]"
```

**置換**:
```
// [コメント]
"
```

**実装例（VS Code等のエディタ）**:
1. `Ctrl + H`（置換）
2. 正規表現モードON
3. 検索: `(// .+)"([^"]+":)`
4. 置換: `$1\n"$2`

### 5-3. 開発サーバーでの確認

```bash
# 開発サーバーが起動していることを確認
# 起動していない場合
npm run dev

# ブラウザでF12を押してコンソールを開く
# 構文エラー（SyntaxError）がないことを確認
```

**構文エラーの例**:
```
SyntaxError: Unexpected string
```
→ コメント行の直後に改行がない、カンマが不足している等

---

## ✅ STEP 6: データ検証

### 6-1. foodDatabase.jsで確認

更新した食品のデータを直接確認：

```bash
# Readツールで該当行を確認
Read file_path: C:\Users\yourc\yourcoach_new\src\foodDatabase.js
offset: [該当行の付近]
limit: 10
```

### 6-2. 確認項目

- ✅ ビタミン13種すべてが存在する
- ✅ ミネラル13種すべてが存在する
- ✅ 既存のフィールド（calories, protein等）が保持されている
- ✅ その他のフィールド（saturatedFat等）が保持されている
- ✅ 数値が正しい（0.0ではなく0、文字列ではなく数値）

### 6-3. ブラウザで動作確認

1. 開発サーバー（http://localhost:8000）にアクセス
2. 食事入力で更新した食品を検索
3. 食品を選択して記録
4. 分析画面でビタミン・ミネラルが正しく表示されるか確認

---

## 📊 STEP 7: 完了報告とドキュメント更新

### 7-1. 更新履歴の記録

**ファイル**: `VITAMIN_MINERAL_UPDATE_LOG.md`（なければ作成）

```markdown
## [YYYY-MM-DD] カテゴリ名 N件更新

**更新内容**:
- 食品名1
- 食品名2
- ...

**データソース**: 八訂 / USDA / その他

**JSONファイル**: {category}_vitamins_minerals.json

**Pythonスクリプト**: update_{category}.py

**更新者**: Claude Code / ユーザー名
```

### 7-2. 完了報告フォーマット

```markdown
## ビタミン・ミネラルデータ更新完了報告

### 更新内容
{カテゴリ名} {N}件のビタミン・ミネラルデータを追加・更新しました。

### 変更ファイル
1. **{category}_vitamins_minerals.json**: 新規作成 / 更新
2. **update_{category}.py**: 新規作成
3. **src/foodDatabase.js**: {N}件の食品データを更新

### 更新した食品
- 食品名1（Line XXX）
- 食品名2（Line YYY）
- ...

### 確認方法
1. 開発サーバー（http://localhost:8000）で食事入力
2. 更新した食品を検索して選択
3. 分析画面でビタミン・ミネラルが表示されることを確認

### 構文エラー
- ✅ なし / ❌ あり（修正済み）
```

---

## 🚨 トラブルシューティング

### 問題1: 食品が見つからない（WARN）

**原因**: JSONの食品名とfoodDatabase.js内の食品名が一致しない

**解決策**:
1. foodDatabase.jsで食品名を完全一致で検索
2. JSONの食品名を修正（スペース、括弧、全角/半角に注意）

### 問題2: 構文エラー（SyntaxError）

**原因**: コメント行の直後に改行がない、カンマが不足

**解決策**:
1. STEP 5-1のチェックポイントを確認
2. 手動で改行を追加
3. カンマの有無を確認

### 問題3: データが0になる

**原因**: JSONのキー名が間違っている、Pythonスクリプトのマッピングミス

**解決策**:
1. JSONのキー名を確認（vitaminA, vitaminB1等）
2. Pythonスクリプトのvitamin_mappingを確認

### 問題4: 既存フィールドが消える

**原因**: Pythonスクリプトのフィールド保持リストに含まれていない

**解決策**:
1. 既存データをRead toolで確認
2. 保持が必要なフィールドをスクリプトに追加
3. スクリプトを再実行

### 問題5: ピンクソルトのように構文エラーで消える

**原因**: Pythonスクリプトが生成するコードで改行が不足

**解決策**:
1. 更新後、必ずSTEP 5-1の手動確認を実施
2. 検索パターン `(// .+)"([^"]+":)` で検索
3. 改行を追加: `$1\n"$2`

---

## 📚 参考情報

### データソースURL
- **八訂**: https://fooddb.mext.go.jp/
- **USDA**: https://fdc.nal.usda.gov/
- **文科省**: https://www.mext.go.jp/a_menu/syokuhinseibun/index.htm

### 既存の更新スクリプト
- `update_staples.py` - 主食34件
- `update_vegetables.py` - 野菜41件
- `update_fruits.py` - 果物10件
- `update_beans_nuts.py` - 豆類・ナッツ12件
- `update_seasonings.py` - 調味料9件
- `update_wagashi.py` - 和菓子3件

### JSONファイル
- `staples_vitamins_minerals.json`
- `vegetables_vitamins_minerals.json`
- `fruits_vitamins_minerals.json`
- `beans_nuts_vitamins_minerals.json`
- `seasonings_vitamins_minerals.json`
- `wagashi_vitamins_minerals.json`

---

## ✨ ベストプラクティス

1. **一度に多数の食品を更新しない**: カテゴリごとに10-50件ずつ更新
2. **バックアップを必ず作成**: `foodDatabase.js.backup`
3. **構文エラーチェックを必ず実施**: STEP 5を省略しない
4. **データソースを記録**: トレーサビリティの確保
5. **更新履歴を残す**: `VITAMIN_MINERAL_UPDATE_LOG.md`
6. **コミット前に動作確認**: ブラウザで実際に動作を確認

---

**作成日**: 2025-11-14
**最終更新**: 2025-11-14
**バージョン**: 1.0
**作成者**: Claude Code
