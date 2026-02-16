/**
 * seed_templates_v2.js
 * generateQuestLogic() の FOOD_NUTRITION / WORKOUT_TEMPLATES をそのまま使用
 * 食材構成・表示名・栄養値すべてクエスト生成と完全一致
 *
 * 白米 → 白米（冷やご飯・再加熱）表記
 */
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

// === FOOD_NUTRITION (index.js line 5109-5121 と同一) ===
const FOOD_NUTRITION = {
  chicken_breast: { p: 23, f: 2, c: 0 },
  beef_lean: { p: 21, f: 4, c: 0 },
  saba: { p: 26, f: 12, c: 0 },
  salmon: { p: 22, f: 4, c: 0 },
  white_rice: { p: 2.5, f: 0.3, c: 37 },
  brown_rice: { p: 2.8, f: 1, c: 35 },
  broccoli: { p: 4, f: 0.5, c: 5 },
  mochi: { p: 4, f: 1, c: 50 },
  whey_protein: { p: 80, f: 3, c: 5 },
  olive_oil: { p: 0, f: 100, c: 0 },
  pink_salt: { p: 0, f: 0, c: 0 },
};
const EGG_PER_UNIT = { p: 8, f: 6.5, c: 0.3 }; // 1個64g

// === FOOD_ID_MAP displayName (index.js line 4998-5011) ===
// FoodDatabase.kt の name と完全一致させる
const DISPLAY_NAMES = {
  chicken_breast: "鶏むね肉（皮なし生）",
  egg_whole: "鶏卵 L（64g）",
  white_rice: "白米（冷やご飯・再加熱）",
  brown_rice: "玄米（炊飯後）",
  broccoli: "ブロッコリー（生）",
  beef_lean: "牛もも肉（赤肉生）",
  saba: "サバ（焼き）",
  salmon: "サケ（生）",
  mochi: "餅",
  whey_protein: "ホエイプロテイン",
  pink_salt: "ピンクソルト（ヒマラヤ岩塩）",
  olive_oil: "オリーブオイル",
};

// Cal = P*4 + F*9 + C*4
function calcItem(foodId, amountG, unit) {
  const nut = FOOD_NUTRITION[foodId];
  const p = Math.round(nut.p * amountG / 100 * 10) / 10;
  const f = Math.round(nut.f * amountG / 100 * 10) / 10;
  const c = Math.round(nut.c * amountG / 100 * 10) / 10;
  const cal = Math.round(p * 4 + f * 9 + c * 4);
  return {
    foodName: DISPLAY_NAMES[foodId],
    amount: amountG, unit,
    calories: cal, protein: p, fat: f, carbs: c, fiber: 0,
  };
}

function calcEgg(count) {
  const p = Math.round(EGG_PER_UNIT.p * count * 10) / 10;
  const f = Math.round(EGG_PER_UNIT.f * count * 10) / 10;
  const c = Math.round(EGG_PER_UNIT.c * count * 10) / 10;
  const cal = Math.round(p * 4 + f * 9 + c * 4);
  return {
    foodName: DISPLAY_NAMES.egg_whole + " (" + count + "個)",
    amount: count, unit: "個",
    calories: cal, protein: p, fat: f, carbs: c, fiber: 0,
  };
}

function sumMacros(items) {
  return {
    calories: items.reduce((s, i) => s + i.calories, 0),
    protein: Math.round(items.reduce((s, i) => s + i.protein, 0) * 10) / 10,
    fat: Math.round(items.reduce((s, i) => s + i.fat, 0) * 10) / 10,
    carbs: Math.round(items.reduce((s, i) => s + i.carbs, 0) * 10) / 10,
  };
}

/**
 * 通常食事テンプレート生成
 * クエスト生成の通常食事と同じ構成:
 *   卵(1個) + タンパク質源(150g) + ブロッコリー(50g) + 炭水化物源(150g) + オリーブオイル(5g) + ピンク岩塩(3g)
 */
function makeNormalMeal(proteinId, carbId, title, templateId) {
  const items = [
    calcEgg(1),
    calcItem(proteinId, 150, "g"),
    calcItem("broccoli", 50, "g"),
    calcItem(carbId, 200, "g"),
    calcItem("olive_oil", 5, "g"),
    calcItem("pink_salt", 3, "g"),
  ];
  return {
    templateId,
    ownerId: "admintrainer",
    title,
    type: "MEAL",
    isActive: true,
    organizationName: null,
    items,
    totalMacros: sumMacros(items),
    createdAt: Date.now(),
  };
}

(async () => {
  // 1. 既存の admintrainer テンプレートを全削除
  const existingSnap = await db.collection('quest_templates')
    .where('ownerId', '==', 'admintrainer')
    .get();
  if (!existingSnap.empty) {
    const batch = db.batch();
    existingSnap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    console.log(`DELETED ${existingSnap.size} existing admintrainer templates`);
  }

  // ============================================================
  // 2. 食事テンプレート（クエスト生成と同じ食材構成）
  // ============================================================
  const mealTemplates = [];

  // --- タンパク質源 × 白米 (維持/増量) ---
  mealTemplates.push(makeNormalMeal(
    "chicken_breast", "white_rice",
    "鶏むね肉＋白米",
    "meal_chicken_whiterice"
  ));
  mealTemplates.push(makeNormalMeal(
    "beef_lean", "white_rice",
    "牛赤身肉＋白米",
    "meal_beef_whiterice"
  ));
  mealTemplates.push(makeNormalMeal(
    "saba", "white_rice",
    "サバ＋白米",
    "meal_saba_whiterice"
  ));
  mealTemplates.push(makeNormalMeal(
    "salmon", "white_rice",
    "鮭＋白米",
    "meal_salmon_whiterice"
  ));

  // --- タンパク質源 × 玄米 (減量) ---
  mealTemplates.push(makeNormalMeal(
    "chicken_breast", "brown_rice",
    "鶏むね肉＋玄米",
    "meal_chicken_brownrice"
  ));
  mealTemplates.push(makeNormalMeal(
    "beef_lean", "brown_rice",
    "牛赤身肉＋玄米",
    "meal_beef_brownrice"
  ));
  mealTemplates.push(makeNormalMeal(
    "saba", "brown_rice",
    "サバ＋玄米",
    "meal_saba_brownrice"
  ));
  mealTemplates.push(makeNormalMeal(
    "salmon", "brown_rice",
    "鮭＋玄米",
    "meal_salmon_brownrice"
  ));

  // --- トレ前食事（餅＋プロテイン＋岩塩） ---
  {
    const items = [
      calcItem("mochi", 50, "g"),
      calcItem("whey_protein", 30, "g"),
      calcItem("pink_salt", 3, "g"),
    ];
    mealTemplates.push({
      templateId: "meal_preworkout",
      ownerId: "admintrainer",
      title: "トレ前 餅＋プロテイン",
      type: "MEAL",
      isActive: true,
      organizationName: null,
      items,
      totalMacros: sumMacros(items),
      createdAt: Date.now(),
    });
  }

  // --- トレ後食事（餅＋プロテイン、岩塩なし） ---
  {
    const items = [
      calcItem("mochi", 50, "g"),
      calcItem("whey_protein", 30, "g"),
    ];
    mealTemplates.push({
      templateId: "meal_postworkout",
      ownerId: "admintrainer",
      title: "トレ後 餅＋プロテイン",
      type: "MEAL",
      isActive: true,
      organizationName: null,
      items,
      totalMacros: sumMacros(items),
      createdAt: Date.now(),
    });
  }

  // ============================================================
  // 3. 運動テンプレート（WORKOUT_TEMPLATES index.js 5449-5519 と完全一致）
  // ============================================================
  const workoutTemplates = [
    // --- 脚 ---
    {
      templateId: "workout_legs_power",
      title: "脚トレ パワー",
      items: [
        { foodName: "バーベルスクワット", amount: 5, unit: "セット", sets: 5, reps: 5, weight: 0, rmPercentMin: 80, rmPercentMax: 85 },
        { foodName: "レッグプレス", amount: 5, unit: "セット", sets: 5, reps: 5, weight: 0, rmPercentMin: 80, rmPercentMax: 85 },
        { foodName: "レッグエクステンション", amount: 4, unit: "セット", sets: 4, reps: 8, weight: 0, rmPercentMin: 70, rmPercentMax: 75 },
        { foodName: "レッグカール", amount: 4, unit: "セット", sets: 4, reps: 8, weight: 0, rmPercentMin: 70, rmPercentMax: 75 },
      ]
    },
    {
      templateId: "workout_legs_pump",
      title: "脚トレ パンプ",
      items: [
        { foodName: "バーベルスクワット", amount: 4, unit: "セット", sets: 4, reps: 12, weight: 0 },
        { foodName: "レッグプレス", amount: 4, unit: "セット", sets: 4, reps: 15, weight: 0 },
        { foodName: "レッグエクステンション", amount: 3, unit: "セット", sets: 3, reps: 15, weight: 0 },
        { foodName: "レッグカール", amount: 3, unit: "セット", sets: 3, reps: 15, weight: 0 },
      ]
    },
    // --- 背中 ---
    {
      templateId: "workout_back_power",
      title: "背中トレ パワー",
      items: [
        { foodName: "デッドリフト", amount: 5, unit: "セット", sets: 5, reps: 5, weight: 0, rmPercentMin: 80, rmPercentMax: 85 },
        { foodName: "ベントオーバーロー", amount: 5, unit: "セット", sets: 5, reps: 5, weight: 0, rmPercentMin: 75, rmPercentMax: 80 },
        { foodName: "チンニング", amount: 4, unit: "セット", sets: 4, reps: 6, weight: 0, rmPercentMin: 75, rmPercentMax: 80 },
        { foodName: "シーテッドロー", amount: 4, unit: "セット", sets: 4, reps: 8, weight: 0, rmPercentMin: 70, rmPercentMax: 75 },
      ]
    },
    {
      templateId: "workout_back_pump",
      title: "背中トレ パンプ",
      items: [
        { foodName: "デッドリフト", amount: 4, unit: "セット", sets: 4, reps: 10, weight: 0 },
        { foodName: "ベントオーバーロー", amount: 4, unit: "セット", sets: 4, reps: 12, weight: 0 },
        { foodName: "チンニング", amount: 3, unit: "セット", sets: 3, reps: 12, weight: 0 },
        { foodName: "シーテッドロー", amount: 3, unit: "セット", sets: 3, reps: 15, weight: 0 },
      ]
    },
    // --- 胸 ---
    {
      templateId: "workout_chest_power",
      title: "胸トレ パワー",
      items: [
        { foodName: "ベンチプレス", amount: 5, unit: "セット", sets: 5, reps: 5, weight: 0, rmPercentMin: 80, rmPercentMax: 85 },
        { foodName: "インクラインベンチプレス", amount: 4, unit: "セット", sets: 4, reps: 6, weight: 0, rmPercentMin: 75, rmPercentMax: 80 },
        { foodName: "ディップス", amount: 4, unit: "セット", sets: 4, reps: 6, weight: 0, rmPercentMin: 75, rmPercentMax: 80 },
        { foodName: "ダンベルフライ", amount: 3, unit: "セット", sets: 3, reps: 10, weight: 0, rmPercentMin: 65, rmPercentMax: 70 },
      ]
    },
    {
      templateId: "workout_chest_pump",
      title: "胸トレ パンプ",
      items: [
        { foodName: "ベンチプレス", amount: 4, unit: "セット", sets: 4, reps: 12, weight: 0 },
        { foodName: "インクラインベンチプレス", amount: 4, unit: "セット", sets: 4, reps: 12, weight: 0 },
        { foodName: "ディップス", amount: 3, unit: "セット", sets: 3, reps: 15, weight: 0 },
        { foodName: "ダンベルフライ", amount: 3, unit: "セット", sets: 3, reps: 15, weight: 0 },
      ]
    },
    // --- 肩 ---
    {
      templateId: "workout_shoulders_power",
      title: "肩トレ パワー",
      items: [
        { foodName: "ダンベルショルダープレス", amount: 5, unit: "セット", sets: 5, reps: 5, weight: 0, rmPercentMin: 80, rmPercentMax: 85 },
        { foodName: "スミスバックプレス", amount: 4, unit: "セット", sets: 4, reps: 6, weight: 0, rmPercentMin: 75, rmPercentMax: 80 },
        { foodName: "サイドレイズ", amount: 4, unit: "セット", sets: 4, reps: 10, weight: 0, rmPercentMin: 65, rmPercentMax: 70 },
        { foodName: "フロントレイズ", amount: 3, unit: "セット", sets: 3, reps: 10, weight: 0, rmPercentMin: 65, rmPercentMax: 70 },
      ]
    },
    {
      templateId: "workout_shoulders_pump",
      title: "肩トレ パンプ",
      items: [
        { foodName: "ダンベルショルダープレス", amount: 4, unit: "セット", sets: 4, reps: 12, weight: 0 },
        { foodName: "スミスバックプレス", amount: 4, unit: "セット", sets: 4, reps: 12, weight: 0 },
        { foodName: "サイドレイズ", amount: 3, unit: "セット", sets: 3, reps: 20, weight: 0 },
        { foodName: "フロントレイズ", amount: 3, unit: "セット", sets: 3, reps: 15, weight: 0 },
      ]
    },
    // --- 腕 ---
    {
      templateId: "workout_arms_power",
      title: "腕トレ パワー",
      items: [
        { foodName: "ナローベンチプレス", amount: 5, unit: "セット", sets: 5, reps: 5, weight: 0, rmPercentMin: 80, rmPercentMax: 85 },
        { foodName: "バーベルカール", amount: 4, unit: "セット", sets: 4, reps: 6, weight: 0, rmPercentMin: 75, rmPercentMax: 80 },
        { foodName: "フレンチプレス", amount: 4, unit: "セット", sets: 4, reps: 8, weight: 0, rmPercentMin: 70, rmPercentMax: 75 },
        { foodName: "インクラインダンベルカール", amount: 3, unit: "セット", sets: 3, reps: 10, weight: 0, rmPercentMin: 65, rmPercentMax: 70 },
      ]
    },
    {
      templateId: "workout_arms_pump",
      title: "腕トレ パンプ",
      items: [
        { foodName: "ナローベンチプレス", amount: 4, unit: "セット", sets: 4, reps: 12, weight: 0 },
        { foodName: "バーベルカール", amount: 4, unit: "セット", sets: 4, reps: 12, weight: 0 },
        { foodName: "フレンチプレス", amount: 3, unit: "セット", sets: 3, reps: 15, weight: 0 },
        { foodName: "インクラインダンベルカール", amount: 3, unit: "セット", sets: 3, reps: 15, weight: 0 },
      ]
    },
  ];

  // ============================================================
  // 4. Firestore に投入
  // ============================================================

  // 食事テンプレート
  for (const t of mealTemplates) {
    await db.collection('quest_templates').doc(t.templateId).set(t);
    const m = t.totalMacros;
    console.log(`MEAL: ${t.templateId} - ${t.title} (${m.calories}kcal P${m.protein} F${m.fat} C${m.carbs})`);
  }

  // 運動テンプレート
  for (const w of workoutTemplates) {
    const totalSets = w.items.reduce((s, i) => s + i.sets, 0);
    const doc = {
      templateId: w.templateId,
      ownerId: "admintrainer",
      title: w.title,
      type: "WORKOUT",
      isActive: true,
      organizationName: null,
      items: w.items,
      totalMacros: null,
      createdAt: Date.now(),
    };
    await db.collection('quest_templates').doc(w.templateId).set(doc);
    console.log(`WORKOUT: ${w.templateId} - ${w.title} (${w.items.length}種目, ${totalSets}セット)`);
  }

  console.log(`\nDone. Created ${mealTemplates.length} meal + ${workoutTemplates.length} workout = ${mealTemplates.length + workoutTemplates.length} templates.`);
  process.exit(0);
})();
