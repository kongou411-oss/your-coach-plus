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

// グローバル変数としてwindowに登録（Reactコンポーネントからアクセス可能にする）
window.exerciseDB = exerciseDB;
window.foodDB = foodDB;
window.supplementDB = supplementDB;

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

    // ユーザープロファイル取得（キャッシュファースト戦略）
    getUserProfile: async (userId) => {
        let profile = null;
        let source = 'cache';

        try {
            // まずキャッシュから即座に取得を試みる（高速）
            const cacheDoc = await db.collection('users').doc(userId).get({ source: 'cache' });
            if (cacheDoc.exists) {
                profile = cacheDoc.data();
                console.log(`[DataService] getUserProfile (cache-first): cache hit for user=${userId}`);
            }
        } catch (cacheError) {
            // キャッシュがない場合は無視（サーバーから取得する）
            console.log('[DataService] No cache available, fetching from server');
        }

        // キャッシュがない、または最新データが必要な場合はサーバーから取得
        if (!profile) {
            source = 'server';
            try {
                const serverDoc = await db.collection('users').doc(userId).get({ source: 'server' });
                profile = serverDoc.exists ? serverDoc.data() : null;
            } catch (error) {
                if (error.code === 'permission-denied') {
                    // 権限エラー（新規ユーザー）の場合は静かに null を返す
                    return null;
                } else if (error.code === 'unavailable') {
                    console.warn('[DataService] Network unavailable and no cache');
                    return null;
                } else {
                    console.error('Error fetching user profile:', error);
                    return null;
                }
            }
        } else {
            // キャッシュから取得した場合、バックグラウンドでサーバーから最新データを取得してキャッシュを更新
            db.collection('users').doc(userId).get({ source: 'server' }).then(serverDoc => {
                if (serverDoc.exists) {
                    const serverData = serverDoc.data();
                    // 経験値やクレジットに差分があれば通知（UIを更新するため）
                    if (profile.experience !== serverData.experience ||
                        profile.freeCredits !== serverData.freeCredits ||
                        profile.paidCredits !== serverData.paidCredits ||
                        profile.level !== serverData.level) {
                        console.log('[DataService] Server data differs from cache, dispatching update event');
                        window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { userId } }));
                    }
                }
            }).catch(err => {
                console.warn('[DataService] Background server fetch failed:', err);
            });
        }

        // デバッグログ：データソースと経験値情報
        if (profile) {
            console.log(`[DataService] getUserProfile (${source}): user=${userId}, exp=${profile.experience}, level=${profile.level}, free=${profile.freeCredits}, paid=${profile.paidCredits}`);
        }

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
            // Premium判定: subscription.status === 'active' または b2b2cOrgId または giftCodeActive
            const isPremium = profile.subscription?.status === 'active'
                || profile.b2b2cOrgId
                || profile.subscription?.giftCodeActive === true;

            return {
                ...profile,
                freeCredits: profile.freeCredits ?? 14,
                paidCredits: profile.paidCredits ?? 0,
                // 既存ユーザーのために：onboardingCompletedがundefinedの場合はtrueとみなす
                onboardingCompleted: profile.onboardingCompleted !== undefined ? profile.onboardingCompleted : true,
                // Premium判定用のフラットなフィールドを追加（各コンポーネントで参照しやすくするため）
                subscriptionStatus: isPremium ? 'active' : 'free',
                isPremium: isPremium
            };
        }

        return null;
    },

    // ユーザープロファイル保存
    // throwOnError: true の場合、エラー時に例外をスロー（オンボーディング等で使用）
    saveUserProfile: async (userId, profile, options = {}) => {
        const { throwOnError = false, forceServer = false } = options;
        try {
            // Firestoreはundefinedを許可しないため、undefinedフィールドを削除
            const cleanProfile = { ...profile };
            Object.keys(cleanProfile).forEach(key => {
                if (cleanProfile[key] === undefined) {
                    delete cleanProfile[key];
                }
            });

            console.log('[DataService] saveUserProfile:', userId, cleanProfile);
            console.log('[DataService] PFC比率:', {
                proteinRatio: cleanProfile.proteinRatio,
                fatRatioPercent: cleanProfile.fatRatioPercent,
                carbRatio: cleanProfile.carbRatio,
                usePurposeBased: cleanProfile.usePurposeBased
            });

            // Safari/iOS対策: forceServerモードではオフラインキャッシュをバイパスして直接サーバーに書き込み
            if (forceServer) {
                // disableNetworkでオフラインキャッシュを無効化し、サーバー直接書き込みを強制
                // まずサーバーに書き込み、成功したらキャッシュも更新される
                console.log('[DataService] Force server write mode enabled');
            }

            await db.collection('users').doc(userId).set(cleanProfile, { merge: true });

            // Safari対策: 書き込み後に即座にサーバーから読み戻して確認
            if (forceServer) {
                try {
                    const verifyDoc = await db.collection('users').doc(userId).get({ source: 'server' });
                    if (!verifyDoc.exists) {
                        console.error('[DataService] Verification failed: document not found on server');
                        if (throwOnError) {
                            throw new Error('プロフィールの保存確認に失敗しました');
                        }
                        return false;
                    }
                    console.log('[DataService] Server write verified successfully');
                } catch (verifyError) {
                    console.error('[DataService] Verification read failed:', verifyError);
                    // 確認読み取りが失敗しても、書き込み自体は成功している可能性があるので続行
                }
            }

            return true;
        } catch (error) {
            console.error('Error saving user profile:', error);
            if (throwOnError) {
                throw error;
            }
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

    // 日次記録一括取得（履歴ページ用・高速）
    getAllDailyRecords: async (userId) => {
        try {
            const snapshot = await db
                .collection('dailyRecords')
                .doc(userId)
                .collection('records')
                .get();

            const records = {};
            snapshot.forEach(doc => {
                records[doc.id] = doc.data();
            });
            console.log(`[DataService] getAllDailyRecords: ${Object.keys(records).length}件取得`);
            return records;
        } catch (error) {
            if (error.code === 'permission-denied') {
                return {};
            }
            console.error('Error fetching all daily records:', error);
            return {};
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
    // 分析レポート一覧取得（リストのみ、詳細なし）
    getAnalysisReports: async (userId) => {
        try {
            const snapshot = await db
                .collection('users')
                .doc(userId)
                .collection('analysisReports')
                .orderBy('createdAt', 'desc')
                .get();

            // リスト表示に必要な最小限のデータのみ返す（content, conversationHistoryは除外）
            return snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title,
                    createdAt: data.createdAt,
                    periodStart: data.periodStart,
                    periodEnd: data.periodEnd,
                    reportType: data.reportType
                };
            });
        } catch (error) {
            console.error('Error getting analysis reports:', error);
            return [];
        }
    },

    // 分析レポート詳細取得（1件のみ）
    getAnalysisReport: async (userId, reportId) => {
        try {
            const doc = await db
                .collection('users')
                .doc(userId)
                .collection('analysisReports')
                .doc(reportId)
                .get();

            if (!doc.exists) {
                throw new Error('レポートが見つかりません');
            }

            return { id: doc.id, ...doc.data() };
        } catch (error) {
            console.error('Error getting analysis report:', error);
            throw error;
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
    },

    // ワークアウトテンプレート削除
    deleteWorkoutTemplate: async (userId, templateId) => {
        try {
            const templates = await DataService.getWorkoutTemplates(userId);
            const filtered = templates.filter(t => t.id !== templateId);
            await db.collection('workoutTemplates').doc(userId).set({ templates: filtered });
        } catch (error) {
            console.error('Error deleting workout template:', error);
        }
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
    },

    // 食事テンプレート削除
    deleteMealTemplate: async (userId, templateId) => {
        try {
            const templates = await DataService.getMealTemplates(userId);
            const filtered = templates.filter(t => t.id !== templateId);
            await db.collection('mealTemplates').doc(userId).set({ templates: filtered });
        } catch (error) {
            console.error('Error deleting meal template:', error);
        }
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
    },

    // サプリメントテンプレート削除
    deleteSupplementTemplate: async (userId, templateId) => {
        try {
            const templates = await DataService.getSupplementTemplates(userId);
            const filtered = templates.filter(t => t.id !== templateId);
            await db.collection('supplementTemplates').doc(userId).set({ templates: filtered });
        } catch (error) {
            console.error('Error deleting supplement template:', error);
        }
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

    // PG BASE チャット履歴一覧取得（リストのみ、詳細なし）
    getPGBaseChats: async (userId) => {
        const snapshot = await db
            .collection('users')
            .doc(userId)
            .collection('pgbaseChats')
            .orderBy('createdAt', 'desc')
            .get();

        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                title: data.title,
                createdAt: data.createdAt
                // conversationHistory は除外
            };
        });
    },

    // PG BASE チャット詳細取得（1件のみ）
    getPGBaseChat: async (userId, chatId) => {
        const doc = await db
            .collection('users')
            .doc(userId)
            .collection('pgbaseChats')
            .doc(chatId)
            .get();

        if (!doc.exists) {
            throw new Error('チャットが見つかりません');
        }

        return { id: doc.id, ...doc.data() };
    },

    // PG BASE チャット保存
    savePGBaseChat: async (userId, chat) => {
        await db
            .collection('users')
            .doc(userId)
            .collection('pgbaseChats')
            .add({
                ...chat,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
    },

    // PG BASE チャット削除
    deletePGBaseChat: async (userId, chatId) => {
        await db
            .collection('users')
            .doc(userId)
            .collection('pgbaseChats')
            .doc(chatId)
            .delete();
    },

    // PG BASE チャット更新
    updatePGBaseChat: async (userId, chatId, updates) => {
        await db
            .collection('users')
            .doc(userId)
            .collection('pgbaseChats')
            .doc(chatId)
            .update(updates);
    },


    // コミュニティ投稿取得（communityProjectsのprogress サブコレクションから承認済みを取得）
    getCommunityPosts: async () => {
        try {
            const posts = [];
            const userAvatarCache = {}; // ユーザーアバターのキャッシュ

            // 全プロジェクトを取得
            const projectsSnapshot = await db.collection('communityProjects').get();

            for (const projectDoc of projectsSnapshot.docs) {
                const projectData = projectDoc.data();
                const projectId = projectDoc.id;
                const projectUserId = projectData.userId;

                // ユーザーの最新アバターを取得（キャッシュがなければ）
                if (projectUserId && !userAvatarCache[projectUserId]) {
                    try {
                        const userDoc = await db.collection('users').doc(projectUserId).get();
                        if (userDoc.exists) {
                            userAvatarCache[projectUserId] = userDoc.data().avatarUrl || null;
                        }
                    } catch (e) {
                        console.log('Failed to fetch user avatar:', projectUserId);
                    }
                }

                // 各プロジェクトの承認済み進捗を取得
                const progressSnapshot = await db.collection('communityProjects')
                    .doc(projectId)
                    .collection('progress')
                    .where('approvalStatus', '==', 'approved')
                    .orderBy('timestamp', 'desc')
                    .get();

                for (const progressDoc of progressSnapshot.docs) {
                    const progressData = progressDoc.data();

                    posts.push({
                        id: progressDoc.id,
                        projectId: projectId,
                        projectTitle: projectData.title,
                        goalCategory: projectData.goalCategory,
                        userId: projectData.userId,
                        author: progressData.authorName || projectData.userName,
                        // アバター優先順位: 投稿時のアバター → ユーザーの最新アバター → プロジェクトのアバター
                        authorAvatarUrl: progressData.authorAvatarUrl || userAvatarCache[projectUserId] || projectData.userAvatar || null,
                        category: 'body',
                        progressType: progressData.progressType || 'progress',
                        photo: progressData.photo || null,
                        content: progressData.caption || projectData.goal || '',
                        approvalStatus: progressData.approvalStatus || 'approved',
                        timestamp: progressData.timestamp || null,
                        likes: progressData.likes || 0,
                        likedUsers: progressData.likedUsers || [],
                        commentCount: progressData.commentCount || 0,
                        bodyData: progressData.bodyData,
                        historyData: progressData.historyData,
                        daysSinceStart: progressData.daysSinceStart
                    });
                }
            }

            // タイムスタンプでソート（新しい順）
            posts.sort((a, b) => {
                const dateA = a.timestamp ? new Date(a.timestamp) : new Date(0);
                const dateB = b.timestamp ? new Date(b.timestamp) : new Date(0);
                return dateB - dateA;
            });

            console.log('[getCommunityPosts] Loaded', posts.length, 'approved posts');
            return posts.slice(0, 50); // 最大50件
        } catch (error) {
            console.error('[getCommunityPosts] Error:', error);
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

    // コミュニティ画像アップロード（Base64対応）
    uploadCommunityPhoto: async (userId, dataUrl, photoType) => {
        try {
            const timestamp = Date.now();
            const ref = storage.ref(`community/${userId}/${photoType}_${timestamp}.jpg`);

            // Base64データURLの場合はputStringを使用
            if (typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
                await ref.putString(dataUrl, 'data_url');
            } else {
                // Fileオブジェクトの場合
                await ref.put(dataUrl);
            }

            const url = await ref.getDownloadURL();
            console.log('[uploadCommunityPhoto] Success:', url);
            return url;
        } catch (error) {
            console.error('[uploadCommunityPhoto] Error:', error);
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

    // ===== いいね機能（改善版） =====

    // いいねトグル（追加/解除）- communityProjects/{projectId}/progress/{progressId} 対応
    togglePostLike: async (postId, userId, projectId) => {
        try {
            // projectIdがある場合はprogressサブコレクション、なければcommunityPosts
            const postRef = projectId
                ? db.collection('communityProjects').doc(projectId).collection('progress').doc(postId)
                : db.collection('communityPosts').doc(postId);

            const postDoc = await postRef.get();

            if (!postDoc.exists) {
                console.error('Post not found:', postId, 'projectId:', projectId);
                return { success: false, liked: false };
            }

            const postData = postDoc.data();
            const likedUsers = postData.likedUsers || [];
            const hasLiked = likedUsers.includes(userId);

            if (hasLiked) {
                // いいね解除
                await postRef.update({
                    likes: firebase.firestore.FieldValue.increment(-1),
                    likedUsers: firebase.firestore.FieldValue.arrayRemove(userId)
                });
                return { success: true, liked: false };
            } else {
                // いいね追加
                await postRef.update({
                    likes: firebase.firestore.FieldValue.increment(1),
                    likedUsers: firebase.firestore.FieldValue.arrayUnion(userId)
                });
                return { success: true, liked: true };
            }
        } catch (error) {
            console.error('Error toggling like:', error);
            return { success: false, liked: false };
        }
    },

    // ===== コメント機能（サブコレクション版） =====

    // コメント取得 - communityProjects/{projectId}/progress/{postId}/comments 対応
    getPostComments: async (postId, projectId) => {
        try {
            // projectIdがある場合はprogressサブコレクション、なければcommunityPosts
            const postRef = projectId
                ? db.collection('communityProjects').doc(projectId).collection('progress').doc(postId)
                : db.collection('communityPosts').doc(postId);

            const snapshot = await postRef
                .collection('comments')
                .orderBy('createdAt', 'asc')
                .get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error fetching comments:', error);
            return [];
        }
    },

    // コメント追加 - communityProjects/{projectId}/progress/{postId}/comments 対応
    addComment: async (postId, commentData, projectId) => {
        try {
            // projectIdがある場合はprogressサブコレクション、なければcommunityPosts
            const postRef = projectId
                ? db.collection('communityProjects').doc(projectId).collection('progress').doc(postId)
                : db.collection('communityPosts').doc(postId);

            const docRef = await postRef
                .collection('comments')
                .add({
                    ...commentData,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            // 投稿のコメント数をインクリメント
            await postRef.update({
                commentCount: firebase.firestore.FieldValue.increment(1)
            });

            return { success: true, commentId: docRef.id };
        } catch (error) {
            console.error('Error adding comment:', error);
            return { success: false, error: error.message };
        }
    },

    // コメント削除 - communityProjects/{projectId}/progress/{postId}/comments 対応
    deleteComment: async (postId, commentId, projectId) => {
        try {
            // projectIdがある場合はprogressサブコレクション、なければcommunityPosts
            const postRef = projectId
                ? db.collection('communityProjects').doc(projectId).collection('progress').doc(postId)
                : db.collection('communityPosts').doc(postId);

            await postRef
                .collection('comments')
                .doc(commentId)
                .delete();

            // 投稿のコメント数をデクリメント
            await postRef.update({
                commentCount: firebase.firestore.FieldValue.increment(-1)
            });

            return { success: true };
        } catch (error) {
            console.error('Error deleting comment:', error);
            return { success: false, error: error.message };
        }
    },

    // ===== フォロー機能 =====

    // フォローする
    followUser: async (followerId, followingId) => {
        try {
            // 自分自身はフォローできない
            if (followerId === followingId) {
                return { success: false, error: '自分自身をフォローすることはできません' };
            }

            // 既にフォローしているかチェック
            const existingFollow = await db.collection('follows')
                .where('followerId', '==', followerId)
                .where('followingId', '==', followingId)
                .get();

            if (!existingFollow.empty) {
                return { success: false, error: '既にフォローしています' };
            }

            // フォロー関係を作成
            await db.collection('follows').add({
                followerId,
                followingId,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // フォロワー数・フォロー数を更新
            const batch = db.batch();

            // フォローする側のfollowingCountを増やす
            const followerRef = db.collection('users').doc(followerId);
            batch.update(followerRef, {
                followingCount: firebase.firestore.FieldValue.increment(1)
            });

            // フォローされる側のfollowerCountを増やす
            const followingRef = db.collection('users').doc(followingId);
            batch.update(followingRef, {
                followerCount: firebase.firestore.FieldValue.increment(1)
            });

            await batch.commit();

            return { success: true };
        } catch (error) {
            console.error('Error following user:', error);
            return { success: false, error: error.message };
        }
    },

    // フォロー解除
    unfollowUser: async (followerId, followingId) => {
        try {
            // フォロー関係を検索
            const followSnapshot = await db.collection('follows')
                .where('followerId', '==', followerId)
                .where('followingId', '==', followingId)
                .get();

            if (followSnapshot.empty) {
                return { success: false, error: 'フォローしていません' };
            }

            // フォロー関係を削除
            const followDocsToDelete = followSnapshot.docs.map(doc => doc.ref);

            // トランザクションで0未満にならないように更新
            await db.runTransaction(async (transaction) => {
                const followerRef = db.collection('users').doc(followerId);
                const followingRef = db.collection('users').doc(followingId);

                const followerDoc = await transaction.get(followerRef);
                const followingDoc = await transaction.get(followingRef);

                // フォロー関係を削除
                followDocsToDelete.forEach(ref => {
                    transaction.delete(ref);
                });

                // フォロー数を更新（0未満にならないように）
                if (followerDoc.exists) {
                    const currentFollowingCount = followerDoc.data().followingCount || 0;
                    transaction.update(followerRef, {
                        followingCount: Math.max(0, currentFollowingCount - 1)
                    });
                }

                // フォロワー数を更新（0未満にならないように）
                if (followingDoc.exists) {
                    const currentFollowerCount = followingDoc.data().followerCount || 0;
                    transaction.update(followingRef, {
                        followerCount: Math.max(0, currentFollowerCount - 1)
                    });
                }
            });

            return { success: true };
        } catch (error) {
            console.error('Error unfollowing user:', error);
            return { success: false, error: error.message };
        }
    },

    // フォローしているかチェック
    isFollowing: async (followerId, followingId) => {
        try {
            const snapshot = await db.collection('follows')
                .where('followerId', '==', followerId)
                .where('followingId', '==', followingId)
                .get();
            return !snapshot.empty;
        } catch (error) {
            console.error('Error checking follow status:', error);
            return false;
        }
    },

    // フォロワー一覧取得
    getFollowers: async (userId) => {
        try {
            const snapshot = await db.collection('follows')
                .where('followingId', '==', userId)
                .orderBy('createdAt', 'desc')
                .get();

            const followerIds = snapshot.docs.map(doc => doc.data().followerId);

            // ユーザー情報を取得
            const followers = [];
            for (const followerId of followerIds) {
                const userDoc = await db.collection('users').doc(followerId).get();
                if (userDoc.exists) {
                    followers.push({
                        id: followerId,
                        ...userDoc.data()
                    });
                }
            }

            return followers;
        } catch (error) {
            console.error('Error fetching followers:', error);
            return [];
        }
    },

    // フォロー中一覧取得
    getFollowing: async (userId) => {
        try {
            const snapshot = await db.collection('follows')
                .where('followerId', '==', userId)
                .orderBy('createdAt', 'desc')
                .get();

            const followingIds = snapshot.docs.map(doc => doc.data().followingId);

            // ユーザー情報を取得
            const following = [];
            for (const followingId of followingIds) {
                const userDoc = await db.collection('users').doc(followingId).get();
                if (userDoc.exists) {
                    following.push({
                        id: followingId,
                        ...userDoc.data()
                    });
                }
            }

            return following;
        } catch (error) {
            console.error('Error fetching following:', error);
            return [];
        }
    },

    // ユーザープロフィール取得（公開情報のみ）
    getUserPublicProfile: async (userId) => {
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (!userDoc.exists) {
                return null;
            }

            const data = userDoc.data();
            // 公開情報のみ返す
            return {
                id: userId,
                nickname: data.nickname || 'ユーザー',
                avatarUrl: data.avatarUrl || null,
                goal: data.goal || '',
                level: data.level || 1,
                followerCount: data.followerCount || 0,
                followingCount: data.followingCount || 0,
                createdAt: data.createdAt
            };
        } catch (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }
    },

    // ユーザーの投稿一覧取得（communityProjects/progress から取得）
    getUserPosts: async (userId) => {
        try {
            const posts = [];

            // ユーザーのプロジェクトを取得
            const projectsSnapshot = await db.collection('communityProjects')
                .where('userId', '==', userId)
                .get();

            for (const projectDoc of projectsSnapshot.docs) {
                const projectData = projectDoc.data();
                const projectId = projectDoc.id;

                // 各プロジェクトの承認済み進捗を取得
                const progressSnapshot = await db.collection('communityProjects')
                    .doc(projectId)
                    .collection('progress')
                    .where('approvalStatus', '==', 'approved')
                    .orderBy('timestamp', 'desc')
                    .get();

                for (const progressDoc of progressSnapshot.docs) {
                    const progressData = progressDoc.data();

                    posts.push({
                        id: progressDoc.id,
                        projectId: projectId,
                        projectTitle: projectData.title,
                        goalCategory: projectData.goalCategory,
                        userId: projectData.userId,
                        author: projectData.userName,
                        userAvatar: projectData.userAvatar,
                        category: 'body',
                        progressType: progressData.progressType || 'progress',
                        photo: progressData.photo || null,
                        imageUrls: progressData.imageUrls || [],
                        content: progressData.caption || projectData.goal || '',
                        approvalStatus: progressData.approvalStatus || 'approved',
                        timestamp: progressData.timestamp || null,
                        likes: progressData.likes || 0,
                        likedUsers: progressData.likedUsers || [],
                        commentCount: progressData.commentCount || 0,
                        bodyData: progressData.bodyData,
                        historyData: progressData.historyData,
                        daysSinceStart: progressData.daysSinceStart
                    });
                }
            }

            // タイムスタンプでソート（新しい順）
            posts.sort((a, b) => {
                const dateA = a.timestamp ? new Date(a.timestamp) : new Date(0);
                const dateB = b.timestamp ? new Date(b.timestamp) : new Date(0);
                return dateB - dateA;
            });

            return posts.slice(0, 20);
        } catch (error) {
            console.error('Error fetching user posts:', error);
            return [];
        }
    },

    // 投稿削除（進捗のみ削除、プロジェクトの進捗が0になったらプロジェクトも削除）
    deleteUserPost: async (userId, projectId, progressId) => {
        try {
            // プロジェクトの所有者確認
            const projectDoc = await db.collection('communityProjects').doc(projectId).get();
            if (!projectDoc.exists) {
                return { success: false, error: 'プロジェクトが見つかりません' };
            }

            const projectData = projectDoc.data();
            if (projectData.userId !== userId) {
                return { success: false, error: '自分の投稿のみ削除できます' };
            }

            const projectRef = db.collection('communityProjects').doc(projectId);
            const progressRef = projectRef.collection('progress').doc(progressId);

            // 1. 進捗配下のコメントを削除
            const commentsSnapshot = await progressRef.collection('comments').get();
            for (const commentDoc of commentsSnapshot.docs) {
                await commentDoc.ref.delete();
            }

            // 2. 進捗を削除
            await progressRef.delete();

            // 3. 残りの進捗数を確認
            const remainingProgress = await projectRef.collection('progress').get();

            if (remainingProgress.empty) {
                // 進捗が0になったらプロジェクト直下のコメントも削除してプロジェクト本体を削除
                const projectCommentsSnapshot = await projectRef.collection('comments').get();
                for (const commentDoc of projectCommentsSnapshot.docs) {
                    await commentDoc.ref.delete();
                }
                await projectRef.delete();
                return { success: true, projectDeleted: true };
            } else {
                // プロジェクトの進捗数を更新
                await projectRef.update({
                    progressCount: firebase.firestore.FieldValue.increment(-1)
                });
                return { success: true, projectDeleted: false };
            }
        } catch (error) {
            console.error('Error deleting post:', error);
            return { success: false, error: error.message };
        }
    },

    // 非推奨: 旧メソッド（互換性のため残す）
    saveCommunityPosts: async (posts) => {
        return true;
    },

    // ===== ワークアウト履歴管理 =====

    // ワークアウト履歴を保存（種目別、RM別、重量別に記録）
    saveWorkoutHistory: async (userId, exerciseName, setData) => {
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
        let totalSugar = 0;
        let totalSaturatedFat = 0;
        let totalMonounsaturatedFat = 0;
        let totalPolyunsaturatedFat = 0;
        let totalMediumChainFat = 0;
        let weightedDIAAS = 0; // タンパク質量で重み付けしたDIAAS
        let totalGL = 0; // グリセミック負荷

        // ビタミン・ミネラルの集計
        const vitamins = {
            vitaminA: 0, vitaminB1: 0, vitaminB2: 0, vitaminB6: 0, vitaminB12: 0,
            vitaminC: 0, vitaminD: 0, vitaminE: 0, vitaminK: 0
        };
        const minerals = {
            calcium: 0, iron: 0, magnesium: 0, zinc: 0, sodium: 0, potassium: 0
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
                totalFiber += (item.fiber || 0);  // 既に実量換算済み
                totalSugar += (item.sugar || 0);  // 既に実量換算済み

                // 脂肪酸（既に実量換算済み）
                totalSaturatedFat += (item.saturatedFat || 0);
                totalMonounsaturatedFat += (item.monounsaturatedFat || 0);
                totalPolyunsaturatedFat += (item.polyunsaturatedFat || 0);
                totalMediumChainFat += (item.mediumChainFat || 0);

                // DIAAS（タンパク質量で重み付け）
                if (item.diaas && protein > 0) {
                    weightedDIAAS += item.diaas * protein;
                }

                // GL値（GI × 炭水化物g / 100）
                if (item.gi && carbs > 0) {
                    totalGL += (item.gi * carbs) / 100;
                }

                // ビタミン（個別キー形式 or ネストされたオブジェクト形式の両方に対応）
                // 既に実量換算済みなのでratio不要
                const vitaminKeys = ['vitaminA', 'vitaminB1', 'vitaminB2', 'vitaminB6', 'vitaminB12', 'vitaminC', 'vitaminD', 'vitaminE', 'vitaminK'];
                vitaminKeys.forEach(key => {
                    // 個別キーを優先、なければネストされたvitaminsオブジェクトから取得
                    const value = item[key] !== undefined ? item[key] : (item.vitamins && item.vitamins[key]);
                    if (value) {
                        vitamins[key] = (vitamins[key] || 0) + value;  // 既に実量換算済み
                    }
                });

                // ミネラル（個別キー形式 or ネストされたオブジェクト形式の両方に対応）
                // 既に実量換算済みなのでratio不要
                const mineralKeys = ['calcium', 'iron', 'magnesium', 'zinc', 'sodium', 'potassium'];
                mineralKeys.forEach(key => {
                    // 個別キーを優先、なければネストされたmineralsオブジェクトから取得
                    const value = item[key] !== undefined ? item[key] : (item.minerals && item.minerals[key]);
                    if (value) {
                        minerals[key] = (minerals[key] || 0) + value;  // 既に実量換算済み
                    }
                });
            });
        });

        // ===== 食事記録が0件の場合は食事スコアを0にする =====
        const hasMealRecords = (record.meals || []).length > 0;

        // ===== ① カロリースコア (10%) =====
        const calorieDeviation = target.calories > 0 ? Math.abs(totalCalories - target.calories) / target.calories : 0;
        const calorieScore = hasMealRecords ? Math.max(0, 100 - (calorieDeviation * 200)) : 0;
        // ±10%で80点、±20%で60点、±30%で40点、±50%で0点

        // ===== ② PFCスコア (20% × 3 = 60%) =====
        // タンパク質スコア
        const proteinDeviation = target.protein > 0 ? Math.abs(totalProtein - target.protein) / target.protein : 0;
        const proteinScore = hasMealRecords ? Math.max(0, 100 - (proteinDeviation * 150)) : 0;
        // ±10%で85点、±20%で70点、±30%で55点

        // 脂質スコア
        const fatDeviation = target.fat > 0 ? Math.abs(totalFat - target.fat) / target.fat : 0;
        const fatScore = hasMealRecords ? Math.max(0, 100 - (fatDeviation * 200)) : 0;
        // ±10%で80点、±20%で60点、±30%で40点

        // 炭水化物スコア
        const carbsDeviation = target.carbs > 0 ? Math.abs(totalCarbs - target.carbs) / target.carbs : 0;
        const carbsScore = hasMealRecords ? Math.max(0, 100 - (carbsDeviation * 200)) : 0;
        // ±10%で80点、±20%で60点、±30%で40点

        // ===== ③ DIAASスコア (5%) =====
        const avgDIAAS = totalProtein > 0 ? weightedDIAAS / totalProtein : 0;
        let diaaScore = 0;
        if (!hasMealRecords) {
            diaaScore = 0; // データなし
        } else if (avgDIAAS >= 1.00) diaaScore = 100; // 優秀
        else if (avgDIAAS >= 0.90) diaaScore = 80; // 良好
        else if (avgDIAAS >= 0.75) diaaScore = 60; // 普通
        else if (avgDIAAS >= 0.50) diaaScore = 40; // 要改善
        else diaaScore = 20; // データ不足またはDIAAS低い

        // ===== ④ 脂肪酸バランススコア (5%) =====
        let fattyAcidScore = hasMealRecords ? 50 : 0; // デフォルト（データ不足時）

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
        let glScore = hasMealRecords ? 50 : 0; // デフォルト（データ不足時）

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
        let fiberScore = 0;

        if (!hasMealRecords) {
            fiberScore = 0;
        } else {
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
                carbFiberRatioScore = 50; // 食物繊維が0の場合はデフォルト50点
            }

            fiberScore = (fiberAmountScore * 0.6 + carbFiberRatioScore * 0.4);
        }

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

        const vitaminScore = !hasMealRecords ? 0 : (vitaminScores.length > 0
            ? vitaminScores.reduce((a, b) => a + b, 0) / vitaminScores.length
            : 50);

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

        const mineralScore = !hasMealRecords ? 0 : (mineralScores.length > 0
            ? mineralScores.reduce((a, b) => a + b, 0) / mineralScores.length
            : 50);

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

        // 運動データ（予測データも含める）
        const workouts = (record.workouts || []);
        let totalDuration = 0;

        workouts.forEach(workout => {
            // exercisesプロパティがある場合（新形式）
            if (workout.exercises) {
                workout.exercises.forEach(exercise => {
                    (exercise.sets || []).forEach(set => {
                        totalDuration += set.duration || 0;
                    });
                });
            }
            // 旧形式（setsが直接workoutの下にある）
            else {
                (workout.sets || []).forEach(set => {
                    totalDuration += set.duration || 0;
                });
            }
        });

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
        const digestion = record.conditions?.digestion || 0;
        const focus = record.conditions?.focus || 0;
        const stress = record.conditions?.stress || 0;

        // コンディションスコア計算（5項目すべてが5なら100点）
        // 各項目1-5点 → 平均 → 20倍して100点満点に
        const conditionScore = Math.round(
            ((sleepHours + sleepQuality + digestion + focus + stress) / 5) * 20
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
                totalSugar: Math.round(totalSugar * 10) / 10,
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
        const registrationDate = userProfile.registrationDate;

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
            // 無料期間終了：無料クレジットを0にする（有料クレジットは残す）
            await DataService.saveUserProfile(userId, {
                ...userProfile,
                freeCredits: 0,
                isFreeTrialExpired: true
            });

            console.log(`[Credit] User ${userId} free trial expired. Free credits cleared.`);
            return true; // 期限切れ処理実行
        }

        return false;
    },

    // 分析アクセス可否チェック（freeCredits + paidCredits統一）
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
        const freeCredits = updatedProfile?.freeCredits || 0;
        const paidCredits = updatedProfile?.paidCredits || 0;
        const totalCredits = freeCredits + paidCredits;
        const trialStatus = CreditService.checkFreeTrialStatus(updatedProfile);

        return {
            allowed: totalCredits > 0,
            remainingCredits: totalCredits,
            freeCredits,
            paidCredits,
            tier: updatedProfile.subscriptionTier,
            freeTrialActive: trialStatus.isActive,
            freeTrialDaysRemaining: trialStatus.daysRemaining,
            profile: updatedProfile // 更新後のプロファイルを返す
        };
    },

    // クレジット消費（ExperienceService.consumeCreditsに委譲）
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

        // ExperienceService.consumeCreditsを使用（freeCredits優先消費）
        const result = await ExperienceService.consumeCredits(userId, 1);

        if (!result.success) {
            throw new Error('NO_CREDITS');
        }

        // 使用回数を更新
        const profile = accessCheck.profile;
        await DataService.saveUserProfile(userId, {
            ...profile,
            freeCredits: result.freeCredits,
            paidCredits: result.paidCredits,
            totalAnalysisUsed: (profile.totalAnalysisUsed || 0) + 1,
            currentMonthUsed: (profile.currentMonthUsed || 0) + 1,
            freeTrialCreditsUsed: profile.subscriptionTier === 'free'
                ? (profile.freeTrialCreditsUsed || 0) + 1
                : profile.freeTrialCreditsUsed
        });

        console.log(`[Credit] User ${userId} consumed 1 credit. Remaining: ${result.totalCredits}`);

        return {
            success: true,
            remainingCredits: result.totalCredits,
            isFirstAnalysis: (profile.totalAnalysisUsed || 0) === 0 // 初回分析判定
        };
    },

    // Premium会員の月次クレジットリセット（paidCreditsに付与）
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
                paidCredits: 100, // 毎月100クレジット付与（有料クレジット）
                currentMonthUsed: 0,
                creditsResetDate: timestamp
            });

            console.log(`[Credit] Premium user ${userId} received 100 paid credits for new month`);
            return true;
        }

        return false;
    },

    // クレジット追加購入（paidCreditsに追加）
    addPurchasedCredits: async (userId, amount) => {
        const result = await ExperienceService.addPaidCredits(userId, amount);

        if (result.success) {
            // 購入累計も更新
            const userProfile = await DataService.getUserProfile(userId);
            await DataService.saveUserProfile(userId, {
                ...userProfile,
                lifetimeCreditsPurchased: (userProfile.lifetimeCreditsPurchased || 0) + amount
            });
        }

        console.log(`[Credit] User ${userId} purchased ${amount} credits`);
        return result;
    }
};

// ===== 経験値・レベル・クレジット管理システム =====
const ExperienceService = {
    // 初期値
    INITIAL_CREDITS: 14,
    LEVEL_UP_CREDITS: 3,
    MILESTONE_INTERVAL: 10,
    MILESTONE_CREDITS: 5,

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

        // profileがnullの場合はエラーログを出力
        if (!profile) {
            console.error('[ExperienceService] getUserExperience: profile is null for user:', userId);
            return {
                experience: 0,
                level: 1,
                freeCredits: 0,
                paidCredits: 0,
                totalCredits: 0,
                registrationDate: new Date().toISOString()
            };
        }

        const experience = profile.experience ?? 0;
        // 保存されたlevelではなく、経験値から正確に計算（不整合防止）
        const level = ExperienceService.calculateLevel(experience);
        const freeCredits = profile.freeCredits ?? 0;
        const paidCredits = profile.paidCredits ?? 0;
        const registrationDate = profile.registrationDate || profile.joinDate || new Date().toISOString();

        // デバッグログ：経験値データの取得状況
        const savedLevel = profile.level ?? 1;
        if (savedLevel !== level) {
            console.warn(`[ExperienceService] Level mismatch detected: saved=${savedLevel}, calculated=${level}, exp=${experience}`);
        }
        console.log(`[ExperienceService] getUserExperience: user=${userId}, exp=${experience}, level=${level}, free=${freeCredits}, paid=${paidCredits}`);

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
        // 保存されたlevelではなく、経験値から正確に計算（不整合防止）
        const currentLevel = ExperienceService.calculateLevel(currentExp);
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

        // クレジットが変更された場合、更新イベントを発火（UI即時反映用）
        if (creditsEarned > 0 && typeof window !== 'undefined') {
            const newFreeCredits = (profile?.freeCredits || 0) + creditsEarned;
            const paidCredits = profile?.paidCredits || 0;
            window.dispatchEvent(new CustomEvent('creditUpdated', {
                detail: { freeCredits: newFreeCredits, paidCredits, totalCredits: newFreeCredits + paidCredits }
            }));
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

        // クレジット更新イベントを発火（UI即時反映用）
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('creditUpdated', {
                detail: { freeCredits, paidCredits, totalCredits: freeCredits + paidCredits }
            }));
        }

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

        // クレジット更新イベントを発火（UI即時反映用）
        const freeCredits = profile?.freeCredits || 0;
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('creditUpdated', {
                detail: { freeCredits, paidCredits: newPaidCredits, totalCredits: freeCredits + newPaidCredits }
            }));
        }

        return {
            success: true,
            paidCredits: newPaidCredits,
            totalCredits: freeCredits + newPaidCredits
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

        // 経験値を追加（この中でprofile全体が保存される）
        const result = await ExperienceService.addExperience(userId, totalScore);

        // 処理済み日付リストのみを更新（経験値・レベル・クレジットはaddExperienceで保存済み）
        processedDates.push(date);
        await DataService.saveUserProfile(userId, {
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

            const userDoc = await userRef.get();
            const userData = userDoc.exists ? userDoc.data() : null;

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

            await userRef.update({
                processedDirectiveDates: processedDates
            });

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

    // 無料クレジットを手動追加
    addFreeCredits: async (userId, amount) => {
        try {
            const userRef = db.collection('users').doc(userId);

            const userDoc = await userRef.get();
            const userData = userDoc.exists ? userDoc.data() : null;

            if (!userData) {
                console.error('[Experience] User not found');
                return { success: false, error: 'User not found' };
            }

            const newFreeCredits = (userData.freeCredits || 0) + amount;

            await userRef.update({
                freeCredits: newFreeCredits
            });

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
// 教科書購入サービス
// ========================================
const TextbookPurchaseService = {
    /**
     * 購入済みモジュール一覧を取得（Firestore優先）
     * @param {string} userId
     * @returns {Promise<string[]>} 購入済みモジュールID配列
     */
    getPurchasedModules: async (userId) => {
        try {
            const userRef = db.collection('users').doc(userId);
            const userDoc = await userRef.get();

            if (!userDoc.exists) {
                return [];
            }

            const userData = userDoc.data();
            return userData.purchasedModules || [];
        } catch (error) {
            console.error('[TextbookPurchase] Failed to get purchased modules:', error);
            return [];
        }
    },

    /**
     * モジュールが購入済みかチェック
     * @param {string} userId
     * @param {string} moduleId
     * @returns {Promise<boolean>}
     */
    isModulePurchased: async (userId, moduleId) => {
        const purchasedModules = await TextbookPurchaseService.getPurchasedModules(userId);
        return purchasedModules.includes(moduleId);
    },

    /**
     * 有料クレジット残高を取得
     * @param {string} userId
     * @returns {Promise<number>}
     */
    getPaidCredits: async (userId) => {
        try {
            const userRef = db.collection('users').doc(userId);
            const userDoc = await userRef.get();

            if (!userDoc.exists) {
                return 0;
            }

            return userDoc.data().paidCredits || 0;
        } catch (error) {
            console.error('[TextbookPurchase] Failed to get paid credits:', error);
            return 0;
        }
    },

    /**
     * 教科書を購入（有料クレジットのみ使用可能）
     * @param {string} userId
     * @param {string} moduleId
     * @param {number} price - 必要な有料クレジット数
     * @returns {Promise<{success: boolean, error?: string, remainingPaidCredits?: number}>}
     */
    purchaseModule: async (userId, moduleId, price) => {
        try {
            const userRef = db.collection('users').doc(userId);

            // トランザクションで購入処理
            const result = await db.runTransaction(async (transaction) => {
                const userDoc = await transaction.get(userRef);

                if (!userDoc.exists) {
                    throw new Error('USER_NOT_FOUND');
                }

                const userData = userDoc.data();
                const paidCredits = userData.paidCredits || 0;
                const purchasedModules = userData.purchasedModules || [];

                // 既に購入済みかチェック
                if (purchasedModules.includes(moduleId)) {
                    throw new Error('ALREADY_PURCHASED');
                }

                // 有料クレジット残高チェック
                if (paidCredits < price) {
                    throw new Error('INSUFFICIENT_PAID_CREDITS');
                }

                // 購入処理
                const newPaidCredits = paidCredits - price;
                const newPurchasedModules = [...purchasedModules, moduleId];

                transaction.update(userRef, {
                    paidCredits: newPaidCredits,
                    purchasedModules: newPurchasedModules
                });

                return {
                    success: true,
                    remainingPaidCredits: newPaidCredits,
                    purchasedModules: newPurchasedModules
                };
            });

            console.log('[TextbookPurchase] User ' + userId + ' purchased module ' + moduleId + ' for ' + price + ' paid credits');
            return result;

        } catch (error) {
            console.error('[TextbookPurchase] Purchase failed:', error);

            let errorMessage = '購入に失敗しました';
            if (error.message === 'USER_NOT_FOUND') {
                errorMessage = 'ユーザーが見つかりません';
            } else if (error.message === 'ALREADY_PURCHASED') {
                errorMessage = '既に購入済みです';
            } else if (error.message === 'INSUFFICIENT_PAID_CREDITS') {
                errorMessage = '有料クレジットが不足しています';
            }

            return {
                success: false,
                error: errorMessage,
                errorCode: error.message
            };
        }
    }
};

// ========================================
// 通知サービス - 凍結のため削除
// ========================================

// ===== Premium Service =====
// Premium機能の判定とアクセス制御を行うサービス
const PremiumService = {
    // 7日間の無料トライアル期間
    FREE_TRIAL_DAYS: 7,

    /**
     * Premium判定（7日以内の無料トライアル or サブスク有効）
     * @param {Object} userProfile - ユーザープロフィール
     * @param {number} usageDays - 利用日数
     * @returns {boolean} Premium利用可能かどうか
     */
    isPremiumUser: (userProfile, usageDays) => {
        // 7日以内の無料トライアル期間
        if (usageDays <= PremiumService.FREE_TRIAL_DAYS) {
            return true;
        }

        // サブスクリプションステータスチェック
        if (!userProfile) return false;

        // subscriptionStatus が 'active' の場合
        if (userProfile.subscriptionStatus === 'active') {
            return true;
        }

        // 終了日チェック（互換性のため）
        if (userProfile.subscriptionEndDate) {
            const endDate = new Date(userProfile.subscriptionEndDate);
            const now = new Date();
            return now <= endDate;
        }

        return false;
    },

    /**
     * 特定機能の利用可否を判定
     * @param {string} featureId - 機能ID（config.jsのFEATURESキーに対応）
     * @param {Object} userProfile - ユーザープロフィール
     * @param {number} usageDays - 利用日数
     * @returns {boolean} 機能利用可能かどうか
     */
    canUseFeature: (featureId, userProfile, usageDays) => {
        // config.jsからFREE_PLAN_LIMITSを取得
        const FREE_PLAN_LIMITS = window.FREE_PLAN_LIMITS || {};

        // Premium判定
        const isPremium = PremiumService.isPremiumUser(userProfile, usageDays);

        // 無料プランで利用可能な機能かチェック
        const featureKey = featureId.replace(/-/g, ''); // 'ai-photo-recognition' → 'aiphotorecognition'

        // 無料プランで利用可能な機能
        if (FREE_PLAN_LIMITS[featureKey] === true) {
            return true;
        }

        // Premium専用機能の場合
        if (FREE_PLAN_LIMITS[featureKey] === false) {
            return isPremium;
        }

        // デフォルトはPremiumユーザーのみ利用可能
        return isPremium;
    },

    /**
     * テンプレート数制限チェック
     * @param {string} type - 'meal' or 'workout'
     * @param {number} currentCount - 現在のテンプレート数
     * @param {Object} userProfile - ユーザープロフィール
     * @param {number} usageDays - 利用日数
     * @returns {boolean} 追加可能かどうか
     */
    canAddTemplate: (type, currentCount, userProfile, usageDays) => {
        const isPremium = PremiumService.isPremiumUser(userProfile, usageDays);

        if (isPremium) {
            return true; // Premiumは無制限
        }

        const FREE_PLAN_LIMITS = window.FREE_PLAN_LIMITS || {};
        const limit = type === 'meal'
            ? (FREE_PLAN_LIMITS.mealTemplates || 1)
            : (FREE_PLAN_LIMITS.workoutTemplates || 1);

        return currentCount < limit;
    },

    /**
     * Premium状態を更新（管理者用）
     * @param {string} userId - ユーザーID
     * @param {boolean} isPremium - Premium状態
     * @returns {Promise<boolean>} 成功/失敗
     */
    setPremiumStatus: async (userId, isPremium) => {
        try {
            const profile = await DataService.getUserProfile(userId);

            const updates = {
                subscriptionStatus: isPremium ? 'active' : 'inactive'
            };

            // Premium有効化の場合、終了日を1年後に設定
            if (isPremium) {
                const endDate = new Date();
                endDate.setFullYear(endDate.getFullYear() + 1);
                updates.subscriptionEndDate = endDate.toISOString();
                updates.subscriptionStartDate = new Date().toISOString();
            } else {
                // Premium無効化の場合、終了日を現在に設定
                updates.subscriptionEndDate = new Date().toISOString();
            }

            await DataService.saveUserProfile(userId, {
                ...profile,
                ...updates
            });

            console.log(`[Premium] User ${userId} premium status set to:`, isPremium);
            return true;
        } catch (error) {
            console.error('[Premium] Failed to set premium status:', error);
            return false;
        }
    },

    /**
     * 利用日数を計算
     * @param {Object} userProfile - ユーザープロフィール
     * @returns {number} 利用日数
     */
    getUsageDays: (userProfile) => {
        if (!userProfile) return 0;

        const registrationDate = userProfile.registrationDate || userProfile.createdAt || userProfile.joinDate;
        if (!registrationDate) return 0;

        const regDate = new Date(registrationDate);
        const today = new Date();
        const diffTime = Math.abs(today - regDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
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

// ===== ギフトコードサービス =====
const GiftCodeService = {
    // ギフトコードを適用（ユーザー用）
    redeemCode: async (code) => {
        try {
            const functions = firebase.app().functions('asia-northeast2');
            const redeemGiftCode = functions.httpsCallable('redeemGiftCode');
            const result = await redeemGiftCode({ code: code });
            return result.data;
        } catch (error) {
            console.error('[GiftCode] Redeem error:', error);
            throw error;
        }
    },

    // ギフトコード作成（管理者用）
    createCode: async (code, note, adminPassword) => {
        try {
            const functions = firebase.app().functions('asia-northeast2');
            const createGiftCode = functions.httpsCallable('createGiftCode');
            const result = await createGiftCode({ code, note, adminPassword });
            return result.data;
        } catch (error) {
            console.error('[GiftCode] Create error:', error);
            throw error;
        }
    },

    // ギフトコード一覧取得（管理者用）
    getCodes: async (adminPassword) => {
        try {
            const functions = firebase.app().functions('asia-northeast2');
            const getGiftCodes = functions.httpsCallable('getGiftCodes');
            const result = await getGiftCodes({ adminPassword });
            return result.data;
        } catch (error) {
            console.error('[GiftCode] Get codes error:', error);
            throw error;
        }
    },

    // ギフトコード有効/無効切り替え（管理者用）
    toggleCode: async (code, isActive, adminPassword) => {
        try {
            const functions = firebase.app().functions('asia-northeast2');
            const toggleGiftCode = functions.httpsCallable('toggleGiftCode');
            const result = await toggleGiftCode({ code, isActive, adminPassword });
            return result.data;
        } catch (error) {
            console.error('[GiftCode] Toggle error:', error);
            throw error;
        }
    },

    // ギフトコード削除（管理者用）
    deleteCode: async (code, adminPassword) => {
        try {
            const functions = firebase.app().functions('asia-northeast2');
            const deleteGiftCode = functions.httpsCallable('deleteGiftCode');
            const result = await deleteGiftCode({ code, adminPassword });
            return result.data;
        } catch (error) {
            console.error('[GiftCode] Delete error:', error);
            throw error;
        }
    }
};

// ===== AnalyticsService: ユーザー行動トラッキング =====
const AnalyticsService = {
    // 全機能リスト（使用/未使用の判定に使用）
    ALL_FEATURES: {
        // ダッシュボード
        'dashboard.view': { name: 'ダッシュボード表示', category: 'dashboard', priority: 'high' },
        'dashboard.date_change': { name: '日付変更', category: 'dashboard', priority: 'medium' },
        'dashboard.score_tap': { name: 'スコアタップ', category: 'dashboard', priority: 'low' },
        // 食事記録
        'meal.add': { name: '食事追加', category: 'meal', priority: 'high' },
        'meal.edit': { name: '食事編集', category: 'meal', priority: 'medium' },
        'meal.delete': { name: '食事削除', category: 'meal', priority: 'low' },
        'meal.search': { name: '食品検索', category: 'meal', priority: 'high' },
        'meal.ai_recognition': { name: 'AI食事認識', category: 'meal', priority: 'high' },
        'meal.template_use': { name: '食事テンプレート使用', category: 'meal', priority: 'medium' },
        'meal.template_save': { name: '食事テンプレート保存', category: 'meal', priority: 'medium' },
        'meal.custom_food_add': { name: 'カスタム食材追加', category: 'meal', priority: 'low' },
        'meal.supplement_add': { name: 'サプリメント追加', category: 'meal', priority: 'medium' },
        // 運動記録
        'workout.add': { name: '運動追加', category: 'workout', priority: 'high' },
        'workout.edit': { name: '運動編集', category: 'workout', priority: 'medium' },
        'workout.delete': { name: '運動削除', category: 'workout', priority: 'low' },
        'workout.search': { name: '種目検索', category: 'workout', priority: 'high' },
        'workout.template_use': { name: '運動テンプレート使用', category: 'workout', priority: 'medium' },
        'workout.template_save': { name: '運動テンプレート保存', category: 'workout', priority: 'medium' },
        'workout.rm_calculator': { name: 'RM計算機', category: 'workout', priority: 'medium' },
        'workout.set_add': { name: 'セット追加', category: 'workout', priority: 'high' },
        // AI分析
        'analysis.run': { name: 'AI分析実行', category: 'analysis', priority: 'high' },
        'analysis.chat': { name: 'AIチャット送信', category: 'analysis', priority: 'high' },
        'analysis.report_view': { name: 'レポート閲覧', category: 'analysis', priority: 'medium' },
        // PGBASE
        'pgbase.view': { name: 'PGBASE表示', category: 'pgbase', priority: 'medium' },
        'pgbase.chat': { name: 'PGBASEチャット', category: 'pgbase', priority: 'medium' },
        // COMY
        'comy.view': { name: 'COMY表示', category: 'comy', priority: 'medium' },
        'comy.post_create': { name: '投稿作成', category: 'comy', priority: 'high' },
        'comy.like': { name: 'いいね', category: 'comy', priority: 'low' },
        'comy.comment': { name: 'コメント', category: 'comy', priority: 'low' },
        // 履歴
        'history.view': { name: '履歴表示', category: 'history', priority: 'high' },
        // 設定
        'settings.view': { name: '設定表示', category: 'settings', priority: 'medium' },
        'settings.profile_edit': { name: 'プロフィール編集', category: 'settings', priority: 'medium' },
        'settings.goal_change': { name: '目標変更', category: 'settings', priority: 'high' },
        'settings.notification_change': { name: '通知設定変更', category: 'settings', priority: 'medium' },
        // ナビゲーション
        'nav.home': { name: 'ホームタブ', category: 'navigation', priority: 'high' },
        'nav.history': { name: '履歴タブ', category: 'navigation', priority: 'high' },
        'nav.pgbase': { name: 'PGBASEタブ', category: 'navigation', priority: 'medium' },
        'nav.comy': { name: 'COMYタブ', category: 'navigation', priority: 'medium' },
        'nav.settings': { name: '設定タブ', category: 'navigation', priority: 'medium' },
        // コンディション
        'condition.sleep_record': { name: '睡眠記録', category: 'condition', priority: 'medium' },
        'condition.weight_record': { name: '体重記録', category: 'condition', priority: 'high' },
        'condition.body_fat_record': { name: '体脂肪率記録', category: 'condition', priority: 'medium' },
        // その他
        'other.feedback': { name: 'フィードバック送信', category: 'other', priority: 'low' },
        'other.help': { name: 'ヘルプ閲覧', category: 'other', priority: 'low' },
        'other.referral_share': { name: '紹介コード共有', category: 'other', priority: 'low' },
    },

    FEATURE_CATEGORIES: {
        dashboard: { name: 'ダッシュボード', color: 'blue' },
        meal: { name: '食事記録', color: 'green' },
        workout: { name: '運動記録', color: 'orange' },
        analysis: { name: 'AI分析', color: 'purple' },
        pgbase: { name: 'PGBASE', color: 'pink' },
        comy: { name: 'COMY', color: 'teal' },
        history: { name: '履歴', color: 'gray' },
        settings: { name: '設定', color: 'slate' },
        navigation: { name: 'ナビゲーション', color: 'indigo' },
        condition: { name: 'コンディション', color: 'red' },
        other: { name: 'その他', color: 'zinc' },
    },

    // イベントをトラッキング（Firestoreに保存）
    trackEvent: async (userId, eventName, metadata = {}) => {
        if (!userId || typeof db === 'undefined') return;

        try {
            const event = {
                eventName,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                date: new Date().toISOString().split('T')[0], // 日別集計用
                metadata,
            };

            await db.collection('analytics').doc(userId).collection('events').add(event);

            // Firebase Analyticsにも送信
            if (window.analytics) {
                window.analytics.logEvent(eventName.replace(/\./g, '_'), {
                    user_id: userId,
                    ...metadata
                });
            }

            console.log('[Analytics] Tracked:', eventName);
        } catch (error) {
            console.error('[Analytics] Track error:', error);
        }
    },

    // 日別イベント集計（重複防止のため、1日1回のみカウント）
    trackDailyEvent: async (userId, eventName, metadata = {}) => {
        if (!userId || typeof db === 'undefined') return;

        const today = new Date().toISOString().split('T')[0];
        const docId = `${today}_${eventName}`;

        try {
            const docRef = db.collection('analytics').doc(userId).collection('dailyEvents').doc(docId);
            const doc = await docRef.get();

            if (!doc.exists) {
                await docRef.set({
                    eventName,
                    date: today,
                    count: 1,
                    firstAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastAt: firebase.firestore.FieldValue.serverTimestamp(),
                    metadata,
                });
            } else {
                await docRef.update({
                    count: firebase.firestore.FieldValue.increment(1),
                    lastAt: firebase.firestore.FieldValue.serverTimestamp(),
                });
            }
            console.log('[Analytics] Daily tracked:', eventName);
        } catch (error) {
            console.error('[Analytics] Daily track error:', error);
        }
    },

    // ユーザーの使用機能サマリーを取得
    getUserFeatureSummary: async (userId) => {
        if (!userId || typeof db === 'undefined') return {};

        try {
            const snapshot = await db
                .collection('analytics')
                .doc(userId)
                .collection('dailyEvents')
                .get();

            const summary = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                const eventName = data.eventName;
                if (!summary[eventName]) {
                    summary[eventName] = { count: 0, lastUsed: null, days: 0 };
                }
                summary[eventName].count += data.count || 1;
                summary[eventName].days++;
                if (data.lastAt) {
                    const lastAt = data.lastAt.toDate ? data.lastAt.toDate().toISOString() : data.lastAt;
                    if (!summary[eventName].lastUsed || lastAt > summary[eventName].lastUsed) {
                        summary[eventName].lastUsed = lastAt;
                    }
                }
            });

            return summary;
        } catch (error) {
            console.error('[Analytics] Get summary error:', error);
            return {};
        }
    },

    // 使用されていない機能リストを取得
    getUnusedFeatures: (usedFeatures) => {
        const allFeatureKeys = Object.keys(AnalyticsService.ALL_FEATURES);
        const usedKeys = Object.keys(usedFeatures);
        return allFeatureKeys.filter(key => !usedKeys.includes(key));
    },

    // 機能カテゴリ別の使用率を計算
    getCategoryUsage: (usedFeatures) => {
        const categoryStats = {};

        Object.keys(AnalyticsService.FEATURE_CATEGORIES).forEach(cat => {
            categoryStats[cat] = { total: 0, used: 0, features: [] };
        });

        Object.entries(AnalyticsService.ALL_FEATURES).forEach(([key, feature]) => {
            const cat = feature.category;
            if (categoryStats[cat]) {
                categoryStats[cat].total++;
                if (usedFeatures[key]) {
                    categoryStats[cat].used++;
                }
                categoryStats[cat].features.push({
                    key,
                    ...feature,
                    usageCount: usedFeatures[key]?.count || 0,
                    usageDays: usedFeatures[key]?.days || 0,
                });
            }
        });

        Object.keys(categoryStats).forEach(cat => {
            const stats = categoryStats[cat];
            stats.usageRate = stats.total > 0 ? Math.round((stats.used / stats.total) * 100) : 0;
        });

        return categoryStats;
    },
};

// ===== リテンション計測サービス =====
const RetentionService = {
    // ユーザーのアクティビティを記録
    recordActivity: async (userId) => {
        if (!userId) return;

        try {
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const userRef = db.collection('users').doc(userId);
            const userDoc = await userRef.get();
            const userData = userDoc.exists ? userDoc.data() : {};

            // 初回登録日を設定（なければ今日）
            const registrationDate = userData.registrationDate || today;

            // 最終アクティブ日を更新
            const lastActiveDate = userData.lastActiveDate;

            // アクティブ日数を計算
            let activeDays = userData.activeDays || [];
            if (!activeDays.includes(today)) {
                activeDays.push(today);
                // 直近90日分のみ保持（配列肥大化防止）
                if (activeDays.length > 90) {
                    activeDays = activeDays.slice(-90);
                }
            }

            // 連続記録日数を計算
            const streak = RetentionService.calculateStreak(activeDays);

            await userRef.set({
                registrationDate,
                lastActiveDate: today,
                activeDays,
                streak,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            console.log(`[RetentionService] Activity recorded for ${userId}: streak=${streak}, totalDays=${activeDays.length}`);
            return { streak, totalDays: activeDays.length, registrationDate };
        } catch (error) {
            console.error('[RetentionService] Failed to record activity:', error);
            return null;
        }
    },

    // 連続記録日数を計算
    calculateStreak: (activeDays) => {
        if (!activeDays || activeDays.length === 0) return 0;

        const sortedDays = [...activeDays].sort().reverse();
        const today = new Date().toISOString().split('T')[0];

        // 今日または昨日がアクティブでなければストリークは0
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if (!sortedDays.includes(today) && !sortedDays.includes(yesterday)) {
            return 0;
        }

        let streak = 0;
        let checkDate = new Date(sortedDays[0]);

        for (const day of sortedDays) {
            const dayDate = new Date(day);
            const diff = Math.round((checkDate - dayDate) / 86400000);

            if (diff <= 1) {
                streak++;
                checkDate = dayDate;
            } else {
                break;
            }
        }

        return streak;
    },

    // リテンション統計を取得（管理者用）
    getRetentionStats: async (adminPassword) => {
        if (adminPassword !== '0910') {
            throw new Error('Unauthorized');
        }

        try {
            const usersSnapshot = await db.collection('users')
                .where('registrationDate', '!=', null)
                .get();

            const stats = {
                totalUsers: 0,
                day1Retention: { eligible: 0, retained: 0 },
                day7Retention: { eligible: 0, retained: 0 },
                day30Retention: { eligible: 0, retained: 0 },
                averageStreak: 0,
                activeToday: 0,
                activeLast7Days: 0,
                activeLast30Days: 0,
                cohorts: {}
            };

            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];

            let totalStreak = 0;

            usersSnapshot.forEach(doc => {
                const user = doc.data();
                if (!user.registrationDate) return;

                stats.totalUsers++;
                const regDate = new Date(user.registrationDate);
                const daysSinceReg = Math.floor((today - regDate) / 86400000);
                const activeDays = user.activeDays || [];

                // ストリーク集計
                totalStreak += user.streak || 0;

                // 今日アクティブ
                if (activeDays.includes(todayStr)) {
                    stats.activeToday++;
                }

                // 直近7日間でアクティブ
                const last7Days = [];
                for (let i = 0; i < 7; i++) {
                    last7Days.push(new Date(Date.now() - i * 86400000).toISOString().split('T')[0]);
                }
                if (activeDays.some(d => last7Days.includes(d))) {
                    stats.activeLast7Days++;
                }

                // 直近30日間でアクティブ
                const last30Days = [];
                for (let i = 0; i < 30; i++) {
                    last30Days.push(new Date(Date.now() - i * 86400000).toISOString().split('T')[0]);
                }
                if (activeDays.some(d => last30Days.includes(d))) {
                    stats.activeLast30Days++;
                }

                // Day-1 リテンション（登録翌日にアクティブか）
                if (daysSinceReg >= 1) {
                    stats.day1Retention.eligible++;
                    const day1Date = new Date(regDate.getTime() + 86400000).toISOString().split('T')[0];
                    if (activeDays.includes(day1Date)) {
                        stats.day1Retention.retained++;
                    }
                }

                // Day-7 リテンション
                if (daysSinceReg >= 7) {
                    stats.day7Retention.eligible++;
                    const day7Date = new Date(regDate.getTime() + 7 * 86400000).toISOString().split('T')[0];
                    if (activeDays.includes(day7Date)) {
                        stats.day7Retention.retained++;
                    }
                }

                // Day-30 リテンション
                if (daysSinceReg >= 30) {
                    stats.day30Retention.eligible++;
                    const day30Date = new Date(regDate.getTime() + 30 * 86400000).toISOString().split('T')[0];
                    if (activeDays.includes(day30Date)) {
                        stats.day30Retention.retained++;
                    }
                }

                // 週単位コホート集計
                const cohortWeek = RetentionService.getWeekNumber(regDate);
                if (!stats.cohorts[cohortWeek]) {
                    stats.cohorts[cohortWeek] = { users: 0, retained7: 0, retained30: 0 };
                }
                stats.cohorts[cohortWeek].users++;
            });

            // 平均ストリーク
            stats.averageStreak = stats.totalUsers > 0
                ? Math.round(totalStreak / stats.totalUsers * 10) / 10
                : 0;

            // リテンション率を計算
            stats.day1RetentionRate = stats.day1Retention.eligible > 0
                ? Math.round(stats.day1Retention.retained / stats.day1Retention.eligible * 100)
                : 0;
            stats.day7RetentionRate = stats.day7Retention.eligible > 0
                ? Math.round(stats.day7Retention.retained / stats.day7Retention.eligible * 100)
                : 0;
            stats.day30RetentionRate = stats.day30Retention.eligible > 0
                ? Math.round(stats.day30Retention.retained / stats.day30Retention.eligible * 100)
                : 0;

            console.log('[RetentionService] Stats:', stats);
            return stats;
        } catch (error) {
            console.error('[RetentionService] Failed to get stats:', error);
            throw error;
        }
    },

    // 週番号を取得（YYYY-WW形式）
    getWeekNumber: (date) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
        return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    },

    // ユーザーのリテンション情報を取得
    getUserRetentionInfo: async (userId) => {
        if (!userId) return null;

        try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (!userDoc.exists) return null;

            const userData = userDoc.data();
            const today = new Date();
            const regDate = userData.registrationDate ? new Date(userData.registrationDate) : null;
            const daysSinceReg = regDate ? Math.floor((today - regDate) / 86400000) : 0;

            return {
                registrationDate: userData.registrationDate,
                lastActiveDate: userData.lastActiveDate,
                activeDays: userData.activeDays?.length || 0,
                streak: userData.streak || 0,
                daysSinceRegistration: daysSinceReg,
                isActiveToday: userData.activeDays?.includes(today.toISOString().split('T')[0]) || false
            };
        } catch (error) {
            console.error('[RetentionService] Failed to get user info:', error);
            return null;
        }
    }
};

// ===== グローバルに公開 =====
window.DataService = DataService;
window.GeminiAPI = GeminiAPI;
window.CreditService = CreditService;
window.ExperienceService = ExperienceService;
window.PremiumService = PremiumService;
window.MFAService = MFAService;
window.TextbookPurchaseService = TextbookPurchaseService;
window.GiftCodeService = GiftCodeService;
window.AnalyticsService = AnalyticsService;
window.RetentionService = RetentionService;