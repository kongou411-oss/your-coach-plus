#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""PWAインストールセクションの閉じタグを修正"""

def main():
    file_path = r'C:\Users\yourc\yourcoach_new\src\components\04_settings.jsx'

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # 問題のある部分を置換
        old_part = '''                                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mt-4">
                                                            <p className="text-xs text-blue-800 dark:text-blue-300">
                                                                <Icon name="Info" size={14} className="inline mr-1" />

                            {/* PWAキャッシュクリア */}'''

        new_part = '''                                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mt-4">
                                                            <p className="text-xs text-blue-800 dark:text-blue-300">
                                                                <Icon name="Info" size={14} className="inline mr-1" />
                                                                ホーム画面にアイコンが追加され、アプリのように使えます
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setShowIOSModal(false)}
                                                        className="w-full mt-6 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                                                    >
                                                        閉じる
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}

                            {/* PWAキャッシュクリア */}'''

        content = content.replace(old_part, new_part)

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

        print('Successfully fixed PWA closing tags')

    except Exception as e:
        print(f'Error: {e}')
        import sys
        sys.exit(1)

if __name__ == '__main__':
    main()
