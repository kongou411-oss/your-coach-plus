import { useState, useEffect } from 'react';

/**
 * BAB（Bottom Action Bar）の高さを監視するカスタムフック
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

        // 初回計測
        updateBabHeight();

        // ResizeObserverでBABの高さ変化を監視
        const babElement = document.querySelector('.fixed.bottom-0.z-\\[10000\\]');
        if (babElement) {
            const resizeObserver = new ResizeObserver(updateBabHeight);
            resizeObserver.observe(babElement);

            return () => {
                resizeObserver.disconnect();
            };
        }

        // BAB要素が見つからない場合のフォールバック
        const intervalId = setInterval(updateBabHeight, 500);
        return () => clearInterval(intervalId);
    }, []);

    return babHeight;
};

export default useBABHeight;
