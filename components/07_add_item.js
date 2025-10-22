// ===== Add Item Component =====
        const AddItemView = ({ type, onClose, onAdd, userProfile, predictedData, unlockedFeatures, user, currentRoutine, usageDays, dailyRecord, setInfoModal }) => {
            // 食事とサプリを統合する場合、itemTypeで管理
            const isMealOrSupplement = type === 'meal' || type === 'supplement';

            const [searchTerm, setSearchTerm] = useState('');
            const [selectedItem, setSelectedItem] = useState(null);
            const [amount, setAmount] = useState(type === 'supplement' ? '1' : '100');
            const [expandedCategories, setExpandedCategories] = useState({});
            const [mealName, setMealName] = useState('');
            const [addedItems, setAddedItems] = useState([]);
            const [editingItemIndex, setEditingItemIndex] = useState(null); // 編集中のアイテムインデックス
            const [selectedItems, setSelectedItems] = useState([]); // 複数選択用のstate
            const [mealTemplates, setMealTemplates] = useState([]);
            const [supplementTemplates, setSupplementTemplates] = useState([]);
            const [showTemplates, setShowTemplates] = useState(false);
            const [templateName, setTemplateName] = useState('');
            const [selectedExercise, setSelectedExercise] = useState(null);
            const [showAIFoodRecognition, setShowAIFoodRecognition] = useState(false);
            const [showCustomFoodCreator, setShowCustomFoodCreator] = useState(false);
            const [showSearchModal, setShowSearchModal] = useState(false);
            const [searchModalTab, setSearchModalTab] = useState('food');

            // 料理作成用のstate
            const [showRecipeCreator, setShowRecipeCreator] = useState(false);
            const [recipeIngredients, setRecipeIngredients] = useState([]);

            // サプリメント用のstate
            const [showCustomSupplementForm, setShowCustomSupplementForm] = useState(false);
            const [showQuickCreate, setShowQuickCreate] = useState(false);
            const [customSupplementData, setCustomSupplementData] = useState({
                itemType: 'food', // 'food', 'recipe', 'supplement'
                name: '',
                category: 'ビタミン・ミネラル',
                servingSize: 1,
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
            const [showWorkoutSearchModal, setShowWorkoutSearchModal] = useState(false);
            const [workoutTab, setWorkoutTab] = useState('anaerobic'); // 'anaerobic', 'aerobic', 'stretch'
            const [customExercise, setCustomExercise] = useState({
                name: '',
                majorCategory: '', // 筋トレ/有酸素/ストレッチ
                category: '', // 胸/背中/脚/HIIT/ダイナミックなど
                subcategory: '' // コンパウンド/アイソレーション/アイソメトリック（特性）
            });
            const [workoutInfoModal, setWorkoutInfoModal] = useState({ show: false, title: '', content: '' });
            const [showAdvancedTraining, setShowAdvancedTraining] = useState(false);
            const [rmRecord, setRmRecord] = useState({ reps: 1, weight: 50 });
            const [showSetTypeModal, setShowSetTypeModal] = useState(false);
            const [customExerciseData, setCustomExerciseData] = useState({
                name: '',
                category: 'その他',
                subcategory: '',
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
                } else if (type === 'workout') {
                    DataService.getWorkoutTemplates(user.uid).then(setWorkoutTemplates);
                    // ルーティンからワークアウト自動読み込み
                    if (currentRoutine && !currentRoutine.isRestDay && currentRoutine.exercises) {
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
                }
            }, [type]);

            // 編集モード: predictedDataがある場合、既存アイテムを表示
            useEffect(() => {
                if (predictedData && type === 'meal') {
                    // 食事の編集モード
                    if (predictedData.items && Array.isArray(predictedData.items)) {
                        // mealオブジェクトにitemsがある場合（複数アイテムの食事）
                        setAddedItems(predictedData.items.map(item => ({
                            ...item,
                            // 文字列のamountをパース（例: "100g" → 100）
                            amount: typeof item.amount === 'string' ? parseInt(item.amount) : (item.amount || 100)
                        })));
                        setMealName(predictedData.name || '');
                    } else {
                        // 単一アイテムの場合
                        setAddedItems([{
                            ...predictedData,
                            amount: predictedData.amount || 100
                        }]);
                    }
                } else if (predictedData && type === 'workout') {
                    // ワークアウトの編集モード
                    if (predictedData.exercise) {
                        setCurrentExercise(predictedData.exercise);
                    }
                    if (predictedData.sets && predictedData.sets.length > 0) {
                        setSets(predictedData.sets);
                    }
                }
            }, [predictedData, type]);

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

                    // サブスクリプションチェック: テンプレート数制限
                    const currentTemplates = await DataService.getSupplementTemplates(user.uid);
                    const access = SubscriptionUtils.canAddTemplate(userProfile, currentTemplates.length, 'supplement');
                    if (!access.allowed) {
                        alert(access.message);
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
                                            onClick={() => setSelectedItem(null)}
                                            className="text-gray-500 hover:text-gray-700"
                                        >
                                            <Icon name="X" size={20} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 mt-3 text-sm">
                                        <div>
                                            <p className="text-gray-600">カロリー</p>
                                            <p className="font-bold">{selectedItem.calories}kcal</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">P</p>
                                            <p className="font-bold">{selectedItem.protein}g</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">F</p>
                                            <p className="font-bold">{selectedItem.fat}g</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">C</p>
                                            <p className="font-bold">{selectedItem.carbs}g</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                        回数（1回分 = {selectedItem.unit || `${selectedItem.servingSize || 1}${selectedItem.servingUnit || 'g'}`}）
                                        <button
                                            type="button"
                                            onClick={() => setWorkoutInfoModal({
                                                show: true,
                                                title: 'サプリメント入力の使い方',
                                                content: `サプリメントの摂取回数を入力します。

【入力方法】
1. スライダーをドラッグして回数を設定（1～20回）
2. 目盛り数値（1、5、10など）をタップで即座に設定
3. 入力欄に直接数値を入力

【1回分とは？】
• プロテイン: 付属スプーン1杯（約25g）
• クレアチン: 付属スプーン1杯（約5g）
• マルチビタミン: 1粒・1錠
• BCAA: 付属スプーン1杯（約5g）

【入力例】
• プロテインを朝晩2回飲む → 「2」と入力
• マルチビタミンを1日1粒 → 「1」と入力
• クレアチンを1日4回 → 「4」と入力

【PFC自動計算】
入力した回数に応じて、たんぱく質（P）・脂質（F）・炭水化物（C）が自動計算され、1日の目標に反映されます。`
                                            })}
                                            className="text-blue-600 hover:text-blue-800"
                                        >
                                            <Icon name="Info" size={14} />
                                        </button>
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

                        {/* ③追加済みアイテム一覧 */}
                        {addedItems.length > 0 && (
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <p className="text-sm font-medium text-blue-900 mb-3">追加済み ({addedItems.length}品目)</p>
                                <div className="space-y-2">
                                    {addedItems.map((item, index) => (
                                        <div key={index} className="flex justify-between items-center bg-white p-2 rounded">
                                            <span className="text-sm">{item.name} × {item.amount}</span>
                                            <button
                                                onClick={() => setAddedItems(addedItems.filter((_, i) => i !== index))}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Icon name="X" size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ④テンプレート（一覧+新規保存） - 12日以上で開放 */}
                        {!selectedItem && supplementTemplates && supplementTemplates.length > 0 && (
                            <div className="space-y-3">
                                {supplementTemplates.map(template => (
                                    <button
                                        key={template.id}
                                        onClick={() => loadTemplate(template)}
                                        className="flex items-center gap-3 p-4 bg-white hover:bg-gray-50 rounded-xl border-2 border-gray-200 transition w-full text-left"
                                    >
                                        <Icon name="BookTemplate" size={24} className="text-gray-700" />
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-900">{template.name}</p>
                                            <p className="text-xs text-gray-500">{template.items.length}品目のテンプレート</p>
                                        </div>
                                        <Icon name="ChevronRight" size={20} className="text-gray-400" />
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* 古いテンプレート表示（削除予定） */}
                        {false && unlockedFeatures.includes(FEATURES.TRAINING_TEMPLATE.id) && !selectedItem && (
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
                                                {supplementTemplates.map(template => (
                                                    <div key={template.id} className="flex items-center gap-2 bg-white p-2 rounded border">
                                                        <button
                                                            onClick={() => loadTemplate(template)}
                                                            className="flex-1 text-left text-sm hover:text-blue-600"
                                                        >
                                                            <p className="font-medium">{template.name}</p>
                                                            <p className="text-xs text-gray-500">{template.items.length}品目</p>
                                                        </button>
                                                        <button
                                                            onClick={() => deleteTemplate(template.id)}
                                                            className="p-1 text-red-500 hover:text-red-700"
                                                        >
                                                            <Icon name="Trash2" size={16} />
                                                        </button>
                                                    </div>
                                                ))}
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
                                    <button type="button" onClick={() => {
                                        setWorkoutInfoModal({
                                            show: true,
                                            title: 'カスタムアイテム作成について',
                                            content: `データベースにない食材・料理・サプリメントを独自に登録できます。

【アイテムタイプの選択】
• 食材: 単品の食品（例: 自家製プロテインバー）
• 料理: 複数の食材を組み合わせた料理（例: 自家製カレー）
• サプリ: プロテイン、ビタミン・ミネラル、アミノ酸など

【基本情報の入力】
• 名前: アイテムの名称
• カテゴリ: 種類を選択
• 1回分の量: 1回あたりの摂取量と単位（例: 100g、30g、500ml）

【栄養素の入力】
• 基本栄養素: カロリー、タンパク質、脂質、炭水化物
• ビタミン・ミネラル: 詳細な微量栄養素（任意）
• すべて「1回分あたり」の含有量を入力してください

【データの参照方法】
1. 商品パッケージの栄養成分表示を確認
2. メーカー公式サイトの製品情報ページ
3. 栄養データベース（文部科学省の食品成分データベースなど）

【作成後の使い方】
保存すると、食事記録画面に追加され、通常のアイテムと同様に記録できるようになります。

【注意点】
• 正確な栄養情報の入力が重要です
• ビタミン・ミネラルは任意項目です（わかる範囲で入力）
• 作成後も編集・削除が可能です`
                                        });
                                    }} className="text-green-700 hover:text-green-900 p-1">
                                        <Icon name="Info" size={14} />
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
                                                    name: '', category: 'ビタミン・ミネラル', servingSize: 1, servingUnit: 'g',
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
                                記録する
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

                const loadTemplates = async () => {
                    const templates = await DataService.getWorkoutTemplates(user.uid);
                    setWorkoutTemplates(templates);
                };

                const saveAsTemplate = async () => {
                    if (exercises.length === 0 || !templateName.trim()) {
                        alert('テンプレート名を入力し、種目を追加してください');
                        return;
                    }

                    // サブスクリプションチェック: テンプレート数制限
                    const currentTemplates = await DataService.getWorkoutTemplates(user.uid);
                    const access = SubscriptionUtils.canAddTemplate(userProfile, currentTemplates.length, 'workout');
                    if (!access.allowed) {
                        alert(access.message);
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

                    // 運動データを作成
                    const newWorkout = {
                        id: Date.now(),
                        time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
                        name: '運動',
                        icon: 'Dumbbell',
                        exercises: exercises.map(ex => ({
                            name: ex.exercise.name,
                            category: ex.exercise.category,
                            sets: ex.sets
                        }))
                    };

                    // 各セットを履歴に保存
                    for (const exercise of exercises) {
                        for (const set of exercise.sets) {
                            await DataService.saveWorkoutHistory(user.uid, exercise.exercise.name, set);
                        }
                    }

                    onAdd(newWorkout);
                };

                // カスタム運動をlocalStorageから取得
                const customExercises = JSON.parse(localStorage.getItem('customExercises') || '[]');

                // データベースの運動とカスタム運動を統合
                const allExercises = [...exerciseDB, ...customExercises];

                const filteredExercises = allExercises.filter(ex => {
                    // タブによるフィルタリング
                    let tabMatch = false;
                    if (workoutTab === 'anaerobic') {
                        tabMatch = ex.exerciseType === 'anaerobic' && ex.category !== 'ストレッチ';
                    } else if (workoutTab === 'aerobic') {
                        tabMatch = ex.exerciseType === 'aerobic';
                    } else if (workoutTab === 'stretch') {
                        tabMatch = ex.exerciseType === 'stretch' || ex.category === 'ストレッチ';
                    }

                    // 検索条件
                    const searchMatch = fuzzyMatch(ex.name, searchTerm) || fuzzyMatch(ex.category, searchTerm);

                    return tabMatch && searchMatch;
                });

                // セット単位では体積のみを記録
                const calculateSetVolume = (set) => {
                    const weight = set.weight || 0;
                    const reps = set.reps || 0;
                    return weight * reps; // 総体積 (kg × reps)
                };

                return (
                    <div className="space-y-4">
                        {/* 初期選択画面 */}
                        {!currentExercise && exercises.length === 0 && !showCustomExerciseForm && (
                            <div className="space-y-3">
                                <p className="text-sm font-semibold text-gray-700 text-center">どうやって記録しますか？</p>
                                <div className="grid grid-cols-1 gap-3">
                                    {/* 種目を検索 */}
                                    <button
                                        onClick={() => setShowWorkoutSearchModal(true)}
                                        className="flex items-center gap-3 p-4 bg-white hover:bg-gray-50 rounded-xl border-2 border-gray-200 transition text-left"
                                    >
                                        <Icon name="Search" size={24} className="text-gray-700" />
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-900">種目を検索</p>
                                            <p className="text-xs text-gray-500">データベースから種目を選択</p>
                                        </div>
                                        <Icon name="ChevronRight" size={20} className="text-gray-400" />
                                    </button>

                                    {/* テンプレートから読み込み */}
                                    <button
                                        onClick={() => {
                                            loadTemplates();
                                            setShowTemplates(!showTemplates);
                                        }}
                                        className="flex items-center gap-3 p-4 bg-white hover:bg-gray-50 rounded-xl border-2 border-gray-200 transition text-left"
                                    >
                                        <Icon name="FileText" size={24} className="text-gray-700" />
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-900">テンプレートから読み込み</p>
                                            <p className="text-xs text-gray-500">保存済みのワークアウトを読み込み</p>
                                        </div>
                                        <Icon name="ChevronRight" size={20} className="text-gray-400" />
                                    </button>

                                    {/* カスタム作成 */}
                                    <button
                                        onClick={() => setShowCustomExerciseForm(true)}
                                        className="flex items-center gap-3 p-4 bg-white hover:bg-gray-50 rounded-xl border-2 border-gray-200 transition text-left"
                                    >
                                        <Icon name="Plus" size={24} className="text-gray-700" />
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-900">カスタム作成</p>
                                            <p className="text-xs text-gray-500">データベースにない種目を追加</p>
                                        </div>
                                        <Icon name="ChevronRight" size={20} className="text-gray-400" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* カスタム種目作成フォーム */}
                        {showCustomExerciseForm && !currentExercise && (
                            <div className="bg-white rounded-xl p-4 border-2 border-orange-200 space-y-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-lg">カスタム種目を作成</h3>
                                    <button
                                        onClick={() => setShowCustomExerciseForm(false)}
                                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full"
                                    >
                                        <Icon name="X" size={20} />
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">種目名 *</label>
                                        <input
                                            type="text"
                                            value={customExercise.name}
                                            onChange={(e) => setCustomExercise({...customExercise, name: e.target.value})}
                                            placeholder="例: マイオリジナル種目"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">大カテゴリ *</label>
                                        <select
                                            value={customExercise.majorCategory}
                                            onChange={(e) => setCustomExercise({...customExercise, majorCategory: e.target.value, category: '', subcategory: ''})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        >
                                            <option value="">選択してください</option>
                                            <option value="筋トレ">筋トレ</option>
                                            <option value="有酸素">有酸素</option>
                                            <option value="ストレッチ">ストレッチ</option>
                                        </select>
                                    </div>

                                    {customExercise.majorCategory && (
                                        <div>
                                            <label className="block text-sm font-medium mb-1">小カテゴリ *</label>
                                            <select
                                                value={customExercise.category}
                                                onChange={(e) => setCustomExercise({...customExercise, category: e.target.value, subcategory: ''})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                            >
                                                <option value="">選択してください</option>
                                                {customExercise.majorCategory === '筋トレ' && (
                                                    <>
                                                        <option value="胸">胸</option>
                                                        <option value="背中">背中</option>
                                                        <option value="脚">脚</option>
                                                        <option value="肩">肩</option>
                                                        <option value="腕">腕</option>
                                                        <option value="腹筋・体幹">腹筋・体幹</option>
                                                        <option value="尻">尻</option>
                                                        <option value="ウエイトリフティング">ウエイトリフティング</option>
                                                    </>
                                                )}
                                                {customExercise.majorCategory === '有酸素' && (
                                                    <>
                                                        <option value="持久系">持久系</option>
                                                        <option value="HIIT">HIIT</option>
                                                    </>
                                                )}
                                                {customExercise.majorCategory === 'ストレッチ' && (
                                                    <>
                                                        <option value="ダイナミックストレッチ">ダイナミックストレッチ</option>
                                                        <option value="スタティックストレッチ">スタティックストレッチ</option>
                                                    </>
                                                )}
                                            </select>
                                        </div>
                                    )}

                                    {customExercise.category && customExercise.majorCategory === '筋トレ' && (
                                        <div>
                                            <label className="block text-sm font-medium mb-1">特性（オプション）</label>
                                            <select
                                                value={customExercise.subcategory}
                                                onChange={(e) => setCustomExercise({...customExercise, subcategory: e.target.value})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                            >
                                                <option value="">指定なし</option>
                                                <option value="コンパウンド">コンパウンド</option>
                                                <option value="アイソレーション">アイソレーション</option>
                                                <option value="アイソメトリック">アイソメトリック</option>
                                            </select>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => {
                                            if (!customExercise.name || !customExercise.majorCategory || !customExercise.category) {
                                                alert('必須項目を入力してください（種目名、大カテゴリ、小カテゴリ）');
                                                return;
                                            }
                                            // 大カテゴリから運動タイプを自動判定
                                            let exerciseType = 'anaerobic';
                                            if (customExercise.majorCategory === '有酸素') {
                                                exerciseType = 'aerobic';
                                            } else if (customExercise.majorCategory === 'ストレッチ') {
                                                exerciseType = 'stretch';
                                            }

                                            // カスタム種目をlocalStorageに保存
                                            const customExercises = JSON.parse(localStorage.getItem('customExercises') || '[]');
                                            const newCustomExercise = {
                                                id: `custom-${Date.now()}`,
                                                name: customExercise.name,
                                                majorCategory: customExercise.majorCategory,
                                                category: customExercise.category,
                                                subcategory: customExercise.subcategory || customExercise.category,
                                                exerciseType: exerciseType,
                                                isCustom: true,
                                                createdAt: new Date().toISOString()
                                            };
                                            customExercises.push(newCustomExercise);
                                            localStorage.setItem('customExercises', JSON.stringify(customExercises));

                                            // カスタム種目を現在の種目として設定
                                            setCurrentExercise(newCustomExercise);
                                            setShowCustomExerciseForm(false);
                                            // カスタム種目データをリセット
                                            setCustomExercise({
                                                name: '',
                                                majorCategory: '',
                                                category: '',
                                                subcategory: ''
                                            });
                                        }}
                                        className="w-full bg-orange-600 text-white font-bold py-3 rounded-lg hover:bg-orange-700 transition"
                                    >
                                        この種目で記録する
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 種目選択後の詳細入力 */}
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

                                <div className="space-y-3">
                                    {/* 重量入力 */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                                            重量 (kg)
                                                <button
                                                    type="button"
                                                    onClick={() => setWorkoutInfoModal({
                                                        show: true,
                                                        title: 'トレーニング重量入力の使い方',
                                                        content: `使用した重量をキログラム単位で入力します。

【入力方法】
1. スライダーをドラッグして大まかな重量を設定（0～500kg）
2. 目盛り数値（100kg、200kgなど）をタップで即座に設定
3. 入力欄に直接数値を入力
4. 増減ボタン（-10～+10）で微調整

【入力の目安】
• ダンベル: 片手の重量（例: 10kg）
• バーベル: プレート込みの総重量（例: 60kg）
• マシン: 選択したウェイトの重量
• 自重トレーニング: 体重を入力

【PG式での活用】
重量は運動強度の重要な指標です。PG式では、重量と回数、可動距離を組み合わせて物理的仕事量を算出し、正確な消費カロリーを計算します。`
                                                    })}
                                                    className="text-indigo-600 hover:text-indigo-800"
                                                >
                                                    <Icon name="Info" size={14} />
                                                </button>
                                            </label>
                                            {/* スライダー - 重量 */}
                                            <div className="mb-3">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="500"
                                                    step="2.5"
                                                    value={currentSet.weight}
                                                    onChange={(e) => setCurrentSet({...currentSet, weight: e.target.value === '' ? '' : Number(e.target.value)})}
                                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                                                    style={{
                                                        background: `linear-gradient(to right, #ea580c 0%, #ea580c ${(currentSet.weight/500)*100}%, #e5e7eb ${(currentSet.weight/500)*100}%, #e5e7eb 100%)`
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
                                                value={currentSet.weight}
                                                onChange={(e) => setCurrentSet({...currentSet, weight: e.target.value === '' ? '' : Number(e.target.value)})}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                            />
                                            {/* 増減ボタン */}
                                            <div className="grid grid-cols-6 gap-1 mt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, weight: Math.max(0, Number(currentSet.weight) - 10)})}
                                                    className="py-1.5 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 font-medium"
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
                                                    className="py-1.5 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100 font-medium"
                                                >
                                                    +10
                                                </button>
                                            </div>
                                    </div>

                                    {/* 回数入力 */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                                            回数
                                                <button
                                                    type="button"
                                                    onClick={() => setWorkoutInfoModal({
                                                        show: true,
                                                        title: 'トレーニング回数入力の使い方',
                                                        content: `1セットで実施した回数（レップ数）を入力します。

【入力方法】
1. スライダーをドラッグして回数を設定（1～50回）
2. 目盛り数値（10回、20回など）をタップで即座に設定
3. 入力欄に直接数値を入力
4. 増減ボタン（-5/-3/-1/+1/+3/+5）で微調整

【トレーニング目的別の目安】
• 筋力向上: 1～5回（高重量）
• 筋肥大: 6～12回（中重量）
• 筋持久力: 13回以上（低～中重量）
• 有酸素運動: 継続時間を総時間に入力

【PG式での活用】
回数は運動の質を示す指標です。重量×回数×可動距離で物理的仕事量が決まり、それがPG式による精密な消費カロリー計算の基礎となります。`
                                                    })}
                                                    className="text-indigo-600 hover:text-indigo-800"
                                                >
                                                    <Icon name="Info" size={14} />
                                                </button>
                                            </label>
                                            {/* スライダー - 回数 */}
                                            <div className="mb-2">
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="50"
                                                    step="1"
                                                    value={currentSet.reps}
                                                    onChange={(e) => setCurrentSet({...currentSet, reps: e.target.value === '' ? '' : Number(e.target.value)})}
                                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                                                    style={{
                                                        background: `linear-gradient(to right, #ea580c 0%, #ea580c ${(currentSet.reps/50)*100}%, #e5e7eb ${(currentSet.reps/50)*100}%, #e5e7eb 100%)`
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
                                                value={currentSet.reps}
                                                onChange={(e) => setCurrentSet({...currentSet, reps: e.target.value === '' ? '' : Number(e.target.value)})}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                            />
                                            {/* 増減ボタン */}
                                            <div className="grid grid-cols-6 gap-1 mt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, reps: Math.max(1, Number(currentSet.reps) - 5)})}
                                                    className="py-1.5 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 font-medium"
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
                                                    className="py-1.5 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100 font-medium"
                                                >
                                                    +5
                                                </button>
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

                                    {/* RM更新記録（常設） */}
                                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                                        <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                            <Icon name="Award" size={16} className="text-purple-600" />
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

【記録方法】
回数と重量を個別に入力し、「RM記録を保存」ボタンで履歴に追加します。

【活用方法】
履歴画面でRM更新の記録を確認でき、筋力の成長を可視化できます。目標達成のモチベーション維持に役立ちます。`
                                                })}
                                                className="text-indigo-600 hover:text-indigo-800"
                                            >
                                                <Icon name="Info" size={14} />
                                            </button>
                                        </label>

                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div>
                                                <label className="block text-xs font-medium mb-1 text-gray-700">回数 (Reps)</label>
                                                <input
                                                    type="number"
                                                    value={rmRecord.reps}
                                                    onChange={(e) => setRmRecord({...rmRecord, reps: e.target.value === '' ? '' : Number(e.target.value)})}
                                                    className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                                    min="1"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium mb-1 text-gray-700">重量 (kg)</label>
                                                <input
                                                    type="number"
                                                    value={rmRecord.weight}
                                                    onChange={(e) => setRmRecord({...rmRecord, weight: e.target.value === '' ? '' : Number(e.target.value)})}
                                                    className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                                    step="0.5"
                                                    min="0"
                                                />
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={async () => {
                                                if (!currentExercise) {
                                                    alert('種目を選択してください');
                                                    return;
                                                }
                                                if (!rmRecord.reps || !rmRecord.weight) {
                                                    alert('回数と重量を入力してください');
                                                    return;
                                                }

                                                await DataService.saveWorkoutHistory(user.uid, currentExercise.name, {
                                                    weight: rmRecord.weight,
                                                    reps: rmRecord.reps,
                                                    rm: rmRecord.reps,
                                                    setType: 'rm_record'
                                                });

                                                alert(`RM記録を保存しました: ${rmRecord.reps}RM × ${rmRecord.weight}kg`);
                                            }}
                                            className="w-full bg-purple-600 text-white font-semibold py-2 rounded-lg hover:bg-purple-700 transition flex items-center justify-center gap-2"
                                        >
                                            <Icon name="Save" size={16} />
                                            <span>RM記録を保存</span>
                                        </button>
                                    </div>

                                    {/* セット見出し */}
                                    <div className="flex items-center gap-2 mb-2">
                                        <h5 className="font-medium text-gray-700">セット</h5>
                                        <button
                                            onClick={() => setShowSetTypeModal(true)}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            <Icon name="Info" size={16} />
                                        </button>
                                    </div>

                                    {/* セット追加ボタン */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => {
                                                setSets([...sets, { ...currentSet, setType: 'warmup' }]);
                                            }}
                                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2"
                                        >
                                            <span>アップセット追加</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSets([...sets, { ...currentSet, setType: 'main' }]);
                                            }}
                                            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center justify-center gap-2"
                                        >
                                            <span>メインセット追加</span>
                                        </button>
                                    </div>

                                    {sets.length > 0 && (
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <p className="text-sm font-medium mb-2">セット一覧</p>
                                            {sets.map((set, index) => (
                                                <div key={index} className="border-b border-gray-200 py-2 text-sm last:border-0">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium">Set {index + 1}</span>
                                                            {set.setType === 'warmup' ? (
                                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                                                    アップ
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                                                                    メイン
                                                                </span>
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
                                                        <div><span>重量: {set.weight}kg</span></div>
                                                        <div><span>回数: {set.reps}回</span></div>
                                                        <div><span>体積: {calculateSetVolume(set)} kg×reps</span></div>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="border-t mt-2 pt-2 space-y-1">
                                                <div className="flex justify-between text-sm text-gray-600">
                                                    <span>総体積</span>
                                                    <span>{sets.reduce((sum, s) => sum + calculateSetVolume(s), 0)} kg×reps</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => {
                                        if (sets.length === 0) return;
                                        const newExercise = {
                                            exercise: currentExercise,
                                            sets: sets
                                        };
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

                        {/* 記録済み種目一覧 */}
                        {exercises.length > 0 && (
                            <>
                                <div className="bg-white p-4 rounded-lg shadow">
                                    <h4 className="font-bold mb-3">記録済み種目</h4>
                                    {exercises.map((ex, index) => (
                                        <div key={index} className="border-b py-3 last:border-0">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="font-medium">{ex.exercise.name}</p>
                                                    <p className="text-xs text-gray-600">{ex.sets.length}セット</p>
                                                </div>
                                                <button
                                                    onClick={() => setExercises(exercises.filter((_, i) => i !== index))}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <Icon name="Trash2" size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* 記録するボタン */}
                                <button
                                    onClick={handleWorkoutSave}
                                    className="w-full bg-orange-600 text-white font-bold py-4 rounded-lg hover:bg-orange-700 transition flex items-center justify-center gap-2"
                                >
                                    <Icon name="Check" size={24} />
                                    <span>記録する</span>
                                </button>
                            </>
                        )}

                        {/* テンプレート保存 */}
                        {exercises.length > 0 && (
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <p className="text-sm font-semibold text-gray-700 mb-2">テンプレートとして保存</p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={templateName}
                                        onChange={(e) => setTemplateName(e.target.value)}
                                        placeholder="テンプレート名を入力..."
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    />
                                    <button
                                        onClick={saveAsTemplate}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                                    >
                                        保存
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* テンプレート一覧モーダル */}
                        {showTemplates && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex items-center justify-center p-4" style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0}}>
                                <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                                    {/* ヘッダー */}
                                    <div className="flex items-center justify-between p-4 border-b">
                                        <h3 className="font-bold text-lg">テンプレート一覧</h3>
                                        <button
                                            onClick={() => setShowTemplates(false)}
                                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full"
                                        >
                                            <Icon name="X" size={20} />
                                        </button>
                                    </div>

                                    {/* テンプレートリスト */}
                                    <div className="flex-1 overflow-y-auto p-4">
                                        {workoutTemplates.length === 0 ? (
                                            <p className="text-center text-gray-500 py-8">保存されたテンプレートはありません</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {workoutTemplates.map((template) => (
                                                    <div key={template.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1">
                                                                <h4 className="font-bold text-gray-900">{template.name}</h4>
                                                                <p className="text-xs text-gray-500 mt-1">
                                                                    {template.exercises?.length || 0}種目
                                                                </p>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => loadTemplate(template)}
                                                                    className="px-3 py-1 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition"
                                                                >
                                                                    読み込み
                                                                </button>
                                                                <button
                                                                    onClick={() => deleteTemplate(template.id)}
                                                                    className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition"
                                                                >
                                                                    削除
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 種目検索モーダル */}
                        {showWorkoutSearchModal && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex items-center justify-center p-4" style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0}}>
                                <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                                    {/* ヘッダー */}
                                    <div className="flex items-center justify-between p-4 border-b">
                                        <h3 className="font-bold text-lg">種目を検索</h3>
                                        <button
                                            onClick={() => {
                                                setShowWorkoutSearchModal(false);
                                                setSearchTerm('');
                                            }}
                                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full"
                                        >
                                            <Icon name="X" size={20} />
                                        </button>
                                    </div>

                                    {/* タブ */}
                                    <div className="border-b">
                                        <div className="flex">
                                            <button
                                                onClick={() => {
                                                    setWorkoutTab('anaerobic');
                                                    setSearchTerm(' ');
                                                }}
                                                className={`flex-1 flex items-center justify-center gap-2 py-4 border-b-2 transition ${
                                                    workoutTab === 'anaerobic'
                                                        ? 'border-orange-600 text-orange-600'
                                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                                }`}
                                            >
                                                <Icon name="Dumbbell" size={20} />
                                                <span className="font-bold">筋トレ</span>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setWorkoutTab('aerobic');
                                                    setSearchTerm(' ');
                                                }}
                                                className={`flex-1 flex items-center justify-center gap-2 py-4 border-b-2 transition ${
                                                    workoutTab === 'aerobic'
                                                        ? 'border-blue-600 text-blue-600'
                                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                                }`}
                                            >
                                                <Icon name="Heart" size={20} />
                                                <span className="font-bold">有酸素</span>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setWorkoutTab('stretch');
                                                    setSearchTerm(' ');
                                                }}
                                                className={`flex-1 flex items-center justify-center gap-2 py-4 border-b-2 transition ${
                                                    workoutTab === 'stretch'
                                                        ? 'border-green-600 text-green-600'
                                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                                }`}
                                            >
                                                <Icon name="Wind" size={20} />
                                                <span className="font-bold">ストレッチ</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* 検索欄 */}
                                    <div className="p-4 border-b space-y-2">
                                        <p className="text-sm text-gray-600">種目名を入力してください</p>
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="種目を検索..."
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                        />
                                    </div>

                                    {/* カテゴリ一覧 */}
                                    <div className="flex-1 overflow-y-auto p-4">
                                        <div className="space-y-2">
                                            {(() => {
                                                const categories = {};
                                                filteredExercises.forEach(ex => {
                                                    if (!categories[ex.category]) {
                                                        categories[ex.category] = {};
                                                    }
                                                    if (!categories[ex.category][ex.subcategory]) {
                                                        categories[ex.category][ex.subcategory] = [];
                                                    }
                                                    categories[ex.category][ex.subcategory].push(ex);
                                                });

                                                return Object.keys(categories).map(category => {
                                                    const subcategories = categories[category];
                                                    const totalCount = Object.values(subcategories).flat().length;
                                                    const hasMultipleSubcategories = Object.keys(subcategories).length > 1;

                                                    return (
                                                        <div key={category} className="border rounded-lg overflow-hidden">
                                                            <button
                                                                onClick={() => setExpandedCategories(prev => ({...prev, [category]: !prev[category]}))}
                                                                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex justify-between items-center"
                                                            >
                                                                <span className="font-medium">{category}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs text-gray-500">{totalCount}種目</span>
                                                                    <Icon name={expandedCategories[category] ? 'ChevronDown' : 'ChevronRight'} size={20} />
                                                                </div>
                                                            </button>
                                                            {expandedCategories[category] && (
                                                                <div className="p-2 space-y-3">
                                                                    {Object.keys(subcategories).map(subcategory => (
                                                                        <div key={subcategory}>
                                                                            {hasMultipleSubcategories && (
                                                                                <div className="text-xs font-semibold text-gray-600 px-2 py-1 bg-gray-100 rounded mb-1">
                                                                                    {subcategory}
                                                                                </div>
                                                                            )}
                                                                            <div className="space-y-1">
                                                                                {subcategories[subcategory].map(exercise => (
                                                                                    <button
                                                                                        key={exercise.id}
                                                                                        onClick={() => {
                                                                                            setCurrentExercise(exercise);
                                                                                            setShowWorkoutSearchModal(false);
                                                                                            setSearchTerm('');
                                                                                        }}
                                                                                        className="w-full text-left px-3 py-2 hover:bg-orange-50 rounded-lg transition"
                                                                                    >
                                                                                        <div className="flex items-center justify-between">
                                                                                            <p className="font-medium">{exercise.name}</p>
                                                                                            {exercise.isCustom && (
                                                                                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                                                                                    カスタム
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>
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

                // AI食事認識のコールバック
                const handleFoodsRecognized = (recognizedFoods) => {
                    // 認識された食材を直接addedItemsに追加
                    const newItems = recognizedFoods.map(food => {
                        // データベースから該当食材を探す
                        let foundFood = null;
                        let foundCategory = null;
                        Object.keys(foodDB).forEach(cat => {
                            if (foodDB[cat][food.name]) {
                                foundFood = foodDB[cat][food.name];
                                foundCategory = cat;
                            }
                        });

                        if (foundFood) {
                            const nutrients = mapNutrients(foundFood);
                            return {
                                name: food.name,
                                amount: food.amount,
                                ...foundFood,
                                category: foundCategory,
                                ...nutrients
                            };
                        } else {
                            // DBに見つからない場合はカスタム食材として扱う
                            return {
                                name: food.name,
                                amount: food.amount,
                                calories: food.estimatedCalories || 0,
                                protein: food.estimatedProtein || 0,
                                fat: food.estimatedFat || 0,
                                carbs: food.estimatedCarbs || 0,
                                category: 'カスタム',
                                vitamins: {},
                                minerals: {}
                            };
                        }
                    });

                    setAddedItems([...addedItems, ...newItems]);
                    setShowAIFoodRecognition(false);
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

                const filteredFoods = hierarchicalCategories;

                // テンプレート保存
                const saveAsTemplate = async () => {
                    if (!templateName.trim() || addedItems.length === 0) {
                        alert('テンプレート名を入力し、食材を追加してください');
                        return;
                    }

                    // サブスクリプションチェック: テンプレート数制限
                    const currentTemplates = await DataService.getMealTemplates(user.uid);
                    const access = SubscriptionUtils.canAddTemplate(userProfile, currentTemplates.length, 'meal');
                    if (!access.allowed) {
                        alert(access.message);
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

                // showSearchModalがtrueの場合は新モーダルのみ表示
                if (showSearchModal) {
                    return (
                        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4" style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0}}>
                            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                                {/* ヘッダー */}
                                <div className="flex items-center justify-between p-4 border-b">
                                    <div className="flex items-center gap-2">
                                        {selectedItem && (
                                            <button
                                                onClick={() => setSelectedItem(null)}
                                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full"
                                            >
                                                <Icon name="ChevronLeft" size={20} />
                                            </button>
                                        )}
                                        <h3 className="font-bold text-lg">
                                            {selectedItem ? (editingItemIndex !== null ? `${selectedItem.name} を編集` : selectedItem.name) : '食材を検索'}
                                        </h3>
                                        {!selectedItem && (
                                            <button
                                                onClick={() => setInfoModal({
                                                    show: true,
                                                    title: 'ℹ️ 食材検索の使い方',
                                                    content: `【色分けガイド】
食材リストの左端の色は、その食材で最も多く含まれる栄養素を示します。

🔴 赤色 = タンパク質 (P)
　筋肉・髪・皮膚の素材
　例: 鶏むね肉、魚、プロテイン

🟡 黄色 = 脂質 (F)
　関節保護・ホルモン分泌
　例: オリーブオイル、ナッツ、サバ

🟢 緑色 = 炭水化物 (C)
　筋肉や脳のエネルギー源
　例: 白米、パスタ、果物

【複数選択について】
・食材を選択すると詳細画面で量を調整できます
・「追加」をクリックすると、一覧に戻らずメイン画面に追加されます
・さらに追加したい場合は「食材を追加」ボタンをクリックしてください`
                                                })}
                                                className="text-gray-400 hover:text-gray-600"
                                            >
                                                <Icon name="Info" size={18} />
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => {
                                            setShowSearchModal(false);
                                            setSearchTerm('');
                                            setSearchModalTab(type === 'supplement' ? 'supplement' : 'food');
                                            setSelectedItem(null);
                                            setEditingItemIndex(null); // 編集モードをリセット
                                        }}
                                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full"
                                    >
                                        <Icon name="X" size={20} />
                                    </button>
                                </div>

                                {/* タブ（横並び） */}
                                {!selectedItem && (
                                <div className="border-b">
                                    <div className="flex">
                                        <button
                                            onClick={() => {
                                                setSearchModalTab('food');
                                                setSearchTerm('');
                                            }}
                                            className={`flex-1 flex items-center justify-center gap-2 py-4 border-b-2 transition ${
                                                searchModalTab === 'food'
                                                    ? 'border-green-600 text-green-600'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                            }`}
                                        >
                                            <Icon name="Apple" size={20} />
                                            <span className="font-bold">食材</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                setSearchModalTab('supplement');
                                                setSearchTerm('');
                                            }}
                                            className={`flex-1 flex items-center justify-center gap-2 py-4 border-b-2 transition ${
                                                searchModalTab === 'supplement'
                                                    ? 'border-blue-600 text-blue-600'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                            }`}
                                        >
                                            <Icon name="Pill" size={20} />
                                            <span className="font-bold">サプリメント</span>
                                        </button>
                                    </div>
                                </div>
                                )}

                                {/* 検索バー */}
                                {!selectedItem && searchModalTab && (
                                <div className="p-4 border-b">
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                            <Icon name="Search" size={20} />
                                        </div>
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="食材名を入力してください..."
                                            autoFocus
                                            className="w-full pl-10 pr-10 py-3 text-sm bg-gray-50 rounded-lg border-2 border-gray-200 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                                        />
                                        {searchTerm && (
                                            <button
                                                onClick={() => setSearchTerm('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                                            >
                                                <Icon name="X" size={18} />
                                            </button>
                                        )}
                                    </div>
                                    {searchTerm && (
                                        <p className="text-xs text-gray-500 mt-2 text-center">"{searchTerm}" の検索結果</p>
                                    )}
                                    {/* 選択アイテムの追加ボタン */}
                                    {selectedItems.length > 0 && (
                                        <div className="mt-3 flex gap-2">
                                            <button
                                                onClick={() => {
                                                    // 選択したアイテムをaddedItemsに追加（デフォルト量で）
                                                    const newItems = selectedItems.map(item => ({
                                                        name: item.name,
                                                        amount: type === 'supplement' ? 1 : 100,
                                                        calories: type === 'supplement' ? item.calories : item.calories,
                                                        protein: type === 'supplement' ? item.protein : item.protein,
                                                        fat: type === 'supplement' ? item.fat : item.fat,
                                                        carbs: type === 'supplement' ? item.carbs : item.carbs,
                                                        category: item.category,
                                                        vitamins: item.vitamins || {},
                                                        minerals: item.minerals || {}
                                                    }));
                                                    setAddedItems([...addedItems, ...newItems]);
                                                    setSelectedItems([]);
                                                    setShowSearchModal(false);
                                                    setExpandedCategories({});
                                                }}
                                                className="flex-1 bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                                            >
                                                <Icon name="Plus" size={18} />
                                                <span>{selectedItems.length}個を追加</span>
                                            </button>
                                            <button
                                                onClick={() => setSelectedItems([])}
                                                className="bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg hover:bg-gray-300 transition"
                                            >
                                                クリア
                                            </button>
                                        </div>
                                    )}
                                </div>
                                )}

                                {/* 検索結果またはカテゴリ一覧（タブ選択後に表示） */}
                                {!selectedItem && searchModalTab && (
                                <div className="flex-1 overflow-y-auto p-4">
                                    <div className="space-y-4">
                                            {Object.keys(filteredFoods).map(topCategory => {
                                                const subcategories = filteredFoods[topCategory];
                                                if (Object.keys(subcategories).length === 0) return null;

                                                const isSupplement = topCategory === 'サプリメント';

                                                // タブによるフィルタリング
                                                if (searchModalTab === 'food' && isSupplement) return null;
                                                if (searchModalTab === 'supplement' && !isSupplement) return null;

                                                const categoryColor = isSupplement
                                                    ? { bg: 'bg-blue-100', hover: 'hover:bg-blue-200', text: 'text-blue-900', border: 'border-blue-300', icon: 'Pill' }
                                                    : { bg: 'bg-green-100', hover: 'hover:bg-green-200', text: 'text-green-900', border: 'border-green-300', icon: 'Apple' };

                                                return (
                                                    <div key={topCategory} className="space-y-2">
                                                            {Object.keys(subcategories).map(subCategory => (
                                                                <div key={subCategory} className="border border-gray-200 rounded-lg overflow-hidden">
                                                                    {/* サブカテゴリヘッダー（クリックで折りたたみ） */}
                                                                    <button
                                                                        onClick={() => setExpandedCategories(prev => ({...prev, [`${topCategory}-${subCategory}`]: !prev[`${topCategory}-${subCategory}`]}))}
                                                                        className="w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 flex justify-between items-center transition"
                                                                    >
                                                                        <span className="font-medium text-sm text-gray-700">{subCategory}</span>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-xs text-gray-500">({subcategories[subCategory].length}件)</span>
                                                                            <Icon name={expandedCategories[`${topCategory}-${subCategory}`] ? 'ChevronDown' : 'ChevronRight'} size={18} className="text-gray-600" />
                                                                        </div>
                                                                    </button>

                                                                    {/* 食材リスト */}
                                                                    {expandedCategories[`${topCategory}-${subCategory}`] && (
                                                                    <div className="space-y-1 p-2 bg-white">
                                                                        {subcategories[subCategory].map(foodName => {
                                                                            let food;
                                                                            let actualCategory;
                                                                            const isCustom = subCategory === 'カスタム食材' || subCategory === 'カスタム料理';

                                                                            try {
                                                                                if (isCustom) {
                                                                                    const customFoods = JSON.parse(localStorage.getItem('customFoods') || '[]');
                                                                                    food = customFoods.find(f => f.name === foodName);
                                                                                    actualCategory = subCategory;
                                                                                } else if (topCategory === 'サプリメント') {
                                                                                    // サプリメントは直接アクセス
                                                                                    food = foodDB['サプリメント'] && foodDB['サプリメント'][foodName];
                                                                                    actualCategory = 'サプリメント';
                                                                                } else if (subCategory === 'ドリンク') {
                                                                                    // ドリンクはサプリメントカテゴリから取得
                                                                                    food = foodDB['サプリメント'] && foodDB['サプリメント'][foodName];
                                                                                    actualCategory = 'ドリンク';
                                                                                } else {
                                                                                    // 通常の食材
                                                                                    food = foodDB[subCategory] && foodDB[subCategory][foodName];
                                                                                    actualCategory = subCategory;
                                                                                }
                                                                            } catch (e) {
                                                                                console.error('Error accessing food data:', e, foodName);
                                                                                return null;
                                                                            }

                                                                            if (!food) return null;

                                                                            // PFC色分けロジック（最も割合の大きい栄養素のみ）
                                                                            const getPFCColor = (protein, fat, carbs) => {
                                                                                // 数値に変換（文字列の場合に備えて）
                                                                                const p = parseFloat(protein) || 0;
                                                                                const f = parseFloat(fat) || 0;
                                                                                const c = parseFloat(carbs) || 0;

                                                                                const pCal = p * 4;
                                                                                const fCal = f * 9;
                                                                                const cCal = c * 4;
                                                                                const total = pCal + fCal + cCal;

                                                                                if (total === 0) return '';

                                                                                const pRatio = pCal / total;
                                                                                const fRatio = fCal / total;
                                                                                const cRatio = cCal / total;

                                                                                // ダークモード判定
                                                                                const isDarkMode = document.body.classList.contains('dark-mode');

                                                                                // デバッグ用
                                                                                console.log('ダークモード判定:', isDarkMode, 'body classes:', document.body.className);

                                                                                // ダークモード用の明るい色
                                                                                const darkModeColors = {
                                                                                    red: '#fca5a5',      // ライトな赤
                                                                                    yellow: '#fde047',   // ライトな黄
                                                                                    green: '#86efac'     // ライトな緑
                                                                                };

                                                                                // ライトモード用の色
                                                                                const lightModeColors = {
                                                                                    red: '#ef4444',      // タンパク質
                                                                                    yellow: '#eab308',   // 脂質
                                                                                    green: '#22c55e'     // 炭水化物
                                                                                };

                                                                                const colors = isDarkMode ? darkModeColors : lightModeColors;
                                                                                console.log('選択された色セット:', isDarkMode ? 'ダークモード' : 'ライトモード', colors);

                                                                                // 最も割合の大きい栄養素の色を返す
                                                                                let maxColor;
                                                                                if (pRatio >= fRatio && pRatio >= cRatio) {
                                                                                    maxColor = colors.red;
                                                                                } else if (fRatio >= pRatio && fRatio >= cRatio) {
                                                                                    maxColor = colors.yellow;
                                                                                } else {
                                                                                    maxColor = colors.green;
                                                                                }

                                                                                // デバッグ: コンソールに出力
                                                                                console.log(`${foodName}: 返す色 = ${maxColor}`);

                                                                                return maxColor;
                                                                            };

                                                                            const borderColor = getPFCColor(food.protein, food.fat, food.carbs);
                                                                            const styleObj = {
                                                                                paddingLeft: '12px',
                                                                                paddingRight: '12px',
                                                                                borderLeft: `5px solid ${borderColor || '#gray'}`,
                                                                                borderLeftWidth: '5px',
                                                                                borderLeftStyle: 'solid',
                                                                                borderLeftColor: borderColor || '#gray'
                                                                            };
                                                                            console.log(`${foodName}: styleObj =`, JSON.stringify(styleObj));

                                                                            const itemKey = `${actualCategory}-${foodName}`;
                                                                            const isSelected = selectedItems.some(item => item.key === itemKey);

                                                                            return (
                                                                                <button
                                                                                    key={foodName}
                                                                                    data-pfc-border={borderColor}
                                                                                    onClick={() => {
                                                                                        const nutrients = isCustom
                                                                                            ? (food.vitamins && food.minerals ? { vitamins: food.vitamins, minerals: food.minerals } : { vitamins: {}, minerals: {} })
                                                                                            : mapNutrients(food);
                                                                                        const itemData = {
                                                                                            key: itemKey,
                                                                                            name: foodName,
                                                                                            calories: food.calories,
                                                                                            protein: parseFloat(food.protein),
                                                                                            fat: parseFloat(food.fat),
                                                                                            carbs: parseFloat(food.carbs),
                                                                                            category: subCategory === 'カスタム料理' ? '料理' : actualCategory,
                                                                                            isCustom: isCustom,
                                                                                            unit: food.unit,
                                                                                            servingSize: food.servingSize,
                                                                                            servingUnit: food.servingUnit,
                                                                                            ...nutrients
                                                                                        };

                                                                                        // チェックボックスのトグル
                                                                                        if (isSelected) {
                                                                                            setSelectedItems(selectedItems.filter(item => item.key !== itemKey));
                                                                                        } else {
                                                                                            setSelectedItems([...selectedItems, itemData]);
                                                                                        }
                                                                                    }}
                                                                                    className={`w-full text-left py-2 rounded-lg transition ${isSelected ? 'bg-indigo-50 border-t-indigo-300 border-r-indigo-300 border-b-indigo-300' : 'hover:bg-gray-50 border-t-transparent border-r-transparent border-b-transparent hover:border-t-gray-300 hover:border-r-gray-300 hover:border-b-gray-300'}`}
                                                                                    style={{
                                                                                        paddingLeft: '12px',
                                                                                        paddingRight: '12px',
                                                                                        borderLeft: `5px solid ${borderColor || '#gray'}`,
                                                                                        borderLeftWidth: '5px',
                                                                                        borderLeftStyle: 'solid',
                                                                                        borderLeftColor: borderColor || '#gray',
                                                                                        borderTopWidth: '1px',
                                                                                        borderRightWidth: '1px',
                                                                                        borderBottomWidth: '1px'
                                                                                    }}
                                                                                >
                                                                                    <div className="flex justify-between items-start gap-2">
                                                                                        <div className="flex items-start gap-2 flex-1">
                                                                                            <input
                                                                                                type="checkbox"
                                                                                                checked={isSelected}
                                                                                                onChange={() => {}}
                                                                                                className="mt-1 w-4 h-4 text-indigo-600 rounded border-gray-300"
                                                                                                onClick={(e) => e.stopPropagation()}
                                                                                            />
                                                                                            <span className="text-sm font-medium text-gray-900 flex-1">{foodName}</span>
                                                                                        </div>
                                                                                        <div className="flex flex-col items-end text-xs">
                                                                                            <div className="font-semibold text-blue-500">{food.calories}kcal</div>
                                                                                            <div className="text-gray-600">
                                                                                                <span className="pfc-protein">P:{Math.round(food.protein)}g</span> <span className="pfc-fat">F:{Math.round(food.fat)}g</span> <span className="pfc-carbs">C:{Math.round(food.carbs)}g</span>
                                                                                            </div>
                                                                                            <div className="text-gray-400">
                                                                                                ※{food.unit && food.unit !== 'g' && food.unit !== '' ? food.unit + 'あたり' : (food.servingSize ? `${food.servingSize}${food.servingUnit || food.unit || 'g'}あたり` : '100gあたり')}
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
                                                );
                                            })}
                                            {Object.keys(filteredFoods).length === 0 && searchTerm && (
                                                <div className="text-center py-8">
                                                    <Icon name="Search" size={48} className="text-gray-300 mx-auto mb-3" />
                                                    <p className="text-gray-500">検索結果が見つかりませんでした</p>
                                                    <p className="text-xs text-gray-400 mt-1">別のキーワードで検索してください</p>
                                                </div>
                                            )}
                                    </div>
                                </div>
                                )}

                                {/* アイテム選択後の詳細表示 */}
                                {selectedItem && (
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                        {/* アイテム詳細カード */}
                                        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                                            <div className="mb-3">
                                                <p className="text-lg font-bold text-gray-900">{selectedItem.name}</p>
                                                <p className="text-sm text-gray-600">{selectedItem.category}</p>
                                            </div>
                                            <div className="grid grid-cols-4 gap-2 text-sm">
                                                <div>
                                                    <p className="text-gray-600">カロリー</p>
                                                    <p className="font-bold">{selectedItem.calories}kcal</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600">P</p>
                                                    <p className="font-bold">{selectedItem.protein}g</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600">F</p>
                                                    <p className="font-bold">{selectedItem.fat}g</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600">C</p>
                                                    <p className="font-bold">{selectedItem.carbs}g</p>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">※100gあたり</p>
                                        </div>

                                        {/* 量の入力（スライダー + 増減ボタン） */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-sm font-medium text-gray-700">量 (g)</label>
                                                <Icon name="HelpCircle" size={16} className="text-gray-400" />
                                            </div>

                                            {/* スライダー */}
                                            <div className="mb-3">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="500"
                                                    step="10"
                                                    value={amount}
                                                    onChange={(e) => setAmount(e.target.value)}
                                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                                                    style={{
                                                        background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${(amount / 500) * 100}%, #e5e7eb ${(amount / 500) * 100}%, #e5e7eb 100%)`
                                                    }}
                                                />
                                                <div className="flex justify-between text-xs mt-1">
                                                    <button onClick={() => setAmount('0')} className="text-gray-500 hover:text-gray-700 hover:font-semibold transition cursor-pointer">0g</button>
                                                    <button onClick={() => setAmount('100')} className="text-gray-500 hover:text-gray-700 hover:font-semibold transition cursor-pointer">100g</button>
                                                    <button onClick={() => setAmount('200')} className="text-gray-500 hover:text-gray-700 hover:font-semibold transition cursor-pointer">200g</button>
                                                    <button onClick={() => setAmount('300')} className="text-gray-500 hover:text-gray-700 hover:font-semibold transition cursor-pointer">300g</button>
                                                    <button onClick={() => setAmount('400')} className="text-gray-500 hover:text-gray-700 hover:font-semibold transition cursor-pointer">400g</button>
                                                    <button onClick={() => setAmount('500')} className="text-gray-500 hover:text-gray-700 hover:font-semibold transition cursor-pointer">500g</button>
                                                </div>
                                            </div>

                                            {/* 数値入力 */}
                                            <div className="bg-white border-2 border-gray-200 rounded-lg p-3 mb-3">
                                                <input
                                                    type="number"
                                                    value={amount}
                                                    onChange={(e) => setAmount(e.target.value)}
                                                    className="w-full text-center text-2xl font-bold focus:outline-none"
                                                />
                                            </div>

                                            {/* 増減ボタン */}
                                            <div className="grid grid-cols-6 gap-2">
                                                <button
                                                    onClick={() => setAmount(Math.max(0, parseFloat(amount) - 100).toString())}
                                                    className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm font-medium"
                                                >
                                                    -100
                                                </button>
                                                <button
                                                    onClick={() => setAmount(Math.max(0, parseFloat(amount) - 50).toString())}
                                                    className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm font-medium"
                                                >
                                                    -50
                                                </button>
                                                <button
                                                    onClick={() => setAmount(Math.max(0, parseFloat(amount) - 10).toString())}
                                                    className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm font-medium"
                                                >
                                                    -10
                                                </button>
                                                <button
                                                    onClick={() => setAmount((parseFloat(amount) + 10).toString())}
                                                    className="px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition text-sm font-medium"
                                                >
                                                    +10
                                                </button>
                                                <button
                                                    onClick={() => setAmount((parseFloat(amount) + 50).toString())}
                                                    className="px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition text-sm font-medium"
                                                >
                                                    +50
                                                </button>
                                                <button
                                                    onClick={() => setAmount((parseFloat(amount) + 100).toString())}
                                                    className="px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition text-sm font-medium"
                                                >
                                                    +100
                                                </button>
                                            </div>
                                        </div>

                                        {/* 摂取量の栄養表示 */}
                                        <div className="bg-gray-900 text-white p-4 rounded-lg">
                                            <p className="text-sm text-gray-400 mb-2">摂取量</p>
                                            <div className="grid grid-cols-4 gap-3 text-center">
                                                <div>
                                                    <p className="text-xs text-gray-400">カロリー</p>
                                                    <p className="text-lg font-bold pfc-calories">{Math.round((parseFloat(selectedItem.calories) || 0) * parseFloat(amount) / 100)}kcal</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-400">P</p>
                                                    <p className="text-lg font-bold pfc-protein">{((parseFloat(selectedItem.protein) || 0) * parseFloat(amount) / 100).toFixed(1)}g</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-400">F</p>
                                                    <p className="text-lg font-bold pfc-fat">{((parseFloat(selectedItem.fat) || 0) * parseFloat(amount) / 100).toFixed(1)}g</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-400">C</p>
                                                    <p className="text-lg font-bold pfc-carbs">{((parseFloat(selectedItem.carbs) || 0) * parseFloat(amount) / 100).toFixed(1)}g</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 追加・キャンセルボタン */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => {
                                                    if (editingItemIndex !== null) {
                                                        // 編集モードの場合は検索モーダルを閉じて元の画面に戻る
                                                        setShowSearchModal(false);
                                                        setSelectedItem(null);
                                                        setAmount('100');
                                                        setEditingItemIndex(null);
                                                        setSearchTerm('');
                                                    } else {
                                                        // 通常の追加モードの場合は検索画面に戻る
                                                        setSelectedItem(null);
                                                        setAmount('100');
                                                    }
                                                }}
                                                className="w-full bg-white text-gray-700 font-bold py-3 px-4 rounded-lg border-2 border-gray-300 hover:bg-gray-50 transition"
                                            >
                                                キャンセル
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const parsedAmount = parseFloat(amount) || 100;
                                                    const adjustedCalories = (parseFloat(selectedItem.calories) || 0) * parsedAmount / 100;
                                                    const adjustedProtein = (parseFloat(selectedItem.protein) || 0) * parsedAmount / 100;
                                                    const adjustedFat = (parseFloat(selectedItem.fat) || 0) * parsedAmount / 100;
                                                    const adjustedCarbs = (parseFloat(selectedItem.carbs) || 0) * parsedAmount / 100;

                                                    const newItem = {
                                                        name: selectedItem.name,
                                                        amount: parsedAmount,
                                                        calories: adjustedCalories || 0,
                                                        protein: adjustedProtein || 0,
                                                        fat: adjustedFat || 0,
                                                        carbs: adjustedCarbs || 0,
                                                        category: selectedItem.category,
                                                        vitamins: selectedItem.vitamins || {},
                                                        minerals: selectedItem.minerals || {}
                                                    };

                                                    // 編集モードの場合は既存アイテムを更新、それ以外は追加
                                                    if (editingItemIndex !== null) {
                                                        const updatedItems = [...addedItems];
                                                        updatedItems[editingItemIndex] = newItem;
                                                        setAddedItems(updatedItems);
                                                        setEditingItemIndex(null); // 編集モードをリセット
                                                        // 編集モードの場合はモーダルを閉じる
                                                        setSelectedItem(null);
                                                        setAmount('100');
                                                        setShowSearchModal(false);
                                                        setSearchTerm('');
                                                    } else {
                                                        // 新規追加モードの場合はアイテムを追加してモーダルを完全に閉じる
                                                        setAddedItems([...addedItems, newItem]);
                                                        setSelectedItem(null);
                                                        setAmount('100');
                                                        setShowSearchModal(false);
                                                        setSearchTerm('');
                                                        setExpandedCategories({}); // カテゴリタブをすべて閉じる
                                                    }
                                                }}
                                                className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition"
                                            >
                                                {editingItemIndex !== null ? '更新' : '追加'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                }

                return (
                    <div className="space-y-6">
                        {/* 食事名入力 */}
                        <div className="space-y-2">
                            <label className="font-semibold text-gray-700 text-sm">食事名</label>
                            <input
                                type="text"
                                value={mealName}
                                onChange={(e) => setMealName(e.target.value)}
                                placeholder="朝食、1食目など..."
                                className="w-full p-3 bg-gray-100 rounded-lg border-2 border-transparent focus:outline-none focus:bg-white focus:border-black transition"
                            />
                        </div>

                        {/* どうやって記録しますか？選択 */}
                        {!selectedItem && addedItems.length === 0 && (
                            <div className="space-y-3">
                                <p className="text-sm font-semibold text-gray-700 text-center">どうやって記録しますか？</p>
                                <div className="grid grid-cols-1 gap-3">
                                    {/* 写真から記録 */}
                                    <button
                                        onClick={() => {
                                            // プレミアム機能チェック（初日は無料）
                                            const access = SubscriptionUtils.canAccessFeature(userProfile, 'photoAnalysis');
                                            if (!access.allowed) {
                                                alert(access.message);
                                                return;
                                            }
                                            setShowAIFoodRecognition(true);
                                        }}
                                        className="flex items-center gap-3 p-4 bg-black hover:bg-gray-900 rounded-xl transition text-white"
                                    >
                                        <Icon name="Camera" size={24} />
                                        <div className="flex-1 text-left">
                                            <p className="font-bold">写真から記録</p>
                                            <p className="text-xs text-gray-300">AIが自動で栄養素を分析します</p>
                                        </div>
                                        <Icon name="ChevronRight" size={20} />
                                    </button>

                                    {/* 食材を検索 */}
                                    <button
                                        onClick={() => {
                                            setShowSearchModal(true);
                                            setSearchModalTab(type === 'supplement' ? 'supplement' : 'food');
                                        }}
                                        className="flex items-center gap-3 p-4 bg-white hover:bg-gray-50 rounded-xl border-2 border-gray-200 transition"
                                    >
                                        <Icon name="Search" size={24} className="text-gray-700" />
                                        <div className="flex-1 text-left">
                                            <p className="font-bold text-gray-900">食材を検索</p>
                                            <p className="text-xs text-gray-500">食品データベースから検索します</p>
                                        </div>
                                        <Icon name="ChevronRight" size={20} className="text-gray-400" />
                                    </button>

                                    {/* テンプレートから読み込み */}
                                    <button
                                        onClick={async () => {
                                            const templates = await DataService.getMealTemplates(user.uid);
                                            setMealTemplates(templates);
                                            setShowTemplates(!showTemplates);
                                        }}
                                        className="flex items-center gap-3 p-4 bg-white hover:bg-gray-50 rounded-xl border-2 border-gray-200 transition"
                                    >
                                        <Icon name="FileText" size={24} className="text-gray-700" />
                                        <div className="flex-1 text-left">
                                            <p className="font-bold text-gray-900">テンプレートから読み込み</p>
                                            <p className="text-xs text-gray-500">保存済みの食事を読み込み</p>
                                        </div>
                                        <Icon name="ChevronRight" size={20} className="text-gray-400" />
                                    </button>

                                    {/* カスタム作成 */}
                                    <button
                                        onClick={() => setShowCustomSupplementForm(true)}
                                        className="flex items-center gap-3 p-4 bg-white hover:bg-gray-50 rounded-xl border-2 border-gray-200 transition"
                                    >
                                        <Icon name="Plus" size={24} className="text-gray-700" />
                                        <div className="flex-1 text-left">
                                            <p className="font-bold text-gray-900">カスタム作成</p>
                                            <p className="text-xs text-gray-500">カスタムで食材料理を作成します</p>
                                        </div>
                                        <Icon name="ChevronRight" size={20} className="text-gray-400" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* テンプレート（選択ボタン表示時のみ） */}

                        {/* カスタムアイテム作成フォーム */}
                        {showCustomSupplementForm && !selectedItem && (
                            <div className="bg-white rounded-xl p-4 space-y-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-lg">カスタムアイテムを作成</h3>
                                    <button
                                        onClick={() => setShowCustomSupplementForm(false)}
                                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full"
                                    >
                                        <Icon name="X" size={20} />
                                    </button>
                                </div>

                                {/* 既存のカスタムアイテム作成フォームの内容をここに移動 */}
                                <div className="space-y-4">
                                    {/* 基本情報 */}
                                    <div className="space-y-3">
                                        <h4 className="font-bold text-sm text-gray-700 border-b pb-2">📝 基本情報</h4>

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
                                                className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-xs font-medium text-gray-700 mb-1 block">種類</label>
                                            <div className="space-y-2">
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
                                                            ? 'bg-orange-600 text-white'
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

                                        <div>
                                            <label className="text-xs font-medium text-gray-700 mb-1 block">カテゴリ</label>
                                            {customSupplementData.itemType === 'recipe' ? (
                                                <div className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg bg-gray-100 text-gray-500">
                                                    料理
                                                </div>
                                            ) : (
                                                <select
                                                    value={customSupplementData.category}
                                                    onChange={(e) => setCustomSupplementData({...customSupplementData, category: e.target.value})}
                                                    className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
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
                                        </div>

                                        <div>
                                            <label className="text-xs font-medium text-gray-700 mb-1 block">1回分の量</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    value={customSupplementData.servingSize}
                                                    onChange={(e) => setCustomSupplementData({...customSupplementData, servingSize: e.target.value === '' ? '' : (parseFloat(e.target.value) || 1)})}
                                                    placeholder="100"
                                                    className="flex-1 px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                                                />
                                                <select
                                                    value={customSupplementData.servingUnit}
                                                    onChange={(e) => setCustomSupplementData({...customSupplementData, servingUnit: e.target.value})}
                                                    className="px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                                                >
                                                    <option value="g">g</option>
                                                    <option value="mg">mg</option>
                                                    <option value="ml">ml</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 基本栄養素 */}
                                    <div className="space-y-3">
                                        <h4 className="font-bold text-sm text-gray-700 border-b pb-2">🍽️ 基本栄養素（{customSupplementData.servingSize}{customSupplementData.servingUnit}あたり）</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-xs text-gray-600 block mb-1">カロリー (kcal)</label>
                                                <input type="number" value={customSupplementData.calories} onChange={(e) => setCustomSupplementData({...customSupplementData, calories: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none" placeholder="0" />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-600 block mb-1">タンパク質 (g)</label>
                                                <input type="number" value={customSupplementData.protein} onChange={(e) => setCustomSupplementData({...customSupplementData, protein: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none" placeholder="0" />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-600 block mb-1">脂質 (g)</label>
                                                <input type="number" value={customSupplementData.fat} onChange={(e) => setCustomSupplementData({...customSupplementData, fat: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none" placeholder="0" />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-600 block mb-1">炭水化物 (g)</label>
                                                <input type="number" value={customSupplementData.carbs} onChange={(e) => setCustomSupplementData({...customSupplementData, carbs: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none" placeholder="0" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* ビタミン */}
                                    <div className="space-y-3">
                                        <h4 className="font-bold text-sm text-gray-700 border-b pb-2">💊 ビタミン（任意）</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div><label className="text-xs text-gray-600 block mb-1">ビタミンA (μg)</label><input type="number" value={customSupplementData.vitaminA} onChange={(e) => setCustomSupplementData({...customSupplementData, vitaminA: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:outline-none" placeholder="0" /></div>
                                            <div><label className="text-xs text-gray-600 block mb-1">ビタミンB1 (mg)</label><input type="number" value={customSupplementData.vitaminB1} onChange={(e) => setCustomSupplementData({...customSupplementData, vitaminB1: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:outline-none" placeholder="0" /></div>
                                            <div><label className="text-xs text-gray-600 block mb-1">ビタミンB2 (mg)</label><input type="number" value={customSupplementData.vitaminB2} onChange={(e) => setCustomSupplementData({...customSupplementData, vitaminB2: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:outline-none" placeholder="0" /></div>
                                            <div><label className="text-xs text-gray-600 block mb-1">ビタミンB6 (mg)</label><input type="number" value={customSupplementData.vitaminB6} onChange={(e) => setCustomSupplementData({...customSupplementData, vitaminB6: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:outline-none" placeholder="0" /></div>
                                            <div><label className="text-xs text-gray-600 block mb-1">ビタミンB12 (μg)</label><input type="number" value={customSupplementData.vitaminB12} onChange={(e) => setCustomSupplementData({...customSupplementData, vitaminB12: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:outline-none" placeholder="0" /></div>
                                            <div><label className="text-xs text-gray-600 block mb-1">ビタミンC (mg)</label><input type="number" value={customSupplementData.vitaminC} onChange={(e) => setCustomSupplementData({...customSupplementData, vitaminC: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:outline-none" placeholder="0" /></div>
                                            <div><label className="text-xs text-gray-600 block mb-1">ビタミンD (μg)</label><input type="number" value={customSupplementData.vitaminD} onChange={(e) => setCustomSupplementData({...customSupplementData, vitaminD: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:outline-none" placeholder="0" /></div>
                                            <div><label className="text-xs text-gray-600 block mb-1">ビタミンE (mg)</label><input type="number" value={customSupplementData.vitaminE} onChange={(e) => setCustomSupplementData({...customSupplementData, vitaminE: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:outline-none" placeholder="0" /></div>
                                            <div><label className="text-xs text-gray-600 block mb-1">ビタミンK (μg)</label><input type="number" value={customSupplementData.vitaminK} onChange={(e) => setCustomSupplementData({...customSupplementData, vitaminK: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:outline-none" placeholder="0" /></div>
                                            <div><label className="text-xs text-gray-600 block mb-1">ナイアシン (mg)</label><input type="number" value={customSupplementData.niacin} onChange={(e) => setCustomSupplementData({...customSupplementData, niacin: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:outline-none" placeholder="0" /></div>
                                            <div><label className="text-xs text-gray-600 block mb-1">パントテン酸 (mg)</label><input type="number" value={customSupplementData.pantothenicAcid} onChange={(e) => setCustomSupplementData({...customSupplementData, pantothenicAcid: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:outline-none" placeholder="0" /></div>
                                            <div><label className="text-xs text-gray-600 block mb-1">ビオチン (μg)</label><input type="number" value={customSupplementData.biotin} onChange={(e) => setCustomSupplementData({...customSupplementData, biotin: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:outline-none" placeholder="0" /></div>
                                            <div><label className="text-xs text-gray-600 block mb-1">葉酸 (μg)</label><input type="number" value={customSupplementData.folicAcid} onChange={(e) => setCustomSupplementData({...customSupplementData, folicAcid: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:outline-none" placeholder="0" /></div>
                                        </div>
                                    </div>

                                    {/* ミネラル */}
                                    <div className="space-y-3">
                                        <h4 className="font-bold text-sm text-gray-700 border-b pb-2">⚡ ミネラル（任意）</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div><label className="text-xs text-gray-600 block mb-1">ナトリウム (mg)</label><input type="number" value={customSupplementData.sodium} onChange={(e) => setCustomSupplementData({...customSupplementData, sodium: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:outline-none" placeholder="0" /></div>
                                            <div><label className="text-xs text-gray-600 block mb-1">カリウム (mg)</label><input type="number" value={customSupplementData.potassium} onChange={(e) => setCustomSupplementData({...customSupplementData, potassium: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:outline-none" placeholder="0" /></div>
                                            <div><label className="text-xs text-gray-600 block mb-1">カルシウム (mg)</label><input type="number" value={customSupplementData.calcium} onChange={(e) => setCustomSupplementData({...customSupplementData, calcium: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:outline-none" placeholder="0" /></div>
                                            <div><label className="text-xs text-gray-600 block mb-1">マグネシウム (mg)</label><input type="number" value={customSupplementData.magnesium} onChange={(e) => setCustomSupplementData({...customSupplementData, magnesium: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:outline-none" placeholder="0" /></div>
                                            <div><label className="text-xs text-gray-600 block mb-1">リン (mg)</label><input type="number" value={customSupplementData.phosphorus} onChange={(e) => setCustomSupplementData({...customSupplementData, phosphorus: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:outline-none" placeholder="0" /></div>
                                            <div><label className="text-xs text-gray-600 block mb-1">鉄 (mg)</label><input type="number" value={customSupplementData.iron} onChange={(e) => setCustomSupplementData({...customSupplementData, iron: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:outline-none" placeholder="0" /></div>
                                            <div><label className="text-xs text-gray-600 block mb-1">亜鉛 (mg)</label><input type="number" value={customSupplementData.zinc} onChange={(e) => setCustomSupplementData({...customSupplementData, zinc: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:outline-none" placeholder="0" /></div>
                                            <div><label className="text-xs text-gray-600 block mb-1">銅 (mg)</label><input type="number" value={customSupplementData.copper} onChange={(e) => setCustomSupplementData({...customSupplementData, copper: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:outline-none" placeholder="0" /></div>
                                            <div><label className="text-xs text-gray-600 block mb-1">マンガン (mg)</label><input type="number" value={customSupplementData.manganese} onChange={(e) => setCustomSupplementData({...customSupplementData, manganese: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:outline-none" placeholder="0" /></div>
                                            <div><label className="text-xs text-gray-600 block mb-1">ヨウ素 (μg)</label><input type="number" value={customSupplementData.iodine} onChange={(e) => setCustomSupplementData({...customSupplementData, iodine: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:outline-none" placeholder="0" /></div>
                                            <div><label className="text-xs text-gray-600 block mb-1">セレン (μg)</label><input type="number" value={customSupplementData.selenium} onChange={(e) => setCustomSupplementData({...customSupplementData, selenium: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:outline-none" placeholder="0" /></div>
                                            <div><label className="text-xs text-gray-600 block mb-1">クロム (μg)</label><input type="number" value={customSupplementData.chromium} onChange={(e) => setCustomSupplementData({...customSupplementData, chromium: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:outline-none" placeholder="0" /></div>
                                            <div><label className="text-xs text-gray-600 block mb-1">モリブデン (μg)</label><input type="number" value={customSupplementData.molybdenum} onChange={(e) => setCustomSupplementData({...customSupplementData, molybdenum: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:outline-none" placeholder="0" /></div>
                                        </div>
                                    </div>

                                    {/* その他栄養素 */}
                                    <div className="space-y-3">
                                        <h4 className="font-bold text-sm text-gray-700 border-b pb-2">🔬 その他栄養素（任意）</h4>
                                        {customSupplementData.otherNutrients.map((nutrient, idx) => (
                                            <div key={idx} className="flex gap-2">
                                                <input type="text" value={nutrient.name} onChange={(e) => { const updated = [...customSupplementData.otherNutrients]; updated[idx].name = e.target.value; setCustomSupplementData({...customSupplementData, otherNutrients: updated}); }} placeholder="栄養素名" className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:outline-none" />
                                                <input type="number" value={nutrient.amount} onChange={(e) => { const updated = [...customSupplementData.otherNutrients]; updated[idx].amount = e.target.value; setCustomSupplementData({...customSupplementData, otherNutrients: updated}); }} placeholder="量" className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:outline-none" />
                                                <input type="text" value={nutrient.unit} onChange={(e) => { const updated = [...customSupplementData.otherNutrients]; updated[idx].unit = e.target.value; setCustomSupplementData({...customSupplementData, otherNutrients: updated}); }} placeholder="単位" className="w-16 px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:outline-none" />
                                                <button onClick={() => { const updated = customSupplementData.otherNutrients.filter((_, i) => i !== idx); setCustomSupplementData({...customSupplementData, otherNutrients: updated}); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Icon name="X" size={16} /></button>
                                            </div>
                                        ))}
                                        <button onClick={() => setCustomSupplementData({...customSupplementData, otherNutrients: [...customSupplementData.otherNutrients, {name: '', amount: '', unit: ''}]})} className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-sm font-medium">+ 栄養素を追加</button>
                                    </div>

                                    {/* 保存ボタン */}
                                    <button
                                        onClick={() => {
                                            if (!customSupplementData.name.trim()) {
                                                alert('アイテム名を入力してください');
                                                return;
                                            }

                                            const finalCategory = customSupplementData.itemType === 'recipe' ? '料理' : customSupplementData.category;

                                            const customItem = {
                                                itemType: customSupplementData.itemType,
                                                name: customSupplementData.name,
                                                category: finalCategory,
                                                servingSize: customSupplementData.servingSize,
                                                servingUnit: customSupplementData.servingUnit,
                                                calories: customSupplementData.calories,
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
                                                    chromium: customSupplementData.chromium || 0,
                                                    molybdenum: customSupplementData.molybdenum || 0
                                                }
                                            };

                                            const customFoods = JSON.parse(localStorage.getItem('customFoods') || '[]');
                                            customFoods.push(customItem);
                                            localStorage.setItem('customFoods', JSON.stringify(customFoods));

                                            const newItem = {
                                                name: customSupplementData.name,
                                                amount: `${customSupplementData.servingSize}${customSupplementData.servingUnit}`,
                                                calories: customSupplementData.calories,
                                                protein: customSupplementData.protein,
                                                fat: customSupplementData.fat,
                                                carbs: customSupplementData.carbs,
                                                category: finalCategory,
                                                isCustom: true,
                                                vitamins: customItem.vitamins,
                                                minerals: customItem.minerals
                                            };
                                            setAddedItems([...addedItems, newItem]);

                                            setCustomSupplementData({
                                                itemType: 'food',
                                                name: '', category: 'ビタミン・ミネラル', servingSize: 1, servingUnit: 'g',
                                                calories: 0, protein: 0, fat: 0, carbs: 0,
                                                vitaminA: 0, vitaminB1: 0, vitaminB2: 0, vitaminB6: 0, vitaminB12: 0,
                                                vitaminC: 0, vitaminD: 0, vitaminE: 0, vitaminK: 0,
                                                niacin: 0, pantothenicAcid: 0, biotin: 0, folicAcid: 0,
                                                sodium: 0, potassium: 0, calcium: 0, magnesium: 0, phosphorus: 0,
                                                iron: 0, zinc: 0, copper: 0, manganese: 0, iodine: 0, selenium: 0, chromium: 0, molybdenum: 0,
                                                otherNutrients: []
                                            });
                                            setShowCustomSupplementForm(false);

                                            alert('カスタムアイテムを作成しました！');
                                        }}
                                        className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-bold"
                                    >
                                        保存して追加
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ③追加済みアイテム一覧 */}
                        {addedItems.length > 0 && (
                            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                                <div className="flex justify-between items-center mb-3">
                                    <p className="text-sm font-medium text-indigo-900">追加済み ({addedItems.length}品目)</p>
                                    <button
                                        onClick={() => {
                                            setShowSearchModal(true);
                                            setEditingItemIndex(null); // 新規追加モード
                                        }}
                                        className="flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 transition"
                                    >
                                        <Icon name="Plus" size={14} />
                                        <span>食材を追加</span>
                                    </button>
                                </div>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {addedItems.map((item, index) => (
                                        <div key={index} className="bg-white p-2 rounded-lg">
                                            <div className="flex justify-between items-center mb-2">
                                                <button
                                                    onClick={() => {
                                                        // アイテムをクリックして編集モーダルを開く
                                                        setEditingItemIndex(index); // 編集中のインデックスを保存
                                                        setSelectedItem(item);
                                                        setAmount(String(item.amount));
                                                        setShowSearchModal(true);
                                                    }}
                                                    className="flex-1 text-left hover:bg-gray-50 rounded px-2 py-1"
                                                >
                                                    <p className="text-sm font-medium text-blue-600">{item.name}</p>
                                                    <p className="text-xs text-gray-600">{item.amount}g - {Math.round(item.calories)}kcal</p>
                                                </button>
                                                <button
                                                    onClick={() => setAddedItems(addedItems.filter((_, i) => i !== index))}
                                                    className="text-red-500 hover:text-red-700 ml-2"
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
                                            <p className="font-bold pfc-calories">
                                                {Math.round(addedItems.reduce((sum, item) => {
                                                    const cal = typeof item.calories === 'number' ? item.calories : parseFloat(item.calories) || 0;
                                                    return sum + (isNaN(cal) ? 0 : cal);
                                                }, 0))}kcal
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">P</p>
                                            <p className="font-bold pfc-protein">
                                                {addedItems.reduce((sum, item) => {
                                                    const p = typeof item.protein === 'number' ? item.protein : parseFloat(item.protein) || 0;
                                                    return sum + (isNaN(p) ? 0 : p);
                                                }, 0).toFixed(1)}g
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">F</p>
                                            <p className="font-bold pfc-fat">
                                                {addedItems.reduce((sum, item) => {
                                                    const f = typeof item.fat === 'number' ? item.fat : parseFloat(item.fat) || 0;
                                                    return sum + (isNaN(f) ? 0 : f);
                                                }, 0).toFixed(1)}g
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">C</p>
                                            <p className="font-bold pfc-carbs">
                                                {addedItems.reduce((sum, item) => {
                                                    const c = typeof item.carbs === 'number' ? item.carbs : parseFloat(item.carbs) || 0;
                                                    return sum + (isNaN(c) ? 0 : c);
                                                }, 0).toFixed(1)}g
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* テンプレート保存 */}
                        {addedItems.length > 0 && (
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <p className="text-sm font-semibold text-gray-700 mb-2">テンプレートとして保存</p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={templateName}
                                        onChange={(e) => setTemplateName(e.target.value)}
                                        placeholder="テンプレート名を入力..."
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    />
                                    <button
                                        onClick={saveAsTemplate}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                                    >
                                        保存
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* テンプレート一覧モーダル */}
                        {showTemplates && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex items-center justify-center p-4" style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0}}>
                                <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                                    {/* ヘッダー */}
                                    <div className="flex items-center justify-between p-4 border-b">
                                        <h3 className="font-bold text-lg">テンプレート一覧</h3>
                                        <button
                                            onClick={() => setShowTemplates(false)}
                                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full"
                                        >
                                            <Icon name="X" size={20} />
                                        </button>
                                    </div>

                                    {/* テンプレートリスト */}
                                    <div className="flex-1 overflow-y-auto p-4">
                                        {mealTemplates.length === 0 ? (
                                            <p className="text-center text-gray-500 py-8">保存されたテンプレートはありません</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {mealTemplates.map((template) => (
                                                    <div key={template.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1">
                                                                <h4 className="font-bold text-gray-900">{template.name}</h4>
                                                                <p className="text-xs text-gray-500 mt-1">
                                                                    {template.items?.length || 0}品目
                                                                </p>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => {
                                                                        loadTemplate(template);
                                                                        setShowTemplates(false);
                                                                    }}
                                                                    className="px-3 py-1 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition"
                                                                >
                                                                    読み込み
                                                                </button>
                                                                <button
                                                                    onClick={() => deleteTemplate(template.id)}
                                                                    className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition"
                                                                >
                                                                    削除
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ⑤記録ボタン */}
                        {addedItems.length > 0 && !selectedItem && (
                            <button
                                onClick={async () => {
                                    const totalCalories = addedItems.reduce((sum, item) => sum + item.calories, 0);
                                    const newMeal = {
                                        id: Date.now(),
                                        time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
                                        name: mealName || '食事',
                                        calories: Math.round(totalCalories),
                                        items: addedItems.map(item => ({
                                            name: item.name,
                                            amount: `${item.amount}g`,
                                            protein: item.protein,
                                            fat: item.fat,
                                            carbs: item.carbs,
                                            vitamins: item.vitamins,
                                            minerals: item.minerals
                                        }))
                                    };

                                    onAdd(newMeal);
                                }}
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-4 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition shadow-lg"
                            >
                                記録する ({addedItems.length}品目)
                            </button>
                        )}

                        {/* AI食事認識モーダル */}
                        {showAIFoodRecognition && (
                            <AIFoodRecognition
                                onFoodsRecognized={handleFoodsRecognized}
                                onClose={() => setShowAIFoodRecognition(false)}
                            />
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
                            <h3 className="text-lg font-bold">
                                {type === 'meal' && '食事を記録'}
                                {type === 'workout' && '運動を記録'}
                            </h3>
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
                            }} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full">
                                <Icon name="X" size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            {type === 'meal' && renderFoodInput()}
                            {type === 'workout' && renderWorkoutInput()}
                        </div>
                    </div>

                    {/* セット種類説明モーダル */}
                    {showSetTypeModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                                <div className="p-4 border-b flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                        <Icon name="Info" size={20} className="text-blue-600" />
                                        セットの種類について
                                    </h3>
                                    <button onClick={() => setShowSetTypeModal(false)} className="text-gray-400 hover:text-gray-600">
                                        <Icon name="X" size={24} />
                                    </button>
                                </div>
                                <div className="p-6">
                                    <div className="space-y-4">
                                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                                            <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                                                <Icon name="Activity" size={18} />
                                                アップセット
                                            </h4>
                                            <p className="text-sm text-blue-800 mb-2">
                                                ウォームアップ用の軽い重量セット
                                            </p>
                                            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                                                <li>メインセットの前に行う準備運動</li>
                                                <li>筋肉や関節を温める</li>
                                                <li>RM更新記録には含まれません</li>
                                            </ul>
                                        </div>

                                        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
                                            <h4 className="font-bold text-orange-900 mb-2 flex items-center gap-2">
                                                <Icon name="Zap" size={18} />
                                                メインセット
                                            </h4>
                                            <p className="text-sm text-orange-800 mb-2">
                                                実際のトレーニング重量で行うセット
                                            </p>
                                            <ul className="text-sm text-orange-700 space-y-1 list-disc list-inside">
                                                <li>本番のトレーニングセット</li>
                                                <li>最大の負荷をかける</li>
                                                <li>RM更新記録の対象になります</li>
                                            </ul>
                                        </div>

                                        <div className="bg-gray-50 border border-gray-200 p-3 rounded">
                                            <p className="text-xs text-gray-600">
                                                <Icon name="AlertCircle" size={14} className="inline mr-1" />
                                                ※RM更新記録は「RM記録を保存」セクションに入力した場合のみ反映されます
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 border-t bg-gray-50">
                                    <button
                                        onClick={() => setShowSetTypeModal(false)}
                                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition"
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
