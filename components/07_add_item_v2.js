// ===== Edit Meal Modal (食事編集専用モーダル) =====
const EditMealModal = ({ meal, onClose, onUpdate }) => {
    const [amount, setAmount] = useState(100);
    const [foodData, setFoodData] = useState(null);
    const [bottleSize, setBottleSize] = useState(null); // 1本の容量（ml）

    // foodDatabaseから元の食品情報を取得
    useEffect(() => {
        if (meal && meal.items && meal.items.length > 0) {
            const item = meal.items[0]; // 最初のアイテムを編集対象とする
            console.log('📝 EditMealModal: 編集対象アイテム', item);

            // 「本」単位の特殊処理
            if (item.unit === '本') {
                console.log('📦 本単位のアイテム:', item);
                // 本単位の場合、item自体の栄養素を「1本あたり」として使用
                setFoodData({
                    name: item.name,
                    servingSize: 1, // 1本あたり
                    unit: '本',
                    calories: item.calories || 0,
                    protein: item.protein || 0,
                    fat: item.fat || 0,
                    carbs: item.carbs || 0
                });
                setAmount(1); // デフォルト1本
                setBottleSize(null); // bottleSizeは使わない
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
                        servingSize: 100, // foodDatabase_v2は全て100gあたり
                        unit: dbItem.unit || 'g'
                    };
                }
            });

            if (found) {
                console.log('✅ 最終的なfoodData:', found);
                setFoodData(found);
                setBottleSize(null);
                setAmount(parseFloat(item.amount) || 100);
            } else {
                console.error('❌ foodDatabaseから食品が見つかりません:', item.name);
                // データベースにない場合は、アイテム自体のデータを使用
                setFoodData({
                    name: item.name,
                    servingSize: 100,
                    unit: item.unit || 'g',
                    calories: item.calories || 0,
                    protein: item.protein || 0,
                    fat: item.fat || 0,
                    carbs: item.carbs || 0
                });
                setAmount(parseFloat(item.amount) || 100);
                setBottleSize(null);
            }
        }
    }, [meal]);

    if (!foodData) {
        return null;
    }

    // 計算後の栄養情報
    const ratio = amount / (foodData.servingSize || 1);
    const calculatedCalories = Math.round((foodData.calories || 0) * ratio);
    const calculatedProtein = ((foodData.protein || 0) * ratio).toFixed(1);
    const calculatedFat = ((foodData.fat || 0) * ratio).toFixed(1);
    const calculatedCarbs = ((foodData.carbs || 0) * ratio).toFixed(1);

    console.log('🧮 計算:', {
        amount,
        servingSize: foodData.servingSize,
        ratio,
        calories: foodData.calories,
        calculatedCalories
    });

    const handleUpdate = () => {
        const updatedMeal = {
            ...meal,
            items: [{
                name: foodData.name,
                amount: amount,
                unit: foodData.unit || 'g',
                protein: (foodData.protein || 0) * ratio,
                fat: (foodData.fat || 0) * ratio,
                carbs: (foodData.carbs || 0) * ratio,
                calories: (foodData.calories || 0) * ratio
            }]
        };
        console.log('💾 更新データ:', updatedMeal);
        onUpdate(updatedMeal);
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
                                max={foodData.unit === '本' ? 10 : 500}
                                step={foodData.unit === '本' ? 0.1 : 5}
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                style={{
                                    background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${(amount/(foodData.unit === '本' ? 10 : 500))*100}%, #e5e7eb ${(amount/(foodData.unit === '本' ? 10 : 500))*100}%, #e5e7eb 100%)`
                                }}
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                {foodData.unit === '本' ? (
                                    <>
                                        <span onClick={() => setAmount(0)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">0本</span>
                                        <span onClick={() => setAmount(1)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">1本</span>
                                        <span onClick={() => setAmount(2)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">2本</span>
                                        <span onClick={() => setAmount(5)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">5本</span>
                                        <span onClick={() => setAmount(10)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">10本</span>
                                    </>
                                ) : (
                                    <>
                                        <span onClick={() => setAmount(0)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">0{foodData.unit || 'g'}</span>
                                        <span onClick={() => setAmount(100)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">100{foodData.unit || 'g'}</span>
                                        <span onClick={() => setAmount(200)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">200{foodData.unit || 'g'}</span>
                                        <span onClick={() => setAmount(300)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">300{foodData.unit || 'g'}</span>
                                        <span onClick={() => setAmount(400)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">400{foodData.unit || 'g'}</span>
                                        <span onClick={() => setAmount(500)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">500{foodData.unit || 'g'}</span>
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
        </div>
    );
};

// ===== Add Item Component =====
const AddItemView = ({ type, onClose, onAdd, userProfile, predictedData, unlockedFeatures, user, currentRoutine, usageDays, dailyRecord, editingTemplate, editingMeal }) => {
            // 食事とサプリを統合する場合、itemTypeで管理
            const isMealOrSupplement = type === 'meal' || type === 'supplement';

            const [searchTerm, setSearchTerm] = useState('');
            const [selectedItem, setSelectedItem] = useState(null);
            const [amount, setAmount] = useState(type === 'supplement' ? '1' : '100');
            const [expandedCategories, setExpandedCategories] = useState({});
            const [mealName, setMealName] = useState('');
            const [addedItems, setAddedItems] = useState([]);
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
            const [workoutInfoModal, setWorkoutInfoModal] = useState({ show: false, title: '', content: '' });
            const [showAdvancedTraining, setShowAdvancedTraining] = useState(false);
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
                                    <label className="block text-xs font-medium mb-1 flex items-center gap-1">
                                        体重 (kg)
                                        <button
                                            type="button"
                                            onClick={() => setWorkoutInfoModal({
                                                show: true,
                                                title: '体重記録について',
                                                content: `毎日の体重を記録して変化を追跡します。

【記録のタイミング】
• 起床後、トイレを済ませた後
• 朝食前の空腹時
• 毎日同じ時間帯に測定

【活用方法】
体重の変化を履歴グラフで確認でき、ダイエットやバルクアップの進捗を可視化できます。目標に応じた体重管理に役立ちます。`
                                            })}
                                            className="text-indigo-600 hover:text-indigo-800"
                                        >
                                            <Icon name="Info" size={12} />
                                        </button>
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
                                    <label className="block text-xs font-medium mb-1 flex items-center gap-1">
                                        体脂肪率 (%)
                                        <button
                                            type="button"
                                            onClick={() => setWorkoutInfoModal({
                                                show: true,
                                                title: '体脂肪率記録について',
                                                content: `体脂肪率を記録して体組成の変化を追跡します。

【測定方法】
• 体組成計で測定
• 起床後、空腹時に測定
• 毎日同じ時間帯・条件で測定

【活用方法】
体重と体脂肪率から除脂肪体重（LBM）を計算し、筋肉量の増減を把握できます。ボディメイクの質を評価する重要な指標です。`
                                            })}
                                            className="text-indigo-600 hover:text-indigo-800"
                                        >
                                            <Icon name="Info" size={12} />
                                        </button>
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
                    console.log('🏋️ handleWorkoutSave 実行開始');
                    console.log('  - exercises:', exercises);

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
                            console.log('[保存処理] exercise:', ex);

                            // 有酸素・ストレッチの場合（exercise プロパティがない）
                            if (ex.exerciseType === 'aerobic' || ex.exerciseType === 'stretch') {
                                console.log('  → 有酸素/ストレッチとして保存:', {
                                    name: ex.name,
                                    exerciseType: ex.exerciseType,
                                    duration: ex.duration
                                });
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
                            console.log('  → 筋トレとして保存:', {
                                name: ex.exercise.name,
                                sets: ex.sets
                            });
                            return {
                                exercise: ex.exercise,
                                exerciseType: ex.exercise?.exerciseType || 'anaerobic',
                                name: ex.exercise.name,
                                sets: ex.sets
                            };
                        })
                    };

                    console.log('[保存処理] 最終workoutData:', JSON.stringify(workoutData, null, 2));
                    console.log('  - onAdd関数:', typeof onAdd);

                    // 1つのworkoutとして追加
                    onAdd(workoutData);
                    console.log('✅ onAdd実行完了');
                    onClose();
                };

                const filteredExercises = exerciseDB.filter(ex =>
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
                                                            <summary className="p-3 cursor-pointer hover:bg-gray-100 rounded-lg">
                                                                <div className="flex items-center justify-between">
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
                                                                        >
                                                                            <Icon name="Trash2" size={16} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </summary>
                                                            <div className="px-3 pb-3 space-y-2">
                                                                {template.exercises?.map((exercise, exIdx) => (
                                                                    <div key={exIdx} className="text-sm border-t border-gray-200 pt-2">
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
                                                const strengthCategories = ['胸', '背中', '脚', '肩', '腕', '腹筋・体幹', '尻', 'ウエイトリフティング'];
                                                const cardioCategories = ['有酸素運動'];
                                                const stretchCategories = ['ストレッチ'];

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
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
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
                                                setCurrentExercise(customExercise);
                                                setShowCustomExerciseForm(false);
                                                setCustomExerciseData({ name: '', category: '胸', subcategory: 'コンパウンド' });
                                            }}
                                            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-medium"
                                        >
                                            作成して選択
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowCustomExerciseForm(false);
                                                setCustomExerciseData({ name: '', category: '胸', subcategory: 'コンパウンド' });
                                            }}
                                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                                        >
                                            キャンセル
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

                                    {/* RM更新記録（常設） */}
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
• ベンチプレス 1reps × 100kg
• スクワット 5reps × 120kg
• デッドリフト 3reps × 150kg

【活用方法】
履歴画面でRM更新の記録を確認でき、筋力の成長を可視化できます。目標達成のモチベーション維持に役立ちます。

【入力形式】
「種目名 回数reps × 重量kg」の形式で入力すると見やすくなります。
例: ベンチプレス 1reps × 100kg`
                                                })}
                                                className="text-indigo-600 hover:text-indigo-800"
                                            >
                                                <Icon name="Info" size={14} />
                                            </button>
                                        </label>
                                        <input
                                            type="text"
                                            value={currentSet.rmUpdate || ''}
                                            onChange={(e) => setCurrentSet({...currentSet, rmUpdate: e.target.value})}
                                            placeholder="例: ベンチプレス 1reps × 100kg"
                                            className="w-full px-3 py-2 border rounded-lg"
                                        />
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

                                        console.log('[種目を追加] currentExercise:', currentExercise);
                                        console.log('[種目を追加] sets:', sets);

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
                                            console.log('[種目を追加] 有酸素/ストレッチ newExercise:', newExercise);
                                        } else {
                                            // 筋トレの場合は従来通り（セット詳細を含む）
                                            newExercise = {
                                                exercise: currentExercise,
                                                sets: sets,
                                                exerciseType: currentExercise.exerciseType
                                            };
                                            console.log('[種目を追加] 筋トレ newExercise:', newExercise);
                                        }

                                        console.log('[種目を追加] exercises配列に追加:', newExercise);
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

                                        return (
                                            <div key={index} className="bg-white p-3 rounded-lg border border-gray-200">
                                                <div className="flex justify-between items-start mb-1">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-sm">{ex.exercise.name}</p>
                                                        {isCardioOrStretch ? (
                                                            <p className="text-xs text-gray-600">{totalDuration}分</p>
                                                        ) : (
                                                            <p className="text-xs text-gray-600">{ex.sets.length}セット - {totalVolume}kg</p>
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

                                {/* 記録ボタン */}
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={handleWorkoutSave}
                                        className="bg-orange-600 text-white font-bold py-3 rounded-lg hover:bg-orange-700 transition"
                                    >
                                        記録
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
                                    onClick={() => setShowCustomSupplementForm(true)}
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
                                                        <details key={template.id} className="bg-gray-50 rounded-lg border border-gray-200">
                                                            <summary className="p-3 cursor-pointer hover:bg-gray-100 rounded-lg">
                                                                <div className="flex items-center justify-between">
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
                                                                                e.stopPropagation();
                                                                                loadTemplate(template);
                                                                                setShowTemplates(false);
                                                                            }}
                                                                            className="p-2 text-blue-500 hover:text-blue-700"
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
                                                                        >
                                                                            <Icon name="Trash2" size={16} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </summary>
                                                            <div className="px-3 pb-3 space-y-1">
                                                                {template.items.map((item, idx) => (
                                                                    <div key={idx} className="text-sm text-gray-700 py-1 border-t border-gray-200">
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

                                        {/* 追加済みアイテムリスト */}
                                        {addedItems.length > 0 && (
                                            <div className="mt-3 bg-blue-50 p-3 rounded-lg border border-blue-200">
                                                <p className="text-sm font-bold text-blue-700 mb-2">追加済み ({addedItems.length}品目)</p>
                                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                                    {addedItems.map((item, index) => (
                                                        <div key={index} className="bg-white px-3 py-1.5 rounded flex justify-between items-center">
                                                            <div className="flex-1">
                                                                <span className="text-xs font-medium">{item.name}</span>
                                                                <span className="text-xs text-gray-600 ml-2">
                                                                    {item.amount}{item.unit || 'g'}
                                                                </span>
                                                            </div>
                                                            <button
                                                                onClick={() => setAddedItems(addedItems.filter((_, i) => i !== index))}
                                                                className="text-red-500 hover:text-red-700 ml-2"
                                                            >
                                                                <Icon name="X" size={14} />
                                                            </button>
                                                        </div>
                                                    ))}
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
                                                                    // カスタム食材・カスタム料理の場合はlocalStorageから取得
                                                                    let food;
                                                                    let actualCategory;
                                                                    const isCustom = subCategory === 'カスタム食材' || subCategory === 'カスタム料理';

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
                                                                                category: subCategory === 'カスタム料理' ? '料理' : actualCategory,
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
                                        onClick={() => setShowCustomSupplementForm(false)}
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

                                                        {/* Row 3: カテゴリと重量 */}
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="text-xs font-medium text-gray-700 mb-1 block">カテゴリ</label>
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
                                                            </div>
                                                            <div>
                                                                <label className="text-xs font-medium text-gray-700 mb-1 block">1回分の量</label>
                                                                <div className="flex gap-2">
                                                                    <input
                                                                        type="number"
                                                                        value={customSupplementData.servingSize}
                                                                        onChange={(e) => setCustomSupplementData({...customSupplementData, servingSize: e.target.value === '' ? '' : (parseFloat(e.target.value) || 1)})}
                                                                        placeholder="量"
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
                                                                    alert('アイテム名を入力してください');
                                                                    return;
                                                                }

                                                                // カスタム料理の場合はカテゴリを「料理」に統一
                                                                const finalCategory = customSupplementData.itemType === 'recipe' ? '料理' : customSupplementData.category;

                                                                // localStorageに保存するデータ
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
                                                                        chromium: customSupplementData.chromium || 0
                                                                    }
                                                                };

                                                                // localStorageに保存
                                                                const customFoods = JSON.parse(localStorage.getItem('customFoods') || '[]');
                                                                customFoods.push(customItem);
                                                                localStorage.setItem('customFoods', JSON.stringify(customFoods));

                                                                // addedItemsに追加（表示用）
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

                                                                // フォームをリセット
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
                                                            className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                                                        >
                                                            追加
                                                        </button>
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
                                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                        量 (g)
                                        <button
                                            type="button"
                                            onClick={() => setWorkoutInfoModal({
                                                show: true,
                                                title: '食事入力の使い方',
                                                content: `食材の量をグラム単位で入力します。

【入力方法】
1. スライダーをドラッグして大まかな量を設定
2. 目盛り数値（100g、200gなど）をタップで即座に設定
3. 入力欄に直接数値を入力
4. 増減ボタン（-100～+100）で微調整

【入力のコツ】
• よく食べる量を覚えておくと便利です
• 例: ご飯茶碗1杯 ≒ 150g
• 例: 鶏むね肉（手のひら大）≒ 100g
• 例: 卵1個 ≒ 50g

【PFC自動計算】
入力した量に応じて、たんぱく質（P）・脂質（F）・炭水化物（C）が自動計算され、1日の目標に反映されます。`
                                            })}
                                            className="text-indigo-600 hover:text-indigo-800"
                                        >
                                            <Icon name="Info" size={14} />
                                        </button>
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

                        {/* ③追加済みアイテム一覧 */}
                        {addedItems.length > 0 && (
                            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                                <div className="flex justify-between items-center mb-3">
                                    <p className="text-sm font-medium text-indigo-900">追加済み ({addedItems.length}品目)</p>
                                </div>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {addedItems.map((item, index) => (
                                        <div key={index} className="bg-white p-2 rounded-lg flex justify-between items-center">
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">{item.name}</p>
                                                <p className="text-xs text-gray-600">{item.amount}g - {Math.round(item.calories)}kcal</p>
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
                                                    }}
                                                    className="text-blue-500 hover:text-blue-700"
                                                >
                                                    <Icon name="Pencil" size={16} />
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
                                        setShowSearchModal(true);
                                    }}
                                    className="w-full bg-indigo-600 text-white font-bold py-2 rounded-lg hover:bg-indigo-700 transition text-sm mt-3"
                                >
                                    アイテムを追加
                                </button>

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
                                                onClose();
                                                return;
                                            }

                                            // 通常の記録モード
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
                                        className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition"
                                    >
                                        {editingTemplate ? 'テンプレートを更新' : '記録'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setAddedItems([]);
                                            onClose();
                                        }}
                                        className="px-4 bg-gray-200 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-300 transition"
                                    >
                                        キャンセル
                                    </button>
                                </div>
                            </div>
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
                                {type === 'workout' && 'トレーニングを記録'}
                                {type === 'condition' && 'コンディションを記録'}
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
                </div>
            );
        };
