import { useState, useEffect } from 'react';

/**
 * BAB（Bottom Action Bar）の高さを監視するカスタムフック
 * フォントサイズ変更・ナビゲーションバー表示/非表示に対応
 * @param {number} defaultHeight - デフォルトの高さ（デフォルト: 64px）
 * @returns {number} babHeight - 現在のBABの高さ
 */
const useBABHeight = (defaultHeight = 64) => {
    const [babHeight, setBabHeight] = useState(defaultHeight);

    useEffect(() => {
        const updateBabHeight = () => {
            // BABを取得（z-indexが10000の固定要素）
            const babElement = document.querySelector('.fixed.bottom-0.z-\\[10000\\]');
            if (babElement) {
                const height = babElement.offsetHeight;
                setBabHeight(height);
            }
        };

        // 初回計測（少し遅延してセーフエリア適用後に計測）
        updateBabHeight();
        const initialTimeout = setTimeout(updateBabHeight, 100);

        // ResizeObserverでBABの高さ変化を監視
        const babElement = document.querySelector('.fixed.bottom-0.z-\\[10000\\]');
        let resizeObserver;

        if (babElement) {
            resizeObserver = new ResizeObserver(updateBabHeight);
            resizeObserver.observe(babElement);
        }

        // visualViewportの変化を監視（ナビゲーションバーの表示/非表示、フォントサイズ変更）
        const handleViewportResize = () => {
            updateBabHeight();
        };

        // windowのリサイズも監視（フォントサイズ・表示サイズ変更対応）
        window.addEventListener('resize', handleViewportResize);
        window.visualViewport?.addEventListener('resize', handleViewportResize);
        window.visualViewport?.addEventListener('scroll', handleViewportResize);

        // BAB要素が見つからない場合のフォールバック
        let intervalId;
        if (!babElement) {
            intervalId = setInterval(updateBabHeight, 500);
        }

        return () => {
            clearTimeout(initialTimeout);
            resizeObserver?.disconnect();
            window.removeEventListener('resize', handleViewportResize);
            window.visualViewport?.removeEventListener('resize', handleViewportResize);
            window.visualViewport?.removeEventListener('scroll', handleViewportResize);
            if (intervalId) clearInterval(intervalId);
        };
    }, []);

    return babHeight;
};

export default useBABHeight;
