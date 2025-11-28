import React from 'react';
import toast from 'react-hot-toast';

// ===== データタブコンポーネント =====
const DataTab = ({
    userId,
    handleExportData,
    handleClearData,
    showConfirm
}) => {
    const Icon = window.Icon;

    return (
        <details className="border rounded-lg">
            <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                <Icon name="Database" size={18} className="text-blue-600" />
                データ管理
                <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
            </summary>
            <div className="p-4 pt-0 border-t">
                <div className="space-y-4">
                {/* カスタムアイテム管理 */}
                {(() => {
                    const [customItemTab, setCustomItemTab] = React.useState('food');
                    const [customFoods, setCustomFoods] = React.useState([]);
                    const [customExercises, setCustomExercises] = React.useState([]);
                    const [loading, setLoading] = React.useState(false);
                    const [showEditModal, setShowEditModal] = React.useState(false);
                    const [editingItem, setEditingItem] = React.useState(null);

                    // Firestoreから読み込み
                    const loadCustomFoods = async () => {
                        if (!userId) {
                            console.log('[Settings] ユーザーIDがないためスキップ');
                            return;
                        }

                        setLoading(true);
                        try {
                            console.log('[Settings] customFoods読み込み開始...');
                            const customFoodsSnapshot = await firebase.firestore()
                                .collection('users')
                                .doc(userId)
                                .collection('customFoods')
                                .get();

                            const foods = customFoodsSnapshot.docs.map(doc => ({
                                id: doc.id,
                                ...doc.data()
                            }));

                            setCustomFoods(foods);
                            console.log(`[Settings] customFoods読み込み完了: ${foods.length}件`);
                        } catch (error) {
                            console.error('[Settings] customFoods読み込みエラー:', error);
                            toast.error('読み込みに失敗しました');
                        } finally {
                            setLoading(false);
                        }
                    };

                    // LocalStorageからカスタム運動を読み込み
                    const loadCustomExercises = () => {
                        try {
                            const saved = localStorage.getItem('customExercises');
                            const exercises = saved ? JSON.parse(saved) : [];
                            setCustomExercises(exercises);
                            console.log(`[Settings] customExercises読み込み完了: ${exercises.length}件`);
                        } catch (error) {
                            console.error('[Settings] customExercises読み込みエラー:', error);
                            setCustomExercises([]);
                        }
                    };

                    // 初回読み込み
                    React.useEffect(() => {
                        loadCustomFoods();
                        loadCustomExercises();
                    }, [userId]);

                    // itemTypeが未設定の古いデータはデフォルトで'food'として扱う
                    const foodItems = customFoods.filter(item => !item.itemType || item.itemType === 'food');
                    const recipeItems = customFoods.filter(item => item.itemType === 'recipe');
                    const supplementItems = customFoods.filter(item => item.itemType === 'supplement');

                    const deleteItem = async (item) => {
                        showConfirm('アイテム削除の確認', `「${item.name}」を削除しますか？`, async () => {
                            try {
                                await firebase.firestore()
                                    .collection('users')
                                    .doc(userId)
                                    .collection('customFoods')
                                    .doc(item.name)
                                    .delete();

                                console.log(`[Settings] カスタムアイテムを削除: ${item.name}`);
                                toast.success('削除しました');
                                loadCustomFoods(); // 再読み込み
                            } catch (error) {
                                console.error('[Settings] 削除エラー:', error);
                                toast.error('削除に失敗しました');
                            }
                        });
                    };

                    const deleteAllByType = async (itemType) => {
                        const typeName = itemType === 'food' ? '食材' : itemType === 'recipe' ? '料理' : 'サプリ';
                        const itemsToDelete = customFoods.filter(item =>
                            itemType === 'food' ? (!item.itemType || item.itemType === 'food') : item.itemType === itemType
                        );

                        showConfirm('全削除の確認', `すべての${typeName}（${itemsToDelete.length}件）を削除しますか？`, async () => {
                            try {
                                const batch = firebase.firestore().batch();
                                itemsToDelete.forEach(item => {
                                    const docRef = firebase.firestore()
                                        .collection('users')
                                        .doc(userId)
                                        .collection('customFoods')
                                        .doc(item.name);
                                    batch.delete(docRef);
                                });

                                await batch.commit();
                                console.log(`[Settings] ${typeName}を全削除: ${itemsToDelete.length}件`);
                                toast.success(`${typeName}を全削除しました`);
                                loadCustomFoods(); // 再読み込み
                            } catch (error) {
                                console.error('[Settings] 全削除エラー:', error);
                                toast.error('削除に失敗しました');
                            }
                        });
                    };

                    // カスタム運動の削除
                    const deleteExercise = (exercise) => {
                        showConfirm('種目削除の確認', `「${exercise.name}」を削除しますか？`, () => {
                            try {
                                const saved = localStorage.getItem('customExercises');
                                const exercises = saved ? JSON.parse(saved) : [];
                                const filtered = exercises.filter(ex => ex.id !== exercise.id);
                                localStorage.setItem('customExercises', JSON.stringify(filtered));
                                console.log(`[Settings] カスタム種目を削除: ${exercise.name}`);
                                toast.success('削除しました');
                                loadCustomExercises(); // 再読み込み
                            } catch (error) {
                                console.error('[Settings] 削除エラー:', error);
                                toast.error('削除に失敗しました');
                            }
                        });
                    };

                    // カスタム運動の全削除
                    const deleteAllExercises = () => {
                        showConfirm('全削除の確認', `すべての運動（${customExercises.length}件）を削除しますか？`, () => {
                            try {
                                localStorage.setItem('customExercises', JSON.stringify([]));
                                console.log(`[Settings] 運動を全削除: ${customExercises.length}件`);
                                toast.success('運動を全削除しました');
                                loadCustomExercises(); // 再読み込み
                            } catch (error) {
                                console.error('[Settings] 全削除エラー:', error);
                                toast.error('削除に失敗しました');
                            }
                        });
                    };

                    const editItem = (item) => {
                        // vitamins/mineralsをフラットな構造に展開
                        const editData = {
                            name: item.name,
                            itemType: item.itemType || 'food',
                            category: item.category || '穀類',
                            servingSize: item.servingSize || 100,
                            servingUnit: item.servingUnit || 'g',
                            calories: item.calories || 0,
                            protein: item.protein || 0,
                            fat: item.fat || 0,
                            carbs: item.carbs || 0,
                            // ビタミン
                            vitaminA: item.vitamins?.A || 0,
                            vitaminB1: item.vitamins?.B1 || 0,
                            vitaminB2: item.vitamins?.B2 || 0,
                            vitaminB6: item.vitamins?.B6 || 0,
                            vitaminB12: item.vitamins?.B12 || 0,
                            vitaminC: item.vitamins?.C || 0,
                            vitaminD: item.vitamins?.D || 0,
                            vitaminE: item.vitamins?.E || 0,
                            vitaminK: item.vitamins?.K || 0,
                            niacin: item.vitamins?.niacin || 0,
                            pantothenicAcid: item.vitamins?.pantothenicAcid || 0,
                            biotin: item.vitamins?.biotin || 0,
                            folicAcid: item.vitamins?.folicAcid || 0,
                            // ミネラル
                            sodium: item.minerals?.sodium || 0,
                            potassium: item.minerals?.potassium || 0,
                            calcium: item.minerals?.calcium || 0,
                            magnesium: item.minerals?.magnesium || 0,
                            phosphorus: item.minerals?.phosphorus || 0,
                            iron: item.minerals?.iron || 0,
                            zinc: item.minerals?.zinc || 0,
                            copper: item.minerals?.copper || 0,
                            manganese: item.minerals?.manganese || 0,
                            iodine: item.minerals?.iodine || 0,
                            selenium: item.minerals?.selenium || 0,
                            chromium: item.minerals?.chromium || 0,
                            molybdenum: item.minerals?.molybdenum || 0,
                            // その他
                            otherNutrients: item.otherNutrients || []
                        };
                        setEditingItem(editData);
                        setShowEditModal(true);
                    };

                    return (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-bold text-blue-800">カスタムアイテム管理</h4>
                                <button
                                    onClick={() => {
                                        loadCustomFoods();
                                        loadCustomExercises();
                                    }}
                                    disabled={loading}
                                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition flex items-center gap-1 disabled:opacity-50"
                                >
                                    <Icon name="RefreshCw" size={14} className={loading ? 'animate-spin' : ''} />
                                    更新
                                </button>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">AI解析や手動で作成した食材・料理・サプリ・運動を管理できます。</p>

                            {/* 食事/運動 切り替え */}
                            <div className="flex gap-2 mb-3">
                                <button
                                    onClick={() => {
                                        const isFoodTab = ['food', 'recipe', 'supplement'].includes(customItemTab);
                                        if (!isFoodTab) setCustomItemTab('food');
                                    }}
                                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition text-sm ${
                                        ['food', 'recipe', 'supplement'].includes(customItemTab)
                                            ? 'bg-green-600 text-white'
                                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                    }`}
                                >
                                    食事
                                </button>
                                <button
                                    onClick={() => {
                                        const isExerciseTab = ['exercise_strength', 'exercise_cardio', 'exercise_stretch'].includes(customItemTab);
                                        if (!isExerciseTab) setCustomItemTab('exercise_strength');
                                    }}
                                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition text-sm ${
                                        ['exercise_strength', 'exercise_cardio', 'exercise_stretch'].includes(customItemTab)
                                            ? 'bg-orange-600 text-white'
                                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                    }`}
                                >
                                    運動
                                </button>
                            </div>

                            {/* タブ切り替え */}
                            {['food', 'recipe', 'supplement'].includes(customItemTab) && (
                                <div className="flex gap-2 border-b mb-3">
                                    <button
                                        onClick={() => setCustomItemTab('food')}
                                        className={`px-4 py-2 font-medium transition text-sm ${
                                            customItemTab === 'food'
                                                ? 'border-b-2 border-green-600 text-green-600'
                                                : 'text-gray-600 hover:text-gray-600'
                                        }`}
                                    >
                                        食材 ({foodItems.length})
                                    </button>
                                    <button
                                        onClick={() => setCustomItemTab('recipe')}
                                        className={`px-4 py-2 font-medium transition text-sm ${
                                            customItemTab === 'recipe'
                                                ? 'border-b-2 border-green-600 text-green-600'
                                                : 'text-gray-600 hover:text-gray-600'
                                        }`}
                                    >
                                        料理 ({recipeItems.length})
                                    </button>
                                    <button
                                        onClick={() => setCustomItemTab('supplement')}
                                        className={`px-4 py-2 font-medium transition text-sm ${
                                            customItemTab === 'supplement'
                                                ? 'border-b-2 border-blue-600 text-blue-600'
                                                : 'text-gray-600 hover:text-gray-600'
                                        }`}
                                    >
                                        サプリ ({supplementItems.length})
                                    </button>
                                </div>
                            )}

                            {['exercise_strength', 'exercise_cardio', 'exercise_stretch'].includes(customItemTab) && (
                                <div className="flex gap-2 border-b mb-3">
                                    <button
                                        onClick={() => setCustomItemTab('exercise_strength')}
                                        className={`px-4 py-2 font-medium transition text-sm ${
                                            customItemTab === 'exercise_strength'
                                                ? 'border-b-2 border-orange-600 text-orange-600'
                                                : 'text-gray-600 hover:text-gray-600'
                                        }`}
                                    >
                                        筋トレ ({customExercises.filter(ex => !ex.exerciseTab || ex.exerciseTab === 'strength').length})
                                    </button>
                                    <button
                                        onClick={() => setCustomItemTab('exercise_cardio')}
                                        className={`px-4 py-2 font-medium transition text-sm ${
                                            customItemTab === 'exercise_cardio'
                                                ? 'border-b-2 border-blue-600 text-blue-600'
                                                : 'text-gray-600 hover:text-gray-600'
                                        }`}
                                    >
                                        有酸素 ({customExercises.filter(ex => ex.exerciseTab === 'cardio').length})
                                    </button>
                                    <button
                                        onClick={() => setCustomItemTab('exercise_stretch')}
                                        className={`px-4 py-2 font-medium transition text-sm ${
                                            customItemTab === 'exercise_stretch'
                                                ? 'border-b-2 border-green-600 text-green-600'
                                                : 'text-gray-600 hover:text-gray-600'
                                        }`}
                                    >
                                        ストレッチ ({customExercises.filter(ex => ex.exerciseTab === 'stretch').length})
                                    </button>
                                </div>
                            )}

                            {/* アイテム一覧 */}
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {customItemTab === 'food' && (
                                    <>
                                        {foodItems.length === 0 ? (
                                            <p className="text-sm text-gray-600 py-4 text-center">カスタム食材はありません</p>
                                        ) : (
                                            <>
                                                <div className="flex justify-end mb-2">
                                                    <button
                                                        onClick={() => deleteAllByType('food')}
                                                        className="px-3 py-1 bg-red-100 text-red-600 text-xs rounded-lg hover:bg-red-200 transition"
                                                    >
                                                        すべて削除
                                                    </button>
                                                </div>
                                                {foodItems.map((item, idx) => (
                                                    <div key={item.id || idx} className="bg-white p-2 rounded-lg border space-y-1">
                                                        {/* 1行目: アイテム名 */}
                                                        <p className="font-bold text-sm">{item.name}</p>

                                                        {/* 2行目: タグ */}
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            {item.customLabel && (
                                                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                                                    {item.customLabel}
                                                                </span>
                                                            )}
                                                            {item.category && item.category !== 'カスタム食材' && (
                                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                                                    {item.category}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* 3行目: 栄養情報（色分け） */}
                                                        <div className="text-xs space-y-0.5">
                                                            <p className="text-gray-600">{item.servingSize}{item.servingUnit}あたり</p>
                                                            <p>
                                                                <span className="text-blue-600 font-semibold">{item.calories}kcal</span>
                                                                <span className="text-gray-600"> | </span>
                                                                <span className="text-red-500 font-semibold">P:{item.protein}g</span>
                                                                <span className="text-gray-600"> </span>
                                                                <span className="text-yellow-600 font-semibold">F:{item.fat}g</span>
                                                                <span className="text-gray-600"> </span>
                                                                <span className="text-green-600 font-semibold">C:{item.carbs}g</span>
                                                            </p>
                                                        </div>

                                                        {/* 4行目: アイコンボタン */}
                                                        <div className="flex gap-2 justify-end">
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        await firebase.firestore()
                                                                            .collection('users')
                                                                            .doc(userId)
                                                                            .collection('customFoods')
                                                                            .doc(item.name)
                                                                            .update({ hidden: !item.hidden });
                                                                        toast.success(item.hidden ? '表示しました' : '非表示にしました');
                                                                        loadCustomFoods();
                                                                    } catch (error) {
                                                                        console.error('表示切替エラー:', error);
                                                                        toast.error('更新に失敗しました');
                                                                    }
                                                                }}
                                                                className={`p-1 transition ${
                                                                    item.hidden
                                                                        ? 'text-gray-400 hover:text-gray-600'
                                                                        : 'text-green-600 hover:text-green-800'
                                                                }`}
                                                                title={item.hidden ? '表示する' : '非表示にする'}
                                                            >
                                                                <Icon name={item.hidden ? 'EyeOff' : 'Eye'} size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => editItem(item)}
                                                                className="p-1 text-blue-600 hover:text-blue-800 transition"
                                                            >
                                                                <Icon name="Edit" size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => deleteItem(item)}
                                                                className="p-1 text-red-600 hover:text-red-800 transition"
                                                            >
                                                                <Icon name="Trash2" size={18} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </>
                                )}

                                {customItemTab === 'recipe' && (
                                    <>
                                        {recipeItems.length === 0 ? (
                                            <p className="text-sm text-gray-600 py-4 text-center">カスタム料理はありません</p>
                                        ) : (
                                            <>
                                                <div className="flex justify-end mb-2">
                                                    <button
                                                        onClick={() => deleteAllByType('recipe')}
                                                        className="px-3 py-1 bg-red-100 text-red-600 text-xs rounded-lg hover:bg-red-200 transition"
                                                    >
                                                        すべて削除
                                                    </button>
                                                </div>
                                                {recipeItems.map((item, idx) => (
                                                    <div key={item.id || idx} className="bg-white p-2 rounded-lg border space-y-1">
                                                        {/* 1行目: アイテム名 */}
                                                        <p className="font-bold text-sm">{item.name}</p>

                                                        {/* 2行目: タグ */}
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            {item.customLabel && (
                                                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                                                    {item.customLabel}
                                                                </span>
                                                            )}
                                                            {item.category && item.category !== 'カスタム料理' && (
                                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                                                    {item.category}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* 3行目: 栄養情報（色分け） */}
                                                        <div className="text-xs space-y-0.5">
                                                            <p className="text-gray-600">{item.servingSize}{item.servingUnit}あたり</p>
                                                            <p>
                                                                <span className="text-blue-600 font-semibold">{item.calories}kcal</span>
                                                                <span className="text-gray-600"> | </span>
                                                                <span className="text-red-500 font-semibold">P:{item.protein}g</span>
                                                                <span className="text-gray-600"> </span>
                                                                <span className="text-yellow-600 font-semibold">F:{item.fat}g</span>
                                                                <span className="text-gray-600"> </span>
                                                                <span className="text-green-600 font-semibold">C:{item.carbs}g</span>
                                                            </p>
                                                        </div>

                                                        {/* 4行目: アイコンボタン */}
                                                        <div className="flex gap-2 justify-end">
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        await firebase.firestore()
                                                                            .collection('users')
                                                                            .doc(userId)
                                                                            .collection('customFoods')
                                                                            .doc(item.name)
                                                                            .update({ hidden: !item.hidden });
                                                                        toast.success(item.hidden ? '表示しました' : '非表示にしました');
                                                                        loadCustomFoods();
                                                                    } catch (error) {
                                                                        console.error('表示切替エラー:', error);
                                                                        toast.error('更新に失敗しました');
                                                                    }
                                                                }}
                                                                className={`p-1 transition ${
                                                                    item.hidden
                                                                        ? 'text-gray-400 hover:text-gray-600'
                                                                        : 'text-green-600 hover:text-green-800'
                                                                }`}
                                                                title={item.hidden ? '表示する' : '非表示にする'}
                                                            >
                                                                <Icon name={item.hidden ? 'EyeOff' : 'Eye'} size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => editItem(item)}
                                                                className="p-1 text-blue-600 hover:text-blue-800 transition"
                                                            >
                                                                <Icon name="Edit" size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => deleteItem(item)}
                                                                className="p-1 text-red-600 hover:text-red-800 transition"
                                                            >
                                                                <Icon name="Trash2" size={18} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </>
                                )}

                                {customItemTab === 'supplement' && (
                                    <>
                                        {supplementItems.length === 0 ? (
                                            <p className="text-sm text-gray-600 py-4 text-center">カスタムサプリはありません</p>
                                        ) : (
                                            <>
                                                <div className="flex justify-end mb-2">
                                                    <button
                                                        onClick={() => deleteAllByType('supplement')}
                                                        className="px-3 py-1 bg-red-100 text-red-600 text-xs rounded-lg hover:bg-red-200 transition"
                                                    >
                                                        すべて削除
                                                    </button>
                                                </div>
                                                {supplementItems.map((item, idx) => (
                                                    <div key={item.id || idx} className="bg-white p-2 rounded-lg border space-y-1">
                                                        {/* 1行目: アイテム名 */}
                                                        <p className="font-bold text-sm">{item.name}</p>

                                                        {/* 2行目: タグ */}
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            {item.customLabel && (
                                                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                                                    {item.customLabel}
                                                                </span>
                                                            )}
                                                            {item.category && item.category !== 'カスタムサプリ' && (
                                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                                                    {item.category}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* 3行目: 栄養情報（色分け） */}
                                                        <div className="text-xs space-y-0.5">
                                                            <p className="text-gray-600">{item.servingSize}{item.servingUnit}あたり</p>
                                                            <p>
                                                                <span className="text-blue-600 font-semibold">{item.calories}kcal</span>
                                                                <span className="text-gray-600"> | </span>
                                                                <span className="text-red-500 font-semibold">P:{item.protein}g</span>
                                                                <span className="text-gray-600"> </span>
                                                                <span className="text-yellow-600 font-semibold">F:{item.fat}g</span>
                                                                <span className="text-gray-600"> </span>
                                                                <span className="text-green-600 font-semibold">C:{item.carbs}g</span>
                                                            </p>
                                                        </div>

                                                        {/* 4行目: アイコンボタン */}
                                                        <div className="flex gap-2 justify-end">
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        await firebase.firestore()
                                                                            .collection('users')
                                                                            .doc(userId)
                                                                            .collection('customFoods')
                                                                            .doc(item.name)
                                                                            .update({ hidden: !item.hidden });
                                                                        toast.success(item.hidden ? '表示しました' : '非表示にしました');
                                                                        loadCustomFoods();
                                                                    } catch (error) {
                                                                        console.error('表示切替エラー:', error);
                                                                        toast.error('更新に失敗しました');
                                                                    }
                                                                }}
                                                                className={`p-1 transition ${
                                                                    item.hidden
                                                                        ? 'text-gray-400 hover:text-gray-600'
                                                                        : 'text-green-600 hover:text-green-800'
                                                                }`}
                                                                title={item.hidden ? '表示する' : '非表示にする'}
                                                            >
                                                                <Icon name={item.hidden ? 'EyeOff' : 'Eye'} size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => editItem(item)}
                                                                className="p-1 text-blue-600 hover:text-blue-800 transition"
                                                            >
                                                                <Icon name="Edit" size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => deleteItem(item)}
                                                                className="p-1 text-red-600 hover:text-red-800 transition"
                                                            >
                                                                <Icon name="Trash2" size={18} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </>
                                )}

                                {customItemTab === 'exercise_strength' && (
                                    <>
                                        {customExercises.filter(ex => !ex.exerciseTab || ex.exerciseTab === 'strength').length === 0 ? (
                                            <p className="text-sm text-gray-600 py-4 text-center">カスタム運動（筋トレ）はありません</p>
                                        ) : (
                                            <>
                                                <div className="flex justify-end mb-2">
                                                    <button
                                                        onClick={deleteAllExercises}
                                                        className="px-3 py-1 bg-red-100 text-red-600 text-xs rounded-lg hover:bg-red-200 transition"
                                                    >
                                                        すべて削除
                                                    </button>
                                                </div>
                                                {customExercises.filter(ex => !ex.exerciseTab || ex.exerciseTab === 'strength').map((exercise, idx) => (
                                                    <div key={exercise.id || idx} className="bg-white p-2 rounded-lg border space-y-1">
                                                        {/* 1行目: 種目名 */}
                                                        <p className="font-bold text-sm">{exercise.name}</p>

                                                        {/* 2行目: タグ */}
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                                                                カスタム
                                                            </span>
                                                            {exercise.subcategory && (
                                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                                                    {exercise.subcategory}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* 3行目: 削除ボタン */}
                                                        <div className="flex gap-2 justify-end">
                                                            <button
                                                                onClick={() => deleteExercise(exercise)}
                                                                className="p-1 text-red-600 hover:text-red-800 transition"
                                                            >
                                                                <Icon name="Trash2" size={18} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </>
                                )}

                                {customItemTab === 'exercise_cardio' && (
                                    <>
                                        {customExercises.filter(ex => ex.exerciseTab === 'cardio').length === 0 ? (
                                            <p className="text-sm text-gray-600 py-4 text-center">カスタム運動（有酸素）はありません</p>
                                        ) : (
                                            <>
                                                <div className="flex justify-end mb-2">
                                                    <button
                                                        onClick={deleteAllExercises}
                                                        className="px-3 py-1 bg-red-100 text-red-600 text-xs rounded-lg hover:bg-red-200 transition"
                                                    >
                                                        すべて削除
                                                    </button>
                                                </div>
                                                {customExercises.filter(ex => ex.exerciseTab === 'cardio').map((exercise, idx) => (
                                                    <div key={exercise.id || idx} className="bg-white p-2 rounded-lg border space-y-1">
                                                        {/* 1行目: 種目名 */}
                                                        <p className="font-bold text-sm">{exercise.name}</p>

                                                        {/* 2行目: タグ */}
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                                                                カスタム
                                                            </span>
                                                            {exercise.subcategory && (
                                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                                                    {exercise.subcategory}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* 3行目: 削除ボタン */}
                                                        <div className="flex gap-2 justify-end">
                                                            <button
                                                                onClick={() => deleteExercise(exercise)}
                                                                className="p-1 text-red-600 hover:text-red-800 transition"
                                                            >
                                                                <Icon name="Trash2" size={18} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </>
                                )}

                                {customItemTab === 'exercise_stretch' && (
                                    <>
                                        {customExercises.filter(ex => ex.exerciseTab === 'stretch').length === 0 ? (
                                            <p className="text-sm text-gray-600 py-4 text-center">カスタム運動（ストレッチ）はありません</p>
                                        ) : (
                                            <>
                                                <div className="flex justify-end mb-2">
                                                    <button
                                                        onClick={deleteAllExercises}
                                                        className="px-3 py-1 bg-red-100 text-red-600 text-xs rounded-lg hover:bg-red-200 transition"
                                                    >
                                                        すべて削除
                                                    </button>
                                                </div>
                                                {customExercises.filter(ex => ex.exerciseTab === 'stretch').map((exercise, idx) => (
                                                    <div key={exercise.id || idx} className="bg-white p-2 rounded-lg border space-y-1">
                                                        {/* 1行目: 種目名 */}
                                                        <p className="font-bold text-sm">{exercise.name}</p>

                                                        {/* 2行目: タグ */}
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                                                                カスタム
                                                            </span>
                                                            {exercise.subcategory && (
                                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                                                    {exercise.subcategory}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* 3行目: 削除ボタン */}
                                                        <div className="flex gap-2 justify-end">
                                                            <button
                                                                onClick={() => deleteExercise(exercise)}
                                                                className="p-1 text-red-600 hover:text-red-800 transition"
                                                            >
                                                                <Icon name="Trash2" size={18} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* 編集モーダル */}
                            {showEditModal && editingItem && (
                                <div className="fixed inset-0 bg-black bg-opacity-60 z-[10001] flex items-center justify-center p-4">
                                    <div className="bg-white rounded-2xl w-full max-w-[95vw] sm:max-w-lg max-h-[80vh] overflow-y-auto">
                                        {/* ヘッダー */}
                                        <div className="sticky top-0 bg-[#4A9EFF] text-white p-4 rounded-t-2xl flex justify-between items-center z-10">
                                            <h3 className="text-lg font-bold flex items-center gap-2">
                                                <Icon name="Edit" size={20} />
                                                カスタムアイテムを編集
                                            </h3>
                                            <button
                                                onClick={() => {
                                                    setShowEditModal(false);
                                                    setEditingItem(null);
                                                }}
                                                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition"
                                            >
                                                <Icon name="X" size={20} />
                                            </button>
                                        </div>

                                        <div className="p-6 space-y-4">
                                            {/* 名前 */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-600 mb-1">名前</label>
                                                <input
                                                    type="text"
                                                    value={editingItem.name}
                                                    onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                                                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                />
                                            </div>

                                            {/* カテゴリ */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-600 mb-1">カテゴリ</label>
                                                <select
                                                    value={editingItem.itemType}
                                                    onChange={(e) => setEditingItem({...editingItem, itemType: e.target.value})}
                                                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                >
                                                    <option value="food">食材</option>
                                                    <option value="recipe">料理</option>
                                                    <option value="supplement">サプリ</option>
                                                </select>
                                            </div>

                                            {/* サブカテゴリ & 1回分の量 */}
                                            <div className="flex gap-2">
                                                <div className="flex-1">
                                                    <label className="block text-xs text-gray-600 mb-1">サブカテゴリ</label>
                                                    <input
                                                        type="text"
                                                        value={editingItem.category}
                                                        onChange={(e) => setEditingItem({...editingItem, category: e.target.value})}
                                                        className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-600 mb-1">1回分の量</label>
                                                    <div className="flex gap-1">
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={editingItem.servingSize === 0 ? '0' : (editingItem.servingSize || '')}
                                                            onChange={(e) => setEditingItem({...editingItem, servingSize: e.target.value})}
                                                            onBlur={(e) => {
                                                                const val = e.target.value.trim();
                                                                if (val === '' || val === '.') {
                                                                    setEditingItem({...editingItem, servingSize: 0});
                                                                } else {
                                                                    const num = parseFloat(val);
                                                                    setEditingItem({...editingItem, servingSize: isNaN(num) ? 0 : num});
                                                                }
                                                            }}
                                                            className="w-20 px-2 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-center"
                                                        />
                                                        <select
                                                            value={editingItem.servingUnit}
                                                            onChange={(e) => setEditingItem({...editingItem, servingUnit: e.target.value})}
                                                            className="w-16 px-2 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                                        >
                                                            <option value="g">g</option>
                                                            <option value="mg">mg</option>
                                                            <option value="ml">ml</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 基本栄養素 */}
                                            <div className="border-t pt-4">
                                                <p className="text-sm font-medium text-gray-600 mb-2">
                                                    基本栄養素（{editingItem.servingSize}{editingItem.servingUnit}あたり）
                                                </p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-xs text-gray-600">カロリー (kcal)</label>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={editingItem.calories === 0 ? '0' : (editingItem.calories || '')}
                                                            onChange={(e) => setEditingItem({...editingItem, calories: e.target.value})}
                                                            onBlur={(e) => {
                                                                const val = e.target.value.trim();
                                                                if (val === '' || val === '.') {
                                                                    setEditingItem({...editingItem, calories: 0});
                                                                } else {
                                                                    const num = parseFloat(val);
                                                                    setEditingItem({...editingItem, calories: isNaN(num) ? 0 : num});
                                                                }
                                                            }}
                                                            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-600">タンパク質 (g)</label>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={editingItem.protein === 0 ? '0' : (editingItem.protein || '')}
                                                            onChange={(e) => setEditingItem({...editingItem, protein: e.target.value})}
                                                            onBlur={(e) => {
                                                                const val = e.target.value.trim();
                                                                if (val === '' || val === '.') {
                                                                    setEditingItem({...editingItem, protein: 0});
                                                                } else {
                                                                    const num = parseFloat(val);
                                                                    setEditingItem({...editingItem, protein: isNaN(num) ? 0 : num});
                                                                }
                                                            }}
                                                            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-600">脂質 (g)</label>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={editingItem.fat === 0 ? '0' : (editingItem.fat || '')}
                                                            onChange={(e) => setEditingItem({...editingItem, fat: e.target.value})}
                                                            onBlur={(e) => {
                                                                const val = e.target.value.trim();
                                                                if (val === '' || val === '.') {
                                                                    setEditingItem({...editingItem, fat: 0});
                                                                } else {
                                                                    const num = parseFloat(val);
                                                                    setEditingItem({...editingItem, fat: isNaN(num) ? 0 : num});
                                                                }
                                                            }}
                                                            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-600">炭水化物 (g)</label>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={editingItem.carbs === 0 ? '0' : (editingItem.carbs || '')}
                                                            onChange={(e) => setEditingItem({...editingItem, carbs: e.target.value})}
                                                            onBlur={(e) => {
                                                                const val = e.target.value.trim();
                                                                if (val === '' || val === '.') {
                                                                    setEditingItem({...editingItem, carbs: 0});
                                                                } else {
                                                                    const num = parseFloat(val);
                                                                    setEditingItem({...editingItem, carbs: isNaN(num) ? 0 : num});
                                                                }
                                                            }}
                                                            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* ビタミン */}
                                            <div className="border-t pt-4">
                                                <p className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                                                    <Icon name="Droplets" size={16} className="text-orange-500" />
                                                    ビタミン
                                                </p>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                    <div>
                                                        <label className="text-xs text-gray-600">A (μg)</label>
                                                        <input
                                                            type="number"
                                                            step="0.001"
                                                            value={editingItem.vitaminA === 0 ? '0' : (editingItem.vitaminA || '')}
                                                            onChange={(e) => setEditingItem({...editingItem, vitaminA: e.target.value})}
                                                            onBlur={(e) => {
                                                                const val = e.target.value.trim();
                                                                if (val === '' || val === '.') {
                                                                    setEditingItem({...editingItem, vitaminA: 0});
                                                                } else {
                                                                    const num = parseFloat(val);
                                                                    setEditingItem({...editingItem, vitaminA: isNaN(num) ? 0 : num});
                                                                }
                                                            }}
                                                            className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-orange-400 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-600">B1 (mg)</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={editingItem.vitaminB1 === 0 ? '0' : (editingItem.vitaminB1 || '')}
                                                            onChange={(e) => setEditingItem({...editingItem, vitaminB1: e.target.value})}
                                                            onBlur={(e) => {
                                                                const val = e.target.value.trim();
                                                                if (val === '' || val === '.') {
                                                                    setEditingItem({...editingItem, vitaminB1: 0});
                                                                } else {
                                                                    const num = parseFloat(val);
                                                                    setEditingItem({...editingItem, vitaminB1: isNaN(num) ? 0 : num});
                                                                }
                                                            }}
                                                            className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-orange-400 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-600">B2 (mg)</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={editingItem.vitaminB2 === 0 ? '0' : (editingItem.vitaminB2 || '')}
                                                            onChange={(e) => setEditingItem({...editingItem, vitaminB2: e.target.value})}
                                                            onBlur={(e) => {
                                                                const val = e.target.value.trim();
                                                                if (val === '' || val === '.') {
                                                                    setEditingItem({...editingItem, vitaminB2: 0});
                                                                } else {
                                                                    const num = parseFloat(val);
                                                                    setEditingItem({...editingItem, vitaminB2: isNaN(num) ? 0 : num});
                                                                }
                                                            }}
                                                            className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-orange-400 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-600">B6 (mg)</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={editingItem.vitaminB6 === 0 ? '0' : (editingItem.vitaminB6 || '')}
                                                            onChange={(e) => setEditingItem({...editingItem, vitaminB6: e.target.value})}
                                                            onBlur={(e) => {
                                                                const val = e.target.value.trim();
                                                                if (val === '' || val === '.') {
                                                                    setEditingItem({...editingItem, vitaminB6: 0});
                                                                } else {
                                                                    const num = parseFloat(val);
                                                                    setEditingItem({...editingItem, vitaminB6: isNaN(num) ? 0 : num});
                                                                }
                                                            }}
                                                            className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-orange-400 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-600">B12 (μg)</label>
                                                        <input
                                                            type="number"
                                                            step="0.001"
                                                            value={editingItem.vitaminB12 === 0 ? '0' : (editingItem.vitaminB12 || '')}
                                                            onChange={(e) => setEditingItem({...editingItem, vitaminB12: e.target.value})}
                                                            onBlur={(e) => {
                                                                const val = e.target.value.trim();
                                                                if (val === '' || val === '.') {
                                                                    setEditingItem({...editingItem, vitaminB12: 0});
                                                                } else {
                                                                    const num = parseFloat(val);
                                                                    setEditingItem({...editingItem, vitaminB12: isNaN(num) ? 0 : num});
                                                                }
                                                            }}
                                                            className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-orange-400 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-600">C (mg)</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={editingItem.vitaminC === 0 ? '0' : (editingItem.vitaminC || '')}
                                                            onChange={(e) => setEditingItem({...editingItem, vitaminC: e.target.value})}
                                                            onBlur={(e) => {
                                                                const val = e.target.value.trim();
                                                                if (val === '' || val === '.') {
                                                                    setEditingItem({...editingItem, vitaminC: 0});
                                                                } else {
                                                                    const num = parseFloat(val);
                                                                    setEditingItem({...editingItem, vitaminC: isNaN(num) ? 0 : num});
                                                                }
                                                            }}
                                                            className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-orange-400 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-600">D (μg)</label>
                                                        <input
                                                            type="number"
                                                            step="0.001"
                                                            value={editingItem.vitaminD === 0 ? '0' : (editingItem.vitaminD || '')}
                                                            onChange={(e) => setEditingItem({...editingItem, vitaminD: e.target.value})}
                                                            onBlur={(e) => {
                                                                const val = e.target.value.trim();
                                                                if (val === '' || val === '.') {
                                                                    setEditingItem({...editingItem, vitaminD: 0});
                                                                } else {
                                                                    const num = parseFloat(val);
                                                                    setEditingItem({...editingItem, vitaminD: isNaN(num) ? 0 : num});
                                                                }
                                                            }}
                                                            className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-orange-400 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-600">E (mg)</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={editingItem.vitaminE === 0 ? '0' : (editingItem.vitaminE || '')}
                                                            onChange={(e) => setEditingItem({...editingItem, vitaminE: e.target.value})}
                                                            onBlur={(e) => {
                                                                const val = e.target.value.trim();
                                                                if (val === '' || val === '.') {
                                                                    setEditingItem({...editingItem, vitaminE: 0});
                                                                } else {
                                                                    const num = parseFloat(val);
                                                                    setEditingItem({...editingItem, vitaminE: isNaN(num) ? 0 : num});
                                                                }
                                                            }}
                                                            className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-orange-400 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-600">K (μg)</label>
                                                        <input
                                                            type="number"
                                                            step="0.001"
                                                            value={editingItem.vitaminK === 0 ? '0' : (editingItem.vitaminK || '')}
                                                            onChange={(e) => setEditingItem({...editingItem, vitaminK: e.target.value})}
                                                            onBlur={(e) => {
                                                                const val = e.target.value.trim();
                                                                if (val === '' || val === '.') {
                                                                    setEditingItem({...editingItem, vitaminK: 0});
                                                                } else {
                                                                    const num = parseFloat(val);
                                                                    setEditingItem({...editingItem, vitaminK: isNaN(num) ? 0 : num});
                                                                }
                                                            }}
                                                            className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-orange-400 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-600">ナイアシン (mg)</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={editingItem.niacin === 0 ? '0' : (editingItem.niacin || '')}
                                                            onChange={(e) => setEditingItem({...editingItem, niacin: e.target.value})}
                                                            onBlur={(e) => {
                                                                const val = e.target.value.trim();
                                                                if (val === '' || val === '.') {
                                                                    setEditingItem({...editingItem, niacin: 0});
                                                                } else {
                                                                    const num = parseFloat(val);
                                                                    setEditingItem({...editingItem, niacin: isNaN(num) ? 0 : num});
                                                                }
                                                            }}
                                                            className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-orange-400 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-600">パントテン酸 (mg)</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={editingItem.pantothenicAcid === 0 ? '0' : (editingItem.pantothenicAcid || '')}
                                                            onChange={(e) => setEditingItem({...editingItem, pantothenicAcid: e.target.value})}
                                                            onBlur={(e) => {
                                                                const val = e.target.value.trim();
                                                                if (val === '' || val === '.') {
                                                                    setEditingItem({...editingItem, pantothenicAcid: 0});
                                                                } else {
                                                                    const num = parseFloat(val);
                                                                    setEditingItem({...editingItem, pantothenicAcid: isNaN(num) ? 0 : num});
                                                                }
                                                            }}
                                                            className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-orange-400 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-600">ビオチン (μg)</label>
                                                        <input
                                                            type="number"
                                                            step="0.001"
                                                            value={editingItem.biotin === 0 ? '0' : (editingItem.biotin || '')}
                                                            onChange={(e) => setEditingItem({...editingItem, biotin: e.target.value})}
                                                            onBlur={(e) => {
                                                                const val = e.target.value.trim();
                                                                if (val === '' || val === '.') {
                                                                    setEditingItem({...editingItem, biotin: 0});
                                                                } else {
                                                                    const num = parseFloat(val);
                                                                    setEditingItem({...editingItem, biotin: isNaN(num) ? 0 : num});
                                                                }
                                                            }}
                                                            className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-orange-400 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-600">葉酸 (μg)</label>
                                                        <input
                                                            type="number"
                                                            step="0.001"
                                                            value={editingItem.folicAcid === 0 ? '0' : (editingItem.folicAcid || '')}
                                                            onChange={(e) => setEditingItem({...editingItem, folicAcid: e.target.value})}
                                                            onBlur={(e) => {
                                                                const val = e.target.value.trim();
                                                                if (val === '' || val === '.') {
                                                                    setEditingItem({...editingItem, folicAcid: 0});
                                                                } else {
                                                                    const num = parseFloat(val);
                                                                    setEditingItem({...editingItem, folicAcid: isNaN(num) ? 0 : num});
                                                                }
                                                            }}
                                                            className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-orange-400 focus:outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* ミネラル */}
                                            <div className="border-t pt-4">
                                                <p className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                                                    <Icon name="Gem" size={16} className="text-purple-500" />
                                                    ミネラル
                                                </p>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                    <div>
                                                        <label className="text-xs text-gray-600">ナトリウム (mg)</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={editingItem.sodium === 0 ? '0' : (editingItem.sodium || '')}
                                                            onChange={(e) => setEditingItem({...editingItem, sodium: e.target.value})}
                                                            onBlur={(e) => {
                                                                const val = e.target.value.trim();
                                                                if (val === '' || val === '.') {
                                                                    setEditingItem({...editingItem, sodium: 0});
                                                                } else {
                                                                    const num = parseFloat(val);
                                                                    setEditingItem({...editingItem, sodium: isNaN(num) ? 0 : num});
                                                                }
                                                            }}
                                                            className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-400 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-600">カリウム (mg)</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={editingItem.potassium === 0 ? '0' : (editingItem.potassium || '')}
                                                            onChange={(e) => setEditingItem({...editingItem, potassium: e.target.value})}
                                                            onBlur={(e) => {
                                                                const val = e.target.value.trim();
                                                                if (val === '' || val === '.') {
                                                                    setEditingItem({...editingItem, potassium: 0});
                                                                } else {
                                                                    const num = parseFloat(val);
                                                                    setEditingItem({...editingItem, potassium: isNaN(num) ? 0 : num});
                                                                }
                                                            }}
                                                            className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-400 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-600">カルシウム (mg)</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={editingItem.calcium === 0 ? '0' : (editingItem.calcium || '')}
                                                            onChange={(e) => setEditingItem({...editingItem, calcium: e.target.value})}
                                                            onBlur={(e) => {
                                                                const val = e.target.value.trim();
                                                                if (val === '' || val === '.') {
                                                                    setEditingItem({...editingItem, calcium: 0});
                                                                } else {
                                                                    const num = parseFloat(val);
                                                                    setEditingItem({...editingItem, calcium: isNaN(num) ? 0 : num});
                                                                }
                                                            }}
                                                            className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-400 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-600">マグネシウム (mg)</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={editingItem.magnesium === 0 ? '0' : (editingItem.magnesium || '')}
                                                            onChange={(e) => setEditingItem({...editingItem, magnesium: e.target.value})}
                                                            onBlur={(e) => {
                                                                const val = e.target.value.trim();
                                                                if (val === '' || val === '.') {
                                                                    setEditingItem({...editingItem, magnesium: 0});
                                                                } else {
                                                                    const num = parseFloat(val);
                                                                    setEditingItem({...editingItem, magnesium: isNaN(num) ? 0 : num});
                                                                }
                                                            }}
                                                            className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-400 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-600">リン (mg)</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={editingItem.phosphorus === 0 ? '0' : (editingItem.phosphorus || '')}
                                                            onChange={(e) => setEditingItem({...editingItem, phosphorus: e.target.value})}
                                                            onBlur={(e) => {
                                                                const val = e.target.value.trim();
                                                                if (val === '' || val === '.') {
                                                                    setEditingItem({...editingItem, phosphorus: 0});
                                                                } else {
                                                                    const num = parseFloat(val);
                                                                    setEditingItem({...editingItem, phosphorus: isNaN(num) ? 0 : num});
                                                                }
                                                            }}
                                                            className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-400 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-600">鉄 (mg)</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={editingItem.iron === 0 ? '0' : (editingItem.iron || '')}
                                                            onChange={(e) => setEditingItem({...editingItem, iron: e.target.value})}
                                                            onBlur={(e) => {
                                                                const val = e.target.value.trim();
                                                                if (val === '' || val === '.') {
                                                                    setEditingItem({...editingItem, iron: 0});
                                                                } else {
                                                                    const num = parseFloat(val);
                                                                    setEditingItem({...editingItem, iron: isNaN(num) ? 0 : num});
                                                                }
                                                            }}
                                                            className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-400 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-600">亜鉛 (mg)</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={editingItem.zinc === 0 ? '0' : (editingItem.zinc || '')}
                                                            onChange={(e) => setEditingItem({...editingItem, zinc: e.target.value})}
                                                            onBlur={(e) => {
                                                                const val = e.target.value.trim();
                                                                if (val === '' || val === '.') {
                                                                    setEditingItem({...editingItem, zinc: 0});
                                                                } else {
                                                                    const num = parseFloat(val);
                                                                    setEditingItem({...editingItem, zinc: isNaN(num) ? 0 : num});
                                                                }
                                                            }}
                                                            className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-400 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-600">銅 (mg)</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={editingItem.copper === 0 ? '0' : (editingItem.copper || '')}
                                                            onChange={(e) => setEditingItem({...editingItem, copper: e.target.value})}
                                                            onBlur={(e) => {
                                                                const val = e.target.value.trim();
                                                                if (val === '' || val === '.') {
                                                                    setEditingItem({...editingItem, copper: 0});
                                                                } else {
                                                                    const num = parseFloat(val);
                                                                    setEditingItem({...editingItem, copper: isNaN(num) ? 0 : num});
                                                                }
                                                            }}
                                                            className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-400 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-600">マンガン (mg)</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={editingItem.manganese === 0 ? '0' : (editingItem.manganese || '')}
                                                            onChange={(e) => setEditingItem({...editingItem, manganese: e.target.value})}
                                                            onBlur={(e) => {
                                                                const val = e.target.value.trim();
                                                                if (val === '' || val === '.') {
                                                                    setEditingItem({...editingItem, manganese: 0});
                                                                } else {
                                                                    const num = parseFloat(val);
                                                                    setEditingItem({...editingItem, manganese: isNaN(num) ? 0 : num});
                                                                }
                                                            }}
                                                            className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-400 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-600">ヨウ素 (μg)</label>
                                                        <input
                                                            type="number"
                                                            step="0.001"
                                                            value={editingItem.iodine === 0 ? '0' : (editingItem.iodine || '')}
                                                            onChange={(e) => setEditingItem({...editingItem, iodine: e.target.value})}
                                                            onBlur={(e) => {
                                                                const val = e.target.value.trim();
                                                                if (val === '' || val === '.') {
                                                                    setEditingItem({...editingItem, iodine: 0});
                                                                } else {
                                                                    const num = parseFloat(val);
                                                                    setEditingItem({...editingItem, iodine: isNaN(num) ? 0 : num});
                                                                }
                                                            }}
                                                            className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-400 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-600">セレン (μg)</label>
                                                        <input
                                                            type="number"
                                                            step="0.001"
                                                            value={editingItem.selenium === 0 ? '0' : (editingItem.selenium || '')}
                                                            onChange={(e) => setEditingItem({...editingItem, selenium: e.target.value})}
                                                            onBlur={(e) => {
                                                                const val = e.target.value.trim();
                                                                if (val === '' || val === '.') {
                                                                    setEditingItem({...editingItem, selenium: 0});
                                                                } else {
                                                                    const num = parseFloat(val);
                                                                    setEditingItem({...editingItem, selenium: isNaN(num) ? 0 : num});
                                                                }
                                                            }}
                                                            className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-400 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-600">クロム (μg)</label>
                                                        <input
                                                            type="number"
                                                            step="0.001"
                                                            value={editingItem.chromium === 0 ? '0' : (editingItem.chromium || '')}
                                                            onChange={(e) => setEditingItem({...editingItem, chromium: e.target.value})}
                                                            onBlur={(e) => {
                                                                const val = e.target.value.trim();
                                                                if (val === '' || val === '.') {
                                                                    setEditingItem({...editingItem, chromium: 0});
                                                                } else {
                                                                    const num = parseFloat(val);
                                                                    setEditingItem({...editingItem, chromium: isNaN(num) ? 0 : num});
                                                                }
                                                            }}
                                                            className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-400 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-600">モリブデン (μg)</label>
                                                        <input
                                                            type="number"
                                                            step="0.001"
                                                            value={editingItem.molybdenum === 0 ? '0' : (editingItem.molybdenum || '')}
                                                            onChange={(e) => setEditingItem({...editingItem, molybdenum: e.target.value})}
                                                            onBlur={(e) => {
                                                                const val = e.target.value.trim();
                                                                if (val === '' || val === '.') {
                                                                    setEditingItem({...editingItem, molybdenum: 0});
                                                                } else {
                                                                    const num = parseFloat(val);
                                                                    setEditingItem({...editingItem, molybdenum: isNaN(num) ? 0 : num});
                                                                }
                                                            }}
                                                            className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-400 focus:outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* その他の栄養素 */}
                                            <div className="border-t pt-4">
                                                <p className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                                                    <Icon name="Plus" size={16} className="text-purple-500" />
                                                    その他の栄養素
                                                </p>
                                                <div className="space-y-2">
                                                    {(editingItem.otherNutrients || []).map((nutrient, idx) => (
                                                        <div key={idx} className="flex gap-2 items-center">
                                                            <input
                                                                type="text"
                                                                value={nutrient.name || ''}
                                                                onChange={(e) => {
                                                                    const updated = [...(editingItem.otherNutrients || [])];
                                                                    updated[idx] = {...updated[idx], name: e.target.value};
                                                                    setEditingItem({...editingItem, otherNutrients: updated});
                                                                }}
                                                                placeholder="栄養素名 (例: クレアチン)"
                                                                className="w-28 px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-purple-400 focus:outline-none"
                                                            />
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                value={(nutrient.value === 0 || nutrient.amount === 0) ? '0' : (nutrient.value || nutrient.amount || '')}
                                                                onChange={(e) => {
                                                                    const updated = [...(editingItem.otherNutrients || [])];
                                                                    updated[idx] = {...updated[idx], value: e.target.value, amount: e.target.value};
                                                                    setEditingItem({...editingItem, otherNutrients: updated});
                                                                }}
                                                                onBlur={(e) => {
                                                                    const val = e.target.value.trim();
                                                                    const updated = [...(editingItem.otherNutrients || [])];
                                                                    if (val === '' || val === '.') {
                                                                        updated[idx] = {...updated[idx], value: 0, amount: 0};
                                                                    } else {
                                                                        const num = parseFloat(val);
                                                                        const finalValue = isNaN(num) ? 0 : num;
                                                                        updated[idx] = {...updated[idx], value: finalValue, amount: finalValue};
                                                                    }
                                                                    setEditingItem({...editingItem, otherNutrients: updated});
                                                                }}
                                                                placeholder="量"
                                                                className="w-20 px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-purple-400 focus:outline-none"
                                                            />
                                                            <select
                                                                value={nutrient.unit || 'mg'}
                                                                onChange={(e) => {
                                                                    const updated = [...(editingItem.otherNutrients || [])];
                                                                    updated[idx] = {...updated[idx], unit: e.target.value};
                                                                    setEditingItem({...editingItem, otherNutrients: updated});
                                                                }}
                                                                className="w-14 px-1 py-1 text-sm border rounded focus:ring-1 focus:ring-purple-400 focus:outline-none"
                                                            >
                                                                <option value="g">g</option>
                                                                <option value="mg">mg</option>
                                                                <option value="μg">μg</option>
                                                            </select>
                                                            <button
                                                                onClick={() => {
                                                                    const updated = (editingItem.otherNutrients || []).filter((_, i) => i !== idx);
                                                                    setEditingItem({...editingItem, otherNutrients: updated});
                                                                }}
                                                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                            >
                                                                <Icon name="X" size={16} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button
                                                        onClick={() => {
                                                            const updated = [...(editingItem.otherNutrients || []), {name: '', value: 0, unit: 'g'}];
                                                            setEditingItem({...editingItem, otherNutrients: updated});
                                                        }}
                                                        className="w-full px-3 py-2 border-2 border-dashed border-purple-300 rounded-lg text-purple-600 hover:bg-purple-50 transition text-sm flex items-center justify-center gap-1"
                                                    >
                                                        <Icon name="Plus" size={14} />
                                                        栄養素を追加
                                                    </button>
                                                </div>
                                            </div>

                                            {/* 保存ボタン */}
                                            <div className="flex gap-2 pt-4">
                                                <button
                                                    onClick={() => {
                                                        setShowEditModal(false);
                                                        setEditingItem(null);
                                                    }}
                                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                                                >
                                                    キャンセル
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            const customFood = {
                                                                name: editingItem.name,
                                                                category: editingItem.category,
                                                                itemType: editingItem.itemType,
                                                                calories: editingItem.calories || 0,
                                                                protein: editingItem.protein || 0,
                                                                fat: editingItem.fat || 0,
                                                                carbs: editingItem.carbs || 0,
                                                                servingSize: editingItem.servingSize || 100,
                                                                servingUnit: editingItem.servingUnit || 'g',
                                                                vitamins: {
                                                                    A: editingItem.vitaminA || 0,
                                                                    B1: editingItem.vitaminB1 || 0,
                                                                    B2: editingItem.vitaminB2 || 0,
                                                                    B6: editingItem.vitaminB6 || 0,
                                                                    B12: editingItem.vitaminB12 || 0,
                                                                    C: editingItem.vitaminC || 0,
                                                                    D: editingItem.vitaminD || 0,
                                                                    E: editingItem.vitaminE || 0,
                                                                    K: editingItem.vitaminK || 0,
                                                                    niacin: editingItem.niacin || 0,
                                                                    pantothenicAcid: editingItem.pantothenicAcid || 0,
                                                                    biotin: editingItem.biotin || 0,
                                                                    folicAcid: editingItem.folicAcid || 0
                                                                },
                                                                minerals: {
                                                                    sodium: editingItem.sodium || 0,
                                                                    potassium: editingItem.potassium || 0,
                                                                    calcium: editingItem.calcium || 0,
                                                                    magnesium: editingItem.magnesium || 0,
                                                                    phosphorus: editingItem.phosphorus || 0,
                                                                    iron: editingItem.iron || 0,
                                                                    zinc: editingItem.zinc || 0,
                                                                    copper: editingItem.copper || 0,
                                                                    manganese: editingItem.manganese || 0,
                                                                    iodine: editingItem.iodine || 0,
                                                                    selenium: editingItem.selenium || 0,
                                                                    chromium: editingItem.chromium || 0,
                                                                    molybdenum: editingItem.molybdenum || 0
                                                                },
                                                                otherNutrients: editingItem.otherNutrients || [],
                                                                updatedAt: new Date().toISOString()
                                                            };

                                                            await firebase.firestore()
                                                                .collection('users')
                                                                .doc(userId)
                                                                .collection('customFoods')
                                                                .doc(customFood.name)
                                                                .set(customFood, { merge: true });

                                                            console.log(`[Settings] カスタムアイテムを更新: ${customFood.name}`);
                                                            toast.success('更新しました');
                                                            loadCustomFoods(); // 再読み込み
                                                            setShowEditModal(false);
                                                            setEditingItem(null);
                                                        } catch (error) {
                                                            console.error('[Settings] 更新エラー:', error);
                                                            toast.error('更新に失敗しました');
                                                        }
                                                    }}
                                                    className="flex-1 px-4 py-3 bg-[#4A9EFF] text-white rounded-lg hover:bg-[#3b8fef] font-bold shadow-md"
                                                >
                                                    保存
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* 全データベースアイテム一覧 */}
                {(() => {
                    const [dbTab, setDbTab] = React.useState('food');
                    const [dbSearchTerm, setDbSearchTerm] = React.useState('');
                    const [expandedCategories, setExpandedCategories] = React.useState({});
                    const [selectedItemDetail, setSelectedItemDetail] = React.useState(null);
                    const [showDetailModal, setShowDetailModal] = React.useState(false);
                    const [hiddenStandardItems, setHiddenStandardItems] = React.useState([]);
                    const [hiddenCategories, setHiddenCategories] = React.useState([]);
                    const [hiddenStandardTrainings, setHiddenStandardTrainings] = React.useState([]);
                    const [hiddenTrainingCategories, setHiddenTrainingCategories] = React.useState([]);
                    const [loadingHidden, setLoadingHidden] = React.useState(false);

                    // Firestoreから非表示アイテムを読み込み
                    const loadHiddenItems = async () => {
                        if (!userId) return;
                        try {
                            const doc = await firebase.firestore()
                                .collection('users')
                                .doc(userId)
                                .collection('settings')
                                .doc('hiddenStandardItems')
                                .get();

                            if (doc.exists) {
                                setHiddenStandardItems(doc.data().items || []);
                            }
                        } catch (error) {
                            console.error('[Settings] Failed to load hidden items:', error);
                        }
                    };

                    // Firestoreから非表示カテゴリを読み込み
                    const loadHiddenCategories = async () => {
                        if (!userId) return;
                        try {
                            const doc = await firebase.firestore()
                                .collection('users')
                                .doc(userId)
                                .collection('settings')
                                .doc('hiddenCategories')
                                .get();

                            if (doc.exists) {
                                setHiddenCategories(doc.data().categories || []);
                            }
                        } catch (error) {
                            console.error('[Settings] Failed to load hidden categories:', error);
                        }
                    };

                    // Firestoreから非表示トレーニングアイテムを読み込み
                    const loadHiddenTrainings = async () => {
                        if (!userId) return;
                        try {
                            const doc = await firebase.firestore()
                                .collection('users')
                                .doc(userId)
                                .collection('settings')
                                .doc('hiddenStandardTrainings')
                                .get();

                            if (doc.exists) {
                                setHiddenStandardTrainings(doc.data().items || []);
                            }
                        } catch (error) {
                            console.error('[Settings] Failed to load hidden trainings:', error);
                        }
                    };

                    // Firestoreから非表示トレーニングカテゴリを読み込み
                    const loadHiddenTrainingCategories = async () => {
                        if (!userId) return;
                        try {
                            const doc = await firebase.firestore()
                                .collection('users')
                                .doc(userId)
                                .collection('settings')
                                .doc('hiddenTrainingCategories')
                                .get();

                            if (doc.exists) {
                                setHiddenTrainingCategories(doc.data().categories || []);
                            }
                        } catch (error) {
                            console.error('[Settings] Failed to load hidden training categories:', error);
                        }
                    };

                    // 初回読み込み
                    React.useEffect(() => {
                        loadHiddenItems();
                        loadHiddenCategories();
                        loadHiddenTrainings();
                        loadHiddenTrainingCategories();
                    }, [userId]);

                    // アイテムの表示非表示を切り替え
                    const toggleItemVisibility = async (itemName) => {
                        const isHidden = hiddenStandardItems.includes(itemName);
                        const newHiddenItems = isHidden
                            ? hiddenStandardItems.filter(name => name !== itemName)
                            : [...hiddenStandardItems, itemName];

                        setHiddenStandardItems(newHiddenItems);

                        // Firestoreに保存
                        try {
                            await firebase.firestore()
                                .collection('users')
                                .doc(userId)
                                .collection('settings')
                                .doc('hiddenStandardItems')
                                .set({ items: newHiddenItems });

                            toast.success(isHidden ? `${itemName}を表示しました` : `${itemName}を非表示にしました`);
                        } catch (error) {
                            console.error('[Settings] Failed to save hidden items:', error);
                            toast.error('保存に失敗しました');
                            // エラー時は元に戻す
                            setHiddenStandardItems(hiddenStandardItems);
                        }
                    };

                    // カテゴリの表示非表示を切り替え
                    const toggleCategoryVisibility = async (categoryName) => {
                        const isHidden = hiddenCategories.includes(categoryName);
                        const newHiddenCategories = isHidden
                            ? hiddenCategories.filter(name => name !== categoryName)
                            : [...hiddenCategories, categoryName];

                        setHiddenCategories(newHiddenCategories);

                        // Firestoreに保存
                        try {
                            await firebase.firestore()
                                .collection('users')
                                .doc(userId)
                                .collection('settings')
                                .doc('hiddenCategories')
                                .set({ categories: newHiddenCategories });

                            toast.success(isHidden ? `${categoryName}を表示しました` : `${categoryName}を非表示にしました`);
                        } catch (error) {
                            console.error('[Settings] Failed to save hidden categories:', error);
                            toast.error('保存に失敗しました');
                            // エラー時は元に戻す
                            setHiddenCategories(hiddenCategories);
                        }
                    };

                    // トレーニングアイテムの表示非表示を切り替え
                    const toggleTrainingVisibility = async (itemName) => {
                        const isHidden = hiddenStandardTrainings.includes(itemName);
                        const newHiddenItems = isHidden
                            ? hiddenStandardTrainings.filter(name => name !== itemName)
                            : [...hiddenStandardTrainings, itemName];

                        setHiddenStandardTrainings(newHiddenItems);

                        // Firestoreに保存
                        try {
                            await firebase.firestore()
                                .collection('users')
                                .doc(userId)
                                .collection('settings')
                                .doc('hiddenStandardTrainings')
                                .set({ items: newHiddenItems });

                            toast.success(isHidden ? `${itemName}を表示しました` : `${itemName}を非表示にしました`);
                        } catch (error) {
                            console.error('[Settings] Failed to save hidden trainings:', error);
                            toast.error('保存に失敗しました');
                            // エラー時は元に戻す
                            setHiddenStandardTrainings(hiddenStandardTrainings);
                        }
                    };

                    // トレーニングカテゴリの表示非表示を切り替え
                    const toggleTrainingCategoryVisibility = async (categoryName) => {
                        const isHidden = hiddenTrainingCategories.includes(categoryName);
                        const newHiddenCategories = isHidden
                            ? hiddenTrainingCategories.filter(name => name !== categoryName)
                            : [...hiddenTrainingCategories, categoryName];

                        setHiddenTrainingCategories(newHiddenCategories);

                        // Firestoreに保存
                        try {
                            await firebase.firestore()
                                .collection('users')
                                .doc(userId)
                                .collection('settings')
                                .doc('hiddenTrainingCategories')
                                .set({ categories: newHiddenCategories });

                            toast.success(isHidden ? `${categoryName}を表示しました` : `${categoryName}を非表示にしました`);
                        } catch (error) {
                            console.error('[Settings] Failed to save hidden training categories:', error);
                            toast.error('保存に失敗しました');
                            // エラー時は元に戻す
                            setHiddenTrainingCategories(hiddenTrainingCategories);
                        }
                    };

                    const toggleCategory = (category) => {
                        setExpandedCategories(prev => ({
                            ...prev,
                            [category]: !prev[category]
                        }));
                    };

                    // 食品データベースのアイテムをカテゴリごとに整理
                    const organizedFoodDB = React.useMemo(() => {
                        const organized = {};
                        const foodDB = window.foodDB || {};
                        Object.keys(foodDB).forEach(category => {
                            const items = [];
                            Object.keys(foodDB[category] || {}).forEach(itemName => {
                                if (itemName.includes(dbSearchTerm)) {
                                    items.push({
                                        name: itemName,
                                        ...foodDB[category][itemName]
                                    });
                                }
                            });
                            if (items.length > 0) {
                                organized[category] = items;
                            }
                        });
                        return organized;
                    }, [dbSearchTerm]);

                    // トレーニングデータベースのアイテムをカテゴリごとに整理
                    const organizedTrainingDB = React.useMemo(() => {
                        const organized = {};
                        Object.keys(trainingDatabase).forEach(category => {
                            const items = [];
                            Object.keys(trainingDatabase[category]).forEach(itemName => {
                                if (itemName.includes(dbSearchTerm)) {
                                    items.push({
                                        name: itemName,
                                        ...trainingDatabase[category][itemName]
                                    });
                                }
                            });
                            if (items.length > 0) {
                                organized[category] = items;
                            }
                        });
                        return organized;
                    }, [dbSearchTerm]);

                    const totalFoodItems = Object.values(organizedFoodDB).reduce((sum, items) => sum + items.length, 0);
                    const totalTrainingItems = Object.values(organizedTrainingDB).reduce((sum, items) => sum + items.length, 0);

                    return (
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <h4 className="font-bold mb-2 text-green-800 flex items-center gap-2">
                                <Icon name="Database" size={18} />
                                全データベースアイテム一覧
                            </h4>
                            <p className="text-sm text-gray-600 mb-3">アプリに登録されているすべてのアイテムを確認できます。</p>

                            {/* タブ切り替え */}
                            <div className="flex gap-2 mb-3">
                                <button
                                    onClick={() => setDbTab('food')}
                                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                                        dbTab === 'food'
                                            ? 'bg-green-600 text-white'
                                            : 'bg-white text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    食品 ({totalFoodItems})
                                </button>
                                <button
                                    onClick={() => setDbTab('training')}
                                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                                        dbTab === 'training'
                                            ? 'bg-green-600 text-white'
                                            : 'bg-white text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    運動 ({totalTrainingItems})
                                </button>
                            </div>

                            {/* 検索ボックス */}
                            <input
                                type="text"
                                placeholder="アイテムを検索..."
                                value={dbSearchTerm}
                                onChange={(e) => setDbSearchTerm(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 text-sm"
                            />

                            {/* 食品データベース */}
                            {dbTab === 'food' && (
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {Object.keys(organizedFoodDB).length === 0 ? (
                                        <p className="text-sm text-gray-600 text-center py-4">該当するアイテムがありません</p>
                                    ) : (
                                        Object.keys(organizedFoodDB).map(category => {
                                            const isCategoryHidden = hiddenCategories.includes(category);
                                            return (
                                                <div key={category} className="bg-white rounded-lg border border-gray-200">
                                                    <div className="flex items-center justify-between p-3">
                                                        <button
                                                            onClick={() => toggleCategory(category)}
                                                            className="flex-1 flex items-center justify-between hover:bg-gray-50 transition rounded"
                                                        >
                                                            <span className="font-medium text-sm">{category} ({organizedFoodDB[category].length})</span>
                                                            <Icon name={expandedCategories[category] ? "ChevronUp" : "ChevronDown"} size={16} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleCategoryVisibility(category);
                                                            }}
                                                            className={`ml-2 p-1 transition ${
                                                                isCategoryHidden
                                                                    ? 'text-gray-400 hover:text-gray-600'
                                                                    : 'text-green-600 hover:text-green-800'
                                                            }`}
                                                            title={isCategoryHidden ? 'カテゴリを表示' : 'カテゴリを非表示'}
                                                        >
                                                            <Icon name={isCategoryHidden ? 'EyeOff' : 'Eye'} size={18} />
                                                        </button>
                                                    </div>
                                                {expandedCategories[category] && (
                                                    <div className="p-3 pt-0 space-y-2 max-h-60 overflow-y-auto">
                                                        {organizedFoodDB[category].map((item, idx) => {
                                                            const isHidden = hiddenStandardItems.includes(item.name);
                                                            return (
                                                                <div key={idx} className="bg-white p-2 rounded-lg border space-y-1">
                                                                    {/* 1行目: アイテム名 */}
                                                                    <p className="font-bold text-sm">{item.name}</p>

                                                                    {/* 2行目: 栄養情報 */}
                                                                    <div className="text-xs space-y-0.5">
                                                                        <p className="text-gray-600">100gあたり</p>
                                                                        <p>
                                                                            <span className="text-blue-600 font-semibold">{item.calories}kcal</span>
                                                                            <span className="text-gray-600"> | </span>
                                                                            <span className="text-red-500 font-semibold">P:{item.protein}g</span>
                                                                            <span className="text-gray-600"> </span>
                                                                            <span className="text-yellow-600 font-semibold">F:{item.fat}g</span>
                                                                            <span className="text-gray-600"> </span>
                                                                            <span className="text-green-600 font-semibold">C:{item.carbs}g</span>
                                                                        </p>
                                                                    </div>

                                                                    {/* 3行目: アイコン */}
                                                                    <div className="flex gap-2 justify-end">
                                                                        <button
                                                                            onClick={() => {
                                                                                setSelectedItemDetail(item);
                                                                                setShowDetailModal(true);
                                                                            }}
                                                                            className="p-1 text-blue-600 hover:text-blue-800 transition"
                                                                            title="詳細を表示"
                                                                        >
                                                                            <Icon name="Info" size={18} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => toggleItemVisibility(item.name)}
                                                                            className={`p-1 transition ${
                                                                                isHidden
                                                                                    ? 'text-gray-400 hover:text-gray-600'
                                                                                    : 'text-green-600 hover:text-green-800'
                                                                            }`}
                                                                            title={isHidden ? '表示する' : '非表示にする'}
                                                                        >
                                                                            <Icon name={isHidden ? 'EyeOff' : 'Eye'} size={18} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                    )}
                                </div>
                            )}

                            {/* トレーニングデータベース */}
                            {dbTab === 'training' && (
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {Object.keys(organizedTrainingDB).length === 0 ? (
                                        <p className="text-sm text-gray-600 text-center py-4">該当するアイテムがありません</p>
                                    ) : (
                                        Object.keys(organizedTrainingDB).map(category => {
                                            const isCategoryHidden = hiddenTrainingCategories.includes(category);
                                            return (
                                                <div key={category} className="bg-white rounded-lg border border-gray-200">
                                                    <div className="flex items-center justify-between p-3">
                                                        <button
                                                            onClick={() => toggleCategory(category)}
                                                            className="flex-1 flex items-center justify-between hover:bg-gray-50 transition rounded"
                                                        >
                                                            <span className="font-medium text-sm">{category} ({organizedTrainingDB[category].length})</span>
                                                            <Icon name={expandedCategories[category] ? "ChevronUp" : "ChevronDown"} size={16} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleTrainingCategoryVisibility(category);
                                                            }}
                                                            className={`ml-2 p-1 transition ${
                                                                isCategoryHidden
                                                                    ? 'text-gray-400 hover:text-gray-600'
                                                                    : 'text-green-600 hover:text-green-800'
                                                            }`}
                                                            title={isCategoryHidden ? 'カテゴリを表示' : 'カテゴリを非表示'}
                                                        >
                                                            <Icon name={isCategoryHidden ? 'EyeOff' : 'Eye'} size={18} />
                                                        </button>
                                                    </div>
                                                    {expandedCategories[category] && (
                                                        <div className="p-3 pt-0 space-y-1 max-h-60 overflow-y-auto">
                                                            {organizedTrainingDB[category].map((item, idx) => {
                                                                const isHidden = hiddenStandardTrainings.includes(item.name);
                                                                return (
                                                                    <div
                                                                        key={idx}
                                                                        className="w-full text-sm py-2 px-2 bg-gray-50 rounded flex justify-between items-center gap-2"
                                                                    >
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="font-medium text-gray-800">{item.name}</div>
                                                                            <div className="text-xs text-gray-600 mt-0.5">
                                                                                {item.met && `MET: ${item.met}`}
                                                                                {item.category && ` • ${item.category}`}
                                                                            </div>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => toggleTrainingVisibility(item.name)}
                                                                            className={`p-1 transition flex-shrink-0 ${
                                                                                isHidden
                                                                                    ? 'text-gray-400 hover:text-gray-600'
                                                                                    : 'text-green-600 hover:text-green-800'
                                                                            }`}
                                                                            title={isHidden ? '表示する' : '非表示にする'}
                                                                        >
                                                                            <Icon name={isHidden ? 'EyeOff' : 'Eye'} size={18} />
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}

                            {/* アイテム詳細モーダル */}
                            {showDetailModal && selectedItemDetail && (
                                <div className="fixed inset-0 bg-black bg-opacity-50 z-[10001] flex items-center justify-center p-4">
                                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] sm:max-w-md max-h-[80vh] overflow-y-auto">
                                        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
                                            <h3 className="text-lg font-bold">{selectedItemDetail.name}</h3>
                                            <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                                                <Icon name="X" size={24} />
                                            </button>
                                        </div>
                                        <div className="p-6 space-y-4">
                                            {/* 基本栄養素 */}
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <h4 className="font-bold mb-3 text-gray-800">基本栄養素（{selectedItemDetail.servingSize || 100}{selectedItemDetail.servingUnit || 'g'}あたり）</h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div>
                                                        <p className="text-xs text-gray-600">カロリー</p>
                                                        <p className="font-bold text-lg text-blue-600">{selectedItemDetail.calories || 0}kcal</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-600">たんぱく質</p>
                                                        <p className="font-bold text-lg text-red-600">{selectedItemDetail.protein || 0}g</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-600">脂質</p>
                                                        <p className="font-bold text-lg text-yellow-600">{selectedItemDetail.fat || 0}g</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-600">炭水化物</p>
                                                        <p className="font-bold text-lg text-green-600">{selectedItemDetail.carbs || 0}g</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 脂肪酸 */}
                                            {(() => {
                                                const hasFattyAcids = selectedItemDetail.saturatedFat !== undefined ||
                                                                       selectedItemDetail.monounsaturatedFat !== undefined ||
                                                                       selectedItemDetail.polyunsaturatedFat !== undefined;
                                                if (!hasFattyAcids) return null;

                                                return (
                                                    <div className="bg-yellow-50 p-4 rounded-lg">
                                                        <h4 className="font-bold mb-3 text-yellow-800">脂肪酸</h4>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                                            {selectedItemDetail.saturatedFat !== undefined && (
                                                                <div>
                                                                    <p className="text-xs text-gray-600">飽和脂肪酸</p>
                                                                    <p className="font-bold">{selectedItemDetail.saturatedFat}g</p>
                                                                </div>
                                                            )}
                                                            {selectedItemDetail.monounsaturatedFat !== undefined && (
                                                                <div>
                                                                    <p className="text-xs text-gray-600">一価不飽和脂肪酸</p>
                                                                    <p className="font-bold">{selectedItemDetail.monounsaturatedFat}g</p>
                                                                </div>
                                                            )}
                                                            {selectedItemDetail.polyunsaturatedFat !== undefined && (
                                                                <div>
                                                                    <p className="text-xs text-gray-600">多価不飽和脂肪酸</p>
                                                                    <p className="font-bold">{selectedItemDetail.polyunsaturatedFat}g</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* 食物繊維・糖質 */}
                                            {(() => {
                                                const hasFiberOrSugar = selectedItemDetail.fiber !== undefined ||
                                                                         selectedItemDetail.sugar !== undefined ||
                                                                         selectedItemDetail.solubleFiber !== undefined ||
                                                                         selectedItemDetail.insolubleFiber !== undefined;
                                                if (!hasFiberOrSugar) return null;

                                                return (
                                                    <div className="bg-blue-50 p-4 rounded-lg">
                                                        <h4 className="font-bold mb-3 text-blue-800">食物繊維・糖質</h4>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                                            {selectedItemDetail.sugar !== undefined && (
                                                                <div>
                                                                    <p className="text-xs text-gray-600">糖質</p>
                                                                    <p className="font-bold">{selectedItemDetail.sugar}g</p>
                                                                </div>
                                                            )}
                                                            {selectedItemDetail.fiber !== undefined && (
                                                                <div>
                                                                    <p className="text-xs text-gray-600">食物繊維</p>
                                                                    <p className="font-bold">{selectedItemDetail.fiber}g</p>
                                                                </div>
                                                            )}
                                                            {selectedItemDetail.solubleFiber !== undefined && (
                                                                <div>
                                                                    <p className="text-xs text-gray-600">水溶性食物繊維</p>
                                                                    <p className="font-bold">{selectedItemDetail.solubleFiber}g</p>
                                                                </div>
                                                            )}
                                                            {selectedItemDetail.insolubleFiber !== undefined && (
                                                                <div>
                                                                    <p className="text-xs text-gray-600">不溶性食物繊維</p>
                                                                    <p className="font-bold">{selectedItemDetail.insolubleFiber}g</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* GI値・DIAAS */}
                                            {(selectedItemDetail.gi || selectedItemDetail.diaas) && (
                                                <div className="bg-blue-50 p-4 rounded-lg">
                                                    <h4 className="font-bold mb-3 text-blue-800">栄養指標</h4>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                                        {selectedItemDetail.gi && (
                                                            <div>
                                                                <p className="text-xs text-gray-600">GI値</p>
                                                                <p className="font-bold">{selectedItemDetail.gi}</p>
                                                            </div>
                                                        )}
                                                        {selectedItemDetail.diaas && (
                                                            <div>
                                                                <p className="text-xs text-gray-600">DIAAS</p>
                                                                <p className="font-bold">{selectedItemDetail.diaas}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* ビタミン */}
                                            {(() => {
                                                const vitaminMap = {
                                                    'vitaminA': { label: 'ビタミンA', unit: 'μg' },
                                                    'vitaminB1': { label: 'ビタミンB1', unit: 'mg' },
                                                    'vitaminB2': { label: 'ビタミンB2', unit: 'mg' },
                                                    'vitaminB6': { label: 'ビタミンB6', unit: 'mg' },
                                                    'vitaminB12': { label: 'ビタミンB12', unit: 'μg' },
                                                    'vitaminC': { label: 'ビタミンC', unit: 'mg' },
                                                    'vitaminD': { label: 'ビタミンD', unit: 'μg' },
                                                    'vitaminE': { label: 'ビタミンE', unit: 'mg' },
                                                    'vitaminK': { label: 'ビタミンK', unit: 'μg' },
                                                    'niacin': { label: 'ナイアシン', unit: 'mg' },
                                                    'pantothenicAcid': { label: 'パントテン酸', unit: 'mg' },
                                                    'biotin': { label: 'ビオチン', unit: 'μg' },
                                                    'folicAcid': { label: '葉酸', unit: 'μg' }
                                                };
                                                const vitamins = Object.keys(vitaminMap).filter(key => selectedItemDetail[key] !== undefined && selectedItemDetail[key] !== 0);

                                                return vitamins.length > 0 && (
                                                    <div className="bg-yellow-50 p-4 rounded-lg">
                                                        <h4 className="font-bold mb-3 text-yellow-800">ビタミン</h4>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                                            {vitamins.map(key => (
                                                                <div key={key}>
                                                                    <p className="text-xs text-gray-600">{vitaminMap[key].label}</p>
                                                                    <p className="font-bold">{selectedItemDetail[key]}{vitaminMap[key].unit}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* ミネラル */}
                                            {(() => {
                                                const mineralMap = {
                                                    'sodium': { label: 'ナトリウム', unit: 'mg' },
                                                    'potassium': { label: 'カリウム', unit: 'mg' },
                                                    'calcium': { label: 'カルシウム', unit: 'mg' },
                                                    'magnesium': { label: 'マグネシウム', unit: 'mg' },
                                                    'phosphorus': { label: 'リン', unit: 'mg' },
                                                    'iron': { label: '鉄', unit: 'mg' },
                                                    'zinc': { label: '亜鉛', unit: 'mg' },
                                                    'copper': { label: '銅', unit: 'mg' },
                                                    'manganese': { label: 'マンガン', unit: 'mg' },
                                                    'iodine': { label: 'ヨウ素', unit: 'μg' },
                                                    'selenium': { label: 'セレン', unit: 'μg' },
                                                    'chromium': { label: 'クロム', unit: 'μg' },
                                                    'molybdenum': { label: 'モリブデン', unit: 'μg' }
                                                };
                                                const minerals = Object.keys(mineralMap).filter(key => selectedItemDetail[key] !== undefined && selectedItemDetail[key] !== 0);

                                                return minerals.length > 0 && (
                                                    <div className="bg-orange-50 p-4 rounded-lg">
                                                        <h4 className="font-bold mb-3 text-orange-800">ミネラル</h4>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                                            {minerals.map(key => (
                                                                <div key={key}>
                                                                    <p className="text-xs text-gray-600">{mineralMap[key].label}</p>
                                                                    <p className="font-bold">{selectedItemDetail[key]}{mineralMap[key].unit}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* MET値（トレーニング用） */}
                                            {selectedItemDetail.met && (
                                                <div className="bg-green-50 p-4 rounded-lg">
                                                    <h4 className="font-bold mb-3 text-green-800">運動強度</h4>
                                                    <div className="text-sm">
                                                        <p className="text-xs text-gray-600">MET値</p>
                                                        <p className="font-bold text-lg">{selectedItemDetail.met}</p>
                                                        <p className="text-xs text-gray-600 mt-2">※運動強度の指標。安静時を1としたエネルギー消費量の比率</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-6 border-t">
                                            <button
                                                onClick={() => setShowDetailModal(false)}
                                                className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition"
                                            >
                                                閉じる
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })()}

                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <div className="flex items-start gap-3">
                        <Icon name="Trash2" size={20} className="text-red-600 mt-1" />
                        <div className="flex-1">
                            <h4 className="font-bold mb-2 text-red-800">全データの削除</h4>
                            <p className="text-sm text-gray-600 mb-3">
                                すべてのデータを削除します。この操作は取り消せません。                                        </p>
                            <button
                                onClick={handleClearData}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                            >
                                全データ削除
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            </div>
        </details>
    );
};

export default DataTab;

