#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""PWAインストールボタンを04_settings.jsxに挿入するスクリプト"""

import sys

# 挿入するコード
pwa_install_code = '''                            {/* PWAインストール */}
                            {(() => {
                                const [deferredPrompt, setDeferredPrompt] = React.useState(null);
                                const [isIOS, setIsIOS] = React.useState(false);
                                const [isStandalone, setIsStandalone] = React.useState(false);
                                const [showIOSModal, setShowIOSModal] = React.useState(false);

                                React.useEffect(() => {
                                    const ua = window.navigator.userAgent;
                                    const iOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
                                    setIsIOS(iOS);

                                    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                                                      window.navigator.standalone === true;
                                    setIsStandalone(standalone);

                                    const handleBeforeInstallPrompt = (e) => {
                                        e.preventDefault();
                                        setDeferredPrompt(e);
                                    };

                                    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

                                    return () => {
                                        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
                                    };
                                }, []);

                                const handleInstallClick = async () => {
                                    if (isIOS) {
                                        setShowIOSModal(true);
                                    } else if (deferredPrompt) {
                                        deferredPrompt.prompt();
                                        const { outcome } = await deferredPrompt.userChoice;
                                        if (outcome === 'accepted') {
                                            toast.success('アプリをインストールしました');
                                        }
                                        setDeferredPrompt(null);
                                    }
                                };

                                if (isStandalone) {
                                    return null;
                                }

                                return (
                                    <>
                                        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-lg border-2 border-indigo-200">
                                            <h4 className="font-bold mb-2 text-indigo-900 flex items-center gap-2">
                                                <Icon name="Smartphone" size={16} />
                                                アプリとしてインストール
                                            </h4>
                                            <p className="text-sm text-gray-700 mb-3">
                                                ホーム画面に追加して、アプリのように使えます。
                                            </p>
                                            <button
                                                onClick={handleInstallClick}
                                                className="w-full px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-lg hover:from-indigo-700 hover:to-blue-700 shadow-lg transition flex items-center justify-center gap-2"
                                            >
                                                <Icon name="Download" size={16} />
                                                {isIOS ? 'インストール方法を見る' : 'インストール'}
                                            </button>
                                        </div>

                                        {showIOSModal && (
                                            <div className="fixed inset-0 bg-black bg-opacity-50 z-[10001] flex items-center justify-center p-4">
                                                <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md p-6 shadow-xl">
                                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                                        <Icon name="Smartphone" size={20} className="text-indigo-600" />
                                                        iPhoneへのインストール方法
                                                    </h3>
                                                    <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                                                        <div className="flex gap-3">
                                                            <div className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xs">1</div>
                                                            <div>
                                                                <p className="font-semibold mb-1">Safariで開く</p>
                                                                <p className="text-xs text-gray-600 dark:text-gray-400">このページをSafariブラウザで開いてください</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-3">
                                                            <div className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xs">2</div>
                                                            <div>
                                                                <p className="font-semibold mb-1 flex items-center gap-1">
                                                                    共有ボタンをタップ
                                                                    <Icon name="Share" size={14} className="text-blue-500" />
                                                                </p>
                                                                <p className="text-xs text-gray-600 dark:text-gray-400">画面下部の共有ボタン（四角に↑マーク）をタップ</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-3">
                                                            <div className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xs">3</div>
                                                            <div>
                                                                <p className="font-semibold mb-1 flex items-center gap-1">
                                                                    「ホーム画面に追加」をタップ
                                                                    <Icon name="PlusSquare" size={14} className="text-blue-500" />
                                                                </p>
                                                                <p className="text-xs text-gray-600 dark:text-gray-400">メニューから「ホーム画面に追加」を選択</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-3">
                                                            <div className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xs">4</div>
                                                            <div>
                                                                <p className="font-semibold mb-1">「追加」をタップ</p>
                                                                <p className="text-xs text-gray-600 dark:text-gray-400">右上の「追加」ボタンをタップして完了</p>
                                                            </div>
                                                        </div>
                                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mt-4">
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

'''

def main():
    file_path = r'C:\Users\yourc\yourcoach_new\src\components\04_settings.jsx'

    try:
        # ファイルを読み込む
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        # 3048行目（インデックスは3047）の後に挿入
        # 3048行目は '<div className="space-y-4">'
        insert_index = 3048  # 3049行目として挿入（0-indexedなので3048）

        # コードを挿入
        lines.insert(insert_index, pwa_install_code)

        # ファイルに書き込む
        with open(file_path, 'w', encoding='utf-8') as f:
            f.writelines(lines)

        print('PWA install button added successfully')
        print(f'Insert position: line {insert_index + 1}')

    except Exception as e:
        print(f'Error: {e}', file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
