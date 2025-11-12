#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""PWAインストールボタンの重複を削除し、カラーを修正"""

import sys
import re

def main():
    file_path = r'C:\Users\yourc\yourcoach_new\src\components\04_settings.jsx'

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # 2つ目のPWAインストールブロックを削除（3175行目から始まるもの）
        # パターン: {/* PWAインストール */} から })()}まで
        pattern = r'\n                            \{/\* PWAインストール \*/\}\n                            \{\(\(\) => \{[\s\S]*?\}\)\(\)\}\n\n                            \{/\* PWAキャッシュクリア \*/\}'

        # 最初の1つだけ残して、2つ目以降を削除
        matches = list(re.finditer(pattern, content))

        if len(matches) >= 2:
            # 2つ目を削除
            content = content[:matches[1].start()] + '\n                            {/* PWAキャッシュクリア */}' + content[matches[1].end():]
            print(f'Removed duplicate PWA install block (found at position {matches[1].start()})')

        # カラーを修正（indigo → blue, プライマリカラー #4A9EFF に変更）
        content = content.replace(
            'bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-lg border-2 border-indigo-200',
            'bg-blue-50 p-4 rounded-lg border border-blue-200'
        )
        content = content.replace(
            'text-indigo-900',
            'text-blue-800'
        )
        content = content.replace(
            'text-gray-700',
            'text-gray-600'
        )
        content = content.replace(
            'px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-lg hover:from-indigo-700 hover:to-blue-700',
            'px-4 py-2 bg-[#4A9EFF] text-white font-bold rounded-lg hover:bg-[#3b8fef]'
        )

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

        print('Fixed PWA install button styling and removed duplicate')

    except Exception as e:
        print(f'Error: {e}', file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
