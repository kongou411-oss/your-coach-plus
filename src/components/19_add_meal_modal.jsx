import React, { useState, useEffect } from 'react';

// ===== AddMealModal: ゴールベースの食事記録モーダル =====
// フロー: 食事名入力 → アイテム選択・追加 → 記録
//
// Props:
// - onClose: () => void - モーダルを閉じる
// - onAdd: (meal) => void - 食事を記録
// - user: Object - ユーザー情報
// - userProfile: Object - ユーザープロフィール
// - unlockedFeatures: Array - 解放済み機能
// - usageDays: Number - 利用日数

const AddMealModal = ({ onClose, onAdd, user, userProfile, unlockedFeatures = [], usageDays = 0 }) => {
    // ===== State管理 =====
    const [step, setStep] = useState(1); // 1: 食事名入力, 2: アイテム選択
    const [mealName, setMealName] = useState('');
    const [mealTemplates, setMealTemplates] = useState([]);
    const [addedItems, setAddedItems] = useState([]);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [showAIFoodRecognition, setShowAIFoodRecognition] = useState(false);
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);
    const [showCustomForm, setShowCustomForm] = useState(false);

    // 検索モーダル用のstate
    const [searchTerm, setSearchTerm] = useState('');
    const [foodTab, setFoodTab] = useState('food'); // 'food', 'recipe', 'supplement'
    const [selectedCategory, setSelectedCategory] = useState('肉類'); // デフォルトで肉類を表示

    // 量調整UI用のstate
    const [selectedItemIndex, setSelectedItemIndex] = useState(null); // 選択中のアイテム
    const [adjustmentStep, setAdjustmentStep] = useState(10); // 増減ステップ（g単位のデフォルト）

    // カスタムアイテムデータ
    const [customData, setCustomData] = useState({
        name: '',
        itemType: 'food', // 'food', 'recipe', 'supplement'
        category: '穀類',
        servingSize: 100,
        servingUnit: 'g',
        calories: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
        // ビタミン
        vitaminA: 0, vitaminB1: 0, vitaminB2: 0, vitaminB6: 0, vitaminB12: 0,
        vitaminC: 0, vitaminD: 0, vitaminE: 0, vitaminK: 0,
        niacin: 0, pantothenicAcid: 0, biotin: 0, folicAcid: 0,
        // ミネラル
        sodium: 0, potassium: 0, calcium: 0, magnesium: 0, phosphorus: 0,
        iron: 0, zinc: 0, copper: 0, manganese: 0, iodine: 0, selenium: 0, chromium: 0, molybdenum: 0,
        // その他
        otherNutrients: []
    });

    // Icon, DataService, AIFoodRecognition はグローバルに公開されている前提
    const Icon = window.Icon;
    const DataService = window.DataService;
    const AIFoodRecognition = window.AIFoodRecognition;

    // ===== テンプレート読み込み =====
    useEffect(() => {
        if (user && DataService) {
            DataService.getMealTemplates(user.uid).then(templates => {
                setMealTemplates(templates || []);
            });
        }
    }, [user]);

    // ===== 現在時刻から食事名を推測 =====
    const getDefaultMealName = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 11) return '朝食';
        if (hour >= 11 && hour < 16) return '昼食';
        if (hour >= 16 && hour < 21) return '夕食';
        return '間食';
    };

    // ===== 追加済みアイテムの合計PFCを計算 =====
    const calculateTotalPFC = () => {
        return addedItems.reduce((total, item) => {
            // 個数単位（本、個、杯、枚）の場合はそのまま、g/ml単位の場合は100で割る
            const isCountUnit = ['本', '個', '杯', '枚'].some(u => (item.unit || '').includes(u));
            const ratio = isCountUnit ? item.amount : item.amount / 100;

            return {
                calories: total.calories + (item.calories || 0) * ratio,
                protein: total.protein + (item.protein || 0) * ratio,
                fat: total.fat + (item.fat || 0) * ratio,
                carbs: total.carbs + (item.carbs || 0) * ratio,
            };
        }, { calories: 0, protein: 0, fat: 0, carbs: 0 });
    };

    // ===== テンプレートを読み込む =====
    const loadTemplate = (template) => {
        setMealName(template.name);
        setAddedItems(JSON.parse(JSON.stringify(template.items))); // ディープコピー
        setStep(2);
        setShowTemplateSelector(false);
    };

    // ===== AI食事認識からのコールバック =====
    const handleFoodsRecognized = (recognizedFoods) => {
        // AIが認識した食材をaddedItemsに追加
        const newItems = recognizedFoods.map(food => ({
            id: Date.now() + Math.random(),
            name: food.name,
            amount: food.amount || 100,
            unit: 'g',
            calories: food.calories || 0,
            protein: food.protein || 0,
            fat: food.fat || 0,
            carbs: food.carbs || 0,
            category: food.category || '',
            isCustom: food.isCustom || false,
            isUnknown: food.isUnknown || false
        }));

        setAddedItems([...addedItems, ...newItems]);
        setShowAIFoodRecognition(false);
    };

    // ===== アイテムを削除 =====
    const removeItem = (index) => {
        setAddedItems(addedItems.filter((_, i) => i !== index));
    };

    // ===== アイテムの量を更新 =====
    const updateItemAmount = (index, newAmount) => {
        const updatedItems = [...addedItems];
        updatedItems[index] = {
            ...updatedItems[index],
            amount: Math.max(0, newAmount) // 0未満にならないように
        };
        setAddedItems(updatedItems);
    };

    // ===== 食事を記録 =====
    const handleRecord = () => {
        if (addedItems.length === 0) {
            alert('食材を追加してください');
            return;
        }

        // 合計カロリー・PFCを計算
        const totalPFC = calculateTotalPFC();

        const meal = {
            id: Date.now(),
            name: mealName,
            items: addedItems,
            time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
            calories: totalPFC.calories,
            protein: totalPFC.protein,
            fat: totalPFC.fat,
            carbs: totalPFC.carbs,
            totalCalories: totalPFC.calories,
        };

        onAdd(meal);
    };

    // ===== クイック入力ボタン =====
    const quickMealNames = ['朝食', '昼食', '夕食', '間食', 'プロテイン', 'プレワークアウト'];

    // ===== Step 1: 食事名入力画面 =====
    if (step === 1) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={(e) => {
                // モーダル外をクリックした場合は閉じる
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}>
                <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    {/* ヘッダー */}
                    <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
                        <h3 className="text-lg font-bold">食事名を入力</h3>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                            <Icon name="X" size={20} />
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* 食事名入力 */}
                        <div>
                            <label className="block text-sm font-medium mb-2">食事名</label>
                            <input
                                type="text"
                                value={mealName}
                                onChange={(e) => setMealName(e.target.value)}
                                placeholder={getDefaultMealName()}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                autoFocus
                            />
                        </div>

                        {/* クイック入力ボタン */}
                        <div>
                            <label className="block text-sm font-medium mb-2">よく使う食事名</label>
                            <div className="grid grid-cols-3 gap-2">
                                {quickMealNames.map((name) => (
                                    <button
                                        key={name}
                                        onClick={() => setMealName(name)}
                                        className="px-3 py-2 bg-gray-100 hover:bg-blue-50 hover:border-blue-500 border-2 border-transparent rounded-lg text-sm font-medium transition"
                                    >
                                        {name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* テンプレート一覧 */}
                        {mealTemplates.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                    <Icon name="BookOpen" size={16} />
                                    テンプレートから選択
                                </label>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {mealTemplates.map((template) => {
                                        const totalPFC = template.items.reduce((sum, item) => ({
                                            protein: sum.protein + (item.protein || 0),
                                            fat: sum.fat + (item.fat || 0),
                                            carbs: sum.carbs + (item.carbs || 0),
                                        }), { protein: 0, fat: 0, carbs: 0 });

                                        return (
                                            <button
                                                key={template.id}
                                                onClick={() => loadTemplate(template)}
                                                className="w-full p-3 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 border border-purple-200 rounded-lg text-left transition"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="font-semibold text-gray-900">{template.name}</div>
                                                        <div className="text-xs text-gray-600 mt-1">
                                                            {template.items.length}品目
                                                        </div>
                                                    </div>
                                                    <div className="text-right text-xs text-gray-700">
                                                        <div>P {Math.round(totalPFC.protein)}g</div>
                                                        <div>F {Math.round(totalPFC.fat)}g</div>
                                                        <div>C {Math.round(totalPFC.carbs)}g</div>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 次へボタン */}
                        <button
                            onClick={() => {
                                if (!mealName.trim()) {
                                    setMealName(getDefaultMealName());
                                }
                                setStep(2);
                            }}
                            className="w-full bg-[#4A9EFF] text-white font-bold py-3 px-6 rounded-lg hover:bg-[#3b8fef] shadow-lg transition"
                        >
                            次へ
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ===== Step 2: アイテム選択画面 =====
    const totalPFC = calculateTotalPFC();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={(e) => {
            // モーダル外をクリックした場合は閉じる
            if (e.target === e.currentTarget) {
                onClose();
            }
        }}>
            <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                {/* ヘッダー */}
                <div className="bg-white border-b p-4 flex-shrink-0">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-bold">{mealName}</h3>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                            <Icon name="X" size={20} />
                        </button>
                    </div>

                    {/* この食事の合計 */}
                    {addedItems.length > 0 && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-200">
                            <div className="text-xs font-medium text-gray-600 mb-1">この食事の合計</div>
                            <div className="flex items-center justify-between">
                                <div className="text-xl font-bold" style={{color: '#60a5fa'}}>
                                    {Math.round(totalPFC.calories)}kcal
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-red-500 font-semibold">P {Math.round(totalPFC.protein)}g</span>
                                    <span className="text-gray-400">|</span>
                                    <span className="text-yellow-500 font-semibold">F {Math.round(totalPFC.fat)}g</span>
                                    <span className="text-gray-400">|</span>
                                    <span className="text-green-500 font-semibold">C {Math.round(totalPFC.carbs)}g</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 追加済みアイテム一覧 */}
                <div className="flex-1 overflow-y-auto p-4">
                    {addedItems.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Icon name="Plus" size={48} className="mx-auto mb-3 opacity-30" />
                            <p>食材を追加してください</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {addedItems.map((item, index) => {
                                // 個数単位（本、個、杯、枚）の場合はそのまま、g/ml単位の場合は100で割る
                                const isCountUnit = ['本', '個', '杯', '枚'].some(u => (item.unit || '').includes(u));
                                const ratio = isCountUnit ? item.amount : item.amount / 100;
                                const displayCalories = Math.round((item.calories || 0) * ratio);
                                const displayProtein = Math.round((item.protein || 0) * ratio * 10) / 10;
                                const displayFat = Math.round((item.fat || 0) * ratio * 10) / 10;
                                const displayCarbs = Math.round((item.carbs || 0) * ratio * 10) / 10;
                                const isSelected = selectedItemIndex === index;

                                return (
                                    <div
                                        key={index}
                                        onClick={() => setSelectedItemIndex(index)}
                                        className={`bg-white p-3 rounded-lg border-2 cursor-pointer transition ${
                                            isSelected ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="font-semibold text-gray-900">{item.name}</div>
                                                <div className="text-sm text-gray-600 mt-1">
                                                    {item.amount}{item.unit || 'g'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                                            <div className="text-sm font-bold" style={{color: '#60a5fa'}}>
                                                {displayCalories}kcal
                                            </div>
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="text-red-500 font-semibold">P {displayProtein}g</span>
                                                <span className="text-gray-400">|</span>
                                                <span className="text-yellow-500 font-semibold">F {displayFat}g</span>
                                                <span className="text-gray-400">|</span>
                                                <span className="text-green-500 font-semibold">C {displayCarbs}g</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 量調整UI（選択中のアイテムがある場合） */}
                {selectedItemIndex !== null && addedItems[selectedItemIndex] && (() => {
                    const selectedItem = addedItems[selectedItemIndex];
                    const unit = selectedItem.unit || 'g';
                    const isCountUnit = ['個', '本', '杯', '枚'].some(u => unit.includes(u));
                    const stepOptions = isCountUnit ? [1, 2, 3, 5, 10] : [1, 5, 10, 50, 100];

                    return (
                        <div className="border-t bg-gray-50 p-3 flex-shrink-0">
                            <div className="text-xs text-gray-600 mb-2">
                                {selectedItem.name} の量を調整
                                {selectedItem.servingSize && selectedItem.servingUnit && (
                                    <span className="text-blue-600 font-semibold ml-2">
                                        ({unit.includes('本') || unit.includes('個') || unit.includes('杯') || unit.includes('枚') ?
                                            `1${unit} = ${selectedItem.servingSize}${selectedItem.servingUnit}` :
                                            ''})
                                    </span>
                                )}
                            </div>

                            {/* 数値入力欄 */}
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <input
                                    type="number"
                                    value={selectedItem.amount}
                                    onChange={(e) => updateItemAmount(selectedItemIndex, Number(e.target.value))}
                                    className="w-32 h-12 px-3 py-2 border-2 border-gray-300 rounded-lg text-center font-bold text-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    min="0"
                                    step={adjustmentStep}
                                />
                                <span className="text-lg text-gray-700 font-bold">{unit}</span>
                            </div>

                            {/* ステップ選択 */}
                            <div className="flex gap-1 mb-2">
                                {stepOptions.map(step => (
                                    <button
                                        key={step}
                                        onClick={() => setAdjustmentStep(step)}
                                        className={`flex-1 py-1.5 text-xs rounded transition ${
                                            adjustmentStep === step
                                                ? 'bg-blue-600 text-white font-semibold'
                                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                                        }`}
                                    >
                                        {step}
                                    </button>
                                ))}
                            </div>

                            {/* 調整ボタン */}
                            <div className="grid grid-cols-4 gap-2">
                                {/* 倍減 */}
                                <button
                                    onClick={() => updateItemAmount(selectedItemIndex, Math.max(0, selectedItem.amount * 0.5))}
                                    className="h-12 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition text-sm font-bold"
                                >
                                    ×0.5
                                </button>

                                {/* 減少 */}
                                <button
                                    onClick={() => updateItemAmount(selectedItemIndex, Math.max(0, selectedItem.amount - adjustmentStep))}
                                    className="h-12 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition font-bold flex items-center justify-center"
                                >
                                    <Icon name="Minus" size={22} />
                                </button>

                                {/* 増加 */}
                                <button
                                    onClick={() => updateItemAmount(selectedItemIndex, selectedItem.amount + adjustmentStep)}
                                    className="h-12 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition font-bold flex items-center justify-center"
                                >
                                    <Icon name="Plus" size={22} />
                                </button>

                                {/* 倍増 */}
                                <button
                                    onClick={() => updateItemAmount(selectedItemIndex, selectedItem.amount * 2)}
                                    className="h-12 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition text-sm font-bold"
                                >
                                    ×2
                                </button>
                            </div>
                        </div>
                    );
                })()}

                {/* フッター：アクションボタン */}
                <div className="border-t p-4 space-y-2 flex-shrink-0">
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => setShowAIFoodRecognition(true)}
                            className="px-3 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition shadow-md text-sm"
                        >
                            <Icon name="Camera" size={16} className="inline mr-1" />
                            写真
                        </button>
                        <button
                            onClick={() => setShowSearchModal(true)}
                            className="px-3 py-3 bg-white border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 rounded-lg font-semibold transition text-sm"
                        >
                            <Icon name="Search" size={16} className="inline mr-1" />
                            検索
                        </button>
                        <button
                            onClick={() => setShowCustomForm(true)}
                            className="px-3 py-3 bg-white border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 rounded-lg font-semibold transition text-sm"
                        >
                            <Icon name="Edit" size={16} className="inline mr-1" />
                            手動
                        </button>
                    </div>

                    {/* 戻る・記録ボタン */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setStep(1)}
                            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                        >
                            戻る
                        </button>
                        <button
                            onClick={handleRecord}
                            disabled={addedItems.length === 0}
                            className={`flex-1 py-3 rounded-lg font-bold shadow-lg transition ${
                                addedItems.length === 0
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-[#4A9EFF] text-white hover:bg-[#3b8fef]'
                            }`}
                        >
                            記録
                        </button>
                    </div>
                </div>
            </div>

            {/* 検索モーダル */}
            {showSearchModal && (() => {

                // グローバルから食材データベースを取得
                const foodDB = window.foodDB || {};

                console.log('[19_add_meal_modal] foodDB:', foodDB);
                console.log('[19_add_meal_modal] foodDB type:', typeof foodDB);
                console.log('[19_add_meal_modal] foodDB keys:', Object.keys(foodDB));
                console.log('[19_add_meal_modal] Sample data:', foodDB['肉類'] ? Object.keys(foodDB['肉類']).slice(0, 3) : 'none');

                // カスタムアイテムをlocalStorageから取得
                const getCustomFoods = () => {
                    try {
                        return JSON.parse(localStorage.getItem('customFoods') || '[]');
                    } catch {
                        return [];
                    }
                };

                // カテゴリリスト（サプリメントを除く）
                const categories = Object.keys(foodDB).filter(cat => cat !== 'サプリメント');
                console.log('categories:', categories);

                // 検索結果のフィルタリング
                const getFilteredItems = () => {
                    let items = [];
                    const db = foodDB;

                    // カスタムアイテムを追加
                    const customFoods = getCustomFoods();
                    const customItems = customFoods.filter(item => {
                        if (foodTab === 'food' && item.itemType === 'food') return true;
                        if (foodTab === 'recipe' && item.itemType === 'recipe') return true;
                        if (foodTab === 'supplement' && item.itemType === 'supplement') return true;
                        return false;
                    });

                    // タブに応じてカテゴリを決定
                    let targetCategory = selectedCategory;
                    if (foodTab === 'supplement') {
                        targetCategory = 'サプリメント';
                    } else if (!targetCategory || targetCategory === '') {
                        // デフォルトカテゴリ（foodタブで未選択の場合）
                        targetCategory = Object.keys(db).filter(cat => cat !== 'サプリメント')[0] || '肉類';
                    }

                    console.log('[19_add_meal_modal] foodTab:', foodTab);
                    console.log('[19_add_meal_modal] targetCategory:', targetCategory);
                    console.log('[19_add_meal_modal] db[targetCategory] exists:', !!db[targetCategory]);
                    console.log('[19_add_meal_modal] db[targetCategory] length:', db[targetCategory] ? Object.keys(db[targetCategory]).length : 0);

                    if (db && targetCategory && db[targetCategory]) {
                        Object.keys(db[targetCategory]).forEach(name => {
                            const itemData = db[targetCategory][name];

                            // サプリメントの場合、サブカテゴリでフィルタ
                            if (foodTab === 'supplement') {
                                const targetSubcategory = selectedCategory || 'プロテイン';
                                if (itemData.subcategory !== targetSubcategory) {
                                    return; // このアイテムをスキップ
                                }
                            }

                            // 検索語でフィルタ
                            if (!searchTerm || name.includes(searchTerm)) {
                                items.push({
                                    name,
                                    ...itemData,
                                    category: targetCategory,
                                    isCustom: false
                                });
                            }
                        });
                    }

                    console.log('filtered items:', items.length);

                    // カスタムアイテムを追加
                    customItems.forEach(item => {
                        if (!searchTerm || item.name.includes(searchTerm)) {
                            items.push({
                                ...item,
                                isCustom: true
                            });
                        }
                    });

                    return items;
                };

                const filteredItems = getFilteredItems();

                // アイテムを選択して追加
                const handleSelectItem = (item) => {
                    // デフォルトの量と単位を決定
                    let defaultAmount = 100;
                    let defaultUnit = item.unit || 'g';

                    // 個数単位（個、本、杯、枚、錠など）の場合
                    const unitStr = String(item.unit || '');
                    const isCountUnit = unitStr.includes('個') || unitStr.includes('本') || unitStr.includes('杯') || unitStr.includes('枚') || unitStr.includes('錠');

                    console.log('[handleSelectItem]', item.name, 'unit:', item.unit, 'unitStr:', unitStr, 'isCountUnit:', isCountUnit);

                    if (isCountUnit) {
                        defaultAmount = 1;
                        // 単位から先頭の数字を削除（例: "1個" → "個", "本" → "本"）
                        defaultUnit = unitStr.replace(/^\d+/, '');
                    } else if (item.servingSize && item.servingSize < 100 && item.servingUnit === 'g') {
                        // servingSizeが100g未満の場合は、そのservingSizeをデフォルトにする（グルタミン、クレアチンなど）
                        defaultAmount = item.servingSize;
                    }

                    console.log('[handleSelectItem] defaultAmount:', defaultAmount, 'defaultUnit:', defaultUnit);

                    const newItem = {
                        id: Date.now(),
                        name: item.name,
                        amount: defaultAmount,
                        unit: defaultUnit,
                        calories: item.calories || 0,
                        protein: item.protein || 0,
                        fat: item.fat || 0,
                        carbs: item.carbs || 0,
                        servingSize: item.servingSize || null,
                        servingUnit: item.servingUnit || null,
                        vitamins: item.vitamins || {},
                        minerals: item.minerals || {},
                        isCustom: item.isCustom || false
                    };

                    setAddedItems([...addedItems, newItem]);
                    setSearchTerm(''); // 検索語クリア
                };

                return (
                    <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[70vh] overflow-hidden flex flex-col">
                            {/* ヘッダー */}
                            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-t-2xl z-10">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <Icon name="Search" size={20} />
                                        食材を検索
                                    </h3>
                                    <button
                                        onClick={() => {
                                            setShowSearchModal(false);
                                            // stateをリセット
                                            setSearchTerm('');
                                            setFoodTab('food');
                                            setSelectedCategory('肉類');
                                        }}
                                        className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition"
                                    >
                                        <Icon name="X" size={20} />
                                    </button>
                                </div>

                                {/* 検索欄 */}
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="食材名で検索..."
                                    className="w-full px-4 py-2 rounded-lg text-gray-900 focus:ring-2 focus:ring-white focus:outline-none"
                                />

                                {/* タブ */}
                                <div className="grid grid-cols-3 mt-3 gap-2">
                                    <button
                                        onClick={() => {
                                            setFoodTab('food');
                                            setSelectedCategory('穀類');
                                        }}
                                        className={`py-2 px-3 rounded-lg font-medium transition flex items-center justify-center gap-1 text-sm ${
                                            foodTab === 'food'
                                                ? 'bg-white text-green-600'
                                                : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                                        }`}
                                    >
                                        <Icon name="Apple" size={16} />
                                        食材
                                    </button>
                                    <button
                                        onClick={() => {
                                            setFoodTab('recipe');
                                            setSelectedCategory('');
                                        }}
                                        className={`py-2 px-3 rounded-lg font-medium transition flex items-center justify-center gap-1 text-sm ${
                                            foodTab === 'recipe'
                                                ? 'bg-white text-orange-600'
                                                : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                                        }`}
                                    >
                                        <Icon name="ChefHat" size={16} />
                                        料理
                                    </button>
                                    <button
                                        onClick={() => {
                                            setFoodTab('supplement');
                                            setSelectedCategory('プロテイン');
                                        }}
                                        className={`py-2 px-3 rounded-lg font-medium transition flex items-center justify-center gap-1 text-sm ${
                                            foodTab === 'supplement'
                                                ? 'bg-white text-blue-600'
                                                : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                                        }`}
                                    >
                                        <Icon name="Pill" size={16} />
                                        サプリ
                                    </button>
                                </div>
                            </div>

                            {/* カテゴリフィルタ */}
                            {foodTab === 'food' && (
                                <div className="px-4 py-3 border-b bg-gray-50">
                                    <div className="flex flex-wrap gap-2">
                                        {categories.map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => setSelectedCategory(cat)}
                                                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                                                    (selectedCategory || '穀類') === cat
                                                        ? 'bg-green-600 text-white'
                                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                }`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* サプリメントのサブカテゴリフィルタ */}
                            {foodTab === 'supplement' && (() => {
                                // サプリメントのサブカテゴリ一覧を取得
                                const supplementItems = foodDB['サプリメント'] || {};
                                const subcategories = [...new Set(Object.values(supplementItems).map(item => item.subcategory).filter(Boolean))];

                                return (
                                    <div className="px-4 py-3 border-b bg-gray-50">
                                        <div className="flex flex-wrap gap-2">
                                            {subcategories.map(subcat => (
                                                <button
                                                    key={subcat}
                                                    onClick={() => setSelectedCategory(subcat)}
                                                    className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                                                        (selectedCategory || 'プロテイン') === subcat
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                    }`}
                                                >
                                                    {subcat}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* アイテム一覧 */}
                            <div className="flex-1 overflow-y-auto p-4">
                                {filteredItems.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">
                                        <Icon name="Search" size={48} className="mx-auto mb-3 opacity-30" />
                                        <p>該当する食材が見つかりません</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-2">
                                        {filteredItems.map((item, index) => (
                                            <button
                                                key={index}
                                                onClick={() => handleSelectItem(item)}
                                                className="text-left p-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-500 rounded-lg transition"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="font-semibold text-gray-900 flex items-center gap-2">
                                                            {item.name}
                                                            {item.isCustom && (
                                                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                                                    カスタム
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs mt-1 flex items-center gap-2 flex-wrap">
                                                            <span className="font-semibold" style={{color: '#60a5fa'}}>{item.calories}kcal</span>
                                                            <span className="text-gray-400">|</span>
                                                            <span className="text-red-500 font-semibold">P {item.protein}g</span>
                                                            <span className="text-gray-400">|</span>
                                                            <span className="text-yellow-500 font-semibold">F {item.fat}g</span>
                                                            <span className="text-gray-400">|</span>
                                                            <span className="text-green-500 font-semibold">C {item.carbs}g</span>
                                                            <span className="text-gray-500 text-[10px] ml-1">
                                                                {(() => {
                                                                    // servingSizeとservingUnitがあればそれを使用
                                                                    if (item.servingSize && item.servingUnit) {
                                                                        // unitベースの表記（個、本、杯、錠、枚など）
                                                                        const isCountUnit = ['個', '本', '杯', '枚', '錠', '包', '粒'].some(u => (item.unit || '').includes(u));

                                                                        // 錠やg/ml単位で、servingSizeが100未満の場合は「※{servingSize}{servingUnit}あたり」
                                                                        if ((item.servingUnit === '錠' || item.servingUnit === 'g' || item.servingUnit === 'ml') && item.servingSize < 100) {
                                                                            return `※${item.servingSize}${item.servingUnit}あたり`;
                                                                        }

                                                                        if (isCountUnit) {
                                                                            // 個、本などは「1{unit}」形式
                                                                            return `※1${item.unit}(${item.servingSize}${item.servingUnit})あたり`;
                                                                        }
                                                                    }
                                                                    // デフォルト
                                                                    return '※100gあたり';
                                                                })()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <Icon name="Plus" size={20} className="text-blue-600 flex-shrink-0" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* フッター */}
                            <div className="border-t p-4 bg-gray-50">
                                <button
                                    onClick={() => {
                                        setShowSearchModal(false);
                                        // stateをリセット
                                        setSearchTerm('');
                                        setFoodTab('food');
                                        setSelectedCategory('肉類');
                                    }}
                                    className={`w-full px-4 py-3 rounded-lg font-medium transition ${
                                        addedItems.length > 0
                                            ? 'bg-[#4A9EFF] text-white hover:bg-[#3b8fef]'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                >
                                    {addedItems.length > 0 ? `閉じる（追加済み ${addedItems.length}種）` : '閉じる'}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* AI食事認識モーダル */}
            {showAIFoodRecognition && AIFoodRecognition && (
                <AIFoodRecognition
                    onClose={() => setShowAIFoodRecognition(false)}
                    onFoodsRecognized={handleFoodsRecognized}
                    userId={user?.uid}
                    userProfile={userProfile}
                />
            )}

            {/* カスタムアイテム作成モーダル */}
            {showCustomForm && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        {/* ヘッダー */}
                        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 rounded-t-2xl flex justify-between items-center z-10">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Icon name="Edit" size={20} />
                                カスタムアイテムを作成
                            </h3>
                            <button
                                onClick={() => setShowCustomForm(false)}
                                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition"
                            >
                                <Icon name="X" size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* 名前 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">名前</label>
                                <input
                                    type="text"
                                    value={customData.name}
                                    onChange={(e) => setCustomData({...customData, name: e.target.value})}
                                    placeholder={
                                        customData.itemType === 'food' ? '例: 自家製プロテインバー' :
                                        customData.itemType === 'recipe' ? '例: 自家製カレー' :
                                        '例: マルチビタミン'
                                    }
                                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                />
                            </div>

                            {/* カテゴリタブ */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">カテゴリ</label>
                                <div className="grid grid-cols-3 border-b border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => setCustomData({...customData, itemType: 'food', category: '穀類'})}
                                        className={`py-2 px-3 font-medium transition flex items-center justify-center gap-1 border-b-2 text-xs ${
                                            customData.itemType === 'food'
                                                ? 'border-green-600 text-green-600'
                                                : 'border-transparent text-gray-600 hover:text-green-600'
                                        }`}
                                    >
                                        <Icon name="Apple" size={14} />
                                        <span>食材</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCustomData({...customData, itemType: 'recipe', category: '料理'})}
                                        className={`py-2 px-3 font-medium transition flex items-center justify-center gap-1 border-b-2 text-xs ${
                                            customData.itemType === 'recipe'
                                                ? 'border-orange-600 text-orange-600'
                                                : 'border-transparent text-gray-600 hover:text-orange-600'
                                        }`}
                                    >
                                        <Icon name="ChefHat" size={14} />
                                        <span>料理</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCustomData({...customData, itemType: 'supplement', category: 'プロテイン'})}
                                        className={`py-2 px-3 font-medium transition flex items-center justify-center gap-1 border-b-2 text-xs ${
                                            customData.itemType === 'supplement'
                                                ? 'border-blue-600 text-blue-600'
                                                : 'border-transparent text-gray-600 hover:text-blue-600'
                                        }`}
                                    >
                                        <Icon name="Pill" size={14} />
                                        <span>サプリ</span>
                                    </button>
                                </div>
                            </div>

                            {/* サブカテゴリ & 1回分の量 */}
                            <div className="grid grid-cols-2 gap-2">
                                {customData.itemType === 'recipe' ? (
                                    <input
                                        type="text"
                                        value="料理"
                                        disabled
                                        className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-100"
                                    />
                                ) : (
                                    <select
                                        value={customData.category}
                                        onChange={(e) => setCustomData({...customData, category: e.target.value})}
                                        className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                    >
                                        {customData.itemType === 'supplement' ? (
                                            <>
                                                <option value="ビタミン・ミネラル">ビタミン・ミネラル</option>
                                                <option value="プロテイン">プロテイン</option>
                                                <option value="アミノ酸">アミノ酸</option>
                                                <option value="ドリンク">ドリンク</option>
                                                <option value="その他">その他</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="穀類">穀類</option>
                                                <option value="肉類">肉類</option>
                                                <option value="魚介類">魚介類</option>
                                                <option value="野菜類">野菜類</option>
                                                <option value="果物類">果物類</option>
                                                <option value="乳製品">乳製品</option>
                                                <option value="調味料">調味料</option>
                                                <option value="その他">その他</option>
                                            </>
                                        )}
                                    </select>
                                )}
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        value={customData.servingSize}
                                        onChange={(e) => setCustomData({...customData, servingSize: parseFloat(e.target.value) || 0})}
                                        placeholder="1回分の量"
                                        className="flex-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                    />
                                    <select
                                        value={customData.servingUnit}
                                        onChange={(e) => setCustomData({...customData, servingUnit: e.target.value})}
                                        className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                    >
                                        <option value="g">g</option>
                                        <option value="mg">mg</option>
                                        <option value="ml">ml</option>
                                    </select>
                                </div>
                            </div>

                            {/* 基本栄養素 */}
                            <div className="border-t pt-4">
                                <p className="text-sm font-medium text-gray-700 mb-2">
                                    基本栄養素（{customData.servingSize}{customData.servingUnit}あたり）
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs text-gray-600">カロリー (kcal)</label>
                                        <input
                                            type="number"
                                            value={customData.calories || ''}
                                            onChange={(e) => setCustomData({...customData, calories: parseFloat(e.target.value) || 0})}
                                            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-600">タンパク質 (g)</label>
                                        <input
                                            type="number"
                                            value={customData.protein || ''}
                                            onChange={(e) => setCustomData({...customData, protein: parseFloat(e.target.value) || 0})}
                                            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-600">脂質 (g)</label>
                                        <input
                                            type="number"
                                            value={customData.fat || ''}
                                            onChange={(e) => setCustomData({...customData, fat: parseFloat(e.target.value) || 0})}
                                            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-600">炭水化物 (g)</label>
                                        <input
                                            type="number"
                                            value={customData.carbs || ''}
                                            onChange={(e) => setCustomData({...customData, carbs: parseFloat(e.target.value) || 0})}
                                            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ビタミン（折りたたみ） */}
                            <details className="border-t pt-4">
                                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-green-600 flex items-center gap-2">
                                    <Icon name="ChevronDown" size={14} />
                                    ビタミン（{customData.servingSize}{customData.servingUnit}あたり）
                                </summary>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    {[
                                        ['vitaminA', 'ビタミンA', 'μg'],
                                        ['vitaminB1', 'ビタミンB1', 'mg'],
                                        ['vitaminB2', 'ビタミンB2', 'mg'],
                                        ['vitaminB6', 'ビタミンB6', 'mg'],
                                        ['vitaminB12', 'ビタミンB12', 'μg'],
                                        ['vitaminC', 'ビタミンC', 'mg'],
                                        ['vitaminD', 'ビタミンD', 'μg'],
                                        ['vitaminE', 'ビタミンE', 'mg'],
                                        ['vitaminK', 'ビタミンK', 'μg'],
                                        ['niacin', 'ナイアシン', 'mg'],
                                        ['pantothenicAcid', 'パントテン酸', 'mg'],
                                        ['biotin', 'ビオチン', 'μg'],
                                        ['folicAcid', '葉酸', 'μg'],
                                    ].map(([key, label, unit]) => (
                                        <div key={key}>
                                            <label className="text-xs text-gray-600">{label} ({unit})</label>
                                            <input
                                                type="number"
                                                value={customData[key] || ''}
                                                onChange={(e) => setCustomData({...customData, [key]: parseFloat(e.target.value) || 0})}
                                                className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </details>

                            {/* ミネラル（折りたたみ） */}
                            <details className="border-t pt-4">
                                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-green-600 flex items-center gap-2">
                                    <Icon name="ChevronDown" size={14} />
                                    ミネラル（{customData.servingSize}{customData.servingUnit}あたり）
                                </summary>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    {[
                                        ['sodium', 'ナトリウム', 'mg'],
                                        ['potassium', 'カリウム', 'mg'],
                                        ['calcium', 'カルシウム', 'mg'],
                                        ['magnesium', 'マグネシウム', 'mg'],
                                        ['phosphorus', 'リン', 'mg'],
                                        ['iron', '鉄', 'mg'],
                                        ['zinc', '亜鉛', 'mg'],
                                        ['copper', '銅', 'mg'],
                                        ['manganese', 'マンガン', 'mg'],
                                        ['iodine', 'ヨウ素', 'μg'],
                                        ['selenium', 'セレン', 'μg'],
                                        ['chromium', 'クロム', 'μg'],
                                        ['molybdenum', 'モリブデン', 'μg'],
                                    ].map(([key, label, unit]) => (
                                        <div key={key}>
                                            <label className="text-xs text-gray-600">{label} ({unit})</label>
                                            <input
                                                type="number"
                                                value={customData[key] || ''}
                                                onChange={(e) => setCustomData({...customData, [key]: parseFloat(e.target.value) || 0})}
                                                className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </details>

                            {/* その他栄養素（折りたたみ） */}
                            <details className="border-t pt-4">
                                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-green-600 flex items-center gap-2">
                                    <Icon name="ChevronDown" size={14} />
                                    その他栄養素（クレアチン、食物繊維など）
                                </summary>
                                <div className="mt-2 space-y-2">
                                    {customData.otherNutrients.map((nutrient, idx) => (
                                        <div key={idx} className="flex gap-1">
                                            <input
                                                type="text"
                                                value={nutrient.name}
                                                onChange={(e) => {
                                                    const updated = [...customData.otherNutrients];
                                                    updated[idx].name = e.target.value;
                                                    setCustomData({...customData, otherNutrients: updated});
                                                }}
                                                placeholder="名前"
                                                className="flex-1 px-2 py-1 text-xs border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                                            />
                                            <input
                                                type="number"
                                                value={nutrient.amount}
                                                onChange={(e) => {
                                                    const updated = [...customData.otherNutrients];
                                                    updated[idx].amount = e.target.value;
                                                    setCustomData({...customData, otherNutrients: updated});
                                                }}
                                                placeholder="量"
                                                className="w-16 px-2 py-1 text-xs border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                                            />
                                            <input
                                                type="text"
                                                value={nutrient.unit}
                                                onChange={(e) => {
                                                    const updated = [...customData.otherNutrients];
                                                    updated[idx].unit = e.target.value;
                                                    setCustomData({...customData, otherNutrients: updated});
                                                }}
                                                placeholder="単位"
                                                className="w-12 px-1 py-1 text-xs border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                                            />
                                            <button
                                                onClick={() => {
                                                    const updated = customData.otherNutrients.filter((_, i) => i !== idx);
                                                    setCustomData({...customData, otherNutrients: updated});
                                                }}
                                                className="text-red-500 px-1 hover:bg-red-50 rounded"
                                            >
                                                <Icon name="X" size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => setCustomData({
                                            ...customData,
                                            otherNutrients: [...customData.otherNutrients, {name: '', amount: '', unit: ''}]
                                        })}
                                        className="w-full px-2 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-xs font-medium flex items-center justify-center gap-1"
                                    >
                                        <Icon name="Plus" size={14} />
                                        追加
                                    </button>
                                </div>
                            </details>

                            {/* 保存ボタン */}
                            <div className="flex gap-2 pt-4">
                                <button
                                    onClick={() => {
                                        if (!customData.name.trim()) {
                                            alert('アイテム名を入力してください');
                                            return;
                                        }

                                        // カスタムアイテムをaddedItemsに追加
                                        const newItem = {
                                            ...customData,
                                            id: Date.now(),
                                            amount: customData.servingSize,
                                            unit: customData.servingUnit,
                                            isCustom: true
                                        };

                                        setAddedItems([...addedItems, newItem]);

                                        // フォームをリセット
                                        setCustomData({
                                            name: '',
                                            itemType: 'food',
                                            category: '穀類',
                                            servingSize: 100,
                                            servingUnit: 'g',
                                            calories: 0,
                                            protein: 0,
                                            fat: 0,
                                            carbs: 0,
                                            vitaminA: 0, vitaminB1: 0, vitaminB2: 0, vitaminB6: 0, vitaminB12: 0,
                                            vitaminC: 0, vitaminD: 0, vitaminE: 0, vitaminK: 0,
                                            niacin: 0, pantothenicAcid: 0, biotin: 0, folicAcid: 0,
                                            sodium: 0, potassium: 0, calcium: 0, magnesium: 0, phosphorus: 0,
                                            iron: 0, zinc: 0, copper: 0, manganese: 0, iodine: 0, selenium: 0, chromium: 0, molybdenum: 0,
                                            otherNutrients: []
                                        });

                                        setShowCustomForm(false);
                                    }}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 font-bold shadow-md"
                                >
                                    追加
                                </button>
                                <button
                                    onClick={() => setShowCustomForm(false)}
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                                >
                                    キャンセル
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// グローバルに公開
window.AddMealModal = AddMealModal;

export default AddMealModal;
