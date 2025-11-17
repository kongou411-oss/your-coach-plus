// ===== services.js =====
// Service layer for Your Coach+ Beta
// Contains database functions, DataService object, and GeminiAPI utilities
//
// Dependencies:
// - config.js: STORAGE_KEYS, GEMINI_API_KEY
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
        foodCategories[category] = foodDatabase[category];
    });

    // 旧カスタムカテゴリロジックは削除（カスタム食材/料理/サプリに分割されたため）
    // カスタムアイテムは検索モーダル内で直接表示されます

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
        let authData = {
            uid: userId,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || '',
            photoURL: firebaseUser.photoURL || '',
            emailVerified: firebaseUser.emailVerified,
            provider: firebaseUser.providerData[0]?.providerId || 'password',
            lastLoginAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        try {
            const userRef = db.collection('users').doc(userId);
            const doc = await userRef.get();

            if (!doc.exists) {
                // 新規ユーザーの場合、機能開放関連のLocalStorageをクリア
                console.log('New user detected, clearing feature unlock data');
                localStorage.removeItem(STORAGE_KEYS.FEATURES_COMPLETED);
                localStorage.removeItem(STORAGE_KEYS.REGISTRATION_DATE);
                localStorage.removeItem(STORAGE_KEYS.UNLOCK_MODALS_SHOWN);
                localStorage.removeItem(STORAGE_KEYS.ONBOARDING_TRIGGERS);
                localStorage.removeItem('showFeatureUnlockModals');
                localStorage.removeItem('featureUnlockModalsCompleted');
                localStorage.removeItem('showUpgradeModalPending');

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
        let profile = null;


        // 既存データの互換性処理: 旧スタイル名を「ボディメイカー」に変換
        if (profile && profile.style) {
            const oldStyles = ['筋肥大', '筋力', '持久力', 'バランス'];
            if (oldStyles.includes(profile.style)) {
                console.log(`スタイル変換: ${profile.style} → ボディメイカー`);
                profile.style = 'ボディメイカー';
                // 変換後のプロフィールを保存
                await DataService.saveUserProfile(userId, profile);
            }
        }

        // profileが存在する場合、デフォルト値とフラグを設定
        if (profile) {
            return {
                ...profile,
                freeCredits: profile.freeCredits ?? 14,
                paidCredits: profile.paidCredits ?? 0,
                // 既存ユーザーのために：onboardingCompletedがundefinedの場合はtrueとみなす
                onboardingCompleted: profile.onboardingCompleted !== undefined ? profile.onboardingCompleted : true
            };
        }

        return null;
    },

    // ユーザープロファイル保存
    saveUserProfile: async (userId, profile) => {
        try {
            // Firestoreはundefinedを許可しないため、undefinedフィールドを削除
            const cleanProfile = { ...profile };
            Object.keys(cleanProfile).forEach(key => {
                if (cleanProfile[key] === undefined) {
                    delete cleanProfile[key];
                }
            });

            await db.collection('users').doc(userId).set(cleanProfile, { merge: true });
            return true;
        } catch (error) {
            console.error('Error saving user profile:', error);
            return false;
        }
    },

    // 日次記録取得
    getDailyRecord: async (userId, date) => {
        try {
            // サーバー優先で取得（キャッシュを使わない）
            const doc = await db
                .collection('dailyRecords')
                .doc(userId)
                .collection('records')
                .doc(date)
                .get({ source: 'server' });
            return doc.exists ? doc.data() : null;
        } catch (error) {
            // ネットワークエラーの場合はキャッシュから取得を試みる
            if (error.code === 'unavailable') {
                console.warn('[DataService] Network unavailable, trying cache');
                try {
                    const doc = await db
                        .collection('dailyRecords')
                        .doc(userId)
                        .collection('records')
                        .doc(date)
                        .get({ source: 'cache' });
                    return doc.exists ? doc.data() : null;
                } catch (cacheError) {
                    console.error('[DataService] Cache fetch failed:', cacheError);
                    return null;
                }
            }
            // 権限エラー（新規ユーザー）の場合は静かに null を返す
            if (error.code === 'permission-denied') {
                return null;
            }
            console.error('Error fetching daily record:', error);
            return null;
        }
    },

    // 日次記録保存
    saveDailyRecord: async (userId, date, record) => {
        try {
            // undefinedフィールドを除去
            const cleanRecord = JSON.parse(JSON.stringify(record, (key, value) => {
                return value === undefined ? null : value;
            }));

            await db
                .collection('dailyRecords')
                .doc(userId)
                .collection('records')
                .doc(date)
                .set(cleanRecord, { merge: true });
            return true;
        } catch (error) {
            console.error('Error saving daily record:', error);
            return false;
        }
    },

    // 分析レポート保存
    saveAnalysisReport: async (userId, report) => {
        const reportData = {
            ...report,
            createdAt: new Date().toISOString(),
            id: `report_${Date.now()}`
        };


        try {
            const reportRef = db
                .collection('users')
                .doc(userId)
                .collection('analysisReports')
                .doc(reportData.id);
            await reportRef.set(reportData);
            return reportData;
        } catch (error) {
            console.error('Error saving analysis report:', error);
            throw error;
        }
    },

    // 分析レポート取得
    getAnalysisReports: async (userId) => {

        try {
            const snapshot = await db
                .collection('users')
                .doc(userId)
                .collection('analysisReports')
                .orderBy('createdAt', 'desc')
                .get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting analysis reports:', error);
            return [];
        }
    },

    // 分析レポート削除
    deleteAnalysisReport: async (userId, reportId) => {

        try {
            await db
                .collection('users')
                .doc(userId)
                .collection('analysisReports')
                .doc(reportId)
                .delete();
            return true;
        } catch (error) {
            console.error('Error deleting analysis report:', error);
            throw error;
        }
    },

    updateAnalysisReport: async (userId, reportId, updates) => {

        try {
            await db
                .collection('users')
                .doc(userId)
                .collection('analysisReports')
                .doc(reportId)
                .update(updates);
            return true;
        } catch (error) {
            console.error('Error updating analysis report:', error);
            throw error;
        }
    },

    // 写真アップロード
    uploadPhoto: async (userId, file, recordId) => {
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
    },

    // ワークアウトテンプレート削除
    deleteWorkoutTemplate: async (userId, templateId) => {
    },

    // 食事テンプレート取得
    getMealTemplates: async (userId) => {
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
    },

    // 食事テンプレート削除
    deleteMealTemplate: async (userId, templateId) => {
    },

    // サプリメントテンプレート取得
    getSupplementTemplates: async (userId) => {
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
    },

    // サプリメントテンプレート削除
    deleteSupplementTemplate: async (userId, templateId) => {
    },

    // PG BASE チャット履歴取得
    getPGBaseChatHistory: async () => {
        // Firestore実装時はここに追加
        return [];
    },

    // PG BASE チャット履歴保存
    savePGBaseChatHistory: async (history) => {
        // Firestore実装時はここに追加
        return true;
    },


    // コミュニティ投稿取得
    // コミュニティ投稿取得（承認済みのみ）
    getCommunityPosts: async () => {
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
        return true;
    },

    // ===== ワークアウト履歴管理 =====

    // ワークアウト履歴を保存（種目別、RM別、重量別に記録）
    saveWorkoutHistory: async (userId, exerciseName, setData) => {
        const historyKey = `workout_history_${userId}`;
        const timestamp = new Date().toISOString();


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

        // ===== 食事データの集計（ダッシュボードと同じロジック） =====
        const totalCalories = (record.meals || []).reduce((sum, m) => sum + (m.calories || 0), 0);

        let totalProtein = 0;
        let totalFat = 0;
        let totalCarbs = 0;
        let totalFiber = 0;
        let totalSaturatedFat = 0;
        let totalMonounsaturatedFat = 0;
        let totalPolyunsaturatedFat = 0;
        let totalMediumChainFat = 0;
        let weightedDIAAS = 0; // タンパク質量で重み付けしたDIAAS
        let totalGL = 0; // グリセミック負荷

        // ビタミン・ミネラルの集計
        const vitamins = {
            vitaminA: 0, vitaminB1: 0, vitaminB2: 0, vitaminB6: 0, vitaminB12: 0,
            vitaminC: 0, vitaminD: 0, vitaminE: 0, vitaminK: 0,
            niacin: 0, pantothenicAcid: 0, biotin: 0, folicAcid: 0
        };
        const minerals = {
            calcium: 0, iron: 0, magnesium: 0, zinc: 0, sodium: 0, potassium: 0,
            phosphorus: 0, copper: 0, manganese: 0, iodine: 0, selenium: 0, chromium: 0, molybdenum: 0
        };

        (record.meals || []).forEach(meal => {
            (meal.items || []).forEach(item => {
                const isCountUnit = ['本', '個', '杯', '枚', '錠'].some(u => (item.unit || '').includes(u));
                const ratio = isCountUnit ? item.amount : item.amount / 100;

                // 基本栄養素
                const protein = (item.protein || 0) * ratio;
                const fat = (item.fat || 0) * ratio;
                const carbs = (item.carbs || 0) * ratio;

                totalProtein += protein;
                totalFat += fat;
                totalCarbs += carbs;
                totalFiber += (item.fiber || 0) * ratio;

                // 脂肪酸
                totalSaturatedFat += (item.saturatedFat || 0) * ratio;
                totalMonounsaturatedFat += (item.monounsaturatedFat || 0) * ratio;
                totalPolyunsaturatedFat += (item.polyunsaturatedFat || 0) * ratio;
                totalMediumChainFat += (item.mediumChainFat || 0) * ratio;

                // DIAAS（タンパク質量で重み付け）
                if (item.diaas && protein > 0) {
                    weightedDIAAS += item.diaas * protein;
                }

                // GL値（GI × 炭水化物g / 100）
                if (item.gi && carbs > 0) {
                    totalGL += (item.gi * carbs) / 100;
                }

                // ビタミン（個別キー形式）
                const vitaminKeys = ['vitaminA', 'vitaminB1', 'vitaminB2', 'vitaminB6', 'vitaminB12', 'vitaminC', 'vitaminD', 'vitaminE', 'vitaminK', 'niacin', 'pantothenicAcid', 'biotin', 'folicAcid', 'folate'];
                vitaminKeys.forEach(key => {
                    if (item[key]) {
                        // folateはfolicAcidとして集計（データベースでプロパティ名が混在しているため）
                        const targetKey = (key === 'folate') ? 'folicAcid' : key;
                        vitamins[targetKey] = (vitamins[targetKey] || 0) + item[key] * ratio;
                    }
                });

                // ミネラル（個別キー形式）
                const mineralKeys = ['calcium', 'iron', 'magnesium', 'zinc', 'sodium', 'potassium', 'phosphorus', 'copper', 'manganese', 'iodine', 'selenium', 'chromium', 'molybdenum'];
                mineralKeys.forEach(key => {
                    if (item[key]) {
                        minerals[key] = (minerals[key] || 0) + item[key] * ratio;
                    }
                });
            });
        });

        // ===== ① カロリースコア (10%) =====
        const calorieDeviation = target.calories > 0 ? Math.abs(totalCalories - target.calories) / target.calories : 0;
        const calorieScore = Math.max(0, 100 - (calorieDeviation * 200));
        // ±10%で80点、±20%で60点、±30%で40点、±50%で0点

        // ===== ② PFCスコア (20% × 3 = 60%) =====
        // タンパク質スコア
        const proteinDeviation = target.protein > 0 ? Math.abs(totalProtein - target.protein) / target.protein : 0;
        const proteinScore = Math.max(0, 100 - (proteinDeviation * 150));
        // ±10%で85点、±20%で70点、±30%で55点

        // 脂質スコア
        const fatDeviation = target.fat > 0 ? Math.abs(totalFat - target.fat) / target.fat : 0;
        const fatScore = Math.max(0, 100 - (fatDeviation * 200));
        // ±10%で80点、±20%で60点、±30%で40点

        // 炭水化物スコア
        const carbsDeviation = target.carbs > 0 ? Math.abs(totalCarbs - target.carbs) / target.carbs : 0;
        const carbsScore = Math.max(0, 100 - (carbsDeviation * 200));
        // ±10%で80点、±20%で60点、±30%で40点

        // ===== ③ DIAASスコア (5%) =====
        const avgDIAAS = totalProtein > 0 ? weightedDIAAS / totalProtein : 0;
        let diaaScore = 0;
        if (avgDIAAS >= 1.00) diaaScore = 100; // 優秀
        else if (avgDIAAS >= 0.90) diaaScore = 80; // 良好
        else if (avgDIAAS >= 0.75) diaaScore = 60; // 普通
        else if (avgDIAAS >= 0.50) diaaScore = 40; // 要改善
        else diaaScore = 20; // データ不足またはDIAAS低い

        // ===== ④ 脂肪酸バランススコア (5%) =====
        let fattyAcidScore = 50; // デフォルト（データ不足時）

        if (totalFat > 0) {
            const satRatio = totalSaturatedFat / totalFat; // 理想: 0.30-0.35
            const monoRatio = totalMonounsaturatedFat / totalFat; // 理想: 0.35-0.45
            const polyRatio = totalPolyunsaturatedFat / totalFat; // 理想: 0.20-0.30

            // 飽和脂肪酸スコア（30-35%が理想）
            let satScore = 0;
            if (satRatio >= 0.30 && satRatio <= 0.35) satScore = 100;
            else if (satRatio >= 0.25 && satRatio < 0.30) satScore = 80;
            else if (satRatio >= 0.20 && satRatio < 0.25) satScore = 60;
            else if (satRatio > 0.35 && satRatio <= 0.40) satScore = 80;
            else if (satRatio > 0.40 && satRatio <= 0.50) satScore = 60;
            else satScore = 40;

            // 一価不飽和脂肪酸スコア（35-45%が理想）
            let monoScore = 0;
            if (monoRatio >= 0.35 && monoRatio <= 0.45) monoScore = 100;
            else if (monoRatio >= 0.30 && monoRatio < 0.35) monoScore = 80;
            else if (monoRatio >= 0.25 && monoRatio < 0.30) monoScore = 60;
            else if (monoRatio > 0.45 && monoRatio <= 0.50) monoScore = 80;
            else monoScore = 40;

            // 多価不飽和脂肪酸スコア（20-30%が理想）
            let polyScore = 0;
            if (polyRatio >= 0.20 && polyRatio <= 0.30) polyScore = 100;
            else if (polyRatio >= 0.15 && polyRatio < 0.20) polyScore = 80;
            else if (polyRatio >= 0.10 && polyRatio < 0.15) polyScore = 60;
            else if (polyRatio > 0.30 && polyRatio <= 0.35) polyScore = 80;
            else polyScore = 40;

            fattyAcidScore = (satScore * 0.4 + monoScore * 0.3 + polyScore * 0.3);
        }

        // ===== ⑤ 血糖管理スコア (5%) =====
        let glScore = 50; // デフォルト（データ不足時）

        if (totalGL > 0) {
            // 1日のGL値: 100以下が理想、150以下が許容、それ以上は要改善
            if (totalGL <= 80) glScore = 100;
            else if (totalGL <= 100) glScore = 90;
            else if (totalGL <= 120) glScore = 75;
            else if (totalGL <= 150) glScore = 60;
            else if (totalGL <= 180) glScore = 40;
            else glScore = Math.max(0, 40 - (totalGL - 180) / 5);
        }

        // ===== ⑥ 食物繊維スコア (5%) =====
        let fiberScore = 50; // デフォルト

        // 食物繊維量スコア（20-30gが理想）
        let fiberAmountScore = 0;
        if (totalFiber >= 20 && totalFiber <= 30) fiberAmountScore = 100;
        else if (totalFiber >= 15 && totalFiber < 20) fiberAmountScore = 80;
        else if (totalFiber >= 10 && totalFiber < 15) fiberAmountScore = 60;
        else if (totalFiber >= 5 && totalFiber < 10) fiberAmountScore = 40;
        else if (totalFiber < 5) fiberAmountScore = 20;
        else if (totalFiber > 30 && totalFiber <= 35) fiberAmountScore = 90;
        else fiberAmountScore = Math.max(60, 90 - (totalFiber - 35) * 5);

        // 糖質:食物繊維比（10:1以下が理想）
        let carbFiberRatioScore = 0;
        if (totalFiber > 0) {
            const carbFiberRatio = totalCarbs / totalFiber;
            if (carbFiberRatio <= 10) carbFiberRatioScore = 100;
            else if (carbFiberRatio <= 15) carbFiberRatioScore = 80;
            else if (carbFiberRatio <= 20) carbFiberRatioScore = 60;
            else carbFiberRatioScore = Math.max(0, 60 - (carbFiberRatio - 20) * 3);
        } else {
            carbFiberRatioScore = 0;
        }

        fiberScore = (fiberAmountScore * 0.6 + carbFiberRatioScore * 0.4);

        // ===== ⑦ ビタミンスコア (5%) =====
        const vitaminTargets = {
            vitaminA: 800,      // μg/日
            vitaminB1: 1.4,     // mg/日
            vitaminB2: 1.6,     // mg/日
            vitaminB6: 1.4,     // mg/日
            vitaminB12: 2.4,    // μg/日
            vitaminC: 100,      // mg/日
            vitaminD: 8.5,      // μg/日
            vitaminE: 6.0,      // mg/日
            vitaminK: 150       // μg/日
        };

        const vitaminScores = Object.keys(vitaminTargets).map(key => {
            const actual = vitamins[key] || 0;
            const targetVal = vitaminTargets[key];
            const rate = targetVal > 0 ? actual / targetVal : 0;

            // 70-150%が100点、不足・過剰をペナルティ
            if (rate >= 0.7 && rate <= 1.5) return 100;
            else if (rate >= 0.5 && rate < 0.7) return 70;
            else if (rate >= 0.3 && rate < 0.5) return 50;
            else if (rate > 1.5 && rate < 2.0) return 80;
            else if (rate >= 2.0 && rate < 3.0) return 60;
            else return 30;
        });

        const vitaminScore = vitaminScores.length > 0
            ? vitaminScores.reduce((a, b) => a + b, 0) / vitaminScores.length
            : 50;

        // ===== ⑧ ミネラルスコア (5%) =====
        const mineralTargets = {
            calcium: 800,       // mg/日
            iron: 10,           // mg/日
            magnesium: 340,     // mg/日
            zinc: 10,           // mg/日
            sodium: 2000,       // mg/日（上限）
            potassium: 2500     // mg/日
        };

        const mineralScores = Object.keys(mineralTargets).map(key => {
            const actual = minerals[key] || 0;
            const targetVal = mineralTargets[key];
            const rate = targetVal > 0 ? actual / targetVal : 0;

            // Naは上限評価、他は充足率評価
            if (key === 'sodium') {
                if (rate <= 1.0) return 100;
                else if (rate <= 1.2) return 80;
                else if (rate <= 1.5) return 60;
                else return Math.max(0, 60 - (rate - 1.5) * 40);
            }

            // その他のミネラル
            if (rate >= 0.8 && rate <= 1.5) return 100;
            else if (rate >= 0.6 && rate < 0.8) return 75;
            else if (rate >= 0.4 && rate < 0.6) return 50;
            else if (rate > 1.5 && rate < 2.0) return 80;
            else return 30;
        });

        const mineralScore = mineralScores.length > 0
            ? mineralScores.reduce((a, b) => a + b, 0) / mineralScores.length
            : 50;

        // ===== 最終食事スコア =====
        const foodScore = Math.round(
            calorieScore * 0.10 +
            proteinScore * 0.20 +
            fatScore * 0.20 +
            carbsScore * 0.20 +
            diaaScore * 0.05 +
            fattyAcidScore * 0.05 +
            glScore * 0.05 +
            fiberScore * 0.05 +
            vitaminScore * 0.05 +
            mineralScore * 0.05
        );

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

        // コンディションデータ（全項目1-5の値として扱う）
        const sleepHours = record.conditions?.sleepHours || 0;
        const sleepQuality = record.conditions?.sleepQuality || 0;
        const appetite = record.conditions?.appetite || 0;
        const digestion = record.conditions?.digestion || 0;
        const focus = record.conditions?.focus || 0;
        const stress = record.conditions?.stress || 0;

        // コンディションスコア計算（6項目すべてが5なら100点）
        // 各項目1-5点 → 平均 → 20倍して100点満点に
        const conditionScore = Math.round(
            ((sleepHours + sleepQuality + appetite + digestion + focus + stress) / 6) * 20
        );

        return {
            food: {
                score: foodScore,
                // 8軸スコア
                calorie: Math.round(calorieScore),
                protein: Math.round(proteinScore),
                fat: Math.round(fatScore),
                carbs: Math.round(carbsScore),
                diaas: Math.round(diaaScore),
                fattyAcid: Math.round(fattyAcidScore),
                gl: Math.round(glScore),
                fiber: Math.round(fiberScore),
                vitamin: Math.round(vitaminScore),
                mineral: Math.round(mineralScore),
                // 実際の摂取量
                totalCalories: Math.round(totalCalories),
                totalProtein: Math.round(totalProtein * 10) / 10,
                totalFat: Math.round(totalFat * 10) / 10,
                totalCarbs: Math.round(totalCarbs * 10) / 10,
                totalFiber: Math.round(totalFiber * 10) / 10,
                totalGL: Math.round(totalGL * 10) / 10,
                avgDIAAS: Math.round(avgDIAAS * 100) / 100,
                // 脂肪酸詳細
                totalSaturatedFat: Math.round(totalSaturatedFat * 10) / 10,
                totalMonounsaturatedFat: Math.round(totalMonounsaturatedFat * 10) / 10,
                totalPolyunsaturatedFat: Math.round(totalPolyunsaturatedFat * 10) / 10,
                // ビタミン・ミネラル詳細
                vitamins: vitamins,
                minerals: minerals
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
                sleep: Math.round((sleepHours / 5) * 100),
                quality: Math.round((sleepQuality / 5) * 100),
                appetite: Math.round((appetite / 5) * 100),
                digestion: Math.round((digestion / 5) * 100),
                focus: Math.round((focus / 5) * 100),
                stress: Math.round((stress / 5) * 100)
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

    // Cloud Function (callGemini) 経由でVertex AIにメッセージを送信
    // model: 使用するモデル名（デフォルト: gemini-2.5-pro）
    sendMessage: async (message, conversationHistory = [], userProfile = null, model = 'gemini-2.5-pro') => {
        try {
            // 1. Cloud Function への参照を取得（asia-northeast2リージョンを明示的に指定）
            const functions = firebase.app().functions('asia-northeast2');
            const callGemini = functions.httpsCallable('callGemini');

            // 2. contents を構築
            const contents = [];
            if (conversationHistory.length === 0) {
                // 初回メッセージ: システムプロンプト + ユーザーメッセージ
                contents.push({
                    role: 'user',
                    parts: [{ text: GeminiAPI.getSystemPrompt(userProfile) + '\n\n' + message }]
                });
            } else {
                // 会話履歴を追加
                conversationHistory.forEach(msg => {
                    contents.push({
                        role: msg.role === 'user' ? 'user' : 'model',
                        parts: [{ text: msg.content }]
                    });
                });
                // 新しいメッセージを追加
                contents.push({
                    role: 'user',
                    parts: [{ text: message }]
                });
            }

            // 3. generationConfig と safetySettings
            const generationConfig = {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192
            };

            const safetySettings = [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
            ];

            // 4. Cloud Function に送信するデータ
            const dataToSend = {
                model: model,
                contents: contents,
                generationConfig: generationConfig,
                safetySettings: safetySettings
            };

            console.log("Calling Cloud Function 'callGemini' in asia-northeast2...");

            // 5. Cloud Function を呼び出す
            const result = await callGemini(dataToSend);

            console.log("Cloud Function response:", result.data);

            // 6. レスポンスを解析
            const responseData = result.data;

            if (!responseData.success) {
                return {
                    success: false,
                    error: responseData.error || 'AIの呼び出しに失敗しました。'
                };
            }

            // @google/generative-aiのレスポンス形式を解析
            const geminiResponse = responseData.response;

            if (geminiResponse && geminiResponse.candidates) {
                const candidate = geminiResponse.candidates[0];

                if (candidate.content && candidate.content.parts && candidate.content.parts[0] && candidate.content.parts[0].text) {
                    const responseText = candidate.content.parts[0].text;
                    console.log('[Cloud Function] Response length:', responseText.length, 'characters');
                    console.log('[Cloud Function] Remaining credits:', responseData.remainingCredits);

                    return {
                        success: true,
                        text: responseText,
                        remainingCredits: responseData.remainingCredits
                    };
                }
            }

            // レスポンスの形式が想定外の場合
            return {
                success: false,
                error: 'AIからの応答形式が不正です。'
            };

        } catch (error) {
            console.error('Cloud Function call failed:', error);

            // エラーメッセージを解析
            let errorMessage = error.message || 'サーバーエラーが発生しました。';

            if (error.code === 'unauthenticated') {
                errorMessage = 'ログインが必要です。';
            } else if (error.code === 'permission-denied') {
                errorMessage = 'AI分析クレジットが不足しています。';
            }

            return {
                success: false,
                error: `API通信エラーが発生しました。(${errorMessage})`
            };
        }
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
        const registrationDate = userProfile.registrationDate || null;

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
            const timestamp = firebase.firestore.Timestamp.now();

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
    callGeminiWithCredit: async (userId, message, conversationHistory = [], userProfile = null, model = 'gemini-2.5-pro') => {
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
            const userRef = db.collection('users').doc(userId);

            let userData;

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
            const userRef = db.collection('users').doc(userId);

            let userData;

            if (!userData) {
                console.error('[Experience] User not found');
                return { success: false, error: 'User not found' };
            }

            const newFreeCredits = (userData.freeCredits || 0) + amount;


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

// ========================================
// 通知サービス（Push Notification）
// ========================================
const NotificationService = {
    // 通知権限をリクエスト
    requestPermission: async () => {
        try {
            if (!('Notification' in window)) {
                console.error('[Notification] このブラウザは通知をサポートしていません');
                return { success: false, error: 'Notification not supported' };
            }

            const permission = await Notification.requestPermission();

            return {
                success: permission === 'granted',
                permission
            };
        } catch (error) {
            console.error('[Notification] Permission request failed:', error);
            return { success: false, error: error.message };
        }
    },

    // 通知権限をリクエストしてFCMトークンを取得（統合関数）
    requestNotificationPermission: async (userId) => {
        try {
            // 通知権限をリクエスト
            const permResult = await NotificationService.requestPermission();
            if (!permResult.success) {
                return permResult;
            }

            // FCMトークンを取得
            const tokenResult = await NotificationService.getFCMToken(userId);
            return tokenResult;
        } catch (error) {
            console.error('[Notification] Failed to request notification permission:', error);
            return { success: false, error: error.message };
        }
    },

    // FCMトークンを取得
    getFCMToken: async (userId) => {
        try {
            // Firebaseアプリが初期化されているか確認
            if (!firebase.apps || firebase.apps.length === 0) {
                console.error('[Notification] Firebase not initialized');
                return { success: false, error: 'Firebase not initialized' };
            }

            if (!firebase.messaging.isSupported()) {
                console.error('[Notification] FCM not supported');
                return { success: false, error: 'FCM not supported' };
            }

            const messaging = firebase.messaging();

            // Service Workerの登録を確認
            const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
            if (!registration) {
                console.error('[Notification] Service Worker not registered');
                return { success: false, error: 'Service Worker not registered' };
            }

            const token = await messaging.getToken({
                vapidKey: 'BIifQg3P5w9Eb4JU4EDqx7bbNeAhveYPK2GCeEyi28A6-y04sm11TASGWBoI0Enewki1f7PFvQ6KjsQb5J5EMXU',
                serviceWorkerRegistration: registration
            });

            if (token) {
                // トークンをFirestoreに保存
                await NotificationService.saveToken(userId, token);
                return { success: true, token };
            } else {
                console.error('[Notification] No FCM token available');
                return { success: false, error: 'No token available' };
            }
        } catch (error) {
            console.error('[Notification] Failed to get FCM token:', error);
            return { success: false, error: error.message };
        }
    },

    // FCMトークンをFirestoreに保存 (updated 2025-11-10)
    saveToken: async (userId, token) => {
        try {
        } catch (error) {
            console.error('[Notification] Failed to save token:', error);
            return { success: false, error: error.message };
        }
    },

    // フォアグラウンド通知リスナーをセットアップ
    setupForegroundListener: () => {
        try {
            // Firebaseアプリが初期化されているか確認
            if (!firebase.apps || firebase.apps.length === 0) {
                return;
            }

            if (!firebase.messaging.isSupported()) {
                return;
            }

            const messaging = firebase.messaging();

            messaging.onMessage((payload) => {
                // 通知を表示
                const notificationTitle = payload.notification?.title || 'Your Coach+';
                const notificationOptions = {
                    body: payload.notification?.body || '新しい通知があります',
                    icon: '/icons/icon-192.png',
                    tag: payload.data?.tag || 'default',
                    data: payload.data
                };

                if (Notification.permission === 'granted') {
                    new Notification(notificationTitle, notificationOptions);
                }
            });
        } catch (error) {
            console.error('[Notification] Failed to setup foreground listener:', error);
        }
    },

    // 通知権限の状態を確認
    checkPermission: () => {
        if (!('Notification' in window)) {
            return 'unsupported';
        }
        return Notification.permission; // 'default', 'granted', 'denied'
    },

    // スケジュール通知を登録（将来の拡張用）
    // スケジュール通知を登録
    scheduleNotification: async (userId, notificationSettings) => {
        try {
            const schedules = [];

            // 各通知タイプの設定を保存
            // 時刻が設定されていて、明示的にfalseでなければ有効とみなす
            if (notificationSettings.routineTime && notificationSettings.routine !== false) {
                schedules.push({
                    type: 'routine',
                    time: notificationSettings.routineTime,
                    enabled: true,
                    title: notificationSettings.routineTitle || 'ルーティン開始',
                    body: notificationSettings.routineBody || '今日のトレーニングを確認しましょう！'
                });
            }

            if (notificationSettings.mealTimes && notificationSettings.meal !== false) {
                notificationSettings.mealTimes.forEach((mealTime, index) => {
                    // カスタムタイトル・ボディをサポート
                    const customTitle = notificationSettings.mealTitles && notificationSettings.mealTitles[index];
                    const customBody = notificationSettings.mealBodies && notificationSettings.mealBodies[index];

                    schedules.push({
                        type: 'meal',
                        time: mealTime,
                        enabled: true,
                        title: customTitle || '食事の時間',
                        body: customBody || '食事を記録しましょう'
                    });
                });
            }

            if (notificationSettings.workoutTime && notificationSettings.workout !== false) {
                schedules.push({
                    type: 'workout',
                    time: notificationSettings.workoutTime,
                    enabled: true,
                    title: notificationSettings.workoutTitle || 'トレーニングの時間',
                    body: notificationSettings.workoutBody || '今日のトレーニングを始めましょう！'
                });
            }

            if (notificationSettings.recordReminderTime && notificationSettings.recordReminder !== false) {
                schedules.push({
                    type: 'recordReminder',
                    time: notificationSettings.recordReminderTime,
                    enabled: true,
                    title: notificationSettings.recordReminderTitle || '記録リマインダー',
                    body: notificationSettings.recordReminderBody || '今日の記録を忘れずに！'
                });
            }

            if (notificationSettings.summaryTime && notificationSettings.summary !== false) {
                schedules.push({
                    type: 'summary',
                    time: notificationSettings.summaryTime,
                    enabled: true,
                    title: notificationSettings.summaryTitle || '今日のまとめ',
                    body: notificationSettings.summaryBody || '今日の記録をチェックしましょう'
                });
            }

            // 通知スケジュールを保存

            return { success: true, schedules };
        } catch (error) {
            console.error('[Notification] Failed to schedule notifications:', error);
            return { success: false, error: error.message };
        }
    },

    // クライアントサイドの通知チェック機能は削除（Cloud Functionsで自動送信）

    // IndexedDBにスケジュールを保存（Service Worker用）
    saveSchedulesToIndexedDB: async (userId, schedules) => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('YourCoachNotifications', 1);

            request.onerror = () => {
                console.error('[IndexedDB] Open error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                const db = request.result;
                let transaction;

                try {
                    transaction = db.transaction(['schedules'], 'readwrite');
                    const store = transaction.objectStore('schedules');
                    const saveRequest = store.put(schedules, userId);

                    // トランザクション完了時の処理
                    transaction.oncomplete = () => {
                        db.close();
                        resolve();
                    };

                    // トランザクションエラー時の処理
                    transaction.onerror = () => {
                        console.error('[IndexedDB] Transaction error:', transaction.error);
                        db.close();
                        reject(transaction.error);
                    };

                    // トランザクション中断時の処理
                    transaction.onabort = () => {
                        console.error('[IndexedDB] Transaction aborted');
                        db.close();
                        reject(new Error('Transaction aborted'));
                    };

                    // 個別リクエストのエラーハンドリング
                    saveRequest.onerror = () => {
                        console.error('[IndexedDB] Save request error:', saveRequest.error);
                    };
                } catch (error) {
                    console.error('[IndexedDB] Transaction creation error:', error);
                    db.close();
                    reject(error);
                }
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('schedules')) {
                    db.createObjectStore('schedules');
                }
                if (!db.objectStoreNames.contains('shown')) {
                    db.createObjectStore('shown');
                }
            };
        });
    }
};

// ===== MFA/2FA Service =====
const MFAService = {
    // SMS認証を登録（ステップ1: 電話番号入力）
    enrollSMS2FA: async (phoneNumber) => {
        try {
            const user = firebase.auth().currentUser;

            if (!user) {
                throw new Error('ユーザーがログインしていません');
            }

            // 電話番号を確認
            if (!phoneNumber.startsWith('+')) {
                throw new Error('電話番号は国際形式（+81...）で入力してください');
            }

            // MFAセッションを開始
            const session = await user.multiFactor.getSession();

            // 電話番号認証プロバイダーを設定
            const phoneInfoOptions = {
                phoneNumber: phoneNumber,
                session: session
            };

            const phoneAuthProvider = new firebase.auth.PhoneAuthProvider();
            const verificationId = await phoneAuthProvider.verifyPhoneNumber(
                phoneInfoOptions,
                window.recaptchaVerifier
            );

            console.log('[MFA] Verification code sent to:', phoneNumber);
            return { success: true, verificationId };
        } catch (error) {
            console.error('[MFA] SMS enrollment failed:', error);
            return { success: false, error: error.message };
        }
    },

    // SMS認証コードを確認して登録完了（ステップ2: コード入力）
    confirmSMS2FA: async (verificationId, verificationCode) => {
        try {
            const user = firebase.auth().currentUser;

            if (!user) {
                throw new Error('ユーザーがログインしていません');
            }

            // 認証情報を作成
            const cred = firebase.auth.PhoneAuthProvider.credential(
                verificationId,
                verificationCode
            );
            const multiFactorAssertion = firebase.auth.PhoneMultiFactorGenerator.assertion(cred);

            // MFAに登録
            await user.multiFactor.enroll(multiFactorAssertion, 'SMS認証');

            console.log('[MFA] SMS 2FA enrolled successfully');
            return { success: true };
        } catch (error) {
            console.error('[MFA] SMS confirmation failed:', error);
            return { success: false, error: error.message };
        }
    },

    // ログイン時のMFA処理（ステップ1: SMS送信）
    handleMFALogin: async (resolver) => {
        try {
            // reCAPTCHAを初期化（まだの場合）
            if (!window.recaptchaVerifier) {
                window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier(
                    'recaptcha-container',
                    {
                        size: 'invisible',
                        callback: () => {
                            console.log('[MFA] reCAPTCHA verified');
                        }
                    }
                );
            }

            // SMS認証を開始
            const phoneInfoOptions = {
                multiFactorHint: resolver.hints[0],
                session: resolver.session
            };

            const phoneAuthProvider = new firebase.auth.PhoneAuthProvider();
            const verificationId = await phoneAuthProvider.verifyPhoneNumber(
                phoneInfoOptions,
                window.recaptchaVerifier
            );

            console.log('[MFA] Login verification code sent');
            return { success: true, verificationId };
        } catch (error) {
            console.error('[MFA] Login MFA failed:', error);
            return { success: false, error: error.message };
        }
    },

    // SMS認証コードを確認してログイン完了（ステップ2: コード入力）
    confirmMFALogin: async (resolver, verificationId, verificationCode) => {
        try {
            const cred = firebase.auth.PhoneAuthProvider.credential(
                verificationId,
                verificationCode
            );
            const multiFactorAssertion = firebase.auth.PhoneMultiFactorGenerator.assertion(cred);

            // MFA認証を完了
            const userCredential = await resolver.resolveSignIn(multiFactorAssertion);

            console.log('[MFA] Login completed successfully');
            return { success: true, user: userCredential.user };
        } catch (error) {
            console.error('[MFA] Login confirmation failed:', error);
            return { success: false, error: error.message };
        }
    },

    // 2FAを解除
    unenrollMFA: async () => {
        try {
            const user = firebase.auth().currentUser;

            if (!user) {
                throw new Error('ユーザーがログインしていません');
            }

            const enrolledFactors = user.multiFactor.enrolledFactors;

            if (enrolledFactors.length === 0) {
                return { success: false, error: '2FAが設定されていません' };
            }

            // 最初の登録済み2FAを解除
            await user.multiFactor.unenroll(enrolledFactors[0]);

            console.log('[MFA] 2FA unenrolled successfully');
            return { success: true };
        } catch (error) {
            console.error('[MFA] Unenroll failed:', error);
            return { success: false, error: error.message };
        }
    },

    // 2FA登録状況を確認
    isMFAEnrolled: () => {
        try {
            // Firebase初期化チェック
            if (typeof firebase === 'undefined') {
                return false;
            }

            // Firebaseアプリが初期化されているかチェック
            if (!firebase.apps || firebase.apps.length === 0) {
                return false;
            }

            // authが存在するかチェック
            if (!firebase.auth) {
                return false;
            }

            const user = firebase.auth().currentUser;
            if (!user) return false;

            return user.multiFactor.enrolledFactors.length > 0;
        } catch (error) {
            console.error('[MFA] Failed to check enrollment status:', error);
            return false;
        }
    }
};

// ===== Firestoreヘルパーユーティリティ =====
const FirestoreUtils = {
    // ユーザー設定を取得（単一ドキュメント）
    getUserSettings: async (userId, settingName) => {
        try {
            const doc = await db.collection('users')
                .doc(userId)
                .collection('settings')
                .doc(settingName)
                .get();
            return doc.exists ? doc.data() : null;
        } catch (error) {
            console.error(`[FirestoreUtils] Error loading ${settingName}:`, error);
            return null;
        }
    },

    // ユーザー設定を保存
    setUserSettings: async (userId, settingName, data) => {
        try {
            await db.collection('users')
                .doc(userId)
                .collection('settings')
                .doc(settingName)
                .set(data, { merge: true });
            return true;
        } catch (error) {
            console.error(`[FirestoreUtils] Error saving ${settingName}:`, error);
            return false;
        }
    },

    // ユーザーコレクションを取得（複数ドキュメント）
    getUserCollection: async (userId, collectionName) => {
        try {
            const snapshot = await db.collection('users')
                .doc(userId)
                .collection(collectionName)
                .get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error(`[FirestoreUtils] Error loading ${collectionName}:`, error);
            return [];
        }
    },

    // ユーザーコレクションにドキュメントを追加
    addToUserCollection: async (userId, collectionName, data) => {
        try {
            const docRef = await db.collection('users')
                .doc(userId)
                .collection(collectionName)
                .add(data);
            return docRef.id;
        } catch (error) {
            console.error(`[FirestoreUtils] Error adding to ${collectionName}:`, error);
            return null;
        }
    },

    // ユーザーコレクションのドキュメントを更新
    updateUserDocument: async (userId, collectionName, docId, data) => {
        try {
            await db.collection('users')
                .doc(userId)
                .collection(collectionName)
                .doc(docId)
                .update(data);
            return true;
        } catch (error) {
            console.error(`[FirestoreUtils] Error updating ${collectionName}/${docId}:`, error);
            return false;
        }
    },

    // ユーザーコレクションのドキュメントを削除
    deleteUserDocument: async (userId, collectionName, docId) => {
        try {
            await db.collection('users')
                .doc(userId)
                .collection(collectionName)
                .doc(docId)
                .delete();
            return true;
        } catch (error) {
            console.error(`[FirestoreUtils] Error deleting ${collectionName}/${docId}:`, error);
            return false;
        }
    }
};

// ===== グローバルに公開 =====
window.DataService = DataService;
window.GeminiAPI = GeminiAPI;
window.CreditService = CreditService;
window.ExperienceService = ExperienceService;
window.NotificationService = NotificationService;
window.MFAService = MFAService;
window.FirestoreUtils = FirestoreUtils;