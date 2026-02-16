const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

(async () => {
  const templates = [
    // ===== 食事テンプレート (7個) =====
    {
      templateId: "meal_breakfast_standard",
      ownerId: "admintrainer",
      title: "標準朝食セット",
      type: "MEAL",
      isActive: true,
      organizationName: null,
      items: [
        { foodName: "卵（全卵）", amount: 100, unit: "g", calories: 151, protein: 12.3, fat: 10.3, carbs: 0.3, fiber: 0 },
        { foodName: "全粒粉パン", amount: 60, unit: "g", calories: 156, protein: 5.4, fat: 2.7, carbs: 28.2, fiber: 3.6 },
        { foodName: "バナナ", amount: 120, unit: "g", calories: 103, protein: 1.3, fat: 0.2, carbs: 27.1, fiber: 1.3 },
        { foodName: "無脂肪牛乳", amount: 200, unit: "ml", calories: 66, protein: 6.6, fat: 0.2, carbs: 9.6, fiber: 0 }
      ],
      totalMacros: { calories: 476, protein: 25.6, fat: 13.4, carbs: 65.2 },
      createdAt: Date.now()
    },
    {
      templateId: "meal_breakfast_highprotein",
      ownerId: "admintrainer",
      title: "高タンパク朝食",
      type: "MEAL",
      isActive: true,
      organizationName: null,
      items: [
        { foodName: "卵白", amount: 150, unit: "g", calories: 75, protein: 16.5, fat: 0.3, carbs: 1.1, fiber: 0 },
        { foodName: "オートミール", amount: 50, unit: "g", calories: 190, protein: 6.9, fat: 5.7, carbs: 29.9, fiber: 4.7 },
        { foodName: "プロテインパウダー", amount: 30, unit: "g", calories: 120, protein: 24, fat: 1.5, carbs: 3, fiber: 0 },
        { foodName: "ブルーベリー", amount: 50, unit: "g", calories: 25, protein: 0.4, fat: 0.1, carbs: 6.1, fiber: 1.3 }
      ],
      totalMacros: { calories: 410, protein: 47.8, fat: 7.6, carbs: 40.1 },
      createdAt: Date.now()
    },
    {
      templateId: "meal_lunch_chicken",
      ownerId: "admintrainer",
      title: "鶏むね肉定食",
      type: "MEAL",
      isActive: true,
      organizationName: null,
      items: [
        { foodName: "鶏むね肉（皮なし）", amount: 150, unit: "g", calories: 165, protein: 34.5, fat: 2.3, carbs: 0, fiber: 0 },
        { foodName: "白米", amount: 200, unit: "g", calories: 336, protein: 5, fat: 0.6, carbs: 74.2, fiber: 0.6 },
        { foodName: "ブロッコリー", amount: 100, unit: "g", calories: 33, protein: 4.3, fat: 0.5, carbs: 5.2, fiber: 4.4 },
        { foodName: "味噌汁（わかめ）", amount: 200, unit: "ml", calories: 30, protein: 2.2, fat: 0.6, carbs: 3.8, fiber: 0.8 }
      ],
      totalMacros: { calories: 564, protein: 46, fat: 4, carbs: 83.2 },
      createdAt: Date.now()
    },
    {
      templateId: "meal_lunch_salmon",
      ownerId: "admintrainer",
      title: "サーモン定食",
      type: "MEAL",
      isActive: true,
      organizationName: null,
      items: [
        { foodName: "サーモン（焼き）", amount: 120, unit: "g", calories: 220, protein: 25.2, fat: 12, carbs: 0, fiber: 0 },
        { foodName: "玄米", amount: 180, unit: "g", calories: 297, protein: 5, fat: 1.8, carbs: 63.5, fiber: 2.5 },
        { foodName: "ほうれん草（おひたし）", amount: 80, unit: "g", calories: 20, protein: 2.2, fat: 0.3, carbs: 2.5, fiber: 2.2 },
        { foodName: "味噌汁（豆腐）", amount: 200, unit: "ml", calories: 45, protein: 3.5, fat: 1.5, carbs: 4.2, fiber: 0.5 }
      ],
      totalMacros: { calories: 582, protein: 35.9, fat: 15.6, carbs: 70.2 },
      createdAt: Date.now()
    },
    {
      templateId: "meal_dinner_lean",
      ownerId: "admintrainer",
      title: "減量向け夕食",
      type: "MEAL",
      isActive: true,
      organizationName: null,
      items: [
        { foodName: "鶏ささみ", amount: 150, unit: "g", calories: 158, protein: 34.5, fat: 1.2, carbs: 0, fiber: 0 },
        { foodName: "サラダ（レタス・トマト）", amount: 150, unit: "g", calories: 25, protein: 1.2, fat: 0.2, carbs: 5, fiber: 1.8 },
        { foodName: "豆腐（木綿）", amount: 150, unit: "g", calories: 108, protein: 10.5, fat: 6.3, carbs: 2.4, fiber: 0.5 },
        { foodName: "きのこスープ", amount: 200, unit: "ml", calories: 22, protein: 1.8, fat: 0.3, carbs: 3.2, fiber: 1.5 }
      ],
      totalMacros: { calories: 313, protein: 48, fat: 8, carbs: 10.6 },
      createdAt: Date.now()
    },
    {
      templateId: "meal_snack_protein",
      ownerId: "admintrainer",
      title: "プロテイン間食",
      type: "MEAL",
      isActive: true,
      organizationName: null,
      items: [
        { foodName: "プロテインバー", amount: 60, unit: "g", calories: 210, protein: 20, fat: 7, carbs: 22, fiber: 2 },
        { foodName: "アーモンド", amount: 20, unit: "g", calories: 120, protein: 4, fat: 10.4, carbs: 3.9, fiber: 2.1 }
      ],
      totalMacros: { calories: 330, protein: 24, fat: 17.4, carbs: 25.9 },
      createdAt: Date.now()
    },
    {
      templateId: "meal_bulk_meal",
      ownerId: "admintrainer",
      title: "増量向け食事",
      type: "MEAL",
      isActive: true,
      organizationName: null,
      items: [
        { foodName: "牛赤身肉", amount: 200, unit: "g", calories: 280, protein: 40, fat: 12, carbs: 0, fiber: 0 },
        { foodName: "白米", amount: 300, unit: "g", calories: 504, protein: 7.5, fat: 0.9, carbs: 111.3, fiber: 0.9 },
        { foodName: "アボカド", amount: 70, unit: "g", calories: 131, protein: 1.8, fat: 13.2, carbs: 1.3, fiber: 3.7 },
        { foodName: "温野菜ミックス", amount: 100, unit: "g", calories: 35, protein: 2, fat: 0.3, carbs: 6.5, fiber: 3 }
      ],
      totalMacros: { calories: 950, protein: 51.3, fat: 26.4, carbs: 119.1 },
      createdAt: Date.now()
    },
    // ===== 運動テンプレート (10個) =====
    {
      templateId: "workout_chest_power",
      ownerId: "admintrainer",
      title: "胸トレ（パワー）",
      type: "WORKOUT",
      isActive: true,
      organizationName: null,
      items: [
        { foodName: "ベンチプレス", amount: 4, unit: "セット", sets: 4, reps: 6, weight: 0, rmPercentMin: 80, rmPercentMax: 85 },
        { foodName: "インクラインダンベルプレス", amount: 3, unit: "セット", sets: 3, reps: 8, weight: 0, rmPercentMin: 70, rmPercentMax: 75 },
        { foodName: "ケーブルフライ", amount: 3, unit: "セット", sets: 3, reps: 12, weight: 0 },
        { foodName: "ディップス", amount: 3, unit: "セット", sets: 3, reps: 10, weight: 0 }
      ],
      totalMacros: null,
      createdAt: Date.now()
    },
    {
      templateId: "workout_chest_pump",
      ownerId: "admintrainer",
      title: "胸トレ（パンプ）",
      type: "WORKOUT",
      isActive: true,
      organizationName: null,
      items: [
        { foodName: "ダンベルフライ", amount: 4, unit: "セット", sets: 4, reps: 15, weight: 0 },
        { foodName: "インクラインダンベルプレス", amount: 3, unit: "セット", sets: 3, reps: 12, weight: 0 },
        { foodName: "ペックデック", amount: 3, unit: "セット", sets: 3, reps: 15, weight: 0 },
        { foodName: "プッシュアップ", amount: 3, unit: "セット", sets: 3, reps: 20, weight: 0 }
      ],
      totalMacros: null,
      createdAt: Date.now()
    },
    {
      templateId: "workout_back_power",
      ownerId: "admintrainer",
      title: "背中トレ（パワー）",
      type: "WORKOUT",
      isActive: true,
      organizationName: null,
      items: [
        { foodName: "デッドリフト", amount: 4, unit: "セット", sets: 4, reps: 5, weight: 0, rmPercentMin: 80, rmPercentMax: 90 },
        { foodName: "懸垂", amount: 4, unit: "セット", sets: 4, reps: 8, weight: 0 },
        { foodName: "ベントオーバーロウ", amount: 3, unit: "セット", sets: 3, reps: 8, weight: 0, rmPercentMin: 70, rmPercentMax: 75 },
        { foodName: "ラットプルダウン", amount: 3, unit: "セット", sets: 3, reps: 10, weight: 0 }
      ],
      totalMacros: null,
      createdAt: Date.now()
    },
    {
      templateId: "workout_back_pump",
      ownerId: "admintrainer",
      title: "背中トレ（パンプ）",
      type: "WORKOUT",
      isActive: true,
      organizationName: null,
      items: [
        { foodName: "ラットプルダウン", amount: 4, unit: "セット", sets: 4, reps: 15, weight: 0 },
        { foodName: "シーテッドロウ", amount: 3, unit: "セット", sets: 3, reps: 12, weight: 0 },
        { foodName: "ダンベルロウ", amount: 3, unit: "セット", sets: 3, reps: 12, weight: 0 },
        { foodName: "フェイスプル", amount: 3, unit: "セット", sets: 3, reps: 15, weight: 0 }
      ],
      totalMacros: null,
      createdAt: Date.now()
    },
    {
      templateId: "workout_legs_power",
      ownerId: "admintrainer",
      title: "脚トレ（パワー）",
      type: "WORKOUT",
      isActive: true,
      organizationName: null,
      items: [
        { foodName: "スクワット", amount: 4, unit: "セット", sets: 4, reps: 6, weight: 0, rmPercentMin: 80, rmPercentMax: 85 },
        { foodName: "レッグプレス", amount: 3, unit: "セット", sets: 3, reps: 10, weight: 0 },
        { foodName: "ルーマニアンデッドリフト", amount: 3, unit: "セット", sets: 3, reps: 8, weight: 0, rmPercentMin: 65, rmPercentMax: 75 },
        { foodName: "レッグカール", amount: 3, unit: "セット", sets: 3, reps: 12, weight: 0 }
      ],
      totalMacros: null,
      createdAt: Date.now()
    },
    {
      templateId: "workout_legs_pump",
      ownerId: "admintrainer",
      title: "脚トレ（パンプ）",
      type: "WORKOUT",
      isActive: true,
      organizationName: null,
      items: [
        { foodName: "レッグエクステンション", amount: 4, unit: "セット", sets: 4, reps: 15, weight: 0 },
        { foodName: "ブルガリアンスクワット", amount: 3, unit: "セット", sets: 3, reps: 12, weight: 0 },
        { foodName: "レッグカール", amount: 3, unit: "セット", sets: 3, reps: 15, weight: 0 },
        { foodName: "カーフレイズ", amount: 4, unit: "セット", sets: 4, reps: 20, weight: 0 }
      ],
      totalMacros: null,
      createdAt: Date.now()
    },
    {
      templateId: "workout_shoulders",
      ownerId: "admintrainer",
      title: "肩トレ",
      type: "WORKOUT",
      isActive: true,
      organizationName: null,
      items: [
        { foodName: "オーバーヘッドプレス", amount: 4, unit: "セット", sets: 4, reps: 8, weight: 0, rmPercentMin: 70, rmPercentMax: 80 },
        { foodName: "サイドレイズ", amount: 4, unit: "セット", sets: 4, reps: 15, weight: 0 },
        { foodName: "フロントレイズ", amount: 3, unit: "セット", sets: 3, reps: 12, weight: 0 },
        { foodName: "リアデルトフライ", amount: 3, unit: "セット", sets: 3, reps: 15, weight: 0 }
      ],
      totalMacros: null,
      createdAt: Date.now()
    },
    {
      templateId: "workout_arms",
      ownerId: "admintrainer",
      title: "腕トレ",
      type: "WORKOUT",
      isActive: true,
      organizationName: null,
      items: [
        { foodName: "バーベルカール", amount: 3, unit: "セット", sets: 3, reps: 10, weight: 0 },
        { foodName: "ハンマーカール", amount: 3, unit: "セット", sets: 3, reps: 12, weight: 0 },
        { foodName: "トライセプスプッシュダウン", amount: 3, unit: "セット", sets: 3, reps: 12, weight: 0 },
        { foodName: "オーバーヘッドトライセプスエクステンション", amount: 3, unit: "セット", sets: 3, reps: 12, weight: 0 }
      ],
      totalMacros: null,
      createdAt: Date.now()
    },
    {
      templateId: "workout_fullbody",
      ownerId: "admintrainer",
      title: "全身トレーニング",
      type: "WORKOUT",
      isActive: true,
      organizationName: null,
      items: [
        { foodName: "スクワット", amount: 3, unit: "セット", sets: 3, reps: 8, weight: 0, rmPercentMin: 70, rmPercentMax: 80 },
        { foodName: "ベンチプレス", amount: 3, unit: "セット", sets: 3, reps: 8, weight: 0, rmPercentMin: 70, rmPercentMax: 80 },
        { foodName: "懸垂", amount: 3, unit: "セット", sets: 3, reps: 8, weight: 0 },
        { foodName: "オーバーヘッドプレス", amount: 3, unit: "セット", sets: 3, reps: 8, weight: 0 }
      ],
      totalMacros: null,
      createdAt: Date.now()
    },
    {
      templateId: "workout_hiit",
      ownerId: "admintrainer",
      title: "HIIT（有酸素）",
      type: "WORKOUT",
      isActive: true,
      organizationName: null,
      items: [
        { foodName: "バーピー", amount: 4, unit: "セット", sets: 4, reps: 10, weight: 0 },
        { foodName: "マウンテンクライマー", amount: 4, unit: "セット", sets: 4, reps: 20, weight: 0 },
        { foodName: "ジャンピングスクワット", amount: 4, unit: "セット", sets: 4, reps: 15, weight: 0 },
        { foodName: "プランク", amount: 3, unit: "セット", sets: 3, reps: 1, weight: 0 }
      ],
      totalMacros: null,
      createdAt: Date.now()
    }
  ];

  let count = 0;
  for (const t of templates) {
    const docRef = db.collection('quest_templates').doc(t.templateId);
    const existing = await docRef.get();
    if (existing.exists) {
      console.log(`SKIP: ${t.templateId} (already exists)`);
      continue;
    }
    await docRef.set(t);
    console.log(`CREATED: ${t.templateId} - ${t.title}`);
    count++;
  }
  console.log(`\nDone. Created ${count} templates.`);
  process.exit(0);
})();
