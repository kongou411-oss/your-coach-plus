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
        if (category !== '調味料') {
            foodCategories[category] = foodDatabase[category];
        }
    });

    // LocalStorageからカスタム食材を読み込む
    try {
        const customFoods = JSON.parse(localStorage.getItem('customFoods') || '[]');
        if (customFoods.length > 0) {
            foodCategories['カスタム'] = {};
            customFoods.forEach(food => {
                foodCategories['カスタム'][food.name] = food;
            });
            console.log(`Loaded ${customFoods.length} custom foods from localStorage`);
        }
    } catch (err) {
        console.error('Failed to load custom foods from localStorage:', err);
    }

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
    // ユーザー認証情報の保存/更新（Google/Email認証後に自動実行）
    saveOrUpdateAuthUser: async (firebaseUser) => {
        if (!firebaseUser) return false;

        const userId = firebaseUser.uid;
        const authData = {
            uid: userId,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || '',
            photoURL: firebaseUser.photoURL || '',
            emailVerified: firebaseUser.emailVerified,
            provider: firebaseUser.providerData[0]?.providerId || 'password',
            lastLoginAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (DEV_MODE) {
            // DEV_MODEでは認証情報をLocalStorageに保存
            // getUserProfileはSTORAGE_KEYS.USER_PROFILEを使うので、そこからクレジット情報を取得
            const existingProfile = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);

            if (!existingProfile) {
                // 新規ユーザーの場合、初期クレジットを追加
                authData.createdAt = new Date().toISOString();
                authData.joinDate = new Date().toISOString();
                authData.registrationDate = new Date().toISOString();
                authData.experience = 0;
                authData.level = 1;
                authData.freeCredits = 14; // 初回クレジット
                authData.paidCredits = 0;
                authData.processedScoreDates = [];
                authData.processedDirectiveDates = [];

                // STORAGE_KEYS.USER_PROFILEに保存（getUserProfileが参照する）
                localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(authData));
                console.log('[DEV] New user created:', userId, 'with 14 initial credits');
            } else {
                // 既存ユーザーの場合、保存済みデータをマージ
                const existingData = JSON.parse(existingProfile);
                authData = { ...existingData, ...authData }; // 既存データを保持しつつログイン情報を更新

                // STORAGE_KEYS.USER_PROFILEに保存（getUserProfileが参照する）
                localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(authData));
                console.log('[DEV] User login updated:', userId, 'freeCredits:', authData.freeCredits, 'paidCredits:', authData.paidCredits);
            }

            // 認証情報も別途保存
            localStorage.setItem('yourCoachBeta_authUser', JSON.stringify(authData));
            return true;
        }

        try {
            const userRef = db.collection('users').doc(userId);
            const doc = await userRef.get();

            if (!doc.exists) {
                // 新規ユーザー: 作成日時と初期クレジットを追加
                authData.createdAt = new Date().toISOString();
                authData.joinDate = new Date().toISOString();
                authData.registrationDate = new Date().toISOString();
                authData.experience = 0;
                authData.level = 1;
                authData.freeCredits = 14; // 初回クレジット
                authData.paidCredits = 0;
                authData.processedScoreDates = [];
                await userRef.set(authData);
                console.log('New user created:', userId, 'with 14 initial credits');
            } else {
                // 既存ユーザー: lastLoginAtとupdatedAtのみ更新
                await userRef.update({
                    lastLoginAt: authData.lastLoginAt,
                    updatedAt: authData.updatedAt,
                    email: authData.email, // メール変更対応
                    photoURL: authData.photoURL, // プロフィール画像更新
                    displayName: authData.displayName // 表示名更新
                });
                console.log('User login updated:', userId);
            }
            return true;
        } catch (error) {
            console.error('Error saving auth user:', error);
            return false;
        }
    },

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
    },

    // ===== ワークアウト履歴管理 =====

    // ワークアウト履歴を保存（種目別、RM別、重量別に記録）
    saveWorkoutHistory: async (userId, exerciseName, setData) => {
        const historyKey = `workout_history_${userId}`;
        const timestamp = new Date().toISOString();

        if (DEV_MODE) {
            const saved = localStorage.getItem(historyKey);
            const history = saved ? JSON.parse(saved) : [];

            history.push({
                exerciseName,
                weight: setData.weight,
                rm: setData.rm || 1,
                reps: setData.reps,
                setType: setData.setType || 'main',
                timestamp
            });

            localStorage.setItem(historyKey, JSON.stringify(history));
            return true;
        }

        try {
            await db
                .collection('users')
                .doc(userId)
                .collection('workoutHistory')
                .add({
                    exerciseName,
                    weight: setData.weight,
                    rm: setData.rm || 1,
                    reps: setData.reps,
                    setType: setData.setType || 'main',
                    timestamp
                });
            return true;
        } catch (error) {
            console.error('Error saving workout history:', error);
            return false;
        }
    },

    // ワークアウト履歴を取得（種目別フィルタ）
    getWorkoutHistoryByExercise: async (userId, exerciseName) => {
        const historyKey = `workout_history_${userId}`;

        if (DEV_MODE) {
            const saved = localStorage.getItem(historyKey);
            const history = saved ? JSON.parse(saved) : [];

            return history
                .filter(h => h.exerciseName === exerciseName)
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        }

        try {
            const snapshot = await db
                .collection('users')
                .doc(userId)
                .collection('workoutHistory')
                .where('exerciseName', '==', exerciseName)
                .orderBy('timestamp', 'desc')
                .limit(100)
                .get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error fetching workout history by exercise:', error);
            return [];
        }
    },

    // ワークアウト履歴を取得（種目別 + RM別フィルタ）
    getWorkoutHistoryByExerciseAndRM: async (userId, exerciseName, rm) => {
        const historyKey = `workout_history_${userId}`;

        if (DEV_MODE) {
            const saved = localStorage.getItem(historyKey);
            const history = saved ? JSON.parse(saved) : [];

            return history
                .filter(h => h.exerciseName === exerciseName && h.rm === rm)
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        }

        try {
            const snapshot = await db
                .collection('users')
                .doc(userId)
                .collection('workoutHistory')
                .where('exerciseName', '==', exerciseName)
                .where('rm', '==', rm)
                .orderBy('timestamp', 'desc')
                .limit(50)
                .get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error fetching workout history by exercise and RM:', error);
            return [];
        }
    },

    // 全ワークアウト履歴を取得（最近100件）
    getAllWorkoutHistory: async (userId) => {
        const historyKey = `workout_history_${userId}`;

        if (DEV_MODE) {
            const saved = localStorage.getItem(historyKey);
            const history = saved ? JSON.parse(saved) : [];

            return history
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 100);
        }

        try {
            const snapshot = await db
                .collection('users')
                .doc(userId)
                .collection('workoutHistory')
                .orderBy('timestamp', 'desc')
                .limit(100)
                .get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error fetching all workout history:', error);
            return [];
        }
    },

    // スコア計算関数（ダッシュボード・分析で使用）
    calculateScores: (profile, record, target) => {
        // スタイル判定（一般 or ボディメイカー系）
        const bodymakerStyles = ['筋肥大', '筋力', '持久力', 'バランス'];
        const isBodymaker = bodymakerStyles.includes(profile.style);

        // 食事データ
        const totalCalories = (record.meals || []).reduce((sum, m) => sum + (m.calories || 0), 0);
        const totalProtein = (record.meals || []).reduce((sum, m) => sum + (m.items || []).reduce((s, i) => s + (i.protein || 0), 0), 0);
        const totalFat = (record.meals || []).reduce((sum, m) => sum + (m.items || []).reduce((s, i) => s + (i.fat || 0), 0), 0);
        const totalCarbs = (record.meals || []).reduce((sum, m) => sum + (m.items || []).reduce((s, i) => s + (i.carbs || 0), 0), 0);

        // 食事スコア計算
        const proteinRate = Math.min(100, target.protein > 0 ? (totalProtein / target.protein) * 100 : 0);
        const fatRate = Math.min(100, target.fat > 0 ? (totalFat / target.fat) * 100 : 0);
        const carbsRate = Math.min(100, target.carbs > 0 ? (totalCarbs / target.carbs) * 100 : 0);
        const pfcBalance = (proteinRate + fatRate + carbsRate) / 3;

        const calorieDeviation = Math.abs(totalCalories - target.calories) / target.calories;
        const calorieScore = Math.max(0, 100 - calorieDeviation * 100);

        const foodScore = Math.round(pfcBalance * 0.7 + calorieScore * 0.3);

        // 運動データ
        const workouts = record.workouts || [];
        const totalDuration = workouts.reduce((sum, w) => {
            return sum + (w.sets || []).reduce((s, set) => s + (set.duration || 0), 0);
        }, 0);
        const exerciseCount = workouts.length;

        // 休養日判定（ルーティンで明示的に設定されている場合）
        const isRestDay = record.routine?.is_rest_day === true;

        // 運動スコア計算（ボディメイカー/一般で基準が異なる）
        let durationScore = 0;
        let exerciseCountScore = 0;

        // 休養日の場合は運動スコアを100点として扱う（計画的な休養）
        if (isRestDay) {
            durationScore = 100;
            exerciseCountScore = 100;
        } else if (isBodymaker) {
            // ボディメイカー基準
            if (totalDuration === 0) durationScore = 0;
            else if (totalDuration >= 120) durationScore = 100; // 2時間以上
            else if (totalDuration >= 90) durationScore = 75;   // 1.5時間以上
            else if (totalDuration >= 60) durationScore = 50;   // 1時間以上
            else if (totalDuration >= 30) durationScore = 25;   // 30分以上
            else durationScore = 0;

            if (exerciseCount === 0) exerciseCountScore = 0;
            else if (exerciseCount >= 5) exerciseCountScore = 100;
            else if (exerciseCount === 4) exerciseCountScore = 80;
            else if (exerciseCount === 3) exerciseCountScore = 60;
            else if (exerciseCount === 2) exerciseCountScore = 40;
            else if (exerciseCount === 1) exerciseCountScore = 20;
        } else {
            // 一般基準
            if (totalDuration === 0) durationScore = 0;
            else if (totalDuration >= 60) durationScore = 100;  // 1時間以上
            else if (totalDuration >= 45) durationScore = 75;   // 45分以上
            else if (totalDuration >= 30) durationScore = 50;   // 30分以上
            else if (totalDuration >= 15) durationScore = 25;   // 15分以上
            else durationScore = 0;

            if (exerciseCount === 0) exerciseCountScore = 0;
            else if (exerciseCount >= 3) exerciseCountScore = 100;
            else if (exerciseCount === 2) exerciseCountScore = 66;
            else if (exerciseCount === 1) exerciseCountScore = 33;
        }

        const exerciseScore = Math.round((durationScore + exerciseCountScore) / 2);

        // コンディションデータ
        const idealSleepHoursMap = { 1: 5, 2: 6, 3: 7, 4: 8, 5: 9 };
        const idealSleepHours = idealSleepHoursMap[profile.idealSleepHours] || 8;
        const actualSleepHoursMap = { 1: 5, 2: 6, 3: 7, 4: 8, 5: 9 };
        const actualSleepHours = actualSleepHoursMap[record.conditions?.sleepHours] || 0;

        // コンディションスコア計算
        const sleepRate = Math.min(100, idealSleepHours > 0 ? (actualSleepHours / idealSleepHours) * 100 : 0);

        const sleepQuality = record.conditions?.sleepQuality || 0;
        const appetite = record.conditions?.appetite || 0;
        const digestion = record.conditions?.digestion || 0;
        const focus = record.conditions?.focus || 0;
        const stress = record.conditions?.stress || 0;
        const invertedStress = 6 - stress; // ストレスは逆転（5が最悪→1、1が最良→5）

        const metricsAverage = ((sleepQuality + appetite + digestion + focus + invertedStress) / 5) * 20; // 5段階→100点換算

        const conditionScore = Math.round(sleepRate * 0.4 + metricsAverage * 0.6);

        return {
            food: {
                score: foodScore,
                protein: Math.round(proteinRate),
                fat: Math.round(fatRate),
                carbs: Math.round(carbsRate),
                calories: Math.round(calorieScore)
            },
            exercise: {
                score: exerciseScore,
                duration: Math.round(durationScore),
                exerciseCount: Math.round(exerciseCountScore),
                totalMinutes: totalDuration,
                count: exerciseCount
            },
            condition: {
                score: conditionScore,
                sleep: Math.round(sleepRate),
                metrics: Math.round(metricsAverage),
                actualSleepHours: actualSleepHours,
                idealSleepHours: idealSleepHours
            }
        };
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

    // Gemini APIを呼び出し（マルチモデル対応、リトライ機能付き）
    // model: 使用するモデル名（デフォルト: gemini-2.5-flash）
    sendMessage: async (message, conversationHistory = [], userProfile = null, model = 'gemini-2.5-flash') => {
        const maxRetries = 3;
        const retryDelay = 2000; // 2秒

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
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
                            maxOutputTokens: 8192  // 出力トークン上限を拡大
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

                    // 503エラー（過負荷）の場合はリトライ
                    if (response.status === 503 && attempt < maxRetries) {
                        console.warn(`Gemini API 503エラー (試行 ${attempt}/${maxRetries}). ${retryDelay/1000}秒後にリトライします...`);
                        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt)); // 指数バックオフ
                        continue;
                    }

                    console.error('Gemini API Error:', errorData);
                    const errorMessage = `Status ${response.status}: ${errorData?.error?.message || 'Unknown error'}`;
                    return {
                        success: false,
                        error: `API通信エラーが発生しました。(${errorMessage})`
                    };
                }

                const data = await response.json();

                // トークン使用量をログ出力
                if (data.usageMetadata) {
                    console.log('[Gemini API] Token usage:', {
                        promptTokens: data.usageMetadata.promptTokenCount,
                        candidatesTokens: data.usageMetadata.candidatesTokenCount,
                        totalTokens: data.usageMetadata.totalTokenCount
                    });
                }

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
                    const responseText = candidate.content.parts[0].text;
                    console.log('[Gemini API] Response length:', responseText.length, 'characters');
                    return {
                        success: true,
                        text: responseText
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
                // リトライ可能なエラーの場合
                if (attempt < maxRetries) {
                    console.warn(`Gemini APIエラー (試行 ${attempt}/${maxRetries}). ${retryDelay/1000}秒後にリトライします...`, error.message);
                    await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
                    continue;
                }

                console.error('Gemini API Error:', error);
                return {
                    success: false,
                    error: 'AIとの通信中にネットワークエラーが発生しました。接続を確認してください。'
                };
            }
        }

        // 全リトライ失敗
        return {
            success: false,
            error: 'AIとの通信に失敗しました。しばらく時間をおいてから再度お試しください。'
        };
    },

    // AIクレジット管理
    getAICredits: async (userId) => {
        const profile = await DataService.getUserProfile(userId);
        if (!profile || !profile.subscription) {
            return {
                monthly: 0,
                remaining: 0,
                used: 0,
                purchased: 0,
                isPremium: false
            };
        }

        const credits = profile.subscription.aiCredits || {
            monthly: SUBSCRIPTION_PLAN.aiCredits.monthly,
            remaining: 0,
            used: 0,
            purchased: 0,
            lastReset: new Date().toISOString().split('T')[0]
        };

        // 月が変わったらリセット
        const today = new Date().toISOString().split('T')[0];
        const lastReset = credits.lastReset || today;
        const currentMonth = today.substring(0, 7); // YYYY-MM
        const lastMonth = lastReset.substring(0, 7);

        if (currentMonth !== lastMonth) {
            // 新しい月 = クレジットリセット
            credits.monthly = SUBSCRIPTION_PLAN.aiCredits.monthly;
            credits.remaining = SUBSCRIPTION_PLAN.aiCredits.monthly;
            credits.used = 0;
            credits.purchased = 0;
            credits.lastReset = today;

            // Firestoreに保存
            await DataService.saveUserProfile(userId, {
                ...profile,
                subscription: {
                    ...profile.subscription,
                    aiCredits: credits
                }
            });
        }

        return {
            ...credits,
            isPremium: profile.subscription.status === 'active'
        };
    },

    // AIクレジット消費
    consumeAICredit: async (userId) => {
        const profile = await DataService.getUserProfile(userId);
        if (!profile || !profile.subscription || profile.subscription.status !== 'active') {
            return { success: false, error: 'プレミアムプランに登録してください' };
        }

        const credits = await GeminiAPI.getAICredits(userId);

        if (credits.remaining <= 0) {
            return { success: false, error: 'AIクレジットが不足しています。追加購入してください。' };
        }

        // クレジット消費
        const updatedCredits = {
            ...credits,
            remaining: credits.remaining - 1,
            used: credits.used + 1
        };

        await DataService.saveUserProfile(userId, {
            ...profile,
            subscription: {
                ...profile.subscription,
                aiCredits: updatedCredits
            }
        });

        return { success: true, remaining: updatedCredits.remaining };
    },

    // AIクレジット追加購入
    purchaseAICredits: async (userId, amount) => {
        const profile = await DataService.getUserProfile(userId);
        if (!profile || !profile.subscription) {
            return { success: false, error: 'サブスクリプション情報が見つかりません' };
        }

        const credits = profile.subscription.aiCredits || {
            monthly: SUBSCRIPTION_PLAN.aiCredits.monthly,
            remaining: 0,
            used: 0,
            purchased: 0,
            lastReset: new Date().toISOString().split('T')[0]
        };

        // クレジット追加
        const updatedCredits = {
            ...credits,
            remaining: credits.remaining + amount,
            purchased: credits.purchased + amount
        };

        await DataService.saveUserProfile(userId, {
            ...profile,
            subscription: {
                ...profile.subscription,
                aiCredits: updatedCredits
            }
        });

        return { success: true, remaining: updatedCredits.remaining };
    }
};

// ===== クレジット管理システム =====
const CreditService = {
    // 7日間無料トライアル期間チェック
    checkFreeTrialStatus: (userProfile) => {
        if (userProfile.subscriptionTier === 'premium') {
            return { isActive: false, daysRemaining: 0, isInTrial: false };
        }

        // 登録日から7日間が無料トライアル期間
        const registrationDate = userProfile.registrationDate ||
            (DEV_MODE ? localStorage.getItem(STORAGE_KEYS.REGISTRATION_DATE) : null);

        if (!registrationDate) {
            return { isActive: false, daysRemaining: 0, isInTrial: false };
        }

        const regDate = new Date(registrationDate);
        const trialEndDate = new Date(regDate);
        trialEndDate.setDate(trialEndDate.getDate() + 7); // 登録日から7日後

        const now = new Date();
        const isActive = now < trialEndDate;
        const daysRemaining = Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24));

        return {
            isActive,
            daysRemaining: isActive ? Math.max(0, daysRemaining) : 0,
            isInTrial: now < trialEndDate
        };
    },

    // 無料期間終了時の処理
    expireFreeTrialIfNeeded: async (userId, userProfile) => {
        const trialStatus = CreditService.checkFreeTrialStatus(userProfile);

        if (!trialStatus.isActive && !userProfile.isFreeTrialExpired) {
            // 無料期間終了：残りクレジットを0にする
            await DataService.saveUserProfile(userId, {
                ...userProfile,
                analysisCredits: 0,
                isFreeTrialExpired: true
            });

            console.log(`[Credit] User ${userId} free trial expired. Credits cleared.`);
            return true; // 期限切れ処理実行
        }

        return false;
    },

    // 分析アクセス可否チェック
    canAccessAnalysis: async (userId, userProfile) => {
        // 開発モード：Premium機能有効化
        if (typeof DEV_PREMIUM_MODE !== 'undefined' && DEV_PREMIUM_MODE) {
            return {
                allowed: true,
                remainingCredits: 999,
                tier: 'premium',
                freeTrialActive: false,
                freeTrialDaysRemaining: 0,
                profile: userProfile,
                devMode: true
            };
        }

        // 無料期間チェック & 期限切れ処理
        await CreditService.expireFreeTrialIfNeeded(userId, userProfile);

        // 再取得（期限切れ処理で更新された可能性があるため）
        const updatedProfile = await DataService.getUserProfile(userId);
        const hasCredits = (updatedProfile.analysisCredits || 0) > 0;
        const trialStatus = CreditService.checkFreeTrialStatus(updatedProfile);

        return {
            allowed: hasCredits,
            remainingCredits: updatedProfile.analysisCredits || 0,
            tier: updatedProfile.subscriptionTier,
            freeTrialActive: trialStatus.isActive,
            freeTrialDaysRemaining: trialStatus.daysRemaining,
            profile: updatedProfile // 更新後のプロファイルを返す
        };
    },

    // クレジット消費
    consumeCredit: async (userId, userProfile) => {
        // 開発モード：クレジット消費をスキップ
        if (typeof DEV_PREMIUM_MODE !== 'undefined' && DEV_PREMIUM_MODE) {
            console.log(`[Credit] DEV MODE: Skipping credit consumption`);
            return {
                success: true,
                remainingCredits: 999,
                isFirstAnalysis: (userProfile.totalAnalysisUsed || 0) === 0,
                devMode: true
            };
        }

        const accessCheck = await CreditService.canAccessAnalysis(userId, userProfile);

        if (!accessCheck.allowed) {
            throw new Error('NO_CREDITS');
        }

        const profile = accessCheck.profile;
        const newCredits = profile.analysisCredits - 1;

        await DataService.saveUserProfile(userId, {
            ...profile,
            analysisCredits: newCredits,
            totalAnalysisUsed: (profile.totalAnalysisUsed || 0) + 1,
            currentMonthUsed: (profile.currentMonthUsed || 0) + 1,
            freeTrialCreditsUsed: profile.subscriptionTier === 'free'
                ? (profile.freeTrialCreditsUsed || 0) + 1
                : profile.freeTrialCreditsUsed
        });

        console.log(`[Credit] User ${userId} consumed 1 credit. Remaining: ${newCredits}`);

        return {
            success: true,
            remainingCredits: newCredits,
            isFirstAnalysis: (profile.totalAnalysisUsed || 0) === 0 // 初回分析判定
        };
    },

    // Premium会員の月次クレジットリセット
    checkAndResetMonthlyCredits: async (userId, userProfile) => {
        if (userProfile.subscriptionTier !== 'premium') return false;

        const now = new Date();
        const lastReset = userProfile.creditsResetDate;

        // Firestore Timestampの場合
        const lastResetDate = lastReset && lastReset.toDate ? lastReset.toDate() : lastReset ? new Date(lastReset) : null;

        // 今日が1日 かつ 前回リセットが先月以前
        if (now.getDate() === 1 && (!lastResetDate || now.getMonth() !== lastResetDate.getMonth())) {
            const timestamp = DEV_MODE ? now.toISOString() : firebase.firestore.Timestamp.now();

            await DataService.saveUserProfile(userId, {
                ...userProfile,
                analysisCredits: 100, // 毎月100クレジット付与
                currentMonthUsed: 0,
                creditsResetDate: timestamp
            });

            console.log(`[Credit] Premium user ${userId} received 100 credits for new month`);
            return true;
        }

        return false;
    },

    // クレジット追加購入
    addPurchasedCredits: async (userId, amount) => {
        const userProfile = await DataService.getUserProfile(userId);

        await DataService.saveUserProfile(userId, {
            ...userProfile,
            analysisCredits: (userProfile.analysisCredits || 0) + amount,
            lifetimeCreditsPurchased: (userProfile.lifetimeCreditsPurchased || 0) + amount
        });

        console.log(`[Credit] User ${userId} purchased ${amount} credits`);
        return { success: true, totalCredits: (userProfile.analysisCredits || 0) + amount };
    }
};

// ===== 経験値・レベル・クレジット管理システム =====
const ExperienceService = {
    // 初期値
    INITIAL_CREDITS: 14,
    LEVEL_UP_CREDITS: 3,
    MILESTONE_INTERVAL: 10,
    MILESTONE_CREDITS: 10,

    // レベルアップに必要な累計経験値を計算
    // LvN到達に必要な累計経験値 = 100 * N * (N-1) / 2
    getRequiredExpForLevel: (level) => {
        return 100 * level * (level - 1) / 2;
    },

    // 現在の経験値から現在のレベルを計算
    calculateLevel: (experience) => {
        let level = 1;
        while (ExperienceService.getRequiredExpForLevel(level + 1) <= experience) {
            level++;
        }
        return level;
    },

    // 次のレベルまでの必要経験値を計算
    getExpToNextLevel: (currentLevel, currentExp) => {
        const nextLevelRequired = ExperienceService.getRequiredExpForLevel(currentLevel + 1);
        const currentLevelRequired = ExperienceService.getRequiredExpForLevel(currentLevel);
        return {
            current: currentExp - currentLevelRequired,
            required: nextLevelRequired - currentLevelRequired,
            total: nextLevelRequired
        };
    },

    // ユーザーの経験値・レベル・クレジット情報を取得
    getUserExperience: async (userId) => {
        const profile = await DataService.getUserProfile(userId);

        // 既存ユーザーでクレジット情報がない場合、初期化する
        if (profile && profile.freeCredits === undefined) {
            console.log('[ExperienceService] Existing user without credits detected. Initializing...');
            profile.experience = 0;
            profile.level = 1;
            profile.freeCredits = 14; // 初回クレジット
            profile.paidCredits = 0;
            profile.processedScoreDates = [];
            profile.processedDirectiveDates = [];
            profile.registrationDate = profile.joinDate || new Date().toISOString();

            // 保存
            await DataService.saveUserProfile(userId, profile);
            console.log('[ExperienceService] Initialized credits for existing user:', userId);
        }

        const experience = profile?.experience || 0;
        const level = profile?.level || 1;
        const freeCredits = profile?.freeCredits || 0;
        const paidCredits = profile?.paidCredits || 0;
        const registrationDate = profile?.registrationDate || profile?.joinDate || new Date().toISOString();

        return {
            experience,
            level,
            freeCredits,
            paidCredits,
            totalCredits: freeCredits + paidCredits,
            registrationDate
        };
    },

    // 経験値を追加してレベルアップをチェック
    addExperience: async (userId, expPoints) => {
        const profile = await DataService.getUserProfile(userId);

        const currentExp = profile?.experience || 0;
        const currentLevel = profile?.level || 1;
        const newExp = currentExp + expPoints;
        const newLevel = ExperienceService.calculateLevel(newExp);

        // レベルアップの判定
        const leveledUp = newLevel > currentLevel;
        const levelsGained = newLevel - currentLevel;

        // レベルアップ報酬の計算
        let creditsEarned = 0;
        let milestoneReached = [];

        if (leveledUp) {
            // 通常レベルアップ報酬
            creditsEarned = levelsGained * ExperienceService.LEVEL_UP_CREDITS;

            // マイルストーン報酬（10, 20, 30...レベル）
            for (let i = currentLevel + 1; i <= newLevel; i++) {
                if (i % ExperienceService.MILESTONE_INTERVAL === 0) {
                    creditsEarned += ExperienceService.MILESTONE_CREDITS;
                    milestoneReached.push(i);
                }
            }
        }

        // プロフィール更新
        const updatedProfile = {
            ...profile,
            experience: newExp,
            level: newLevel,
            freeCredits: (profile?.freeCredits || 0) + creditsEarned
        };

        await DataService.saveUserProfile(userId, updatedProfile);

        console.log(`[Experience] User ${userId} gained ${expPoints} XP. New level: ${newLevel} (${leveledUp ? '+' + levelsGained : 'no change'})`);
        if (leveledUp) {
            console.log(`[Experience] Level up! Earned ${creditsEarned} credits (${levelsGained * ExperienceService.LEVEL_UP_CREDITS} from levels + ${creditsEarned - levelsGained * ExperienceService.LEVEL_UP_CREDITS} from milestones)`);
        }

        return {
            success: true,
            experience: newExp,
            level: newLevel,
            leveledUp,
            levelsGained,
            creditsEarned,
            milestoneReached,
            totalCredits: (profile?.freeCredits || 0) + creditsEarned + (profile?.paidCredits || 0)
        };
    },

    // クレジットを消費（無料→有料の順）
    consumeCredits: async (userId, amount) => {
        const profile = await DataService.getUserProfile(userId);

        let freeCredits = profile?.freeCredits || 0;
        let paidCredits = profile?.paidCredits || 0;
        const totalCredits = freeCredits + paidCredits;

        if (totalCredits < amount) {
            return {
                success: false,
                error: 'クレジットが不足しています',
                freeCredits,
                paidCredits,
                totalCredits
            };
        }

        // 無料クレジットから優先的に消費
        let remaining = amount;
        if (freeCredits >= remaining) {
            freeCredits -= remaining;
            remaining = 0;
        } else {
            remaining -= freeCredits;
            freeCredits = 0;
            paidCredits -= remaining;
        }

        await DataService.saveUserProfile(userId, {
            ...profile,
            freeCredits,
            paidCredits
        });

        console.log(`[Experience] User ${userId} consumed ${amount} credits. Remaining: ${freeCredits + paidCredits} (free: ${freeCredits}, paid: ${paidCredits})`);

        return {
            success: true,
            freeCredits,
            paidCredits,
            totalCredits: freeCredits + paidCredits
        };
    },

    // 有料クレジットを追加
    addPaidCredits: async (userId, amount) => {
        const profile = await DataService.getUserProfile(userId);

        const newPaidCredits = (profile?.paidCredits || 0) + amount;

        await DataService.saveUserProfile(userId, {
            ...profile,
            paidCredits: newPaidCredits
        });

        console.log(`[Experience] User ${userId} purchased ${amount} paid credits. Total paid: ${newPaidCredits}`);

        return {
            success: true,
            paidCredits: newPaidCredits,
            totalCredits: (profile?.freeCredits || 0) + newPaidCredits
        };
    },

    // 日次スコアから経験値を計算して加算
    processDailyScore: async (userId, date, scores) => {
        // スコアの合計を経験値として加算
        const totalScore = (scores.food?.score || 0) + (scores.exercise?.score || 0) + (scores.condition?.score || 0);

        if (totalScore <= 0) {
            console.log(`[Experience] No score to process for ${date}`);
            return { success: false, error: 'No score available' };
        }

        // 既にこの日付のスコアを処理済みかチェック
        const profile = await DataService.getUserProfile(userId);
        const processedDates = profile?.processedScoreDates || [];

        if (processedDates.includes(date)) {
            console.log(`[Experience] Score for ${date} already processed`);
            return { success: false, error: 'Already processed', alreadyProcessed: true };
        }

        // 経験値を追加
        const result = await ExperienceService.addExperience(userId, totalScore);

        // 処理済み日付リストに追加
        processedDates.push(date);
        await DataService.saveUserProfile(userId, {
            ...profile,
            experience: result.experience,
            level: result.level,
            freeCredits: result.totalCredits - (profile?.paidCredits || 0),
            processedScoreDates: processedDates
        });

        console.log(`[Experience] Processed score for ${date}: ${totalScore} XP`);

        return {
            ...result,
            scoreDate: date,
            scoreTotal: totalScore
        };
    },

    // マイルストーン（リワード）一覧を取得
    getMilestones: async (userId) => {
        const { level } = await ExperienceService.getUserExperience(userId);

        const milestones = [];
        for (let i = ExperienceService.MILESTONE_INTERVAL; i <= 100; i += ExperienceService.MILESTONE_INTERVAL) {
            milestones.push({
                level: i,
                reward: ExperienceService.MILESTONE_CREDITS,
                achieved: level >= i
            });
        }

        return milestones;
    },

    // Gemini API呼び出しラッパー（クレジット消費を自動実行）
    callGeminiWithCredit: async (userId, message, conversationHistory = [], userProfile = null, model = 'gemini-2.5-flash') => {
        // クレジットチェック
        const { totalCredits } = await ExperienceService.getUserExperience(userId);

        if (totalCredits < 1) {
            return {
                success: false,
                error: 'クレジットが不足しています。レベルアップまたは追加購入でクレジットを獲得してください。',
                noCredits: true
            };
        }

        // Gemini API呼び出し
        const result = await GeminiAPI.sendMessage(message, conversationHistory, userProfile, model);

        // 成功した場合のみクレジット消費
        if (result.success) {
            await ExperienceService.consumeCredits(userId, 1);
            console.log(`[Experience] Consumed 1 credit for Gemini API call. User: ${userId}`);
        }

        return result;
    },

    // 指示書完了で経験値付与（1日1回のみ）
    processDirectiveCompletion: async (userId, date) => {
        try {
            const userRef = DEV_MODE
                ? { id: userId }
                : db.collection('users').doc(userId);

            let userData;
            if (DEV_MODE) {
                const stored = localStorage.getItem(`user_${userId}`);
                userData = stored ? JSON.parse(stored) : null;
            } else {
                const userDoc = await userRef.get();
                userData = userDoc.exists ? userDoc.data() : null;
            }

            if (!userData) {
                console.error('[Experience] User not found');
                return { success: false, error: 'User not found' };
            }

            // 既に処理済みかチェック
            const processedDates = userData.processedDirectiveDates || [];
            if (processedDates.includes(date)) {
                console.log(`[Experience] Directive already processed for date: ${date}`);
                return { success: false, alreadyProcessed: true };
            }

            // 10XP付与
            const expResult = await ExperienceService.addExperience(userId, 10);

            // 処理済み日付を記録
            processedDates.push(date);

            if (DEV_MODE) {
                userData.processedDirectiveDates = processedDates;
                localStorage.setItem(`user_${userId}`, JSON.stringify(userData));
            } else {
                await userRef.update({
                    processedDirectiveDates: processedDates
                });
            }

            console.log(`[Experience] Directive completion processed for ${date}: +10 XP`);

            return {
                success: true,
                experience: expResult.experience,
                level: expResult.level,
                leveledUp: expResult.leveledUp,
                creditsEarned: expResult.creditsEarned,
                milestoneReached: expResult.milestoneReached
            };
        } catch (error) {
            console.error('[Experience] Failed to process directive completion:', error);
            return { success: false, error: error.message };
        }
    },

    // 無料クレジットを手動追加（開発モード用）
    addFreeCredits: async (userId, amount) => {
        try {
            const userRef = DEV_MODE
                ? { id: userId }
                : db.collection('users').doc(userId);

            let userData;
            if (DEV_MODE) {
                const stored = localStorage.getItem(`user_${userId}`);
                userData = stored ? JSON.parse(stored) : null;
            } else {
                const userDoc = await userRef.get();
                userData = userDoc.exists ? userDoc.data() : null;
            }

            if (!userData) {
                console.error('[Experience] User not found');
                return { success: false, error: 'User not found' };
            }

            const newFreeCredits = (userData.freeCredits || 0) + amount;

            if (DEV_MODE) {
                userData.freeCredits = newFreeCredits;
                localStorage.setItem(`user_${userId}`, JSON.stringify(userData));
            } else {
                await userRef.update({
                    freeCredits: newFreeCredits
                });
            }

            console.log(`[Experience] Added ${amount} free credits. Total free: ${newFreeCredits}`);

            return {
                success: true,
                freeCredits: newFreeCredits,
                totalCredits: newFreeCredits + (userData.paidCredits || 0)
            };
        } catch (error) {
            console.error('[Experience] Failed to add free credits:', error);
            return { success: false, error: error.message };
        }
    }
};
