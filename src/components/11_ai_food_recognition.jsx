import React from 'react';
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
    const [showInfoModal, setShowInfoModal] = useState(false);

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

            if (!effectiveUserId) {
                setError('ユーザー情報が取得できませんでした');
                setRecognizing(false);
                return;
            }

            // クレジットチェックはCloud Function側で実施
            // 画像をBase64に変換
            const base64Image = await imageToBase64(selectedImage);

            // Cloud Function経由でVertex AI Vision APIを呼び出し
            const functions = firebase.app().functions('asia-northeast2');
            const callGemini = functions.httpsCallable('callGemini');

            const promptText = `【最優先命令】
あなたはヘルスケアアプリ用の食材解析AIです。あなたの最優先タスクは、視覚的な特徴（色、形、光沢）だけに惑わされず、以下の【思考ステップと文脈判断】ルールを絶対に優先して適用することです。特に卵料理の誤認識（オムライスを「卵白」や「うずら」と判断すること）は重大なエラーです。

【タスク】
この食事画像を分析し、【食材単品】を個別に検出し、推定量をJSON形式で出力してください。

【重要】料理名ではなく、食材単品で検出すること:
- ❌ 悪い例: "親子丼", "カレーライス"
- ✅ 良い例: "鶏むね肉", "白米", "鶏卵（全卵）"

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

【検出ルール】:
1. 料理名ではなく、食材単品で検出（例: "鶏むね肉", "白米", "鶏卵（全卵）"）
2. 複合的な料理は、構成食材に分解して個別に検出
3. 調理済みの食材も生の食材名で記載（例: "焼き鮭" → "鮭"）
4. 推定量は実際に見える量から判断
5. 信頼度は0.0から1.0の範囲で設定
6. 認識できない場合は空の配列を返す
7. JSON形式のみを出力し、他のテキストは含めない

【思考ステップと文脈判断（最重要・厳格適用）】:
検出ルールを適用する前に、以下の思考ステップに厳格に従ってください。

ステップ1: 料理の特定（文脈の把握）
まず、画像に写っている主要な料理が何かを心の中で特定してください。
（例：「これはオムライスとハンバーグのプレートだ」「これは親子丼だ」）

ステップ2: 文脈に基づいた食材の判断（視覚より優先）
ステップ1で特定した料理の文脈に基づき、以下のルールを厳格に適用して食材を検出してください。

卵の種類とサイズ（最重要ルール）:
   - 文脈の絶対適用: 画像内に「オムライス」「オムレツ」「卵焼き」「目玉焼き」「親子丼」「スクランブルエッグ」など、通常全卵で作られる料理を認識した場合、その主材料は**必ず『鶏卵（全卵）』**としてください。
   - 誤認識の厳禁 (1) - 卵白: オムライスの表面が滑らかであること、光が反射して白く見えること、またはスクランブルエッグの一部が白く見えることを理由に、これらを『卵白のみ』と絶対に誤認識しないでください。
   - 誤認識の厳禁 (2) - うずら: 付け合わせのサラダ（ポテトサラダ等）や、料理の形状を理由に、『うずらの卵』と絶対に誤認識しないでください。
   - 「卵白のみ」の定義（極めて特殊）: 『卵白のみ』は、「メレンゲ」「フィナンシェ」「ラング・ド・シャ」「卵白スープ」など、明らかに卵黄を含まないと断言できる特殊な料理・菓子でのみ使用してください。オムライスはこれに該当しません。
   - 「鶏卵（全卵）」の定義: 上記（卵白のみ）以外のすべての卵料理は『鶏卵（全卵）』です。

米の種類（最重要ルール）:
   - 文脈の絶対適用: 画像内に「ご飯」「おにぎり」「丼物」「カレーライス」「チャーハン」「寿司」など、米を使った料理を認識した場合、その主材料は**必ず『白米（炊飯後）』または『玄米（炊飯後）』**としてください。
   - 誤認識の厳禁: 「白米（精白米）」「玄米」（炊飯前の生米）と絶対に認識しないでください。これらは342-346kcal/100gで、炊飯後の2倍以上のカロリーがあり、重大な誤認識となります。
   - 炊飯後の定義: ご飯として調理済みの状態は『白米（炊飯後）』『玄米（炊飯後）』『発芽玄米（炊飯後）』『胚芽米（炊飯後）』です。
   - 白米と玄米の区別: 色が白ければ『白米（炊飯後）』、茶色っぽければ『玄米（炊飯後）』としてください。区別がつかない場合は『白米（炊飯後）』としてください。

ソースと食材の区別:
   - デミグラスソース、カレーソース → 「ソース」として検出、チョコレートではない
   - 茶色い液体/ペースト状の調味料は、料理の文脈から判断（洋食ならデミグラス、カレーなど）
   - チョコレート: デザートやスイーツの文脈でのみ検出

調味料・ソース類の検出:
   - ケチャップ、マヨネーズ、ソース類は調味料として検出
   - 推定量は控えめに（10-30g程度）

優先順位（量が多い順、カロリーが高い順に検出）:
   - 主食（白米、パン、麺類）→ 主菜（肉、魚）→ 副菜（野菜）→ 調味料・ソース

例:
- 親子丼 → "鶏むね肉 150g", "鶏卵（全卵） 100g", "白米（炊飯後） 200g", "玉ねぎ 50g"
- オムライスプレート → "鶏卵（全卵） 100g", "白米（炊飯後） 150g", "鶏ひき肉 50g", "ケチャップ 20g", "キャベツ 30g"
- カレーライス → "豚もも肉 120g", "白米（炊飯後） 200g", "じゃがいも 80g", "玉ねぎ 60g", "人参 40g", "カレーソース 80g"
- オムレツプレート → "鶏卵（全卵） 150g", "ハム 50g", "チーズ 30g"（※「卵白のみ」ではなく「鶏卵（全卵）」）
- サラダ → "レタス 50g", "トマト 30g", "きゅうり 20g", "ドレッシング 15g"
- ハンバーグプレート → "牛ひき肉 150g", "白米（炊飯後） 200g", "キャベツ 30g", "デミグラスソース 30g"`;

            const result = await callGemini({
                model: 'gemini-2.5-pro',
                contents: [{
                    role: 'user',
                    parts: [
                        { text: promptText },
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
                    maxOutputTokens: 8192,
                },
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
                ]
            });

            // Cloud Functionのレスポンスを処理
            if (!result.data || !result.data.success) {
                throw new Error(result.data?.error || 'AIの呼び出しに失敗しました');
            }

            const geminiResponse = result.data.response;

            if (!geminiResponse.candidates || geminiResponse.candidates.length === 0) {
                console.error('[AI Recognition] No candidates in response:', geminiResponse);
                throw new Error('AIからの応答がありませんでした');
            }

            const textResponse = geminiResponse.candidates[0].content.parts[0].text;

            // JSONを抽出（マークダウンのコードブロックを除去）
            let jsonText = textResponse.trim();
            jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

            let parsedResult;
            try {
                parsedResult = JSON.parse(jsonText);
            } catch (parseError) {
                console.error('[AI Recognition] JSON parse failed:', parseError);
                console.error('[AI Recognition] Failed JSON text:', jsonText);
                throw new Error('AI応答の解析に失敗しました。応答形式が不正です。');
            }

            if (!parsedResult.foods || parsedResult.foods.length === 0) {
                setError('食品を認識できませんでした。別の画像をお試しください。');
                setRecognizing(false);
                return;
            }

            // 認識された食品をfoodDatabaseと照合
            const matchedFoods = parsedResult.foods.map(food => {
                // 1. まずfoodDatabaseから検索
                let matchedItem = null;
                Object.keys(foodDB).forEach(category => {
                    Object.keys(foodDB[category]).forEach(itemName => {
                        if (itemName.includes(food.name) || food.name.includes(itemName)) {
                            const dbItem = foodDB[category][itemName];
                            matchedItem = {
                                ...dbItem,
                                name: itemName,
                                category: category,
                                amount: food.amount || 100,
                                confidence: food.confidence || 0.5,
                                _base: {  // 基準値を保持（特殊単位対応）
                                    calories: dbItem.calories,
                                    protein: dbItem.protein,
                                    fat: dbItem.fat,
                                    carbs: dbItem.carbs,
                                    servingSize: dbItem.servingSize || 100,
                                    servingUnit: dbItem.servingUnit || 'g',
                                    unit: dbItem.unit || '100g'
                                }
                            };
                        }
                    });
                });

                // 2. 見つからない場合、localStorageのcustomFoodsから検索
                if (!matchedItem) {
                    try {
                        const customFoods = JSON.parse(localStorage.getItem('customFoods') || '[]');
                        const customItem = customFoods.find(item =>
                            item.name.includes(food.name) || food.name.includes(item.name)
                        );

                        if (customItem) {
                            matchedItem = {
                                name: customItem.name,
                                category: customItem.category || 'カスタム',
                                calories: customItem.calories || 0,
                                protein: customItem.protein || 0,
                                fat: customItem.fat || 0,
                                carbs: customItem.carbs || 0,
                                amount: food.amount || customItem.servingSize || 100,
                                confidence: food.confidence || 0.5,
                                isCustom: true,  // カスタムアイテムフラグ
                                _base: {  // 基準値を保持（特殊単位対応）
                                    calories: customItem.calories || 0,
                                    protein: customItem.protein || 0,
                                    fat: customItem.fat || 0,
                                    carbs: customItem.carbs || 0,
                                    servingSize: customItem.servingSize || 100,
                                    servingUnit: customItem.servingUnit || 'g',
                                    unit: customItem.unit || '100g'
                                }
                            };
                        }
                    } catch (error) {
                        console.error('カスタムアイテム検索エラー:', error);
                    }
                }

                // 3. どちらからも見つからない場合はisUnknown: true
                return matchedItem || {
                    name: food.name,
                    amount: food.amount || 100,
                    confidence: food.confidence || 0.5,
                    calories: 0,
                    protein: 0,
                    fat: 0,
                    carbs: 0,
                    isUnknown: true,
                    _base: {
                        calories: 0,
                        protein: 0,
                        fat: 0,
                        carbs: 0,
                        servingSize: 100,
                        servingUnit: 'g',
                        unit: '100g'
                    }
                };
            });

            // クレジット消費はCloud Function側で実施済み
            // remainingCreditsを取得してイベントを発火
            const remainingCredits = result.data.remainingCredits;

            // クレジット消費後にイベントを発火してダッシュボードを更新
            window.dispatchEvent(new CustomEvent('creditUpdated'));

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
        setRecognizedFoods(prev => prev.map((food, i) => {
            if (i !== index) return food;

            // _baseから基準値を取得
            const base = food._base || {
                calories: food.calories,
                protein: food.protein,
                fat: food.fat,
                carbs: food.carbs,
                servingSize: 100,
                servingUnit: 'g',
                unit: '100g'
            };

            // ratioの計算: 単位に応じて処理
            let ratio;
            let displayAmount = newAmount;

            if (base.unit === '1個' || base.unit === '個') {
                // 個単位の場合: 入力値 ÷ servingSize（1個あたりのg数）= 個数
                // 例: 180g ÷ 12g = 15個
                // ratio = 個数
                const numServings = newAmount / (base.servingSize || 100);
                ratio = numServings;
                displayAmount = parseFloat(numServings.toFixed(1));
            } else if (base.unit === '本') {
                // 本単位の場合: 入力値 = 本数
                ratio = newAmount;
                displayAmount = newAmount;
            } else {
                // 通常の100gあたり食材
                ratio = newAmount / 100;
            }

            return {
                ...food,
                amount: displayAmount,
                calories: Math.round(base.calories * ratio),
                protein: parseFloat((base.protein * ratio).toFixed(1)),
                fat: parseFloat((base.fat * ratio).toFixed(1)),
                carbs: parseFloat((base.carbs * ratio).toFixed(1)),
                _base: base  // 基準値を保持
            };
        }));
    };

    // 食品を削除
    const removeFood = (index) => {
        setRecognizedFoods(prev => prev.filter((_, i) => i !== index));
    };

    // 食品を候補で置き換え（「もしかして」機能）
    const replaceFoodWithSuggestion = (index, suggestion) => {
        if (!suggestion) return;

        const dbItem = foodDatabase[suggestion.category][suggestion.name];
        if (!dbItem) return;

        const currentFood = recognizedFoods[index];
        const currentAmount = currentFood.amount || 100;

        // 新しい食材データを作成
        const newFood = {
            ...dbItem,
            name: suggestion.name,
            category: suggestion.category,
            amount: currentAmount,
            confidence: 1.0, // 候補から選択したので信頼度を高く設定
            _base: {
                calories: dbItem.calories,
                protein: dbItem.protein,
                fat: dbItem.fat,
                carbs: dbItem.carbs,
                servingSize: dbItem.servingSize || 100,
                servingUnit: dbItem.servingUnit || 'g',
                unit: dbItem.unit || '100g'
            }
        };

        setRecognizedFoods(prev => prev.map((food, i) => {
            if (i === index) return newFood;
            return food;
        }));
    };

    // 食品データを更新（カスタム登録完了時に使用）
    const updateRecognizedFood = (foodName, updatedData) => {
        setRecognizedFoods(prev => prev.map(food => {
            if (food.name !== foodName) return food;

            // updatedDataは100gあたりの栄養素なので、_baseとして保存
            const newBase = {
                calories: updatedData.calories || 0,
                protein: updatedData.protein || 0,
                fat: updatedData.fat || 0,
                carbs: updatedData.carbs || 0
            };

            // 実量に換算（現在のfood.amountを使用）
            const ratio = (food.amount || 100) / 100;
            const actualNutrients = {
                calories: Math.round(newBase.calories * ratio),
                protein: parseFloat((newBase.protein * ratio).toFixed(1)),
                fat: parseFloat((newBase.fat * ratio).toFixed(1)),
                carbs: parseFloat((newBase.carbs * ratio).toFixed(1))
            };

            return {
                ...food,
                ...actualNutrients,
                _base: newBase,
                isUnknown: false,
                isCustom: true
            };
        }));
    };

    // 確定して親コンポーネントに渡す
    const confirmFoods = () => {
        // 認識リストのamountは常にg単位なので、unitフィールドを削除してから渡す
        // （handleFoodsRecognizedでの誤解釈を防ぐため）
        const foodsForTransfer = recognizedFoods.map(food => {
            const { unit, servingSize, servingUnit, ...rest } = food;
            return {
                ...rest,
                // unitフィールドを削除（amountはg単位）
                // _baseには特殊単位情報が保持されている
            };
        });

        onFoodsRecognized(foodsForTransfer);
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
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowInfoModal(true)}
                            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition"
                            title="使い方"
                        >
                            <Icon name="Info" size={20} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition"
                        >
                            <Icon name="X" size={20} />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* 画像選択 */}
                    {!imagePreview && (
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-indigo-400 transition">
                            <input
                                type="file"
                                accept="image/*"
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
                                        foodIndex={index}
                                        onAmountChange={(newAmount) => adjustAmount(index, newAmount)}
                                        onReplace={(suggestion) => replaceFoodWithSuggestion(index, suggestion)}
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

                            {/* 認識された食材の合計 */}
                            {recognizedFoods.length > 0 && (() => {
                                // 実量ベースで計算（100gあたり → 実量）
                                const totalStats = recognizedFoods.reduce((acc, food) => {
                                    const base = food._base || {
                                        calories: food.calories,
                                        protein: food.protein,
                                        fat: food.fat,
                                        carbs: food.carbs,
                                        servingSize: 100,
                                        unit: '100g'
                                    };

                                    // ratioの計算: 特殊単位（1個、本）とそれ以外で分岐
                                    let ratio;
                                    if (base.unit === '1個' || base.unit === '本') {
                                        ratio = (food.amount || 0) / (base.servingSize || 1);
                                    } else {
                                        ratio = (food.amount || 100) / 100;
                                    }

                                    return {
                                        calories: acc.calories + Math.round(base.calories * ratio),
                                        protein: acc.protein + (base.protein * ratio),
                                        fat: acc.fat + (base.fat * ratio),
                                        carbs: acc.carbs + (base.carbs * ratio)
                                    };
                                }, { calories: 0, protein: 0, fat: 0, carbs: 0 });

                                recognizedFoods.forEach((food, i) => {
                                    const base = food._base || {
                                        calories: food.calories || 0,
                                        protein: food.protein || 0,
                                        fat: food.fat || 0,
                                        carbs: food.carbs || 0,
                                        servingSize: 100,
                                        unit: '100g'
                                    };

                                    // ratioの計算
                                    let ratio;
                                    if (base.unit === '1個' || base.unit === '本') {
                                        ratio = (food.amount || 0) / (base.servingSize || 1);
                                    } else {
                                        ratio = (food.amount || 100) / 100;
                                    }
                                });

                                return (
                                    <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                                        <h3 className="font-bold text-green-800 mb-2 flex items-center gap-2">
                                            <Icon name="Check" size={20} />
                                            認識された食材の合計（{recognizedFoods.length}アイテム）
                                        </h3>
                                        <div className="grid grid-cols-4 gap-3 text-center">
                                            <div>
                                                <div className="text-2xl font-bold text-green-700">{Math.round(totalStats.calories)}</div>
                                                <div className="text-xs text-gray-600 mt-1">kcal</div>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-bold text-green-700">{totalStats.protein.toFixed(1)}</div>
                                                <div className="text-xs text-gray-600 mt-1">P (g)</div>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-bold text-green-700">{totalStats.fat.toFixed(1)}</div>
                                                <div className="text-xs text-gray-600 mt-1">F (g)</div>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-bold text-green-700">{totalStats.carbs.toFixed(1)}</div>
                                                <div className="text-xs text-gray-600 mt-1">C (g)</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

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

            {/* 使い方説明モーダル */}
            {showInfoModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-[10002] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        {/* ヘッダー */}
                        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4 rounded-t-2xl flex justify-between items-center z-10">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Icon name="Info" size={20} />
                                AI食事認識の使い方
                            </h3>
                            <button
                                onClick={() => setShowInfoModal(false)}
                                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition"
                            >
                                <Icon name="X" size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* 全フローの説明 */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                    <Icon name="Zap" size={20} className="text-purple-600" />
                                    解析から記録までの流れ
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3 bg-purple-50 p-3 rounded-lg">
                                        <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
                                        <div>
                                            <p className="font-semibold text-gray-800">写真を撮影または選択</p>
                                            <p className="text-sm text-gray-600 mt-1">食事の写真をカメラで撮影、またはギャラリーから選択します。</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 bg-purple-50 p-3 rounded-lg">
                                        <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
                                        <div>
                                            <p className="font-semibold text-gray-800">AIが自動で食材を認識・解析</p>
                                            <p className="text-sm text-gray-600 mt-1">「AIで食品を認識」ボタンを押すと、AIが写真から食材を自動で検出し、量とカロリー・PFCを推定します。</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 bg-purple-50 p-3 rounded-lg">
                                        <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
                                        <div>
                                            <p className="font-semibold text-gray-800">認識結果を確認・調整</p>
                                            <p className="text-sm text-gray-600 mt-1">認識された食材の名前、量、栄養素を確認します。数量を調整したり、不要な食材を削除できます。</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 bg-purple-50 p-3 rounded-lg">
                                        <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">4</div>
                                        <div>
                                            <p className="font-semibold text-gray-800">必要に応じて食材を追加</p>
                                            <p className="text-sm text-gray-600 mt-1">AIが見逃した食材は「食材を手動で追加」ボタンから追加できます。</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 bg-purple-50 p-3 rounded-lg">
                                        <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">5</div>
                                        <div>
                                            <p className="font-semibold text-gray-800">「確定して追加」で記録完了</p>
                                            <p className="text-sm text-gray-600 mt-1">内容を確認したら「確定して追加」ボタンを押して、食事に追加します。</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 未登録食材の見分け方 */}
                            <div className="space-y-3">
                                <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                    <Icon name="AlertTriangle" size={20} className="text-yellow-600" />
                                    未登録食材の見分け方
                                </h4>
                                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                                    <p className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                                        <Icon name="AlertCircle" size={18} />
                                        黄色背景 + ⚠️警告表示 = データベース未登録
                                    </p>
                                    <p className="text-sm text-yellow-800">
                                        AIが認識した食材がデータベースに登録されていない場合、黄色い背景で表示され、「⚠️ データベースに未登録の食品です」という警告が表示されます。この場合、栄養素情報がないため、カロリーやPFCが0と表示されます。
                                    </p>
                                </div>
                            </div>

                            {/* 未登録食材の対処法 */}
                            <div className="space-y-3">
                                <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                    <Icon name="Tool" size={20} className="text-orange-600" />
                                    未登録食材の対処法
                                </h4>
                                <div className="space-y-2">
                                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                        <p className="font-semibold text-orange-900 mb-1 flex items-center gap-2">
                                            <Icon name="Search" size={16} />
                                            方法1: 「もしかして」候補から選択
                                        </p>
                                        <p className="text-sm text-orange-800">
                                            AIが認識した名前に似た食材を最大3つ提案します。類似度が表示されるので、正しい食材をタップして置き換えできます。
                                        </p>
                                    </div>
                                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                        <p className="font-semibold text-orange-900 mb-1 flex items-center gap-2">
                                            <Icon name="Plus" size={16} />
                                            方法2: カスタム食材として登録
                                        </p>
                                        <p className="text-sm text-orange-800">
                                            「カスタム食材として登録」ボタンを押して、栄養素を手動で入力します。一度登録すると、次回から簡単に使用できます。
                                        </p>
                                    </div>
                                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                        <p className="font-semibold text-orange-900 mb-1 flex items-center gap-2">
                                            <Icon name="Trash2" size={16} />
                                            方法3: 削除する
                                        </p>
                                        <p className="text-sm text-orange-800">
                                            不要な食材や誤認識の場合は、×ボタンで削除できます。
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* カスタム登録の方法 */}
                            <div className="space-y-3">
                                <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                    <Icon name="Edit" size={20} className="text-green-600" />
                                    カスタム食材の登録方法
                                </h4>
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                                    <ol className="text-sm text-green-800 space-y-2 list-decimal list-inside">
                                        <li><strong>「カスタム食材として登録」ボタンをタップ</strong></li>
                                        <li><strong>食材名を確認・編集</strong>（必要に応じて修正）</li>
                                        <li><strong>栄養素を入力</strong>:
                                            <ul className="ml-6 mt-1 space-y-1 list-disc list-inside">
                                                <li>カロリー（kcal）</li>
                                                <li>たんぱく質（g）</li>
                                                <li>脂質（g）</li>
                                                <li>炭水化物（g）</li>
                                            </ul>
                                        </li>
                                        <li><strong>数量を設定</strong>（グラム数や個数）</li>
                                        <li><strong>「登録」ボタンで完了</strong></li>
                                    </ol>
                                </div>
                            </div>

                            {/* 栄養素の入力方法 */}
                            <div className="space-y-3">
                                <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                    <Icon name="BookOpen" size={20} className="text-blue-600" />
                                    栄養素の入力方法
                                </h4>
                                <div className="space-y-3">
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <p className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                            <Icon name="Package" size={16} />
                                            方法1: 食品パッケージの栄養成分表示を確認
                                        </p>
                                        <p className="text-sm text-blue-800 mb-2">
                                            加工食品の場合、パッケージに記載されている「栄養成分表示」から、カロリーとPFC（たんぱく質・脂質・炭水化物）の値をそのまま入力します。
                                        </p>
                                        <div className="bg-white rounded p-2 text-xs text-gray-700 border border-blue-300">
                                            <p className="font-semibold mb-1">例: 栄養成分表示（100gあたり）</p>
                                            <p>エネルギー: 250kcal</p>
                                            <p>たんぱく質: 10.5g</p>
                                            <p>脂質: 15.2g</p>
                                            <p>炭水化物: 20.3g</p>
                                        </div>
                                    </div>
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <p className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                            <Icon name="Database" size={16} />
                                            方法2: 日本食品標準成分表（八訂）で検索
                                        </p>
                                        <p className="text-sm text-blue-800 mb-3">
                                            生鮮食品や自炊の料理の場合、文部科学省が公開している「日本食品標準成分表（八訂）」で食材を検索して、栄養素の値を取得します。
                                        </p>
                                        <a
                                            href="https://fooddb.mext.go.jp/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium text-sm"
                                        >
                                            <Icon name="ExternalLink" size={16} />
                                            日本食品標準成分表（八訂）を開く
                                        </a>
                                        <p className="text-xs text-blue-700 mt-2">
                                            ※ 新しいタブで開きます
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* 閉じるボタン */}
                            <div className="pt-4 border-t">
                                <button
                                    onClick={() => setShowInfoModal(false)}
                                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold py-3 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition"
                                >
                                    閉じる
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
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

// 上位3つの類似度の高い食材を見つける関数
const findTopMatches = (inputName, topN = 3) => {
    const normalizedInput = normalizeFoodName(inputName);
    const candidates = [];

    Object.keys(foodDatabase).forEach(cat => {
        Object.keys(foodDatabase[cat]).forEach(dbName => {
            const normalizedDbName = normalizeFoodName(dbName);
            const distance = levenshteinDistance(normalizedInput, normalizedDbName);

            // 距離が短いほど類似度が高い
            // ただし、長さの半分以下の距離でないと候補にしない（類似度50%以上）
            const maxLength = Math.max(normalizedInput.length, normalizedDbName.length);
            if (distance <= maxLength / 2) {
                const similarity = Math.round((1 - distance / maxLength) * 100);
                candidates.push({
                    name: dbName,
                    category: cat,
                    distance: distance,
                    similarity: similarity
                });
            }
        });
    });

    // 距離が短い順（類似度が高い順）にソートして上位N個を返す
    return candidates
        .sort((a, b) => a.distance - b.distance)
        .slice(0, topN);
};

// 食品タグコンポーネント（通常の食事記録と同じ入力方式）
const FoodItemTag = ({ food, foodIndex, onAmountChange, onRemove, onReplace, onOpenCustomCreator }) => {
    const [amount, setAmount] = useState(food.amount);

    // 未登録食品の場合、候補を検索（上位3つ）
    const [suggestions, setSuggestions] = useState([]);
    useEffect(() => {
        if (food.isUnknown) {
            const matches = findTopMatches(food.name, 3);
            setSuggestions(matches);
        }
    }, [food.name, food.isUnknown]);

    // 栄養素を計算（_baseから100gあたりの値を取得）
    const base = food._base || {
        calories: food.calories || 0,
        protein: food.protein || 0,
        fat: food.fat || 0,
        carbs: food.carbs || 0,
        servingSize: 100,
        unit: '100g'
    };

    // ratioの計算: 特殊単位（1個、本）とそれ以外で分岐
    let ratio;
    if (base.unit === '1個' || base.unit === '本') {
        // 特殊単位の場合: amount(g) ÷ servingSize(g/個) = 個数
        ratio = amount / (base.servingSize || 1);
    } else {
        // 通常単位（100gあたり）の場合: amount(g) ÷ 100
        ratio = amount / 100;
    }

    const nutrients = {
        calories: Math.round(base.calories * ratio),
        protein: (base.protein * ratio).toFixed(1),
        fat: (base.fat * ratio).toFixed(1),
        carbs: (base.carbs * ratio).toFixed(1)
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

            {/* 栄養素表示（基準量あたり） */}
            {!food.isUnknown && (() => {
                // データベースから取得したservingSizeとunitを確認
                let servingSize = 100;
                let servingUnit = 'g';
                let perServingLabel = '※100gあたり';

                // _baseから取得（handleFoodsRecognizedで設定される）
                if (food._base && food._base.servingSize) {
                    servingSize = food._base.servingSize;
                    servingUnit = food._base.servingUnit || 'g';

                    // ラベルの生成
                    if (food._base.unit === '1個' || food._base.unit === '個') {
                        perServingLabel = `※1個（${servingSize}${servingUnit}）あたり`;
                    } else if (food._base.unit === '本') {
                        perServingLabel = `※1本（${servingSize}${servingUnit}）あたり`;
                    } else {
                        perServingLabel = `※${servingSize}${servingUnit}あたり`;
                    }
                }

                // _baseがあればそれを使用、なければ現在の量から計算
                const baseNutrients = food._base ? {
                    calories: food._base.calories || 0,
                    protein: food._base.protein || 0,
                    fat: food._base.fat || 0,
                    carbs: food._base.carbs || 0
                } : {
                    calories: Math.round((food.calories || 0) / (food.amount || 100) * 100),
                    protein: parseFloat(((food.protein || 0) / (food.amount || 100) * 100).toFixed(1)),
                    fat: parseFloat(((food.fat || 0) / (food.amount || 100) * 100).toFixed(1)),
                    carbs: parseFloat(((food.carbs || 0) / (food.amount || 100) * 100).toFixed(1))
                };

                return (
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <div className="grid grid-cols-4 gap-3 text-center">
                            <div>
                                <p className="text-xs text-gray-600">カロリー</p>
                                <p className="text-sm font-bold">{baseNutrients.calories}kcal</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-600">P</p>
                                <p className="text-sm font-bold">{baseNutrients.protein.toFixed(1)}g</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-600">F</p>
                                <p className="text-sm font-bold">{baseNutrients.fat.toFixed(1)}g</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-600">C</p>
                                <p className="text-sm font-bold">{baseNutrients.carbs.toFixed(1)}g</p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 text-center mt-1">{perServingLabel}</p>
                    </div>
                );
            })()}

            {/* 重量調整セクション */}
            <div className="space-y-3">
                <div>
                    <label className="block text-sm font-medium mb-2">
                        量 ({base.unit === '1個' ? '個' : base.unit === '本' ? '本' : 'g'})
                    </label>

                    {/* スライダー */}
                    <div className="mb-3">
                        <input
                            type="range"
                            min="0"
                            max={(base.unit === '本' || base.unit === '1個') ? 50 : 500}
                            step={(base.unit === '本' || base.unit === '1個') ? 0.1 : 5}
                            value={amount}
                            onChange={(e) => handleAmountChange(Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            style={{
                                background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${(amount/((base.unit === '本' || base.unit === '1個') ? 50 : 500))*100}%, #e5e7eb ${(amount/((base.unit === '本' || base.unit === '1個') ? 50 : 500))*100}%, #e5e7eb 100%)`
                            }}
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            {base.unit === '本' ? (
                                <>
                                    <span onClick={() => handleAmountChange(0)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">0</span>
                                    <span onClick={() => handleAmountChange(1)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">1</span>
                                    <span onClick={() => handleAmountChange(2)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">2</span>
                                    <span onClick={() => handleAmountChange(5)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">5</span>
                                    <span onClick={() => handleAmountChange(10)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">10</span>
                                    <span onClick={() => handleAmountChange(50)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">50</span>
                                </>
                            ) : base.unit === '1個' ? (
                                <>
                                    <span onClick={() => handleAmountChange(0)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">0</span>
                                    <span onClick={() => handleAmountChange(1)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">1</span>
                                    <span onClick={() => handleAmountChange(10)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">10</span>
                                    <span onClick={() => handleAmountChange(20)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">20</span>
                                    <span onClick={() => handleAmountChange(30)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">30</span>
                                    <span onClick={() => handleAmountChange(50)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">50</span>
                                </>
                            ) : (
                                <>
                                    <span onClick={() => handleAmountChange(0)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">0</span>
                                    <span onClick={() => handleAmountChange(100)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">100</span>
                                    <span onClick={() => handleAmountChange(200)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">200</span>
                                    <span onClick={() => handleAmountChange(300)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">300</span>
                                    <span onClick={() => handleAmountChange(400)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">400</span>
                                    <span onClick={() => handleAmountChange(500)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">500</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* 数値入力 */}
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => handleAmountChange(Number(e.target.value))}
                        step={(base.unit === '本' || base.unit === '1個') ? 0.1 : 1}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none mb-2"
                    />

                    {/* 増減ボタン */}
                    {base.unit === '本' ? (
                        <div className="grid grid-cols-6 gap-1">
                            <button
                                onClick={() => adjustAmount(-1)}
                                className="py-1.5 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200 font-medium"
                            >
                                -1
                            </button>
                            <button
                                onClick={() => adjustAmount(-0.5)}
                                className="py-1.5 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 font-medium"
                            >
                                -0.5
                            </button>
                            <button
                                onClick={() => adjustAmount(-0.1)}
                                className="py-1.5 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 font-medium"
                            >
                                -0.1
                            </button>
                            <button
                                onClick={() => adjustAmount(0.1)}
                                className="py-1.5 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100 font-medium"
                            >
                                +0.1
                            </button>
                            <button
                                onClick={() => adjustAmount(0.5)}
                                className="py-1.5 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100 font-medium"
                            >
                                +0.5
                            </button>
                            <button
                                onClick={() => adjustAmount(1)}
                                className="py-1.5 bg-green-100 text-green-600 rounded text-xs hover:bg-green-200 font-medium"
                            >
                                +1
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-6 gap-1">
                            <button
                                onClick={() => adjustAmount(-100)}
                                className="py-1.5 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200 font-medium"
                            >
                                -100
                            </button>
                            <button
                                onClick={() => adjustAmount(-50)}
                                className="py-1.5 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 font-medium"
                            >
                                -50
                            </button>
                            <button
                                onClick={() => adjustAmount(-10)}
                                className="py-1.5 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 font-medium"
                            >
                                -10
                            </button>
                            <button
                                onClick={() => adjustAmount(10)}
                                className="py-1.5 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100 font-medium"
                            >
                                +10
                            </button>
                            <button
                                onClick={() => adjustAmount(50)}
                                className="py-1.5 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100 font-medium"
                            >
                                +50
                            </button>
                            <button
                                onClick={() => adjustAmount(100)}
                                className="py-1.5 bg-green-100 text-green-600 rounded text-xs hover:bg-green-200 font-medium"
                            >
                                +100
                            </button>
                        </div>
                    )}

                    {/* 倍増減ボタン */}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        <button
                            onClick={() => handleAmountChange(Math.max(0, Math.round(Number(amount) * 0.5 * 10) / 10))}
                            className="py-1.5 bg-purple-50 text-purple-600 rounded text-xs hover:bg-purple-100 font-medium"
                        >
                            ×0.5
                        </button>
                        <button
                            onClick={() => handleAmountChange(Math.round(Number(amount) * 2 * 10) / 10)}
                            className="py-1.5 bg-purple-50 text-purple-600 rounded text-xs hover:bg-purple-100 font-medium"
                        >
                            ×2
                        </button>
                    </div>
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

                    {/* もしかして候補（3択） */}
                    {suggestions.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs text-amber-800 font-medium">もしかして:</p>
                            <div className="space-y-1">
                                {suggestions.map((suggestion, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            if (onReplace) {
                                                onReplace(suggestion);
                                            }
                                        }}
                                        className="w-full px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg transition text-sm font-medium border border-amber-300 flex items-center justify-between"
                                    >
                                        <span>{suggestion.name}</span>
                                        <span className="text-xs text-amber-600">類似度 {suggestion.similarity}%</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={() => {
                            if (onOpenCustomCreator) {
                                onOpenCustomCreator({
                                    name: food.name,
                                    amount: amount,  // 現在の量を渡す
                                    unit: 'g',
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
