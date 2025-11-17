import React, { useState } from 'react';

// ===== コンディション記録モーダル =====
const AddConditionModal = ({ onClose, onAdd, userProfile, selectedDate }) => {
    const Icon = window.Icon;
    const DataService = window.DataService;

    const [condition, setCondition] = useState({
        sleepHours: 7,
        sleepQuality: 3,
        stress: 3,
        appetite: 3,
        digestion: 3,
        focus: 3,
        weight: userProfile?.weight || 0,
        bodyFat: userProfile?.bodyFat || 0,
        notes: ''
    });

    // 評価ボタンコンポーネント
    const RatingButton = ({ label, value, onChange, options }) => (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <div className="grid grid-cols-5 gap-2">
                {options.map((opt, idx) => (
                    <button
                        key={idx}
                        type="button"
                        onClick={() => onChange(opt.value)}
                        className={`py-3 px-2 rounded-lg border-2 transition ${
                            value === opt.value
                                ? 'border-[#4A9EFF] bg-blue-50 shadow-md'
                                : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        <div className="text-2xl mb-1">{opt.emoji}</div>
                        <div className="text-xs font-medium">{opt.label}</div>
                    </button>
                ))}
            </div>
        </div>
    );

    // 記録ボタンハンドラー
    const handleSave = async () => {
        const newCondition = {
            id: Date.now(),
            time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
            date: selectedDate,
            ...condition
        };

        // コンディション記録を追加
        await onAdd(newCondition);

        // 体組成をプロフィールに即時反映（DataService経由）
        if (condition.weight > 0 || condition.bodyFat > 0) {
            try {
                const updatedProfile = { ...userProfile };

                if (condition.weight > 0) {
                    updatedProfile.weight = condition.weight;
                }

                if (condition.bodyFat > 0) {
                    updatedProfile.bodyFat = condition.bodyFat;
                    updatedProfile.bodyFatPercentage = condition.bodyFat;
                    // LBM（除脂肪体重）を再計算
                    if (updatedProfile.weight > 0) {
                        updatedProfile.leanBodyMass = updatedProfile.weight * (1 - updatedProfile.bodyFat / 100);
                    }
                }

                // プロフィール更新
                await DataService.updateUserProfile(userProfile.userId, updatedProfile);

                // ページリロード（プロフィール変更を反映）
                setTimeout(() => {
                    window.location.reload();
                }, 100);
            } catch (error) {
                console.error('プロフィール更新エラー:', error);
            }
        }

        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* ヘッダー */}
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Icon name="Activity" size={24} className="text-[#4A9EFF]" />
                        コンディション記録
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition"
                    >
                        <Icon name="X" size={24} />
                    </button>
                </div>

                {/* コンテンツ */}
                <div className="p-6 space-y-5">
                    {/* 睡眠時間 */}
                    <RatingButton
                        label="⏰ 睡眠時間"
                        value={condition.sleepHours}
                        onChange={(val) => setCondition({...condition, sleepHours: val})}
                        options={[
                            { value: 5, emoji: '😫', label: '5h以下' },
                            { value: 6, emoji: '😪', label: '6h' },
                            { value: 7, emoji: '😐', label: '7h' },
                            { value: 8, emoji: '😊', label: '8h' },
                            { value: 9, emoji: '🌟', label: '9h以上' }
                        ]}
                    />

                    {/* 睡眠の質 */}
                    <RatingButton
                        label="😴 睡眠の質"
                        value={condition.sleepQuality}
                        onChange={(val) => setCondition({...condition, sleepQuality: val})}
                        options={[
                            { value: 1, emoji: '😫', label: '最悪' },
                            { value: 2, emoji: '😪', label: '悪い' },
                            { value: 3, emoji: '😐', label: '普通' },
                            { value: 4, emoji: '😊', label: '良い' },
                            { value: 5, emoji: '🌟', label: '最高' }
                        ]}
                    />

                    {/* ストレスレベル */}
                    <RatingButton
                        label="😰 ストレスレベル"
                        value={condition.stress}
                        onChange={(val) => setCondition({...condition, stress: val})}
                        options={[
                            { value: 1, emoji: '😌', label: 'なし' },
                            { value: 2, emoji: '🙂', label: '少し' },
                            { value: 3, emoji: '😐', label: '普通' },
                            { value: 4, emoji: '😰', label: '多い' },
                            { value: 5, emoji: '🤯', label: '極度' }
                        ]}
                    />

                    {/* 食欲 */}
                    <RatingButton
                        label="🍽️ 食欲"
                        value={condition.appetite}
                        onChange={(val) => setCondition({...condition, appetite: val})}
                        options={[
                            { value: 1, emoji: '😣', label: 'なし' },
                            { value: 2, emoji: '😕', label: '少ない' },
                            { value: 3, emoji: '😐', label: '普通' },
                            { value: 4, emoji: '😋', label: 'あり' },
                            { value: 5, emoji: '🤤', label: '旺盛' }
                        ]}
                    />

                    {/* 腸内環境 */}
                    <RatingButton
                        label="🦠 腸内環境"
                        value={condition.digestion}
                        onChange={(val) => setCondition({...condition, digestion: val})}
                        options={[
                            { value: 1, emoji: '😖', label: '悪い' },
                            { value: 2, emoji: '😕', label: '不調' },
                            { value: 3, emoji: '😐', label: '普通' },
                            { value: 4, emoji: '🙂', label: '良好' },
                            { value: 5, emoji: '✨', label: '快調' }
                        ]}
                    />

                    {/* 集中力 */}
                    <RatingButton
                        label="🧠 集中力"
                        value={condition.focus}
                        onChange={(val) => setCondition({...condition, focus: val})}
                        options={[
                            { value: 1, emoji: '😵', label: '集中できない' },
                            { value: 2, emoji: '😕', label: 'ぼんやり' },
                            { value: 3, emoji: '😐', label: '普通' },
                            { value: 4, emoji: '🙂', label: '集中できる' },
                            { value: 5, emoji: '✨', label: '超集中' }
                        ]}
                    />

                    {/* 体組成記録 */}
                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                        <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                            <Icon name="Scale" size={16} />
                            体組成記録（任意）
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium mb-1">
                                    体重 (kg)
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={condition.weight}
                                    onChange={(e) => setCondition({...condition, weight: parseFloat(e.target.value) || 0})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                                    placeholder="例: 65.5"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">
                                    体脂肪率 (%)
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={condition.bodyFat}
                                    onChange={(e) => setCondition({...condition, bodyFat: parseFloat(e.target.value) || 0})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                                    placeholder="例: 15.5"
                                />
                            </div>
                        </div>
                    </div>

                    {/* メモ */}
                    <div>
                        <label className="block text-sm font-medium mb-2">メモ（任意）</label>
                        <textarea
                            value={condition.notes}
                            onChange={(e) => setCondition({...condition, notes: e.target.value})}
                            placeholder="体調や気になることを記録..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            rows="3"
                        />
                    </div>

                    {/* 記録ボタン */}
                    <button
                        onClick={handleSave}
                        className="w-full bg-[#4A9EFF] text-white font-bold py-3 px-6 rounded-lg hover:bg-[#3b8fef] shadow-lg transition"
                    >
                        記録
                    </button>
                </div>
            </div>
        </div>
    );
};

// window経由で公開
window.AddConditionModal = AddConditionModal;

export default AddConditionModal;
