import React from 'react';
import toast from 'react-hot-toast';
// ===== AI Food Recognition Component =====
// AI搭載の食事認識機能（写真から食品を自動認識）

const AIFoodRecognition = ({ onFoodsRecognized, onClose, onOpenCustomCreator, userId, userProfile, user, dailyRecord, selectedDate }) => {
    // 類義語マッピング（AIが認識した名前 → データベース内の正式名称）
    const synonymMap = {
        // ご飯・米系
        'ご飯': ['白米（炊飯後）', '白米　炊飯後', 'めし', '精白米　水稲めし'],
        'ごはん': ['白米（炊飯後）', '白米　炊飯後', 'めし', '精白米　水稲めし'],
        'ライス': ['白米（炊飯後）', '白米　炊飯後', '精白米　水稲めし'],
        '米': ['白米（炊飯後）', '白米　炊飯後', '精白米　水稲めし'],
        '白米': ['白米（炊飯後）', '白米　炊飯後', '精白米　水稲めし'],
        '白米（炊飯後）': ['白米（炊飯後）', '白米　炊飯後', '精白米　水稲めし'],
        '玄米': ['玄米（炊飯後）', '玄米　炊飯後'],
        '玄米（炊飯後）': ['玄米（炊飯後）', '玄米　炊飯後'],

        // 鶏肉系
        '鶏肉': ['鶏肉', 'とり肉', 'チキン', '鶏むね肉', '鶏もも肉'],
        'チキン': ['鶏肉', 'とり肉', 'チキン', '鶏むね肉', '鶏もも肉'],
        'とり肉': ['鶏肉', 'チキン', '鶏むね肉', '鶏もも肉'],
        '鶏むね肉': ['鶏むね肉', '鶏むね', '鶏胸肉'],
        '鶏もも肉': ['鶏もも肉', '鶏もも', '鶏腿肉'],

        // 卵系（Mサイズを最優先）
        '卵': ['鶏卵 M', '鶏卵（全卵）', '鶏卵'],
        'たまご': ['鶏卵 M', '鶏卵（全卵）', '鶏卵'],
        '鶏卵': ['鶏卵 M', '鶏卵（全卵）'],
        '鶏卵（全卵）': ['鶏卵 M', '鶏卵'],

        // 豚肉系
        '豚肉': ['豚肉', 'ぶた肉', '豚ロース', '豚バラ'],
        'ぶた肉': ['豚肉', '豚ロース', '豚バラ'],

        // 牛肉系
        '牛肉': ['牛肉', '牛もも肉', '牛バラ'],

        // 魚系
        'サーモン': ['鮭', 'さけ', 'シャケ'],
        '鮭': ['鮭', 'さけ', 'シャケ', 'サーモン'],
        'まぐろ': ['まぐろ', 'マグロ', '鮪'],

        // 野菜系
        'ブロッコリー': ['ブロッコリー', 'ぶろっこりー'],
        'トマト': ['トマト', 'とまと', 'ミニトマト'],
        'ミニトマト': ['トマト', 'ミニトマト'],
        '玉ねぎ': ['玉ねぎ', 'たまねぎ', 'タマネギ', '玉葱'],
        'にんじん': ['にんじん', 'ニンジン', '人参', 'にんじん、根'],
        '人参': ['にんじん', 'ニンジン', '人参', 'にんじん、根'],
        'きゅうり': ['きゅうり', 'キュウリ', '胡瓜'],
        'キャベツ': ['キャベツ', 'きゃべつ'],
        'じゃがいも': ['じゃがいも', 'ジャガイモ', 'ばれいしょ'],
        'パセリ': ['パセリ', 'ぱせり'],
    };

    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [recognizing, setRecognizing] = useState(false);
    const [recognizingMessage, setRecognizingMessage] = useState('AI分析中...');
    const [recognizedFoods, setRecognizedFoods] = useState([]);
    const [mealName, setMealName] = useState('食事');  // 食事名編集用
    const [error, setError] = useState(null);
    const [showManualAdd, setShowManualAdd] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [editingFoodIndex, setEditingFoodIndex] = useState(null);
    const [originalFood, setOriginalFood] = useState(null);
    const [adjustmentStep, setAdjustmentStep] = useState(1);
    const [customFoods, setCustomFoods] = useState([]);  // Firestoreから取得したカスタムアイテム

    // コンポーネントマウント時にFirestoreからcustomFoodsを取得
    useEffect(() => {
        const loadCustomFoods = async () => {
            // Firebaseの現在のユーザーを直接取得
            const currentUser = firebase.auth().currentUser;
            console.log('[AIFoodRecognition] useEffect実行、currentUser:', currentUser);

            if (!currentUser || !currentUser.uid) {
                console.log('[AIFoodRecognition] ユーザー未ログインのためスキップ');
                return;
            }

            try {
                console.log('[AIFoodRecognition] customFoods読み込み開始...');
                const customFoodsSnapshot = await firebase.firestore()
                    .collection('users')
                    .doc(currentUser.uid)
                    .collection('customFoods')
                    .get();

                const foods = customFoodsSnapshot.docs
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }))
                    .filter(food => !food.hidden); // 非表示アイテムを除外

                setCustomFoods(foods);
                console.log(`[AIFoodRecognition] customFoods読み込み完了: ${foods.length}件`, foods.map(f => f.name));
            } catch (error) {
                console.error('[AIFoodRecognition] customFoods読み込みエラー:', error);
            }
        };

        // 認証状態の変化を監視
        const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                console.log('[AIFoodRecognition] 認証状態変化: ログイン済み');
                loadCustomFoods();
            } else {
                console.log('[AIFoodRecognition] 認証状態変化: 未ログイン');
                setCustomFoods([]);
            }
        });

        return () => unsubscribe();
    }, []);

    // 今日の日付を取得（YYYY-MM-DD形式、ローカル時間基準）
    const getTodayString = () => {
        // システムのローカル時間をそのまま使用
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;

        const hours = now.getHours();
        const minutes = now.getMinutes();

        return dateString;
    };

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

    // リトライ付きAPI呼び出し（429エラー対策）
    // DSQ (Dynamic Shared Quota) 環境に対応するため、最大5回までリトライ
    const callGeminiWithRetry = async (callGemini, params, maxRetries = 5, timeoutMs = 30000) => {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                // タイムアウト制御を追加
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('API call timeout')), timeoutMs)
                );

                const apiCallPromise = callGemini(params);

                return await Promise.race([apiCallPromise, timeoutPromise]);
            } catch (error) {
                const is429Error = error.message && (
                    error.message.includes('429') ||
                    error.message.includes('Resource exhausted') ||
                    error.message.includes('Too Many Requests')
                );

                const isTimeoutError = error.message && error.message.includes('timeout');

                if ((is429Error || isTimeoutError) && attempt < maxRetries) {
                    // エクスポネンシャルバックオフ: 3秒、6秒、12秒、24秒、48秒
                    const waitTime = 3000 * Math.pow(2, attempt);
                    const errorType = isTimeoutError ? 'タイムアウト' : '429エラー';
                    console.log(`[callGeminiWithRetry] ${errorType}発生。${waitTime/1000}秒後にリトライ (${attempt + 1}/${maxRetries})`);
                    setRecognizingMessage(`AI処理が混雑しています。${waitTime/1000}秒後に再試行します... (${attempt + 1}/${maxRetries + 1})`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                }
                throw error;
            }
        }
    };

    // AI認識実行
    const recognizeFood = async () => {
        if (!selectedImage) {
            setError('画像を選択してください');
            return;
        }

        setRecognizing(true);
        setRecognizingMessage('AI分析中...');
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

            const promptText = `ヘルスケアアプリ用の食材解析AI。写真から食材を認識しJSON形式で出力。

優先度1: パッケージの栄養成分表示がある場合
- 内容量、栄養成分（100gあたりに換算）を読み取る
出力: {"hasPackageInfo": true, "packageWeight": 数値g, "nutritionPer": 数値g, "foods": [{"name": "商品名", "amount": 数値g, "confidence": 1.0, "source": "package", "itemType": "supplement", "cookingState": "加工済み", "nutritionPer100g": {"calories": 数値, "protein": 数値, "fat": 数値, "carbs": 数値}}]}

優先度2: 料理や生鮮食品の場合
- **重要**: 料理名ではなく、使用されている食材を個別に分解して列挙すること
  例: 「オムライス」 → 「卵」「白米（炊飯後）」「玉ねぎ」「鶏肉」「ケチャップ」
  例: 「ハンバーグ」 → 「牛ひき肉」「豚ひき肉」「玉ねぎ」「パン粉」「卵」
- 食材単品で検出（例: "鶏むね肉", "白米（炊飯後）", "鶏卵（全卵）"）
- **調理状態を必ず明記**すること
  - 炊飯後: 「白米（炊飯後）」「玄米（炊飯後）」など
  - 生: 「鶏むね肉（生）」「豚ロース（生）」など
  - 茹で: 「ブロッコリー（茹で）」「卵（茹で）」など
  - 焼き: 「鶏むね肉（焼き）」「鮭（焼き）」など
  - 炒め: 「野菜炒め（炒め）」など
出力: {"hasPackageInfo": false, "foods": [{"name": "食材名", "amount": 推定g, "confidence": 0-1, "source": "visual_estimation", "itemType": "food", "cookingState": "炊飯後|生|茹で|焼き|炒め|揚げ|加工済み"}]}

itemType: "food"（食材）, "supplement"（サプリ・プロテイン）のいずれかを指定
- プロテイン、サプリメントは "supplement"
- **料理は食材に分解するため、"meal"は使用しない**
- 単一の食材は "food"

cookingState（調理状態）の判定基準:
- 写真から調理状態を判定し、必ず明記すること
- 「ご飯」「ライス」→ cookingState: "炊飯後"
- 「生肉」「刺身」→ cookingState: "生"
- 「ゆで卵」「茹でた野菜」→ cookingState: "茹で"
- 「焼き魚」「焼き鳥」→ cookingState: "焼き"

JSONのみ出力、説明文不要`;

            // 開発環境ではFlashモデルを使用（高速・429エラーが発生しにくい）
            const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const model = isDev ? 'gemini-2.5-flash' : 'gemini-2.5-pro';


            // 画像認識は60秒タイムアウト（画像処理は時間がかかる）
            const result = await callGeminiWithRetry(callGemini, {
                model: model,
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
            }, 5, 60000); // maxRetries=5, timeout=60秒

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
                // 【優先度1】パッケージ情報がある場合（source: 'package'）
                if (food.source === 'package' && food.nutritionPer100g) {
                    console.log(`[recognizeFood] パッケージ情報を使用: ${food.name}`, food.nutritionPer100g);

                    const amount = food.amount || 100;
                    const ratio = amount / 100;

                    return {
                        name: food.name,
                        category: 'パッケージ',
                        itemType: food.itemType || 'supplement',
                        amount: amount,  // g単位
                        unit: 'g',
                        calories: Math.round((food.nutritionPer100g.calories || 0) * ratio),
                        protein: parseFloat(((food.nutritionPer100g.protein || 0) * ratio).toFixed(1)),
                        fat: parseFloat(((food.nutritionPer100g.fat || 0) * ratio).toFixed(1)),
                        carbs: parseFloat(((food.nutritionPer100g.carbs || 0) * ratio).toFixed(1)),
                        confidence: food.confidence || 1.0,
                        isPackageInfo: true,
                        packageWeight: food.packageWeight || null,
                        nutritionPer: food.nutritionPer || 100,
                        _base: {  // 100gあたりの基準値
                            calories: food.nutritionPer100g.calories || 0,
                            protein: food.nutritionPer100g.protein || 0,
                            fat: food.nutritionPer100g.fat || 0,
                            carbs: food.nutritionPer100g.carbs || 0,
                            servingSize: 100,
                            servingUnit: 'g',
                            unit: '100g'
                        }
                    };
                }

                // 【優先度2】foodDatabaseから検索
                let matchedItem = null;

                // 鶏卵の特殊処理：「鶏卵（全卵）」などサイズ不明の場合はMサイズにマッピング
                let searchName = food.name;
                if (food.name.includes('鶏卵') && !food.name.match(/SS|S|MS|M|L|LL|（46g）|（50g）|（58g）|（64g）|（70g）/)) {
                    // 卵黄のみ、卵白のみの場合は除外
                    if (!food.name.includes('卵黄') && !food.name.includes('卵白')) {
                        console.log(`[recognizeFood] 鶏卵サイズ不明 → Mサイズ（58g）を使用: ${food.name}`);
                        searchName = '鶏卵 M（58g）';
                    }
                }

                // 類義語を考慮した検索名リストを生成
                let searchNames = [searchName];
                if (synonymMap[searchName]) {
                    searchNames = searchNames.concat(synonymMap[searchName]);
                }
                // cookingStateが含まれている場合、それも考慮
                if (food.cookingState) {
                    const nameWithState = `${searchName}（${food.cookingState}）`;
                    searchNames.push(nameWithState);
                    if (synonymMap[searchName]) {
                        synonymMap[searchName].forEach(syn => {
                            searchNames.push(`${syn}（${food.cookingState}）`);
                        });
                    }
                }

                console.log(`[recognizeFood] 検索名リスト (${food.name}):`, searchNames);

                let foundMatch = false;
                Object.keys(foodDB).forEach(category => {
                    if (foundMatch) return;  // 既にマッチが見つかっていたらスキップ

                    Object.keys(foodDB[category]).forEach(itemName => {
                        if (foundMatch) return;  // 既にマッチが見つかっていたらスキップ

                        // 類義語リストのいずれかとマッチするか確認
                        const isMatch = searchNames.some(name =>
                            itemName.includes(name) || name.includes(itemName)
                        );

                        if (isMatch) {
                            const dbItem = foodDB[category][itemName];

                            // amountはAIが推定したg数をそのまま使用
                            const amount = food.amount || 100;

                            // DBアイテムが特殊単位（1個あたり）の場合、100gあたりに換算
                            let caloriesPer100g, proteinPer100g, fatPer100g, carbsPer100g;

                            if (dbItem.servingSize && dbItem.servingSize !== 100) {
                                // 例: 鶏卵M（58g）の場合、82kcal（1個）→ 141kcal（100g）
                                const conversionRatio = 100 / dbItem.servingSize;
                                caloriesPer100g = (dbItem.calories || 0) * conversionRatio;
                                proteinPer100g = (dbItem.protein || 0) * conversionRatio;
                                fatPer100g = (dbItem.fat || 0) * conversionRatio;
                                carbsPer100g = (dbItem.carbs || 0) * conversionRatio;
                                console.log(`[recognizeFood] 特殊単位を100g換算: ${itemName} (${dbItem.servingSize}g) → 100g`);
                            } else {
                                // 通常の100gあたり食材
                                caloriesPer100g = dbItem.calories || 0;
                                proteinPer100g = dbItem.protein || 0;
                                fatPer100g = dbItem.fat || 0;
                                carbsPer100g = dbItem.carbs || 0;
                            }

                            // 実量に換算
                            const ratio = amount / 100;

                            matchedItem = {
                                name: itemName,
                                category: category,
                                itemType: food.itemType || 'food',
                                amount: amount,  // g単位
                                unit: 'g',
                                calories: Math.round(caloriesPer100g * ratio),
                                protein: parseFloat((proteinPer100g * ratio).toFixed(1)),
                                fat: parseFloat((fatPer100g * ratio).toFixed(1)),
                                carbs: parseFloat((carbsPer100g * ratio).toFixed(1)),
                                // ビタミン・ミネラル（データベースから取得）
                                vitamins: {
                                    A: dbItem.vitaminA || 0,
                                    B1: dbItem.vitaminB1 || 0,
                                    B2: dbItem.vitaminB2 || 0,
                                    B6: dbItem.vitaminB6 || 0,
                                    B12: dbItem.vitaminB12 || 0,
                                    C: dbItem.vitaminC || 0,
                                    D: dbItem.vitaminD || 0,
                                    E: dbItem.vitaminE || 0,
                                    K: dbItem.vitaminK || 0,
                                    niacin: dbItem.niacin || 0,
                                    pantothenicAcid: dbItem.pantothenicAcid || 0,
                                    biotin: dbItem.biotin || 0,
                                    folicAcid: dbItem.folicAcid || 0
                                },
                                minerals: {
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
                                },
                                otherNutrients: [],
                                confidence: food.confidence || 0.5,
                                _base: {  // 100gあたりの基準値
                                    calories: caloriesPer100g,
                                    protein: proteinPer100g,
                                    fat: fatPer100g,
                                    carbs: carbsPer100g,
                                    servingSize: 100,
                                    servingUnit: 'g',
                                    unit: '100g'
                                }
                            };
                            foundMatch = true;
                            console.log(`[recognizeFood] データベースマッチ: ${food.name} → ${itemName}（類義語検索）`);
                        }
                    });
                });

                // 【優先度3】Firestoreから取得したcustomFoodsから検索
                if (!matchedItem) {
                    try {
                        console.log(`[recognizeFood] customFoods検索: ${food.name}`, customFoods.map(f => f.name));

                        // 類義語も考慮した検索
                        const customItem = customFoods.find(item => {
                            // 直接一致
                            if (item.name === food.name || item.name.includes(food.name) || food.name.includes(item.name)) {
                                return true;
                            }
                            // 類義語リストとの照合
                            return searchNames.some(name =>
                                item.name.includes(name) || name.includes(item.name)
                            );
                        });

                        if (customItem) {
                            console.log(`[recognizeFood] カスタムアイテムマッチ: ${food.name} → ${customItem.name}`);
                            const amount = food.amount || 100;
                            const ratio = amount / 100;

                            matchedItem = {
                                name: customItem.name,
                                category: customItem.category || 'カスタム',
                                itemType: customItem.itemType || food.itemType || 'food',
                                amount: amount,  // g単位
                                unit: 'g',
                                calories: Math.round((customItem.calories || 0) * ratio),
                                protein: parseFloat(((customItem.protein || 0) * ratio).toFixed(1)),
                                fat: parseFloat(((customItem.fat || 0) * ratio).toFixed(1)),
                                carbs: parseFloat(((customItem.carbs || 0) * ratio).toFixed(1)),
                                // ビタミン・ミネラル（カスタムアイテムから取得）
                                vitamins: customItem.vitamins || {},
                                minerals: customItem.minerals || {},
                                otherNutrients: customItem.otherNutrients || [],
                                confidence: food.confidence || 0.5,
                                isCustom: true,
                                _base: {  // 100gあたりの基準値
                                    calories: customItem.calories || 0,
                                    protein: customItem.protein || 0,
                                    fat: customItem.fat || 0,
                                    carbs: customItem.carbs || 0,
                                    servingSize: 100,
                                    servingUnit: 'g',
                                    unit: '100g'
                                }
                            };
                        }
                    } catch (error) {
                        console.error('カスタムアイテム検索エラー:', error);
                    }
                }

                // 【優先度4】どちらからも見つからない場合は八訂自動取得対象
                return matchedItem || {
                    name: food.name,
                    itemType: food.itemType || 'food',
                    amount: food.amount || 100,  // g単位
                    unit: 'g',
                    confidence: food.confidence || 0.5,
                    calories: 0,
                    protein: 0,
                    fat: 0,
                    carbs: 0,
                    isUnknown: true,
                    needsHachiteiFetch: true,
                    _base: {  // 100gあたりの基準値
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

            // デフォルトの食事名は「食事」のまま（ユーザーが変更しない限り）

            // ===== 八訂自動取得処理（レート制限対策：最大1件のみ自動取得 + 2秒遅延） =====
            const unknownFoods = matchedFoods.filter(food => food.needsHachiteiFetch);

            if (unknownFoods.length > 0) {
                console.log(`[recognizeFood] 八訂自動取得対象: ${unknownFoods.length}件（自動取得は最大1件）`, unknownFoods.map(f => f.name));

                // レート制限対策：最大1件のみ自動取得
                const autoFetchCount = Math.min(unknownFoods.length, 1);

                // 自動取得対象アイテムにローディングフラグを設定 & 2件目以降に待機フラグを設定
                const foodsWithLoading = matchedFoods.map(food => {
                    if (!food.needsHachiteiFetch) return food;

                    const unknownIndex = unknownFoods.findIndex(uf => uf.name === food.name);

                    // 1件目: 検索中フラグ
                    if (unknownIndex < autoFetchCount) {
                        return { ...food, isFetchingHachitei: true };
                    }

                    // 2件目以降: 待機中フラグ
                    return {
                        ...food,
                        isUnknown: true,
                        needsManualHachiteiFetch: true,
                        needsHachiteiFetch: false
                    };
                });
                setRecognizedFoods(foodsWithLoading);

                // レート制限対策：画像認識直後のAPI呼び出しを避けるため2秒待機
                console.log(`[recognizeFood] レート制限回避のため2秒待機中...`);
                await new Promise(resolve => setTimeout(resolve, 2000));

                const hachiteiResults = [];

                for (let i = 0; i < autoFetchCount; i++) {
                    const food = unknownFoods[i];
                    try {
                        setRecognizingMessage(`栄養素を検索中... (${i + 1}/${autoFetchCount}): ${food.name}`);
                        console.log(`[recognizeFood] 八訂検索中 (${i + 1}/${autoFetchCount}): ${food.name}`);
                        const result = await fetchNutritionFromHachitei(food.name);

                        // foodDatabaseからも候補を検索
                        const foodDbCandidates = searchFoodDatabaseCandidates(food.name, 5);

                        hachiteiResults.push({
                            food,
                            result: {
                                ...result,
                                foodDatabaseCandidates: foodDbCandidates
                            }
                        });
                    } catch (error) {
                        console.error(`[recognizeFood] 八訂取得失敗 (${food.name}):`, error);

                        // エラー時もfoodDatabase候補は取得
                        const foodDbCandidates = searchFoodDatabaseCandidates(food.name, 5);

                        hachiteiResults.push({
                            food,
                            result: {
                                success: false,
                                error: error.message,
                                foodDatabaseCandidates: foodDbCandidates
                            }
                        });
                    }
                }

                // 2件目以降は手動検索が必要（needsManualHachiteiFetch: true）
                if (unknownFoods.length > 1) {
                    console.log(`[recognizeFood] 残り${unknownFoods.length - 1}件は手動検索が必要`);
                }

                // 結果を反映してrecognizedFoodsを更新
                const updatedFoods = matchedFoods.map((food, index) => {
                    if (!food.needsHachiteiFetch) return food;

                    // 自動取得対象（1件目）かどうか判定
                    const unknownIndex = unknownFoods.findIndex(uf => uf.name === food.name);
                    const isAutoFetchTarget = unknownIndex < autoFetchCount;

                    if (!isAutoFetchTarget) {
                        // 2件目以降は手動検索が必要
                        console.log(`[recognizeFood] 手動検索が必要: ${food.name}`);
                        return {
                            ...food,
                            isUnknown: true,
                            needsHachiteiFetch: false,
                            needsManualHachiteiFetch: true,  // 手動検索フラグ
                            hachiteiFailed: false
                        };
                    }

                    const hachiteiData = hachiteiResults.find(r => r.food.name === food.name);
                    if (!hachiteiData || !hachiteiData.result.success) {
                        console.warn(`[recognizeFood] 八訂取得失敗: ${food.name}`, hachiteiData?.result?.error);
                        return {
                            ...food,
                            isUnknown: true,
                            needsHachiteiFetch: false,
                            isFetchingHachitei: false,  // ローディング解除
                            hachiteiFailed: true  // 八訂取得失敗フラグ
                        };
                    }

                    const bestMatch = hachiteiData.result.bestMatch;
                    console.log(`[recognizeFood] 八訂取得成功: ${food.name} → ${bestMatch.name}`, {
                        calories: bestMatch.calories,
                        protein: bestMatch.protein,
                        confidence: bestMatch.confidence,
                        matchScore: bestMatch.matchScore
                    });

                    const amount = food.amount || 100;
                    const ratio = amount / 100;

                    return {
                        name: `${food.name}（${bestMatch.name}）`,
                        category: '八訂',
                        itemType: food.itemType || 'food',
                        amount: amount,  // g単位
                        unit: 'g',
                        calories: Math.round((bestMatch.calories || 0) * ratio),
                        protein: parseFloat(((bestMatch.protein || 0) * ratio).toFixed(1)),
                        fat: parseFloat(((bestMatch.fat || 0) * ratio).toFixed(1)),
                        carbs: parseFloat(((bestMatch.carbs || 0) * ratio).toFixed(1)),
                        confidence: bestMatch.confidence || 0.8,
                        isUnknown: false,
                        needsHachiteiFetch: false,
                        isFetchingHachitei: false,
                        isHachitei: true,
                        hachiteiMatchScore: bestMatch.matchScore || 0,
                        hachiteiCandidates: hachiteiData.result.candidates || [],
                        foodDatabaseCandidates: hachiteiData.result.foodDatabaseCandidates || [],
                        _base: {  // 100gあたりの基準値
                            calories: bestMatch.calories || 0,
                            protein: bestMatch.protein || 0,
                            fat: bestMatch.fat || 0,
                            carbs: bestMatch.carbs || 0,
                            servingSize: 100,
                            servingUnit: 'g',
                            unit: '100g'
                        }
                    };
                });

                setRecognizedFoods(updatedFoods);
                console.log(`[recognizeFood] 八訂自動取得完了: ${unknownFoods.length}件中${updatedFoods.filter(f => f.isHachitei).length}件成功`);

                // ===== 2件目以降の連鎖的自動検索を開始 =====
                const remainingUnregistered = updatedFoods.filter(food =>
                    food.needsManualHachiteiFetch || food.hachiteiFailed
                );

                if (remainingUnregistered.length > 0) {
                    console.log(`[recognizeFood] 残り${remainingUnregistered.length}件の連鎖的自動検索を開始`);

                    // 2秒待機してから連鎖検索を開始
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    // 連鎖的に検索
                    for (let i = 0; i < remainingUnregistered.length; i++) {
                        const targetFood = remainingUnregistered[i];

                        console.log(`[recognizeFood] 連鎖検索 (${i + 1}/${remainingUnregistered.length}): ${targetFood.name}`);

                        // ローディング状態にする（最新のstateを参照）
                        setRecognizedFoods(prevFoods => {
                            const targetIndex = prevFoods.findIndex(f => f.name === targetFood.name);
                            if (targetIndex === -1) return prevFoods;

                            return prevFoods.map((food, idx) =>
                                idx === targetIndex ? { ...food, isFetchingHachitei: true } : food
                            );
                        });

                        try {
                            const result = await fetchNutritionFromHachitei(targetFood.name);

                            // foodDatabaseからも候補を検索
                            const foodDbCandidates = searchFoodDatabaseCandidates(targetFood.name, 5);

                            if (result.success && result.bestMatch) {
                                const bestMatch = result.bestMatch;
                                console.log(`[recognizeFood] 連鎖検索成功: ${targetFood.name} → ${bestMatch.name}`);

                                // 取得成功時の更新（最新のstateを参照）
                                setRecognizedFoods(prevFoods => {
                                    return prevFoods.map((food) => {
                                        // 対象の食材のみ更新（名前で判定、ユーザーが編集した可能性があるため）
                                        if (food.name !== targetFood.name) return food;

                                        // ユーザーが編集したamountを保持
                                        const amount = food.amount || 100;
                                        const ratio = amount / 100;

                                        return {
                                            ...food,
                                            name: `${food.name.split('（')[0]}（${bestMatch.name}）`,
                                            category: '八訂',
                                            itemType: food.itemType || 'food',
                                            calories: Math.round((bestMatch.calories || 0) * ratio),
                                            protein: parseFloat(((bestMatch.protein || 0) * ratio).toFixed(1)),
                                            fat: parseFloat(((bestMatch.fat || 0) * ratio).toFixed(1)),
                                            carbs: parseFloat(((bestMatch.carbs || 0) * ratio).toFixed(1)),
                                            confidence: bestMatch.confidence || 0.8,
                                            isUnknown: false,
                                            needsManualHachiteiFetch: false,
                                            isFetchingHachitei: false,
                                            hachiteiFailed: false,
                                            isHachitei: true,
                                            hachiteiMatchScore: bestMatch.matchScore || 0,
                                            hachiteiCandidates: result.candidates || [],
                                            foodDatabaseCandidates: foodDbCandidates,
                                            _base: {
                                                calories: bestMatch.calories || 0,
                                                protein: bestMatch.protein || 0,
                                                fat: bestMatch.fat || 0,
                                                carbs: bestMatch.carbs || 0,
                                                servingSize: 100,
                                                servingUnit: 'g',
                                                unit: '100g'
                                            }
                                        };
                                    });
                                });
                            } else {
                                console.warn(`[recognizeFood] 連鎖検索失敗: ${targetFood.name}`);

                                // 取得失敗時の更新（最新のstateを参照）
                                // エラー時もfoodDatabase候補は保存
                                setRecognizedFoods(prevFoods => {
                                    return prevFoods.map((food) =>
                                        food.name === targetFood.name
                                            ? {
                                                ...food,
                                                isFetchingHachitei: false,
                                                hachiteiFailed: true,
                                                foodDatabaseCandidates: foodDbCandidates
                                            }
                                            : food
                                    );
                                });
                            }

                            // 次の検索前に2秒待機
                            if (i < remainingUnregistered.length - 1) {
                                await new Promise(resolve => setTimeout(resolve, 2000));
                            }
                        } catch (error) {
                            console.error(`[recognizeFood] 連鎖検索エラー (${targetFood.name}):`, error);

                            // エラー時の更新（最新のstateを参照）
                            setRecognizedFoods(prevFoods => {
                                return prevFoods.map((food) =>
                                    food.name === targetFood.name
                                        ? { ...food, isFetchingHachitei: false, hachiteiFailed: true }
                                        : food
                                );
                            });
                        }
                    }

                    console.log(`[recognizeFood] 連鎖的自動検索完了`);
                }
            }

        } catch (err) {
            console.error('Food recognition error:', err);

            // エラーメッセージを分類して表示
            if (err.message && err.message.includes('timeout')) {
                setError('画像認識がタイムアウトしました（60秒超過）。画像サイズを小さくするか、もう一度お試しください。');
            } else if (err.message && err.message.includes('429')) {
                setError('AI処理が混雑しています。少し時間をおいてから再度お試しください。');
            } else if (err.message && err.message.includes('Resource exhausted')) {
                setError('AI処理が混雑しています。少し時間をおいてから再度お試しください。');
            } else {
                setError('食品認識中にエラーが発生しました: ' + err.message);
            }
        } finally {
            setRecognizing(false);
        }
    };

    // ===== 手動で八訂検索を実行 =====
    const manualFetchHachitei = async (foodIndex) => {
        const food = recognizedFoods[foodIndex];
        if (!food || (!food.needsManualHachiteiFetch && !food.hachiteiFailed)) return;

        console.log(`[manualFetchHachitei] 手動検索開始: ${food.name}`);

        // 該当食材をローディング状態にする
        const updatedFoods = [...recognizedFoods];
        updatedFoods[foodIndex] = {
            ...food,
            isFetchingHachitei: true  // ローディングフラグ
        };
        setRecognizedFoods(updatedFoods);

        try {
            const result = await fetchNutritionFromHachitei(food.name);

            // foodDatabaseからも候補を検索
            const foodDbCandidates = searchFoodDatabaseCandidates(food.name, 5);

            if (!result.success) {
                console.error(`[manualFetchHachitei] 八訂取得失敗: ${food.name}`, result.error);
                updatedFoods[foodIndex] = {
                    ...food,
                    isFetchingHachitei: false,
                    hachiteiFailed: true,
                    needsManualHachiteiFetch: false,
                    foodDatabaseCandidates: foodDbCandidates
                };
                setRecognizedFoods(updatedFoods);
                return;
            }

            const bestMatch = result.bestMatch;
            console.log(`[manualFetchHachitei] 八訂取得成功: ${food.name} → ${bestMatch.name}`);

            updatedFoods[foodIndex] = {
                ...food,
                name: `${food.name.split('（')[0]}（${bestMatch.name}）`,
                category: '八訂',
                itemType: food.itemType || 'food',  // AI認識結果のitemTypeを保持
                calories: bestMatch.calories || 0,
                protein: bestMatch.protein || 0,
                fat: bestMatch.fat || 0,
                carbs: bestMatch.carbs || 0,
                confidence: bestMatch.confidence || 0.8,
                isUnknown: false,
                needsManualHachiteiFetch: false,
                isFetchingHachitei: false,
                hachiteiFailed: false,  // 成功時はフラグをクリア
                isHachitei: true,
                hachiteiMatchScore: bestMatch.matchScore || 0,
                hachiteiCandidates: result.candidates || [],
                foodDatabaseCandidates: foodDbCandidates,
                _base: {
                    calories: bestMatch.calories || 0,
                    protein: bestMatch.protein || 0,
                    fat: bestMatch.fat || 0,
                    carbs: bestMatch.carbs || 0,
                    servingSize: 100,
                    servingUnit: 'g',
                    unit: '100g'
                }
            };
            setRecognizedFoods(updatedFoods);

            // ===== 次の未登録アイテムを自動検索 =====
            const nextUnregistered = updatedFoods.find((f, idx) =>
                idx > foodIndex && (f.needsManualHachiteiFetch || f.hachiteiFailed)
            );

            if (nextUnregistered) {
                const nextIndex = updatedFoods.findIndex(f => f === nextUnregistered);
                console.log(`[manualFetchHachitei] 次の未登録アイテムを自動検索: ${nextUnregistered.name} (index: ${nextIndex})`);

                // 2秒待機してから次のアイテムを検索
                await new Promise(resolve => setTimeout(resolve, 2000));
                await manualFetchHachitei(nextIndex);
            } else {
                console.log(`[manualFetchHachitei] すべての未登録アイテムの検索完了`);
            }

        } catch (error) {
            console.error(`[manualFetchHachitei] エラー (${food.name}):`, error);
            updatedFoods[foodIndex] = {
                ...food,
                isFetchingHachitei: false,
                hachiteiFailed: true,
                needsManualHachiteiFetch: false
            };
            setRecognizedFoods(updatedFoods);
        }
    };

    // ===== 八訂候補から選択して差し替え =====
    const selectHachiteiCandidate = async (foodIndex, candidateName) => {
        const food = recognizedFoods[foodIndex];
        if (!food) return;

        console.log(`[selectHachiteiCandidate] 候補選択: ${candidateName}`);

        // ローディング状態を設定
        const updatedFoods = [...recognizedFoods];
        updatedFoods[foodIndex] = {
            ...food,
            isSelectingCandidate: true  // 候補選択中フラグ
        };
        setRecognizedFoods(updatedFoods);

        try {
            // 選択された候補の栄養素を取得
            const hachiteiData = await fetchNutritionFromHachitei(candidateName);

            // foodDatabaseからも候補を再検索（候補名で）
            const foodDbCandidates = searchFoodDatabaseCandidates(candidateName, 5);

            if (!hachiteiData.success || !hachiteiData.bestMatch) {
                console.error('[selectHachiteiCandidate] 栄養素取得失敗');
                // ローディング解除
                const errorFoods = [...recognizedFoods];
                errorFoods[foodIndex] = {
                    ...food,
                    isSelectingCandidate: false
                };
                setRecognizedFoods(errorFoods);
                return;
            }

            const bestMatch = hachiteiData.bestMatch;

            // 食材データを更新
            const updatedFoods = [...recognizedFoods];
            updatedFoods[foodIndex] = {
                ...food,
                name: `${food.name.split('（')[0]}（${bestMatch.name}）`,
                category: '八訂',
                itemType: food.itemType || 'food',  // AI認識結果のitemTypeを保持
                calories: bestMatch.calories || 0,
                protein: bestMatch.protein || 0,
                fat: bestMatch.fat || 0,
                carbs: bestMatch.carbs || 0,
                confidence: bestMatch.confidence || 0.8,
                isUnknown: false,
                needsHachiteiFetch: false,
                isHachitei: true,
                hachiteiMatchScore: bestMatch.matchScore || 0,
                hachiteiCandidates: hachiteiData.candidates || [],
                foodDatabaseCandidates: foodDbCandidates,
                isSelectingCandidate: false,  // ローディング解除
                _base: {
                    calories: bestMatch.calories || 0,
                    protein: bestMatch.protein || 0,
                    fat: bestMatch.fat || 0,
                    carbs: bestMatch.carbs || 0,
                    servingSize: 100,
                    servingUnit: 'g',
                    unit: '100g'
                }
            };

            // amountに基づいて栄養素を再計算
            const ratio = updatedFoods[foodIndex].amount / 100;
            updatedFoods[foodIndex].calories = Math.round(updatedFoods[foodIndex]._base.calories * ratio);
            updatedFoods[foodIndex].protein = parseFloat((updatedFoods[foodIndex]._base.protein * ratio).toFixed(1));
            updatedFoods[foodIndex].fat = parseFloat((updatedFoods[foodIndex]._base.fat * ratio).toFixed(1));
            updatedFoods[foodIndex].carbs = parseFloat((updatedFoods[foodIndex]._base.carbs * ratio).toFixed(1));

            setRecognizedFoods(updatedFoods);
            console.log(`[selectHachiteiCandidate] 候補選択完了: ${candidateName}`);
        } catch (error) {
            console.error(`[selectHachiteiCandidate] エラー:`, error);
            // エラー時もローディング解除
            const errorFoods = [...recognizedFoods];
            errorFoods[foodIndex] = {
                ...food,
                isSelectingCandidate: false
            };
            setRecognizedFoods(errorFoods);
        }
    };

    // ===== foodDatabase候補から選択して差し替え =====
    const selectFoodDatabaseCandidate = (foodIndex, candidate) => {
        const food = recognizedFoods[foodIndex];
        if (!food) return;

        console.log(`[selectFoodDatabaseCandidate] 候補選択: ${candidate.name}`);

        const amount = food.amount || 100;
        const dbItem = candidate.dbItem;

        // DBアイテムが特殊単位（1個あたり）の場合、100gあたりに換算
        let caloriesPer100g, proteinPer100g, fatPer100g, carbsPer100g;

        if (dbItem.servingSize && dbItem.servingSize !== 100) {
            const conversionRatio = 100 / dbItem.servingSize;
            caloriesPer100g = (dbItem.calories || 0) * conversionRatio;
            proteinPer100g = (dbItem.protein || 0) * conversionRatio;
            fatPer100g = (dbItem.fat || 0) * conversionRatio;
            carbsPer100g = (dbItem.carbs || 0) * conversionRatio;
        } else {
            caloriesPer100g = dbItem.calories || 0;
            proteinPer100g = dbItem.protein || 0;
            fatPer100g = dbItem.fat || 0;
            carbsPer100g = dbItem.carbs || 0;
        }

        // 実量に換算
        const ratio = amount / 100;

        const updatedFoods = [...recognizedFoods];
        updatedFoods[foodIndex] = {
            ...food,
            name: candidate.name,
            category: candidate.category,
            itemType: food.itemType || 'food',
            calories: Math.round(caloriesPer100g * ratio),
            protein: parseFloat((proteinPer100g * ratio).toFixed(1)),
            fat: parseFloat((fatPer100g * ratio).toFixed(1)),
            carbs: parseFloat((carbsPer100g * ratio).toFixed(1)),
            vitamins: {
                A: dbItem.vitaminA || 0,
                B1: dbItem.vitaminB1 || 0,
                B2: dbItem.vitaminB2 || 0,
                B6: dbItem.vitaminB6 || 0,
                B12: dbItem.vitaminB12 || 0,
                C: dbItem.vitaminC || 0,
                D: dbItem.vitaminD || 0,
                E: dbItem.vitaminE || 0,
                K: dbItem.vitaminK || 0,
                niacin: dbItem.niacin || 0,
                pantothenicAcid: dbItem.pantothenicAcid || 0,
                biotin: dbItem.biotin || 0,
                folicAcid: dbItem.folicAcid || 0
            },
            minerals: {
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
            },
            confidence: 0.9,
            isUnknown: false,
            _base: {
                calories: caloriesPer100g,
                protein: proteinPer100g,
                fat: fatPer100g,
                carbs: carbsPer100g,
                servingSize: 100,
                servingUnit: 'g',
                unit: '100g'
            }
        };

        setRecognizedFoods(updatedFoods);
        console.log(`[selectFoodDatabaseCandidate] 候補選択完了: ${candidate.name}`);
    };

    // ===== 八訂から栄養素を自動取得（ニュアンスヒット対応） =====
    const fetchNutritionFromHachitei = async (foodName) => {
        try {
            const functions = firebase.app().functions('asia-northeast2');
            const callGemini = functions.httpsCallable('callGemini');

            const promptText = `「${foodName}」の栄養素を日本食品標準成分表2020年版（八訂）から検索してJSON形式で出力してください。

表記揺れ（ひらがな・カタカナ・漢字、調理状態、部位）を考慮して類似候補を5つ検索し、最も一致する候補を選択してください。

出力形式:
{
  "searchTerm": "検索した食材名",
  "candidates": [
    {"name": "八訂の正式名称", "matchScore": 0-100, "matchReason": "理由"}
  ],
  "bestMatch": {
    "name": "最も一致する候補",
    "calories": 100gあたりkcal,
    "protein": 100gあたりg,
    "fat": 100gあたりg,
    "carbs": 100gあたりg,
    "confidence": 0-1,
    "matchScore": 0-100
  }
}

confidence基準: 1.0=完全一致, 0.95=表記揺れ, 0.9=調理状態違い, 0.85=部位表記違い, 0.8=類似食材
matchScore基準: 100=完全一致, 90-99=表記揺れ, 80-89=調理状態/部位違い, 70-79=類似食材

JSON形式のみ出力、説明文不要`;

            // 開発環境ではFlashモデルを使用
            const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const model = isDev ? 'gemini-2.5-flash' : 'gemini-2.5-pro';

            console.log(`[fetchNutritionFromHachitei] 八訂検索開始: ${foodName} (モデル: ${model})`);

            // 八訂検索は30秒タイムアウト（テキスト検索は画像より速い）
            const result = await callGeminiWithRetry(callGemini, {
                model: model,
                contents: [{
                    role: 'user',
                    parts: [{ text: promptText }]
                }],
                generationConfig: {
                    temperature: 0.2,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 4096,
                }
            }, 5, 30000); // maxRetries=5, timeout=30秒

            if (!result.data || !result.data.success) {
                throw new Error('八訂データ取得に失敗しました');
            }

            // レスポンスの構造チェック
            if (!result.data.response || !result.data.response.candidates || result.data.response.candidates.length === 0) {
                console.error('[fetchNutritionFromHachitei] 不正なレスポンス:', result.data);
                throw new Error('AIからの応答がありませんでした');
            }

            const textContent = result.data.response.candidates[0].content.parts[0].text;

            // JSONを抽出
            let jsonText = textContent.trim();
            jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

            const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('栄養素の解析に失敗しました');
            }

            const response = JSON.parse(jsonMatch[0]);

            if (!response.bestMatch || !response.bestMatch.name) {
                throw new Error('最適候補が見つかりませんでした');
            }

            console.log(`[fetchNutritionFromHachitei] 八訂検索完了: ${foodName}`, {
                searchTerm: response.searchTerm,
                candidatesCount: response.candidates?.length || 0,
                bestMatch: response.bestMatch.name,
                confidence: response.bestMatch.confidence,
                matchScore: response.bestMatch.matchScore
            });

            return {
                success: true,
                searchTerm: response.searchTerm,
                candidates: response.candidates || [],
                bestMatch: response.bestMatch
            };

        } catch (error) {
            console.error(`[fetchNutritionFromHachitei] エラー (${foodName}):`, error);

            // タイムアウトエラーの場合は専用メッセージ
            let errorMessage = error.message;
            if (error.message && error.message.includes('timeout')) {
                errorMessage = '八訂検索がタイムアウトしました。もう一度お試しください。';
                console.warn(`[fetchNutritionFromHachitei] タイムアウト: ${foodName}（30秒以内に完了しませんでした）`);
            }

            return {
                success: false,
                error: errorMessage
            };
        }
    };

    // ===== foodDatabaseから候補を検索 =====
    const searchFoodDatabaseCandidates = (foodName, maxResults = 5) => {
        console.log(`[searchFoodDatabaseCandidates] 検索開始: ${foodName}`);

        // window.foodDBが存在するか確認
        const foodDB = window.foodDB;
        if (!foodDB) {
            console.warn('[searchFoodDatabaseCandidates] window.foodDBが未定義です');
            return [];
        }

        const candidates = [];

        // 類義語を考慮した検索名リストを生成
        let searchNames = [foodName];
        if (synonymMap[foodName]) {
            searchNames = searchNames.concat(synonymMap[foodName]);
        }

        // 🆕 キーワード抽出: 複合語を分解して検索範囲を広げる
        // 例: "鶏の唐揚げ" → ["鶏の唐揚げ", "鶏", "唐揚げ"]
        const extractedKeywords = [];
        searchNames.forEach(name => {
            // "の"で分割
            const parts = name.split('の');
            parts.forEach(part => {
                if (part.length >= 2 && !extractedKeywords.includes(part)) {
                    extractedKeywords.push(part);
                }
            });

            // "、"や"と"で分割
            const parts2 = name.split(/[、と]/);
            parts2.forEach(part => {
                if (part.length >= 2 && !extractedKeywords.includes(part)) {
                    extractedKeywords.push(part);
                }
            });

            // カッコを除去
            const cleaned = name.replace(/[（）\(\)]/g, '');
            if (cleaned !== name && cleaned.length >= 2 && !extractedKeywords.includes(cleaned)) {
                extractedKeywords.push(cleaned);
            }
        });

        searchNames = searchNames.concat(extractedKeywords);

        console.log(`[searchFoodDatabaseCandidates] 検索名リスト:`, searchNames);

        // 部分一致でスコアリング
        Object.keys(foodDB).forEach(category => {
            Object.keys(foodDB[category]).forEach(itemName => {
                const dbItem = foodDB[category][itemName];

                let matchScore = 0;
                let matchReason = '';

                // 完全一致
                if (searchNames.some(name => name === itemName)) {
                    matchScore = 100;
                    matchReason = '完全一致';
                }
                // 部分一致（含む）
                else if (searchNames.some(name => itemName.includes(name) || name.includes(itemName))) {
                    // マッチした文字列の長さに応じてスコアを調整
                    const matchingName = searchNames.find(name => itemName.includes(name) || name.includes(itemName));
                    const matchLength = matchingName.length;
                    if (matchLength >= 3) {
                        matchScore = 90;
                    } else if (matchLength === 2) {
                        matchScore = 70;
                    } else {
                        matchScore = 50;
                    }
                    matchReason = '部分一致';
                }
                // 文字列の類似度（簡易的に先頭一致・後方一致をチェック）
                else {
                    searchNames.forEach(name => {
                        if (itemName.startsWith(name) || name.startsWith(itemName)) {
                            matchScore = Math.max(matchScore, 80);
                            matchReason = '前方一致';
                        } else if (itemName.endsWith(name) || name.endsWith(itemName)) {
                            matchScore = Math.max(matchScore, 75);
                            matchReason = '後方一致';
                        }
                    });
                }

                if (matchScore > 0) {
                    candidates.push({
                        name: itemName,
                        category: category,
                        matchScore: matchScore,
                        matchReason: matchReason,
                        calories: dbItem.calories || 0,
                        protein: dbItem.protein || 0,
                        fat: dbItem.fat || 0,
                        carbs: dbItem.carbs || 0,
                        dbItem: dbItem  // 元のDBアイテムを保持
                    });
                }
            });
        });

        // 🆕 一致が少ない場合、カテゴリベースで関連アイテムを追加
        if (candidates.length < maxResults) {
            // 食材名から推測できるカテゴリキーワード
            const categoryKeywords = {
                '肉類': ['肉', '鶏', '豚', '牛', '鹿', 'ラム', 'ひき肉', 'ロース', 'バラ', 'もも', 'むね', 'ささみ', 'ヒレ', '唐揚げ', 'ステーキ', 'ハンバーグ'],
                '魚介類': ['魚', 'サーモン', 'サバ', 'マグロ', 'カツオ', '鮭', '刺身', '寿司', 'エビ', 'イカ', 'タコ', 'カキ', '貝', '缶詰'],
                '卵類': ['卵', 'たまご', 'エッグ', '目玉焼き', 'ゆで卵', '温泉卵', '卵焼き'],
                '主食': ['米', 'ご飯', 'パン', '麺', 'そば', 'うどん', 'ラーメン', 'パスタ', 'スパゲッティ'],
                '野菜': ['野菜', 'レタス', 'キャベツ', 'トマト', 'きゅうり', 'ほうれん草', 'ブロッコリー'],
                '調味料': ['ソース', '醤油', 'マヨネーズ', 'ドレッシング', '味噌', '塩', '砂糖']
            };

            const matchedCategory = Object.keys(categoryKeywords).find(cat =>
                categoryKeywords[cat].some(keyword =>
                    searchNames.some(name => name.includes(keyword))
                )
            );

            if (matchedCategory && foodDB[matchedCategory]) {
                console.log(`[searchFoodDatabaseCandidates] カテゴリベース検索: ${matchedCategory}`);

                const categoryItems = Object.keys(foodDB[matchedCategory]).slice(0, maxResults * 2).map(itemName => {
                    const dbItem = foodDB[matchedCategory][itemName];
                    return {
                        name: itemName,
                        category: matchedCategory,
                        matchScore: 40, // カテゴリ一致のスコア
                        matchReason: 'カテゴリ関連',
                        calories: dbItem.calories || 0,
                        protein: dbItem.protein || 0,
                        fat: dbItem.fat || 0,
                        carbs: dbItem.carbs || 0,
                        dbItem: dbItem
                    };
                });

                // 既存候補と重複しないものだけ追加
                categoryItems.forEach(item => {
                    if (!candidates.some(c => c.name === item.name)) {
                        candidates.push(item);
                    }
                });
            }
        }

        // スコア順にソート（降順）
        candidates.sort((a, b) => b.matchScore - a.matchScore);

        // 上位N件を返す
        const topCandidates = candidates.slice(0, maxResults);

        console.log(`[searchFoodDatabaseCandidates] 検索完了: ${foodName}`, {
            totalMatches: candidates.length,
            topCandidates: topCandidates.map(c => ({ name: c.name, score: c.matchScore, reason: c.matchReason }))
        });

        return topCandidates;
    };

    // 食品の量を調整（常にg単位で処理）
    const adjustAmount = (index, newAmount) => {
        setRecognizedFoods(prev => prev.map((food, i) => {
            if (i !== index) return food;

            // _baseから基準値を取得（100gあたり）
            const base = food._base || {
                calories: food.calories,
                protein: food.protein,
                fat: food.fat,
                carbs: food.carbs,
                servingSize: 100,
                servingUnit: 'g',
                unit: '100g'
            };

            // 常にg単位として100g換算で計算
            const ratio = newAmount / 100;

            return {
                ...food,
                amount: newAmount,  // g単位のまま
                unit: 'g',  // 単位を明示
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
        // 編集中の場合は編集状態をクリア
        if (editingFoodIndex === index) {
            setEditingFoodIndex(null);
            setOriginalFood(null);
        }
    };

    // 個別食品の量を更新（編集UI用）
    const updateFoodAmount = (foodIndex, newAmount) => {
        adjustAmount(foodIndex, newAmount);
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
    const confirmFoods = async () => {
        // ===== 全ての認識食材をカスタムアイテムとして自動保存 =====
        // データベース登録済み（八訂含む）も含めて全て保存
        const foodsToSave = recognizedFoods.filter(food =>
            // パッケージ情報は既存データベースにないため保存
            food.isPackageInfo ||
            // 未登録・失敗したものも保存
            food.isUnknown || food.hachiteiFailed || food.needsManualHachiteiFetch ||
            // 八訂から自動取得したものも保存（isHachitei=trueかつcategoryが八訂）
            (food.isHachitei && food.category === '八訂')
        );

        if (foodsToSave.length > 0) {
            console.log(`[confirmFoods] 認識食材をカスタムアイテムとして自動保存: ${foodsToSave.length}件`, foodsToSave.map(f => f.name));

            for (const food of foodsToSave) {
                try {
                    // _base（100gあたり）がある場合はそれを使用、なければ現在の値を使用
                    const base = food._base || {
                        calories: food.calories || 0,
                        protein: food.protein || 0,
                        fat: food.fat || 0,
                        carbs: food.carbs || 0,
                        servingSize: 100,
                        servingUnit: 'g'
                    };

                    // itemTypeとcustomLabelを決定
                    let itemType = 'food';  // デフォルト
                    let customLabel = 'カスタム食材';  // 表示用ラベル
                    if (food.itemType === 'meal') {
                        customLabel = 'カスタム料理';
                        itemType = 'recipe';
                    } else if (food.itemType === 'supplement') {
                        customLabel = 'カスタムサプリ';
                        itemType = 'supplement';
                    }

                    // 実際のカテゴリ（検索フィルタ用）を決定
                    // データベースマッチしたものはfood.categoryに肉類などが入っている
                    // 未知のものはデフォルトで'その他'
                    let actualCategory = food.category || 'その他';

                    // サプリメントの場合は特殊処理
                    if (itemType === 'supplement') {
                        actualCategory = food.category || 'サプリメント';
                    }

                    // 100gあたりの値を保存（実量換算前の基準値）
                    const customFood = {
                        name: food.name.split('（')[0], // 括弧を除去
                        category: actualCategory,  // 検索フィルタリング用の実際のカテゴリ
                        customLabel: customLabel,  // 表示用ラベル（カスタム食材など）
                        isCustom: true,  // カスタムアイテムフラグ
                        itemType: itemType,  // 設定画面でのフィルタリング用
                        calories: base.calories || 0,
                        protein: base.protein || 0,
                        fat: base.fat || 0,
                        carbs: base.carbs || 0,
                        servingSize: 100,
                        servingUnit: 'g',
                        // ビタミン・ミネラル（foodオブジェクトから取得）
                        vitamins: food.vitamins || {},
                        minerals: food.minerals || {},
                        otherNutrients: food.otherNutrients || [],
                        createdAt: new Date().toISOString()
                    };

                    // Firestoreに保存
                    const currentUser = firebase.auth().currentUser;
                    if (currentUser) {
                        const customFoodsRef = firebase.firestore()
                            .collection('users')
                            .doc(currentUser.uid)
                            .collection('customFoods')
                            .doc(customFood.name);

                        await customFoodsRef.set(customFood, { merge: true });
                        console.log(`[confirmFoods] カスタムアイテムを保存: ${customFood.name} (${itemType})`);

                        // stateも更新（即座に反映）
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
                    console.error(`[confirmFoods] カスタムアイテム保存エラー (${food.name}):`, error);
                }
            }
        }

        // ===== 直接dailyRecordsに保存 =====

        // 食事IDを生成（タイムスタンプ）
        const mealId = `meal_${Date.now()}`;
        const now = new Date();
        const timestamp = now.toISOString();

        // 認識された食材を食事アイテムに変換（g単位統一）
        // ※ _baseから実量の栄養素を再計算（編集内容を反映）
        const foodItems = recognizedFoods.map(food => {
            const base = food._base || {
                calories: food.calories || 0,
                protein: food.protein || 0,
                fat: food.fat || 0,
                carbs: food.carbs || 0,
                servingSize: 100
            };

            // 実量に換算（_baseは100gあたり）
            const amount = food.amount || 100;
            const ratio = amount / 100;

            // ビタミン・ミネラルの実量換算
            const vitamins = {};
            const minerals = {};

            if (food.vitamins) {
                Object.keys(food.vitamins).forEach(key => {
                    vitamins[key] = parseFloat(((food.vitamins[key] || 0) * ratio).toFixed(2));
                });
            }

            if (food.minerals) {
                Object.keys(food.minerals).forEach(key => {
                    minerals[key] = parseFloat(((food.minerals[key] || 0) * ratio).toFixed(2));
                });
            }

            return {
                name: food.name,
                amount: amount,  // 常にg単位
                unit: 'g',  // 単位を明示
                // PFCは100g基準で保存（手動記録と統一）
                calories: base.calories,
                protein: base.protein,
                fat: base.fat,
                carbs: base.carbs,
                servingSize: base.servingSize || 100,
                servingUnit: base.servingUnit || 'g',
                category: food.category || 'その他',
                // ビタミン・ミネラルは実量換算済み（既存の仕様を維持）
                vitamins: vitamins,
                minerals: minerals,
                otherNutrients: food.otherNutrients || []
            };
        });

        // 合計カロリーとPFC計算（itemは100g基準なのでratio適用）
        const totalCalories = Math.round(foodItems.reduce((sum, item) => {
            const ratio = item.amount / 100;
            return sum + (item.calories || 0) * ratio;
        }, 0));
        const totalProtein = parseFloat(foodItems.reduce((sum, item) => {
            const ratio = item.amount / 100;
            return sum + (item.protein || 0) * ratio;
        }, 0).toFixed(1));
        const totalFat = parseFloat(foodItems.reduce((sum, item) => {
            const ratio = item.amount / 100;
            return sum + (item.fat || 0) * ratio;
        }, 0).toFixed(1));
        const totalCarbs = parseFloat(foodItems.reduce((sum, item) => {
            const ratio = item.amount / 100;
            return sum + (item.carbs || 0) * ratio;
        }, 0).toFixed(1));


        // 食事データを作成
        const mealData = {
            id: mealId,
            type: 'meal',
            name: mealName,  // ユーザーが編集可能な食事名
            mealType: 'その他',  // 固定値
            timestamp: timestamp,
            time: now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),  // 時刻を追加
            items: foodItems,
            totalCalories: totalCalories,  // 合計カロリーを追加
            calories: totalCalories,  // 互換性のため
            protein: totalProtein,  // 合計たんぱく質を追加
            fat: totalFat,  // 合計脂質を追加
            carbs: totalCarbs,  // 合計炭水化物を追加
            memo: 'AI食事認識で追加'
        };

        try {
            // 日付の決定：selectedDateがあればそれを使用、なければ今日
            const todayString = getTodayString();
            const dateKey = selectedDate || todayString;

            // Firestoreに保存
            const currentUser = user || firebase.auth().currentUser;

            if (!currentUser) {
                throw new Error('ユーザー情報が取得できません');
            }

            const dailyRecordRef = firebase.firestore()
                .collection('dailyRecords')
                .doc(currentUser.uid)
                .collection('records')
                .doc(dateKey);

            await dailyRecordRef.set({
                meals: firebase.firestore.FieldValue.arrayUnion(mealData)
            }, { merge: true });

            // Toastで通知
            toast.success(`${foodItems.length}件の食材を記録しました`);

            // モーダルを閉じる
            onClose();

            // ダッシュボード更新イベントを発火
            window.dispatchEvent(new CustomEvent('recordUpdated', {
                detail: { type: 'meal', date: dateKey }
            }));

        } catch (error) {
            console.error('[confirmFoods] dailyRecords保存エラー:', error);
            toast.error('保存に失敗しました');
        }
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
                <div className="sticky top-0 text-white p-4 rounded-t-2xl flex justify-between items-center z-10" style={{ backgroundColor: '#4A9EFF' }}>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Icon name="Camera" size={20} />
                        写真解析
                    </h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowInfoModal(true)}
                            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition"
                            title="使い方"
                        >
                            <Icon name="HelpCircle" size={20} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition"
                        >
                            <Icon name="X" size={20} />
                        </button>
                    </div>
                </div>

                {/* 選択画像のサムネイル表示（ヘッダー直下） */}
                {imagePreview && recognizedFoods.length > 0 && (
                    <div className="border-b border-gray-200 bg-gray-50 p-3">
                        <div className="flex items-center gap-3">
                            <img
                                src={imagePreview}
                                alt="選択した食事の写真"
                                className="w-20 h-20 object-cover rounded-lg border-2 border-gray-300 shadow-sm"
                            />
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-600">選択した写真</p>
                                <p className="text-xs text-gray-600">認識結果と照らし合わせてご確認ください</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 食事名編集セクション */}
                {recognizedFoods.length > 0 && (
                    <div className="border-b border-gray-200 bg-white p-4">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                            食事名
                        </label>
                        <input
                            type="text"
                            value={mealName}
                            onChange={(e) => setMealName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            placeholder="食事名を入力"
                        />
                    </div>
                )}

                <div className="p-6 space-y-6">
                    {/* 画像選択 */}
                    {!imagePreview && (
                        <div className="space-y-3">
                            {/* カメラで撮影ボタン */}
                            <div className="border-2 border-gray-300 rounded-xl overflow-hidden hover:border-sky-400 transition">
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handleImageSelect}
                                    className="hidden"
                                    id="food-image-camera"
                                />
                                <label htmlFor="food-image-camera" className="cursor-pointer block bg-sky-50 hover:bg-sky-100 transition p-6 text-center">
                                    <Icon name="Camera" size={48} className="mx-auto mb-3 text-sky-600" />
                                    <p className="text-base font-bold text-sky-700 mb-1">
                                        📷 カメラで撮影
                                    </p>
                                    <p className="text-xs text-sky-600">
                                        その場で食事を撮影して記録
                                    </p>
                                </label>
                            </div>

                            {/* ギャラリーから選択ボタン */}
                            <div className="border-2 border-gray-300 rounded-xl overflow-hidden hover:border-gray-400 transition">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                    className="hidden"
                                    id="food-image-gallery"
                                />
                                <label htmlFor="food-image-gallery" className="cursor-pointer block bg-gray-50 hover:bg-gray-100 transition p-6 text-center">
                                    <Icon name="Image" size={48} className="mx-auto mb-3 text-gray-600" />
                                    <p className="text-base font-bold text-gray-600 mb-1">
                                        🖼️ ギャラリーから選択
                                    </p>
                                    <p className="text-xs text-gray-600">
                                        保存済みの写真から選択
                                    </p>
                                </label>
                            </div>
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
                                className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-bold py-4 rounded-xl hover:from-amber-600 hover:to-yellow-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {recognizing ? (
                                    <>
                                        <Icon name="Loader" size={20} className="animate-spin" />
                                        {recognizingMessage}
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
                                        onEdit={(foodIndex) => {
                                            setEditingFoodIndex(foodIndex);
                                            // 食品オブジェクト全体を保存（ディープコピー）
                                            setOriginalFood({...recognizedFoods[foodIndex]});
                                        }}
                                        onOpenCustomCreator={(foodData) => {
                                            if (onOpenCustomCreator) {
                                                onOpenCustomCreator(foodData, (updatedData) => {
                                                    // カスタム登録完了時のコールバック
                                                    updateRecognizedFood(food.name, updatedData);
                                                });
                                            }
                                        }}
                                        manualFetchHachitei={manualFetchHachitei}
                                        selectHachiteiCandidate={selectHachiteiCandidate}
                                        selectFoodDatabaseCandidate={selectFoodDatabaseCandidate}
                                        isEditing={editingFoodIndex === index}
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
                                        <label className="block text-sm font-medium text-gray-600 mb-2">
                                            食材を検索して追加
                                        </label>
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => searchIngredients(e.target.value)}
                                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                                                            <p className="text-xs text-gray-600">{food.category}</p>
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
                                        <div className="text-center py-4 text-gray-600 text-sm">
                                            <p>「{searchQuery}」に一致する食材が見つかりませんでした</p>
                                            <p className="text-xs mt-1">別のキーワードで検索してください</p>
                                        </div>
                                    )}

                                    <div className="bg-blue-100 border border-blue-300 rounded-lg p-3">
                                        <p className="text-xs text-blue-800">
                                            <Icon name="HelpCircle" size={14} className="inline mr-1" />
                                            AIが認識できなかった食材を手動で追加できます
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* 固定位置の調整UIパネル */}
                            {editingFoodIndex !== null && recognizedFoods[editingFoodIndex] && (() => {
                                const selectedFood = recognizedFoods[editingFoodIndex];
                                const base = selectedFood._base || {
                                    servingSize: 100,
                                    servingUnit: 'g',
                                    unit: '100g'
                                };
                                const unit = base.unit === '1個' ? '個' : base.unit === '本' ? '本' : 'g';
                                const isCountUnit = ['個', '本', '杯', '枚'].some(u => unit.includes(u));
                                const stepOptions = isCountUnit ? [1, 2, 3, 5, 10] : [1, 5, 10, 50, 100];

                                return (
                                    <div className="fixed left-0 right-0 bg-white border-t-2 border-gray-300 shadow-2xl p-4 z-[9998]" style={{bottom: '200px'}}>
                                        <div className="max-w-md mx-auto">
                                            <div className="text-sm text-gray-800 font-semibold mb-3 text-center">
                                                {selectedFood.name} の量を調整
                                            </div>

                                            {/* 数値入力欄 */}
                                            <div className="flex items-center justify-center gap-2 mb-3">
                                                <input
                                                    type="number"
                                                    value={selectedFood.amount === 0 ? '0' : (selectedFood.amount || '')}
                                                    onChange={(e) => {
                                                        // onChange: 文字列として保存（入力中は変換しない）
                                                        const updatedFoods = [...recognizedFoods];
                                                        updatedFoods[editingFoodIndex] = {
                                                            ...updatedFoods[editingFoodIndex],
                                                            amount: e.target.value
                                                        };
                                                        setRecognizedFoods(updatedFoods);
                                                    }}
                                                    onBlur={(e) => {
                                                        // onBlur: 数値に変換して栄養素を再計算
                                                        const val = e.target.value.trim();
                                                        let newAmount = 0;
                                                        if (val !== '' && val !== '.') {
                                                            const num = parseFloat(val);
                                                            newAmount = isNaN(num) ? 0 : num;
                                                        }
                                                        updateFoodAmount(editingFoodIndex, newAmount);
                                                    }}
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
                                                {/* ×0.5 */}
                                                <button
                                                    onClick={() => updateFoodAmount(editingFoodIndex, Math.max(0, selectedFood.amount * 0.5))}
                                                    className="h-12 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition text-sm font-bold"
                                                >
                                                    ×0.5
                                                </button>

                                                {/* - */}
                                                <button
                                                    onClick={() => updateFoodAmount(editingFoodIndex, Math.max(0, selectedFood.amount - adjustmentStep))}
                                                    className="h-12 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition font-bold flex items-center justify-center"
                                                >
                                                    <Icon name="Minus" size={22} />
                                                </button>

                                                {/* + */}
                                                <button
                                                    onClick={() => updateFoodAmount(editingFoodIndex, selectedFood.amount + adjustmentStep)}
                                                    className="h-12 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition font-bold flex items-center justify-center"
                                                >
                                                    <Icon name="Plus" size={22} />
                                                </button>

                                                {/* ×2 */}
                                                <button
                                                    onClick={() => updateFoodAmount(editingFoodIndex, selectedFood.amount * 2)}
                                                    className="h-12 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition text-sm font-bold"
                                                >
                                                    ×2
                                                </button>
                                            </div>

                                            {/* キャンセル・更新ボタン */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={() => {
                                                        // 元の食品オブジェクト全体を復元
                                                        if (originalFood !== null) {
                                                            setRecognizedFoods(prev => prev.map((food, i) =>
                                                                i === editingFoodIndex ? originalFood : food
                                                            ));
                                                        }
                                                        setEditingFoodIndex(null);
                                                        setOriginalFood(null);
                                                    }}
                                                    className="py-3 bg-gray-200 text-gray-600 rounded-lg font-semibold hover:bg-gray-300 transition"
                                                >
                                                    キャンセル
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEditingFoodIndex(null);
                                                        setOriginalFood(null);
                                                    }}
                                                    className="py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                                                >
                                                    確定
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setRecognizedFoods([]);
                                        setImagePreview(null);
                                        setSelectedImage(null);
                                    }}
                                    className="flex-1 bg-gray-200 text-gray-600 font-bold py-3 rounded-lg hover:bg-gray-300 transition"
                                >
                                    やり直す
                                </button>
                                <button
                                    onClick={confirmFoods}
                                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 transition"
                                >
                                    確定して記録
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
                        <div className="sticky top-0 text-white p-4 rounded-t-2xl flex justify-between items-center z-10" style={{ backgroundColor: '#4A9EFF' }}>
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Icon name="Camera" size={20} />
                                写真解析の使い方
                            </h3>
                            <button
                                onClick={() => setShowInfoModal(false)}
                                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition"
                            >
                                <Icon name="X" size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* 写真解析機能の説明 */}
                            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-4">
                                <h4 className="font-bold text-blue-900 text-base flex items-center gap-2 mb-3">
                                    <Icon name="Sparkles" size={18} style={{ color: '#4A9EFF' }} />
                                    写真解析でできること
                                </h4>
                                <ul className="space-y-2 text-sm text-blue-800">
                                    <li className="flex items-start gap-2">
                                        <Icon name="Check" size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#4A9EFF' }} />
                                        <span>食事の写真から<strong>AIが自動で食材を認識</strong></span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Icon name="Check" size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#4A9EFF' }} />
                                        <span>食材ごとの<strong>量・カロリー・PFC（たんぱく質・脂質・炭水化物）を自動推定</strong></span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Icon name="Check" size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#4A9EFF' }} />
                                        <span>データベースと照合して<strong>ビタミン・ミネラルも自動取得</strong></span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Icon name="Check" size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#4A9EFF' }} />
                                        <span>複数の候補から<strong>最適な食材を選択可能</strong></span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Icon name="Check" size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#4A9EFF' }} />
                                        <span>認識結果を<strong>自由に編集・調整</strong>できる</span>
                                    </li>
                                </ul>
                            </div>

                            {/* 全フローの説明 */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                    <Icon name="Zap" size={20} style={{ color: '#4A9EFF' }} />
                                    解析から記録までの流れ
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3 bg-blue-50 p-3 rounded-lg">
                                        <div className="flex-shrink-0 w-8 h-8 text-white rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: '#4A9EFF' }}>1</div>
                                        <div>
                                            <p className="font-semibold text-gray-800">写真を撮影または選択</p>
                                            <p className="text-sm text-gray-600 mt-1">食事の写真をカメラで撮影、またはギャラリーから選択します。</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 bg-blue-50 p-3 rounded-lg">
                                        <div className="flex-shrink-0 w-8 h-8 text-white rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: '#4A9EFF' }}>2</div>
                                        <div>
                                            <p className="font-semibold text-gray-800">AIが自動で食材を認識・解析</p>
                                            <p className="text-sm text-gray-600 mt-1">「AIで食品を認識」ボタンを押すと、AIが写真から食材を自動で検出し、量とカロリー・PFCを推定します。</p>
                                            <div className="mt-2 bg-blue-100 border border-blue-300 rounded p-2">
                                                <p className="text-xs text-blue-900 font-semibold mb-1 flex items-center gap-1">
                                                    <Icon name="Loader" size={12} className="animate-spin" />
                                                    解析中の表示について
                                                </p>
                                                <p className="text-xs text-blue-800">
                                                    解析中は各食材カードに「🔄 データベースから栄養情報を取得中...」と表示されます。この間、より詳細な栄養情報（ビタミン・ミネラル含む）を検索しています。通常10秒程度で完了します。
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 bg-blue-50 p-3 rounded-lg">
                                        <div className="flex-shrink-0 w-8 h-8 text-white rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: '#4A9EFF' }}>3</div>
                                        <div>
                                            <p className="font-semibold text-gray-800">候補から最適な食材を選択（必要に応じて）</p>
                                            <p className="text-sm text-gray-600 mt-1">データベース検索が完了すると、各食材に「八訂候補」「データベース候補」が表示される場合があります。</p>
                                            <div className="mt-2 space-y-2">
                                                <div className="bg-blue-100 border border-blue-300 rounded p-2">
                                                    <p className="text-xs text-blue-900 font-semibold mb-1 flex items-center gap-1">
                                                        <Icon name="Info" size={12} />
                                                        八訂候補（日本食品標準成分表）
                                                    </p>
                                                    <p className="text-xs text-blue-800">
                                                        公式の食品成分表から最大5件の候補を表示。マッチ度（%）が高いほど類似しています。「この候補を選択」ボタンで詳細な栄養情報に置き換えられます。
                                                    </p>
                                                </div>
                                                <div className="bg-green-100 border border-green-300 rounded p-2">
                                                    <p className="text-xs text-green-900 font-semibold mb-1 flex items-center gap-1">
                                                        <Icon name="Database" size={12} />
                                                        データベース候補（内蔵データベース）
                                                    </p>
                                                    <p className="text-xs text-green-800">
                                                        アプリ内蔵のデータベースから最大5件の候補を表示。カテゴリ、栄養素、マッチ度を確認して選択できます。カテゴリ関連の候補も表示されるので、より柔軟に選択できます。
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 bg-blue-50 p-3 rounded-lg">
                                        <div className="flex-shrink-0 w-8 h-8 text-white rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: '#4A9EFF' }}>4</div>
                                        <div>
                                            <p className="font-semibold text-gray-800">認識結果を確認・調整</p>
                                            <p className="text-sm text-gray-600 mt-1">認識された食材の名前、量、栄養素を確認します。数量を調整したり、不要な食材を削除できます。</p>
                                            <p className="text-xs text-gray-600 mt-2">💡 認識された食材は自動的にカスタムアイテムとして保存され、次回から「食材を検索」の「カスタム」タブで簡単に使用できます。</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 bg-blue-50 p-3 rounded-lg">
                                        <div className="flex-shrink-0 w-8 h-8 text-white rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: '#4A9EFF' }}>5</div>
                                        <div>
                                            <p className="font-semibold text-gray-800">必要に応じて食材を追加</p>
                                            <p className="text-sm text-gray-600 mt-1">AIが見逃した食材は「食材を手動で追加」ボタンから追加できます。</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 bg-blue-50 p-3 rounded-lg">
                                        <div className="flex-shrink-0 w-8 h-8 text-white rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: '#4A9EFF' }}>6</div>
                                        <div>
                                            <p className="font-semibold text-gray-800">「確定して記録」で記録完了</p>
                                            <p className="text-sm text-gray-600 mt-1">内容を確認したら「確定して記録」ボタンを押して、食事に追加します。</p>
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
                                    <Icon name="Wrench" size={20} style={{ color: '#4A9EFF' }} />
                                    未登録食材の対処法
                                </h4>
                                <div className="space-y-2">
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                        <p className="font-semibold text-blue-900 mb-1 flex items-center gap-2">
                                            <Icon name="Search" size={16} />
                                            方法1: 「もしかして」候補から選択
                                        </p>
                                        <p className="text-sm text-blue-800">
                                            AIが認識した名前に似た食材を最大3つ提案します。類似度が表示されるので、正しい食材をタップして置き換えできます。
                                        </p>
                                    </div>
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                        <p className="font-semibold text-blue-900 mb-1 flex items-center gap-2">
                                            <Icon name="Plus" size={16} />
                                            方法2: カスタム食材として登録
                                        </p>
                                        <p className="text-sm text-blue-800">
                                            「カスタム食材として登録」ボタンを押して、栄養素を手動で入力します。一度登録すると、次回から簡単に使用できます。
                                        </p>
                                    </div>
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                        <p className="font-semibold text-blue-900 mb-1 flex items-center gap-2">
                                            <Icon name="Trash2" size={16} />
                                            方法3: 削除する
                                        </p>
                                        <p className="text-sm text-blue-800">
                                            不要な食材や誤認識の場合は、×ボタンで削除できます。
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* カスタム登録の方法 */}
                            <div className="space-y-3">
                                <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                    <Icon name="Edit" size={20} style={{ color: '#4A9EFF' }} />
                                    カスタム食材の登録方法
                                </h4>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                                    <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                                        <li><strong>「カスタム食材として登録」ボタンをタップ</strong></li>
                                        <li><strong>食材名を確認・編集</strong>（必要に応じて修正）</li>
                                        <li><strong>基本栄養素を入力</strong>:
                                            <ul className="ml-6 mt-1 space-y-1 list-disc list-inside">
                                                <li>カロリー（kcal）</li>
                                                <li>たんぱく質（g）</li>
                                                <li>脂質（g）</li>
                                                <li>炭水化物（g）</li>
                                            </ul>
                                        </li>
                                        <li><strong>ビタミン・ミネラル（オプション）</strong>:
                                            <ul className="ml-6 mt-1 space-y-1 list-disc list-inside">
                                                <li>データベースにマッチした食材は自動で取得されます</li>
                                                <li>未登録食材は手動で入力できます</li>
                                                <li>ビタミン13種類、ミネラル13種類に対応</li>
                                            </ul>
                                        </li>
                                        <li><strong>数量を設定</strong>（グラム数や個数）</li>
                                        <li><strong>「登録」ボタンで完了</strong></li>
                                    </ol>
                                    <div className="mt-3 bg-blue-100 border border-blue-300 rounded p-3">
                                        <p className="text-xs text-blue-900 font-semibold flex items-center gap-1 mb-1">
                                            <Icon name="Sparkles" size={14} />
                                            カスタムアイテムの管理
                                        </p>
                                        <p className="text-xs text-blue-800">
                                            登録したカスタム食材は「設定」→「データ管理」→「カスタムアイテム管理」から編集・削除できます。
                                            また、「食材を検索」の「カスタム」タブからすべてのカスタムアイテムを確認できます。
                                        </p>
                                    </div>
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
                                        <div className="bg-white rounded p-2 text-xs text-gray-600 border border-blue-300">
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
                                    className="w-full bg-gray-200 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-300 transition"
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
const FoodItemTag = ({ food, foodIndex, onAmountChange, onRemove, onEdit, onReplace, onOpenCustomCreator, manualFetchHachitei, selectHachiteiCandidate, selectFoodDatabaseCandidate, isEditing }) => {
    const [isNutritionEditExpanded, setIsNutritionEditExpanded] = useState(false); // 栄養素編集の展開状態

    // すべての食品に対して候補を検索（上位3つ）
    const [suggestions, setSuggestions] = useState([]);
    useEffect(() => {
        // isUnknown フラグに関係なく、全ての食品に候補を提示
        const matches = findTopMatches(food.name, 3);
        setSuggestions(matches);
    }, [food.name]);

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
    // food.amountを直接使用（ローカルstateは使わない）
    let ratio;
    if (base.unit === '1個' || base.unit === '本') {
        // 特殊単位の場合: amount(g) ÷ servingSize(g/個) = 個数
        ratio = food.amount / (base.servingSize || 1);
    } else {
        // 通常単位（100gあたり）の場合: amount(g) ÷ 100
        ratio = food.amount / 100;
    }

    const nutrients = {
        calories: Math.round(base.calories * ratio),
        protein: (base.protein * ratio).toFixed(1),
        fat: (base.fat * ratio).toFixed(1),
        carbs: (base.carbs * ratio).toFixed(1)
    };

    // 量を変更してリアルタイム反映
    const handleAmountChange = (newAmount) => {
        onAmountChange(newAmount);
    };

    // クイック調整ボタン
    const adjustAmount = (delta) => {
        const newAmount = Math.max(0, food.amount + delta);
        handleAmountChange(newAmount);
    };

    // 背景色と枠線の決定
    let bgClass = 'bg-white border-gray-200';
    let badgeClass = null;
    let badgeText = null;
    let badgeIcon = null;

    // 優先順位: 取得待機中 > パッケージ情報 > 八訂自動取得 > 未登録食材
    if (food.needsManualHachiteiFetch && !food.isFetchingHachitei) {
        // 八訂取得待機中（グレー）- 順次取得キューに入っているが、まだ取得されていない
        bgClass = 'bg-gray-50 border-gray-300';
        badgeClass = 'bg-gray-500 text-white';
        badgeText = '取得待機中';
        badgeIcon = 'Clock';
    } else if (food.isPackageInfo) {
        // パッケージ情報（緑）
        bgClass = 'bg-green-50 border-green-300';
        badgeClass = 'bg-green-500 text-white';
        badgeText = 'パッケージ情報';
        badgeIcon = 'Package';
    } else if (food.isHachitei) {
        // 八訂自動取得（青）
        bgClass = 'bg-blue-50 border-blue-300';
        badgeClass = 'bg-blue-500 text-white';
        badgeText = '八訂自動取得';
        badgeIcon = 'Database';
    } else if (food.isUnknown || food.hachiteiFailed) {
        // 未登録または八訂取得失敗（黄）
        bgClass = 'bg-yellow-50 border-yellow-300';
        badgeClass = 'bg-yellow-500 text-white';
        badgeText = '未登録食材';
        badgeIcon = 'AlertTriangle';
    }

    return (
        <div className={`border-2 rounded-xl p-4 transition ${bgClass} ${food.isFetchingHachitei ? 'opacity-75' : ''}`}>
            {/* ヘッダー部分 */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-bold text-base">{food.name}</h4>
                        {food.isFetchingHachitei ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 bg-blue-500 text-white animate-pulse">
                                <Icon name="Loader" size={12} className="animate-spin" />
                                検索中...
                            </span>
                        ) : badgeClass && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${badgeClass}`}>
                                <Icon name={badgeIcon} size={12} />
                                {badgeText}
                            </span>
                        )}
                    </div>
                    {food.category && (
                        <p className="text-xs text-gray-600">{food.category}</p>
                    )}
                    {/* 量表示 */}
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm font-semibold text-gray-600">
                            量: {food.amount} {base.unit === '1個' ? '個' : base.unit === '本' ? '本' : 'g'}
                        </span>
                    </div>
                    {/* 信頼度とマッチスコア表示 */}
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                        {food.confidence && (
                            <span className="flex items-center gap-1">
                                <Icon name="Target" size={12} />
                                信頼度: {Math.round(food.confidence * 100)}%
                            </span>
                        )}
                        {food.isHachitei && food.hachiteiMatchScore && (
                            <span className="flex items-center gap-1">
                                <Icon name="Star" size={12} />
                                マッチ度: {food.hachiteiMatchScore}%
                            </span>
                        )}
                    </div>
                </div>
                {/* 編集・削除ボタン */}
                <div className="flex items-center gap-2 ml-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onEdit) onEdit(foodIndex);
                        }}
                        className="min-w-[44px] min-h-[44px] rounded-lg bg-white shadow-md flex items-center justify-center text-[#4A9EFF] hover:bg-blue-50 transition border-2 border-[#4A9EFF]"
                        title="編集"
                    >
                        <Icon name="Edit" size={18} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove();
                        }}
                        className="min-w-[44px] min-h-[44px] rounded-lg bg-white shadow-md flex items-center justify-center text-red-600 hover:bg-red-50 transition border-2 border-red-500"
                        title="削除"
                    >
                        <Icon name="Trash2" size={18} />
                    </button>
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
                    calories: Math.floor(food._base.calories || 0),  // 小数点以下切り捨て
                    protein: food._base.protein || 0,
                    fat: food._base.fat || 0,
                    carbs: food._base.carbs || 0
                } : {
                    calories: Math.floor((food.calories || 0) / (food.amount || 100) * 100),  // 小数点以下切り捨て
                    protein: parseFloat(((food.protein || 0) / (food.amount || 100) * 100).toFixed(1)),
                    fat: parseFloat(((food.fat || 0) / (food.amount || 100) * 100).toFixed(1)),
                    carbs: parseFloat(((food.carbs || 0) / (food.amount || 100) * 100).toFixed(1))
                };

                return (
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <div className="grid grid-cols-4 gap-3 text-center">
                            <div>
                                <p className="text-xs text-gray-600">カロリー</p>
                                <p className="text-sm font-bold text-blue-600">{baseNutrients.calories}kcal</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-600">P</p>
                                <p className="text-sm font-bold text-red-500">{baseNutrients.protein.toFixed(1)}g</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-600">F</p>
                                <p className="text-sm font-bold text-yellow-500">{baseNutrients.fat.toFixed(1)}g</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-600">C</p>
                                <p className="text-sm font-bold text-green-500">{baseNutrients.carbs.toFixed(1)}g</p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-600 text-center mt-1">{perServingLabel}</p>
                    </div>
                );
            })()}

            {/* 摂取量表示 */}
            {!food.isUnknown && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-600 mb-2 font-medium">摂取量</p>
                    <div className="grid grid-cols-4 gap-3 text-center">
                        <div className="bg-sky-50 rounded-lg p-2">
                            <p className="text-xs text-gray-600">カロリー</p>
                            <p className="text-base font-bold text-blue-600">{nutrients.calories}kcal</p>
                        </div>
                        <div className="bg-red-50 rounded-lg p-2">
                            <p className="text-xs text-gray-600">P</p>
                            <p className="text-base font-bold text-red-500">{nutrients.protein}g</p>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-2">
                            <p className="text-xs text-gray-600">F</p>
                            <p className="text-base font-bold text-yellow-500">{nutrients.fat}g</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-2">
                            <p className="text-xs text-gray-600">C</p>
                            <p className="text-base font-bold text-green-500">{nutrients.carbs}g</p>
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

            {/* パッケージ情報の詳細表示 */}
            {food.isPackageInfo && food.packageWeight && (
                <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                        <Icon name="Package" size={14} className="text-green-600" />
                        <span className="text-xs font-semibold text-green-800">パッケージ情報</span>
                    </div>
                    <div className="space-y-1 text-xs text-green-700">
                        <p>内容量: {food.packageWeight}g</p>
                        <p>栄養成分表示: {food.nutritionPer || 100}gあたり</p>
                    </div>
                </div>
            )}

            {/* 八訂候補の展開可能表示 */}
            {food.isHachitei && food.hachiteiCandidates && food.hachiteiCandidates.length > 0 && (
                <div className="mt-3">
                    <details className="bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
                        <summary className="px-3 py-2 cursor-pointer hover:bg-blue-100 transition flex items-center justify-between text-sm font-medium text-blue-800">
                            <span className="flex items-center gap-2">
                                <Icon name="Info" size={14} />
                                八訂候補を見る（{food.hachiteiCandidates.length}件）
                            </span>
                            <Icon name="ChevronDown" size={14} />
                        </summary>
                        <div className="px-3 py-2 space-y-1.5">
                            {food.hachiteiCandidates.map((candidate, idx) => (
                                <div key={idx} className="bg-white rounded-lg p-2 text-xs border border-gray-200">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium text-gray-800">{candidate.name}</span>
                                        <span className="text-blue-600 font-semibold">マッチ度: {candidate.matchScore}%</span>
                                    </div>
                                    <p className="text-gray-600 text-xs mb-2">{candidate.matchReason}</p>
                                    <button
                                        onClick={() => selectHachiteiCandidate(foodIndex, candidate.name)}
                                        disabled={food.isSelectingCandidate}
                                        className={`w-full text-white text-xs font-semibold py-1.5 rounded transition flex items-center justify-center gap-1 ${
                                            food.isSelectingCandidate
                                                ? 'bg-gray-400 cursor-not-allowed'
                                                : 'bg-blue-600 hover:bg-blue-700'
                                        }`}
                                    >
                                        {food.isSelectingCandidate ? (
                                            <>
                                                <Icon name="Loader" size={12} className="animate-spin" />
                                                取得中...
                                            </>
                                        ) : (
                                            <>
                                                <Icon name="Check" size={12} />
                                                この候補を選択
                                            </>
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </details>
                </div>
            )}

            {/* foodDatabase候補の展開可能表示 */}
            {food.foodDatabaseCandidates && food.foodDatabaseCandidates.length > 0 && (
                <div className="mt-3">
                    <details className="bg-green-50 border border-green-200 rounded-lg overflow-hidden">
                        <summary className="px-3 py-2 cursor-pointer hover:bg-green-100 transition flex items-center justify-between text-sm font-medium text-green-800">
                            <span className="flex items-center gap-2">
                                <Icon name="Database" size={14} />
                                データベース候補を見る（{food.foodDatabaseCandidates.length}件）
                            </span>
                            <Icon name="ChevronDown" size={14} />
                        </summary>
                        <div className="px-3 py-2 space-y-1.5">
                            {food.foodDatabaseCandidates.map((candidate, idx) => (
                                <div key={idx} className="bg-white rounded-lg p-2 text-xs border border-gray-200">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium text-gray-800">{candidate.name}</span>
                                        <span className="text-green-600 font-semibold">マッチ度: {candidate.matchScore}%</span>
                                    </div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-gray-500 text-xs">{candidate.category}</span>
                                        <span className="text-gray-600 text-xs">{candidate.matchReason}</span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-1 mb-2 text-xs text-gray-600">
                                        <div className="text-center">
                                            <p className="text-gray-500">Cal</p>
                                            <p className="font-semibold">{candidate.calories}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-gray-500">P</p>
                                            <p className="font-semibold">{candidate.protein.toFixed(1)}g</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-gray-500">F</p>
                                            <p className="font-semibold">{candidate.fat.toFixed(1)}g</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-gray-500">C</p>
                                            <p className="font-semibold">{candidate.carbs.toFixed(1)}g</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => selectFoodDatabaseCandidate(foodIndex, candidate)}
                                        className="w-full bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-1.5 rounded transition flex items-center justify-center gap-1"
                                    >
                                        <Icon name="Check" size={12} />
                                        この候補を選択
                                    </button>
                                </div>
                            ))}
                        </div>
                    </details>
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

                    {/* 手動八訂検索ボタン（needsManualHachiteiFetchまたはhachiteiFailed の場合） */}
                    {(food.needsManualHachiteiFetch || food.hachiteiFailed) && !food.isFetchingHachitei && (
                        <button
                            onClick={() => manualFetchHachitei(foodIndex)}
                            className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold py-3 rounded-lg hover:from-blue-600 hover:to-indigo-600 transition flex items-center justify-center gap-2 mb-2"
                        >
                            <Icon name="Search" size={18} />
                            {food.hachiteiFailed ? '栄養素を再検索' : '栄養素を自動検索'}
                        </button>
                    )}

                    {/* 八訂検索中のローディング */}
                    {food.isFetchingHachitei && (
                        <div className="w-full bg-blue-100 text-blue-800 font-bold py-3 rounded-lg flex items-center justify-center gap-2 mb-2">
                            <Icon name="Loader" size={18} className="animate-spin" />
                            検索中...
                        </div>
                    )}

                    {/* 栄養素編集セクション（折りたたみ式） */}
                    <div className="bg-white border-2 border-gray-300 rounded-lg overflow-hidden">
                        <button
                            onClick={() => setIsNutritionEditExpanded(!isNutritionEditExpanded)}
                            className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition"
                        >
                            <p className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                                <Icon name="Edit" size={16} className="text-blue-600" />
                                栄養素を編集（100gあたり）
                            </p>
                            <Icon
                                name={isNutritionEditExpanded ? "ChevronUp" : "ChevronDown"}
                                size={20}
                                className="text-gray-600"
                            />
                        </button>

                        {isNutritionEditExpanded && (
                            <div className="p-4 pt-0 space-y-3 border-t border-gray-200">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-gray-600 block mb-1">カロリー (kcal)</label>
                                        <input
                                            type="number"
                                            value={food._tempCalories !== undefined ? food._tempCalories : Math.round((food.calories || 0) / (food.amount || 100) * 100)}
                                            onChange={(e) => {
                                                // onChange: 文字列として一時保存
                                                const updatedFoods = [...recognizedFoods];
                                                updatedFoods[foodIndex] = {
                                                    ...food,
                                                    _tempCalories: e.target.value
                                                };
                                                setRecognizedFoods(updatedFoods);
                                            }}
                                            onBlur={(e) => {
                                                // onBlur: 数値に変換して実際の値を計算
                                                const val = e.target.value.trim();
                                                let newCaloriesPer100g = 0;
                                                if (val !== '' && val !== '.') {
                                                    const num = parseFloat(val);
                                                    newCaloriesPer100g = isNaN(num) ? 0 : num;
                                                }
                                                const ratio = (food.amount || 100) / 100;
                                                const updatedFoods = [...recognizedFoods];
                                                updatedFoods[foodIndex] = {
                                                    ...food,
                                                    calories: Math.round(newCaloriesPer100g * ratio),
                                                    _base: {
                                                        ...food._base,
                                                        calories: newCaloriesPer100g
                                                    },
                                                    _tempCalories: undefined
                                                };
                                                setRecognizedFoods(updatedFoods);
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-600 block mb-1">タンパク質 (g)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={food._tempProtein !== undefined ? food._tempProtein : parseFloat(((food.protein || 0) / (food.amount || 100) * 100).toFixed(1))}
                                            onChange={(e) => {
                                                // onChange: 文字列として一時保存
                                                const updatedFoods = [...recognizedFoods];
                                                updatedFoods[foodIndex] = {
                                                    ...food,
                                                    _tempProtein: e.target.value
                                                };
                                                setRecognizedFoods(updatedFoods);
                                            }}
                                            onBlur={(e) => {
                                                // onBlur: 数値に変換して実際の値を計算
                                                const val = e.target.value.trim();
                                                let newProteinPer100g = 0;
                                                if (val !== '' && val !== '.') {
                                                    const num = parseFloat(val);
                                                    newProteinPer100g = isNaN(num) ? 0 : num;
                                                }
                                                const ratio = (food.amount || 100) / 100;
                                                const updatedFoods = [...recognizedFoods];
                                                updatedFoods[foodIndex] = {
                                                    ...food,
                                                    protein: parseFloat((newProteinPer100g * ratio).toFixed(1)),
                                                    _base: {
                                                        ...food._base,
                                                        protein: newProteinPer100g
                                                    },
                                                    _tempProtein: undefined
                                                };
                                                setRecognizedFoods(updatedFoods);
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-600 block mb-1">脂質 (g)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={food._tempFat !== undefined ? food._tempFat : parseFloat(((food.fat || 0) / (food.amount || 100) * 100).toFixed(1))}
                                            onChange={(e) => {
                                                // onChange: 文字列として一時保存
                                                const updatedFoods = [...recognizedFoods];
                                                updatedFoods[foodIndex] = {
                                                    ...food,
                                                    _tempFat: e.target.value
                                                };
                                                setRecognizedFoods(updatedFoods);
                                            }}
                                            onBlur={(e) => {
                                                // onBlur: 数値に変換して実際の値を計算
                                                const val = e.target.value.trim();
                                                let newFatPer100g = 0;
                                                if (val !== '' && val !== '.') {
                                                    const num = parseFloat(val);
                                                    newFatPer100g = isNaN(num) ? 0 : num;
                                                }
                                                const ratio = (food.amount || 100) / 100;
                                                const updatedFoods = [...recognizedFoods];
                                                updatedFoods[foodIndex] = {
                                                    ...food,
                                                    fat: parseFloat((newFatPer100g * ratio).toFixed(1)),
                                                    _base: {
                                                        ...food._base,
                                                        fat: newFatPer100g
                                                    },
                                                    _tempFat: undefined
                                                };
                                                setRecognizedFoods(updatedFoods);
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-600 block mb-1">炭水化物 (g)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={food._tempCarbs !== undefined ? food._tempCarbs : parseFloat(((food.carbs || 0) / (food.amount || 100) * 100).toFixed(1))}
                                            onChange={(e) => {
                                                // onChange: 文字列として一時保存
                                                const updatedFoods = [...recognizedFoods];
                                                updatedFoods[foodIndex] = {
                                                    ...food,
                                                    _tempCarbs: e.target.value
                                                };
                                                setRecognizedFoods(updatedFoods);
                                            }}
                                            onBlur={(e) => {
                                                // onBlur: 数値に変換して実際の値を計算
                                                const val = e.target.value.trim();
                                                let newCarbsPer100g = 0;
                                                if (val !== '' && val !== '.') {
                                                    const num = parseFloat(val);
                                                    newCarbsPer100g = isNaN(num) ? 0 : num;
                                                }
                                                const ratio = (food.amount || 100) / 100;
                                                const updatedFoods = [...recognizedFoods];
                                                updatedFoods[foodIndex] = {
                                                    ...food,
                                                    carbs: parseFloat((newCarbsPer100g * ratio).toFixed(1)),
                                                    _base: {
                                                        ...food._base,
                                                        carbs: newCarbsPer100g
                                                    },
                                                    _tempCarbs: undefined
                                                };
                                                setRecognizedFoods(updatedFoods);
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-gray-600 mt-2">
                                    ※ 編集した内容は確定時にカスタム食材として自動保存されます
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};


// グローバルに公開
window.AIFoodRecognition = AIFoodRecognition;
