"""
Gym Hunter - AIジム営業リスト自動生成ツール
Google Maps API + Vertex AI (Gemini) + Playwright
"""

import os
import time
import csv
from datetime import datetime
from dotenv import load_dotenv
import googlemaps
from playwright.sync_api import sync_playwright
import vertexai
from vertexai.generative_models import GenerativeModel

load_dotenv()

# 設定
GOOGLE_CLOUD_PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT")
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
VERTEX_AI_LOCATION = os.getenv("VERTEX_AI_LOCATION", "asia-northeast1")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

# 検索クエリリスト（カスタマイズ可能）
SEARCH_QUERIES = [
    "大阪市北区 24時間ジム",
    "大阪市北区 パーソナルジム",
    "大阪市中央区 24時間ジム",
    "大阪市中央区 パーソナルジム",
]

# 除外キーワード（大手チェーン等）
EXCLUDE_KEYWORDS = [
    "エニタイム", "ANYTIME", "RIZAP", "ライザップ",
    "カーブス", "コナミ", "ティップネス", "ゴールドジム",
    "セントラル", "ルネサンス", "公営", "市立", "区立",
    "chocoZAP", "チョコザップ", "JOYFIT", "ジョイフィット",
    "FiT24", "フィットイージー", "Fit Easy",
]

# スコアリング用プロンプト
SCORING_PROMPT = """
あなたはフィットネス業界のマーケティング専門家です。
以下のジムのWebサイトから取得したテキストを分析し、
「AIトレーナーアプリ Your Coach+」の営業先としての見込み度を判定してください。

## 判定基準

### ランクS（激アツ・即アプローチ）
以下のいずれかに該当:
- 「24時間営業」かつ「無人」「セルフ」の記載あり
- 「スタッフ募集」「求人」の記載あり
- 小規模〜中規模の独立系ジム（大手チェーン以外）

### ランクA（有力）
以下のいずれかに該当:
- パーソナルジムで複数店舗展開
- 予約方法が「電話のみ」「LINE予約」（DX遅れの兆候）
- 独自アプリやシステムの記載なし

### ランクB（検討）
- 一般的なジムで特筆すべき特徴なし
- 情報が少なく判断困難

### ランクC（除外）
- 大手チェーン（エニタイム、RIZAP、コナミ等）
- 公営・自治体運営
- 既に高度なアプリ/システム導入済み

## 出力形式（厳守）
以下のJSON形式のみで回答してください。他の文章は不要です。

```json
{
  "rank": "S",
  "reason": "24時間無人営業で、スタッフ募集中。独立系で決裁権者にアプローチしやすい。",
  "features": ["24時間営業", "無人運営", "スタッフ募集中"],
  "phone": "06-XXXX-XXXX"
}
```

## 分析対象テキスト
"""


def init_vertex_ai():
    """Vertex AI初期化"""
    vertexai.init(project=GOOGLE_CLOUD_PROJECT, location=VERTEX_AI_LOCATION)
    return GenerativeModel(GEMINI_MODEL)


def search_places(gmaps_client: googlemaps.Client, query: str) -> list:
    """Google Maps Places APIで検索"""
    results = []
    try:
        # Text Searchで検索
        response = gmaps_client.places(query=query, language="ja")

        for place in response.get("results", []):
            name = place.get("name", "")

            # 除外キーワードチェック
            if any(kw.lower() in name.lower() for kw in EXCLUDE_KEYWORDS):
                print(f"  [除外] {name}")
                continue

            place_id = place.get("place_id")

            # 詳細情報取得
            details = gmaps_client.place(place_id, fields=[
                "name", "formatted_address", "formatted_phone_number",
                "website", "opening_hours", "rating"
            ])["result"]

            results.append({
                "name": details.get("name", ""),
                "address": details.get("formatted_address", ""),
                "phone": details.get("formatted_phone_number", ""),
                "website": details.get("website", ""),
                "rating": details.get("rating", ""),
                "place_id": place_id
            })

            time.sleep(0.5)  # API制限対策

    except Exception as e:
        print(f"Places API Error: {e}")

    return results


def scrape_website(url: str) -> str:
    """PlaywrightでWebサイトのテキストを取得"""
    if not url:
        return ""

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.set_default_timeout(15000)

            page.goto(url, wait_until="domcontentloaded")
            time.sleep(2)  # JS読み込み待機

            # bodyのテキストを取得（最大10000文字）
            text = page.inner_text("body")[:10000]
            browser.close()

            return text

    except Exception as e:
        print(f"  [スクレイピングエラー] {url}: {e}")
        return ""


def analyze_with_gemini(model: GenerativeModel, website_text: str) -> dict:
    """Gemini APIでスコアリング"""
    import json
    import re

    if not website_text or len(website_text) < 100:
        return {"rank": "B", "reason": "Webサイト情報が取得できませんでした", "features": [], "phone": ""}

    try:
        prompt = SCORING_PROMPT + "\n" + website_text
        response = model.generate_content(prompt)

        text = response.text

        # JSONを抽出
        json_str = None

        # 方法1: ```json ... ``` ブロックを抽出
        if "```json" in text:
            start = text.find("```json") + 7
            end = text.find("```", start)
            if end > start:
                json_str = text[start:end].strip()

        # 方法2: ``` ... ``` ブロックを抽出
        if not json_str and "```" in text:
            start = text.find("```") + 3
            end = text.find("```", start)
            if end > start:
                json_str = text[start:end].strip()

        # 方法3: そのまま試す
        if not json_str:
            json_str = text.strip()

        result = json.loads(json_str)
        return result

    except Exception as e:
        print(f"  [Gemini解析エラー]: {e}")
        return {"rank": "B", "reason": f"解析エラー: {str(e)}", "features": [], "phone": ""}


def save_to_excel(data: list, filename: str):
    """結果をExcelに保存（listcsvディレクトリ）"""
    import pandas as pd

    # listcsvディレクトリに保存
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(script_dir, "listcsv")
    os.makedirs(output_dir, exist_ok=True)

    filepath = os.path.join(output_dir, filename)

    # DataFrameに変換
    df = pd.DataFrame(data)

    # 列順を指定
    columns = ["rank", "name", "address", "phone", "website",
               "reason", "features", "rating", "scraped_at"]
    df = df[columns]

    # Excel保存
    df.to_excel(filepath, index=False, sheet_name="営業リスト")

    print(f"\n[保存完了] {filepath} ({len(data)}件)")
    return filepath


def main():
    print("=" * 60)
    print("Gym Hunter - AIジム営業リスト自動生成ツール")
    print("=" * 60)

    # 初期化
    gmaps = googlemaps.Client(key=GOOGLE_MAPS_API_KEY)
    model = init_vertex_ai()

    # Phase 1: 全ジムを収集
    all_places = []
    seen_place_ids = set()

    for query in SEARCH_QUERIES:
        print(f"\n[検索] {query}")
        places = search_places(gmaps, query)
        print(f"  → {len(places)}件取得")

        for place in places:
            if place["place_id"] not in seen_place_ids:
                seen_place_ids.add(place["place_id"])
                all_places.append(place)

    total = len(all_places)
    print(f"\n[収集完了] 合計 {total}件（重複除外済み）")
    print("=" * 50)

    # Phase 2: 各ジムを分析
    all_results = []

    for i, place in enumerate(all_places, 1):
        print(f"\n[{i}/{total}] {place['name']}")

        # Webサイトスクレイピング
        website_text = scrape_website(place["website"])

        # Gemini分析
        analysis = analyze_with_gemini(model, website_text)

        # 結果をマージ
        result = {
            "rank": analysis.get("rank", "B"),
            "name": place["name"],
            "address": place["address"],
            "phone": place["phone"] or analysis.get("phone", ""),
            "website": place["website"],
            "reason": analysis.get("reason", ""),
            "features": ", ".join(analysis.get("features", [])),
            "rating": place["rating"],
            "scraped_at": datetime.now().isoformat()
        }

        all_results.append(result)
        print(f"  → ランク: {result['rank']} | {result['reason'][:50]}...")

        time.sleep(1)  # API制限対策

    # ランク順にソート（S > A > B > C）
    rank_order = {"S": 0, "A": 1, "B": 2, "C": 3}
    all_results.sort(key=lambda x: rank_order.get(x["rank"], 9))

    # Excel保存
    output_file = f"gym_list_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    save_to_excel(all_results, output_file)

    # サマリー表示
    print("\n" + "=" * 60)
    print("サマリー")
    print("=" * 60)
    for rank in ["S", "A", "B", "C"]:
        count = len([r for r in all_results if r["rank"] == rank])
        print(f"  ランク{rank}: {count}件")
    print(f"  合計: {len(all_results)}件")


if __name__ == "__main__":
    main()
