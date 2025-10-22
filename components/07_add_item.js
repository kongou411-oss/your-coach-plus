// ===== Add Item Component =====
        const AddItemView = ({ type, onClose, onAdd, userProfile, predictedData, unlockedFeatures, user, currentRoutine, usageDays, dailyRecord }) => {
            // 食事とサプリを統合する場合、itemTypeで管理
            const isMealOrSupplement = type === 'meal' || type === 'supplement';

            const [searchTerm, setSearchTerm] = useState('');
            const [selectedItem, setSelectedItem] = useState(null);
            const [amount, setAmount] = useState(type === 'supplement' ? '1' : '100');
            const [expandedCategories, setExpandedCategories] = useState({});
            const [mealName, setMealName] = useState('');
            const [addedItems, setAddedItems] = useState([]);
            const [mealTemplates, setMealTemplates] = useState([]);
            const [supplementTemplates, setSupplementTemplates] = useState([]);
            const [showTemplates, setShowTemplates] = useState(false);
            const [templateName, setTemplateName] = useState('');
            const [selectedExercise, setSelectedExercise] = useState(null);
            const [showAIFoodRecognition, setShowAIFoodRecognition] = useState(false);
            const [showCustomFoodCreator, setShowCustomFoodCreator] = useState(false);

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

            const renderConditionInput = () => {
                const [condition, setCondition] = useState({
                    sleepHours: 7,
                    sleep: 3,
                    fatigue: 3,
                    stress: 3,
                    mood: 3,
                    thinking: 3,
                    appetite: 3,
                    gut: 3,
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
                            value={condition.sleep}
                            onChange={(val) => setCondition({...condition, sleep: val})}
                            options={[
                                { value: 1, emoji: '😫', label: '最悪' },
                                { value: 2, emoji: '😪', label: '悪い' },
                                { value: 3, emoji: '😐', label: '普通' },
                                { value: 4, emoji: '😊', label: '良い' },
                                { value: 5, emoji: '🌟', label: '最高' }
                            ]}
                        />

                        <RatingButton
                            label="💪 疲労度（回復具合）"
                            value={condition.fatigue}
                            onChange={(val) => setCondition({...condition, fatigue: val})}
                            options={[
                                { value: 1, emoji: '🥱', label: 'ヘトヘト' },
                                { value: 2, emoji: '😓', label: '疲れ' },
                                { value: 3, emoji: '😐', label: '普通' },
                                { value: 4, emoji: '🙂', label: '回復' },
                                { value: 5, emoji: '💪', label: '絶好調' }
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
                            label="😊 気分"
                            value={condition.mood}
                            onChange={(val) => setCondition({...condition, mood: val})}
                            options={[
                                { value: 1, emoji: '😢', label: '落ち込み' },
                                { value: 2, emoji: '😕', label: '微妙' },
                                { value: 3, emoji: '😐', label: '普通' },
                                { value: 4, emoji: '😊', label: '良い' },
                                { value: 5, emoji: '🤗', label: '最高' }
                            ]}
                        />

                        <RatingButton
                            label="🧠 思考のクリアさ"
                            value={condition.thinking}
                            onChange={(val) => setCondition({...condition, thinking: val})}
                            options={[
                                { value: 1, emoji: '😵', label: 'フォグ' },
                                { value: 2, emoji: '😕', label: 'ぼんやり' },
                                { value: 3, emoji: '😐', label: '普通' },
                                { value: 4, emoji: '🙂', label: 'クリア' },
                                { value: 5, emoji: '✨', label: '超クリア' }
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
                            value={condition.gut}
                            onChange={(val) => setCondition({...condition, gut: val})}
                            options={[
                                { value: 1, emoji: '😖', label: '悪い' },
                                { value: 2, emoji: '😕', label: '不調' },
                                { value: 3, emoji: '😐', label: '普通' },
                                { value: 4, emoji: '🙂', label: '良好' },
                                { value: 5, emoji: '✨', label: '快調' }
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

                    // 全ての種目を1つのworkoutオブジェクトにまとめる
                    const workoutData = {
                        id: Date.now(),
                        time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
                        name: exercises.length === 1
                            ? exercises[0].exercise.name
                            : `${exercises[0].exercise.category}トレーニング`, // 複数種目の場合はカテゴリ名
                        category: exercises[0].exercise.category,
                        exercises: exercises.map(ex => ({
                            name: ex.exercise.name,
                            sets: ex.sets
                        }))
                    };

                    // 1つのworkoutとして追加
                    onAdd(workoutData);
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
                        {/* ①検索欄 */}
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="種目を検索..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                        />

                        {/* ②折りたたみカテゴリ一覧 */}
                        {!currentExercise ? (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {(() => {
                                        const categories = {};
                                        filteredExercises.forEach(ex => {
                                            if (!categories[ex.category]) {
                                                categories[ex.category] = [];
                                            }
                                            categories[ex.category].push(ex);
                                        });

                                        return Object.keys(categories).map(category => (
                                            <div key={category} className="border rounded-lg overflow-hidden">
                                                <button
                                                    onClick={() => setExpandedCategories(prev => ({...prev, [category]: !prev[category]}))}
                                                    className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex justify-between items-center"
                                                >
                                                    <span className="font-medium">{category}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-500">{categories[category].length}種目</span>
                                                        <Icon name={expandedCategories[category] ? 'ChevronDown' : 'ChevronRight'} size={20} />
                                                    </div>
                                                </button>
                                                {expandedCategories[category] && (
                                                    <div className="p-2 space-y-1">
                                                        {categories[category].map(exercise => (
                                                            <button
                                                                key={exercise.id}
                                                                onClick={() => setCurrentExercise(exercise)}
                                                                className="w-full text-left px-3 py-2 hover:bg-orange-50 rounded-lg transition"
                                                            >
                                                                <div className="flex justify-between items-center">
                                                                    <div>
                                                                        <p className="font-medium">{exercise.name}</p>
                                                                        <p className="text-xs text-gray-500">{exercise.subcategory}</p>
                                                                    </div>
                                                                    <span className="text-xs bg-gray-100 px-2 py-1 rounded-full self-start">
                                                                        {exercise.exerciseType === 'aerobic' ? '有酸素' : '無酸素'}
                                                                    </span>
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

                                    {/* セット追加ボタン */}
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
                        )}

                        <button
                            onClick={handleWorkoutSave}
                            disabled={exercises.length === 0}
                            className="w-full bg-orange-600 text-white font-bold py-4 rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <Icon name="Check" size={24} />
                            <span>運動を保存</span>
                        </button>

                        {/* 運動履歴画面 */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-bold mb-3">今日の運動記録</h4>
                            <div className="space-y-2">
                                {(dailyRecord.exercises || []).map((exercise, index) => (
                                    <div key={index} className="bg-white p-3 rounded-lg shadow-sm">
                                        <p className="font-medium">{exercise.name}</p>
                                        <p className="text-sm text-gray-600">
                                            {exercise.sets?.length || 0}セット
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
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
                        {/* ①検索欄 */}
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

                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="食材を検索..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />

                        {/* テンプレート（一覧+新規保存） - 12日以上で開放 */}
                        {!selectedItem && unlockedFeatures.includes(FEATURES.TRAINING_TEMPLATE.id) && (
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
                                            {mealTemplates.length > 0 && (
                                                <div className="space-y-2">
                                                    {mealTemplates.map(template => (
                                                        <div key={template.id} className="flex items-center gap-2 bg-white p-2 rounded border">
                                                            <button
                                                                onClick={() => loadTemplate(template)}
                                                                className="flex-1 text-left text-sm hover:text-indigo-600"
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
                                                            placeholder="テンプレート名（例: 朝食パターン1）"
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

                                            {mealTemplates.length === 0 && addedItems.length === 0 && (
                                                <p className="text-sm text-gray-600">保存されたテンプレートはありません</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                        )}

                        {/* AI食事認識ボタン */}
                        <button
                            type="button"
                            onClick={() => setShowAIFoodRecognition(true)}
                            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:from-cyan-700 hover:to-blue-700 transition flex items-center justify-center gap-2 shadow-lg"
                        >
                            <Icon name="Camera" size={20} />
                            写真から食事を記録
                            <span className="text-xs bg-white bg-opacity-20 px-2 py-0.5 rounded-full">AI</span>
                        </button>

                        {/* ②折りたたみカテゴリ一覧（よく使う食材含む） */}
                        {!selectedItem ? (
                            <div className="space-y-3">
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

                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {Object.keys(filteredFoods).map(topCategory => {
                                        const subcategories = filteredFoods[topCategory];
                                        if (Object.keys(subcategories).length === 0) return null;

                                        return (
                                            <div key={topCategory} className="border-2 border-indigo-300 rounded-lg overflow-hidden">
                                                {/* 最上位カテゴリ */}
                                                <button
                                                    onClick={() => setExpandedCategories(prev => ({...prev, [topCategory]: !prev[topCategory]}))}
                                                    className="w-full px-4 py-3 bg-indigo-100 hover:bg-indigo-200 flex justify-between items-center font-bold"
                                                >
                                                    <span className="text-indigo-900">{topCategory}</span>
                                                    <Icon name={expandedCategories[topCategory] ? 'ChevronDown' : 'ChevronRight'} size={20} className="text-indigo-900" />
                                                </button>

                                                {/* サブカテゴリ */}
                                                {expandedCategories[topCategory] && (
                                                    <div className="bg-white">
                                                        {Object.keys(subcategories).map(subCategory => (
                                                            <div key={subCategory} className="border-t border-gray-200">
                                                                <button
                                                                    onClick={() => setExpandedCategories(prev => ({...prev, [`${topCategory}-${subCategory}`]: !prev[`${topCategory}-${subCategory}`]}))}
                                                                    className="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100 flex justify-between items-center"
                                                                >
                                                                    <span className="font-medium text-sm">{subCategory}</span>
                                                                    <Icon name={expandedCategories[`${topCategory}-${subCategory}`] ? 'ChevronDown' : 'ChevronRight'} size={18} />
                                                                </button>

                                                                {/* アイテム一覧 */}
                                                                {expandedCategories[`${topCategory}-${subCategory}`] && (
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
                                                                            } else if (topCategory === 'サプリメント') {
                                                                                // サプリメントの場合
                                                                                food = foodDB['サプリメント'][foodName];
                                                                                actualCategory = 'サプリメント';
                                                                            } else {
                                                                                // 通常の食材
                                                                                food = foodDB[subCategory][foodName];
                                                                                actualCategory = subCategory;
                                                                            }

                                                                            if (!food) return null;

                                                                            return (
                                                                                <button
                                                                                    key={foodName}
                                                                                    onClick={() => {
                                                                                        const nutrients = isCustom
                                                                                            ? (food.vitamins && food.minerals ? { vitamins: food.vitamins, minerals: food.minerals } : { vitamins: {}, minerals: {} })
                                                                                            : mapNutrients(food);
                                                                                        setSelectedItem({
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
                                                                                        });
                                                                                    }}
                                                                                    className="w-full text-left px-3 py-2 hover:bg-indigo-50 rounded-lg transition"
                                                                                >
                                                                                    <div className="flex justify-between">
                                                                                        <span className="text-sm">{foodName}</span>
                                                                                        <span className="text-xs text-gray-500">
                                                                                            {food.calories}kcal/{food.unit || `${food.servingSize || 100}${food.servingUnit || 'g'}`}
                                                                                        </span>
                                                                                    </div>
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* カスタムアイテム作成 */}
                                <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                                    <div className="w-full flex items-center justify-between mb-3">
                                        <button
                                            onClick={() => setShowCustomSupplementForm(!showCustomSupplementForm)}
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
                                                )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
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
                                    <p className="text-xs text-gray-500 mt-2">※100gあたり</p>
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
                                            <p className="font-bold text-indigo-600">
                                                {Math.round(selectedItem.calories * (Number(amount) / 100))}kcal
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600">P</p>
                                            <p className="font-bold">{(selectedItem.protein * (Number(amount) / 100)).toFixed(1)}g</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600">F</p>
                                            <p className="font-bold">{(selectedItem.fat * (Number(amount) / 100)).toFixed(1)}g</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600">C</p>
                                            <p className="font-bold">{(selectedItem.carbs * (Number(amount) / 100)).toFixed(1)}g</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            const numAmount = Number(amount);
                                            const ratio = numAmount / 100;

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

                                            // Add to the list of items
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
                                            setAddedItems([...addedItems, newItem]);
                                            setSelectedItem(null);
                                            setAmount('100');
                                        }}
                                        className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition"
                                    >
                                        追加
                                    </button>
                                    <button
                                        onClick={() => setSelectedItem(null)}
                                        className="px-4 bg-gray-200 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-300 transition"
                                    >
                                        キャンセル
                                    </button>
                                </div>
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
                                            <button
                                                onClick={() => setAddedItems(addedItems.filter((_, i) => i !== index))}
                                                className="text-red-500 hover:text-red-700 ml-2"
                                            >
                                                <Icon name="Trash2" size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 pt-3 border-t border-indigo-200">
                                    <div className="grid grid-cols-4 gap-2 text-xs">
                                        <div>
                                            <p className="text-gray-600">カロリー</p>
                                            <p className="font-bold text-indigo-600">
                                                {Math.round(addedItems.reduce((sum, item) => sum + item.calories, 0))}kcal
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">P</p>
                                            <p className="font-bold">
                                                {addedItems.reduce((sum, item) => sum + item.protein, 0).toFixed(1)}g
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">F</p>
                                            <p className="font-bold">
                                                {addedItems.reduce((sum, item) => sum + item.fat, 0).toFixed(1)}g
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">C</p>
                                            <p className="font-bold">
                                                {addedItems.reduce((sum, item) => sum + item.carbs, 0).toFixed(1)}g
                                            </p>
                                        </div>
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
