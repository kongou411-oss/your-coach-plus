import React, { useState } from 'react';
import { BookTemplate, X } from 'lucide-react';

/**
 * テンプレートガイドモーダル
 * 新規登録後、初回食事記録後に表示されるテンプレート機能の使い方ガイド
 * 3ステップのスライド形式で視覚的に説明
 */
const TemplateGuideModal = ({ show, onClose }) => {
    const [currentStep, setCurrentStep] = useState(1);

    if (!show) return null;

    const handleNext = () => {
        if (currentStep < 3) {
            setCurrentStep(currentStep + 1);
        } else {
            // 最後のステップで「始める」を押したら閉じる
            handleClose();
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleClose = () => {
        setCurrentStep(1); // ステップをリセット
        onClose();
    };

    // ステップごとの内容
    const steps = [
        {
            title: 'テンプレート機能の使い方',
            description: '記録後、カード左下の紫ボタンでテンプレート保存',
            imageData: '/guide-images/template-step1.png',
            imageAlt: 'テンプレート保存ボタン'
        },
        {
            title: 'テンプレート機能の使い方',
            description: '次回から[追加]→[テンプレート]で簡単に記録',
            imageData: '/guide-images/template-step2.png',
            imageAlt: 'テンプレート選択'
        },
        {
            title: 'テンプレート機能の使い方',
            description: '同じメニューが一瞬で記録完了！運動記録でも同じフローで使えます',
            imageData: '/guide-images/template-step3.png',
            imageAlt: 'テンプレート記録完了'
        }
    ];

    const currentStepData = steps[currentStep - 1];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* ヘッダー */}
                <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-4 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                <BookTemplate size={24} />
                            </div>
                            <h2 className="text-xl font-bold">{currentStepData.title}</h2>
                        </div>
                        <button
                            onClick={handleClose}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* コンテンツ */}
                <div className="p-6">
                    {/* ステップインジケーター */}
                    <div className="flex justify-center gap-2 mb-6">
                        {[1, 2, 3].map((step) => (
                            <div
                                key={step}
                                className={`h-2 rounded-full transition-all ${
                                    step === currentStep
                                        ? 'w-8 bg-purple-500'
                                        : step < currentStep
                                        ? 'w-2 bg-purple-300'
                                        : 'w-2 bg-gray-300'
                                }`}
                            />
                        ))}
                    </div>

                    {/* 説明文 */}
                    <p className="text-center text-gray-700 text-lg font-medium mb-6">
                        {currentStepData.description}
                    </p>

                    {/* 画像 */}
                    <div className="bg-gray-50 rounded-xl p-4 mb-6">
                        <img
                            src={currentStepData.imageData}
                            alt={currentStepData.imageAlt}
                            className="w-full h-auto rounded-lg shadow-md"
                        />
                    </div>

                    {/* ステップ番号表示 */}
                    <div className="text-center text-sm text-gray-500 mb-6">
                        ステップ {currentStep} / 3
                    </div>

                    {/* ボタン */}
                    <div className="flex gap-3">
                        {currentStep > 1 && (
                            <button
                                onClick={handleBack}
                                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                            >
                                戻る
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-medium hover:from-purple-600 hover:to-purple-700 transition-colors shadow-lg"
                        >
                            {currentStep === 3 ? '始める' : '次へ'}
                        </button>
                    </div>

                    {/* スキップボタン（ステップ1のみ表示） */}
                    {currentStep === 1 && (
                        <button
                            onClick={handleClose}
                            className="w-full mt-3 px-6 py-2 text-gray-500 text-sm hover:text-gray-700 transition-colors"
                        >
                            スキップ
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// グローバル変数として公開
if (typeof window !== 'undefined') {
    window.TemplateGuideModal = TemplateGuideModal;
}

export default TemplateGuideModal;
