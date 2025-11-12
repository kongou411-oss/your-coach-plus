import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

// ===== AddWorkoutModal: ゴールベースの運動記録モーダル =====
// フロー: 運動名入力 → エクササイズ選択・追加 → 記録
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
    const [isEditingWorkoutName, setIsEditingWorkoutName] = useState(false); // 運動名編集モード
    const [workoutTemplates, setWorkoutTemplates] = useState([]);
    const [addedExercises, setAddedExercises] = useState(isEditMode ? editingWorkout.exercises || [] : []);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);
    const [showCustomForm, setShowCustomForm] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false); // ヘルプモーダル

    // 検索モーダル用のstate
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('胸'); // デフォルトで胸を表示

    // 量調整UI用のstate
    const [selectedExerciseIndex, setSelectedExerciseIndex] = useState(null); // 選択中のエクササイズ
    const [adjustmentStep, setAdjustmentStep] = useState(5); // 増減ステップ（回数のデフォルト）
    const [originalAmount, setOriginalAmount] = useState(null); // キャンセル用：元の量を保存

    // 確認モーダル
    const { showConfirm, ConfirmModalComponent } = window.useConfirmModal();

    // カスタムエクササイズデータ
    const [customData, setCustomData] = useState({
        name: '',
        category: '胸',
        met: 3.0,
        unit: '回'
    });

    // Icon はグローバルに公開されている前提
    const Icon = window.Icon;

    // DataService を使用
    const DataService = window.DataService;

    // Firestoreから読み込んだカスタムエクササイズ
    const [customExercises, setCustomExercises] = useState([]);

    // 非表示設定
    const [hiddenStandardExercises, setHiddenStandardExercises] = useState([]);
    const [hiddenCategories, setHiddenCategories] = useState([]);

    // ===== 非表示設定をFirestoreから読み込み =====
    useEffect(() => {
        const loadHiddenSettings = async () => {
            const currentUser = firebase.auth().currentUser;
            if (!currentUser || !currentUser.uid) return;

            try {
                // 非表示エクササイズを読み込み
                const exercisesDoc = await firebase.firestore()
                    .collection('users')
                    .doc(currentUser.uid)
                    .collection('settings')
                    .doc('hiddenStandardExercises')
                    .get();

                if (exercisesDoc.exists) {
                    setHiddenStandardExercises(exercisesDoc.data().exercises || []);
                }

                // 非表示カテゴリを読み込み
                const categoriesDoc = await firebase.firestore()
                    .collection('users')
                    .doc(currentUser.uid)
                    .collection('settings')
                    .doc('hiddenCategories')
                    .get();

                if (categoriesDoc.exists) {
                    setHiddenCategories(categoriesDoc.data().categories || []);
                }
            } catch (error) {
                console.error('非表示設定の読み込みエラー:', error);
            }
        };

        loadHiddenSettings();
    }, [user]);

    // ===== カスタムエクササイズを読み込み =====
    useEffect(() => {
        const loadCustomExercises = async () => {
            const currentUser = firebase.auth().currentUser;
            if (!currentUser || !currentUser.uid) return;

            try {
                const snapshot = await firebase.firestore()
                    .collection('users')
                    .doc(currentUser.uid)
                    .collection('customExercises')
                    .get();

                const exercises = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                setCustomExercises(exercises);
            } catch (error) {
                console.error('カスタムエクササイズの読み込みエラー:', error);
            }
        };

        loadCustomExercises();
    }, [user]);

    // ===== テンプレート読み込み =====
    useEffect(() => {
        const loadTemplates = async () => {
            const currentUser = firebase.auth().currentUser;
            if (!currentUser || !currentUser.uid) return;

            try {
                const templatesData = await DataService.getWorkoutTemplates(currentUser.uid);
                setWorkoutTemplates(templatesData);
            } catch (error) {
                console.error('テンプレート読み込みエラー:', error);
            }
        };

        loadTemplates();
    }, [user]);

    // ===== 合計カロリーを計算 =====
    const totalCalories = addedExercises.reduce((sum, exercise) => {
        const weight = userProfile?.weight || 60; // デフォルト60kg
        const met = exercise.met || 3.0;
        const duration = exercise.duration || 30; // デフォルト30分
        const calories = met * weight * (duration / 60);
        return sum + calories;
    }, 0);

    // ===== エクササイズを追加 =====
    const handleAddExercise = (exercise) => {
        const newExercise = {
            ...exercise,
            id: Date.now().toString(),
            sets: exercise.sets || 3,
            reps: exercise.reps || 10,
            weight: exercise.weight || 0,
            duration: exercise.duration || 30,
            distance: exercise.distance || 0
        };
        setAddedExercises([...addedExercises, newExercise]);
        setShowSearchModal(false);
        setShowCustomForm(false);
    };

    // ===== エクササイズを削除 =====
    const handleRemoveExercise = async (index) => {
        const confirmed = await showConfirm(
            'このエクササイズを削除しますか？',
            '削除'
        );

        if (confirmed) {
            const newExercises = addedExercises.filter((_, i) => i !== index);
            setAddedExercises(newExercises);
        }
    };

    // ===== エクササイズの量を変更 =====
    const handleUpdateExerciseAmount = (index, field, value) => {
        const newExercises = [...addedExercises];
        newExercises[index][field] = value;
        setAddedExercises(newExercises);
    };

    // ===== 記録を保存 =====
    const handleSave = () => {
        if (addedExercises.length === 0) {
            toast.error('エクササイズを追加してください');
            return;
        }

        const workout = {
            name: workoutName,
            exercises: addedExercises,
            totalCalories: Math.round(totalCalories),
            timestamp: new Date().toISOString()
        };

        if (isEditMode) {
            onUpdate({ ...editingWorkout, ...workout });
        } else {
            onAdd(workout);
        }

        onClose();
    };

    // ===== テンプレートとして保存 =====
    const saveAsTemplate = async () => {
        if (addedExercises.length === 0) {
            toast.error('エクササイズを追加してください');
            return;
        }

        const confirmed = await showConfirm(
            `「${workoutName}」をテンプレートとして保存しますか？`,
            '保存'
        );

        if (!confirmed) return;

        try {
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) throw new Error('ユーザーが認証されていません');

            await DataService.saveWorkoutTemplate(currentUser.uid, {
                name: workoutName,
                exercises: addedExercises
            });

            toast.success('テンプレートを保存しました');
        } catch (error) {
            console.error('テンプレート保存エラー:', error);
            toast.error('テンプレートの保存に失敗しました');
        }
    };

    // ===== テンプレートを適用 =====
    const applyTemplate = (template) => {
        setWorkoutName(template.name);
        setAddedExercises(template.exercises || []);
        setShowTemplateSelector(false);
        toast.success(`テンプレート「${template.name}」を適用しました`);
    };

    // ===== カスタムエクササイズを保存 =====
    const saveCustomExercise = async () => {
        if (!customData.name.trim()) {
            toast.error('エクササイズ名を入力してください');
            return;
        }

        try {
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) throw new Error('ユーザーが認証されていません');

            await firebase.firestore()
                .collection('users')
                .doc(currentUser.uid)
                .collection('customExercises')
                .add({
                    ...customData,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            toast.success('カスタムエクササイズを保存しました');

            // カスタムエクササイズをリロード
            const snapshot = await firebase.firestore()
                .collection('users')
                .doc(currentUser.uid)
                .collection('customExercises')
                .get();

            const exercises = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setCustomExercises(exercises);

            // カスタムエクササイズを追加
            handleAddExercise(customData);

            // フォームをリセット
            setCustomData({
                name: '',
                category: '胸',
                met: 3.0,
                unit: '回'
            });
        } catch (error) {
            console.error('カスタムエクササイズ保存エラー:', error);
            toast.error('カスタムエクササイズの保存に失敗しました');
        }
    };

    // ===== 運動データベースを取得 =====
    const getExerciseDatabase = () => {
        return window.trainingDatabase || [];
    };

    // ===== カテゴリ一覧を取得 =====
    const getCategories = () => {
        const db = getExerciseDatabase();
        const categories = [...new Set(db.map(ex => ex.category))];
        return categories.filter(cat => !hiddenCategories.includes(cat));
    };

    // ===== カテゴリ別にエクササイズを取得 =====
    const getExercisesByCategory = (category) => {
        const db = getExerciseDatabase();
        const standardExercises = db.filter(ex =>
            ex.category === category && !hiddenStandardExercises.includes(ex.name)
        );
        const custom = customExercises.filter(ex => ex.category === category);
        return [...standardExercises, ...custom];
    };

    // ===== 検索フィルタリング =====
    const filterExercises = (exercises) => {
        if (!searchTerm) return exercises;
        return exercises.filter(ex => ex.name.toLowerCase().includes(searchTerm.toLowerCase()));
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4" onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}>
                <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                    {/* ヘッダー */}
                    <div className="bg-white border-b px-4 py-2 flex-shrink-0">
                        <div className="flex justify-between items-center">
                            {/* 運動名（編集可能） */}
                            <div className="flex-1 min-w-0 mr-2">
                                {isEditingWorkoutName ? (
                                    <input
                                        type="text"
                                        value={workoutName}
                                        onChange={(e) => setWorkoutName(e.target.value)}
                                        onBlur={() => {
                                            if (!workoutName.trim()) {
                                                setWorkoutName('トレーニング');
                                            }
                                            setIsEditingWorkoutName(false);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                if (!workoutName.trim()) {
                                                    setWorkoutName('トレーニング');
                                                }
                                                setIsEditingWorkoutName(false);
                                            }
                                        }}
                                        className="text-lg font-bold border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500 w-full"
                                        autoFocus
                                    />
                                ) : (
                                    <h3 className="text-lg font-bold truncate">{workoutName}</h3>
                                )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                                {/* 編集ボタン */}
                                {!isEditingWorkoutName && (
                                    <button
                                        onClick={() => setIsEditingWorkoutName(true)}
                                        className="min-w-[44px] min-h-[44px] rounded-lg bg-white shadow-md flex items-center justify-center text-[#4A9EFF] hover:bg-blue-50 transition border-2 border-[#4A9EFF]"
                                        title="編集"
                                    >
                                        <Icon name="Edit" size={18} />
                                    </button>
                                )}
                                {/* ヘルプボタン */}
                                <button
                                    onClick={() => setShowHelpModal(true)}
                                    className="p-2 hover:bg-blue-50 rounded-full transition"
                                    title="使い方"
                                >
                                    <Icon name="HelpCircle" size={20} className="text-[#4A9EFF]" />
                                </button>
                                {/* 閉じるボタン */}
                                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                                    <Icon name="X" size={20} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* この運動の合計 + テンプレート保存ボタン */}
                    {addedExercises.length > 0 && (
                        <div className="px-4 pt-3 pb-2">
                            <div className="flex gap-2">
                                {/* 左側：この運動の合計 */}
                                <div className="flex-1 bg-gradient-to-r from-orange-50 to-red-50 p-3 rounded-lg border border-orange-200">
                                    <div className="text-xs font-medium text-gray-600 mb-1">消費カロリー</div>
                                    <div className="flex items-center justify-between">
                                        <div className="text-lg font-bold text-orange-600">
                                            {Math.round(totalCalories)}kcal
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                            {addedExercises.length}種目
                                        </div>
                                    </div>
                                </div>

                                {/* 右側：テンプレート保存ボタン */}
                                <button
                                    onClick={saveAsTemplate}
                                    className="px-3 bg-purple-50 text-purple-700 border-2 border-purple-500 rounded-lg font-semibold hover:bg-purple-100 transition flex flex-col items-center justify-center"
                                >
                                    <Icon name="BookTemplate" size={16} className="mb-1" />
                                    <span className="text-xs whitespace-nowrap">保存</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 追加済みエクササイズ一覧 */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {addedExercises.length === 0 ? (
                            <div className="text-center py-12 text-gray-600">
                                <Icon name="Dumbbell" size={48} className="mx-auto mb-4 text-gray-400" />
                                <p>エクササイズを追加してください</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {addedExercises.map((exercise, index) => (
                                    <div key={exercise.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex-1">
                                                <div className="font-semibold text-gray-800">{exercise.name}</div>
                                                <div className="text-xs text-gray-500">{exercise.category}</div>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveExercise(index)}
                                                className="text-red-500 hover:text-red-700 p-1"
                                            >
                                                <Icon name="Trash2" size={16} />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-sm">
                                            {/* セット数 */}
                                            <div>
                                                <label className="text-xs text-gray-500">セット</label>
                                                <input
                                                    type="number"
                                                    value={exercise.sets || 3}
                                                    onChange={(e) => handleUpdateExerciseAmount(index, 'sets', parseFloat(e.target.value) || 0)}
                                                    className="w-full border rounded px-2 py-1 text-center"
                                                />
                                            </div>
                                            {/* 回数 */}
                                            <div>
                                                <label className="text-xs text-gray-500">回数</label>
                                                <input
                                                    type="number"
                                                    value={exercise.reps || 10}
                                                    onChange={(e) => handleUpdateExerciseAmount(index, 'reps', parseFloat(e.target.value) || 0)}
                                                    className="w-full border rounded px-2 py-1 text-center"
                                                />
                                            </div>
                                            {/* 重量 */}
                                            <div>
                                                <label className="text-xs text-gray-500">重量(kg)</label>
                                                <input
                                                    type="number"
                                                    value={exercise.weight || 0}
                                                    onChange={(e) => handleUpdateExerciseAmount(index, 'weight', parseFloat(e.target.value) || 0)}
                                                    className="w-full border rounded px-2 py-1 text-center"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* テンプレートボタン（12日以上利用で表示） */}
                    {usageDays >= 12 && workoutTemplates.length > 0 && (
                        <div className="px-4 pb-2">
                            <button
                                onClick={() => setShowTemplateSelector(true)}
                                className="w-full bg-purple-50 text-purple-700 border-2 border-purple-500 rounded-lg py-2 font-semibold hover:bg-purple-100 transition flex items-center justify-center gap-2"
                            >
                                <Icon name="BookTemplate" size={18} />
                                テンプレートから選ぶ
                            </button>
                        </div>
                    )}

                    {/* アクションボタン */}
                    <div className="p-4 border-t space-y-2">
                        {/* エクササイズを追加ボタン */}
                        <button
                            onClick={() => setShowSearchModal(true)}
                            className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
                        >
                            <Icon name="Plus" size={20} />
                            エクササイズを追加
                        </button>

                        {/* 記録ボタン */}
                        <button
                            onClick={handleSave}
                            disabled={addedExercises.length === 0}
                            className={`w-full rounded-lg py-3 font-semibold transition ${
                                addedExercises.length === 0
                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                        >
                            {isEditMode ? '更新する' : '記録する'}
                        </button>
                    </div>
                </div>
            </div>

            {/* 検索モーダル */}
            {showSearchModal && (
                <div className="fixed inset-0 bg-black/50 z-[10001] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
                        {/* ヘッダー */}
                        <div className="border-b px-4 py-3 flex justify-between items-center">
                            <h3 className="text-lg font-bold">エクササイズを選ぶ</h3>
                            <button onClick={() => setShowSearchModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <Icon name="X" size={20} />
                            </button>
                        </div>

                        {/* 検索バー */}
                        <div className="p-4 border-b">
                            <input
                                type="text"
                                placeholder="エクササイズを検索..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full border rounded-lg px-4 py-2"
                            />
                        </div>

                        {/* カテゴリとエクササイズ一覧 */}
                        <div className="flex-1 overflow-y-auto p-4">
                            <div className="space-y-4">
                                {getCategories().map(category => {
                                    const exercises = filterExercises(getExercisesByCategory(category));
                                    if (exercises.length === 0) return null;

                                    return (
                                        <div key={category}>
                                            <div className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                                <Icon name="Dumbbell" size={16} />
                                                {category}
                                            </div>
                                            <div className="space-y-1">
                                                {exercises.map(exercise => (
                                                    <button
                                                        key={exercise.name}
                                                        onClick={() => handleAddExercise(exercise)}
                                                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 transition"
                                                    >
                                                        {exercise.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* カスタム作成ボタン */}
                        <div className="p-4 border-t">
                            <button
                                onClick={() => {
                                    setShowSearchModal(false);
                                    setShowCustomForm(true);
                                }}
                                className="w-full bg-purple-600 text-white rounded-lg py-3 font-semibold hover:bg-purple-700 transition flex items-center justify-center gap-2"
                            >
                                <Icon name="Plus" size={20} />
                                カスタムエクササイズを作成
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* カスタムエクササイズ作成モーダル */}
            {showCustomForm && (
                <div className="fixed inset-0 bg-black/50 z-[10001] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
                        {/* ヘッダー */}
                        <div className="border-b px-4 py-3 flex justify-between items-center">
                            <h3 className="text-lg font-bold">カスタムエクササイズ</h3>
                            <button onClick={() => setShowCustomForm(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <Icon name="X" size={20} />
                            </button>
                        </div>

                        {/* フォーム */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">エクササイズ名 *</label>
                                <input
                                    type="text"
                                    value={customData.name}
                                    onChange={(e) => setCustomData({ ...customData, name: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                    placeholder="例: プランク"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
                                <select
                                    value={customData.category}
                                    onChange={(e) => setCustomData({ ...customData, category: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                >
                                    {getCategories().map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">MET値（運動強度）</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={customData.met}
                                    onChange={(e) => setCustomData({ ...customData, met: parseFloat(e.target.value) || 0 })}
                                    className="w-full border rounded-lg px-3 py-2"
                                />
                            </div>
                        </div>

                        {/* 保存ボタン */}
                        <div className="p-4 border-t">
                            <button
                                onClick={saveCustomExercise}
                                className="w-full bg-green-600 text-white rounded-lg py-3 font-semibold hover:bg-green-700 transition"
                            >
                                保存して追加
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* テンプレート選択モーダル */}
            {showTemplateSelector && (
                <div className="fixed inset-0 bg-black/50 z-[10001] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
                        {/* ヘッダー */}
                        <div className="border-b px-4 py-3 flex justify-between items-center">
                            <h3 className="text-lg font-bold">テンプレートを選ぶ</h3>
                            <button onClick={() => setShowTemplateSelector(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <Icon name="X" size={20} />
                            </button>
                        </div>

                        {/* テンプレート一覧 */}
                        <div className="flex-1 overflow-y-auto p-4">
                            <div className="space-y-2">
                                {workoutTemplates.map(template => (
                                    <button
                                        key={template.id}
                                        onClick={() => applyTemplate(template)}
                                        className="w-full text-left p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition border-2 border-purple-200"
                                    >
                                        <div className="font-semibold text-purple-900">{template.name}</div>
                                        <div className="text-sm text-purple-600 mt-1">
                                            {template.exercises?.length || 0}種目
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ヘルプモーダル */}
            {showHelpModal && (
                <div className="fixed inset-0 bg-black/50 z-[10001] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
                        {/* ヘッダー */}
                        <div className="border-b px-4 py-3 flex justify-between items-center">
                            <h3 className="text-lg font-bold">運動記録の使い方</h3>
                            <button onClick={() => setShowHelpModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <Icon name="X" size={20} />
                            </button>
                        </div>

                        {/* ヘルプ内容 */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            <div>
                                <h4 className="font-semibold text-gray-800 mb-2">1. 運動名を編集</h4>
                                <p className="text-sm text-gray-600">運動名横の編集ボタンをクリックして、「朝トレ」「ジム」など好きな名前に変更できます。</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-800 mb-2">2. エクササイズを追加</h4>
                                <p className="text-sm text-gray-600">「エクササイズを追加」ボタンからデータベースを検索、またはカスタム作成できます。</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-800 mb-2">3. セット・回数・重量を入力</h4>
                                <p className="text-sm text-gray-600">各エクササイズのセット数、回数、重量を入力します。</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-800 mb-2">4. テンプレート機能</h4>
                                <p className="text-sm text-gray-600">よく行うワークアウトはテンプレートとして保存でき、次回から簡単に呼び出せます（12日以上利用で開放）。</p>
                            </div>
                        </div>

                        {/* 閉じるボタン */}
                        <div className="p-4 border-t">
                            <button
                                onClick={() => setShowHelpModal(false)}
                                className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold hover:bg-blue-700 transition"
                            >
                                閉じる
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {ConfirmModalComponent}
        </>
    );
};

// グローバルに公開
window.AddWorkoutModal = AddWorkoutModal;
