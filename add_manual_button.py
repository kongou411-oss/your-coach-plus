#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""手順ボタンを追加"""

def main():
    file_path = r'C:\Users\yourc\yourcoach_new\src\components\04_settings.jsx'

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # ボタン部分を置換
        old_button = '''                                            <button
                                                onClick={handleInstallClick}
                                                className="w-full px-4 py-2 bg-[#4A9EFF] text-white font-bold rounded-lg hover:bg-[#3b8fef] shadow-lg transition flex items-center justify-center gap-2"
                                            >
                                                <Icon name="Download" size={16} />
                                                インストール
                                            </button>'''

        new_buttons = '''                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleInstallClick}
                                                    className="flex-1 px-4 py-2 bg-[#4A9EFF] text-white font-bold rounded-lg hover:bg-[#3b8fef] shadow-lg transition flex items-center justify-center gap-2"
                                                >
                                                    <Icon name="Download" size={16} />
                                                    インストール
                                                </button>
                                                <button
                                                    onClick={() => setShowIOSModal(true)}
                                                    className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition flex items-center justify-center gap-1"
                                                >
                                                    <Icon name="HelpCircle" size={16} />
                                                    手順
                                                </button>
                                            </div>'''

        content = content.replace(old_button, new_buttons)

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

        print('Successfully added manual button')

    except Exception as e:
        print(f'Error: {e}')
        import sys
        sys.exit(1)

if __name__ == '__main__':
    main()
