// ===== ユーティリティ関数 =====

// テーマ管理ユーティリティ
const ThemeUtils = {
    // 利用可能なテーマリスト
    themes: [
        {
            id: 'default',
            name: 'デフォルト',
            description: 'シンプルで見やすい標準テーマ',
            cssFile: null,
            preview: {
                bgColor: '#f9fafb',
                primaryColor: '#667eea',
                textColor: '#1f2937'
            }
        },
        {
            id: 'dark',
            name: 'ダークモード',
            description: '目に優しい暗めのテーマ',
            cssFile: 'styles_dark.css',
            preview: {
                bgColor: '#1a1a1a',
                primaryColor: '#667eea',
                textColor: '#e5e5e5'
            }
        },
        {
            id: 'ocean-deep',
            name: 'オーシャンディープ',
            description: '深海の青と波紋アニメーションの神秘的なテーマ',
            cssFile: 'themes/theme_ocean_deep.css',
            preview: {
                bgColor: '#0a1929',
                primaryColor: '#5ddef4',
                textColor: '#e3f2fd'
            }
        }
    ],

    // 現在のテーマを取得
    getCurrentTheme: () => {
        return localStorage.getItem('app_theme') || 'dark-mode';
    },

    // テーマを設定
    setTheme: (themeId) => {
        const theme = ThemeUtils.themes.find(t => t.id === themeId);
        if (!theme) {
            console.error('Theme not found:', themeId);
            return false;
        }

        // 既存のテーマクラスをすべて削除
        document.body.classList.remove('dark-mode', 'theme-ocean-deep');

        // 既存のテーマCSSリンクを削除
        const existingLinks = document.querySelectorAll('link[data-theme-css]');
        existingLinks.forEach(link => link.remove());

        // 新しいテーマを適用
        if (themeId === 'default') {
            // デフォルトテーマ: 何もしない
            localStorage.setItem('app_theme', 'default');
        } else if (themeId === 'dark') {
            // ダークモード
            document.body.classList.add('dark-mode');
            localStorage.setItem('app_theme', 'dark');
        } else {
            // ホログラフィックテーマ
            document.body.classList.add(`theme-${themeId}`);

            // CSSファイルを動的に読み込む
            if (theme.cssFile) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = theme.cssFile;
                link.setAttribute('data-theme-css', themeId);
                document.head.appendChild(link);
            }

            localStorage.setItem('app_theme', themeId);
        }

        // テーマ変更イベントを発火
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { themeId } }));

        return true;
    },

    // アプリ起動時にテーマを復元
    restoreTheme: () => {
        const savedTheme = ThemeUtils.getCurrentTheme();
        ThemeUtils.setTheme(savedTheme);
    },

    // テーマ情報を取得
    getThemeInfo: (themeId) => {
        return ThemeUtils.themes.find(t => t.id === themeId);
    },

    // すべてのテーマ情報を取得
    getAllThemes: () => {
        return ThemeUtils.themes;
    }
};

// LBM (Lean Body Mass) 計算ユーティリティ
const LBMUtils = {
    // LBM(除脂肪体重)を計算
    calculateLBM: (weight, bodyFatPercentage) => {
        return weight * (1 - bodyFatPercentage / 100);
    },

    // Fat Massを計算
    calculateFatMass: (weight, lbm) => {
        return weight - lbm;
    },

    // LBMベースのBMR計算 (Katch-McArdle式)
    calculateBMR: (lbm) => {
        return 370 + (21.6 * lbm);
    },

    // LBMベースのTDEE計算
    calculateTDEE: (lbm, activityLevel, customMultiplier = null) => {
        const bmr = LBMUtils.calculateBMR(lbm);
        // カスタム係数が設定されていればそれを優先
        if (customMultiplier !== null && customMultiplier !== undefined) {
            return bmr * customMultiplier;
        }
        const activityMultipliers = {
            1: 1.05,   // デスクワーク中心
            2: 1.225,  // 立ち仕事が多い
            3: 1.4,    // 軽い肉体労働
            4: 1.575,  // 重い肉体労働
            5: 1.75    // 非常に激しい肉体労働
        };
        return bmr * (activityMultipliers[activityLevel] || 1.4);
    },

    // LBMベースのタンパク質目標 (2.0-3.0g/kg LBM)
    calculateProteinTarget: (lbm, intensity = 'moderate') => {
        const multipliers = {
            low: 2.0,
            moderate: 2.5,
            high: 3.0
        };
        return lbm * (multipliers[intensity] || 2.5);
    },

    // 外見ベースの体脂肪率推定（ビジュアルガイド方式）
    estimateBodyFatByAppearance: (gender, visualLevel) => {
        // visualLevel: 1-10の段階評価
        // 1 = 非常に低い体脂肪（血管が浮き出る）
        // 5 = 標準的
        // 10 = 非常に高い体脂肪

        const estimates = {
            '男性': {
                1: { bf: 6, description: '血管が全身に浮き出て見える、腹筋が深く刻まれている' },
                2: { bf: 9, description: '血管が明確に見える、6パックの腹筋がはっきり' },
                3: { bf: 12, description: '血管がある程度見える、腹筋の輪郭が明確' },
                4: { bf: 15, description: '腹筋の上部が見える、全体的に引き締まっている' },
                5: { bf: 18, description: '腹筋がうっすら見える、健康的な体型' },
                6: { bf: 21, description: '腹筋は見えない、軽い皮下脂肪がある' },
                7: { bf: 24, description: 'お腹周りに脂肪がつき始めている' },
                8: { bf: 27, description: 'お腹が明らかに出ている' },
                9: { bf: 30, description: '全体的にふくよか、顎の下に脂肪' },
                10: { bf: 35, description: '全体的に丸みを帯びた体型' }
            },
            '女性': {
                1: { bf: 14, description: '血管が見える、腹筋が非常に明確（アスリートレベル）' },
                2: { bf: 17, description: '腹筋の輪郭が見える、全身が引き締まっている' },
                3: { bf: 20, description: '腹筋の上部が見える、健康的で引き締まった体型' },
                4: { bf: 23, description: '腹部が平ら、全体的にスリムな印象' },
                5: { bf: 26, description: '標準的な体型、適度な女性らしい丸み' },
                6: { bf: 29, description: '軽い皮下脂肪、健康的な丸み' },
                7: { bf: 32, description: '腰回りに脂肪がつき始めている' },
                8: { bf: 35, description: 'お腹周りと腰に脂肪が目立つ' },
                9: { bf: 38, description: '全体的にふくよか、顔が丸くなる' },
                10: { bf: 42, description: '全体的に丸みを帯びた体型' }
            }
        };

        const genderEstimates = estimates[gender] || estimates['男性'];
        const estimate = genderEstimates[visualLevel] || genderEstimates[5];

        return {
            bodyFatPercentage: estimate.bf,
            description: estimate.description,
            accuracy: 'low', // 常に低精度
            warning: 'この推定値は外見に基づく主観的評価であり、実際の体脂肪率と±3-5%の誤差がある可能性があります。正確な測定には体組成計の使用を推奨します。'
        };
    },

    // 外見評価のビジュアルガイド情報
    getVisualGuideInfo: (gender) => {
        const guides = {
            '男性': [
                { level: 1, range: '5-7%', title: 'コンテストレベル', features: ['血管が全身に浮き出る', '腹筋が深く刻まれている', '筋肉の繊維が見える'], health: '健康リスクあり。短期間のみ推奨' },
                { level: 2, range: '8-10%', title: 'フィジーク選手', features: ['血管が明確', '6パックの腹筋', '全身の筋肉のカット'], health: '維持には高度な管理が必要' },
                { level: 3, range: '11-13%', title: 'アスリート', features: ['血管がある程度見える', '腹筋の輪郭が明確', '引き締まった印象'], health: '健康的でパフォーマンス重視' },
                { level: 4, range: '14-16%', title: 'フィット', features: ['腹筋の上部が見える', '全体的に引き締まっている', '健康的'], health: '維持しやすく健康的' },
                { level: 5, range: '17-19%', title: '標準', features: ['腹筋がうっすら見える', '健康的な体型', '適度な脂肪'], health: '最も健康的な範囲' },
                { level: 6, range: '20-22%', title: '標準やや高め', features: ['腹筋は見えない', '軽い皮下脂肪', '普通の体型'], health: '健康的な範囲内' },
                { level: 7, range: '23-25%', title: 'やや高め', features: ['お腹周りに脂肪', '全体的に丸み'], health: '運動習慣の改善推奨' },
                { level: 8, range: '26-28%', title: '高め', features: ['お腹が出ている', '顎の下に脂肪'], health: '健康改善を推奨' },
                { level: 9, range: '29-31%', title: '肥満', features: ['全体的にふくよか', '顔が丸い'], health: '医療相談を推奨' },
                { level: 10, range: '32%+', title: '肥満度高', features: ['全体的に丸みを帯びる', '動きにくさを感じる'], health: '医療相談を強く推奨' }
            ],
            '女性': [
                { level: 1, range: '12-15%', title: 'コンテストレベル', features: ['血管が見える', '腹筋が非常に明確', '筋肉のカット'], health: '健康リスクあり。短期間のみ推奨' },
                { level: 2, range: '16-18%', title: 'アスリート', features: ['腹筋の輪郭', '全身が引き締まっている', '筋肉質'], health: '維持には高度な管理が必要' },
                { level: 3, range: '19-21%', title: 'フィット', features: ['腹筋の上部が見える', '引き締まった体型', '健康的'], health: '健康的でパフォーマンス重視' },
                { level: 4, range: '22-24%', title: 'スリム', features: ['腹部が平ら', '全体的にスリム', '女性らしい曲線'], health: '維持しやすく健康的' },
                { level: 5, range: '25-27%', title: '標準', features: ['健康的な体型', '適度な丸み', 'バランスが良い'], health: '最も健康的な範囲' },
                { level: 6, range: '28-30%', title: '標準やや高め', features: ['軽い皮下脂肪', '健康的な丸み', '女性らしい体型'], health: '健康的な範囲内' },
                { level: 7, range: '31-33%', title: 'やや高め', features: ['腰回りに脂肪', '全体的に丸み'], health: '運動習慣の改善推奨' },
                { level: 8, range: '34-36%', title: '高め', features: ['お腹周りと腰に脂肪', '顔が丸い'], health: '健康改善を推奨' },
                { level: 9, range: '37-39%', title: '肥満', features: ['全体的にふくよか', '二重顎'], health: '医療相談を推奨' },
                { level: 10, range: '40%+', title: '肥満度高', features: ['全体的に丸みを帯びる', '動きにくさを感じる'], health: '医療相談を強く推奨' }
            ]
        };

        return guides[gender] || guides['男性'];
    },

    // 目標PFC計算（完全個別化版 v2.0）
    calculateTargetPFC: (tdee, weightChangePace, lbm, lifestyle = '一般', purpose = 'メンテナンス', dietStyle = 'バランス', customCalorieAdjustment = null, customPFC = null) => {
        // カロリー調整値を目的に応じて設定（カスタム値がある場合はそれを優先）
        let calorieAdjustment = 0;
        if (customCalorieAdjustment !== null && customCalorieAdjustment !== undefined) {
            calorieAdjustment = customCalorieAdjustment;
        } else {
            if (purpose === 'ダイエット') calorieAdjustment = -300;
            else if (purpose === 'バルクアップ') calorieAdjustment = +300;
        }

        const adjustedCalories = tdee + calorieAdjustment;

        // カスタムPFC比率が設定されている場合はそれを使用
        if (customPFC && customPFC.P && customPFC.F && customPFC.C) {
            const proteinCal = adjustedCalories * (customPFC.P / 100);
            const fatCal = adjustedCalories * (customPFC.F / 100);
            const carbCal = adjustedCalories * (customPFC.C / 100);

            return {
                calories: Math.round(adjustedCalories),
                protein: Math.round(proteinCal / 4),
                fat: Math.round(fatCal / 9),
                carbs: Math.round(carbCal / 4)
            };
        }

        // タンパク質係数（LBMあたり）- 一般: 1.0/1.2/1.4、ボディメイカー: 2倍
        let proteinCoefficient = 1.2; // デフォルト
        if (lifestyle === 'ボディメイカー') {
            if (purpose === 'バルクアップ') proteinCoefficient = 1.4 * 2;  // 2.8
            else if (purpose === 'ダイエット') proteinCoefficient = 1.2 * 2;  // 2.4
            else proteinCoefficient = 1.0 * 2;  // 2.0
        } else {
            // 一般
            if (purpose === 'バルクアップ') proteinCoefficient = 1.4;
            else if (purpose === 'ダイエット') proteinCoefficient = 1.2;
            else proteinCoefficient = 1.0;
        }

        // タンパク質 (P): LBM × 係数
        const proteinG = lbm * proteinCoefficient;
        const proteinCal = proteinG * 4;

        // 食事スタイル別のPFC比率
        let fatRatio, carbRatio;
        switch (dietStyle) {
            case 'バランス':
                // 現在の式: 脂質25%、残り炭水化物
                fatRatio = 0.25;
                break;
            case '低脂質':
                // 高炭水化物・低脂質: 脂質15%
                fatRatio = 0.15;
                break;
            case '低炭水化物':
                // 高脂質・低炭水化物: 脂質35%
                fatRatio = 0.35;
                break;
            case 'ケトジェニック':
                // 超高脂質・超低炭水化物: 脂質60%、炭水化物5%以下
                fatRatio = 0.60;
                break;
            default:
                fatRatio = 0.25;
        }

        const fatCal = adjustedCalories * fatRatio;
        const fatG = fatCal / 9;

        // 炭水化物 (C): 残りすべて
        const carbCal = adjustedCalories - proteinCal - fatCal;
        const carbG = carbCal / 4;

        return {
            calories: Math.round(adjustedCalories),
            protein: Math.round(proteinG),
            fat: Math.round(fatG),
            carbs: Math.round(carbG)
        };
    },

    // 完全個別化: LBM・血液型・目的別の微量栄養素基準値計算 v2.0（耐容上限対応）
    calculatePersonalizedMicronutrients: (profile) => {
        const lbm = LBMUtils.calculateLBM(profile.weight || 70, profile.bodyFatPercentage || 15);
        const bloodType = profile.bloodType || 'A';
        const goal = profile.goal || 'メンテナンス';
        const lifestyle = profile.lifestyle || '一般';

        // LBM係数: 基準50kg、±1kgあたり±2%
        const lbmFactor = 1 + ((lbm - 50) * 0.02);

        // 血液型係数（代謝特性に基づく）
        const bloodTypeFactors = {
            'A': { vitamin: 1.0, mineral: 1.05, antioxidant: 1.1 },   // 農耕民族型、抗酸化重視
            'B': { vitamin: 1.05, mineral: 1.0, antioxidant: 1.0 },   // 遊牧民族型、ビタミンB群重視
            'O': { vitamin: 0.95, mineral: 1.1, antioxidant: 0.95 },  // 狩猟民族型、ミネラル重視
            'AB': { vitamin: 1.02, mineral: 1.02, antioxidant: 1.05 } // 混合型、バランス
        };
        const btFactor = bloodTypeFactors[bloodType] || bloodTypeFactors['A'];

        // 目的係数
        const goalFactors = {
            'バルクアップ': { energy: 1.3, protein: 1.4, recovery: 1.3 },
            'ダイエット': { energy: 1.1, protein: 1.2, recovery: 1.1 },
            'メンテナンス': { energy: 1.0, protein: 1.0, recovery: 1.0 },
            'リコンプ': { energy: 1.2, protein: 1.3, recovery: 1.2 }
        };
        const gFactor = goalFactors[goal] || goalFactors['メンテナンス'];

        // ライフスタイル係数: ボディメイカーは2倍
        const lifestyleBase = lifestyle === 'ボディメイカー' ? 2.0 : 1.0;

        // 耐容上限値（成人）
        const tolerableUpperLimits = {
            A: 3000,      // μg
            D: 100,       // μg
            E: 650,       // mg
            K: null,      // 上限なし
            B1: null,     // 上限なし
            B2: null,     // 上限なし
            B3: 35,       // mg (ニコチン酸として)
            B5: null,     // 上限なし
            B6: 60,       // mg
            B7: null,     // 上限なし
            B9: 1000,     // μg
            B12: null,    // 上限なし
            C: 2000,      // mg
            calcium: 2500,    // mg
            iron: 50,         // mg
            magnesium: 350,   // mg (サプリメント由来)
            phosphorus: 3500, // mg
            potassium: null,  // 上限なし
            sodium: 2300,     // mg (上限として)
            zinc: 45,         // mg
            copper: 10,       // mg
            manganese: 11,    // mg
            selenium: 450,    // μg
            iodine: 3000,     // μg
            chromium: null    // 上限なし
        };

        // 栄養素を計算して耐容上限でキャップ
        const capValue = (value, limit) => {
            if (limit === null || limit === undefined) return value;
            return Math.min(value, limit);
        };

        return {
            // ビタミン: LBM × 血液型 × 目的 × ライフスタイル (上限チェック)
            vitamins: {
                A: capValue(Math.round(900 * lbmFactor * btFactor.antioxidant * lifestyleBase), tolerableUpperLimits.A),
                D: capValue(Math.round(20 * lbmFactor * btFactor.vitamin * gFactor.recovery * lifestyleBase), tolerableUpperLimits.D),
                E: capValue(Math.round(6.5 * lbmFactor * btFactor.antioxidant * gFactor.recovery * lifestyleBase * 10) / 10, tolerableUpperLimits.E),
                K: Math.round(150 * lbmFactor * btFactor.vitamin * lifestyleBase),
                B1: Math.round(1.4 * lbmFactor * btFactor.vitamin * gFactor.energy * lifestyleBase * 10) / 10,
                B2: Math.round(1.6 * lbmFactor * btFactor.vitamin * gFactor.energy * lifestyleBase * 10) / 10,
                B3: capValue(Math.round(15 * lbmFactor * btFactor.vitamin * gFactor.energy * lifestyleBase), tolerableUpperLimits.B3),
                B5: Math.round(5 * lbmFactor * btFactor.vitamin * gFactor.energy * lifestyleBase * 10) / 10,
                B6: capValue(Math.round(1.4 * lbmFactor * btFactor.vitamin * gFactor.protein * lifestyleBase * 10) / 10, tolerableUpperLimits.B6),
                B7: Math.round(50 * lbmFactor * btFactor.vitamin * lifestyleBase),
                B9: capValue(Math.round(240 * lbmFactor * btFactor.vitamin * gFactor.recovery * lifestyleBase), tolerableUpperLimits.B9),
                B12: Math.round(2.4 * lbmFactor * btFactor.vitamin * gFactor.recovery * lifestyleBase * 10) / 10,
                C: capValue(Math.round(100 * lbmFactor * btFactor.antioxidant * gFactor.recovery * lifestyleBase), tolerableUpperLimits.C)
            },
            // ミネラル: LBM × 血液型 × 目的 × ライフスタイル (上限チェック)
            minerals: {
                calcium: capValue(Math.round(800 * lbmFactor * btFactor.mineral * lifestyleBase), tolerableUpperLimits.calcium),
                iron: capValue(Math.round(7.5 * lbmFactor * btFactor.mineral * gFactor.recovery * lifestyleBase * 10) / 10, tolerableUpperLimits.iron),
                magnesium: capValue(Math.round(370 * lbmFactor * btFactor.mineral * gFactor.energy * lifestyleBase), tolerableUpperLimits.magnesium),
                phosphorus: capValue(Math.round(1000 * lbmFactor * btFactor.mineral * gFactor.protein * lifestyleBase), tolerableUpperLimits.phosphorus),
                potassium: Math.round(3000 * lbmFactor * btFactor.mineral * gFactor.energy * lifestyleBase),
                sodium: capValue(Math.round(2000 * lbmFactor * lifestyleBase), tolerableUpperLimits.sodium),
                zinc: capValue(Math.round(11 * lbmFactor * btFactor.mineral * gFactor.protein * lifestyleBase * 10) / 10, tolerableUpperLimits.zinc),
                copper: capValue(Math.round(0.9 * lbmFactor * btFactor.mineral * lifestyleBase * 10) / 10, tolerableUpperLimits.copper),
                manganese: capValue(Math.round(4.0 * lbmFactor * btFactor.mineral * lifestyleBase * 10) / 10, tolerableUpperLimits.manganese),
                selenium: capValue(Math.round(30 * lbmFactor * btFactor.antioxidant * lifestyleBase), tolerableUpperLimits.selenium),
                iodine: capValue(Math.round(130 * lbmFactor * btFactor.mineral * lifestyleBase), tolerableUpperLimits.iodine),
                chromium: Math.round(35 * lbmFactor * btFactor.mineral * lifestyleBase)
            },
            // その他の栄養素: LBM × 目的 × ライフスタイル
            otherNutrients: {
                caffeine: Math.round(400 * Math.min(lbmFactor, 1.2) * lifestyleBase), // 上限重視
                catechin: Math.round(500 * lbmFactor * btFactor.antioxidant * lifestyleBase),
                tannin: Math.round(1000 * lbmFactor * lifestyleBase),
                polyphenol: Math.round(1000 * lbmFactor * btFactor.antioxidant * lifestyleBase),
                chlorogenicAcid: Math.round(300 * lbmFactor * btFactor.antioxidant * lifestyleBase),
                creatine: Math.round((goal === 'バルクアップ' ? 5 : goal === 'ダイエット' ? 3 : 3) * lbmFactor * lifestyleBase * 1000),
                lArginine: Math.round((goal === 'バルクアップ' ? 6000 : 3000) * lbmFactor * gFactor.protein * lifestyleBase),
                lCarnitine: Math.round((goal === 'ダイエット' ? 2000 : 1000) * lbmFactor * gFactor.energy * lifestyleBase),
                EPA: Math.round(1000 * lbmFactor * btFactor.antioxidant * gFactor.recovery * lifestyleBase),
                DHA: Math.round(1000 * lbmFactor * btFactor.antioxidant * gFactor.recovery * lifestyleBase),
                coQ10: Math.round(100 * lbmFactor * gFactor.energy * lifestyleBase),
                lutein: Math.round(6 * lbmFactor * btFactor.antioxidant * lifestyleBase),
                astaxanthin: Math.round(6 * lbmFactor * btFactor.antioxidant * gFactor.recovery * lifestyleBase)
            }
        };
    },

    // 旧バージョン（互換性のため残す）
    calculateMicronutrientTargets: (style = '一般') => {
        const baseMultiplier = style === 'ボディメイカー' ? 2.0 : 1.0;

        return {
            // ビタミン (μg/mg単位)
            vitaminA: Math.round(900 * baseMultiplier), // μg
            vitaminB1: Math.round(1.2 * baseMultiplier * 10) / 10, // mg
            vitaminB2: Math.round(1.6 * baseMultiplier * 10) / 10, // mg
            vitaminB6: Math.round(1.4 * baseMultiplier * 10) / 10, // mg
            vitaminB12: Math.round(2.4 * baseMultiplier * 10) / 10, // μg
            vitaminC: Math.round(100 * baseMultiplier), // mg
            vitaminD: Math.round(8.5 * baseMultiplier * 10) / 10, // μg
            vitaminE: Math.round(6.0 * baseMultiplier * 10) / 10, // mg
            vitaminK: Math.round(150 * baseMultiplier), // μg

            // ミネラル (mg単位)
            calcium: Math.round(800 * baseMultiplier), // mg
            iron: Math.round(7.5 * baseMultiplier * 10) / 10, // mg
            magnesium: Math.round(340 * baseMultiplier), // mg
            zinc: Math.round(10 * baseMultiplier), // mg
            potassium: Math.round(2500 * baseMultiplier), // mg
            sodium: Math.round(2000 * baseMultiplier) // mg (上限として)
        };
    }
};

// 日付ユーティリティ
const DateUtils = {
    formatDate: (date) => {
        return new Date(date).toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    getDaysDifference: (date1, date2) => {
        return Math.floor((new Date(date1) - new Date(date2)) / (1000 * 60 * 60 * 24));
    },

    getTodayString: () => {
        return new Date().toISOString().split('T')[0];
    }
};

// サブスクリプション管理ユーティリティ
const SubscriptionUtils = {
    // ユーザーがプレミアムかどうかを判定
    isPremiumUser: (userProfile) => {
        return userProfile?.subscription?.status === 'active';
    },

    // 機能へのアクセス権をチェック
    canAccessFeature: (userProfile, featureName) => {
        if (SubscriptionUtils.isPremiumUser(userProfile)) {
            return { allowed: true };
        }

        // 初日（利用日数0日）は写真解析とAI分析を無料で利用可能
        const usageDays = parseInt(localStorage.getItem(STORAGE_KEYS.USAGE_DAYS) || '0', 10);
        if (usageDays === 0 && (featureName === 'aiAnalysis' || featureName === 'photoAnalysis')) {
            return { allowed: true };
        }

        // 無料プランの制限をチェック
        const restrictions = {
            aiAnalysis: {
                allowed: false,
                message: 'AI分析はプレミアムプラン限定の機能です。\n\n初日は無料でお試しいただけました。プレミアムプランにアップグレードすると、AI分析が月100回まで利用できます。'
            },
            photoAnalysis: {
                allowed: false,
                message: '写真解析はプレミアムプラン限定の機能です。\n\n初日は無料でお試しいただけました。プレミアムプランにアップグレードすると、写真解析が無制限に利用できます。'
            },
            community: {
                allowed: false,
                message: 'コミュニティ機能はプレミアムプラン限定です。\n\nプレミアムプランにアップグレードして、他のユーザーと交流しましょう。'
            },
            pgBase: {
                allowed: false,
                message: 'PG BASE教科書はプレミアムプラン限定です。\n\nプレミアムプランにアップグレードして、ボディメイクの知識を深めましょう。'
            },
            dataExport: {
                allowed: false,
                message: 'データエクスポート機能はプレミアムプラン限定です。'
            }
        };

        return restrictions[featureName] || { allowed: true };
    },

    // 履歴表示の日数制限をチェック
    getHistoryDaysLimit: (userProfile) => {
        if (SubscriptionUtils.isPremiumUser(userProfile)) {
            return null; // 無制限
        }
        return FREE_PLAN_LIMITS.historyDays; // 7日間
    },

    // テンプレート数の制限をチェック
    canAddTemplate: (userProfile, currentCount, templateType) => {
        if (SubscriptionUtils.isPremiumUser(userProfile)) {
            return { allowed: true };
        }

        // テンプレートタイプ別の制限
        let limit = 0;
        let typeName = '';

        if (templateType === 'meal') {
            limit = FREE_PLAN_LIMITS.mealTemplates;
            typeName = '食事';
        } else if (templateType === 'workout') {
            limit = FREE_PLAN_LIMITS.workoutTemplates;
            typeName = '運動';
        } else if (templateType === 'supplement') {
            limit = FREE_PLAN_LIMITS.supplementTemplates;
            typeName = 'サプリメント';
        }

        if (limit === 0) {
            return {
                allowed: false,
                message: `無料プランでは${typeName}テンプレートは作成できません。\n\nプレミアムプランにアップグレードすると、テンプレートを無制限に作成できます。`
            };
        }

        if (currentCount >= limit) {
            return {
                allowed: false,
                message: `無料プランでは${typeName}テンプレートは${limit}個までです。\n\nプレミアムプランにアップグレードすると、テンプレートを無制限に作成できます。`
            };
        }

        return { allowed: true };
    },

    // ルーティン機能へのアクセスをチェック
    canUseRoutines: (userProfile) => {
        if (SubscriptionUtils.isPremiumUser(userProfile)) {
            return { allowed: true };
        }

        if (FREE_PLAN_LIMITS.routines === false) {
            return {
                allowed: false,
                message: `ルーティン機能はプレミアムプラン限定です。\n\nプレミアムプランにアップグレードすると、ルーティンを無制限に作成できます。`
            };
        }

        return { allowed: true };
    },

    // 履歴データをフィルタリング（無料プランは7日間のみ）
    filterHistoryByPlan: (userProfile, historyData) => {
        if (SubscriptionUtils.isPremiumUser(userProfile)) {
            return historyData; // すべて表示
        }

        // 無料プランは過去7日間のみ
        const limit = FREE_PLAN_LIMITS.historyDays;
        const today = new Date();
        const cutoffDate = new Date(today);
        cutoffDate.setDate(today.getDate() - limit);

        return historyData.filter(item => {
            const itemDate = new Date(item.date);
            return itemDate >= cutoffDate;
        });
    },

    // アップグレード促進メッセージを表示
    showUpgradePrompt: (featureName) => {
        const access = SubscriptionUtils.canAccessFeature({}, featureName);
        if (!access.allowed && access.message) {
            alert(access.message);
        }
    }
};

// コンディションチェックユーティリティ
const ConditionUtils = {
    // コンディションが完全に記録されているか確認（6項目全て）
    isFullyRecorded: (dailyRecord) => {
        const conditions = dailyRecord?.conditions;
        if (!conditions) return false;

        // 6項目全てがnumberで0-4の範囲内にあるか確認
        const requiredFields = [
            'sleepHours',    // 睡眠時間
            'sleepQuality',  // 睡眠の質
            'appetite',      // 食欲
            'digestion',     // 消化
            'focus',         // 集中力
            'stress'         // ストレス
        ];

        return requiredFields.every(field =>
            typeof conditions[field] === 'number' &&
            conditions[field] >= 0 &&
            conditions[field] <= 4
        );
    }
};

// 計算ユーティリティ
const CalcUtils = {
    // 合計栄養素計算
    sumNutrients: (items) => {
        return {
            calories: items.reduce((sum, item) => sum + (item.calories || 0), 0),
            protein: items.reduce((sum, item) => sum + (item.protein || 0), 0),
            fat: items.reduce((sum, item) => sum + (item.fat || 0), 0),
            carbs: items.reduce((sum, item) => sum + (item.carbs || 0), 0)
        };
    },

    // 実質タンパク質量計算（DIAAS適用）
    calculateRealProtein: (protein, diaas = 1.0) => {
        return protein * (diaas / 100);
    },

    // 高度な自動調整 v2.0
    calculateAdvancedAdjustments: (profile, dailyRecord, baseTargetPFC) => {
        let adjustments = {
            calorieBoost: 0,
            proteinBoost: 0,
            carbBoost: 0,
            fatBoost: 0,
            reason: []
        };

        // === 1. 生理学的特性 ===

        // a. 年齢による調整
        const age = profile.age || 25;
        if (age >= 40) {
            adjustments.proteinBoost += 0.2; // +0.2g/kg LBM
            adjustments.reason.push('年齢40歳以上: タンパク質係数+0.2');
        }
        if (age >= 50) {
            adjustments.proteinBoost += 0.1; // さらに+0.1g/kg LBM
            adjustments.reason.push('年齢50歳以上: タンパク質係数さらに+0.1');
        }

        // b. 性別による調整
        const gender = profile.gender || '男性';
        if (gender === '女性') {
            // 女性は鉄分・葉酸の必要量が多い（提案アルゴリズムで考慮）
            adjustments.reason.push('性別: 女性（鉄分・葉酸の提案優先度UP）');
        }

        // c. ライフスタイルによる調整
        const lifestyle = profile.lifestyle || '一般';
        if (lifestyle === 'ボディメイカー') {
            adjustments.proteinBoost += 0.5; // +0.5g/kg LBM
            adjustments.reason.push('ボディメイカー: タンパク質係数+0.5');
        }

        // === 2. トレーニング部位による調整 ===

        const mainMuscleGroups = ['脚', '背中'];
        let isLargeMuscleDay = false;
        (dailyRecord?.workouts || []).forEach(workout => {
            (workout.exercises || []).forEach(ex => {
                if (mainMuscleGroups.some(mg => (ex.name || '').includes(mg))) {
                    isLargeMuscleDay = true;
                }
            });
        });

        if (isLargeMuscleDay) {
            adjustments.carbBoost += 15;
            adjustments.reason.push('大筋群トレーニング日: 炭水化物+15g');
        }

        // === 3. ライフスタイル要因 ===

        // a. 睡眠の質と時間
        const sleepHours = dailyRecord?.conditions?.sleepHours || 3;
        const sleepQuality = dailyRecord?.conditions?.sleepQuality || 3;

        if (sleepHours <= 2 || sleepQuality <= 2) {
            adjustments.proteinBoost += 0.1; // 回復サポート
            adjustments.reason.push('睡眠不足/質低下: タンパク質+0.1、低GI食材推奨');
        }

        // b. ストレスレベル
        const stressLevel = dailyRecord?.conditions?.stress || 3;
        if (stressLevel >= 4) {
            adjustments.reason.push('高ストレス: ビタミンC・マグネシウム推奨、低GI食材推奨');
        }

        return adjustments;
    },

    // 自動食材ピックアップ: 不足分を最適に埋める食材の組み合わせを提案
    autoPickFoods: (deficit, allFoods, profile, dailyRecord, maxItems = 5) => {
        // トレーニングタイミングを判定
        const now = new Date();
        const lastWorkoutTime = dailyRecord?.workouts?.[dailyRecord.workouts.length - 1]?.timestamp;
        let timingContext = 'normal'; // 'post_workout', 'pre_sleep', 'morning', 'normal'

        if (lastWorkoutTime) {
            const hoursSinceWorkout = (now - new Date(lastWorkoutTime)) / (1000 * 60 * 60);
            if (hoursSinceWorkout < 2) {
                timingContext = 'post_workout'; // トレーニング直後2時間以内
            }
        }

        const hour = now.getHours();
        if (hour >= 22 || hour < 6) timingContext = 'pre_sleep'; // 就寝前
        else if (hour >= 6 && hour < 10) timingContext = 'morning'; // 朝

        // 各食材にスコアを付与
        const scoredFoods = allFoods.map(food => {
            // 🎯 第1優先: PFC不足補充スコア
            const pScore = deficit.protein > 0 ? (food.protein / deficit.protein) * 100 : 0;
            const cScore = deficit.carbs > 0 ? (food.carbs / deficit.carbs) * 100 : 0;
            const fScore = deficit.fat > 0 ? (food.fat / deficit.fat) * 100 : 0;
            const deficitScore = pScore + cScore + fScore;

            // ✨ 第2優先: DIAAS & GI値（タイミング考慮）
            const diaasValue = food.diaas || 1.0;
            const diaasBonus = diaasValue > 1.0 ? (diaasValue - 1.0) * 20 : 0;

            const giValue = food.gi || 55;
            let giBonus = 0;
            if (timingContext === 'post_workout') {
                // トレーニング直後: 高GI優先
                if (giValue > 70) giBonus = 15;
                else if (giValue > 55) giBonus = 5;
            } else {
                // 通常時: 低GI優先
                if (giValue <= 55) giBonus = 10;
                else if (giValue > 70) giBonus = -5;
            }

            // 😊 第3優先: 食文化・親和性
            const ethnicity = profile?.ethnicity || 'アジア';
            let culturalBonus = 0;
            if (ethnicity === 'アジア') {
                if (['白米', '玄米', '納豆', 'サバ', '豆腐', '味噌', '醤油'].some(jp => (food.name || '').includes(jp))) {
                    culturalBonus = 5;
                }
            }

            // 女性: 鉄分・葉酸が多い食材を優先
            const gender = profile?.gender || '男性';
            let genderBonus = 0;
            if (gender === '女性' && (food.iron > 2 || food.folicAcid > 50)) {
                genderBonus = 5;
            }

            // ストレス高: ビタミンC・マグネシウムが多い食材を優先
            const stressLevel = dailyRecord?.condition?.stress || 'normal';
            let stressBonus = 0;
            if (stressLevel === 'high' && (food.vitaminC > 20 || food.magnesium > 50)) {
                stressBonus = 5;
            }

            // 最終スコア
            const finalScore = deficitScore + diaasBonus + giBonus + culturalBonus + genderBonus + stressBonus;

            return {
                ...food,
                deficitScore,
                diaasBonus,
                giBonus,
                culturalBonus,
                genderBonus,
                stressBonus,
                finalScore,
                pScore,
                cScore,
                fScore
            };
        });

        // スコアでソートして上位を取得
        scoredFoods.sort((a, b) => b.finalScore - a.finalScore);

        // 貪欲法で最適な組み合わせを選択
        const picked = [];
        let remainingDeficit = { ...deficit };

        for (const food of scoredFoods) {
            if (picked.length >= maxItems) break;

            // この食材が不足分を補えるか判定
            const contributesToDeficit =
                (remainingDeficit.protein > 0 && food.protein > 0) ||
                (remainingDeficit.carbs > 0 && food.carbs > 0) ||
                (remainingDeficit.fat > 0 && food.fat > 0);

            if (contributesToDeficit) {
                picked.push(food);

                // 不足分を更新
                remainingDeficit.protein = Math.max(0, remainingDeficit.protein - food.protein);
                remainingDeficit.carbs = Math.max(0, remainingDeficit.carbs - food.carbs);
                remainingDeficit.fat = Math.max(0, remainingDeficit.fat - food.fat);
            }
        }

        return {
            pickedFoods: picked,
            timingContext,
            remainingDeficit
        };
    }
};
