#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""昨日のコミットからカスタムアイテム管理UIを復元"""

import subprocess

def main():
    file_path = r'C:\Users\yourc\yourcoach_new\src\components\04_settings.jsx'

    try:
        # 現在のファイルを読み込む
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # 昨日のコミットから該当部分を取得
        result = subprocess.run(
            ['git', 'show', '40e7d04:src/components/04_settings.jsx'],
            capture_output=True,
            text=True,
            encoding='utf-8'
        )

        if result.returncode != 0:
            print(f'Error getting old commit: {result.stderr}')
            return 1

        old_content = result.stdout

        # 昨日のコミットからCustomItemsManagerコンポーネント全体を抽出
        # 開始: "const CustomItemsManager"
        # 終了: 次のコンポーネント定義の直前まで

        start_marker = '// ===== カスタムアイテム管理コンポーネント ====='
        end_marker = '// ===== Settings Components ====='

        start_idx = old_content.find(start_marker)
        end_idx = old_content.find(end_marker)

        if start_idx == -1 or end_idx == -1:
            print('Could not find component boundaries in old commit')
            return 1

        old_component = old_content[start_idx:end_idx]

        # 現在のファイルから同じ部分を置換
        current_start = content.find(start_marker)
        current_end = content.find(end_marker)

        if current_start == -1 or current_end == -1:
            print('Could not find component boundaries in current file')
            return 1

        # 置換
        new_content = content[:current_start] + old_component + content[current_end:]

        # ファイルに書き込み
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)

        print('Successfully restored CustomItemsManager UI from commit 40e7d04')
        print(f'Replaced {current_end - current_start} bytes with {len(old_component)} bytes')

    except Exception as e:
        print(f'Error: {e}')
        import sys
        sys.exit(1)

if __name__ == '__main__':
    main()
