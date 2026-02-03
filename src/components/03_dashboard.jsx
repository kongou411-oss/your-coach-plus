import React, { useMemo } from 'react';
import toast from 'react-hot-toast';
import { CountUpNumber, Confetti } from './01_common.jsx';
import { playScoreAchievementAnimation } from '../utils/animations.js';

// ===== Score Doughnut Chart Component =====
const ScoreDoughnutChart = ({ profile, dailyRecord, targetPFC, user, currentDate, setDailyRecord }) => {
    const canvasRef = React.useRef(null);
    const chartRef = React.useRef(null);
    const [recalculating, setRecalculating] = React.useState(false);
    const [showFoodDetails, setShowFoodDetails] = React.useState(false);
    const [show8AxisGuide, setShow8AxisGuide] = React.useState(false);
    const [showConfetti, setShowConfetti] = React.useState(false);
    const scoreElementRef = React.useRef(null);

    // useMemoでdailyRecordが変更されたときにスコアを再計算
    const scores = React.useMemo(() => {
        const calculatedScores = DataService.calculateScores(profile, dailyRecord, targetPFC);
        return calculatedScores;
    }, [profile, dailyRecord, targetPFC]);

    // スコア再計算関数（当日のみ）
    const recalculateAllScores = async () => {
        if (!user || !user.uid) {
            console.error('[再計算] ユーザーIDが見つかりません');
            toast.error('ユーザーIDが見つかりません');
            return;
        }

        if (!currentDate) {
            console.error('[再計算] 日付が選択されていません');
            toast.error('日付が選択されていません');
            return;
        }

        if (recalculating) {
            return;
        }

        setRecalculating(true);

        try {
            // 当日のデータを取得
            const record = await DataService.getDailyRecord(user.uid, currentDate);

            if (!record || (!record.meals?.length && !record.workouts?.length && !record.conditions)) {
                console.error('[再計算] 当日のデータがありません');
                toast.error('当日のデータがありません');
                setRecalculating(false);
                return;
            }

            // スコアを計算
            const calcScores = DataService.calculateScores(profile, record, targetPFC);

            // recordにスコアを追加して保存
            record.scores = {
                food: calcScores.food,  // オブジェクト全体を保存（totalSugar含む）
                exercise: calcScores.exercise.score,
                condition: calcScores.condition.score
            };

            await DataService.saveDailyRecord(user.uid, currentDate, record);

            // dailyRecordを更新
            setDailyRecord(record);

            toast.success('当日のスコアを再計算しました');
        } catch (error) {
            console.error('[再計算] エラー発生:', error);
            console.error('[再計算] エラー詳細:', error.message, error.stack);
            toast.error('スコア再計算中にエラーが発生しました: ' + error.message);
        } finally {
            setRecalculating(false);
        }
    };

    // スコアをdailyRecordに保存
    React.useEffect(() => {
        const saveScores = async () => {
            if (!user || !currentDate || !dailyRecord) return;

            // 既に保存されているスコアと同じなら保存しない
            const savedFoodScore = typeof dailyRecord.scores?.food === 'object'
                ? dailyRecord.scores.food.score
                : dailyRecord.scores?.food;

            if (savedFoodScore === scores.food.score &&
                dailyRecord.scores?.exercise === scores.exercise.score &&
                dailyRecord.scores?.condition === scores.condition.score) {
                return;
            }

            const updatedRecord = {
                ...dailyRecord,
                scores: {
                    food: scores.food,  // オブジェクト全体を保存（totalSugar含む）
                    exercise: scores.exercise.score,
                    condition: scores.condition.score
                }
            };

            await DataService.saveDailyRecord(user.uid, currentDate, updatedRecord);
            setDailyRecord(updatedRecord);
        };

        saveScores();
    }, [scores.food.score, scores.exercise.score, scores.condition.score, user, currentDate]);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // 既存のチャートを破棄
        if (chartRef.current) {
            chartRef.current.destroy();
        }

        // 新しいチャートを作成
        chartRef.current = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['食事', '運動', 'コンディション'],
                datasets: [{
                    data: [scores.food.score, scores.exercise.score, scores.condition.score],
                    backgroundColor: ['#10b981', '#f97316', '#ef4444'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '70%',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `${context.label}: ${context.parsed}/100`;
                            }
                        }
                    }
                }
            }
        });

        // クリーンアップ
        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
            }
        };
    }, [scores.food.score, scores.exercise.score, scores.condition.score]);

    const averageScore = Math.round((scores.food.score + scores.exercise.score + scores.condition.score) / 3);

    // スコア100点達成時の演出
    React.useEffect(() => {
        const isPerfectScore = scores.food.score === 100 || scores.exercise.score === 100 || scores.condition.score === 100 || averageScore === 100;

        if (isPerfectScore) {
            setShowConfetti(true);
            if (scoreElementRef.current) {
                playScoreAchievementAnimation(scoreElementRef.current);
            }

            // 3秒後に紙吹雪を停止
            const timer = setTimeout(() => {
                setShowConfetti(false);
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [scores.food.score, scores.exercise.score, scores.condition.score, averageScore]);

    return (
        <div>
            <div className="relative max-w-[200px] mx-auto mb-4">
                <canvas ref={canvasRef}></canvas>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center" ref={scoreElementRef}>
                        <div className="text-2xl sm:text-3xl font-bold text-gray-800">
                            <CountUpNumber value={averageScore} duration={800} />
                        </div>
                        <div className="text-xs text-gray-600">平均</div>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div>
                    <div className="text-xs text-gray-600 mb-1">食事</div>
                    <div className="text-2xl font-bold text-green-600">
                        <CountUpNumber value={scores.food.score} duration={800} />
                    </div>
                    <button
                        onClick={() => setShowFoodDetails(!showFoodDetails)}
                        className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                    >
                        {showFoodDetails ? '詳細を閉じる ▲' : '8軸詳細を見る ▼'}
                    </button>
                </div>
                <div>
                    <div className="text-xs text-gray-600 mb-1">運動</div>
                    <div className="text-2xl font-bold text-orange-600">
                        <CountUpNumber value={scores.exercise.score} duration={800} />
                    </div>
                </div>
                <div>
                    <div className="text-xs text-gray-600 mb-1">コンディション</div>
                    <div className="text-2xl font-bold text-red-600">
                        <CountUpNumber value={scores.condition.score} duration={800} />
                    </div>
                </div>
            </div>

            {/* 紙吹雪エフェクト */}
            <Confetti isActive={showConfetti} />

            {/* 8軸詳細スコア */}
            {showFoodDetails && scores.food && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-gray-700">食事スコア8軸評価</h4>
                        <button
                            onClick={() => setShow8AxisGuide(true)}
                            className="flex items-center gap-1 hover:opacity-80"
                            style={{ color: '#4A9EFF' }}
                        >
                            <Icon name="HelpCircle" size={16} />
                        </button>
                    </div>

                    {/* 主要3軸（PFC） */}
                    <div className="mb-4">
                        <div className="text-xs font-semibold text-gray-600 mb-2">主要栄養素（60%）</div>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-white p-2 rounded border border-gray-200">
                                <div className="text-xs text-gray-600">タンパク質</div>
                                <div className="text-lg font-bold text-red-500">{scores.food.protein || 0}</div>
                                <div className="text-xs text-gray-500">配点: 20%</div>
                            </div>
                            <div className="bg-white p-2 rounded border border-gray-200">
                                <div className="text-xs text-gray-600">脂質</div>
                                <div className="text-lg font-bold text-yellow-500">{scores.food.fat || 0}</div>
                                <div className="text-xs text-gray-500">配点: 20%</div>
                            </div>
                            <div className="bg-white p-2 rounded border border-gray-200">
                                <div className="text-xs text-gray-600">炭水化物</div>
                                <div className="text-lg font-bold text-green-500">{scores.food.carbs || 0}</div>
                                <div className="text-xs text-gray-500">配点: 20%</div>
                            </div>
                        </div>
                    </div>

                    {/* カロリー */}
                    <div className="mb-4">
                        <div className="text-xs font-semibold text-gray-600 mb-2">エネルギー（10%）</div>
                        <div className="bg-white p-2 rounded border border-gray-200">
                            <div className="flex justify-between items-center">
                                <div className="text-xs text-gray-600">カロリー</div>
                                <div className="flex items-center gap-2">
                                    <div className="text-lg font-bold text-blue-600">{scores.food.calorie || 0}</div>
                                    <div className="text-xs text-gray-500">配点: 10%</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 栄養品質6軸 */}
                    <div>
                        <div className="text-xs font-semibold text-gray-600 mb-2">栄養品質（30%）</div>
                        <div className="space-y-2">
                            <div className="bg-white p-2 rounded border border-gray-200">
                                <div className="flex justify-between items-center">
                                    <div className="text-xs text-gray-600">DIAAS（タンパク質の質）</div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-sm font-bold text-teal-600">{scores.food.diaas || 0}</div>
                                        <div className="text-xs text-gray-500">配点: 5%</div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-2 rounded border border-gray-200">
                                <div className="flex justify-between items-center">
                                    <div className="text-xs text-gray-600">脂肪酸バランス</div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-sm font-bold text-orange-600">{scores.food.fattyAcid || 0}</div>
                                        <div className="text-xs text-gray-500">配点: 5%</div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-2 rounded border border-gray-200">
                                <div className="flex justify-between items-center">
                                    <div className="text-xs text-gray-600">血糖管理（GL値）</div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-sm font-bold text-purple-600">{scores.food.gl || 0}</div>
                                        <div className="text-xs text-gray-500">配点: 5%</div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-2 rounded border border-gray-200">
                                <div className="flex justify-between items-center">
                                    <div className="text-xs text-gray-600">食物繊維</div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-sm font-bold text-emerald-600">{scores.food.fiber || 0}</div>
                                        <div className="text-xs text-gray-500">配点: 5%</div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-2 rounded border border-gray-200">
                                <div className="flex justify-between items-center">
                                    <div className="text-xs text-gray-600">ビタミン</div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-sm font-bold text-orange-600">{scores.food.vitamin || 0}</div>
                                        <div className="text-xs text-gray-500">配点: 5%</div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-2 rounded border border-gray-200">
                                <div className="flex justify-between items-center">
                                    <div className="text-xs text-gray-600">ミネラル</div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-sm font-bold text-purple-600">{scores.food.mineral || 0}</div>
                                        <div className="text-xs text-gray-500">配点: 5%</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 実際の値 */}
                    {scores.food.totalProtein !== undefined && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="text-xs font-semibold text-gray-600 mb-2">実績値</div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">カロリー:</span>
                                    <span className="font-semibold">{scores.food.totalCalories || 0} kcal</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">タンパク質:</span>
                                    <span className="font-semibold">{scores.food.totalProtein || 0} g</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">脂質:</span>
                                    <span className="font-semibold">{scores.food.totalFat || 0} g</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">炭水化物:</span>
                                    <span className="font-semibold">{scores.food.totalCarbs || 0} g</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">食物繊維:</span>
                                    <span className="font-semibold">{scores.food.totalFiber || 0} g</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">GL値:</span>
                                    <span className="font-semibold">{scores.food.totalGL || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">平均DIAAS:</span>
                                    <span className="font-semibold">{scores.food.avgDIAAS || 0}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 8軸評価基準モーダル */}
            {show8AxisGuide && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[10000]" onClick={() => setShow8AxisGuide(false)}>
                    <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Icon name="HelpCircle" size={16} style={{color: '#4A9EFF'}} />
                                8軸評価基準について
                            </h3>
                            <button onClick={() => setShow8AxisGuide(false)} className="p-1 hover:bg-gray-100 rounded-full transition">
                                <Icon name="X" size={20} className="text-gray-500" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* 総合スコア計算方法 */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h4 className="font-bold text-blue-900 mb-2">総合スコアの算出方法</h4>
                                <p className="text-sm text-blue-800">
                                    8軸の各スコアを加重平均して算出します。<br/>
                                    総合スコア = タンパク質×20% + 脂質×20% + 炭水化物×20% + カロリー×10% + DIAAS×5% + 脂肪酸×5% + GL×5% + 食物繊維×5% + ビタミン×5% + ミネラル×5%
                                </p>
                            </div>

                            {/* 主要栄養素（60%） */}
                            <div>
                                <h4 className="font-bold text-gray-800 mb-3">主要栄養素（配点: 60%）</h4>

                                <div className="space-y-4">
                                    <div className="border-l-4 border-red-500 pl-3">
                                        <h5 className="font-semibold text-red-600 mb-1">タンパク質（配点: 20%）</h5>
                                        <div className="text-sm text-gray-700 space-y-1">
                                            <p><strong>100点:</strong> 目標値の95〜105%を摂取</p>
                                            <p><strong>80〜99点:</strong> 目標値の85〜95% または 105〜115%を摂取</p>
                                            <p><strong>60〜79点:</strong> 目標値の75〜85% または 115〜125%を摂取</p>
                                            <p><strong>0〜59点:</strong> 目標値の75%未満 または 125%超過</p>
                                        </div>
                                    </div>

                                    <div className="border-l-4 border-yellow-500 pl-3">
                                        <h5 className="font-semibold text-yellow-600 mb-1">脂質（配点: 20%）</h5>
                                        <div className="text-sm text-gray-700 space-y-1">
                                            <p><strong>100点:</strong> 目標値の95〜105%を摂取</p>
                                            <p><strong>80〜99点:</strong> 目標値の85〜95% または 105〜115%を摂取</p>
                                            <p><strong>60〜79点:</strong> 目標値の75〜85% または 115〜125%を摂取</p>
                                            <p><strong>0〜59点:</strong> 目標値の75%未満 または 125%超過</p>
                                        </div>
                                    </div>

                                    <div className="border-l-4 border-green-500 pl-3">
                                        <h5 className="font-semibold text-green-600 mb-1">炭水化物（配点: 20%）</h5>
                                        <div className="text-sm text-gray-700 space-y-1">
                                            <p><strong>100点:</strong> 目標値の95〜105%を摂取</p>
                                            <p><strong>80〜99点:</strong> 目標値の85〜95% または 105〜115%を摂取</p>
                                            <p><strong>60〜79点:</strong> 目標値の75〜85% または 115〜125%を摂取</p>
                                            <p><strong>0〜59点:</strong> 目標値の75%未満 または 125%超過</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* エネルギー（10%） */}
                            <div>
                                <h4 className="font-bold text-gray-800 mb-3">エネルギー（配点: 10%）</h4>
                                <div className="border-l-4 border-blue-600 pl-3">
                                    <h5 className="font-semibold text-blue-600 mb-1">カロリー（配点: 10%）</h5>
                                    <div className="text-sm text-gray-700 space-y-1">
                                        <p><strong>100点:</strong> 目標値の95〜105%を摂取</p>
                                        <p><strong>80〜99点:</strong> 目標値の85〜95% または 105〜115%を摂取</p>
                                        <p><strong>60〜79点:</strong> 目標値の75〜85% または 115〜125%を摂取</p>
                                        <p><strong>0〜59点:</strong> 目標値の75%未満 または 125%超過</p>
                                    </div>
                                </div>
                            </div>

                            {/* 栄養品質（30%） */}
                            <div>
                                <h4 className="font-bold text-gray-800 mb-3">栄養品質（配点: 30%）</h4>

                                <div className="space-y-4">
                                    <div className="border-l-4 border-teal-600 pl-3">
                                        <h5 className="font-semibold text-teal-600 mb-1">DIAAS - タンパク質の質（配点: 5%）</h5>
                                        <div className="text-sm text-gray-700 space-y-1">
                                            <p><strong>100点:</strong> 平均DIAAS 1.0以上（優秀なタンパク質源）</p>
                                            <p><strong>75〜99点:</strong> 平均DIAAS 0.75〜1.0（良好なタンパク質源）</p>
                                            <p><strong>0〜74点:</strong> 平均DIAAS 0.75未満（改善推奨）</p>
                                            <p className="text-xs text-gray-500 mt-2">※DIAAS: 消化性必須アミノ酸スコア</p>
                                        </div>
                                    </div>

                                    <div className="border-l-4 border-orange-600 pl-3">
                                        <h5 className="font-semibold text-orange-600 mb-1">脂肪酸バランス（配点: 5%）</h5>
                                        <div className="text-sm text-gray-700 space-y-1">
                                            <p><strong>100点:</strong> 理想比率（飽和30%/中鎖5%/一価40%/多価25%）に近い</p>
                                            <p><strong>80〜99点:</strong> バランスが良好</p>
                                            <p><strong>60〜79点:</strong> やや偏りあり</p>
                                            <p><strong>0〜59点:</strong> バランス改善が必要</p>
                                        </div>
                                    </div>

                                    <div className="border-l-4 border-purple-600 pl-3">
                                        <h5 className="font-semibold text-purple-600 mb-1">血糖管理 - GL値（配点: 5%）</h5>
                                        <div className="text-sm text-gray-700 space-y-1">
                                            <p><strong>100点:</strong> 1日合計GL値が目標値の70%以下（優秀）</p>
                                            <p><strong>90〜99点:</strong> 目標値の70〜85%（良好）</p>
                                            <p><strong>70〜89点:</strong> 目標値の85〜100%（許容範囲）</p>
                                            <p><strong>0〜69点:</strong> 目標値超過（改善推奨）</p>
                                            <p className="text-xs text-gray-500 mt-2">※GL: グリセミック負荷（血糖値上昇度）</p>
                                        </div>
                                    </div>

                                    <div className="border-l-4 border-emerald-600 pl-3">
                                        <h5 className="font-semibold text-emerald-600 mb-1">食物繊維（配点: 5%）</h5>
                                        <div className="text-sm text-gray-700 space-y-1">
                                            <p><strong>100点:</strong> 目標値（20g）の100%以上を摂取</p>
                                            <p><strong>80〜99点:</strong> 目標値の80〜100%を摂取</p>
                                            <p><strong>60〜79点:</strong> 目標値の60〜80%を摂取</p>
                                            <p><strong>0〜59点:</strong> 目標値の60%未満</p>
                                        </div>
                                    </div>

                                    <div className="border-l-4 border-orange-600 pl-3">
                                        <h5 className="font-semibold text-orange-600 mb-1">ビタミン（配点: 5%）</h5>
                                        <div className="text-sm text-gray-700 space-y-1">
                                            <p><strong>100点:</strong> 13種類のビタミン全ての平均達成率が100%</p>
                                            <p><strong>80〜99点:</strong> 平均達成率80〜100%</p>
                                            <p><strong>60〜79点:</strong> 平均達成率60〜80%</p>
                                            <p><strong>0〜59点:</strong> 平均達成率60%未満</p>
                                            <p className="text-xs text-gray-500 mt-2">※対象: ビタミンA, D, E, K, B1, B2, B3, B5, B6, B7, B9, B12, C</p>
                                        </div>
                                    </div>

                                    <div className="border-l-4 border-purple-600 pl-3">
                                        <h5 className="font-semibold text-purple-600 mb-1">ミネラル（配点: 5%）</h5>
                                        <div className="text-sm text-gray-700 space-y-1">
                                            <p><strong>100点:</strong> 13種類のミネラル全ての平均達成率が100%</p>
                                            <p><strong>80〜99点:</strong> 平均達成率80〜100%</p>
                                            <p><strong>60〜79点:</strong> 平均達成率60〜80%</p>
                                            <p><strong>0〜59点:</strong> 平均達成率60%未満</p>
                                            <p className="text-xs text-gray-500 mt-2">※対象: カルシウム, 鉄, マグネシウム, リン, カリウム, ナトリウム, 亜鉛, 銅, マンガン, ヨウ素, セレン, クロム, モリブデン</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 参考文献・引用元 */}
                            <div className="mt-6 pt-4 border-t border-gray-200">
                                <h4 className="font-bold text-gray-800 mb-3">📚 参考文献・引用元</h4>
                                <div className="text-xs text-gray-600 space-y-2">
                                    <p>本アプリの栄養評価基準は以下の科学的文献に基づいています：</p>
                                    <ul className="list-disc pl-4 space-y-1">
                                        <li>
                                            <a href="https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/kenkou/eiyou/syokuji_kijyun.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                                                厚生労働省「日本人の食事摂取基準（2020年版）」
                                            </a>
                                        </li>
                                        <li>
                                            <a href="https://www.fao.org/ag/humannutrition/36216-04a2f02ec02eafd4f457dd2c9851b4c45.pdf" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                                                FAO「Dietary protein quality evaluation in human nutrition」(DIAAS)
                                            </a>
                                        </li>
                                        <li>
                                            <a href="https://www.hsph.harvard.edu/nutritionsource/carbohydrates/carbohydrates-and-blood-sugar/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                                                Harvard T.H. Chan School of Public Health - Glycemic Index/Load
                                            </a>
                                        </li>
                                        <li>
                                            <a href="https://www.who.int/news-room/fact-sheets/detail/healthy-diet" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                                                WHO「Healthy diet」Guidelines
                                            </a>
                                        </li>
                                    </ul>
                                    <p className="mt-3 text-gray-500">※本アプリは医療アドバイスを提供するものではありません。健康上の懸念がある場合は、医師または管理栄養士にご相談ください。</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <p className="text-sm text-gray-600 mt-4 text-center">AIによる詳細な栄養分析を確認できます</p>

            {/* スコア再計算ボタン */}
            <div className="mt-4">
                <button
                    onClick={recalculateAllScores}
                    disabled={recalculating}
                    className="w-full px-3 py-2 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Icon name="RefreshCw" size={14} className={recalculating ? 'animate-spin' : ''} />
                    {recalculating ? '再計算中...' : '当日のスコアを再計算'}
                </button>
            </div>
        </div>
    );
};

// ===== Dashboard Component =====
const DashboardView = ({ dailyRecord, targetPFC, unlockedFeatures, setUnlockedFeatures, onDeleteItem, profile, setUserProfile, setInfoModal, yesterdayRecord, setDailyRecord, user, currentDate, onDateChange, triggers, shortcuts, onShortcutClick, onFeatureUnlocked, currentRoutine, onLoadRoutineData, onOpenNewMealModal, onOpenNewWorkoutModal, activeTab: externalActiveTab, onActiveTabChange, usageDays }) => {
    // 指示書管理
    const [todayDirective, setTodayDirective] = useState(null);
    const [showDirectiveEdit, setShowDirectiveEdit] = useState(false);

    // クエスト編集モーダル
    const [editingQuest, setEditingQuest] = useState(null); // { index, item, editedText }
    const [questEditText, setQuestEditText] = useState('');

    // 指示書アイテムを解析する関数
    const parseDirectiveItems = (message) => {
        if (!message) return [];
        const lines = message.split('\n').filter(line => line.trim().startsWith('-') || line.trim().startsWith('【'));
        return lines.map((line, index) => {
            const cleanLine = line.replace(/^-\s*/, '').trim();
            // タイプを判定
            let type = 'other';
            if (cleanLine.includes('【食事')) type = 'meal';
            else if (cleanLine.includes('【運動')) type = 'workout';
            else if (cleanLine.includes('【睡眠')) type = 'sleep';
            else if (cleanLine.includes('【コンディション')) type = 'condition';
            return {
                id: index,
                text: cleanLine,
                type,
                completed: false
            };
        });
    };

    // 食材名をfoodDatabaseで検索（部分一致・正規化対応）
    const findFoodInDatabase = (name) => {
        if (!window.foodDatabase) return null;
        const normalizedName = name.replace(/（.*?）/g, '').replace(/\(.*?\)/g, '').trim();
        for (const category of Object.keys(window.foodDatabase)) {
            const foods = window.foodDatabase[category];
            for (const foodName of Object.keys(foods)) {
                // 完全一致
                if (foodName === name || foodName === normalizedName) {
                    return { name: foodName, ...foods[foodName] };
                }
                // 部分一致（食材名が含まれている）
                const foodBaseName = foodName.replace(/（.*?）/g, '').replace(/\(.*?\)/g, '').trim();
                if (foodBaseName === normalizedName || foodBaseName.includes(normalizedName) || normalizedName.includes(foodBaseName)) {
                    return { name: foodName, ...foods[foodName] };
                }
            }
        }
        return null;
    };

    // クエスト内の食材を解析する関数
    const parseMealItems = (text) => {
        // 【食事N】を除去
        const content = text.replace(/【食事\d*】\s*/, '').replace(/\[.*?\]\s*/, '').trim();
        console.log('[parseMealItems] Input:', text, '→ Content:', content);
        // カンマ区切りで分割（読点・中黒も対応）
        const items = content.split(/[,、・]/);
        console.log('[parseMealItems] Split items:', items);
        return items.map(item => {
            const trimmed = item.trim();
            // 量を抽出（例: "鶏むね肉100g" → { name: "鶏むね肉", amount: 100, unit: "g" }）
            const match = trimmed.match(/^(.+?)(\d+(?:\.\d+)?)\s*(g|kg|ml|個|本|杯|枚|錠)?$/);
            if (match) {
                return {
                    name: match[1].trim(),
                    amount: parseFloat(match[2]),
                    unit: match[3] || 'g'
                };
            }
            // 量なしの場合（デフォルト100g）
            return { name: trimmed, amount: 100, unit: 'g' };
        }).filter(item => item.name);
    };

    // クエスト内の運動を解析する関数
    const parseWorkoutItems = (text) => {
        // 【運動】を除去
        const content = text.replace(/【運動】\s*/, '').trim();
        // カンマ区切りで分割
        const items = content.split(/[,、]/);
        return items.map(item => {
            const trimmed = item.trim();
            // セット×回数を抽出（例: "スクワット 10回×5セット"）
            const match = trimmed.match(/^(.+?)\s*(\d+)\s*回\s*[×x]\s*(\d+)\s*セット$/i);
            if (match) {
                return {
                    name: match[1].trim(),
                    reps: parseInt(match[2]),
                    sets: parseInt(match[3])
                };
            }
            // 簡易形式（"30分の散歩"など）
            const timeMatch = trimmed.match(/^(\d+)\s*分.*?(.+)$/);
            if (timeMatch) {
                return {
                    name: timeMatch[2].trim(),
                    duration: parseInt(timeMatch[1])
                };
            }
            return { name: trimmed };
        }).filter(item => item.name);
    };

    // クエストアイテム完了時の自動記録
    const handleQuestItemComplete = async (item, itemIndex) => {
        if (!user || !todayDirective) return;

        try {
            // 完了状態を更新
            const completedItems = todayDirective.completedItems || {};
            const isNowCompleted = !completedItems[itemIndex];
            completedItems[itemIndex] = isNowCompleted;

            const updatedDirective = { ...todayDirective, completedItems };

            // Firestoreに保存
            await firebase.firestore()
                .collection('users')
                .doc(user.uid)
                .collection('directives')
                .doc(todayDirective.date)
                .set(updatedDirective, { merge: true });

            setTodayDirective(updatedDirective);

            // 達成ログを保存（自動学習用）
            await saveQuestLog(item, itemIndex, isNowCompleted);

            // 完了時のみ自動記録（未完了に戻す場合は記録しない）
            if (isNowCompleted) {
                if (item.type === 'meal') {
                    await recordMealFromQuest(item);
                } else if (item.type === 'workout') {
                    await recordWorkoutFromQuest(item);
                } else if (item.type === 'sleep') {
                    await recordSleepFromQuest(item);
                }
            }
        } catch (error) {
            console.error('[Dashboard] クエスト完了の保存エラー:', error);
            toast.error('クエストの更新に失敗しました');
        }
    };

    // クエスト達成ログを保存（自動学習用）
    const saveQuestLog = async (item, itemIndex, completed) => {
        if (!user) return;

        try {
            const today = currentDate || getTodayDate();
            const logRef = firebase.firestore()
                .collection('users')
                .doc(user.uid)
                .collection('questLogs')
                .doc(today);

            const logDoc = await logRef.get();
            const existingLogs = logDoc.exists ? logDoc.data().items || [] : [];

            // 該当アイテムのログを更新または追加
            const existingIndex = existingLogs.findIndex(log => log.itemIndex === itemIndex);
            const logEntry = {
                itemIndex,
                questText: item.text,
                questType: item.type,
                completed,
                completedAt: completed ? new Date().toISOString() : null,
                // 食材情報を抽出（学習用）
                foodItems: item.type === 'meal' ? parseMealItems(item.text).map(f => f.name) : [],
                workoutItems: item.type === 'workout' ? parseWorkoutItems(item.text).map(w => w.name) : []
            };

            if (existingIndex >= 0) {
                existingLogs[existingIndex] = logEntry;
            } else {
                existingLogs.push(logEntry);
            }

            await logRef.set({
                date: today,
                items: existingLogs,
                updatedAt: new Date().toISOString()
            }, { merge: true });
        } catch (error) {
            console.error('[Dashboard] クエストログの保存エラー:', error);
        }
    };

    // クエスト編集を開始
    const handleQuestEdit = (item, index, e) => {
        e.stopPropagation(); // 親のonClickを防止
        setEditingQuest({ index, item });
        setQuestEditText(item.text);
    };

    // 編集済みクエストを保存して完了
    const handleQuestEditSave = async () => {
        if (!editingQuest || !user || !todayDirective) return;

        const { index, item } = editingQuest;
        const editedText = questEditText.trim();

        // 編集済みアイテムを作成
        const editedItem = {
            ...item,
            text: editedText,
            originalText: item.text, // 元のテキストを保存（学習用）
            wasEdited: true
        };

        try {
            // 完了状態を更新
            const completedItems = todayDirective.completedItems || {};
            completedItems[index] = true;

            // 編集済みテキストを保存
            const editedTexts = todayDirective.editedTexts || {};
            editedTexts[index] = editedText;

            const updatedDirective = { ...todayDirective, completedItems, editedTexts };

            // Firestoreに保存
            await firebase.firestore()
                .collection('users')
                .doc(user.uid)
                .collection('directives')
                .doc(todayDirective.date)
                .set(updatedDirective, { merge: true });

            setTodayDirective(updatedDirective);

            // 達成ログを保存（編集フラグ付き）
            await saveQuestLog(editedItem, index, true);

            // 自動記録（編集済みテキストで）
            if (item.type === 'meal') {
                await recordMealFromQuest(editedItem);
            } else if (item.type === 'workout') {
                await recordWorkoutFromQuest(editedItem);
            } else if (item.type === 'sleep') {
                await recordSleepFromQuest(editedItem);
            }

            toast.success('編集して記録しました');
        } catch (error) {
            console.error('[Dashboard] クエスト編集の保存エラー:', error);
            toast.error('保存に失敗しました');
        }

        setEditingQuest(null);
        setQuestEditText('');
    };

    // 全クエストを一括完了
    const handleCompleteAllQuests = async () => {
        if (!user || !todayDirective) return;

        const items = parseDirectiveItems(todayDirective.message);
        const completedItems = todayDirective.completedItems || {};

        // 未完了のアイテムを取得
        const uncompletedItems = items.filter((_, index) => !completedItems[index]);

        if (uncompletedItems.length === 0) {
            toast('全てのクエストは既に完了しています');
            return;
        }

        // 確認
        if (!window.confirm(`未完了の${uncompletedItems.length}件のクエストを全て完了にしますか？\n\n※各クエストの内容で自動記録されます`)) {
            return;
        }

        try {
            // 全アイテムを完了にする
            for (let index = 0; index < items.length; index++) {
                if (!completedItems[index]) {
                    const item = items[index];
                    await handleQuestItemComplete(item, index);
                }
            }

            // 指示書全体も完了に
            await handleCompleteDirective();

            toast.success('全てのクエストを完了しました');
        } catch (error) {
            console.error('[Dashboard] 全クエスト完了エラー:', error);
            toast.error('完了処理に失敗しました');
        }
    };

    // 食事クエストから自動記録
    const recordMealFromQuest = async (item) => {
        const parsedItems = parseMealItems(item.text);
        console.log('[Quest] Parsed meal items:', parsedItems, 'from text:', item.text);
        if (parsedItems.length === 0) return;

        const mealItems = [];
        let totalCalories = 0;

        for (const parsed of parsedItems) {
            const foodData = findFoodInDatabase(parsed.name);
            console.log('[Quest] Food lookup:', parsed.name, '→', foodData ? 'found' : 'not found');
            if (foodData) {
                // 量に応じて栄養素を換算（foodDatabaseは100gあたり）
                const ratio = parsed.unit === 'g' ? parsed.amount / 100 :
                             parsed.unit === 'kg' ? parsed.amount * 10 :
                             parsed.unit === '個' || parsed.unit === '本' || parsed.unit === '杯' || parsed.unit === '枚' ? parsed.amount :
                             parsed.amount / 100;

                const mealItem = {
                    name: parsed.name,
                    amount: parsed.amount,
                    unit: parsed.unit,
                    calories: Math.round((foodData.calories || 0) * ratio),
                    protein: Math.round((foodData.protein || 0) * ratio * 10) / 10,
                    fat: Math.round((foodData.fat || 0) * ratio * 10) / 10,
                    carbs: Math.round((foodData.carbs || 0) * ratio * 10) / 10,
                    diaas: foodData.diaas || 0,
                    aminoAcidScore: foodData.aminoAcidScore || 0,
                    // ビタミン・ミネラル
                    vitaminA: Math.round((foodData.vitaminA || 0) * ratio * 10) / 10,
                    vitaminB1: Math.round((foodData.vitaminB1 || 0) * ratio * 100) / 100,
                    vitaminB2: Math.round((foodData.vitaminB2 || 0) * ratio * 100) / 100,
                    vitaminB6: Math.round((foodData.vitaminB6 || 0) * ratio * 100) / 100,
                    vitaminB12: Math.round((foodData.vitaminB12 || 0) * ratio * 100) / 100,
                    vitaminC: Math.round((foodData.vitaminC || 0) * ratio * 10) / 10,
                    vitaminD: Math.round((foodData.vitaminD || 0) * ratio * 100) / 100,
                    vitaminE: Math.round((foodData.vitaminE || 0) * ratio * 100) / 100,
                    calcium: Math.round((foodData.calcium || 0) * ratio),
                    iron: Math.round((foodData.iron || 0) * ratio * 10) / 10,
                    zinc: Math.round((foodData.zinc || 0) * ratio * 10) / 10,
                    magnesium: Math.round((foodData.magnesium || 0) * ratio),
                    isFromQuest: true
                };
                mealItems.push(mealItem);
                totalCalories += mealItem.calories;
            } else {
                // foodDatabaseに見つからない場合は名前だけ記録
                mealItems.push({
                    name: parsed.name,
                    amount: parsed.amount,
                    unit: parsed.unit,
                    isFromQuest: true
                });
            }
        }

        if (mealItems.length > 0) {
            // 食事タイプを判定（【食事N】のNから）
            const mealTypeMatch = item.text.match(/【食事(\d+)】/);
            const mealNumber = mealTypeMatch ? parseInt(mealTypeMatch[1]) : 1;
            const mealTypes = ['朝食', '昼食', '間食', '夕食', '夜食'];
            const mealType = mealTypes[Math.min(mealNumber - 1, mealTypes.length - 1)] || '食事';

            const newMeal = {
                id: `quest_meal_${Date.now()}`,
                type: mealType,
                items: mealItems,
                calories: totalCalories,
                timestamp: new Date().toISOString(),
                date: currentDate, // 選択中の日付を明示的に設定
                isFromQuest: true
            };

            console.log('[Quest] Creating meal with', mealItems.length, 'items for date:', currentDate);

            // 対象日付のレコードを取得（dailyRecordが古い可能性があるため）
            const targetRecord = await DataService.getDailyRecord(user.uid, currentDate);
            const baseRecord = targetRecord || { meals: [], workouts: [], supplements: [], conditions: null };

            const updatedMeals = [...(baseRecord.meals || []), newMeal];
            const updatedRecord = { ...baseRecord, meals: updatedMeals };
            setDailyRecord(updatedRecord);
            await DataService.saveDailyRecord(user.uid, currentDate, updatedRecord);
            toast.success(`${mealType}を記録しました（${mealItems.length}品目）`);
        }
    };

    // 運動クエストから自動記録
    const recordWorkoutFromQuest = async (item) => {
        const parsedItems = parseWorkoutItems(item.text);
        console.log('[Quest] Parsed workout items:', parsedItems, 'from text:', item.text);
        if (parsedItems.length === 0) return;

        const exercises = parsedItems.map(parsed => ({
            name: parsed.name,
            sets: parsed.sets || 1,
            reps: parsed.reps || 0,
            duration: parsed.duration || 0,
            isFromQuest: true
        }));

        const newWorkout = {
            id: `quest_workout_${Date.now()}`,
            type: '筋トレ',
            exercises,
            timestamp: new Date().toISOString(),
            date: currentDate, // 選択中の日付を明示的に設定
            isFromQuest: true
        };

        console.log('[Quest] Creating workout with', exercises.length, 'exercises for date:', currentDate);

        // 対象日付のレコードを取得（dailyRecordが古い可能性があるため）
        const targetRecord = await DataService.getDailyRecord(user.uid, currentDate);
        const baseRecord = targetRecord || { meals: [], workouts: [], supplements: [], conditions: null };

        const updatedWorkouts = [...(baseRecord.workouts || []), newWorkout];
        const updatedRecord = { ...baseRecord, workouts: updatedWorkouts };
        setDailyRecord(updatedRecord);
        await DataService.saveDailyRecord(user.uid, currentDate, updatedRecord);
        toast.success(`運動を記録しました（${exercises.length}種目）`);
    };

    // 睡眠クエストから自動記録
    const recordSleepFromQuest = async (item) => {
        // 睡眠時間を抽出（例: "8時間確保"）
        const match = item.text.match(/(\d+(?:\.\d+)?)\s*時間/);
        const hours = match ? parseFloat(match[1]) : 8;

        console.log('[Quest] Recording sleep:', hours, 'hours for date:', currentDate);

        // 対象日付のレコードを取得（dailyRecordが古い可能性があるため）
        const targetRecord = await DataService.getDailyRecord(user.uid, currentDate);
        const baseRecord = targetRecord || { meals: [], workouts: [], supplements: [], conditions: null };

        const updatedConditions = {
            ...(baseRecord.conditions || {}),
            sleepHours: hours,
            sleepQuality: 3, // デフォルト（普通）
            isFromQuest: true
        };

        const updatedRecord = { ...baseRecord, conditions: updatedConditions };
        setDailyRecord(updatedRecord);
        await DataService.saveDailyRecord(user.uid, currentDate, updatedRecord);
        toast.success('睡眠を記録しました');
    };

    // Premiumモーダル管理
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

    // 運動カードの展開状態
    const [expandedWorkouts, setExpandedWorkouts] = useState({});
    const [expandedMeals, setExpandedMeals] = useState({});

    // 食事と運動をデフォルトで展開
    useEffect(() => {
        if (dailyRecord?.meals) {
            const newExpandedMeals = {};
            dailyRecord.meals.forEach((meal, index) => {
                const key = meal.id || index;
                newExpandedMeals[key] = true;
            });
            setExpandedMeals(newExpandedMeals);
        }
        if (dailyRecord?.workouts) {
            const newExpandedWorkouts = {};
            dailyRecord.workouts.forEach((workout, index) => {
                const key = workout.id || index;
                newExpandedWorkouts[key] = true;
            });
            setExpandedWorkouts(newExpandedWorkouts);
        }
    }, [dailyRecord?.meals, dailyRecord?.workouts]);

    // 機能開放モーダル（1つのモーダルで3ページ）
    const [showFeatureUnlockModal, setShowFeatureUnlockModal] = useState(false);
    const [currentModalPage, setCurrentModalPage] = useState(1); // 1, 2, 3

    // Premium誘導モーダル
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    // テンプレート＋ルーティンTipモーダル
    const [showTemplateRoutineTip, setShowTemplateRoutineTip] = useState(false);

    // 採点基準説明モーダル
    const [showScoringGuideModal, setShowScoringGuideModal] = useState(false);

    // 詳細栄養素の使い方モーダル
    const [showDetailedNutrientsGuide, setShowDetailedNutrientsGuide] = useState(false);

    // ピンポイントカロリー設定モーダル
    const [showCalorieOverrideModal, setShowCalorieOverrideModal] = useState(false);
    const [customCalorieAdjustment, setCustomCalorieAdjustment] = useState('');
    // PFCデフォルト値をプロフィールから取得
    const defaultPFC = {
        P: profile?.proteinRatio || 30,
        F: profile?.fatRatioPercent || 25,
        C: profile?.carbRatio || 45
    };
    const [customPFC, setCustomPFC] = useState(defaultPFC);

    // 体脂肪率推定モーダル
    const [visualGuideModal, setVisualGuideModal] = useState({
        show: false,
        gender: profile?.gender || '男性',
        selectedLevel: 5
    });

    // 体組成の状態管理
    const [bodyComposition, setBodyComposition] = useState({
        weight: 0,
        bodyFatPercentage: 0
    });

    // 体組成入力中の一時的な値（文字列で保持）
    const [weightInput, setWeightInput] = useState('');
    const [bodyFatInput, setBodyFatInput] = useState('');

    // タブ管理（外部から制御可能）
    const [internalActiveTab, setInternalActiveTab] = useState('nutrition'); // 'nutrition', 'directive'
    const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;
    const setActiveTab = onActiveTabChange || setInternalActiveTab;

    // 今日の日付を取得
    const getTodayDate = () => {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    };

    // 今日のdailyRecordから体組成を読み込む（なければ前日→プロフィールの順で取得）
    useEffect(() => {
        let isMounted = true;

        const loadTodayBodyComposition = async () => {
            try {
                const todayDate = getTodayDate();
                let weight = 0;
                let bodyFat = 0;

                // 1. 今日のdailyRecordをチェック
                const todayRecord = await DataService.getDailyRecord(user.uid, todayDate);
                if (todayRecord?.bodyComposition?.weight && todayRecord?.bodyComposition?.bodyFatPercentage) {
                    weight = parseFloat(todayRecord.bodyComposition.weight) || 0;
                    bodyFat = parseFloat(todayRecord.bodyComposition.bodyFatPercentage) || 0;
                } else {
                    // 2. 前日のdailyRecordをチェック
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayDate = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
                    const yesterdayRecord = await DataService.getDailyRecord(user.uid, yesterdayDate);

                    if (yesterdayRecord?.bodyComposition?.weight && yesterdayRecord?.bodyComposition?.bodyFatPercentage) {
                        weight = parseFloat(yesterdayRecord.bodyComposition.weight) || 0;
                        bodyFat = parseFloat(yesterdayRecord.bodyComposition.bodyFatPercentage) || 0;
                    } else if (profile?.weight && profile?.bodyFatPercentage) {
                        // 3. プロフィールデータをチェック
                        weight = parseFloat(profile.weight) || 0;
                        bodyFat = parseFloat(profile.bodyFatPercentage) || 0;
                    }
                }

                if (isMounted && (weight > 0 || bodyFat > 0)) {
                    const bodyComp = {
                        weight: weight,
                        bodyFatPercentage: bodyFat
                    };
                    setBodyComposition(bodyComp);
                    // 入力フィールドの初期値も設定
                    setWeightInput(weight > 0 ? weight.toString() : '');
                    setBodyFatInput(bodyFat > 0 ? bodyFat.toString() : '');

                    // 前日またはプロフィールからフォールバックした場合、今日のdailyRecordにも保存
                    if (!todayRecord?.bodyComposition?.weight || !todayRecord?.bodyComposition?.bodyFatPercentage) {
                        const updatedRecord = {
                            ...todayRecord,
                            bodyComposition: bodyComp
                        };
                        await DataService.saveDailyRecord(user.uid, todayDate, updatedRecord);
                    }
                }
            } catch (error) {
                console.error('[Dashboard] Failed to load body composition:', error);
            }
        };
        if (user?.uid) {
            loadTodayBodyComposition();
        }

        return () => {
            isMounted = false;
        };
    }, [user?.uid, profile]);

    // micronutrientsを自動計算・保存
    useEffect(() => {
        const saveMicronutrients = async () => {
            if (!user?.uid || !currentDate || !dailyRecord || !profile) return;

            // meals が存在しない、または空の場合はスキップ
            if (!dailyRecord.meals || dailyRecord.meals.length === 0) return;

            try {
                // currentIntakeを計算（上記のcurrentIntakeと同じロジック）
                const intake = {
                    vitamins: {},
                    minerals: {}
                };

                dailyRecord.meals?.forEach(meal => {
                    meal.items?.forEach(item => {
                        const isCountUnit = ['本', '個', '杯', '枚', '錠'].some(u => (item.unit || '').includes(u));
                        const ratio = isCountUnit ? item.amount : item.amount / 100;

                        // ビタミン・ミネラルを集計
                        if (item.vitamins) {
                            Object.keys(item.vitamins).forEach(v => {
                                intake.vitamins[v] = (intake.vitamins[v] || 0) + ((item.vitamins[v] || 0) * ratio);
                            });
                        }
                        if (item.minerals) {
                            Object.keys(item.minerals).forEach(m => {
                                intake.minerals[m] = (intake.minerals[m] || 0) + ((item.minerals[m] || 0) * ratio);
                            });
                        }

                        // 個別キー形式のビタミン
                        const vitaminKeys = ['vitaminA', 'vitaminB1', 'vitaminB2', 'vitaminB6', 'vitaminB12', 'vitaminC', 'vitaminD', 'vitaminE', 'vitaminK', 'niacin', 'pantothenicAcid', 'biotin', 'folicAcid', 'folate'];
                        vitaminKeys.forEach(key => {
                            if (item[key] !== undefined && item[key] !== 0) {
                                // folateはfolicAcidとして集計（データベースでプロパティ名が混在しているため）
                                const targetKey = (key === 'folate') ? 'folicAcid' : key;
                                intake.vitamins[targetKey] = (intake.vitamins[targetKey] || 0) + ((item[key] || 0) * ratio);
                            }
                        });

                        // 個別キー形式のミネラル
                        const mineralKeys = ['sodium', 'potassium', 'calcium', 'magnesium', 'phosphorus', 'iron', 'zinc', 'copper', 'manganese', 'iodine', 'selenium', 'chromium', 'molybdenum'];
                        mineralKeys.forEach(key => {
                            if (item[key] !== undefined && item[key] !== 0) {
                                intake.minerals[key] = (intake.minerals[key] || 0) + ((item[key] || 0) * ratio);
                            }
                        });
                    });
                });

                // 目標値を取得
                const targets = LBMUtils.calculatePersonalizedMicronutrients(profile);

                // micronutrientsオブジェクトを作成
                const micronutrients = {};

                // ビタミンの集計値と目標値を保存
                Object.keys(intake.vitamins).forEach(v => {
                    const key = v.startsWith('vitamin') ? v : `vitamin${v}`;
                    micronutrients[key] = intake.vitamins[v];
                    micronutrients[`${key}Target`] = targets[key] || 0;
                });

                // ミネラルの集計値と目標値を保存
                Object.keys(intake.minerals).forEach(m => {
                    micronutrients[m] = intake.minerals[m];
                    micronutrients[`${m}Target`] = targets[m] || 0;
                });

                // 既存のmicronutrientsと変更がない場合は保存しない
                const existingMicro = JSON.stringify(dailyRecord.micronutrients || {});
                const newMicro = JSON.stringify(micronutrients);
                if (existingMicro === newMicro) return;

                // Firestoreから最新データを取得してmicronutrientsのみ更新
                const latestRecord = await DataService.getDailyRecord(user.uid, currentDate);
                const updatedRecord = {
                    ...latestRecord,
                    micronutrients: micronutrients
                };

                await DataService.saveDailyRecord(user.uid, currentDate, updatedRecord);
            } catch (error) {
                console.error('[Dashboard] micronutrients保存エラー:', error);
            }
        };

        saveMicronutrients();
    }, [dailyRecord?.meals, user?.uid, currentDate, profile]);

    // recordUpdatedイベントを監視して自動リロード
    useEffect(() => {

        const handleRecordUpdate = async (event) => {
            if (user?.uid && currentDate) {
                try {
                    const record = await DataService.getDailyRecord(user.uid, currentDate);
                    setDailyRecord(record);
                } catch (error) {
                    console.error('[Dashboard] データ再読み込みエラー:', error);
                }
            }
        };

        window.addEventListener('recordUpdated', handleRecordUpdate);

        return () => {
            window.removeEventListener('recordUpdated', handleRecordUpdate);
        };
    }, [user?.uid, currentDate]);

    // 体組成を更新する共通ハンドラー
    const updateBodyComposition = async (newWeight, newBodyFat) => {
        const updated = {
            weight: newWeight,
            bodyFatPercentage: newBodyFat
        };
        setBodyComposition(updated);

        // dailyRecordに保存
        try {
            const todayDate = getTodayDate();
            const currentRecord = await DataService.getDailyRecord(user.uid, todayDate) || {};
            const updatedRecord = {
                ...currentRecord,
                bodyComposition: updated
            };
            await DataService.saveDailyRecord(user.uid, todayDate, updatedRecord);
            setDailyRecord(updatedRecord);

            // userProfileも更新（推奨量の再計算のため）
            if (profile && setUserProfile) {
                const newLBM = LBMUtils.calculateLBM(newWeight, newBodyFat);
                const updatedProfile = {
                    ...profile,
                    weight: newWeight,
                    bodyFatPercentage: newBodyFat,
                    leanBodyMass: newLBM,
                    featuresCompleted: profile.featuresCompleted || {} // 機能開放状態を保持
                };
                setUserProfile(updatedProfile);
                // Firestoreにも保存
                await DataService.saveUserProfile(user.uid, updatedProfile);
            }
        } catch (error) {
            console.error('[Dashboard] Failed to save body composition to dailyRecord:', error);
        }
    };

    // ピンポイントカロリー設定を適用（プリセット or カスタム）
    const applyCalorieOverride = async (name, adjustment, pfcOverride = null) => {
        if (!user?.uid || !currentDate) return;

        try {
            const calorieOverride = {
                templateName: name,
                appliedAt: new Date().toISOString()
            };

            // カロリー調整がある場合のみ追加（undefinedの場合は目的ベースの調整を維持）
            if (adjustment !== undefined) {
                calorieOverride.calorieAdjustment = adjustment;
            }

            // PFCオーバーライドがある場合は追加
            if (pfcOverride) {
                calorieOverride.pfcOverride = pfcOverride;
            }

            const updatedRecord = {
                ...dailyRecord,
                calorieOverride
            };

            setDailyRecord(updatedRecord);
            await DataService.saveDailyRecord(user.uid, currentDate, updatedRecord);

            let message = name;
            if (adjustment !== undefined && adjustment !== 0) {
                message += ` (${adjustment > 0 ? '+' : ''}${adjustment}kcal)`;
            } else if (adjustment === 0) {
                message += ' (±0kcal)';
            }
            if (pfcOverride) {
                message += ` [P${pfcOverride.P}:F${pfcOverride.F}:C${pfcOverride.C}]`;
            }
            toast.success(`${message} を適用しました`);

            setShowCalorieOverrideModal(false);
            setCustomCalorieAdjustment('');
            setCustomPFC(defaultPFC);
        } catch (error) {
            console.error('[Dashboard] Failed to apply calorie override:', error);
            toast.error('適用に失敗しました');
        }
    };

    // ピンポイントカロリー設定を解除
    const clearCalorieOverride = async () => {
        if (!user?.uid || !currentDate) return;

        try {
            const updatedRecord = { ...dailyRecord };
            delete updatedRecord.calorieOverride;

            setDailyRecord(updatedRecord);
            await DataService.saveDailyRecord(user.uid, currentDate, updatedRecord);
            toast.success('カロリー設定を解除しました');
        } catch (error) {
            console.error('[Dashboard] Failed to clear calorie override:', error);
            toast.error('解除に失敗しました');
        }
    };

    // 機能開放モーダルのフラグをチェック（初回分析完了後に一度だけ表示）
    useEffect(() => {
        let isMounted = true;
        let timeoutId = null;

        const checkAndShowModal = () => {
            const shouldShow = localStorage.getItem('showFeatureUnlockModals');
            if (shouldShow === 'true') {
                timeoutId = setTimeout(() => {
                    if (isMounted) {
                        setCurrentModalPage(1); // ページ1から開始
                        setShowFeatureUnlockModal(true);
                        localStorage.removeItem('showFeatureUnlockModals');
                    }
                }, 300); // 少し遅延させてスムーズに表示
            }
        };

        // 初回マウント時にチェック
        checkAndShowModal();

        // カスタムイベントをリッスン（分析完了時に発火）
        const handleFeatureUnlock = () => {
            checkAndShowModal();
        };
        window.addEventListener('featureUnlockCompleted', handleFeatureUnlock);

        return () => {
            isMounted = false;
            if (timeoutId) clearTimeout(timeoutId);
            window.removeEventListener('featureUnlockCompleted', handleFeatureUnlock);
        };
    }, []); // 空の依存配列：コンポーネントマウント時に一度だけ実行

    // 新機能開放モーダル完了後、テンプレートTipモーダルを表示
    useEffect(() => {
        let isMounted = true;

        const checkModalFlags = () => {
            const featureUnlockCompleted = localStorage.getItem('featureUnlockModalsCompleted');
            const templateTipShown = localStorage.getItem('templateRoutineTipShown');

            // 機能開放完了後、テンプレートTipを表示（まだ表示していない場合）
            if (featureUnlockCompleted === 'true' && templateTipShown !== 'true' && isMounted) {
                setShowTemplateRoutineTip(true);
                localStorage.removeItem('featureUnlockModalsCompleted');
            }
        };

        // 初回チェック
        checkModalFlags();

        // 定期的にチェック（500ms間隔）
        const intervalId = setInterval(checkModalFlags, 500);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, []);

    // 経験値・レベル情報の状態管理
    const [expData, setExpData] = useState({
        level: 1,
        experience: 0,
        totalCredits: 0,
        freeCredits: 0,
        paidCredits: 0,
        expProgress: 0
    });

    // レベルアップモーダル
    const [showLevelUpModal, setShowLevelUpModal] = useState(false);
    const [levelUpData, setLevelUpData] = useState(null);

    // 経験値・レベル情報を読み込む関数
    const loadExperienceData = React.useCallback(async () => {
        if (!user) {
            console.log('[Dashboard] loadExperienceData: user is null, skipping');
            return;
        }
        try {
            console.log('[Dashboard] loadExperienceData: fetching for user', user.uid);
            const data = await ExperienceService.getUserExperience(user.uid);
            console.log('[Dashboard] loadExperienceData: data received', data);
            const expToNext = ExperienceService.getExpToNextLevel(data.level, data.experience);
            const progress = Math.round((expToNext.current / expToNext.required) * 100);

            // propsのprofileとExperienceServiceのデータを比較し、大きい方を採用
            // （キャッシュからの古いデータを防ぐため）
            const propsPaidCredits = profile?.paidCredits || 0;
            const dataPaidCredits = data.paidCredits || 0;
            const finalPaidCredits = Math.max(propsPaidCredits, dataPaidCredits);
            const finalFreeCredits = data.freeCredits || 0;

            console.log('[Dashboard] loadExperienceData: setting expData', { freeCredits: finalFreeCredits, paidCredits: finalPaidCredits });
            setExpData({
                level: data.level,
                experience: data.experience,
                totalCredits: finalFreeCredits + finalPaidCredits,
                freeCredits: finalFreeCredits,
                paidCredits: finalPaidCredits,
                expProgress: progress,
                expCurrent: expToNext.current,
                expRequired: expToNext.required
            });
        } catch (error) {
            console.error('[Dashboard] Failed to load experience data:', error);
        }
    }, [user, profile?.paidCredits]);

    // 指示書を読み込む関数（Firestoreから）
    const loadDirective = React.useCallback(async () => {
        if (!user) return;

        try {
            const today = currentDate || getTodayDate();
            const directiveDoc = await firebase.firestore()
                .collection('users')
                .doc(user.uid)
                .collection('directives')
                .doc(today)
                .get();

            if (directiveDoc.exists) {
                setTodayDirective(directiveDoc.data());
            } else {
                setTodayDirective(null);
            }
        } catch (error) {
            console.error('[Dashboard] Failed to load directive:', error);
            setTodayDirective(null);
        }
    }, [currentDate, user]);

    // 指示書を読み込む
    useEffect(() => {
        loadDirective();
        // directiveUpdatedイベントをリッスン
        window.addEventListener('directiveUpdated', loadDirective);
        return () => window.removeEventListener('directiveUpdated', loadDirective);
    }, [loadDirective]);

    // 経験値・レベル情報を読み込む
    useEffect(() => {
        let isMounted = true;

        const loadData = async () => {
            if (isMounted) {
                await loadExperienceData();
            }
        };

        loadData();

        // レベルアップイベントをリッスン
        const handleLevelUp = (event) => {
            if (isMounted) {
                setLevelUpData(event.detail);
                setShowLevelUpModal(true);
                loadExperienceData();
            }
        };
        // クレジット更新イベントをリッスン（写真解析などでクレジット消費時）
        const handleCreditUpdate = () => {
            if (isMounted) {
                loadExperienceData();
            }
        };
        window.addEventListener('levelUp', handleLevelUp);
        window.addEventListener('creditUpdated', handleCreditUpdate);
        return () => {
            isMounted = false;
            window.removeEventListener('levelUp', handleLevelUp);
            window.removeEventListener('creditUpdated', handleCreditUpdate);
        };
    }, [loadExperienceData]); // loadExperienceDataが更新されたら再読み込み

    // 指示書を完了にする
    const handleCompleteDirective = async () => {
        if (!todayDirective || !user) return;

        try {
            const updatedDirective = { ...todayDirective, completed: true };

            // Firestoreに保存
            await firebase.firestore()
                .collection('users')
                .doc(user.uid)
                .collection('directives')
                .doc(todayDirective.date)
                .set(updatedDirective, { merge: true });

            setTodayDirective(updatedDirective);

            // dailyRecordにも保存
            const updatedRecord = {
                ...dailyRecord,
                directiveCompleted: true
            };
            await DataService.saveDailyRecord(user.uid, currentDate, updatedRecord);
            setDailyRecord(updatedRecord);
        } catch (error) {
            console.error('[Dashboard] 指示書完了の保存エラー:', error);
        }

        // 経験値付与（1日1回のみ10XP）
        if (user) {
            try {
                const expResult = await ExperienceService.processDirectiveCompletion(user.uid, currentDate);
                if (expResult.success) {

                    // 経験値更新イベントを発火（レベルバナーをリアルタイム更新）
                    window.dispatchEvent(new CustomEvent('experienceUpdated', {
                        detail: {
                            experience: expResult.experience,
                            level: expResult.level
                        }
                    }));

                    // レベルアップ時の通知
                    if (expResult.leveledUp) {
                        window.dispatchEvent(new CustomEvent('levelUp', {
                            detail: {
                                level: expResult.level,
                                creditsEarned: expResult.creditsEarned,
                                milestoneReached: expResult.milestoneReached
                            }
                        }));
                    }
                } else if (expResult.alreadyProcessed) {
                }
            } catch (error) {
                console.error('[Dashboard] Failed to process directive completion:', error);
            }
        }
    };

    // 残り時間を計算
    const getTimeRemaining = (deadline) => {
        if (!deadline) return 'まもなく';
        const now = new Date();
        const end = new Date(deadline);
        const diff = end - now;
        if (diff < 0) return '期限切れ';
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours >= 24) {
            const days = Math.floor(hours / 24);
            return `あと${days}日`;
        }
        return `あと${hours}時間`;
    };

    // カテゴリーアイコンを取得
    const getCategoryIcon = (type) => {
        switch (type) {
            case 'meal': return 'Utensils';
            case 'exercise': return 'Dumbbell';
            case 'condition': return 'HeartPulse';
            default: return 'Target';
        }
    };

    // カテゴリーラベルを取得
    const getCategoryLabel = (type) => {
        switch (type) {
            case 'meal': return '食事';
            case 'exercise': return '運動';
            case 'condition': return 'コンディション';
            default: return '指示';
        }
    };

    // カテゴリー色を取得
    const getCategoryColor = (type) => {
        switch (type) {
            case 'meal': return { bg: 'bg-green-50', border: 'border-green-600', text: 'text-green-700', icon: 'text-green-600' };
            case 'exercise': return { bg: 'bg-orange-50', border: 'border-orange-600', text: 'text-orange-700', icon: 'text-orange-600' };
            case 'condition': return { bg: 'bg-red-50', border: 'border-red-600', text: 'text-red-700', icon: 'text-red-600' };
            default: return { bg: 'bg-gray-50', border: 'border-gray-600', text: 'text-gray-600', icon: 'text-gray-600' };
        }
    };

    // 予測入力を実行する関数
    const loadPredictedData = async () => {
        if (!yesterdayRecord) {
            toast('前日の記録がありません');
            return;
        }

        // 現在時刻を取得（HH:MM形式）
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        // 前日の記録を複製（IDと時刻は新しく生成）
        const copiedRecord = {
            meals: [
                ...(dailyRecord.meals?.filter(m => !m.isPredicted) || []),
                ...(yesterdayRecord.meals?.map(meal => ({
                    ...meal,
                    id: Date.now() + Math.random(),
                    time: currentTime, // 現在時刻に変更
                    isPredicted: true // 予測データであることを示すフラグ
                })) || [])
            ],
            workouts: [
                ...(dailyRecord.workouts?.filter(w => !w.isPredicted) || []),
                ...(yesterdayRecord.workouts?.map(workout => ({
                    ...workout,
                    id: Date.now() + Math.random(),
                    time: currentTime, // 現在時刻に変更
                    isPredicted: true
                })) || [])
            ],
            bodyComposition: yesterdayRecord.bodyComposition ? {
                ...yesterdayRecord.bodyComposition,
                isPredicted: true,
                time: currentTime
            } : dailyRecord.bodyComposition,
            conditions: yesterdayRecord.conditions ? {
                ...yesterdayRecord.conditions,
                isPredicted: true,
                time: currentTime
            } : dailyRecord.conditions
        };
        setDailyRecord(copiedRecord);

        // DBに保存して永続化
        const userId = user?.uid;
        await DataService.saveDailyRecord(userId, currentDate, copiedRecord);
    };

    // 現在の摂取量計算
    const currentIntake = {
        calories: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
        sugar: 0,
        fiber: 0,
        solubleFiber: 0,
        insolubleFiber: 0,
        saturatedFat: 0,
        mediumChainFat: 0,
        monounsaturatedFat: 0,
        polyunsaturatedFat: 0,
        vitamins: {
            vitaminA: 0, vitaminD: 0, vitaminE: 0, vitaminK: 0, vitaminB1: 0, vitaminB2: 0, niacin: 0, pantothenicAcid: 0, vitaminB6: 0, biotin: 0, folicAcid: 0, vitaminB12: 0, vitaminC: 0
        },
        minerals: {
            calcium: 0, iron: 0, magnesium: 0, phosphorus: 0, potassium: 0, sodium: 0, zinc: 0, copper: 0, manganese: 0, selenium: 0, iodine: 0, chromium: 0, molybdenum: 0
        }
    };

    // その他の栄養素を初期化
    currentIntake.otherNutrients = {};

    // DIAAS計算用（タンパク質量で重み付け平均を計算）
    let totalProteinWeightedDiaas = 0;
    let totalProteinAmount = 0;

    // GL値・GI値計算用
    let totalGL = 0;
    let totalCarbsFromHighGI = 0;  // GI値60以上の炭水化物
    let totalCarbsFromLowGI = 0;   // GI値60未満の炭水化物

    // 各食事ごとのGL値を保存
    const mealGLValues = [];

    dailyRecord.meals?.forEach(meal => {
        let mealGL = 0;
        let mealCarbs = 0;
        let mealProtein = 0;
        let mealFat = 0;
        let mealFiber = 0;
        currentIntake.calories += meal.calories || 0;
        meal.items?.forEach(item => {
            // 個数単位（本、個、杯、枚、錠）と重量単位（g、ml）でratio計算を分岐
            const isCountUnit = ['本', '個', '杯', '枚', '錠'].some(u => (item.unit || '').includes(u));
            const ratio = isCountUnit ? item.amount : item.amount / 100;

            const proteinAmount = (item.protein || 0) * ratio;
            currentIntake.protein += proteinAmount;

            // DIAASの重み付け平均を計算
            if (item.diaas && proteinAmount > 0) {
                totalProteinWeightedDiaas += item.diaas * proteinAmount;
                totalProteinAmount += proteinAmount;
            }

            // GL値とGI値内訳を計算
            const carbsAmount = (item.carbs || 0) * ratio;
            if (item.gi && carbsAmount > 0) {
                // GL値 = (GI値 × 炭水化物量) / 100
                const itemGL = (item.gi * carbsAmount) / 100;
                totalGL += itemGL;
                mealGL += itemGL; // 1食ごとのGL値に加算

                // GI値60以上と60未満で分類
                if (item.gi >= 60) {
                    totalCarbsFromHighGI += carbsAmount;
                } else {
                    totalCarbsFromLowGI += carbsAmount;
                }
            } else if (carbsAmount > 0) {
                // GI値がない場合は低GI扱い（炭水化物は存在）
                totalCarbsFromLowGI += carbsAmount;
            }

            currentIntake.fat += (item.fat || 0) * ratio;
            currentIntake.carbs += (item.carbs || 0) * ratio;

            // 1食ごとのPFC・食物繊維を集計
            mealCarbs += carbsAmount;
            mealProtein += proteinAmount;
            mealFat += (item.fat || 0) * ratio;
            mealFiber += (item.fiber || 0) * ratio;

            // 糖質・食物繊維・脂肪酸（SCALED to actual amount - ビタミン・ミネラルと同じ）
            // 糖質・食物繊維・脂肪酸（既に実量換算済み - ratioをかけない）
            currentIntake.sugar += (item.sugar || 0);
            currentIntake.fiber += (item.fiber || 0);
            currentIntake.solubleFiber += (item.solubleFiber || 0);
            currentIntake.insolubleFiber += (item.insolubleFiber || 0);
            currentIntake.saturatedFat += (item.saturatedFat || 0);
            currentIntake.mediumChainFat += (item.mediumChainFat || 0);
            currentIntake.monounsaturatedFat += (item.monounsaturatedFat || 0);
            currentIntake.polyunsaturatedFat += (item.polyunsaturatedFat || 0);


            // ビタミン・ミネラル（オブジェクト形式 - 既に実量換算済み）
            if (item.vitamins) {
                Object.keys(item.vitamins).forEach(v => {
                    currentIntake.vitamins[v] = (currentIntake.vitamins[v] || 0) + (item.vitamins[v] || 0);
                });
            }
            if (item.minerals) {
                Object.keys(item.minerals).forEach(m => {
                    currentIntake.minerals[m] = (currentIntake.minerals[m] || 0) + (item.minerals[m] || 0);
                });
            }

            // ビタミン・ミネラル（個別キー形式 - データベースから直接）
            const vitaminKeys = ['vitaminA', 'vitaminB1', 'vitaminB2', 'vitaminB6', 'vitaminB12', 'vitaminC', 'vitaminD', 'vitaminE', 'vitaminK', 'niacin', 'pantothenicAcid', 'biotin', 'folicAcid', 'folate'];
            vitaminKeys.forEach(key => {
                if (item[key] !== undefined && item[key] !== 0) {
                    // folateはfolicAcidとして集計（データベースでプロパティ名が混在しているため）
                    const targetKey = (key === 'folate') ? 'folicAcid' : key;
                    const value = (item[key] || 0) * ratio;
                    currentIntake.vitamins[targetKey] = (currentIntake.vitamins[targetKey] || 0) + value;
                }
            });

            const mineralKeys = ['sodium', 'potassium', 'calcium', 'magnesium', 'phosphorus', 'iron', 'zinc', 'copper', 'manganese', 'iodine', 'selenium', 'chromium', 'molybdenum'];
            mineralKeys.forEach(key => {
                if (item[key] !== undefined && item[key] !== 0) {
                    currentIntake.minerals[key] = (currentIntake.minerals[key] || 0) + ((item[key] || 0) * ratio);
                }
            });

            if (item.otherNutrients) {
                // 配列形式の場合
                if (Array.isArray(item.otherNutrients)) {
                    item.otherNutrients.forEach(nutrient => {
                        if (nutrient.name && nutrient.amount !== undefined) {
                            if (!currentIntake.otherNutrients[nutrient.name]) {
                                currentIntake.otherNutrients[nutrient.name] = {
                                    amount: 0,
                                    unit: nutrient.unit || 'mg'
                                };
                            }
                            currentIntake.otherNutrients[nutrient.name].amount += Number(nutrient.amount) || 0;
                        }
                    });
                } else {
                    // オブジェクト形式の場合（既存データとの互換性）
                    Object.keys(item.otherNutrients).forEach(o => {
                        currentIntake.otherNutrients[o] = (currentIntake.otherNutrients[o] || 0) + (item.otherNutrients[o] || 0);
                    });
                }
            }
        });

        // 1食ごとのGL値評価（PFC・食物繊維による段階的補正）
        let mealGLReductionPercent = 0;

        // タンパク質補正（段階的：0g→0%, 10g→5%, 20g以上→10%）
        const mealProteinReduction = Math.floor(Math.min(10, (mealProtein / 20) * 10) * 10) / 10;
        if (mealProteinReduction > 0) {
            mealGLReductionPercent += mealProteinReduction;
        }

        // 脂質補正（段階的：0g→0%, 5g→5%, 10g以上→10%）
        const mealFatReduction = Math.floor(Math.min(10, (mealFat / 10) * 10) * 10) / 10;
        if (mealFatReduction > 0) {
            mealGLReductionPercent += mealFatReduction;
        }

        // 食物繊維補正（段階的：0g→0%, 2.5g→7.5%, 5g以上→15%）
        const mealFiberReduction = Math.floor(Math.min(15, (mealFiber / 5) * 15) * 10) / 10;
        if (mealFiberReduction > 0) {
            mealGLReductionPercent += mealFiberReduction;
        }

        // 補正後のGL値
        const adjustedMealGL = Math.max(0, mealGL * (1 - mealGLReductionPercent / 100));

        // 1食ごとのGL値を保存（評価は後で動的上限計算後に実施）
        mealGLValues.push({
            mealId: meal.id || meal.timestamp,
            rawGL: mealGL,
            adjustedGL: adjustedMealGL,
            rating: '', // 後で設定
            badgeColor: '', // 後で設定
            reductionPercent: mealGLReductionPercent,
            isPostWorkout: meal.isPostWorkout || false
        });
    });

    // 平均DIAASを計算
    const averageDiaas = totalProteinAmount > 0 ? totalProteinWeightedDiaas / totalProteinAmount : 0;
    currentIntake.averageDiaas = averageDiaas;

    // GL値とGI値内訳を保存
    currentIntake.totalGL = totalGL;
    currentIntake.highGICarbs = totalCarbsFromHighGI;
    currentIntake.lowGICarbs = totalCarbsFromLowGI;
    const totalCarbs = totalCarbsFromHighGI + totalCarbsFromLowGI;
    currentIntake.highGIPercent = totalCarbs > 0 ? (totalCarbsFromHighGI / totalCarbs) * 100 : 0;
    currentIntake.lowGIPercent = totalCarbs > 0 ? (totalCarbsFromLowGI / totalCarbs) * 100 : 0;


    // 1日合計の補正後GL値を計算（各食事の補正後GL値を合計）
    const adjustedDailyGL = mealGLValues.reduce((sum, meal) => sum + meal.adjustedGL, 0);
    currentIntake.adjustedDailyGL = adjustedDailyGL;

    // 血糖管理スコアの計算（PFC・食物繊維による段階的補正）
    let glReductionPercent = 0;
    const glModifiers = [];

    // タンパク質補正（段階的：0g→0%, 10g→5%, 20g以上→10%）
    const proteinReduction = Math.floor(Math.min(10, (currentIntake.protein / 20) * 10) * 10) / 10;
    if (proteinReduction > 0) {
        glReductionPercent += proteinReduction;
        glModifiers.push({ label: 'タンパク質', value: -proteinReduction });
    }

    // 脂質補正（段階的：0g→0%, 5g→5%, 10g以上→10%）
    const fatReduction = Math.floor(Math.min(10, (currentIntake.fat / 10) * 10) * 10) / 10;
    if (fatReduction > 0) {
        glReductionPercent += fatReduction;
        glModifiers.push({ label: '脂質', value: -fatReduction });
    }

    // 食物繊維補正（段階的：0g→0%, 2.5g→7.5%, 5g以上→15%）
    const fiberReduction = Math.floor(Math.min(15, (currentIntake.fiber / 5) * 15) * 10) / 10;
    if (fiberReduction > 0) {
        glReductionPercent += fiberReduction;
        glModifiers.push({ label: '食物繊維', value: -fiberReduction });
    }

    // 実質GL値を計算
    const adjustedGL = totalGL * (1 - glReductionPercent / 100);
    currentIntake.adjustedGL = adjustedGL;
    currentIntake.glReductionPercent = glReductionPercent;
    currentIntake.glModifiers = glModifiers;

    // 動的GL上限の計算（目標炭水化物量 × 0.60）
    // GI 60を基準とした平均GI値を維持する目標
    const dynamicGLLimit = Math.round(targetPFC.carbs * 0.60);
    currentIntake.dynamicGLLimit = dynamicGLLimit;

    // 1食あたりの動的GL上限と絶対GL上限
    // 想定食事回数（プロフィールから取得、デフォルト4回）
    const mealsPerDay = profile?.mealsPerDay || 5;

    // 1食あたりの動的GL上限（目標達成のための理想値）
    const mealDynamicGLLimit = Math.round(dynamicGLLimit / mealsPerDay);

    // 1食あたりの絶対GL上限（体脂肪蓄積リスクの警告値）
    // ライフスタイルに応じて設定
    const lifestyle = profile?.lifestyle || '一般';
    const bodymakerStyles = ['筋肥大', '筋力', '持久力', 'バランス', 'ボディメイカー'];
    const isBodymaker = bodymakerStyles.includes(lifestyle);
    const mealAbsoluteGLLimit = isBodymaker ? 70 : 40;

    currentIntake.mealDynamicGLLimit = mealDynamicGLLimit;
    currentIntake.mealAbsoluteGLLimit = mealAbsoluteGLLimit;
    currentIntake.mealsPerDay = mealsPerDay;

    // 各食事のGL評価を設定（3段階評価：動的上限 + 絶対上限）
    mealGLValues.forEach(mealGLData => {
        const adjustedMealGL = mealGLData.adjustedGL;
        let mealGLRating = '';
        let mealGLBadgeColor = '';

        // 3段階評価
        if (adjustedMealGL <= mealDynamicGLLimit) {
            // 優秀: 動的上限以下
            mealGLRating = '低GL';
            mealGLBadgeColor = 'bg-green-600';
        } else if (adjustedMealGL <= mealAbsoluteGLLimit) {
            // 良好: 動的上限超過、絶対上限以下
            mealGLRating = '中GL';
            mealGLBadgeColor = 'bg-yellow-600';
        } else {
            // 要改善: 絶対上限超過（体脂肪蓄積リスク）
            mealGLRating = '高GL';
            mealGLBadgeColor = 'bg-red-600';
        }

        // 運動後の高GL: 推奨表示
        if (mealGLData.isPostWorkout && adjustedMealGL > mealAbsoluteGLLimit) {
            mealGLRating = '高GL（推奨）';
            mealGLBadgeColor = 'bg-orange-600';
        }

        mealGLData.rating = mealGLRating;
        mealGLData.badgeColor = mealGLBadgeColor;
    });

    // 1日合計GL値の評価（動的上限ベース）
    // 優秀: <80%, 良好: 80-100%, 普通: 100-120%, 要改善: 120%+ または未記録
    let bloodSugarScore = 2; // デフォルトは要改善
    let bloodSugarRating = '★★☆☆☆';
    let bloodSugarLabel = '要改善';

    if (adjustedGL > 0) {
        const glRatio = adjustedGL / dynamicGLLimit;

        if (glRatio >= 1.20) {
            bloodSugarScore = 2;
            bloodSugarRating = '★★☆☆☆';
            bloodSugarLabel = '要改善';
        } else if (glRatio >= 1.00) {
            bloodSugarScore = 3;
            bloodSugarRating = '★★★☆☆';
            bloodSugarLabel = '普通';
        } else if (glRatio >= 0.80) {
            bloodSugarScore = 4;
            bloodSugarRating = '★★★★☆';
            bloodSugarLabel = '良好';
        } else {
            bloodSugarScore = 5;
            bloodSugarRating = '★★★★★';
            bloodSugarLabel = '優秀';
        }
    }

    currentIntake.bloodSugarScore = bloodSugarScore;
    currentIntake.bloodSugarRating = bloodSugarRating;
    currentIntake.bloodSugarLabel = bloodSugarLabel;

    // 脂肪酸バランススコア（理想: 飽和3:中鎖0.5:一価4:多価3）
    const totalFat = currentIntake.saturatedFat + currentIntake.mediumChainFat + currentIntake.monounsaturatedFat + currentIntake.polyunsaturatedFat;
    let fattyAcidScore = 2; // デフォルトは要改善
    let fattyAcidRating = '★★☆☆☆';
    let fattyAcidLabel = '要改善';

    if (totalFat > 0) {
        const saturatedPercent = (currentIntake.saturatedFat / totalFat) * 100;
        const mediumChainPercent = (currentIntake.mediumChainFat / totalFat) * 100;
        const monounsaturatedPercent = (currentIntake.monounsaturatedFat / totalFat) * 100;
        const polyunsaturatedPercent = (currentIntake.polyunsaturatedFat / totalFat) * 100;

        // 理想: 飽和30%, 中鎖5%, 一価40%, 多価25%
        // 飽和脂肪酸が40%以上または20%未満は要改善
        // 一価不飽和が50%以上または30%未満は要改善
        if (saturatedPercent >= 40 || saturatedPercent < 20 || monounsaturatedPercent >= 50 || monounsaturatedPercent < 30) {
            fattyAcidScore = 2;
            fattyAcidRating = '★★☆☆☆';
            fattyAcidLabel = '要改善';
        } else if (saturatedPercent >= 35 || saturatedPercent < 25 || monounsaturatedPercent >= 45 || monounsaturatedPercent < 35) {
            fattyAcidScore = 4;
            fattyAcidRating = '★★★★☆';
            fattyAcidLabel = '良好';
        } else {
            fattyAcidScore = 5;
            fattyAcidRating = '★★★★★';
            fattyAcidLabel = '優秀';
        }
    }

    currentIntake.fattyAcidScore = fattyAcidScore;
    currentIntake.fattyAcidRating = fattyAcidRating;
    currentIntake.fattyAcidLabel = fattyAcidLabel;

    // 糖質・食物繊維バランススコア
    const totalCarbAndFiber = currentIntake.carbs + currentIntake.fiber;
    let carbFiberScore = 2; // デフォルトは要改善
    let carbFiberRating = '★★☆☆☆';
    let carbFiberLabel = '要改善';

    if (totalCarbAndFiber > 0) {
        const carbsPercent = (currentIntake.carbs / totalCarbAndFiber) * 100;
        const fiberPercent = (currentIntake.fiber / totalCarbAndFiber) * 100;

        // 理想: 糖質と食物繊維の比率が近いほど良好
        // 食物繊維が5%未満は要改善、5-10%は良好、10%以上は優秀
        if (fiberPercent < 5) {
            carbFiberScore = 2;
            carbFiberRating = '★★☆☆☆';
            carbFiberLabel = '要改善';
        } else if (fiberPercent < 10) {
            carbFiberScore = 4;
            carbFiberRating = '★★★★☆';
            carbFiberLabel = '良好';
        } else {
            carbFiberScore = 5;
            carbFiberRating = '★★★★★';
            carbFiberLabel = '優秀';
        }
    }

    currentIntake.carbFiberScore = carbFiberScore;
    currentIntake.carbFiberRating = carbFiberRating;
    currentIntake.carbFiberLabel = carbFiberLabel;

    // サプリメントは食事に統合されたため、この処理は不要

    // カロリー収支計算
    const caloriesPercent = (currentIntake.calories / targetPFC.calories) * 100;
    const proteinPercent = (currentIntake.protein / targetPFC.protein) * 100;

    // 今日かどうかのチェック（タイトル表示用）
    const isToday = () => {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        return currentDate === todayStr;
    };

    return (
        <div className="space-y-4">

            {/* タブ式サマリー */}
            <div className="bg-white rounded-xl shadow-sm p-6 slide-up border-2 border-gray-200">
                {/* タブナビゲーション */}
                <div className="flex border-b mb-4">
                    <button
                        onClick={() => setActiveTab('nutrition')}
                        className={`flex-1 py-3 px-2 text-sm font-bold ${activeTab === 'nutrition' ? 'border-b-2' : 'text-gray-600 hover:text-gray-600 hover:bg-gray-50'}`}
                        style={activeTab === 'nutrition' ? {color: '#4A9EFF', borderColor: '#4A9EFF', backgroundColor: '#EFF6FF'} : {}}
                    >
                        <div className="flex items-center justify-center gap-1">
                            <Icon name="BarChart3" size={16} />
                            <span>サマリー</span>
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('directive')}
                        className={`flex-1 py-3 px-2 text-sm font-bold ${activeTab === 'directive' ? 'border-b-2' : 'text-gray-600 hover:text-gray-600 hover:bg-gray-50'}`}
                        style={activeTab === 'directive' ? {color: '#4A9EFF', borderColor: '#4A9EFF', backgroundColor: '#EFF6FF'} : {}}
                    >
                        <div className="flex items-center justify-center gap-1">
                            <Icon name="ClipboardList" size={16} />
                            <span>指示書</span>
                        </div>
                    </button>
                </div>

                {/* タブコンテンツ（栄養） */}
                {activeTab === 'nutrition' && (
                    <div>
                <div className="space-y-4">
                    {/* カロリー */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">カロリー</span>
                                {targetPFC.calorieOverride && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full flex items-center gap-1">
                                        <Icon name="Zap" size={10} />
                                        {targetPFC.calorieOverride.templateName}
                                        ({targetPFC.calorieOverride.calorieAdjustment !== 0
                                            ? `${targetPFC.calorieOverride.calorieAdjustment > 0 ? '+' : ''}${targetPFC.calorieOverride.calorieAdjustment}kcal`
                                            : '±0kcal'})
                                    </span>
                                )}
                            </div>
                            {targetPFC.calorieOverride ? (
                                <button
                                    onClick={clearCalorieOverride}
                                    className="text-[10px] px-2 py-1 text-orange-600 hover:bg-orange-50 rounded flex items-center gap-1"
                                >
                                    <Icon name="X" size={12} />
                                    解除
                                </button>
                            ) : (
                                <button
                                    onClick={() => setShowCalorieOverrideModal(true)}
                                    className="text-[10px] px-2 py-1 text-[#4A9EFF] hover:bg-blue-50 rounded flex items-center gap-1"
                                >
                                    <Icon name="Zap" size={12} />
                                    ピンポイント変更
                                </button>
                            )}
                        </div>
                        <div className="flex items-end gap-2 mb-2 justify-end">
                            <span className="text-2xl sm:text-3xl font-bold text-blue-600">{Math.round(currentIntake.calories)}</span>
                            <span className="text-lg text-gray-600">/</span>
                            <span className="text-lg text-gray-600">{targetPFC.calories} kcal</span>
                        </div>
                        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden shadow-md">
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(caloriesPercent, 100)}%`, background: 'linear-gradient(to right, #4A9EFF, #3b82f6)' }}
                            ></div>
                        </div>
                    </div>

                    {/* PFC */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <div className="text-sm text-gray-600 mb-2">タンパク質</div>
                            <div className="flex items-end gap-1 mb-2 justify-end">
                                <span className="text-2xl sm:text-3xl font-bold text-red-500">{Math.round(currentIntake.protein)}</span>
                                <span className="text-lg text-gray-600">/</span>
                                <span className="text-lg text-gray-600">{targetPFC.protein}g</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden shadow-md">
                                <div className="h-full bg-red-500" style={{ width: `${Math.min(proteinPercent, 100)}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-600 mb-2">脂質</div>
                            <div className="flex items-end gap-1 mb-2 justify-end">
                                <span className="text-2xl sm:text-3xl font-bold text-yellow-500">{Math.round(currentIntake.fat)}</span>
                                <span className="text-lg text-gray-600">/</span>
                                <span className="text-lg text-gray-600">{targetPFC.fat}g</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden shadow-md">
                                <div className="h-full bg-yellow-500" style={{ width: `${Math.min((currentIntake.fat / targetPFC.fat) * 100, 100)}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-600 mb-2">炭水化物</div>
                            <div className="flex items-end gap-1 mb-2 justify-end">
                                <span className="text-2xl sm:text-3xl font-bold text-green-500">{Math.round(currentIntake.carbs)}</span>
                                <span className="text-lg text-gray-600">/</span>
                                <span className="text-lg text-gray-600">{targetPFC.carbs}g</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden shadow-md">
                                <div className="h-full bg-green-500" style={{ width: `${Math.min((currentIntake.carbs / targetPFC.carbs) * 100, 100)}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 詳細栄養素（Premium専用） */}
                {(() => {
                    const isPremium = profile?.isPremium;
                    const isTrial = usageDays < 7;
                    const hasAccess = isPremium || isTrial;

                    if (!hasAccess) {
                        return (
                            <div className="mt-4 bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <Icon name="Lock" size={20} className="text-amber-600" />
                                    <h4 className="text-sm font-bold text-amber-900">詳細栄養素（Premium専用）</h4>
                                </div>
                                <p className="text-xs text-amber-800 mb-3">
                                    ビタミン・ミネラル・脂肪酸などの詳細な栄養素分析はPremium会員専用機能です。
                                </p>
                                <button
                                    onClick={() => setShowSubscriptionModal(true)}
                                    className="w-full bg-amber-500 text-white py-2 px-4 rounded-lg hover:bg-amber-600 transition font-bold text-sm"
                                >
                                    Premium会員になる
                                </button>
                            </div>
                        );
                    }

                    return (
                        <details className="mt-4">
                            <summary className="cursor-pointer text-sm font-medium flex items-center gap-2" style={{color: '#4A9EFF'}}>
                                <Icon name="ChevronDown" size={16} />
                                詳細栄養素＋
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setShowDetailedNutrientsGuide(true);
                                    }}
                                    className="ml-auto flex items-center"
                                    style={{ color: '#4A9EFF' }}
                                >
                                    <Icon name="HelpCircle" size={16} />
                                </button>
                            </summary>
                            <div className="mt-4 space-y-6">

                        {/* 三大栄養素の質 */}
                        <div>
                            <h4 className="text-sm font-bold mb-3 text-gray-800">
                                三大栄養素の質
                            </h4>

                            {/* タンパク質の質（DIAAS） */}
                            <div className="mb-4">
                                    <h5 className="text-xs font-semibold mb-2 text-gray-700">
                                        タンパク質の質
                                    </h5>
                                    <div className="bg-gray-50 p-3 rounded">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-gray-700">平均DIAAS</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-bold text-gray-900">
                                                    {currentIntake.averageDiaas.toFixed(2)}
                                                </span>
                                                <span className={`text-xs font-semibold px-2 py-1 rounded ${
                                                    currentIntake.averageDiaas >= 1.0
                                                        ? 'bg-green-100 text-green-700'
                                                        : currentIntake.averageDiaas >= 0.75
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : 'bg-red-100 text-red-700'
                                                }`}>
                                                    {currentIntake.averageDiaas >= 1.0
                                                        ? '優秀'
                                                        : currentIntake.averageDiaas >= 0.75
                                                        ? '良好'
                                                        : '要改善'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-500 mt-2">
                                            1.0以上で優秀なタンパク質源
                                        </div>
                                    </div>
                                </div>

                            {/* 脂肪酸バランス */}
                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h5 className="text-xs font-semibold text-gray-700">
                                        脂肪酸バランス
                                    </h5>
                                    <div className="flex items-center gap-2">
                                        <span className="text-base font-bold text-gray-900">
                                            {currentIntake.fattyAcidRating}
                                        </span>
                                        <span className={`text-xs font-semibold px-2 py-1 rounded ${
                                            currentIntake.fattyAcidScore >= 5
                                                ? 'bg-green-100 text-green-700'
                                                : currentIntake.fattyAcidScore >= 4
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-red-100 text-red-700'
                                        }`}>
                                            {currentIntake.fattyAcidLabel}
                                        </span>
                                    </div>
                                </div>

                                {/* 全体のバランスプログレスバー */}
                                <div className="bg-gray-50 p-3 rounded mb-3">
                                    <div className="text-xs font-medium text-gray-700 mb-2">バランス</div>
                                    <div className="h-4 bg-gray-200 rounded-full overflow-hidden flex">
                                        {(() => {
                                            const totalFat = currentIntake.saturatedFat + currentIntake.mediumChainFat + currentIntake.monounsaturatedFat + currentIntake.polyunsaturatedFat;
                                            if (totalFat === 0) return null;

                                            const saturatedPercent = (currentIntake.saturatedFat / totalFat) * 100;
                                            const mediumChainPercent = (currentIntake.mediumChainFat / totalFat) * 100;
                                            const monounsaturatedPercent = (currentIntake.monounsaturatedFat / totalFat) * 100;
                                            const polyunsaturatedPercent = (currentIntake.polyunsaturatedFat / totalFat) * 100;

                                            return (
                                                <>
                                                    {saturatedPercent > 0 && (
                                                        <div
                                                            className="bg-red-500 flex items-center justify-center text-white text-xs font-medium"
                                                            style={{ width: `${saturatedPercent}%` }}
                                                        >
                                                            {saturatedPercent >= 10 && `${Math.round(saturatedPercent)}%`}
                                                        </div>
                                                    )}
                                                    {mediumChainPercent > 0 && (
                                                        <div
                                                            className="bg-cyan-500 flex items-center justify-center text-white text-xs font-medium"
                                                            style={{ width: `${mediumChainPercent}%` }}
                                                        >
                                                            {mediumChainPercent >= 10 && `${Math.round(mediumChainPercent)}%`}
                                                        </div>
                                                    )}
                                                    {monounsaturatedPercent > 0 && (
                                                        <div
                                                            className="bg-yellow-500 flex items-center justify-center text-white text-xs font-medium"
                                                            style={{ width: `${monounsaturatedPercent}%` }}
                                                        >
                                                            {monounsaturatedPercent >= 10 && `${Math.round(monounsaturatedPercent)}%`}
                                                        </div>
                                                    )}
                                                    {polyunsaturatedPercent > 0 && (
                                                        <div
                                                            className="bg-blue-500 flex items-center justify-center text-white text-xs font-medium"
                                                            style={{ width: `${polyunsaturatedPercent}%` }}
                                                        >
                                                            {polyunsaturatedPercent >= 10 && `${Math.round(polyunsaturatedPercent)}%`}
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-600">
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 bg-red-500 rounded"></div>
                                            <span>飽和</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 bg-cyan-500 rounded"></div>
                                            <span>中鎖</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                                            <span>一価</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 bg-blue-500 rounded"></div>
                                            <span>多価</span>
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
                                        目標: 飽和30% / 中鎖5% / 一価40% / 多価25%
                                    </div>
                                </div>

                                {/* 詳細数値 */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {(() => {
                                        // 理想の脂肪酸比率: 飽和30% / 中鎖5% / 一価40% / 多価25%
                                        const totalFat = targetPFC.fat; // 推奨脂質量
                                        const idealRatios = {
                                            saturated: 0.30,
                                            mediumChain: 0.05,
                                            monounsaturated: 0.40,
                                            polyunsaturated: 0.25
                                        };

                                        const colorClasses = {
                                            'red': 'bg-gradient-to-r from-red-400 to-red-500',
                                            'cyan': 'bg-gradient-to-r from-cyan-400 to-cyan-500',
                                            'yellow': 'bg-gradient-to-r from-yellow-400 to-yellow-500',
                                            'blue': 'bg-gradient-to-r from-blue-400 to-blue-500'
                                        };

                                        return [
                                            {
                                                name: '飽和脂肪酸',
                                                color: 'red',
                                                current: currentIntake.saturatedFat,
                                                target: Math.round(totalFat * idealRatios.saturated * 10) / 10
                                            },
                                            {
                                                name: '中鎖脂肪酸（MCT）',
                                                color: 'cyan',
                                                current: currentIntake.mediumChainFat,
                                                target: Math.round(totalFat * idealRatios.mediumChain * 10) / 10
                                            },
                                            {
                                                name: '一価不飽和脂肪酸',
                                                color: 'yellow',
                                                current: currentIntake.monounsaturatedFat,
                                                target: Math.round(totalFat * idealRatios.monounsaturated * 10) / 10
                                            },
                                            {
                                                name: '多価不飽和脂肪酸',
                                                color: 'blue',
                                                current: currentIntake.polyunsaturatedFat,
                                                target: Math.round(totalFat * idealRatios.polyunsaturated * 10) / 10
                                            }
                                        ].map((item, idx) => {
                                            const percent = item.target ? (item.current / item.target) * 100 : 0;

                                            return (
                                                <div key={idx} className="bg-gray-50 p-2 rounded">
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="font-medium">
                                                            {item.name}
                                                        </span>
                                                        <span className="text-gray-600">
                                                            {Math.round(item.current * 10) / 10} / {item.target}g
                                                        </span>
                                                    </div>
                                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full ${colorClasses[item.color]} transition-all`}
                                                            style={{ width: `${Math.min(percent, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>

                            {/* 炭水化物の質（GL値） */}
                            <div className="mb-4">
                                    <h5 className="text-xs font-semibold mb-2 text-gray-700">
                                        炭水化物の質
                                    </h5>
                                    <div className="bg-gray-50 p-3 rounded space-y-3">
                                        {/* 1日合計GL値 */}
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-medium text-gray-700">1日合計GL値</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg font-bold text-gray-900">
                                                        {Math.round(currentIntake.adjustedDailyGL)} / {currentIntake.dynamicGLLimit}
                                                    </span>
                                                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                                                        currentIntake.bloodSugarScore >= 5
                                                            ? 'bg-green-100 text-green-700'
                                                            : currentIntake.bloodSugarScore >= 4
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : currentIntake.bloodSugarScore >= 3
                                                            ? 'bg-yellow-100 text-yellow-700'
                                                            : 'bg-red-100 text-red-700'
                                                    }`}>
                                                        {currentIntake.bloodSugarLabel}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                目標: {currentIntake.dynamicGLLimit}以下（目標炭水化物{Math.round(targetPFC.carbs)}g × GI 60基準）
                                            </div>

                                            {/* カロリー不足時のGL余裕アドバイス */}
                                            {currentIntake.calories < targetPFC.calories * 0.8 && currentIntake.adjustedDailyGL < currentIntake.dynamicGLLimit && (
                                                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                                                    <div className="flex items-start gap-1">
                                                        <Icon name="HelpCircle" size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                                                        <div className="text-blue-800">
                                                            <div className="font-semibold mb-1">カロリーが不足しています</div>
                                                            <div className="text-blue-700">
                                                                目標まで <span className="font-bold">{Math.round(targetPFC.calories - currentIntake.calories)}kcal</span> 不足しています。
                                                                GL値にはまだ余裕があるので、中GL以下の食事を追加しましょう。
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* 血糖管理スコア */}
                                        <div className="border-t pt-3">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm font-medium text-gray-700">血糖管理</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-base font-bold text-gray-900">
                                                        {currentIntake.bloodSugarRating}
                                                    </span>
                                                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                                                        currentIntake.bloodSugarScore >= 5
                                                            ? 'bg-green-100 text-green-700'
                                                            : currentIntake.bloodSugarScore >= 4
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : currentIntake.bloodSugarScore >= 3
                                                            ? 'bg-yellow-100 text-yellow-700'
                                                            : 'bg-red-100 text-red-700'
                                                    }`}>
                                                        {currentIntake.bloodSugarLabel}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* 補正要因 */}
                                            {currentIntake.glModifiers.length > 0 && (
                                                <div className="space-y-1 mb-2">
                                                    {currentIntake.glModifiers.map((modifier, idx) => (
                                                        <div key={idx} className="flex justify-between text-xs text-gray-600">
                                                            <span>✓ {modifier.label}</span>
                                                            <span className="text-green-600 font-medium">{modifier.value}%</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* 実質GL値 */}
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-600">実質GL値</span>
                                                <span className="font-bold text-green-700">
                                                    {Math.round(currentIntake.adjustedGL)}
                                                    <span className="text-gray-500 ml-1">
                                                        ({currentIntake.adjustedGL >= 20 ? '高' : currentIntake.adjustedGL >= 11 ? '中' : '低'}GL相当)
                                                    </span>
                                                </span>
                                            </div>
                                        </div>

                                        {/* GI値内訳 */}
                                        <div className="border-t pt-3">
                                            <div className="text-xs font-medium text-gray-700 mb-2">GI値内訳</div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-gray-600">GI 60以上</span>
                                                    <span className="font-medium text-red-600">
                                                        {Math.round(currentIntake.highGIPercent)}%
                                                    </span>
                                                </div>
                                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-red-400 to-red-500 transition-all"
                                                        style={{ width: `${currentIntake.highGIPercent}%` }}
                                                    />
                                                </div>
                                                <div className="flex justify-between text-xs mt-2">
                                                    <span className="text-gray-600">GI 60未満</span>
                                                    <span className="font-medium text-green-600">
                                                        {Math.round(currentIntake.lowGIPercent)}%
                                                    </span>
                                                </div>
                                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all"
                                                        style={{ width: `${currentIntake.lowGIPercent}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            {/* 糖質・食物繊維 */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <h5 className="text-xs font-semibold text-gray-700">
                                        糖質・食物繊維バランス
                                    </h5>
                                    <div className="flex items-center gap-2">
                                        <span className="text-base font-bold text-gray-900">
                                            {currentIntake.carbFiberRating}
                                        </span>
                                        <span className={`text-xs font-semibold px-2 py-1 rounded ${
                                            currentIntake.carbFiberScore >= 5
                                                ? 'bg-green-100 text-green-700'
                                                : currentIntake.carbFiberScore >= 4
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-red-100 text-red-700'
                                        }`}>
                                            {currentIntake.carbFiberLabel}
                                        </span>
                                    </div>
                                </div>

                                {/* 糖質/食物繊維バランスプログレスバー */}
                                {(currentIntake.carbs > 0 || currentIntake.fiber > 0) && (
                                    <div className="bg-gray-50 p-3 rounded mb-3">
                                        <div className="text-xs font-medium text-gray-700 mb-2">バランス</div>
                                        <div className="h-4 bg-gray-200 rounded-full overflow-hidden flex">
                                            {(() => {
                                                const totalCarbAndFiber = currentIntake.carbs + currentIntake.fiber;
                                                if (totalCarbAndFiber === 0) return null;

                                                const carbsPercent = (currentIntake.carbs / totalCarbAndFiber) * 100;
                                                const fiberPercent = (currentIntake.fiber / totalCarbAndFiber) * 100;

                                                return (
                                                    <>
                                                        {carbsPercent > 0 && (
                                                            <div
                                                                className="bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-medium"
                                                                style={{ width: `${carbsPercent}%` }}
                                                            >
                                                                {carbsPercent >= 10 && `${Math.round(carbsPercent)}%`}
                                                            </div>
                                                        )}
                                                        {fiberPercent > 0 && (
                                                            <div
                                                                className="bg-gradient-to-r from-green-400 to-green-500 flex items-center justify-center text-white text-xs font-medium"
                                                                style={{ width: `${fiberPercent}%` }}
                                                            >
                                                                {fiberPercent >= 10 && `${Math.round(fiberPercent)}%`}
                                                            </div>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-600">
                                            <div className="flex items-center gap-1">
                                                <div className="w-3 h-3 bg-gradient-to-r from-amber-400 to-orange-500 rounded"></div>
                                                <span>糖質</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-green-500 rounded"></div>
                                                <span>食物繊維</span>
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
                                            目標: 糖質{Math.round(currentIntake.sugar)}g / 食物繊維{Math.round(currentIntake.fiber)}g
                                        </div>
                                    </div>
                                )}

                                {/* 詳細数値 */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {(() => {
                                        const targets = LBMUtils.calculatePersonalizedMicronutrients(profile || {});
                                        const fiberTargets = targets.carbohydrateQuality || { fiber: 20, solubleFiber: 7, insolubleFiber: 13 };

                                        // 糖質の推奨量 = 炭水化物の推奨量 - 食物繊維の推奨量
                                        const sugarTarget = targetPFC.carbs - fiberTargets.fiber;

                                        return [
                                            {
                                                name: '糖質',
                                                icon: 'Cookie',
                                                color: 'amber',
                                                current: currentIntake.sugar,
                                                target: sugarTarget,
                                                unit: 'g'
                                            },
                                            {
                                                name: '食物繊維',
                                                icon: 'Wheat',
                                                color: 'green',
                                                current: currentIntake.fiber,
                                                target: fiberTargets.fiber,
                                                unit: 'g'
                                            },
                                            {
                                                name: '水溶性食物繊維',
                                                icon: 'Droplet',
                                                color: 'blue',
                                                current: currentIntake.solubleFiber,
                                                target: fiberTargets.solubleFiber,
                                                unit: 'g'
                                            },
                                            {
                                                name: '不溶性食物繊維',
                                                icon: 'Layers',
                                                color: 'teal',
                                                current: currentIntake.insolubleFiber,
                                                target: fiberTargets.insolubleFiber,
                                                unit: 'g'
                                            }
                                        ].map((item, idx) => {
                                            const percent = item.target ? (item.current / item.target) * 100 : 0;

                                            // 色のマッピング（Tailwindの動的クラス名問題を回避）
                                            const colorClasses = {
                                                'amber': 'bg-gradient-to-r from-amber-400 to-orange-500',
                                                'green': 'bg-gradient-to-r from-green-400 to-green-500',
                                                'blue': 'bg-gradient-to-r from-blue-400 to-blue-500',
                                                'teal': 'bg-gradient-to-r from-teal-400 to-emerald-500'
                                            };

                                            return (
                                                <div key={idx} className="bg-gray-50 p-2 rounded">
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="font-medium">
                                                            {item.name}
                                                        </span>
                                                        <span className="text-gray-600">
                                                            {Math.round(item.current * 10) / 10}{item.target ? ` / ${item.target}` : ''}{item.unit}
                                                        </span>
                                                    </div>
                                                    {item.target && (
                                                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full ${colorClasses[item.color]} transition-all`}
                                                                style={{ width: `${Math.min(percent, 100)}%` }}
                                                            />
                                                        </div>
                                                    )}
                                                    {item.note && (
                                                        <div className="text-xs text-gray-500 mt-1">{item.note}</div>
                                                    )}
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* ビタミン */}
                        <div>
                            <h4 className="text-sm font-bold mb-3 text-gray-800">
                                ビタミン
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {(() => {
                                    // 完全個別化基準値を取得
                                    const targets = LBMUtils.calculatePersonalizedMicronutrients(profile || {});
                                    const vitaminKeys = ['vitaminA', 'vitaminD', 'vitaminE', 'vitaminK', 'vitaminB1', 'vitaminB2', 'niacin', 'pantothenicAcid', 'vitaminB6', 'biotin', 'folicAcid', 'vitaminB12', 'vitaminC'];
                                    const vitaminLabels = {
                                        vitaminA: 'A', vitaminD: 'D', vitaminE: 'E', vitaminK: 'K',
                                        vitaminB1: 'B1', vitaminB2: 'B2', niacin: 'B3', pantothenicAcid: 'B5',
                                        vitaminB6: 'B6', biotin: 'B7', folicAcid: 'B9', vitaminB12: 'B12', vitaminC: 'C'
                                    };
                                    const vitaminUnits = {
                                        vitaminA: 'μg', vitaminD: 'μg', vitaminE: 'mg', vitaminK: 'μg',
                                        vitaminB1: 'mg', vitaminB2: 'mg', niacin: 'mg', pantothenicAcid: 'mg',
                                        vitaminB6: 'mg', biotin: 'μg', folicAcid: 'μg', vitaminB12: 'μg', vitaminC: 'mg'
                                    };
                                    return vitaminKeys.map((key) => {
                                        const target = targets[key] || 0;
                                        // カスタム栄養素がオブジェクト形式の場合の処理
                                        const rawValue = currentIntake.vitamins[key];
                                        let current = 0;
                                        if (typeof rawValue === 'object' && rawValue !== null && rawValue.amount !== undefined) {
                                            current = Number(rawValue.amount) || 0;
                                        } else {
                                            current = Number(rawValue) || 0;
                                        }
                                        const percent = target > 0 ? (current / target) * 100 : 0;

                                    return (
                                        <div key={key} className="bg-gray-50 p-2 rounded">
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="font-medium">ビタミン{vitaminLabels[key]}</span>
                                                <span className="text-gray-600">
                                                    {typeof current === 'number' ? current.toFixed(1) : 0} / {target}{vitaminUnits[key]}
                                                </span>
                                            </div>
                                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-orange-400 to-red-500 transition-all"
                                                    style={{ width: `${Math.min(percent, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                    });
                                })()}
                            </div>
                        </div>

                        {/* ミネラル */}
                        <div>
                            <h4 className="text-sm font-bold mb-3 text-gray-800">
                                ミネラル
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {(() => {
                                    // 完全個別化基準値を取得
                                    const targets = LBMUtils.calculatePersonalizedMicronutrients(profile || {});
                                    const mineralKeys = ['calcium', 'iron', 'magnesium', 'phosphorus', 'potassium', 'sodium', 'zinc', 'copper', 'manganese', 'selenium', 'iodine', 'chromium', 'molybdenum'];
                                    const mineralNames = {
                                        calcium: 'カルシウム', iron: '鉄', magnesium: 'マグネシウム',
                                        phosphorus: 'リン', potassium: 'カリウム', sodium: 'ナトリウム',
                                        zinc: '亜鉛', copper: '銅', manganese: 'マンガン',
                                        selenium: 'セレン', iodine: 'ヨウ素', chromium: 'クロム', molybdenum: 'モリブデン'
                                    };
                                    const mineralUnits = {
                                        calcium: 'mg', iron: 'mg', magnesium: 'mg',
                                        phosphorus: 'mg', potassium: 'mg', sodium: 'mg',
                                        zinc: 'mg', copper: 'mg', manganese: 'mg',
                                        selenium: 'μg', iodine: 'μg', chromium: 'μg', molybdenum: 'μg'
                                    };
                                    return mineralKeys.map((key) => {
                                        const target = targets[key] || 0;
                                        // カスタム栄養素がオブジェクト形式の場合の処理
                                        const rawValue = currentIntake.minerals[key];
                                        let current = 0;
                                        if (typeof rawValue === 'object' && rawValue !== null && rawValue.amount !== undefined) {
                                            current = Number(rawValue.amount) || 0;
                                        } else {
                                            current = Number(rawValue) || 0;
                                        }
                                        const percent = (current / target) * 100;

                                        // 基準上限値を超えているかチェック（ボディメイカーの場合）
                                        const baseLimit = targets.upperLimits?.base?.[key];
                                        const exceedsBaseLimit = baseLimit !== null && baseLimit !== undefined && current > baseLimit;
                                    return (
                                        <div key={key} className="bg-gray-50 p-2 rounded">
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="font-medium">{mineralNames[key]}</span>
                                                <span className={exceedsBaseLimit ? "text-red-600 font-bold" : "text-gray-600"}>
                                                    {typeof current === 'number' ? current.toFixed(1) : 0} / {target}{mineralUnits[key]}
                                                    {exceedsBaseLimit && <span className="ml-1" title="基準上限値を超えています">⚠️</span>}
                                                </span>
                                            </div>
                                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-purple-400 to-pink-500 transition-all"
                                                    style={{ width: `${Math.min(percent, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                    });
                                })()}
                            </div>
                        </div>

                        {/* その他の栄養素 */}
                        {Object.keys(currentIntake.otherNutrients || {}).length > 0 && (
                            <div>
                                <h4 className="text-sm font-bold mb-3 text-gray-800">
                                    その他の栄養素
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {(() => {
                                        // 完全個別化基準値を取得
                                        const targets = LBMUtils.calculatePersonalizedMicronutrients(profile || {});
                                        const nutrientNames = {
                                            caffeine: 'カフェイン', catechin: 'カテキン', tannin: 'タンニン',
                                            polyphenol: 'ポリフェノール', chlorogenicAcid: 'クロロゲン酸',
                                            creatine: 'クレアチン', lArginine: 'L-アルギニン', lCarnitine: 'L-カルニチン',
                                            betaAlanine: 'βアラニン', citrulline: 'シトルリン',
                                            leucine: 'ロイシン', isoleucine: 'イソロイシン', valine: 'バリン',
                                            lysine: 'リジン', methionine: 'メチオニン', phenylalanine: 'フェニルアラニン',
                                            threonine: 'スレオニン', tryptophan: 'トリプトファン', histidine: 'ヒスチジン',
                                            EPA: 'EPA', DHA: 'DHA', coQ10: 'コエンザイムQ10',
                                            lutein: 'ルテイン', astaxanthin: 'アスタキサンチン'
                                        };
                                        return Object.entries(currentIntake.otherNutrients).map(([key, value]) => {
                                            // カスタム栄養素の場合（オブジェクト形式）
                                            if (typeof value === 'object' && value.amount !== undefined) {
                                                const numValue = Number(value.amount) || 0;
                                                const displayValue = numValue.toFixed(numValue < 1 ? 3 : 1);
                                                return (
                                                    <div key={key} className="bg-gray-50 p-2 rounded">
                                                        <div className="flex justify-between text-xs">
                                                            <span className="font-medium">{key}</span>
                                                            <span className="text-gray-600">
                                                                {displayValue}{value.unit || 'mg'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            // 既存の栄養素の場合（数値形式）
                                            // valueが数値でない場合はスキップ
                                            if (typeof value !== 'number' && typeof value !== 'string') {
                                                return null;
                                            }
                                            const target = targets.otherNutrients[key] || 100;
                                            const isGrams = key === 'creatine';
                                            const unit = isGrams ? 'g' : 'mg';
                                            const numValue = Number(value) || 0;
                                            const displayValue = isGrams ? (numValue / 1000).toFixed(2) : numValue.toFixed(1);
                                            const displayTarget = isGrams ? (target / 1000).toFixed(1) : target;
                                            const percent = (numValue / target) * 100;
                                            return (
                                                <div key={key} className="bg-gray-50 p-2 rounded">
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="font-medium">{nutrientNames[key] || key}</span>
                                                        <span className="text-gray-600">
                                                            {displayValue} / {displayTarget}{unit}
                                                        </span>
                                                    </div>
                                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-cyan-400 to-teal-500 transition-all"
                                                            style={{ width: `${Math.min(percent, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                        )}
                            </div>
                        </details>
                    );
                })()}

                {/* 運動サマリー */}
                {(() => {
                    const workouts = dailyRecord.workouts || [];

                    // 全運動（予測含む）の集計
                    let totalExercises = 0;
                    let totalSets = 0;
                    let warmupSets = 0;
                    let mainSets = 0;
                    let totalVolume = 0;
                    let totalTime = 0;

                    workouts.forEach(workout => {
                        workout.exercises?.forEach(exercise => {
                            totalExercises++;
                            const isCardioOrStretch = exercise.exerciseType === 'aerobic' || exercise.exerciseType === 'stretch';

                            if (exercise.sets) {
                                totalSets += exercise.sets.length;

                                // アップセットとメインセットの集計
                                exercise.sets.forEach(set => {
                                    if (set.setType === 'warmup') {
                                        warmupSets++;
                                    } else if (set.setType === 'main') {
                                        mainSets++;
                                    }
                                });
                            }

                            if (!isCardioOrStretch && exercise.sets) {
                                totalVolume += exercise.sets.reduce((sum, set) => {
                                    return sum + (set.weight || 0) * (set.reps || 0);
                                }, 0);
                            }

                            // 時間の集計（運動カードと同じロジック）
                            if (exercise.duration) {
                                totalTime += exercise.duration;
                            } else if (exercise.sets) {
                                exercise.sets.forEach(set => {
                                    totalTime += set.duration || 0;
                                });
                            }
                        });
                    });

                    return (
                        <details className="mt-4">
                            <summary className="cursor-pointer text-sm font-medium flex items-center gap-2" style={{color: '#4A9EFF'}}>
                                <Icon name="ChevronDown" size={16} />
                                運動＋
                            </summary>
                            <div className="mt-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="bg-gray-50 p-2 rounded">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="font-medium">総種目</span>
                                            <span>
                                                <span className="text-orange-600 font-semibold">{totalExercises}</span>
                                                <span className="text-gray-500"> 種目</span>
                                            </span>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 p-2 rounded">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="font-medium">総セット</span>
                                            <span>
                                                <span className="text-orange-600 font-semibold">{totalSets}</span>
                                                <span className="text-gray-500"> セット</span>
                                            </span>
                                        </div>
                                        {(warmupSets > 0 || mainSets > 0) && (
                                            <div className="text-xs text-gray-500 mt-1">
                                                アップ: {warmupSets} / メイン: {mainSets}
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-gray-50 p-2 rounded">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="font-medium">総重量</span>
                                            <span>
                                                <span className="text-orange-600 font-semibold">{Math.round(totalVolume).toLocaleString()}</span>
                                                <span className="text-gray-500"> kg</span>
                                            </span>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 p-2 rounded">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="font-medium">総時間</span>
                                            <span>
                                                <span className="text-orange-600 font-semibold">{totalTime}</span>
                                                <span className="text-gray-500"> 分</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </details>
                    );
                })()}
                </div>
                )}

                {/* タブコンテンツ（指示書/クエスト） */}
                {activeTab === 'directive' && (
                    <div id="directive-section">
                        {todayDirective ? (
                            (() => {
                                const items = parseDirectiveItems(todayDirective.message);
                                const completedItems = todayDirective.completedItems || {};
                                const completedCount = Object.values(completedItems).filter(Boolean).length;
                                const totalCount = items.length;

                                return (
                                    <>
                                        {/* クエストヘッダー */}
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center">
                                                <Icon name="Flag" size={20} className="text-white" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800">今日のクエスト</h3>
                                                <span className="text-sm text-gray-500">{completedCount} / {totalCount} 完了</span>
                                            </div>
                                        </div>

                                        {/* クエストアイテム一覧 */}
                                        <div className="bg-gray-900 rounded-2xl border-2 border-blue-500 p-4 mb-4 shadow-lg">
                                            <div className="space-y-2">
                                                {items.map((item, index) => {
                                                    const isCompleted = completedItems[index];
                                                    const iconName = item.type === 'meal' ? 'Utensils' :
                                                                    item.type === 'workout' ? 'Dumbbell' :
                                                                    item.type === 'sleep' ? 'Moon' : 'Target';
                                                    const iconColor = item.type === 'meal' ? 'text-orange-400' :
                                                                     item.type === 'workout' ? 'text-red-400' :
                                                                     item.type === 'sleep' ? 'text-purple-400' : 'text-blue-400';
                                                    const actionText = item.type === 'sleep' ? 'タップで完了' : 'タップで自動記録';

                                                    // 編集済みテキストがあれば表示
                                                    const displayText = todayDirective.editedTexts?.[index] || item.text;
                                                    const wasEdited = todayDirective.editedTexts?.[index] && todayDirective.editedTexts[index] !== item.text;

                                                    return (
                                                        <div
                                                            key={index}
                                                            className={`w-full p-3 rounded-xl flex items-start gap-3 transition-all ${
                                                                isCompleted
                                                                    ? 'bg-gray-800 border border-gray-700'
                                                                    : 'bg-gray-800 border border-gray-600'
                                                            }`}
                                                        >
                                                            {/* チェックアイコン（タップで完了） */}
                                                            <button
                                                                onClick={() => !isCompleted && handleQuestItemComplete(item, index)}
                                                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                                                                    isCompleted
                                                                        ? 'bg-green-500 border-green-500'
                                                                        : 'border-orange-400 hover:border-orange-300 hover:bg-orange-400/20'
                                                                }`}
                                                            >
                                                                {isCompleted && <Icon name="Check" size={14} className="text-white" />}
                                                            </button>

                                                            {/* アイコン */}
                                                            <Icon name={iconName} size={18} className={`${iconColor} flex-shrink-0 mt-0.5`} />

                                                            {/* テキスト */}
                                                            <div className="flex-1 text-left">
                                                                <p className={`text-sm ${isCompleted ? 'text-gray-500 line-through' : 'text-white'}`}>
                                                                    {displayText}
                                                                </p>
                                                                {!isCompleted && (
                                                                    <p className="text-xs text-orange-400 mt-1">{actionText}</p>
                                                                )}
                                                                {wasEdited && (
                                                                    <p className="text-xs text-blue-400 mt-1">（編集済み）</p>
                                                                )}
                                                            </div>

                                                            {/* 編集ボタン（未完了時のみ） */}
                                                            {!isCompleted && (
                                                                <button
                                                                    onClick={(e) => handleQuestEdit(item, index, e)}
                                                                    className="p-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 transition flex-shrink-0"
                                                                    title="編集して記録"
                                                                >
                                                                    <Icon name="Edit2" size={14} className="text-gray-300" />
                                                                </button>
                                                            )}

                                                            {/* 完了バッジ */}
                                                            {isCompleted && (
                                                                <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full flex-shrink-0">
                                                                    完了
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* ボタン */}
                                        <div className="flex items-center justify-center gap-2">
                                            {completedCount < totalCount ? (
                                                <button
                                                    onClick={handleCompleteAllQuests}
                                                    className="flex-1 bg-green-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                                                >
                                                    <Icon name="CheckCircle2" size={18} />
                                                    全て完了
                                                </button>
                                            ) : (
                                                <div className="flex-1 flex items-center justify-center gap-2 text-green-500 font-semibold py-3 bg-green-500/10 rounded-lg">
                                                    <Icon name="PartyPopper" size={18} />
                                                    全クエスト達成！
                                                </div>
                                            )}
                                        </div>

                                        {/* クエスト編集モーダル */}
                                        {editingQuest && (
                                            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                                                <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
                                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                                        <Icon name="Edit2" size={20} className="text-blue-500" />
                                                        クエストを編集して記録
                                                    </h3>
                                                    <p className="text-sm text-gray-500 mb-3">
                                                        量を調整して記録できます（例：130g → 100g）
                                                    </p>
                                                    <textarea
                                                        value={questEditText}
                                                        onChange={(e) => setQuestEditText(e.target.value)}
                                                        rows={3}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none resize-none mb-4"
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setEditingQuest(null);
                                                                setQuestEditText('');
                                                            }}
                                                            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                                                        >
                                                            キャンセル
                                                        </button>
                                                        <button
                                                            onClick={handleQuestEditSave}
                                                            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center justify-center gap-2"
                                                        >
                                                            <Icon name="Check" size={16} />
                                                            保存して完了
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                );
                            })()
                        ) : (
                            <div className="flex items-center justify-center gap-1 text-gray-400 py-4">
                                <p className="text-sm">今日の指示書がありません</p>
                                <button
                                    onClick={() => setInfoModal({
                                        show: true,
                                        title: '📋 指示書について',
                                        content: `【指示書とは】\nAI分析の結果から生成される、翌日の具体的な行動目標です。\n\n【生成タイミング】\n分析を実行すると、AIが記録データを分析して翌日の指示書を自動生成します。\n\n【使い方】\n1. 毎日の記録・分析を継続する\n2. 翌日、指示書を確認する\n3. 目標を意識して行動する\n4. 達成したら「完了」ボタンをタップ\n\n【編集機能】\n指示書の内容は自分で編集することも可能です。\n\n【ポイント】\n・具体的で達成可能な目標が設定されます\n・完了をタップすると達成記録が残ります\n・継続することで習慣化をサポートします`
                                    })}
                                    style={{color: '#4A9EFF'}}
                                >
                                    <Icon name="HelpCircle" size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 記録一覧 */}
            <div id="record-section" className="bg-white rounded-xl shadow-sm p-6 slide-up -mx-4 px-10">
                <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-lg font-bold">記録</h3>
                    <button
                        onClick={() => setInfoModal({
                            show: true,
                            title: '📝 記録について',
                            content: `【通常の記録】\n＋ボタンから、食事・運動・サプリメントを記録できます。記録した内容は即座にダッシュボードに反映されます。\n\n【予測ボタン】\n前日のデータから今日の食事・運動を自動的に予測して入力します。\n・青背景で表示されます\n・予測データは編集可能です\n・そのまま分析に使用できます\n・タップすると予測入力、再度タップでクリア\n\n【ルーティンボタン】\n設定したルーティンに紐づけたテンプレートを自動入力します。\n・紫背景で表示されます\n・ルーティンデータは編集可能です\n・そのまま分析に使用できます\n・タップするとルーティン入力、再度タップでクリア\n\n設定方法：設定 → 機能設定 → ルーティン設定 → 各日に食事・運動テンプレートを紐づけ`
                        })}
                        style={{color: '#4A9EFF'}}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#3b8fef'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#4A9EFF'}
                    >
                        <Icon name="HelpCircle" size={16} />
                    </button>
                    <div className="ml-auto flex gap-2">
                        {/* 予測入力ボタン（アイコンのみ） */}
                        {yesterdayRecord && (
                            <button
                                onClick={async () => {
                                    const hasPredicted = dailyRecord.meals?.some(m => m.isPredicted) ||
                                                         dailyRecord.workouts?.some(w => w.isPredicted) ||
                                                         dailyRecord.bodyComposition?.isPredicted ||
                                                         dailyRecord.conditions?.isPredicted;
                                    if (hasPredicted) {
                                        // クリア
                                        const clearedRecord = {
                                            ...dailyRecord,
                                            meals: dailyRecord.meals?.filter(m => !m.isPredicted) || [],
                                            workouts: dailyRecord.workouts?.filter(w => !w.isPredicted) || [],
                                            bodyComposition: dailyRecord.bodyComposition?.isPredicted ? {} : dailyRecord.bodyComposition,
                                            conditions: dailyRecord.conditions?.isPredicted ? {} : dailyRecord.conditions
                                        };
                                        setDailyRecord(clearedRecord);
                                        const userId = user?.uid;
                                        await DataService.saveDailyRecord(userId, currentDate, clearedRecord);
                                    } else {
                                        // 入力
                                        loadPredictedData();
                                    }
                                }}
                                className={`p-2 rounded-lg font-bold shadow-md hover:shadow-lg transition flex items-center gap-1 ${
                                    dailyRecord.meals?.some(m => m.isPredicted) ||
                                    dailyRecord.workouts?.some(w => w.isPredicted) ||
                                    dailyRecord.bodyComposition?.isPredicted ||
                                    dailyRecord.conditions?.isPredicted
                                        ? 'bg-red-600 text-white hover:bg-red-700'
                                        : 'bg-[#4A9EFF] text-white hover:bg-[#3b8fef]'
                                }`}
                                title={dailyRecord.meals?.some(m => m.isPredicted) ||
                                       dailyRecord.workouts?.some(w => w.isPredicted) ||
                                       dailyRecord.bodyComposition?.isPredicted ||
                                       dailyRecord.conditions?.isPredicted ? '予測入力をクリア' : '予測入力'}
                            >
                                {(dailyRecord.meals?.some(m => m.isPredicted) ||
                                  dailyRecord.workouts?.some(w => w.isPredicted) ||
                                  dailyRecord.bodyComposition?.isPredicted ||
                                  dailyRecord.conditions?.isPredicted) ? (
                                    <>
                                        <Icon name="X" size={18} />
                                        <span className="text-sm font-medium">予測</span>
                                    </>
                                ) : (
                                    <>
                                        <Icon name="Clock" size={18} />
                                        <span className="text-sm font-medium">予測</span>
                                    </>
                                )}
                            </button>
                        )}

                        {/* ルーティン入力ボタン（アイコンのみ） */}
                        {currentRoutine && (
                            <button
                                onClick={async () => {
                                    const hasRoutine = dailyRecord.meals?.some(m => m.isRoutine) || dailyRecord.workouts?.some(w => w.isRoutine);
                                    if (hasRoutine) {
                                        // クリア
                                        const clearedRecord = {
                                            ...dailyRecord,
                                            meals: dailyRecord.meals?.filter(m => !m.isRoutine) || [],
                                            workouts: dailyRecord.workouts?.filter(w => !w.isRoutine) || []
                                        };
                                        setDailyRecord(clearedRecord);
                                        const userId = user?.uid;
                                        await DataService.saveDailyRecord(userId, currentDate, clearedRecord);
                                    } else {
                                        // 入力
                                        if (onLoadRoutineData) {
                                            onLoadRoutineData();
                                        }
                                    }
                                }}
                                className={`p-2 rounded-lg font-bold shadow-md hover:shadow-lg transition flex items-center gap-1 ${
                                    dailyRecord.meals?.some(m => m.isRoutine) || dailyRecord.workouts?.some(w => w.isRoutine)
                                        ? 'bg-red-600 text-white hover:bg-red-700'
                                        : currentRoutine.isRestDay
                                        ? 'bg-gray-500 text-white hover:bg-gray-600'
                                        : 'bg-[#4A9EFF] text-white hover:bg-[#3b8fef]'
                                }`}
                                title={
                                    dailyRecord.meals?.some(m => m.isRoutine) || dailyRecord.workouts?.some(w => w.isRoutine)
                                        ? 'ルーティン入力をクリア'
                                        : currentRoutine.isRestDay
                                        ? 'ルーティン入力（休養日）'
                                        : 'ルーティン入力'
                                }
                            >
                                {(dailyRecord.meals?.some(m => m.isRoutine) || dailyRecord.workouts?.some(w => w.isRoutine)) ? (
                                    <>
                                        <Icon name="X" size={18} />
                                        <span className="text-sm font-medium">ルーティン</span>
                                    </>
                                ) : currentRoutine.isRestDay ? (
                                    <>
                                        <Icon name="Moon" size={18} />
                                        <span className="text-sm font-medium">休養</span>
                                    </>
                                ) : (
                                    <>
                                        <Icon name="Repeat" size={18} />
                                        <span className="text-sm font-medium">ルーティン</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* 体組成セクション */}
                <div id="body-composition-section" className="mb-6 bg-white rounded-xl shadow-sm overflow-hidden border-2 border-gray-200 -mx-6">
                    <div className="px-6 py-4 bg-teal-50 flex items-center justify-between border-b-2 border-gray-200">
                        <div className="flex items-center gap-3">
                            <Icon name="Activity" size={32} className="text-teal-600" />
                            <h4 className="font-bold text-gray-800">体組成</h4>
                        </div>
                        <span className="text-lg font-bold text-teal-600">
                            LBM {((Number(bodyComposition.weight) || 0) * (1 - (Number(bodyComposition.bodyFatPercentage) || 0) / 100)).toFixed(1)}kg
                        </span>
                    </div>
                    <div className="p-6">

                    {/* 体重 */}
                    <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Icon name="Weight" size={16} className="text-teal-600" />
                            <span className="text-sm font-bold text-gray-600">体重</span>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                            <button
                                onClick={() => {
                                    const currentWeight = parseFloat(bodyComposition.weight) || 0;
                                    const newWeight = Math.max(0, currentWeight - 1);
                                    updateBodyComposition(newWeight, bodyComposition.bodyFatPercentage);
                                    setWeightInput(newWeight > 0 ? newWeight.toString() : '');
                                }}
                                className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
                            >
                                -1
                            </button>
                            <button
                                onClick={() => {
                                    const currentWeight = parseFloat(bodyComposition.weight) || 0;
                                    const newWeight = Math.max(0, parseFloat((currentWeight - 0.1).toFixed(1)));
                                    updateBodyComposition(newWeight, bodyComposition.bodyFatPercentage);
                                    setWeightInput(newWeight > 0 ? newWeight.toString() : '');
                                }}
                                className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
                            >
                                -0.1
                            </button>
                            <div className="relative min-w-[110px]">
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="300"
                                    placeholder="0.0"
                                    value={weightInput}
                                    onChange={(e) => {
                                        setWeightInput(e.target.value);
                                    }}
                                    onBlur={(e) => {
                                        const value = e.target.value;
                                        // 空欄の場合は元の値を維持
                                        if (value === '' || value === null) {
                                            setWeightInput(bodyComposition.weight > 0 ? bodyComposition.weight.toString() : '');
                                            return;
                                        }
                                        const newWeight = parseFloat(value);
                                        if (!isNaN(newWeight) && newWeight >= 0) {
                                            updateBodyComposition(newWeight, bodyComposition.bodyFatPercentage);
                                            setWeightInput(newWeight > 0 ? newWeight.toString() : '');
                                        } else {
                                            setWeightInput(bodyComposition.weight > 0 ? bodyComposition.weight.toString() : '');
                                        }
                                    }}
                                    onFocus={(e) => {
                                        // 全選択して入力しやすくする（空欄にしない）
                                        e.target.select();
                                    }}
                                    className="w-full px-4 py-2 text-lg font-bold text-gray-800 text-center bg-white border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200 focus:outline-none hover:border-gray-400 transition"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600 pointer-events-none">kg</span>
                            </div>
                            <button
                                onClick={() => {
                                    const currentWeight = parseFloat(bodyComposition.weight) || 0;
                                    const newWeight = parseFloat((currentWeight + 0.1).toFixed(1));
                                    updateBodyComposition(newWeight, bodyComposition.bodyFatPercentage);
                                    setWeightInput(newWeight.toString());
                                }}
                                className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
                            >
                                +0.1
                            </button>
                            <button
                                onClick={() => {
                                    const currentWeight = parseFloat(bodyComposition.weight) || 0;
                                    const newWeight = currentWeight + 1;
                                    updateBodyComposition(newWeight, bodyComposition.bodyFatPercentage);
                                    setWeightInput(newWeight.toString());
                                }}
                                className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
                            >
                                +1
                            </button>
                        </div>
                    </div>

                    {/* 体脂肪率 */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Icon name="Percent" size={16} className="text-teal-600" />
                            <span className="text-sm font-bold text-gray-600">体脂肪率</span>
                            <button
                                onClick={() => setVisualGuideModal({ ...visualGuideModal, show: true })}
                                className="text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded-full p-0.5 transition"
                                title="体脂肪率を推定"
                            >
                                <Icon name="Eye" size={14} />
                            </button>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                            <button
                                onClick={() => {
                                    const currentBodyFat = parseFloat(bodyComposition.bodyFatPercentage) || 0;
                                    const newBodyFat = Math.max(0, currentBodyFat - 1);
                                    updateBodyComposition(bodyComposition.weight, newBodyFat);
                                    setBodyFatInput(newBodyFat > 0 ? newBodyFat.toString() : '');
                                }}
                                className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
                            >
                                -1
                            </button>
                            <button
                                onClick={() => {
                                    const currentBodyFat = parseFloat(bodyComposition.bodyFatPercentage) || 0;
                                    const newBodyFat = Math.max(0, parseFloat((currentBodyFat - 0.1).toFixed(1)));
                                    updateBodyComposition(bodyComposition.weight, newBodyFat);
                                    setBodyFatInput(newBodyFat > 0 ? newBodyFat.toString() : '');
                                }}
                                className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
                            >
                                -0.1
                            </button>
                            <div className="relative min-w-[110px]">
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    placeholder="0.0"
                                    value={bodyFatInput}
                                    onChange={(e) => {
                                        setBodyFatInput(e.target.value);
                                    }}
                                    onBlur={(e) => {
                                        const value = e.target.value;
                                        // 空欄の場合は元の値を維持
                                        if (value === '' || value === null) {
                                            setBodyFatInput(bodyComposition.bodyFatPercentage > 0 ? bodyComposition.bodyFatPercentage.toString() : '');
                                            return;
                                        }
                                        const newBodyFat = parseFloat(value);
                                        if (!isNaN(newBodyFat) && newBodyFat >= 0) {
                                            updateBodyComposition(bodyComposition.weight, newBodyFat);
                                            setBodyFatInput(newBodyFat > 0 ? newBodyFat.toString() : '');
                                        } else {
                                            setBodyFatInput(bodyComposition.bodyFatPercentage > 0 ? bodyComposition.bodyFatPercentage.toString() : '');
                                        }
                                    }}
                                    onFocus={(e) => {
                                        // 全選択して入力しやすくする（空欄にしない）
                                        e.target.select();
                                    }}
                                    className="w-full px-4 py-2 text-lg font-bold text-gray-800 text-center bg-white border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200 focus:outline-none hover:border-gray-400 transition"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600 pointer-events-none">%</span>
                            </div>
                            <button
                                onClick={() => {
                                    const currentBodyFat = parseFloat(bodyComposition.bodyFatPercentage) || 0;
                                    const newBodyFat = parseFloat((currentBodyFat + 0.1).toFixed(1));
                                    updateBodyComposition(bodyComposition.weight, newBodyFat);
                                    setBodyFatInput(newBodyFat.toString());
                                }}
                                className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
                            >
                                +0.1
                            </button>
                            <button
                                onClick={() => {
                                    const currentBodyFat = parseFloat(bodyComposition.bodyFatPercentage) || 0;
                                    const newBodyFat = currentBodyFat + 1;
                                    updateBodyComposition(bodyComposition.weight, newBodyFat);
                                    setBodyFatInput(newBodyFat.toString());
                                }}
                                className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
                            >
                                +1
                            </button>
                        </div>
                    </div>
                    </div>
                </div>

                {/* 食事セクション */}
                <div id="meal-section" className="mb-6 bg-white rounded-xl shadow-sm overflow-hidden border-2 border-gray-200 -mx-6">
                    <div className="px-6 py-4 bg-green-50 flex items-center justify-between border-b-2 border-gray-200">
                        <div className="flex items-center gap-3">
                            <Icon name="Utensils" size={32} className="text-green-600" />
                            <h4 className="font-bold text-gray-800">食事</h4>
                            <span className="px-2 py-0.5 bg-green-500 text-white rounded-full text-xs font-bold">
                                {dailyRecord.meals?.length || 0}
                            </span>
                        </div>
                        <button
                            onClick={() => {
                                if (window.handleQuickAction) {
                                    window.handleQuickAction('meal');
                                } else {
                                    console.error('[Dashboard] window.handleQuickAction is not defined');
                                    alert('記録機能の読み込みに失敗しました。ページを再読み込みしてください。');
                                }
                            }}
                            onTouchStart={(e) => {
                                e.currentTarget.classList.add('scale-95');
                            }}
                            onTouchEnd={(e) => {
                                e.currentTarget.classList.remove('scale-95');
                            }}
                            className="text-sm px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-lg hover:shadow-xl transition active:scale-95"
                            style={{
                                WebkitTapHighlightColor: 'transparent',
                                touchAction: 'manipulation',
                                minWidth: '44px',
                                minHeight: '44px'
                            }}
                        >
                            ＋ 追加
                        </button>
                    </div>
                    <div className="p-4">
                    {dailyRecord.meals?.length > 0 ? (
                        <div className="space-y-3">
                            {dailyRecord.meals.map((meal, index) => (
                                <div key={meal.id || index} className={`bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 shadow-md ${
                                    meal.isPredicted ? 'border-2 border-sky-500 shadow-sky-200/50' :
                                    meal.isRoutine ? 'border-2 border-amber-500 shadow-amber-200/50' :
                                    meal.isTemplate ? 'border-2 border-purple-500 shadow-purple-200/50' :
                                    'border border-gray-200'
                                }`}>
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            {/* ①時間 */}
                                            <div className="mb-1">
                                                <span className="text-xs text-gray-600">{meal.time}</span>
                                            </div>

                                            {/* ②入力元タグ（予測、ルーティン、テンプレート）*/}
                                            {(meal.isPredicted || meal.isRoutine || meal.isTemplate) && (
                                                <div className="flex items-center gap-2 mb-1">
                                                    {meal.isPredicted && (
                                                        <span className="text-xs bg-sky-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                                                            <Icon name="Sparkles" size={10} />
                                                            予測
                                                        </span>
                                                    )}
                                                    {meal.isRoutine && (
                                                        <span className="text-xs bg-amber-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                                                            <Icon name="Repeat" size={10} />
                                                            ルーティン
                                                        </span>
                                                    )}
                                                    {meal.isTemplate && (
                                                        <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                                                            <Icon name="BookTemplate" size={10} />
                                                            テンプレート
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* ③GLタグ + 運動後タグ */}
                                            {(() => {
                                                const mealGLData = mealGLValues.find(m => m.mealId === (meal.id || meal.timestamp));
                                                const hasGLorWorkout = mealGLData || meal.isPostWorkout;

                                                if (!hasGLorWorkout) return null;

                                                return (
                                                    <div className="flex items-center gap-2 mb-2">
                                                        {meal.isPostWorkout && (
                                                            <span className="text-xs bg-orange-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                <Icon name="Zap" size={10} />
                                                                運動後
                                                            </span>
                                                        )}
                                                        {mealGLData && (() => {
                                                            // GL値の表示テキストを決定
                                                            let displayText = `GL ${Math.round(mealGLData.adjustedGL)}`;

                                                            // 運動後の高GL: 推奨
                                                            if (mealGLData.rating === '高GL（推奨）') {
                                                                displayText += ' (推奨)';
                                                            }
                                                            // 運動後以外の高GL: 分割推奨
                                                            else if (mealGLData.rating === '高GL' && !meal.isPostWorkout) {
                                                                displayText += ' (分割推奨)';
                                                            }
                                                            // 中GL: 適正
                                                            else if (mealGLData.rating === '中GL') {
                                                                displayText += ' (適正)';
                                                            }
                                                            // 低GL: 優秀
                                                            else if (mealGLData.rating === '低GL') {
                                                                displayText += ' (優秀)';
                                                            }

                                                            return (
                                                                <span className={`text-xs ${mealGLData.badgeColor} text-white px-2 py-0.5 rounded-full flex items-center gap-1`}>
                                                                    {displayText}
                                                                </span>
                                                            );
                                                        })()}
                                                    </div>
                                                );
                                            })()}

                                            {/* ④食事名 */}
                                            <div
                                                onClick={() => setExpandedMeals(prev => ({...prev, [meal.id || index]: !prev[meal.id || index]}))}
                                                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded p-1 -ml-1"
                                            >
                                                <Icon name={expandedMeals[meal.id || index] ? "ChevronDown" : "ChevronRight"} size={16} className="text-gray-400" />
                                                <div className="text-base font-bold text-gray-800">
                                                    {meal.name}
                                                </div>
                                            </div>
                                            {expandedMeals[meal.id || index] && meal.items?.map((item, i) => (
                                                <div key={i} className="text-xs text-gray-600 ml-6 mt-1">
                                                    {item.name} {item.amount}{item.unit || 'g'}
                                                </div>
                                            ))}
                                        </div>

                                        <div className="text-right ml-4">
                                            <div className="text-xl font-bold text-blue-600">{Math.floor(meal.totalCalories || meal.calories || 0)}</div>
                                            <div className="text-xs text-gray-600">kcal</div>
                                            <div className="flex items-center gap-1 mt-1 text-xs">
                                                <span className="font-bold text-red-500">P{Math.round(meal.totalProtein || meal.protein || 0)}</span>
                                                <span className="text-gray-400">/</span>
                                                <span className="font-bold text-yellow-500">F{Math.round(meal.totalFat || meal.fat || 0)}</span>
                                                <span className="text-gray-400">/</span>
                                                <span className="font-bold text-green-500">C{Math.round(meal.totalCarbs || meal.carbs || 0)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={async () => {
                                                // テンプレート登録機能
                                                const templateName = prompt('テンプレート名を入力してください', meal.name);
                                                if (templateName && templateName.trim()) {
                                                    const template = {
                                                        id: Date.now().toString(),
                                                        name: templateName,
                                                        items: meal.items,
                                                        createdAt: new Date().toISOString(),
                                                        isTrialCreated: false  // ダッシュボードから保存の場合は常にfalse
                                                    };
                                                    await DataService.saveMealTemplate(user.uid, template);
                                                    toast.success('テンプレートを保存しました');
                                                }
                                            }}
                                            className="min-w-[44px] min-h-[44px] rounded-lg bg-white shadow-md flex items-center justify-center text-purple-600 hover:bg-purple-50 transition border-2 border-purple-500"
                                        >
                                            <Icon name="BookTemplate" size={18} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                // 食事編集機能を呼び出す
                                                if (window.handleEditMeal) {
                                                    window.handleEditMeal(meal);
                                                }
                                            }}
                                            className="min-w-[44px] min-h-[44px] rounded-lg bg-white shadow-md flex items-center justify-center text-[#4A9EFF] hover:bg-blue-50 transition border-2 border-[#4A9EFF]"
                                        >
                                            <Icon name="Edit" size={18} />
                                        </button>
                                        <button
                                            onClick={() => onDeleteItem('meal', meal.id)}
                                            className="min-w-[44px] min-h-[44px] rounded-lg bg-white shadow-md flex items-center justify-center text-red-600 hover:bg-red-50 transition border-2 border-red-500"
                                        >
                                            <Icon name="Trash2" size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center">
                            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                                <Icon name="Utensils" size={28} className="text-green-400" />
                            </div>
                            <p className="text-sm text-gray-600 font-medium mb-1">
                                まだ食事の記録がありません
                            </p>
                            <p className="text-xs text-gray-400">
                                追加ボタンから記録を始めましょう
                            </p>
                        </div>
                    )}
                    </div>
                </div>

                {/* 運動セクション */}
                {/* 運動セクション - 食事記録完了後に開放 */}
                {(Array.isArray(unlockedFeatures) && unlockedFeatures.includes('training')) && (
                    <div id="workout-section" className="mb-6 bg-white rounded-xl shadow-sm overflow-hidden border-2 border-gray-200 -mx-6">
                        <div className="px-6 py-4 bg-gradient-to-r from-orange-50 to-red-50 flex items-center justify-between border-b-2 border-gray-200">
                            <div className="flex items-center gap-3">
                                <Icon name="Dumbbell" size={32} className="text-orange-600" />
                                <h4 className="font-bold text-gray-800">運動</h4>
                                <span className="px-2 py-0.5 bg-orange-500 text-white rounded-full text-xs font-bold">
                                    {dailyRecord.workouts?.length || 0}
                                </span>
                            </div>
                            <button
                                onClick={() => {
                                    if (window.handleQuickAction) {
                                        window.handleQuickAction('workout');
                                    } else {
                                        console.error('[Dashboard] window.handleQuickAction is not defined');
                                        alert('記録機能の読み込みに失敗しました。ページを再読み込みしてください。');
                                    }
                                }}
                                onTouchStart={(e) => {
                                    e.currentTarget.classList.add('scale-95');
                                }}
                                onTouchEnd={(e) => {
                                    e.currentTarget.classList.remove('scale-95');
                                }}
                                className="text-sm px-4 py-2 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 shadow-lg hover:shadow-xl transition active:scale-95"
                                style={{
                                    WebkitTapHighlightColor: 'transparent',
                                    touchAction: 'manipulation',
                                    minWidth: '44px',
                                    minHeight: '44px'
                                }}
                            >
                                ＋ 追加
                            </button>
                        </div>
                        <div className="p-4">
                        {dailyRecord.workouts?.length > 0 ? (
                            <div className="space-y-3">
                                {dailyRecord.workouts.map((workout, index) => (
                                    <div key={workout.id || index} className={`bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 shadow-md ${
                                        workout.isPredicted ? 'border-2 border-sky-500 shadow-sky-200/50' :
                                        workout.isRoutine ? 'border-2 border-amber-500 shadow-amber-200/50' :
                                        workout.isTemplate ? 'border-2 border-purple-500 shadow-purple-200/50' :
                                        'border border-gray-200'
                                    }`}>
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-xs text-gray-600">{workout.time}</span>
                                                    {workout.isPredicted && (
                                                        <span className="text-xs bg-sky-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                                                            <Icon name="Sparkles" size={10} />
                                                            予測
                                                        </span>
                                                    )}
                                                    {workout.isRoutine && (
                                                        <span className="text-xs bg-amber-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                                                            <Icon name="Repeat" size={10} />
                                                            ルーティン
                                                        </span>
                                                    )}
                                                    {workout.isTemplate && (
                                                        <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                                                            <Icon name="BookTemplate" size={10} />
                                                            テンプレート
                                                        </span>
                                                    )}
                                                </div>
                                                {/* 運動名と右上のサマリー */}
                                                <div className="flex items-start justify-between mb-2">
                                                    <div
                                                        onClick={() => setExpandedWorkouts(prev => ({...prev, [workout.id || index]: !prev[workout.id || index]}))}
                                                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded p-1 -ml-1"
                                                    >
                                                        <Icon name={expandedWorkouts[workout.id || index] ? "ChevronDown" : "ChevronRight"} size={16} className="text-gray-400" />
                                                        <div className="text-base font-bold text-gray-800">
                                                            {workout.name}
                                                        </div>
                                                    </div>
                                                    {/* 右上: 総セット数・総重量・総時間 */}
                                                    {(() => {
                                                        let totalSets = 0;
                                                        let totalVolume = 0;
                                                        let totalTime = 0;
                                                        workout.exercises?.forEach(exercise => {
                                                            const isCardioOrStretch = exercise.exerciseType === 'aerobic' || exercise.exerciseType === 'stretch';
                                                            if (exercise.sets) {
                                                                totalSets += exercise.sets.length;
                                                            }
                                                            if (!isCardioOrStretch && exercise.sets) {
                                                                totalVolume += exercise.sets.reduce((sum, set) => {
                                                                    return sum + (set.weight || 0) * (set.reps || 0);
                                                                }, 0);
                                                            }
                                                            if (exercise.duration) {
                                                                totalTime += exercise.duration;
                                                            } else if (exercise.sets) {
                                                                exercise.sets.forEach(set => {
                                                                    totalTime += set.duration || 0;
                                                                });
                                                            }
                                                        });
                                                        return (
                                                            <div className="text-right leading-normal">
                                                                {totalSets > 0 && (
                                                                    <div className="leading-normal">
                                                                        <span className="text-base text-orange-600 font-bold">{totalSets}</span>
                                                                        <span className="text-xs text-gray-500">セット</span>
                                                                    </div>
                                                                )}
                                                                {totalVolume > 0 && (
                                                                    <div className="leading-normal">
                                                                        <span className="text-base text-orange-600 font-bold">{totalVolume}</span>
                                                                        <span className="text-xs text-gray-500">kg</span>
                                                                    </div>
                                                                )}
                                                                {totalTime > 0 && (
                                                                    <div className="leading-normal">
                                                                        <span className="text-base text-orange-600 font-bold">{totalTime}</span>
                                                                        <span className="text-xs text-gray-500">分</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>

                                                {/* 展開時の詳細 */}
                                                {expandedWorkouts[workout.id || index] && workout.exercises?.map((exercise, i) => {
                                                    const isCardioOrStretch = exercise.exerciseType === 'aerobic' || exercise.exerciseType === 'stretch';

                                                    // 種目名を取得（優先順位：name > exercise.name > workout.name）
                                                    const exerciseName = exercise.name || exercise.exercise?.name || workout.name || '運動';

                                                    return (
                                                        <div key={i} className="text-sm text-gray-600 mb-2 pb-2 border-b border-gray-200 last:border-b-0">
                                                            <p className="font-bold text-base">{exerciseName}</p>
                                                            {isCardioOrStretch ? (
                                                                // 有酸素・ストレッチ: 時間のみ表示
                                                                <p className="text-xs text-gray-600 mt-1">
                                                                    {exercise.duration
                                                                        ? `${exercise.duration}分`
                                                                        : exercise.sets
                                                                            ? `${exercise.sets.reduce((sum, set) => sum + (set.duration || 0), 0)}分`
                                                                            : '0分'}
                                                                </p>
                                                            ) : (
                                                                // 筋トレ: セット詳細を表示
                                                                <div className="mt-1 space-y-1">
                                                                    {exercise.sets?.map((set, si) => {
                                                                        const volume = (set.weight || 0) * (set.reps || 0);
                                                                        return (
                                                                            <div key={si}>
                                                                                <p className="text-xs text-gray-600">
                                                                                    Set {si + 1}: {set.weight}kg × {set.reps}回 = {volume}kg
                                                                                </p>
                                                                                {set.rm && set.rmWeight && (
                                                                                    <p className="text-xs text-orange-600 font-medium">
                                                                                        🏆 RM更新: {set.rm}RM × {set.rmWeight}kg
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={async () => {
                                                    // テンプレート登録機能
                                                    const templateName = prompt('テンプレート名を入力してください', workout.name);
                                                    if (templateName && templateName.trim()) {
                                                        // undefined値を除去するユーティリティ関数
                                                        const removeUndefined = (obj) => {
                                                            if (Array.isArray(obj)) {
                                                                return obj.map(removeUndefined).filter(item => item !== undefined);
                                                            }
                                                            if (obj !== null && typeof obj === 'object') {
                                                                return Object.entries(obj).reduce((acc, [key, value]) => {
                                                                    if (value !== undefined) {
                                                                        acc[key] = removeUndefined(value);
                                                                    }
                                                                    return acc;
                                                                }, {});
                                                            }
                                                            return obj;
                                                        };

                                                        const template = removeUndefined({
                                                            id: Date.now().toString(),
                                                            name: templateName,
                                                            exercises: workout.exercises,
                                                            createdAt: new Date().toISOString(),
                                                            isTrialCreated: false  // ダッシュボードから保存の場合は常にfalse
                                                        });
                                                        await DataService.saveWorkoutTemplate(user.uid, template);
                                                        toast.success('テンプレートを保存しました');
                                                    }
                                                }}
                                                className="min-w-[44px] min-h-[44px] rounded-lg bg-white shadow-md flex items-center justify-center text-purple-600 hover:bg-purple-50 transition border-2 border-purple-500"
                                            >
                                                <Icon name="BookTemplate" size={18} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    // 運動編集機能を呼び出す
                                                    if (window.handleEditWorkout) {
                                                        window.handleEditWorkout(workout);
                                                    }
                                                }}
                                                className="min-w-[44px] min-h-[44px] rounded-lg bg-white shadow-md flex items-center justify-center text-[#4A9EFF] hover:bg-blue-50 transition border-2 border-[#4A9EFF]"
                                            >
                                                <Icon name="Edit" size={18} />
                                            </button>
                                            <button
                                                onClick={() => onDeleteItem('workout', workout.id)}
                                                className="min-w-[44px] min-h-[44px] rounded-lg bg-white shadow-md flex items-center justify-center text-red-600 hover:bg-red-50 transition border-2 border-red-500"
                                            >
                                                <Icon name="Trash2" size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 text-center">
                                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
                                    <Icon name="Dumbbell" size={28} className="text-orange-400" />
                                </div>
                                <p className="text-sm text-gray-600 font-medium mb-1">
                                    まだ運動の記録がありません
                                </p>
                                <p className="text-xs text-gray-400">
                                    追加ボタンから記録を始めましょう
                                </p>
                            </div>
                        )}
                        </div>
                    </div>
                )}

                {/* 体調セクション - 運動記録完了後に開放 */}
                {(Array.isArray(unlockedFeatures) && unlockedFeatures.includes('condition')) && (
                    <div id="condition-section" className="mb-6 bg-white rounded-xl shadow-sm overflow-hidden border-2 border-gray-200 -mx-6">
                    <div className="px-6 py-4 bg-gradient-to-r from-red-50 to-pink-50 flex items-center justify-between border-b-2 border-gray-200">
                        <div className="flex items-center gap-3">
                            <Icon name="HeartPulse" size={32} className="text-red-600" />
                            <h4 className="font-bold text-gray-800">コンディション</h4>
                        </div>
                    </div>
                    <div className="p-6 space-y-2">
                        {/* 睡眠時間 */}
                        <div className="py-2 px-3 bg-gray-50 rounded-lg">
                            <div className="mb-2">
                                <span className="text-sm text-gray-600 font-bold">睡眠時間</span>
                            </div>
                            <div className="flex w-full items-center rounded-full bg-gray-100 p-1.5 gap-1 flex-button-group">
                                {[
                                    { value: 1, label: '5h↓' },
                                    { value: 2, label: '6h' },
                                    { value: 3, label: '7h' },
                                    { value: 4, label: '8h' },
                                    { value: 5, label: '9h↑' }
                                ].map(item => (
                                    <button
                                        key={item.value}
                                        onClick={() => {
                                            const updated = {
                                                ...dailyRecord,
                                                conditions: {
                                                    ...(dailyRecord.conditions || {}),
                                                    sleepHours: item.value
                                                }
                                            };
                                            // 即座にUIを更新
                                            setDailyRecord(updated);

                                            // 非同期処理はバックグラウンドで実行
                                            const userId = user?.uid;
                                            (async () => {
                                                // スコアを再計算
                                                const calcScores = DataService.calculateScores(profile, updated, targetPFC);
                                                const updatedWithScores = {
                                                    ...updated,
                                                    scores: calcScores
                                                };
                                                await DataService.saveDailyRecord(userId, currentDate, updatedWithScores);

                                                // 機能開放チェック
                                                const oldUnlocked = [...unlockedFeatures];
                                                await checkAndCompleteFeatures(userId, updatedWithScores);
                                                const isPremium = profile?.isPremium;
                                                const newUnlocked = await calculateUnlockedFeatures(userId, updatedWithScores, isPremium);
                                                setUnlockedFeatures(newUnlocked);

                                                // 新しく開放された機能があればコールバック
                                                if (onFeatureUnlocked && !oldUnlocked.includes('analysis') && newUnlocked.includes('analysis')) {
                                                    onFeatureUnlocked('analysis');
                                                }
                                            })();
                                        }}
                                        className={`flex-1 rounded-full py-2 px-1 text-center text-[11px] font-medium transition-all duration-150 focus:outline-none min-w-0 truncate ${
                                            item.value === ((dailyRecord.conditions?.sleepHours) || 0)
                                                ? 'bg-[#4A9EFF] text-white shadow'
                                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 睡眠の質 */}
                        <div className="py-2 px-3 bg-gray-50 rounded-lg">
                            <div className="mb-2">
                                <span className="text-sm text-gray-600 font-bold">睡眠の質</span>
                            </div>
                            <div className="flex w-full items-center rounded-full bg-gray-100 p-1.5 gap-1 flex-button-group">
                                {[
                                    { value: 1, label: '最悪' },
                                    { value: 2, label: '悪' },
                                    { value: 3, label: '普通' },
                                    { value: 4, label: '良' },
                                    { value: 5, label: '最高' }
                                ].map(item => (
                                    <button
                                        key={item.value}
                                        onClick={() => {
                                            const updated = {
                                                ...dailyRecord,
                                                conditions: {
                                                    ...(dailyRecord.conditions || {}),
                                                    sleepQuality: item.value
                                                }
                                            };
                                            // 即座にUIを更新
                                            setDailyRecord(updated);

                                            // 非同期処理はバックグラウンドで実行
                                            const userId = user?.uid;
                                            (async () => {
                                                // スコアを再計算
                                                const calcScores = DataService.calculateScores(profile, updated, targetPFC);
                                                const updatedWithScores = {
                                                    ...updated,
                                                    scores: calcScores
                                                };
                                                await DataService.saveDailyRecord(userId, currentDate, updatedWithScores);

                                                // 機能開放チェック
                                                const oldUnlocked = [...unlockedFeatures];
                                                await checkAndCompleteFeatures(userId, updatedWithScores);
                                                const isPremium = profile?.isPremium;
                                                const newUnlocked = await calculateUnlockedFeatures(userId, updatedWithScores, isPremium);
                                                setUnlockedFeatures(newUnlocked);

                                                // 新しく開放された機能があればコールバック
                                                if (onFeatureUnlocked && !oldUnlocked.includes('analysis') && newUnlocked.includes('analysis')) {
                                                    onFeatureUnlocked('analysis');
                                                }
                                            })();
                                        }}
                                        className={`flex-1 rounded-full py-2 px-1 text-center text-[11px] font-medium transition-all duration-150 focus:outline-none min-w-0 truncate ${
                                            item.value === ((dailyRecord.conditions?.sleepQuality) || 0)
                                                ? 'bg-[#4A9EFF] text-white shadow'
                                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 腸内環境 */}
                        <div className="py-2 px-3 bg-gray-50 rounded-lg">
                            <div className="mb-2">
                                <span className="text-sm text-gray-600 font-bold">腸内環境</span>
                            </div>
                            <div className="flex w-full items-center rounded-full bg-gray-100 p-1.5 gap-1 flex-button-group">
                                {[
                                    { value: 1, label: '不調' },
                                    { value: 2, label: 'やや悪' },
                                    { value: 3, label: '普通' },
                                    { value: 4, label: '良好' },
                                    { value: 5, label: '最高' }
                                ].map(item => (
                                    <button
                                        key={item.value}
                                        onClick={() => {
                                            const updated = {
                                                ...dailyRecord,
                                                conditions: {
                                                    ...(dailyRecord.conditions || {}),
                                                    digestion: item.value
                                                }
                                            };
                                            // 即座にUIを更新
                                            setDailyRecord(updated);

                                            // 非同期処理はバックグラウンドで実行
                                            const userId = user?.uid;
                                            (async () => {
                                                // スコアを再計算
                                                const calcScores = DataService.calculateScores(profile, updated, targetPFC);
                                                const updatedWithScores = {
                                                    ...updated,
                                                    scores: calcScores
                                                };
                                                await DataService.saveDailyRecord(userId, currentDate, updatedWithScores);

                                                // 機能開放チェック
                                                const oldUnlocked = [...unlockedFeatures];
                                                await checkAndCompleteFeatures(userId, updatedWithScores);
                                                const isPremium = profile?.isPremium;
                                                const newUnlocked = await calculateUnlockedFeatures(userId, updatedWithScores, isPremium);
                                                setUnlockedFeatures(newUnlocked);

                                                // 新しく開放された機能があればコールバック
                                                if (onFeatureUnlocked && !oldUnlocked.includes('analysis') && newUnlocked.includes('analysis')) {
                                                    onFeatureUnlocked('analysis');
                                                }
                                            })();
                                        }}
                                        className={`flex-1 rounded-full py-2 px-1 text-center text-[11px] font-medium transition-all duration-150 focus:outline-none min-w-0 truncate ${
                                            item.value === ((dailyRecord.conditions?.digestion) || 0)
                                                ? 'bg-[#4A9EFF] text-white shadow'
                                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 集中力 */}
                        <div className="py-2 px-3 bg-gray-50 rounded-lg">
                            <div className="mb-2">
                                <span className="text-sm text-gray-600 font-bold">集中力</span>
                            </div>
                            <div className="flex w-full items-center rounded-full bg-gray-100 p-1.5 gap-1 flex-button-group">
                                {[
                                    { value: 1, label: '最低' },
                                    { value: 2, label: '低' },
                                    { value: 3, label: '普通' },
                                    { value: 4, label: '高' },
                                    { value: 5, label: '最高' }
                                ].map(item => (
                                    <button
                                        key={item.value}
                                        onClick={() => {
                                            const updated = {
                                                ...dailyRecord,
                                                conditions: {
                                                    ...(dailyRecord.conditions || {}),
                                                    focus: item.value
                                                }
                                            };
                                            // 即座にUIを更新
                                            setDailyRecord(updated);

                                            // 非同期処理はバックグラウンドで実行
                                            const userId = user?.uid;
                                            (async () => {
                                                // スコアを再計算
                                                const calcScores = DataService.calculateScores(profile, updated, targetPFC);
                                                const updatedWithScores = {
                                                    ...updated,
                                                    scores: calcScores
                                                };
                                                await DataService.saveDailyRecord(userId, currentDate, updatedWithScores);

                                                // 機能開放チェック
                                                const oldUnlocked = [...unlockedFeatures];
                                                await checkAndCompleteFeatures(userId, updatedWithScores);
                                                const isPremium = profile?.isPremium;
                                                const newUnlocked = await calculateUnlockedFeatures(userId, updatedWithScores, isPremium);
                                                setUnlockedFeatures(newUnlocked);

                                                // 新しく開放された機能があればコールバック
                                                if (onFeatureUnlocked && !oldUnlocked.includes('analysis') && newUnlocked.includes('analysis')) {
                                                    onFeatureUnlocked('analysis');
                                                }
                                            })();
                                        }}
                                        className={`flex-1 rounded-full py-2 px-1 text-center text-[11px] font-medium transition-all duration-150 focus:outline-none min-w-0 truncate ${
                                            item.value === ((dailyRecord.conditions?.focus) || 0)
                                                ? 'bg-[#4A9EFF] text-white shadow'
                                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ストレス */}
                        <div className="py-2 px-3 bg-gray-50 rounded-lg">
                            <div className="mb-2">
                                <span className="text-sm text-gray-600 font-bold">ストレス</span>
                            </div>
                            <div className="flex w-full items-center rounded-full bg-gray-100 p-1.5 gap-1 flex-button-group">
                                {[
                                    { value: 1, label: '極大' },
                                    { value: 2, label: '高' },
                                    { value: 3, label: '普通' },
                                    { value: 4, label: '低' },
                                    { value: 5, label: 'なし' }
                                ].map(item => (
                                    <button
                                        key={item.value}
                                        onClick={() => {
                                            const updated = {
                                                ...dailyRecord,
                                                conditions: {
                                                    ...(dailyRecord.conditions || {}),
                                                    stress: item.value
                                                }
                                            };
                                            // 即座にUIを更新
                                            setDailyRecord(updated);

                                            // 非同期処理はバックグラウンドで実行
                                            const userId = user?.uid;
                                            (async () => {
                                                // スコアを再計算
                                                const calcScores = DataService.calculateScores(profile, updated, targetPFC);
                                                const updatedWithScores = {
                                                    ...updated,
                                                    scores: calcScores
                                                };
                                                await DataService.saveDailyRecord(userId, currentDate, updatedWithScores);

                                                // 機能開放チェック
                                                const oldUnlocked = [...unlockedFeatures];
                                                await checkAndCompleteFeatures(userId, updatedWithScores);
                                                const isPremium = profile?.isPremium;
                                                const newUnlocked = await calculateUnlockedFeatures(userId, updatedWithScores, isPremium);
                                                setUnlockedFeatures(newUnlocked);

                                                // 新しく開放された機能があればコールバック
                                                if (onFeatureUnlocked && !oldUnlocked.includes('analysis') && newUnlocked.includes('analysis')) {
                                                    onFeatureUnlocked('analysis');
                                                }
                                            })();
                                        }}
                                        className={`flex-1 rounded-full py-2 px-1 text-center text-[11px] font-medium transition-all duration-150 focus:outline-none min-w-0 truncate ${
                                            item.value === ((dailyRecord.conditions?.stress) || 0)
                                                ? 'bg-[#4A9EFF] text-white shadow'
                                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        </div>
                    </div>
                )}

                {/* 閃きセクション - 初回分析完了後に開放 */}
                {(Array.isArray(unlockedFeatures) && unlockedFeatures.includes('idea')) && (
                    <div id="idea-section" className="mb-6 bg-white rounded-xl shadow-sm overflow-hidden border-2 border-gray-200 -mx-6">
                        <div className="px-6 py-4 bg-[#FFF59A]/10 flex items-center justify-between border-b-2 border-gray-200">
                            <div className="flex items-center gap-3">
                                <Icon name="Lightbulb" size={32} className="text-yellow-500" />
                                <h4 className="font-bold text-gray-800">閃き</h4>
                            </div>
                        </div>
                        <div className="p-6">
                            <textarea
                                value={dailyRecord.notes || ''}
                                onChange={async (e) => {
                                    const updated = {
                                        ...dailyRecord,
                                        notes: e.target.value
                                    };
                                    setDailyRecord(updated);
                                    const userId = user?.uid;
                                    await DataService.saveDailyRecord(userId, currentDate, updated);

                                    // 履歴グラフiframeにデータ再読み込みメッセージを送信
                                    const historyIframe = document.querySelector('iframe[title*="履歴グラフ"]');
                                    if (historyIframe && historyIframe.contentWindow) {
                                        historyIframe.contentWindow.postMessage({
                                            type: 'RELOAD_DATA'
                                        }, '*');
                                    }
                                }}
                                placeholder="今日の気づき、メモなど..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:outline-none text-sm"
                                rows="3"
                            />
                        </div>
                    </div>
                )}

                {/* 分析ボタン - コンディション完了後に開放（Premium制限あり） */}
                {(Array.isArray(unlockedFeatures) && unlockedFeatures.includes('analysis')) && (() => {
                    const isPremium = profile?.isPremium;
                    const isTrial = usageDays < 7;
                    const hasAccess = isPremium || isTrial;

                    if (!hasAccess) {
                        // Premium専用ロック表示
                        return (
                            <div id="analysis-section" className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-6 -mx-6">
                                <div className="flex items-center gap-3 mb-3">
                                    <Icon name="Lock" size={24} className="text-amber-600" />
                                    <h4 className="text-lg font-bold text-amber-900">AI分析（Premium専用）</h4>
                                </div>
                                <p className="text-sm text-amber-800 mb-4">
                                    AIによる詳細な栄養分析・トレーニング分析・コンディション分析はPremium会員専用機能です。
                                </p>
                                <button
                                    onClick={() => setShowSubscriptionModal(true)}
                                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 px-4 rounded-lg hover:from-amber-600 hover:to-orange-600 transition font-bold"
                                >
                                    Premium会員になる
                                </button>
                            </div>
                        );
                    }

                    // アクセス権限あり：通常の分析セクション
                    return (
                        <div id="analysis-section" className="mb-6 bg-white rounded-xl shadow-sm overflow-hidden border-2 border-gray-200 -mx-6">
                            <div className="px-6 py-4 bg-indigo-50 flex items-center justify-between border-b-2 border-gray-200">
                                <div className="flex items-center gap-3">
                                    <Icon name="PieChart" size={32} className="text-indigo-600" />
                                    <h4 className="font-bold text-gray-800">分析</h4>
                                    <button
                                        onClick={() => setShowScoringGuideModal(true)}
                                        className="p-1 hover:bg-gray-100 rounded-full transition"
                                        title="採点基準を見る"
                                        style={{color: '#4A9EFF'}}
                                    >
                                        <Icon name="HelpCircle" size={16} />
                                    </button>
                                </div>
                                <button
                                    onClick={() => window.handleQuickAction && window.handleQuickAction('analysis')}
                                    className="text-sm px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-lg hover:shadow-xl transition"
                                >
                                    ＋ 分析
                                </button>
                            </div>
                            <div className="p-6">
                                {/* 当日のスコア表示（ドーナツグラフ） */}
                                <ScoreDoughnutChart
                                    profile={profile}
                                    dailyRecord={dailyRecord}
                                    targetPFC={targetPFC}
                                    user={user}
                                    currentDate={currentDate}
                                    setDailyRecord={setDailyRecord}
                                />
                            </div>
                        </div>
                    );
                })()}

            </div>


            {/* 指示書編集モーダル */}
            {showDirectiveEdit && todayDirective && (
                <DirectiveEditModal
                    directive={todayDirective}
                    onClose={() => setShowDirectiveEdit(false)}
                    onSave={async (updatedDirective) => {
                        if (!user) return;

                        try {
                            // Firestoreに保存
                            await firebase.firestore()
                                .collection('users')
                                .doc(user.uid)
                                .collection('directives')
                                .doc(updatedDirective.date)
                                .set(updatedDirective, { merge: true });

                            setTodayDirective(updatedDirective);
                            setShowDirectiveEdit(false);
                        } catch (error) {
                            console.error('[Dashboard] Failed to save directive:', error);
                            toast.error('指示書の保存に失敗しました');
                        }
                    }}
                    onDelete={async () => {
                        if (!user || !todayDirective) return;

                        try {
                            // Firestoreから削除
                            await firebase.firestore()
                                .collection('users')
                                .doc(user.uid)
                                .collection('directives')
                                .doc(todayDirective.date)
                                .delete();

                            setTodayDirective(null);
                            setShowDirectiveEdit(false);
                        } catch (error) {
                            console.error('[Dashboard] Failed to delete directive:', error);
                            toast.error('指示書の削除に失敗しました');
                        }
                    }}
                    getCategoryIcon={getCategoryIcon}
                    getCategoryLabel={getCategoryLabel}
                    getCategoryColor={getCategoryColor}
                />
            )}

            {/* 採点基準説明モーダル */}
            {showScoringGuideModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4" onClick={() => setShowScoringGuideModal(false)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-[95vw] sm:max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        {/* ヘッダー */}
                        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Icon name="HelpCircle" size={16} style={{color: '#4A9EFF'}} />
                                採点基準
                            </h3>
                            <button
                                onClick={() => setShowScoringGuideModal(false)}
                                className="p-1 hover:bg-gray-100 rounded-full transition"
                            >
                                <Icon name="X" size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* 食事スコア */}
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon name="Utensils" size={18} className="text-green-600" />
                                    <h4 className="font-bold text-green-800">食事スコア（100点満点）</h4>
                                </div>
                                <div className="text-sm text-gray-600 space-y-1">
                                    <p><strong>主要栄養素</strong>(60%)</p>
                                    <ul className="list-disc list-inside ml-2">
                                        <li>タンパク質(20%): 目標値の達成率</li>
                                        <li>脂質(20%): 目標値の達成率</li>
                                        <li>炭水化物(20%): 目標値の達成率</li>
                                    </ul>
                                    <p className="mt-2"><strong>エネルギー</strong>(10%)</p>
                                    <ul className="list-disc list-inside ml-2">
                                        <li>カロリー(10%): 目標値の達成率</li>
                                    </ul>
                                    <p className="mt-2"><strong>栄養品質</strong>(30%)</p>
                                    <ul className="list-disc list-inside ml-2">
                                        <li>DIAAS(5%): タンパク質の質</li>
                                        <li>脂肪酸バランス(5%): 飽和・不飽和脂肪酸比率</li>
                                        <li>血糖管理(5%): GL値による評価</li>
                                        <li>食物繊維(5%): 推奨量の達成率</li>
                                        <li>ビタミン(5%): 主要ビタミンの充足率</li>
                                        <li>ミネラル(5%): 主要ミネラルの充足率</li>
                                    </ul>
                                    <p className="mt-2 text-xs text-green-700">※詳細は「食事スコア8軸評価」の?アイコンをタップ</p>
                                </div>
                            </div>

                            {/* 運動スコア */}
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon name="Dumbbell" size={18} className="text-orange-600" />
                                    <h4 className="font-bold text-orange-800">運動スコア（100点満点）</h4>
                                </div>
                                <div className="text-sm text-gray-600 space-y-1">
                                    <p><strong>総時間</strong>（30%）</p>
                                    <ul className="list-disc list-inside ml-2 space-y-1">
                                        <li>ボディメイカー：90分以上で満点</li>
                                        <li>一般：60分以上で満点</li>
                                        <li>筋トレ：1セット = 3分で換算</li>
                                        <li>有酸素・ストレッチ：実時間で計算</li>
                                    </ul>
                                    <p className="mt-2"><strong>総セット数</strong>（70%）</p>
                                    <ul className="list-disc list-inside ml-2 space-y-1">
                                        <li>ボディメイカー：20セット以上で満点</li>
                                        <li>一般：12セット以上で満点</li>
                                        <li>有酸素：15分 = 1セット換算</li>
                                        <li>ストレッチ：10分 = 1セット換算</li>
                                    </ul>
                                    <p className="mt-2 text-xs text-orange-700">※休養日に設定した日は自動的に100点</p>
                                </div>
                            </div>

                            {/* コンディションスコア */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon name="HeartPulse" size={18} className="text-blue-600" />
                                    <h4 className="font-bold text-blue-800">コンディションスコア（100点満点）</h4>
                                </div>
                                <div className="text-sm text-gray-600 space-y-1">
                                    <p><strong>5項目の平均で評価</strong></p>
                                    <ul className="list-disc list-inside ml-2 space-y-1">
                                        <li>睡眠時間（1-5段階、5=9h以上）</li>
                                        <li>睡眠の質（1-5段階、5=最高）</li>
                                        <li>腸内環境（1-5段階、5=最高）</li>
                                        <li>集中力（1-5段階、5=最高）</li>
                                        <li>ストレス（1-5段階、5=なし、1=極大）</li>
                                    </ul>
                                    <p className="mt-2 text-xs text-blue-700">※すべての項目が最高値（5）の場合、100点になります</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 詳細栄養素の使い方モーダル */}
            {showDetailedNutrientsGuide && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4" onClick={() => setShowDetailedNutrientsGuide(false)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        {/* ヘッダー */}
                        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Icon name="HelpCircle" size={16} style={{color: '#4A9EFF'}} />
                                詳細栄養素の使い方
                            </h3>
                            <button
                                onClick={() => setShowDetailedNutrientsGuide(false)}
                                className="p-1 hover:bg-gray-100 rounded-full transition"
                            >
                                <Icon name="X" size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* タンパク質の質（DIAAS） */}
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon name="Beef" size={18} className="text-red-600" />
                                    <h4 className="font-bold text-red-800">タンパク質の質（DIAAS）</h4>
                                </div>
                                <div className="text-sm text-gray-700 space-y-2">
                                    <p className="font-medium">DIAASとは？</p>
                                    <p>消化・吸収・利用効率を評価する最新の指標です。</p>
                                    <ul className="list-disc list-inside ml-2 space-y-1">
                                        <li><strong>1.0以上</strong>：優秀なタンパク質源（動物性、大豆など）</li>
                                        <li><strong>0.75-1.0</strong>：良好（豆類など）</li>
                                        <li><strong>0.75未満</strong>：要改善（穀類単体など）</li>
                                    </ul>
                                    <div className="mt-3 bg-blue-50 border border-blue-300 rounded p-3">
                                        <p className="font-semibold text-blue-800 mb-2 flex items-center gap-1">
                                            <Icon name="Clock" size={16} />
                                            最適な摂取タイミング
                                        </p>
                                        <div className="text-xs text-gray-700 space-y-2">
                                            <p><strong>⚡ 運動直後（30分以内）：</strong> 筋肉が最もアミノ酸を必要とするゴールデンタイム。高DIASS食品（ホエイプロテイン、卵、乳製品）を優先。</p>
                                            <p><strong>🌅 朝食：</strong> 睡眠中の筋分解状態から合成状態へ切り替えるため、必ず高DIASS食品を摂取。</p>
                                            <p><strong>🍽️ 毎食：</strong> 体は一度に大量のタンパク質を処理できません。毎食コンスタントに良質なタンパク質（DIASS 1.0以上）を補給。</p>
                                            <p className="mt-2 text-blue-700 font-medium">💡 組み合わせのコツ： 白米＋納豆、パン＋卵など、低DIAASと高DIAASを組み合わせてアミノ酸バランスを改善。</p>
                                        </div>
                                    </div>
                                    <p className="mt-2 bg-white p-2 rounded border-l-4 border-red-400">
                                        <strong>目指すべき目標：</strong> 毎食1.0以上を目指しましょう。動物性タンパク質と植物性タンパク質を組み合わせると効率的です。
                                    </p>
                                </div>
                            </div>

                            {/* 炭水化物の質（GL値） */}
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon name="Wheat" size={18} className="text-green-600" />
                                    <h4 className="font-bold text-green-800">炭水化物の質（GL値・血糖管理）</h4>
                                </div>
                                <div className="text-sm text-gray-700 space-y-2">
                                    <p className="font-medium">GL値（Glycemic Load）とは？</p>
                                    <p>血糖値の上昇度を示す指標で、「1食ごと」と「1日合計」の2つの評価があります。</p>

                                    <div className="mt-3 bg-white border border-gray-300 rounded p-3">
                                        <p className="font-semibold text-gray-800 mb-2">📊 1食ごとのGL評価（血糖スパイク管理）</p>
                                        <ul className="list-disc list-inside ml-2 space-y-1 text-xs">
                                            <li><strong>低GL（≤10）</strong>：血糖値が緩やかに上昇 → 優秀</li>
                                            <li><strong>中GL（11-19）</strong>：適度な上昇 → 良好</li>
                                            <li><strong>高GL（≥20）</strong>：急激に上昇 → 分割推奨</li>
                                        </ul>
                                        <p className="text-xs text-orange-600 mt-2 font-medium">
                                            ⚡ 運動後の食事は高GLが推奨されます（筋グリコーゲン補充）
                                        </p>
                                    </div>

                                    <div className="mt-3 bg-white border border-gray-300 rounded p-3">
                                        <p className="font-semibold text-gray-800 mb-2">📈 1日合計GL評価（総負荷管理）</p>
                                        <p className="text-xs text-gray-700 mb-2">
                                            GL上限は、目標炭水化物量に応じて自動計算されます（目標炭水化物 × 0.60）。
                                            これにより、平均GI値 60以下を維持することを目指します。
                                        </p>
                                        <ul className="list-disc list-inside ml-2 space-y-1 text-xs">
                                            <li><strong>優秀（上限の80%未満）</strong>：理想的な血糖管理</li>
                                            <li><strong>良好（上限の80-100%）</strong>：目標範囲内</li>
                                            <li><strong>普通（上限の100-120%）</strong>：許容範囲</li>
                                            <li><strong>要改善（上限の120%以上）</strong>：改善が必要</li>
                                        </ul>
                                        <p className="text-xs text-blue-600 mt-2 font-medium">
                                            💡 例：目標炭水化物218gの場合、GL上限は131（218 × 0.60）
                                        </p>
                                    </div>

                                    <p className="font-medium mt-3">補正の仕組み</p>
                                    <p className="text-xs">PFC・食物繊維を一緒に摂取すると、血糖値の上昇が緩やかになります。各食事ごとに補正が適用されます。</p>
                                    <ul className="list-disc list-inside ml-2 space-y-1 text-xs">
                                        <li><strong>タンパク質</strong>：0g→0% / 10g→5% / 20g以上→最大10%</li>
                                        <li><strong>脂質</strong>：0g→0% / 5g→5% / 10g以上→最大10%</li>
                                        <li><strong>食物繊維</strong>：0g→0% / 2.5g→7.5% / 5g以上→最大15%</li>
                                    </ul>
                                    <p className="text-xs text-gray-600 mt-1">※補正は段階的に適用されます（例：タンパク質15gの場合は-7.5%補正）</p>
                                    <p className="text-xs text-gray-600 mt-1">※表示されるGL値はすべて補正後の値です</p>
                                    <p className="font-medium mt-3">GI値内訳とは？</p>
                                    <p>GI値60以上と60未満の炭水化物の摂取割合を示します。</p>
                                    <ul className="list-disc list-inside ml-2 space-y-1 text-xs">
                                        <li><strong>GI 60未満</strong>：血糖値が緩やかに上昇</li>
                                        <li><strong>GI 60以上</strong>：血糖値が急激に上昇</li>
                                    </ul>
                                    <p className="text-xs text-gray-600 mt-1">※60を境界に「低GI食品」と「高GI食品」を分類</p>

                                    <div className="mt-3 bg-orange-50 border border-orange-300 rounded p-3">
                                        <p className="font-semibold text-orange-800 mb-2 flex items-center gap-1">
                                            <Icon name="AlertCircle" size={16} />
                                            重要：調理法でGI値は大きく変動します
                                        </p>
                                        <div className="text-xs text-gray-700 space-y-2">
                                            <p><strong>加熱で上昇：</strong> デンプンが「糊化（α化）」し、消化吸収が速くなります。</p>
                                            <ul className="list-disc list-inside ml-2 space-y-1">
                                                <li>白米（炊きたて）：GI 88 → 高GI</li>
                                                <li>ジャガイモ（焼き）：GI 93 → 高GI</li>
                                                <li>パスタ（よく茹でる）：GI 60台 → 中GI</li>
                                            </ul>
                                            <p className="mt-2"><strong>冷却で低下：</strong> 「レジスタントスターチ（難消化性でんぷん）」が増加し、消化が緩やかになります。</p>
                                            <ul className="list-disc list-inside ml-2 space-y-1">
                                                <li>白米（冷やご飯・おにぎり）：GI 70台 → 中GI</li>
                                                <li>ジャガイモ（ポテトサラダ）：GI 50-60台 → 低~中GI</li>
                                                <li>パスタ（アルデンテ）：GI 40-50台 → 低GI</li>
                                            </ul>
                                            <p className="mt-2"><strong>再加熱後も維持：</strong> 一度冷ましてレンジで温め直しても、レジスタントスターチは残り、GI値は炊きたてより低いままです。</p>
                                            <p className="mt-2 text-orange-700 font-medium">※アプリのGI値は基本的な調理法（白米=炊飯後、パスタ=茹で、など）を前提としています。</p>
                                        </div>
                                    </div>

                                    <div className="mt-3 bg-blue-50 border border-blue-300 rounded p-3">
                                        <p className="font-semibold text-blue-800 mb-2 flex items-center gap-1">
                                            <Icon name="Clock" size={16} />
                                            最適な摂取タイミング
                                        </p>
                                        <div className="text-xs text-gray-700 space-y-2">
                                            <p><strong>⚡ 運動直後（30分以内）：</strong> 高GI食品＋高DIASS食品で素早くエネルギー補給と筋肉回復。（例：白米＋卵、果物＋プロテイン）</p>
                                            <p><strong>🏃 運動前（1-2時間前）：</strong> 低GI食品でエネルギーを持続的に供給。高GI食品は避ける（低血糖リスク）。</p>
                                            <p><strong>🍽️ 日常の食事：</strong> 低GI食品＋高DIASS食品で血糖値を安定させ、眠気・倦怠感・体脂肪蓄積を防止。（例：玄米＋鶏肉、全粒粉パン＋卵）</p>
                                            <p><strong>💤 就寝前：</strong> 低GI食品を選び、血糖値スパイクを避ける。睡眠の質向上につながります。</p>
                                            <p className="mt-2 text-blue-700 font-medium">💡 ベストな組み合わせ： 運動後は高GI＋高DIASS、日常は低GI＋高DIASSが基本です。</p>
                                        </div>
                                    </div>

                                    <p className="mt-3 bg-white p-2 rounded border-l-4 border-green-400 text-xs">
                                        <strong>目指すべき目標：</strong> 1日合計GL値100以下（理想80以下）、1食あたりGL値20以下、低GI食品60%以上を目指しましょう。白米より玄米、うどんより蕎麦、温かいご飯より冷やご飯がおすすめです。
                                    </p>
                                </div>
                            </div>

                            {/* 脂肪酸 */}
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon name="Droplets" size={18} className="text-yellow-600" />
                                    <h4 className="font-bold text-yellow-800">脂肪酸バランス</h4>
                                </div>
                                <div className="text-sm text-gray-700 space-y-2">
                                    <p className="font-medium">脂肪酸の種類と役割</p>
                                    <ul className="list-disc list-inside ml-2 space-y-1">
                                        <li><strong>飽和脂肪酸</strong>：バター、肉の脂など。摂りすぎに注意</li>
                                        <li><strong>中鎖脂肪酸（MCT）</strong>：ココナッツオイル、MCTオイルなど。素早くエネルギーになる</li>
                                        <li><strong>一価不飽和脂肪酸</strong>：オリーブオイル、アボカドなど。心臓に優しい</li>
                                        <li><strong>多価不飽和脂肪酸</strong>：魚油、ナッツなど。DHA・EPAを含む</li>
                                    </ul>
                                    <p className="font-medium mt-3">理想的なバランスと評価基準</p>
                                    <ul className="list-disc list-inside ml-2 space-y-1">
                                        <li><strong>優秀</strong>：飽和25-35%、中鎖0-10%、一価35-45%、多価20-30%</li>
                                        <li><strong>良好</strong>：飽和20-40%、一価30-50%の範囲</li>
                                        <li><strong>要改善</strong>：飽和40%以上または一価30%未満</li>
                                    </ul>
                                    <div className="mt-3 bg-cyan-50 border border-cyan-300 rounded p-2">
                                        <p className="text-xs text-cyan-900 font-medium mb-1">💡 中鎖脂肪酸（MCT）の特徴</p>
                                        <p className="text-xs text-gray-700">長鎖脂肪酸より消化吸収が速く、すぐにエネルギーとして利用されます。運動前の摂取やケトジェニックダイエットに効果的です。</p>
                                    </div>
                                    <p className="mt-2 bg-white p-2 rounded border-l-4 border-yellow-400">
                                        <strong>目指すべき目標：</strong> 理想バランスは飽和3:中鎖0.5:一価4:多価2.5です。魚・ナッツ・オリーブオイル・MCTオイルを組み合わせ、バランスの良い脂質摂取を心がけましょう。
                                    </p>
                                </div>
                            </div>

                            {/* 糖質・食物繊維 */}
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon name="Cookie" size={18} className="text-amber-600" />
                                    <h4 className="font-bold text-amber-800">糖質・食物繊維</h4>
                                </div>
                                <div className="text-sm text-gray-700 space-y-2">
                                    <ul className="list-disc list-inside ml-2 space-y-1">
                                        <li><strong>糖質</strong>：エネルギー源。炭水化物から食物繊維を除いたもの</li>
                                        <li><strong>食物繊維</strong>：腸内環境改善、血糖値上昇抑制</li>
                                        <li><strong>水溶性食物繊維</strong>：血糖値・コレステロール低下（海藻、果物など）</li>
                                        <li><strong>不溶性食物繊維</strong>：便通改善（野菜、穀類など）</li>
                                    </ul>
                                    <p className="mt-2 bg-white p-2 rounded border-l-4 border-amber-400">
                                        <strong>目指すべき目標：</strong> 食物繊維20g/日以上（水溶性7g、不溶性13g）を目指しましょう。野菜・きのこ・海藻・果物を毎食摂取。
                                    </p>
                                </div>
                            </div>

                            {/* ビタミン・ミネラル */}
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon name="Sparkles" size={18} className="text-purple-600" />
                                    <h4 className="font-bold text-purple-800">ビタミン・ミネラル</h4>
                                </div>
                                <div className="text-sm text-gray-700 space-y-2">
                                    <p>体の調子を整える微量栄養素です。目標値に対する達成率をプログレスバーで表示しています。</p>
                                    <p className="mt-2 bg-white p-2 rounded border-l-4 border-purple-400">
                                        <strong>目指すべき目標：</strong> 全項目80%以上を目指しましょう。色とりどりの野菜・果物・魚・ナッツをバランスよく摂取。
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ショートカット（Premium専用：8日目以降） */}
            {shortcuts && shortcuts.length > 0 && onShortcutClick && (() => {
                const PremiumService = window.PremiumService;
                const isPremium = PremiumService ? PremiumService.isPremiumUser(profile, usageDays) : false;
                return isPremium;
            })() && (
                <ChevronShortcut shortcuts={shortcuts} onShortcutClick={onShortcutClick} />
            )}

            {/* 機能開放モーダル（1つのモーダルで3ページ構成） */}
            {showFeatureUnlockModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-[95vw] sm:max-w-md shadow-xl">
                        <div className="p-6 space-y-4">
                            {/* アイコン */}
                            <div className="flex justify-center">
                                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                                    <Icon name="Sparkles" size={32} className="text-amber-600" />
                                </div>
                            </div>

                            {/* ページ1: 閃き・履歴 */}
                            {currentModalPage === 1 && (
                                <>
                                    <h3 className="text-xl font-bold text-center text-gray-800">
                                        🎉 新機能が開放されました！
                                    </h3>
                                    <div className="text-sm text-gray-600 space-y-3">
                                        <p className="text-center">分析完了おめでとうございます！<br/>新しい機能が使えるようになりました</p>
                                        <div className="bg-yellow-50 rounded-lg p-4 space-y-3 border border-amber-200">
                                            <div className="flex items-start gap-2">
                                                <Icon name="Lightbulb" size={20} className="text-yellow-500 mt-0.5" />
                                                <div>
                                                    <div className="font-bold text-gray-800">閃き</div>
                                                    <div className="text-xs text-gray-600">今日の気づきやメモを記録できます</div>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <Icon name="TrendingUp" size={20} className="text-[#4A9EFF] mt-0.5" />
                                                <div>
                                                    <div className="font-bold text-gray-800">履歴</div>
                                                    <div className="text-xs text-gray-600">グラフで進捗を確認できます</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ページ2: PG BASE・COMY */}
                            {currentModalPage === 2 && (
                                <>
                                    <h3 className="text-xl font-bold text-center text-gray-800">
                                        📚 学習・交流機能も開放！
                                    </h3>
                                    <div className="text-sm text-gray-600 space-y-3">
                                        <p className="text-center">さらに2つの機能が使えます</p>
                                        <div className="bg-cyan-50 rounded-lg p-4 space-y-3 border border-cyan-200">
                                            <div className="flex items-start gap-2">
                                                <Icon name="BookOpen" size={20} className="text-cyan-600 mt-0.5" />
                                                <div>
                                                    <div className="font-bold text-gray-800">PG BASE</div>
                                                    <div className="text-xs text-gray-600">ボディメイクの理論と知識を学べます</div>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <Icon name="Users" size={20} className="text-pink-600 mt-0.5" />
                                                <div>
                                                    <div className="font-bold text-gray-800">コミュニティ</div>
                                                    <div className="text-xs text-gray-600">仲間と刺激し合い、モチベーション維持</div>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-center text-xs text-gray-600">
                                            7日間のトライアル期間中は全機能が使えます
                                        </p>
                                    </div>
                                </>
                            )}

                            {/* ページインジケーター */}
                            <div className="flex justify-center gap-2">
                                {[1, 2].map(page => (
                                    <div
                                        key={page}
                                        className={`w-2 h-2 rounded-full ${
                                            page === currentModalPage ? 'bg-amber-600' : 'bg-gray-300'
                                        }`}
                                    />
                                ))}
                            </div>

                            {/* ナビゲーションボタン */}
                            <div className="flex gap-3">
                                {currentModalPage > 1 && (
                                    <button
                                        onClick={() => setCurrentModalPage(currentModalPage - 1)}
                                        className="w-1/3 bg-gray-200 text-gray-600 py-3 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                                    >
                                        戻る
                                    </button>
                                )}
                                {currentModalPage < 2 ? (
                                    <button
                                        onClick={() => setCurrentModalPage(currentModalPage + 1)}
                                        className={`${currentModalPage === 1 ? 'w-full' : 'w-2/3'} bg-[#FFF59A] text-gray-800 py-3 rounded-lg font-bold hover:opacity-90 transition-colors shadow-md relative overflow-hidden`}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shine pointer-events-none"></div>
                                        <span className="relative z-10">次へ</span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            setShowFeatureUnlockModal(false);
                                            // 新機能開放モーダル完了フラグを設定（初回分析完了モーダル表示トリガー）
                                            localStorage.setItem('featureUnlockModalsCompleted', 'true');

                                            // 分析セクションまで自動スクロール
                                            setTimeout(() => {
                                                const analysisSection = document.getElementById('analysis-section');
                                                if (analysisSection) {
                                                    analysisSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                }
                                            }, 300);
                                        }}
                                        className="w-2/3 bg-[#FFF59A] text-gray-800 py-3 rounded-lg font-bold hover:opacity-90 transition-colors shadow-md relative overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shine pointer-events-none"></div>
                                        <span className="relative z-10">確認しました</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 初回分析完了＋Premium誘導モーダル */}
            {/* テンプレート＋ルーティンTipモーダル */}
            {showTemplateRoutineTip && (
                <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-[95vw] sm:max-w-md shadow-2xl overflow-hidden animate-slide-up relative">
                        {/* ヘッダー */}
                        <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-white">テンプレ×ルーティンで最速入力！</h2>
                            <button
                                onClick={() => {
                                    setShowTemplateRoutineTip(false);
                                    localStorage.setItem('templateRoutineTipShown', 'true');
                                }}
                                className="p-1 hover:bg-white/20 rounded-full transition"
                            >
                                <Icon name="X" size={20} className="text-white" />
                            </button>
                        </div>

                        {/* コンテンツ */}
                        <div className="p-6 space-y-4">
                            {/* 3ステップ */}
                            <ol className="space-y-3 text-sm text-gray-700">
                                <li className="flex items-start gap-3">
                                    <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">1</span>
                                    <span className="font-medium">設定 → 機能タブ → ルーティン</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">2</span>
                                    <span className="font-medium">分割法ごとにテンプレを紐づけ</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">3</span>
                                    <span className="font-medium">デイリー記録のルーティンボタンから1タップ記録！</span>
                                </li>
                            </ol>

                            {/* 利便性の説明 */}
                            <div className="space-y-3 pt-2">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <Icon name="Lightbulb" size={18} className="text-amber-600" />
                                    こんなに便利になります
                                </h3>
                                <div className="space-y-2">
                                    {[
                                        { icon: 'BookTemplate', text: '普段の食事・運動をテンプレートに保存', color: 'text-blue-600' },
                                        { icon: 'Calendar', text: '曜日ごとのトレーニングをルーティンに設定', color: 'text-purple-600' },
                                        { icon: 'MousePointerClick', text: 'ワンタップでテンプレートをすべて記録', color: 'text-green-600' },
                                        { icon: 'Clock', text: '毎回の検索が不要で最速1秒に！', color: 'text-sky-600' }
                                    ].map((feature, idx) => (
                                        <div key={idx} className="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
                                            <Icon name={feature.icon} size={18} className={`${feature.color} flex-shrink-0 mt-0.5`} />
                                            <span className="text-sm text-gray-600">{feature.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ボタン */}
                            <button
                                onClick={() => {
                                    setShowTemplateRoutineTip(false);
                                    localStorage.setItem('templateRoutineTipShown', 'true');
                                    // 設定画面の機能設定タブへ遷移
                                    window.dispatchEvent(new CustomEvent('navigateToSettings', { detail: { tab: 'features' } }));
                                }}
                                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold py-4 rounded-lg hover:opacity-90 transition shadow-lg flex items-center justify-center gap-2"
                            >
                                <Icon name="Settings" size={20} />
                                <span>設定を見る</span>
                            </button>

                            {/* 後で */}
                            <button
                                onClick={() => {
                                    setShowTemplateRoutineTip(false);
                                    localStorage.setItem('templateRoutineTipShown', 'true');
                                }}
                                className="w-full text-gray-600 text-sm hover:text-gray-800 transition"
                            >
                                後で確認する
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* レベルアップモーダル */}
            {showLevelUpModal && levelUpData && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-[95vw] sm:max-w-md overflow-hidden shadow-2xl animate-bounce-in">
                        {/* ヘッダー */}
                        <div className="bg-[#FFF59A] p-6 text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shine pointer-events-none"></div>
                            <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
                            <div className="relative z-10">
                                <Icon name="Trophy" size={48} className="text-yellow-600 mx-auto mb-3" />
                                <h2 className="text-2xl font-bold text-gray-800 mb-1">レベルアップ！</h2>
                                <p className="text-gray-600 text-sm">おめでとうございます</p>
                            </div>
                        </div>

                        {/* コンテンツ */}
                        <div className="p-6 space-y-6">
                            {/* 新しいレベル */}
                            <div className="text-center">
                                <p className="text-sm text-gray-600 mb-2">あなたの新しいレベル</p>
                                <div className="inline-flex items-center gap-3 bg-[#FFF59A]/10 border-2 border-amber-300 rounded-full px-6 py-3">
                                    <div className="bg-amber-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl">
                                        {levelUpData.level}
                                    </div>
                                    <span className="text-2xl font-bold text-amber-600">Level {levelUpData.level}</span>
                                </div>
                            </div>

                            {/* 獲得クレジット */}
                            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-semibold text-gray-600">獲得クレジット</span>
                                    <Icon name="Award" size={20} className="text-yellow-600" />
                                </div>
                                <div className="text-3xl font-bold text-yellow-600 text-center">
                                    +{levelUpData.creditsEarned}
                                </div>
                                <p className="text-xs text-center text-gray-600 mt-2">
                                    Gemini API {levelUpData.creditsEarned}回分
                                </p>
                            </div>

                            {/* マイルストーン達成 */}
                            {levelUpData.milestoneReached && levelUpData.milestoneReached.length > 0 && (
                                <div className="bg-[#FFF59A]/10 border-2 border-amber-300 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Icon name="Star" size={18} className="text-amber-600" />
                                        <span className="text-sm font-bold text-gray-600">マイルストーン達成！</span>
                                    </div>
                                    <p className="text-xs text-gray-600">
                                        Level {levelUpData.milestoneReached.join(', ')} 到達ボーナス獲得
                                    </p>
                                </div>
                            )}

                            {/* 閉じるボタン */}
                            <button
                                onClick={() => {
                                    setShowLevelUpModal(false);
                                    setLevelUpData(null);
                                }}
                                className="w-full bg-[#FFF59A] text-gray-800 py-3.5 rounded-lg font-bold hover:opacity-90 transition-all shadow-lg relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shine pointer-events-none"></div>
                                <span className="relative z-10">確認しました</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 体脂肪率推定モーダル */}
            {visualGuideModal.show && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg w-full max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-pink-600 text-white p-4 flex justify-between items-center z-10">
                            <h3 className="font-bold text-lg">外見から体脂肪率を推定</h3>
                            <button onClick={() => setVisualGuideModal({ ...visualGuideModal, show: false })} className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1">
                                <Icon name="X" size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <p className="text-sm text-yellow-800 font-medium">
                                    ⚠️ この推定値は外見に基づく主観的評価であり、実際の体脂肪率と±3-5%の誤差があります。正確な測定には体組成計の使用を強く推奨します。
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">性別を選択</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setVisualGuideModal({ ...visualGuideModal, gender: '男性' })}
                                        className={`flex-1 px-4 py-2 rounded-lg border-2 ${visualGuideModal.gender === '男性' ? 'border-orange-600 bg-orange-50 text-orange-700' : 'border-gray-300'}`}
                                    >
                                        男性
                                    </button>
                                    <button
                                        onClick={() => setVisualGuideModal({ ...visualGuideModal, gender: '女性' })}
                                        className={`flex-1 px-4 py-2 rounded-lg border-2 ${visualGuideModal.gender === '女性' ? 'border-pink-600 bg-pink-50 text-pink-700' : 'border-gray-300'}`}
                                    >
                                        女性
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-3">
                                    あなたの体型に最も近いレベルを選択してください (1-10)
                                </label>
                                <div className="space-y-2">
                                    {LBMUtils.getVisualGuideInfo(visualGuideModal.gender).map((guide) => {
                                        const isSelected = visualGuideModal.selectedLevel === guide.level;
                                        return (
                                            <button
                                                key={guide.level}
                                                onClick={() => setVisualGuideModal({ ...visualGuideModal, selectedLevel: guide.level })}
                                                className={`w-full text-left p-4 rounded-lg border-2 transition ${
                                                    isSelected
                                                        ? 'border-orange-600 bg-orange-50'
                                                        : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'
                                                }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                                                        isSelected ? 'bg-[#4A9EFF] text-white shadow-md' : 'bg-gray-200 text-gray-600'
                                                    }`}>
                                                        {guide.level}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-bold text-gray-800">{guide.title}</span>
                                                            <span className="text-sm text-gray-600">({guide.range})</span>
                                                        </div>
                                                        <ul className="text-sm text-gray-600 space-y-1">
                                                            {guide.features.map((feature, idx) => (
                                                                <li key={idx}>• {feature}</li>
                                                            ))}
                                                        </ul>
                                                        <p className="text-xs text-gray-600 mt-2">健康: {guide.health}</p>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-orange-50 to-pink-50 p-4 rounded-lg border border-orange-200">
                                <p className="text-sm font-medium text-gray-600 mb-2">推定結果</p>
                                <p className="text-3xl font-bold text-orange-600">
                                    {LBMUtils.estimateBodyFatByAppearance(visualGuideModal.gender, visualGuideModal.selectedLevel).bodyFatPercentage}%
                                </p>
                                <p className="text-sm text-gray-600 mt-2">
                                    {LBMUtils.estimateBodyFatByAppearance(visualGuideModal.gender, visualGuideModal.selectedLevel).description}
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setVisualGuideModal({ ...visualGuideModal, show: false })}
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    キャンセル
                                </button>
                                <button
                                    onClick={() => {
                                        const estimate = LBMUtils.estimateBodyFatByAppearance(visualGuideModal.gender, visualGuideModal.selectedLevel);
                                        updateBodyComposition(bodyComposition.weight, estimate.bodyFatPercentage);
                                        setVisualGuideModal({ ...visualGuideModal, show: false });
                                    }}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-600 to-pink-600 text-white rounded-lg hover:from-orange-700 hover:to-pink-700 font-medium"
                                >
                                    この値を使用
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Premium会員登録モーダル */}
            {showSubscriptionModal && window.SubscriptionView && (
                <window.SubscriptionView
                    onClose={() => setShowSubscriptionModal(false)}
                    userId={user?.uid}
                    userProfile={profile}
                />
            )}

            {/* ピンポイントカロリー設定モーダル */}
            {showCalorieOverrideModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
                        <div className="flex-shrink-0 bg-orange-500 text-white p-4 flex justify-between items-center">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Icon name="Zap" size={20} />
                                ピンポイント変更
                            </h3>
                            <button onClick={() => { setShowCalorieOverrideModal(false); setCustomCalorieAdjustment(''); setCustomPFC(defaultPFC); }} className="p-1 hover:bg-white hover:bg-opacity-20 rounded-full">
                                <Icon name="X" size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            <p className="text-sm text-gray-600 mb-4">
                                <span className="font-bold text-orange-600">{currentDate}</span> のカロリー・PFC目標を変更します。その日限りの設定です。
                            </p>

                            {/* カロリープリセット */}
                            <div className="mb-4">
                                <label className="text-xs font-medium text-gray-500 mb-2 block">カロリー調整プリセット</label>
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() => applyCalorieOverride('チートデー', 500, customPFC)}
                                        className="p-3 border-2 border-gray-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition flex justify-between items-center"
                                    >
                                        <span className="font-bold text-gray-800">チートデー</span>
                                        <span className="text-green-600 font-bold">+500 kcal</span>
                                    </button>
                                    <button
                                        onClick={() => applyCalorieOverride('リフィード', 300, customPFC)}
                                        className="p-3 border-2 border-gray-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition flex justify-between items-center"
                                    >
                                        <span className="font-bold text-gray-800">リフィード</span>
                                        <span className="text-green-600 font-bold">+300 kcal</span>
                                    </button>
                                    <button
                                        onClick={() => applyCalorieOverride('軽めの日', -300, customPFC)}
                                        className="p-3 border-2 border-gray-200 rounded-xl hover:border-red-400 hover:bg-red-50 transition flex justify-between items-center"
                                    >
                                        <span className="font-bold text-gray-800">軽めの日</span>
                                        <span className="text-red-600 font-bold">-300 kcal</span>
                                    </button>
                                    <button
                                        onClick={() => applyCalorieOverride('VLCD', -500, customPFC)}
                                        className="p-3 border-2 border-gray-200 rounded-xl hover:border-red-400 hover:bg-red-50 transition flex justify-between items-center"
                                    >
                                        <span className="font-bold text-gray-800">VLCD</span>
                                        <span className="text-red-600 font-bold">-500 kcal</span>
                                    </button>
                                </div>
                            </div>

                            {/* カスタムカロリー入力 */}
                            <div className="border-t pt-4 mb-4">
                                <label className="text-xs font-medium text-gray-500 mb-2 block">カスタムカロリー調整</label>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="number"
                                        value={customCalorieAdjustment}
                                        onChange={(e) => setCustomCalorieAdjustment(e.target.value)}
                                        placeholder="例: -200 または +400"
                                        className="flex-1 p-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:outline-none"
                                    />
                                    <span className="text-sm text-gray-500">kcal</span>
                                </div>
                            </div>

                            {/* PFCバランス */}
                            <div className="border-t pt-4">
                                <label className="text-xs font-medium text-gray-500 mb-2 block">PFCバランス</label>
                                <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                                    {/* タンパク質 */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm font-medium text-red-500">タンパク質 (P)</span>
                                            <span className="text-sm font-bold">{customPFC.P}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="15"
                                            max="50"
                                            step="1"
                                            value={customPFC.P}
                                            onChange={(e) => {
                                                const newP = Number(e.target.value);
                                                const currentF = customPFC.F;
                                                const newC = 100 - newP - currentF;
                                                if (newC >= 15 && newC <= 60) {
                                                    setCustomPFC({ P: newP, F: currentF, C: newC });
                                                }
                                            }}
                                            className="w-full"
                                        />
                                    </div>
                                    {/* 脂質 */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm font-medium text-yellow-500">脂質 (F)</span>
                                            <span className="text-sm font-bold">{customPFC.F}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="15"
                                            max="40"
                                            step="1"
                                            value={customPFC.F}
                                            onChange={(e) => {
                                                const newF = Number(e.target.value);
                                                const currentP = customPFC.P;
                                                const newC = 100 - currentP - newF;
                                                if (newC >= 15 && newC <= 60) {
                                                    setCustomPFC({ P: currentP, F: newF, C: newC });
                                                }
                                            }}
                                            className="w-full"
                                        />
                                    </div>
                                    {/* 炭水化物 */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm font-medium text-green-500">炭水化物 (C)</span>
                                            <span className="text-sm font-bold">{customPFC.C}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="15"
                                            max="60"
                                            step="1"
                                            value={customPFC.C}
                                            onChange={(e) => {
                                                const newC = Number(e.target.value);
                                                const currentP = customPFC.P;
                                                const newF = 100 - currentP - newC;
                                                if (newF >= 15 && newF <= 40) {
                                                    setCustomPFC({ P: currentP, F: newF, C: newC });
                                                }
                                            }}
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t">
                                        <div className="text-xs text-gray-600">
                                            合計 {customPFC.P + customPFC.F + customPFC.C}%
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setCustomPFC(defaultPFC)}
                                            className="text-xs text-[#4A9EFF] hover:text-[#3b8fef] underline"
                                        >
                                            現在のバランスに戻す (P{defaultPFC.P}:F{defaultPFC.F}:C{defaultPFC.C})
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* 適用ボタン */}
                            <div className="mt-4 pt-4 border-t">
                                <button
                                    onClick={() => {
                                        // 入力がある場合のみ数値化、空欄ならundefined（目的ベースのカロリー調整を維持）
                                        const calorieValue = customCalorieAdjustment !== ''
                                            ? parseInt(customCalorieAdjustment)
                                            : undefined;
                                        if (customCalorieAdjustment !== '' && isNaN(calorieValue)) {
                                            toast.error('有効なカロリー値を入力してください');
                                            return;
                                        }
                                        // 名前を決定：カロリー調整ありなら「カスタム」、なければ「PFCバランスのみ」
                                        const name = calorieValue !== undefined && calorieValue !== 0 ? 'カスタム' : 'PFCバランスのみ';
                                        applyCalorieOverride(name, calorieValue, customPFC);
                                    }}
                                    className="w-full py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition flex items-center justify-center gap-2"
                                >
                                    <Icon name="Check" size={18} />
                                    この設定を適用
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ===== Level Banner Component =====
const LevelBanner = ({ user, userProfile, setInfoModal }) => {
    // userProfileから直接経験値・レベルを計算（キャッシュ不整合を防ぐ）
    const expData = useMemo(() => {
        if (!userProfile) return null;

        const experience = userProfile.experience || 0;

        // ExperienceServiceと同じ計算式: 100 * level * (level - 1) / 2
        const getRequiredExpForLevel = (level) => 100 * level * (level - 1) / 2;

        // 現在のレベルを計算
        let level = 1;
        while (getRequiredExpForLevel(level + 1) <= experience) {
            level++;
        }

        // 次のレベルまでの経験値を計算
        const currentLevelRequired = getRequiredExpForLevel(level);
        const nextLevelRequired = getRequiredExpForLevel(level + 1);
        const expCurrent = experience - currentLevelRequired;
        const expRequired = nextLevelRequired - currentLevelRequired;
        const expProgress = Math.round((expCurrent / expRequired) * 100);

        // クレジット計算
        const freeCredits = userProfile.freeCredits || 0;
        const paidCredits = userProfile.paidCredits || 0;
        const totalCredits = freeCredits + paidCredits;

        return {
            level,
            experience,
            expCurrent,
            expRequired,
            expProgress,
            freeCredits,
            paidCredits,
            totalCredits
        };
    }, [userProfile]);

    if (!expData) {
        return null; // ローディング中は何も表示しない
    }

    return (
        <div className="bg-[#4A9EFF] shadow-sm">
            <div className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-white">Lv{expData.level}</span>
                    <div className="relative w-24 bg-white/20 rounded-full h-1.5 overflow-hidden">
                        <div
                            className="absolute top-0 left-0 h-full bg-white rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(expData.expProgress || 0, 100)}%` }}
                        />
                    </div>
                    <span className="text-xs text-white font-medium">{expData.expCurrent} / {expData.expRequired} XP</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1">
                        <Icon name="Award" size={14} className="text-white" />
                        <span className="text-sm font-bold text-blue-200" title="無料クレジット">{expData.freeCredits || 0}</span>
                        <span className="text-xs text-white/60">/</span>
                        <span className="text-sm font-bold text-amber-200" title="有料クレジット">{expData.paidCredits || 0}</span>
                    </div>
                    <button
                        onClick={() => setInfoModal({
                            show: true,
                            title: '💳 クレジットシステム',
                            content: `クレジットはAI機能を利用する際に消費されるポイントです。

【消費されるタイミング】
• 分析機能（1回につき1クレジット）
• 写真解析機能（1回につき1クレジット）

【クレジットの種類】
■ 無料クレジット
• 初回登録：14クレジット付与
• レベルアップ：3クレジット/回
• リワード：10/20/30...レベル到達で5クレジット
※AI分析・写真解析に使用可能

■ 有料クレジット
• 月額契約（¥940/月）：毎月100クレジット付与
• 追加購入パック：
  - 50回パック：¥400
  - 150回パック：¥1,000
  - 300回パック：¥1,800
※AI分析・写真解析・教科書購入に使用可能

【教科書購入について】
• PGBASE内の有料教科書は有料クレジットのみで購入可能
• 1冊あたり50クレジット（¥500相当）
• 無料クレジットでは購入できません

【消費の優先順位】
AI分析・写真解析：無料→有料の順に使用
教科書購入：有料クレジットのみ

【経験値の獲得】
• 分析実行後、食事・運動・コンディションのスコアが経験値として加算されます
• 1日最大300XP（各項目100点満点）`
                        })}
                        className="text-white/80 hover:text-white transition p-1"
                    >
                        <Icon name="HelpCircle" size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

// ===== Directive Edit Modal Component =====
const DirectiveEditModal = ({ directive, onClose, onSave, onDelete, getCategoryIcon, getCategoryLabel, getCategoryColor }) => {
    const [editedMessage, setEditedMessage] = useState(directive.message);

    const handleSave = () => {
        if (!editedMessage.trim()) {
            toast('指示内容を入力してください');
            return;
        }
        onSave({ ...directive, message: editedMessage.trim() });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-[95vw] sm:max-w-md shadow-2xl">
                {/* ヘッダー */}
                <div className="p-4 border-b-2 border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-800">
                        指示書を編集
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
                        <Icon name="X" size={24} />
                    </button>
                </div>

                {/* コンテンツ */}
                <div className="p-6 space-y-4">
                    {/* 指示内容 */}
                    <div>
                        <label className="text-sm font-bold text-gray-600 block mb-2">指示内容</label>
                        <textarea
                            value={editedMessage}
                            onChange={(e) => setEditedMessage(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#4A9EFF] focus:ring-2 focus:ring-blue-200 focus:outline-none transition text-sm"
                            rows="3"
                            placeholder="例: 鶏むね肉150g追加"
                        />
                    </div>
                </div>

                {/* アクションボタン */}
                <div className="p-4 border-t-2 border-gray-200 flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-white border-2 border-gray-300 text-gray-600 font-semibold py-3 px-6 rounded-lg hover:bg-gray-50 transition"
                    >
                        キャンセル
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 bg-[#4A9EFF] text-white font-semibold py-3 px-6 rounded-lg hover:bg-[#3b8fef] transition flex items-center justify-center gap-2"
                    >
                        <Icon name="Save" size={18} />
                        更新
                    </button>
                </div>
            </div>
        </div>
    );
};



// グローバルに公開
window.DashboardView = DashboardView;
window.LevelBanner = LevelBanner;
window.DirectiveEditModal = DirectiveEditModal;

