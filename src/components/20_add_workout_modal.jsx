import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

// ===== AddWorkoutModal: 新しい運動記録モーダル =====
// フロー: 種目選択・追加 → セット記録 → 記録
//
// Props:
// - onClose: () => void - モーダルを閉じる
// - onAdd: (workout) => void - 運動を記録
// - onUpdate: (workout) => void - 運動を更新（編集モード時）
// - editingWorkout: Object | null - 編集対象の運動データ
// - user: Object - ユーザー情報
// - userProfile: Object - ユーザープロフィール
// - unlockedFeatures: Array - 解放済み機能
// - usageDays: Number - 利用日数

const AddWorkoutModal = ({
    onClose,
    onAdd,
    onUpdate,
    editingWorkout = null,
    user,
    userProfile,
    unlockedFeatures = [],
    usageDays = 0
}) => {
    // ===== 編集モード判定 =====
    const isEditMode = !!editingWorkout;

    // ===== State管理 =====
    const [workoutName, setWorkoutName] = useState(isEditMode ? editingWorkout.name : 'トレーニング');
    const [isEditingWorkoutName, setIsEditingWorkoutName] = useState(false); // トレーニング名編集モード
    const [workoutTemplates, setWorkoutTemplates] = useState([]);
    const [exercises, setExercises] = useState(isEditMode ? editingWorkout.exercises || [] : []);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);
    const [showCustomForm, setShowCustomForm] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false); // ヘルプモーダル

    // 確認モーダル
    const { showConfirm, ConfirmModalComponent } = window.useConfirmModal();

    // 検索モーダル用のstate
    const [searchTerm, setSearchTerm] = useState('');
    const [exerciseTab, setExerciseTab] = useState('strength'); // 'strength', 'cardio', 'stretch'
    const [expandedCategories, setExpandedCategories] = useState({});

    // 現在編集中の種目
    const [currentExercise, setCurrentExercise] = useState(null);
    const [currentSets, setCurrentSets] = useState([]);

    // カスタム種目データ
    const [customExerciseData, setCustomExerciseData] = useState({
        name: '',
        category: '胸',
        subcategory: 'コンパウンド',
        exerciseType: 'anaerobic',
        equipment: ''
    });

    // Icon はグローバルに公開されている前提
    const Icon = window.Icon;

    // DataService を使用
    const DataService = window.DataService;

    // trainingDatabase を使用
    const trainingDB = window.trainingDatabase || {};

    // ===== テンプレート読み込み =====
    useEffect(() => {
        if (user) {
            const loadTemplates = async () => {
                try {
                    const templates = await DataService.getWorkoutTemplates(user.uid);
                    setWorkoutTemplates(templates || []);
                } catch (error) {
                    console.error('テンプレート読み込みエラー:', error);
                    setWorkoutTemplates([]);
                }
            };
            loadTemplates();
        }
    }, [user]);

    // ===== trainingDatabaseを配列形式に変換 =====
    const exerciseDB = [];
    Object.keys(trainingDB).forEach(category => {
        Object.keys(trainingDB[category]).forEach(exerciseName => {
            const exerciseData = trainingDB[category][exerciseName];
            exerciseDB.push({
                id: `${category}_${exerciseName}`,
                name: exerciseName,
                category: category,
                subcategory: exerciseData.subcategory || 'その他',
                exerciseType: exerciseData.exerciseType || 'anaerobic',
                equipment: exerciseData.equipment || '',
                difficulty: exerciseData.difficulty || '初級',
                primaryMuscles: exerciseData.primaryMuscles || [],
                secondaryMuscles: exerciseData.secondaryMuscles || []
            });
        });
    });

    // LocalStorageからカスタム種目を読み込み
    const customExercises = JSON.parse(localStorage.getItem('customExercises') || '[]');

    // exerciseDBとカスタム種目をマージ
    const allExercises = [...exerciseDB, ...customExercises];

    // 検索フィルター
    const fuzzyMatch = (text, query) => {
        if (!query || query.trim() === '') return true;
        const normalize = (str) => {
            return str
                .toLowerCase()
                .replace(/[\u3041-\u3096]/g, match => String.fromCharCode(match.charCodeAt(0) + 0x60))
                .replace(/\s+/g, '');
        };
        return normalize(text).includes(normalize(query));
    };

    const filteredExercises = allExercises.filter(ex =>
        fuzzyMatch(ex.name, searchTerm) ||
        fuzzyMatch(ex.category, searchTerm)
    );

    // ===== 種目選択ハンドラー =====
    const handleExerciseSelect = (exercise) => {
        setCurrentExercise(exercise);
        setCurrentSets([{ weight: 0, reps: 10, duration: 0 }]);
        setShowSearchModal(false);
    };

    // ===== セット追加 =====
    const addSet = () => {
        const lastSet = currentSets[currentSets.length - 1] || { weight: 0, reps: 10, duration: 0 };
        setCurrentSets([...currentSets, { ...lastSet }]);
    };

    // ===== セット削除 =====
    const removeSet = (index) => {
        setCurrentSets(currentSets.filter((_, i) => i !== index));
    };

    // ===== セット更新 =====
    const updateSet = (index, field, value) => {
        const newSets = [...currentSets];
        newSets[index] = { ...newSets[index], [field]: parseFloat(value) || 0 };
        setCurrentSets(newSets);
    };

    // ===== 種目を追加 =====
    const addExerciseToList = () => {
        if (!currentExercise || currentSets.length === 0) return;

        const newExercise = {
            exercise: currentExercise,
            name: currentExercise.name,
            exerciseType: currentExercise.exerciseType,
            sets: currentSets
        };

        setExercises([...exercises, newExercise]);
        setCurrentExercise(null);
        setCurrentSets([]);
    };

    // ===== 種目を削除 =====
    const removeExercise = (index) => {
        setExercises(exercises.filter((_, i) => i !== index));
    };

    // ===== カスタム種目作成 =====
    const createCustomExercise = () => {
        if (!customExerciseData.name.trim()) {
            toast('種目名を入力してください');
            return;
        }

        const newCustomExercise = {
            id: `custom_${Date.now()}`,
            ...customExerciseData
        };

        // LocalStorageに保存
        const existingCustom = JSON.parse(localStorage.getItem('customExercises') || '[]');
        existingCustom.push(newCustomExercise);
        localStorage.setItem('customExercises', JSON.stringify(existingCustom));

        // 選択状態にして編集画面へ
        handleExerciseSelect(newCustomExercise);
        setShowCustomForm(false);

        // フォームリセット
        setCustomExerciseData({
            name: '',
            category: '胸',
            subcategory: 'コンパウンド',
            exerciseType: 'anaerobic',
            equipment: ''
        });
    };

    // ===== テンプレートから追加 =====
    const addFromTemplate = (template) => {
        const copiedExercises = JSON.parse(JSON.stringify(template.exercises));
        setExercises(copiedExercises);
        setWorkoutName(template.name);
        setShowTemplateSelector(false);
    };

    // ===== テンプレート削除 =====
    const deleteTemplate = async (templateId) => {
        showConfirm('テンプレート削除の確認', 'このテンプレートを削除しますか？', async () => {
            try {
                await DataService.deleteWorkoutTemplate(user.uid, templateId);
                const templates = await DataService.getWorkoutTemplates(user.uid);
                setWorkoutTemplates(templates || []);
            } catch (error) {
                console.error('テンプレート削除エラー:', error);
            }
        });
    };

    // ===== テンプレート保存 =====
    const [templateName, setTemplateName] = useState('');
    const [showSaveTemplateInput, setShowSaveTemplateInput] = useState(false);

    const saveAsTemplate = async () => {
        if (!templateName.trim() || exercises.length === 0) {
            toast('テンプレート名を入力し、種目を追加してください');
            return;
        }
        const template = {
            id: Date.now(),
            name: templateName,
            exercises: exercises
        };
        try {
            await DataService.saveWorkoutTemplate(user.uid, template);
            const templates = await DataService.getWorkoutTemplates(user.uid);
            setWorkoutTemplates(templates);
            toast.success('テンプレートを保存しました');
            setTemplateName('');
            setShowSaveTemplateInput(false);
        } catch (error) {
            console.error('テンプレート保存エラー:', error);
            toast.error('テンプレート保存に失敗しました');
        }
    };

    // ===== 記録ハンドラー =====
    const handleRecord = () => {
        if (exercises.length === 0) {
            toast('種目を追加してください');
            return;
        }

        const workout = {
            id: isEditMode ? editingWorkout.id : Date.now(),
            name: workoutName,
            timestamp: isEditMode ? editingWorkout.timestamp : new Date().toISOString(),
            time: isEditMode ? editingWorkout.time : new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
            exercises: exercises
        };

        // 編集モードの場合はonUpdate、新規追加の場合はonAddを呼ぶ
        if (isEditMode && onUpdate) {
            onUpdate(workout);
        } else if (onAdd) {
            onAdd(workout);
        }

        onClose();
    };

    // ===== 総カロリー・体積計算 =====
    const calculateTotals = () => {
        let totalVolume = 0;
        let totalDuration = 0;

        exercises.forEach(ex => {
            ex.sets.forEach(set => {
                totalVolume += (set.weight || 0) * (set.reps || 0);
                totalDuration += set.duration || 0;
            });
        });

        return { totalVolume, totalDuration };
    };

    const { totalVolume, totalDuration } = calculateTotals();

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                {/* ===== ヘッダー ===== */}
                <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
                    {/* トレーニング名 */}
                    <div className="flex-1">
                        {isEditingWorkoutName ? (
                            <input
                                type="text"
                                value={workoutName}
                                onChange={(e) => setWorkoutName(e.target.value)}
                                onBlur={() => setIsEditingWorkoutName(false)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') setIsEditingWorkoutName(false);
                                }}
                                autoFocus
                                className="text-xl font-bold border-b-2 border-[#4A9EFF] focus:outline-none w-full"
                            />
                        ) : (
                            <h2
                                onClick={() => setIsEditingWorkoutName(true)}
                                className="text-xl font-bold cursor-pointer hover:text-[#4A9EFF] transition"
                            >
                                {workoutName}
                            </h2>
                        )}
                    </div>

                    {/* ヘルプアイコンと閉じるボタン */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowHelpModal(true)}
                            className="p-2 hover:bg-blue-50 rounded-full transition"
                            title="使い方"
                        >
                            <Icon name="HelpCircle" size={20} className="text-[#4A9EFF]" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition"
                        >
                            <Icon name="X" size={24} className="text-gray-600" />
                        </button>
                    </div>
                </div>

                {/* ===== メインコンテンツ ===== */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* 種目選択画面 */}
                    {!currentExercise && !showCustomForm && (
                        <div className="space-y-2">
                            {/* テンプレート（12日以上で解放） */}
                            {usageDays >= 12 && (
                                <button
                                    type="button"
                                    onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                                    className="w-full px-4 py-3 bg-purple-50 border-2 border-purple-400 text-purple-700 rounded-lg font-semibold hover:bg-purple-100 transition"
                                >
                                    <Icon name="BookTemplate" size={16} className="inline mr-1" />
                                    テンプレート
                                </button>
                            )}

                            {/* テンプレート一覧 */}
                            {showTemplateSelector && usageDays >= 12 && (
                                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 space-y-2">
                                    {workoutTemplates.length > 0 ? (
                                        workoutTemplates.map(template => (
                                            <div key={template.id} className="bg-white p-3 rounded-lg border border-purple-200">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-sm">{template.name}</p>
                                                        <p className="text-xs text-gray-600 mt-1">
                                                            {template.exercises?.length || 0}種目
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => addFromTemplate(template)}
                                                            className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium"
                                                        >
                                                            使用
                                                        </button>
                                                        <button
                                                            onClick={() => deleteTemplate(template.id)}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                                                        >
                                                            <Icon name="Trash2" size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-600 text-center py-4">保存されたテンプレートはありません</p>
                                    )}
                                </div>
                            )}

                            {/* 種目を検索 */}
                            <button
                                type="button"
                                onClick={() => setShowSearchModal(true)}
                                className="w-full px-4 py-3 bg-white border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 rounded-lg font-semibold transition"
                            >
                                <Icon name="Search" size={16} className="inline mr-1" />
                                一覧から検索
                            </button>

                            {/* 手動で作成 */}
                            <button
                                type="button"
                                onClick={() => setShowCustomForm(true)}
                                className="w-full px-4 py-3 bg-white border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 rounded-lg font-semibold transition"
                            >
                                <Icon name="Edit" size={16} className="inline mr-1" />
                                カスタム作成
                            </button>
                        </div>
                    )}

                    {/* カスタム種目作成フォーム */}
                    {showCustomForm && (
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-300 space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold">カスタム種目を作成</h4>
                                <button
                                    onClick={() => setShowCustomForm(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <Icon name="X" size={20} />
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">種目名</label>
                                <input
                                    type="text"
                                    value={customExerciseData.name}
                                    onChange={(e) => setCustomExerciseData({ ...customExerciseData, name: e.target.value })}
                                    placeholder="例: マイトレーニング"
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">カテゴリ</label>
                                <select
                                    value={customExerciseData.category}
                                    onChange={(e) => setCustomExerciseData({ ...customExerciseData, category: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                >
                                    <option value="胸">胸</option>
                                    <option value="背中">背中</option>
                                    <option value="脚">脚</option>
                                    <option value="肩">肩</option>
                                    <option value="腕">腕</option>
                                    <option value="腹筋・体幹">腹筋・体幹</option>
                                    <option value="尻">尻</option>
                                    <option value="有酸素運動">有酸素運動</option>
                                    <option value="ストレッチ">ストレッチ</option>
                                    <option value="カスタム">カスタム</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">器具</label>
                                <input
                                    type="text"
                                    value={customExerciseData.equipment}
                                    onChange={(e) => setCustomExerciseData({ ...customExerciseData, equipment: e.target.value })}
                                    placeholder="例: ダンベル"
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>

                            <button
                                onClick={createCustomExercise}
                                className="w-full bg-[#4A9EFF] text-white py-3 rounded-lg font-bold hover:bg-[#3A8EEF] transition"
                            >
                                作成
                            </button>
                        </div>
                    )}

                    {/* 種目編集画面（セット入力） */}
                    {currentExercise && (
                        <div className="space-y-4">
                            <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <h3 className="font-bold text-lg">{currentExercise.name}</h3>
                                        <p className="text-sm text-gray-600">{currentExercise.category} / {currentExercise.equipment}</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setCurrentExercise(null);
                                            setCurrentSets([]);
                                        }}
                                        className="text-gray-500 hover:text-gray-700"
                                    >
                                        <Icon name="X" size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* セット一覧 */}
                            <div className="space-y-2">
                                {currentSets.map((set, index) => (
                                    <div key={index} className="bg-white border border-gray-300 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="font-medium text-sm">セット {index + 1}</span>
                                            <button
                                                onClick={() => removeSet(index)}
                                                className="ml-auto text-red-600 hover:text-red-700"
                                            >
                                                <Icon name="Trash2" size={16} />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div>
                                                <label className="block text-xs text-gray-600 mb-1">重量 (kg)</label>
                                                <input
                                                    type="number"
                                                    value={set.weight}
                                                    onChange={(e) => updateSet(index, 'weight', e.target.value)}
                                                    className="w-full px-2 py-1.5 border rounded text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-600 mb-1">回数</label>
                                                <input
                                                    type="number"
                                                    value={set.reps}
                                                    onChange={(e) => updateSet(index, 'reps', e.target.value)}
                                                    className="w-full px-2 py-1.5 border rounded text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-600 mb-1">時間 (分)</label>
                                                <input
                                                    type="number"
                                                    value={set.duration}
                                                    onChange={(e) => updateSet(index, 'duration', e.target.value)}
                                                    className="w-full px-2 py-1.5 border rounded text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* セット追加ボタン */}
                            <button
                                onClick={addSet}
                                className="w-full bg-gray-100 border-2 border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition flex items-center justify-center gap-2"
                            >
                                <Icon name="Plus" size={20} />
                                セットを追加
                            </button>

                            {/* リストに追加ボタン */}
                            <button
                                onClick={addExerciseToList}
                                className="w-full bg-[#4A9EFF] text-white py-3 rounded-lg font-bold hover:bg-[#3A8EEF] transition"
                            >
                                リストに追加
                            </button>
                        </div>
                    )}

                    {/* 追加済み種目一覧 */}
                    {exercises.length > 0 && !currentExercise && !showCustomForm && (
                        <div className="mt-6 space-y-4">
                            <h3 className="font-bold text-lg">追加済み種目</h3>
                            {exercises.map((ex, exIndex) => (
                                <div key={exIndex} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-bold">{ex.name}</h4>
                                        <button
                                            onClick={() => removeExercise(exIndex)}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <Icon name="Trash2" size={18} />
                                        </button>
                                    </div>
                                    <div className="space-y-1">
                                        {ex.sets?.map((set, setIndex) => (
                                            <p key={setIndex} className="text-sm text-gray-700">
                                                セット{setIndex + 1}: {set.weight}kg × {set.reps}回
                                                {set.duration > 0 && ` (${set.duration}分)`}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ===== フッター ===== */}
                <div className="sticky bottom-0 bg-white border-t p-4 space-y-3">
                    {/* 統計情報 */}
                    {exercises.length > 0 && (
                        <div className="flex items-center justify-between text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                            <div>
                                <span className="font-medium">種目数:</span> {exercises.length}
                            </div>
                            <div>
                                <span className="font-medium">総体積:</span> {totalVolume.toFixed(0)}kg
                            </div>
                            {totalDuration > 0 && (
                                <div>
                                    <span className="font-medium">時間:</span> {totalDuration}分
                                </div>
                            )}
                        </div>
                    )}

                    {/* テンプレート保存 */}
                    {exercises.length > 0 && usageDays >= 12 && !currentExercise && (
                        <div>
                            {!showSaveTemplateInput ? (
                                <button
                                    onClick={() => setShowSaveTemplateInput(true)}
                                    className="w-full text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center justify-center gap-2 py-2"
                                >
                                    <Icon name="BookTemplate" size={16} />
                                    テンプレートとして保存
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={templateName}
                                        onChange={(e) => setTemplateName(e.target.value)}
                                        placeholder="テンプレート名（例: 胸トレ1）"
                                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                    />
                                    <button
                                        onClick={saveAsTemplate}
                                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium"
                                    >
                                        保存
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowSaveTemplateInput(false);
                                            setTemplateName('');
                                        }}
                                        className="px-3 py-2 text-gray-600 hover:text-gray-700"
                                    >
                                        <Icon name="X" size={20} />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 記録ボタン */}
                    <button
                        onClick={handleRecord}
                        disabled={exercises.length === 0}
                        className={`w-full py-3 rounded-xl font-bold transition ${
                            exercises.length === 0
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-[#4A9EFF] text-white hover:bg-[#3A8EEF] shadow-lg'
                        }`}
                    >
                        {isEditMode ? '更新' : '記録'}
                    </button>
                </div>

                {/* ===== 検索モーダル ===== */}
                {showSearchModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100000] p-4">
                        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
                            {/* ヘッダー */}
                            <div className="sticky top-0 bg-white border-b p-4">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold">種目を検索</h3>
                                    <button
                                        onClick={() => setShowSearchModal(false)}
                                        className="text-gray-500 hover:text-gray-700"
                                    >
                                        <Icon name="X" size={24} />
                                    </button>
                                </div>

                                {/* 検索欄 */}
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="種目を検索..."
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none mb-3"
                                />

                                {/* タブ */}
                                <div className="grid grid-cols-3 border-b border-gray-200">
                                    <button
                                        onClick={() => setExerciseTab('strength')}
                                        className={`py-3 px-4 font-medium transition flex items-center justify-center gap-2 border-b-2 ${
                                            exerciseTab === 'strength'
                                                ? 'border-orange-600 text-orange-600'
                                                : 'border-transparent text-gray-600 hover:text-orange-600'
                                        }`}
                                    >
                                        <Icon name="Dumbbell" size={20} />
                                        <span className="text-sm">筋トレ</span>
                                    </button>
                                    <button
                                        onClick={() => setExerciseTab('cardio')}
                                        className={`py-3 px-4 font-medium transition flex items-center justify-center gap-2 border-b-2 ${
                                            exerciseTab === 'cardio'
                                                ? 'border-blue-600 text-blue-600'
                                                : 'border-transparent text-gray-600 hover:text-blue-600'
                                        }`}
                                    >
                                        <Icon name="Heart" size={20} />
                                        <span className="text-sm">有酸素</span>
                                    </button>
                                    <button
                                        onClick={() => setExerciseTab('stretch')}
                                        className={`py-3 px-4 font-medium transition flex items-center justify-center gap-2 border-b-2 ${
                                            exerciseTab === 'stretch'
                                                ? 'border-green-600 text-green-600'
                                                : 'border-transparent text-gray-600 hover:text-green-600'
                                        }`}
                                    >
                                        <Icon name="Wind" size={20} />
                                        <span className="text-sm">ストレッチ</span>
                                    </button>
                                </div>
                            </div>

                            {/* コンテンツエリア */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {(() => {
                                    // 部位ごとにグループ化
                                    const categorizedExercises = {};

                                    // タブに応じてフィルタリング
                                    const strengthCategories = ['胸', '背中', '脚', '肩', '腕', '腹筋・体幹', '尻', 'ウエイトリフティング', 'カスタム'];
                                    const cardioCategories = ['有酸素運動', 'カスタム'];
                                    const stretchCategories = ['ストレッチ', 'カスタム'];

                                    filteredExercises.forEach(ex => {
                                        let shouldInclude = false;
                                        if (exerciseTab === 'strength' && strengthCategories.includes(ex.category)) {
                                            shouldInclude = true;
                                        } else if (exerciseTab === 'cardio' && cardioCategories.includes(ex.category)) {
                                            shouldInclude = true;
                                        } else if (exerciseTab === 'stretch' && stretchCategories.includes(ex.category)) {
                                            shouldInclude = true;
                                        }

                                        if (shouldInclude) {
                                            if (!categorizedExercises[ex.category]) {
                                                categorizedExercises[ex.category] = {};
                                            }
                                            if (!categorizedExercises[ex.category][ex.subcategory]) {
                                                categorizedExercises[ex.category][ex.subcategory] = [];
                                            }
                                            categorizedExercises[ex.category][ex.subcategory].push(ex);
                                        }
                                    });

                                    return Object.keys(categorizedExercises).map(category => (
                                        <div key={category}>
                                            {/* 部位ヘッダー */}
                                            <div className="bg-white">
                                                <div className="border-t border-gray-200">
                                                    <button
                                                        onClick={() => setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }))}
                                                        className="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100 flex justify-between items-center"
                                                    >
                                                        <span className="font-medium text-sm">{category}</span>
                                                        <Icon name={expandedCategories[category] ? 'ChevronDown' : 'ChevronRight'} size={18} />
                                                    </button>

                                                    {/* サブカテゴリ */}
                                                    {expandedCategories[category] && (
                                                        <div className="bg-gray-50">
                                                            {Object.keys(categorizedExercises[category]).map(subcategory => (
                                                                <div key={subcategory}>
                                                                    <button
                                                                        onClick={() => setExpandedCategories(prev => ({ ...prev, [category + '_' + subcategory]: !prev[category + '_' + subcategory] }))}
                                                                        className="w-full px-4 py-2 bg-white hover:bg-gray-50 flex justify-between items-center border-t border-gray-200"
                                                                    >
                                                                        <span className="text-sm text-gray-700 pl-4">{subcategory}</span>
                                                                        <Icon name={expandedCategories[category + '_' + subcategory] ? 'ChevronDown' : 'ChevronRight'} size={16} />
                                                                    </button>

                                                                    {/* アイテム一覧 */}
                                                                    {expandedCategories[category + '_' + subcategory] && (
                                                                        <div className="p-2 space-y-1 bg-gray-50">
                                                                            {categorizedExercises[category][subcategory].map(exercise => (
                                                                                <button
                                                                                    key={exercise.id}
                                                                                    onClick={() => handleExerciseSelect(exercise)}
                                                                                    className="w-full text-left px-3 py-3 hover:bg-orange-50 transition border-b last:border-b-0 border-gray-100 bg-white rounded"
                                                                                >
                                                                                    <div className="flex justify-between items-center">
                                                                                        <div>
                                                                                            <p className="font-medium text-sm">{exercise.name}</p>
                                                                                            <p className="text-xs text-gray-500">{exercise.equipment}</p>
                                                                                        </div>
                                                                                        {exercise.difficulty && (
                                                                                            <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                                                                                                {exercise.difficulty}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    </div>
                )}

                {/* ===== ヘルプモーダル ===== */}
                {showHelpModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100000] p-4">
                        <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl">
                            {/* ヘッダー */}
                            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between rounded-t-2xl">
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <Icon name="HelpCircle" size={24} className="text-[#4A9EFF]" />
                                    運動記録の使い方
                                </h3>
                                <button
                                    onClick={() => setShowHelpModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition"
                                >
                                    <Icon name="X" size={20} className="text-gray-600" />
                                </button>
                            </div>

                            {/* コンテンツ */}
                            <div className="p-6 space-y-6">
                                {/* ステップ1 */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-[#4A9EFF] text-white flex items-center justify-center font-bold text-sm">
                                            1
                                        </div>
                                        <h4 className="font-bold text-gray-800">種目を選択</h4>
                                    </div>
                                    <div className="ml-10 space-y-2">
                                        <div className="flex items-start gap-2">
                                            <Icon name="Search" size={16} className="text-[#4A9EFF] mt-0.5" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">種目を検索</p>
                                                <p className="text-xs text-gray-500">データベースから種目を検索して追加</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <Icon name="Plus" size={16} className="text-green-600 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">手動で作成</p>
                                                <p className="text-xs text-gray-500">オリジナルの種目を作成</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <Icon name="BookTemplate" size={16} className="text-purple-600 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">テンプレート</p>
                                                <p className="text-xs text-gray-500">保存したワークアウトを使用</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ステップ2 */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-[#4A9EFF] text-white flex items-center justify-center font-bold text-sm">
                                            2
                                        </div>
                                        <h4 className="font-bold text-gray-800">セットを記録</h4>
                                    </div>
                                    <p className="text-sm text-gray-600 ml-10">
                                        重量、回数、時間を入力します。セット追加ボタンで複数セットを記録できます。
                                    </p>
                                </div>

                                {/* ステップ3 */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-[#4A9EFF] text-white flex items-center justify-center font-bold text-sm">
                                            3
                                        </div>
                                        <h4 className="font-bold text-gray-800">リストに追加</h4>
                                    </div>
                                    <p className="text-sm text-gray-600 ml-10">
                                        「リストに追加」ボタンで、記録した種目をワークアウトに追加します。
                                    </p>
                                </div>

                                {/* ステップ4 */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm">
                                            4
                                        </div>
                                        <h4 className="font-bold text-gray-800">テンプレート保存（任意）</h4>
                                    </div>
                                    <p className="text-sm text-gray-600 ml-10">
                                        よく行うワークアウトは「テンプレートとして保存」で、次回から簡単に記録できます。
                                    </p>
                                </div>

                                {/* ステップ5 */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm">
                                            5
                                        </div>
                                        <h4 className="font-bold text-gray-800">記録完了</h4>
                                    </div>
                                    <p className="text-sm text-gray-600 ml-10">
                                        「記録」ボタンを押すと、ワークアウトが保存されます。{isEditMode ? '編集モードでは、既存のワークアウトが更新されます。' : ''}
                                    </p>
                                </div>

                                {/* Tips */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                                    <div className="flex items-center gap-2 text-[#4A9EFF] font-bold">
                                        <Icon name="Lightbulb" size={18} />
                                        <span className="text-sm">便利な機能</span>
                                    </div>
                                    <ul className="text-xs text-gray-700 space-y-1 ml-6 list-disc">
                                        <li>検索モーダルでカテゴリを選択すると、素早く種目を見つけられます</li>
                                        <li>複数の種目を追加して、ワークアウト全体を記録できます</li>
                                        <li>テンプレートから記録すると、毎回のルーティンワークが簡単に</li>
                                    </ul>
                                </div>
                            </div>

                            {/* フッター */}
                            <div className="sticky bottom-0 bg-white border-t p-4 rounded-b-2xl">
                                <button
                                    onClick={() => setShowHelpModal(false)}
                                    className="w-full bg-[#4A9EFF] text-white py-3 rounded-xl font-bold hover:bg-[#3A8EEF] transition"
                                >
                                    閉じる
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 確認モーダル */}
            <ConfirmModalComponent />
        </div>
    );
};

// グローバルに公開
window.AddWorkoutModal = AddWorkoutModal;

export default AddWorkoutModal;
