import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

// ===== AddMealModal: ゴールベースの食事記録モーダル =====
// フロー: 食事名入力 → アイテム選択・追加 → 記録
//
// Props:
// - onClose: () => void - モーダルを閉じる
// - onAdd: (meal) => void - 食事を記録
// - onUpdate: (meal) => void - 食事を更新（編集モード時）
// - editingMeal: Object | null - 編集対象の食事データ
// - user: Object - ユーザー情報
// - userProfile: Object - ユーザープロフィール
// - unlockedFeatures: Array - 解放済み機能
// - usageDays: Number - 利用日数

const AddMealModal = ({
    onClose,
    onAdd,
    onUpdate,
    editingMeal = null,
    user,
    userProfile,
    unlockedFeatures = [],
    usageDays = 0
}) => {
    // ===== 編集モード判定 =====
    const isEditMode = !!editingMeal;

    // ===== State管理 =====
    const [mealName, setMealName] = useState(isEditMode ? editingMeal.name : '食事');
    const [isEditingMealName, setIsEditingMealName] = useState(false); // 食事名編集モード
    const [mealTemplates, setMealTemplates] = useState([]);
    const [addedItems, setAddedItems] = useState(isEditMode ? editingMeal.items || [] : []);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [showAIFoodRecognition, setShowAIFoodRecognition] = useState(false);
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);
    const [showCustomForm, setShowCustomForm] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false); // ヘルプモーダル

    // 検索モーダル用のstate
    const [searchTerm, setSearchTerm] = useState('');
    const [foodTab, setFoodTab] = useState('food'); // 'food', 'recipe', 'supplement'
    const [selectedCategory, setSelectedCategory] = useState('肉類'); // デフォルトで肉類を表示

    // 量調整UI用のstate
    const [selectedItemIndex, setSelectedItemIndex] = useState(null); // 選択中のアイテム
    const [adjustmentStep, setAdjustmentStep] = useState(10); // 増減ステップ（g単位のデフォルト）
    const [originalAmount, setOriginalAmount] = useState(null); // キャンセル用：元の量を保存

    // 確認モーダル
    const { showConfirm, ConfirmModalComponent } = window.useConfirmModal();

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

    // Icon, AIFoodRecognition はグローバルに公開されている前提
    const Icon = window.Icon;
    const AIFoodRecognition = window.AIFoodRecognition;

    // DataService を使用
    const DataService = window.DataService;

    // ===== テンプレート読み込み =====
    useEffect(() => {
        if (user) {
            if (!window.DataService) {
                console.error('[AddMealModal] DataService is not available on window object');
                console.log('[AddMealModal] Available window objects:', Object.keys(window).filter(k => k.includes('Service') || k.includes('Data')));
                setMealTemplates([]);
                return;
            }

            const loadTemplates = async () => {
                try {
                    const templates = await window.DataService.getMealTemplates(user.uid);
                    setMealTemplates(templates || []);
                } catch (error) {
                    console.error('テンプレート読み込みエラー:', error);
                    setMealTemplates([]);
                }
            };
            loadTemplates();
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

    // ===== テンプレートを読み込む（編集用） =====
    const loadTemplate = (template) => {
        setMealName(template.name);
        setAddedItems(JSON.parse(JSON.stringify(template.items))); // ディープコピー
    };

    // ===== テンプレートから直接記録 =====
    const addFromTemplate = (template) => {
        const items = JSON.parse(JSON.stringify(template.items)); // ディープコピー

        // 合計カロリー・PFCを計算
        const totalPFC = items.reduce((total, item) => {
            const isCountUnit = ['本', '個', '杯', '枚'].some(u => (item.unit || '').includes(u));
            const ratio = isCountUnit ? item.amount : item.amount / 100;
            return {
                calories: total.calories + (item.calories || 0) * ratio,
                protein: total.protein + (item.protein || 0) * ratio,
                fat: total.fat + (item.fat || 0) * ratio,
                carbs: total.carbs + (item.carbs || 0) * ratio,
            };
        }, { calories: 0, protein: 0, fat: 0, carbs: 0 });

        const meal = {
            id: Date.now(),
            name: template.name,
            items: items,
            time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
            calories: totalPFC.calories,
            protein: totalPFC.protein,
            fat: totalPFC.fat,
            carbs: totalPFC.carbs,
            totalCalories: totalPFC.calories,
            isTemplate: true, // テンプレートタグ
        };

        onAdd(meal);
    };

    // ===== テンプレート削除 =====
    const deleteTemplate = async (templateId) => {
        await DataService.deleteMealTemplate(user.uid, templateId);
        const templates = await DataService.getMealTemplates(user.uid);
        setMealTemplates(templates);
        toast.success('テンプレートを削除しました');
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
            toast('食材を追加してください');
            return;
        }

        // 合計カロリー・PFCを計算
        const totalPFC = calculateTotalPFC();

        const meal = {
            id: isEditMode ? editingMeal.id : Date.now(),
            name: mealName,
            items: addedItems,
            time: isEditMode ? editingMeal.time : new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
            calories: totalPFC.calories,
            protein: totalPFC.protein,
            fat: totalPFC.fat,
            carbs: totalPFC.carbs,
            totalCalories: totalPFC.calories,
        };

        // 編集モードの場合はonUpdate、新規追加の場合はonAddを呼ぶ
        if (isEditMode && onUpdate) {
            onUpdate(meal);
        } else if (onAdd) {
            onAdd(meal);
        }
    };

    // ===== テンプレートとして保存 =====
    const saveAsTemplate = async () => {
        if (addedItems.length === 0) {
            toast('食材を追加してください');
            return;
        }

        const templateName = prompt('テンプレート名を入力してください', mealName || '');
        if (!templateName || !templateName.trim()) {
            return;
        }

        const template = {
            id: Date.now().toString(), // 一意のIDを生成
            name: templateName.trim(),
            items: addedItems,
            createdAt: new Date().toISOString(),
        };

        try {
            if (!window.DataService) {
                console.error('[AddMealModal] DataService is not available on window object');
                console.log('[AddMealModal] Available window objects:', Object.keys(window).filter(k => k.includes('Service') || k.includes('Data')));
                toast.error('DataServiceが利用できません。ページを再読み込みしてください。');
                return;
            }

            // DataService経由でテンプレートを保存
            await window.DataService.saveMealTemplate(user.uid, template);

            // テンプレート一覧を再読み込み
            const templates = await window.DataService.getMealTemplates(user.uid);
            setMealTemplates(templates || []);
            toast.success('テンプレートを保存しました');
        } catch (error) {
            console.error('テンプレート保存エラー:', error);
            toast.error('テンプレートの保存に失敗しました: ' + error.message);
        }
    };

    // ===== アイテム選択画面（メイン画面） =====
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
                <div className="bg-white border-b px-4 py-2 flex-shrink-0">
                    <div className="flex justify-between items-center">
                        {/* 食事名（編集可能） */}
                        <div className="flex items-center gap-2 flex-1">
                            {isEditingMealName ? (
                                <input
                                    type="text"
                                    value={mealName}
                                    onChange={(e) => setMealName(e.target.value)}
                                    onBlur={() => {
                                        if (!mealName.trim()) {
                                            setMealName('食事');
                                        }
                                        setIsEditingMealName(false);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            if (!mealName.trim()) {
                                                setMealName('食事');
                                            }
                                            setIsEditingMealName(false);
                                        }
                                    }}
                                    className="text-lg font-bold border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500"
                                    autoFocus
                                />
                            ) : (
                                <>
                                    <h3 className="text-lg font-bold">{mealName}</h3>
                                    <button
                                        onClick={() => setIsEditingMealName(true)}
                                        className="w-10 h-10 rounded-lg bg-white shadow-md flex items-center justify-center text-blue-600 hover:bg-blue-50 transition border-2 border-blue-500"
                                    >
                                        <Icon name="Edit" size={18} />
                                    </button>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
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

                {/* この食事の合計 + テンプレート保存ボタン */}
                {addedItems.length > 0 && (
                    <div className="px-4 pt-3 pb-2">
                        <div className="flex gap-2">
                            {/* 左側：この食事の合計 */}
                            <div className="flex-1 bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-200">
                                <div className="text-xs font-medium text-gray-600 mb-1">この食事の合計</div>
                                <div className="flex items-center justify-between">
                                    <div className="text-lg font-bold" style={{color: '#60a5fa'}}>
                                        {Math.round(totalPFC.calories)}kcal
                                    </div>
                                    <div className="flex items-center gap-1 text-xs">
                                        <span className="text-red-500 font-semibold">P {Math.round(totalPFC.protein)}g</span>
                                        <span className="text-gray-400">|</span>
                                        <span className="text-yellow-500 font-semibold">F {Math.round(totalPFC.fat)}g</span>
                                        <span className="text-gray-400">|</span>
                                        <span className="text-green-500 font-semibold">C {Math.round(totalPFC.carbs)}g</span>
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
                                        className={`bg-white p-3 rounded-lg border-2 transition ${
                                            isSelected ? 'border-blue-500 shadow-md' : 'border-gray-200'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div
                                                className="flex-1 cursor-pointer"
                                                onClick={() => {
                                                    setSelectedItemIndex(index);
                                                    setOriginalAmount(item.amount); // 元の量を保存
                                                }}
                                            >
                                                <div className="font-semibold text-gray-900">{item.name}</div>
                                                <div className="text-sm text-gray-600 mt-1">
                                                    {item.amount}{item.unit || 'g'}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 ml-2">
                                                {/* 編集ボタン（量調整を開く） */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedItemIndex(index);
                                                        setOriginalAmount(item.amount);
                                                    }}
                                                    className="w-10 h-10 rounded-lg bg-white shadow-md flex items-center justify-center text-blue-600 hover:bg-blue-50 transition border-2 border-blue-500"
                                                    title="編集"
                                                >
                                                    <Icon name="Edit" size={18} />
                                                </button>
                                                {/* 削除ボタン */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeItem(index);
                                                    }}
                                                    className="w-10 h-10 rounded-lg bg-white shadow-md flex items-center justify-center text-red-600 hover:bg-red-50 transition border-2 border-red-500"
                                                    title="削除"
                                                >
                                                    <Icon name="Trash2" size={18} />
                                                </button>
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

                {/* 量調整UI（選択中のアイテムがある場合） - 固定位置 */}
                {selectedItemIndex !== null && addedItems[selectedItemIndex] && (() => {
                    const selectedItem = addedItems[selectedItemIndex];
                    const unit = selectedItem.unit || 'g';
                    const isCountUnit = ['個', '本', '杯', '枚'].some(u => unit.includes(u));
                    const stepOptions = isCountUnit ? [1, 2, 3, 5, 10] : [1, 5, 10, 50, 100];

                    return (
                        <div className="fixed left-0 right-0 bg-white border-t-2 border-gray-300 shadow-2xl p-4 z-[9998]" style={{bottom: '200px'}}>
                            <div className="max-w-md mx-auto">
                                <div className="text-sm text-gray-900 font-semibold mb-3 text-center">
                                    {selectedItem.name} の量を調整
                                    {selectedItem.servingSize && selectedItem.servingUnit && (
                                        <span className="text-blue-600 font-semibold ml-2 text-xs">
                                            ({unit.includes('本') || unit.includes('個') || unit.includes('杯') || unit.includes('枚') ?
                                                `1${unit} = ${selectedItem.servingSize}${selectedItem.servingUnit}` :
                                                ''})
                                        </span>
                                    )}
                                </div>

                                {/* 数値入力欄 */}
                                <div className="flex items-center justify-center gap-2 mb-3">
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
                                <div className="flex gap-1 mb-3">
                                    {stepOptions.map(step => (
                                        <button
                                            key={step}
                                            onClick={() => setAdjustmentStep(step)}
                                            className={`flex-1 py-2 text-sm rounded transition ${
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
                                <div className="grid grid-cols-4 gap-2 mb-3">
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

                                {/* キャンセル・更新ボタン */}
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => {
                                            // 元の量に復元
                                            if (originalAmount !== null) {
                                                updateItemAmount(selectedItemIndex, originalAmount);
                                            }
                                            setSelectedItemIndex(null);
                                            setOriginalAmount(null);
                                        }}
                                        className="py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                                    >
                                        キャンセル
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedItemIndex(null);
                                            setOriginalAmount(null);
                                        }}
                                        className="py-3 bg-[#4A9EFF] text-white rounded-lg font-bold hover:bg-[#3b8fef] transition shadow-md"
                                    >
                                        更新
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* フッター：アクションボタン */}
                <div className="border-t p-4 space-y-2 flex-shrink-0">
                    {/* 1行目：写真解析 */}
                    <button
                        onClick={() => setShowAIFoodRecognition(true)}
                        className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition shadow-md"
                    >
                        <Icon name="Camera" size={16} className="inline mr-1" />
                        写真解析
                    </button>

                    {/* 2行目：一覧から検索 */}
                    <button
                        onClick={() => setShowSearchModal(true)}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 rounded-lg font-semibold transition"
                    >
                        <Icon name="Search" size={16} className="inline mr-1" />
                        一覧から検索
                    </button>

                    {/* 3行目：カスタム作成 */}
                    <button
                        onClick={() => setShowCustomForm(true)}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 rounded-lg font-semibold transition"
                    >
                        <Icon name="Edit" size={16} className="inline mr-1" />
                        カスタム作成
                    </button>

                    {/* 4行目：テンプレート */}
                    <button
                        onClick={() => setShowTemplateSelector(true)}
                        className="w-full px-4 py-3 bg-purple-50 border-2 border-purple-400 text-purple-700 rounded-lg font-semibold hover:bg-purple-100 transition"
                    >
                        <Icon name="BookTemplate" size={16} className="inline mr-1" />
                        テンプレート
                    </button>

                    {/* 5行目：記録/更新 */}
                    <button
                        onClick={handleRecord}
                        disabled={addedItems.length === 0}
                        className={`w-full py-3 rounded-lg font-bold shadow-lg transition ${
                            addedItems.length === 0
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-[#4A9EFF] text-white hover:bg-[#3b8fef]'
                        }`}
                    >
                        {isEditMode ? '更新' : '記録'}
                    </button>
                </div>
            </div>

            {/* 検索モーダル */}
            {showSearchModal && (() => {

                // グローバルから食材データベースを取得
                const foodDB = window.foodDB || {};


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

                // 検索結果のフィルタリング
                const getFilteredItems = () => {
                    let items = [];
                    const db = foodDB;

                    // カスタムアイテムを取得
                    const customFoods = getCustomFoods();
                    const customItems = customFoods.filter(item => {
                        if (foodTab === 'food' && item.itemType === 'food') return true;
                        if (foodTab === 'recipe' && item.itemType === 'recipe') return true;
                        if (foodTab === 'supplement' && item.itemType === 'supplement') return true;
                        return false;
                    });

                    // 料理タブの場合は、カスタム料理のみを表示（foodDBからは取得しない）
                    if (foodTab === 'recipe') {
                        customItems.forEach(item => {
                            if (!searchTerm || item.name.includes(searchTerm)) {
                                items.push({
                                    ...item,
                                    isCustom: true
                                });
                            }
                        });
                        return items;
                    }

                    // タブに応じてカテゴリを決定（food, supplementのみ）
                    let targetCategory = selectedCategory;
                    if (foodTab === 'supplement') {
                        targetCategory = 'サプリメント';
                    } else if (!targetCategory || targetCategory === '') {
                        // デフォルトカテゴリ（foodタブで未選択の場合）
                        targetCategory = Object.keys(db).filter(cat => cat !== 'サプリメント')[0] || '肉類';
                    }


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


                    // カスタムアイテムを追加（food, supplementのみ）
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


                    if (isCountUnit) {
                        defaultAmount = 1;
                        // 単位から先頭の数字を削除（例: "1個" → "個", "本" → "本"）
                        defaultUnit = unitStr.replace(/^\d+/, '');
                    } else if (item.servingSize && item.servingSize < 100 && item.servingUnit === 'g') {
                        // servingSizeが100g未満の場合は、そのservingSizeをデフォルトにする（グルタミン、クレアチンなど）
                        defaultAmount = item.servingSize;
                    }


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
                    onClose={() => {
                        setShowAIFoodRecognition(false);
                        // AI食事認識は直接Firestoreに保存するため、親モーダルも閉じる
                        onClose();
                    }}
                    onFoodsRecognized={handleFoodsRecognized}
                    userId={user?.uid}
                    userProfile={userProfile}
                />
            )}

            {/* テンプレート選択モーダル */}
            {showTemplateSelector && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md max-h-[70vh] overflow-hidden flex flex-col">
                        {/* ヘッダー */}
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 flex justify-between items-center">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Icon name="BookMarked" size={20} />
                                テンプレートから選択
                            </h3>
                            <button onClick={() => setShowTemplateSelector(false)} className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full">
                                <Icon name="X" size={20} />
                            </button>
                        </div>

                        {/* テンプレート一覧 */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {mealTemplates.length === 0 ? (
                                <div className="text-center py-12">
                                    <Icon name="BookMarked" size={48} className="mx-auto mb-3 opacity-30 text-purple-600" />
                                    <p className="text-gray-900 font-semibold mb-2">まだテンプレートがありません</p>
                                    <p className="text-sm text-gray-600 px-4">
                                        食材を追加後に「保存」ボタンで保存するか、<br/>
                                        ダッシュボードのテンプレートボタンから作成できます
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {mealTemplates.map((template) => {
                                    const totalPFC = template.items.reduce((sum, item) => {
                                        const isCountUnit = ['本', '個', '杯', '枚'].some(u => (item.unit || '').includes(u));
                                        const ratio = isCountUnit ? item.amount : item.amount / 100;
                                        return {
                                            calories: sum.calories + (item.calories || 0) * ratio,
                                            protein: sum.protein + (item.protein || 0) * ratio,
                                            fat: sum.fat + (item.fat || 0) * ratio,
                                            carbs: sum.carbs + (item.carbs || 0) * ratio,
                                        };
                                    }, { calories: 0, protein: 0, fat: 0, carbs: 0 });

                                    return (
                                        <details key={template.id} className="bg-gray-50 border-2 border-gray-200 rounded-lg group">
                                            <summary className="p-3 cursor-pointer list-none">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="font-semibold text-gray-900">{template.name}</div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                loadTemplate(template);
                                                                setShowTemplateSelector(false);
                                                            }}
                                                            className="w-10 h-10 rounded-lg bg-white shadow-md flex items-center justify-center text-blue-600 hover:bg-blue-50 transition border-2 border-blue-500"
                                                            title="編集"
                                                        >
                                                            <Icon name="Edit" size={18} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                showConfirm('テンプレート削除の確認', `テンプレート「${template.name}」を削除しますか？`, () => {
                                                                    deleteTemplate(template.id);
                                                                });
                                                            }}
                                                            className="w-10 h-10 rounded-lg bg-white shadow-md flex items-center justify-center text-red-600 hover:bg-red-50 transition border-2 border-red-500"
                                                            title="削除"
                                                        >
                                                            <Icon name="Trash2" size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-gray-600 mb-2">
                                                    {template.items.length}品目
                                                </div>
                                                <div className="text-xs mb-3 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold" style={{color: '#60a5fa'}}>{Math.round(totalPFC.calories)}kcal</span>
                                                        <span className="text-gray-400">|</span>
                                                        <span className="text-red-500 font-semibold">P {Math.round(totalPFC.protein)}g</span>
                                                        <span className="text-gray-400">|</span>
                                                        <span className="text-yellow-500 font-semibold">F {Math.round(totalPFC.fat)}g</span>
                                                        <span className="text-gray-400">|</span>
                                                        <span className="text-green-500 font-semibold">C {Math.round(totalPFC.carbs)}g</span>
                                                    </div>
                                                    <Icon name="ChevronRight" size={16} className="text-gray-600 group-open:rotate-90 transition-transform" />
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        addFromTemplate(template);
                                                        setShowTemplateSelector(false);
                                                    }}
                                                    className="w-full px-4 py-2 bg-[#4A9EFF] text-white rounded-lg font-bold hover:bg-[#3b8fef] transition text-sm"
                                                >
                                                    記録
                                                </button>
                                            </summary>
                                            <div className="px-3 pb-3 border-t border-gray-300">
                                                <div className="text-xs font-medium text-gray-600 mt-2 mb-2">内訳を表示</div>
                                                <div className="space-y-2">
                                                    {template.items.map((item, idx) => {
                                                        const isCountUnit = ['本', '個', '杯', '枚'].some(u => (item.unit || '').includes(u));
                                                        const ratio = isCountUnit ? item.amount : item.amount / 100;
                                                        return (
                                                            <div key={idx} className="bg-white p-2 rounded text-xs border border-gray-200">
                                                                <div className="font-semibold">{item.name}</div>
                                                                <div className="text-gray-600 mt-1">{item.amount}{item.unit || 'g'}</div>
                                                                <div className="text-gray-500 mt-1 flex gap-2">
                                                                    <span style={{color: '#60a5fa'}}>{Math.round((item.calories || 0) * ratio)}kcal</span>
                                                                    <span className="text-red-500">P {Math.round((item.protein || 0) * ratio * 10) / 10}g</span>
                                                                    <span className="text-yellow-500">F {Math.round((item.fat || 0) * ratio * 10) / 10}g</span>
                                                                    <span className="text-green-500">C {Math.round((item.carbs || 0) * ratio * 10) / 10}g</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </details>
                                    );
                                })}
                                </div>
                            )}
                        </div>

                        {/* フッター */}
                        <div className="border-t p-4">
                            <button
                                onClick={() => setShowTemplateSelector(false)}
                                className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                            >
                                閉じる
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* カスタムアイテム作成モーダル */}
            {showCustomForm && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
                        {/* ヘッダー */}
                        <div className="sticky top-0 bg-[#4A9EFF] text-white p-4 rounded-t-2xl flex justify-between items-center z-10">
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
                            <div className="flex gap-2">
                                {customData.itemType === 'recipe' ? (
                                    <input
                                        type="text"
                                        value="料理"
                                        disabled
                                        className="flex-1 px-3 py-2 text-sm border rounded-lg bg-gray-100"
                                    />
                                ) : (
                                    <select
                                        value={customData.category}
                                        onChange={(e) => setCustomData({...customData, category: e.target.value})}
                                        className="flex-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
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
                                <input
                                    type="number"
                                    value={customData.servingSize}
                                    onChange={(e) => setCustomData({...customData, servingSize: parseFloat(e.target.value) || 0})}
                                    placeholder="100"
                                    className="w-20 px-2 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-center"
                                />
                                <select
                                    value={customData.servingUnit}
                                    onChange={(e) => setCustomData({...customData, servingUnit: e.target.value})}
                                    className="w-16 px-2 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                >
                                    <option value="g">g</option>
                                    <option value="mg">mg</option>
                                    <option value="ml">ml</option>
                                </select>
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
                                    onClick={() => setShowCustomForm(false)}
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                                >
                                    キャンセル
                                </button>
                                <button
                                    onClick={() => {
                                        if (!customData.name.trim()) {
                                            toast('アイテム名を入力してください');
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
                                    className="flex-1 px-4 py-3 bg-[#4A9EFF] text-white rounded-lg hover:bg-[#3b8fef] font-bold shadow-md"
                                >
                                    追加
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ヘルプモーダル */}
            {showHelpModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100000] p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl">
                        {/* ヘッダー */}
                        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between rounded-t-2xl">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Icon name="HelpCircle" size={24} className="text-[#4A9EFF]" />
                                食事記録の使い方
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
                                    <h4 className="font-bold text-gray-800">食事名を入力</h4>
                                </div>
                                <p className="text-sm text-gray-600 ml-10">
                                    例：朝食、昼食、夕食、間食など、わかりやすい名前を付けましょう。
                                </p>
                            </div>

                            {/* ステップ2 */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-[#4A9EFF] text-white flex items-center justify-center font-bold text-sm">
                                        2
                                    </div>
                                    <h4 className="font-bold text-gray-800">食材を追加</h4>
                                </div>
                                <div className="ml-10 space-y-2">
                                    <div className="flex items-start gap-2">
                                        <Icon name="Search" size={16} className="text-[#4A9EFF] mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">一覧から検索</p>
                                            <p className="text-xs text-gray-500">データベースから食材を検索して追加</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <Icon name="BookTemplate" size={16} className="text-purple-600 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">テンプレート</p>
                                            <p className="text-xs text-gray-500">よく食べる食事を保存したテンプレートを使用</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <Icon name="Plus" size={16} className="text-green-600 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">カスタム作成</p>
                                            <p className="text-xs text-gray-500">オリジナルの食材や料理を作成</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ステップ3 */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-[#4A9EFF] text-white flex items-center justify-center font-bold text-sm">
                                        3
                                    </div>
                                    <h4 className="font-bold text-gray-800">量を調整</h4>
                                </div>
                                <p className="text-sm text-gray-600 ml-10">
                                    追加した食材の量を調整します。±ボタンやタップで数値を変更できます。
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
                                    よく食べる食事は「テンプレートとして保存」にチェックを入れると、次回から簡単に記録できます。
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
                                    「記録」ボタンを押すと、食事が保存されます。{isEditMode ? '編集モードでは、既存の食事が更新されます。' : ''}
                                </p>
                            </div>

                            {/* Tips */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                                <div className="flex items-center gap-2 text-[#4A9EFF] font-bold">
                                    <Icon name="Lightbulb" size={18} />
                                    <span className="text-sm">便利な機能</span>
                                </div>
                                <ul className="text-xs text-gray-700 space-y-1 ml-6 list-disc">
                                    <li>検索モーダルでカテゴリを選択すると、素早く食材を見つけられます</li>
                                    <li>食材カードをタップすると、栄養情報の詳細を確認できます</li>
                                    <li>テンプレートから記録した食事には、紫のタグが表示されます</li>
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

            {/* 確認モーダル */}
            <ConfirmModalComponent />
        </div>
    );
};

// グローバルに公開
window.AddMealModal = AddMealModal;

export default AddMealModal;
