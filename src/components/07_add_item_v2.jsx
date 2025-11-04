import React from 'react';
// ===== Edit Meal Modal (食事編集専用モーダル) =====
const EditMealModal = ({ meal, onClose, onUpdate, onDeleteItem }) => {
    const [selectedItemIndex, setSelectedItemIndex] = useState(0); // 編集対象のアイテムインデックス
    const [amount, setAmount] = useState(100);
    const [foodData, setFoodData] = useState(null);
    const [bottleSize, setBottleSize] = useState(null); // 1本の容量（ml）

    // 食材追加用のstate
    const [showAddItemModal, setShowAddItemModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedNewItem, setSelectedNewItem] = useState(null);
    const [newItemAmount, setNewItemAmount] = useState(100);
    const [foodOrSupplementTab, setFoodOrSupplementTab] = useState('food'); // 'food' or 'supplement'
    const [expandedCategories, setExpandedCategories] = useState({}); // カテゴリの展開状態

    // アイテム削除ハンドラ
    const handleDeleteItem = (index) => {
        if (meal.items.length === 1) {
            alert('最後のアイテムは削除できません。食事全体を削除してください。');
            return;
        }

        // confirmポップアップを削除し、直接削除
        // 削除後のアイテム配列を作成
        const updatedItems = meal.items.filter((_, idx) => idx !== index);

        // 全アイテムのカロリー・PFCを再計算
        const totalCalories = updatedItems.reduce((sum, item) => sum + (item.calories || 0), 0);
        const totalProtein = parseFloat(updatedItems.reduce((sum, item) => sum + (item.protein || 0), 0).toFixed(1));
        const totalFat = parseFloat(updatedItems.reduce((sum, item) => sum + (item.fat || 0), 0).toFixed(1));
        const totalCarbs = parseFloat(updatedItems.reduce((sum, item) => sum + (item.carbs || 0), 0).toFixed(1));

        const updatedMeal = {
            ...meal,
            items: updatedItems,
            calories: totalCalories,
            protein: totalProtein,
            fat: totalFat,
            carbs: totalCarbs
        };

        // 選択中のインデックスを調整
        if (selectedItemIndex >= updatedItems.length) {
            setSelectedItemIndex(updatedItems.length - 1);
        }

        // onUpdateを呼び出し、モーダルは維持する
        onUpdate(updatedMeal, true); // 第2引数でモーダル維持を指示
    };

    // 食材検索ハンドラ
    const handleSearchFood = (query) => {
        setSearchTerm(query);
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        const results = [];
        Object.keys(foodDatabase).forEach(category => {
            Object.keys(foodDatabase[category]).forEach(itemName => {
                if (itemName.includes(query)) {
                    results.push({
                        name: itemName,
                        category: category,
                        ...foodDatabase[category][itemName]
                    });
                }
            });
        });
        setSearchResults(results.slice(0, 20));
    };

    // 食材追加ハンドラ
    const handleAddItem = () => {
        if (!selectedNewItem) {
            alert('食材を選択してください');
            return;
        }

        // 100gあたりから実量に換算
        const ratio = newItemAmount / 100;
        const newItem = {
            name: selectedNewItem.name,
            amount: newItemAmount,
            unit: selectedNewItem.unit || 'g',
            calories: Math.round(selectedNewItem.calories * ratio),
            protein: parseFloat((selectedNewItem.protein * ratio).toFixed(1)),
            fat: parseFloat((selectedNewItem.fat * ratio).toFixed(1)),
            carbs: parseFloat((selectedNewItem.carbs * ratio).toFixed(1))
        };

        // 新しいアイテム配列を作成
        const updatedItems = [...meal.items, newItem];

        // 全アイテムのカロリー・PFCを再計算
        const totalCalories = updatedItems.reduce((sum, item) => sum + (item.calories || 0), 0);
        const totalProtein = parseFloat(updatedItems.reduce((sum, item) => sum + (item.protein || 0), 0).toFixed(1));
        const totalFat = parseFloat(updatedItems.reduce((sum, item) => sum + (item.fat || 0), 0).toFixed(1));
        const totalCarbs = parseFloat(updatedItems.reduce((sum, item) => sum + (item.carbs || 0), 0).toFixed(1));

        const updatedMeal = {
            ...meal,
            items: updatedItems,
            calories: totalCalories,
            protein: totalProtein,
            fat: totalFat,
            carbs: totalCarbs
        };

        // onUpdateを呼び出し、モーダルは維持する
        onUpdate(updatedMeal, true);

        // 追加モーダルを閉じて、状態をリセット
        setShowAddItemModal(false);
        setSearchTerm('');
        setSearchResults([]);
        setSelectedNewItem(null);
        setNewItemAmount(100);
    };

    // foodDatabaseから元の食品情報を取得
    useEffect(() => {
        if (meal && meal.items && meal.items.length > 0) {
            const item = meal.items[selectedItemIndex]; // 選択されたアイテムを編集対象とする
            console.log('📝 EditMealModal: 編集対象アイテム', item);

            // item.amountが文字列（"100g"など）の場合、数値とunitを分離
            let itemAmount = item.amount;
            let itemUnit = item.unit;

            if (typeof itemAmount === 'string') {
                // 数値部分を抽出
                const numMatch = itemAmount.match(/^([\d.]+)/);
                const unitMatch = itemAmount.match(/[a-zA-Z]+$/);

                if (numMatch) {
                    itemAmount = parseFloat(numMatch[1]);
                }
                if (unitMatch && !itemUnit) {
                    itemUnit = unitMatch[0];
                }
                console.log('🔧 amount文字列を分離:', { original: item.amount, amount: itemAmount, unit: itemUnit });
            } else {
                itemAmount = parseFloat(itemAmount) || 100;
            }

            // itemにunitがない場合のデフォルト
            if (!itemUnit) {
                itemUnit = 'g';
            }

            // 「本」「1個」単位の特殊処理（データベースから取得）
            if (itemUnit === '本' || itemUnit === '1個') {
                console.log('📦 本/個単位のアイテム:', item);

                // データベースから元データを検索
                let foundInDB = null;
                Object.keys(foodDatabase).forEach(category => {
                    if (foodDatabase[category][item.name]) {
                        foundInDB = foodDatabase[category][item.name];
                    }
                });

                if (foundInDB && foundInDB.servingSize) {
                    // データベースに見つかった場合、DBの値を使用
                    console.log('✅ データベースから個/本単位アイテムを取得:', foundInDB);
                    setFoodData({
                        name: item.name,
                        servingSize: foundInDB.servingSize, // 例: 58g, 355ml
                        unit: foundInDB.unit,               // 例: "1個", "本"
                        calories: foundInDB.calories || 0,
                        protein: foundInDB.protein || 0,
                        fat: foundInDB.fat || 0,
                        carbs: foundInDB.carbs || 0
                    });
                    setAmount(itemAmount);
                    setBottleSize(null);
                    return;
                } else {
                    // データベースにない場合、itemの値を1単位あたりに逆算
                    console.log('⚠️ データベースに見つからない、itemから逆算:', item);
                    const perUnit = itemAmount > 0 ? {
                        calories: Math.round((item.calories || 0) / itemAmount),
                        protein: parseFloat(((item.protein || 0) / itemAmount).toFixed(1)),
                        fat: parseFloat(((item.fat || 0) / itemAmount).toFixed(1)),
                        carbs: parseFloat(((item.carbs || 0) / itemAmount).toFixed(1))
                    } : {
                        calories: item.calories || 0,
                        protein: item.protein || 0,
                        fat: item.fat || 0,
                        carbs: item.carbs || 0
                    };

                    setFoodData({
                        name: item.name,
                        servingSize: 1,
                        unit: itemUnit,
                        ...perUnit
                    });
                    setAmount(itemAmount);
                    setBottleSize(null);
                    return;
                }
            }

            // まずlocalStorageからカスタムアイテムを検索（優先）
            const customFoods = JSON.parse(localStorage.getItem('customFoods') || '[]');
            const customItem = customFoods.find(f => f.name === item.name);

            if (customItem) {
                console.log('✅ カスタムアイテムをlocalStorageから取得:', customItem);

                // PFCからカロリーを自動計算（カロリーが0または未設定の場合）
                let calculatedCalories = customItem.calories || 0;
                if (calculatedCalories === 0 && (customItem.protein || customItem.fat || customItem.carbs)) {
                    calculatedCalories = Math.round(
                        (customItem.protein || 0) * 4 +
                        (customItem.fat || 0) * 9 +
                        (customItem.carbs || 0) * 4
                    );
                    console.log('🔢 PFCからカロリーを自動計算:', calculatedCalories, 'kcal');
                }

                setFoodData({
                    name: customItem.name,
                    servingSize: customItem.servingSize || 100,
                    unit: customItem.servingUnit || itemUnit,
                    calories: calculatedCalories,
                    protein: customItem.protein || 0,
                    fat: customItem.fat || 0,
                    carbs: customItem.carbs || 0
                });
                setAmount(itemAmount); // 抽出した数値を使用
                setBottleSize(null);
                return;
            }

            // foodDatabaseから元データを検索（通常の食材）
            let found = null;
            Object.keys(foodDatabase).forEach(category => {
                if (foodDatabase[category][item.name]) {
                    const dbItem = foodDatabase[category][item.name];
                    console.log('✅ データベースから取得:', dbItem);
                    found = {
                        ...dbItem,
                        name: item.name,
                        // servingSizeがあればそれを使用、なければ100g
                        servingSize: dbItem.servingSize || 100,
                        unit: dbItem.unit || itemUnit
                    };
                }
            });

            if (found) {
                console.log('✅ 最終的なfoodData:', found);
                setFoodData(found);
                setBottleSize(null);
                setAmount(itemAmount); // 抽出した数値を使用
            } else {
                console.warn('⚠️ データベースとlocalStorageから食品が見つかりません:', item.name);
                // 最後の手段: アイテム自体のデータを使用し、100gあたりに正規化
                const per100g = 100 / itemAmount;
                setFoodData({
                    name: item.name,
                    servingSize: 100,
                    unit: itemUnit,
                    calories: Math.round((item.calories || 0) * per100g),
                    protein: parseFloat(((item.protein || 0) * per100g).toFixed(1)),
                    fat: parseFloat(((item.fat || 0) * per100g).toFixed(1)),
                    carbs: parseFloat(((item.carbs || 0) * per100g).toFixed(1))
                });
                setAmount(itemAmount);
                setBottleSize(null);
            }
        }
    }, [meal, selectedItemIndex]); // selectedItemIndexの変更時にも再実行

    if (!foodData) {
        return null;
    }

    // 計算後の栄養情報
    // 特殊単位（1個、本）の場合、amountは既に個数/本数なのでそのまま使用
    let ratio;
    if (foodData.unit === '1個' || foodData.unit === '本') {
        ratio = amount; // 12.5個ならratio = 12.5
    } else {
        // 通常単位（100gあたり）の場合、servingSizeで割る
        ratio = amount / (foodData.servingSize || 1);
    }

    const calculatedCalories = Math.round((foodData.calories || 0) * ratio);
    const calculatedProtein = ((foodData.protein || 0) * ratio).toFixed(1);
    const calculatedFat = ((foodData.fat || 0) * ratio).toFixed(1);
    const calculatedCarbs = ((foodData.carbs || 0) * ratio).toFixed(1);

    console.log('🧮 計算:', {
        amount,
        servingSize: foodData.servingSize,
        unit: foodData.unit,
        ratio,
        calories: foodData.calories,
        calculatedCalories
    });

    const handleUpdate = () => {
        // 既存のアイテム配列をコピー
        const updatedItems = [...meal.items];

        console.log('[handleUpdate] 更新前のitems:', updatedItems);
        console.log('[handleUpdate] selectedItemIndex:', selectedItemIndex);

        // 選択したアイテムのみを更新（元のアイテムのプロパティを保持）
        const originalItem = updatedItems[selectedItemIndex];
        updatedItems[selectedItemIndex] = {
            ...originalItem,  // 元のプロパティを保持
            name: foodData.name,
            amount: amount,
            unit: foodData.unit || 'g',
            protein: parseFloat(((foodData.protein || 0) * ratio).toFixed(1)),
            fat: parseFloat(((foodData.fat || 0) * ratio).toFixed(1)),
            carbs: parseFloat(((foodData.carbs || 0) * ratio).toFixed(1)),
            calories: Math.round((foodData.calories || 0) * ratio)
        };

        console.log('[handleUpdate] 更新後のitems:', updatedItems);

        // 全アイテムのカロリー・PFCを再計算
        const totalCalories = updatedItems.reduce((sum, item) => {
            console.log(`[handleUpdate] アイテム: ${item.name}, カロリー: ${item.calories || 0}`);
            return sum + (item.calories || 0);
        }, 0);
        const totalProtein = parseFloat(updatedItems.reduce((sum, item) => sum + (item.protein || 0), 0).toFixed(1));
        const totalFat = parseFloat(updatedItems.reduce((sum, item) => sum + (item.fat || 0), 0).toFixed(1));
        const totalCarbs = parseFloat(updatedItems.reduce((sum, item) => sum + (item.carbs || 0), 0).toFixed(1));

        console.log('[handleUpdate] 合計カロリー:', totalCalories);

        const updatedMeal = {
            ...meal,
            items: updatedItems,
            calories: totalCalories,
            protein: totalProtein,
            fat: totalFat,
            carbs: totalCarbs
        };
        console.log('💾 更新データ:', updatedMeal);
        onUpdate(updatedMeal, false); // 更新ボタンを押したらモーダルを閉じる
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
                    <h2 className="text-xl font-bold">食事を編集</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <Icon name="X" size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* アイテム選択（複数アイテムがある場合のみ表示） */}
                    {meal.items && meal.items.length > 1 && (
                        <div className="bg-indigo-50 p-4 rounded-lg">
                            <p className="text-sm font-medium mb-3">編集するアイテムを選択（{selectedItemIndex + 1}/{meal.items.length}）</p>
                            <div className="space-y-2">
                                {meal.items.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex items-center justify-between p-3 rounded-lg border-2 transition ${
                                            selectedItemIndex === idx
                                                ? 'border-indigo-600 bg-indigo-50'
                                                : 'border-gray-200 bg-white hover:border-indigo-300'
                                        }`}
                                    >
                                        <button
                                            onClick={() => setSelectedItemIndex(idx)}
                                            className="flex-1 text-left"
                                        >
                                            <div className="font-medium text-sm text-gray-900">{item.name}</div>
                                            <div className="text-xs text-gray-600 mt-0.5">
                                                {item.amount}{item.unit} - {Math.round(item.calories || 0)}kcal
                                            </div>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteItem(idx);
                                            }}
                                            className="ml-2 p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                                            title="削除"
                                        >
                                            <Icon name="Trash2" size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => setShowAddItemModal(true)}
                                className="w-full mt-3 bg-green-500 text-white font-bold py-2 rounded-lg hover:bg-green-600 transition text-sm flex items-center justify-center gap-2"
                            >
                                <Icon name="Plus" size={18} />
                                食材を追加
                            </button>
                        </div>
                    )}

                    {/* 食品名 */}
                    <div>
                        <h3 className="text-lg font-bold mb-2">{foodData.name}</h3>
                        <p className="text-sm text-gray-600">{foodData.servingSize}{foodData.unit || 'g'} あたり</p>
                    </div>

                    {/* 100gあたりの栄養情報 */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm font-medium mb-2">基本栄養素（{foodData.servingSize || 100}{foodData.unit || 'g'}あたり）</p>
                        <div className="grid grid-cols-4 gap-2">
                            <div>
                                <p className="text-xs text-gray-600">カロリー</p>
                                <p className="font-bold" style={{color: '#7686BA'}}>{foodData.calories || 0}kcal</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-600">P</p>
                                <p className="font-bold text-red-600">{foodData.protein || 0}g</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-600">F</p>
                                <p className="font-bold text-yellow-600">{foodData.fat || 0}g</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-600">C</p>
                                <p className="font-bold text-green-600">{foodData.carbs || 0}g</p>
                            </div>
                        </div>
                    </div>

                    {/* 量調整 */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            量 ({foodData.unit || 'g'})
                        </label>

                        {/* スライダー */}
                        <div className="mb-3">
                            <input
                                type="range"
                                min="0"
                                max={(foodData.unit === '本' || foodData.unit === '1個') ? 50 : 500}
                                step={(foodData.unit === '本' || foodData.unit === '1個') ? 0.1 : 5}
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                style={{
                                    background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${(amount/((foodData.unit === '本' || foodData.unit === '1個') ? 50 : 500))*100}%, #e5e7eb ${(amount/((foodData.unit === '本' || foodData.unit === '1個') ? 50 : 500))*100}%, #e5e7eb 100%)`
                                }}
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                {foodData.unit === '本' ? (
                                    <>
                                        <span onClick={() => setAmount(0)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">0</span>
                                        <span onClick={() => setAmount(1)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">1</span>
                                        <span onClick={() => setAmount(2)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">2</span>
                                        <span onClick={() => setAmount(5)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">5</span>
                                        <span onClick={() => setAmount(10)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">10</span>
                                        <span onClick={() => setAmount(50)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">50</span>
                                    </>
                                ) : foodData.unit === '1個' ? (
                                    <>
                                        <span onClick={() => setAmount(0)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">0</span>
                                        <span onClick={() => setAmount(1)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">1</span>
                                        <span onClick={() => setAmount(10)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">10</span>
                                        <span onClick={() => setAmount(20)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">20</span>
                                        <span onClick={() => setAmount(30)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">30</span>
                                        <span onClick={() => setAmount(50)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">50</span>
                                    </>
                                ) : (
                                    <>
                                        <span onClick={() => setAmount(0)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">0</span>
                                        <span onClick={() => setAmount(100)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">100</span>
                                        <span onClick={() => setAmount(200)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">200</span>
                                        <span onClick={() => setAmount(300)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">300</span>
                                        <span onClick={() => setAmount(400)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">400</span>
                                        <span onClick={() => setAmount(500)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">500</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            step={foodData.unit === '本' ? 0.1 : 1}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none mb-2"
                        />

                        {/* 増減ボタン */}
                        {foodData.unit === '本' ? (
                            <div className="grid grid-cols-6 gap-1">
                                <button
                                    onClick={() => setAmount(Math.max(0, amount - 1))}
                                    className="py-1.5 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200 font-medium"
                                >
                                    -1
                                </button>
                                <button
                                    onClick={() => setAmount(Math.max(0, amount - 0.5))}
                                    className="py-1.5 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 font-medium"
                                >
                                    -0.5
                                </button>
                                <button
                                    onClick={() => setAmount(Math.max(0, amount - 0.1))}
                                    className="py-1.5 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 font-medium"
                                >
                                    -0.1
                                </button>
                                <button
                                    onClick={() => setAmount(amount + 0.1)}
                                    className="py-1.5 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100 font-medium"
                                >
                                    +0.1
                                </button>
                                <button
                                    onClick={() => setAmount(amount + 0.5)}
                                    className="py-1.5 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100 font-medium"
                                >
                                    +0.5
                                </button>
                                <button
                                    onClick={() => setAmount(amount + 1)}
                                    className="py-1.5 bg-green-100 text-green-600 rounded text-xs hover:bg-green-200 font-medium"
                                >
                                    +1
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-6 gap-1">
                                <button
                                    onClick={() => setAmount(Math.max(0, amount - 100))}
                                    className="py-1.5 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200 font-medium"
                                >
                                    -100
                                </button>
                                <button
                                    onClick={() => setAmount(Math.max(0, amount - 50))}
                                    className="py-1.5 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 font-medium"
                                >
                                    -50
                                </button>
                                <button
                                    onClick={() => setAmount(Math.max(0, amount - 10))}
                                    className="py-1.5 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 font-medium"
                                >
                                    -10
                                </button>
                                <button
                                onClick={() => setAmount(amount + 10)}
                                className="py-1.5 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100 font-medium"
                            >
                                +10
                            </button>
                            <button
                                onClick={() => setAmount(amount + 50)}
                                className="py-1.5 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100 font-medium"
                            >
                                +50
                            </button>
                            <button
                                onClick={() => setAmount(amount + 100)}
                                className="py-1.5 bg-green-100 text-green-600 rounded text-xs hover:bg-green-200 font-medium"
                            >
                                +100
                            </button>
                        </div>
                        )}

                        {/* 倍増減ボタン */}
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <button
                                onClick={() => setAmount(Math.max(0, Math.round(Number(amount) * 0.5)))}
                                className="py-1.5 bg-purple-50 text-purple-600 rounded text-xs hover:bg-purple-100 font-medium"
                            >
                                ×0.5
                            </button>
                            <button
                                onClick={() => setAmount(Math.round(Number(amount) * 2))}
                                className="py-1.5 bg-purple-50 text-purple-600 rounded text-xs hover:bg-purple-100 font-medium"
                            >
                                ×2
                            </button>
                        </div>
                    </div>

                    {/* 計算後の栄養情報 */}
                    <div className="bg-indigo-50 p-4 rounded-lg">
                        <p className="text-sm font-medium mb-2">摂取量（{amount}{foodData.unit || 'g'}）</p>
                        <div className="grid grid-cols-4 gap-2">
                            <div>
                                <p className="text-xs text-gray-600">カロリー</p>
                                <p className="font-bold" style={{color: '#7686BA'}}>{calculatedCalories}kcal</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-600">P</p>
                                <p className="font-bold text-red-600">{calculatedProtein}g</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-600">F</p>
                                <p className="font-bold text-yellow-600">{calculatedFat}g</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-600">C</p>
                                <p className="font-bold text-green-600">{calculatedCarbs}g</p>
                            </div>
                        </div>
                    </div>

                    {/* ボタン */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                        >
                            キャンセル
                        </button>
                        <button
                            onClick={handleUpdate}
                            className="flex-1 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                        >
                            更新
                        </button>
                    </div>
                </div>
            </div>

            {/* 食材追加モーダル */}
            {showAddItemModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-[10001] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col">
                        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
                            <h3 className="text-lg font-bold">食材を追加</h3>
                            <button onClick={() => setShowAddItemModal(false)} className="text-gray-400 hover:text-gray-600">
                                <Icon name="X" size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* 検索ボックス */}
                            <div>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => handleSearchFood(e.target.value)}
                                    placeholder="食材・サプリメントを検索..."
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    autoFocus
                                />
                            </div>

                            {/* 食材/サプリメント タブ */}
                            <div className="grid grid-cols-2 border-b border-gray-200">
                                <button
                                    onClick={() => setFoodOrSupplementTab('food')}
                                    className={`py-3 px-4 font-medium transition flex items-center justify-center gap-2 border-b-2 ${
                                        foodOrSupplementTab === 'food'
                                            ? 'border-green-600 text-green-600'
                                            : 'border-transparent text-gray-600 hover:text-green-600'
                                    }`}
                                >
                                    <Icon name="Apple" size={20} />
                                    <span className="text-sm">食材</span>
                                </button>
                                <button
                                    onClick={() => setFoodOrSupplementTab('supplement')}
                                    className={`py-3 px-4 font-medium transition flex items-center justify-center gap-2 border-b-2 ${
                                        foodOrSupplementTab === 'supplement'
                                            ? 'border-blue-600 text-blue-600'
                                            : 'border-transparent text-gray-600 hover:text-blue-600'
                                    }`}
                                >
                                    <Icon name="Pill" size={20} />
                                    <span className="text-sm">サプリメント</span>
                                </button>
                            </div>
                        </div>

                        {/* 選択した食材の量入力 */}
                        {selectedNewItem ? (
                            <div className="p-6 space-y-4">
                                {/* アイテム情報 */}
                                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-bold text-lg">{selectedNewItem.name}</h4>
                                            <p className="text-sm text-gray-600">{selectedNewItem.category}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSelectedNewItem(null);
                                                setSearchTerm('');
                                                setNewItemAmount(100);
                                            }}
                                            className="text-gray-500 hover:text-gray-700"
                                        >
                                            <Icon name="X" size={20} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 mt-3 text-sm">
                                        <div>
                                            <p className="text-gray-600">カロリー</p>
                                            <p className="font-bold" style={{color: '#7686BA'}}>{selectedNewItem.calories}kcal</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">P</p>
                                            <p className="font-bold text-red-600">{selectedNewItem.protein}g</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">F</p>
                                            <p className="font-bold text-yellow-600">{selectedNewItem.fat}g</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">C</p>
                                            <p className="font-bold text-green-600">{selectedNewItem.carbs}g</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        {selectedNewItem.servingSize && selectedNewItem.servingUnit ? `※1回あたり（${selectedNewItem.servingSize}${selectedNewItem.servingUnit}）` : '※100gあたり'}
                                    </p>
                                </div>

                                {/* 量調整 */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">量 (g)</label>

                                    {/* スライダー */}
                                    <div className="mb-3">
                                        <input
                                            type="range"
                                            min="0"
                                            max="500"
                                            step="5"
                                            value={newItemAmount}
                                            onChange={(e) => setNewItemAmount(Number(e.target.value))}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                            style={{
                                                background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${(newItemAmount/500)*100}%, #e5e7eb ${(newItemAmount/500)*100}%, #e5e7eb 100%)`
                                            }}
                                        />
                                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                                            <span onClick={() => setNewItemAmount(0)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">0g</span>
                                            <span onClick={() => setNewItemAmount(100)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">100g</span>
                                            <span onClick={() => setNewItemAmount(200)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">200g</span>
                                            <span onClick={() => setNewItemAmount(300)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">300g</span>
                                            <span onClick={() => setNewItemAmount(400)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">400g</span>
                                            <span onClick={() => setNewItemAmount(500)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">500g</span>
                                        </div>
                                    </div>

                                    <input
                                        type="number"
                                        value={newItemAmount}
                                        onChange={(e) => setNewItemAmount(Number(e.target.value))}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none mb-2"
                                    />

                                    {/* 増減ボタン */}
                                    <div className="grid grid-cols-6 gap-1">
                                        <button
                                            onClick={() => setNewItemAmount(Math.max(0, newItemAmount - 100))}
                                            className="py-1.5 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200 font-medium"
                                        >
                                            -100
                                        </button>
                                        <button
                                            onClick={() => setNewItemAmount(Math.max(0, newItemAmount - 50))}
                                            className="py-1.5 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 font-medium"
                                        >
                                            -50
                                        </button>
                                        <button
                                            onClick={() => setNewItemAmount(Math.max(0, newItemAmount - 10))}
                                            className="py-1.5 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 font-medium"
                                        >
                                            -10
                                        </button>
                                        <button
                                            onClick={() => setNewItemAmount(newItemAmount + 10)}
                                            className="py-1.5 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100 font-medium"
                                        >
                                            +10
                                        </button>
                                        <button
                                            onClick={() => setNewItemAmount(newItemAmount + 50)}
                                            className="py-1.5 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100 font-medium"
                                        >
                                            +50
                                        </button>
                                        <button
                                            onClick={() => setNewItemAmount(newItemAmount + 100)}
                                            className="py-1.5 bg-green-100 text-green-600 rounded text-xs hover:bg-green-200 font-medium"
                                        >
                                            +100
                                        </button>
                                    </div>

                                    {/* 倍増減ボタン */}
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        <button
                                            onClick={() => setNewItemAmount(Math.max(0, Math.round(newItemAmount * 0.5)))}
                                            className="py-1.5 bg-purple-50 text-purple-600 rounded text-xs hover:bg-purple-100 font-medium"
                                        >
                                            ×0.5
                                        </button>
                                        <button
                                            onClick={() => setNewItemAmount(Math.round(newItemAmount * 2))}
                                            className="py-1.5 bg-purple-50 text-purple-600 rounded text-xs hover:bg-purple-100 font-medium"
                                        >
                                            ×2
                                        </button>
                                    </div>
                                </div>

                                {/* 摂取量プレビュー */}
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-sm font-medium mb-2">摂取量</p>
                                    <div className="grid grid-cols-4 gap-2">
                                        <div>
                                            <p className="text-xs text-gray-600">カロリー</p>
                                            <p className="font-bold text-cyan-600">{Math.round(selectedNewItem.calories * newItemAmount / 100)}kcal</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600">P</p>
                                            <p className="font-bold text-red-600">{((selectedNewItem.protein * newItemAmount / 100).toFixed(1))}g</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600">F</p>
                                            <p className="font-bold text-yellow-600">{((selectedNewItem.fat * newItemAmount / 100).toFixed(1))}g</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600">C</p>
                                            <p className="font-bold text-green-600">{((selectedNewItem.carbs * newItemAmount / 100).toFixed(1))}g</p>
                                        </div>
                                    </div>
                                </div>

                                {/* ボタン */}
                                <button
                                    onClick={handleAddItem}
                                    className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition"
                                >
                                    アイテムを追加
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* カテゴリ一覧（検索結果がある場合は検索結果、ない場合は全カテゴリ） */}
                                <div className="flex-1 overflow-y-auto px-6 pb-6">
                                    {searchResults.length > 0 ? (
                                        // 検索結果表示
                                        <div className="space-y-2">
                                            {searchResults.map((food, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => {
                                                        setSelectedNewItem(food);
                                                        setSearchResults([]);
                                                    }}
                                                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border border-gray-200 rounded-lg transition"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1">
                                                            <p className="font-medium text-gray-800">{food.name}</p>
                                                            <p className="text-xs text-gray-500">{food.category}</p>
                                                        </div>
                                                        <div className="text-xs text-gray-600 flex gap-2">
                                                            <span>{food.calories}kcal</span>
                                                            <span>P:{food.protein}g</span>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : searchTerm ? (
                                        // 検索結果なし
                                        <div className="text-center py-8 text-gray-500">
                                            <p>「{searchTerm}」に一致する{foodOrSupplementTab === 'food' ? '食材' : 'サプリメント'}が見つかりませんでした</p>
                                        </div>
                                    ) : (
                                        // カテゴリ一覧表示
                                        <div className="bg-white">
                                            {foodOrSupplementTab === 'food' ? (
                                                // 食材カテゴリ
                                                Object.keys(foodDatabase).map(category => (
                                                    <div key={category} className="border-t border-gray-200">
                                                        <button
                                                            onClick={() => setExpandedCategories(prev => ({...prev, [category]: !prev[category]}))}
                                                            className="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100 flex justify-between items-center"
                                                        >
                                                            <span className="font-medium text-sm">{category}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-gray-500">{Object.keys(foodDatabase[category]).length}品目</span>
                                                                <Icon name={expandedCategories[category] ? 'ChevronDown' : 'ChevronRight'} size={18} />
                                                            </div>
                                                        </button>
                                                        {expandedCategories[category] && (
                                                            <div className="p-2 space-y-1 bg-gray-50">
                                                                {Object.keys(foodDatabase[category]).map(foodName => {
                                                                    const food = foodDatabase[category][foodName];

                                                                    // 栄養素データの取得
                                                                    const calories = food.calories || 0;
                                                                    const protein = food.protein || 0;
                                                                    const fat = food.fat || 0;
                                                                    const carbs = food.carbs || 0;

                                                                    // PFCのカロリー計算
                                                                    const pCal = parseFloat(protein) * 4;
                                                                    const fCal = parseFloat(fat) * 9;
                                                                    const cCal = parseFloat(carbs) * 4;

                                                                    // 最も高い割合の栄養素を判定
                                                                    const maxCal = Math.max(pCal, fCal, cCal);
                                                                    let borderColor = 'border-gray-300';
                                                                    if (maxCal === pCal) borderColor = 'border-red-500';
                                                                    else if (maxCal === fCal) borderColor = 'border-yellow-500';
                                                                    else if (maxCal === cCal) borderColor = 'border-green-500';

                                                                    return (
                                                                        <button
                                                                            key={foodName}
                                                                            onClick={() => {
                                                                                const nutrients = {
                                                                                    calories: calories,
                                                                                    protein: protein,
                                                                                    fat: fat,
                                                                                    carbs: carbs,
                                                                                    vitamins: {
                                                                                        A: food.vitaminA || 0,
                                                                                        B1: food.vitaminB1 || 0,
                                                                                        B2: food.vitaminB2 || 0,
                                                                                        B6: food.vitaminB6 || 0,
                                                                                        B12: food.vitaminB12 || 0,
                                                                                        C: food.vitaminC || 0,
                                                                                        D: food.vitaminD || 0,
                                                                                        E: food.vitaminE || 0,
                                                                                        K: food.vitaminK || 0,
                                                                                        B3: food.niacin || 0,
                                                                                        B5: food.pantothenicAcid || 0,
                                                                                        B7: food.biotin || 0,
                                                                                        B9: food.folicAcid || 0
                                                                                    },
                                                                                    minerals: {
                                                                                        sodium: food.sodium || 0,
                                                                                        potassium: food.potassium || 0,
                                                                                        calcium: food.calcium || 0,
                                                                                        magnesium: food.magnesium || 0,
                                                                                        phosphorus: food.phosphorus || 0,
                                                                                        iron: food.iron || 0,
                                                                                        zinc: food.zinc || 0,
                                                                                        copper: food.copper || 0,
                                                                                        manganese: food.manganese || 0,
                                                                                        iodine: food.iodine || 0,
                                                                                        selenium: food.selenium || 0,
                                                                                        chromium: food.chromium || 0,
                                                                                        molybdenum: food.molybdenum || 0
                                                                                    }
                                                                                };
                                                                                setSelectedNewItem({
                                                                                    name: foodName,
                                                                                    category: category,
                                                                                    ...nutrients
                                                                                });
                                                                            }}
                                                                            className={`w-full text-left rounded-lg transition hover:bg-gray-50 border-l-4 ${borderColor} bg-white`}
                                                                        >
                                                                            <div className="px-3 py-2">
                                                                                <div className="flex-1">
                                                                                    <div className="flex justify-between items-start mb-1">
                                                                                        <span className="text-sm font-medium">{foodName}</span>
                                                                                        <span className="text-xs font-bold text-cyan-600">
                                                                                            {calories}kcal
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="flex justify-between items-center">
                                                                                        <div className="flex gap-2 text-xs">
                                                                                            <span className="text-red-600">P:{protein}g</span>
                                                                                            <span className="text-yellow-600">F:{fat}g</span>
                                                                                            <span className="text-green-600">C:{carbs}g</span>
                                                                                        </div>
                                                                                        <span className="text-xs text-gray-400">
                                                                                            {food.servingSize && food.servingUnit ? `※1回あたり（${food.servingSize}${food.servingUnit}）` : '※100gあたり'}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                // サプリメントカテゴリ
                                                (() => {
                                                    const categories = {};
                                                    supplementDB.forEach(supp => {
                                                        if (!categories[supp.category]) {
                                                            categories[supp.category] = [];
                                                        }
                                                        categories[supp.category].push(supp);
                                                    });

                                                    return Object.keys(categories).map(category => (
                                                        <div key={category} className="border-t border-gray-200">
                                                            <button
                                                                onClick={() => setExpandedCategories(prev => ({...prev, [category]: !prev[category]}))}
                                                                className="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100 flex justify-between items-center"
                                                            >
                                                                <span className="font-medium text-sm">{category}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs text-gray-500">{categories[category].length}品目</span>
                                                                    <Icon name={expandedCategories[category] ? 'ChevronDown' : 'ChevronRight'} size={18} />
                                                                </div>
                                                            </button>
                                                            {expandedCategories[category] && (
                                                                <div className="p-2 space-y-1 bg-gray-50">
                                                                    {categories[category].map(supp => (
                                                                        <button
                                                                            key={supp.name}
                                                                            onClick={() => {
                                                                                setSelectedNewItem({
                                                                                    name: supp.name,
                                                                                    category: supp.category,
                                                                                    calories: 0,
                                                                                    protein: 0,
                                                                                    fat: 0,
                                                                                    carbs: 0,
                                                                                    vitamins: supp.vitamins || {},
                                                                                    minerals: supp.minerals || {}
                                                                                });
                                                                            }}
                                                                            className="w-full text-left rounded-lg transition hover:bg-gray-50 border-l-4 border-blue-500 bg-white"
                                                                        >
                                                                            <div className="px-3 py-2">
                                                                                <div className="flex-1">
                                                                                    <span className="text-sm font-medium">{supp.name}</span>
                                                                                </div>
                                                                            </div>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ));
                                                })()
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ===== Add Item Component =====
const AddItemView = ({ type, onClose, onAdd, userProfile, predictedData, unlockedFeatures, user, currentRoutine, usageDays, dailyRecord, editingTemplate, editingMeal, isTemplateMode = false }) => {
            // 食事とサプリを統合する場合、itemTypeで管理
            const isMealOrSupplement = type === 'meal' || type === 'supplement';

            const [searchTerm, setSearchTerm] = useState('');
            const [selectedItem, setSelectedItem] = useState(null);
            const [amount, setAmount] = useState(type === 'supplement' ? '1' : '100');
            const [expandedCategories, setExpandedCategories] = useState({});
            const [mealName, setMealName] = useState('');
            const [addedItems, setAddedItems] = useState([]);
            const [addedItemsExpanded, setAddedItemsExpanded] = useState(true); // 追加済セクションの展開状態
            const [selectedFoods, setSelectedFoods] = useState([]); // 選択中の食品リスト
            const [editingItemIndex, setEditingItemIndex] = useState(null); // 編集中のアイテムのインデックス
            const [mealTemplates, setMealTemplates] = useState([]);
            const [supplementTemplates, setSupplementTemplates] = useState([]);
            const [showTemplates, setShowTemplates] = useState(false);
            const [templateName, setTemplateName] = useState('');
            const [selectedExercise, setSelectedExercise] = useState(null);
            const [showAIFoodRecognition, setShowAIFoodRecognition] = useState(false);
            const [showCustomFoodCreator, setShowCustomFoodCreator] = useState(false);
            const [showSearchModal, setShowSearchModal] = useState(false);
            const [foodOrSupplementTab, setFoodOrSupplementTab] = useState('food'); // 'food' or 'supplement'
            const [exerciseTab, setExerciseTab] = useState('strength'); // 'strength' or 'cardio' or 'stretch'

            // 料理作成用のstate
            const [showRecipeCreator, setShowRecipeCreator] = useState(false);
            const [recipeIngredients, setRecipeIngredients] = useState([]);

            // サプリメント用のstate
            const [showCustomSupplementForm, setShowCustomSupplementForm] = useState(false);
            const [showQuickCreate, setShowQuickCreate] = useState(false);
            const [isAICreation, setIsAICreation] = useState(false); // AI解析からの作成かどうか
            const [isFromAIRecognition, setIsFromAIRecognition] = useState(false); // AI写真解析経由かどうか
            const [showMealInfoModal, setShowMealInfoModal] = useState(false); // 食事記録の使い方モーダル
            const [showWorkoutInfoModal, setShowWorkoutInfoModal] = useState(false); // 運動記録の使い方モーダル
            const [nutritionInputMethod, setNutritionInputMethod] = useState('manual'); // 'manual' or 'ai'
            const [aiImage, setAiImage] = useState(null); // AI推定用の画像
            const [aiImagePreview, setAiImagePreview] = useState(null); // AI推定用の画像プレビュー
            const [aiRecognizing, setAiRecognizing] = useState(false); // AI認識中
            const [saveMethod, setSaveMethod] = useState('database'); // 'database' or 'addToList'
            const [showSaveMethodInfo, setShowSaveMethodInfo] = useState(false); // 保存方法説明モーダル
            const [onCustomCompleteCallback, setOnCustomCompleteCallback] = useState(null); // カスタム登録完了時のコールバック
            const [customSupplementData, setCustomSupplementData] = useState({
                itemType: 'food', // 'food', 'recipe', 'supplement'
                name: '',
                category: 'ビタミン・ミネラル',
                servingSize: 100,
                servingUnit: 'g',
                unit: 'g',  // 表示単位（'g', '1個', '本'など）
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

            // Workout用のstate
            const [exercises, setExercises] = useState([]);
            const [currentExercise, setCurrentExercise] = useState(null);
            const [sets, setSets] = useState([]);
            const [currentSet, setCurrentSet] = useState({
                weight: 50,
                reps: 10,
                distance: 0.5,
                tut: 30,
                restInterval: 90,
                duration: 0
            });
            const [workoutTemplates, setWorkoutTemplates] = useState([]);
            const [showCustomExerciseForm, setShowCustomExerciseForm] = useState(false);
            const [workoutInfoModal, setWorkoutInfoModal] = useState({ show: false, title: '', content: '' });
            const [showAdvancedTraining, setShowAdvancedTraining] = useState(false);
            const [exerciseSaveMethod, setExerciseSaveMethod] = useState('database'); // 'database' or 'addToList'
            const [showExerciseSaveMethodInfo, setShowExerciseSaveMethodInfo] = useState(false); // 保存方法説明モーダル
            const [customExerciseData, setCustomExerciseData] = useState({
                name: '',
                category: '胸',
                subcategory: 'コンパウンド',
                exerciseType: 'anaerobic',
                jointType: 'single',
                defaultDistance: 0.5,
                defaultTutPerRep: 3,
                exerciseFactor: 1.0,
                epocRate: 0.15,
                intervalMultiplier: 1.3,
                equipment: '',
                difficulty: '初級',
                primaryMuscles: [],
                secondaryMuscles: []
            });

            // テンプレート読み込み
            useEffect(() => {
                if (type === 'meal' && unlockedFeatures.includes(FEATURES.TRAINING_TEMPLATE.id)) {
                    DataService.getMealTemplates(user.uid).then(setMealTemplates);
                } else if (type === 'supplement' && unlockedFeatures.includes(FEATURES.TRAINING_TEMPLATE.id)) {
                    DataService.getSupplementTemplates(user.uid).then(setSupplementTemplates);
                }
            }, [type]);

            // テンプレート編集モードの初期化
            useEffect(() => {
                // テンプレート編集モードの場合、既存のテンプレートデータを読み込む
                if (editingTemplate) {
                    // カテゴリ展開状態を初期化（折りたたんだ状態にリセット）
                    setExpandedCategories({});

                    // 既存のテンプレートデータを各stateに設定
                    if (type === 'meal' && editingTemplate.items) {
                        setAddedItems(editingTemplate.items);
                        setMealName(editingTemplate.name || '');
                    } else if (type === 'workout' && editingTemplate.exercises) {
                        setExercises(editingTemplate.exercises);
                        setMealName(editingTemplate.name || '');
                    }
                }
            }, [editingTemplate]);

            // 食事編集時：既存データをロード
            useEffect(() => {
                if (editingMeal && type === 'meal') {
                    console.log('📝 食事編集モード: データ読み込み', editingMeal);
                    if (editingMeal.items && editingMeal.items.length > 0) {
                        // amountが文字列の場合は数値に変換
                        const normalizedItems = editingMeal.items.map(item => ({
                            ...item,
                            amount: typeof item.amount === 'string' ? parseFloat(item.amount) || 100 : item.amount
                        }));
                        setAddedItems(normalizedItems);
                        setMealName(editingMeal.name || '');
                    }
                }
            }, [editingMeal, type]);

            // selectedItemが変更されたときにデフォルト量を設定
            useEffect(() => {
                if (selectedItem) {
                    // servingSizeとservingUnitが定義されている場合はそれを使用
                    if (selectedItem.servingSize !== undefined && selectedItem.servingUnit !== undefined) {
                        setAmount(String(selectedItem.servingSize));
                    } else {
                        // 定義されていない場合は従来通り100gまたは1個
                        if (type === 'supplement') {
                            setAmount('1');
                        } else {
                            setAmount('100');
                        }
                    }
                }
            }, [selectedItem]);

            const renderConditionInput = () => {
                const [condition, setCondition] = useState({
                    sleepHours: 7,
                    sleepQuality: 3,
                    stress: 3,
                    appetite: 3,
                    digestion: 3,
                    focus: 3,
                    weight: userProfile.weight || 0,
                    bodyFat: userProfile.bodyFat || 0,
                    notes: ''
                });

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
                                            ? 'border-indigo-600 bg-indigo-50 shadow-md'
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

                return (
                    <div className="space-y-5">
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

                        <button
                            onClick={() => {
                                const newCondition = {
                                    id: Date.now(),
                                    time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
                                    ...condition
                                };

                                onAdd(newCondition);

                                // 体組成をプロフィールに即時反映（記録後に実行）
                                if (condition.weight > 0 || condition.bodyFat > 0) {
                                    setTimeout(() => {
                                        const currentProfile = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_PROFILE)) || {};
                                        if (condition.weight > 0) {
                                            currentProfile.weight = condition.weight;
                                        }
                                        if (condition.bodyFat > 0) {
                                            currentProfile.bodyFat = condition.bodyFat;
                                            currentProfile.bodyFatPercentage = condition.bodyFat;
                                            // LBM（除脂肪体重）を再計算
                                            currentProfile.leanBodyMass = currentProfile.weight * (1 - currentProfile.bodyFat / 100);
                                        }
                                        localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(currentProfile));
                                        // ページをリロードして更新を反映
                                        window.location.reload();
                                    }, 100);
                                }
                            }}
                            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition"
                        >
                            記録する
                        </button>
                    </div>
                );
            };

            const renderSupplementInput = () => {
                const fuzzyMatch = (text, query) => {
                    if (!query || query.trim() === '') return true;
                    const normalize = (str) => {
                        return str
                            .toLowerCase()
                            .replace(/[（）\(\)]/g, '') // 括弧を削除
                            .replace(/[\u3041-\u3096]/g, (m) => String.fromCharCode(m.charCodeAt(0) + 0x60)) // ひらがな→カタカナ
                            .replace(/\s+/g, ''); // 空白削除
                    };
                    const normalizedText = normalize(text);
                    const normalizedQuery = normalize(query);
                    return normalizedText.includes(normalizedQuery);
                };

                const filteredSupplements = supplementDB.filter(supp =>
                    fuzzyMatch(supp.name, searchTerm)
                );

                // テンプレート保存
                const saveAsTemplate = async () => {
                    if (!templateName.trim() || addedItems.length === 0) {
                        alert('テンプレート名を入力し、サプリメントを追加してください');
                        return;
                    }
                    const template = {
                        id: Date.now(),
                        name: templateName,
                        items: addedItems
                    };
                    await DataService.saveSupplementTemplate(user.uid, template);
                    const templates = await DataService.getSupplementTemplates(user.uid);
                    setSupplementTemplates(templates);
                    alert('テンプレートを保存しました');
                    setTemplateName('');
                };

                const loadTemplate = (template) => {
                    // ディープコピーして参照を切る（複製不具合を防止）
                    const copiedItems = JSON.parse(JSON.stringify(template.items));
                    setAddedItems(copiedItems);
                };

                const deleteTemplate = async (templateId) => {
                    if (confirm('このテンプレートを削除しますか？')) {
                        await DataService.deleteSupplementTemplate(user.uid, templateId);
                        const templates = await DataService.getSupplementTemplates(user.uid);
                        setSupplementTemplates(templates);
                    }
                };

                return (
                    <div className="space-y-4">
                        {/* ①検索欄 */}
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="サプリメントを検索..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />

                        {/* ②折りたたみカテゴリ一覧 */}
                        {!selectedItem ? (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {(() => {
                                    const categories = {};
                                    filteredSupplements.forEach(supp => {
                                        if (!categories[supp.category]) {
                                            categories[supp.category] = [];
                                        }
                                        categories[supp.category].push(supp);
                                    });

                                    return Object.keys(categories).map(category => (
                                        <div key={category} className="border rounded-lg overflow-hidden">
                                            <button
                                                onClick={() => setExpandedCategories(prev => ({...prev, [category]: !prev[category]}))}
                                                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex justify-between items-center"
                                            >
                                                <span className="font-medium">{category}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500">{categories[category].length}品目</span>
                                                    <Icon name={expandedCategories[category] ? 'ChevronDown' : 'ChevronRight'} size={20} />
                                                </div>
                                            </button>
                                            {expandedCategories[category] && (
                                                <div className="p-2 space-y-1">
                                                    {categories[category].map(supp => (
                                                        <button
                                                            key={supp.id}
                                                            onClick={() => setSelectedItem(supp)}
                                                            className="w-full text-left px-3 py-2 hover:bg-blue-50 rounded-lg transition"
                                                        >
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-medium">{supp.name}</span>
                                                                <div className="text-right text-xs text-gray-500">
                                                                    <div>{supp.calories}kcal</div>
                                                                    <div>P:{supp.protein}g</div>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ));
                                })()}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-bold text-lg">{selectedItem.name}</h4>
                                            <p className="text-sm text-gray-600">{selectedItem.category}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSelectedItem(null);
                                                setEditingItemIndex(null);
                                            }}
                                            className="text-gray-500 hover:text-gray-700"
                                        >
                                            <Icon name="X" size={20} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 mt-3 text-sm">
                                        <div>
                                            <p className="text-gray-600">カロリー</p>
                                            <p className="font-bold text-cyan-600">{selectedItem.calories}kcal</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">P</p>
                                            <p className="font-bold text-red-600">{selectedItem.protein}g</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">F</p>
                                            <p className="font-bold text-yellow-600">{selectedItem.fat}g</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">C</p>
                                            <p className="font-bold text-green-600">{selectedItem.carbs}g</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        回数（1回分 = {selectedItem.unit || `${selectedItem.servingSize || 1}${selectedItem.servingUnit || 'g'}`}）
                                    </label>
                                    <div className="mb-3">
                                        <input
                                            type="range"
                                            min="1"
                                            max="20"
                                            step="1"
                                            value={amount || 1}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                            style={{
                                                background: `linear-gradient(to right, #2563eb 0%, #2563eb ${((amount || 1)/20)*100}%, #e5e7eb ${((amount || 1)/20)*100}%, #e5e7eb 100%)`
                                            }}
                                        />
                                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                                            <span onClick={() => setAmount(1)} className="cursor-pointer hover:text-blue-600 hover:font-bold transition">1</span>
                                            <span onClick={() => setAmount(5)} className="cursor-pointer hover:text-blue-600 hover:font-bold transition">5</span>
                                            <span onClick={() => setAmount(10)} className="cursor-pointer hover:text-blue-600 hover:font-bold transition">10</span>
                                            <span onClick={() => setAmount(15)} className="cursor-pointer hover:text-blue-600 hover:font-bold transition">15</span>
                                            <span onClick={() => setAmount(20)} className="cursor-pointer hover:text-blue-600 hover:font-bold transition">20</span>
                                        </div>
                                    </div>
                                    <input
                                        type="number"
                                        value={amount || '1'}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        placeholder="1"
                                    />
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-sm font-medium mb-2">摂取量（{amount || 1}回分）</p>
                                    <div className="grid grid-cols-4 gap-2">
                                        <div>
                                            <p className="text-xs text-gray-600">カロリー</p>
                                            <p className="font-bold text-blue-600">
                                                {Math.round(selectedItem.calories * Number(amount || 1))}kcal
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600">P</p>
                                            <p className="font-bold">{(selectedItem.protein * Number(amount || 1)).toFixed(1)}g</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600">F</p>
                                            <p className="font-bold">{(selectedItem.fat * Number(amount || 1)).toFixed(1)}g</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600">C</p>
                                            <p className="font-bold">{(selectedItem.carbs * Number(amount || 1)).toFixed(1)}g</p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        const numAmount = Number(amount || 1);

                                        // Calculate vitamins and minerals based on amount
                                        const vitamins = {};
                                        const minerals = {};

                                        if (selectedItem.vitamins) {
                                            Object.keys(selectedItem.vitamins).forEach(key => {
                                                vitamins[key] = selectedItem.vitamins[key] * numAmount;
                                            });
                                        }

                                        if (selectedItem.minerals) {
                                            Object.keys(selectedItem.minerals).forEach(key => {
                                                minerals[key] = selectedItem.minerals[key] * numAmount;
                                            });
                                        }

                                        // その他の栄養素を計算
                                        const otherNutrients = {};
                                        const otherNutrientKeys = ['caffeine', 'catechin', 'tannin', 'polyphenol', 'chlorogenicAcid',
                                                                    'creatine', 'lArginine', 'lCarnitine', 'EPA', 'DHA', 'coQ10',
                                                                    'lutein', 'astaxanthin'];
                                        otherNutrientKeys.forEach(key => {
                                            if (selectedItem[key]) {
                                                otherNutrients[key] = selectedItem[key] * numAmount;
                                            }
                                        });

                                        // unitフィールドから分量と単位を抽出
                                        let servingSize = selectedItem.servingSize || 1;
                                        let servingUnit = selectedItem.servingUnit || 'g';

                                        if (selectedItem.unit) {
                                            // "30g" → servingSize=30, servingUnit="g"
                                            // "1粒" → servingSize=1, servingUnit="粒"
                                            // "2粒" → servingSize=2, servingUnit="粒"
                                            const match = selectedItem.unit.match(/^(\d+(?:\.\d+)?)(.*)/);
                                            if (match) {
                                                servingSize = parseFloat(match[1]);
                                                servingUnit = match[2] || 'g';
                                            }
                                        }

                                        const newItem = {
                                            name: selectedItem.name,
                                            amount: `${numAmount}回分`,
                                            servings: numAmount,
                                            totalWeight: servingSize * numAmount,
                                            servingSize: servingSize,
                                            servingUnit: servingUnit,
                                            unit: selectedItem.unit || `${servingSize}${servingUnit}`,
                                            protein: selectedItem.protein * numAmount,
                                            fat: selectedItem.fat * numAmount,
                                            carbs: selectedItem.carbs * numAmount,
                                            calories: selectedItem.calories * numAmount,
                                            vitamins: vitamins,
                                            minerals: minerals,
                                            otherNutrients: otherNutrients
                                        };
                                        setAddedItems([...addedItems, newItem]);
                                        setSelectedItem(null);
                                        setAmount('1');
                                    }}
                                    className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition"
                                >
                                    追加
                                </button>
                            </div>
                        )}


                        {/* ④テンプレート（一覧+新規保存） - 12日以上で開放 */}
                        {unlockedFeatures.includes(FEATURES.TRAINING_TEMPLATE.id) && !selectedItem && (
                            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                                <button
                                    onClick={() => setShowTemplates(!showTemplates)}
                                    className="w-full flex items-center justify-between mb-3"
                                >
                                    <span className="font-medium text-yellow-800 flex items-center gap-2">
                                        <Icon name="BookTemplate" size={16} />
                                        テンプレート
                                    </span>
                                    <Icon name={showTemplates ? "ChevronUp" : "ChevronDown"} size={16} />
                                </button>

                                {showTemplates && (
                                    <div className="space-y-3">
                                        {/* テンプレート一覧 */}
                                        {supplementTemplates.length > 0 && (
                                            <div className="space-y-2">
                                                {supplementTemplates.map(template => {
                                                    // 総カロリーとPFCを計算
                                                    let totalCalories = 0;
                                                    let totalProtein = 0;
                                                    let totalFat = 0;
                                                    let totalCarbs = 0;

                                                    template.items.forEach(item => {
                                                        totalCalories += item.calories || 0;
                                                        totalProtein += item.protein || 0;
                                                        totalFat += item.fat || 0;
                                                        totalCarbs += item.carbs || 0;
                                                    });

                                                    return (
                                                        <details key={template.id} className="bg-white rounded border">
                                                            <summary className="p-2 cursor-pointer hover:bg-gray-50 rounded">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex-1">
                                                                        <p className="font-medium text-sm">{template.name}</p>
                                                                        <p className="text-xs text-gray-600 mt-0.5">
                                                                            {Math.round(totalCalories)}kcal
                                                                            <span className="text-red-600 ml-2">P:{Math.round(totalProtein)}g</span>
                                                                            <span className="text-yellow-600 ml-1">F:{Math.round(totalFat)}g</span>
                                                                            <span className="text-green-600 ml-1">C:{Math.round(totalCarbs)}g</span>
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 ml-2">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                loadTemplate(template);
                                                                            }}
                                                                            className="p-1 text-blue-500 hover:text-blue-700"
                                                                        >
                                                                            <Icon name="Pencil" size={14} />
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                deleteTemplate(template.id);
                                                                            }}
                                                                            className="p-1 text-red-500 hover:text-red-700"
                                                                        >
                                                                            <Icon name="Trash2" size={14} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </summary>
                                                            <div className="px-2 pb-2 space-y-1">
                                                                {template.items.map((item, idx) => (
                                                                    <div key={idx} className="text-xs text-gray-700 py-1 border-t border-gray-200">
                                                                        <span className="font-medium">{item.name}</span>
                                                                        <span className="text-gray-500 ml-2">{item.amount}</span>
                                                                        <span className="text-xs text-gray-500 ml-2">
                                                                            ({Math.round(item.calories)}kcal
                                                                            <span className="text-red-600 ml-1">P:{Math.round(item.protein)}g</span>
                                                                            <span className="text-yellow-600 ml-1">F:{Math.round(item.fat)}g</span>
                                                                            <span className="text-green-600 ml-1">C:{Math.round(item.carbs)}g</span>)
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </details>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* テンプレート新規保存 */}
                                        {addedItems.length > 0 && (
                                            <div className="pt-3 border-t border-yellow-300">
                                                <p className="text-xs text-yellow-800 mb-2">新しいテンプレートとして保存</p>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={templateName}
                                                        onChange={(e) => setTemplateName(e.target.value)}
                                                        placeholder="テンプレート名（例: 朝の定番サプリ）"
                                                        className="flex-1 px-3 py-2 text-sm border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                                                    />
                                                    <button
                                                        onClick={saveAsTemplate}
                                                        className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition text-sm font-medium"
                                                    >
                                                        保存
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {supplementTemplates.length === 0 && addedItems.length === 0 && (
                                            <p className="text-sm text-gray-600">保存されたテンプレートはありません</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* カスタムアイテム作成 */}
                        {!selectedItem && (
                            <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                                <div className="w-full flex items-center justify-between">
                                    <button
                                        onClick={() => setShowCustomFoodCreator(true)}
                                        className="flex-1 flex items-center gap-2 font-medium text-green-800"
                                    >
                                        <Icon name="Plus" size={16} />
                                        カスタムアイテムを作成
                                    </button>
                                    <button
                                        onClick={() => setShowCustomSupplementForm(!showCustomSupplementForm)}
                                        className="text-green-800 p-1"
                                    >
                                        <Icon name={showCustomSupplementForm ? "ChevronUp" : "ChevronDown"} size={16} />
                                    </button>
                                </div>
                                {showCustomSupplementForm && (
                                    <div className="mt-3 space-y-3 max-h-96 overflow-y-auto">
                                        {/* アイテムタイプ選択 */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">アイテムタイプ</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setCustomSupplementData({...customSupplementData, itemType: 'food'})}
                                                    className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                                                        customSupplementData.itemType === 'food'
                                                            ? 'bg-green-600 text-white'
                                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    }`}
                                                >
                                                    <Icon name="Apple" size={14} className="inline mr-1" />
                                                    食材
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCustomSupplementData({...customSupplementData, itemType: 'recipe'})}
                                                    className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                                                        customSupplementData.itemType === 'recipe'
                                                            ? 'bg-orange-600 text-white'
                                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    }`}
                                                >
                                                    <Icon name="ChefHat" size={14} className="inline mr-1" />
                                                    料理
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCustomSupplementData({...customSupplementData, itemType: 'supplement'})}
                                                    className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                                                        customSupplementData.itemType === 'supplement'
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    }`}
                                                >
                                                    <Icon name="Pill" size={14} className="inline mr-1" />
                                                    サプリ
                                                </button>
                                            </div>
                                        </div>

                                        <input
                                            type="text"
                                            value={customSupplementData.name}
                                            onChange={(e) => setCustomSupplementData({...customSupplementData, name: e.target.value})}
                                            placeholder={
                                                customSupplementData.itemType === 'food' ? '名前（例: 自家製プロテインバー）' :
                                                customSupplementData.itemType === 'recipe' ? '名前（例: 自家製カレー）' :
                                                '名前（例: マルチビタミン）'
                                            }
                                            className="w-full px-3 py-2 text-sm border rounded-lg"
                                        />
                                        <div className="grid grid-cols-2 gap-2">
                                            {customSupplementData.itemType === 'recipe' ? (
                                                <input
                                                    type="text"
                                                    value="料理"
                                                    disabled
                                                    className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-100"
                                                />
                                            ) : (
                                                <select
                                                    value={customSupplementData.category}
                                                    onChange={(e) => setCustomSupplementData({...customSupplementData, category: e.target.value})}
                                                    className="w-full px-3 py-2 text-sm border rounded-lg"
                                                >
                                                    {customSupplementData.itemType === 'supplement' ? (
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
                                                    value={customSupplementData.servingSize}
                                                    onChange={(e) => setCustomSupplementData({...customSupplementData, servingSize: e.target.value === '' ? '' : (parseFloat(e.target.value) || 1)})}
                                                    placeholder="1回分の量"
                                                    className="flex-1 px-3 py-2 text-sm border rounded-lg"
                                                />
                                                <select
                                                    value={customSupplementData.servingUnit}
                                                    onChange={(e) => setCustomSupplementData({...customSupplementData, servingUnit: e.target.value})}
                                                    className="px-3 py-2 text-sm border rounded-lg"
                                                >
                                                    <option value="g">g</option>
                                                    <option value="mg">mg</option>
                                                    <option value="ml">ml</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="border-t pt-2">
                                            <p className="text-xs font-medium text-gray-700 mb-2">基本栄養素（{customSupplementData.servingSize}{customSupplementData.servingUnit}あたり）</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-xs text-gray-600">カロリー (kcal)</label>
                                                    <input type="number" value={customSupplementData.calories} onChange={(e) => setCustomSupplementData({...customSupplementData, calories: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-600">タンパク質 (g)</label>
                                                    <input type="number" value={customSupplementData.protein} onChange={(e) => setCustomSupplementData({...customSupplementData, protein: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-600">脂質 (g)</label>
                                                    <input type="number" value={customSupplementData.fat} onChange={(e) => setCustomSupplementData({...customSupplementData, fat: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-600">炭水化物 (g)</label>
                                                    <input type="number" value={customSupplementData.carbs} onChange={(e) => setCustomSupplementData({...customSupplementData, carbs: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border-t pt-2">
                                            <p className="text-xs font-medium text-gray-700 mb-2">ビタミン（{customSupplementData.servingSize}{customSupplementData.servingUnit}あたり）</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div><label className="text-xs text-gray-600">ビタミンA (μg)</label><input type="number" value={customSupplementData.vitaminA} onChange={(e) => setCustomSupplementData({...customSupplementData, vitaminA: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">ビタミンB1 (mg)</label><input type="number" value={customSupplementData.vitaminB1} onChange={(e) => setCustomSupplementData({...customSupplementData, vitaminB1: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">ビタミンB2 (mg)</label><input type="number" value={customSupplementData.vitaminB2} onChange={(e) => setCustomSupplementData({...customSupplementData, vitaminB2: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">ビタミンB6 (mg)</label><input type="number" value={customSupplementData.vitaminB6} onChange={(e) => setCustomSupplementData({...customSupplementData, vitaminB6: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">ビタミンB12 (μg)</label><input type="number" value={customSupplementData.vitaminB12} onChange={(e) => setCustomSupplementData({...customSupplementData, vitaminB12: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">ビタミンC (mg)</label><input type="number" value={customSupplementData.vitaminC} onChange={(e) => setCustomSupplementData({...customSupplementData, vitaminC: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">ビタミンD (μg)</label><input type="number" value={customSupplementData.vitaminD} onChange={(e) => setCustomSupplementData({...customSupplementData, vitaminD: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">ビタミンE (mg)</label><input type="number" value={customSupplementData.vitaminE} onChange={(e) => setCustomSupplementData({...customSupplementData, vitaminE: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">ビタミンK (μg)</label><input type="number" value={customSupplementData.vitaminK} onChange={(e) => setCustomSupplementData({...customSupplementData, vitaminK: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">ナイアシン (mg)</label><input type="number" value={customSupplementData.niacin} onChange={(e) => setCustomSupplementData({...customSupplementData, niacin: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">パントテン酸 (mg)</label><input type="number" value={customSupplementData.pantothenicAcid} onChange={(e) => setCustomSupplementData({...customSupplementData, pantothenicAcid: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">ビオチン (μg)</label><input type="number" value={customSupplementData.biotin} onChange={(e) => setCustomSupplementData({...customSupplementData, biotin: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">葉酸 (μg)</label><input type="number" value={customSupplementData.folicAcid} onChange={(e) => setCustomSupplementData({...customSupplementData, folicAcid: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                            </div>
                                        </div>

                                        <div className="border-t pt-2">
                                            <p className="text-xs font-medium text-gray-700 mb-2">ミネラル（{customSupplementData.servingSize}{customSupplementData.servingUnit}あたり）</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div><label className="text-xs text-gray-600">ナトリウム (mg)</label><input type="number" value={customSupplementData.sodium} onChange={(e) => setCustomSupplementData({...customSupplementData, sodium: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">カリウム (mg)</label><input type="number" value={customSupplementData.potassium} onChange={(e) => setCustomSupplementData({...customSupplementData, potassium: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">カルシウム (mg)</label><input type="number" value={customSupplementData.calcium} onChange={(e) => setCustomSupplementData({...customSupplementData, calcium: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">マグネシウム (mg)</label><input type="number" value={customSupplementData.magnesium} onChange={(e) => setCustomSupplementData({...customSupplementData, magnesium: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">リン (mg)</label><input type="number" value={customSupplementData.phosphorus} onChange={(e) => setCustomSupplementData({...customSupplementData, phosphorus: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">鉄 (mg)</label><input type="number" value={customSupplementData.iron} onChange={(e) => setCustomSupplementData({...customSupplementData, iron: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">亜鉛 (mg)</label><input type="number" value={customSupplementData.zinc} onChange={(e) => setCustomSupplementData({...customSupplementData, zinc: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">銅 (mg)</label><input type="number" value={customSupplementData.copper} onChange={(e) => setCustomSupplementData({...customSupplementData, copper: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">マンガン (mg)</label><input type="number" value={customSupplementData.manganese} onChange={(e) => setCustomSupplementData({...customSupplementData, manganese: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">ヨウ素 (μg)</label><input type="number" value={customSupplementData.iodine} onChange={(e) => setCustomSupplementData({...customSupplementData, iodine: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">セレン (μg)</label><input type="number" value={customSupplementData.selenium} onChange={(e) => setCustomSupplementData({...customSupplementData, selenium: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">クロム (μg)</label><input type="number" value={customSupplementData.chromium} onChange={(e) => setCustomSupplementData({...customSupplementData, chromium: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">モリブデン (μg)</label><input type="number" value={customSupplementData.molybdenum} onChange={(e) => setCustomSupplementData({...customSupplementData, molybdenum: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                            </div>
                                        </div>

                                        <div className="border-t pt-2">
                                            <p className="text-xs font-medium text-gray-700 mb-2">その他栄養素</p>
                                            {customSupplementData.otherNutrients.map((nutrient, idx) => (
                                                <div key={idx} className="flex gap-1 mb-2">
                                                    <input type="text" value={nutrient.name} onChange={(e) => { const updated = [...customSupplementData.otherNutrients]; updated[idx].name = e.target.value; setCustomSupplementData({...customSupplementData, otherNutrients: updated}); }} placeholder="名" className="flex-1 px-2 py-1 text-xs border rounded" />
                                                    <input type="number" value={nutrient.amount} onChange={(e) => { const updated = [...customSupplementData.otherNutrients]; updated[idx].amount = e.target.value; setCustomSupplementData({...customSupplementData, otherNutrients: updated}); }} placeholder="量" className="w-16 px-2 py-1 text-xs border rounded" />
                                                    <input type="text" value={nutrient.unit} onChange={(e) => { const updated = [...customSupplementData.otherNutrients]; updated[idx].unit = e.target.value; setCustomSupplementData({...customSupplementData, otherNutrients: updated}); }} placeholder="単位" className="w-12 px-1 py-1 text-xs border rounded" />
                                                    <button onClick={() => { const updated = customSupplementData.otherNutrients.filter((_, i) => i !== idx); setCustomSupplementData({...customSupplementData, otherNutrients: updated}); }} className="text-red-500 px-1"><Icon name="X" size={14} /></button>
                                                </div>
                                            ))}
                                            <button onClick={() => setCustomSupplementData({...customSupplementData, otherNutrients: [...customSupplementData.otherNutrients, {name: '', amount: '', unit: ''}]})} className="w-full px-2 py-1.5 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-xs">+ 追加</button>
                                        </div>

                                        <button
                                            onClick={() => {
                                                if (!customSupplementData.name.trim()) {
                                                    alert('サプリメント名を入力してください');
                                                    return;
                                                }
                                                const customSupplement = {
                                                    id: Date.now(),
                                                    ...customSupplementData,
                                                    isCustom: true
                                                };
                                                setSelectedItem(customSupplement);
                                                setCustomSupplementData({
                                                    itemType: 'food',
                                                    name: '', category: 'ビタミン・ミネラル', servingSize: 100, servingUnit: 'g', unit: 'g',
                                                    calories: 0, protein: 0, fat: 0, carbs: 0,
                                                    vitaminA: 0, vitaminB1: 0, vitaminB2: 0, vitaminB6: 0, vitaminB12: 0,
                                                    vitaminC: 0, vitaminD: 0, vitaminE: 0, vitaminK: 0,
                                                    niacin: 0, pantothenicAcid: 0, biotin: 0, folicAcid: 0,
                                                    sodium: 0, potassium: 0, calcium: 0, magnesium: 0, phosphorus: 0,
                                                    iron: 0, zinc: 0, copper: 0, manganese: 0, iodine: 0, selenium: 0, chromium: 0, molybdenum: 0,
                                                    otherNutrients: []
                                                });
                                                setShowCustomSupplementForm(false);
                                            }}
                                            className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                                        >
                                            作成して選択
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ⑤記録ボタン */}
                        {addedItems.length > 0 && !selectedItem && (
                            <button
                                onClick={async () => {
                                    // テンプレート編集モードの場合
                                    if (editingTemplate) {
                                        const updatedTemplate = {
                                            ...editingTemplate,
                                            items: addedItems,
                                            name: mealName || editingTemplate.name
                                        };
                                        await DataService.saveSupplementTemplate(user.uid, updatedTemplate);
                                        alert('テンプレートを更新しました');
                                        onClose();
                                        return;
                                    }

                                    // 通常の記録モード
                                    const newSupplement = {
                                        id: Date.now(),
                                        time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
                                        name: 'サプリメント',
                                        icon: 'Pill',
                                        items: addedItems
                                    };

                                    // テンプレートとして自動保存（テンプレート名があり、テンプレート機能が開放されている場合）
                                    if (templateName && unlockedFeatures.includes(FEATURES.TRAINING_TEMPLATE.id)) {
                                        const template = {
                                            id: Date.now(),
                                            name: templateName,
                                            items: addedItems
                                        };
                                        await DataService.saveSupplementTemplate(user.uid, template);
                                        const templates = await DataService.getSupplementTemplates(user.uid);
                                        setSupplementTemplates(templates);
                                        setTemplateName('');
                                    }

                                    onAdd(newSupplement);
                                }}
                                className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {editingTemplate ? 'テンプレートを更新' : '記録する'}
                            </button>
                        )}
                    </div>
                );
            };

            const renderWorkoutInput = () => {
                const fuzzyMatch = (text, query) => {
                    if (!query || query.trim() === '') return true;
                    const normalize = (str) => {
                        return str
                            .toLowerCase()
                            .replace(/[（）\(\)]/g, '') // 括弧を削除
                            .replace(/[\u3041-\u3096]/g, (m) => String.fromCharCode(m.charCodeAt(0) + 0x60)) // ひらがな→カタカナ
                            .replace(/\s+/g, ''); // 空白削除
                    };
                    const normalizedText = normalize(text);
                    const normalizedQuery = normalize(query);
                    return normalizedText.includes(normalizedQuery);
                };

                useEffect(() => {
                    loadTemplates();
                    // ルーティンからワークアウト自動読み込み
                    if (currentRoutine && !currentRoutine.isRestDay && currentRoutine.exercises) {
                        // ルーティンの最初の種目を自動選択
                        if (currentRoutine.exercises.length > 0) {
                            const firstExercise = currentRoutine.exercises[0];
                            setCurrentExercise(firstExercise.exercise);
                            if (firstExercise.sets && firstExercise.sets.length > 0) {
                                setSets(firstExercise.sets.map(set => ({
                                    ...set,
                                    duration: set.duration || 0
                                })));
                            }
                        }
                    }
                }, []);

                const loadTemplates = async () => {
                    const templates = await DataService.getWorkoutTemplates(user.uid);
                    setWorkoutTemplates(templates);
                };

                const saveAsTemplate = async () => {
                    if (exercises.length === 0 || !templateName.trim()) {
                        alert('テンプレート名を入力し、種目を追加してください');
                        return;
                    }
                    const template = {
                        id: Date.now(),
                        name: templateName,
                        exercises: exercises, // 複数種目を保存
                        createdAt: new Date().toISOString()
                    };
                    await DataService.saveWorkoutTemplate(user.uid, template);
                    setTemplateName('');
                    alert('テンプレートを保存しました');
                    loadTemplates();
                };

                const loadTemplate = (template) => {
                    // 新形式（複数種目）と旧形式（単一種目）の両方に対応
                    if (template.exercises && Array.isArray(template.exercises)) {
                        // 新形式：複数種目を読み込み
                        setExercises(template.exercises);
                        setCurrentExercise(null);
                        setSets([]);
                    } else if (template.exercise) {
                        // 旧形式：単一種目を読み込み
                        setCurrentExercise(template.exercise);
                        setSets(template.sets || []);
                    }
                    setShowTemplates(false);
                };

                const deleteTemplate = async (templateId) => {
                    if (confirm('このテンプレートを削除しますか？')) {
                        await DataService.deleteWorkoutTemplate(user.uid, templateId);
                        loadTemplates();
                    }
                };

                const handleWorkoutSave = async () => {
                    if (exercises.length === 0) {
                        alert('運動を追加してください');
                        return;
                    }

                    // テンプレート編集モードの場合
                    if (editingTemplate) {
                        const updatedTemplate = {
                            ...editingTemplate,
                            exercises: exercises,
                            name: mealName || editingTemplate.name
                        };
                        await DataService.saveWorkoutTemplate(user.uid, updatedTemplate);
                        alert('テンプレートを更新しました');
                        onClose();
                        return;
                    }

                    // テンプレート作成モードの場合（新規）
                    if (isTemplateMode) {
                        if (!templateName.trim()) {
                            alert('テンプレート名を入力してください');
                            return;
                        }
                        const template = {
                            id: Date.now(),
                            name: templateName,
                            exercises: exercises,
                            createdAt: new Date().toISOString()
                        };
                        await DataService.saveWorkoutTemplate(user.uid, template);
                        alert('テンプレートを保存しました');
                        onClose();
                        return;
                    }

                    // 通常の記録モード
                    // 全ての種目を1つのworkoutオブジェクトにまとめる
                    const workoutData = {
                        id: Date.now(),
                        time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
                        name: exercises.length === 1
                            ? (exercises[0].exercise?.name || exercises[0].name)
                            : `${exercises[0].exercise?.category || exercises[0].category}トレーニング`, // 複数種目の場合はカテゴリ名
                        category: exercises[0].exercise?.category || exercises[0].category,
                        exercises: exercises.map(ex => {
                            // 有酸素・ストレッチの場合（exercise プロパティがない）
                            if (ex.exerciseType === 'aerobic' || ex.exerciseType === 'stretch') {
                                return {
                                    exercise: {
                                        name: ex.name,
                                        category: ex.category,
                                        exerciseType: ex.exerciseType
                                    },
                                    exerciseType: ex.exerciseType,
                                    duration: ex.duration,
                                    totalDuration: ex.totalDuration || ex.duration
                                };
                            }

                            // 筋トレの場合（exercise プロパティがある）
                            return {
                                exercise: ex.exercise,
                                exerciseType: ex.exercise?.exerciseType || 'anaerobic',
                                name: ex.exercise.name,
                                sets: ex.sets
                            };
                        })
                    };

                    // 1つのworkoutとして追加
                    onAdd(workoutData);
                    onClose();
                };

                // LocalStorageからカスタム種目を読み込み
                const customExercises = JSON.parse(localStorage.getItem('customExercises') || '[]');

                // exerciseDBとカスタム種目をマージ
                const allExercises = [...exerciseDB, ...customExercises];

                const filteredExercises = allExercises.filter(ex =>
                    fuzzyMatch(ex.name, searchTerm) ||
                    fuzzyMatch(ex.category, searchTerm)
                );

                // セット単位では体積のみを記録
                const calculateSetVolume = (set) => {
                    const weight = set.weight || 0;
                    const reps = set.reps || 0;
                    return weight * reps; // 総体積 (kg × reps)
                };

                return (
                    <div className="space-y-4">
                        {/* ①どうやって記録しますか？ */}
                        {!currentExercise && !showCustomExerciseForm && (
                            <div className="space-y-3">
                                <p className="text-center text-base font-medium text-gray-700 mb-4">どうやって記録しますか？</p>

                                {/* 種目を検索（グレー背景、グレー枠） */}
                                <button
                                    type="button"
                                    onClick={() => setShowSearchModal(true)}
                                    className="w-full bg-gray-100 border-2 border-gray-300 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-200 transition flex items-center gap-4"
                                >
                                    <Icon name="Search" size={32} />
                                    <div className="text-left flex-1">
                                        <div className="font-bold text-base">種目を検索</div>
                                        <div className="text-xs text-gray-500 mt-0.5">データベースから選択</div>
                                    </div>
                                </button>

                                {/* 手動で作成（グレー背景、グレー枠） */}
                                <button
                                    type="button"
                                    onClick={() => setShowCustomExerciseForm(true)}
                                    className="w-full bg-gray-100 border-2 border-gray-300 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-200 transition flex items-center gap-4"
                                >
                                    <Icon name="Plus" size={32} />
                                    <div className="text-left flex-1">
                                        <div className="font-bold text-base">手動で作成</div>
                                        <div className="text-xs text-gray-500 mt-0.5">カスタム種目を登録</div>
                                    </div>
                                </button>

                                {/* テンプレート - 12日以上で開放 */}
                                {unlockedFeatures.includes(FEATURES.TRAINING_TEMPLATE.id) && (
                                    <button
                                        type="button"
                                        onClick={() => setShowTemplates(!showTemplates)}
                                        className="w-full bg-gray-100 border-2 border-gray-300 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-200 transition flex items-center gap-4"
                                    >
                                        <Icon name="BookTemplate" size={32} />
                                        <div className="text-left flex-1">
                                            <div className="font-bold text-base">テンプレート</div>
                                            <div className="text-xs text-gray-500 mt-0.5">保存したワークアウトを呼び出す</div>
                                        </div>
                                    </button>
                                )}
                            </div>
                        )}

                        {/* テンプレートモーダル */}
                        {showTemplates && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                                <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
                                    <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                                        <h3 className="text-lg font-bold">テンプレート</h3>
                                        <button
                                            onClick={() => setShowTemplates(false)}
                                            className="text-gray-500 hover:text-gray-700"
                                        >
                                            <Icon name="X" size={24} />
                                        </button>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        {/* テンプレート一覧 */}
                                        {workoutTemplates.length > 0 ? (
                                            <div className="space-y-2">
                                                {workoutTemplates.map(template => {
                                                    // 総重量と総時間を計算
                                                    let totalWeight = 0;
                                                    let totalDuration = 0;

                                                    template.exercises?.forEach(exercise => {
                                                        exercise.sets?.forEach(set => {
                                                            totalWeight += (set.weight || 0) * (set.reps || 0);
                                                            totalDuration += set.duration || 0;
                                                        });
                                                    });

                                                    return (
                                                        <details key={template.id} className="bg-gray-50 rounded-lg border border-gray-200">
                                                            <summary className="p-3 cursor-pointer hover:bg-gray-100 rounded-lg list-none">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <div className="flex-1">
                                                                        <p className="font-medium">{template.name}</p>
                                                                        <p className="text-xs text-gray-600 mt-1">
                                                                            <span className="text-orange-600">総重量: {totalWeight}kg</span>
                                                                            <span className="text-orange-600 ml-2">総時間: {totalDuration}分</span>
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 ml-2">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                loadTemplate(template);
                                                                                setShowTemplates(false);
                                                                            }}
                                                                            className="p-2 text-blue-500 hover:text-blue-700"
                                                                            title="編集"
                                                                        >
                                                                            <Icon name="Pencil" size={16} />
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                deleteTemplate(template.id);
                                                                            }}
                                                                            className="p-2 text-red-500 hover:text-red-700"
                                                                            title="削除"
                                                                            >
                                                                            <Icon name="Trash2" size={16} />
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {/* 追加ボタン */}
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        // テンプレートのすべての運動を追加
                                                                        setExercises([...exercises, ...template.exercises]);
                                                                        setShowTemplates(false);
                                                                    }}
                                                                    className="w-full py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm font-medium"
                                                                >
                                                                    このテンプレートを追加
                                                                </button>
                                                            </summary>

                                                            {/* 運動一覧（折りたたみ） */}
                                                            <div className="px-3 pb-3 pt-2 space-y-2 border-t border-gray-200">
                                                                {template.exercises?.map((exercise, exIdx) => (
                                                                    <div key={exIdx} className="text-sm pt-2">
                                                                        <p className="font-medium text-gray-800">{exercise.name}</p>
                                                                        <div className="ml-2 mt-1 space-y-1">
                                                                            {exercise.sets?.map((set, setIdx) => (
                                                                                <p key={setIdx} className="text-xs text-gray-600">
                                                                                    セット{setIdx + 1}: {set.weight || 0}kg × {set.reps || 0}回
                                                                                    {set.duration > 0 && ` (${set.duration}分)`}
                                                                                </p>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </details>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500 text-center py-8">保存されたテンプレートはありません</p>
                                        )}

                                        {/* テンプレート新規保存 */}
                                        {exercises.length > 0 && (
                                            <div className="pt-3 border-t border-gray-200">
                                                <p className="text-sm font-medium mb-2">新しいテンプレートとして保存</p>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={templateName}
                                                        onChange={(e) => setTemplateName(e.target.value)}
                                                        placeholder="テンプレート名（例: 胸トレ1）"
                                                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            saveAsTemplate();
                                                            setShowTemplates(false);
                                                        }}
                                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
                                                    >
                                                        保存
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 検索モーダル */}
                        {showSearchModal && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                                <div className="bg-white rounded-lg max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
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
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                        />

                                        {/* 筋トレ/有酸素/ストレッチ タブ */}
                                        <div className="grid grid-cols-3 mt-3 border-b border-gray-200">
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
                                        <div className="space-y-2">
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
                                                        {/* 部位ヘッダー（第1階層） */}
                                                        <div className="bg-white">
                                                            <div className="border-t border-gray-200">
                                                                {/* 部位ボタン */}
                                                                <button
                                                                    onClick={() => setExpandedCategories(prev => ({...prev, [category]: !prev[category]}))}
                                                                    className="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100 flex justify-between items-center"
                                                                >
                                                                    <span className="font-medium text-sm">{category}</span>
                                                                    <Icon name={expandedCategories[category] ? 'ChevronDown' : 'ChevronRight'} size={18} />
                                                                </button>

                                                                {/* 部位を展開したら種類（サブカテゴリ）を表示 */}
                                                                {expandedCategories[category] && (
                                                                    <div className="bg-gray-50">
                                                                        {Object.keys(categorizedExercises[category]).map(subcategory => (
                                                                            <div key={subcategory}>
                                                                                {/* 種類ボタン（第2階層） */}
                                                                                <button
                                                                                    onClick={() => setExpandedCategories(prev => ({...prev, [category + '_' + subcategory]: !prev[category + '_' + subcategory]}))}
                                                                                    className="w-full px-4 py-2 bg-white hover:bg-gray-50 flex justify-between items-center border-t border-gray-200"
                                                                                >
                                                                                    <span className="text-sm text-gray-700 pl-4">{subcategory}</span>
                                                                                    <Icon name={expandedCategories[category + '_' + subcategory] ? 'ChevronDown' : 'ChevronRight'} size={16} />
                                                                                </button>

                                                                                {/* 種類を展開したらアイテム一覧を表示 */}
                                                                                {expandedCategories[category + '_' + subcategory] && (
                                                                                    <div className="p-2 space-y-1 bg-gray-50">
                                                                                        {categorizedExercises[category][subcategory].map(exercise => (
                                                                                            <button
                                                                                                key={exercise.id}
                                                                                                onClick={() => {
                                                                                                    setCurrentExercise(exercise);
                                                                                                    setShowSearchModal(false);
                                                                                                }}
                                                                                                className="w-full text-left px-3 py-3 hover:bg-orange-50 transition border-b last:border-b-0 border-gray-100 bg-white rounded"
                                                                                            >
                                                                                                <div className="flex justify-between items-center">
                                                                                                    <div>
                                                                                                        <p className="font-medium text-sm">{exercise.name}</p>
                                                                                                        <p className="text-xs text-gray-500">{exercise.equipment}</p>
                                                                                                    </div>
                                                                                                    <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                                                                                                        {exercise.difficulty}
                                                                                                    </span>
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
                            </div>
                        )}

                        {/* カスタム種目作成フォーム */}
                        {showCustomExerciseForm && (
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-300">
                                <h4 className="font-bold mb-3">カスタム種目を作成</h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">種目名</label>
                                        <input
                                            type="text"
                                            value={customExerciseData.name}
                                            onChange={(e) => setCustomExerciseData({...customExerciseData, name: e.target.value})}
                                            placeholder="例: マイトレーニング"
                                            className="w-full px-3 py-2 border rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">カテゴリ</label>
                                        <select
                                            value={customExerciseData.category}
                                            onChange={(e) => setCustomExerciseData({...customExerciseData, category: e.target.value})}
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
                                        <label className="block text-sm font-medium mb-1">種類</label>
                                        <select
                                            value={customExerciseData.subcategory}
                                            onChange={(e) => setCustomExerciseData({...customExerciseData, subcategory: e.target.value})}
                                            className="w-full px-3 py-2 border rounded-lg"
                                        >
                                            <option value="コンパウンド">コンパウンド</option>
                                            <option value="アイソレーション">アイソレーション</option>
                                            <option value="持久系">持久系</option>
                                            <option value="HIIT">HIIT</option>
                                            <option value="ダイナミックストレッチ">ダイナミックストレッチ</option>
                                            <option value="スタティックストレッチ">スタティックストレッチ</option>
                                        </select>
                                    </div>

                                    {/* 保存方法選択 */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <label className="text-sm font-medium text-gray-700">保存方法</label>
                                            <button
                                                type="button"
                                                onClick={() => setShowExerciseSaveMethodInfo(true)}
                                                className="text-blue-600 hover:text-blue-700"
                                            >
                                                <Icon name="Info" size={16} />
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                                                <input
                                                    type="radio"
                                                    name="exerciseSaveMethod"
                                                    value="database"
                                                    checked={exerciseSaveMethod === 'database'}
                                                    onChange={(e) => setExerciseSaveMethod(e.target.value)}
                                                    className="mt-0.5"
                                                />
                                                <div className="flex-1">
                                                    <div className="font-medium text-sm text-gray-900">データベースに保存</div>
                                                    <div className="text-xs text-gray-600 mt-0.5">後で検索して使用できます</div>
                                                </div>
                                            </label>
                                            <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                                                <input
                                                    type="radio"
                                                    name="exerciseSaveMethod"
                                                    value="addToList"
                                                    checked={exerciseSaveMethod === 'addToList'}
                                                    onChange={(e) => setExerciseSaveMethod(e.target.value)}
                                                    className="mt-0.5"
                                                />
                                                <div className="flex-1">
                                                    <div className="font-medium text-sm text-gray-900">リストに追加</div>
                                                    <div className="text-xs text-gray-600 mt-0.5">今すぐ種目選択されます</div>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={async () => {
                                                if (!customExerciseData.name.trim()) {
                                                    alert('種目名を入力してください');
                                                    return;
                                                }

                                                const customExercise = {
                                                    id: Date.now(),
                                                    name: customExerciseData.name,
                                                    category: customExerciseData.category,
                                                    subcategory: customExerciseData.subcategory,
                                                    exerciseType: 'anaerobic',
                                                    isCustom: true
                                                };

                                                // LocalStorageにカスタム種目を保存
                                                try {
                                                    const savedExercises = JSON.parse(localStorage.getItem('customExercises') || '[]');
                                                    savedExercises.push(customExercise);
                                                    localStorage.setItem('customExercises', JSON.stringify(savedExercises));
                                                    console.log('カスタム種目を保存:', customExercise);
                                                } catch (error) {
                                                    console.error('カスタム種目の保存に失敗:', error);
                                                }

                                                // 保存方法に応じて処理を分岐
                                                if (exerciseSaveMethod === 'addToList') {
                                                    // リストに追加: 種目を選択状態にする
                                                    setCurrentExercise(customExercise);
                                                    alert('カスタム種目を作成し、選択しました！');
                                                } else {
                                                    // データベースに保存のみ
                                                    alert('カスタム種目を保存しました！種目検索から追加できます。');
                                                }

                                                setShowCustomExerciseForm(false);
                                                setCustomExerciseData({ name: '', category: '胸', subcategory: 'コンパウンド' });
                                                setExerciseSaveMethod('database'); // デフォルトに戻す
                                            }}
                                            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-medium"
                                        >
                                            {exerciseSaveMethod === 'addToList' ? '保存して選択' : '保存'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowCustomExerciseForm(false);
                                                setCustomExerciseData({ name: '', category: '胸', subcategory: 'コンパウンド' });
                                                setExerciseSaveMethod('database'); // デフォルトに戻す
                                            }}
                                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                                        >
                                            キャンセル
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 保存方法説明モーダル */}
                        {showExerciseSaveMethodInfo && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 z-[10003] flex items-center justify-center p-4">
                                <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
                                    <div className="sticky top-0 bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center z-10">
                                        <h3 className="font-bold">保存方法について</h3>
                                        <button
                                            onClick={() => setShowExerciseSaveMethodInfo(false)}
                                            className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
                                        >
                                            <Icon name="X" size={20} />
                                        </button>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <div className="border-l-4 border-blue-500 pl-4 py-2">
                                            <h4 className="font-semibold text-gray-900 mb-1">データベースに保存</h4>
                                            <p className="text-sm text-gray-700">
                                                カスタム種目をデータベースに保存します。今すぐ記録には追加されませんが、次回以降、種目検索から簡単に見つけて使用できます。
                                            </p>
                                            <p className="text-xs text-gray-600 mt-2">
                                                <strong>使用例：</strong>よく行う自己流トレーニングを登録しておきたい場合
                                            </p>
                                        </div>

                                        <div className="border-l-4 border-green-500 pl-4 py-2">
                                            <h4 className="font-semibold text-gray-900 mb-1">リストに追加</h4>
                                            <p className="text-sm text-gray-700">
                                                カスタム種目をデータベースに保存し、同時に種目選択状態にします。今すぐ記録したい場合に便利です。
                                            </p>
                                            <p className="text-xs text-gray-600 mt-2">
                                                <strong>使用例：</strong>新しい種目を作成してすぐに記録したい場合
                                            </p>
                                        </div>

                                        <button
                                            onClick={() => setShowExerciseSaveMethodInfo(false)}
                                            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                                        >
                                            閉じる
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 種目選択後の入力フォーム */}
                        {currentExercise && (
                            <div className="space-y-4">
                                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-bold text-lg">{currentExercise.name}</h4>
                                            <p className="text-sm text-gray-600">{currentExercise.category}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setCurrentExercise(null);
                                                setSets([]);
                                            }}
                                            className="text-gray-500 hover:text-gray-700"
                                        >
                                            <Icon name="X" size={20} />
                                        </button>
                                    </div>
                                </div>

                                {/* ストレッチ・有酸素種目の場合：時間のみ入力 */}
                                {(currentExercise.exerciseType === 'stretch' || currentExercise.exerciseType === 'aerobic') ? (
                                    <div className="space-y-3">
                                        {/* 総時間入力 */}
                                        <div>
                                            <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                                                総時間 (分)
                                            </label>
                                            <div className="mb-3">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="120"
                                                    step="1"
                                                    value={currentSet.duration || 0}
                                                    onChange={(e) => setCurrentSet({...currentSet, duration: Number(e.target.value)})}
                                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                                    style={{
                                                        background: `linear-gradient(to right, #2563eb 0%, #2563eb ${((currentSet.duration || 0)/120)*100}%, #e5e7eb ${((currentSet.duration || 0)/120)*100}%, #e5e7eb 100%)`
                                                    }}
                                                />
                                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                    <span onClick={() => setCurrentSet({...currentSet, duration: 0})} className="cursor-pointer hover:text-blue-600 hover:font-bold transition">0分</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, duration: 30})} className="cursor-pointer hover:text-blue-600 hover:font-bold transition">30分</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, duration: 60})} className="cursor-pointer hover:text-blue-600 hover:font-bold transition">60分</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, duration: 90})} className="cursor-pointer hover:text-blue-600 hover:font-bold transition">90分</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, duration: 120})} className="cursor-pointer hover:text-blue-600 hover:font-bold transition">120分</span>
                                                </div>
                                            </div>
                                            <input
                                                type="number"
                                                value={currentSet.duration || 0}
                                                onChange={(e) => setCurrentSet({...currentSet, duration: Number(e.target.value)})}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            />
                                        </div>

                                        {/* セット追加ボタン */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!currentSet.duration || currentSet.duration === 0) {
                                                    alert('時間を入力してください');
                                                    return;
                                                }
                                                setSets([...sets, {...currentSet}]);
                                                setCurrentSet({ duration: currentSet.duration });
                                            }}
                                            className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                                        >
                                            <Icon name="Plus" size={18} />
                                            セットを追加
                                        </button>

                                        {/* 追加済みセットリスト */}
                                        {sets.length > 0 && (
                                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                                <p className="text-xs font-bold text-blue-700 mb-2">追加済み（{sets.length}セット）</p>
                                                <div className="space-y-1">
                                                    {sets.map((set, idx) => (
                                                        <div key={idx} className="flex justify-between items-center text-sm bg-white p-2 rounded">
                                                            <span className="font-medium">セット{idx + 1}</span>
                                                            <span className="text-gray-600">{set.duration}分</span>
                                                            <button
                                                                onClick={() => setSets(sets.filter((_, i) => i !== idx))}
                                                                className="text-red-500 hover:text-red-700"
                                                            >
                                                                <Icon name="X" size={16} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {/* 通常の運動：重量・回数・可動距離入力 */}
                                        {/* 重量入力 */}
                                        <div>
                                        <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                                            重量 (kg)
                                            </label>
                                            {/* スライダー - 重量 */}
                                            <div className="mb-3">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="500"
                                                    step="2.5"
                                                    value={currentSet.weight || 0}
                                                    onChange={(e) => setCurrentSet({...currentSet, weight: e.target.value === '' ? 0 : Number(e.target.value)})}
                                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                                                    style={{
                                                        background: `linear-gradient(to right, #ea580c 0%, #ea580c ${((currentSet.weight || 0)/500)*100}%, #e5e7eb ${((currentSet.weight || 0)/500)*100}%, #e5e7eb 100%)`
                                                    }}
                                                />
                                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                    <span onClick={() => setCurrentSet({...currentSet, weight: 0})} className="cursor-pointer hover:text-orange-600 hover:font-bold transition">0kg</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, weight: 100})} className="cursor-pointer hover:text-orange-600 hover:font-bold transition">100kg</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, weight: 200})} className="cursor-pointer hover:text-orange-600 hover:font-bold transition">200kg</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, weight: 300})} className="cursor-pointer hover:text-orange-600 hover:font-bold transition">300kg</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, weight: 400})} className="cursor-pointer hover:text-orange-600 hover:font-bold transition">400kg</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, weight: 500})} className="cursor-pointer hover:text-orange-600 hover:font-bold transition">500kg</span>
                                                </div>
                                            </div>
                                            <input
                                                type="number"
                                                value={currentSet.weight || 0}
                                                onChange={(e) => setCurrentSet({...currentSet, weight: e.target.value === '' ? 0 : Number(e.target.value)})}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                            />
                                            {/* 増減ボタン */}
                                            <div className="grid grid-cols-6 gap-1 mt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, weight: Math.max(0, Number(currentSet.weight) - 10)})}
                                                    className="py-1.5 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200 font-medium"
                                                >
                                                    -10
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, weight: Math.max(0, Number(currentSet.weight) - 5)})}
                                                    className="py-1.5 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 font-medium"
                                                >
                                                    -5
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, weight: Math.max(0, Number(currentSet.weight) - 2.5)})}
                                                    className="py-1.5 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 font-medium"
                                                >
                                                    -2.5
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, weight: Number(currentSet.weight) + 2.5})}
                                                    className="py-1.5 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100 font-medium"
                                                >
                                                    +2.5
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, weight: Number(currentSet.weight) + 5})}
                                                    className="py-1.5 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100 font-medium"
                                                >
                                                    +5
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, weight: Number(currentSet.weight) + 10})}
                                                    className="py-1.5 bg-green-100 text-green-600 rounded text-xs hover:bg-green-200 font-medium"
                                                >
                                                    +10
                                                </button>
                                            </div>
                                    </div>

                                    {/* 回数入力 */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            回数
                                        </label>
                                            {/* スライダー - 回数 */}
                                            <div className="mb-2">
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="50"
                                                    step="1"
                                                    value={currentSet.reps || 1}
                                                    onChange={(e) => setCurrentSet({...currentSet, reps: e.target.value === '' ? 1 : Number(e.target.value)})}
                                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                                                    style={{
                                                        background: `linear-gradient(to right, #ea580c 0%, #ea580c ${((currentSet.reps || 1)/50)*100}%, #e5e7eb ${((currentSet.reps || 1)/50)*100}%, #e5e7eb 100%)`
                                                    }}
                                                />
                                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                    <span onClick={() => setCurrentSet({...currentSet, reps: 1})} className="cursor-pointer hover:text-orange-600 hover:font-bold transition">1回</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, reps: 10})} className="cursor-pointer hover:text-orange-600 hover:font-bold transition">10回</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, reps: 20})} className="cursor-pointer hover:text-orange-600 hover:font-bold transition">20回</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, reps: 30})} className="cursor-pointer hover:text-orange-600 hover:font-bold transition">30回</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, reps: 40})} className="cursor-pointer hover:text-orange-600 hover:font-bold transition">40回</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, reps: 50})} className="cursor-pointer hover:text-orange-600 hover:font-bold transition">50回</span>
                                                </div>
                                            </div>
                                            <input
                                                type="number"
                                                value={currentSet.reps || 1}
                                                onChange={(e) => setCurrentSet({...currentSet, reps: e.target.value === '' ? 1 : Number(e.target.value)})}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                            />
                                            {/* 増減ボタン */}
                                            <div className="grid grid-cols-6 gap-1 mt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, reps: Math.max(1, Number(currentSet.reps) - 5)})}
                                                    className="py-1.5 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200 font-medium"
                                                >
                                                    -5
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, reps: Math.max(1, Number(currentSet.reps) - 3)})}
                                                    className="py-1.5 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 font-medium"
                                                >
                                                    -3
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, reps: Math.max(1, Number(currentSet.reps) - 1)})}
                                                    className="py-1.5 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 font-medium"
                                                >
                                                    -1
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, reps: Number(currentSet.reps) + 1})}
                                                    className="py-1.5 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100 font-medium"
                                                >
                                                    +1
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, reps: Number(currentSet.reps) + 3})}
                                                    className="py-1.5 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100 font-medium"
                                                >
                                                    +3
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, reps: Number(currentSet.reps) + 5})}
                                                    className="py-1.5 bg-green-100 text-green-600 rounded text-xs hover:bg-green-200 font-medium"
                                                >
                                                    +5
                                                </button>
                                            </div>
                                    </div>

                                    {/* RM更新記録（構造化） */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                                            RM更新記録（任意）
                                            <button
                                                type="button"
                                                onClick={() => setWorkoutInfoModal({
                                                    show: true,
                                                    title: 'RM更新記録とは？',
                                                    content: `この種目で自己ベスト（RM: Repetition Maximum）を更新した場合に記録します。

【RMとは】
• 1RM: 1回だけ挙げられる最大重量
• 5RM: 5回だけ挙げられる最大重量
• 10RM: 10回だけ挙げられる最大重量

【記録例】
• ベンチプレス 1RM × 100kg
• スクワット 5RM × 120kg
• デッドリフト 3RM × 150kg

【活用方法】
履歴画面でRM更新の記録を確認でき、筋力の成長を可視化できます。目標達成のモチベーション維持に役立ちます。

【入力方法】
RM回数と重量を別々に入力してください。`
                                                })}
                                                className="text-indigo-600 hover:text-indigo-800"
                                            >
                                                <Icon name="Info" size={14} />
                                            </button>
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-xs text-gray-600 block mb-1">RM回数</label>
                                                <input
                                                    type="number"
                                                    value={currentSet.rm || ''}
                                                    onChange={(e) => setCurrentSet({...currentSet, rm: e.target.value === '' ? '' : Number(e.target.value)})}
                                                    placeholder="1, 3, 5..."
                                                    className="w-full px-3 py-2 border rounded-lg text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-600 block mb-1">重量 (kg)</label>
                                                <input
                                                    type="number"
                                                    value={currentSet.rmWeight || ''}
                                                    onChange={(e) => setCurrentSet({...currentSet, rmWeight: e.target.value === '' ? '' : Number(e.target.value)})}
                                                    placeholder="100"
                                                    className="w-full px-3 py-2 border rounded-lg text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 総時間（常設） */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                                            総時間 (分)
                                            <button
                                                type="button"
                                                onClick={() => setWorkoutInfoModal({
                                                    show: true,
                                                    title: '総時間とは？',
                                                    content: `この種目に費やした総時間を分単位で入力します。ウォームアップからクールダウンまでの全体時間です。

【入力の目安】
• 筋トレ: 5～15分/種目（セット間休憩含む）
• 有酸素運動: 実施した時間（例: ランニング30分）
• ストレッチ: 実施した時間

【意図】
総時間は、セット間の休憩時間や準備動作も含めた総合的な運動時間を把握するための指標です。特に有酸素運動や持久系トレーニングでは重要な入力項目となります。

【オプション】
この項目は任意入力です。空欄の場合は他のパラメータから消費カロリーを算出します。`
                                                })}
                                                className="text-indigo-600 hover:text-indigo-800"
                                            >
                                                <Icon name="Info" size={14} />
                                            </button>
                                        </label>
                                        <input
                                            type="number"
                                            value={currentSet.duration}
                                            onChange={(e) => setCurrentSet({...currentSet, duration: e.target.value === '' ? '' : Number(e.target.value)})}
                                            placeholder="この種目にかかった時間"
                                            className="w-full px-3 py-2 border rounded-lg"
                                        />
                                    </div>

                                    {/* セット追加ボタン（筋トレのみ：アップセット/メインセット） */}
                                    {currentExercise.exerciseType === 'anaerobic' ? (
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => {
                                                    setSets([...sets, { ...currentSet, setType: 'warmup' }]);
                                                }}
                                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2"
                                            >
                                                <Icon name="Zap" size={20} />
                                                <span>アップセット追加</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSets([...sets, { ...currentSet, setType: 'main' }]);
                                                }}
                                                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center justify-center gap-2"
                                            >
                                                <Icon name="Plus" size={20} />
                                                <span>メインセット追加</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setSets([...sets, { ...currentSet }]);
                                            }}
                                            className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center justify-center gap-2"
                                        >
                                            <Icon name="Plus" size={20} />
                                            <span>セット追加</span>
                                        </button>
                                    )}

                                    {sets.length > 0 && (
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <p className="text-sm font-medium mb-2">セット一覧</p>
                                            {sets.map((set, index) => (
                                                <div key={index} className="border-b border-gray-200 py-2 text-sm last:border-0">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium">Set {index + 1}</span>
                                                            {currentExercise.exerciseType === 'anaerobic' && (
                                                                <>
                                                                    {set.setType === 'warmup' ? (
                                                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                                                            アップ
                                                                        </span>
                                                                    ) : (
                                                                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                                                                            メイン
                                                                        </span>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() => setSets(sets.filter((_, i) => i !== index))}
                                                            className="text-red-500 hover:text-red-700 p-1"
                                                        >
                                                            <Icon name="Trash2" size={16} />
                                                        </button>
                                                    </div>
                                                    <div className="text-xs text-gray-600 space-y-0.5">
                                                        {currentExercise.exerciseType === 'anaerobic' ? (
                                                            <>
                                                                <div><span>重量: {set.weight}kg</span></div>
                                                                <div><span>回数: {set.reps}回</span></div>
                                                                <div><span>体積: {calculateSetVolume(set)} kg×reps</span></div>
                                                                {set.rm && set.rmWeight && (
                                                                    <div className="text-orange-600 font-medium">
                                                                        <span>🏆 RM更新: {set.rm}RM × {set.rmWeight}kg</span>
                                                                    </div>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <div><span>時間: {set.duration || 0}分</span></div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {currentExercise.exerciseType === 'anaerobic' && (
                                                <div className="border-t mt-2 pt-2 space-y-1">
                                                    <div className="flex justify-between text-sm text-gray-600">
                                                        <span>総体積</span>
                                                        <span>{sets.reduce((sum, s) => sum + calculateSetVolume(s), 0)} kg×reps</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                )}

                                <button
                                    onClick={() => {
                                        if (sets.length === 0) return;

                                        // 有酸素・ストレッチの場合は、種目名と総時間のみ記録
                                        let newExercise;
                                        if (currentExercise.exerciseType === 'aerobic' || currentExercise.exerciseType === 'stretch') {
                                            // 総時間を計算
                                            const totalDuration = sets.reduce((sum, set) => sum + (set.duration || 0), 0);
                                            newExercise = {
                                                exercise: currentExercise,
                                                duration: totalDuration, // 総時間のみ
                                                totalDuration: totalDuration,
                                                exerciseType: currentExercise.exerciseType
                                            };
                                        } else {
                                            // 筋トレの場合は従来通り（セット詳細を含む）
                                            newExercise = {
                                                exercise: currentExercise,
                                                sets: sets,
                                                exerciseType: currentExercise.exerciseType
                                            };
                                        }

                                        setExercises([...exercises, newExercise]);
                                        setCurrentExercise(null);
                                        setSets([]);
                                    }}
                                    disabled={sets.length === 0}
                                    className="w-full bg-orange-600 text-white font-bold py-3 rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    種目を追加
                                </button>
                            </div>
                        )}

                        {/* 追加済み種目リスト */}
                        {exercises.length > 0 && !currentExercise && (
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <p className="text-sm font-bold text-blue-700 mb-3">追加済み（{exercises.length}種目）</p>

                                {/* 種目一覧 */}
                                <div className="space-y-2 mb-3">
                                    {exercises.map((ex, index) => {
                                        // 有酸素・ストレッチの場合は総時間のみ、筋トレの場合は総重量も計算
                                        const isCardioOrStretch = ex.exerciseType === 'aerobic' || ex.exerciseType === 'stretch';

                                        let totalVolume = 0;
                                        let totalDuration = 0;

                                        if (isCardioOrStretch) {
                                            // 有酸素・ストレッチ: durationのみ
                                            totalDuration = ex.duration || 0;
                                        } else {
                                            // 筋トレ: setsから計算
                                            totalVolume = ex.sets.reduce((sum, set) => {
                                                return sum + (set.weight || 0) * (set.reps || 0);
                                            }, 0);
                                            totalDuration = ex.sets.reduce((sum, set) => {
                                                return sum + (set.duration || 0);
                                            }, 0);
                                        }

                                        // RM更新があるかチェック
                                        const rmUpdates = !isCardioOrStretch && ex.sets ? ex.sets.filter(set => set.rm && set.rmWeight) : [];

                                        return (
                                            <div key={index} className="bg-white p-3 rounded-lg border border-gray-200">
                                                <div className="flex justify-between items-start mb-1">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-sm">{ex.exercise.name}</p>
                                                        {isCardioOrStretch ? (
                                                            <p className="text-xs text-gray-600">{totalDuration}分</p>
                                                        ) : (
                                                            <>
                                                                <p className="text-xs text-gray-600">{ex.sets.length}セット - {totalVolume}kg</p>
                                                                {rmUpdates.length > 0 && (
                                                                    <p className="text-xs text-orange-600 font-medium">
                                                                        🏆 {rmUpdates.map(s => `${s.rm}RM×${s.rmWeight}kg`).join(', ')}
                                                                    </p>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => {
                                                                // 編集：該当種目をcurrentExerciseに戻す
                                                                setCurrentExercise(ex.exercise);
                                                                if (isCardioOrStretch) {
                                                                    // 有酸素・ストレッチは時間を1セットとして扱う
                                                                    setSets([{ duration: ex.duration }]);
                                                                } else {
                                                                    setSets(ex.sets);
                                                                }
                                                                setExercises(exercises.filter((_, i) => i !== index));
                                                            }}
                                                            className="text-blue-600 hover:text-blue-800"
                                                        >
                                                            <Icon name="Edit2" size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => setExercises(exercises.filter((_, i) => i !== index))}
                                                            className="text-red-500 hover:text-red-700"
                                                        >
                                                            <Icon name="Trash2" size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* 総重量・総時間の表示 */}
                                <div className="grid grid-cols-2 gap-4 p-3 bg-white rounded-lg border border-gray-200 mb-3">
                                    {/* 総重量: 筋トレのみ表示 */}
                                    {exercises.some(ex => ex.exerciseType === 'anaerobic') && (
                                        <div className="text-center">
                                            <p className="text-xs text-gray-600 mb-1">総重量</p>
                                            <p className="text-lg font-bold text-orange-600">
                                                {exercises.reduce((sum, ex) => {
                                                    if (ex.exerciseType === 'anaerobic' && ex.sets) {
                                                        return sum + ex.sets.reduce((setSum, set) => {
                                                            return setSum + (set.weight || 0) * (set.reps || 0);
                                                        }, 0);
                                                    }
                                                    return sum;
                                                }, 0)}kg
                                            </p>
                                        </div>
                                    )}
                                    {/* 総時間: すべての種目で表示 */}
                                    <div className="text-center">
                                        <p className="text-xs text-gray-600 mb-1">総時間</p>
                                        <p className="text-lg font-bold text-blue-600">
                                            {exercises.reduce((sum, ex) => {
                                                if (ex.exerciseType === 'aerobic' || ex.exerciseType === 'stretch') {
                                                    // 有酸素・ストレッチ: durationを直接加算
                                                    return sum + (ex.duration || 0);
                                                } else if (ex.sets) {
                                                    // 筋トレ: setsから計算
                                                    return sum + ex.sets.reduce((setSum, set) => {
                                                        return setSum + (set.duration || 0);
                                                    }, 0);
                                                }
                                                return sum;
                                            }, 0)}分
                                        </p>
                                    </div>
                                </div>

                                {/* 種目を追加ボタン */}
                                <button
                                    onClick={() => setShowSearchModal(true)}
                                    className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition mb-2"
                                >
                                    種目を追加
                                </button>

                                {/* テンプレート名入力（テンプレートモード時） */}
                                {(isTemplateMode || editingTemplate) && (
                                    <div>
                                        <label className="block text-sm font-medium mb-2">テンプレート名</label>
                                        <input
                                            type="text"
                                            value={templateName}
                                            onChange={(e) => setTemplateName(e.target.value)}
                                            placeholder="例: 胸トレ1"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                        />
                                    </div>
                                )}

                                {/* 記録ボタン */}
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={handleWorkoutSave}
                                        className="bg-orange-600 text-white font-bold py-3 rounded-lg hover:bg-orange-700 transition"
                                    >
                                        {(isTemplateMode || editingTemplate) ? 'テンプレートを保存' : '記録'}
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="bg-gray-300 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-400 transition"
                                    >
                                        キャンセル
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            };

// ========== 運動記録コンポーネント終了 ==========

            const renderFoodInput = () => {

                // 曖昧検索用のヘルパー関数
                const fuzzyMatch = (text, query) => {
                    if (!query || query.trim() === '') return true;
                    // ひらがな、カタカナ、漢字の正規化
                    const normalize = (str) => {
                        return str
                            .toLowerCase()
                            .replace(/[（）\(\)]/g, '') // 括弧を削除
                            .replace(/[\u3041-\u3096]/g, (m) => String.fromCharCode(m.charCodeAt(0) + 0x60)) // ひらがな→カタカナ
                            .replace(/\s+/g, ''); // 空白削除
                    };
                    const normalizedText = normalize(text);
                    const normalizedQuery = normalize(query);
                    return normalizedText.includes(normalizedQuery);
                };

                // Helper function to map foodDatabase format to tracking format
                const mapNutrients = (food) => {
                    const vitamins = {
                        A: food.vitaminA || 0,
                        D: food.vitaminD || 0,
                        E: food.vitaminE || 0,
                        K: food.vitaminK || 0,
                        B1: food.vitaminB1 || 0,
                        B2: food.vitaminB2 || 0,
                        B3: food.niacin || 0,
                        B5: food.pantothenicAcid || 0,
                        B6: food.vitaminB6 || 0,
                        B7: food.biotin || 0,
                        B9: food.folicAcid || 0,
                        B12: food.vitaminB12 || 0,
                        C: food.vitaminC || 0
                    };
                    const minerals = {
                        calcium: food.calcium || 0,
                        iron: food.iron || 0,
                        magnesium: food.magnesium || 0,
                        phosphorus: food.phosphorus || 0,
                        potassium: food.potassium || 0,
                        sodium: food.sodium || 0,
                        zinc: food.zinc || 0,
                        copper: food.copper || 0,
                        manganese: food.manganese || 0,
                        selenium: food.selenium || 0,
                        iodine: food.iodine || 0,
                        chromium: food.chromium || 0
                    };
                    return {
                        vitamins,
                        minerals,
                        caffeine: food.caffeine || 0,
                        catechin: food.catechin || 0,
                        tannin: food.tannin || 0,
                        polyphenol: food.polyphenol || 0,
                        chlorogenicAcid: food.chlorogenicAcid || 0,
                        creatine: food.creatine || 0,
                        lArginine: food.lArginine || 0,
                        lCarnitine: food.lCarnitine || 0,
                        EPA: food.EPA || 0,
                        DHA: food.DHA || 0,
                        coQ10: food.coQ10 || 0,
                        lutein: food.lutein || 0,
                        astaxanthin: food.astaxanthin || 0
                    };
                };

                // 食材名を正規化する関数（カタカナ→ひらがな、括弧内を除外）
                const normalizeFoodName = (name) => {
                    if (!name) return '';

                    // カタカナをひらがなに変換
                    let normalized = name.replace(/[\u30a1-\u30f6]/g, (match) => {
                        return String.fromCharCode(match.charCodeAt(0) - 0x60);
                    });

                    // 括弧内を除外（「人参（生）」→「人参」）
                    normalized = normalized.replace(/[（(].*?[）)]/g, '');

                    // 空白を削除
                    normalized = normalized.replace(/\s+/g, '');

                    return normalized.toLowerCase();
                };

                // レーベンシュタイン距離を計算する関数（文字列の類似度測定）
                const levenshteinDistance = (str1, str2) => {
                    const len1 = str1.length;
                    const len2 = str2.length;
                    const matrix = [];

                    for (let i = 0; i <= len1; i++) {
                        matrix[i] = [i];
                    }
                    for (let j = 0; j <= len2; j++) {
                        matrix[0][j] = j;
                    }

                    for (let i = 1; i <= len1; i++) {
                        for (let j = 1; j <= len2; j++) {
                            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                            matrix[i][j] = Math.min(
                                matrix[i - 1][j] + 1,
                                matrix[i][j - 1] + 1,
                                matrix[i - 1][j - 1] + cost
                            );
                        }
                    }

                    return matrix[len1][len2];
                };

                // 最も類似度の高い食材を見つける関数
                const findBestMatch = (inputName) => {
                    const normalizedInput = normalizeFoodName(inputName);
                    let bestMatch = null;
                    let bestDistance = Infinity;
                    let bestCategory = null;

                    Object.keys(foodDB).forEach(cat => {
                        Object.keys(foodDB[cat]).forEach(dbName => {
                            const normalizedDbName = normalizeFoodName(dbName);
                            const distance = levenshteinDistance(normalizedInput, normalizedDbName);

                            // 距離が短いほど類似度が高い
                            // ただし、長さの半分以下の距離でないと候補にしない（類似度50%以上）
                            const maxLength = Math.max(normalizedInput.length, normalizedDbName.length);
                            if (distance < bestDistance && distance <= maxLength / 2) {
                                bestDistance = distance;
                                bestMatch = dbName;
                                bestCategory = cat;
                            }
                        });
                    });

                    return bestMatch ? { name: bestMatch, category: bestCategory, distance: bestDistance } : null;
                };

                // AI食事認識のコールバック
                const handleFoodsRecognized = (recognizedFoods) => {
                    console.log('[handleFoodsRecognized] 開始');
                    console.log('[handleFoodsRecognized] recognizedFoods received:', recognizedFoods);
                    console.log('[handleFoodsRecognized] 現在のaddedItems:', addedItems);

                    // 既にaddedItemsに追加済みの食材は除外（重複防止）
                    const filteredFoods = recognizedFoods.filter(food => {
                        return !addedItems.some(item => item.name === food.name);
                    });

                    console.log('[handleFoodsRecognized] フィルター後のfilteredFoods:', filteredFoods);

                    // 認識された食材を直接addedItemsに追加（一時的な項目として）
                    const newItems = filteredFoods.map(food => {
                        console.log(`[handleFoodsRecognized] Processing food:`, {
                            name: food.name,
                            amount: food.amount,
                            type: typeof food.amount,
                            isCustom: food.isCustom,
                            calories: food.calories
                        });

                        // food.amountから数値とunitを抽出
                        let foodAmount = food.amount;
                        let foodUnit = food.unit || 'g';

                        if (typeof foodAmount === 'string') {
                            const numMatch = foodAmount.match(/^([\d.]+)/);
                            const unitMatch = foodAmount.match(/[a-zA-Z]+$/);
                            if (numMatch) {
                                foodAmount = parseFloat(numMatch[1]);
                            }
                            if (unitMatch) {
                                foodUnit = unitMatch[0];
                            }
                            console.log(`[handleFoodsRecognized] String parsed: ${food.name} -> ${foodAmount}${foodUnit}`);
                        } else {
                            // 数値の場合、そのまま使用（100にフォールバックしない）
                            foodAmount = parseFloat(foodAmount);
                            if (isNaN(foodAmount) || foodAmount <= 0) {
                                console.warn(`[handleFoodsRecognized] Invalid amount for ${food.name}, defaulting to 100`);
                                foodAmount = 100;
                            }
                            console.log(`[handleFoodsRecognized] Number parsed: ${food.name} -> ${foodAmount}`);
                        }

                        // データベースから該当食材を探す
                        let foundFood = null;
                        let foundCategory = null;

                        // 1. 完全一致で検索
                        Object.keys(foodDB).forEach(cat => {
                            if (foodDB[cat][food.name]) {
                                foundFood = foodDB[cat][food.name];
                                foundCategory = cat;
                            }
                        });

                        // 2. 完全一致しない場合、正規化して検索（ニュアンスヒット）
                        if (!foundFood) {
                            const normalizedInputName = normalizeFoodName(food.name);
                            console.log(`[handleFoodsRecognized] 正規化: "${food.name}" → "${normalizedInputName}"`);

                            Object.keys(foodDB).forEach(cat => {
                                if (foundFood) return; // 既に見つかっている場合はスキップ

                                Object.keys(foodDB[cat]).forEach(dbName => {
                                    if (foundFood) return; // 既に見つかっている場合はスキップ

                                    const normalizedDbName = normalizeFoodName(dbName);
                                    if (normalizedDbName === normalizedInputName || normalizedDbName.includes(normalizedInputName) || normalizedInputName.includes(normalizedDbName)) {
                                        foundFood = foodDB[cat][dbName];
                                        foundCategory = cat;
                                        console.log(`[handleFoodsRecognized] ニュアンスヒット: "${food.name}" → "${dbName}"`);
                                    }
                                });
                            });
                        }

                        if (foundFood) {
                            const nutrients = mapNutrients(foundFood);
                            console.log(`[handleFoodsRecognized] foundFood:`, {
                                name: food.name,
                                servingSize: foundFood.servingSize,
                                unit: foundFood.unit,
                                servingUnit: foundFood.servingUnit,
                                calories: foundFood.calories,
                                inputAmount: foodAmount,
                                inputUnit: foodUnit
                            });

                            // ratioの計算: servingSizeがある場合（"1個"単位など）とない場合で分岐
                            let ratio;
                            let displayAmount = foodAmount;
                            let displayUnit = foodUnit;

                            // "1個"や"本"など、servingSizeがある特殊単位の処理
                            if (foundFood.unit === '1個' || foundFood.unit === '本') {
                                console.log(`[handleFoodsRecognized] 特殊単位検出: ${foundFood.unit}`);

                                // グラム入力を個数/本数に変換
                                if (foodUnit === 'g' && foundFood.servingUnit === 'g' && foundFood.servingSize) {
                                    // 例: 150g ÷ 12g/個 = 12.5個
                                    const numServings = foodAmount / foundFood.servingSize;
                                    ratio = numServings;
                                    displayAmount = parseFloat(numServings.toFixed(1));
                                    displayUnit = foundFood.unit; // "1個"
                                    console.log(`[handleFoodsRecognized] g→個/本変換: ${foodAmount}g → ${displayAmount}${displayUnit}, ratio=${ratio}`);
                                } else if (foundFood.unit === '本' && (foodUnit === '本' || foodUnit === 'ml')) {
                                    // 本単位で入力されている、またはml入力の場合
                                    ratio = foodAmount;
                                    displayAmount = foodAmount;
                                    displayUnit = '本';
                                    console.log(`[handleFoodsRecognized] 本単位: ${displayAmount}本, ratio=${ratio}`);
                                } else if (foundFood.unit === '1個' && (foodUnit === '個' || foodUnit === '1個')) {
                                    // 既に個数で指定されている場合
                                    ratio = foodAmount;
                                    displayAmount = foodAmount;
                                    displayUnit = '1個';
                                    console.log(`[handleFoodsRecognized] 個単位: ${displayAmount}個, ratio=${ratio}`);
                                } else {
                                    // その他の場合、100g換算にフォールバック
                                    console.warn(`[handleFoodsRecognized] 予期しない単位組み合わせ: foodUnit=${foodUnit}, foundFood.unit=${foundFood.unit}`);
                                    ratio = foodAmount / 100;
                                    displayUnit = 'g';
                                    console.log(`[handleFoodsRecognized] 100g換算にフォールバック: ratio=${ratio}`);
                                }
                            } else {
                                // 通常の100gあたり食材
                                ratio = foodAmount / 100;
                                console.log(`[handleFoodsRecognized] 通常食材（100gあたり）: ${foodAmount}g, ratio=${ratio}`);
                            }

                            const result = {
                                name: food.name,
                                amount: displayAmount,
                                unit: displayUnit,
                                calories: Math.round((foundFood.calories || 0) * ratio),
                                protein: parseFloat(((foundFood.protein || 0) * ratio).toFixed(1)),
                                fat: parseFloat(((foundFood.fat || 0) * ratio).toFixed(1)),
                                carbs: parseFloat(((foundFood.carbs || 0) * ratio).toFixed(1)),
                                category: foundCategory,
                                // _base情報を追加（FoodItemTagで基準量表示に使用）
                                _base: {
                                    calories: foundFood.calories || 0,
                                    protein: foundFood.protein || 0,
                                    fat: foundFood.fat || 0,
                                    carbs: foundFood.carbs || 0,
                                    servingSize: foundFood.servingSize || 100,
                                    servingUnit: foundFood.servingUnit || 'g',
                                    unit: foundFood.unit || '100g'
                                },
                                ...nutrients
                            };
                            console.log(`[handleFoodsRecognized] 計算結果:`, result);
                            return result;
                        } else {
                            // DBに見つからない場合はカスタム食材として扱う
                            // まず、類似度の高い候補を検索
                            const bestMatch = findBestMatch(food.name);
                            console.log(`[handleFoodsRecognized] 類似候補検索: "${food.name}" → ${bestMatch ? `"${bestMatch.name}" (距離: ${bestMatch.distance})` : 'なし'}`);

                            // _baseがあれば100gあたりの値から実量計算、なければそのまま使用
                            const base = food._base || {
                                calories: food.calories || 0,
                                protein: food.protein || 0,
                                fat: food.fat || 0,
                                carbs: food.carbs || 0
                            };
                            const ratio = foodAmount / 100;

                            console.log(`[handleFoodsRecognized] カスタムアイテム処理: ${food.name}`, {
                                base: base,
                                foodAmount: foodAmount,
                                ratio: ratio,
                                calculated: {
                                    calories: Math.round(base.calories * ratio),
                                    protein: parseFloat((base.protein * ratio).toFixed(1)),
                                    fat: parseFloat((base.fat * ratio).toFixed(1)),
                                    carbs: parseFloat((base.carbs * ratio).toFixed(1))
                                }
                            });

                            return {
                                name: food.name,
                                amount: foodAmount, // 数値のみ
                                unit: foodUnit,     // 単位は別フィールド
                                calories: Math.round(base.calories * ratio),
                                protein: parseFloat((base.protein * ratio).toFixed(1)),
                                fat: parseFloat((base.fat * ratio).toFixed(1)),
                                carbs: parseFloat((base.carbs * ratio).toFixed(1)),
                                category: food.category || 'カスタム',
                                isUnknown: food.isUnknown || false,
                                isCustom: food.isCustom || false,
                                vitamins: {},
                                minerals: {},
                                suggestion: bestMatch ? { name: bestMatch.name, category: bestMatch.category } : null // 候補を追加
                            };
                        }
                    });

                    console.log('[handleFoodsRecognized] newItems calculated:', newItems);
                    newItems.forEach((item, i) => {
                        console.log(`  [${i}] ${item.name}: ${item.amount}${item.unit}, ${item.calories}kcal, P${item.protein}g, F${item.fat}g, C${item.carbs}g`);
                    });

                    setAddedItems([...addedItems, ...newItems]);

                    console.log('[handleFoodsRecognized] addedItems updated:', [...addedItems, ...newItems]);
                    console.log('[handleFoodsRecognized] 完了、検索モーダルに遷移します');

                    setShowAIFoodRecognition(false);
                    setShowSearchModal(true); // 検索モーダルを開いてaddedItemsを表示
                };

                // AI写真解析から未登録食材のカスタム作成を開始
                const handleOpenCustomFromAI = async (foodData, onCompleteCallback) => {
                    setIsFromAIRecognition(true); // AI写真解析経由フラグ
                    setSaveMethod('addToList'); // AI経由はデフォルトで「リストに追加」
                    setOnCustomCompleteCallback(() => onCompleteCallback); // コールバックを保存
                    setShowCustomSupplementForm(true);
                    // setShowAIFoodRecognition(false); // コンポーネントをアンマウントしない（状態保持のため）
                    setAiRecognizing(true);

                    try {
                        // Cloud Function経由でGemini APIを呼び出し（食材名から栄養素を推定）
                        const functions = firebase.app().functions('asia-northeast2');
                        const callGemini = functions.httpsCallable('callGemini');

                        const promptText = `「${foodData.name}」の栄養素を日本食品標準成分表2020年版（八訂）を基準に推定してJSON形式で出力してください。

【出力形式】
{
  "calories": カロリー（kcal/100g、数値のみ）,
  "protein": たんぱく質（g/100g、数値のみ）,
  "fat": 脂質（g/100g、数値のみ）,
  "carbs": 炭水化物（g/100g、数値のみ）
}

【推定ルール】
1. 日本食品標準成分表2020年版（八訂）の値を基準に推定
2. 100gあたりの栄養素で推定
3. 最も一般的な調理法・状態の値を使用
4. JSON形式のみを出力し、他のテキストは含めない`;

                        const result = await callGemini({
                            model: 'gemini-2.5-pro',
                            contents: [{
                                role: 'user',
                                parts: [{ text: promptText }]
                            }],
                            generationConfig: {
                                temperature: 0.2,
                                topK: 32,
                                topP: 1,
                                maxOutputTokens: 2048,
                            }
                        });

                        if (!result.data || !result.data.success) {
                            throw new Error('AI推定に失敗しました');
                        }

                        const textContent = result.data.response.candidates[0].content.parts[0].text;

                        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
                        if (!jsonMatch) {
                            throw new Error('栄養素の解析に失敗しました');
                        }

                        const nutrition = JSON.parse(jsonMatch[0]);

                        console.log('[handleOpenCustomFromAI] AI推定完了:', {
                            name: foodData.name,
                            amount: foodData.amount,
                            nutrition: nutrition
                        });

                        // AI推定値を設定（100gあたりで統一）
                        setCustomSupplementData({
                            itemType: 'food',
                            name: foodData.name || '',
                            category: 'ビタミン・ミネラル',
                            servingSize: 100,  // 100gで固定
                            servingUnit: 'g',
                            calories: nutrition.calories || 0,
                            protein: nutrition.protein || 0,
                            fat: nutrition.fat || 0,
                            carbs: nutrition.carbs || 0,
                            vitaminA: 0, vitaminB1: 0, vitaminB2: 0, vitaminB6: 0, vitaminB12: 0,
                            vitaminC: 0, vitaminD: 0, vitaminE: 0, vitaminK: 0,
                            niacin: 0, pantothenicAcid: 0, biotin: 0, folicAcid: 0,
                            sodium: 0, potassium: 0, calcium: 0, magnesium: 0, phosphorus: 0,
                            iron: 0, zinc: 0, copper: 0, manganese: 0, iodine: 0, selenium: 0, chromium: 0, molybdenum: 0,
                            otherNutrients: []
                        });

                    } catch (error) {
                        console.error('AI nutrition estimation error:', error);
                        // エラー時はfoodDataの値を使用（100gあたりで統一）
                        setCustomSupplementData({
                            itemType: 'food',
                            name: foodData.name || '',
                            category: 'ビタミン・ミネラル',
                            servingSize: 100,  // 100gで固定
                            servingUnit: 'g',
                            calories: foodData.calories || 0,
                            protein: foodData.protein || 0,
                            fat: foodData.fat || 0,
                            carbs: foodData.carbs || 0,
                            vitaminA: 0, vitaminB1: 0, vitaminB2: 0, vitaminB6: 0, vitaminB12: 0,
                            vitaminC: 0, vitaminD: 0, vitaminE: 0, vitaminK: 0,
                            niacin: 0, pantothenicAcid: 0, biotin: 0, folicAcid: 0,
                            sodium: 0, potassium: 0, calcium: 0, magnesium: 0, phosphorus: 0,
                            iron: 0, zinc: 0, copper: 0, manganese: 0, iodine: 0, selenium: 0, chromium: 0, molybdenum: 0,
                            otherNutrients: []
                        });
                    } finally {
                        setAiRecognizing(false);
                    }
                };

                // AI推定（カスタム作成用）
                const recognizeNutrition = async () => {
                    if (!aiImage) {
                        alert('画像を選択してください');
                        return;
                    }

                    setAiRecognizing(true);

                    try {
                        // 画像をBase64に変換
                        const imageToBase64 = (file) => {
                            return new Promise((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                    const base64String = reader.result.split(',')[1];
                                    resolve(base64String);
                                };
                                reader.onerror = reject;
                                reader.readAsDataURL(file);
                            });
                        };

                        const base64Image = await imageToBase64(aiImage);

                        // Cloud Function経由でGemini Vision APIを呼び出し
                        const functions = firebase.app().functions('asia-northeast2');
                        const callGemini = functions.httpsCallable('callGemini');

                        const promptText = `この食品画像の栄養素を推定してJSON形式で出力してください。

【出力形式】
{
  "name": "食品名（日本語）",
  "servingSize": 1回分の量（数値のみ、通常100g）,
  "servingUnit": "単位（g、ml、個など）",
  "calories": カロリー（kcal、数値のみ）,
  "protein": たんぱく質（g、数値のみ）,
  "fat": 脂質（g、数値のみ）,
  "carbs": 炭水化物（g、数値のみ）
}

【推定ルール】
1. 100gあたりの栄養素で推定
2. 複合的な料理の場合は、全体の栄養素を推定
3. 信頼できる栄養成分表を参考に推定
4. JSON形式のみを出力し、他のテキストは含めない

例:
- 鶏むね肉 → {"name":"鶏むね肉","servingSize":100,"servingUnit":"g","calories":108,"protein":22.3,"fat":1.5,"carbs":0}
- プロテインバー → {"name":"プロテインバー","servingSize":1,"servingUnit":"本","calories":200,"protein":20,"fat":8,"carbs":15}`;

                        const result = await callGemini({
                            model: 'gemini-2.5-pro',
                            contents: [{
                                role: 'user',
                                parts: [
                                    { text: promptText },
                                    {
                                        inline_data: {
                                            mime_type: aiImage.type || 'image/jpeg',
                                            data: base64Image
                                        }
                                    }
                                ]
                            }],
                            generationConfig: {
                                temperature: 0.4,
                                topK: 32,
                                topP: 1,
                                maxOutputTokens: 8192,
                            }
                        });

                        if (!result.data || !result.data.success) {
                            throw new Error('AI認識に失敗しました');
                        }

                        const textContent = result.data.response.candidates[0].content.parts[0].text;

                        // JSONを抽出
                        const jsonMatch = textContent.match(/\{[\s\S]*\}/);
                        if (!jsonMatch) {
                            throw new Error('栄養素の解析に失敗しました');
                        }

                        const nutrition = JSON.parse(jsonMatch[0]);

                        // customSupplementDataに反映
                        setCustomSupplementData(prev => ({
                            ...prev,
                            name: nutrition.name || prev.name,
                            servingSize: nutrition.servingSize || 100,
                            servingUnit: nutrition.servingUnit || 'g',
                            calories: nutrition.calories || 0,
                            protein: nutrition.protein || 0,
                            fat: nutrition.fat || 0,
                            carbs: nutrition.carbs || 0
                        }));

                        setIsAICreation(true);
                        setNutritionInputMethod('manual'); // 自動的に手動入力タブに切り替え
                        alert('AI推定が完了しました。値を確認・編集してから保存してください。');

                    } catch (error) {
                        console.error('AI recognition error:', error);
                        alert('AI認識に失敗しました: ' + error.message);
                    } finally {
                        setAiRecognizing(false);
                    }
                };

                // AI推定用の画像選択ハンドラー
                const handleAiImageSelect = (event) => {
                    const file = event.target.files[0];
                    if (file) {
                        setAiImage(file);

                        // プレビュー表示
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            setAiImagePreview(reader.result);
                        };
                        reader.readAsDataURL(file);
                    }
                };

                // 階層化されたカテゴリ構造を構築
                const hierarchicalCategories = {
                    '食材': {},
                    'サプリメント': {}
                };

                Object.keys(foodDB).forEach(category => {
                    // サプリメントカテゴリの場合、サブカテゴリごとに分類
                    if (category === 'サプリメント') {
                        const supplementsBySubcategory = {};
                        const drinkItems = [];

                        Object.keys(foodDB[category]).forEach(itemName => {
                            const item = foodDB[category][itemName];
                            const subcategory = item.subcategory || 'その他';

                            if (fuzzyMatch(itemName, searchTerm)) {
                                // ドリンクは食材カテゴリに移動
                                if (subcategory === 'ドリンク') {
                                    drinkItems.push(itemName);
                                } else {
                                    if (!supplementsBySubcategory[subcategory]) {
                                        supplementsBySubcategory[subcategory] = [];
                                    }
                                    supplementsBySubcategory[subcategory].push(itemName);
                                }
                            }
                        });

                        // ドリンクを食材カテゴリに追加
                        if (drinkItems.length > 0) {
                            hierarchicalCategories['食材']['ドリンク'] = drinkItems;
                        }

                        // サプリメントの各サブカテゴリを追加（ドリンク除く）
                        Object.keys(supplementsBySubcategory).forEach(subcategory => {
                            if (supplementsBySubcategory[subcategory].length > 0) {
                                hierarchicalCategories['サプリメント'][subcategory] = supplementsBySubcategory[subcategory];
                            }
                        });
                    } else {
                        // 通常の食材カテゴリ
                        const items = Object.keys(foodDB[category]).filter(name =>
                            fuzzyMatch(name, searchTerm)
                        );
                        if (items.length > 0) {
                            hierarchicalCategories['食材'][category] = items;
                        }
                    }
                });

                // カスタム食材を食材配下に追加
                const customFoods = JSON.parse(localStorage.getItem('customFoods') || '[]');
                const filteredCustomFoods = customFoods.filter(food =>
                    food.itemType === 'food' && fuzzyMatch(food.name, searchTerm)
                );
                if (filteredCustomFoods.length > 0) {
                    hierarchicalCategories['食材']['カスタム食材'] = filteredCustomFoods.map(f => f.name);
                }

                // カスタム料理を最上位に追加
                const filteredCustomRecipes = customFoods.filter(food =>
                    food.itemType === 'recipe' && fuzzyMatch(food.name, searchTerm)
                );
                if (filteredCustomRecipes.length > 0) {
                    hierarchicalCategories['カスタム料理'] = { 'カスタム料理': filteredCustomRecipes.map(f => f.name) };
                }

                // カスタムサプリをサプリメント配下に追加
                const filteredCustomSupplements = customFoods.filter(food =>
                    food.itemType === 'supplement' && fuzzyMatch(food.name, searchTerm)
                );
                if (filteredCustomSupplements.length > 0) {
                    hierarchicalCategories['サプリメント']['カスタムサプリ'] = filteredCustomSupplements.map(f => f.name);
                }

                const filteredFoods = hierarchicalCategories;

                // テンプレート保存
                const saveAsTemplate = async () => {
                    if (!templateName.trim() || addedItems.length === 0) {
                        alert('テンプレート名を入力し、食材を追加してください');
                        return;
                    }
                    const template = {
                        id: Date.now(),
                        name: templateName,
                        items: addedItems
                    };
                    await DataService.saveMealTemplate(user.uid, template);
                    const templates = await DataService.getMealTemplates(user.uid);
                    setMealTemplates(templates);
                    alert('テンプレートを保存しました');
                    setTemplateName('');
                };

                const loadTemplate = (template) => {
                    // ディープコピーして参照を切る（複製不具合を防止）
                    const copiedItems = JSON.parse(JSON.stringify(template.items));
                    setAddedItems(copiedItems);
                    setMealName(template.name);
                };

                const deleteTemplate = async (templateId) => {
                    if (confirm('このテンプレートを削除しますか？')) {
                        await DataService.deleteMealTemplate(user.uid, templateId);
                        const templates = await DataService.getMealTemplates(user.uid);
                        setMealTemplates(templates);
                    }
                };

                return (
                    <div className="space-y-4">
                        {/* ①食事名入力 */}
                        <div>
                            <label className="block text-sm font-medium mb-2">食事名</label>
                            <input
                                type="text"
                                value={mealName}
                                onChange={(e) => setMealName(e.target.value)}
                                placeholder="朝食、1食目など..."
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>

                        {/* ②どうやって記録しますか？ */}
                        {!selectedItem && !showAIFoodRecognition && !showCustomSupplementForm && !editingMeal && (
                            <div className="space-y-3">
                                <p className="text-center text-base font-medium text-gray-700 mb-4">どうやって記録しますか？</p>

                                {/* 写真から記録（黒背景） */}
                                <button
                                    type="button"
                                    onClick={() => setShowAIFoodRecognition(true)}
                                    className="w-full bg-black text-white py-3 px-4 rounded-lg hover:bg-gray-900 transition flex items-center gap-4"
                                >
                                    <Icon name="Camera" size={32} />
                                    <div className="text-left flex-1">
                                        <div className="font-bold text-base">写真から記録</div>
                                        <div className="text-xs text-gray-400 mt-0.5">料理の写真をAIが解析</div>
                                    </div>
                                </button>

                                {/* 食材を検索（グレー背景、グレー枠） */}
                                <button
                                    type="button"
                                    onClick={() => setShowSearchModal(true)}
                                    className="w-full bg-gray-100 border-2 border-gray-300 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-200 transition flex items-center gap-4"
                                >
                                    <Icon name="Search" size={32} />
                                    <div className="text-left flex-1">
                                        <div className="font-bold text-base">食材を検索</div>
                                        <div className="text-xs text-gray-500 mt-0.5">データベースから選択</div>
                                    </div>
                                </button>

                                {/* 手動で作成（グレー背景、グレー枠） */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAICreation(false);
                                        setNutritionInputMethod('manual'); // 手動入力タブを初期選択
                                        setAiImage(null);
                                        setAiImagePreview(null);
                                        setShowCustomSupplementForm(true);
                                    }}
                                    className="w-full bg-gray-100 border-2 border-gray-300 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-200 transition flex items-center gap-4"
                                >
                                    <Icon name="Plus" size={32} />
                                    <div className="text-left flex-1">
                                        <div className="font-bold text-base">手動で作成</div>
                                        <div className="text-xs text-gray-500 mt-0.5">カスタム食材を登録</div>
                                    </div>
                                </button>

                                {/* テンプレート - 12日以上で開放 */}
                                {unlockedFeatures.includes(FEATURES.TRAINING_TEMPLATE.id) && (
                                    <button
                                        type="button"
                                        onClick={() => setShowTemplates(!showTemplates)}
                                        className="w-full bg-gray-100 border-2 border-gray-300 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-200 transition flex items-center gap-4"
                                    >
                                        <Icon name="BookTemplate" size={32} />
                                        <div className="text-left flex-1">
                                            <div className="font-bold text-base">テンプレート</div>
                                            <div className="text-xs text-gray-500 mt-0.5">保存した食事を呼び出す</div>
                                        </div>
                                    </button>
                                )}
                            </div>
                        )}

                        {/* テンプレートモーダル */}
                        {showTemplates && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                                <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
                                    <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                                        <h3 className="text-lg font-bold">テンプレート</h3>
                                        <button
                                            onClick={() => setShowTemplates(false)}
                                            className="text-gray-500 hover:text-gray-700"
                                        >
                                            <Icon name="X" size={24} />
                                        </button>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        {/* テンプレート一覧 */}
                                        {mealTemplates.length > 0 ? (
                                            <div className="space-y-2">
                                                {mealTemplates.map(template => {
                                                    // 総カロリーとPFCを計算
                                                    let totalCalories = 0;
                                                    let totalProtein = 0;
                                                    let totalFat = 0;
                                                    let totalCarbs = 0;

                                                    template.items.forEach(item => {
                                                        totalCalories += item.calories || 0;
                                                        totalProtein += item.protein || 0;
                                                        totalFat += item.fat || 0;
                                                        totalCarbs += item.carbs || 0;
                                                    });

                                                    return (
                                                        <div key={template.id} className="bg-gray-50 rounded-lg border border-gray-200 p-3">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <div className="flex-1">
                                                                    <p className="font-medium">{template.name}</p>
                                                                    <p className="text-xs text-gray-600 mt-1">
                                                                        {Math.round(totalCalories)}kcal
                                                                        <span className="text-red-600 ml-2">P:{Math.round(totalProtein)}g</span>
                                                                        <span className="text-yellow-600 ml-1">F:{Math.round(totalFat)}g</span>
                                                                        <span className="text-green-600 ml-1">C:{Math.round(totalCarbs)}g</span>
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-2 ml-2">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            loadTemplate(template);
                                                                            setShowTemplates(false);
                                                                        }}
                                                                        className="p-2 text-blue-500 hover:text-blue-700"
                                                                        title="編集"
                                                                    >
                                                                        <Icon name="Pencil" size={16} />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            deleteTemplate(template.id);
                                                                        }}
                                                                        className="p-2 text-red-500 hover:text-red-700"
                                                                        title="削除"
                                                                    >
                                                                        <Icon name="Trash2" size={16} />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* 追加ボタン */}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    // テンプレートのすべてのアイテムを追加
                                                                    setAddedItems([...addedItems, ...template.items]);
                                                                    setShowTemplates(false);
                                                                }}
                                                                className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium mb-3"
                                                            >
                                                                このテンプレートを追加
                                                            </button>

                                                            {/* アイテム一覧（折りたたみ） */}
                                                            <details className="border-t border-gray-200 pt-2">
                                                                <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700 list-none flex items-center gap-1">
                                                                    <Icon name="ChevronDown" size={14} />
                                                                    内訳を表示
                                                                </summary>
                                                                <div className="mt-2 space-y-1">
                                                                    {template.items.map((item, idx) => (
                                                                        <div key={idx} className="text-sm text-gray-700 py-1">
                                                                            <span className="font-medium">{item.name}</span>
                                                                            <span className="text-gray-500 ml-2">{item.amount}g</span>
                                                                            <span className="text-xs text-gray-500 ml-2">
                                                                                ({Math.round(item.calories)}kcal
                                                                                <span className="text-red-600 ml-1">P:{Math.round(item.protein)}g</span>
                                                                                <span className="text-yellow-600 ml-1">F:{Math.round(item.fat)}g</span>
                                                                                <span className="text-green-600 ml-1">C:{Math.round(item.carbs)}g</span>)
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </details>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500 text-center py-8">保存されたテンプレートはありません</p>
                                        )}

                                        {/* テンプレート新規保存 */}
                                        {addedItems.length > 0 && (
                                            <div className="pt-3 border-t border-gray-200">
                                                <p className="text-sm font-medium mb-2">新しいテンプレートとして保存</p>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={templateName}
                                                        onChange={(e) => setTemplateName(e.target.value)}
                                                        placeholder="テンプレート名（例: 朝食パターン1）"
                                                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            saveAsTemplate();
                                                            setShowTemplates(false);
                                                        }}
                                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
                                                    >
                                                        保存
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 検索モーダル */}
                        {showSearchModal && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                                <div className="bg-white rounded-lg max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
                                    {/* ヘッダー */}
                                    <div className="sticky top-0 bg-white border-b p-4">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-bold">食材を検索</h3>
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
                                            placeholder="食材・サプリメントを検索..."
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                        />

                                        {/* 追加済みアイテム一覧 */}
                                        {addedItems.length > 0 && (
                                            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200 mt-3">
                                                <div
                                                    className="flex justify-between items-center mb-3 cursor-pointer"
                                                    onClick={() => setAddedItemsExpanded(!addedItemsExpanded)}
                                                >
                                                    <p className="text-sm font-medium text-indigo-900">追加済み ({addedItems.length}品目)</p>
                                                    <Icon name={addedItemsExpanded ? "ChevronUp" : "ChevronDown"} size={20} className="text-indigo-600" />
                                                </div>
                                                {addedItemsExpanded && (
                                                <>
                                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                                    {addedItems.map((item, index) => (
                                                        <div key={index} className="bg-white p-2 rounded-lg flex justify-between items-center">
                                                            <div className="flex-1">
                                                                <p className="text-sm font-medium">{item.name}</p>
                                                                <p className="text-xs text-gray-600">{item.amount}{item.unit || 'g'} - {Math.round(item.calories)}kcal</p>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => {
                                                                        // 編集時は100gあたりの栄養価に戻す必要がある
                                                                        const originalRatio = 100 / item.amount;
                                                                        setSelectedItem({
                                                                            name: item.name,
                                                                            calories: item.calories * originalRatio,
                                                                            protein: item.protein * originalRatio,
                                                                            fat: item.fat * originalRatio,
                                                                            carbs: item.carbs * originalRatio,
                                                                            vitamins: item.vitamins,
                                                                            minerals: item.minerals,
                                                                            category: item.category || ''
                                                                        });
                                                                        setAmount(item.amount.toString());
                                                                        setEditingItemIndex(index);
                                                                        setShowSearchModal(false);
                                                                    }}
                                                                    className="text-blue-500 hover:text-blue-700"
                                                                    title="編集"
                                                                >
                                                                    <Icon name="Edit" size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => setAddedItems(addedItems.filter((_, i) => i !== index))}
                                                                    className="text-red-500 hover:text-red-700"
                                                                >
                                                                    <Icon name="Trash2" size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="mt-3 pt-3 border-t border-indigo-200">
                                                    <div className="grid grid-cols-4 gap-2 text-xs">
                                                        <div>
                                                            <p className="text-gray-600">カロリー</p>
                                                            <p className="font-bold" style={{color: '#7686BA'}}>
                                                                {Math.round(addedItems.reduce((sum, item) => sum + item.calories, 0))}kcal
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-600">P</p>
                                                            <p className="font-bold text-red-600">
                                                                {addedItems.reduce((sum, item) => sum + item.protein, 0).toFixed(1)}g
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-600">F</p>
                                                            <p className="font-bold text-yellow-600">
                                                                {addedItems.reduce((sum, item) => sum + item.fat, 0).toFixed(1)}g
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-600">C</p>
                                                            <p className="font-bold text-green-600">
                                                                {addedItems.reduce((sum, item) => sum + item.carbs, 0).toFixed(1)}g
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* アイテムを追加ボタン */}
                                                <button
                                                    onClick={() => {
                                                        setSelectedItem(null);
                                                    }}
                                                    className="w-full bg-indigo-600 text-white font-bold py-2 rounded-lg hover:bg-indigo-700 transition text-sm mt-3"
                                                >
                                                    アイテムを追加
                                                </button>
                                                </>
                                                )}

                                                {/* 記録とキャンセルボタン */}
                                                <div className="flex gap-2 mt-3">
                                                    <button
                                                        onClick={async () => {
                                                            // テンプレート編集モードの場合
                                                            if (editingTemplate) {
                                                                const updatedTemplate = {
                                                                    ...editingTemplate,
                                                                    items: addedItems,
                                                                    name: mealName || editingTemplate.name
                                                                };
                                                                await DataService.saveMealTemplate(user.uid, updatedTemplate);
                                                                alert('テンプレートを更新しました');
                                                                setShowSearchModal(false);
                                                                onClose();
                                                                return;
                                                            }

                                                            // テンプレート作成モードの場合（新規）
                                                            if (isTemplateMode) {
                                                                if (!mealName.trim()) {
                                                                    alert('テンプレート名を入力してください');
                                                                    return;
                                                                }
                                                                if (addedItems.length === 0) {
                                                                    alert('食材を追加してください');
                                                                    return;
                                                                }
                                                                const template = {
                                                                    id: Date.now(),
                                                                    name: mealName,
                                                                    items: addedItems
                                                                };
                                                                await DataService.saveMealTemplate(user.uid, template);
                                                                alert('テンプレートを保存しました');
                                                                setShowSearchModal(false);
                                                                onClose();
                                                                return;
                                                            }

                                                            // 通常の記録モード
                                                            const totalCalories = addedItems.reduce((sum, item) => sum + item.calories, 0);
                                                            const totalProtein = parseFloat(addedItems.reduce((sum, item) => sum + (item.protein || 0), 0).toFixed(1));
                                                            const totalFat = parseFloat(addedItems.reduce((sum, item) => sum + (item.fat || 0), 0).toFixed(1));
                                                            const totalCarbs = parseFloat(addedItems.reduce((sum, item) => sum + (item.carbs || 0), 0).toFixed(1));
                                                            const newMeal = {
                                                                id: Date.now(),
                                                                time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
                                                                name: mealName || '食事',
                                                                calories: Math.round(totalCalories),
                                                                protein: totalProtein,
                                                                fat: totalFat,
                                                                carbs: totalCarbs,
                                                                items: addedItems.map(item => ({
                                                                    name: item.name,
                                                                    amount: item.amount,  // 数値として保存
                                                                    unit: item.unit || 'g',  // unitを追加
                                                                    calories: item.calories || 0,  // caloriesを追加（重要！）
                                                                    protein: item.protein || 0,
                                                                    fat: item.fat || 0,
                                                                    carbs: item.carbs || 0,
                                                                    vitamins: item.vitamins || {},
                                                                    minerals: item.minerals || {}
                                                                }))
                                                            };

                                                            onAdd(newMeal);
                                                            setShowSearchModal(false);
                                                        }}
                                                        className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition"
                                                    >
                                                        {(editingTemplate || isTemplateMode) ? 'テンプレートを保存' : '記録'}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setAddedItems([]);
                                                            setShowSearchModal(false);
                                                            onClose();
                                                        }}
                                                        className="px-4 bg-gray-200 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-300 transition"
                                                    >
                                                        キャンセル
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* 食材/サプリメント タブ */}
                                        <div className="grid grid-cols-2 mt-3 border-b border-gray-200">
                                            <button
                                                onClick={() => setFoodOrSupplementTab('food')}
                                                className={`py-3 px-4 font-medium transition flex items-center justify-center gap-2 border-b-2 ${
                                                    foodOrSupplementTab === 'food'
                                                        ? 'border-green-600 text-green-600'
                                                        : 'border-transparent text-gray-600 hover:text-green-600'
                                                }`}
                                            >
                                                <Icon name="Apple" size={20} />
                                                <span className="text-sm">食材</span>
                                            </button>
                                            <button
                                                onClick={() => setFoodOrSupplementTab('supplement')}
                                                className={`py-3 px-4 font-medium transition flex items-center justify-center gap-2 border-b-2 ${
                                                    foodOrSupplementTab === 'supplement'
                                                        ? 'border-blue-600 text-blue-600'
                                                        : 'border-transparent text-gray-600 hover:text-blue-600'
                                                }`}
                                            >
                                                <Icon name="Pill" size={20} />
                                                <span className="text-sm">サプリメント</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* コンテンツエリア */}
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {!selectedItem ? (
                                    <>
                                {/* よく使う食材（予測） - 9日以上で開放 */}
                                {usageDays >= 9 && predictedData?.commonMeals && predictedData.commonMeals.length > 0 && !searchTerm && addedItems.length === 0 && (
                                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-lg border border-purple-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Icon name="Sparkles" size={16} className="text-purple-600" />
                                            <p className="text-sm font-medium text-purple-800 flex items-center gap-2">
                                                よく使う食材
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {predictedData.commonMeals.map(foodName => {
                                                // データベースから該当食材を探す
                                                let foundFood = null;
                                                let foundCategory = null;
                                                Object.keys(foodDB).forEach(cat => {
                                                    if (foodDB[cat][foodName]) {
                                                        foundFood = foodDB[cat][foodName];
                                                        foundCategory = cat;
                                                    }
                                                });

                                                if (!foundFood) return null;

                                                return (
                                                    <button
                                                        key={foodName}
                                                        onClick={() => {
                                                            const nutrients = mapNutrients(foundFood);
                                                            setSelectedItem({ name: foodName, ...foundFood, category: foundCategory, ...nutrients });
                                                            setAmount('100');
                                                        }}
                                                        className="px-3 py-1.5 bg-white border border-purple-300 rounded-full text-sm hover:bg-purple-100 transition"
                                                    >
                                                        {foodName}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    {Object.keys(filteredFoods).map(topCategory => {
                                        const subcategories = filteredFoods[topCategory];
                                        if (Object.keys(subcategories).length === 0) return null;

                                        // タブに応じてフィルタリング
                                        if (foodOrSupplementTab === 'food' && topCategory !== '食材' && topCategory !== 'カスタム料理') return null;
                                        if (foodOrSupplementTab === 'supplement' && topCategory !== 'サプリメント') return null;

                                        return (
                                            <div key={topCategory}>
                                                {/* サブカテゴリ */}
                                                <div className="bg-white">
                                                    {Object.keys(subcategories).map(subCategory => (
                                                        <div key={subCategory} className="border-t border-gray-200">
                                                            {/* カテゴリ見出し */}
                                                            <button
                                                                onClick={() => setExpandedCategories(prev => ({...prev, [subCategory]: !prev[subCategory]}))}
                                                                className="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100 flex justify-between items-center"
                                                            >
                                                                <span className="font-medium text-sm">{subCategory}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs text-gray-500">{subcategories[subCategory].length}品目</span>
                                                                    <Icon name={expandedCategories[subCategory] ? 'ChevronDown' : 'ChevronRight'} size={18} />
                                                                </div>
                                                            </button>

                                                            {/* アイテム一覧 - 折りたたみ可能 */}
                                                            {expandedCategories[subCategory] && (
                                                            <div className="p-2 space-y-1 bg-gray-50">
                                                                {subcategories[subCategory].map(foodName => {
                                                                    // カスタムアイテムの場合はlocalStorageから取得
                                                                    let food;
                                                                    let actualCategory;
                                                                    const isCustom = subCategory === 'カスタム食材' || subCategory === 'カスタム料理' || subCategory === 'カスタムサプリ';

                                                                    if (isCustom) {
                                                                        const customFoods = JSON.parse(localStorage.getItem('customFoods') || '[]');
                                                                        food = customFoods.find(f => f.name === foodName);
                                                                        actualCategory = subCategory;
                                                                    } else if (topCategory === 'サプリメント' || subCategory === 'ドリンク') {
                                                                        // サプリメント・ドリンクの場合はサプリメントカテゴリから取得
                                                                        food = foodDB['サプリメント'][foodName];
                                                                        actualCategory = subCategory === 'ドリンク' ? 'ドリンク' : 'サプリメント';
                                                                    } else {
                                                                        // 通常の食材
                                                                        if (foodDB[subCategory] && foodDB[subCategory][foodName]) {
                                                                            food = foodDB[subCategory][foodName];
                                                                            actualCategory = subCategory;
                                                                        }
                                                                    }

                                                                            if (!food) return null;

                                                                            // PFCのカロリー計算
                                                                            const pCal = parseFloat(food.protein) * 4;
                                                                            const fCal = parseFloat(food.fat) * 9;
                                                                            const cCal = parseFloat(food.carbs) * 4;

                                                                            // 最も高い割合の栄養素を判定
                                                                            const maxCal = Math.max(pCal, fCal, cCal);
                                                                            let borderColor = 'border-gray-300';
                                                                            if (maxCal === pCal) borderColor = 'border-red-500';
                                                                            else if (maxCal === fCal) borderColor = 'border-yellow-500';
                                                                            else if (maxCal === cCal) borderColor = 'border-green-500';

                                                                            // 複数選択用の処理
                                                                            const nutrients = isCustom
                                                                                ? (food.vitamins && food.minerals ? { vitamins: food.vitamins, minerals: food.minerals } : { vitamins: {}, minerals: {} })
                                                                                : mapNutrients(food);

                                                                            const foodData = {
                                                                                id: foodName, // IDとして名前を使用
                                                                                name: foodName,
                                                                                calories: food.calories,
                                                                                protein: parseFloat(food.protein),
                                                                                fat: parseFloat(food.fat),
                                                                                carbs: parseFloat(food.carbs),
                                                                                category: actualCategory,
                                                                                isCustom: isCustom,
                                                                                unit: food.unit,
                                                                                servingSize: food.servingSize,
                                                                                servingUnit: food.servingUnit,
                                                                                ...nutrients
                                                                            };

                                                                            return (
                                                                                <button
                                                                                    key={foodName}
                                                                                    onClick={() => {
                                                                                        setSelectedItem(foodData);
                                                                                        setShowSearchModal(false);
                                                                                    }}
                                                                                    className={`w-full text-left rounded-lg transition hover:bg-gray-50 border-l-4 ${borderColor} bg-white`}
                                                                                >
                                                                                    <div className="px-3 py-2">
                                                                                        <div className="flex-1">
                                                                                            <div className="flex justify-between items-start mb-1">
                                                                                                <span className="text-sm font-medium">{foodName}</span>
                                                                                                <span className="text-xs font-bold text-cyan-600">
                                                                                                    {food.calories}kcal
                                                                                                </span>
                                                                                            </div>
                                                                                            <div className="flex justify-between items-center">
                                                                                                <div className="flex gap-2 text-xs">
                                                                                                    <span className="text-red-600">P:{food.protein}g</span>
                                                                                                    <span className="text-yellow-600">F:{food.fat}g</span>
                                                                                                    <span className="text-green-600">C:{food.carbs}g</span>
                                                                                                </div>
                                                                                                <span className="text-xs text-gray-400">
                                                                                                    ※{(food.servingSize !== undefined && food.servingUnit !== undefined)
                                                                                                        ? `${food.servingSize}${food.servingUnit}`
                                                                                                        : (food.unit === 'g' || food.unit === 'ml')
                                                                                                            ? `100${food.unit}`
                                                                                                            : (food.unit && (food.unit.includes('個') || food.unit.includes('本') || food.unit.includes('枚')))
                                                                                                                ? food.unit
                                                                                                                : food.unit || '1個'}あたり
                                                                                                </span>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </button>
                                                                            );
                                                                        })}
                                                            </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                    </>
                                ) : (
                                    /* 詳細画面（量調整UI） */
                                    <div className="space-y-4">
                                        {/* アイテム情報 */}
                                        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="font-bold text-lg">{selectedItem.name}</h4>
                                                    <p className="text-sm text-gray-600">{selectedItem.category}</p>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setSelectedItem(null);
                                                        setEditingItemIndex(null);
                                                    }}
                                                    className="text-gray-500 hover:text-gray-700"
                                                >
                                                    <Icon name="X" size={20} />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-4 gap-2 mt-3 text-sm">
                                                <div>
                                                    <p className="text-gray-600">カロリー</p>
                                                    <p className="font-bold" style={{color: '#7686BA'}}>{selectedItem.calories}kcal</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600">P</p>
                                                    <p className="font-bold text-red-600">{selectedItem.protein}g</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600">F</p>
                                                    <p className="font-bold text-yellow-600">{selectedItem.fat}g</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600">C</p>
                                                    <p className="font-bold text-green-600">{selectedItem.carbs}g</p>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">
                                                ※{selectedItem.servingSize || 100}{selectedItem.servingUnit || 'g'}あたり
                                            </p>
                                        </div>

                                        {/* 量調整 */}
                                        <div>
                                            <label className="block text-sm font-medium mb-2">
                                                量 ({selectedItem.servingUnit || 'g'})
                                            </label>

                                            {/* スライダー */}
                                            <div className="mb-3">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="500"
                                                    step="5"
                                                    value={amount}
                                                    onChange={(e) => setAmount(e.target.value)}
                                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                                    style={{
                                                        background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${(amount/500)*100}%, #e5e7eb ${(amount/500)*100}%, #e5e7eb 100%)`
                                                    }}
                                                />
                                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                    <span onClick={() => setAmount(0)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">0{selectedItem.servingUnit || 'g'}</span>
                                                    <span onClick={() => setAmount(100)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">100{selectedItem.servingUnit || 'g'}</span>
                                                    <span onClick={() => setAmount(200)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">200{selectedItem.servingUnit || 'g'}</span>
                                                    <span onClick={() => setAmount(300)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">300{selectedItem.servingUnit || 'g'}</span>
                                                    <span onClick={() => setAmount(400)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">400{selectedItem.servingUnit || 'g'}</span>
                                                    <span onClick={() => setAmount(500)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">500{selectedItem.servingUnit || 'g'}</span>
                                                </div>
                                            </div>

                                            <input
                                                type="number"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none mb-2"
                                            />

                                            {/* 増減ボタン */}
                                            <div className="grid grid-cols-6 gap-1">
                                                <button
                                                    onClick={() => setAmount(Math.max(0, Number(amount) - 100))}
                                                    className="py-1.5 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200 font-medium"
                                                >
                                                    -100
                                                </button>
                                                <button
                                                    onClick={() => setAmount(Math.max(0, Number(amount) - 50))}
                                                    className="py-1.5 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 font-medium"
                                                >
                                                    -50
                                                </button>
                                                <button
                                                    onClick={() => setAmount(Math.max(0, Number(amount) - 10))}
                                                    className="py-1.5 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 font-medium"
                                                >
                                                    -10
                                                </button>
                                                <button
                                                    onClick={() => setAmount(Number(amount) + 10)}
                                                    className="py-1.5 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100 font-medium"
                                                >
                                                    +10
                                                </button>
                                                <button
                                                    onClick={() => setAmount(Number(amount) + 50)}
                                                    className="py-1.5 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100 font-medium"
                                                >
                                                    +50
                                                </button>
                                                <button
                                                    onClick={() => setAmount(Number(amount) + 100)}
                                                    className="py-1.5 bg-green-100 text-green-600 rounded text-xs hover:bg-green-200 font-medium"
                                                >
                                                    +100
                                                </button>
                                            </div>
                                            {/* 倍増減ボタン */}
                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                                <button
                                                    onClick={() => setAmount(Math.max(0, Math.round(Number(amount) * 0.5)))}
                                                    className="py-1.5 bg-purple-50 text-purple-600 rounded text-xs hover:bg-purple-100 font-medium"
                                                >
                                                    ×0.5
                                                </button>
                                                <button
                                                    onClick={() => setAmount(Math.round(Number(amount) * 2))}
                                                    className="py-1.5 bg-purple-50 text-purple-600 rounded text-xs hover:bg-purple-100 font-medium"
                                                >
                                                    ×2
                                                </button>
                                            </div>
                                        </div>

                                        {/* 摂取量プレビュー */}
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <p className="text-sm font-medium mb-2">摂取量</p>
                                            <div className="grid grid-cols-4 gap-2">
                                                <div>
                                                    <p className="text-xs text-gray-600">カロリー</p>
                                                    <p className="font-bold" style={{color: '#7686BA'}}>
                                                        {(() => {
                                                            const servingSize = selectedItem.servingSize || 100;
                                                            const ratio = Number(amount) / servingSize;
                                                            console.log(`[摂取量] amount=${amount}, servingSize=${servingSize}, ratio=${ratio}, carbs=${selectedItem.carbs}, result=${selectedItem.carbs * ratio}`);
                                                            return Math.round(selectedItem.calories * ratio);
                                                        })()}kcal
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-600">P</p>
                                                    <p className="font-bold text-red-600">{(selectedItem.protein * (Number(amount) / (selectedItem.servingSize || 100))).toFixed(1)}g</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-600">F</p>
                                                    <p className="font-bold text-yellow-600">{(selectedItem.fat * (Number(amount) / (selectedItem.servingSize || 100))).toFixed(1)}g</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-600">C</p>
                                                    <p className="font-bold text-green-600">{(selectedItem.carbs * (Number(amount) / (selectedItem.servingSize || 100))).toFixed(1)}g</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 追加ボタン */}
                                        <button
                                            onClick={() => {
                                                const numAmount = Number(amount);
                                                // データベースはservingSizeあたりの値なので、servingSizeで割る
                                                const baseAmount = selectedItem.servingSize || 100;
                                                const ratio = numAmount / baseAmount;

                                                const vitamins = {};
                                                const minerals = {};

                                                if (selectedItem.vitamins) {
                                                    Object.keys(selectedItem.vitamins).forEach(key => {
                                                        vitamins[key] = selectedItem.vitamins[key] * ratio;
                                                    });
                                                }

                                                if (selectedItem.minerals) {
                                                    Object.keys(selectedItem.minerals).forEach(key => {
                                                        minerals[key] = selectedItem.minerals[key] * ratio;
                                                    });
                                                }

                                                const otherNutrients = {};
                                                const otherNutrientKeys = ['caffeine', 'catechin', 'tannin', 'polyphenol', 'chlorogenicAcid',
                                                                            'creatine', 'lArginine', 'lCarnitine', 'EPA', 'DHA', 'coQ10',
                                                                            'lutein', 'astaxanthin'];
                                                otherNutrientKeys.forEach(key => {
                                                    if (selectedItem[key]) {
                                                        otherNutrients[key] = selectedItem[key] * ratio;
                                                    }
                                                });

                                                const newItem = {
                                                    name: selectedItem.name,
                                                    amount: numAmount,
                                                    unit: selectedItem.servingUnit || 'g', // 単位を保存
                                                    protein: selectedItem.protein * ratio,
                                                    fat: selectedItem.fat * ratio,
                                                    carbs: selectedItem.carbs * ratio,
                                                    calories: selectedItem.calories * ratio,
                                                    vitamins: vitamins,
                                                    minerals: minerals,
                                                    otherNutrients: otherNutrients
                                                };

                                                if (editingItemIndex !== null) {
                                                    const updatedItems = [...addedItems];
                                                    updatedItems[editingItemIndex] = newItem;
                                                    setAddedItems(updatedItems);
                                                    setEditingItemIndex(null);
                                                } else {
                                                    setAddedItems([...addedItems, newItem]);
                                                }

                                                setSelectedItem(null);
                                                setSearchTerm(''); // 検索ワードをクリア
                                                // デフォルト量にリセット（selectedItemがnullになるとuseEffectは発火しないので手動で設定）
                                                setAmount(type === 'supplement' ? '1' : '100');
                                            }}
                                            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition"
                                        >
                                            {editingItemIndex !== null ? '更新' : '追加'}
                                        </button>
                                    </div>
                                )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {showCustomSupplementForm && (
                            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-green-800 flex items-center gap-2">
                                        <Icon name="Plus" size={20} />
                                        カスタムアイテムを作成
                                    </h3>
                                    <button
                                        onClick={() => {
                                            setShowCustomSupplementForm(false);
                                            setIsFromAIRecognition(false);
                                            // AI写真解析モーダルはマウントされたままなので、
                                            // カスタムモーダルを閉じるだけで自動的に認識リストが表示される
                                        }}
                                        className="text-gray-500 hover:text-gray-700"
                                    >
                                        <Icon name="X" size={20} />
                                    </button>
                                </div>
                                <p className="text-sm text-gray-600 mb-4">
                                    データベースにない食材・料理・サプリメントを独自に登録できます
                                </p>
                                <div className="space-y-3">
                                    {/* Row 1: 名前入力 */}
                                    <div>
                                        <label className="text-xs font-medium text-gray-700 mb-1 block">名前</label>
                                        <input
                                            type="text"
                                            value={customSupplementData.name}
                                            onChange={(e) => setCustomSupplementData({...customSupplementData, name: e.target.value})}
                                            placeholder={
                                                customSupplementData.itemType === 'food' ? '例: 自家製プロテインバー' :
                                                customSupplementData.itemType === 'recipe' ? '例: 自家製カレー' :
                                                '例: マルチビタミン'
                                            }
                                            className="w-full px-3 py-2 text-sm border rounded-lg"
                                        />
                                    </div>

                                    {/* Row 2: アイテムタイプ選択（一覧式） */}
                                    <div>
                                        <label className="text-xs font-medium text-gray-700 mb-1 block">種類</label>
                                                            <div className="space-y-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setCustomSupplementData({...customSupplementData, itemType: 'food'})}
                                                                    className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                                                                        customSupplementData.itemType === 'food'
                                                                            ? 'bg-green-600 text-white'
                                                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                                    }`}
                                                                >
                                                                    <Icon name="Apple" size={16} />
                                                                    <span>食材</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setCustomSupplementData({...customSupplementData, itemType: 'recipe'})}
                                                                    className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                                                                        customSupplementData.itemType === 'recipe'
                                                                            ? 'bg-green-600 text-white'
                                                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                                    }`}
                                                                >
                                                                    <Icon name="ChefHat" size={16} />
                                                                    <span>料理</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setCustomSupplementData({...customSupplementData, itemType: 'supplement'})}
                                                                    className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                                                                        customSupplementData.itemType === 'supplement'
                                                                            ? 'bg-blue-600 text-white'
                                                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                                    }`}
                                                                >
                                                                    <Icon name="Pill" size={16} />
                                                                    <span>サプリ</span>
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* 栄養素の入力方法タブ */}
                                                        <div className="border-t pt-3">
                                                            <label className="text-xs font-medium text-gray-700 mb-2 block">栄養素の入力方法</label>
                                                            <div className="flex gap-2 mb-3">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setNutritionInputMethod('manual')}
                                                                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                                                                        nutritionInputMethod === 'manual'
                                                                            ? 'bg-green-600 text-white'
                                                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                                    }`}
                                                                >
                                                                    手動入力
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setNutritionInputMethod('ai')}
                                                                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-1 ${
                                                                        nutritionInputMethod === 'ai'
                                                                            ? 'bg-purple-600 text-white'
                                                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                                    }`}
                                                                >
                                                                    <Icon name="Sparkles" size={14} />
                                                                    AI推定
                                                                </button>
                                                            </div>

                                                            {/* AI推定タブの内容 */}
                                                            {nutritionInputMethod === 'ai' && (
                                                                <div className="bg-purple-50 p-3 rounded-lg mb-3">
                                                                    <p className="text-xs text-gray-700 mb-2">写真から栄養素を推定します</p>

                                                                    {!aiImagePreview ? (
                                                                        <label className="block cursor-pointer">
                                                                            <div className="border-2 border-dashed border-purple-300 rounded-lg p-6 text-center hover:bg-purple-100 transition">
                                                                                <Icon name="Camera" size={32} className="mx-auto text-purple-600 mb-2" />
                                                                                <p className="text-sm font-medium text-purple-700">写真を選択</p>
                                                                                <p className="text-xs text-gray-500 mt-1">タップして写真を選択</p>
                                                                            </div>
                                                                            <input
                                                                                type="file"
                                                                                accept="image/*"
                                                                                onChange={handleAiImageSelect}
                                                                                className="hidden"
                                                                            />
                                                                        </label>
                                                                    ) : (
                                                                        <div>
                                                                            <img src={aiImagePreview} alt="Preview" className="w-full rounded-lg mb-2" />
                                                                            <div className="flex gap-2">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={recognizeNutrition}
                                                                                    disabled={aiRecognizing}
                                                                                    className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition disabled:opacity-50 text-sm font-medium"
                                                                                >
                                                                                    {aiRecognizing ? 'AI解析中...' : 'AI解析を実行'}
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setAiImage(null);
                                                                                        setAiImagePreview(null);
                                                                                    }}
                                                                                    className="px-3 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition text-sm"
                                                                                >
                                                                                    削除
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Row 3: 基準単位選択 */}
                                                        <div>
                                                            <label className="text-xs font-medium text-gray-700 mb-1 block">基準単位</label>
                                                            <select
                                                                value={customSupplementData.servingUnit}
                                                                onChange={(e) => {
                                                                    const unit = e.target.value;
                                                                    setCustomSupplementData({
                                                                        ...customSupplementData,
                                                                        servingUnit: unit === '1個' || unit === '本' ? 'g' : unit,
                                                                        unit: unit,
                                                                        servingSize: unit === 'g' || unit === 'mg' || unit === 'ml' ? 100 : customSupplementData.servingSize
                                                                    });
                                                                }}
                                                                className="w-full px-3 py-2 text-sm border rounded-lg"
                                                            >
                                                                <option value="g">100gあたり</option>
                                                                <option value="1個">1個あたり</option>
                                                                <option value="本">1本あたり</option>
                                                                <option value="mg">mg</option>
                                                                <option value="ml">ml</option>
                                                            </select>
                                                        </div>

                                                        {/* 1個/1本の場合のみ重量入力を表示 */}
                                                        {(customSupplementData.servingUnit === '1個' || customSupplementData.unit === '1個' ||
                                                          customSupplementData.servingUnit === '本' || customSupplementData.unit === '本') && (
                                                            <div>
                                                                <label className="text-xs font-medium text-gray-700 mb-1 block">
                                                                    {customSupplementData.servingUnit === '本' || customSupplementData.unit === '本' ? '1本あたりの容量（ml）' : '1個あたりの重量（g）'}
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    value={customSupplementData.servingSize}
                                                                    onChange={(e) => setCustomSupplementData({...customSupplementData, servingSize: e.target.value === '' ? '' : (parseFloat(e.target.value) || 1)})}
                                                                    placeholder={customSupplementData.servingUnit === '本' || customSupplementData.unit === '本' ? '例: 355' : '例: 58'}
                                                                    className="w-full px-3 py-2 text-sm border rounded-lg"
                                                                />
                                                            </div>
                                                        )}

                                                        <div className="border-t pt-2">
                                                            <p className="text-xs font-medium text-gray-700 mb-2">
                                                                基本栄養素（
                                                                {customSupplementData.unit === '1個' ? `1個（${customSupplementData.servingSize}${customSupplementData.servingUnit}）` :
                                                                 customSupplementData.unit === '本' ? `1本（${customSupplementData.servingSize}${customSupplementData.servingUnit}）` :
                                                                 `${customSupplementData.servingSize}${customSupplementData.servingUnit}`}
                                                                あたり）
                                                            </p>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <label className="text-xs text-gray-600">カロリー (kcal)</label>
                                                                    <input type="number" value={customSupplementData.calories} onChange={(e) => setCustomSupplementData({...customSupplementData, calories: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-gray-600">タンパク質 (g)</label>
                                                                    <input type="number" value={customSupplementData.protein} onChange={(e) => setCustomSupplementData({...customSupplementData, protein: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-gray-600">脂質 (g)</label>
                                                                    <input type="number" value={customSupplementData.fat} onChange={(e) => setCustomSupplementData({...customSupplementData, fat: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-gray-600">炭水化物 (g)</label>
                                                                    <input type="number" value={customSupplementData.carbs} onChange={(e) => setCustomSupplementData({...customSupplementData, carbs: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="border-t pt-2">
                                                            <p className="text-xs font-medium text-gray-700 mb-2">ビタミン（{customSupplementData.servingSize}{customSupplementData.servingUnit}あたり）</p>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div><label className="text-xs text-gray-600">ビタミンA (μg)</label><input type="number" value={customSupplementData.vitaminA} onChange={(e) => setCustomSupplementData({...customSupplementData, vitaminA: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                                <div><label className="text-xs text-gray-600">ビタミンB1 (mg)</label><input type="number" value={customSupplementData.vitaminB1} onChange={(e) => setCustomSupplementData({...customSupplementData, vitaminB1: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                                <div><label className="text-xs text-gray-600">ビタミンB2 (mg)</label><input type="number" value={customSupplementData.vitaminB2} onChange={(e) => setCustomSupplementData({...customSupplementData, vitaminB2: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                                <div><label className="text-xs text-gray-600">ビタミンB6 (mg)</label><input type="number" value={customSupplementData.vitaminB6} onChange={(e) => setCustomSupplementData({...customSupplementData, vitaminB6: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                                <div><label className="text-xs text-gray-600">ビタミンB12 (μg)</label><input type="number" value={customSupplementData.vitaminB12} onChange={(e) => setCustomSupplementData({...customSupplementData, vitaminB12: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                                <div><label className="text-xs text-gray-600">ビタミンC (mg)</label><input type="number" value={customSupplementData.vitaminC} onChange={(e) => setCustomSupplementData({...customSupplementData, vitaminC: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                                <div><label className="text-xs text-gray-600">ビタミンD (μg)</label><input type="number" value={customSupplementData.vitaminD} onChange={(e) => setCustomSupplementData({...customSupplementData, vitaminD: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                                <div><label className="text-xs text-gray-600">ビタミンE (mg)</label><input type="number" value={customSupplementData.vitaminE} onChange={(e) => setCustomSupplementData({...customSupplementData, vitaminE: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                                <div><label className="text-xs text-gray-600">ビタミンK (μg)</label><input type="number" value={customSupplementData.vitaminK} onChange={(e) => setCustomSupplementData({...customSupplementData, vitaminK: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                                <div><label className="text-xs text-gray-600">ナイアシン (mg)</label><input type="number" value={customSupplementData.niacin} onChange={(e) => setCustomSupplementData({...customSupplementData, niacin: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                                <div><label className="text-xs text-gray-600">パントテン酸 (mg)</label><input type="number" value={customSupplementData.pantothenicAcid} onChange={(e) => setCustomSupplementData({...customSupplementData, pantothenicAcid: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                                <div><label className="text-xs text-gray-600">ビオチン (μg)</label><input type="number" value={customSupplementData.biotin} onChange={(e) => setCustomSupplementData({...customSupplementData, biotin: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                                <div><label className="text-xs text-gray-600">葉酸 (μg)</label><input type="number" value={customSupplementData.folicAcid} onChange={(e) => setCustomSupplementData({...customSupplementData, folicAcid: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                            </div>
                                                        </div>

                                                        <div className="border-t pt-2">
                                                            <p className="text-xs font-medium text-gray-700 mb-2">ミネラル（{customSupplementData.servingSize}{customSupplementData.servingUnit}あたり）</p>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div><label className="text-xs text-gray-600">ナトリウム (mg)</label><input type="number" value={customSupplementData.sodium} onChange={(e) => setCustomSupplementData({...customSupplementData, sodium: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                                <div><label className="text-xs text-gray-600">カリウム (mg)</label><input type="number" value={customSupplementData.potassium} onChange={(e) => setCustomSupplementData({...customSupplementData, potassium: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                                <div><label className="text-xs text-gray-600">カルシウム (mg)</label><input type="number" value={customSupplementData.calcium} onChange={(e) => setCustomSupplementData({...customSupplementData, calcium: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                                <div><label className="text-xs text-gray-600">マグネシウム (mg)</label><input type="number" value={customSupplementData.magnesium} onChange={(e) => setCustomSupplementData({...customSupplementData, magnesium: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                                <div><label className="text-xs text-gray-600">リン (mg)</label><input type="number" value={customSupplementData.phosphorus} onChange={(e) => setCustomSupplementData({...customSupplementData, phosphorus: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                                <div><label className="text-xs text-gray-600">鉄 (mg)</label><input type="number" value={customSupplementData.iron} onChange={(e) => setCustomSupplementData({...customSupplementData, iron: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                                <div><label className="text-xs text-gray-600">亜鉛 (mg)</label><input type="number" value={customSupplementData.zinc} onChange={(e) => setCustomSupplementData({...customSupplementData, zinc: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                                <div><label className="text-xs text-gray-600">銅 (mg)</label><input type="number" value={customSupplementData.copper} onChange={(e) => setCustomSupplementData({...customSupplementData, copper: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                                <div><label className="text-xs text-gray-600">マンガン (mg)</label><input type="number" value={customSupplementData.manganese} onChange={(e) => setCustomSupplementData({...customSupplementData, manganese: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                                <div><label className="text-xs text-gray-600">ヨウ素 (μg)</label><input type="number" value={customSupplementData.iodine} onChange={(e) => setCustomSupplementData({...customSupplementData, iodine: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                                <div><label className="text-xs text-gray-600">セレン (μg)</label><input type="number" value={customSupplementData.selenium} onChange={(e) => setCustomSupplementData({...customSupplementData, selenium: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                                <div><label className="text-xs text-gray-600">クロム (μg)</label><input type="number" value={customSupplementData.chromium} onChange={(e) => setCustomSupplementData({...customSupplementData, chromium: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                                <div><label className="text-xs text-gray-600">モリブデン (μg)</label><input type="number" value={customSupplementData.molybdenum} onChange={(e) => setCustomSupplementData({...customSupplementData, molybdenum: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                            </div>
                                                        </div>

                                                        <div className="border-t pt-2">
                                                            <p className="text-xs font-medium text-gray-700 mb-2">その他栄養素</p>
                                                            {customSupplementData.otherNutrients.map((nutrient, idx) => (
                                                                <div key={idx} className="mb-3 p-2 border rounded-lg bg-gray-50">
                                                                    <div className="flex justify-between items-center mb-1">
                                                                        <label className="text-xs font-medium text-gray-600">名</label>
                                                                        <button onClick={() => { const updated = customSupplementData.otherNutrients.filter((_, i) => i !== idx); setCustomSupplementData({...customSupplementData, otherNutrients: updated}); }} className="text-red-500 px-1"><Icon name="X" size={14} /></button>
                                                                    </div>
                                                                    <input type="text" value={nutrient.name} onChange={(e) => { const updated = [...customSupplementData.otherNutrients]; updated[idx].name = e.target.value; setCustomSupplementData({...customSupplementData, otherNutrients: updated}); }} placeholder="栄養素名" className="w-full px-2 py-1 text-xs border rounded mb-2" />

                                                                    <label className="text-xs font-medium text-gray-600 block mb-1">量と単位</label>
                                                                    <div className="flex gap-2">
                                                                        <input type="number" value={nutrient.amount} onChange={(e) => { const updated = [...customSupplementData.otherNutrients]; updated[idx].amount = e.target.value; setCustomSupplementData({...customSupplementData, otherNutrients: updated}); }} placeholder="量" className="flex-1 px-2 py-1 text-xs border rounded" />
                                                                        <input type="text" value={nutrient.unit} onChange={(e) => { const updated = [...customSupplementData.otherNutrients]; updated[idx].unit = e.target.value; setCustomSupplementData({...customSupplementData, otherNutrients: updated}); }} placeholder="単位" className="w-16 px-2 py-1 text-xs border rounded" />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            <button onClick={() => setCustomSupplementData({...customSupplementData, otherNutrients: [...customSupplementData.otherNutrients, {name: '', amount: '', unit: ''}]})} className="w-full px-2 py-1.5 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-xs">+ 追加</button>
                                                        </div>

                                                        {/* 保存方法選択 */}
                                                        <div className="border-t pt-4 mt-4">
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <label className="text-sm font-medium text-gray-700">保存方法</label>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowSaveMethodInfo(true)}
                                                                    className="text-blue-600 hover:text-blue-700"
                                                                >
                                                                    <Icon name="Info" size={16} />
                                                                </button>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                                                                    <input
                                                                        type="radio"
                                                                        name="saveMethod"
                                                                        value="database"
                                                                        checked={saveMethod === 'database'}
                                                                        onChange={(e) => setSaveMethod(e.target.value)}
                                                                        className="mt-0.5"
                                                                    />
                                                                    <div className="flex-1">
                                                                        <div className="font-medium text-sm text-gray-900">データベースに保存</div>
                                                                        <div className="text-xs text-gray-600 mt-0.5">後で検索して使用できます</div>
                                                                    </div>
                                                                </label>
                                                                <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                                                                    <input
                                                                        type="radio"
                                                                        name="saveMethod"
                                                                        value="addToList"
                                                                        checked={saveMethod === 'addToList'}
                                                                        onChange={(e) => setSaveMethod(e.target.value)}
                                                                        className="mt-0.5"
                                                                    />
                                                                    <div className="flex-1">
                                                                        <div className="font-medium text-sm text-gray-900">リストに追加</div>
                                                                        <div className="text-xs text-gray-600 mt-0.5">今すぐ記録に追加されます</div>
                                                                    </div>
                                                                </label>
                                                            </div>
                                                        </div>

                                                        <button
                                                            onClick={() => {
                                                                if (!customSupplementData.name.trim()) {
                                                                    alert('アイテム名を入力してください');
                                                                    return;
                                                                }

                                                                // itemTypeに応じてカテゴリを自動設定
                                                                const finalCategory = customSupplementData.itemType === 'food' ? 'カスタム食材'
                                                                    : customSupplementData.itemType === 'recipe' ? 'カスタム料理'
                                                                    : 'カスタムサプリ';

                                                                // PFCからカロリーを自動計算（カロリーが0または未設定の場合）
                                                                let calculatedCalories = customSupplementData.calories || 0;
                                                                if (calculatedCalories === 0 && (customSupplementData.protein || customSupplementData.fat || customSupplementData.carbs)) {
                                                                    calculatedCalories = Math.round(
                                                                        (customSupplementData.protein || 0) * 4 +
                                                                        (customSupplementData.fat || 0) * 9 +
                                                                        (customSupplementData.carbs || 0) * 4
                                                                    );
                                                                    console.log('🔢 PFCからカロリーを自動計算:', calculatedCalories, 'kcal');
                                                                }

                                                                // localStorageに保存するデータ
                                                                const customItem = {
                                                                    itemType: customSupplementData.itemType,
                                                                    name: customSupplementData.name,
                                                                    category: finalCategory,
                                                                    servingSize: customSupplementData.servingSize,
                                                                    servingUnit: customSupplementData.servingUnit,
                                                                    unit: customSupplementData.unit || customSupplementData.servingUnit,  // 表示単位を追加
                                                                    calories: calculatedCalories,
                                                                    protein: customSupplementData.protein,
                                                                    fat: customSupplementData.fat,
                                                                    carbs: customSupplementData.carbs,
                                                                    vitamins: {
                                                                        A: customSupplementData.vitaminA || 0,
                                                                        B1: customSupplementData.vitaminB1 || 0,
                                                                        B2: customSupplementData.vitaminB2 || 0,
                                                                        B6: customSupplementData.vitaminB6 || 0,
                                                                        B12: customSupplementData.vitaminB12 || 0,
                                                                        C: customSupplementData.vitaminC || 0,
                                                                        D: customSupplementData.vitaminD || 0,
                                                                        E: customSupplementData.vitaminE || 0,
                                                                        K: customSupplementData.vitaminK || 0,
                                                                        B3: customSupplementData.niacin || 0,
                                                                        B5: customSupplementData.pantothenicAcid || 0,
                                                                        B7: customSupplementData.biotin || 0,
                                                                        B9: customSupplementData.folicAcid || 0
                                                                    },
                                                                    minerals: {
                                                                        sodium: customSupplementData.sodium || 0,
                                                                        potassium: customSupplementData.potassium || 0,
                                                                        calcium: customSupplementData.calcium || 0,
                                                                        magnesium: customSupplementData.magnesium || 0,
                                                                        phosphorus: customSupplementData.phosphorus || 0,
                                                                        iron: customSupplementData.iron || 0,
                                                                        zinc: customSupplementData.zinc || 0,
                                                                        copper: customSupplementData.copper || 0,
                                                                        manganese: customSupplementData.manganese || 0,
                                                                        iodine: customSupplementData.iodine || 0,
                                                                        selenium: customSupplementData.selenium || 0,
                                                                        chromium: customSupplementData.chromium || 0
                                                                    }
                                                                };

                                                                // localStorageに保存
                                                                const customFoods = JSON.parse(localStorage.getItem('customFoods') || '[]');
                                                                customFoods.push(customItem);
                                                                localStorage.setItem('customFoods', JSON.stringify(customFoods));

                                                                // 保存方法に応じて処理を分岐
                                                                if (saveMethod === 'addToList') {
                                                                    const newItem = {
                                                                        name: customSupplementData.name,
                                                                        amount: 1,  // 1個/1本として追加（ユーザーは後で調整可能）
                                                                        unit: customSupplementData.unit || customSupplementData.servingUnit,
                                                                        calories: calculatedCalories, // 1個/1本あたりのカロリー
                                                                        protein: customSupplementData.protein,
                                                                        fat: customSupplementData.fat,
                                                                        carbs: customSupplementData.carbs,
                                                                        category: finalCategory,
                                                                        isCustom: true,
                                                                        vitamins: customItem.vitamins,
                                                                        minerals: customItem.minerals,
                                                                        _base: {
                                                                            calories: calculatedCalories,
                                                                            protein: customSupplementData.protein,
                                                                            fat: customSupplementData.fat,
                                                                            carbs: customSupplementData.carbs,
                                                                            servingSize: customSupplementData.servingSize,
                                                                            servingUnit: customSupplementData.servingUnit,
                                                                            unit: customSupplementData.unit || customSupplementData.servingUnit
                                                                        }
                                                                    };
                                                                    setAddedItems([...addedItems, newItem]);
                                                                }

                                                                // フォームをリセット
                                                                setCustomSupplementData({
                                                                    itemType: 'food',
                                                                    name: '', category: 'ビタミン・ミネラル', servingSize: 100, servingUnit: 'g', unit: 'g',
                                                                    calories: 0, protein: 0, fat: 0, carbs: 0,
                                                                    vitaminA: 0, vitaminB1: 0, vitaminB2: 0, vitaminB6: 0, vitaminB12: 0,
                                                                    vitaminC: 0, vitaminD: 0, vitaminE: 0, vitaminK: 0,
                                                                    niacin: 0, pantothenicAcid: 0, biotin: 0, folicAcid: 0,
                                                                    sodium: 0, potassium: 0, calcium: 0, magnesium: 0, phosphorus: 0,
                                                                    iron: 0, zinc: 0, copper: 0, manganese: 0, iodine: 0, selenium: 0, chromium: 0, molybdenum: 0,
                                                                    otherNutrients: []
                                                                });
                                                                setShowCustomSupplementForm(false);
                                                                setSaveMethod('database'); // デフォルトに戻す

                                                                // AI写真解析経由の場合、コールバックを実行してrecognizedFoodsを更新
                                                                if (isFromAIRecognition && onCustomCompleteCallback) {
                                                                    onCustomCompleteCallback({
                                                                        calories: calculatedCalories, // PFCから計算されたカロリー
                                                                        protein: customSupplementData.protein,
                                                                        fat: customSupplementData.fat,
                                                                        carbs: customSupplementData.carbs,
                                                                        isUnknown: false
                                                                    });
                                                                    setOnCustomCompleteCallback(null); // コールバックをクリア
                                                                }

                                                                setIsFromAIRecognition(false);
                                                                // AI写真解析モーダルはマウントされたままなので、
                                                                // カスタムモーダルを閉じるだけで自動的に認識リストが表示される

                                                                // 通知メッセージ
                                                                if (saveMethod === 'database') {
                                                                    alert('カスタムアイテムを保存しました！食材検索から追加できます。');
                                                                } else {
                                                                    alert('カスタムアイテムを作成し、追加しました！');
                                                                }

                                                                setIsAICreation(false);
                                                            }}
                                                            className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                                                        >
                                                            {saveMethod === 'addToList' ? '保存して追加' : '保存'}
                                                        </button>

                                                        {/* 保存方法説明モーダル */}
                                                        {showSaveMethodInfo && (
                                                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10001]" onClick={() => setShowSaveMethodInfo(false)}>
                                                                <div className="bg-white rounded-lg p-6 max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
                                                                    <div className="flex justify-between items-start mb-4">
                                                                        <h3 className="text-lg font-bold text-gray-900">保存方法について</h3>
                                                                        <button onClick={() => setShowSaveMethodInfo(false)} className="text-gray-500 hover:text-gray-700">
                                                                            <Icon name="X" size={20} />
                                                                        </button>
                                                                    </div>

                                                                    <div className="space-y-4">
                                                                        <div className="border-l-4 border-blue-500 pl-4 py-2">
                                                                            <h4 className="font-semibold text-gray-900 mb-1">データベースに保存</h4>
                                                                            <p className="text-sm text-gray-700">
                                                                                カスタムアイテムをデータベースに保存します。今すぐ記録には追加されませんが、次回以降、食材検索から簡単に見つけて使用できます。
                                                                            </p>
                                                                            <p className="text-xs text-gray-600 mt-2">
                                                                                <strong>使用例：</strong>よく使う自家製料理やサプリを登録しておきたい場合
                                                                            </p>
                                                                        </div>

                                                                        <div className="border-l-4 border-green-500 pl-4 py-2">
                                                                            <h4 className="font-semibold text-gray-900 mb-1">リストに追加</h4>
                                                                            <p className="text-sm text-gray-700">
                                                                                カスタムアイテムをデータベースに保存し、同時に現在の記録リストにも追加します。今すぐ記録したい場合に便利です。
                                                                            </p>
                                                                            <p className="text-xs text-gray-600 mt-2">
                                                                                <strong>使用例：</strong>AI写真解析で検出された未登録の食品を編集して記録したい場合
                                                                            </p>
                                                                        </div>
                                                                    </div>

                                                                    <button
                                                                        onClick={() => setShowSaveMethodInfo(false)}
                                                                        className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                                                    >
                                                                        閉じる
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                </div>
                            </div>
                        )}

                        {!selectedItem && !showAIFoodRecognition && !showCustomSupplementForm && !showSearchModal ? null : selectedItem && (
                            <div className="space-y-4">
                                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-bold text-lg">{selectedItem.name}</h4>
                                            <p className="text-sm text-gray-600">{selectedItem.category}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                // 追加済みアイテムから編集している場合は、検索モーダルに戻る
                                                if (editingItemIndex !== null) {
                                                    setShowSearchModal(true);
                                                }
                                                setSelectedItem(null);
                                                setEditingItemIndex(null);
                                            }}
                                            className="text-gray-500 hover:text-gray-700"
                                        >
                                            <Icon name="X" size={20} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 mt-3 text-sm">
                                        <div>
                                            <p className="text-gray-600">カロリー</p>
                                            <p className="font-bold text-cyan-600">{selectedItem.calories}kcal</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">P</p>
                                            <p className="font-bold text-red-600">{selectedItem.protein}g</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">F</p>
                                            <p className="font-bold text-yellow-600">{selectedItem.fat}g</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">C</p>
                                            <p className="font-bold text-green-600">{selectedItem.carbs}g</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        ※{selectedItem.servingSize || 100}{selectedItem.servingUnit || 'g'}あたり
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        量 (g)
                                    </label>

                                    {/* スライダー */}
                                    <div className="mb-3">
                                        <input
                                            type="range"
                                            min="0"
                                            max="500"
                                            step="5"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                            style={{
                                                background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${(amount/500)*100}%, #e5e7eb ${(amount/500)*100}%, #e5e7eb 100%)`
                                            }}
                                        />
                                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                                            <span onClick={() => setAmount(0)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">0g</span>
                                            <span onClick={() => setAmount(100)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">100g</span>
                                            <span onClick={() => setAmount(200)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">200g</span>
                                            <span onClick={() => setAmount(300)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">300g</span>
                                            <span onClick={() => setAmount(400)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">400g</span>
                                            <span onClick={() => setAmount(500)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">500g</span>
                                        </div>
                                    </div>

                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    />
                                    {/* 増減ボタン */}
                                    <div className="grid grid-cols-6 gap-1 mt-2">
                                        <button
                                            onClick={() => setAmount(Math.max(0, Number(amount) - 100))}
                                            className="py-1.5 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200 font-medium"
                                        >
                                            -100
                                        </button>
                                        <button
                                            onClick={() => setAmount(Math.max(0, Number(amount) - 50))}
                                            className="py-1.5 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 font-medium"
                                        >
                                            -50
                                        </button>
                                        <button
                                            onClick={() => setAmount(Math.max(0, Number(amount) - 10))}
                                            className="py-1.5 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 font-medium"
                                        >
                                            -10
                                        </button>
                                        <button
                                            onClick={() => setAmount(Number(amount) + 10)}
                                            className="py-1.5 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100 font-medium"
                                        >
                                            +10
                                        </button>
                                        <button
                                            onClick={() => setAmount(Number(amount) + 50)}
                                            className="py-1.5 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100 font-medium"
                                        >
                                            +50
                                        </button>
                                        <button
                                            onClick={() => setAmount(Number(amount) + 100)}
                                            className="py-1.5 bg-green-100 text-green-600 rounded text-xs hover:bg-green-200 font-medium"
                                        >
                                            +100
                                        </button>
                                    </div>
                                    {/* 倍増減ボタン */}
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        <button
                                            onClick={() => setAmount(Math.max(0, Math.round(Number(amount) * 0.5)))}
                                            className="py-1.5 bg-purple-50 text-purple-600 rounded text-xs hover:bg-purple-100 font-medium"
                                        >
                                            ×0.5
                                        </button>
                                        <button
                                            onClick={() => setAmount(Math.round(Number(amount) * 2))}
                                            className="py-1.5 bg-purple-50 text-purple-600 rounded text-xs hover:bg-purple-100 font-medium"
                                        >
                                            ×2
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-sm font-medium mb-2">摂取量</p>
                                    <div className="grid grid-cols-4 gap-2">
                                        <div>
                                            <p className="text-xs text-gray-600">カロリー</p>
                                            <p className="font-bold" style={{color: '#7686BA'}}>
                                                {Math.round(selectedItem.calories * (Number(amount) / (selectedItem.servingSize || 100)))}kcal
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600">P</p>
                                            <p className="font-bold text-red-600">{(selectedItem.protein * (Number(amount) / (selectedItem.servingSize || 100))).toFixed(1)}g</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600">F</p>
                                            <p className="font-bold text-yellow-600">{(selectedItem.fat * (Number(amount) / (selectedItem.servingSize || 100))).toFixed(1)}g</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600">C</p>
                                            <p className="font-bold text-green-600">{(selectedItem.carbs * (Number(amount) / (selectedItem.servingSize || 100))).toFixed(1)}g</p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        const numAmount = Number(amount);
                                        const ratio = numAmount / (selectedItem.servingSize || 100);

                                        // Calculate vitamins and minerals based on amount
                                        const vitamins = {};
                                        const minerals = {};

                                        if (selectedItem.vitamins) {
                                            Object.keys(selectedItem.vitamins).forEach(key => {
                                                vitamins[key] = selectedItem.vitamins[key] * ratio;
                                            });
                                        }

                                        if (selectedItem.minerals) {
                                            Object.keys(selectedItem.minerals).forEach(key => {
                                                minerals[key] = selectedItem.minerals[key] * ratio;
                                            });
                                        }

                                        // その他の栄養素を計算
                                        const otherNutrients = {};
                                        const otherNutrientKeys = ['caffeine', 'catechin', 'tannin', 'polyphenol', 'chlorogenicAcid',
                                                                    'creatine', 'lArginine', 'lCarnitine', 'EPA', 'DHA', 'coQ10',
                                                                    'lutein', 'astaxanthin'];
                                        otherNutrientKeys.forEach(key => {
                                            if (selectedItem[key]) {
                                                otherNutrients[key] = selectedItem[key] * ratio;
                                            }
                                        });

                                        const newItem = {
                                            name: selectedItem.name,
                                            amount: numAmount,
                                            protein: selectedItem.protein * ratio,
                                            fat: selectedItem.fat * ratio,
                                            carbs: selectedItem.carbs * ratio,
                                            calories: selectedItem.calories * ratio,
                                            vitamins: vitamins,
                                            minerals: minerals,
                                            otherNutrients: otherNutrients
                                        };

                                        // 編集モードの場合は既存アイテムを更新、それ以外は新規追加
                                        if (editingItemIndex !== null) {
                                            const updatedItems = [...addedItems];
                                            updatedItems[editingItemIndex] = newItem;
                                            setAddedItems(updatedItems);
                                            setEditingItemIndex(null);
                                        } else {
                                            setAddedItems([...addedItems, newItem]);
                                        }

                                        setSelectedItem(null);
                                        setAmount('100');
                                        setShowSearchModal(true);
                                    }}
                                    className="w-full bg-indigo-600 text-white font-bold py-2 rounded-lg hover:bg-indigo-700 transition text-sm"
                                >
                                    {editingItemIndex !== null ? '更新' : 'アイテムを追加'}
                                </button>
                            </div>
                        )}


                        {/* AI食事認識モーダル */}
                        {showAIFoodRecognition && (
                            <div style={{ display: showCustomSupplementForm ? 'none' : 'block' }}>
                                <AIFoodRecognition
                                    onFoodsRecognized={handleFoodsRecognized}
                                    onClose={() => setShowAIFoodRecognition(false)}
                                    onOpenCustomCreator={handleOpenCustomFromAI}
                                />
                            </div>
                        )}

                        {/* カスタム作成モーダル（食材・料理・サプリ共通） */}
                        {showCustomFoodCreator && (
                            <CustomFoodCreator
                                initialName=""
                                itemType={customSupplementData.itemType}
                                onClose={() => setShowCustomFoodCreator(false)}
                                onSave={(customFood) => {
                                    // 全てのアイテムをaddedItemsに追加（統一的な処理）
                                    setAddedItems([...addedItems, {
                                        ...customFood,
                                        amount: customFood.servingSize || customFood.amount || 100,
                                        isCustom: true
                                    }]);
                                    setShowCustomFoodCreator(false);
                                }}
                            />
                        )}
                    </div>
                );
            };

            return (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden slide-up flex flex-col">
                        <div className="bg-white border-b p-4 flex justify-between items-center flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold">
                                    {type === 'meal' && '食事を記録'}
                                    {type === 'workout' && '運動を記録'}
                                    {type === 'condition' && 'コンディションを記録'}
                                </h3>
                                {type === 'meal' && (
                                    <button
                                        onClick={() => setShowMealInfoModal(true)}
                                        className="p-1.5 hover:bg-gray-100 rounded-full transition"
                                        title="使い方"
                                    >
                                        <Icon name="HelpCircle" size={20} className="text-green-600" />
                                    </button>
                                )}
                                {type === 'workout' && (
                                    <button
                                        onClick={() => setShowWorkoutInfoModal(true)}
                                        className="p-1.5 hover:bg-gray-100 rounded-full transition"
                                        title="使い方"
                                    >
                                        <Icon name="HelpCircle" size={20} className="text-orange-600" />
                                    </button>
                                )}
                            </div>
                            <button onClick={() => {
                                // 食事記録中に食材を選択している場合は、まず検索リストに戻る
                                if (type === 'meal' && selectedItem) {
                                    setSelectedItem(null);
                                }
                                // トレーニング記録中に種目を選択している場合は、まず検索リストに戻る
                                else if (type === 'workout' && currentExercise) {
                                    setCurrentExercise(null);
                                }
                                // それ以外の場合はモーダルを閉じる
                                else {
                                    onClose();
                                }
                            }} className="p-2 hover:bg-gray-100 rounded-full">
                                <Icon name="X" size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            {type === 'meal' && renderFoodInput()}
                            {type === 'workout' && renderWorkoutInput()}
                            {type === 'condition' && renderConditionInput()}
                        </div>
                    </div>

                    {/* 食事記録の使い方モーダル */}
                    {showMealInfoModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 z-[10002] flex items-center justify-center p-4">
                            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                                {/* ヘッダー */}
                                <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 rounded-t-2xl flex justify-between items-center z-10">
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <Icon name="Utensils" size={20} />
                                        食事記録の使い方
                                    </h3>
                                    <button
                                        onClick={() => setShowMealInfoModal(false)}
                                        className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition"
                                    >
                                        <Icon name="X" size={20} />
                                    </button>
                                </div>

                                <div className="p-6 space-y-6">
                                    {/* 記録方法 */}
                                    <div className="space-y-4">
                                        <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                            <Icon name="Plus" size={20} className="text-green-600" />
                                            食事の記録方法
                                        </h4>
                                        <div className="space-y-3">
                                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                                <p className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                                                    <Icon name="Camera" size={18} />
                                                    方法1: 写真から記録（AI解析）
                                                </p>
                                                <p className="text-sm text-purple-800 mb-2">
                                                    食事の写真を撮影すると、AIが自動で食材を認識して栄養素を計算します。最も簡単な方法です。精肉のパックを解析すると、g数がそのまま一覧に登録されます。
                                                </p>
                                                <p className="text-xs text-purple-700">
                                                    💡 クレジット1個消費 | 複数の食材を一度に認識可能
                                                </p>
                                            </div>
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                                <p className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                                    <Icon name="Search" size={18} />
                                                    方法2: 検索して記録
                                                </p>
                                                <p className="text-sm text-blue-800 mb-2">
                                                    食材名で検索してデータベースから選択します。正確な栄養素データで記録できます。
                                                </p>
                                                <p className="text-xs text-blue-700">
                                                    💡 クレジット不要 | 1,000種類以上の食材データベース
                                                </p>
                                            </div>
                                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                                <p className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                                                    <Icon name="Edit" size={18} />
                                                    方法3: 手動で作成
                                                </p>
                                                <p className="text-sm text-amber-800 mb-2">
                                                    カスタム食材を自分で作成します。栄養成分表示や八訂データを参照して入力します。
                                                </p>
                                                <p className="text-xs text-amber-700">
                                                    💡 クレジット不要 | 一度作成すると保存され、次回から簡単に使用可能
                                                </p>
                                            </div>
                                        </div>
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
                                            <p className="text-sm text-green-800">
                                                <strong>💡 推奨:</strong> Your Coach+は自炊での食事管理を前提として設計されています。食材単位で記録することで、より正確な栄養管理が可能になります。
                                            </p>
                                        </div>
                                    </div>

                                    {/* テンプレート機能 */}
                                    <div className="space-y-3">
                                        <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                            <Icon name="Clock" size={20} className="text-indigo-600" />
                                            テンプレート機能
                                        </h4>
                                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                                            <p className="font-semibold text-indigo-900 mb-2">
                                                よく食べる食事を保存して簡単に記録
                                            </p>
                                            <p className="text-sm text-indigo-800 mb-3">
                                                12日以上利用すると開放される機能です。頻繁に食べる食事の組み合わせをテンプレートとして保存できます。
                                            </p>
                                            <div className="bg-white rounded p-3 text-sm text-gray-700 border border-indigo-300">
                                                <p className="font-semibold mb-1">使い方:</p>
                                                <ol className="list-decimal list-inside space-y-1 text-xs">
                                                    <li>食事を記録した後、「テンプレートとして保存」をタップ</li>
                                                    <li>次回から記録画面の下部にテンプレートが表示される</li>
                                                    <li>テンプレートをタップすると、保存した食事がすぐに追加される</li>
                                                </ol>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 編集・削除 */}
                                    <div className="space-y-3">
                                        <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                            <Icon name="Settings" size={20} className="text-gray-600" />
                                            編集・削除
                                        </h4>
                                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                            <p className="font-semibold text-gray-900 mb-2">食事を編集・削除する</p>
                                            <p className="text-sm text-gray-700 mb-2">
                                                食事カードの右上にある「ペン」アイコンで食事全体を編集、「ゴミ箱」アイコンで削除できます。
                                            </p>
                                            <p className="text-xs text-gray-600">
                                                💡 各食材の個別編集・削除は、編集画面で行えます。
                                            </p>
                                        </div>
                                    </div>

                                    {/* 閉じるボタン */}
                                    <div className="pt-4 border-t">
                                        <button
                                            onClick={() => setShowMealInfoModal(false)}
                                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 transition"
                                        >
                                            閉じる
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 運動記録の使い方モーダル */}
                    {showWorkoutInfoModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 z-[10002] flex items-center justify-center p-4">
                            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                                {/* ヘッダー */}
                                <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-red-600 text-white p-4 rounded-t-2xl flex justify-between items-center z-10">
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <Icon name="Dumbbell" size={20} />
                                        運動記録の使い方
                                    </h3>
                                    <button
                                        onClick={() => setShowWorkoutInfoModal(false)}
                                        className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition"
                                    >
                                        <Icon name="X" size={20} />
                                    </button>
                                </div>

                                <div className="p-6 space-y-6">
                                    {/* 記録方法 */}
                                    <div className="space-y-4">
                                        <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                            <Icon name="Plus" size={20} className="text-orange-600" />
                                            運動の記録方法
                                        </h4>
                                        <div className="space-y-3">
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                                <p className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                                    <Icon name="Search" size={18} />
                                                    方法1: 検索して記録
                                                </p>
                                                <p className="text-sm text-blue-800 mb-2">
                                                    種目名で検索してデータベースから選択します。
                                                </p>
                                                <p className="text-xs text-blue-700">
                                                    💡 100種類以上の運動種目データベース
                                                </p>
                                            </div>
                                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                                <p className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                                                    <Icon name="Edit" size={18} />
                                                    方法2: 手動で作成
                                                </p>
                                                <p className="text-sm text-amber-800 mb-2">
                                                    カスタム種目を自分で作成します。オリジナルの運動を記録できます。
                                                </p>
                                                <p className="text-xs text-amber-700">
                                                    💡 一度作成すると保存され、次回から簡単に使用可能
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 入力項目 */}
                                    <div className="space-y-3">
                                        <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                            <Icon name="Edit3" size={20} className="text-purple-600" />
                                            入力項目
                                        </h4>
                                        <div className="space-y-2">
                                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                                <p className="font-semibold text-purple-900 mb-1">種目・セット</p>
                                                <p className="text-sm text-purple-800">
                                                    運動の種目名と実施したセット数を入力します。
                                                </p>
                                            </div>
                                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                                <p className="font-semibold text-purple-900 mb-1">重量・回数</p>
                                                <p className="text-sm text-purple-800 mb-2">
                                                    筋トレの場合は、使用重量（kg）と回数を入力します。自重トレーニングの場合は、自分の体重（kg）を記入します。
                                                </p>
                                                <p className="text-xs text-purple-700">
                                                    💡 総重量 = 重量 × 回数 × セット数
                                                </p>
                                            </div>
                                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                                <p className="font-semibold text-purple-900 mb-1">時間</p>
                                                <p className="text-sm text-purple-800">
                                                    運動の実施時間（分）を入力します。筋トレ、有酸素運動、ストレッチなど、すべての運動で記録できます。
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* RM値について */}
                                    <div className="space-y-3">
                                        <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                            <Icon name="TrendingUp" size={20} className="text-green-600" />
                                            RM値とは
                                        </h4>
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                            <p className="font-semibold text-green-900 mb-2">
                                                Repetition Maximum（最大挙上重量）
                                            </p>
                                            <p className="text-sm text-green-800 mb-3">
                                                RM値は、その重量で何回できるかを示す指標です。例えば、100kgで10回できる場合、「10RM = 100kg」となります。
                                            </p>
                                            <div className="bg-white rounded p-3 text-sm text-gray-700 border border-green-300">
                                                <p className="font-semibold mb-2">RM値の計算式:</p>
                                                <p className="text-xs mb-2">1RM（最大挙上重量） = 使用重量 × (1 + 回数 ÷ 40)</p>
                                                <p className="text-xs text-green-700">
                                                    例: 80kg × 10回 → 1RM = 100kg
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 総重量と総時間 */}
                                    <div className="space-y-3">
                                        <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                            <Icon name="BarChart3" size={20} className="text-indigo-600" />
                                            総重量と総時間の表示
                                        </h4>
                                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                                            <p className="font-semibold text-indigo-900 mb-2">
                                                運動セクションの見出し横に表示
                                            </p>
                                            <p className="text-sm text-indigo-800 mb-3">
                                                その日の筋トレ総重量（kg）と全運動の総時間（分）が自動で集計されて表示されます。
                                            </p>
                                            <div className="bg-white rounded p-3 text-sm text-gray-700 border border-indigo-300 space-y-1">
                                                <p className="text-xs"><strong>総重量:</strong> すべての筋トレ種目の「重量×回数×セット数」の合計</p>
                                                <p className="text-xs"><strong>総時間:</strong> すべての運動の時間の合計</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 閉じるボタン */}
                                    <div className="pt-4 border-t">
                                        <button
                                            onClick={() => setShowWorkoutInfoModal(false)}
                                            className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold py-3 rounded-lg hover:from-orange-700 hover:to-red-700 transition"
                                        >
                                            閉じる
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* WorkoutInfoModal */}
                    {workoutInfoModal.show && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 z-[10001] flex items-center justify-center p-4">
                            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
                                <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
                                    <h3 className="text-lg font-bold">{workoutInfoModal.title}</h3>
                                    <button onClick={() => setWorkoutInfoModal({ show: false, title: '', content: '' })} className="text-gray-400 hover:text-gray-600">
                                        <Icon name="X" size={24} />
                                    </button>
                                </div>
                                <div className="p-6">
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{workoutInfoModal.content}</p>
                                </div>
                                <div className="p-6 border-t">
                                    <button
                                        onClick={() => setWorkoutInfoModal({ show: false, title: '', content: '' })}
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
        };


// グローバルに公開
window.AddItemView = AddItemView;
