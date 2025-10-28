// ===== AI Food Recognition Component =====
// AI搭載の食事認識機能（写真から食品を自動認識）

const AIFoodRecognition = ({ onFoodsRecognized, onClose, onOpenCustomCreator, userId, userProfile }) => {
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [recognizing, setRecognizing] = useState(false);
    const [recognizedFoods, setRecognizedFoods] = useState([]);
    const [error, setError] = useState(null);
    const [showManualAdd, setShowManualAdd] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    // 画像選択ハンドラー
    const handleImageSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedImage(file);
            setError(null);

            // プレビュー表示
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // 画像をBase64に変換
    const imageToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                // data:image/jpeg;base64, の部分を除去
                const base64String = reader.result.split(',')[1];
                resolve(base64String);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // AI認識実行
    const recognizeFood = async () => {
        if (!selectedImage) {
            setError('画像を選択してください');
            return;
        }

        setRecognizing(true);
        setError(null);

        try {
            // ユーザーID取得（DEV_MODEの場合はDEV_USER_IDを使用）
            const effectiveUserId = userId || DEV_USER_ID;
            console.log('[AIFoodRecognition] userId:', userId, 'effectiveUserId:', effectiveUserId, 'DEV_MODE:', DEV_MODE);

            if (!effectiveUserId) {
                setError('ユーザー情報が取得できませんでした');
                setRecognizing(false);
                return;
            }

            // クレジットチェック
            const expInfo = await ExperienceService.getUserExperience(effectiveUserId);
            if (expInfo.totalCredits <= 0) {
                setError('クレジットが不足しています。レベルアップでクレジットを獲得してください。');
                setRecognizing(false);
                return;
            }

            // 画像をBase64に変換
            const base64Image = await imageToBase64(selectedImage);

            // Gemini Vision APIを呼び出し
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;

            const requestBody = {
                contents: [{
                    parts: [
                        {
                            text: `この食事画像を分析して、含まれている【食材単品】を個別に検出し、推定量をJSON形式で出力してください。

【重要】料理名ではなく、食材単品で検出すること:
- ❌ 悪い例: "親子丼", "カレーライス", "サラダ"
- ✅ 良い例: "鶏むね肉", "白米", "卵", "玉ねぎ", "レタス"

出力形式:
{
  "foods": [
    {
      "name": "食材名（日本語、単品）",
      "amount": 推定グラム数（数値のみ）,
      "confidence": 信頼度（0-1の小数）
    }
  ]
}

検出ルール:
1. 料理名ではなく、食材単品で検出（例: "鶏むね肉", "白米", "卵", "ブロッコリー"）
2. 複合的な料理は、構成食材に分解して個別に検出
3. 調理済みの食材も生の食材名で記載（例: "焼き鮏" → "鮏"）
4. 推定量は実際に見える量から判断
5. 信頼度は0.0から1.0の範囲で設定
6. 認識できない場合は空の配列を返す
7. JSON形式のみを出力し、他のテキストは含めない

例:
- 親子丼 → "鶏むね肉150g", "卵2個(100g)", "白米200g", "玉ねぎ50g"
- サラダ → "レタス50g", "トマト30g", "きゅうり20g", "ドレッシング15g"`
                        },
                        {
                            inline_data: {
                                mime_type: selectedImage.type || 'image/jpeg',
                                data: base64Image
                            }
                        }
                    ]
                }],
                generationConfig: {
                    temperature: 0.4,
                    topK: 32,
                    topP: 1,
                    maxOutputTokens: 2048,
                },
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
                ]
            };

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();

            if (!data.candidates || data.candidates.length === 0) {
                throw new Error('AIからの応答がありませんでした');
            }

            const textResponse = data.candidates[0].content.parts[0].text;

            // JSONを抽出（マークダウンのコードブロックを除去）
            let jsonText = textResponse.trim();
            jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

            const result = JSON.parse(jsonText);

            if (!result.foods || result.foods.length === 0) {
                setError('食品を認識できませんでした。別の画像をお試しください。');
                setRecognizing(false);
                return;
            }

            // 認識された食品をfoodDatabaseと照合
            const matchedFoods = result.foods.map(food => {
                // foodDatabaseから検索
                let matchedItem = null;
                Object.keys(foodDB).forEach(category => {
                    Object.keys(foodDB[category]).forEach(itemName => {
                        if (itemName.includes(food.name) || food.name.includes(itemName)) {
                            matchedItem = {
                                ...foodDB[category][itemName],
                                name: itemName,
                                category: category,
                                amount: food.amount || 100,
                                confidence: food.confidence || 0.5
                            };
                        }
                    });
                });

                return matchedItem || {
                    name: food.name,
                    amount: food.amount || 100,
                    confidence: food.confidence || 0.5,
                    calories: 0,
                    protein: 0,
                    fat: 0,
                    carbs: 0,
                    isUnknown: true
                };
            });

            // 認識成功後、クレジット消費
            await ExperienceService.consumeCredits(effectiveUserId, 1);
            console.log('[AI Food Recognition] 1 credit consumed');

            // クレジット消費直後にイベントを発火してダッシュボードを更新
            window.dispatchEvent(new CustomEvent('creditUpdated'));
            console.log('[AI Food Recognition] creditUpdated event dispatched');

            setRecognizedFoods(matchedFoods);

        } catch (err) {
            console.error('Food recognition error:', err);
            setError('食品認識中にエラーが発生しました: ' + err.message);
        } finally {
            setRecognizing(false);
        }
    };

    // 食品の量を調整
    const adjustAmount = (index, newAmount) => {
        setRecognizedFoods(prev => prev.map((food, i) =>
            i === index ? { ...food, amount: newAmount } : food
        ));
    };

    // 食品を削除
    const removeFood = (index) => {
        setRecognizedFoods(prev => prev.filter((_, i) => i !== index));
    };

    // 食品データを更新（カスタム登録完了時に使用）
    const updateRecognizedFood = (foodName, updatedData) => {
        setRecognizedFoods(prev => prev.map(food =>
            food.name === foodName
                ? { ...food, ...updatedData, isUnknown: false }
                : food
        ));
    };

    // 確定して親コンポーネントに渡す
    const confirmFoods = () => {
        console.log('[confirmFoods] 確定して追加ボタンがクリックされました');
        console.log('[confirmFoods] recognizedFoods:', recognizedFoods);
        console.log('[confirmFoods] onFoodsRecognizedを呼び出します');

        onFoodsRecognized(recognizedFoods);

        console.log('[confirmFoods] 完了');
        // Note: creditUpdatedイベントはクレジット消費直後(198行目)に既に発火済み
    };

    // 食材検索
    const searchIngredients = (query) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        const results = [];
        Object.keys(foodDB).forEach(category => {
            Object.keys(foodDB[category]).forEach(itemName => {
                if (itemName.includes(query)) {
                    results.push({
                        name: itemName,
                        category: category,
                        ...foodDB[category][itemName]
                    });
                }
            });
        });
        setSearchResults(results.slice(0, 10));
    };

    // 手動で食材を追加
    const addManualIngredient = (food) => {
        const newFood = {
            ...food,
            amount: 100,
            confidence: 1.0,
            isManuallyAdded: true
        };
        setRecognizedFoods(prev => [...prev, newFood]);
        setSearchQuery('');
        setSearchResults([]);
        setShowManualAdd(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* ヘッダー */}
                <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 rounded-t-2xl flex justify-between items-center z-10">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Icon name="Camera" size={20} />
                        AI食事認識
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition"
                    >
                        <Icon name="X" size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* 画像選択 */}
                    {!imagePreview && (
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-indigo-400 transition">
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleImageSelect}
                                className="hidden"
                                id="food-image-input"
                            />
                            <label htmlFor="food-image-input" className="cursor-pointer">
                                <Icon name="Camera" size={64} className="mx-auto mb-4 text-gray-300" />
                                <p className="text-lg font-medium text-gray-700 mb-2">
                                    食事の写真を撮影または選択
                                </p>
                                <p className="text-sm text-gray-500">
                                    タップして画像を選択してください
                                </p>
                            </label>
                        </div>
                    )}

                    {/* 画像プレビュー */}
                    {imagePreview && !recognizedFoods.length && (
                        <div className="space-y-4">
                            <div className="relative">
                                <img
                                    src={imagePreview}
                                    alt="Selected food"
                                    className="w-full h-64 object-cover rounded-xl"
                                />
                                <button
                                    onClick={() => {
                                        setImagePreview(null);
                                        setSelectedImage(null);
                                        setError(null);
                                    }}
                                    className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition"
                                >
                                    <Icon name="X" size={18} />
                                </button>
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <p className="text-red-700 text-sm">{error}</p>
                                </div>
                            )}

                            <button
                                onClick={recognizeFood}
                                disabled={recognizing}
                                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-4 rounded-xl hover:from-purple-700 hover:to-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {recognizing ? (
                                    <>
                                        <Icon name="Loader" size={20} className="animate-spin" />
                                        AI分析中...
                                    </>
                                ) : (
                                    <>
                                        <Icon name="Sparkles" size={20} />
                                        AIで食品を認識
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* 認識結果 */}
                    {recognizedFoods.length > 0 && (
                        <div className="space-y-4">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <p className="text-green-800 font-medium flex items-center gap-2">
                                    <Icon name="CheckCircle" size={18} />
                                    {recognizedFoods.length}個の食品を認識しました
                                </p>
                            </div>

                            <div className="space-y-3">
                                {recognizedFoods.map((food, index) => (
                                    <FoodItemTag
                                        key={index}
                                        food={food}
                                        onAmountChange={(newAmount) => adjustAmount(index, newAmount)}
                                        onRemove={() => removeFood(index)}
                                        onOpenCustomCreator={(foodData) => {
                                            if (onOpenCustomCreator) {
                                                onOpenCustomCreator(foodData, (updatedData) => {
                                                    // カスタム登録完了時のコールバック
                                                    updateRecognizedFood(food.name, updatedData);
                                                });
                                            }
                                        }}
                                    />
                                ))}
                            </div>

                            {/* 手動で食材追加ボタン */}
                            <button
                                onClick={() => setShowManualAdd(!showManualAdd)}
                                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold py-3 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition flex items-center justify-center gap-2"
                            >
                                <Icon name="Plus" size={20} />
                                {showManualAdd ? '検索を閉じる' : '食材を手動で追加'}
                            </button>

                            {/* 手動追加の検索UI */}
                            {showManualAdd && (
                                <div className="space-y-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            食材を検索して追加
                                        </label>
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => searchIngredients(e.target.value)}
                                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                                            placeholder="食材名を入力（例: 鶏むね肉、白米、卵）"
                                            autoFocus
                                        />
                                    </div>

                                    {searchResults.length > 0 && (
                                        <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg bg-white">
                                            {searchResults.map((food, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => addManualIngredient(food)}
                                                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition"
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
                                    )}

                                    {searchQuery && searchResults.length === 0 && (
                                        <div className="text-center py-4 text-gray-500 text-sm">
                                            <p>「{searchQuery}」に一致する食材が見つかりませんでした</p>
                                            <p className="text-xs mt-1">別のキーワードで検索してください</p>
                                        </div>
                                    )}

                                    <div className="bg-blue-100 border border-blue-300 rounded-lg p-3">
                                        <p className="text-xs text-blue-800">
                                            <Icon name="Info" size={14} className="inline mr-1" />
                                            AIが認識できなかった食材を手動で追加できます
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setRecognizedFoods([]);
                                        setImagePreview(null);
                                        setSelectedImage(null);
                                    }}
                                    className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-300 transition"
                                >
                                    やり直す
                                </button>
                                <button
                                    onClick={confirmFoods}
                                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 transition"
                                >
                                    確定して追加
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 使い方説明 */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                            <Icon name="Info" size={16} />
                            使い方のコツ
                        </h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                            <li>• 食品が明確に写るように撮影してください</li>
                            <li>• AIは食材単品で検出します（料理名ではありません）</li>
                            <li>• 認識後、量を調整できます</li>
                            <li>• AIが認識できなかった食材は手動で追加できます</li>
                            <li>• 不要な食品は×ボタンで削除できます</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 食品タグコンポーネント（通常の食事記録と同じ入力方式）
const FoodItemTag = ({ food, onAmountChange, onRemove, onOpenCustomCreator }) => {
    const [amount, setAmount] = useState(food.amount);

    // 栄養素を計算（100gあたりの値を基準）
    const nutrients = {
        calories: Math.round((food.calories || 0) * amount / 100),
        protein: ((food.protein || 0) * amount / 100).toFixed(1),
        fat: ((food.fat || 0) * amount / 100).toFixed(1),
        carbs: ((food.carbs || 0) * amount / 100).toFixed(1)
    };

    // 量を変更してリアルタイム反映
    const handleAmountChange = (newAmount) => {
        setAmount(newAmount);
        onAmountChange(newAmount);
    };

    // クイック調整ボタン
    const adjustAmount = (delta) => {
        const newAmount = Math.max(0, amount + delta);
        handleAmountChange(newAmount);
    };

    return (
        <div className={`bg-white border-2 rounded-xl p-4 transition ${
            food.isUnknown ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
        }`}>
            {/* ヘッダー部分 */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-base">{food.name}</h4>
                        <button
                            onClick={onRemove}
                            className="text-red-500 hover:text-red-700"
                        >
                            <Icon name="X" size={16} />
                        </button>
                    </div>
                    {food.category && (
                        <p className="text-xs text-gray-500">{food.category}</p>
                    )}
                </div>
            </div>

            {/* 栄養素表示（100gあたり） */}
            {!food.isUnknown && (
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <div className="grid grid-cols-4 gap-3 text-center">
                        <div>
                            <p className="text-xs text-gray-600">カロリー</p>
                            <p className="text-sm font-bold">{food.calories || 0}kcal</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-600">P</p>
                            <p className="text-sm font-bold">{(food.protein || 0).toFixed(1)}g</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-600">F</p>
                            <p className="text-sm font-bold">{(food.fat || 0).toFixed(1)}g</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-600">C</p>
                            <p className="text-sm font-bold">{(food.carbs || 0).toFixed(1)}g</p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 text-center mt-1">※100gあたり</p>
                </div>
            )}

            {/* 重量調整セクション */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        重量 (g)
                        <Icon name="HelpCircle" size={14} className="text-gray-400" />
                    </label>
                    <span className="text-xs text-gray-500">
                        0g - 100g - 200g - 300g - 400g - 500g
                    </span>
                </div>

                {/* スライダー */}
                <input
                    type="range"
                    min="0"
                    max="500"
                    step="5"
                    value={amount}
                    onChange={(e) => handleAmountChange(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />

                {/* 数値入力 */}
                <div className="flex items-center justify-center">
                    <input
                        type="number"
                        min="0"
                        max="9999"
                        value={amount}
                        onChange={(e) => handleAmountChange(Number(e.target.value))}
                        className="w-full px-4 py-3 text-2xl font-bold text-center border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                </div>

                {/* クイック調整ボタン */}
                <div className="grid grid-cols-5 gap-2">
                    <button
                        onClick={() => adjustAmount(-100)}
                        className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition"
                    >
                        -100
                    </button>
                    <button
                        onClick={() => adjustAmount(-50)}
                        className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition"
                    >
                        -50
                    </button>
                    <button
                        onClick={() => adjustAmount(-10)}
                        className="px-3 py-2 bg-orange-50 text-orange-600 rounded-lg text-sm font-medium hover:bg-orange-100 transition"
                    >
                        -10
                    </button>
                    <button
                        onClick={() => adjustAmount(10)}
                        className="px-3 py-2 bg-green-50 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100 transition"
                    >
                        +10
                    </button>
                    <button
                        onClick={() => adjustAmount(50)}
                        className="px-3 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-medium hover:bg-emerald-100 transition"
                    >
                        +50
                    </button>
                    <button
                        onClick={() => adjustAmount(100)}
                        className="px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-200 transition col-span-5"
                    >
                        +100
                    </button>
                </div>
            </div>

            {/* 摂取量表示 */}
            {!food.isUnknown && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-600 mb-2 font-medium">摂取量</p>
                    <div className="grid grid-cols-4 gap-3 text-center">
                        <div className="bg-indigo-50 rounded-lg p-2">
                            <p className="text-xs text-gray-600">カロリー</p>
                            <p className="text-base font-bold text-indigo-700">{nutrients.calories}kcal</p>
                        </div>
                        <div className="bg-cyan-50 rounded-lg p-2">
                            <p className="text-xs text-gray-600">P</p>
                            <p className="text-base font-bold text-cyan-700">{nutrients.protein}g</p>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-2">
                            <p className="text-xs text-gray-600">F</p>
                            <p className="text-base font-bold text-yellow-700">{nutrients.fat}g</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-2">
                            <p className="text-xs text-gray-600">C</p>
                            <p className="text-base font-bold text-green-700">{nutrients.carbs}g</p>
                        </div>
                    </div>
                </div>
            )}

            {/* 信頼度表示 / 手動追加バッジ */}
            {food.isManuallyAdded ? (
                <div className="mt-3 flex items-center justify-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                        <Icon name="UserPlus" size={12} className="inline mr-1" />
                        手動追加
                    </span>
                </div>
            ) : food.confidence && (
                <div className="mt-3 flex items-center justify-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                        food.confidence > 0.7 ? 'bg-green-100 text-green-700' :
                        food.confidence > 0.4 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                    }`}>
                        AI認識 信頼度: {Math.round(food.confidence * 100)}%
                    </span>
                </div>
            )}

            {/* 未登録食品の警告とカスタム食材作成 */}
            {food.isUnknown && (
                <div className="mt-3 space-y-2">
                    <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3">
                        <p className="text-xs text-yellow-800 font-medium mb-2">
                            ⚠️ データベースに未登録の食品です
                        </p>
                        <p className="text-xs text-yellow-700">
                            この食品をカスタム食材として登録すると、次回から簡単に使用できます。
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            if (onOpenCustomCreator) {
                                onOpenCustomCreator({
                                    name: food.name,
                                    calories: food.calories || 0,
                                    protein: food.protein || 0,
                                    fat: food.fat || 0,
                                    carbs: food.carbs || 0
                                });
                            }
                        }}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3 rounded-lg hover:from-amber-600 hover:to-orange-600 transition flex items-center justify-center gap-2"
                    >
                        <Icon name="Plus" size={18} />
                        カスタム食材として登録
                    </button>
                </div>
            )}
        </div>
    );
};
