// 簡易的なconfirmラッパー
// 将来的にカスタムモーダルに置き換え可能
export const confirmAction = (message) => {
    return window.confirm(message);
};

// グローバルに公開（既存コードとの互換性のため）
if (typeof window !== 'undefined') {
    window.confirmAction = confirmAction;
}
