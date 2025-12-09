// ===== ストアレビュー促進コンポーネント =====
// 適切なタイミングでユーザーにストアレビューを依頼

import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { Star, X, Heart, MessageSquare } from 'lucide-react';

// ストアURL
const STORE_URLS = {
    android: 'https://play.google.com/store/apps/details?id=com.yourcoach.plus',
    ios: 'https://apps.apple.com/app/your-coach-plus/id123456789' // TODO: 実際のApp Store IDに置き換え
};

// レビュー促進サービス
const ReviewPromptService = {
    // レビュー促進条件をチェック
    shouldPromptForReview: async (userId) => {
        if (!userId) return false;

        try {
            // ローカルストレージからレビュー状態を取得
            const reviewState = localStorage.getItem('yourCoachBeta_reviewState');
            const state = reviewState ? JSON.parse(reviewState) : {};

            // 既にレビュー済みまたは「後で」を3回以上選択した場合はスキップ
            if (state.reviewed || (state.laterCount || 0) >= 3) {
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
            console.error('[ReviewPrompt] Error checking conditions:', error);
            return false;
        }
    },

    // レビュー完了を記録
    markAsReviewed: () => {
        const state = JSON.parse(localStorage.getItem('yourCoachBeta_reviewState') || '{}');
        state.reviewed = true;
        state.reviewedDate = new Date().toISOString();
        localStorage.setItem('yourCoachBeta_reviewState', JSON.stringify(state));
    },

    // 「後で」を記録
    markAsLater: () => {
        const state = JSON.parse(localStorage.getItem('yourCoachBeta_reviewState') || '{}');
        state.laterCount = (state.laterCount || 0) + 1;
        state.lastPromptDate = new Date().toISOString();
        localStorage.setItem('yourCoachBeta_reviewState', JSON.stringify(state));
    },

    // ストアを開く
    openStore: async () => {
        const platform = Capacitor.getPlatform();
        const storeUrl = platform === 'ios' ? STORE_URLS.ios : STORE_URLS.android;

        try {
            if (Capacitor.isNativePlatform()) {
                await Browser.open({ url: storeUrl });
            } else {
                window.open(storeUrl, '_blank');
            }
        } catch (error) {
            console.error('[ReviewPrompt] Failed to open store:', error);
        }
    }
};

// レビュー促進モーダルコンポーネント
const ReviewPromptModal = ({ isOpen, onClose, onReview, onLater }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full p-6 shadow-xl">
                {/* ヘッダー */}
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Heart className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        Your Coach+ を気に入っていただけましたか？
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                        ストアでのレビューが開発の励みになります
                    </p>
                </div>

                {/* 星評価表示（装飾用） */}
                <div className="flex justify-center gap-1 mb-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                            key={star}
                            className="w-8 h-8 text-yellow-400 fill-yellow-400"
                        />
                    ))}
                </div>

                {/* ボタン */}
                <div className="space-y-3">
                    <button
                        onClick={onReview}
                        className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-indigo-700 transition-all flex items-center justify-center gap-2"
                    >
                        <Star className="w-5 h-5" />
                        レビューを書く
                    </button>

                    <button
                        onClick={onLater}
                        className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                    >
                        また今度
                    </button>

                    <button
                        onClick={() => {
                            ReviewPromptService.markAsReviewed(); // もう表示しない
                            onClose();
                        }}
                        className="w-full py-2 text-gray-500 dark:text-gray-400 text-sm hover:text-gray-700 dark:hover:text-gray-200"
                    >
                        表示しない
                    </button>
                </div>
            </div>
        </div>
    );
};

// フィードバック選択モーダル（レビュー前に満足度を確認）
const FeedbackPromptModal = ({ isOpen, onClose, onPositive, onNegative }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full p-6 shadow-xl">
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

// メインのレビュー促進フック
const useReviewPrompt = (userId) => {
    const [showFeedbackPrompt, setShowFeedbackPrompt] = useState(false);
    const [showReviewPrompt, setShowReviewPrompt] = useState(false);

    useEffect(() => {
        if (!userId) return;

        const checkAndPrompt = async () => {
            const shouldPrompt = await ReviewPromptService.shouldPromptForReview(userId);
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
        setShowReviewPrompt(true);
    };

    const handleNegativeFeedback = () => {
        setShowFeedbackPrompt(false);
        // フィードバック画面に誘導するか、単に閉じる
        ReviewPromptService.markAsLater();
    };

    const handleReview = async () => {
        ReviewPromptService.markAsReviewed();
        await ReviewPromptService.openStore();
        setShowReviewPrompt(false);
    };

    const handleLater = () => {
        ReviewPromptService.markAsLater();
        setShowReviewPrompt(false);
    };

    const handleClose = () => {
        setShowFeedbackPrompt(false);
        setShowReviewPrompt(false);
    };

    return {
        showFeedbackPrompt,
        showReviewPrompt,
        handlePositiveFeedback,
        handleNegativeFeedback,
        handleReview,
        handleLater,
        handleClose,
        FeedbackPromptModal,
        ReviewPromptModal
    };
};

// グローバルに公開
window.ReviewPromptService = ReviewPromptService;
window.useReviewPrompt = useReviewPrompt;
window.ReviewPromptModal = ReviewPromptModal;
window.FeedbackPromptModal = FeedbackPromptModal;

export {
    ReviewPromptService,
    useReviewPrompt,
    ReviewPromptModal,
    FeedbackPromptModal
};

export default ReviewPromptModal;
