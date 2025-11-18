import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

// 個数単位の定義（全箇所で統一使用）
const COUNT_UNITS = ['本', '個', '杯', '枚', '錠', '包', '粒'];

// ===== AddMealModal: ゴールベースの食事記録モーダル =====
// フロー: 食事名入力 → アイテム選択・追加 → 記録
//
// Props:
// - onClose: () => void - モーダルを閉じる
// - onAdd: (meal) => void - 食事を記録
// - onUpdate: (meal) => void - 食事を更新（編集モード時）
// - editingMeal: Object | null - 編集対象の食事データ
// - selectedDate: String - 選択中の日付 (YYYY-MM-DD)
// - user: Object - ユーザー情報
// - userProfile: Object - ユーザープロフィール
// - unlockedFeatures: Array - 解放済み機能
// - usageDays: Number - 利用日数

const AddMealModal = ({
    onClose,
    onAdd,
    onUpdate,
    editingMeal = null,
    selectedDate,
    user,
    userProfile,
    unlockedFeatures = [],
    usageDays = 0,
    initialTab = 'food' // 初期タブ: 'food', 'recipe', 'supplement'
}) => {
    // Props確認（デバッグ用）
    

    // ===== 編集モード判定 =====
    const isEditMode = !!editingMeal;

    // ===== State管理 =====
    const [mealName, setMealName] = useState(isEditMode ? editingMeal.name : '食事');
    const [isEditingMealName, setIsEditingMealName] = useState(false); // 食事名編集モード
    const [isPostWorkout, setIsPostWorkout] = useState(isEditMode ? editingMeal.isPostWorkout || false : false); // 運動後チェック
    const [mealTemplates, setMealTemplates] = useState([]);
    const [addedItems, setAddedItems] = useState(isEditMode ? editingMeal.items || [] : []);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [showAIFoodRecognition, setShowAIFoodRecognition] = useState(false);
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);
    const [showTemplateInfoModal, setShowTemplateInfoModal] = useState(false); // テンプレート仕様説明モーダル
    const [showCustomForm, setShowCustomForm] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false); // ヘルプモーダル
    const [showCustomGuide, setShowCustomGuide] = useState(false); // カスタム作成ガイドモーダル（包括的）
    const [showCustomHelp, setShowCustomHelp] = useState(false); // 保存方法ヘルプモーダル（簡易）
    const [customSaveMethod, setCustomSaveMethod] = useState('database'); // 'database' or 'list'

    // 検索モーダル用のstate
    const [searchTerm, setSearchTerm] = useState('');
    const [foodTab, setFoodTab] = useState(initialTab); // 初期タブを反映
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
        category: 'カスタム', // 全てカスタムカテゴリに統一
        servingSize: '',
        servingUnit: 'g',
        calories: '',
        protein: '',
        fat: '',
        carbs: '',
        // 品質指標
        diaas: '',
        gi: '',
        // 脂肪酸
        saturatedFat: '',
        monounsaturatedFat: '',
        polyunsaturatedFat: '',
        mediumChainFat: '',
        // 糖質・食物繊維
        sugar: '',
        fiber: '',
        solubleFiber: '',
        insolubleFiber: '',
        // ビタミン
        vitaminA: '', vitaminB1: '', vitaminB2: '', vitaminB6: '', vitaminB12: '',
        vitaminC: '', vitaminD: '', vitaminE: '', vitaminK: '',
        niacin: '', pantothenicAcid: '', biotin: '', folicAcid: '',
        // ミネラル
        sodium: '', potassium: '', calcium: '', magnesium: '', phosphorus: '',
        iron: '', zinc: '', copper: '', manganese: '', iodine: '', selenium: '', chromium: '', molybdenum: '',
        // その他
        otherNutrients: []
    });

    // Icon, AIFoodRecognition はグローバルに公開されている前提
    const Icon = window.Icon;
    const AIFoodRecognition = window.AIFoodRecognition;

    // DataService を使用
    const DataService = window.DataService;

    // Firestoreから読み込んだカスタムアイテム
    const [customFoods, setCustomFoods] = useState([]);

    // 非表示設定
    const [hiddenStandardItems, setHiddenStandardItems] = useState([]);
    const [hiddenCategories, setHiddenCategories] = useState([]);

    // ===== 非表示設定をFirestoreから読み込み =====
    useEffect(() => {
        const loadHiddenSettings = async () => {
            const currentUser = firebase.auth().currentUser;
            if (!currentUser || !currentUser.uid) return;

            try {
                const itemsDoc = await firebase.firestore()
                    .collection('users')
                    .doc(currentUser.uid)
                    .collection('settings')
                    .doc('hiddenStandardItems')
                    .get();

                if (itemsDoc.exists) {
                    setHiddenStandardItems(itemsDoc.data().items || []);
                }

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
                console.error('[AddMealModal] Failed to load hidden settings:', error);
            }
        };

        loadHiddenSettings();
    }, []);

    // ===== customFoodsをFirestoreから読み込み =====
    useEffect(() => {
        const loadCustomFoods = async () => {
            const currentUser = firebase.auth().currentUser;
            if (!currentUser || !currentUser.uid) return;

            try {
                const customFoodsSnapshot = await firebase.firestore()
                    .collection('users')
                    .doc(currentUser.uid)
                    .collection('customFoods')
                    .get();

                const foods = customFoodsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                setCustomFoods(foods);
            } catch (error) {
                console.error('[AddMealModal] customFoods読み込みエラー:', error);
            }
        };

        const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                loadCustomFoods();
            } else {
                setCustomFoods([]);
            }
        });

        return () => {
            unsubscribe();
        };
    }, []);

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
                    console.log("[19_add_meal_modal] テンプレートデータ（isTrialCreated確認用）:", templates?.map(t => ({id: t.id, name: t.name, isTrialCreated: t.isTrialCreated})));
                    
                    setMealTemplates(templates || []);
                } catch (error) {
                    console.error('テンプレート読み込みエラー:', error);
                    setMealTemplates([]);
                }
            };
            loadTemplates();
        }
    }, [user]);

    // ===== 編集モード時：_baseデータを再構築 =====
    useEffect(() => {
        if (isEditMode && editingMeal && editingMeal.items) {
            const foodDB = window.foodDB || {};
            const reconstructedItems = editingMeal.items.map((item) => {
                // _baseがない場合、またはvitaminCが0の場合（ratio適用済みの可能性）はfoodDBから再取得
                const needsReconstruction = !item._base ||
                                          !item._base.vitamins ||
                                          !item._base.minerals ||
                                          (item._base.vitamins.vitaminC === 0 && item.vitamins?.vitaminC > 0);

                if (!needsReconstruction) {
                    return item;
                }

                // foodDBから再取得（カテゴリをまたいで検索）
                let dbItem = null;
                for (const category of Object.keys(foodDB)) {
                    if (foodDB[category][item.name]) {
                        dbItem = foodDB[category][item.name];
                        break;
                    }
                }

                if (!dbItem) {
                    // DBに見つからない場合は現在の値から逆算して100gベースを推定
                    const isCountUnit = COUNT_UNITS.some(u => (item.unit || '').includes(u));
                    const currentRatio = isCountUnit ? item.amount : item.amount / 100;

                    const baseVitamins = {};
                    const baseMinerals = {};

                    if (item.vitamins && currentRatio > 0) {
                        Object.keys(item.vitamins).forEach(key => {
                            baseVitamins[key] = (item.vitamins[key] || 0) / currentRatio;
                        });
                    }

                    if (item.minerals && currentRatio > 0) {
                        Object.keys(item.minerals).forEach(key => {
                            baseMinerals[key] = (item.minerals[key] || 0) / currentRatio;
                        });
                    }

                    return {
                        ...item,
                        _base: {
                            vitamins: baseVitamins,
                            minerals: baseMinerals
                        }
                    };
                }

                // DBから100gあたりのデータを取得
                const vitaminsFromDB = {
                    vitaminA: dbItem.vitaminA || 0,
                    vitaminB1: dbItem.vitaminB1 || 0,
                    vitaminB2: dbItem.vitaminB2 || 0,
                    vitaminB6: dbItem.vitaminB6 || 0,
                    vitaminB12: dbItem.vitaminB12 || 0,
                    vitaminC: dbItem.vitaminC || 0,
                    vitaminD: dbItem.vitaminD || 0,
                    vitaminE: dbItem.vitaminE || 0,
                    vitaminK: dbItem.vitaminK || 0,
                    niacin: dbItem.niacin || 0,
                    pantothenicAcid: dbItem.pantothenicAcid || 0,
                    biotin: dbItem.biotin || 0,
                    folicAcid: dbItem.folicAcid || 0
                };

                const mineralsFromDB = {
                    sodium: dbItem.sodium || 0,
                    potassium: dbItem.potassium || 0,
                    calcium: dbItem.calcium || 0,
                    magnesium: dbItem.magnesium || 0,
                    phosphorus: dbItem.phosphorus || 0,
                    iron: dbItem.iron || 0,
                    zinc: dbItem.zinc || 0,
                    copper: dbItem.copper || 0,
                    manganese: dbItem.manganese || 0,
                    iodine: dbItem.iodine || 0,
                    selenium: dbItem.selenium || 0,
                    chromium: dbItem.chromium || 0,
                    molybdenum: dbItem.molybdenum || 0
                };

                return {
                    ...item,
                    _base: {
                        vitamins: vitaminsFromDB,
                        minerals: mineralsFromDB
                    }
                };
            });

            setAddedItems(reconstructedItems);
        }
    }, [isEditMode, editingMeal]);

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
            // 個数単位（本、個、杯、枚、錠）の場合はそのまま、g/ml単位の場合は100で割る
            const isCountUnit = COUNT_UNITS.some(u => (item.unit || '').includes(u));
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
        // テンプレートアイテムに_baseがない場合は作成（下位互換性）
        const items = JSON.parse(JSON.stringify(template.items)).map(item => {
            if (!item._base && (item.vitamins || item.minerals)) {
                return {
                    ...item,
                    _base: {
                        vitamins: item.vitamins || {},
                        minerals: item.minerals || {}
                    }
                };
            }
            return item;
        });
        setAddedItems(items);
    };

    // ===== テンプレートから直接記録 =====
    const addFromTemplate = (template) => {
        // テンプレートアイテムに_baseがない場合は作成（下位互換性）
        const items = JSON.parse(JSON.stringify(template.items)).map(item => {
            if (!item._base && (item.vitamins || item.minerals)) {
                return {
                    ...item,
                    _base: {
                        vitamins: item.vitamins || {},
                        minerals: item.minerals || {}
                    }
                };
            }
            return item;
        }); // ディープコピー

        // 合計カロリー・PFCを計算
        const totalPFC = items.reduce((total, item) => {
            const isCountUnit = COUNT_UNITS.some(u => (item.unit || '').includes(u));
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
            calories: Math.round(totalPFC.calories),
            protein: parseFloat(totalPFC.protein.toFixed(1)),
            fat: parseFloat(totalPFC.fat.toFixed(1)),
            carbs: parseFloat(totalPFC.carbs.toFixed(1)),
            totalCalories: Math.round(totalPFC.calories),
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
        const item = updatedItems[index];

        // 個数単位判定
        const isCountUnit = COUNT_UNITS.some(u => (item.unit || '').includes(u));
        const newRatio = isCountUnit ? newAmount : newAmount / 100;

        console.log(`[updateItemAmount] ${item.name}: amount ${item.amount} → ${newAmount}`);
        console.log(`[updateItemAmount] _base存在:`, !!item._base);
        console.log(`[updateItemAmount] _base.vitamins.vitaminC:`, item._base?.vitamins?.vitaminC);
        console.log(`[updateItemAmount] newRatio:`, newRatio);

        // ビタミン・ミネラルを再計算（_baseから）
        const vitamins = {};
        const minerals = {};

        if (item._base?.vitamins) {
            Object.keys(item._base.vitamins).forEach(key => {
                vitamins[key] = parseFloat(((item._base.vitamins[key] || 0) * newRatio).toFixed(2));
            });
        }

        if (item._base?.minerals) {
            Object.keys(item._base.minerals).forEach(key => {
                minerals[key] = parseFloat(((item._base.minerals[key] || 0) * newRatio).toFixed(2));
            });
        }

        console.log(`[updateItemAmount] 計算後 vitaminC:`, vitamins.vitaminC);

        updatedItems[index] = {
            ...item,
            amount: Math.max(0, newAmount), // 0未満にならないように
            vitamins: vitamins,
            minerals: minerals
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
            calories: Math.round(totalPFC.calories),
            protein: parseFloat(totalPFC.protein.toFixed(1)),
            fat: parseFloat(totalPFC.fat.toFixed(1)),
            carbs: parseFloat(totalPFC.carbs.toFixed(1)),
            totalCalories: Math.round(totalPFC.calories),
            isPostWorkout: isPostWorkout, // 運動後フラグを保存
            date: selectedDate, // 記録対象の日付を明示的に保存
            // 編集モード時、元のタグ情報を引き継ぐ
            ...(isEditMode && {
                isPredicted: editingMeal.isPredicted,
                isTemplate: editingMeal.isTemplate,
                isRoutine: editingMeal.isRoutine,
            })
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

        // 無料会員の枠制限チェック（7日目以降）
        const isFreeUser = userProfile?.subscriptionStatus !== 'active' && usageDays >= 7;
        if (isFreeUser && mealTemplates.length >= 1) {
            toast.error('無料会員は食事テンプレートを1枠まで作成できます。既存のテンプレートを削除してから新しいテンプレートを作成するか、Premium会員にアップグレードしてください。');
            return;
        }

        const templateName = prompt('テンプレート名を入力してください', mealName || '');
        if (!templateName || !templateName.trim()) {
            return;
        }

        // トライアル期間中（0-6日目）かどうかを判定
        const isTrialPeriod = usageDays < 7;
        console.log("[19_add_meal_modal] テンプレート保存:", {usageDays, isTrialPeriod, isFreeUser, templatesCount: mealTemplates.length});

        // undefinedを再帰的に除去する関数
        const removeUndefined = (obj) => {
            if (Array.isArray(obj)) {
                return obj.map(item => removeUndefined(item));
            } else if (obj !== null && typeof obj === 'object') {
                const cleaned = {};
                Object.keys(obj).forEach(key => {
                    if (obj[key] !== undefined) {
                        cleaned[key] = removeUndefined(obj[key]);
                    }
                });
                return cleaned;
            }
            return obj;
        };

        // addedItems配列全体からundefinedを除去
        const cleanedItems = removeUndefined(addedItems);

        const template = {
            id: Date.now().toString(), // 一意のIDを生成
            name: templateName.trim(),
            items: cleanedItems,
            createdAt: new Date().toISOString(),
            isTrialCreated: isTrialPeriod, // トライアル期間中に作成されたかを記録
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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center p-4" onClick={(e) => {
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
                        <div className="flex-1 min-w-0 mr-2">
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
                                    className="text-lg font-bold border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500 w-full"
                                    autoFocus
                                />
                            ) : (
                                <h3 className="text-lg font-bold truncate">{mealName}</h3>
                            )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {/* 編集ボタン */}
                            {!isEditingMealName && (
                                <button
                                    onClick={() => setIsEditingMealName(true)}
                                    className="min-w-[44px] min-h-[44px] rounded-lg bg-white shadow-md flex items-center justify-center text-[#4A9EFF] hover:bg-blue-50 transition border-2 border-[#4A9EFF]"
                                    title="編集"
                                >
                                    <Icon name="Edit" size={18} />
                                </button>
                            )}
                            {/* 運動後チェックボックス */}
                            <label className="flex items-center gap-1.5 cursor-pointer px-2 py-1 hover:bg-gray-50 rounded-lg transition">
                                <input
                                    type="checkbox"
                                    checked={isPostWorkout}
                                    onChange={(e) => setIsPostWorkout(e.target.checked)}
                                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 cursor-pointer"
                                />
                                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">運動後</span>
                            </label>
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
                                    <div className="text-lg font-bold text-blue-600">
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
                        <div className="text-center py-12 text-gray-600">
                            <Icon name="Plus" size={48} className="mx-auto mb-3 opacity-30" />
                            <p>食材を追加してください</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {addedItems.map((item, index) => {
                                // 個数単位（本、個、杯、枚）の場合はそのまま、g/ml単位の場合は100で割る
                                const isCountUnit = COUNT_UNITS.some(u => (item.unit || '').includes(u));
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
                                                <div className="font-semibold text-gray-800">{item.name}</div>
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
                                                    className="min-w-[44px] min-h-[44px] rounded-lg bg-white shadow-md flex items-center justify-center text-[#4A9EFF] hover:bg-blue-50 transition border-2 border-[#4A9EFF]"
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
                                                    className="min-w-[44px] min-h-[44px] rounded-lg bg-white shadow-md flex items-center justify-center text-red-600 hover:bg-red-50 transition border-2 border-red-500"
                                                    title="削除"
                                                >
                                                    <Icon name="Trash2" size={18} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                                            <div className="text-sm font-bold text-blue-600">
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
                    const isCountUnit = COUNT_UNITS.some(u => unit.includes(u));
                    const stepOptions = isCountUnit ? [1, 2, 3, 5, 10] : [1, 5, 10, 50, 100];

                    return (
                        <div className="fixed left-0 right-0 bg-white border-t-2 border-gray-300 shadow-2xl p-4 z-[9998]" style={{bottom: '200px'}}>
                            <div className="max-w-md mx-auto">
                                <div className="text-sm text-gray-800 font-semibold mb-3 text-center">
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
                                    <span className="text-lg text-gray-600 font-bold">{unit}</span>
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
                                                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
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
                                        className="py-3 bg-gray-200 text-gray-600 rounded-lg font-semibold hover:bg-gray-300 transition"
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
                    {/* 1行目：写真解析（Premium制限あり） */}
                    {(() => {
                        const isPremium = userProfile?.subscriptionStatus === 'active';
                        const isTrial = usageDays < 7;
                        const hasAccess = isPremium || isTrial;

                        if (!hasAccess) {
                            // Premium専用ロック表示
                            return (
                                <div className="w-full p-3 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Icon name="Lock" size={18} className="text-amber-600" />
                                            <span className="font-semibold text-amber-900 text-sm">AI写真解析（Premium専用）</span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                toast('Premium会員になると、写真から自動で食事を記録できます', { icon: '📸', duration: 3000 });
                                            }}
                                            className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-md hover:from-amber-600 hover:to-orange-600 transition text-xs font-bold"
                                        >
                                            Premium会員になる
                                        </button>
                                    </div>
                                </div>
                            );
                        }

                        // アクセス権限あり：通常の写真解析ボタン
                        return (
                            <button
                                onClick={() => setShowAIFoodRecognition(true)}
                                className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition shadow-md"
                            >
                                <Icon name="Camera" size={16} className="inline mr-1" />
                                写真解析
                            </button>
                        );
                    })()}

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
                        <Icon name="PlusCircle" size={16} className="inline mr-1" />
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
                                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
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


                // カテゴリリスト（サプリメントを除く）+ カスタムカテゴリを追加
                // 非表示カテゴリを除外
                const categories = [...Object.keys(foodDB).filter(cat => cat !== 'サプリメント' && !hiddenCategories.includes(cat)), 'カスタム'];

                // 検索結果のフィルタリング
                const getFilteredItems = () => {
                    let items = [];
                    const db = foodDB;

                    // カスタムアイテムを取得（Firestoreから読み込んだcustomFoods stateを使用）
                    // itemTypeが未設定の古いデータはデフォルトで'food'として扱う
                    const customItems = customFoods.filter(item => {
                        if (foodTab === 'food' && (!item.itemType || item.itemType === 'food')) return true;
                        if (foodTab === 'recipe' && item.itemType === 'recipe') return true;
                        if (foodTab === 'supplement' && item.itemType === 'supplement') return true;
                        return false;
                    });

                    // 料理タブの場合は、カスタム料理のみを表示（foodDBからは取得しない）
                    if (foodTab === 'recipe') {
                        customItems.forEach(item => {
                            // 非表示設定されているアイテムをスキップ
                            if (item.hidden) return;

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
                        // サプリタブで「カスタム」が選択されている場合はそのまま使用
                        if (selectedCategory !== 'カスタム') {
                            targetCategory = 'サプリメント';
                        }
                    } else if (!targetCategory || targetCategory === '') {
                        // デフォルトカテゴリ（foodタブで未選択の場合）
                        targetCategory = Object.keys(db).filter(cat => cat !== 'サプリメント')[0] || '肉類';
                    }

                    // 「カスタム」カテゴリが選択された場合はカスタムアイテムのみを表示
                    if (targetCategory === 'カスタム') {
                        customItems.forEach(item => {
                            // 非表示設定されているアイテムをスキップ
                            if (item.hidden) return;

                            if (!searchTerm || item.name.includes(searchTerm)) {
                                items.push({
                                    ...item,
                                    isCustom: true
                                });
                            }
                        });
                    } else {
                        // 通常のカテゴリの場合：データベースアイテムとカスタムアイテムの両方を表示
                        if (db && targetCategory && db[targetCategory]) {
                            Object.keys(db[targetCategory]).forEach(name => {
                                const itemData = db[targetCategory][name];

                                // 非表示アイテムをスキップ
                                if (hiddenStandardItems.includes(name)) {
                                    return;
                                }

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

                        // カスタムアイテムを追加（カテゴリが一致するもののみ）
                        customItems.forEach(item => {
                            // 非表示設定されているアイテムをスキップ
                            if (item.hidden) return;

                            const itemCategory = item.category || '穀類';
                            // 選択中のカテゴリと一致するか、またはサプリメントタブの場合はサブカテゴリをチェック
                            const categoryMatches = foodTab === 'supplement'
                                ? itemCategory === selectedCategory
                                : itemCategory === targetCategory;

                            if (categoryMatches && (!searchTerm || item.name.includes(searchTerm))) {
                                items.push({
                                    ...item,
                                    isCustom: true
                                });
                            }
                        });
                    }

                    return items;
                };

                const filteredItems = getFilteredItems();

                // アイテムを選択して追加
                const handleSelectItem = (item) => {
                    // データベースの個別キーをvitamins/mineralsオブジェクトに変換（完全形キー名を使用）
                    const vitaminsFromDB = {
                        vitaminA: item.vitaminA || 0,
                        vitaminB1: item.vitaminB1 || 0,
                        vitaminB2: item.vitaminB2 || 0,
                        vitaminB6: item.vitaminB6 || 0,
                        vitaminB12: item.vitaminB12 || 0,
                        vitaminC: item.vitaminC || 0,
                        vitaminD: item.vitaminD || 0,
                        vitaminE: item.vitaminE || 0,
                        vitaminK: item.vitaminK || 0,
                        niacin: item.niacin || 0,
                        pantothenicAcid: item.pantothenicAcid || 0,
                        biotin: item.biotin || 0,
                        folicAcid: item.folicAcid || 0
                    };

                    const mineralsFromDB = {
                        sodium: item.sodium || 0,
                        potassium: item.potassium || 0,
                        calcium: item.calcium || 0,
                        magnesium: item.magnesium || 0,
                        phosphorus: item.phosphorus || 0,
                        iron: item.iron || 0,
                        zinc: item.zinc || 0,
                        copper: item.copper || 0,
                        manganese: item.manganese || 0,
                        iodine: item.iodine || 0,
                        selenium: item.selenium || 0,
                        chromium: item.chromium || 0,
                        molybdenum: item.molybdenum || 0
                    };

                    // itemにvitamins/mineralsがない場合はDBから変換したものを使用
                    const itemWithNutrients = {
                        ...item,
                        vitamins: item.vitamins || vitaminsFromDB,
                        minerals: item.minerals || mineralsFromDB
                    };


                    // デフォルトの量と単位を決定
                    let defaultAmount = 100;
                    let defaultUnit = itemWithNutrients.unit || 'g';

                    // 個数単位（個、本、杯、枚、錠など）の場合
                    const unitStr = String(itemWithNutrients.unit || '');
                    const isCountUnit = unitStr.includes('個') || unitStr.includes('本') || unitStr.includes('杯') || unitStr.includes('枚') || unitStr.includes('錠');


                    if (isCountUnit) {
                        defaultAmount = 1;
                        // 単位から先頭の数字を削除（例: "1個" → "個", "本" → "本"）
                        defaultUnit = unitStr.replace(/^\d+/, '');
                    } else if (itemWithNutrients.servingSize && itemWithNutrients.servingSize < 100 && itemWithNutrients.servingUnit === 'g') {
                        // servingSizeが100g未満の場合は、そのservingSizeをデフォルトにする（グルタミン、クレアチンなど）
                        defaultAmount = itemWithNutrients.servingSize;
                    }

                    // 実際の量に応じて栄養素をスケーリング
                    const ratio = isCountUnit ? defaultAmount : defaultAmount / 100;

                    // ビタミン・ミネラルの実量換算
                    const vitamins = {};
                    const minerals = {};

                    if (itemWithNutrients.vitamins) {
                        Object.keys(itemWithNutrients.vitamins).forEach(key => {
                            vitamins[key] = parseFloat(((itemWithNutrients.vitamins[key] || 0) * ratio).toFixed(2));
                        });
                    }

                    if (itemWithNutrients.minerals) {
                        Object.keys(itemWithNutrients.minerals).forEach(key => {
                            minerals[key] = parseFloat(((itemWithNutrients.minerals[key] || 0) * ratio).toFixed(2));
                        });
                    }

                    const newItem = {
                        id: Date.now(),
                        name: itemWithNutrients.name,
                        amount: defaultAmount,
                        unit: defaultUnit,
                        calories: itemWithNutrients.calories || 0,  // 100g base (ratio applied during display)
                        protein: itemWithNutrients.protein || 0,     // 100g base (ratio applied during display)
                        fat: itemWithNutrients.fat || 0,            // 100g base (ratio applied during display)
                        carbs: itemWithNutrients.carbs || 0,         // 100g base (ratio applied during display)
                        servingSize: itemWithNutrients.servingSize || null,
                        servingUnit: itemWithNutrients.servingUnit || null,

                        // 糖質・食物繊維・脂肪酸（SCALED to actual amount - ビタミン・ミネラルと同じ）
                        sugar: parseFloat(((itemWithNutrients.sugar || 0) * ratio).toFixed(2)),
                        fiber: parseFloat(((itemWithNutrients.fiber || 0) * ratio).toFixed(2)),
                        solubleFiber: parseFloat(((itemWithNutrients.solubleFiber || 0) * ratio).toFixed(2)),
                        insolubleFiber: parseFloat(((itemWithNutrients.insolubleFiber || 0) * ratio).toFixed(2)),
                        saturatedFat: parseFloat(((itemWithNutrients.saturatedFat || 0) * ratio).toFixed(2)),
                        mediumChainFat: parseFloat(((itemWithNutrients.mediumChainFat || 0) * ratio).toFixed(2)),
                        monounsaturatedFat: parseFloat(((itemWithNutrients.monounsaturatedFat || 0) * ratio).toFixed(2)),
                        polyunsaturatedFat: parseFloat(((itemWithNutrients.polyunsaturatedFat || 0) * ratio).toFixed(2)),

                        // 品質指標（100g基準値 - ratio不要）
                        diaas: itemWithNutrients.diaas || null,
                        gi: itemWithNutrients.gi || null,

                        vitamins: vitamins,  // ← SCALED to actual amount
                        minerals: minerals,  // ← SCALED to actual amount
                        isCustom: itemWithNutrients.isCustom || false,
                        _base: {  // 100g base values for recalculation
                            vitamins: itemWithNutrients.vitamins || {},
                            minerals: itemWithNutrients.minerals || {}
                        }
                    };

                    setAddedItems([...addedItems, newItem]);
                    setSearchTerm(''); // 検索語クリア
                };

                return (
                    <div className="fixed inset-0 bg-black bg-opacity-60 z-[10001] flex items-center justify-center p-4">
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
                                    className="w-full px-4 py-2 rounded-lg text-gray-800 focus:ring-2 focus:ring-white focus:outline-none"
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
                                                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
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
                                // サプリメントのサブカテゴリ一覧を取得 + カスタムカテゴリを追加（食材タブと同じロジック）
                                const supplementItems = foodDB['サプリメント'] || {};
                                const subcategories = [...new Set(Object.values(supplementItems).map(item => item.subcategory).filter(Boolean))];

                                // 「カスタム」カテゴリを最後に追加（食材タブと同じ）
                                const allSubcategories = [...subcategories, 'カスタム'];

                                return (
                                    <div className="px-4 py-3 border-b bg-gray-50">
                                        <div className="flex flex-wrap gap-2">
                                            {allSubcategories.map(subcat => (
                                                <button
                                                    key={subcat}
                                                    onClick={() => setSelectedCategory(subcat)}
                                                    className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                                                        (selectedCategory || 'プロテイン') === subcat
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
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
                                    <div className="text-center py-12 text-gray-600">
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
                                                        <div className="font-semibold text-gray-800 flex items-center gap-2">
                                                            {item.name}
                                                            {item.isCustom && (
                                                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                                                    {item.customLabel || 'カスタム'}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs mt-1 flex items-center gap-2 flex-wrap">
                                                            <span className="font-semibold text-blue-600">{item.calories}kcal</span>
                                                            <span className="text-gray-400">|</span>
                                                            <span className="text-red-500 font-semibold">P {item.protein}g</span>
                                                            <span className="text-gray-400">|</span>
                                                            <span className="text-yellow-500 font-semibold">F {item.fat}g</span>
                                                            <span className="text-gray-400">|</span>
                                                            <span className="text-green-500 font-semibold">C {item.carbs}g</span>
                                                            <span className="text-gray-600 text-[10px] ml-1">
                                                                {(() => {
                                                                    // servingSizeとservingUnitがあればそれを使用
                                                                    if (item.servingSize && item.servingUnit) {
                                                                        // unitベースの表記（個、本、杯、錠、枚など）
                                                                        const isCountUnit = COUNT_UNITS.some(u => (item.unit || '').includes(u));

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
                                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
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
                    selectedDate={selectedDate}
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
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setShowTemplateInfoModal(true)}
                                    className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition"
                                    title="テンプレートについて"
                                >
                                    <Icon name="Info" size={18} className="text-[#4A9EFF]" />
                                </button>
                                <button onClick={() => setShowTemplateSelector(false)} className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full">
                                    <Icon name="X" size={20} />
                                </button>
                            </div>
                        </div>

                        {/* テンプレート一覧 */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {mealTemplates.length === 0 ? (
                                <div className="text-center py-12">
                                    <Icon name="BookMarked" size={48} className="mx-auto mb-3 opacity-30 text-purple-600" />
                                    <p className="text-gray-800 font-semibold mb-2">まだテンプレートがありません</p>
                                    <p className="text-sm text-gray-600 px-4">
                                        食材を追加後に「保存」ボタンで保存するか、<br/>
                                        ダッシュボードのテンプレートボタンから作成できます
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {mealTemplates.map((template, index) => {
                                    const totalPFC = template.items.reduce((sum, item) => {
                                        const isCountUnit = COUNT_UNITS.some(u => (item.unit || '').includes(u));
                                        const ratio = isCountUnit ? item.amount : item.amount / 100;
                                        return {
                                            calories: sum.calories + (item.calories || 0) * ratio,
                                            protein: sum.protein + (item.protein || 0) * ratio,
                                            fat: sum.fat + (item.fat || 0) * ratio,
                                            carbs: sum.carbs + (item.carbs || 0) * ratio,
                                        };
                                    }, { calories: 0, protein: 0, fat: 0, carbs: 0 });

                                    // 無料会員：最初に作成したテンプレート（index 0）のみ使用可能
                                    // プレミアム会員以外は、2枠目以降（index 1+）は全てロック
                                    const isLocked = userProfile?.subscriptionStatus !== 'active' && index !== 0;
                                    console.log('[19_add_meal_modal] テンプレートロック判定:', {templateName: template.name, index, subscriptionStatus: userProfile?.subscriptionStatus, isLocked});

                                    return (
                                        <details key={template.id} className={`border-2 rounded-lg group ${isLocked ? 'bg-gray-100 border-gray-300 opacity-60' : 'bg-gray-50 border-gray-200'}`}>
                                            <summary className="p-3 cursor-pointer list-none">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="font-semibold text-gray-800">{template.name}</div>
                                                        {isLocked && (
                                                            <Icon name="Lock" size={16} className="text-amber-600" title="無料会員は1枠目のみ使用可能" />
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                if (isLocked) {
                                                                    toast.error('このテンプレートは使用できません。無料会員は1枠目のテンプレートのみ使用可能です。Premium会員にアップグレードすると全てのテンプレートが使用できます。');
                                                                    return;
                                                                }
                                                                loadTemplate(template);
                                                                setShowTemplateSelector(false);
                                                            }}
                                                            className={`min-w-[44px] min-h-[44px] rounded-lg shadow-md flex items-center justify-center transition border-2 ${
                                                                isLocked
                                                                ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'
                                                                : 'bg-white text-[#4A9EFF] hover:bg-blue-50 border-[#4A9EFF]'
                                                            }`}
                                                            title={isLocked ? 'トライアル期間中作成のため利用不可' : '編集'}
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
                                                            className="min-w-[44px] min-h-[44px] rounded-lg bg-white shadow-md flex items-center justify-center text-red-600 hover:bg-red-50 transition border-2 border-red-500"
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
                                                        <span className="font-semibold text-blue-600">{Math.round(totalPFC.calories)}kcal</span>
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
                                                        if (isLocked) {
                                                            toast.error('このテンプレートは使用できません。無料会員は1枠目のテンプレートのみ使用可能です。Premium会員にアップグレードすると全てのテンプレートが使用できます。');
                                                            return;
                                                        }
                                                        addFromTemplate(template);
                                                        setShowTemplateSelector(false);
                                                    }}
                                                    className={`w-full px-4 py-2 rounded-lg font-bold transition text-sm ${
                                                        isLocked
                                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                        : 'bg-[#4A9EFF] text-white hover:bg-[#3b8fef]'
                                                    }`}
                                                >
                                                    記録
                                                </button>
                                            </summary>
                                            <div className="px-3 pb-3 border-t border-gray-300">
                                                <div className="text-xs font-medium text-gray-600 mt-2 mb-2">内訳を表示</div>
                                                <div className="space-y-2">
                                                    {template.items.map((item, idx) => {
                                                        const isCountUnit = COUNT_UNITS.some(u => (item.unit || '').includes(u));
                                                        const ratio = isCountUnit ? item.amount : item.amount / 100;
                                                        return (
                                                            <div key={idx} className="bg-white p-2 rounded text-xs border border-gray-200">
                                                                <div className="font-semibold">{item.name}</div>
                                                                <div className="text-gray-600 mt-1">{item.amount}{item.unit || 'g'}</div>
                                                                <div className="text-gray-600 mt-1 flex gap-2">
                                                                    <span className="text-blue-600">{Math.round((item.calories || 0) * ratio)}kcal</span>
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
                                className="w-full px-4 py-3 bg-gray-200 text-gray-600 rounded-lg font-semibold hover:bg-gray-300 transition"
                            >
                                閉じる
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* テンプレート仕様説明モーダル */}
            {showTemplateInfoModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
                        {/* ヘッダー */}
                        <div className="bg-gradient-to-r from-[#4A9EFF] to-[#3B82F6] text-white p-4 flex justify-between items-center sticky top-0">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Icon name="Info" size={20} />
                                テンプレートについて
                            </h3>
                            <button
                                onClick={() => setShowTemplateInfoModal(false)}
                                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition"
                            >
                                <Icon name="X" size={20} />
                            </button>
                        </div>

                        {/* 内容 */}
                        <div className="p-6 space-y-6">
                            {/* テンプレートとは */}
                            <div>
                                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <Icon name="BookMarked" size={18} className="text-[#4A9EFF]" />
                                    テンプレートとは
                                </h4>
                                <p className="text-sm text-gray-700 leading-relaxed">
                                    よく食べる食事を登録しておくことで、毎回同じ食材を検索・追加する手間を省くことができます。
                                </p>
                            </div>

                            {/* 無料会員の制限 */}
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <Icon name="User" size={18} className="text-orange-600" />
                                    無料会員の制限
                                </h4>
                                <div className="space-y-2 text-sm text-gray-700">
                                    <div className="flex items-start gap-2">
                                        <Icon name="Lock" size={16} className="text-orange-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <div className="font-semibold">1枠のみ使用可能</div>
                                            <div className="text-xs text-gray-600 mt-1">
                                                無料会員は<span className="font-bold text-orange-600">最初に作成したテンプレート（1枠目）のみ</span>使用できます。2枠目以降はロックされます。
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <Icon name="Edit" size={16} className="text-orange-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <div className="font-semibold">編集・削除は可能</div>
                                            <div className="text-xs text-gray-600 mt-1">
                                                1枠目のテンプレートは自由に編集・削除できます。削除後に新しいテンプレートを作成することも可能です。
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Premium会員の特典 */}
                            <div className="bg-gradient-to-r from-[#FFF59A] to-[#FFF176] border border-amber-300 rounded-lg p-4">
                                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <Icon name="Crown" size={18} className="text-amber-600" />
                                    Premium会員の特典
                                </h4>
                                <div className="space-y-2 text-sm text-gray-700">
                                    <div className="flex items-start gap-2">
                                        <Icon name="Unlock" size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <div className="font-semibold">無制限で使用可能</div>
                                            <div className="text-xs text-gray-600 mt-1">
                                                Premium会員は<span className="font-bold text-amber-600">何個でもテンプレートを作成・使用</span>できます。
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <Icon name="Star" size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <div className="font-semibold">解約後の制限</div>
                                            <div className="text-xs text-gray-600 mt-1">
                                                Premium会員を解約すると、2枠目以降のテンプレートはロックされ、1枠目のみ使用可能になります。
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 使い方 */}
                            <div>
                                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <Icon name="Lightbulb" size={18} className="text-[#4A9EFF]" />
                                    使い方
                                </h4>
                                <div className="space-y-3 text-sm text-gray-700">
                                    <div className="flex items-start gap-2">
                                        <div className="bg-[#4A9EFF] text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</div>
                                        <div>
                                            <div className="font-semibold">テンプレートの作成</div>
                                            <div className="text-xs text-gray-600 mt-1">
                                                食材を追加後、「テンプレートとして保存」ボタンで保存できます。
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <div className="bg-[#4A9EFF] text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</div>
                                        <div>
                                            <div className="font-semibold">テンプレートの使用</div>
                                            <div className="text-xs text-gray-600 mt-1">
                                                「テンプレートから選択」ボタンから、保存したテンプレートを呼び出せます。
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <div className="bg-[#4A9EFF] text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</div>
                                        <div>
                                            <div className="font-semibold">テンプレートの管理</div>
                                            <div className="text-xs text-gray-600 mt-1">
                                                設定 → データ管理 → テンプレート管理から、全てのテンプレートを編集・削除できます。
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* フッター */}
                        <div className="border-t p-4 bg-gray-50">
                            <button
                                onClick={() => setShowTemplateInfoModal(false)}
                                className="w-full px-4 py-3 bg-[#4A9EFF] text-white rounded-lg font-semibold hover:bg-[#3B82F6] transition"
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
                                <button
                                    onClick={() => setShowCustomGuide(true)}
                                    className="p-1 hover:bg-white hover:bg-opacity-20 rounded-full transition text-white"
                                >
                                    <Icon name="HelpCircle" size={18} />
                                </button>
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
                                <label className="block text-sm font-medium text-gray-600 mb-1">名前</label>
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

                            {/* カテゴリタブ（大カテゴリのみ：食材・料理・サプリ） */}
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-2">カテゴリ</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setCustomData({...customData, itemType: 'food', category: 'カスタム'})}
                                        className={`py-3 px-4 font-medium transition flex flex-col items-center justify-center gap-1 rounded-lg border-2 ${
                                            customData.itemType === 'food'
                                                ? 'border-green-600 bg-green-50 text-green-600'
                                                : 'border-gray-300 text-gray-600 hover:border-green-600 hover:text-green-600'
                                        }`}
                                    >
                                        <Icon name="Apple" size={20} />
                                        <span className="text-sm">食材</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCustomData({...customData, itemType: 'recipe', category: 'カスタム'})}
                                        className={`py-3 px-4 font-medium transition flex flex-col items-center justify-center gap-1 rounded-lg border-2 ${
                                            customData.itemType === 'recipe'
                                                ? 'border-orange-600 bg-orange-50 text-orange-600'
                                                : 'border-gray-300 text-gray-600 hover:border-orange-600 hover:text-orange-600'
                                        }`}
                                    >
                                        <Icon name="ChefHat" size={20} />
                                        <span className="text-sm">料理</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCustomData({...customData, itemType: 'supplement', category: 'カスタム'})}
                                        className={`py-3 px-4 font-medium transition flex flex-col items-center justify-center gap-1 rounded-lg border-2 ${
                                            customData.itemType === 'supplement'
                                                ? 'border-blue-600 bg-blue-50 text-blue-600'
                                                : 'border-gray-300 text-gray-600 hover:border-blue-600 hover:text-blue-600'
                                        }`}
                                    >
                                        <Icon name="Pill" size={20} />
                                        <span className="text-sm">サプリ</span>
                                    </button>
                                </div>
                            </div>

                            {/* 1回分の量 */}
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="block text-xs text-gray-600 mb-1">1回分の量</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={customData.servingSize}
                                        onChange={(e) => setCustomData({...customData, servingSize: e.target.value})}
                                        onBlur={(e) => {
                                            const val = e.target.value.trim();
                                            if (val === '' || val === '.') {
                                                setCustomData({...customData, servingSize: ''});
                                            } else {
                                                const num = parseFloat(val);
                                                setCustomData({...customData, servingSize: isNaN(num) ? '' : num});
                                            }
                                        }}
                                        placeholder="100"
                                        className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                    />
                                </div>
                                <div className="w-24">
                                    <label className="block text-xs text-gray-600 mb-1">単位</label>
                                    <select
                                        value={customData.servingUnit}
                                        onChange={(e) => setCustomData({...customData, servingUnit: e.target.value})}
                                        className="w-full px-2 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                    >
                                        <option value="g">g</option>
                                        <option value="ml">ml</option>
                                        <option value="本">本</option>
                                        <option value="個">個</option>
                                        <option value="杯">杯</option>
                                        <option value="枚">枚</option>
                                        <option value="錠">錠</option>
                                        <option value="包">包</option>
                                        <option value="粒">粒</option>
                                    </select>
                                </div>
                            </div>
                            {/* 重量単位の場合の注釈 */}
                            {!COUNT_UNITS.some(u => customData.servingUnit.includes(u)) && (
                                <p className="text-xs text-gray-500 mt-1">
                                    ※ 保存時に100gあたりの値に自動換算されます
                                </p>
                            )}

                            {/* 基本栄養素 */}
                            <div className="border-t pt-4">
                                <p className="text-sm font-medium text-gray-600 mb-2">
                                    基本栄養素（{customData.servingSize || 100}{customData.servingUnit}あたり）
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs text-gray-600">カロリー (kcal)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={customData.calories}
                                            onChange={(e) => setCustomData({...customData, calories: e.target.value})}
                                            placeholder="0"
                                            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-600">タンパク質 (g)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={customData.protein}
                                            onChange={(e) => setCustomData({...customData, protein: e.target.value})}
                                            placeholder="0"
                                            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-600">脂質 (g)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={customData.fat}
                                            onChange={(e) => setCustomData({...customData, fat: e.target.value})}
                                            placeholder="0"
                                            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-600">炭水化物 (g)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={customData.carbs}
                                            onChange={(e) => setCustomData({...customData, carbs: e.target.value})}
                                            placeholder="0"
                                            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 品質指標（折りたたみ） */}
                            <details className="border-t pt-4">
                                <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-green-600 flex items-center gap-2">
                                    <Icon name="ChevronDown" size={14} />
                                    品質指標
                                </summary>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    {/* 品質指標 */}
                                    <div>
                                        <label className="text-xs text-gray-600">DIAAS</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={customData.diaas}
                                            onChange={(e) => setCustomData({...customData, diaas: e.target.value})}
                                            placeholder="0"
                                            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-600">GI値</label>
                                        <input
                                            type="number"
                                            step="1"
                                            value={customData.gi}
                                            onChange={(e) => setCustomData({...customData, gi: e.target.value})}
                                            placeholder="0"
                                            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                                        />
                                    </div>

                                    {/* 糖質・食物繊維 */}
                                    <div>
                                        <label className="text-xs text-gray-600">糖質 (g)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={customData.sugar}
                                            onChange={(e) => setCustomData({...customData, sugar: e.target.value})}
                                            placeholder="0"
                                            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-600">食物繊維 (g)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={customData.fiber}
                                            onChange={(e) => setCustomData({...customData, fiber: e.target.value})}
                                            placeholder="0"
                                            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-600">水溶性食物繊維 (g)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={customData.solubleFiber}
                                            onChange={(e) => setCustomData({...customData, solubleFiber: e.target.value})}
                                            placeholder="0"
                                            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-600">不溶性食物繊維 (g)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={customData.insolubleFiber}
                                            onChange={(e) => setCustomData({...customData, insolubleFiber: e.target.value})}
                                            placeholder="0"
                                            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                                        />
                                    </div>

                                    {/* 脂肪酸 */}
                                    <div>
                                        <label className="text-xs text-gray-600">飽和脂肪酸 (g)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={customData.saturatedFat}
                                            onChange={(e) => setCustomData({...customData, saturatedFat: e.target.value})}
                                            placeholder="0"
                                            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-600">一価不飽和脂肪酸 (g)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={customData.monounsaturatedFat}
                                            onChange={(e) => setCustomData({...customData, monounsaturatedFat: e.target.value})}
                                            placeholder="0"
                                            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-600">多価不飽和脂肪酸 (g)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={customData.polyunsaturatedFat}
                                            onChange={(e) => setCustomData({...customData, polyunsaturatedFat: e.target.value})}
                                            placeholder="0"
                                            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-600">中鎖脂肪酸 (g)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={customData.mediumChainFat}
                                            onChange={(e) => setCustomData({...customData, mediumChainFat: e.target.value})}
                                            placeholder="0"
                                            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </details>

                            {/* ビタミン（折りたたみ） */}
                            <details className="border-t pt-4">
                                <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-green-600 flex items-center gap-2">
                                    <Icon name="ChevronDown" size={14} />
                                    ビタミン
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
                                                step={unit === 'μg' ? '0.001' : '0.01'}
                                                value={customData[key] === 0 ? '0' : (customData[key] || '')}
                                                onChange={(e) => setCustomData({...customData, [key]: e.target.value})}
                                                onBlur={(e) => {
                                                    const val = e.target.value.trim();
                                                    if (val === '' || val === '.') {
                                                        setCustomData({...customData, [key]: 0});
                                                    } else {
                                                        const num = parseFloat(val);
                                                        setCustomData({...customData, [key]: isNaN(num) ? 0 : num});
                                                    }
                                                }}
                                                className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </details>

                            {/* ミネラル（折りたたみ） */}
                            <details className="border-t pt-4">
                                <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-green-600 flex items-center gap-2">
                                    <Icon name="ChevronDown" size={14} />
                                    ミネラル
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
                                                step={unit === 'μg' ? '0.001' : '0.1'}
                                                value={customData[key] === 0 ? '0' : (customData[key] || '')}
                                                onChange={(e) => setCustomData({...customData, [key]: e.target.value})}
                                                onBlur={(e) => {
                                                    const val = e.target.value.trim();
                                                    if (val === '' || val === '.') {
                                                        setCustomData({...customData, [key]: 0});
                                                    } else {
                                                        const num = parseFloat(val);
                                                        setCustomData({...customData, [key]: isNaN(num) ? 0 : num});
                                                    }
                                                }}
                                                className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </details>

                            {/* その他栄養素（折りたたみ） */}
                            <details className="border-t pt-4">
                                <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-green-600 flex items-center gap-2">
                                    <Icon name="ChevronDown" size={14} />
                                    その他栄養素（クレアチン、カフェインなど）
                                </summary>
                                <div className="mt-2 space-y-2">
                                    {customData.otherNutrients.length === 0 ? (
                                        <div className="text-xs text-gray-400 text-center py-2">
                                            追加ボタンをクリックして栄養素を入力
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2">
                                            {customData.otherNutrients.map((nutrient, idx) => (
                                                <div key={idx} className="space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <input
                                                            type="text"
                                                            value={nutrient.name}
                                                            onChange={(e) => {
                                                                const updated = [...customData.otherNutrients];
                                                                updated[idx].name = e.target.value;
                                                                setCustomData({...customData, otherNutrients: updated});
                                                            }}
                                                            placeholder="栄養素名"
                                                            className="flex-1 px-2 py-1 text-xs text-gray-600 border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                const updated = customData.otherNutrients.filter((_, i) => i !== idx);
                                                                setCustomData({...customData, otherNutrients: updated});
                                                            }}
                                                            className="ml-1 text-red-500 hover:bg-red-50 rounded p-1"
                                                        >
                                                            <Icon name="X" size={14} />
                                                        </button>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={nutrient.amount === 0 ? '0' : (nutrient.amount || '')}
                                                            onChange={(e) => {
                                                                const updated = [...customData.otherNutrients];
                                                                updated[idx].amount = e.target.value;
                                                                setCustomData({...customData, otherNutrients: updated});
                                                            }}
                                                            onBlur={(e) => {
                                                                const val = e.target.value.trim();
                                                                const updated = [...customData.otherNutrients];
                                                                if (val === '' || val === '.') {
                                                                    updated[idx].amount = 0;
                                                                } else {
                                                                    const num = parseFloat(val);
                                                                    updated[idx].amount = isNaN(num) ? 0 : num;
                                                                }
                                                                setCustomData({...customData, otherNutrients: updated});
                                                            }}
                                                            placeholder="量"
                                                            className="flex-1 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                                                        />
                                                        <select
                                                            value={nutrient.unit || 'mg'}
                                                            onChange={(e) => {
                                                                const updated = [...customData.otherNutrients];
                                                                updated[idx].unit = e.target.value;
                                                                setCustomData({...customData, otherNutrients: updated});
                                                            }}
                                                            className="px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                                                        >
                                                            <option value="g">g</option>
                                                            <option value="mg">mg</option>
                                                            <option value="μg">μg</option>
                                                            <option value="IU">IU</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setCustomData({
                                            ...customData,
                                            otherNutrients: [...customData.otherNutrients, {name: '', amount: '', unit: 'mg'}]
                                        })}
                                        className="w-full px-2 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-xs font-medium flex items-center justify-center gap-1"
                                    >
                                        <Icon name="Plus" size={14} />
                                        追加
                                    </button>
                                </div>
                            </details>

                            {/* 保存方法選択 */}
                            <div className="border-t pt-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <label className="text-sm font-medium text-gray-600">保存方法</label>
                                    <button
                                        onClick={() => setShowCustomHelp(true)}
                                        className="p-1 hover:bg-gray-100 rounded-full transition"
                                    >
                                        <Icon name="HelpCircle" size={14} className="text-[#4A9EFF]" />
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    <label className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition ${
                                        customSaveMethod === 'database'
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-300 hover:border-gray-400'
                                    }`}>
                                        <input
                                            type="radio"
                                            name="saveMethod"
                                            value="database"
                                            checked={customSaveMethod === 'database'}
                                            onChange={(e) => setCustomSaveMethod(e.target.value)}
                                            className="mt-0.5"
                                        />
                                        <div className="flex-1">
                                            <div className="font-semibold text-sm text-gray-800">データベースに保存</div>
                                            <div className="text-xs text-gray-600 mt-0.5">後で検索して使用できます</div>
                                        </div>
                                    </label>
                                    <label className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition ${
                                        customSaveMethod === 'list'
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-300 hover:border-gray-400'
                                    }`}>
                                        <input
                                            type="radio"
                                            name="saveMethod"
                                            value="list"
                                            checked={customSaveMethod === 'list'}
                                            onChange={(e) => setCustomSaveMethod(e.target.value)}
                                            className="mt-0.5"
                                        />
                                        <div className="flex-1">
                                            <div className="font-semibold text-sm text-gray-800">リストに追加</div>
                                            <div className="text-xs text-gray-600 mt-0.5">今すぐ食事に追加されます</div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* 保存ボタン */}
                            <div className="flex gap-2 pt-4">
                                <button
                                    onClick={() => setShowCustomForm(false)}
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                                >
                                    キャンセル
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!customData.name.trim()) {
                                            toast('アイテム名を入力してください');
                                            return;
                                        }

                                        // Firestoreに保存（既存アイテムと同じ形式）
                                        const currentUser = firebase.auth().currentUser;
                                        if (currentUser) {
                                            try {
                                                // 個数単位判定
                                                const isCountUnit = COUNT_UNITS.some(u => customData.servingUnit.includes(u));
                                                const servingSize = parseFloat(customData.servingSize) || (isCountUnit ? 1 : 100);

                                                // 重量単位の場合は100g基準に換算、個数単位はそのまま
                                                let finalServingSize, conversionRatio;
                                                if (isCountUnit) {
                                                    // 個数単位：1個あたりで保存
                                                    finalServingSize = servingSize;
                                                    conversionRatio = 1;
                                                } else {
                                                    // 重量単位：100gあたりに換算
                                                    finalServingSize = 100;
                                                    conversionRatio = 100 / servingSize;
                                                }

                                                const customFood = {
                                                    name: customData.name,
                                                    category: customData.category,
                                                    itemType: customData.itemType,
                                                    // 栄養値を換算（個数単位はそのまま、重量単位は100g基準に）
                                                    calories: parseFloat(((parseFloat(customData.calories) || 0) * conversionRatio).toFixed(1)),
                                                    protein: parseFloat(((parseFloat(customData.protein) || 0) * conversionRatio).toFixed(1)),
                                                    fat: parseFloat(((parseFloat(customData.fat) || 0) * conversionRatio).toFixed(1)),
                                                    carbs: parseFloat(((parseFloat(customData.carbs) || 0) * conversionRatio).toFixed(1)),
                                                    servingSize: finalServingSize,
                                                    servingUnit: customData.servingUnit || 'g',
                                                    unit: customData.servingUnit || 'g',  // unitフィールドも追加

                                                    // 品質指標（換算不要）
                                                    diaas: parseFloat(customData.diaas) || null,
                                                    gi: parseFloat(customData.gi) || null,

                                                    // 脂肪酸（換算）
                                                    saturatedFat: parseFloat(((parseFloat(customData.saturatedFat) || 0) * conversionRatio).toFixed(2)),
                                                    monounsaturatedFat: parseFloat(((parseFloat(customData.monounsaturatedFat) || 0) * conversionRatio).toFixed(2)),
                                                    polyunsaturatedFat: parseFloat(((parseFloat(customData.polyunsaturatedFat) || 0) * conversionRatio).toFixed(2)),
                                                    mediumChainFat: parseFloat(((parseFloat(customData.mediumChainFat) || 0) * conversionRatio).toFixed(2)),

                                                    // 糖質・食物繊維（換算）
                                                    sugar: parseFloat(((parseFloat(customData.sugar) || 0) * conversionRatio).toFixed(1)),
                                                    fiber: parseFloat(((parseFloat(customData.fiber) || 0) * conversionRatio).toFixed(1)),
                                                    solubleFiber: parseFloat(((parseFloat(customData.solubleFiber) || 0) * conversionRatio).toFixed(1)),
                                                    insolubleFiber: parseFloat(((parseFloat(customData.insolubleFiber) || 0) * conversionRatio).toFixed(1)),

                                                    // ビタミン・ミネラルをvitamins/mineralsオブジェクトに格納（換算）
                                                    // キー名は既存アイテムと統一（vitaminA, vitaminB1, ...形式）
                                                    vitamins: {
                                                        vitaminA: parseFloat(((parseFloat(customData.vitaminA) || 0) * conversionRatio).toFixed(1)),
                                                        vitaminB1: parseFloat(((parseFloat(customData.vitaminB1) || 0) * conversionRatio).toFixed(2)),
                                                        vitaminB2: parseFloat(((parseFloat(customData.vitaminB2) || 0) * conversionRatio).toFixed(2)),
                                                        vitaminB6: parseFloat(((parseFloat(customData.vitaminB6) || 0) * conversionRatio).toFixed(2)),
                                                        vitaminB12: parseFloat(((parseFloat(customData.vitaminB12) || 0) * conversionRatio).toFixed(1)),
                                                        vitaminC: parseFloat(((parseFloat(customData.vitaminC) || 0) * conversionRatio).toFixed(1)),
                                                        vitaminD: parseFloat(((parseFloat(customData.vitaminD) || 0) * conversionRatio).toFixed(1)),
                                                        vitaminE: parseFloat(((parseFloat(customData.vitaminE) || 0) * conversionRatio).toFixed(1)),
                                                        vitaminK: parseFloat(((parseFloat(customData.vitaminK) || 0) * conversionRatio).toFixed(1)),
                                                        niacin: parseFloat(((parseFloat(customData.niacin) || 0) * conversionRatio).toFixed(1)),
                                                        pantothenicAcid: parseFloat(((parseFloat(customData.pantothenicAcid) || 0) * conversionRatio).toFixed(2)),
                                                        biotin: parseFloat(((parseFloat(customData.biotin) || 0) * conversionRatio).toFixed(1)),
                                                        folicAcid: parseFloat(((parseFloat(customData.folicAcid) || 0) * conversionRatio).toFixed(1))
                                                    },
                                                    minerals: {
                                                        sodium: parseFloat(((parseFloat(customData.sodium) || 0) * conversionRatio).toFixed(1)),
                                                        potassium: parseFloat(((parseFloat(customData.potassium) || 0) * conversionRatio).toFixed(1)),
                                                        calcium: parseFloat(((parseFloat(customData.calcium) || 0) * conversionRatio).toFixed(1)),
                                                        magnesium: parseFloat(((parseFloat(customData.magnesium) || 0) * conversionRatio).toFixed(1)),
                                                        phosphorus: parseFloat(((parseFloat(customData.phosphorus) || 0) * conversionRatio).toFixed(1)),
                                                        iron: parseFloat(((parseFloat(customData.iron) || 0) * conversionRatio).toFixed(1)),
                                                        zinc: parseFloat(((parseFloat(customData.zinc) || 0) * conversionRatio).toFixed(1)),
                                                        copper: parseFloat(((parseFloat(customData.copper) || 0) * conversionRatio).toFixed(2)),
                                                        manganese: parseFloat(((parseFloat(customData.manganese) || 0) * conversionRatio).toFixed(2)),
                                                        iodine: parseFloat(((parseFloat(customData.iodine) || 0) * conversionRatio).toFixed(1)),
                                                        selenium: parseFloat(((parseFloat(customData.selenium) || 0) * conversionRatio).toFixed(1)),
                                                        chromium: parseFloat(((parseFloat(customData.chromium) || 0) * conversionRatio).toFixed(1)),
                                                        molybdenum: parseFloat(((parseFloat(customData.molybdenum) || 0) * conversionRatio).toFixed(1))
                                                    },
                                                    // その他栄養素は絶対量（換算不要）- mg, g, IUなどの単位で保存
                                                    otherNutrients: (customData.otherNutrients || []).map(nutrient => ({
                                                        name: nutrient.name,
                                                        amount: parseFloat(parseFloat(nutrient.amount) || 0),
                                                        unit: nutrient.unit
                                                    })),
                                                    createdAt: new Date().toISOString()
                                                };

                                                // データベースに保存が選択されている場合のみFirestoreに保存
                                                if (customSaveMethod === 'database') {
                                                    await firebase.firestore()
                                                        .collection('users')
                                                        .doc(currentUser.uid)
                                                        .collection('customFoods')
                                                        .doc(customFood.name)
                                                        .set(customFood, { merge: true });

                                                    console.log(`[AddMealModal] カスタムアイテムをデータベースに保存: ${customFood.name} (${customFood.itemType})`);

                                                    // stateも更新（即座に反映）
                                                    setCustomFoods(prev => {
                                                        const existing = prev.find(f => f.name === customFood.name);
                                                        if (existing) {
                                                            return prev.map(f => f.name === customFood.name ? customFood : f);
                                                        } else {
                                                            return [...prev, customFood];
                                                        }
                                                    });

                                                    toast.success('カスタムアイテムをデータベースに保存しました');
                                                } else {
                                                    // リストに追加の場合もFirestoreに保存
                                                    await firebase.firestore()
                                                        .collection('users')
                                                        .doc(currentUser.uid)
                                                        .collection('customFoods')
                                                        .doc(customFood.name)
                                                        .set(customFood, { merge: true });

                                                    console.log(`[AddMealModal] カスタムアイテムをリストに追加: ${customFood.name} (${customFood.itemType})`);

                                                    // stateも更新
                                                    setCustomFoods(prev => {
                                                        const existing = prev.find(f => f.name === customFood.name);
                                                        if (existing) {
                                                            return prev.map(f => f.name === customFood.name ? customFood : f);
                                                        } else {
                                                            return [...prev, customFood];
                                                        }
                                                    });
                                                }
                                            } catch (error) {
                                                console.error('[AddMealModal] カスタムアイテム保存エラー:', error);
                                                toast.error('保存に失敗しました');
                                            }
                                        }

                                        // リストに追加が選択されている場合のみaddedItemsに追加
                                        if (customSaveMethod === 'list') {
                                            // カスタムアイテムをaddedItemsに追加
                                        // Firestoreに保存したデータを使用（既に100g基準に換算済み）
                                        const isCountUnitItem = COUNT_UNITS.some(u => customData.servingUnit.includes(u));
                                        const userInputSize = parseFloat(customData.servingSize) || (isCountUnitItem ? 1 : 100);

                                        // デフォルトのamount（既存アイテムと同じロジック）
                                        let defaultAmount;
                                        if (isCountUnitItem) {
                                            defaultAmount = 1;  // 個数単位は1個がデフォルト
                                        } else {
                                            defaultAmount = userInputSize;  // 重量単位はユーザー入力値がデフォルト
                                        }

                                        // ビタミン・ミネラルの計算用ratio
                                        const vitaminMineralRatio = isCountUnitItem ? defaultAmount : defaultAmount / 100;

                                        // Firestoreに保存した100g基準の値を使用してビタミン・ミネラルをスケーリング
                                        // 個数単位の場合は入力値をそのまま使用、重量単位の場合は100g基準に換算
                                        // キー名は既存アイテムと統一（vitaminA, vitaminB1, ...形式）
                                        const savedVitamins = {
                                            vitaminA: parseFloat(((parseFloat(customData.vitaminA) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(1)),
                                            vitaminB1: parseFloat(((parseFloat(customData.vitaminB1) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(2)),
                                            vitaminB2: parseFloat(((parseFloat(customData.vitaminB2) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(2)),
                                            vitaminB6: parseFloat(((parseFloat(customData.vitaminB6) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(2)),
                                            vitaminB12: parseFloat(((parseFloat(customData.vitaminB12) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(1)),
                                            vitaminC: parseFloat(((parseFloat(customData.vitaminC) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(1)),
                                            vitaminD: parseFloat(((parseFloat(customData.vitaminD) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(1)),
                                            vitaminE: parseFloat(((parseFloat(customData.vitaminE) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(1)),
                                            vitaminK: parseFloat(((parseFloat(customData.vitaminK) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(1)),
                                            niacin: parseFloat(((parseFloat(customData.niacin) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(1)),
                                            pantothenicAcid: parseFloat(((parseFloat(customData.pantothenicAcid) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(2)),
                                            biotin: parseFloat(((parseFloat(customData.biotin) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(1)),
                                            folicAcid: parseFloat(((parseFloat(customData.folicAcid) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(1))
                                        };

                                        const savedMinerals = {
                                            sodium: parseFloat(((parseFloat(customData.sodium) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(1)),
                                            potassium: parseFloat(((parseFloat(customData.potassium) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(1)),
                                            calcium: parseFloat(((parseFloat(customData.calcium) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(1)),
                                            magnesium: parseFloat(((parseFloat(customData.magnesium) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(1)),
                                            phosphorus: parseFloat(((parseFloat(customData.phosphorus) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(1)),
                                            iron: parseFloat(((parseFloat(customData.iron) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(1)),
                                            zinc: parseFloat(((parseFloat(customData.zinc) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(1)),
                                            copper: parseFloat(((parseFloat(customData.copper) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(2)),
                                            manganese: parseFloat(((parseFloat(customData.manganese) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(2)),
                                            iodine: parseFloat(((parseFloat(customData.iodine) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(1)),
                                            selenium: parseFloat(((parseFloat(customData.selenium) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(1)),
                                            chromium: parseFloat(((parseFloat(customData.chromium) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(1)),
                                            molybdenum: parseFloat(((parseFloat(customData.molybdenum) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(1))
                                        };

                                        // 実際のamountに応じてスケーリング
                                        const scaledVitamins = {};
                                        const scaledMinerals = {};

                                        Object.keys(savedVitamins).forEach(key => {
                                            scaledVitamins[key] = parseFloat((savedVitamins[key] * vitaminMineralRatio).toFixed(2));
                                        });

                                        Object.keys(savedMinerals).forEach(key => {
                                            scaledMinerals[key] = parseFloat((savedMinerals[key] * vitaminMineralRatio).toFixed(2));
                                        });

                                        const newItem = {
                                            id: Date.now(),
                                            name: customData.name,
                                            amount: defaultAmount,
                                            unit: customData.servingUnit,
                                            // 栄養値は100g基準（既存アイテムと同じ）
                                            calories: parseFloat(((parseFloat(customData.calories) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(1)),
                                            protein: parseFloat(((parseFloat(customData.protein) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(1)),
                                            fat: parseFloat(((parseFloat(customData.fat) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(1)),
                                            carbs: parseFloat(((parseFloat(customData.carbs) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(1)),

                                            // 品質指標（換算不要）
                                            diaas: parseFloat(customData.diaas) || null,
                                            gi: parseFloat(customData.gi) || null,

                                            // 脂肪酸（100g基準）
                                            saturatedFat: parseFloat(((parseFloat(customData.saturatedFat) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(2)),
                                            monounsaturatedFat: parseFloat(((parseFloat(customData.monounsaturatedFat) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(2)),
                                            polyunsaturatedFat: parseFloat(((parseFloat(customData.polyunsaturatedFat) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(2)),
                                            mediumChainFat: parseFloat(((parseFloat(customData.mediumChainFat) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(2)),

                                            // 糖質・食物繊維（100g基準）
                                            sugar: parseFloat(((parseFloat(customData.sugar) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(1)),
                                            fiber: parseFloat(((parseFloat(customData.fiber) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(1)),
                                            solubleFiber: parseFloat(((parseFloat(customData.solubleFiber) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(1)),
                                            insolubleFiber: parseFloat(((parseFloat(customData.insolubleFiber) || 0) * (isCountUnitItem ? 1 : 100 / userInputSize)).toFixed(1)),

                                            category: customData.category,
                                            itemType: customData.itemType,
                                            servingSize: isCountUnitItem ? userInputSize : 100,  // 個数単位は実重量、重量単位は100
                                            servingUnit: customData.servingUnit,
                                            vitamins: scaledVitamins,  // ← SCALED to actual amount
                                            minerals: scaledMinerals,  // ← SCALED to actual amount
                                            // その他栄養素は絶対量（換算不要）- ユーザー入力値をそのまま使用
                                            otherNutrients: customData.otherNutrients || [],
                                            isCustom: true
                                        };

                                        setAddedItems([...addedItems, newItem]);
                                        }

                                        // フォームをリセット
                                        setCustomData({
                                            name: '',
                                            itemType: 'food',
                                            category: 'カスタム',
                                            servingSize: '',
                                            servingUnit: 'g',
                                            calories: '',
                                            protein: '',
                                            fat: '',
                                            carbs: '',
                                            // 品質指標
                                            diaas: '',
                                            gi: '',
                                            // 脂肪酸
                                            saturatedFat: '',
                                            monounsaturatedFat: '',
                                            polyunsaturatedFat: '',
                                            mediumChainFat: '',
                                            // 糖質・食物繊維
                                            sugar: '',
                                            fiber: '',
                                            solubleFiber: '',
                                            insolubleFiber: '',
                                            // ビタミン
                                            vitaminA: '', vitaminB1: '', vitaminB2: '', vitaminB6: '', vitaminB12: '',
                                            vitaminC: '', vitaminD: '', vitaminE: '', vitaminK: '',
                                            niacin: '', pantothenicAcid: '', biotin: '', folicAcid: '',
                                            // ミネラル
                                            sodium: '', potassium: '', calcium: '', magnesium: '', phosphorus: '',
                                            iron: '', zinc: '', copper: '', manganese: '', iodine: '', selenium: '', chromium: '', molybdenum: '',
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
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
                                            <p className="text-sm font-medium text-gray-600">一覧から検索</p>
                                            <p className="text-xs text-gray-600">データベースから食材を検索して追加</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <Icon name="BookTemplate" size={16} className="text-purple-600 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-600">テンプレート</p>
                                            <p className="text-xs text-gray-600">よく食べる食事を保存したテンプレートを使用</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <Icon name="Plus" size={16} className="text-green-600 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-600">カスタム作成</p>
                                            <p className="text-xs text-gray-600">オリジナルの食材や料理を作成</p>
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
                                <ul className="text-xs text-gray-600 space-y-1 ml-6 list-disc">
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
                                className="w-full bg-[#4A9EFF] text-white py-3 rounded-xl font-bold hover:bg-[#3b8fef] transition"
                            >
                                閉じる
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* カスタム作成ガイドモーダル（包括的） */}
            {showCustomGuide && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10001] p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
                        {/* ヘッダー */}
                        <div className="sticky top-0 bg-[#4A9EFF] text-white p-4 flex items-center justify-between rounded-t-2xl z-10">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Icon name="BookOpen" size={24} />
                                カスタムアイテム作成ガイド
                            </h3>
                            <button
                                onClick={() => setShowCustomGuide(false)}
                                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition"
                            >
                                <Icon name="X" size={20} />
                            </button>
                        </div>

                        {/* コンテンツ */}
                        <div className="p-6 space-y-6">
                            {/* 作成フロー */}
                            <div>
                                <div className="font-bold text-base text-gray-800 mb-3 flex items-center gap-2">
                                    <Icon name="GitBranch" size={20} className="text-[#4A9EFF]" />
                                    作成フロー（5ステップ）
                                </div>
                                <div className="space-y-3">
                                    <div className="flex gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#4A9EFF] text-white flex items-center justify-center font-bold">1</div>
                                        <div>
                                            <div className="font-semibold text-sm text-gray-800">基本情報を入力</div>
                                            <div className="text-xs text-gray-600">アイテム名、カテゴリ、種類を選択</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#4A9EFF] text-white flex items-center justify-center font-bold">2</div>
                                        <div>
                                            <div className="font-semibold text-sm text-gray-800">1食分の量と単位を設定</div>
                                            <div className="text-xs text-gray-600">デフォルトの提供量を設定（後で調整可能）</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#4A9EFF] text-white flex items-center justify-center font-bold">3</div>
                                        <div>
                                            <div className="font-semibold text-sm text-gray-800">栄養成分を入力</div>
                                            <div className="text-xs text-gray-600">カロリー、PFC、ビタミン・ミネラル、品質指標など</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#4A9EFF] text-white flex items-center justify-center font-bold">4</div>
                                        <div>
                                            <div className="font-semibold text-sm text-gray-800">その他栄養素を追加（任意）</div>
                                            <div className="text-xs text-gray-600">クレアチン、カフェイン、アミノ酸など</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#4A9EFF] text-white flex items-center justify-center font-bold">5</div>
                                        <div>
                                            <div className="font-semibold text-sm text-gray-800">保存方法を選択して保存</div>
                                            <div className="text-xs text-gray-600">データベースのみ or リストに追加</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 100g換算ルール */}
                            <div className="border-t pt-6">
                                <div className="font-bold text-base text-gray-800 mb-3 flex items-center gap-2">
                                    <Icon name="Calculator" size={20} className="text-green-600" />
                                    自動換算ルール
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="bg-blue-50 p-3 rounded-lg">
                                        <div className="font-semibold text-blue-800 mb-1 flex items-center gap-2">
                                            <Icon name="Scale" size={16} />
                                            重量単位（g、ml）
                                        </div>
                                        <div className="text-gray-700 text-xs">
                                            入力した栄養素は<span className="font-bold">100gあたりの値に自動換算</span>されて保存されます。
                                            例：1食150gで300kcalの場合 → 100gあたり200kcalとして保存
                                        </div>
                                    </div>
                                    <div className="bg-purple-50 p-3 rounded-lg">
                                        <div className="font-semibold text-purple-800 mb-1 flex items-center gap-2">
                                            <Icon name="Package" size={16} />
                                            個数単位（個、本、杯、枚、錠、包、粒）
                                        </div>
                                        <div className="text-gray-700 text-xs">
                                            入力した栄養素は<span className="font-bold">1個あたりの値として</span>保存されます（換算なし）。
                                            例：1錠5mgで入力 → 1錠5mgとして保存
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 換算例 */}
                            <div className="border-t pt-6">
                                <div className="font-bold text-base text-gray-800 mb-3 flex items-center gap-2">
                                    <Icon name="ListChecks" size={20} className="text-orange-600" />
                                    換算例
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs border">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="border p-2 text-left">入力内容</th>
                                                <th className="border p-2 text-left">保存される値</th>
                                                <th className="border p-2 text-left">使用時の計算</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td className="border p-2">1食150gで450kcal</td>
                                                <td className="border p-2 font-semibold">100gあたり300kcal</td>
                                                <td className="border p-2">200g摂取 → 600kcal</td>
                                            </tr>
                                            <tr className="bg-gray-50">
                                                <td className="border p-2">1個80gで160kcal</td>
                                                <td className="border p-2 font-semibold">1個あたり160kcal</td>
                                                <td className="border p-2">2個摂取 → 320kcal</td>
                                            </tr>
                                            <tr>
                                                <td className="border p-2">1錠でクレアチン5g</td>
                                                <td className="border p-2 font-semibold">1錠あたり5g</td>
                                                <td className="border p-2">3錠摂取 → 15g</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* DIAAS目安 */}
                            <div className="border-t pt-6">
                                <div className="font-bold text-base text-gray-800 mb-3 flex items-center gap-2">
                                    <Icon name="Award" size={20} className="text-yellow-600" />
                                    DIAAS値の目安（タンパク質源）
                                </div>
                                <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-green-50 p-3 rounded-lg">
                                            <div className="font-semibold text-green-800 text-sm">最優秀（1.2以上）</div>
                                            <div className="text-gray-700 text-xs mt-1">ホエイプロテイン、卵白、牛乳</div>
                                        </div>
                                        <div className="bg-blue-50 p-3 rounded-lg">
                                            <div className="font-semibold text-blue-800 text-sm">優秀（1.0 - 1.19）</div>
                                            <div className="text-gray-700 text-xs mt-1">全卵、牛肉、鶏肉、カゼインプロテイン</div>
                                        </div>
                                        <div className="bg-yellow-50 p-3 rounded-lg">
                                            <div className="font-semibold text-yellow-800 text-sm">良質（0.75 - 0.99）</div>
                                            <div className="text-gray-700 text-xs mt-1">魚類、豚肉、大豆、ソイプロテイン</div>
                                        </div>
                                        <div className="bg-orange-50 p-3 rounded-lg">
                                            <div className="font-semibold text-orange-800 text-sm">普通（0.40 - 0.74）</div>
                                            <div className="text-gray-700 text-xs mt-1">玄米、全粒粉、レンズ豆、ピープロテイン</div>
                                        </div>
                                    </div>
                                    <div className="bg-amber-50 p-3 rounded-lg">
                                        <div className="flex items-start gap-2">
                                            <Icon name="Info" size={16} className="text-amber-700 flex-shrink-0 mt-0.5" />
                                            <p className="text-gray-700 text-xs">
                                                <span className="font-semibold">DIAASとアミノ酸スコアの違い：</span>
                                                DIAASは1.0を超える値もあります（アミノ酸スコアは最大1.0）。製品情報がない場合は上記を参考にしてください。
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 重要な概念 */}
                            <div className="border-t pt-6">
                                <div className="font-bold text-base text-gray-800 mb-3 flex items-center gap-2">
                                    <Icon name="Lightbulb" size={20} className="text-purple-600" />
                                    重要な概念
                                </div>
                                <div className="space-y-2 text-xs">
                                    <div className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                                        <Icon name="Check" size={14} className="text-green-600 flex-shrink-0 mt-0.5" />
                                        <div className="text-gray-700">
                                            <span className="font-semibold">その他栄養素は絶対量：</span>
                                            クレアチン、カフェイン、アミノ酸などは入力した値がそのまま保存されます（換算されません）。
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                                        <Icon name="Check" size={14} className="text-green-600 flex-shrink-0 mt-0.5" />
                                        <div className="text-gray-700">
                                            <span className="font-semibold">後から編集可能：</span>
                                            作成後も設定画面からいつでも編集・削除できます。
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                                        <Icon name="Check" size={14} className="text-green-600 flex-shrink-0 mt-0.5" />
                                        <div className="text-gray-700">
                                            <span className="font-semibold">製品パッケージを参考に：</span>
                                            サプリメントや加工食品の栄養成分表示を見ながら入力すると正確です。
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 閉じるボタン */}
                            <div className="border-t pt-6">
                                <button
                                    onClick={() => setShowCustomGuide(false)}
                                    className="w-full bg-[#4A9EFF] text-white py-3 rounded-xl font-bold hover:bg-[#3b8fef] transition"
                                >
                                    閉じる
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 保存方法ヘルプモーダル（簡易） */}
            {showCustomHelp && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10001] p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
                        {/* ヘッダー */}
                        <div className="bg-white border-b p-4 flex items-center justify-between rounded-t-2xl">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Icon name="HelpCircle" size={24} className="text-[#4A9EFF]" />
                                保存方法について
                            </h3>
                            <button
                                onClick={() => setShowCustomHelp(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition"
                            >
                                <Icon name="X" size={20} />
                            </button>
                        </div>

                        {/* コンテンツ */}
                        <div className="p-6 space-y-4">
                            {/* データベースに保存 */}
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <div className="font-bold text-sm text-gray-800 mb-2 flex items-center gap-2">
                                    <Icon name="Database" size={18} className="text-[#4A9EFF]" />
                                    データベースに保存
                                </div>
                                <p className="text-sm text-gray-700">
                                    カスタムアイテムをデータベースに登録します。次回以降、検索モーダルから選択して使用できます。
                                </p>
                            </div>

                            {/* リストに追加 */}
                            <div className="bg-green-50 p-4 rounded-lg">
                                <div className="font-bold text-sm text-gray-800 mb-2 flex items-center gap-2">
                                    <Icon name="List" size={18} className="text-green-600" />
                                    リストに追加
                                </div>
                                <p className="text-sm text-gray-700">
                                    カスタムアイテムをデータベースに保存し、今日の食事記録にも追加します。作成後すぐに使いたい場合に便利です。
                                </p>
                            </div>

                            {/* 閉じるボタン */}
                            <button
                                onClick={() => setShowCustomHelp(false)}
                                className="w-full bg-[#4A9EFF] text-white py-3 rounded-xl font-bold hover:bg-[#3b8fef] transition"
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
