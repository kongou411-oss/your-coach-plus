import React from 'react';

// ===== 共通の確認モーダルコンポーネント =====
const ConfirmModal = ({ show, title, message, onConfirm, onCancel }) => {
    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[10001] flex items-center justify-center p-4 modal-safe-area">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl modal-content-safe">
                <h3 className="text-lg font-bold mb-4 dark:text-white">{title}</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6 whitespace-pre-line">{message}</p>
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                    >
                        キャンセル
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                    >
                        確認
                    </button>
                </div>
            </div>
        </div>
    );
};

// ===== 確認モーダルを使用するためのHook =====
const useConfirmModal = () => {
    const [confirmModal, setConfirmModal] = React.useState({
        show: false,
        title: '',
        message: '',
        onConfirm: () => {}
    });

    const showConfirm = (title, message, onConfirm) => {
        return new Promise((resolve) => {
            setConfirmModal({
                show: true,
                title,
                message,
                onConfirm: () => {
                    setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
                    onConfirm();
                    resolve(true);
                }
            });
        });
    };

    const hideConfirm = () => {
        setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
    };

    const ConfirmModalComponent = () => (
        <ConfirmModal
            show={confirmModal.show}
            title={confirmModal.title}
            message={confirmModal.message}
            onConfirm={confirmModal.onConfirm}
            onCancel={hideConfirm}
        />
    );

    return { showConfirm, hideConfirm, ConfirmModalComponent };
};

// グローバル確認関数（Reactコンポーネント外でも使用可能）
const globalConfirmState = {
    show: false,
    title: '',
    message: '',
    callback: null
};

window.showGlobalConfirm = (title, message, callback) => {
    return new Promise((resolve) => {
        globalConfirmState.show = true;
        globalConfirmState.title = title;
        globalConfirmState.message = message;
        globalConfirmState.callback = () => {
            globalConfirmState.show = false;
            if (callback) callback();
            resolve(true);
            // 状態変更を通知
            window.dispatchEvent(new CustomEvent('confirmModalChange'));
        };
        // 状態変更を通知
        window.dispatchEvent(new CustomEvent('confirmModalChange'));
    });
};

window.hideGlobalConfirm = () => {
    globalConfirmState.show = false;
    window.dispatchEvent(new CustomEvent('confirmModalChange'));
};

// グローバル確認モーダルコンポーネント
const GlobalConfirmModal = () => {
    const [state, setState] = React.useState({ ...globalConfirmState });

    React.useEffect(() => {
        const handler = () => {
            setState({ ...globalConfirmState });
        };
        window.addEventListener('confirmModalChange', handler);
        return () => window.removeEventListener('confirmModalChange', handler);
    }, []);

    if (!state.show) return null;

    return (
        <ConfirmModal
            show={state.show}
            title={state.title}
            message={state.message}
            onConfirm={state.callback}
            onCancel={window.hideGlobalConfirm}
        />
    );
};

// グローバルに公開
window.ConfirmModal = ConfirmModal;
window.useConfirmModal = useConfirmModal;
window.GlobalConfirmModal = GlobalConfirmModal;

export { ConfirmModal, useConfirmModal, GlobalConfirmModal };
