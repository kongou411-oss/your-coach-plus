// ===== フィードバック収集コンポーネント =====
// 適切なタイミングでユーザーにフィードバックを依頼

import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Send, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

// フィードバックサービス
const FeedbackPromptService = {
    // フィードバック表示条件をチェック
    shouldPromptForFeedback: async (userId) => {
        if (!userId) return false;

        try {
            // ローカルストレージからフィードバック状態を取得
            const feedbackState = localStorage.getItem('yourCoachBeta_feedbackState');
            const state = feedbackState ? JSON.parse(feedbackState) : {};

            // 既にフィードバック済みまたは「後で」を3回以上選択した場合はスキップ
            if (state.submitted || (state.laterCount || 0) >= 3) {
                return false;
            }

            // 最後のプロンプトから7日以上経過しているかチェック
            if (state.lastPromptDate) {
                const lastPrompt = new Date(state.lastPromptDate);
                const daysSinceLastPrompt = (Date.now() - lastPrompt.getTime()) / (1000 * 60 * 60 * 24);
                if (daysSinceLastPrompt < 7) {
                    return false;
                }
            }

            // ユーザーのリテンション情報を取得
            if (window.RetentionService) {
                const retentionInfo = await window.RetentionService.getUserRetentionInfo(userId);
                if (retentionInfo) {
                    // 条件: 7日以上使用 AND ストリーク3日以上
                    if (retentionInfo.activeDays >= 7 && retentionInfo.streak >= 3) {
                        return true;
                    }
                }
            }

            return false;
        } catch (error) {
            console.error('[FeedbackPrompt] Error checking conditions:', error);
            return false;
        }
    },

    // フィードバック送信完了を記録
    markAsSubmitted: () => {
        const state = JSON.parse(localStorage.getItem('yourCoachBeta_feedbackState') || '{}');
        state.submitted = true;
        state.submittedDate = new Date().toISOString();
        localStorage.setItem('yourCoachBeta_feedbackState', JSON.stringify(state));
    },

    // 「後で」を記録
    markAsLater: () => {
        const state = JSON.parse(localStorage.getItem('yourCoachBeta_feedbackState') || '{}');
        state.laterCount = (state.laterCount || 0) + 1;
        state.lastPromptDate = new Date().toISOString();
        localStorage.setItem('yourCoachBeta_feedbackState', JSON.stringify(state));
    },

    // フィードバック送信
    sendFeedback: async (category, feedbackText, userId) => {
        try {
            const functions = firebase.app().functions('asia-northeast1');
            const sendFeedbackFn = functions.httpsCallable('sendFeedback');

            const categoryLabel = category === 'liked' ? '気に入った点' : '改善点';
            const formattedFeedback = `【${categoryLabel}】\n${feedbackText || '(コメントなし)'}`;

            await sendFeedbackFn({
                feedback: formattedFeedback,
                userId: userId,
                userEmail: firebase.auth().currentUser?.email || '未登録',
                timestamp: new Date().toISOString(),
                category: category
            });

            return true;
        } catch (error) {
            console.error('[FeedbackPrompt] Failed to send feedback:', error);
            throw error;
        }
    }
};

// フィードバック選択モーダル（満足度を確認）
const FeedbackPromptModal = ({ isOpen, onClose, onPositive, onNegative }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full p-6 shadow-xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        Your Coach+ はいかがですか？
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                        ご意見をお聞かせください
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={onPositive}
                        className="py-4 px-4 bg-green-50 dark:bg-green-900/30 border-2 border-green-200 dark:border-green-700 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/50 transition-all"
                    >
                        <div className="text-3xl mb-2">😊</div>
                        <div className="text-green-700 dark:text-green-400 font-medium">気に入った</div>
                    </button>

                    <button
                        onClick={onNegative}
                        className="py-4 px-4 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-all"
                    >
                        <div className="text-3xl mb-2">🤔</div>
                        <div className="text-gray-700 dark:text-gray-300 font-medium">改善点がある</div>
                    </button>
                </div>
            </div>
        </div>
    );
};

// テキスト入力モーダル
const FeedbackInputModal = ({ isOpen, onClose, category, userId, onSubmitSuccess }) => {
    const [feedbackText, setFeedbackText] = useState('');
    const [sending, setSending] = useState(false);

    if (!isOpen) return null;

    const isPositive = category === 'liked';
    const title = isPositive ? '気に入った点を教えてください' : '改善点を教えてください';
    const placeholder = isPositive
        ? '例: AIの分析が的確で役立っています'
        : '例: こんな機能があると嬉しいです';

    const handleSubmit = async () => {
        setSending(true);
        try {
            await FeedbackPromptService.sendFeedback(category, feedbackText, userId);
            FeedbackPromptService.markAsSubmitted();
            toast.success('フィードバックを送信しました');
            onSubmitSuccess();
        } catch (error) {
            toast.error('送信に失敗しました');
        } finally {
            setSending(false);
        }
    };

    const handleSkip = () => {
        FeedbackPromptService.markAsLater();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full p-6 shadow-xl relative">
                <button
                    onClick={handleSkip}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="text-center mb-4">
                    <div className={`w-12 h-12 ${isPositive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'} rounded-full flex items-center justify-center mx-auto mb-3`}>
                        <span className="text-2xl">{isPositive ? '😊' : '🤔'}</span>
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        {title}
                    </h2>
                </div>

                <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder={placeholder}
                    className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />

                <div className="mt-4 space-y-2">
                    <button
                        onClick={handleSubmit}
                        disabled={sending}
                        className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {sending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <Send className="w-5 h-5" />
                                送信する
                            </>
                        )}
                    </button>

                    <button
                        onClick={handleSkip}
                        className="w-full py-2 text-gray-500 dark:text-gray-400 text-sm hover:text-gray-700 dark:hover:text-gray-200"
                    >
                        スキップ
                    </button>
                </div>
            </div>
        </div>
    );
};

// メインのフィードバック促進フック
const useFeedbackPrompt = (userId) => {
    const [showFeedbackPrompt, setShowFeedbackPrompt] = useState(false);
    const [showFeedbackInput, setShowFeedbackInput] = useState(false);
    const [feedbackCategory, setFeedbackCategory] = useState(null); // 'liked' or 'improvement'

    useEffect(() => {
        if (!userId) return;

        const checkAndPrompt = async () => {
            const shouldPrompt = await FeedbackPromptService.shouldPromptForFeedback(userId);
            if (shouldPrompt) {
                // 少し遅延してから表示（他のモーダルと競合しないように）
                setTimeout(() => {
                    setShowFeedbackPrompt(true);
                }, 3000);
            }
        };

        checkAndPrompt();
    }, [userId]);

    const handlePositiveFeedback = () => {
        setShowFeedbackPrompt(false);
        setFeedbackCategory('liked');
        setShowFeedbackInput(true);
    };

    const handleNegativeFeedback = () => {
        setShowFeedbackPrompt(false);
        setFeedbackCategory('improvement');
        setShowFeedbackInput(true);
    };

    const handleClose = () => {
        setShowFeedbackPrompt(false);
        setShowFeedbackInput(false);
        FeedbackPromptService.markAsLater();
    };

    const handleSubmitSuccess = () => {
        setShowFeedbackInput(false);
    };

    return {
        showFeedbackPrompt,
        showFeedbackInput,
        feedbackCategory,
        userId,
        handlePositiveFeedback,
        handleNegativeFeedback,
        handleClose,
        handleSubmitSuccess,
        FeedbackPromptModal,
        FeedbackInputModal
    };
};

// 後方互換性のためのエイリアス
const useReviewPrompt = useFeedbackPrompt;
const ReviewPromptService = FeedbackPromptService;

// グローバルに公開
window.FeedbackPromptService = FeedbackPromptService;
window.useFeedbackPrompt = useFeedbackPrompt;
window.useReviewPrompt = useReviewPrompt;
window.FeedbackPromptModal = FeedbackPromptModal;
window.FeedbackInputModal = FeedbackInputModal;

export {
    FeedbackPromptService,
    useFeedbackPrompt,
    useReviewPrompt,
    FeedbackPromptModal,
    FeedbackInputModal
};

export default FeedbackPromptModal;
