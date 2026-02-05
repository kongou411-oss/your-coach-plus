"""
Gym Hunter - セットアップ確認スクリプト
各コンポーネントの動作を個別にテストします
"""

import os
from dotenv import load_dotenv

load_dotenv()

def test_env():
    """環境変数の確認"""
    print("=" * 50)
    print("1. 環境変数チェック")
    print("=" * 50)

    project = os.getenv("GOOGLE_CLOUD_PROJECT")
    maps_key = os.getenv("GOOGLE_MAPS_API_KEY")

    print(f"  GOOGLE_CLOUD_PROJECT: {project}")
    print(f"  GOOGLE_MAPS_API_KEY: {'[SET]' if maps_key and 'YOUR_' not in maps_key else '[NOT SET]'}")

    return project and maps_key and "YOUR_" not in maps_key


def test_vertex_ai():
    """Vertex AI接続テスト"""
    print("\n" + "=" * 50)
    print("2. Vertex AI (Gemini) 接続テスト")
    print("=" * 50)

    try:
        import vertexai
        from vertexai.generative_models import GenerativeModel

        project = os.getenv("GOOGLE_CLOUD_PROJECT")
        location = os.getenv("VERTEX_AI_LOCATION", "asia-northeast1")
        model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

        vertexai.init(project=project, location=location)
        model = GenerativeModel(model_name)

        response = model.generate_content("こんにちは。1+1=?")
        print(f"  モデル: {model_name}")
        print(f"  応答: {response.text[:100]}...")
        print("  [OK] Vertex AI connected")
        return True

    except Exception as e:
        print(f"  [NG] Error: {e}")
        print("\n  【対処法】")
        print("  1. Google Cloud SDKをインストール:")
        print("     https://cloud.google.com/sdk/docs/install")
        print("  2. 認証を実行:")
        print("     gcloud auth application-default login")
        print("  3. Vertex AI APIを有効化:")
        print("     gcloud services enable aiplatform.googleapis.com")
        return False


def test_maps_api():
    """Google Maps API接続テスト"""
    print("\n" + "=" * 50)
    print("3. Google Maps API 接続テスト")
    print("=" * 50)

    try:
        import googlemaps

        api_key = os.getenv("GOOGLE_MAPS_API_KEY")
        if not api_key or "YOUR_" in api_key:
            raise ValueError("GOOGLE_MAPS_API_KEY が設定されていません")

        gmaps = googlemaps.Client(key=api_key)

        # テスト検索
        result = gmaps.places(query="大阪市北区 ジム", language="ja")
        count = len(result.get("results", []))

        print(f"  テスト検索: '大阪市北区 ジム'")
        print(f"  取得件数: {count}件")

        if count > 0:
            print(f"  例: {result['results'][0]['name']}")

        print("  [OK] Maps API connected")
        return True

    except Exception as e:
        print(f"  [NG] Error: {e}")
        print("\n  【対処法】")
        print("  1. Google Cloud Consoleで Places API を有効化:")
        print("     https://console.cloud.google.com/apis/library/places-backend.googleapis.com")
        print("  2. APIキーを作成:")
        print("     https://console.cloud.google.com/apis/credentials")
        print("  3. .env に GOOGLE_MAPS_API_KEY を設定")
        return False


def test_playwright():
    """Playwright動作テスト"""
    print("\n" + "=" * 50)
    print("4. Playwright (スクレイピング) テスト")
    print("=" * 50)

    try:
        from playwright.sync_api import sync_playwright

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto("https://www.google.com", timeout=10000)
            title = page.title()
            browser.close()

        print(f"  テストURL: https://www.google.com")
        print(f"  タイトル取得: {title}")
        print("  [OK] Playwright working")
        return True

    except Exception as e:
        print(f"  [NG] Error: {e}")
        print("\n  【対処法】")
        print("  python -m playwright install chromium")
        return False


if __name__ == "__main__":
    import sys
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

    print("\n[CHECK] Gym Hunter Setup\n")

    results = {
        "ENV": test_env(),
        "Vertex AI": test_vertex_ai(),
        "Maps API": test_maps_api(),
        "Playwright": test_playwright(),
    }

    print("\n" + "=" * 50)
    print("[SUMMARY]")
    print("=" * 50)

    all_ok = True
    for name, ok in results.items():
        status = "[OK]" if ok else "[NG]"
        print(f"  {status} {name}")
        if not ok:
            all_ok = False

    if all_ok:
        print("\n All setup completed!")
        print("   Run: python main.py")
    else:
        print("\n Fix the errors above and try again.")
