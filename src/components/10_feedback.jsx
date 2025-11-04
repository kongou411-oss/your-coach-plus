import React from 'react';
// ===== Immediate Feedback System =====
// 即時フィードバックポップアップコンポーネント

const FeedbackPopup = ({ message, type, onClose, autoCloseMs = 3000 }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        if (autoCloseMs > 0) {
            const timer = setTimeout(() => {
                setIsVisible(false);
                setTimeout(onClose, 300); // アニメーション完了後にクローズ
            }, autoCloseMs);
            return () => clearTimeout(timer);
        }
    }, [autoCloseMs, onClose]);

    const typeStyles = {
        success: {
            bg: 'bg-gradient-to-r from-green-500 to-emerald-500',
            icon: 'CheckCircle',
            iconColor: 'text-white'
        },
        achievement: {
            bg: 'bg-gradient-to-r from-yellow-500 to-orange-500',
            icon: 'Award',
            iconColor: 'text-white'
        },
        insight: {
            bg: 'bg-gradient-to-r from-blue-500 to-indigo-500',
            icon: 'Lightbulb',
            iconColor: 'text-white'
        },
        milestone: {
            bg: 'bg-gradient-to-r from-purple-500 to-pink-500',
            icon: 'Trophy',
            iconColor: 'text-white'
        }
    };

    const style = typeStyles[type] || typeStyles.success;

    return (
        <div
            className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-[100] transition-all duration-300 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
            }`}
            style={{ maxWidth: '90vw', width: '400px' }}
        >
            <div className={`${style.bg} text-white p-4 rounded-2xl shadow-2xl`}>
                <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 ${style.iconColor}`}>
                        <Icon name={style.icon} size={28} />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">
                            {message}
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setIsVisible(false);
                            setTimeout(onClose, 300);
                        }}
                        className="flex-shrink-0 hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition"
                    >
                        <Icon name="X" size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

// フィードバックマネージャー（アプリ全体で使用）
const FeedbackManager = () => {
    const [feedbacks, setFeedbacks] = useState([]);

    useEffect(() => {
        // グローバルイベントリスナーを設定
        const handleFeedback = (event) => {
            const { message, type } = event.detail;
            const id = Date.now() + Math.random();
            setFeedbacks(prev => [...prev, { id, message, type }]);
        };

        window.addEventListener('showFeedback', handleFeedback);
        return () => window.removeEventListener('showFeedback', handleFeedback);
    }, []);

    const removeFeedback = (id) => {
        setFeedbacks(prev => prev.filter(f => f.id !== id));
    };

    return (
        <>
            {feedbacks.map(feedback => (
                <FeedbackPopup
                    key={feedback.id}
                    message={feedback.message}
                    type={feedback.type}
                    onClose={() => removeFeedback(feedback.id)}
                />
            ))}
        </>
    );
};

// ヘルパー関数：フィードバックを表示
const showFeedback = (message, type = 'success') => {
    window.dispatchEvent(new CustomEvent('showFeedback', {
        detail: { message, type }
    }));
};

// フィードバックトリガー関数
const FeedbackTriggers = {
    // 食事記録追加時
    onMealAdded: (meal, totalProtein, targetProtein) => {
        const proteinPercent = Math.round((totalProtein / targetProtein) * 100);

        if (proteinPercent >= 60) {
            showFeedback(
                `素晴らしい！今日のタンパク質目標の${proteinPercent}%を達成しました！`,
                'achievement'
            );
        } else if (meal.items && meal.items.length > 0) {
            const mealProtein = meal.items.reduce((sum, item) => sum + (item.protein || 0), 0);
            showFeedback(
                `${meal.name}を記録しました。タンパク質 ${mealProtein.toFixed(1)}g を摂取。`,
                'success'
            );
        }
    },

    // トレーニング記録追加時
    onWorkoutAdded: (workout, previousBest) => {
        const currentTotal = workout.sets ? workout.sets.reduce((sum, set) =>
            sum + (set.weight || 0) * (set.reps || 0), 0
        ) : 0;

        if (previousBest && currentTotal > previousBest) {
            const improvement = Math.round(((currentTotal - previousBest) / previousBest) * 100);
            showFeedback(
                `お疲れ様でした！前回の記録より総重量が${improvement}%アップしています！`,
                'milestone'
            );
        } else {
            showFeedback(
                `${workout.name}を記録しました。総重量: ${Math.round(currentTotal)}kg`,
                'success'
            );
        }
    },

    // サプリメント記録追加時
    onSupplementAdded: (supplement) => {
        showFeedback(
            `${supplement.name}を記録しました。`,
            'success'
        );
    },

    // コンディション記録追加時
    onConditionAdded: (condition, previousWeight) => {
        if (condition.weight && previousWeight) {
            const change = condition.weight - previousWeight;
            const changeText = change > 0 ? `+${change.toFixed(1)}kg` : `${change.toFixed(1)}kg`;

            showFeedback(
                `コンディションを記録しました。体重: ${condition.weight}kg (${changeText})`,
                'success'
            );
        } else {
            showFeedback(
                `コンディションを記録しました。`,
                'success'
            );
        }
    },

    // PFCバランス完璧達成時
    onPerfectPFC: () => {
        showFeedback(
            `🎉 パーフェクト！PFCすべてが目標±5%以内です！`,
            'milestone'
        );
    },

    // ストリーク達成時
    onStreak: (days) => {
        const milestones = [3, 7, 14, 21, 30, 60, 90, 180, 365];
        if (milestones.includes(days)) {
            showFeedback(
                `🔥 ${days}日連続記録達成！素晴らしい継続力です！`,
                'milestone'
            );
        }
    },

    // 分析完了時のインサイト
    onAnalysisInsight: (insight) => {
        showFeedback(insight, 'insight');
    }
};
