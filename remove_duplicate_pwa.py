#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""2つ目のPWAインストールブロックを削除"""

def main():
    file_path = r'C:\Users\yourc\yourcoach_new\src\components\04_settings.jsx'

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        # 3175行目から3299行目までを削除（0-indexedなので3174-3298）
        # 3175行目: {/* PWAインストール */}
        # 3299行目: })()}の後
        # 削除する行数: 125行

        start_line = 3174  # 0-indexed (3175行目)
        end_line = 3299    # 0-indexed (3300行目の前まで)

        # 該当行を削除
        del lines[start_line:end_line]

        with open(file_path, 'w', encoding='utf-8') as f:
            f.writelines(lines)

        print(f'Successfully removed duplicate PWA block (lines {start_line+1}-{end_line})')

    except Exception as e:
        print(f'Error: {e}')
        import sys
        sys.exit(1)

if __name__ == '__main__':
    main()
