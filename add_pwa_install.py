#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""PWAインストールセクションを追加"""

import subprocess

def main():
    file_path = r'C:\Users\yourc\yourcoach_new\src\components\04_settings.jsx'

    try:
        # PWAインストールコードを最新コミットから取得
        result = subprocess.run(
            ['git', 'show', '374321c:src/components/04_settings.jsx'],
            capture_output=True,
            text=True,
            encoding='utf-8'
        )

        if result.returncode != 0:
            print(f'Error: {result.stderr}')
            return 1

        lines = result.stdout.split('\n')

        # 3049-3175行目を抽出（0-indexedなので3048-3174）
        pwa_section = '\n'.join(lines[3048:3175])

        # 現在のファイルを読み込む
        with open(file_path, 'r', encoding='utf-8') as f:
            current_content = f.read()

        # 挿入位置を見つける: 2798行目の '<div className="space-y-4">' の直後
        insert_marker = '                        <div className="space-y-4">\n                            {/* PWAキャッシュクリア */'

        if insert_marker not in current_content:
            print('Could not find insertion point')
            return 1

        # PWAセクションを挿入
        pwa_with_newline = '                        <div className="space-y-4">\n                            ' + pwa_section + '\n\n                            {/* PWAキャッシュクリア */'

        new_content = current_content.replace(insert_marker, pwa_with_newline)

        # ファイルに書き込み
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)

        print('Successfully added PWA install section')
        print(f'Added {len(pwa_section)} characters')

    except Exception as e:
        print(f'Error: {e}')
        import sys
        sys.exit(1)

if __name__ == '__main__':
    main()
