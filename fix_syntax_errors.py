#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
foodDatabase.js の構文エラーを自動修正するスクリプト

主な修正内容:
1. コメント行の直後に改行がない問題を修正
2. アイテム間のカンマが不足している問題を修正

使用方法:
    python fix_syntax_errors.py

実行前に必ずバックアップを作成してください！
"""

import re
import sys

def fix_comment_newlines(content):
    """
    コメント行の直後に改行がない問題を修正

    修正前: // 塩類"食塩": { ... },
    修正後: // 塩類
            "食塩": { ... },
    """
    # パターン: コメント行の直後にダブルクォートが続く
    pattern = r'(//[^\n]+)"([^"]+":)'
    replacement = r'\1\n        "\2'

    fixed_content = re.sub(pattern, replacement, content)

    # 修正件数をカウント
    count = len(re.findall(pattern, content))
    if count > 0:
        print(f"[FIX] コメント行の改行を{count}件修正しました")

    return fixed_content


def fix_missing_commas(content):
    """
    アイテム間のカンマが不足している問題を修正

    修正前: "食塩": { ... }"ピンクソルト": { ... },
    修正後: "食塩": { ... },
            "ピンクソルト": { ... },
    """
    count = 0

    # パターン1: }の直後にダブルクォートが続く（カンマなし）
    pattern1 = r'(\})"([^"]+":)'
    matches = re.findall(pattern1, content)
    if matches:
        content = re.sub(pattern1, r'\1,\n        "\2', content)
        count += len(matches)

    # パターン2: }の後にカンマはあるが改行がなく別のアイテムが続く
    pattern2 = r'(\},)"([^"]+":)'
    matches2 = re.findall(pattern2, content)
    if matches2:
        content = re.sub(pattern2, r'\1\n        "\2', content)
        count += len(matches2)

    if count > 0:
        print(f"[FIX] カンマまたは改行を{count}件追加しました")

    return content


def validate_json_structure(content):
    """
    基本的なJSON構造の検証

    - 括弧の対応チェック
    - ダブルクォートの対応チェック
    """
    issues = []

    # 括弧の対応チェック
    open_braces = content.count('{')
    close_braces = content.count('}')
    if open_braces != close_braces:
        issues.append(f"括弧の数が一致しません: {{ {open_braces}個, }} {close_braces}個")

    # 角括弧の対応チェック
    open_brackets = content.count('[')
    close_brackets = content.count(']')
    if open_brackets != close_brackets:
        issues.append(f"角括弧の数が一致しません: [ {open_brackets}個, ] {close_brackets}個")

    if issues:
        print("\n[WARN] 構造上の問題が検出されました:")
        for issue in issues:
            print(f"  - {issue}")
        return False
    else:
        print("\n[OK] 基本的な構造チェックに問題はありません")
        return True


def create_backup(file_path):
    """
    バックアップファイルを作成
    """
    import shutil
    from datetime import datetime

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{file_path}.backup_{timestamp}"

    try:
        shutil.copy2(file_path, backup_path)
        print(f"[OK] バックアップを作成しました: {backup_path}")
        return backup_path
    except Exception as e:
        print(f"[ERROR] バックアップの作成に失敗しました: {e}")
        return None


def main():
    file_path = r'C:\Users\yourc\yourcoach_new\src\foodDatabase.js'

    print("=" * 60)
    print("foodDatabase.js 構文エラー自動修正スクリプト")
    print("=" * 60)
    print()

    # バックアップ作成
    backup_path = create_backup(file_path)
    if not backup_path:
        print("[ERROR] バックアップの作成に失敗したため、処理を中断します")
        sys.exit(1)

    print()

    # ファイル読み込み
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        print(f"[OK] ファイルを読み込みました: {len(content):,} 文字")
    except Exception as e:
        print(f"[ERROR] ファイルの読み込みに失敗しました: {e}")
        sys.exit(1)

    print()

    # 修正前の検証
    print("--- 修正前の検証 ---")
    validate_json_structure(content)
    print()

    # 構文エラー修正
    print("--- 構文エラーの修正 ---")
    content = fix_comment_newlines(content)
    content = fix_missing_commas(content)
    print()

    # 修正後の検証
    print("--- 修正後の検証 ---")
    validate_json_structure(content)
    print()

    # ファイル書き込み
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"[OK] ファイルを更新しました: {file_path}")
    except Exception as e:
        print(f"[ERROR] ファイルの書き込みに失敗しました: {e}")
        print(f"[INFO] バックアップから復元してください: {backup_path}")
        sys.exit(1)

    print()
    print("=" * 60)
    print("完了しました！")
    print("=" * 60)
    print()
    print("次の手順:")
    print("1. 開発サーバー（npm run dev）でブラウザを開く")
    print("2. F12でコンソールを開き、構文エラー（SyntaxError）がないことを確認")
    print("3. 問題がある場合は、以下のバックアップから復元してください:")
    print(f"   {backup_path}")


if __name__ == '__main__':
    main()
