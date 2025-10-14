// ===== services.js =====
// Service layer for Your Coach+ Beta
// Contains database functions, DataService object, and GeminiAPI utilities
//
// Dependencies:
// - config.js: DEV_MODE, STORAGE_KEYS, GEMINI_API_KEY
// - utils.js: LBMUtils (for LBM calculations in GeminiAPI)
// - foodDatabase.js: foodDatabase object
// - trainingDatabase.js: trainingDatabase object
// - Firebase: db, storage (initialized in main app)

// ===== データベース取得関数 =====
const getFoodDBFromExternal = () => {
    if (typeof foodDatabase === 'undefined') {
        console.warn('foodDatabase.js not loaded');
        return {};
    }
    const foodCategories = {};
    Object.keys(foodDatabase).forEach(category => {
        if (category !== 'サプリメント' && category !== '調味料') {
            foodCategories[category] = foodDatabase[category];
        }
    });
    return foodCategories;
};

const getSupplementDBFromExternal = () => {
    if (typeof foodDatabase === 'undefined' || !foodDatabase['サプリメント']) {
        console.warn('Supplement data not found');
        return [];
    }
    const supplements = [];
    Object.keys(foodDatabase['サプリメント']).forEach(suppName => {
        const supp = foodDatabase['サプリメント'][suppName];

        // ビタミン・ミネラルをマッピング
        const vitamins = {
            A: supp.vitaminA || 0,
            D: supp.vitaminD || 0,
            E: supp.vitaminE || 0,
            K: supp.vitaminK || 0,
            B1: supp.vitaminB1 || 0,
            B2: supp.vitaminB2 || 0,
            B3: supp.niacin || 0,
            B5: supp.pantothenicAcid || 0,
            B6: supp.vitaminB6 || 0,
            B7: supp.biotin || 0,
            B9: supp.folicAcid || 0,
            B12: supp.vitaminB12 || 0,
            C: supp.vitaminC || 0
        };
        const minerals = {
            calcium: supp.calcium || 0,
            iron: supp.iron || 0,
            magnesium: supp.magnesium || 0,
            phosphorus: supp.phosphorus || 0,
            potassium: supp.potassium || 0,
            sodium: supp.sodium || 0,
            zinc: supp.zinc || 0,
            copper: supp.copper || 0,
            manganese: supp.manganese || 0,
            selenium: supp.selenium || 0,
            iodine: supp.iodine || 0,
            chromium: supp.chromium || 0
        };

        // unitフィールドから分量と単位を抽出
        let servingSize = 1;
        let servingUnit = 'g';

        if (supp.unit) {
            // "30g" → servingSize=30, servingUnit="g"
            // "1粒" → servingSize=1, servingUnit="粒"
            // "2粒" → servingSize=2, servingUnit="粒"
            const match = supp.unit.match(/^(\d+(?:\.\d+)?)(.*)/);
            if (match) {
                servingSize = parseFloat(match[1]);
                servingUnit = match[2] || 'g';
            }
        }

        supplements.push({
            id: 's' + supplements.length,
            name: suppName,
            category: supp.subcategory || 'サプリメント',
            icon: supp.subcategory === 'プロテイン' ? 'Milk' :
                  supp.subcategory === 'アミノ酸' ? 'Droplets' :
                  supp.subcategory === 'ビタミン・ミネラル' ? 'HeartPulse' :
                  supp.subcategory === 'ドリンク' ? 'Coffee' : 'Pill',
            unit: supp.unit || `${servingSize}${servingUnit}`, // unitフィールドを追加
            servingSize: servingSize,
            servingUnit: servingUnit,
            calories: supp.calories || 0,
            protein: supp.protein || 0,
            fat: supp.fat || 0,
            carbs: supp.carbs || 0,
            vitamins: vitamins,
            minerals: minerals,
            // その他の栄養素をマッピング
            caffeine: supp.caffeine || 0,
            catechin: supp.catechin || 0,
            tannin: supp.tannin || 0,
            polyphenol: supp.polyphenol || 0,
            chlorogenicAcid: supp.chlorogenicAcid || 0,
            creatine: supp.creatine || 0,
            lArginine: supp.lArginine || 0,
            lCarnitine: supp.lCarnitine || 0,
            EPA: supp.EPA || 0,
            DHA: supp.DHA || 0,
            coQ10: supp.coQ10 || 0,
            lutein: supp.lutein || 0,
            astaxanthin: supp.astaxanthin || 0
        });
    });
    return supplements;
};

const getExerciseDBFromExternal = () => {
    if (typeof trainingDatabase === 'undefined') {
        console.warn('trainingDatabase.js not loaded');
        return [];
    }
    const exercises = [];
    let exerciseId = 1;
    Object.keys(trainingDatabase).forEach(category => {
        Object.keys(trainingDatabase[category]).forEach(exerciseName => {
            const exercise = trainingDatabase[category][exerciseName];
            exercises.push({
                id: exerciseId++,
                name: exerciseName,
                category: exercise.category,
                subcategory: exercise.subcategory,
                exerciseType: exercise.exerciseType,
                jointType: exercise.jointType,
                exerciseFactor: exercise.exerciseFactor,
                epocRate: exercise.epocRate,
                intervalMultiplier: exercise.intervalMultiplier,
                ...exercise
            });
        });
    });
    return exercises;
};

const foodDB = getFoodDBFromExternal();
const supplementDB = getSupplementDBFromExternal();
const exerciseDB = getExerciseDBFromExternal();

// ===== データアクセス層（開発中はlocalStorage） =====
const DataService = {
    // ユーザープロファイル取得
    getUserProfile: async (userId) => {
        if (DEV_MODE) {
            const saved = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
            return saved ? JSON.parse(saved) : null;
        }
        try {
            const doc = await db.collection('users').doc(userId).get();
            return doc.exists ? doc.data() : null;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }
    },

    // ユーザープロファイル保存
    saveUserProfile: async (userId, profile) => {
        if (DEV_MODE) {
            localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
            return true;
        }
        try {
            await db.collection('users').doc(userId).set(profile, { merge: true });
            return true;
        } catch (error) {
            console.error('Error saving user profile:', error);
            return false;
        }
    },

    // 日次記録取得
    getDailyRecord: async (userId, date) => {
        if (DEV_MODE) {
            const saved = localStorage.getItem(STORAGE_KEYS.DAILY_RECORDS);
            const records = saved ? JSON.parse(saved) : {};
            return records[date] || null;
        }
        try {
            const doc = await db
                .collection('dailyRecords')
                .doc(userId)
                .collection('records')
                .doc(date)
                .get();
            return doc.exists ? doc.data() : null;
        } catch (error) {
            console.error('Error fetching daily record:', error);
            return null;
        }
    },

    // 日次記録保存
    saveDailyRecord: async (userId, date, record) => {
        if (DEV_MODE) {
            const saved = localStorage.getItem(STORAGE_KEYS.DAILY_RECORDS);
            const records = saved ? JSON.parse(saved) : {};
            records[date] = record;
            localStorage.setItem(STORAGE_KEYS.DAILY_RECORDS, JSON.stringify(records));
            return true;
        }
        try {
            await db
                .collection('dailyRecords')
                .doc(userId)
                .collection('records')
                .doc(date)
                .set(record, { merge: true });
            return true;
        } catch (error) {
            console.error('Error saving daily record:', error);
            return false;
        }
    },

    // 写真アップロード
    uploadPhoto: async (userId, file, recordId) => {
        if (DEV_MODE) {
            // 開発中は写真をBase64として保存
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });
        }
        try {
            const ref = storage.ref(`photos/${userId}/${recordId}_${Date.now()}.jpg`);
            await ref.put(file);
            const url = await ref.getDownloadURL();
            return url;
        } catch (error) {
            console.error('Error uploading photo:', error);
            return null;
        }
    },

    // 前日データ取得（予測用）
    getPreviousDayRecord: async (userId, currentDate) => {
        try {
            const prevDate = new Date(currentDate);
            prevDate.setDate(prevDate.getDate() - 1);
            const prevDateStr = prevDate.toISOString().split('T')[0];
            return await DataService.getDailyRecord(userId, prevDateStr);
        } catch (error) {
            console.error('Error fetching previous day record:', error);
            return null;
        }
    },

    // ワークアウトテンプレート取得
    getWorkoutTemplates: async (userId) => {
        if (DEV_MODE) {
            const saved = localStorage.getItem(STORAGE_KEYS.WORKOUT_TEMPLATES);
            return saved ? JSON.parse(saved) : [];
        }
        try {
            const doc = await db.collection('workoutTemplates').doc(userId).get();
            return doc.exists ? doc.data().templates : [];
        } catch (error) {
            console.error('Error fetching workout templates:', error);
            return [];
        }
    },

    // ワークアウトテンプレート保存
    saveWorkoutTemplate: async (userId, template) => {
        if (DEV_MODE) {
            const templates = await DataService.getWorkoutTemplates(userId);
            // 同じIDのテンプレートが既に存在する場合は更新、なければ追加
            const existingIndex = templates.findIndex(t => t.id === template.id);
            if (existingIndex >= 0) {
                templates[existingIndex] = template;
            } else {
                templates.push(template);
            }
            localStorage.setItem(STORAGE_KEYS.WORKOUT_TEMPLATES, JSON.stringify(templates));
        } else {
            try {
                const templates = await DataService.getWorkoutTemplates(userId);
                // 同じIDのテンプレートが既に存在する場合は更新、なければ追加
                const existingIndex = templates.findIndex(t => t.id === template.id);
                if (existingIndex >= 0) {
                    templates[existingIndex] = template;
                } else {
                    templates.push(template);
                }
                await db.collection('workoutTemplates').doc(userId).set({ templates });
            } catch (error) {
                console.error('Error saving workout template:', error);
            }
        }
    },

    // ワークアウトテンプレート削除
    deleteWorkoutTemplate: async (userId, templateId) => {
        if (DEV_MODE) {
            const templates = await DataService.getWorkoutTemplates(userId);
            const filtered = templates.filter(t => t.id !== templateId);
            localStorage.setItem(STORAGE_KEYS.WORKOUT_TEMPLATES, JSON.stringify(filtered));
        } else {
            try {
                const templates = await DataService.getWorkoutTemplates(userId);
                const filtered = templates.filter(t => t.id !== templateId);
                await db.collection('workoutTemplates').doc(userId).set({ templates: filtered });
            } catch (error) {
                console.error('Error deleting workout template:', error);
            }
        }
    },

    // 食事テンプレート取得
    getMealTemplates: async (userId) => {
        if (DEV_MODE) {
            const saved = localStorage.getItem(STORAGE_KEYS.MEAL_TEMPLATES);
            return saved ? JSON.parse(saved) : [];
        }
        try {
            const doc = await db.collection('mealTemplates').doc(userId).get();
            return doc.exists ? doc.data().templates : [];
        } catch (error) {
            console.error('Error fetching meal templates:', error);
            return [];
        }
    },

    // 食事テンプレート保存
    saveMealTemplate: async (userId, template) => {
        if (DEV_MODE) {
            const templates = await DataService.getMealTemplates(userId);
            // 同じIDのテンプレートが既に存在する場合は更新、なければ追加
            const existingIndex = templates.findIndex(t => t.id === template.id);
            if (existingIndex >= 0) {
                templates[existingIndex] = template;
            } else {
                templates.push(template);
            }
            localStorage.setItem(STORAGE_KEYS.MEAL_TEMPLATES, JSON.stringify(templates));
        } else {
            try {
                const templates = await DataService.getMealTemplates(userId);
                // 同じIDのテンプレートが既に存在する場合は更新、なければ追加
                const existingIndex = templates.findIndex(t => t.id === template.id);
                if (existingIndex >= 0) {
                    templates[existingIndex] = template;
                } else {
                    templates.push(template);
                }
                await db.collection('mealTemplates').doc(userId).set({ templates });
            } catch (error) {
                console.error('Error saving meal template:', error);
            }
        }
    },

    // 食事テンプレート削除
    deleteMealTemplate: async (userId, templateId) => {
        if (DEV_MODE) {
            const templates = await DataService.getMealTemplates(userId);
            const filtered = templates.filter(t => t.id !== templateId);
            localStorage.setItem(STORAGE_KEYS.MEAL_TEMPLATES, JSON.stringify(filtered));
        } else {
            try {
                const templates = await DataService.getMealTemplates(userId);
                const filtered = templates.filter(t => t.id !== templateId);
                await db.collection('mealTemplates').doc(userId).set({ templates: filtered });
            } catch (error) {
                console.error('Error deleting meal template:', error);
            }
        }
    },

    // サプリメントテンプレート取得
    getSupplementTemplates: async (userId) => {
        if (DEV_MODE) {
            const saved = localStorage.getItem(STORAGE_KEYS.SUPPLEMENT_TEMPLATES);
            return saved ? JSON.parse(saved) : [];
        }
        try {
            const doc = await db.collection('supplementTemplates').doc(userId).get();
            return doc.exists ? doc.data().templates : [];
        } catch (error) {
            console.error('Error fetching supplement templates:', error);
            return [];
        }
    },

    // サプリメントテンプレート保存
    saveSupplementTemplate: async (userId, template) => {
        if (DEV_MODE) {
            const templates = await DataService.getSupplementTemplates(userId);
            // 同じIDのテンプレートが既に存在する場合は更新、なければ追加
            const existingIndex = templates.findIndex(t => t.id === template.id);
            if (existingIndex >= 0) {
                templates[existingIndex] = template;
            } else {
                templates.push(template);
            }
            localStorage.setItem(STORAGE_KEYS.SUPPLEMENT_TEMPLATES, JSON.stringify(templates));
        } else {
            try {
                const templates = await DataService.getSupplementTemplates(userId);
                // 同じIDのテンプレートが既に存在する場合は更新、なければ追加
                const existingIndex = templates.findIndex(t => t.id === template.id);
                if (existingIndex >= 0) {
                    templates[existingIndex] = template;
                } else {
                    templates.push(template);
                }
                await db.collection('supplementTemplates').doc(userId).set({ templates });
            } catch (error) {
                console.error('Error saving supplement template:', error);
            }
        }
    },

    // サプリメントテンプレート削除
    deleteSupplementTemplate: async (userId, templateId) => {
        if (DEV_MODE) {
            const templates = await DataService.getSupplementTemplates(userId);
            const filtered = templates.filter(t => t.id !== templateId);
            localStorage.setItem(STORAGE_KEYS.SUPPLEMENT_TEMPLATES, JSON.stringify(filtered));
        } else {
            try {
                const templates = await DataService.getSupplementTemplates(userId);
                const filtered = templates.filter(t => t.id !== templateId);
                await db.collection('supplementTemplates').doc(userId).set({ templates: filtered });
            } catch (error) {
                console.error('Error deleting supplement template:', error);
            }
        }
    },

    // PG BASE チャット履歴取得
    getPGBaseChatHistory: async () => {
        if (DEV_MODE) {
            const saved = localStorage.getItem(STORAGE_KEYS.PGBASE_CHAT_HISTORY);
            return saved ? JSON.parse(saved) : [];
        }
        // Firestore実装時はここに追加
        return [];
    },

    // PG BASE チャット履歴保存
    savePGBaseChatHistory: async (history) => {
        if (DEV_MODE) {
            localStorage.setItem(STORAGE_KEYS.PGBASE_CHAT_HISTORY, JSON.stringify(history));
            return true;
        }
        // Firestore実装時はここに追加
        return true;
    },


    // コミュニティ投稿取得
    // コミュニティ投稿取得（承認済みのみ）
    getCommunityPosts: async () => {
        if (DEV_MODE) {
            const saved = localStorage.getItem(STORAGE_KEYS.COMMUNITY_POSTS);
            return saved ? JSON.parse(saved) : [];
        }
        try {
            const snapshot = await db.collection('communityPosts')
                .where('approvalStatus', '==', 'approved')
                .orderBy('timestamp', 'desc')
                .limit(50)
                .get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error fetching community posts:', error);
            return [];
        }
    },

    // コミュニティ投稿作成
    createCommunityPost: async (postData) => {
        if (DEV_MODE) {
            const saved = localStorage.getItem(STORAGE_KEYS.COMMUNITY_POSTS);
            const posts = saved ? JSON.parse(saved) : [];
            posts.unshift(postData);
            localStorage.setItem(STORAGE_KEYS.COMMUNITY_POSTS, JSON.stringify(posts));
            return { success: true, postId: postData.id };
        }
        try {
            const docRef = await db.collection('communityPosts').add({
                ...postData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true, postId: docRef.id };
        } catch (error) {
            console.error('Error creating community post:', error);
            return { success: false, error: error.message };
        }
    },

    // コミュニティ画像アップロード
    uploadCommunityPhoto: async (userId, file, photoType) => {
        if (DEV_MODE) {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });
        }
        try {
            const timestamp = Date.now();
            const ref = storage.ref(`community/${userId}/${photoType}_${timestamp}.jpg`);
            await ref.put(file);
            const url = await ref.getDownloadURL();
            return url;
        } catch (error) {
            console.error('Error uploading community photo:', error);
            return null;
        }
    },

    // 管理者: 承認待ち投稿取得
    getPendingPosts: async () => {
        if (DEV_MODE) {
            const saved = localStorage.getItem(STORAGE_KEYS.COMMUNITY_POSTS);
            const posts = saved ? JSON.parse(saved) : [];
            return posts.filter(p => p.approvalStatus === 'pending');
        }
        try {
            const snapshot = await db.collection('communityPosts')
                .where('approvalStatus', '==', 'pending')
                .orderBy('timestamp', 'desc')
                .get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error fetching pending posts:', error);
            return [];
        }
    },

    // 管理者: 投稿承認
    approvePost: async (postId) => {
        if (DEV_MODE) {
            const saved = localStorage.getItem(STORAGE_KEYS.COMMUNITY_POSTS);
            const posts = saved ? JSON.parse(saved) : [];
            const updated = posts.map(p =>
                p.id === postId ? { ...p, approvalStatus: 'approved' } : p
            );
            localStorage.setItem(STORAGE_KEYS.COMMUNITY_POSTS, JSON.stringify(updated));
            return true;
        }
        try {
            await db.collection('communityPosts').doc(postId).update({
                approvalStatus: 'approved',
                approvedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Error approving post:', error);
            return false;
        }
    },

    // 管理者: 投稿却下
    rejectPost: async (postId, reason) => {
        if (DEV_MODE) {
            const saved = localStorage.getItem(STORAGE_KEYS.COMMUNITY_POSTS);
            const posts = saved ? JSON.parse(saved) : [];
            const updated = posts.map(p =>
                p.id === postId ? { ...p, approvalStatus: 'rejected', rejectionReason: reason } : p
            );
            localStorage.setItem(STORAGE_KEYS.COMMUNITY_POSTS, JSON.stringify(updated));
            return true;
        }
        try {
            await db.collection('communityPosts').doc(postId).update({
                approvalStatus: 'rejected',
                rejectionReason: reason,
                rejectedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Error rejecting post:', error);
            return false;
        }
    },

    // 投稿にいいね追加
    togglePostLike: async (postId, userId) => {
        if (DEV_MODE) {
            const saved = localStorage.getItem(STORAGE_KEYS.COMMUNITY_POSTS);
            const posts = saved ? JSON.parse(saved) : [];
            const updated = posts.map(p => {
                if (p.id === postId) {
                    return { ...p, likes: (p.likes || 0) + 1 };
                }
                return p;
            });
            localStorage.setItem(STORAGE_KEYS.COMMUNITY_POSTS, JSON.stringify(updated));
            return true;
        }
        try {
            await db.collection('communityPosts').doc(postId).update({
                likes: firebase.firestore.FieldValue.increment(1)
            });
            return true;
        } catch (error) {
            console.error('Error toggling like:', error);
            return false;
        }
    },

    // 非推奨: 旧メソッド（互換性のため残す）
    saveCommunityPosts: async (posts) => {
        if (DEV_MODE) {
            localStorage.setItem(STORAGE_KEYS.COMMUNITY_POSTS, JSON.stringify(posts));
            return true;
        }
        return true;
    }
};

// ===== Gemini API ユーティリティ =====
const GeminiAPI = {
    // システムプロンプト
    getSystemPrompt: (userProfile) => {
        return `あなたはボディメイク・フィットネスの専門知識を持つAIアシスタントです。

【重要原則】
1. LBM（除脂肪体重）至上主義: すべての計算と評価はLBMを基準にします。BMIは使用しません。
2. ユーザー主権: 一方的に答えを押し付けず、ユーザーが最適な意思決定を下すための信頼できる参謀として振る舞ってください。
3. 科学的根拠: 回答には可能な限り科学的根拠を示してください。

【ユーザー情報】
${userProfile ? `
- 体重: ${userProfile.weight}kg
- 体脂肪率: ${userProfile.bodyFatPercentage}%
- LBM: ${LBMUtils.calculateLBM(userProfile.weight, userProfile.bodyFatPercentage).toFixed(1)}kg
- 目標: ${userProfile.goal || '未設定'}
` : '（プロフィール未設定）'}

簡潔で実用的な回答を心がけてください。`;
    },

    // Gemini APIを呼び出し（マルチモデル対応）
    // model: 使用するモデル名（デフォルト: gemini-2.5-pro）
    sendMessage: async (message, conversationHistory = [], userProfile = null, model = 'gemini-2.5-pro') => {
        try {
            if (GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
                return {
                    success: false,
                    error: 'Gemini APIキーが設定されていません。'
                };
            }

            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

            const contents = [];
            if (conversationHistory.length === 0) {
                contents.push({
                    role: 'user',
                    parts: [{ text: GeminiAPI.getSystemPrompt(userProfile) + '\n\n' + message }]
                });
            } else {
                conversationHistory.forEach(msg => {
                    contents.push({
                        role: msg.role === 'user' ? 'user' : 'model',
                        parts: [{ text: msg.content }]
                    });
                });
                contents.push({
                    role: 'user',
                    parts: [{ text: message }]
                });
            }

            const safetySettings = [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
            ];

            const response = await fetch(`${apiUrl}?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: contents,
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 2048
                    },
                    safetySettings: safetySettings
                })
            });

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    errorData = { error: { message: response.statusText } };
                }
                console.error('Gemini API Error:', errorData);
                const errorMessage = `Status ${response.status}: ${errorData?.error?.message || 'Unknown error'}`;
                return {
                    success: false,
                    error: `API通信エラーが発生しました。(${errorMessage})`
                };
            }

            const data = await response.json();

            if (!data || !data.candidates || data.candidates.length === 0) {
                if (data.promptFeedback && data.promptFeedback.blockReason) {
                    return {
                        success: false,
                        error: `リクエストがブロックされました。理由: ${data.promptFeedback.blockReason}`
                    };
                }
                return {
                    success: false,
                    error: 'AIからの応答が空でした。'
                };
            }

            const candidate = data.candidates[0];

            if (candidate.content && candidate.content.parts && candidate.content.parts[0] && candidate.content.parts[0].text) {
                return {
                    success: true,
                    text: candidate.content.parts[0].text
                };
            } else {
                const reason = candidate.finishReason || '不明';
                const safetyInfo = (candidate.safetyRatings || []).map(r => `${r.category}: ${r.probability}`).join(', ');
                return {
                    success: false,
                    error: `AIが応答を生成できませんでした。理由: ${reason}。${safetyInfo ? `詳細: ${safetyInfo}` : '不適切なコンテンツと判断された可能性があります。'}`
                };
            }
        } catch (error) {
            console.error('Gemini API Error:', error);
            return {
                success: false,
                error: 'AIとの通信中にネットワークエラーが発生しました。接続を確認してください。'
            };
        }
    }
};
