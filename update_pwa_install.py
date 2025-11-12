#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""PWAインストールボタンを統一して開発モード対応"""

def main():
    file_path = r'C:\Users\yourc\yourcoach_new\src\components\04_settings.jsx'

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # 古いコードを新しいコードに置換
        old_code = '''                            {/* PWAインストール */}
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
                                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                            <h4 className="font-bold mb-2 text-blue-800 flex items-center gap-2">
                                                <Icon name="Smartphone" size={16} />
                                                アプリとしてインストール
                                            </h4>
                                            <p className="text-sm text-gray-600 mb-3">
                                                ホーム画面に追加して、アプリのように使えます。
                                            </p>
                                            <button
                                                onClick={handleInstallClick}
                                                className="w-full px-4 py-2 bg-[#4A9EFF] text-white font-bold rounded-lg hover:bg-[#3b8fef] shadow-lg transition flex items-center justify-center gap-2"
                                            >
                                                <Icon name="Download" size={16} />
                                                {isIOS ? 'インストール方法を見る' : 'インストール'}
                                            </button>
                                        </div>'''

        new_code = '''                            {/* PWAインストール */}
                            {(() => {
                                const [deferredPrompt, setDeferredPrompt] = React.useState(null);
                                const [isIOS, setIsIOS] = React.useState(false);
                                const [isStandalone, setIsStandalone] = React.useState(false);
                                const [showIOSModal, setShowIOSModal] = React.useState(false);
                                const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

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
                                    // iOSまたはインストールプロンプトが無い場合は手順モーダルを表示
                                    if (isIOS || !deferredPrompt) {
                                        setShowIOSModal(true);
                                    } else if (deferredPrompt) {
                                        // Android/Chromeの場合はネイティブプロンプト
                                        deferredPrompt.prompt();
                                        const { outcome } = await deferredPrompt.userChoice;
                                        if (outcome === 'accepted') {
                                            toast.success('アプリをインストールしました');
                                        }
                                        setDeferredPrompt(null);
                                    }
                                };

                                if (isStandalone && !isDev) {
                                    return null;
                                }

                                return (
                                    <>
                                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                            <h4 className="font-bold mb-2 text-blue-800 flex items-center gap-2">
                                                <Icon name="Smartphone" size={16} />
                                                アプリとしてインストール
                                            </h4>
                                            <p className="text-sm text-gray-600 mb-3">
                                                ホーム画面に追加して、アプリのように使えます。
                                            </p>
                                            {isDev && (
                                                <div className="mb-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs">
                                                    <p className="font-semibold text-yellow-800">開発モード</p>
                                                    <p className="text-yellow-700">iOS: {isIOS ? 'Yes' : 'No'} | Standalone: {isStandalone ? 'Yes' : 'No'} | Prompt: {deferredPrompt ? 'Ready' : 'Not Ready'}</p>
                                                </div>
                                            )}
                                            <button
                                                onClick={handleInstallClick}
                                                className="w-full px-4 py-2 bg-[#4A9EFF] text-white font-bold rounded-lg hover:bg-[#3b8fef] shadow-lg transition flex items-center justify-center gap-2"
                                            >
                                                <Icon name="Download" size={16} />
                                                インストール
                                            </button>
                                        </div>'''

        content = content.replace(old_code, new_code)

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

        print('Successfully updated PWA install button')

    except Exception as e:
        print(f'Error: {e}')
        import sys
        sys.exit(1)

if __name__ == '__main__':
    main()
